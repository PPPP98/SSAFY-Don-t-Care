import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type AxiosRequestConfig,
} from 'axios';
import { getAccessToken, clearTokens } from '@/auth/utils/tokenManager';
import { env } from '@/env';

/**
 * 커스텀 요청 설정 타입 확장
 */
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

/**
 * 취소 가능한 요청 설정 타입
 */
export interface CancellableRequestConfig extends Omit<AxiosRequestConfig, 'signal'> {
  signal?: AbortSignal;
}

/**
 * API 에러 응답 타입
 */
interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * API 환경 설정
 */
interface ApiConfig {
  readonly baseURL: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
}

const API_CONFIG: ApiConfig = {
  baseURL: env.VITE_API_BASE_URL,
  timeout: env.VITE_API_TIMEOUT,
  retryAttempts: env.VITE_API_RETRY_ATTEMPTS,
  retryDelay: env.VITE_API_RETRY_DELAY,
} as const;

/**
 * API 응답 타입 정의
 */
export interface ApiResponse<T = unknown> {
  readonly data: T;
  readonly message?: string;
  readonly success: boolean;
  readonly timestamp: string;
}

/**
 * API 에러 타입 정의
 */
export interface ApiError {
  readonly message: string;
  readonly code?: string | undefined;
  readonly status?: number | undefined;
  readonly details?: Record<string, unknown> | undefined;
}

/**
 * 재시도 가능한 HTTP 상태 코드
 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;

/**
 * 로깅 유틸리티
 */
const logger = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  info: (_message: string, _data?: unknown) => {
    // Console logs removed for production
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error: (_message: string, _error?: unknown) => {
    // Console logs removed for production
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn: (_message: string, _data?: unknown) => {
    // Console logs removed for production
  },
};

/**
 * 지연 함수
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 재시도 로직
 */
const shouldRetry = (error: AxiosError): boolean => {
  if (!error.response) return true; // 네트워크 에러
  return RETRYABLE_STATUS_CODES.includes(error.response.status as never);
};

/**
 * 재시도 실행
 */
const executeWithRetry = async <T>(requestFn: () => Promise<T>, retryCount = 0): Promise<T> => {
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (retryCount < API_CONFIG.retryAttempts && shouldRetry(axiosError)) {
      logger.warn(`Request failed, retrying... (${retryCount + 1}/${API_CONFIG.retryAttempts})`, {
        status: axiosError.response?.status,
        message: axiosError.message,
      });

      await delay(API_CONFIG.retryDelay * Math.pow(2, retryCount)); // 지수 백오프
      return executeWithRetry(requestFn, retryCount + 1);
    }

    throw error;
  }
};

/**
 * Axios 인스턴스 생성
 */
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true, // httpOnly 쿠키 포함을 위해 추가
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/**
 * Request 인터셉터
 */
axiosInstance.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // 인증이 필요한 엔드포인트인지 확인
    const authEndpoints = [
      '/auth/login/',
      '/auth/signup/',
      '/auth/password/reset/',
      '/auth/token/refresh/',
    ];
    const isAuthEndpoint = authEndpoints.some((endpoint) => config.url?.includes(endpoint));

    // 인증 엔드포인트가 아닌 경우에만 토큰 추가 (동기적으로)
    if (!isAuthEndpoint) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 상태 변경 요청에 CSRF 토큰 추가
    const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && stateChangingMethods.includes(config.method.toLowerCase())) {
      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // 요청 로깅
    logger.info('Request initiated', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
    });

    // 요청 시간 기록
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error: AxiosError) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  },
);

/**
 * Response 인터셉터
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 응답 시간 계산
    const config = response.config as CustomAxiosRequestConfig;
    const startTime = config.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;

    // 응답 로깅
    logger.info('Request completed', {
      status: response.status,
      duration: `${duration}ms`,
      url: response.config.url,
    });

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    const startTime = config?.metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : 0;

    // 에러 로깅
    logger.error('Request failed', {
      status: error.response?.status,
      message: error.message,
      duration: `${duration}ms`,
      url: error.config?.url,
    });

    // 401 에러 처리 - 토큰 정리만 수행, 리다이렉트는 ProtectedRoute에서 담당
    if (error.response?.status === 401) {
      clearTokens();
      logger.warn('Authentication failed, tokens cleared');
    }

    // 403 에러 처리 - 권한 없음
    if (error.response?.status === 403) {
      logger.warn('Access forbidden', {
        url: error.config?.url,
        message: error.message,
      });
    }

    // 429 에러 처리 - 요청 한도 초과
    if (error.response?.status === 429) {
      logger.warn('Rate limit exceeded', {
        url: error.config?.url,
        retryAfter: error.response.headers['retry-after'],
      });
    }

    return Promise.reject(error);
  },
);

/**
 * 인증 관련 엔드포인트인지 확인
 */
const isAuthEndpoint = (url: string): boolean => {
  const authEndpoints = [
    '/auth/login/',
    '/auth/signup/',
    '/auth/password/reset/',
    '/auth/token/refresh/',
    '/auth/user/',
  ];
  return authEndpoints.some((endpoint) => url.includes(endpoint));
};

