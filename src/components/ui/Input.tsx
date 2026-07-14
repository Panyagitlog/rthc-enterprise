import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
  size?: Size
  /** Renders +/- stepper affordance for Filled/Requirement-style counts — Phase 4 §2 */
  stepper?: boolean
  onStepperChange?: (next: number) => void
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base', // Coordinator Filled-count entry — Phase 4 §2
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, helperText, error, size = 'md', stepper, onStepperChange, id, value, type, ...props },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const helperId = `${inputId}-helper`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
            {label}
          </label>
        )}
        <div className="flex items-stretch gap-2">
          {stepper && (
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => onStepperChange?.(Number(value ?? 0) - 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-border-strong) text-(--color-text-secondary) hover:bg-(--color-neutral-tint) active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            inputMode={type === 'number' ? 'numeric' : undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={helperText || error ? helperId : undefined}
            className={cn(
              'w-full rounded-(--radius-md) border bg-(--color-card) text-(--color-text-primary)',
              'placeholder:text-(--color-text-muted)',
              'transition-colors duration-(--duration-fast)',
              'focus:border-(--color-primary)',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error ? 'border-(--color-danger)' : 'border-(--color-border-strong)',
              type === 'number' && 'tabular-nums',
              sizeClasses[size],
              className
            )}
            {...props}
          />
          {stepper && (
            <button
              type="button"
              aria-label="Increase"
              onClick={() => onStepperChange?.(Number(value ?? 0) + 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-border-strong) text-(--color-text-secondary) hover:bg-(--color-neutral-tint) active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        {(helperText || error) && (
          <p id={helperId} className={cn('mt-1.5 text-xs', error ? 'text-(--color-danger)' : 'text-(--color-text-muted)')}>
            {error ?? helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
