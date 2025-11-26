import { create } from 'zustand';
import { API_REQUEST_TYPES, type ApiRequestType } from '@/auth/constants/auth.config';

/**
 * API 요청 상태 관리 스토어
 *
 * @description
 * - 각 API 요청의 중복 호출 방지를 위한 전역 상태 관리
 * - 요청 ID를 통한 중복 체크 및 상태 추적
 * - TanStack Query와 연동하여 중앙 집중식 관리
 */
interface ApiRequestState {
  /** 현재 진행 중인 API 요청들의 ID 목록 */
  pendingRequests: Set<string>;
  /** 요청별 상세 정보 */
  requestDetails: Record<
    string,
    {
      id: string;
      type: ApiRequestType;
      startTime: number;
      isPending: boolean;
    }
  >;
}

interface ApiRequestActions {
  /** API 요청 시작 */
  startRequest: (id: string, type: ApiRequestType) => void;
  /** API 요청 완료 */
  completeRequest: (id: string) => void;
  /** 특정 요청이 진행 중인지 확인 */
  isRequestPending: (id: string) => boolean;
  /** 특정 타입의 요청이 진행 중인지 확인 */
  isTypePending: (type: ApiRequestType) => boolean;
  /** 모든 요청 초기화 */
  clearAllRequests: () => void;
  /** 특정 요청 제거 */
  removeRequest: (id: string) => void;
}

type ApiRequestStore = ApiRequestState & ApiRequestActions;

const getInitialState = (): ApiRequestState => ({
  pendingRequests: new Set<string>(),
  requestDetails: {},
});

export const useApiRequestStore = create<ApiRequestStore>()((set, get) => ({
  ...getInitialState(),

  startRequest: (id: string, type: ApiRequestType) => {
    set((state) => ({
      pendingRequests: new Set([...state.pendingRequests, id]),
      requestDetails: {
        ...state.requestDetails,
        [id]: {
          id,
          type,
          startTime: Date.now(),
          isPending: true,
        },
      },
    }));
  },

  completeRequest: (id: string) => {
    set((state) => {
      const newPendingRequests = new Set(state.pendingRequests);
      newPendingRequests.delete(id);

      const newRequestDetails = { ...state.requestDetails };
      if (newRequestDetails[id]) {
        newRequestDetails[id] = {
          ...newRequestDetails[id],
          isPending: false,
        };
      }

      return {
        pendingRequests: newPendingRequests,
        requestDetails: newRequestDetails,
      };
    });
  },

  isRequestPending: (id: string) => {
    return get().pendingRequests.has(id);
  },

  isTypePending: (type: ApiRequestType) => {
    const { requestDetails } = get();
    return Object.values(requestDetails).some((detail) => detail.type === type && detail.isPending);
  },

  clearAllRequests: () => {
    set(getInitialState());
  },

  removeRequest: (id: string) => {
    set((state) => {
      const newPendingRequests = new Set(state.pendingRequests);
      newPendingRequests.delete(id);

      const newRequestDetails = { ...state.requestDetails };
      delete newRequestDetails[id];

      return {
        pendingRequests: newPendingRequests,
        requestDetails: newRequestDetails,
      };
    });
  },
}));

// API_REQUEST_TYPES와 ApiRequestType은 auth/constants/auth.types.ts에서 import
export { API_REQUEST_TYPES, type ApiRequestType };
