import { SessionIndicators } from '@/main/components/features/SessionIndicators';
import { ErrorDisplay } from '@/main/components/features/ErrorDisplay';
import { ChatInputArea } from '@/main/components/features/ChatInputArea';

/**
 * 채팅 인터페이스 메인 컴포넌트
 * - 세션 상태 인디케이터
 * - 에러 표시
 * - 입력 영역
 * 각 영역별로 컴포넌트를 분리하여 관심사를 명확히 분리
 */
export function ChatInterface() {
  return (
    <>
      {/* 세션 상태 인디케이터들 */}
      <SessionIndicators />

      {/* 에러 표시 */}
      <ErrorDisplay />

      {/* 입력 영역 */}
      <ChatInputArea />
    </>
  );
}
