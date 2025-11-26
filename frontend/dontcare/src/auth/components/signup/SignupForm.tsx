import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { signupSchema, type SignupFormValues } from '@/auth/schemas/auth.schemas';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { EmailInputWithButton } from '@/auth/components/buttons/EmailInputWithButton';
import { EmailVerificationInputWithButton } from '@/auth/components/buttons/EmailVerificationInputWithButton';
import { NameInput } from '@/auth/components/inputs/NameInput';
import { PasswordInput } from '@/auth/components/inputs/PasswordInput';
import { ConfirmPasswordInput } from '@/auth/components/inputs/ConfirmPasswordInput';
import { useFormField } from '@/shared/hooks/useFormField';
import { env } from '@/env';
import {
  requestSignupEmailOtpApi,
  verifySignupOtpApi,
  completeSignupApi,
} from '@/auth/services/authApi';
import type { ApiError } from '@/auth/types/auth.api.types';

const UI_TEXTS = {
  TITLE: '회원가입',
  DESCRIPTION: '계정을 생성하여 서비스를 이용해보세요',
  BUTTON: '회원가입',
  HAVE_ACCOUNT_TEXT: '이미 계정이 있으신가요?',
  LOGIN_LINK: '로그인',
  SEND_OTP: '인증번호 발송',
  RESEND_OTP: '재발송',
  VERIFY_OTP: '인증',
  RESTART_MODAL_TITLE: '인증 시도 횟수 초과',
  RESTART_MODAL_MESSAGE: '인증번호 검증을 5회 실패했습니다.\n처음부터 다시 시작해주세요.',
  RESTART_BUTTON: '다시 시작하기',
} as const;

