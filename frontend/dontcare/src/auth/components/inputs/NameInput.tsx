import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { FieldError } from 'react-hook-form';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

const DEFAULT_TEXTS = {
  LABEL: '이름',
  PLACEHOLDER: '홍길동',
} as const;

interface NameInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
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

export const NameInput = forwardRef<HTMLInputElement, NameInputProps>(
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
    return (
      <div className={cn('space-y-2', containerClassName)}>
        <Label htmlFor={props.id} className={cn('font-medium text-white', labelClassName)}>
          {label}
        </Label>
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          autoComplete="name"
          className={cn(
            'border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20',
            inputClassName,
          )}
          {...props}
        />
        <div className="space-y-1">
          {/* description - 항상 표시 (persistentDescription이 true인 경우) */}
          {description && (persistentDescription || !error) && (
            <div className={cn('text-sm text-white/80', descriptionClassName)}>
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
            {error && <p className={cn('text-sm text-red-400', errorClassName)}>{error.message}</p>}
          </div>
        </div>
      </div>
    );
  },
);

NameInput.displayName = 'NameInput';
