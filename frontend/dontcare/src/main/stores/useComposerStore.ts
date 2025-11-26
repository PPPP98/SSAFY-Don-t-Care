import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NewsMetadata } from '@/main/types/news';

interface ComposerState {
  draft: string;
  focusTick: number; // focus 신호(증가값)
  isNewsDraft: boolean;
  newsMetadata: NewsMetadata | null;
  setDraft: (text: string, metadata?: NewsMetadata) => void;
  requestFocus: () => void;
  clear: () => void;
}

export const useComposerStore = create<ComposerState>()(
  persist(
    (set) => ({
      draft: '',
      focusTick: 0,
      isNewsDraft: false,
      newsMetadata: null,
      setDraft: (text, metadata) =>
        set({
          draft: text,
          isNewsDraft: !!metadata,
          newsMetadata: metadata || null,
        }),
      requestFocus: () => set((s) => ({ focusTick: s.focusTick + 1 })),
      clear: () => set({ draft: '', isNewsDraft: false, newsMetadata: null }),
    }),
    { name: 'dc:composer', storage: createJSONStorage(() => sessionStorage) },
  ),
);
