/**
 * 인증 관련 API 타입 정의
 *
 * @description
 * - API 요청/응답 타입들을 명확하게 정의
 * - API 가이드 문서와 100% 일치
 * - 타입 안전성과 코드 가독성 향상
 */

// ============================================================================
// 기본 응답 타입
// ============================================================================

/**
 * API 응답 기본 구조
 */
export interface ApiResponse<T = unknown> {
  readonly data: T;
  readonly message?: string;
  readonly success: boolean;
  readonly timestamp: string;
}

/**
 * API 에러 타입
 */
export interface ApiError {
  readonly message: string;
  readonly code?: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;
}

/**
 * 일반 메시지 응답 타입
 */
export interface MessageResponse {
  readonly detail: string;
}

// ============================================================================
// 사용자 관련 타입
// ============================================================================

/**
 * 사용자 정보 타입
 */
export interface User {
  readonly pk: number;
  readonly email: string;
  readonly name: string;
}

/**
 * localStorage에 저장할 안전한 사용자 정보 타입 (pk 제외)
 */
export interface SafeUserInfo {
  readonly email: string;
  readonly name: string;
}

/**
 * 사용자 정보 수정 요청 타입
 */
export interface UserUpdateRequest {
  readonly email?: string;
  readonly name?: string;
}

// ============================================================================
// JWT 토큰 관련 타입
// ============================================================================

/**
 * JWT 토큰 응답 타입 (로그인 응답)
 */
export interface TokenResponse {
  readonly access: string;
  readonly refresh: string;
  readonly user: User;
}

/**
 * 토큰 갱신 요청 타입
 * httpOnly 쿠키로 refresh token이 자동 전송되므로 body는 비어있음
 */
export type RefreshTokenRequest = object;

/**
 * 토큰 갱신 응답 타입
 */
export interface RefreshTokenResponse {
  readonly access: string;
}

/**
 * 토큰 검증 요청 타입
 */
export interface VerifyTokenRequest {
  readonly token: string;
}

// ============================================================================
// 로그인/로그아웃 관련 타입
// ============================================================================

/**
 * 로그인 요청 타입
 */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

/**
 * 로그아웃 요청 타입
 */
export interface LogoutRequest {
  readonly refresh: string;
}

// ============================================================================
// 비밀번호 관련 타입
// ============================================================================

/**
 * 비밀번호 변경 요청 타입 (현재 비밀번호 검증 + 새 비밀번호 변경 통합)
 */
export interface ChangePasswordRequest {
  readonly current_password: string;
  readonly new_password1: string;
  readonly new_password2: string;
}

/**
 * 비밀번호 재설정 요청 타입 (기존 방식)
 */
export interface PasswordResetRequest {
  readonly email: string;
}

/**
 * 비밀번호 재설정 확인 요청 타입 (기존 방식)
 */
export interface PasswordResetConfirmRequest {
  readonly uid: string;
  readonly token: string;
  readonly new_password1: string;
  readonly new_password2: string;
}

// ============================================================================
// 회원가입 관련 타입 (OTP 기반)
// ============================================================================

/**
 * 이메일 중복체크 + OTP 발송 통합 요청 타입
 */
export interface SignupEmailOtpRequest {
  readonly email: string;
}

/**
 * 회원가입 OTP 검증 요청 타입
 */
export interface SignupOtpVerifyRequest {
  readonly email: string;
  readonly code: string;
}

/**
 * 회원가입 완료 요청 타입
 */
export interface SignupCompleteRequest {
  readonly email: string;
  readonly name: string;
  readonly password1: string;
  readonly password2: string;
}

// ============================================================================
// 비밀번호 재설정 관련 타입 (OTP 기반)
// ============================================================================

/**
 * 비밀번호 재설정 OTP 요청 타입
 */
export interface PasswordResetOtpRequest {
  readonly email: string;
}

/**
 * 비밀번호 재설정 OTP 검증 요청 타입
 */
export interface PasswordResetOtpVerifyRequest {
  readonly email: string;
  readonly code: string;
}

/**
 * 비밀번호 재설정 완료 요청 타입
 */
export interface PasswordResetOtpCompleteRequest {
  readonly email: string;
  readonly new_password1: string;
  readonly new_password2: string;
}

// ============================================================================
// 회원 탈퇴 관련 타입
// ============================================================================

/**
 * 회원 탈퇴 요청 타입
 */
export interface DeleteAccountRequest {
  readonly current_password: string;
  readonly reason?: string;
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

/**
 * API 요청 상태 타입
 */
export type ApiRequestStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * API 요청 결과 타입
 */
export interface ApiRequestResult<T = unknown> {
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly status: ApiRequestStatus;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly T[];
}

// ============================================================================
// 타입 가드 함수들
// ============================================================================

/**
 * API 에러인지 확인하는 타입 가드
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
};

/**
 * 사용자 객체인지 확인하는 타입 가드
 */
export const isUser = (obj: unknown): obj is User => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'pk' in obj &&
    'email' in obj &&
    'name' in obj &&
    typeof (obj as User).pk === 'number' &&
    typeof (obj as User).email === 'string' &&
    typeof (obj as User).name === 'string'
  );
};

/**
 * 토큰 응답인지 확인하는 타입 가드
 */
export const isTokenResponse = (obj: unknown): obj is TokenResponse => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'access' in obj &&
    'refresh' in obj &&
    'user' in obj &&
    typeof (obj as TokenResponse).access === 'string' &&
    typeof (obj as TokenResponse).refresh === 'string' &&
    isUser((obj as TokenResponse).user)
  );
};
