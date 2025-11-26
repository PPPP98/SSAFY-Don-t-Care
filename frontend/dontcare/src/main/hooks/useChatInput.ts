import { useComposerStore } from '@/main/stores/useComposerStore';
import { useEffect, useRef, useState } from 'react';

/**
 * 채팅 입력 관련 로직을 관리하는 커스텀 훅
 * - 입력 값 상태 관리
 * - 텍스트 에리어 자동 크기 조정
 * - ComposerStore와의 동기화
 * - 포커스 관리
 */
export function useChatInput() {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { draft, focusTick, clear } = useComposerStore();

  // ComposerStore와 동기화
  useEffect(() => {
    if (draft !== inputValue) {
      setInputValue(draft);
      // 텍스트에어리어 자동 크기 조정
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]); // inputValue 의존성 제거로 무한 루프 방지

  // 포커스 요청 처리
  useEffect(() => {
    if (focusTick > 0 && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [focusTick]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // ComposerStore의 draft도 업데이트하여 동기화 유지
    const setDraft = useComposerStore.getState().setDraft;
    setDraft(newValue);

    // 텍스트에어리어 자동 크기 조정
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const clearInput = () => {
    setInputValue('');
    clear(); // ComposerStore의 draft 상태도 초기화
  };

  // IME Composition 이벤트 핸들러 (한국어, 중국어, 일본어 입력 처리)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return {
    inputValue,
    setInputValue,
    textareaRef,
    handleInputChange,
    clearInput,
    isComposing,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
