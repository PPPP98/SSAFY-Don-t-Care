from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
import os, json, asyncio, httpx
import google.auth
from google.auth.transport.requests import Request as GoogleRequest
from pathlib import Path
from dotenv import load_dotenv
from google.oauth2 import id_token
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import redis
import json
import logging
from aiohttp import ClientSession
from starlette.responses import StreamingResponse


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=False)

router = APIRouter(tags=["vertex-ai"])


# Google Cloud 설정
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
AGENT_ENGINE_ID = os.getenv("AGENT_ENGINE_ID")

# Redis 설정 (기본값 제거)
REDIS_URL = os.getenv("REDIS_URL")
REDIS_CONNECT_TIMEOUT = int(os.getenv("REDIS_CONNECT_TIMEOUT") or "0")
REDIS_SOCKET_TIMEOUT = int(os.getenv("REDIS_SOCKET_TIMEOUT") or "0")
REDIS_MAX_CONNECTIONS = int(os.getenv("REDIS_MAX_CONNECTIONS") or "0")

# Redis 필수 설정값 검증
if not all([REDIS_CONNECT_TIMEOUT, REDIS_SOCKET_TIMEOUT, REDIS_MAX_CONNECTIONS]):
    raise RuntimeError("Redis 설정 환경변수가 누락되었습니다: REDIS_CONNECT_TIMEOUT, REDIS_SOCKET_TIMEOUT, REDIS_MAX_CONNECTIONS")

BASE_V1 = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{AGENT_ENGINE_ID}"
BASE_V1BETA1 = f"https://{LOCATION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{AGENT_ENGINE_ID}"
QUERY_URL = f"{BASE_V1}:query"
STREAM_QUERY_URL = f"{BASE_V1BETA1}:streamQuery?alt=sse"

_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


# Redis 연결 관리자
class RedisManager:
    _instance = None
    _redis_client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self):
        if self._redis_client is None:
            try:
                if REDIS_URL:
                    self._redis_client = redis.from_url(
                        REDIS_URL,
                        socket_connect_timeout=REDIS_CONNECT_TIMEOUT,
                        socket_timeout=REDIS_SOCKET_TIMEOUT,
                        max_connections=REDIS_MAX_CONNECTIONS,
                        decode_responses=True,
                    )
                    # 연결 테스트
                    self._redis_client.ping()
                    logging.info("Redis 연결 성공")
                else:
                    logging.warning("REDIS_URL이 설정되지 않음")
                    return None
            except Exception as e:
                logging.error(f"Redis 연결 실패: {e}")
                self._redis_client = None
        return self._redis_client


# Fallback용 간단한 인메모리 캐시
class SimpleCache:
    def __init__(self, ttl_seconds=300):
        self.cache: Dict[str, Any] = {}
        self.timestamps: Dict[str, datetime] = {}
        self.ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            if datetime.now() - self.timestamps[key] < self.ttl:
                return self.cache[key]
            else:
                del self.cache[key]
                del self.timestamps[key]
        return None

    def set(self, key: str, value: Any):
        self.cache[key] = value
        self.timestamps[key] = datetime.now()

    def invalidate(self, pattern: str = None):
        if pattern:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self.cache[key]
                del self.timestamps[key]
        else:
            self.cache.clear()
            self.timestamps.clear()


