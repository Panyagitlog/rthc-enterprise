import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
  group?: string
}

interface SelectProps {
  label?: string
  placeholder?: string
  value?: string
  onValueChange?: (v: string) => void
  options: SelectOption[]
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const sizeClasses = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
}

export function Select({ label, placeholder = 'Select...', value, onValueChange, options, size = 'md', disabled }: SelectProps) {
  const groups = groupOptions(options)

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
          {label}
        </label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            'flex w-full items-center justify-between rounded-(--radius-md) border border-(--color-border-strong)',
            'bg-(--color-card) text-(--color-text-primary) disabled:opacity-40',
            'focus:border-(--color-primary)',
            sizeClasses[size]
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 text-(--color-text-muted)" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-(--radius-md) border border-(--color-border) bg-(--color-card) shadow-(--shadow-lg)"
          >
            <SelectPrimitive.Viewport className="p-1">
              {groups.map(([groupName, items]) => (
                <SelectPrimitive.Group key={groupName ?? 'default'}>
                  {groupName && (
                    <SelectPrimitive.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--color-text-muted)">
                      {groupName}
                    </SelectPrimitive.Label>
                  )}
                  {items.map((opt) => (
                    <SelectPrimitive.Item
                      key={opt.value}
                      value={opt.value}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center rounded-(--radius-sm) py-2 pl-7 pr-2 text-sm',
                        'text-(--color-text-primary) outline-none data-[highlighted]:bg-(--color-primary-tint)'
                      )}
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-3.5 w-3.5 text-(--color-primary)" />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Group>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}

function groupOptions(options: SelectOption[]): [string | undefined, SelectOption[]][] {
  const map = new Map<string | undefined, SelectOption[]>()
  for (const opt of options) {
    const key = opt.group
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(opt)
  }
  return Array.from(map.entries())
}
