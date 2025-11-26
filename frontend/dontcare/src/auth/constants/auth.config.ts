/**
 * API 요청 타입 상수 정의
 */

export const API_REQUEST_TYPES = {
  LOGIN: 'LOGIN',
  SIGNUP: 'SIGNUP',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  LOGOUT: 'LOGOUT',
} as const;

export type ApiRequestType = (typeof API_REQUEST_TYPES)[keyof typeof API_REQUEST_TYPES];
