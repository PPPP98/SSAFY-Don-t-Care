import { useState, useEffect, memo } from 'react';
import type { HTMLCodeBlockProps, ViewMode } from '@/main/types/htmlCodeBlock.types';
import { sanitizeHTML } from '@/main/utils/htmlUtils';
import {
  exportToPDFAdvanced,
  PDFExportTracker,
  isPDFExportSupported,
} from '@/main/utils/pdfExporter';
import { useHTMLCodeBlockStore } from '@/main/stores/htmlCodeBlockStore';
import { HTMLCodeBlockHeader } from '@/main/components/ui/HTMLCodeBlockHeader';
import { HTMLPreview } from '@/main/components/ui/HTMLPreview';
import { CodeView } from '@/main/components/ui/CodeView';

/**
 * HTML 코드 블록을 위한 스마트 렌더링 컴포넌트
 * 코드 보기, 미리보기, PDF 내보내기 기능을 제공합니다.
 */
const HTMLCodeBlockComponent = function HTMLCodeBlock({ children, messageId }: HTMLCodeBlockProps) {
  // 전역 상태 관리 또는 로컬 상태 fallback
  const { getViewMode, setViewMode: setGlobalViewMode } = useHTMLCodeBlockStore();
  const [localViewMode, setLocalViewMode] = useState<ViewMode>('code');

  // messageId가 있으면 전역 상태, 없으면 로컬 상태 사용
  const viewMode = messageId ? getViewMode(messageId) : localViewMode;
  const setViewMode = messageId
    ? (mode: ViewMode) => setGlobalViewMode(messageId, mode)
    : setLocalViewMode;
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // HTML 콘텐츠 정리 (React 19 컴파일러가 자동 최적화)
  let sanitizedHTML = '';
  let hasContentError = false;
  try {
    sanitizedHTML = sanitizeHTML(children);
  } catch {
    hasContentError = true;
    sanitizedHTML = '';
  }

  // 콘텐츠 에러 처리 (렌더링 외부에서)
  useEffect(() => {
    if (hasContentError && !error) {
      setError('HTML 콘텐츠를 처리할 수 없습니다.');
    } else if (!hasContentError && error === 'HTML 콘텐츠를 처리할 수 없습니다.') {
      setError(null);
    }
  }, [hasContentError, error]);

  // PDF 내보내기 지원 여부
  const pdfSupported = isPDFExportSupported();

  // PDF 내보내기 함수
  const handleExportPDF = async () => {
    if (!pdfSupported) {
      setError('PDF 내보내기가 지원되지 않는 브라우저입니다.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      // 진행 상황 추적기 생성
      const tracker = new PDFExportTracker();
      tracker.addListener((progress) => {
        setExportProgress(progress);
      });

      const result = await exportToPDFAdvanced(
        children, // 원본 HTML 사용 (스타일 태그 포함)
        {
          filename: `ai-html-report-${Date.now()}.pdf`,
          quality: 2,
          width: 800,
          scale: 2,
        },
        tracker,
      );

      if (!result.success) {
        setError(result.error || 'PDF 생성에 실패했습니다.');
      }
    } catch {
      setError('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 에러 상태 체크
  const hasError = !!error || !sanitizedHTML;

  return (
    <div className="html-code-block w-full max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* 헤더 - 제어 버튼들 */}
      <HTMLCodeBlockHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
        hasError={hasError}
      />

      {/* 에러 표시 */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 내보내기 진행 상황 */}
      {isExporting && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span>PDF 생성 중... {exportProgress}%</span>
            <div className="ml-2 h-2 flex-1 rounded-full bg-blue-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="min-h-[300px] w-full">
        {/* 코드 보기 */}
        {viewMode === 'code' && (
          <div className="w-full">
            <CodeView content={children} />
          </div>
        )}

        {/* HTML 미리보기 */}
        {viewMode === 'preview' && (
          <div className="w-full">
            {hasError ? (
              <div className="flex h-full items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="font-medium">미리보기를 사용할 수 없습니다</p>
                  <p className="mt-1 text-sm">HTML 콘텐츠를 처리하는 중 오류가 발생했습니다.</p>
                </div>
              </div>
            ) : (
              <HTMLPreview content={children} className="h-full" enablePDFExport={false} />
            )}
          </div>
        )}
      </div>

      {/* HTML 콘텐츠가 비어있는 경우 */}
      {!children.trim() && (
        <div className="flex h-32 items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg
              className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm">HTML 콘텐츠가 없습니다</p>
          </div>
        </div>
      )}
    </div>
  );
};

// React.memo로 감싸서 불필요한 리렌더링 방지
// 스크롤 시 부모 컴포넌트 리렌더링으로 인한 상태 리셋 방지
export const HTMLCodeBlock = memo(HTMLCodeBlockComponent);
