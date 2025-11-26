import { useRef, useState, useCallback } from 'react';
import type { HTMLPreviewProps } from '@/main/types/htmlCodeBlock.types';
import { exportToPDF } from '@/main/utils/pdfExporter';

/**
 * HTML 미리보기 컴포넌트 - iframe srcDoc으로 AI 생성 HTML 그대로 렌더링
 * AI가 생성한 완전한 HTML 문서를 수정 없이 표시
 */
export function HTMLPreview({
  content,
  className = '',
  enablePDFExport = false,
  onPDFGenerated,
}: HTMLPreviewProps) {
  const containerRef = useRef<HTMLIFrameElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hasError, setHasError] = useState(false);

  // PDF 생성 핸들러 - iframe 우회하여 원본 HTML 직접 사용
  const handleExportPDF = useCallback(async () => {
    if (!content) {
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const result = await exportToPDF(content, {
        filename: `ai-content-${Date.now()}.pdf`,
        margin: 1,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: false,
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait',
        },
        enableLinks: true,
      });

      onPDFGenerated?.(result);

      if (!result.success) {
        // PDF 생성 실패 처리
      }
    } catch {
      onPDFGenerated?.({
        success: false,
        error: 'PDF 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [content, onPDFGenerated]);

  // 새로고침 핸들러 (에러 복구용)
  const handleRefresh = useCallback(() => {
    setHasError(false);
  }, []);

  return (
    <div className={`html-preview relative flex h-full w-full max-w-full flex-col ${className}`}>
      {/* 에러 상태 */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="p-6 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              미리보기 로드 실패
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              HTML 콘텐츠를 렌더링하는 중 오류가 발생했습니다.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 미리보기 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-gray-500 dark:text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            HTML 미리보기
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* PDF 내보내기 버튼 */}
          {enablePDFExport && (
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF || hasError || !content}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title={isGeneratingPDF ? 'PDF 생성 중...' : 'PDF 다운로드'}
            >
              {isGeneratingPDF ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}

          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="새로고침"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 - iframe으로 AI 생성 HTML 그대로 렌더링 */}
      <div className="flex-1 overflow-hidden bg-white">
        {content ? (
          <iframe
            ref={containerRef}
            srcDoc={content}
            className="h-full w-full border-none"
            style={{ minHeight: '500px' }}
            sandbox="allow-same-origin allow-scripts"
            title="HTML Preview"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="font-medium">HTML 콘텐츠가 없습니다</p>
              <p className="mt-1 text-sm">AI가 생성한 HTML 콘텐츠가 여기에 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 콘텐츠 정보 */}
      {!hasError && content && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>콘텐츠 크기: {(content.length / 1024).toFixed(1)}KB</span>
            <span>✨ AI 스타일 완벽 지원</span>
          </div>
        </div>
      )}
    </div>
  );
}
