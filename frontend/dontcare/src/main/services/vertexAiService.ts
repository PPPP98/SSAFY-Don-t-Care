import { SessionLogger } from '@/main/utils/sessionLogger';
import {
  checkSessionIntegrity,
  sanitizeSession,
  validateSession,
} from '@/main/utils/sessionValidation';
import { gcpConfig } from '@/env';

interface UserInfo {
  email: string;
}

// Google Cloud 리소스 이름에서 세션 ID를 추출하는 헬퍼 함수
export function extractSessionId(sessionName: string | undefined): string {
  if (!sessionName || typeof sessionName !== 'string') {
    return '';
  }

  return sessionName.split('/').pop() || '';
}

interface Session {
  name: string; // Google Cloud 리소스 이름: projects/.../sessions/{sessionId}
  displayName: string;
  state: Record<string, unknown>;
  events?: Event[];
  userId?: string;
  appName?: string;
  lastUpdateTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

interface Event {
  author?: string;
  content?: {
    role?: string;
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
        args: Record<string, unknown>;
      };
      functionResponse?: {
        name: string;
        response: Record<string, unknown>;
      };
    }>;
  };
}

class VertexAIService {
  private readonly API_BASE = import.meta.env.VITE_AI_API_BASE_URL;
  private readonly API_BASE_STREAM = import.meta.env.VITE_STREAM_API_URL;

  private getUserId(): string {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      throw new Error('사용자가 로그인되지 않았습니다');
    }

