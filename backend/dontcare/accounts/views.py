from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from django.core.mail import send_mail
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django_ratelimit.exceptions import Ratelimited
import logging

from .serializers import (
    # 회원가입용
    SignupEmailOTPVerifySerializer,
    RegistrationCompleteWithOTPSerializer,
    # 통합 API용
    EmailCheckAndOTPRequestSerializer,
    # 비밀번호 재설정용
    PasswordResetEmailOTPRequestSerializer,
    PasswordResetEmailOTPVerifySerializer,
    PasswordResetWithOTPSerializer,
    # 통합 API용
    CombinedPasswordChangeSerializer,
    # 사용자 정보 수정용
    CustomUserDetailsSerializer,
    UserDetailsReadSerializer,
    UserDetailsWriteSerializer,
    # 회원 탈퇴용
    AccountDeleteSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
# 회원가입: 이메일 중복체크 / OTP 요청 / OTP 검증 / 가입완료
# ─────────────────────────────────────────────────────────────────────────────

from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


def handle_ratelimit_exception(func):
    """
    Rate limiting 예외를 처리하는 데코레이터
    """
    def wrapper(self, request, *args, **kwargs):
        try:
            return func(self, request, *args, **kwargs)
        except Ratelimited:
            logger.warning(f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, endpoint: {request.path}")
            return Response(
                {"detail": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
    return wrapper

@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='create')
class SignupEmailOTPVerifyView(generics.CreateAPIView):
    """
    POST /auth/signup/otp/verify/
    body: { "email": "...", "code": "123456" }
    - 코드 일치 시 verified=True 설정
    - Rate limiting: IP당 10회/분
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = SignupEmailOTPVerifySerializer

    @handle_ratelimit_exception
    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"OTP verification attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            s = self.get_serializer(data=request.data)
            s.is_valid(raise_exception=True)
            s.save()
            
            logger.info(f"OTP verification successful for email: {email}")
            return Response({"detail": "이메일 인증이 완료되었습니다."}, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            logger.warning(f"OTP verification failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during OTP verification for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SignupEmailOTPCompleteView(generics.CreateAPIView):
    """
    POST /auth/signup/otp/complete/
    body: { "email": "...", "name": "...", "password1": "...", "password2": "..." }
    - verified=True (signup) 인 경우에만 User 생성
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = RegistrationCompleteWithOTPSerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"Signup completion attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            s = self.get_serializer(data=request.data)
            s.is_valid(raise_exception=True)
            user = s.save()

            logger.info(f"Signup completed successfully for email: {email}, User ID: {user.pk}")
            return Response({"detail": "회원가입이 완료되었습니다."}, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            logger.warning(f"Signup completion failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during signup completion for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────────────────────────────────────
# 통합 API: 이메일 중복체크 + OTP 발송
# ─────────────────────────────────────────────────────────────────────────────

@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='create')
class SignupEmailCheckAndOTPRequestView(generics.CreateAPIView):
    """
    POST /auth/signup/email/check-and-otp/
    body: { "email": "..." }
    - 이메일 형식 검증, 중복 체크, 사용 가능하면 바로 OTP 발송
    - Rate limiting: IP당 5회/분
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailCheckAndOTPRequestSerializer

    @handle_ratelimit_exception
    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"OTP request attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            otp_obj, code = serializer.save()  # 코드 원문은 이 시점에만 확보

            try:
                send_mail(
                    subject="회원가입 인증번호",
                    message=f"인증번호: {code}\n(10분 내 입력해 주세요)",
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    recipient_list=[email],
                )
                logger.info(f"OTP email sent successfully to: {email}")
            except Exception as e:
                logger.error(f"Failed to send OTP email to {email}: {str(e)}")
                # 이메일 발송 실패 시 생성된 OTP 삭제 (보안상 중요)
                from .redis_otp import RedisOTPManager
                RedisOTPManager.delete(email, RedisOTPManager.PURPOSE_SIGNUP)
                return Response(
                    {"detail": "인증번호 발송에 실패했습니다. 이메일 주소를 확인하고 다시 시도해주세요."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response({
                "detail": "사용 가능한 이메일입니다. 인증번호가 발송되었습니다."
            }, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            logger.warning(f"OTP request failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during OTP request for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "인증번호 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────────────────────────────────────
# 비밀번호 재설정 OTP: 요청 / 검증 / 비밀번호 변경
# ─────────────────────────────────────────────────────────────────────────────

@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='create')
class PasswordResetEmailOTPRequestView(generics.CreateAPIView):
    """
    POST /auth/password/otp/request/
    body: { "email": "..." }
    - 가입된 이메일에 6자리 코드 발송
    - Rate limiting: IP당 5회/분
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetEmailOTPRequestSerializer

    @handle_ratelimit_exception
    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"Password reset OTP request attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            s = self.get_serializer(data=request.data)
            s.is_valid(raise_exception=True)
            otp_obj, code = s.save()

            try:
                send_mail(
                    subject="비밀번호 재설정 인증번호",
                    message=f"인증번호: {code}\n(10분 내 입력해 주세요)",
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    recipient_list=[email],
                )
                logger.info(f"Password reset OTP email sent successfully to: {email}")
            except Exception as e:
                logger.error(f"Failed to send password reset OTP email to {email}: {str(e)}")
                # 이메일 발송 실패 시 생성된 OTP 삭제 (보안상 중요)
                from .redis_otp import RedisOTPManager
                RedisOTPManager.delete(email, RedisOTPManager.PURPOSE_PASSWORD_RESET)
                return Response(
                    {"detail": "인증번호 발송에 실패했습니다. 이메일 주소를 확인하고 다시 시도해주세요."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            return Response({"detail": "인증번호가 발송되었습니다."}, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            logger.warning(f"Password reset OTP request failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password reset OTP request for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "비밀번호 재설정 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetEmailOTPVerifyView(generics.CreateAPIView):
    """
    POST /auth/password/otp/verify/
    body: { "email": "...", "code": "123456" }
    - 코드 일치 시 verified=True 설정
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetEmailOTPVerifySerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"Password reset OTP verification attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            s = self.get_serializer(data=request.data)
            s.is_valid(raise_exception=True)
            s.save()
            
            logger.info(f"Password reset OTP verification successful for email: {email}")
            return Response({"detail": "인증번호 검증이 완료되었습니다."}, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            logger.warning(f"Password reset OTP verification failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password reset OTP verification for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "인증번호 검증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmWithOTPView(generics.CreateAPIView):
    """
    POST /auth/password/otp/reset/
    body: { "email": "...", "new_password1": "...", "new_password2": "..." }
    - verified=True (password_reset) 인 경우에만 비밀번호 변경
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetWithOTPSerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', 'Unknown')
        logger.info(f"Password reset completion attempt for email: {email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            s = self.get_serializer(data=request.data)
            s.is_valid(raise_exception=True)
            s.save()
            
            logger.info(f"Password reset completed successfully for email: {email}")
            return Response({"detail": "비밀번호가 변경되었습니다."}, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            logger.warning(f"Password reset completion failed for email: {email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password reset completion for email: {email}, error: {str(e)}")
            return Response(
                {"detail": "비밀번호 재설정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# ─────────────────────────────────────────────────────────────────────────────
# 통합 API: 현재 비밀번호 검증 + 새 비밀번호 변경
# ─────────────────────────────────────────────────────────────────────────────

class CombinedPasswordChangeView(generics.UpdateAPIView):
    """
    PUT /auth/password/change-combined/
    body: { 
        "current_password": "현재비밀번호", 
        "new_password1": "새비밀번호", 
        "new_password2": "새비밀번호확인" 
    }
    - 현재 비밀번호 검증 후 새 비밀번호로 변경 (한 번의 API 호출로 처리)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CombinedPasswordChangeSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user_email = request.user.email
        logger.info(f"Password change attempt for user: {user_email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            logger.info(f"Password change completed successfully for user: {user_email}")
            return Response(
                {"detail": "현재 비밀번호 검증 완료 후 비밀번호가 성공적으로 변경되었습니다."}, 
                status=status.HTTP_200_OK
            )
        
        except ValidationError as e:
            logger.warning(f"Password change failed for user: {user_email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password change for user: {user_email}, error: {str(e)}")
            return Response(
                {"detail": "비밀번호 변경 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────────────────────────────────────
# 사용자 정보 수정 (현재 비밀번호 검증 포함)
# ─────────────────────────────────────────────────────────────────────────────

class CustomUserDetailsView(generics.RetrieveUpdateAPIView):
    """
    GET, PUT, PATCH /auth/user/
    - 현재 비밀번호 검증이 포함된 사용자 정보 조회/수정
    - 보안 강화된 사용자 정보 관리
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """요청 메서드에 따라 다른 serializer 반환"""
        if self.request.method == 'GET':
            return UserDetailsReadSerializer
        else:  # PUT, PATCH
            return UserDetailsWriteSerializer
    
    def get_object(self):
        return self.request.user
    
    def get(self, request, *args, **kwargs):
        """사용자 정보 조회"""
        user_email = request.user.email
        logger.info(f"User info retrieval attempt for user: {user_email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            serializer = self.get_serializer(self.get_object())
            logger.info(f"User info retrieved successfully for user: {user_email}")
            return Response(serializer.data)
        
        except Exception as e:
            logger.error(f"Unexpected error during user info retrieval for user: {user_email}, error: {str(e)}")
            return Response(
                {"detail": "사용자 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request, *args, **kwargs):
        """사용자 정보 전체 수정 (현재 비밀번호 검증 필요)"""
        user_email = request.user.email
        logger.info(f"User info update (PUT) attempt for user: {user_email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            if 'current_password' not in request.data or not request.data['current_password']:
                logger.warning(f"User info update failed - missing current password for user: {user_email}")
                return Response(
                    {"current_password": ["현재 비밀번호를 입력해주세요."]}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = self.get_serializer(
                self.get_object(), 
                data=request.data, 
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            logger.info(f"User info updated successfully (PUT) for user: {user_email}")
            return Response(serializer.data)
        
        except ValidationError as e:
            logger.warning(f"User info update failed (PUT) for user: {user_email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during user info update (PUT) for user: {user_email}, error: {str(e)}")
            return Response(
                {"detail": "사용자 정보 수정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def patch(self, request, *args, **kwargs):
        """사용자 정보 부분 수정 (현재 비밀번호 검증 필요)"""
        user_email = request.user.email
        logger.info(f"User info update (PATCH) attempt for user: {user_email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            if 'current_password' not in request.data or not request.data['current_password']:
                logger.warning(f"User info update failed - missing current password for user: {user_email}")
                return Response(
                    {"current_password": ["현재 비밀번호를 입력해주세요."]}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = self.get_serializer(
                self.get_object(), 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            logger.info(f"User info updated successfully (PATCH) for user: {user_email}")
            return Response(serializer.data)
        
        except ValidationError as e:
            logger.warning(f"User info update failed (PATCH) for user: {user_email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during user info update (PATCH) for user: {user_email}, error: {str(e)}")
            return Response(
                {"detail": "사용자 정보 수정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────────────────────────────────────
# 회원 탈퇴 기능
# ─────────────────────────────────────────────────────────────────────────────

class AccountDeleteView(generics.DestroyAPIView):
    """
    DELETE /auth/account/delete/
    body: { 
        "current_password": "현재비밀번호",
        "reason": "탈퇴사유" (선택사항)
    }
    - 현재 비밀번호 확인 후 계정 비활성화
    - 관련 데이터 정리
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountDeleteSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user_email = request.user.email
        logger.info(f"Account deletion attempt for user: {user_email}, IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            logger.info(f"Account deletion completed successfully for user: {user_email}")
            return Response({
                "detail": "회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다."
            }, status=status.HTTP_200_OK)
        
        except ValidationError as e:
            logger.warning(f"Account deletion failed for user: {user_email}, error: {str(e)}")
            # ValidationError는 DRF에서 자동으로 400 상태 코드와 함께 처리됨
            raise
        except Exception as e:
            logger.error(f"Unexpected error during account deletion for user: {user_email}, error: {str(e)}")
            return Response(
                {"detail": "회원 탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

