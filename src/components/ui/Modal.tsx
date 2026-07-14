import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Set true for destructive-in-progress flows — disables backdrop/escape close */
  preventDismiss?: boolean
}

const SIZE_MAX_W: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[640px]',
  lg: 'max-w-[800px]',
}

export function Modal({ open, onOpenChange, title, description, children, size = 'sm', preventDismiss }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in" />
        <Dialog.Content
          onPointerDownOutside={(e) => preventDismiss && e.preventDefault()}
          onEscapeKeyDown={(e) => preventDismiss && e.preventDefault()}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-(--radius-lg)',
            'bg-(--color-card) border border-(--color-border) shadow-(--shadow-lg) p-6',
            'animate-in zoom-in-95 fade-in',
            SIZE_MAX_W[size]
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold text-(--color-text-primary)">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-(--color-text-secondary)">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="text-(--color-text-muted) hover:text-(--color-text-primary)">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/** Slides from right (desktop/tablet) / bottom (mobile) — Phase 4 §7 */
export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-in fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-(--color-card) border-(--color-border) shadow-(--shadow-lg) p-6 overflow-y-auto',
            // mobile: full-width bottom sheet
            'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-(--radius-lg) border-t',
            'animate-in slide-in-from-bottom',
            // desktop/tablet: fixed 480px right panel
            'sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-[480px] sm:rounded-t-none sm:rounded-l-(--radius-lg) sm:border-l sm:border-t-0'
          )}
        >
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold text-(--color-text-primary)">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="text-(--color-text-muted) hover:text-(--color-text-primary)">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
