import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from '@/auth/schemas/auth.schemas';
import { useLogin } from '@/auth/hooks/useLogin';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { EmailInput } from '@/auth/components/inputs/EmailInput';
import { PasswordInput } from '@/auth/components/inputs/PasswordInput';
import { env } from '@/env';

const UI_TEXTS = {
  TITLE: '로그인',
  DESCRIPTION: '계속하려면 로그인하세요.',
  BUTTON: '로그인',
  NO_ACCOUNT_TEXT: '계정이 없으신가요?',
  SIGNUP_LINK: '회원가입',
  FORGOT_PASSWORD_TEXT: '비밀번호를 잊으셨나요?',
  PASSWORD_RESET_LINK: '비밀번호 초기화',
} as const;

export function LoginForm() {
  const { mutate: login, isPending, isError, error } = useLogin();
  const location = useLocation();
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showPasswordResetMessage, setShowPasswordResetMessage] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onBlur',
    criteriaMode: 'firstError',
    shouldFocusError: true,
    delayError: env.VITE_FORM_ERROR_DELAY,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  // 회원가입 성공 후 환영 메시지 표시
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    // 회원가입 성공 메시지
    if (searchParams.get('signup') === 'success') {
      setShowWelcomeMessage(true);
      // 3초 후 환영 메시지 숨김
      const timer = setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 비밀번호 재설정 성공 메시지
    if (searchParams.get('password-reset') === 'success') {
      setShowPasswordResetMessage(true);
      // 3초 후 메시지 숨김
      const timer = setTimeout(() => {
        setShowPasswordResetMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [location.search]);

  const onSubmit = (data: LoginFormValues): void => {
    login(data);
  };

  return (
    <Card className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-soft-2xl backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="gradient-text text-glow text-center text-4xl">
          {UI_TEXTS.TITLE}
        </CardTitle>
        <CardDescription className="text-center text-white/80">
          {UI_TEXTS.DESCRIPTION}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 성공 메시지 섹션 */}
        {showWelcomeMessage && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <p className="text-center text-sm text-green-400">
              회원가입이 완료되었습니다! 로그인해주세요.
            </p>
          </div>
        )}

        {showPasswordResetMessage && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <p className="text-center text-sm text-green-400">
              비밀번호 재설정했습니다! 새 비밀번호로 로그인해주세요.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 입력 필드 섹션 */}
          <div className="space-y-1">
            <Controller
              name="email"
              control={control}
              render={({ field }) => <EmailInput {...field} error={errors.email} />}
            />
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordInput {...field} error={errors.password} showRequirements={false} />
              )}
            />
          </div>

          {/* 에러 메시지 섹션 */}
          {isError && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-center text-sm text-red-400">
                {error?.message || '로그인에 실패했습니다. 다시 시도해주세요.'}
              </p>
            </div>
          )}

          {/* 버튼 섹션 */}
          <div className="mt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="btn-cta-primary h-12 w-full rounded-full text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? '로그인 중...' : UI_TEXTS.BUTTON}
            </Button>
          </div>
        </form>
        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-white/80">
            {UI_TEXTS.NO_ACCOUNT_TEXT}{' '}
            <Link
              to="/signup"
              className="font-medium text-white transition-colors hover:text-white/80"
            >
              {UI_TEXTS.SIGNUP_LINK}
            </Link>
          </p>
          <p className="text-sm text-white/80">
            {UI_TEXTS.FORGOT_PASSWORD_TEXT}{' '}
            <Link
              to="/password-reset"
              className="font-medium text-white transition-colors hover:text-white/80"
            >
              {UI_TEXTS.PASSWORD_RESET_LINK}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
