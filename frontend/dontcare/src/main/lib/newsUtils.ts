// src/main/lib/newsUtils.ts
export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '최근';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((+now - +date) / 1000 / 60);
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  } catch {
    return '최근';
  }
}
