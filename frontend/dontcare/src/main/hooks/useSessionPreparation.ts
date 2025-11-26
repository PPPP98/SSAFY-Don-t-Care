import { useState, useEffect, useRef } from 'react';

// 세션 준비 단계 메시지 (실제 시스템 동작과 일치)
const SESSION_PREPARATION_MESSAGES = [
  '요청을 접수하고 분석하고 있습니다...',
  '새로운 대화방을 준비하고 있습니다...',
  '질문에 가장 적합한 전문가 팀을 구성하고 있습니다...',
  'AI 어시스턴트 시스템을 초기화하고 있습니다...',
  '대화 세션을 설정하고 연결을 준비하고 있습니다...',
];

const MESSAGE_DURATION = 2500; // 2.5초 (세션 준비는 빠름)
const FADE_DURATION = 300; // 0.3초

/**
 * 세션 준비 상태를 관리하는 커스텀 훅
 * - 세션 생성 및 설정 단계의 메시지 순환
 * - 페이드 인/아웃 애니메이션 상태
 * - 자동 정리 기능
 */
export function useSessionPreparation(isActive: boolean) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 메시지 순환 관리 (최소한의 useEffect 사용)
  useEffect(() => {
    if (!isActive) {
      // 비활성화 시 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setCurrentMessageIndex(0);
      setIsTextVisible(true);
      return;
    }

    // 활성화 시 메시지 순환 시작
    intervalRef.current = setInterval(() => {
      // 페이드 아웃
      setIsTextVisible(false);

      // 페이드 아웃 완료 후 메시지 변경
      timeoutRef.current = setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % SESSION_PREPARATION_MESSAGES.length);
        setIsTextVisible(true); // 페이드 인
      }, FADE_DURATION);
    }, MESSAGE_DURATION);

    // 정리 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isActive]);

  // 현재 메시지 반환 함수
  const getCurrentMessage = () => SESSION_PREPARATION_MESSAGES[currentMessageIndex];

  return {
    currentMessage: getCurrentMessage(),
    isTextVisible,
    messageCount: SESSION_PREPARATION_MESSAGES.length,
  };
}
