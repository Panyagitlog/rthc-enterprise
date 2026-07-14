import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  elevated?: boolean
}

export function Card({ className, hover, elevated, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-(--radius-md) border border-(--color-border) p-5',
        elevated ? 'bg-(--color-card-elevated)' : 'bg-(--color-card)',
        'shadow-(--shadow-sm)',
        hover && 'transition-shadow duration-(--duration-base) hover:shadow-(--shadow-md) cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string | number
  icon: ReactNode
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
  delta?: { value: string; direction: 'up' | 'down' }
  className?: string
}

const TONE_ICON_BG: Record<NonNullable<KPICardProps['tone']>, string> = {
  success: 'bg-(--color-success-tint) text-(--color-success)',
  danger: 'bg-(--color-danger-tint) text-(--color-danger)',
  warning: 'bg-(--color-warning-tint) text-(--color-warning)',
  neutral: 'bg-(--color-neutral-tint) text-(--color-neutral)',
  info: 'bg-(--color-primary-tint) text-(--color-primary)',
}

const TONE_EDGE: Record<NonNullable<KPICardProps['tone']>, string> = {
  success: 'before:bg-(--color-success)',
  danger: 'before:bg-(--color-danger)',
  warning: 'before:bg-(--color-warning)',
  neutral: 'before:bg-(--color-neutral)',
  info: 'before:bg-(--color-primary)',
}

/** Phase 3 §2/§3: hero KPI card. Only the Variation card should pass `tone`
 * dynamically — decorative color use elsewhere is against Phase 1 §12. */
export function KPICard({ label, value, icon, tone, delta, className }: KPICardProps) {
  return (
    <Card
      elevated={!!tone}
      className={cn(
        'relative overflow-hidden pl-6',
        tone && ['before:absolute before:left-0 before:top-0 before:h-full before:w-1', TONE_EDGE[tone]],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">{label}</p>
          <p className="tabular-nums mt-1 text-[32px] leading-[38px] font-bold text-(--color-text-primary)">
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                'mt-1 text-xs font-medium tabular-nums',
                delta.direction === 'up' ? 'text-(--color-success)' : 'text-(--color-danger)'
              )}
            >
              {delta.direction === 'up' ? '▲' : '▼'} {delta.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', tone ? TONE_ICON_BG[tone] : 'bg-(--color-primary-tint) text-(--color-primary)')}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function SkeletonKPICard() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-(--color-neutral-tint)" />
          <div className="h-8 w-16 rounded bg-(--color-neutral-tint)" />
        </div>
        <div className="h-10 w-10 rounded-full bg-(--color-neutral-tint)" />
      </div>
    </Card>
  )
}
