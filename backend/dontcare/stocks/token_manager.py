# -*- coding: utf-8 -*-
"""
KIS API 토큰 관리 모듈

Redis를 사용하여 KIS API 액세스 토큰을 캐시하고 관리합니다.
여러 사용자가 동시에 접속해도 하나의 토큰을 공유하여 효율적으로 API를 사용할 수 있습니다.
"""
import os
import requests
import time
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
from django.core.cache import cache
from django.core.cache.backends.redis import RedisCache
from django.core.cache.backends.locmem import LocMemCache

logger = logging.getLogger(__name__)


class KISTokenError(Exception):
    """KIS 토큰 관련 예외"""

    pass


class KISTokenManager:
    """
    KIS API 토큰을 Redis를 통해 중앙 관리하는 클래스

    Features:
    - Redis 기반 토큰 캐싱
    - 멀티 유저 환경에서 토큰 공유
    - 토큰 자동 갱신
    - 동시성 제어를 위한 락 메커니즘
    """

    # Redis 키 상수
    TOKEN_KEY = "kis_api_token"
    TOKEN_EXPIRES_KEY = "kis_api_token_expires"
    TOKEN_LOCK_KEY = "kis_api_token_lock"

    # 락 타임아웃 (초)
    LOCK_TIMEOUT = 30
    # 토큰 만료 여유시간 (초) - 실제 만료 5분 전에 갱신
    TOKEN_BUFFER_TIME = 300

    def __init__(self):
        """토큰 매니저 초기화"""
        self.app_key = os.getenv("KIS_APP_KEY")
        self.app_secret = os.getenv("KIS_APP_SECRET")
        self.base_url = os.getenv(
            "KIS_BASE_URL", "https://openapi.koreainvestment.com:9443"
        )

        if not self.app_key or not self.app_secret:
            raise ValueError(
                "KIS_APP_KEY and KIS_APP_SECRET environment variables are required"
            )

        # 로컬 락 (동일 프로세스 내 동시성 제어)
        self._local_lock = threading.Lock()

    def get_token(self) -> str:
        """
        유효한 토큰을 반환합니다.
        토큰이 없거나 만료되었으면 자동으로 갱신합니다.

        Returns:
            str: 유효한 액세스 토큰

        Raises:
            KISTokenError: 토큰 발급/갱신 실패 시
        """
        try:
            # 먼저 캐시에서 토큰 조회
            token = cache.get(self.TOKEN_KEY)
            expires_str = cache.get(self.TOKEN_EXPIRES_KEY)

            # 토큰 유효성 검증
            if token and expires_str:
                try:
                    expires_at = datetime.fromisoformat(expires_str)
                    if datetime.now() < expires_at:
                        logger.debug("Using cached token")
                        return token
                    else:
                        logger.info("Cached token expired, refreshing...")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid token expiry format: {e}")

            # 토큰이 없거나 만료된 경우 갱신
            return self._refresh_token()

        except Exception as cache_error:
            logger.warning(
                f"Cache error, falling back to direct token request: {cache_error}"
            )
            # 캐시 오류 시 직접 토큰 발급
            return self._request_new_token_direct()

    def _refresh_token(self) -> str:
        """
        토큰을 갱신합니다.
        Redis 락을 사용하여 동시 갱신을 방지합니다.

        Returns:
            str: 새로 발급받은 액세스 토큰

        Raises:
            KISTokenError: 토큰 발급 실패 시
        """
        try:
            with self._local_lock:
                # Redis 분산 락 획득 시도
                lock_acquired = cache.add(
                    self.TOKEN_LOCK_KEY, "locked", timeout=self.LOCK_TIMEOUT
                )

                if not lock_acquired:
                    # 다른 프로세스가 토큰을 갱신 중일 수 있음
                    # 지수 백오프로 여러 번 재시도하여 락을 획득한 프로세스가 작업을 완료할 시간 제공
                    logger.info(
                        "Token refresh in progress by another process, waiting with backoff..."
                    )

                    max_retries = 5
                    base_wait_time = 2  # 2초부터 시작

                    for retry in range(max_retries):
                        wait_time = base_wait_time * (
                            2**retry
                        )  # 지수 백오프: 2, 4, 8, 16, 32초
                        logger.info(
                            f"Waiting {wait_time}s for token refresh (attempt {retry + 1}/{max_retries})"
                        )
                        time.sleep(wait_time)

                        # 각 재시도마다 토큰 조회
                        token = cache.get(self.TOKEN_KEY)
                        expires_str = cache.get(self.TOKEN_EXPIRES_KEY)

                        if token and expires_str:
                            try:
                                expires_at = datetime.fromisoformat(expires_str)
                                if datetime.now() < expires_at:
                                    logger.info(
                                        f"Token refreshed by another process during wait"
                                    )
                                    return token
                            except (ValueError, TypeError):
                                pass

                    # 모든 재시도 후에도 유효한 토큰이 없으면 직접 발급
                    logger.warning(
                        "All retries exhausted, attempting direct token request"
                    )
                    return self._request_new_token_direct()

                try:
                    # 다시 한 번 토큰 확인 (Double-checked locking)
                    token = cache.get(self.TOKEN_KEY)
                    expires_str = cache.get(self.TOKEN_EXPIRES_KEY)

                    if token and expires_str:
                        try:
                            expires_at = datetime.fromisoformat(expires_str)
                            if datetime.now() < expires_at:
                                logger.debug("Token already fresh (double-check)")
                                return token
                        except (ValueError, TypeError):
                            pass

                    # 실제 토큰 발급 요청
                    new_token = self._request_new_token()

                    logger.info("Token successfully refreshed and cached")
                    return new_token

                finally:
                    # 락 해제
                    try:
                        cache.delete(self.TOKEN_LOCK_KEY)
                    except Exception:
                        pass  # 락 해제 실패는 무시

        except Exception as e:
            logger.warning(
                f"Cache-based token refresh failed: {e}, using direct request"
            )
            return self._request_new_token_direct()

    def _request_new_token(self) -> str:
        """
        KIS API에 새로운 토큰을 요청합니다.

        Returns:
            str: 새로 발급받은 액세스 토큰

        Raises:
            KISTokenError: API 요청 실패 시
        """
        endpoint = "/oauth2/tokenP"
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        data = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
        }

        try:
            logger.info(f"Requesting new KIS API token from {endpoint}")
            response = requests.post(url, json=data, headers=headers, timeout=30)
            response.raise_for_status()

            token_data = response.json()
            token = token_data.get("access_token")

            if not token:
                raise KISTokenError("No access token received from KIS API")

            # 토큰 만료 시간 계산 (기본 24시간에서 버퍼 시간 제외)
            expires_in = token_data.get("expires_in", 86400)  # 기본값 24시간
            expires_at = datetime.now() + timedelta(
                seconds=expires_in - self.TOKEN_BUFFER_TIME
            )

            # Redis에 토큰과 만료시간 저장 (실패해도 토큰은 반환)
            try:
                cache.set(self.TOKEN_KEY, token, timeout=expires_in)
                cache.set(
                    self.TOKEN_EXPIRES_KEY, expires_at.isoformat(), timeout=expires_in
                )
                logger.info(f"New KIS API token cached, expires at {expires_at}")
            except Exception as cache_error:
                logger.warning(f"Failed to cache token: {cache_error}")

            return token

        except requests.exceptions.Timeout:
            logger.error("KIS API token request timeout")
            raise KISTokenError("토큰 요청 시간 초과")
        except requests.exceptions.ConnectionError:
            logger.error("KIS API connection error during token request")
            raise KISTokenError("토큰 요청 연결 오류")
        except requests.HTTPError as e:
            logger.error(f"KIS API HTTP error during token request: {e}")
            if e.response.status_code == 403:
                raise KISTokenError("토큰 요청 권한 오류 - API 키 확인 필요")
            elif e.response.status_code == 429:
                raise KISTokenError("토큰 요청 횟수 초과")
            else:
                raise KISTokenError(f"토큰 요청 HTTP 오류: {e}")
        except requests.RequestException as e:
            logger.error(f"KIS API token request failed: {e}")
            raise KISTokenError(f"토큰 요청 실패: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during token request: {e}")
            raise KISTokenError(f"예상치 못한 토큰 요청 오류: {str(e)}")

    def _request_new_token_direct(self) -> str:
        """
        캐시 없이 직접 새로운 토큰을 요청합니다.
        캐시 시스템에 오류가 있을 때 폴백으로 사용됩니다.

        Returns:
            str: 새로 발급받은 액세스 토큰

        Raises:
            KISTokenError: API 요청 실패 시
        """
        endpoint = "/oauth2/tokenP"
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        data = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
        }

        try:
            logger.info(f"Requesting new KIS API token directly (no cache)")
            response = requests.post(url, json=data, headers=headers, timeout=30)
            response.raise_for_status()

            token_data = response.json()
            token = token_data.get("access_token")

            if not token:
                raise KISTokenError("No access token received from KIS API")

            # 토큰 만료 시간 계산 (기본 24시간에서 버퍼 시간 제외)
            expires_in = token_data.get("expires_in", 86400)  # 기본값 24시간
            expires_at = datetime.now() + timedelta(
                seconds=expires_in - self.TOKEN_BUFFER_TIME
            )

            # 가능하면 Redis에 토큰과 만료시간 저장 (실패해도 토큰은 반환)
            try:
                cache.set(self.TOKEN_KEY, token, timeout=expires_in)
                cache.set(
                    self.TOKEN_EXPIRES_KEY, expires_at.isoformat(), timeout=expires_in
                )
                logger.info(
                    f"Direct token cached for fallback use, expires at {expires_at}"
                )
            except Exception as cache_error:
                logger.warning(
                    f"Failed to cache direct token (fallback will continue): {cache_error}"
                )

            logger.info("Direct token request successful")
            return token

        except requests.exceptions.Timeout:
            logger.error("KIS API token request timeout")
            raise KISTokenError("토큰 요청 시간 초과")
        except requests.exceptions.ConnectionError:
            logger.error("KIS API connection error during token request")
            raise KISTokenError("토큰 요청 연결 오류")
        except requests.HTTPError as e:
            logger.error(f"KIS API HTTP error during token request: {e}")
            if e.response.status_code == 403:
                raise KISTokenError("토큰 요청 권한 오류 - API 키 확인 필요")
            elif e.response.status_code == 429:
                raise KISTokenError("토큰 요청 횟수 초과")
            else:
                raise KISTokenError(f"토큰 요청 HTTP 오류: {e}")
        except requests.RequestException as e:
            logger.error(f"KIS API direct token request failed: {e}")
            raise KISTokenError(f"토큰 요청 실패: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during direct token request: {e}")
            raise KISTokenError(f"예상치 못한 토큰 요청 오류: {str(e)}")

    def invalidate_token(self):
        """
        캐시된 토큰을 무효화합니다.
        토큰이 만료되었거나 오류가 발생했을 때 사용합니다.
        """
        try:
            cache.delete(self.TOKEN_KEY)
            cache.delete(self.TOKEN_EXPIRES_KEY)
            logger.info("KIS API token invalidated")
        except Exception as e:
            logger.warning(f"Failed to invalidate token cache: {e}")

    def get_token_info(self) -> Dict[str, Any]:
        """
        현재 토큰 정보를 반환합니다 (디버깅 용도).

        Returns:
            Dict: 토큰 정보 (토큰 존재 여부, 만료시간 등)
        """
        try:
            token = cache.get(self.TOKEN_KEY)
            expires_str = cache.get(self.TOKEN_EXPIRES_KEY)

            info = {
                "has_token": bool(token),
                "token_length": len(token) if token else 0,
                "expires_at": expires_str,
                "is_valid": False,
                "cache_available": True,
            }

            if token and expires_str:
                try:
                    expires_at = datetime.fromisoformat(expires_str)
                    info["is_valid"] = datetime.now() < expires_at
                    info["time_to_expiry"] = (
                        str(expires_at - datetime.now())
                        if info["is_valid"]
                        else "expired"
                    )
                except (ValueError, TypeError):
                    info["expires_at"] = "invalid_format"

            return info

        except Exception as e:
            logger.warning(f"Failed to get token info from cache: {e}")
            return {
                "has_token": False,
                "token_length": 0,
                "expires_at": None,
                "is_valid": False,
                "cache_available": False,
                "cache_error": str(e),
            }


# 전역 토큰 매니저 인스턴스
_token_manager = None


def get_token_manager() -> KISTokenManager:
    """
    글로벌 토큰 매니저 인스턴스를 반환합니다.
    싱글톤 패턴으로 구현되어 애플리케이션 전체에서 하나의 인스턴스만 사용합니다.

    Returns:
        KISTokenManager: 토큰 매니저 인스턴스
    """
    global _token_manager
    if _token_manager is None:
        _token_manager = KISTokenManager()
    return _token_manager
