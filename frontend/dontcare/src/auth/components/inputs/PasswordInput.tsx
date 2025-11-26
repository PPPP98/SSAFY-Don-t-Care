import { forwardRef, type ComponentPropsWithoutRef, useId } from 'react';
import type { FieldError } from 'react-hook-form';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';

const DEFAULT_TEXTS = {
  LABEL: '비밀번호',
  PLACEHOLDER: '비밀번호를 입력하세요',
  REQUIREMENTS: ['최소 15자 이상', '대소문자, 숫자, 특수문자 조합'],
} as const;

interface PasswordInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'className'> {
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
  type?: 'password';
  showRequirements?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label = DEFAULT_TEXTS.LABEL,
      placeholder = DEFAULT_TEXTS.PLACEHOLDER,
      showRequirements = true,
      error,
      description,
      labelClassName,
      inputClassName,
      errorClassName,
      descriptionClassName,
      containerClassName,
      className,
      ...props
    },
    ref,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type: _ignoredType, ...rest } = props;
    // _ignoredType은 의도적으로 무시됨 (type prop을 password로 고정하기 위해)

    const autoId = useId();
    const inputId = props.id ?? autoId;
    const displayDescription = showRequirements ? [...DEFAULT_TEXTS.REQUIREMENTS] : description;
    const describedBy =
      [displayDescription ? `${inputId}-desc` : null, error ? `${inputId}-err` : null]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className={`space-y-2 ${containerClassName || ''} ${className || ''}`}>
        <Label htmlFor={inputId} className={`font-medium text-white ${labelClassName || ''}`}>
          {label}
        </Label>
        <Input
          ref={ref}
          type="password"
          id={inputId}
          placeholder={placeholder}
          className={`border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20 ${inputClassName || ''}`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...rest}
        />
        <div className="space-y-1">
          {/* 비밀번호 조건 - 항상 표시 */}
          {displayDescription && (
            <div
              id={`${inputId}-desc`}
              className={`text-sm text-white/80 ${descriptionClassName || ''}`}
            >
              {Array.isArray(displayDescription) ? (
                <ul className="list-inside list-disc space-y-1">
                  {displayDescription.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{displayDescription}</p>
              )}
            </div>
          )}
          {/* 에러메시지 영역 - 미리 확보 */}
          <div className="min-h-[1.25rem]">
            {error && (
              <p
                id={`${inputId}-err`}
                role="alert"
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

PasswordInput.displayName = 'PasswordInput';
