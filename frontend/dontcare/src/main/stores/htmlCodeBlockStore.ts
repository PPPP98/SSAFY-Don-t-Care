import { create } from 'zustand';
import type { ViewMode } from '@/main/types/htmlCodeBlock.types';

interface HTMLCodeBlockState {
  // 각 HTML 코드 블록의 viewMode를 저장 (messageId를 key로 사용)
  viewModes: Record<string, ViewMode>;

  // viewMode 설정
  setViewMode: (messageId: string, viewMode: ViewMode) => void;

  // viewMode 조회
  getViewMode: (messageId: string) => ViewMode;

  // 특정 메시지의 상태 삭제 (메모리 정리용)
  removeViewMode: (messageId: string) => void;
}

/**
 * HTML 코드 블록의 viewMode 상태를 전역으로 관리하는 스토어
 * 컴포넌트 리렌더링과 무관하게 상태를 유지합니다.
 */
export const useHTMLCodeBlockStore = create<HTMLCodeBlockState>((set, get) => ({
  viewModes: {},

  setViewMode: (messageId: string, viewMode: ViewMode) => {
    set((state) => ({
      viewModes: {
        ...state.viewModes,
        [messageId]: viewMode,
      },
    }));
  },

  getViewMode: (messageId: string) => {
    const state = get();
    return state.viewModes[messageId] || 'code'; // 기본값은 'code'
  },

  removeViewMode: (messageId: string) => {
    set((state) => {
      const newViewModes = { ...state.viewModes };
      delete newViewModes[messageId];
      return { viewModes: newViewModes };
    });
  },
}));
