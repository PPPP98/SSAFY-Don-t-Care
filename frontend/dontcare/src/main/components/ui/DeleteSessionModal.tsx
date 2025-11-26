import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { useState } from 'react';

interface DeleteSessionModalProps {
  trigger: (openModal: () => void) => React.ReactElement;
  onConfirm: () => void;
  sessionName?: string;
}

export function DeleteSessionModal({ trigger, onConfirm, sessionName }: DeleteSessionModalProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // 세션 삭제 실패
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const openModal = () => {
    setOpen(true);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {trigger(openModal)}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
            'border border-border-color/50 bg-bg-tertiary/95 backdrop-blur-md',
            'rounded-xl p-6 shadow-soft-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-300',
          )}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/20">
              <svg
                className="h-6 w-6 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <DialogPrimitive.Title asChild>
              <h2 className="mb-2 text-lg font-semibold text-text-primary">
                세션을 삭제하시겠습니까?
              </h2>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <p className="text-sm leading-relaxed text-text-secondary">
                이 작업은 되돌릴 수 없습니다.
                {sessionName && (
                  <>
                    <br />
                    <span className="mt-1 inline-block font-medium text-text-primary">
                      &ldquo;{sessionName}&rdquo;
                    </span>{' '}
                    세션이 영구적으로 삭제됩니다.
                  </>
                )}
              </p>
            </DialogPrimitive.Description>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={isDeleting}
              className="flex-1 border border-border-color bg-bg-secondary text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary"
              variant="outline"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 border-0 bg-error text-white transition-all duration-200 hover:bg-error/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