# Redis 기반 캐시 (Fallback 포함)
class HybridCache:
    def __init__(self, ttl_seconds=300):
        self.ttl_seconds = ttl_seconds
        self.redis_manager = RedisManager()
        self.fallback_cache = SimpleCache(ttl_seconds)
        self.prefix = "fastapi:sessions:"

    def _get_cache_key(self, key: str) -> str:
        """캐시 키에 네임스페이스 prefix 추가"""
        return f"{self.prefix}{key}"

    def _serialize_value(self, value: Any) -> str:
        """값을 JSON 문자열로 직렬화"""
        return json.dumps(value, default=str, ensure_ascii=False)

    def _deserialize_value(self, value: str) -> Any:
        """JSON 문자열을 원래 값으로 역직렬화"""
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    def get(self, key: str) -> Optional[Any]:
        redis_client = self.redis_manager.get_client()
        cache_key = self._get_cache_key(key)

        if redis_client:
            try:
                value = redis_client.get(cache_key)
                if value is not None:
                    logging.info(f"Redis 캐시 히트: {key}")
                    return self._deserialize_value(value)
            except Exception as e:
                logging.error(f"Redis GET 실패, fallback 사용: {e}")

        # Redis 실패 시 fallback 캐시 사용
        fallback_result = self.fallback_cache.get(key)
        if fallback_result is not None:
            logging.info(f"Fallback 캐시 히트: {key}")
        else:
            logging.info(f"캐시 미스: {key}")
        return fallback_result

    def get_with_info(self, key: str) -> tuple[Optional[Any], str]:
        """캐시 조회와 함께 캐시 타입 정보 반환"""
        redis_client = self.redis_manager.get_client()
        cache_key = self._get_cache_key(key)

        if redis_client:
            try:
                value = redis_client.get(cache_key)
                if value is not None:
                    return self._deserialize_value(value), "redis"
            except Exception as e:
                logging.error(f"Redis GET 실패, fallback 사용: {e}")

        # Redis 실패 시 fallback 캐시 사용
        fallback_result = self.fallback_cache.get(key)
        if fallback_result is not None:
            return fallback_result, "memory"
        else:
            return None, "miss"

    def set(self, key: str, value: Any):
        redis_client = self.redis_manager.get_client()
        cache_key = self._get_cache_key(key)

        if redis_client:
            try:
                serialized_value = self._serialize_value(value)
                redis_client.setex(cache_key, self.ttl_seconds, serialized_value)
                return
            except Exception as e:
                logging.error(f"Redis SET 실패, fallback 사용: {e}")

        # Redis 실패 시 fallback 캐시 사용
        self.fallback_cache.set(key, value)

    def invalidate(self, pattern: str = None):
        redis_client = self.redis_manager.get_client()

        if redis_client:
            try:
                if pattern:
                    # Redis SCAN으로 패턴 매칭 키 찾기
                    pattern_key = self._get_cache_key(f"*{pattern}*")
                    keys = list(redis_client.scan_iter(match=pattern_key))
                    if keys:
                        redis_client.delete(*keys)
                else:
                    # 모든 FastAPI 캐시 키 삭제
                    pattern_key = self._get_cache_key("*")
                    keys = list(redis_client.scan_iter(match=pattern_key))
                    if keys:
                        redis_client.delete(*keys)
                return
            except Exception as e:
                logging.error(f"Redis 무효화 실패, fallback 사용: {e}")

        # Redis 실패 시 fallback 캐시 사용
        self.fallback_cache.invalidate(pattern)


# 캐시 인스턴스 생성
session_cache = HybridCache(ttl_seconds=300)


def _access_token() -> str:
    creds, _ = google.auth.default(scopes=_SCOPES)
    if not creds.valid:
        creds.refresh(GoogleRequest())
    return creds.token


def validate_env_vars():
    required_vars = {
        "GOOGLE_CLOUD_PROJECT": PROJECT_ID,
        "GOOGLE_CLOUD_LOCATION": LOCATION,
        "AGENT_ENGINE_ID": AGENT_ENGINE_ID,
    }

    missing_vars = [key for key, value in required_vars.items() if not value]
    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )


def _headers():
    token = _access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,  # 권장
    }


def _err(r: httpx.Response):
    try:
        content = r.json()
    except Exception:
        content = {"text": r.text}
    return JSONResponse(status_code=r.status_code, content=content)


# 1) 세션 생성
@router.post("/sessions")
async def create_session(body: dict) -> JSONResponse:
    """
    body: { "user_id": "u_123", "state": {...}, "displayName": "표시이름"(선택) }
    """
    user_id = body.get("user_id")
    displayName = body.get("displayName")

    payload = {
        "classMethod": "async_create_session",
        "input": {
            "user_id": user_id,
            "state": body.get("state") or {},
        },
    }

    # Google Cloud Vertex AI Agent Engine이 displayName을 지원하지 않으므로 제거
    # displayName은 백엔드에서만 사용하고 Google Cloud API로는 전달하지 않음

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(QUERY_URL, headers=_headers(), json=payload)

    # 세션 생성 성공 시 캐시 무효화 (Google Cloud API 구조 그대로 유지)
    if r.status_code < 400:
        # 세션 목록 캐시 무효화
        session_cache.invalidate(f"sessions_{user_id}")
        # 관련 세션 상세 캐시도 무효화 (새 세션이므로 직접적 영향은 없지만 안전상)
        session_cache.invalidate(f"session_detail_{user_id}")

    return _err(r) if r.status_code >= 400 else JSONResponse(r.json())


