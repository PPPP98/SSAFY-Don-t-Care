/**
 * 세션 데이터 검증 및 타입 안전성을 위한 유틸리티
 * TypeScript 타입 가드와 런타임 검증 제공
 */

import { extractSessionId } from '@/main/services/vertexAiService';
import type { Session } from '@/main/types/main.types';
import { SessionLogger } from '@/main/utils/sessionLogger';
import { gcpConfig } from '@/env';

// 세션 검증 오류 타입 정의
export class SessionValidationError extends Error {
  readonly sessionId?: string;
  readonly field?: string;
  readonly context?: string;

  constructor(message: string, sessionId?: string, field?: string, context?: string) {
    super(message);
    this.name = 'SessionValidationError';
    if (sessionId !== undefined) this.sessionId = sessionId;
    if (field !== undefined) this.field = field;
    if (context !== undefined) this.context = context;
  }
}

// 세션 검증 결과 타입
export interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sessionId?: string;
  canRecover: boolean;
}

// 기본 세션 타입 가드
export function isSessionLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// 완전한 세션 타입 가드
export function isValidSession(session: unknown): session is Session {
  if (!isSessionLike(session)) {
    return false;
  }

  const s = session as Record<string, unknown>;

  // 필수 필드 검증
  return (
    typeof s.name === 'string' &&
    s.name.length > 0 &&
    typeof s.displayName === 'string' &&
    s.displayName.length > 0 &&
    (s.state === undefined || typeof s.state === 'object') &&
    (s.events === undefined || Array.isArray(s.events))
  );
}

// 복구 가능한 세션 타입 가드
export function isRecoverableSession(session: unknown): session is Partial<Session> {
  if (!isSessionLike(session)) {
    return false;
  }

  const s = session as Record<string, unknown>;

  // 세션 ID만 추출 가능하면 복구 가능
  if (typeof s.name === 'string' && extractSessionId(s.name)) {
    return true;
  }

  // name이 없어도 다른 식별자가 있으면 복구 시도 가능
  return !!(s.userId && typeof s.userId === 'string');
}

// 포괄적인 세션 검증 함수
export function validateSession(
  session: unknown,
  context: string = 'unknown',
): SessionValidationResult {
  const result: SessionValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    canRecover: false,
  };

  // null/undefined 체크
  if (!session) {
    result.errors.push('세션이 null이거나 undefined입니다');
    SessionLogger.debug('SessionValidation', 'Session is null or undefined', { context });
    return result;
  }

  // 객체 타입 체크
  if (!isSessionLike(session)) {
    result.errors.push('세션이 객체가 아닙니다');
    SessionLogger.debug('SessionValidation', 'Session is not an object', {
      context,
      type: typeof session,
    });
    return result;
  }

  const s = session as Record<string, unknown>;

  // 세션 ID 추출 및 검증
  let sessionId: string | undefined;
  if (typeof s.name === 'string') {
    sessionId = extractSessionId(s.name);
    result.sessionId = sessionId;

    if (!sessionId) {
      result.errors.push('세션 이름에서 세션 ID를 추출할 수 없습니다');
      SessionLogger.warn('SessionValidation', 'Cannot extract session ID', {
        context,
        name: s.name,
      });
    }
  } else {
    result.errors.push('세션 이름이 누락되었거나 문자열이 아닙니다');
    SessionLogger.warn('SessionValidation', 'Session name validation failed', {
      context,
      nameType: typeof s.name,
      name: s.name,
    });
  }

  // Display name 검증
  if (typeof s.displayName !== 'string') {
    result.errors.push('표시 이름이 누락되었거나 문자열이 아닙니다');
  } else if (s.displayName.length === 0) {
    result.warnings.push('표시 이름이 비어있습니다');
  } else if (s.displayName === 'Session unknown') {
    result.warnings.push('표시 이름이 기본값입니다');
  }

  // 상태 필드 검증
  if (s.state !== undefined && typeof s.state !== 'object') {
    result.errors.push('세션 상태는 제공되는 경우 객체여야 합니다');
  }

  // 이벤트 필드 검증
  if (s.events !== undefined && !Array.isArray(s.events)) {
    result.errors.push('세션 이벤트는 제공되는 경우 배열이어야 합니다');
  }

  // 복구 가능성 평가
  result.canRecover = sessionId !== undefined || isRecoverableSession(session);

  // 전체 유효성 평가
  result.isValid = result.errors.length === 0;

  // 결과 로깅
  if (result.isValid) {
    SessionLogger.debug('SessionValidation', 'Session validation passed', {
      context,
      sessionId,
      warnings: result.warnings.length,
    });
  } else {
    SessionLogger.warn('SessionValidation', 'Session validation failed', {
      context,
      sessionId,
      errors: result.errors,
      warnings: result.warnings,
      canRecover: result.canRecover,
    });
  }

  return result;
}

