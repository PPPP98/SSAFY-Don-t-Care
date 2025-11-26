import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { FieldError } from 'react-hook-form';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { LoadingSpinner } from '@/shared/components/ui/loading-spinner';

const DEFAULT_TEXTS = {
  LABEL: '이메일 인증번호',
  PLACEHOLDER: 'OTP를 입력해주세요',
} as const;

interface EmailVerificationInputWithButtonProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'className'> {
  error?: FieldError | undefined;
  label?: string;
  placeholder?: string;
  description?: string | string[];
  persistentDescription?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  descriptionClassName?: string;
  containerClassName?: string;
  buttonText: string;
  buttonLoading?: boolean;
  buttonDisabled?: boolean;
  onButtonClick: () => void;
  show?: boolean;
  successMessage?: string;
  showSuccessMessage?: boolean;
}

export const EmailVerificationInputWithButton = forwardRef<
  HTMLInputElement,
  EmailVerificationInputWithButtonProps
>(
  (
    {
      label = DEFAULT_TEXTS.LABEL,
      placeholder = DEFAULT_TEXTS.PLACEHOLDER,
      error,
      description,
      persistentDescription,
      labelClassName,
      inputClassName,
      errorClassName,
      descriptionClassName,
      containerClassName,
      buttonText,
      buttonLoading = false,
      buttonDisabled = false,
      onButtonClick,
      show = true,
      successMessage,
      showSuccessMessage = false,
      ...props
    },
    ref,
  ) => {
    if (!show) return null;

    return (
      <div className={`space-y-2 ${containerClassName || ''}`}>
        <Label htmlFor={props.id} className={`font-medium text-white ${labelClassName || ''}`}>
          {label}
        </Label>
        <div className="flex gap-2">
          <Input
            ref={ref}
            {...props}
            type="text"
            placeholder={placeholder}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            className={`flex-1 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20 ${inputClassName || ''}`}
          />
          <Button
            onClick={onButtonClick}
            disabled={buttonDisabled || buttonLoading}
            className="btn-cta-primary whitespace-nowrap px-4 py-2 text-sm"
          >
            {buttonLoading ? <LoadingSpinner size="sm" /> : buttonText}
          </Button>
        </div>
        <div className="min-h-[1rem] space-y-1">
          {showSuccessMessage && successMessage && (
            <p className={`text-sm text-green-400 ${errorClassName || ''}`}>{successMessage}</p>
          )}
          {error && !showSuccessMessage && (
            <p className={`text-sm text-red-400 ${errorClassName || ''}`}>{error.message}</p>
          )}
          {description && (persistentDescription || (!error && !showSuccessMessage)) && (
            <div className={`text-sm text-white/80 ${descriptionClassName || ''}`}>
              {Array.isArray(description) ? (
                <ul className="list-inside list-disc space-y-1">
                  {description.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{description}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

EmailVerificationInputWithButton.displayName = 'EmailVerificationInputWithButton';
