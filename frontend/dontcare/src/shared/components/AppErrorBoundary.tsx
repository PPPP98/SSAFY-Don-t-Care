import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

/**
 * AppErrorBoundary 컴포넌트
 *
 * 애플리케이션 레벨에서 발생하는 에러를 처리하는 ErrorBoundary입니다.
 * 라우트 로딩 실패, 컴포넌트 렌더링 에러 등을 graceful하게 처리합니다.
 *
 * ## 주요 역할
 * - lazy loading 중 발생하는 import 실패 처리
 * - 라우트 컴포넌트에서 발생하는 JavaScript 에러 catch
 * - 사용자에게 친화적인 에러 UI 제공
 * - 페이지 새로고침을 통한 복구 기능 제공
 *
 * ## 사용 사례
 * - React Router의 상위 라우트에서 errorElement로 사용
 * - 네트워크 문제로 인한 chunk 로딩 실패 처리
 * - 컴포넌트 import 실패 시 fallback UI 제공
 *
 * ## 주의사항
 * - 이벤트 핸들러, 비동기 코드, 서버 사이드 렌더링 에러는 catch하지 못함
 * - Error Boundary는 클래스 컴포넌트로만 구현 가능
 * - 상위 레벨에서 일괄적인 에러 처리를 위해 사용
 */

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
}

interface AppErrorBoundaryProps {
  /** 에러를 catch할 자식 컴포넌트들 */
  children?: ReactNode;
  /** 에러 발생 시 표시할 커스텀 fallback UI (기본 에러 UI 대신 사용) */
  fallback?: ReactNode;
  /** 에러 발생 시 호출될 콜백 함수 (에러 리포팅 서비스 연동용) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, error: toError(error) };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const normalized = toError(error);

    // 외부 에러 리포팅 서비스에 전송 (예: Sentry)
    this.props.onError?.(normalized, errorInfo);

    // 에러 정보를 state에 저장
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isImportError =
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Loading CSS chunk') ||
        this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="mx-auto w-full max-w-md" role="alert" aria-live="assertive">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">
                {isImportError ? '페이지를 불러올 수 없습니다' : '오류가 발생했습니다'}
              </CardTitle>
              <CardDescription>
                {isImportError
                  ? '네트워크 연결을 확인하고 페이지를 새로고침해주세요.'
                  : '예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button type="button" onClick={this.handleRetry} className="w-full">
                  다시 시도
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="w-full"
                >
                  페이지 새로고침
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
