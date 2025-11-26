/**
 * SSE 스트리밍 중 불완전한 코드블럭 감지 유틸리티
 */

/**
 * 메시지에 불완전한 HTML 코드블럭이 있는지 확인
 * ```html 또는 ```로 감싸진 HTML 콘텐츠 모두 감지 (ChatMessages.tsx의 자동 감지 로직과 일치)
 * @param content 전체 메시지 콘텐츠
 * @returns 불완전한 HTML 블럭이 있으면 true
 */
export function hasIncompleteHtmlBlock(content: string): boolean {
  // 1. ```html로 명시적으로 표시된 HTML 블록들
  const explicitHtmlBlocks = content.match(/```html\b[\s\S]*?```(?!\w)/g) || [];
  const explicitHtmlStarts = content.match(/```html\b/g) || [];

  // 2. 일반 ```로 감싸진 HTML 콘텐츠 블록들 - 완성된 블록들
  // ChatMessages.tsx의 자동 감지 로직과 동일한 패턴 사용
  const implicitHtmlPattern =
    /```\s*\n\s*(?:<!DOCTYPE html>|<html|<HTML|<[^>]+>[\s\S]*?<\/[^>]+>)[\s\S]*?```(?!\w)/g;
  const implicitHtmlBlocks = content.match(implicitHtmlPattern) || [];

  // 3. 일반 ```로 시작하지만 HTML 콘텐츠인 블록들의 시작점 찾기
  // ChatMessages.tsx와 동일한 감지 로직: <!DOCTYPE, <html, <HTML로 시작하거나 HTML 태그 패턴
  const generalHtmlStarts = [];

  // ``` 다음에 오는 콘텐츠를 분석하여 HTML인지 확인
  const codeBlockPattern = /```\s*\n\s*([^`]+?)(?:```|$)/g;
  let match;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    const blockContent = match[1]?.trim();

    if (!blockContent) continue;

    // ChatMessages.tsx의 자동 HTML 감지 로직과 동일
    const isHTML =
      blockContent.startsWith('<!DOCTYPE html>') ||
      blockContent.startsWith('<html') ||
      blockContent.startsWith('<HTML') ||
      (blockContent.startsWith('<') && blockContent.includes('</') && blockContent.length > 50);

    if (isHTML) {
      generalHtmlStarts.push(match[0]);
    }
  }

  // 전체 HTML 블록 개수 계산
  const totalHtmlStarts = explicitHtmlStarts.length + generalHtmlStarts.length;
  const totalCompletedHtmlBlocks = explicitHtmlBlocks.length + implicitHtmlBlocks.length;

  const result = totalHtmlStarts > totalCompletedHtmlBlocks;

  return result;
}

/**
 * 메시지에 불완전한 코드블럭이 있는지 확인 (모든 언어)
 * @param content 전체 메시지 콘텐츠
 * @returns 불완전한 코드 블럭이 있으면 true
 */
export function hasIncompleteCodeBlock(content: string): boolean {
  // ```언어 시작 태그 개수
  const codeStartMatches = content.match(/```\w+/g) || [];

  // ``` 종료 태그 개수
  const endMatches = content.match(/```(?!\w)/g) || [];

  return codeStartMatches.length > endMatches.length;
}

/**
 * 특정 언어의 불완전한 코드블럭 확인
 * @param content 메시지 콘텐츠
 * @param language 언어 (예: 'html', 'javascript', 'python')
 * @returns 해당 언어의 불완전한 블럭이 있으면 true
 */
export function hasIncompleteCodeBlockForLanguage(content: string, language: string): boolean {
  const langPattern = new RegExp(`\`\`\`${language}\\b`, 'g');
  const langStartMatches = content.match(langPattern) || [];
  const endMatches = content.match(/```(?!\w)/g) || [];

  return langStartMatches.length > endMatches.length;
}
