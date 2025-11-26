import { forwardRef, useId, type ComponentPropsWithoutRef, type InputHTMLAttributes } from 'react';
import type { FieldError } from 'react-hook-form';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface BaseInputProps extends ComponentPropsWithoutRef<'input'> {
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
}

export const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(
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
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
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
      <div className={cn('space-y-1.5', containerClassName, className)}>
        {label && (
          <Label
            htmlFor={id}
            className={cn('pl-1 text-sm font-semibold text-foreground', labelClassName)}
          >
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          {...props}
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          aria-describedby={mergedDescribedBy}
          aria-errormessage={error?.message ? errorId : undefined}
          className={cn('placeholder:text-xs placeholder:text-muted-foreground/70', inputClassName)}
        />
        <div className="min-h-[1rem] space-y-1 pl-1">
          {description && (persistentDescription || !error?.message) && (
            <div id={descriptionId} className={cn('space-y-1', descriptionClassName)}>
              {Array.isArray(description) ? (
                <ul className="space-y-0.5">
                  {description.map((item, index) => (
                    <li
                      key={index}
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
            role={error?.message ? 'alert' : undefined}
            aria-live={error?.message ? 'assertive' : undefined}
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

BaseInput.displayName = 'BaseInput';
