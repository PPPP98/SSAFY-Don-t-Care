import { z } from 'zod';

// 에러 메시지 상수
const ERROR_MESSAGES = {
  // 이메일 관련
  EMAIL_INVALID: '유효한 이메일 주소를 입력해주세요.',
  EMAIL_REQUIRED: '이메일을 입력해주세요.',

  // 비밀번호 관련
  PASSWORD_REQUIRED: '비밀번호를 입력해주세요.',
  PASSWORD_INVALID: '비밀번호가 요구사항을 만족하지 않습니다.',

  // 이름 관련
  NAME_REQUIRED: '이름을 입력해주세요.',
  NAME_TOO_SHORT: '이름은 최소 2자 이상이어야 합니다.',
  NAME_TOO_LONG: '이름은 최대 50자까지 입력 가능합니다.',
  NAME_INVALID: '이름은 한글만 입력 가능합니다.',

  // 이메일 인증 관련
  EMAIL_VERIFICATION_REQUIRED: '이메일 인증번호를 입력해주세요.',
  EMAIL_VERIFICATION_INVALID: '인증번호는 6자리 숫자입니다.',

  // 비밀번호 확인 관련
  PASSWORD_CONFIRM_REQUIRED: '비밀번호 확인을 입력해주세요.',
  PASSWORD_CONFIRM_MISMATCH: '비밀번호가 일치하지 않습니다.',
} as const;

export const emailSchema = z.email({ message: ERROR_MESSAGES.EMAIL_INVALID });

// 비밀번호 복잡성 검증 패턴
const PASSWORD_PATTERNS = {
  LOWERCASE: /[a-z]/,
  // UPPERCASE: /[A-Z]/,
  DIGIT: /[0-9]/,
  // SPECIAL: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

export const passwordSchema = z
  .string()
  .min(6, { message: ERROR_MESSAGES.PASSWORD_INVALID })
  .refine((val) => PASSWORD_PATTERNS.LOWERCASE.test(val), {
    message: ERROR_MESSAGES.PASSWORD_INVALID,
  })
  // .refine((val) => PASSWORD_PATTERNS.UPPERCASE.test(val), {
  //   message: ERROR_MESSAGES.PASSWORD_INVALID,
  // })
  .refine((val) => PASSWORD_PATTERNS.DIGIT.test(val), {
    message: ERROR_MESSAGES.PASSWORD_INVALID,
  });
// .refine((val) => PASSWORD_PATTERNS.SPECIAL.test(val), {
//   message: ERROR_MESSAGES.PASSWORD_INVALID,
// });

// 로그인용 비밀번호 검증 (최소한의 검증)
export const passwordLoginSchema = z.string().min(1, { message: ERROR_MESSAGES.PASSWORD_REQUIRED });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordLoginSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// 회원가입용 스키마들
export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: ERROR_MESSAGES.NAME_REQUIRED })
  .min(2, { message: ERROR_MESSAGES.NAME_TOO_SHORT })
  .max(50, { message: ERROR_MESSAGES.NAME_TOO_LONG })
  .regex(/^[가-힣\s]+$/, { message: ERROR_MESSAGES.NAME_INVALID });

export const emailVerificationSchema = z
  .string()
  .trim()
  .min(1, { message: ERROR_MESSAGES.EMAIL_VERIFICATION_REQUIRED })
  .regex(/^\d{6}$/, { message: ERROR_MESSAGES.EMAIL_VERIFICATION_INVALID });

export const confirmPasswordSchema = z
  .string()
  .min(1, { message: ERROR_MESSAGES.PASSWORD_CONFIRM_REQUIRED });

export const signupSchema = z
  .object({
    email: emailSchema,
    emailVerification: emailVerificationSchema,
    name: nameSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ERROR_MESSAGES.PASSWORD_CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

// 비밀번호 재설정 폼 스키마들
export const passwordResetStep1Schema = z.object({
  email: emailSchema,
  emailVerification: emailVerificationSchema,
});

export const passwordResetStep2Schema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ERROR_MESSAGES.PASSWORD_CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export const passwordResetSchema = z
  .object({
    email: emailSchema,
    emailVerification: emailVerificationSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ERROR_MESSAGES.PASSWORD_CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export type PasswordResetStep1Values = z.infer<typeof passwordResetStep1Schema>;
export type PasswordResetStep2Values = z.infer<typeof passwordResetStep2Schema>;
export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;
