import type { KeyboardEvent } from 'react';
import { useChatInput } from '@/main/hooks/useChatInput';
import { useMessageSending } from '@/main/hooks/useMessageSending';
import { useSessionManager } from '@/main/hooks/useSessionManager';

/**
 * 채팅 입력 영역 컴포넌트
 * - 사용자 메시지 입력을 위한 textarea
 * - 전송 버튼 및 키보드 단축키
 * - 세션 상태에 따른 disabled 처리
 */
export function ChatInputArea() {
  // 입력 관련 로직
  const {
    inputValue,
    textareaRef,
    handleInputChange,
    clearInput,
    isComposing,
    handleCompositionStart,
    handleCompositionEnd,
  } = useChatInput();

  // 메시지 전송 로직
  const { sendMessage } = useMessageSending();

  // 세션 상태 관리
  const { isSessionLoading, isTyping } = useSessionManager();

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME 입력 중(composition)일 때는 Enter 키 처리를 건너뛰어 이중 제출 방지
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      const message = inputValue.trim();
      if (message) {
        sendMessage(message);
        clearInput();
      }
    }
  };

  const handleSendClick = () => {
    const message = inputValue.trim();
    if (message) {
      sendMessage(message);
      clearInput(); // 메시지 전송 후 입력창 초기화
    }
  };

  return (
    <div className="bg-bg-primary p-4 md:p-6">
      <div className="input-wrapper relative mx-auto max-w-2xl rounded-2xl border border-border-color bg-bg-secondary px-3 py-2.5 transition-all duration-200 focus-within:border-accent-primary md:rounded-3xl md:px-4 md:py-3 lg:max-w-4xl xl:max-w-5xl">
        <textarea
          ref={textareaRef}
          id="messageInput"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={isSessionLoading || isTyping}
          className="font-inherit max-h-48 min-h-6 w-full resize-none border-none bg-transparent py-1 pr-9 text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50 md:pr-10 md:text-base lg:text-lg"
          placeholder={
            isSessionLoading
              ? '세션을 불러오는 중...'
              : '주식이나 투자에 대해 궁금한 것을 물어보세요...'
          }
          rows={1}
        />
        <button
          onClick={handleSendClick}
          disabled={!inputValue.trim() || isSessionLoading || isTyping}
          className="absolute bottom-1/2 right-2.5 flex h-7 w-7 translate-y-1/2 transform cursor-pointer items-center justify-center rounded-full border-none bg-accent-gradient text-white transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-accent-primary/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 md:right-3 md:h-8 md:w-8"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
