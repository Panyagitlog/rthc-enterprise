import { CheckCircle2, AlertTriangle, XCircle, Clock, Circle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_CLASSES, statusMeta, type StatusKind } from '@/lib/status'

interface StatusBadgeProps {
  status: StatusKind
  style?: 'solid' | 'outline' | 'dot'
  className?: string
  /** Override the default label (e.g. show the numeric variation) */
  label?: string
}

const ICONS: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  neutral: Circle,
  info: Info,
}

export function StatusBadge({ status, style = 'solid', className, label }: StatusBadgeProps) {
  const meta = statusMeta(status)
  const tone = TONE_CLASSES[meta.tone]
  const Icon = ICONS[meta.tone] ?? Circle
  const text = label ?? meta.label

  if (style === 'dot') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', tone.text, className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', tone.solidBg)} aria-hidden="true" />
        {text}
      </span>
    )
  }

  if (style === 'outline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-(--radius-full) border px-2 py-0.5 text-xs font-medium',
          tone.text,
          tone.border,
          className
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {text}
      </span>
    )
  }

  // solid (tinted background, high emphasis default for table status columns)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-(--radius-full) px-2 py-0.5 text-xs font-medium',
        tone.text,
        tone.bg,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {text}
    </span>
  )
}

// Re-export used by callers who prefer the icon-based clock for pending states
export { Clock as PendingIcon }
