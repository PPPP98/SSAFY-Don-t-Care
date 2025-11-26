import { create } from 'zustand';
import type { User, TokenResponse, SafeUserInfo } from '@/auth/types/auth.api.types';

interface AuthState {
  // 상태
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // 액션
  login: (tokens: TokenResponse, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (accessToken: string) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;

  // localStorage 관리 유틸리티 (pk 제외한 안전한 정보만 저장)
  saveUserToStorage: (user: User) => void;
  loadUserFromStorage: () => SafeUserInfo | null;
  clearUserFromStorage: () => void;
}

const initialState: Pick<AuthState, 'isAuthenticated' | 'user' | 'accessToken' | 'refreshToken'> = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // 초기 상태
  ...initialState,

  // 액션들
  login: (tokens, user) => {
    set({
      isAuthenticated: true,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      user,
    });
  },

  logout: () => get().clearAuth(),

  setUser: (user) => {
    set({ user });
  },

  setAccessToken: (accessToken) => {
    set({
      accessToken,
      isAuthenticated: Boolean(accessToken),
    });
  },

  setRefreshToken: (refreshToken) => {
    set({ refreshToken });
  },

  clearAuth: () => {
    // localStorage에서 사용자 정보 정리
    get().clearUserFromStorage();
    set(() => ({ ...initialState }));
  },

  getAccessToken: () => {
    const token = get().accessToken;
    return token;
  },

  getRefreshToken: () => {
    const token = get().refreshToken;
    return token;
  },

  // localStorage 관리 유틸리티 (pk 제외한 안전한 정보만 저장)
  saveUserToStorage: (user: User) => {
    try {
      // pk를 제외한 안전한 정보만 저장
      const safeUserInfo: SafeUserInfo = {
        email: user.email,
        name: user.name,
      };
      localStorage.setItem('userInfo', JSON.stringify(safeUserInfo));
    } catch {
      // 사용자 정보 localStorage 저장 실패
    }
  },

  loadUserFromStorage: (): SafeUserInfo | null => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (!userInfo) return null;
      return JSON.parse(userInfo);
    } catch {
      // 사용자 정보 localStorage 로드 실패
      localStorage.removeItem('userInfo');
      return null;
    }
  },

  clearUserFromStorage: () => {
    try {
      localStorage.removeItem('userInfo');
    } catch {
      // 사용자 정보 localStorage 정리 실패
    }
  },
}));
