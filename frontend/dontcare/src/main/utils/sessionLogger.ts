/**
 * 세션 관리를 위한 중앙화된 로깅 시스템
 * 디버깅과 모니터링을 위한 구조화된 로그 제공
 */

export interface SessionTransition {
  from: string;
  to: string;
  reason: string;
  timestamp: Date;
  userId?: string;
}

export interface SessionError {
  sessionId: string;
  error: unknown;
  context: string;
  timestamp: Date;
  userId?: string;
  stack?: string;
}

export interface SessionRecovery {
  sessionId: string;
  attempt: number;
  success: boolean;
  timestamp: Date;
  duration?: number;
  errorMessage?: string;
}

export interface SessionMetric {
  sessionId: string;
  operation: 'load' | 'create' | 'update' | 'delete' | 'stream';
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

export class SessionLogger {
  // @ts-expect-error - Kept for future logging needs
  private static readonly LOG_PREFIX = '[SessionManager]';
  private static readonly isDebugMode = process.env.NODE_ENV === 'development';

  // 세션 전환 로깅
  static logSessionTransition(from: string, to: string, reason: string, userId?: string) {
    const transition: SessionTransition = {
      from,
      to,
      reason,
      timestamp: new Date(),
      ...(userId && { userId }),
    };

    // 프로덕션에서는 로그 출력하지 않음

    // 프로덕션에서는 분석 서비스로 전송 가능
    this.trackEvent('session_transition', transition);
  }

  // 세션 에러 로깅
  static logSessionError(sessionId: string, error: unknown, context: string, userId?: string) {
    const errorInfo: SessionError = {
      sessionId,
      error,
      context,
      timestamp: new Date(),
      ...(userId && { userId }),
      ...(error instanceof Error && error.stack && { stack: error.stack }),
    };

    // 프로덕션에서는 에러 로그 출력하지 않음

    this.trackEvent('session_error', errorInfo);
  }

  // 세션 복구 로깅
  static logSessionRecovery(
    sessionId: string,
    attempt: number,
    success: boolean,
    duration?: number,
    errorMessage?: string,
  ) {
    const recovery: SessionRecovery = {
      sessionId,
      attempt,
      success,
      timestamp: new Date(),
      ...(duration !== undefined && { duration }),
      ...(errorMessage && { errorMessage }),
    };

    // 프로덕션에서는 복구 로그 출력하지 않음

    this.trackEvent('session_recovery', recovery);
  }

  // 세션 성능 메트릭 로깅
  static startOperation(sessionId: string, operation: SessionMetric['operation']): string {
    const operationId = `${sessionId}_${operation}_${Date.now()}`;
    const startTime = performance.now();

    // 프로덕션에서는 타이머 로그 출력하지 않음

    // 메트릭 저장 (간단한 메모리 저장)
    this.storeMetric(operationId, {
      sessionId,
      operation,
      startTime,
    });

    return operationId;
  }

  static endOperation(operationId: string, success: boolean = true, error?: string) {
    const endTime = performance.now();
    const metric = this.getMetric(operationId);

    if (metric) {
      metric.endTime = endTime;
      metric.duration = endTime - metric.startTime;
      metric.success = success;
      if (error) {
        metric.error = error;
      }

      // 프로덕션에서는 성능 메트릭 로그 출력하지 않음

      this.trackEvent('session_metric', metric);
    }
  }

  // 일반 디버그 로깅
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static debug(_context: string, _message: string, _data?: unknown) {
    // 프로덕션에서는 디버그 로그 출력하지 않음
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static info(_context: string, _message: string, _data?: unknown) {
    // 프로덕션에서는 정보 로그 출력하지 않음
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static warn(_context: string, _message: string, _data?: unknown) {
    // 프로덕션에서는 경고 로그 출력하지 않음
  }

  // 세션 상태 스냅샷 (보안 강화 버전)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static logSessionSnapshot(_sessionId: string, _state: Record<string, unknown>) {
    // 프로덕션에서는 세션 스냅샷 로그 출력하지 않음
  }

  // 내부 헬퍼 메서드들
  private static metrics = new Map<string, SessionMetric>();

  private static storeMetric(operationId: string, metric: SessionMetric) {
    this.metrics.set(operationId, metric);

    // 메모리 정리 (5분 후 자동 삭제)
    setTimeout(
      () => {
        this.metrics.delete(operationId);
      },
      5 * 60 * 1000,
    );
  }

  private static getMetric(operationId: string): SessionMetric | undefined {
    return this.metrics.get(operationId);
  }

  private static trackEvent(eventType: string, data: unknown) {
    // 프로덕션 환경에서는 분석 서비스로 전송
    // 개발 환경에서는 로컬 스토리지에 저장하여 디버깅 지원
    if (this.isDebugMode) {
      const events = JSON.parse(localStorage.getItem('session_debug_events') || '[]');
      events.push({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      });

      // 최대 100개 이벤트만 유지
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      localStorage.setItem('session_debug_events', JSON.stringify(events));
    }
  }

  // 디버깅을 위한 유틸리티 메서드
  static getDebugEvents(): unknown[] {
    if (!this.isDebugMode) return [];
    return JSON.parse(localStorage.getItem('session_debug_events') || '[]');
  }

  static clearDebugEvents() {
    if (this.isDebugMode) {
      localStorage.removeItem('session_debug_events');
      // 프로덕션에서는 디버그 이벤트 클리어 로그 출력하지 않음
    }
  }

  static getMetrics(): SessionMetric[] {
    return Array.from(this.metrics.values());
  }
}
