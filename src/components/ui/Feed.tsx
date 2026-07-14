import { AlertOctagon, AlertTriangle, Bell, Building2, UserX, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './Avatar'

export type NotificationType =
  | 'critical-shortage'
  | 'low-filled'
  | 'coordinator-offline'
  | 'missed-update'
  | 'approval-pending'
  | 'company-created'
  | 'system-alert'

export type Priority = 'critical' | 'high' | 'medium' | 'low'

interface NotificationItemProps {
  type: NotificationType
  priority: Priority
  title: string
  timestamp: Date
  unread?: boolean
  onClick?: () => void
}

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  'critical-shortage': AlertOctagon,
  'low-filled': AlertTriangle,
  'coordinator-offline': UserX,
  'missed-update': AlertTriangle,
  'approval-pending': CheckCircle2,
  'company-created': Building2,
  'system-alert': Bell,
}

const PRIORITY_BORDER: Record<Priority, string> = {
  critical: 'border-l-(--color-danger)',
  high: 'border-l-(--color-warning)',
  medium: 'border-l-transparent',
  low: 'border-l-transparent',
}

const PRIORITY_ICON_TONE: Record<Priority, string> = {
  critical: 'text-(--color-danger) bg-(--color-danger-tint)',
  high: 'text-(--color-warning) bg-(--color-warning-tint)',
  medium: 'text-(--color-text-secondary) bg-(--color-neutral-tint)',
  low: 'text-(--color-text-muted) bg-(--color-neutral-tint)',
}

export function NotificationItem({ type, priority, title, timestamp, unread, onClick }: NotificationItemProps) {
  const Icon = TYPE_ICON[type]
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition-colors hover:bg-(--color-neutral-tint)',
        PRIORITY_BORDER[priority]
      )}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', PRIORITY_ICON_TONE[priority])}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm', unread ? 'font-medium text-(--color-text-primary)' : 'text-(--color-text-secondary)')}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-(--color-text-muted)">{timeAgo(timestamp)}</span>
      </span>
      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--color-primary)" aria-label="Unread" />}
    </button>
  )
}

// ---------- Timeline Item ----------
interface TimelineItemProps {
  actorName: string
  action: string
  from?: number
  to?: number
  timestamp: Date
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
  isLast?: boolean
}

const DOT_TONE = {
  success: 'bg-(--color-success)',
  danger: 'bg-(--color-danger)',
  warning: 'bg-(--color-warning)',
  neutral: 'bg-(--color-neutral)',
  info: 'bg-(--color-primary)',
}

export function TimelineItem({ actorName, action, from, to, timestamp, tone = 'info', isLast }: TimelineItemProps) {
  return (
    <div className="relative flex gap-3 pb-6">
      {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-(--color-border)" aria-hidden="true" />}
      <span className={cn('relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full ring-4 ring-(--color-canvas)', DOT_TONE[tone])} />
      <Avatar name={actorName} size="sm" />
      <div className="flex-1 sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-(--color-text-primary)">
          <span className="font-medium">{actorName}</span> {action}
          {from !== undefined && to !== undefined && (
            <span className="tabular-nums text-(--color-text-secondary)"> {from} → {to}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-(--color-text-muted) sm:mt-0 sm:shrink-0">{timeAgo(timestamp)}</p>
      </div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
