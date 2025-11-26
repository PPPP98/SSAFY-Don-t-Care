import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
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
import { Button } from '@/shared/components/ui/button';
import { EmailInputWithButton } from '@/auth/components/buttons/EmailInputWithButton';
import { EmailVerificationInputWithButton } from '@/auth/components/buttons/EmailVerificationInputWithButton';
import { PasswordInput } from '@/auth/components/inputs/PasswordInput';
import { ConfirmPasswordInput } from '@/auth/components/inputs/ConfirmPasswordInput';
import { useFormField } from '@/shared/hooks/useFormField';
import { env } from '@/env';
import {
  passwordResetStep1Schema,
  passwordResetStep2Schema,
  type PasswordResetStep1Values,
  type PasswordResetStep2Values,
} from '@/auth/schemas/auth.schemas';
import {
  requestPasswordResetOtpApi,
  verifyPasswordResetOtpApi,
  completePasswordResetApi,
} from '@/auth/services/authApi';
import type { ApiError } from '@/auth/types/auth.api.types';

const UI_TEXTS = {
  TITLE: '비밀번호 재설정',
  DESCRIPTION_STEP1: '이메일 인증을 통해 본인 확인을 진행해주세요.',
  DESCRIPTION_STEP2: '새로운 비밀번호를 입력해주세요.',
  SEND_OTP: '인증번호 발송',
  RESEND_OTP: '재발송',
  VERIFY_OTP: '인증',
  PASSWORD_RESET_BUTTON: '비밀번호 재설정',
  BACK_TO_PREVIOUS_STEP_BUTTON: '이전 단계로',
  PASSWORD_RESET_PROGRESS_ARIA_LABEL: '비밀번호 재설정 진행 상황: {currentStep}단계 중 2단계',
  REMEMBER_PASSWORD_TEXT: '비밀번호를 기억하시나요?',
  LOGIN_LINK: '로그인',
  LOGIN_PAGE_LINK_ARIA_LABEL: '로그인 페이지로 이동',
  RESTART_MODAL_TITLE: '인증 시도 횟수 초과',
  RESTART_MODAL_MESSAGE: '인증번호 검증을 5회 실패했습니다.\n처음부터 다시 시작해주세요.',
  RESTART_BUTTON: '다시 시작하기',
} as const;

type CurrentStep = 1 | 2;

