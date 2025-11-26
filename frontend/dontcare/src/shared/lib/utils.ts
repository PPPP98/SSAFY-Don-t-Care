import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * HTML 엔티티를 디코딩하는 함수
 * &amp;, &lt;, &gt;, &quot;, &#39; 등의 HTML 엔티티를 실제 문자로 변환
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // DOM 기반 방법이 실패할 경우를 대비한 정규식 기반 백업 방법
  try {
    // 먼저 DOM 기반 방법 시도
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;

    // 디코딩이 실제로 일어났는지 확인
    if (decoded !== text) {
      return decoded;
    }
  } catch {
    // DOM-based HTML decoding failed
  }

  // 정규식 기반 HTML 엔티티 디코딩 (백업 방법)
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
