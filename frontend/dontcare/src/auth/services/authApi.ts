import { apiClient, handleApiError } from '@/shared/lib/apiClient';
import type {
  User,
  TokenResponse,
  MessageResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  VerifyTokenRequest,
  LoginRequest,
  LogoutRequest,
  UserUpdateRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  SignupEmailOtpRequest,
  SignupOtpVerifyRequest,
  SignupCompleteRequest,
  PasswordResetOtpRequest,
  PasswordResetOtpVerifyRequest,
  PasswordResetOtpCompleteRequest,
  DeleteAccountRequest,
} from '@/auth/types/auth.api.types';

/**
 * 인증 관련 API 모듈
 *
 * @description
 * - JWT 토큰 관리
 * - 기본 인증 (로그인, 로그아웃, 사용자 정보)
 * - 비밀번호 관리
 * - 회원가입 (OTP 기반)
 * - 비밀번호 재설정 (OTP 기반)
 * - 회원 탈퇴
 */

// ============================================================================
// JWT 토큰 관리 API
// ============================================================================

/**
 * 토큰 갱신
 * POST /auth/token/refresh/
 */
export const refreshTokenApi = async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  try {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/token/refresh/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 토큰 검증
 * POST /auth/token/verify/
 */
export const verifyTokenApi = async (data: VerifyTokenRequest): Promise<object> => {
  try {
    const response = await apiClient.post<object>('/auth/token/verify/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================================
// 기본 인증 API
// ============================================================================

/**
 * 로그인
 * POST /auth/login/
 */
export const loginApi = async (data: LoginRequest): Promise<TokenResponse> => {
  try {
    const response = await apiClient.post<TokenResponse>('/auth/login/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 로그아웃
 * POST /auth/logout/
 */
export const logoutApi = async (data: LogoutRequest): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/logout/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 사용자 정보 조회
 * GET /auth/user/
 */
export const getUserApi = async (): Promise<User> => {
  try {
    const response = await apiClient.get<User>('/auth/user/');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 사용자 정보 수정
 * PUT/PATCH /auth/user/
 */
export const updateUserApi = async (data: UserUpdateRequest): Promise<User> => {
  try {
    const response = await apiClient.patch<User>('/auth/user/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================================
// 비밀번호 관리 API
// ============================================================================

/**
 * 비밀번호 변경 (현재 비밀번호 검증 + 새 비밀번호 변경 통합)
 * PUT /auth/password/change/
 */
export const changePasswordApi = async (data: ChangePasswordRequest): Promise<MessageResponse> => {
  try {
    const response = await apiClient.put<MessageResponse>('/auth/password/change/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 비밀번호 재설정 요청
 * POST /auth/password/reset/
 */
export const requestPasswordResetApi = async (
  data: PasswordResetRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/password/reset/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 비밀번호 재설정 확인
 * POST /auth/password/reset/confirm/
 */
export const confirmPasswordResetApi = async (
  data: PasswordResetConfirmRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/password/reset/confirm/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================================
// 회원가입 API (OTP 기반)
// ============================================================================

/**
 * 이메일 중복체크 + OTP 발송 통합
 * POST /auth/signup/email/otp/request/
 */
export const requestSignupEmailOtpApi = async (
  data: SignupEmailOtpRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/signup/email/otp/request/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 회원가입 OTP 검증
 * POST /auth/signup/otp/verify/
 */
export const verifySignupOtpApi = async (
  data: SignupOtpVerifyRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/signup/otp/verify/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 회원가입 완료
 * POST /auth/signup/otp/complete/
 */
export const completeSignupApi = async (data: SignupCompleteRequest): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>('/auth/signup/otp/complete/', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================================
// 비밀번호 재설정 API (OTP 기반)
// ============================================================================

/**
 * 비밀번호 재설정 OTP 요청
 * POST /auth/password/reset/otp/request/
 */
export const requestPasswordResetOtpApi = async (
  data: PasswordResetOtpRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>(
      '/auth/password/reset/otp/request/',
      data,
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 비밀번호 재설정 OTP 검증
 * POST /auth/password/reset/otp/verify/
 */
export const verifyPasswordResetOtpApi = async (
  data: PasswordResetOtpVerifyRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>(
      '/auth/password/reset/otp/verify/',
      data,
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 비밀번호 재설정 완료
 * POST /auth/password/reset/otp/complete/
 */
export const completePasswordResetApi = async (
  data: PasswordResetOtpCompleteRequest,
): Promise<MessageResponse> => {
  try {
    const response = await apiClient.post<MessageResponse>(
      '/auth/password/reset/otp/complete/',
      data,
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// ============================================================================
// 회원 탈퇴 API
// ============================================================================

/**
 * 회원 탈퇴
 * DELETE /auth/delete/
 */
export const deleteAccountApi = async (data: DeleteAccountRequest): Promise<MessageResponse> => {
  try {
    const response = await apiClient.delete<MessageResponse>('/auth/delete/', { data });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
