import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'success-outline' | 'danger-solid' | 'danger-text' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconOnly?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-(--color-primary) text-white hover:bg-(--color-primary-hover) active:scale-[0.98]',
  secondary:
    'bg-transparent text-(--color-text-primary) border border-(--color-border-strong) hover:bg-(--color-neutral-tint) active:scale-[0.98]',
  'success-outline':
    'bg-transparent text-(--color-success) border border-(--color-success) hover:bg-(--color-success-tint) active:scale-[0.98]',
  'danger-solid':
    'bg-(--color-danger) text-white hover:opacity-90 active:scale-[0.98]',
  'danger-text':
    'bg-transparent text-(--color-danger) hover:bg-(--color-danger-tint) active:scale-[0.98]',
  ghost:
    'bg-transparent text-(--color-text-secondary) hover:bg-(--color-neutral-tint) active:scale-[0.98]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
  xl: 'h-[52px] px-6 text-base gap-2', // Coordinator Update button — Phase 3 §2
}

const iconOnlySize: Record<Size, string> = {
  sm: 'h-8 w-8 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-12 w-12 p-0',
  xl: 'h-[52px] w-[52px] p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, iconOnly, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'relative inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium',
          'transition-all duration-(--duration-fast) ease-(--ease-standard)',
          'disabled:opacity-40 disabled:pointer-events-none',
          'min-w-11 min-h-11 sm:min-w-0 sm:min-h-0', // 44px touch target floor on touch contexts
          variantClasses[variant],
          iconOnly ? iconOnlySize[size] : sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