    try {
      const parsed: UserInfo = JSON.parse(userInfo);
      if (!parsed.email) {
        throw new Error('사용자 이메일을 찾을 수 없습니다');
      }
      return parsed.email;
    } catch {
      throw new Error('localStorage의 사용자 정보가 유효하지 않습니다');
    }
  }

  async createSession(): Promise<Session> {
    const userId = this.getUserId();

    const url = `${this.API_BASE}/sessions`;
    const body = {
      user_id: userId,
      state: {},
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`세션 생성 실패: ${response.status}`);
    }

    const data = await response.json();

    // 백엔드가 id를 반환하는 경우 Google Cloud 리소스 이름 구성
    const sessionId = data.output.id;
    const sessionName = sessionId
      ? gcpConfig.getSessionResourcePath(sessionId)
      : data.output.name;

    return {
      name: sessionName,
      displayName:
        data.output.displayName || `Session ${sessionId ? sessionId.slice(0, 8) : 'unknown'}`,
      state: data.output.sessionState || {},
      events: data.output.events || [],
      userId: data.output.userId,
      appName: data.output.appName,
      lastUpdateTime: data.output.lastUpdateTime,
      createdAt: data.output.createTime ? new Date(data.output.createTime) : new Date(),
      updatedAt: data.output.updateTime ? new Date(data.output.updateTime) : new Date(),
      isActive: data.output.isActive || true,
    };
  }

  async listSessions(
    pageToken?: string,
    pageSize: number = 20,
  ): Promise<{
    sessions: Session[];
    nextPageToken: string | null;
  }> {
    const userId = this.getUserId();
    const params = new URLSearchParams({
      user_id: userId,
      page_size: pageSize.toString(),
    });

    if (pageToken) {
      params.append('page_token', pageToken);
    }

    const url = `${this.API_BASE}/sessions?${params.toString()}`;

    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`세션 목록 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    const sessionsData = data.output?.sessions || [];
    const nextPageToken = data.output?.nextPageToken || null;

    const sessions = sessionsData.map((session: Record<string, unknown>) => ({
      name: session.name as string,
      displayName:
        (session.displayName as string) ||
        `Session ${session.name ? (session.name as string).split('/').pop()?.slice(0, 8) : 'unknown'}`,
      state: (session.sessionState as Record<string, unknown>) || {},
      events: (session.events as Event[]) || [],
      userId: session.userId as string,
      appName: session.appName as string,
      lastUpdateTime: session.lastUpdateTime as number,
      createdAt: session.createTime ? new Date(session.createTime as string) : new Date(),
      updatedAt: session.updateTime ? new Date(session.updateTime as string) : new Date(),
      isActive: (session.isActive as boolean) || true,
    }));

    return { sessions, nextPageToken };
  }

  async getSession(sessionId: string): Promise<Session> {
    const userId = this.getUserId();
    const operationId = SessionLogger.startOperation(sessionId, 'load');

    SessionLogger.debug('VertexAIService', `세션 ID로 getSession 시작: ${sessionId}`, { userId });

    const url = `${this.API_BASE}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        const errorMessage = `세션 조회 실패: ${response.status}`;
        SessionLogger.logSessionError(
          sessionId,
          new Error(errorMessage),
          'getSession-fetch',
          userId,
        );
        SessionLogger.endOperation(operationId, false, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const sessionData = data.output;

      SessionLogger.debug('VertexAIService', '원시 세션 데이터 수신됨', {
        sessionId,
        hasName: !!sessionData.name,
        hasDisplayName: !!sessionData.displayName,
        eventsCount: sessionData.events?.length || 0,
      });

      // 향상된 로깅과 함께 세션 이름 복구 로직
      let sessionName = sessionData.name;
      if (!sessionName || typeof sessionName !== 'string' || sessionName.trim() === '') {
        SessionLogger.warn('VertexAIService', '세션 이름이 누락되거나 유효하지 않음, 재구성 중', {
          sessionId,
          originalName: sessionName,
          userId,
        });

        sessionName = gcpConfig.getSessionResourcePath(sessionId);
        SessionLogger.info('VertexAIService', '세션 이름 재구성됨', {
          sessionId,
          reconstructedName: sessionName,
        });
      }

      // 로깅과 함께 표시 이름 생성 로직 개선
      let displayName = sessionData.displayName;
      if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
        // 더 나은 표시 이름을 위해 이름에서 세션 ID 추출 시도
        const extractedId = sessionName.split('/').pop();
        displayName =
          extractedId && extractedId !== 'unknown'
            ? `Session ${extractedId.slice(0, 8)}`
            : `Session ${sessionId.slice(0, 8)}`;

        SessionLogger.info('VertexAIService', '표시 이름 생성됨', {
          sessionId,
          generatedDisplayName: displayName,
          extractedId,
        });
      }

      // 로깅과 함께 중요한 세션 데이터 검증
      if (!sessionId || sessionId.trim() === '') {
        const error = new Error('세션 ID가 필요하지만 비어있거나 정의되지 않았습니다');
        SessionLogger.logSessionError(sessionId || 'empty', error, 'getSession-validation', userId);
        SessionLogger.endOperation(operationId, false, error.message);
        throw error;
      }

      // 세션 객체 생성
      const session: Session = {
        name: sessionName,
        displayName: displayName,
        state: sessionData.sessionState || {},
        events: sessionData.events || [],
        userId: sessionData.userId,
        appName: sessionData.appName,
        lastUpdateTime: sessionData.lastUpdateTime,
        createdAt: sessionData.createTime ? new Date(sessionData.createTime) : new Date(),
        updatedAt: sessionData.updateTime ? new Date(sessionData.updateTime) : new Date(),
        isActive: sessionData.isActive || true,
      };

      // SessionLogger를 통한 향상된 검증
      const validation = validateSession(session, 'getSession-final-validation');
      if (!validation.isValid) {
        SessionLogger.logSessionError(
          sessionId,
          new Error('세션 검증 실패'),
          'getSession-validation',
          userId,
        );
        SessionLogger.endOperation(
          operationId,
          false,
          `Validation failed: ${validation.errors.join(', ')}`,
        );

        // 실패하기 전에 세션 정리 시도
        const sanitizedSession = sanitizeSession(session, sessionId);
        if (sanitizedSession && checkSessionIntegrity(sanitizedSession)) {
          SessionLogger.info('VertexAIService', '정리를 통해 세션 복구됨', {
            sessionId,
          });
          SessionLogger.endOperation(operationId, true);
          SessionLogger.logSessionSnapshot(
            sessionId,
            sanitizedSession as unknown as Record<string, unknown>,
          );
          return sanitizedSession;
        }

        throw new Error(`Session validation failed: ${validation.errors.join(', ')}`);
      }

      // 최종 무결성 검사
      const finalSessionId = this.extractSessionId(session.name);
      if (!finalSessionId || finalSessionId !== sessionId) {
        const error = new Error(`세션 데이터 불일치: 예상 ${sessionId}, 실제 ${finalSessionId}`);
        SessionLogger.logSessionError(sessionId, error, 'getSession-id-mismatch', userId);
        SessionLogger.endOperation(operationId, false, error.message);
        throw error;
      }

      // 성공 로깅
      SessionLogger.endOperation(operationId, true);
      SessionLogger.info('VertexAIService', '세션이 성공적으로 로드되고 검증됨', {
        sessionId,
      });
      SessionLogger.logSessionSnapshot(sessionId, session as unknown as Record<string, unknown>);

      return session;
    } catch (error) {
      SessionLogger.logSessionError(sessionId, error, 'getSession', userId);
      SessionLogger.endOperation(
        operationId,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  // 내부 검증을 위한 세션 ID 추출 인스턴스 메서드 추가
  private extractSessionId(sessionName: string | undefined): string {
    return extractSessionId(sessionName);
  }

  async streamMessage(
    sessionId: string,
    message: string,
    appName: string,
    onToken: (content: string) => void,
    onToolCall: (name: string, args: Record<string, unknown>) => void,
    onToolResult: (name: string, response: Record<string, unknown>) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onAuthor?: (author: string, isPartial: boolean) => void,
  ): Promise<void> {
    const userId = this.getUserId();
    const payload = {
      appName: appName,
      user_id: userId,
      session_id: sessionId,
      new_message: { role: 'user', parts: [{ text: message }] },
      streaming: true, // 토큰 레벨 스트리밍
    };

    try {
      const response = await fetch(`${this.API_BASE_STREAM}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`스트리밍 실패: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // SSE 이벤트 처리 (\n\n로 구분됨)
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());

          if (!dataLines.length) continue;

          const dataStr = dataLines.join('\n');
          if (!dataStr || dataStr.trim() === '') {
            continue;
          }

          try {
            const eventObj = JSON.parse(dataStr);

            // Author 정보 처리 - 에이전트 활동 추적용
            if (onAuthor && eventObj.author && typeof eventObj.author === 'string') {
              const isPartial = eventObj.partial === true;
              onAuthor(eventObj.author, isPartial);
            }

            // partial이 false면 중복 메시지이므로 무시 (onComplete은 호출하지 않음)
            if (eventObj.partial === false) {
              continue; // 중복 메시지이므로 건너뛰고 다음 이벤트 처리 계속
            }

            const parts = eventObj?.content?.parts;
            if (Array.isArray(parts)) {
              for (const part of parts) {
                // 도구 호출 처리
                const fc = part.functionCall || part.function_call;
                if (fc && typeof fc.name === 'string') {
                  let argsObj = fc.args;
                  if (typeof argsObj === 'string') {
                    try {
                      argsObj = JSON.parse(argsObj);
                    } catch {
                      // 함수 호출 인수 파싱 실패
                    }
                  }
                  onToolCall(fc.name, argsObj || {});
                }

                // 도구 결과 처리
                const fr = part.functionResponse || part.function_response;
                if (fr && typeof fr.name === 'string') {
                  let respObj = fr.response;
                  if (typeof respObj === 'string') {
                    try {
                      respObj = JSON.parse(respObj);
                    } catch {
                      // 함수 응답 파싱 실패
                    }
                  }
                  onToolResult(fr.name, respObj || {});
                }

                // 텍스트 콘텐츠 처리
                if (typeof part.text === 'string') {
                  // partial이 true일 때만 스트리밍 업데이트 (중복 방지)
                  if (eventObj.partial === true) {
                    onToken(part.text);
                  }
                  // partial이 false이면 스트리밍 완료를 의미하므로 텍스트는 무시
                  // (이미 스트리밍으로 조립된 메시지와 중복되기 때문)
                }
              }
            }
          } catch {
            // JSON 파싱 실패 시 스트림 계속 진행
            continue;
          }
        }
      }

      onComplete(); // 스트림 완료 시 onComplete() 호출 (타이핑 표시기 정상 동작)
    } catch (error) {
      onError(error instanceof Error ? error : new Error('스트리밍 실패'));
    }
  }
  async updateSession(sessionId: string, displayName: string): Promise<void> {
    const userId = this.getUserId();
    const url = `${this.API_BASE}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`;
    const body = {
      displayName: displayName,
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`세션 업데이트 실패: ${response.status}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const userId = this.getUserId();
    const url = `${this.API_BASE}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`;

    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`세션 삭제 실패: ${response.status}`);
    }
  }
}

export const vertexAIService = new VertexAIService();
export type { Event, Session };
