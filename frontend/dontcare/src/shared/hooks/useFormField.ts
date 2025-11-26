import { type Control, type FieldPath, type FieldValues, type FieldError } from 'react-hook-form';

/**
 * React Hook Form의 Controller 사용을 단순화하는 커스텀 훅
 *
 * @param name - 폼 필드 이름
 * @param control - React Hook Form의 control 객체
 * @param error - 필드 에러 객체
 * @returns Controller에 전달할 props와 error
 *
 * @example
 * ```tsx
 * const { controllerProps, error } = useFormField('email', control, errors.email);
 *
 * <Controller
 *   {...controllerProps}
 *   render={({ field }) => <EmailInput {...field} error={error} />}
 * />
 * ```
 */
export const useFormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  name: TName,
  control: Control<TFieldValues>,
  error?: FieldError,
) => {
  return {
    controllerProps: {
      name,
      control,
    },
    error,
  };
};
