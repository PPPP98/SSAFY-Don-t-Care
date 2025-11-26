"""
Redis 기반 OTP 관리 모듈

기존 EmailOTP 모델을 Redis로 대체하여 성능과 확장성을 향상시킵니다.
- 메모리 기반으로 빠른 접근
- TTL 자동 관리로 만료 처리
- JSON 직렬화로 구조화된 데이터 저장
"""

import hashlib
import secrets
import json
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from django.core.cache import cache
from django.conf import settings


class RedisOTPManager:
    """
    Redis 기반 OTP 관리 클래스
    
    기존 EmailOTP 모델의 기능을 Redis로 대체:
    - OTP 생성 및 저장
    - OTP 검증
    - TTL 자동 관리
    - 시도 횟수 제한
    """
    
    # OTP 목적 상수
    PURPOSE_SIGNUP = "signup"
    PURPOSE_PASSWORD_RESET = "password_reset"
    PURPOSE_CHOICES = [
        (PURPOSE_SIGNUP, "Signup"),
        (PURPOSE_PASSWORD_RESET, "Password Reset"),
    ]
    
    # 기본 설정
    DEFAULT_TTL_MINUTES = 10
    MAX_ATTEMPTS = 5
    
    @staticmethod
    def _generate_key(email: str, purpose: str) -> str:
        """Redis 키 생성"""
        return f"otp:{email}:{purpose}"
    
    @staticmethod
    def _hash(code: str) -> str:
        """
        OTP 코드를 안전하게 해시화
        
        Args:
            code: 원본 OTP 코드
            
        Returns:
            해시와 salt가 결합된 문자열 (hash:salt)
        """
        # 보안 강화: salt 추가하여 rainbow table 공격 방지
        salt = secrets.token_hex(16)  # 32자리 랜덤 salt
        hash_value = hashlib.pbkdf2_hmac(
            'sha256', 
            code.encode('utf-8'), 
            salt.encode('utf-8'), 
            100000
        ).hex()
        return f"{hash_value}:{salt}"
    
    @staticmethod
    def _verify_hash(code: str, stored_hash: str) -> bool:
        """
        저장된 해시와 입력된 코드를 비교하여 검증
        
        Args:
            code: 입력된 OTP 코드
            stored_hash: 저장된 해시 문자열
            
        Returns:
            검증 성공 여부
        """
        try:
            hash_part, salt = stored_hash.split(':', 1)
            computed_hash = hashlib.pbkdf2_hmac(
                'sha256', 
                code.encode('utf-8'), 
                salt.encode('utf-8'), 
                100000
            ).hex()
            return computed_hash == hash_part
        except (ValueError, AttributeError):
            return False
    
    @classmethod
    def issue(cls, email: str, purpose: str, ttl_minutes: int = None) -> Tuple[str, str]:
        """
        새로운 OTP 발급
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적 (signup 또는 password_reset)
            ttl_minutes: 만료 시간 (분), 기본값 10분
            
        Returns:
            (otp_data, plain_code) 튜플
            - otp_data: Redis에 저장된 OTP 데이터
            - plain_code: 원본 6자리 코드 (이메일 발송용)
        """
        if ttl_minutes is None:
            ttl_minutes = cls.DEFAULT_TTL_MINUTES
            
        # 6자리 랜덤 코드 생성
        code = f"{secrets.randbelow(1_000_000):06d}"
        
        # OTP 데이터 구성
        otp_data = {
            'code_hash': cls._hash(code),
            'attempts': 0,
            'verified': False,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'purpose': purpose,
            'email': email
        }
        
        # Redis에 저장 (TTL 자동 설정)
        key = cls._generate_key(email, purpose)
        cache.set(key, json.dumps(otp_data), timeout=ttl_minutes * 60)
        
        return json.dumps(otp_data), code
    
    @classmethod
    def verify(cls, email: str, purpose: str, code: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        OTP 코드 검증
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적
            code: 입력된 OTP 코드
            
        Returns:
            (success, message, otp_data) 튜플
            - success: 검증 성공 여부
            - message: 결과 메시지
            - otp_data: OTP 데이터 (성공 시)
        """
        key = cls._generate_key(email, purpose)
        cached_data = cache.get(key)
        
        if not cached_data:
            return False, "인증번호를 먼저 요청해 주세요.", None
        
        try:
            otp_data = json.loads(cached_data)
        except (json.JSONDecodeError, TypeError):
            return False, "인증번호 데이터가 손상되었습니다.", None
        
        # 시도 횟수 확인
        if otp_data.get('attempts', 0) >= cls.MAX_ATTEMPTS:
            # 시도 횟수 초과 시 OTP 삭제
            cache.delete(key)
            return False, "시도 횟수를 초과했습니다. 다시 요청해 주세요.", None
        
        # 코드 검증
        if not cls._verify_hash(code, otp_data['code_hash']):
            # 실패 시 시도 횟수 증가
            otp_data['attempts'] += 1
            cache.set(key, json.dumps(otp_data), timeout=cache.ttl(key))
            return False, "인증번호가 올바르지 않습니다.", None
        
        # 성공 시 verified=True로 업데이트
        otp_data['verified'] = True
        cache.set(key, json.dumps(otp_data), timeout=cache.ttl(key))
        
        return True, "인증번호 검증이 완료되었습니다.", otp_data
    
    @classmethod
    def get(cls, email: str, purpose: str) -> Optional[Dict[str, Any]]:
        """
        OTP 데이터 조회
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적
            
        Returns:
            OTP 데이터 또는 None
        """
        key = cls._generate_key(email, purpose)
        cached_data = cache.get(key)
        
        if not cached_data:
            return None
        
        try:
            return json.loads(cached_data)
        except (json.JSONDecodeError, TypeError):
            return None
    
    @classmethod
    def delete(cls, email: str, purpose: str) -> bool:
        """
        OTP 데이터 삭제
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적
            
        Returns:
            삭제 성공 여부
        """
        key = cls._generate_key(email, purpose)
        return cache.delete(key)
    
    @classmethod
    def exists(cls, email: str, purpose: str) -> bool:
        """
        OTP 존재 여부 확인
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적
            
        Returns:
            존재 여부
        """
        key = cls._generate_key(email, purpose)
        return cache.get(key) is not None
    
    @classmethod
    def get_ttl(cls, email: str, purpose: str) -> int:
        """
        OTP 남은 만료 시간 조회 (초 단위)
        
        Args:
            email: 이메일 주소
            purpose: OTP 목적
            
        Returns:
            남은 만료 시간 (초), -1은 만료되지 않음, -2는 키가 존재하지 않음
        """
        key = cls._generate_key(email, purpose)
        return cache.ttl(key)
    
    @classmethod
    def cleanup_expired(cls) -> int:
        """
        만료된 OTP 정리 (Redis TTL이 자동 처리하므로 실제로는 불필요)
        
        Returns:
            정리된 OTP 개수 (항상 0, Redis가 자동 처리)
        """
        # Redis TTL이 자동으로 만료된 키를 삭제하므로 별도 정리 불필요
        return 0
