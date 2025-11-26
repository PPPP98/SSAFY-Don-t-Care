/**
 * 환경변수 타입 안전성 및 검증을 위한 설정
 * Vite 환경변수와 함께 사용되는 타입 안전한 환경변수 관리
 */

// 환경변수 타입 정의
type ValidatedEnv = {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AI_API_BASE_URL: string;
  readonly VITE_STREAM_API_URL: string;
  readonly VITE_GCP_PROJECT_ID: string;
  readonly VITE_GCP_LOCATION: string;
  readonly VITE_GCP_ENGINE_ID: string;
  // API 클라이언트 설정
  readonly VITE_API_TIMEOUT: number;
  readonly VITE_API_RETRY_ATTEMPTS: number;
  readonly VITE_API_RETRY_DELAY: number;
  // Query 캐시 설정
  readonly VITE_QUERY_STALE_TIME: number;
  readonly VITE_QUERY_GC_TIME: number;
  // UX 설정
  readonly VITE_FORM_ERROR_DELAY: number;
};

// 환경변수 검증 및 기본값 설정
function validateEnv(): ValidatedEnv {
  const env = import.meta.env;

  // 필수 환경변수 검증
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_AI_API_BASE_URL',
    'VITE_STREAM_API_URL',
    'VITE_GCP_PROJECT_ID',
    'VITE_GCP_ENGINE_ID'
  ] as const;

  // 숫자형 환경변수 파싱 헬퍼
  const parseNumber = (value: string | undefined, defaultValue: number): number => {
    const parsed = value ? parseInt(value, 10) : defaultValue;
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const missing = requiredVars.filter(varName => !env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `필수 환경변수가 누락되었습니다: ${missing.join(', ')}\n` +
      `.env 파일에 다음 변수들을 추가해주세요:\n` +
      missing.map(varName => `${varName}=YOUR_VALUE`).join('\n')
    );
  }

  return {
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_AI_API_BASE_URL: env.VITE_AI_API_BASE_URL,
    VITE_STREAM_API_URL: env.VITE_STREAM_API_URL,
    VITE_GCP_PROJECT_ID: env.VITE_GCP_PROJECT_ID,
    VITE_GCP_LOCATION: env.VITE_GCP_LOCATION || 'us-central1', // 기본값
    VITE_GCP_ENGINE_ID: env.VITE_GCP_ENGINE_ID,
    // API 클라이언트 설정 (기본값 포함)
    VITE_API_TIMEOUT: parseNumber(env.VITE_API_TIMEOUT, 10000),
    VITE_API_RETRY_ATTEMPTS: parseNumber(env.VITE_API_RETRY_ATTEMPTS, 3),
    VITE_API_RETRY_DELAY: parseNumber(env.VITE_API_RETRY_DELAY, 1000),
    // Query 캐시 설정 (기본값 포함)
    VITE_QUERY_STALE_TIME: parseNumber(env.VITE_QUERY_STALE_TIME, 60000), // 1분
    VITE_QUERY_GC_TIME: parseNumber(env.VITE_QUERY_GC_TIME, 300000), // 5분
    // UX 설정 (기본값 포함)
    VITE_FORM_ERROR_DELAY: parseNumber(env.VITE_FORM_ERROR_DELAY, 500),
  };
}

// 타입 안전한 환경변수 객체 export
export const env = validateEnv();

// GCP 리소스 경로 생성 유틸리티
export const gcpConfig = {
  // 세션 리소스 경로 생성
  getSessionResourcePath: (sessionId: string): string => {
    return `projects/${env.VITE_GCP_PROJECT_ID}/locations/${env.VITE_GCP_LOCATION}/reasoningEngines/${env.VITE_GCP_ENGINE_ID}/sessions/${sessionId}`;
  },

  // 개별 GCP 설정 접근
  projectId: env.VITE_GCP_PROJECT_ID,
  location: env.VITE_GCP_LOCATION,
  engineId: env.VITE_GCP_ENGINE_ID,
} as const;

// 개발 모드에서 환경변수 출력
if (import.meta.env.DEV) {
  console.log('🔧 환경변수 로드됨:', {
    GCP_PROJECT_ID: env.VITE_GCP_PROJECT_ID,
    GCP_LOCATION: env.VITE_GCP_LOCATION,
    GCP_ENGINE_ID: env.VITE_GCP_ENGINE_ID,
    API_BASE_URL: env.VITE_API_BASE_URL,
  });
}