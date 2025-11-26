/// <reference types="vite/client" />

// 환경변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AI_API_BASE_URL: string;
  readonly VITE_STREAM_API_URL: string;
  readonly VITE_GCP_PROJECT_ID: string;
  readonly VITE_GCP_LOCATION: string;
  readonly VITE_GCP_ENGINE_ID: string;
  // API 클라이언트 설정
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_API_RETRY_ATTEMPTS: string;
  readonly VITE_API_RETRY_DELAY: string;
  // Query 캐시 설정
  readonly VITE_QUERY_STALE_TIME: string;
  readonly VITE_QUERY_GC_TIME: string;
  // UX 설정
  readonly VITE_FORM_ERROR_DELAY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// CSS 모듈 타입 선언
declare module '*.css';

// CSS 모듈 타입 선언 (scoped styles)
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// SCSS 모듈 타입 선언
declare module '*.scss';

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// 이미지 에셋들은 Vite가 자동으로 처리하므로 제거
// *.png, *.jpg, *.jpeg, *.gif, *.webp 등은 vite/client에서 자동 처리됨
