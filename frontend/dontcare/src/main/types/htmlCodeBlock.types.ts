// HTMLCodeBlock 관련 타입 정의

// 뷰 모드 타입
export type ViewMode = 'code' | 'preview';

// 메인 HTMLCodeBlock 컴포넌트 Props
export interface HTMLCodeBlockProps {
  children: string; // HTML 코드 내용
  className?: string | undefined; // 'language-html' 등
  node?: unknown; // react-markdown 노드 정보
  messageId?: string; // 메시지 ID (전역 상태 관리용)
}

// HTML 미리보기 컴포넌트 Props
export interface HTMLPreviewProps {
  content: string; // 정리된 HTML 내용
  className?: string; // 추가 CSS 클래스
  enablePDFExport?: boolean; // PDF 내보내기 버튼 표시 여부
  onPDFGenerated?: (result: PDFExportResult) => void; // PDF 생성 완료 콜백
}

// 코드 뷰 컴포넌트 Props
export interface CodeViewProps {
  content: string; // 원본 HTML 코드
  className?: string; // 추가 CSS 클래스
}

// 헤더 컴포넌트 Props
export interface HTMLCodeBlockHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExportPDF: () => Promise<void>;
  isExporting: boolean;
  hasError: boolean;
}

// PDF 내보내기 옵션 (html2pdf.js 호환)
export interface PDFExportOptions {
  filename?: string; // 파일명 (기본값: auto-generated)
  margin?: number | [number, number] | [number, number, number, number]; // PDF 여백
  image?: {
    type?: 'jpeg' | 'png' | 'webp'; // 이미지 타입
    quality?: number; // 이미지 품질 (0-1)
  };
  html2canvas?: {
    scale?: number; // 스케일 팩터 (기본값: 2)
    useCORS?: boolean; // CORS 허용
    allowTaint?: boolean; // Taint 허용
    backgroundColor?: string; // 배경색
  };
  jsPDF?: {
    unit?: 'in' | 'mm' | 'cm' | 'px'; // 단위
    format?: 'a4' | 'letter' | [number, number]; // 페이지 형식
    orientation?: 'portrait' | 'landscape'; // 방향
  };
  pagebreak?: {
    mode?: string | string[]; // 페이지 나누기 모드
    before?: string; // 이전 페이지 나누기 선택자
    after?: string; // 다음 페이지 나누기 선택자
    avoid?: string; // 페이지 나누기 방지 선택자
  };
  enableLinks?: boolean; // 하이퍼링크 활성화

  // 기존 호환성을 위한 레거시 옵션들
  /** @deprecated html2canvas.scale 사용 */
  scale?: number;
  /** @deprecated html2canvas 옵션 내에서 설정 */
  width?: number;
  /** @deprecated image.quality 사용 */
  quality?: number;
}

// PDF 내보내기 결과
export interface PDFExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// HTML 정리 옵션
export interface HTMLSanitizerOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  forbiddenTags?: string[];
  forbiddenAttributes?: string[];
}

// 에러 타입
export interface HTMLCodeBlockError {
  type: 'sanitization' | 'pdf_export' | 'iframe_render';
  message: string;
  originalError?: Error;
}
