import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="text-(--color-text-muted)" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-(--color-text-primary)">{title}</p>
        {description && <p className="mt-1 text-sm text-(--color-text-secondary)">{description}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
