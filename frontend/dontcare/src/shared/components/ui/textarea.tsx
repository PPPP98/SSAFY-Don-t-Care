// src/shared/components/ui/textarea.tsx
// named export만 사용, React.FC 금지

import * as React from 'react';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      // shadcn 스타일 + 프로젝트 토큰 적용
      className={[
        'min-h-[80px] w-full rounded-md px-3 py-2 text-sm',
        'border border-[color:var(--dc-border)]',
        'bg-[color:var(--dc-card)] text-[color:var(--dc-text)]',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className ?? '',
      ].join(' ')}
      {...props}
    />
  );
});
