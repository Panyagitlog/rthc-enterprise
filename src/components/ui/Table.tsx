import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { Inbox } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Included in the mobile card summary (typically 2-3 of your columns) */
  cardPrimary?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  density?: 'comfortable' | 'compact'
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
}

/**
 * Below 768px this auto-swaps to a card-list renderer (Phase 2 cross-cutting
 * note / Phase 4 §8) — this swap is a prop-driven built-in behavior, not a
 * per-screen reimplementation.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  density = 'comfortable',
  onRowClick,
  emptyMessage = 'No records found',
  loading,
}: TableProps<T>) {
  const rowH = density === 'compact' ? 'py-2' : 'py-3'

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-(--radius-md) border border-(--color-border) bg-(--color-card)">
        <EmptyState icon={<Inbox className="h-10 w-10" />} title={emptyMessage} />
      </div>
    )
  }

  return (
    <>
      {/* Desktop / tablet grid */}
      <div className="hidden overflow-x-auto rounded-(--radius-md) border border-(--color-border) sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-(--color-neutral-tint)">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'sticky top-0 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} columns={columns.length} />)
              : rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-t border-(--color-border) transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-(--color-primary-tint)/40'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          `px-4 ${rowH} text-(--color-text-primary)`,
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-(--radius-md) bg-(--color-neutral-tint)" />
            ))
          : rows.map((row) => {
              const primaryCols = columns.filter((c) => c.cardPrimary)
              const cols = primaryCols.length ? primaryCols : columns.slice(0, 3)
              return (
                <div
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'rounded-(--radius-md) border border-(--color-border) bg-(--color-card) p-4',
                    onRowClick && 'cursor-pointer active:scale-[0.99]'
                  )}
                >
                  {cols.map((col) => (
                    <div key={col.key} className="flex items-center justify-between py-0.5 text-sm first:font-medium">
                      {cols.length > 1 && (
                        <span className="text-xs uppercase tracking-wide text-(--color-text-muted)">{col.header}</span>
                      )}
                      <span className="text-(--color-text-primary)">{col.render(row)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
      </div>
    </>
  )
}

export function SkeletonTableRow({ columns }: { columns: number }) {
  return (
    <tr className="border-t border-(--color-border)">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-(--color-neutral-tint)" />
        </td>
      ))}
    </tr>
  )
}

// ---------- Shared cell renderers — Phase 4 §8 ----------
export function DeltaCell({ from, to }: { from: number; to: number }) {
  const delta = to - from
  const color = delta >= 0 ? 'text-(--color-success)' : 'text-(--color-danger)'
  return (
    <span className="tabular-nums text-sm">
      {from} → {to}{' '}
      <span className={color}>({delta >= 0 ? '+' : ''}{delta})</span>
    </span>
  )
}

export function TimestampCell({ date }: { date: Date }) {
  const rel = relativeTime(date)
  return (
    <span title={date.toLocaleString()} className="text-(--color-text-secondary)">
      {rel}
    </span>
  )
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