export const SignupForm = () => {
  const navigate = useNavigate();

  // OTP 관련 상태 관리
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<
    'none' | 'requested' | 'verified'
  >('none');
  const [resendCount, setResendCount] = useState(0);
  const [otpVerificationAttempts, setOtpVerificationAttempts] = useState(0);
  const [isEmailOtpLoading, setIsEmailOtpLoading] = useState(false);
  const [isOtpVerifyLoading, setIsOtpVerifyLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // 성공 메시지 상태 관리
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('');
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [showOtpSuccess, setShowOtpSuccess] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'firstError',
    shouldFocusError: true,
    delayError: env.VITE_FORM_ERROR_DELAY,
    defaultValues: {
      email: '',
      emailVerification: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const {
    handleSubmit,
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  // 폼 필드 설정
  const emailField = useFormField('email', control, errors.email);
  const emailVerificationField = useFormField(
    'emailVerification',
    control,
    errors.emailVerification,
  );
  const nameField = useFormField('name', control, errors.name);
  const passwordField = useFormField('password', control, errors.password);
  const confirmPasswordField = useFormField('confirmPassword', control, errors.confirmPassword);

  // 현재 입력값 감시
  const currentEmail = watch('email');
  const currentEmailVerification = watch('emailVerification');

  // 이메일 유효성 검사
  const isEmailValid = currentEmail && !errors.email;

  // 인증번호 유효성 검사 (6자리)
  const isOtpValid =
    currentEmailVerification && currentEmailVerification.length === 6 && !errors.emailVerification;

  // 이메일 OTP 발송/재발송 핸들러
  const handleSendOtp = async (): Promise<void> => {
    if (!isEmailValid || resendCount >= 5 || emailVerificationStatus === 'verified') return;

    setIsEmailOtpLoading(true);
    clearErrors('email');
    setShowEmailSuccess(false);

    try {
      await requestSignupEmailOtpApi({ email: currentEmail });
      setEmailVerificationStatus('requested');
      setResendCount((prev) => prev + 1);

      // 성공 메시지 표시
      setEmailSuccessMessage('메일을 발송했습니다!');
      setShowEmailSuccess(true);
    } catch (error) {
      const apiError = error as ApiError;
      setError('email', { message: apiError.message });
      setShowEmailSuccess(false);
    } finally {
      setIsEmailOtpLoading(false);
    }
  };

  // OTP 검증 핸들러
  const handleVerifyOtp = async (): Promise<void> => {
    if (!isOtpValid || otpVerificationAttempts >= 5) return;

    setIsOtpVerifyLoading(true);
    clearErrors('emailVerification');
    setShowOtpSuccess(false);

    try {
      await verifySignupOtpApi({
        email: currentEmail,
        code: currentEmailVerification,
      });

      // 성공 메시지 표시
      setOtpSuccessMessage('인증 완료했습니다!');
      setShowOtpSuccess(true);

      // 0.5초 후 입력창 숨김
      setTimeout(() => {
        setEmailVerificationStatus('verified');
        setOtpVerificationAttempts(0);
        setShowOtpSuccess(false);
      }, 500);
    } catch (error) {
      const nextAttempts = otpVerificationAttempts + 1;
      setOtpVerificationAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        setShowRestartModal(true);
      } else {
        const apiError = error as ApiError;
        setError('emailVerification', { message: apiError.message });
      }
      setShowOtpSuccess(false);
    } finally {
      setIsOtpVerifyLoading(false);
    }
  };

  // 회원가입 완료 핸들러
  const onSubmit = async (data: SignupFormValues): Promise<void> => {
    if (emailVerificationStatus !== 'verified') return;

    setIsSignupLoading(true);

    try {
      await completeSignupApi({
        email: data.email,
        name: data.name,
        password1: data.password,
        password2: data.confirmPassword,
      });

      // 회원가입 성공 시 성공 플래그와 함께 로그인 페이지로 이동
      navigate('/login?signup=success');
    } catch (error) {
      const apiError = error as ApiError;
      setError('root', { message: apiError.message });
    } finally {
      setIsSignupLoading(false);
    }
  };

  // 재시작 모달 핸들러
  const handleRestart = (): void => {
    window.location.reload();
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
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 입력 필드 섹션 */}
          <div className="space-y-1">
            <Controller
              {...emailField.controllerProps}
              render={({ field }) => (
                <EmailInputWithButton
                  {...field}
                  error={emailField.error}
                  buttonText={
                    emailVerificationStatus === 'none' ? UI_TEXTS.SEND_OTP : UI_TEXTS.RESEND_OTP
                  }
                  buttonLoading={isEmailOtpLoading}
                  buttonDisabled={
                    !isEmailValid || resendCount >= 5 || emailVerificationStatus === 'verified'
                  }
                  onButtonClick={handleSendOtp}
                  successMessage={emailSuccessMessage}
                  showSuccessMessage={showEmailSuccess}
                />
              )}
            />
            <Controller
              {...emailVerificationField.controllerProps}
              render={({ field }) => (
                <EmailVerificationInputWithButton
                  {...field}
                  error={emailVerificationField.error}
                  buttonText={UI_TEXTS.VERIFY_OTP}
                  buttonLoading={isOtpVerifyLoading}
                  buttonDisabled={!isOtpValid || otpVerificationAttempts >= 5}
                  onButtonClick={handleVerifyOtp}
                  show={emailVerificationStatus === 'requested'}
                  successMessage={otpSuccessMessage}
                  showSuccessMessage={showOtpSuccess}
                />
              )}
            />
            <Controller
              {...nameField.controllerProps}
              render={({ field }) => <NameInput {...field} error={nameField.error} />}
            />
            <Controller
              {...passwordField.controllerProps}
              render={({ field }) => <PasswordInput {...field} error={passwordField.error} />}
            />
            <Controller
              {...confirmPasswordField.controllerProps}
              render={({ field }) => (
                <ConfirmPasswordInput {...field} error={confirmPasswordField.error} />
              )}
            />
          </div>

          {/* 회원가입 버튼 */}
          <div className="mt-6">
            <Button
              type="submit"
              className="btn-cta-primary h-12 w-full rounded-full text-base"
              disabled={emailVerificationStatus !== 'verified' || isSignupLoading}
            >
              {isSignupLoading ? '회원가입 중...' : UI_TEXTS.BUTTON}
            </Button>
          </div>
        </form>

        {/* 로그인 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/80">
            {UI_TEXTS.HAVE_ACCOUNT_TEXT}{' '}
            <Link
              to="/login"
              className="font-medium text-white transition-colors hover:text-white/80"
            >
              {UI_TEXTS.LOGIN_LINK}
            </Link>
          </p>
        </div>

        {/* 재시작 모달 */}
        <Dialog
          open={showRestartModal}
          onOpenChange={(open) => {
            // 5회 실패 모달은 바깥 클릭으로 닫히지 않도록 방지
            if (!open) return;
            setShowRestartModal(open);
          }}
        >
          <DialogContent className="border border-white/10 bg-white/5 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-white">{UI_TEXTS.RESTART_MODAL_TITLE}</DialogTitle>
              <DialogDescription className="whitespace-pre-line text-white/80">
                {UI_TEXTS.RESTART_MODAL_MESSAGE}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleRestart} className="btn-cta-primary w-full">
                {UI_TEXTS.RESTART_BUTTON}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
