import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/main/types/main.types';
import { decodeHtmlEntities } from '@/shared/lib/utils';
import { useMainStore } from '@/main/stores/mainStore';
import { AgentPreparationLoader } from '@/main/components/ui/AgentPreparationLoader';
import { SessionPreparationLoader } from '@/main/components/ui/SessionPreparationLoader';
import { HTMLCodeBlock } from '@/main/components/ui/HTMLCodeBlock';
import { hasIncompleteHtmlBlock } from '@/main/utils/streamingUtils';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const { isPreparingResponse, isTyping } = useMainStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [previousMessages, setPreviousMessages] = useState<ChatMessage[]>([]);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // 메시지 ref를 설정하는 함수
  const setMessageRef = (element: HTMLDivElement | null, messageId: string) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  };

  // 스마트 스크롤 함수: 메시지 타입과 뷰포트를 고려한 최적 스크롤 위치 계산
  const scrollToMessage = (messageId: string, messageType: 'user' | 'ai') => {
    const messageElement = messageRefs.current.get(messageId);
    const container = scrollContainerRef.current;

    if (!messageElement || !container) return;

    setIsAutoScrolling(true);

    const containerHeight = container.clientHeight;
    const messageOffsetTop = messageElement.offsetTop;
    const paddingTop = window.innerWidth >= 768 ? 24 : 16;

    let targetScrollTop;

    if (messageType === 'user') {
      // 사용자 메시지: 메시지가 채팅 영역 상단 근처에 위치하되, AI 답변 공간 고려
      const bufferSpace = Math.min(containerHeight * 0.2, 150); // 20% 또는 최대 150px
      targetScrollTop = messageOffsetTop - paddingTop - bufferSpace;
    } else {
      // AI 메시지: AI 답변 시작이 잘 보이도록 조정
      const optimalPosition = Math.min(containerHeight * 0.15, 100); // 15% 또는 최대 100px
      targetScrollTop = messageOffsetTop - paddingTop - optimalPosition;
    }

    // 최소값 보정 (음수 방지)
    targetScrollTop = Math.max(0, targetScrollTop);

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    // 스크롤 완료 후 auto scrolling 상태 해제
    setTimeout(() => {
      setIsAutoScrolling(false);
    }, 500);
  };

  // 새로운 메시지가 추가되었을 때 스마트 스크롤 적용
  useEffect(() => {
    if (messages.length > previousMessages.length) {
      // 새로 추가된 메시지들 찾기
      const newMessages = messages.slice(previousMessages.length);

      if (!userHasScrolled) {
        // 새로운 사용자 메시지 우선 처리
        const newUserMessage = newMessages.find((msg) => msg.type === 'user');
        if (newUserMessage) {
          scrollToMessage(newUserMessage.id, 'user');
        } else {
          // AI 메시지만 추가된 경우
          const newAIMessage = newMessages.find((msg) => msg.type === 'ai');
          if (newAIMessage) {
            scrollToMessage(newAIMessage.id, 'ai');
          }
        }
      }
    }
    setPreviousMessages(messages);
  }, [messages, previousMessages, userHasScrolled]);

  // 사용자의 수동 스크롤 감지
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!isAutoScrolling) {
        setUserHasScrolled(true);
        // 사용자가 맨 아래로 스크롤하면 다시 자동 스크롤 활성화
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 10;
        if (isAtBottom) {
          setUserHasScrolled(false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAutoScrolling]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-5 lg:max-w-4xl lg:gap-6 xl:max-w-5xl">
        {messages.map((message) => (
          <div
            key={message.id}
            ref={(element) => setMessageRef(element, message.id)}
            className="flex animate-gentle-emerge flex-col gap-3"
          >
            {message.type === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-bg-user-message px-3 py-2 text-sm leading-relaxed text-white md:px-4 md:py-3 md:text-base lg:text-lg">
                  {decodeHtmlEntities(message.content)}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 animate-soft-pulse items-center justify-center rounded-full bg-accent-gradient text-xs font-semibold md:h-8 md:w-8 md:text-sm">
                  AI
                </div>
                <div className="flex-1 text-sm leading-[1.6] text-text-primary md:text-base md:leading-[1.7] lg:text-lg">
                  {message.content ? (
                    <div className="prose prose-sm dark:prose-invert md:prose-base lg:prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                          ),
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: (props) => {
                            const { children, className, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            let language = match?.[1];

                            // 자동 HTML 감지: className이 없어도 HTML 콘텐츠이면 HTML로 처리
                            if (!language) {
                              const content = String(children).trim();
                              const isHTML =
                                content.startsWith('<!DOCTYPE html>') ||
                                content.startsWith('<html') ||
                                content.startsWith('<HTML') ||
                                (content.startsWith('<') &&
                                  content.includes('</') &&
                                  content.length > 50);

                              if (isHTML) {
                                language = 'html';
                              }
                            }

                            // HTML 코드 블록 감지 - 스트리밍 인식 로직
                            if (language === 'html') {
                              // 스트리밍 중이고 불완전한 HTML 블록이 있으면 일반 코드로 렌더링
                              if (message.isStreaming && hasIncompleteHtmlBlock(message.content)) {
                                return (
                                  <code className="block whitespace-pre-wrap break-words rounded bg-gray-100 px-3 py-2 font-mono text-sm dark:bg-gray-800">
                                    {children}
                                  </code>
                                );
                              }

                              // 스트리밍이 끝났거나 완전한 HTML 블록이면 HTMLCodeBlock 컴포넌트 사용
                              return (
                                <HTMLCodeBlock
                                  {...rest}
                                  className={className}
                                  messageId={message.id}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </HTMLCodeBlock>
                              );
                            }

                            // 일반 인라인 코드 처리
                            return (
                              <code className="break-words rounded bg-gray-100 px-1 py-0.5 font-mono text-sm dark:bg-gray-800">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="mb-2 overflow-hidden whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-800">
                              {children}
                            </pre>
                          ),
                          h1: ({ children }) => (
                            <h1 className="mb-2 text-xl font-bold">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 text-lg font-bold">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-2 text-base font-bold">{children}</h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="mb-2 border-l-4 border-gray-300 pl-4 italic dark:border-gray-600">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {decodeHtmlEntities(message.content)}
                      </ReactMarkdown>

                      {/* 인라인 타이핑 표시기 - content가 충분히 있는 스트리밍 메시지에만 표시 */}
                      {message.isStreaming && message.content.length > 50 && (
                        <span className="ml-1 inline-flex gap-1 align-middle">
                          <span className="h-1 w-1 animate-typing rounded-full bg-text-muted"></span>
                          <span className="h-1 w-1 animate-typing rounded-full bg-text-muted [animation-delay:0.2s]"></span>
                          <span className="h-1 w-1 animate-typing rounded-full bg-text-muted [animation-delay:0.4s]"></span>
                        </span>
                      )}
                    </div>
                  ) : (
                    /* content가 없으면 AgentPreparationLoader를 메시지 내부에 표시 */
                    <AgentPreparationLoader isVisible={message.isStreaming || false} />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 1단계: 세션 준비 로딩 UI - 자연스러운 등장 애니메이션 */}
        {isPreparingResponse && !isTyping && (
          <div className="flex animate-gentle-emerge flex-col gap-3 transition-all duration-300 ease-out">
            <div className="flex gap-3 py-4">
              <div className="flex h-7 w-7 flex-shrink-0 animate-soft-pulse items-center justify-center rounded-full bg-accent-gradient text-xs font-semibold md:h-8 md:w-8 md:text-sm">
                AI
              </div>
              <div className="flex-1">
                <SessionPreparationLoader isVisible={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