/**
 * 취소 가능한 요청을 위한 유틸리티 함수
 */
const createCancellableRequest = <T>(
  requestFn: (signal?: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  url?: string,
): Promise<T> => {
  // 인증 관련 엔드포인트는 재시도하지 않음
  const skipRetry = url && isAuthEndpoint(url);

  if (!signal) {
    return skipRetry ? requestFn() : executeWithRetry(() => requestFn());
  }

  return new Promise((resolve, reject) => {
    const abortHandler = () => {
      reject(new Error('Request was cancelled'));
    };

    signal.addEventListener('abort', abortHandler, { once: true });

    const executeRequest = skipRetry
      ? requestFn(signal)
      : executeWithRetry(() => requestFn(signal));

    executeRequest
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', abortHandler);
      });
  });
};

/**
 * API 클라이언트 래퍼 함수들
 */
export const apiClient = {
  /**
   * GET 요청
   */
  get: <T = unknown>(url: string, config?: CancellableRequestConfig) =>
    createCancellableRequest(
      (signal) => axiosInstance.get<T>(url, signal ? { ...config, signal } : config),
      config?.signal,
      url,
    ),

  /**
   * POST 요청
   */
  post: <T = unknown>(url: string, data?: unknown, config?: CancellableRequestConfig) =>
    createCancellableRequest(
      (signal) => axiosInstance.post<T>(url, data, signal ? { ...config, signal } : config),
      config?.signal,
      url,
    ),

  /**
   * PUT 요청
   */
  put: <T = unknown>(url: string, data?: unknown, config?: CancellableRequestConfig) =>
    createCancellableRequest(
      (signal) => axiosInstance.put<T>(url, data, signal ? { ...config, signal } : config),
      config?.signal,
      url,
    ),

  /**
   * PATCH 요청
   */
  patch: <T = unknown>(url: string, data?: unknown, config?: CancellableRequestConfig) =>
    createCancellableRequest(
      (signal) => axiosInstance.patch<T>(url, data, signal ? { ...config, signal } : config),
      config?.signal,
      url,
    ),

  /**
   * DELETE 요청
   */
  delete: <T = unknown>(url: string, config?: CancellableRequestConfig) =>
    createCancellableRequest(
      (signal) => axiosInstance.delete<T>(url, signal ? { ...config, signal } : config),
      config?.signal,
      url,
    ),

  /**
   * 원본 axios 인스턴스 접근 (고급 사용)
   */
  instance: axiosInstance,
};

/**
 * 백엔드 응답에서 에러 메시지 추출
 */
const extractErrorMessage = (data: unknown): string => {
  // Type guard for object with detail property
  const hasDetail = (obj: unknown): obj is { detail: unknown } => {
    return obj !== null && typeof obj === 'object' && 'detail' in obj;
  };

  // Type guard for object with message property
  const hasMessage = (obj: unknown): obj is { message: unknown } => {
    return obj !== null && typeof obj === 'object' && 'message' in obj;
  };

  // 1. detail 필드가 배열인 경우: { "detail": ["이메일이 이미 사용 중입니다"] }
  if (hasDetail(data) && Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail[0];
  }

  // 2. detail 필드가 문자열인 경우: { "detail": "에러 메시지" }
  if (hasDetail(data) && typeof data.detail === 'string') {
    return data.detail;
  }

  // 3. 필드별 에러 메시지가 배열인 경우: { "email": ["올바른 이메일 형식이 아닙니다"] }
  if (data && typeof data === 'object') {
    for (const [, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0];
      }
    }
  }

  // 4. message 필드 확인
  if (hasMessage(data) && typeof data.message === 'string') {
    return data.message;
  }

  return '';
};

/**
 * 에러 처리 유틸리티
 */
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const errorData = axiosError.response?.data;

    // 백엔드 응답에서 구체적인 에러 메시지 추출
    const extractedMessage = extractErrorMessage(errorData);
    const fallbackMessage = axiosError.message || 'Unknown error occurred';

    return {
      message: extractedMessage || fallbackMessage,
      code: (errorData as ApiErrorResponse)?.code || axiosError.code,
      status: axiosError.response?.status,
      details: (errorData as ApiErrorResponse)?.details,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unknown error occurred',
  };
};

/**
 * 사용 예시:
 *
 * // 기본 사용법 (기존 코드와 호환)
 * const response = await apiClient.get('/api/users');
 *
 * // AbortController를 사용한 취소 가능한 요청
 * const controller = new AbortController();
 * const response = await apiClient.get('/api/users', {
 *   signal: controller.signal
 * });
 *
 * // 컴포넌트에서 useAbortController 훅 사용
 * const { signal } = useAbortController();
 * const response = await apiClient.get('/api/users', { signal });
 *
 * // 요청 취소
 * controller.abort();
 */

/**
 * 기본 내보내기 (하위 호환성을 위해 유지)
 * @deprecated Use named exports instead
 */
export default apiClient;
