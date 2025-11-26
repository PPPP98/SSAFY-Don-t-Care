/**
 * Avatar utilities for generating default avatars and initials
 */

/**
 * Checks if a name contains Korean characters
 *
 * @param name - The name to check
 * @returns True if the name contains Korean characters
 */
function isKoreanName(name: string): boolean {
  // 한국어 문자 확인 (한글 음절: U+AC00 ~ U+D7AF)
  return /[\uAC00-\uD7AF]/.test(name);
}

/**
 * Generates initials from a user's name
 *
 * @param name - The user's full name
 * @returns The initials or default avatar
 *
 * @example
 * generateInitials('John Doe') // 'JD' 반환
 * generateInitials('Maria') // 'MA' 반환
 * generateInitials('') // 'U' 반환
 * generateInitials('김철수') // '김' 반환
 */
export function generateInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'U'; // "User"의 기본값
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return 'U';
  }

  // 한국어 이름의 경우, 첫 번째 글자만 반환
  if (isKoreanName(trimmedName)) {
    return trimmedName.charAt(0);
  }

  // 한국어가 아닌 이름의 경우, 기존 로직 사용
  // 공백으로 분리하고 빈 문자열 필터링
  const nameParts = trimmedName.split(/\s+/).filter((part) => part.length > 0);

  if (nameParts.length === 0) {
    return 'U';
  }

  if (nameParts.length === 1) {
    // 단일 이름: 첫 2글자 사용
    const singleName = nameParts[0];
    if (!singleName) return 'U';

    return singleName.length >= 2
      ? singleName.substring(0, 2).toUpperCase()
      : singleName.toUpperCase().padEnd(1, 'U');
  }

  // 여러 이름: 첫 번째와 두 번째 이름의 첫 글자 사용
  const firstName = nameParts[0];
  const secondName = nameParts[1];

  if (!firstName || !secondName) {
    return firstName ? firstName.charAt(0).toUpperCase() : 'U';
  }

  const firstInitial = firstName.charAt(0);
  const secondInitial = secondName.charAt(0);

  return (firstInitial + secondInitial).toUpperCase();
}

/**
 * Creates a default avatar string from user information
 * Uses the name to generate initials, with fallback handling
 *
 * @param userName - The user's name
 * @returns Avatar string (initials)
 */
export function createDefaultAvatar(userName?: string): string {
  return generateInitials(userName || '');
}
