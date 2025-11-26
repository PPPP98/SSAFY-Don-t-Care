# type: ignore
import re
import logging
from django.utils import timezone
from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import user_email, user_field
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .redis_otp import RedisOTPManager
from .utils import validate_email_format, validate_email_comprehensive
from typing import Any, Dict

logger = logging.getLogger(__name__)

User = get_user_model()


class JWTLoginSerializer(TokenObtainPairSerializer):
    """
    JWT 로그인 시 사용자 정보를 커스터마이징
    first_name, last_name 대신 name 필드 반환
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        return token

    def validate(self, attrs):
        logger.debug("JWTLoginSerializer.validate() 호출됨")
        data = super().validate(attrs)
        
        # user 속성이 None이 아님을 보장
        if not hasattr(self, 'user') or self.user is None:
            raise serializers.ValidationError("사용자 정보를 찾을 수 없습니다.")
            
        logger.debug(f"사용자 정보: pk={self.user.pk}, email={self.user.email}")

        # 사용자 정보를 커스터마이징
        data["user"] = {
            "pk": self.user.pk,
            "email": self.user.email,
            "name": self.user.name,
        }
        logger.debug("JWT 로그인 응답 커스터마이징 완료")

        return data


class CustomJWTSerializer(serializers.Serializer):
    """
    JWT 응답을 커스터마이징하는 Serializer
    first_name, last_name 대신 name 필드 반환
    """

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = serializers.SerializerMethodField()

    def get_user(self, obj):
        user = obj.get("user")
        if user:
            return {
                "pk": user.pk,
                "email": user.email,
                "name": user.name,
            }
        return None


class EmailValidationSerializer(serializers.Serializer):
    """이메일 중복 체크 및 형식 검증을 위한 Serializer"""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        # 이메일 형식 검증
        validate_email_format(value)

        # 이메일 중복 검증
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value


class CustomAccountAdapter(DefaultAccountAdapter):
    def save_user(self, request, user, form, commit=True):
        """
        등록 폼에서 제공된 정보를 사용하여 새로운 `User` 인스턴스를 저장합니다.
        """
        data = form.cleaned_data
        email = data.get("email")
        name = data.get("name")

        # 이메일 형식 검증
        validate_email_format(email)

        user_email(user, email)
        user_field(user, "name", name)

        if "password1" in data:
            user.set_password(data["password1"])
        else:
            user.set_unusable_password()

        self.populate_username(request, user)

        # 이메일 인증 상태 설정
        if commit:
            user.save()
            user.emailaddress_set.create(email=user.email, verified=True, primary=True)

        return user


class CustomRegisterSerializer(RegisterSerializer):
    username = None
    email = serializers.EmailField(required=True)
    name = serializers.CharField(max_length=50)

    def validate_email(self, email):
        # 이메일 형식 검증
        validate_email_format(email)
        # 부모 클래스의 이메일 검증도 수행
        email = super().validate_email(email)
        return email

    def get_cleaned_data(self):
        return {
            "password1": self.validated_data.get("password1", ""),
            "email": self.validated_data.get("email", ""),
            "name": self.validated_data.get("name", ""),
        }

    def custom_signup(self, request, user):
        user.name = self.get_cleaned_data().get("name")
        user.save()
        # 이메일 인증 상태를 True로 설정
        user.is_active = True
        user.emailaddress_set.create(email=user.email, verified=True, primary=True)
        user.save()


# ─────────────────────────────────────────────────────────────────────────────
# 공통 베이스: OTP Request / Verify
# purpose 값으로 'signup' 또는 'password_reset'을 강제
# ─────────────────────────────────────────────────────────────────────────────


class _EmailOTPRequestBase(serializers.Serializer):
    email = serializers.EmailField()

    purpose: str  # 하위 클래스에서 지정

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        email = attrs["email"]

        if self.purpose == RedisOTPManager.PURPOSE_SIGNUP:
            # 회원가입용: 아직 가입되지 않은 이메일이어야 함
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError("이미 가입된 이메일입니다.")
        elif self.purpose == RedisOTPManager.PURPOSE_PASSWORD_RESET:
            # 비번 재설정용: 반드시 가입된 이메일이어야 함
            if not User.objects.filter(email=email).exists():
                raise serializers.ValidationError("가입되지 않은 이메일입니다.")
        else:
            raise serializers.ValidationError("유효하지 않은 목적(purpose) 입니다.")

        return attrs

    def create(self, validated_data):
        # RedisOTPManager 사용으로 변경
        otp_data, code = RedisOTPManager.issue(validated_data["email"], self.purpose)
        return otp_data, code  # view에서 이메일 발송 시 코드 사용


class SignupEmailOTPRequestSerializer(_EmailOTPRequestBase):
    purpose = RedisOTPManager.PURPOSE_SIGNUP


class PasswordResetEmailOTPRequestSerializer(_EmailOTPRequestBase):
    purpose = RedisOTPManager.PURPOSE_PASSWORD_RESET


# ─────────────────────────────────────────────────────────────────────────────
# 이메일 중복체크 + OTP 발송 통합 API
# ─────────────────────────────────────────────────────────────────────────────


class EmailCheckAndOTPRequestSerializer(serializers.Serializer):
    """
    이메일 중복체크와 OTP 발송을 하나의 API로 통합
    - 이메일 형식 검증
    - 실제 이메일 주소 존재 검증 (DNS 조회)
    - 이메일 중복 검증
    - 사용 가능한 이메일이면 OTP 발송
    """

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        # 1. 이메일 형식 검증
        validate_email_format(value)

        # 2. 실제 이메일 주소 존재 검증
        normalized_email = validate_email_comprehensive(value)

        # 3. 이메일 중복 검증
        if User.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")

        return normalized_email

    def create(self, validated_data):
        email = validated_data["email"]
        # RedisOTPManager 사용으로 변경
        otp_data, code = RedisOTPManager.issue(email, RedisOTPManager.PURPOSE_SIGNUP)
        return otp_data, code


class _EmailOTPVerifyBase(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r"^\d{6}$", max_length=6)
    purpose: str  # 하위 클래스에서 지정

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        email = attrs["email"]
        code = attrs["code"]
        
        # RedisOTPManager 사용으로 변경
        success, message, otp_data = RedisOTPManager.verify(email, self.purpose, code)
        
        if not success:
            raise serializers.ValidationError(message)
        
        attrs["otp_data"] = otp_data
        return attrs

    def save(self, **kwargs):
        # RedisOTPManager는 verify 메서드에서 이미 verified=True로 설정
        # 별도의 save 작업 불필요
        return self.validated_data["otp_data"]


class SignupEmailOTPVerifySerializer(_EmailOTPVerifyBase):
    purpose = RedisOTPManager.PURPOSE_SIGNUP


class PasswordResetEmailOTPVerifySerializer(_EmailOTPVerifyBase):
    purpose = RedisOTPManager.PURPOSE_PASSWORD_RESET


# ─────────────────────────────────────────────────────────────────────────────
# 회원가입 완료 (OTP: signup)
# ─────────────────────────────────────────────────────────────────────────────


class RegistrationCompleteWithOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=20)
    password1 = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        # Django 비밀번호 검증 규칙 적용
        try:
            validate_password(attrs["password1"])
        except ValidationError as e:
            raise serializers.ValidationError({"password1": list(e.messages)})
        # RedisOTPManager 사용으로 변경
        otp_data = RedisOTPManager.get(attrs["email"], RedisOTPManager.PURPOSE_SIGNUP)
        if not otp_data:
            raise serializers.ValidationError("이메일 인증이 필요합니다.")
        if not otp_data.get('verified', False):
            raise serializers.ValidationError("이메일 인증이 완료되지 않았습니다.")
        return attrs

    def create(self, validated_data):
        email = validated_data["email"]
        name = validated_data["name"]
        password = validated_data["password1"]
        user = User.objects.create_user(email=email, password=password, name=name)

        # 이메일 인증 상태를 True로 설정 (allauth EmailAddress 모델)
        from allauth.account.models import EmailAddress

        EmailAddress.objects.create(
            user=user, email=user.email, verified=True, primary=True
        )

        # 가입 완료 후 OTP 정리(삭제)
        RedisOTPManager.delete(email, RedisOTPManager.PURPOSE_SIGNUP)
        return user


# ─────────────────────────────────────────────────────────────────────────────
# 비밀번호 재설정 (OTP: password_reset)
# ─────────────────────────────────────────────────────────────────────────────


class PasswordResetWithOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    new_password1 = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password1"] != attrs["new_password2"]:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        # Django 비밀번호 검증 규칙 적용
        try:
            validate_password(attrs["new_password1"])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password1": list(e.messages)})
        # RedisOTPManager 사용으로 변경
        otp_data = RedisOTPManager.get(attrs["email"], RedisOTPManager.PURPOSE_PASSWORD_RESET)
        if not otp_data:
            raise serializers.ValidationError("인증번호 검증이 필요합니다.")
        if not otp_data.get('verified', False):
            raise serializers.ValidationError("인증번호 검증이 완료되지 않았습니다.")

        # 사용자 존재 확인
        try:
            self.user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("가입되지 않은 이메일입니다.")
        return attrs

    def create(self, validated_data):
        # 새 비밀번호 설정
        self.user.set_password(validated_data["new_password1"])
        self.user.save(update_fields=["password"])
        # OTP 정리(삭제)
        RedisOTPManager.delete(validated_data["email"], RedisOTPManager.PURPOSE_PASSWORD_RESET)
        return self.user

# ─────────────────────────────────────────────────────────────────────────────
# 로그인한 사용자의 비밀번호 검증 (현재 비밀번호만 확인)
# ─────────────────────────────────────────────────────────────────────────────
class PasswordVerifySerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value

    def validate(self, attrs):
        # current_password 필드의 개별 검증이 실행됨
        return attrs


# ─────────────────────────────────────────────────────────────────────────────
# 로그인한 사용자의 비밀번호 변경 (새 비밀번호만 입력)
# ─────────────────────────────────────────────────────────────────────────────
class ChangePasswordSerializer(serializers.Serializer):
    new_password1 = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["new_password1"] != attrs["new_password2"]:
            raise serializers.ValidationError("새 비밀번호가 일치하지 않습니다.")
        try:
            validate_password(attrs["new_password1"])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password1": list(e.messages)})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password1"])
        user.save()
        return user


# ─────────────────────────────────────────────────────────────────────────────
# 현재 비밀번호 검증 + 새 비밀번호 변경 통합 API
# ─────────────────────────────────────────────────────────────────────────────


class CombinedPasswordChangeSerializer(serializers.Serializer):
    """
    현재 비밀번호 검증과 새 비밀번호 변경을 하나의 API로 통합
    - 현재 비밀번호 검증
    - 새 비밀번호 형식 검증
    - 비밀번호 변경
    """

    current_password = serializers.CharField(write_only=True)
    new_password1 = serializers.CharField(write_only=True, min_length=8)
    new_password2 = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value

    def validate(self, attrs):
        # 새 비밀번호 일치 검증
        if attrs["new_password1"] != attrs["new_password2"]:
            raise serializers.ValidationError("새 비밀번호가 일치하지 않습니다.")

        # Django 비밀번호 검증 규칙 적용
        try:
            validate_password(attrs["new_password1"])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password1": list(e.messages)})

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password1"])
        user.save()


# ─────────────────────────────────────────────────────────────────────────────
# 사용자 정보 수정 (현재 비밀번호 검증 포함)
# ─────────────────────────────────────────────────────────────────────────────

from dj_rest_auth.serializers import UserDetailsSerializer


class UserDetailsReadSerializer(serializers.ModelSerializer):
    """
    사용자 정보 조회용 Serializer (GET 요청)
    - current_password 없이 조회만 수행
    """
    
    class Meta:
        model = User
        fields = ('pk', 'email', 'name')
        read_only_fields = ('pk', 'email')


class UserDetailsWriteSerializer(serializers.ModelSerializer):
    """
    사용자 정보 수정용 Serializer (PUT/PATCH 요청)
    - 현재 비밀번호 검증 필수
    - 보안 강화된 사용자 정보 수정
    """
    
    current_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('pk', 'email', 'name')
        read_only_fields = ('pk', 'email')
    
    def validate_current_password(self, value):
        """현재 비밀번호 검증"""
        if not value:
            raise serializers.ValidationError("현재 비밀번호를 입력해주세요.")
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value
    
    def validate(self, attrs):
        """전체 데이터 검증"""
        # current_password 필드의 개별 검증이 실행됨
        return attrs
    
    def update(self, instance, validated_data):
        """사용자 정보 업데이트"""
        # current_password는 검증용이므로 제거
        validated_data.pop('current_password', None)
        
        # 사용자 정보 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class CustomUserDetailsSerializer(UserDetailsSerializer):
    """
    사용자 정보 조회/수정을 위한 커스텀 Serializer
    - /auth/user/ 엔드포인트에서 email, name 필드만 반환
    - GET 요청: current_password 없이 조회
    - PUT/PATCH 요청: current_password 검증 후 수정
    - 보안 강화된 사용자 정보 수정
    """

    current_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('pk', 'email', 'name', 'current_password')
        read_only_fields = ('pk', 'email')
    
    def validate_current_password(self, value):
        """현재 비밀번호 검증 (PUT/PATCH 요청일 때만)"""
        # GET 요청일 때는 current_password 검증 건너뛰기
        if self.context['request'].method == 'GET':
            return value
            
        if not value:
            raise serializers.ValidationError("현재 비밀번호를 입력해주세요.")
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value
    
    def validate(self, attrs):
        """전체 데이터 검증"""
        # current_password 필드의 개별 검증이 실행됨
        return attrs
    
    def update(self, instance, validated_data):
        """사용자 정보 업데이트"""
        # current_password는 검증용이므로 제거
        validated_data.pop('current_password', None)
        
        # 사용자 정보 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


# ─────────────────────────────────────────────────────────────────────────────
# 회원 탈퇴 기능
# ─────────────────────────────────────────────────────────────────────────────


class AccountDeleteSerializer(serializers.Serializer):
    """
    회원 탈퇴를 위한 Serializer
    - 현재 비밀번호 검증
    - 탈퇴 사유 수집 (선택사항)
    - 계정 비활성화 처리
    """

    current_password = serializers.CharField(write_only=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value

    def validate(self, attrs):
        # current_password 필드의 개별 검증이 실행됨
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        # 계정 비활성화
        user.is_active = False
        user.save()
        return user
