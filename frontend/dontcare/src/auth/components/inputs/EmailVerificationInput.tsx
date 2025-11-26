import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { FieldError } from 'react-hook-form';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

const DEFAULT_TEXTS = {
  LABEL: '이메일 인증번호',
  PLACEHOLDER: 'OTP를 입력해주세요',
} as const;

interface EmailVerificationInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  error?: FieldError | undefined;
  label?: string;
  placeholder?: string;
  description?: string | string[];
  persistentDescription?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  descriptionClassName?: string;
  containerClassName?: string;
  type?: 'text';
}

export const EmailVerificationInput = forwardRef<HTMLInputElement, EmailVerificationInputProps>(
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
      ...props
    },
    ref,
  ) => {
    const describedBy = [
      description && !error ? `${props.id}-description` : null,
      error ? `${props.id}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`space-y-2 ${containerClassName || ''}`}>
        <Label htmlFor={props.id} className={`font-medium text-white ${labelClassName || ''}`}>
          {label}
        </Label>
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          aria-describedby={describedBy || undefined}
          className={cn(
            'border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20',
            inputClassName,
          )}
          {...props}
        />
        <div className="space-y-1">
          {/* description - 항상 표시 (persistentDescription이 true인 경우) */}
          {description && (persistentDescription || !error) && (
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
          {/* 에러메시지 영역 - 미리 확보 */}
          <div className="min-h-[1.25rem]">
            {error && (
              <p className={`text-sm text-red-400 ${errorClassName || ''}`}>{error.message}</p>
            )}
          </div>
        </div>
      </div>
    );
  },
);

EmailVerificationInput.displayName = 'EmailVerificationInput';
