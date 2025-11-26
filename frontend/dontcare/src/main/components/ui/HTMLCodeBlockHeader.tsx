import type { HTMLCodeBlockHeaderProps, ViewMode } from '@/main/types/htmlCodeBlock.types';

/**
 * HTML 코드 블록의 헤더 및 제어 UI 컴포넌트
 * 뷰 모드 전환, PDF 내보내기 등의 기능을 제공합니다.
 */
export function HTMLCodeBlockHeader({
  viewMode,
  onViewModeChange,
  onExportPDF,
  isExporting,
  hasError,
}: HTMLCodeBlockHeaderProps) {
  // 뷰 모드 버튼 구성 (분할 모드 제거)
  const viewModeButtons: Array<{ mode: ViewMode; label: string; icon: string }> = [
    {
      mode: 'code',
      label: '코드',
      icon: 'M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z',
    },
    {
      mode: 'preview',
      label: '미리보기',
      icon: 'M10 12a2 2 0 100-4 2 2 0 000 4zM10 2C5.5 2 1.73 5.11 1.15 9.36a.5.5 0 000 1.28C1.73 14.89 5.5 18 10 18s8.27-3.11 8.85-7.36a.5.5 0 000-1.28C18.27 5.11 14.5 2 10 2z',
    },
  ];

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      {/* 좌측: 제목 및 상태 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">HTML 보고서</h3>
        </div>

        {/* 상태 표시 */}
        {hasError && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            오류
          </span>
        )}

        {isExporting && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <svg className="h-3 w-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
            </svg>
            내보내는 중
          </span>
        )}
      </div>

      {/* 우측: 제어 버튼들 */}
      <div className="flex items-center gap-2">
        {/* 뷰 모드 선택 */}
        <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
          {viewModeButtons.map((button) => (
            <button
              key={button.mode}
              onClick={() => onViewModeChange(button.mode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === button.mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100'
              } `}
              title={button.label}
              disabled={hasError && button.mode !== 'code'}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d={button.icon} clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{button.label}</span>
            </button>
          ))}
        </div>

        {/* 구분선 */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* PDF 내보내기 버튼 */}
        <button
          onClick={onExportPDF}
          disabled={isExporting || hasError}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            isExporting || hasError
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              : 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1'
          } `}
          title="PDF로 내보내기"
        >
          {isExporting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
              </svg>
              <span className="hidden sm:inline">생성 중</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
