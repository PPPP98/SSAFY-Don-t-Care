import { refreshTokenApi } from '@/auth/services/authApi';
import { useAuthStore } from '@/auth/stores/authStore';
import type { ApiError } from '@/auth/types/auth.api.types';

/**
 * 토큰 관리 유틸리티
 *
 * @description
 * - 메모리 기반 토큰 저장 및 관리
 * - 자동 토큰 갱신 및 로테이션
 * - XSS 공격으로부터 토큰 보호
 * - httpOnly 쿠키와 함께 사용하여 보안 강화
 */

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;
  private isClearing = false;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 현재 액세스 토큰 가져오기
   */
  getAccessToken(): string | null {
    return useAuthStore.getState().getAccessToken();
  }

  /**
   * 토큰이 유효한지 확인
   */
  isTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      const payload = this._decodeJwtPayload(token);
      if (!payload || typeof payload.exp !== 'number') return false;
      const now = Math.floor(Date.now() / 1000);
      const leewaySec = 30;
      return payload.exp - leewaySec > now;
    } catch {
      return false;
    }
  }

  // base64url-safe JWT 페이로드 디코딩
  private _decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadPart = parts[1];
    if (!payloadPart) return null;

    let b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = globalThis.atob(b64);
    return JSON.parse(json);
  }

  /**
   * 토큰 갱신 (중복 요청 방지, 재시도 없음)
   */
  async refreshAccessToken(): Promise<string> {
    // 이미 갱신 중인 경우 동일한 Promise 반환
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 실제 토큰 갱신 수행 (재시도 없음)
   * httpOnly 쿠키의 refresh token을 사용하여 새로운 access token 발급
   */
  private async _performTokenRefresh(): Promise<string> {
    try {
      // httpOnly 쿠키의 refresh token이 자동으로 전송됨
      // API 가이드에 따르면 빈 객체 전달 (서버에서 쿠키 읽어야 함)
      const result = await refreshTokenApi({});

      const { access } = result;

      // 새로운 액세스 토큰을 메모리에 저장 (refresh token은 httpOnly 쿠키에만 저장)
      const authStore = useAuthStore.getState();
      authStore.setAccessToken(access);

      return access;
    } catch (error) {
      const apiError = error as ApiError;

      // 401 에러나 네트워크 에러 모두 즉시 실패 처리 (재시도 없음)
      if (apiError.status === 401) {
        this.clearTokens();
        throw new Error('리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.');
      }

      // 네트워크 에러나 기타 에러도 재시도 없이 즉시 실패
      throw error;
    }
  }

  /**
   * 토큰 정리
   */
  clearTokens(): void {
    if (this.isClearing) {
      return; // 이미 정리 중이면 중복 실행 방지
    }

    this.isClearing = true;
    useAuthStore.getState().clearAuth();

    // 정리 완료 후 플래그 리셋 (다음 정리를 위해)
    setTimeout(() => {
      this.isClearing = false;
    }, 100);
  }

  /**
   * 유효한 액세스 토큰 가져오기 (필요시 자동 갱신)
   */
  async getValidAccessToken(): Promise<string | null> {
    // 토큰이 유효한 경우 바로 반환
    if (this.isTokenValid()) {
      return this.getAccessToken();
    }

    // 토큰이 만료된 경우 갱신 시도
    try {
      return await this.refreshAccessToken();
    } catch {
      this.clearTokens();
      return null;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const tokenManager = TokenManager.getInstance();

// 편의 함수들
export const getAccessToken = () => tokenManager.getAccessToken();
export const isTokenValid = () => tokenManager.isTokenValid();
export const refreshAccessToken = () => tokenManager.refreshAccessToken();
export const getValidAccessToken = () => tokenManager.getValidAccessToken();
export const clearTokens = () => tokenManager.clearTokens();
