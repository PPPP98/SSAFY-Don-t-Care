import DOMPurify from 'dompurify';
import type { HTMLSanitizerOptions } from '@/main/types/htmlCodeBlock.types';

// DOMPurify 기본 설정 - AI가 생성하는 HTML을 위한 보안 설정
// 보안 강화: script 태그 및 이벤트 핸들러 제거로 XSS 공격 방지
const DEFAULT_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // 기본 텍스트 요소
    'p',
    'div',
    'span',
    'br',
    'hr',
    // 제목 요소
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // 목록 요소
    'ul',
    'ol',
    'li',
    // 테이블 요소
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'caption',
    // 인라인 요소
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'small',
    'sub',
    'sup',
    // 이미지 및 미디어 (주의깊게 허용)
    'img',
    // 인용 및 코드
    'blockquote',
    'code',
    'pre',
    // 기타 유용한 요소
    'section',
    'article',
    'header',
    'footer',
    'main',
    'aside',
    // 스크립트 요소 (보안상 제거)
    'noscript',
    // 폼 요소 (읽기 전용으로만 허용)
    'form',
    'input',
    'label',
    'select',
    'option',
    'textarea',
    'button',
  ],
  ALLOWED_ATTR: [
    // CSS 클래스를 위한 class 속성
    'class',
    // 일반적인 속성들
    'id',
    'title',
    'alt',
    'src',
    'href',
    'target',
    // 테이블 속성
    'colspan',
    'rowspan',
    // 폼 속성 (읽기 전용)
    'type',
    'value',
    'placeholder',
    'readonly',
    'disabled',
    // 이미지 속성
    'width',
    'height',
    // 기타 속성
    'type',
    // 인라인 스타일 지원
    'style',
  ],
  FORBID_TAGS: [
    // 위험한 요소들 (script 태그 제외)
    'object',
    'embed',
    'applet',
    // 메타 요소
    'meta',
    'link',
    'base',
    // 프레임 요소
    'frame',
    'frameset',
    'iframe',
  ],
  FORBID_ATTR: [
    // 이벤트 핸들러들
    'onclick',
    'onload',
    'onerror',
    'onmouseover',
    'onmouseout',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onkeydown',
    'onkeyup',
    'onkeypress',
    // 위험한 속성들
    'javascript:',
    'vbscript:',
    'data:',
  ],
  ALLOW_DATA_ATTR: false, // data-* 속성 비허용
  ALLOW_UNKNOWN_PROTOCOLS: false, // 알려지지 않은 프로토콜 비허용
  RETURN_DOM: false, // HTML 문자열로 반환
  RETURN_DOM_FRAGMENT: false,
};

/**
 * AI가 생성한 HTML 코드를 정리하고 보안 처리합니다.
 * 인라인 스타일이 포함된 HTML을 안전하게 처리합니다.
 */
export function sanitizeHTML(htmlContent: string, options?: HTMLSanitizerOptions): string {
  try {
    // 빈 문자열 처리
    if (!htmlContent || htmlContent.trim() === '') {
      return '';
    }

    // 사용자 정의 옵션이 있으면 기본 설정과 병합
    let config = DEFAULT_PURIFY_CONFIG;

    if (options) {
      config = {
        ...DEFAULT_PURIFY_CONFIG,
        ALLOWED_TAGS: options.allowedTags || DEFAULT_PURIFY_CONFIG.ALLOWED_TAGS,
        ALLOWED_ATTR: options.allowedAttributes || DEFAULT_PURIFY_CONFIG.ALLOWED_ATTR,
        FORBID_TAGS: [
          ...(DEFAULT_PURIFY_CONFIG.FORBID_TAGS || []),
          ...(options.forbiddenTags || []),
        ],
        FORBID_ATTR: [
          ...(DEFAULT_PURIFY_CONFIG.FORBID_ATTR || []),
          ...(options.forbiddenAttributes || []),
        ],
      };
    }

    // HTML 정리 및 보안 처리
    const cleanHTML = DOMPurify.sanitize(htmlContent, config);

    return String(cleanHTML);
  } catch {
    throw new Error('HTML 콘텐츠를 안전하게 처리할 수 없습니다.');
  }
}

