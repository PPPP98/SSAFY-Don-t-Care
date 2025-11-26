import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className = '' }: LayoutProps) {
  return <div className={`min-h-dvh bg-background ${className}`}>{children}</div>;
}
