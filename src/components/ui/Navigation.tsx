  import { ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react'
  import { cn } from '@/lib/utils'

  // ---------- Breadcrumb ----------
  interface Crumb {
    label: string
    href?: string
  }
  export function Breadcrumb({ items }: { items: Crumb[] }) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {/* Mobile: collapse to back-chevron + immediate parent only — Phase 2 §5 */}
        <div className="flex items-center gap-1.5 sm:hidden">
          {items.length > 1 && (
            <a href={items[items.length - 2].href} className="flex items-center gap-1 text-(--color-text-secondary)">
              <ChevronLeft className="h-4 w-4" />
              {items[items.length - 2].label}
            </a>
          )}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-(--color-text-muted)" />}
              {item.href && i < items.length - 1 ? (
                <a href={item.href} className="text-(--color-text-secondary) hover:text-(--color-primary)">
                  {item.label}
                </a>
              ) : (
                <span className="font-medium text-(--color-text-primary)">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </nav>
    )
  }

  // ---------- Pagination ----------
  interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    pageSize?: number
    onPageSizeChange?: (size: number) => void
    /** For very large sets (Employees, Audit Logs) — Phase 4 §16 */
    showJump?: boolean
  }
  export function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, showJump }: PaginationProps) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-(--radius-sm) border border-(--color-border-strong) bg-(--color-card) px-2 py-1 text-xs text-(--color-text-primary)"
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-(--radius-sm) text-(--color-text-secondary) hover:bg-(--color-neutral-tint) disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 tabular-nums text-(--color-text-secondary)">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-(--radius-sm) text-(--color-text-secondary) hover:bg-(--color-neutral-tint) disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {showJump && (
            <div className="ml-2 flex items-center gap-1.5">
              <MoreHorizontal className="h-4 w-4 text-(--color-text-muted)" />
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder="Go to"
                className="h-8 w-16 rounded-(--radius-sm) border border-(--color-border-strong) bg-(--color-card) px-2 text-xs tabular-nums"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = Number((e.target as HTMLInputElement).value)
                    if (val >= 1 && val <= totalPages) onPageChange(val)
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- Progress Bar ----------
  interface ProgressBarProps {
    value: number // 0-100
    tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info'
    className?: string
  }
  export function ProgressBar({ value, tone = 'info', className }: ProgressBarProps) {
    const colorClass = {
      success: 'bg-(--color-success)',
      danger: 'bg-(--color-danger)',
      warning: 'bg-(--color-warning)',
      neutral: 'bg-(--color-neutral)',
      info: 'bg-(--color-primary)',
    }[tone]
    return (
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('h-1.5 w-full overflow-hidden rounded-(--radius-full) bg-(--color-neutral-tint)', className)}
      >
        <div className={cn('h-full rounded-(--radius-full) transition-all duration-(--duration-base)', colorClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    )
  }

  /** Route-transition indeterminate bar — Phase 4 §17 */
  export function TopLoadingBar({ active }: { active: boolean }) {
    if (!active) return null
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden bg-(--color-primary-tint)">
        <div className="h-full w-1/3 animate-[loading-sweep_1s_ease-in-out_infinite] bg-(--color-primary)" />
      </div>
    )
  }