/**
 * HTML 콘텐츠가 유효한지 검사합니다.
 */
export function validateHTMLContent(htmlContent: string): boolean {
  try {
    // 기본적인 HTML 구조 검사
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // 파싱 에러가 있었는지 확인 (간단한 방법)
    return tempDiv.innerHTML.length > 0;
  } catch {
    return false;
  }
}

/**
 * HTML 콘텐츠에서 CSS 클래스들을 추출합니다.
 * 디버깅이나 분석용으로 사용됩니다.
 */
export function extractCSSClasses(htmlContent: string): string[] {
  const cssClasses: Set<string> = new Set();

  try {
    // class 속성들을 정규식으로 찾기
    const classMatches = htmlContent.match(/class\s*=\s*["']([^"']+)["']/g);

    if (classMatches) {
      classMatches.forEach((match) => {
        // class="..." 에서 클래스들 추출
        const classContent = match.match(/class\s*=\s*["']([^"']+)["']/);
        if (classContent && classContent[1]) {
          const classes = classContent[1].split(/\s+/);
          classes.forEach((cls) => {
            if (cls.trim()) {
              cssClasses.add(cls.trim());
            }
          });
        }
      });
    }

    return Array.from(cssClasses);
  } catch {
    return [];
  }
}

/**
 * HTML 콘텐츠의 크기를 추정합니다.
 * PDF 내보내기 시 레이아웃 계산에 사용됩니다.
 */
export function estimateHTMLDimensions(htmlContent: string): { width: number; height: number } {
  try {
    // 임시 요소 생성하여 크기 측정
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = '800px'; // 기본 렌더링 너비
    tempDiv.innerHTML = sanitizeHTML(htmlContent);

    document.body.appendChild(tempDiv);

    const rect = tempDiv.getBoundingClientRect();
    const dimensions = {
      width: Math.max(rect.width, 800),
      height: Math.max(rect.height, 400),
    };

    document.body.removeChild(tempDiv);

    return dimensions;
  } catch {
    // 기본값 반환
    return { width: 800, height: 400 };
  }
}

/**
 * 미리보기 전용 HTML 처리 - AI 생성 스타일 태그 보존
 * 클라이언트 사이드 렌더링이므로 보안 제한 완화
 * 완전한 HTML 문서의 경우 body 내용만 추출
 */
export function createPreviewHTML(htmlContent: string): string {
  if (!htmlContent?.trim()) return '';

  // 완전한 HTML 문서인지 확인 (DOCTYPE 또는 <html> 태그 포함)
  const isCompleteDocument =
    htmlContent.includes('<!DOCTYPE') ||
    htmlContent.includes('<html') ||
    htmlContent.includes('<HTML');

  if (isCompleteDocument) {
    try {
      // 임시 DOM 파서를 사용하여 body 내용 추출
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // head의 style 태그들도 함께 추출
      const headStyles = Array.from(doc.head.querySelectorAll('style'))
        .map((style) => style.outerHTML)
        .join('\n');

      // body 내용 추출
      const bodyContent = doc.body?.innerHTML || '';

      // style 태그와 body 내용을 합쳐서 반환
      return headStyles ? `${headStyles}\n${bodyContent}` : bodyContent;
    } catch {
      // 파싱 실패 시 원본 반환
      return htmlContent;
    }
  }

  // HTML 프래그먼트인 경우 그대로 반환 (AI 생성 <style> 태그 포함)
  return htmlContent;
}

/**
 * 미리보기용 DOMPurify 설정 - style 태그 허용
 * 더 안전한 대안으로 필요시 사용
 */
const PREVIEW_PURIFY_CONFIG = {
  ...DEFAULT_PURIFY_CONFIG,
  ALLOWED_TAGS: [
    ...DEFAULT_PURIFY_CONFIG.ALLOWED_TAGS,
    'style', // AI 생성 스타일 태그 허용
  ],
};

/**
 * 미리보기용 안전한 HTML 처리 (선택적 사용)
 */
