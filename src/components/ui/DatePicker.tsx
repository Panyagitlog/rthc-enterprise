import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  mode?: 'single' | 'range'
  value?: Date | DateRange
  onChange?: (value: any) => void
  placeholder?: string
}

/** Desktop/tablet: floating popover calendar. Mobile: same trigger, but
 * intended to be rendered inside a Drawer/bottom-sheet by the consuming
 * screen at <768px — floating calendars are awkward at small widths
 * (Phase 2 §6). */
export function DatePicker({ label, mode = 'single', value, onChange, placeholder = 'Select date' }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const display =
    mode === 'range' && value && 'from' in (value as DateRange)
      ? formatRange(value as DateRange)
      : value instanceof Date
      ? value.toLocaleDateString()
      : placeholder

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
          {label}
        </label>
      )}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-(--radius-md) border border-(--color-border-strong)',
              'bg-(--color-card) px-3 text-sm text-(--color-text-primary)'
            )}
          >
            <CalendarDays className="h-4 w-4 text-(--color-text-muted)" />
            {display}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            sideOffset={6}
            className="z-50 rounded-(--radius-md) border border-(--color-border) bg-(--color-card) p-3 shadow-(--shadow-lg)"
          >
            {mode === 'range' ? (
              <DayPicker
                mode="range"
                selected={value as DateRange}
                onSelect={(v) => onChange?.(v)}
                className="rthc-daypicker"
              />
            ) : (
              <DayPicker
                mode="single"
                selected={value as Date}
                onSelect={(v) => {
                  onChange?.(v)
                  setOpen(false)
                }}
                className="rthc-daypicker"
              />
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  )
}

function formatRange(range: DateRange): string {
  if (!range.from) return 'Select date range'
  if (!range.to) return range.from.toLocaleDateString()
  return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`
}
