import { forwardRef, useId, type ComponentPropsWithoutRef, type InputHTMLAttributes } from 'react';
import type { FieldError } from 'react-hook-form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface BaseInputWithButtonProps extends ComponentPropsWithoutRef<'input'> {
  error?: FieldError;
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
  type?: 'email' | 'text' | 'password';
  buttonText: string;
  buttonLoading?: boolean;
  buttonDisabled?: boolean;
  onButtonClick: () => void;
  show?: boolean;
}

export const BaseInputWithButton = forwardRef<HTMLInputElement, BaseInputWithButtonProps>(
  (
    {
      error,
      id: idProp,
      label,
      placeholder,
      description,
      persistentDescription = false,
      className,
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
      type = 'text',
      inputMode,
      autoComplete,
      maxLength,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp ?? `input-${autoId}`;
    const errorId = `${id}-error`;
    const descriptionId = `${id}-description`;
    const userAriaDescribedBy = (props as InputHTMLAttributes<HTMLInputElement>)[
      'aria-describedby'
    ];
    const mergedDescribedBy =
      [
        userAriaDescribedBy,
        description ? descriptionId : undefined,
        error?.message ? errorId : undefined,
      ]
        .filter(Boolean)
        .join(' ') || undefined;
    const userAriaInvalid = (props as InputHTMLAttributes<HTMLInputElement>)['aria-invalid'];
    const ariaInvalid = error ? true : userAriaInvalid;

    return (
      <div
        className={cn(
          'space-y-1.5',
          show ? 'opacity-100' : 'max-h-0 opacity-0',
          'overflow-hidden transition-all duration-300 ease-in-out',
          containerClassName,
          className,
        )}
      >
        {label && (
          <Label
            htmlFor={id}
            className={cn('pl-1 text-sm font-semibold text-foreground', labelClassName)}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            ref={ref}
            aria-invalid={ariaInvalid}
            aria-describedby={mergedDescribedBy}
            aria-errormessage={error?.message ? errorId : undefined}
            className={cn(
              'pr-20 placeholder:text-xs placeholder:text-muted-foreground/70',
              inputClassName,
            )}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            {...props}
          />
          <Button
            type="button"
            size="sm"
            disabled={buttonDisabled || buttonLoading}
            onClick={onButtonClick}
            className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-3 text-xs"
          >
            {buttonLoading ? 'Loading...' : buttonText}
          </Button>
        </div>
        <div className="min-h-[1rem] space-y-1 pl-1">
          {description && (persistentDescription || !error?.message) && (
            <div id={descriptionId} className={cn('space-y-1', descriptionClassName)}>
              {Array.isArray(description) ? (
                <ul className="space-y-0.5">
                  {description.map((item, index) => (
                    <li
                      key={`${id}-desc-${index}-${item}`}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="flex h-1.5 w-1.5 items-center justify-center">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className={cn(
              'text-sm font-medium text-destructive transition-opacity duration-200',
              error?.message ? 'opacity-100' : 'opacity-0',
              errorClassName,
            )}
          >
            {error?.message || '\u00A0'}
          </p>
        </div>
      </div>
    );
  },
);

BaseInputWithButton.displayName = 'BaseInputWithButton';
