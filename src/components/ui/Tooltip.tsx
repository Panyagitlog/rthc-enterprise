import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ---------- Tooltip ----------
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>
}

interface TooltipProps {
  content: string
  children: ReactNode
}
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-56 rounded-(--radius-sm) bg-(--color-text-primary) px-2.5 py-1.5 text-xs text-(--color-canvas) shadow-(--shadow-md) animate-in fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-(--color-text-primary)" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// ---------- Popover ----------
interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  className?: string
}
export function Popover({ trigger, children, className }: PopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 rounded-(--radius-md) border border-(--color-border) bg-(--color-card) p-4 shadow-(--shadow-lg) animate-in fade-in zoom-in-95',
            className
          )}
        >
          {children}
          <PopoverPrimitive.Arrow className="fill-(--color-card)" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
