// named exports only

import { forwardRef } from 'react';
import {
  PanelGroup as BaseGroup,
  Panel as BasePanel,
  PanelResizeHandle as BaseHandle,
  // ⬇️ ref 타입을 정확히 가져와야 함
  type ImperativePanelGroupHandle,
} from 'react-resizable-panels';

type GroupProps = Omit<React.ComponentProps<typeof BaseGroup>, 'direction'> & {
  className?: string;
};

// Panel은 재래핑 없이 그대로 re-export
export const ResizablePanel = BasePanel;

// PanelGroup: ref 타입을 ImperativePanelGroupHandle로 지정
export const ResizablePanelGroup = forwardRef<ImperativePanelGroupHandle, GroupProps>(
  function ResizablePanelGroup({ className, ...props }, ref) {
    return (
      <BaseGroup
        ref={ref}
        direction="horizontal"
        className={['h-full w-full', className ?? ''].join(' ')}
        {...props}
      />
    );
  },
);

// Handle: ref가 굳이 필요 없으므로 단순 함수 컴포넌트로 감싸기
type HandleProps = React.ComponentProps<typeof BaseHandle> & { 'aria-label'?: string };

export function ResizableHandle({ className, ...props }: HandleProps) {
  return (
    <BaseHandle
      className={[
        'group relative flex w-2 items-center justify-center bg-transparent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dc-accent)]',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {/* grip */}
      <span
        aria-hidden="true"
        className="pointer-events-none h-10 w-0.5 rounded bg-[color:var(--dc-border)] transition-colors group-hover:bg-[color:var(--dc-accent-2)]"
      />
    </BaseHandle>
  );
}
