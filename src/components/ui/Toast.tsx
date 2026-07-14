import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/status'

interface ToastItem {
  id: string
  tone: Tone
  title: string
  description?: string
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<Tone, typeof CheckCircle2> = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  neutral: Info,
  info: Info,
}

const TONE_ICON_COLOR: Record<Tone, string> = {
  success: 'text-(--color-success)',
  danger: 'text-(--color-danger)',
  warning: 'text-(--color-warning)',
  neutral: 'text-(--color-text-secondary)',
  info: 'text-(--color-primary)',
}

const MAX_VISIBLE = 2 // Phase 4 §10: max 2 stacked, rest queue

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [, setQueue] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id)
      return next
    })
  }, [])

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const item: ToastItem = { ...toast, id: crypto.randomUUID() }
    setToasts((prev) => {
      if (prev.length < MAX_VISIBLE) return [...prev, item]
      setQueue((q) => [...q, item])
      return prev
    })
  }, [])

  const handleAutoClose = useCallback(
    (id: string) => {
      dismiss(id)
      setQueue((q) => {
        if (q.length === 0) return q
        const [next, ...rest] = q
        setToasts((prev) => [...prev, next])
        return rest
      })
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 sm:top-4 sm:right-4 max-sm:top-0 max-sm:left-0 max-sm:right-0 max-sm:items-center"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => handleAutoClose(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const Icon = ICONS[toast.tone]
  return (
    <div
      role="status"
      onMouseEnter={(e) => e.currentTarget.setAttribute('data-paused', 'true')}
      onMouseLeave={(e) => {
        e.currentTarget.removeAttribute('data-paused')
        setTimeout(onClose, 4000)
      }}
      className={cn(
        'flex w-80 items-start gap-3 rounded-(--radius-md) border border-(--color-border)',
        'bg-(--color-card) p-4 shadow-(--shadow-lg)',
        'animate-in slide-in-from-top-2 fade-in duration-(--duration-base)'
      )}
      ref={(el) => {
        if (el) setTimeout(() => !el.hasAttribute('data-paused') && onClose(), 4000)
      }}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', TONE_ICON_COLOR[toast.tone])} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-(--color-text-primary)">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-(--color-text-secondary)">{toast.description}</p>}
      </div>
      <button onClick={onClose} aria-label="Dismiss" className="text-(--color-text-muted) hover:text-(--color-text-primary)">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
