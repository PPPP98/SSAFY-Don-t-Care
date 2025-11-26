from django.urls import path, include
from .views import (
    # 회원가입
    SignupEmailOTPVerifyView,
    SignupEmailOTPCompleteView,
    # 통합 API
    SignupEmailCheckAndOTPRequestView,
    # 비밀번호 재설정
    PasswordResetEmailOTPRequestView,
    PasswordResetEmailOTPVerifyView,
    PasswordResetConfirmWithOTPView,
    # 통합 API
    CombinedPasswordChangeView,
    # 사용자 정보 수정
    CustomUserDetailsView,
    # 회원 탈퇴
    AccountDeleteView,
)

urlpatterns = [
    # ── 사용자 정보 수정 (보안 강화) - 반드시 먼저 배치 ─────────────────────────
    path('user/', CustomUserDetailsView.as_view(), name='user_details'),
    
    # dj-rest-auth 기본 인증 세트 (JWT 로그인/로그아웃/토큰 갱신 등)
    # OTP 기반 회원가입/비밀번호 재설정과 함께 사용
    path('', include('dj_rest_auth.urls')),

    # ── 회원가입: 이메일 중복체크 및 OTP ─────────────────────────
    path('signup/otp/verify/',   SignupEmailOTPVerifyView.as_view(),  name='signup_otp_verify'),
    path('signup/otp/complete/', SignupEmailOTPCompleteView.as_view(),  name='signup_otp_complete'),
    
    # ── 통합 API: 이메일 중복체크 + OTP 발송 (RECOMMENDED) ──────────────────────
    path('signup/email/otp/request/', SignupEmailCheckAndOTPRequestView.as_view(), name='signup_email_check_and_otp'),

    # ── 비밀번호 재설정용 OTP ──────────────────────────────────
    path('password/reset/otp/request/', PasswordResetEmailOTPRequestView.as_view(), name='password_otp_request'),
    path('password/reset/otp/verify/',  PasswordResetEmailOTPVerifyView.as_view(),  name='password_otp_verify'),
    path('password/reset/otp/complete/', PasswordResetConfirmWithOTPView.as_view(),  name='password_otp_reset'),

    
    # ── 통합 API: 현재 비밀번호 검증 + 새 비밀번호 변경 (RECOMMENDED) ──────────────────
    path('password/change/', CombinedPasswordChangeView.as_view(), name='password_change_combined'),


    # ── 회원 탈퇴 ─────────────────────────────────────────────
    path('delete/', AccountDeleteView.as_view(), name='account_delete'),
]

