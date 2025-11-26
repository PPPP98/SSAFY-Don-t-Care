import { useState } from 'react';
import type { CodeViewProps } from '@/main/types/htmlCodeBlock.types';

/**
 * HTML 코드를 표시하는 컴포넌트
 * 구문 강조, 줄 번호, 복사 기능을 제공합니다.
 */
export function CodeView({ content, className = '' }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [wrapMode, setWrapMode] = useState<'wrap' | 'nowrap'>('nowrap');

  // 코드 복사 함수
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백: 텍스트 선택으로 유도
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 복사 실패 시 무시
      }
      document.body.removeChild(textArea);
    }
  };

  // 줄 번호와 함께 코드 라인 생성
  const codeLines = content.split('\n');
  const maxLineNumber = codeLines.length;
  const lineNumberWidth = Math.max(2, maxLineNumber.toString().length);

  return (
    <div
      className={`code-view relative flex w-auto max-w-full flex-col bg-gray-50 dark:bg-gray-900 ${className}`}
      style={{ height: '500px' }}
    >
      {/* 코드 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-800">
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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">HTML 코드</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{codeLines.length} 줄</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 줄바꿈 토글 버튼 */}
          <button
            onClick={() => setWrapMode(wrapMode === 'wrap' ? 'nowrap' : 'wrap')}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              wrapMode === 'wrap'
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={wrapMode === 'wrap' ? '줄바꿈 끄기' : '줄바꿈 켜기'}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">{wrapMode === 'wrap' ? '줄바꿈' : '원본'}</span>
          </button>

          {/* 복사 버튼 */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            title="코드 복사"
          >
            {copied ? (
              <>
                <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-600 dark:text-green-400">복사됨</span>
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                <span>복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 코드 콘텐츠 영역 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="grid grid-cols-[auto_1fr] font-mono text-sm">
            {/* 줄 번호 */}
            <div className="border-r border-gray-300 bg-gray-200 px-3 py-3 dark:border-gray-600 dark:bg-gray-800">
              <div className="text-right leading-6 text-gray-500 dark:text-gray-400">
                {codeLines.map((_, index) => (
                  <div key={index} className="select-none">
                    {(index + 1).toString().padStart(lineNumberWidth, ' ')}
                  </div>
                ))}
              </div>
            </div>

            {/* 코드 내용 */}
            <div className={`w-fit px-4 py-3 ${wrapMode === 'nowrap' ? 'overflow-x-auto' : ''}`}>
              <pre
                className={`${wrapMode === 'wrap' ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} w-full leading-6 text-gray-800 dark:text-gray-200`}
              >
                <code
                  className="language-html"
                  dangerouslySetInnerHTML={{
                    __html: highlightHTML(content),
                  }}
                />
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 코드 통계 */}
      <div className="border-t border-gray-200 bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {content.length} 글자, {codeLines.length} 줄
          </span>
          <span>HTML</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 간단한 HTML 구문 강조 함수
 * 기본적인 태그, 속성, 문자열을 하이라이트합니다.
 */
function highlightHTML(code: string): string {
  return (
    code
      // HTML 엔티티 이스케이프
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      // HTML 태그 하이라이트
      .replace(
        /&lt;(\/?[a-zA-Z][a-zA-Z0-9]*)/g,
        '&lt;<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>',
      )
      .replace(/&gt;/g, '<span class="text-blue-600 dark:text-blue-400 font-semibold">&gt;</span>')
      // 속성명 하이라이트
      .replace(
        /\s([a-zA-Z-]+)=(?=&quot;)/g,
        ' <span class="text-green-600 dark:text-green-400">$1</span>=',
      )
      // 속성값 하이라이트 (문자열)
      .replace(
        /=&quot;([^&]*)&quot;/g,
        '=<span class="text-orange-600 dark:text-orange-400">&quot;$1&quot;</span>',
      )
      // class 속성값 내부의 Tailwind 클래스 특별 하이라이트
      .replace(
        /class=<span class="text-orange-600 dark:text-orange-400">&quot;([^&]*)&quot;<\/span>/g,
        (_, classContent) => {
          const highlightedClasses = classContent
            .split(/\s+/)
            .map((cls: string) => {
              if (cls.trim()) {
                // Tailwind 클래스 패턴 감지
                if (/^(bg-|text-|border-|p-|m-|w-|h-|flex|grid|rounded|shadow)/.test(cls)) {
                  return `<span class="text-purple-600 dark:text-purple-400 font-medium">${cls}</span>`;
                }
                return cls;
              }
              return cls;
            })
            .join(' ');

          return `class=<span class="text-orange-600 dark:text-orange-400">&quot;${highlightedClasses}&quot;</span>`;
        },
      )
      // 주석 하이라이트
      .replace(
        /&lt;!--([^-]|(-(?!-&gt;)))*(--&gt;)?/g,
        '<span class="text-gray-500 dark:text-gray-400 italic">$&</span>',
      )
      // 긴 URL 자동 줄바꿈 처리
      .replace(/(https?:\/\/[^\s<>"{}|\\^`[\]]{50,})/g, '<span class="break-all">$1</span>')
  );
}
