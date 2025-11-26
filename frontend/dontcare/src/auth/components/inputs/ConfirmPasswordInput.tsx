import { forwardRef, type ComponentPropsWithoutRef, useId } from 'react';
import type { FieldError } from 'react-hook-form';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';

const DEFAULT_TEXTS = {
  LABEL: '비밀번호 확인',
  PLACEHOLDER: '비밀번호를 다시 입력하세요',
} as const;

interface ConfirmPasswordInputProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'autoComplete' | 'className'> {
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
}

export const ConfirmPasswordInput = forwardRef<HTMLInputElement, ConfirmPasswordInputProps>(
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
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const uid = useId();
    const inputId = id ?? uid;
    const showDescription = Boolean(description) && (persistentDescription || !error);
    const descriptionId = showDescription ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
    return (
      <div className={`space-y-2 ${containerClassName || ''} ${className || ''}`}>
        <Label htmlFor={inputId} className={`font-medium text-white ${labelClassName || ''}`}>
          {label}
        </Label>
        <Input
          ref={ref}
          type="password"
          autoComplete="new-password"
          placeholder={placeholder}
          {...props}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20 ${inputClassName || ''}`}
        />
        <div className="space-y-1">
          {/* description - 항상 표시 (persistentDescription이 true인 경우) */}
          {showDescription && (
            <div
              id={descriptionId}
              className={`text-sm text-white/80 ${descriptionClassName || ''}`}
            >
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
              <p
                id={errorId}
                role="alert"
                aria-live="polite"
                className={`text-sm text-red-400 ${errorClassName || ''}`}
              >
                {error.message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  },
);

ConfirmPasswordInput.displayName = 'ConfirmPasswordInput';