export const PasswordResetForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CurrentStep>(1);

  // OTP 관련 상태 관리
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<
    'none' | 'requested' | 'verified'
  >('none');
  const [resendCount, setResendCount] = useState(0);
  const [otpVerificationAttempts, setOtpVerificationAttempts] = useState(0);
  const [isEmailOtpLoading, setIsEmailOtpLoading] = useState(false);
  const [isOtpVerifyLoading, setIsOtpVerifyLoading] = useState(false);
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // 성공 메시지 상태 관리
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('');
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [showOtpSuccess, setShowOtpSuccess] = useState(false);

  const step1Form = useForm<PasswordResetStep1Values>({
    resolver: zodResolver(passwordResetStep1Schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'firstError',
    shouldFocusError: true,
    delayError: env.VITE_FORM_ERROR_DELAY,
    defaultValues: {
      email: '',
      emailVerification: '',
    },
  });

  const step2Form = useForm<PasswordResetStep2Values>({
    resolver: zodResolver(passwordResetStep2Schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'firstError',
    shouldFocusError: true,
    delayError: env.VITE_FORM_ERROR_DELAY,
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const {
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = step1Form;

  // 폼 필드 설정
  const emailField = useFormField('email', control, errors.email);
  const emailVerificationField = useFormField(
    'emailVerification',
    control,
    errors.emailVerification,
  );

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
      await requestPasswordResetOtpApi({ email: currentEmail });
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
      await verifyPasswordResetOtpApi({
        email: currentEmail,
        code: currentEmailVerification,
      });

      // 성공 메시지 표시
      setOtpSuccessMessage('인증 완료했습니다!');
      setShowOtpSuccess(true);

      // 0.5초 후 다음 단계로
      setTimeout(() => {
        setEmailVerificationStatus('verified');
        setOtpVerificationAttempts(0);
        setShowOtpSuccess(false);
        setCurrentStep(2);
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

  const handleStep1Submit = (): void => {
    // 1단계는 OTP 검증으로 처리되므로 여기서는 아무것도 하지 않음
  };

  const handleStep2Submit = async (data: PasswordResetStep2Values): Promise<void> => {
    if (emailVerificationStatus !== 'verified') return;

    setIsPasswordResetLoading(true);

    try {
      await completePasswordResetApi({
        email: currentEmail,
        new_password1: data.password,
        new_password2: data.confirmPassword,
      });

      // 비밀번호 재설정 성공 시 성공 플래그와 함께 로그인 페이지로 이동
      navigate('/login?password-reset=success');
    } catch (error) {
      const apiError = error as ApiError;
      step2Form.setError('root', { message: apiError.message });
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  // 재시작 모달 핸들러
  const handleRestart = (): void => {
    window.location.reload();
  };

  return (
    <Card className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-soft-2xl backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="gradient-text text-glow text-center text-4xl font-bold">
          {UI_TEXTS.TITLE}
        </CardTitle>
        <CardDescription className="text-center text-white/80">
          {currentStep === 1 ? UI_TEXTS.DESCRIPTION_STEP1 : UI_TEXTS.DESCRIPTION_STEP2}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 단계 표시기 */}
        <div
          className="flex items-center justify-center space-x-2"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label={UI_TEXTS.PASSWORD_RESET_PROGRESS_ARIA_LABEL.replace(
            '{currentStep}',
            currentStep.toString(),
          )}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              currentStep >= 1
                ? 'border border-white/30 bg-white/20 text-white'
                : 'border border-white/10 bg-white/5 text-white/50'
            }`}
            aria-current={currentStep === 1 ? 'step' : undefined}
          >
            1
          </div>
          <div
            className={`h-1 w-8 transition-colors ${currentStep >= 2 ? 'bg-white/30' : 'bg-white/10'}`}
            aria-hidden="true"
          />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              currentStep >= 2
                ? 'border border-white/30 bg-white/20 text-white'
                : 'border border-white/10 bg-white/5 text-white/50'
            }`}
            aria-current={currentStep === 2 ? 'step' : undefined}
          >
            2
          </div>
        </div>

        {/* 1단계: 이메일 인증 */}
        {currentStep === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-1">
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
          </form>
        )}

        {/* 2단계: 새 비밀번호 설정 */}
        {currentStep === 2 && (
          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
            <Controller
              name="password"
              control={step2Form.control}
              render={({ field }) => (
                <PasswordInput {...field} error={step2Form.formState.errors.password} />
              )}
            />
            <Controller
              name="confirmPassword"
              control={step2Form.control}
              render={({ field }) => (
                <ConfirmPasswordInput
                  {...field}
                  error={step2Form.formState.errors.confirmPassword}
                />
              )}
            />

            {/* 에러 메시지 섹션 */}
            {step2Form.formState.errors.root && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-center text-sm text-red-400">
                  {step2Form.formState.errors.root.message}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                className="btn-cta-primary h-12 w-full rounded-full text-base"
                disabled={isPasswordResetLoading}
              >
                {isPasswordResetLoading ? '비밀번호 재설정 중...' : UI_TEXTS.PASSWORD_RESET_BUTTON}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-full border-white/20 bg-white/5 text-base text-white hover:bg-white/10"
                onClick={handleBackToStep1}
                disabled={isPasswordResetLoading}
              >
                {UI_TEXTS.BACK_TO_PREVIOUS_STEP_BUTTON}
              </Button>
            </div>
          </form>
        )}

        {/* 로그인 페이지로 돌아가기 링크 */}
        <div className="text-center">
          <p className="text-sm text-white/80">
            {UI_TEXTS.REMEMBER_PASSWORD_TEXT}{' '}
            <Link
              to="/login"
              className="font-medium text-white transition-colors hover:text-white/80"
              aria-label={UI_TEXTS.LOGIN_PAGE_LINK_ARIA_LABEL}
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