export function sanitizeHTMLForPreview(htmlContent: string): string {
  try {
    if (!htmlContent || htmlContent.trim() === '') {
      return '';
    }

    const cleanHTML = DOMPurify.sanitize(htmlContent, PREVIEW_PURIFY_CONFIG);
    return String(cleanHTML);
  } catch {
    throw new Error('HTML 콘텐츠를 안전하게 처리할 수 없습니다.');
  }
}

/**
 * HTML 콘텐츠를 iframe에서 렌더링하기 위한 완전한 HTML 문서로 변환합니다.
 * 순수 CSS 스타일링으로 전문적인 보고서 레이아웃을 제공합니다.
 * @deprecated iframe 방식은 html2pdf.js로 대체 예정
 */
export function createFullHTMLDocument(htmlContent: string): string {
  const sanitizedContent = sanitizeHTML(htmlContent);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none';">
    <!-- 보안: script-src 'unsafe-inline'으로 인라인 스크립트만 허용, 외부 스크립트 차단하여 XSS 방지 -->
    <title>HTML Preview</title>
    <style>
        /* AI가 생성하는 HTML 보고서를 위한 깔끔한 기본 스타일 */

        /* 기본 설정 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
            background-color: #f9fafb;
            color: #1f2937;
            line-height: 1.6;
            margin: 16px;
        }

        /* 이미지 및 미디어 */
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }

        /* 테이블 기본 스타일 */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }

        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }

        th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
        }

        /* 코드 블록 */
        pre {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
            border-left: 4px solid #2563eb;
        }

        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
        }

        /* 링크 */
        a {
            color: #2563eb;
            text-decoration: underline;
        }

        a:hover {
            color: #1d4ed8;
        }

        /* 목록 */
        ul, ol {
            margin: 16px 0;
            padding-left: 24px;
        }

        li {
            margin-bottom: 4px;
        }

        /* 인쇄 최적화 */
        @page {
            size: A4;
            margin: 2cm;
        }

        @media print {
            body {
                margin: 0;
                font-size: 12px;
                background-color: white;
                /* 고립된 줄 방지 */
                orphans: 3;
                widows: 3;
            }

            .container {
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* 기본 섹션 분할 제어 */
            .section, .card {
                break-inside: avoid;
                page-break-inside: avoid;
                min-height: 2em;
            }

            /* 제목 요소 분할 제어 */
            h1, h2, h3, h4, h5, h6 {
                break-after: avoid;
                page-break-after: avoid;
                break-inside: avoid;
                page-break-inside: avoid;
                /* 제목과 다음 내용이 분리되지 않도록 */
                keep-with-next: always;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
            }

            /* 단락 및 텍스트 요소 */
            p {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 0.8em;
                min-height: 1.2em;
            }

            /* 목록 요소 분할 제어 */
            ul, ol {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            li {
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 0.2em;
            }

            /* 테이블 분할 제어 */
            table {
                break-inside: avoid;
                page-break-inside: avoid;
                margin: 1em 0;
            }

            tr {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            td, th {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            /* 코드 블록 분할 제어 */
            pre, code {
                break-inside: avoid;
                page-break-inside: avoid;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            /* 이미지 분할 제어 */
            img {
                break-inside: avoid;
                page-break-inside: avoid;
                max-width: 100% !important;
                height: auto !important;
            }

            /* 인용문 분할 제어 */
            blockquote {
                break-inside: avoid;
                page-break-inside: avoid;
                margin: 1em 0;
            }

            /* 폼 요소 분할 제어 */
            form {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            /* 링크 스타일 */
            a {
                color: #000 !important;
                text-decoration: none !important;
            }

            /* 링크 URL을 인쇄시 표시 */
            a[href^="http"]:after {
                content: " (" attr(href) ")";
                font-size: 10px;
                color: #666;
            }

            /* 새 섹션 시작용 클래스 (필요시 사용) */
            .page-break-before {
                break-before: page;
                page-break-before: always;
            }

            .page-break-after {
                break-after: page;
                page-break-after: always;
            }

            /* 분할 방지용 클래스 */
            .keep-together {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
        }
    </style>
</head>
<body>
    ${sanitizedContent}
</body>
</html>`;
}