// 세션 무결성 검사 (심화 검증)
export function checkSessionIntegrity(session: Session): boolean {
  const operationId = SessionLogger.startOperation(
    extractSessionId(session.name) || 'unknown',
    'load',
  );

  try {
    // 기본 검증
    const validation = validateSession(session, 'integrity-check');
    if (!validation.isValid) {
      SessionLogger.endOperation(operationId, false, 'Basic validation failed');
      return false;
    }

    // 세션 ID 일관성 검사
    const sessionId = extractSessionId(session.name);
    if (!sessionId || sessionId.length < 8) {
      SessionLogger.warn('SessionIntegrity', 'Session ID too short or invalid', { sessionId });
      SessionLogger.endOperation(operationId, false, 'Invalid session ID');
      return false;
    }

    // 날짜 필드 검증
    if (session.createdAt && session.updatedAt) {
      if (session.createdAt > session.updatedAt) {
        SessionLogger.warn('SessionIntegrity', 'Created date is after updated date', {
          sessionId,
          created: session.createdAt,
          updated: session.updatedAt,
        });
      }
    }

    // 이벤트 일관성 검사 (있는 경우)
    if (session.events && session.events.length > 0) {
      const hasInvalidEvents = session.events.some(
        (event) => !event.content || typeof event.content !== 'object',
      );

      if (hasInvalidEvents) {
        SessionLogger.warn('SessionIntegrity', 'Invalid events detected', { sessionId });
      }
    }

    SessionLogger.endOperation(operationId, true);
    SessionLogger.debug('SessionIntegrity', 'Session integrity check passed', { sessionId });
    return true;
  } catch (error) {
    SessionLogger.logSessionError(
      extractSessionId(session.name) || 'unknown',
      error,
      'integrity-check',
    );
    SessionLogger.endOperation(
      operationId,
      false,
      error instanceof Error ? error.message : 'Unknown error',
    );
    return false;
  }
}

// 세션 정리 함수 (손상된 필드 복구)
export function sanitizeSession(session: Partial<Session>, sessionId?: string): Session | null {
  try {
    // 세션 ID 확보
    const finalSessionId = sessionId || extractSessionId(session.name);
    if (!finalSessionId) {
      SessionLogger.logSessionError(
        'unknown',
        new Error('Cannot determine session ID'),
        'sanitize-session-id',
      );
      return null;
    }

    // 기본 세션 구조 생성
    const sanitized: Session = {
      name:
        session.name ||
        gcpConfig.getSessionResourcePath(finalSessionId),
      displayName: session.displayName || `Session ${finalSessionId.slice(0, 8)}`,
      state: session.state && typeof session.state === 'object' ? session.state : {},
      events: Array.isArray(session.events) ? session.events : [],
      ...(session.userId && { userId: session.userId }),
      ...(session.appName && { appName: session.appName }),
      ...(session.lastUpdateTime && { lastUpdateTime: session.lastUpdateTime }),
      createdAt: session.createdAt || new Date(),
      updatedAt: session.updatedAt || new Date(),
      isActive: session.isActive ?? true,
    };

    // 최종 검증
    const validation = validateSession(sanitized, 'post-sanitization');
    if (!validation.isValid) {
      SessionLogger.logSessionError(
        finalSessionId,
        new Error('Sanitization failed'),
        'post-sanitization-validation',
      );
      return null;
    }

    SessionLogger.info('SessionSanitization', 'Session successfully sanitized', {
      sessionId: finalSessionId,
    });
    return sanitized;
  } catch (error) {
    SessionLogger.logSessionError(sessionId || 'unknown', error, 'session-sanitization');
    return null;
  }
}

// 세션 비교 유틸리티
export function compareSessions(
  session1: Session,
  session2: Session,
): {
  identical: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  if (session1.name !== session2.name) {
    differences.push('name');
  }
  if (session1.displayName !== session2.displayName) {
    differences.push('displayName');
  }
  if (session1.userId !== session2.userId) {
    differences.push('userId');
  }
  if (session1.isActive !== session2.isActive) {
    differences.push('isActive');
  }

  return {
    identical: differences.length === 0,
    differences,
  };
}