# 2) 세션 목록 (v1beta1 API with paging and caching)
@router.get("/sessions")
async def list_sessions(
    user_id: str,
    page_size: Optional[int] = Query(20, ge=1, le=100, description="페이지당 세션 수"),
    page_token: Optional[str] = Query(None, description="다음 페이지 토큰"),
    use_cache: Optional[bool] = Query(True, description="캐시 사용 여부"),
) -> JSONResponse:
    """
    v1beta1 API를 사용한 세션 목록 조회 with 페이징 및 캐싱
    """
    # 캐시 키 생성
    cache_key = f"sessions_{user_id}_{page_size}_{page_token or 'first'}"

    # 캐시 확인
    if use_cache:
        cached_data, cache_type = session_cache.get_with_info(cache_key)
        if cached_data:
            return JSONResponse(
                {
                    "output": cached_data,
                    "cached": True,
                    "cache_type": cache_type,
                    "cache_key": cache_key,
                }
            )

    # v1beta1 API URL 구성
    list_url = f"{BASE_V1BETA1}/sessions"

    # 쿼리 파라미터 구성
    params = {"pageSize": page_size}

    # user_id로 필터링 (Google Cloud Sessions API 필터 형식)
    if user_id:
        params["filter"] = f'userId="{user_id}"'

    # 페이지 토큰 추가
    if page_token:
        params["pageToken"] = page_token

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(list_url, headers=_headers(), params=params)

        if r.status_code >= 400:
            # 404일 경우 빈 목록 반환
            if r.status_code == 404:
                empty_response = {
                    "sessions": [],
                    "nextPageToken": None,
                    "totalCount": 0,
                }
                return JSONResponse({"output": empty_response})
            return _err(r)

        # 응답 파싱
        response_data = r.json()

        # 응답 형식 정규화
        normalized_response = {
            "sessions": response_data.get("sessions", []),
            "nextPageToken": response_data.get("nextPageToken"),
            "totalCount": response_data.get(
                "totalCount", len(response_data.get("sessions", []))
            ),
        }

        # displayName 필드 확인 및 정규화 (Google Cloud API 구조 그대로 유지)
        for session in normalized_response["sessions"]:
            # displayName이 없는 경우 기본값 설정
            if "displayName" not in session:
                # name에서 마지막 부분을 추출하여 기본 displayName 생성
                session_name = session.get("name", "")
                session_id = session_name.split("/")[-1] if session_name else "unknown"
                session["displayName"] = f"Session {session_id[:8]}"

        # 캐시 저장
        if use_cache:
            session_cache.set(cache_key, normalized_response)

        return JSONResponse(
            {
                "output": normalized_response,
                "cached": False,
                "cache_type": "none",
                "cache_key": cache_key if use_cache else None,
            }
        )

    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={"error": "Request timeout while fetching sessions"},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Failed to fetch sessions: {str(e)}"}
        )


# 3) 세션 조회 (캐싱 최적화)
@router.get("/sessions/{session_id}")
async def get_session(user_id: str, session_id: str) -> JSONResponse:
    # 세션별 캐시 키 생성
    cache_key = f"session_detail_{user_id}_{session_id}"

    # 캐시 조회 시도
    cached_session, cache_type = session_cache.get_with_info(cache_key)
    if cached_session:
        return JSONResponse(
            {
                "output": cached_session,
                "cached": True,
                "cache_type": cache_type,
                "cache_key": cache_key,
            }
        )

    payload = {
        "classMethod": "async_get_session",
        "input": {"user_id": user_id, "session_id": session_id},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(QUERY_URL, headers=_headers(), json=payload)

    if r.status_code >= 400:
        return _err(r)

    # 응답 데이터 캐시 저장 (세션 상세는 짧은 TTL 사용)
    session_data = r.json()
    session_cache_short = HybridCache(ttl_seconds=60)  # 1분 캐시
    session_cache_short.set(cache_key, session_data)

    return JSONResponse(session_data)


# 4) 세션 업데이트 (displayName 설정)
@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, user_id: str, body: dict) -> JSONResponse:
    """
    body: { "displayName": "표시이름" }
    query params: user_id
    """
    displayName = body.get("displayName")

    if not displayName:
        return JSONResponse(
            status_code=400, content={"error": "displayName is required"}
        )

    # Google Cloud API를 직접 호출하여 displayName 업데이트
    session_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{AGENT_ENGINE_ID}/sessions/{session_id}"

    # user_id를 포함한 업데이트 페이로드
    update_payload = {
        "displayName": displayName,
        "userId": user_id,
    }

    # Google Cloud API PATCH 요청
    patch_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1beta1/{session_name}"

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.patch(patch_url, headers=_headers(), json=update_payload)

    # 세션 업데이트 성공 시 캐시 무효화
    if r.status_code < 400:
        # 세션 목록 캐시 무효화 (displayName이 변경되므로)
        session_cache.invalidate(f"sessions_{user_id}")
        # 업데이트된 세션의 상세 캐시 무효화
        session_cache.invalidate(f"session_detail_{user_id}_{session_id}")

    return _err(r) if r.status_code >= 400 else JSONResponse(r.json())


# 5) 세션 삭제
@router.delete("/sessions/{session_id}")
async def delete_session(user_id: str, session_id: str) -> JSONResponse:
    """
    Google Cloud REST API를 사용한 세션 삭제
    """
    # Google Cloud API 세션 리소스 이름 구성
    session_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{AGENT_ENGINE_ID}/sessions/{session_id}"

    # Google Cloud API DELETE 요청
    delete_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1beta1/{session_name}"

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.delete(delete_url, headers=_headers())

    # 세션 삭제 성공 시 캐시 무효화
    if r.status_code < 400:
        # 세션 목록 캐시 무효화
        session_cache.invalidate(f"sessions_{user_id}")
        # 삭제된 세션의 상세 캐시 무효화
        session_cache.invalidate(f"session_detail_{user_id}_{session_id}")
        # 관련 세션 상세 캐시도 광범위 무효화
        session_cache.invalidate(f"session_detail_{user_id}")

    return (
        _err(r)
        if r.status_code >= 400
        else JSONResponse({"message": "Session deleted successfully"})
    )


# 5) 스트리밍
