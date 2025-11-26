# accounts/utils.py
"""
공통 유틸리티 함수들
"""
import re
from django.core.exceptions import ValidationError
from email_validator import validate_email, EmailNotValidError


def validate_email_format(email):
    """
    공통 이메일 형식 검증 함수
    정규식을 사용한 기본적인 이메일 형식 검증
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("올바른 이메일 형식이 아닙니다.")
    return email


def validate_email_comprehensive(email):
    """
    이메일 주소 종합 형식 검증
    email_validator 라이브러리를 사용한 고급 형식 검증 (네트워크 요청 없음)
    실패 시 기본 정규식 검증으로 fallback
    """
    try:
        # check_deliverability=False로 네트워크 요청 없이 형식만 검증
        emailinfo = validate_email(email, check_deliverability=False)
        return emailinfo.normalized
    except EmailNotValidError:
        # 형식 검증 실패 시 기본 형식 검증으로 fallback
        return validate_email_format(email)