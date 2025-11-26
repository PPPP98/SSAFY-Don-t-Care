import { extractSessionId, vertexAIService } from '@/main/services/vertexAiService';
import { useMainStore } from '@/main/stores/mainStore';
import type { ChatMessage, Session } from '@/main/types/main.types';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useAgentWorkflowStore } from '@/main/stores/agentWorkflowStore';

/**
 * 메시지 전송 관련 로직을 관리하는 커스텀 훅
 * - 에이전트 결정 로직
 * - 세션 관리
 * - 사용자 메시지 처리
 * - AI 응답 스트리밍
 * - 에러 처리
 */
export function useMessageSending() {
  const queryClient = useQueryClient();
  const lastSubmissionTime = useRef<number>(0);
  const SUBMISSION_DEBOUNCE_MS = 500; // 500ms 최소 간격으로 중복 제출 방지

  // 에이전트 워크플로우 추적 (전역 store)
  const { resetAllAgents, parseAuthorActivity, handleFunctionCall, handleFunctionResponse } =
    useAgentWorkflowStore();

  const {
    agents,
    activeSession,
    setActiveAgent,
    addMessage,
    updateStreamingMessage,
    completeStreamingMessage,
    setIsTyping,
    setIsFirstMessage,
    setActiveSession,
    addSession,
    setSessions,
    isSessionLoading,
    sessionLoadError,
    setSessionLoadError,
    setIsPreparingResponse,
  } = useMainStore();

  // 에이전트 결정 로직 (기존과 동일)
  function determineAgent(message: string) {
    const lowerMessage = message.toLowerCase();

    for (const agent of agents) {
      if (agent.keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return agent.id;
      }
    }

    return 'finance'; // 기본 에이전트
  }

  const sendMessage = async (messageText: string) => {
    // 입력 검증
    if (!messageText.trim() || isSessionLoading) return;

    // 중복 제출 방지 (rate limiting)
    const now = Date.now();
    if (now - lastSubmissionTime.current < SUBMISSION_DEBOUNCE_MS) {
      return;
    }
    lastSubmissionTime.current = now;

    // 에러 상태 초기화
    if (sessionLoadError) {
      setSessionLoadError(null);
    }

    const cleanMessageText = messageText.trim();

    try {
      // 에이전트 준비 상태 시작
      setIsPreparingResponse(true);

      // 새 메시지 시작 시 에이전트 추적 초기화
      resetAllAgents();

      // 첫 번째 메시지에서 웰컴 화면 숨기기
      setIsFirstMessage(false);

      // 활성 에이전트 결정 및 설정
      const agentId = determineAgent(cleanMessageText);
      setActiveAgent(agentId);

      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: cleanMessageText,
        type: 'user',
        timestamp: new Date(),
      };
      addMessage(userMessage);

      let sessionToUse = activeSession;

      // 세션 유효성 재검증 (중요: 무효한 세션 감지 시 null로 설정)
      // useSessionSync가 이미 세션 검증을 담당하므로 간단한 null 체크만 수행
      if (sessionToUse && !sessionToUse.name) {
        // 메시지 전송 중 무효한 세션 감지, 새 세션 생성 예정
        sessionToUse = null;
      }

      // 세션이 없는 경우에만 새 세션 생성 (isFirstMessage 조건 제거로 버그 수정)
      if (!sessionToUse) {
        try {
          // 1. 세션 생성 (displayName 없이)
          sessionToUse = await vertexAIService.createSession();

          // 2. displayName 추출 및 설정
          let displayNameText = cleanMessageText;

          // "다음 기사에 대해 자세히 알려줘:" 문구가 포함된 경우 제거
          const newsPrefixPattern = /^다음 기사에 대해 자세히 알려줘:\s*/;
          if (newsPrefixPattern.test(displayNameText)) {
            displayNameText = displayNameText.replace(newsPrefixPattern, '').trim();
          }

          const firstSentence = displayNameText.split(/[.!?]/)[0];
          const extracted =
            firstSentence && firstSentence.length > 0 ? firstSentence : displayNameText;
          const displayName =
            extracted && extracted.length > 64 ? extracted.substring(0, 64) : extracted;

          // 3. PATCH 요청으로 displayName 설정
          await vertexAIService.updateSession(extractSessionId(sessionToUse.name), displayName);

          // 4. 세션 리스트 조회로 최신 정보 가져오기
          const updatedSessionsResponse = await vertexAIService.listSessions();
          const updatedSessions = updatedSessionsResponse.sessions;
          setSessions(updatedSessions);

          // 5. TanStack Query 캐시 무효화하여 ChatHistory 세션 목록 새로고침
          queryClient.invalidateQueries({ queryKey: ['sessions'] });

          // 6. 업데이트된 세션 정보로 activeSession 설정
          if (!sessionToUse) {
            setActiveAgent(null);
            return;
          }

          // 세션 이름 검증
          if (!sessionToUse.name) {
            throw new Error('Session creation failed: invalid session name');
          }

          const sessionName = sessionToUse.name;
          const updatedSession = updatedSessions.find((s: Session) => s.name === sessionName);
          if (updatedSession) {
            sessionToUse = updatedSession;
            setActiveSession(updatedSession);
          } else {
            setActiveSession(sessionToUse);
            addSession(sessionToUse);
          }
        } catch {
          setIsPreparingResponse(false);
          setActiveAgent(null);
          return;
        }
      }

      // 깜빡임 방지: flushSync로 동기화된 상태 전환
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        content: '',
        type: 'ai',
        timestamp: new Date(),
        agentId,
        isStreaming: true,
      };

      // 1단계: AI 메시지 추가 (AgentPreparationLoader 준비)
      flushSync(() => {
        addMessage(aiMessage);
      });

      // 2단계: 상태 전환 (SessionPreparationLoader → AgentPreparationLoader)
      flushSync(() => {
        setIsPreparingResponse(false);
        setIsTyping(true);
      });

      // 스트리밍 전 최종 안전장치
      if (!sessionToUse) {
        // 스트리밍을 위한 세션을 사용할 수 없음, 중단
        setIsPreparingResponse(false);
        setIsTyping(false);
        setActiveAgent(null);
        return;
      }

      // 세션 ID 추출 및 검증
      const finalSessionId = extractSessionId(sessionToUse.name);
      if (!finalSessionId) {
        // 세션 이름에서 세션 ID를 추출할 수 없음, 중단
        setIsPreparingResponse(false);
        setIsTyping(false);
        setActiveAgent(null);

        // 에러 메시지 추가
        const errorMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          content: '세션 오류가 발생했습니다. 새로운 채팅을 시작해 주세요.',
          type: 'ai',
          timestamp: new Date(),
          agentId,
        };
        addMessage(errorMessage);
        return;
      }

      // 세션에 대한 스트림 시작 (에이전트 추적 통합)
      await vertexAIService.streamMessage(
        finalSessionId,
        cleanMessageText,
        'agents', // Always use 'agents' for new streaming API
        // onToken: 스트리밍 메시지에 텍스트 추가
        (content: string) => {
          updateStreamingMessage(aiMessageId, content);
        },
        // onToolCall: 도구 호출 처리 + A2A 에이전트 추적
        (name: string, args: Record<string, unknown>) => {
          // Root Agent가 선택한 Sub Agent의 도구 호출
          handleFunctionCall(name, args.id as string);
        },
        // onToolResult: 도구 결과 처리 + A2A 에이전트 추적
        (name: string, response: Record<string, unknown>) => {
          // Sub Agent 작업 완료, Root Agent가 결과 종합
          const hasError = response.error !== undefined;
          handleFunctionResponse(name, hasError);
        },
        // onComplete: 스트리밍 완료 + 에이전트 워크플로우 완료
        () => {
          completeStreamingMessage(aiMessageId);
          setIsTyping(false);
          setActiveAgent(null);
          // 모든 에이전트 작업 완료 처리
          resetAllAgents();
        },
        // onError: 개선된 에러 처리 + 에이전트 오류 상태
        (error: Error) => {
          // 스트리밍 오류
          completeStreamingMessage(aiMessageId);
          setIsPreparingResponse(false);
          setIsTyping(false);
          setActiveAgent(null);
          // 모든 에이전트를 오류 상태로 설정
          resetAllAgents();

          // 에러 타입별 메시지 분기
          let errorContent =
            'Sorry, I encountered an error while processing your request. Please try again.';

          if (error.message.includes('session') || error.message.includes('Session')) {
            errorContent =
              '세션 오류가 발생했습니다. 새로운 채팅을 시작하거나 페이지를 새로고침 해주세요.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorContent =
              '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
          } else if (error.message.includes('timeout')) {
            errorContent = '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
          }

          // 에러 메시지 추가
          const errorMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            content: errorContent,
            type: 'ai',
            timestamp: new Date(),
            agentId,
          };
          addMessage(errorMessage);
        },
        // onAuthor: 에이전트 활동 추적 - 가장 중요한 콜백!
        (author: string, isPartial: boolean) => {
          parseAuthorActivity(author, isPartial);
        },
      );
    } catch {
      setIsPreparingResponse(false);
      setIsTyping(false);
      setActiveAgent(null);
    }
  };

  return {
    sendMessage,
    determineAgent, // 외부에서 필요한 경우를 위해 노출
  };
}
