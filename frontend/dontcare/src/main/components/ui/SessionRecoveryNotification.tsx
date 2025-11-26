/**
 * 세션 복구 상황을 사용자에게 알리고 선택지를 제공하는 컴포넌트
 * 투명한 UX를 위한 복구 프로세스 시각화
 */

import { useState, useEffect } from 'react';
import { useMainStore } from '@/main/stores/mainStore';

interface SessionRecoveryNotificationProps {
  sessionName?: string | undefined;
  isRecovering: boolean;
  recoveryAttempt?: number;
  maxRetries?: number;
  onRetry: () => void;
  onCreateNew: () => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function SessionRecoveryNotification({
  sessionName,
  isRecovering,
  recoveryAttempt = 1,
  maxRetries = 3,
  onRetry,
  onCreateNew,
  onDismiss,
  autoHide = false,
  autoHideDelay = 10000,
}: SessionRecoveryNotificationProps) {
  const [isVisible, setIsVisible] = useState(isRecovering);
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000);

  // 자동 숨김 타이머
  useEffect(() => {
    if (!autoHide || !isVisible) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsVisible(false);
          onDismiss?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoHide, isVisible, onDismiss]);

  // 복구 상태에 따른 가시성 업데이트
  useEffect(() => {
    setIsVisible(isRecovering);
    if (isRecovering && autoHide) {
      setTimeLeft(autoHideDelay / 1000);
    }
  }, [isRecovering, autoHide, autoHideDelay]);

  if (!isVisible) return null;

  const displayName = sessionName || '세션';
  const isLastAttempt = recoveryAttempt >= maxRetries;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-accent-primary/20 bg-bg-tertiary/50 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-start space-x-3">
        {/* 상태 아이콘 */}
        <div className="flex-shrink-0">
          {isRecovering ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          ) : (
            <svg className="h-5 w-5 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* 메시지 컨텐츠 */}
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              {isRecovering ? '세션 복구 중...' : '세션 복구 필요'}
            </h3>

            {/* 자동 숨김 카운터 */}
            {autoHide && timeLeft > 0 && (
              <span className="rounded bg-bg-secondary px-2 py-1 text-xs text-text-muted">
                {timeLeft}초 후 자동 숨김
              </span>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {/* 상태별 메시지 */}
            {isRecovering ? (
              <div>
                <p className="text-sm text-text-secondary">
                  <strong>&ldquo;{displayName}&rdquo;</strong> 세션을 복구하는 중입니다...
                </p>
                <div className="mt-2 flex items-center text-xs text-text-muted">
                  <span>
                    복구 시도: {recoveryAttempt} / {maxRetries}
                  </span>
                  {recoveryAttempt < maxRetries && (
                    <span className="ml-2">• 잠시만 기다려 주세요</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-text-secondary">
                  <strong>&ldquo;{displayName}&rdquo;</strong> 세션에 문제가 발생했습니다.
                </p>
                {isLastAttempt ? (
                  <p className="mt-1 text-xs text-text-muted">
                    최대 재시도 횟수에 도달했습니다. 새로운 채팅을 시작하는 것을 권장합니다.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">
                    세션을 다시 복구하거나 새로운 채팅을 시작할 수 있습니다.
                  </p>
                )}
              </div>
            )}

            {/* 진행률 바 (복구 중일 때) */}
            {isRecovering && (
              <div className="h-2 w-full rounded-full bg-bg-secondary">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-1000"
                  style={{ width: `${(recoveryAttempt / maxRetries) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* 액션 버튼들 */}
          {!isRecovering && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!isLastAttempt && (
                <button
                  onClick={onRetry}
                  className="rounded-md bg-accent-primary/20 px-3 py-1.5 text-sm font-medium text-accent-primary transition-colors duration-200 hover:bg-accent-primary/30"
                >
                  🔄 다시 시도
                </button>
              )}

              <button
                onClick={onCreateNew}
                className="rounded-md bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary"
              >
                ✨ 새 채팅 시작
              </button>

              {onDismiss && (
                <button
                  onClick={() => {
                    setIsVisible(false);
                    onDismiss();
                  }}
                  className="px-3 py-1.5 text-sm text-text-muted transition-colors duration-200 hover:text-text-secondary"
                >
                  ✕ 닫기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 간단한 토스트 버전
interface SessionRecoveryToastProps {
  message: string;
  type?: 'warning' | 'error' | 'info';
  isVisible: boolean;
  onClose?: () => void;
  duration?: number;
}

export function SessionRecoveryToast({
  message,
  type = 'warning',
  isVisible,
  onClose,
  duration = 5000,
}: SessionRecoveryToastProps) {
  const [shouldShow, setShouldShow] = useState(isVisible);

  useEffect(() => {
    setShouldShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (!shouldShow || !onClose) return;

    const timer = setTimeout(() => {
      setShouldShow(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [shouldShow, onClose, duration]);

  if (!shouldShow) return null;

  const bgColors = {
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const textColors = {
    warning: 'text-yellow-50',
    error: 'text-red-50',
    info: 'text-blue-50',
  };

  return (
    <div
      className={`fixed right-4 top-4 z-50 max-w-sm ${bgColors[type]} ${textColors[type]} transform rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ${shouldShow ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button
            onClick={() => {
              setShouldShow(false);
              onClose();
            }}
            className="ml-3 text-white transition-colors hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// 세션 복구 상태 관리 훅
export function useSessionRecovery() {
  const { activeSession, startNewChat } = useMainStore();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  const startRecovery = () => {
    setIsRecovering(true);
    setRecoveryAttempt((prev) => prev + 1);
    setShowNotification(true);
  };

  const stopRecovery = (success: boolean = false) => {
    setIsRecovering(false);
    if (success) {
      setRecoveryAttempt(0);
      setShowNotification(false);
    }
  };

  const handleRetry = () => {
    if (activeSession) {
      startRecovery();
      // 실제 복구 로직은 상위 컴포넌트에서 처리
    }
  };

  const handleCreateNew = () => {
    startNewChat();
    setIsRecovering(false);
    setRecoveryAttempt(0);
    setShowNotification(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  return {
    isRecovering,
    recoveryAttempt,
    showNotification,
    startRecovery,
    stopRecovery,
    handleRetry,
    handleCreateNew,
    handleDismiss,
  };
}
