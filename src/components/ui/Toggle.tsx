import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------- Checkbox ----------
interface CheckboxProps {
  id?: string
  checked: boolean | 'indeterminate'
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Checkbox({ id, checked, onCheckedChange, label, disabled }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed')}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c === true)}
        disabled={disabled}
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border border-(--color-border-strong)',
          'data-[state=checked]:bg-(--color-primary) data-[state=checked]:border-(--color-primary)',
          'data-[state=indeterminate]:bg-(--color-primary) data-[state=indeterminate]:border-(--color-primary)'
        )}
      >
        <CheckboxPrimitive.Indicator className="text-white">
          {checked === 'indeterminate' ? <Minus className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && <span className="text-sm text-(--color-text-primary)">{label}</span>}
    </label>
  )
}

// ---------- Radio Group ----------
interface RadioOption {
  value: string
  label: string
  description?: string
}
interface RadioGroupProps {
  value: string
  onValueChange: (v: string) => void
  options: RadioOption[]
  name: string
}
export function RadioGroup({ value, onValueChange, options, name }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root value={value} onValueChange={onValueChange} name={name} className="flex flex-col gap-3">
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-start gap-2.5">
          <RadioGroupPrimitive.Item
            value={opt.value}
            className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-(--color-border-strong) data-[state=checked]:border-(--color-primary)"
          >
            <RadioGroupPrimitive.Indicator className="h-2.5 w-2.5 rounded-full bg-(--color-primary)" />
          </RadioGroupPrimitive.Item>
          <span>
            <span className="block text-sm font-medium text-(--color-text-primary)">{opt.label}</span>
            {opt.description && <span className="block text-xs text-(--color-text-secondary)">{opt.description}</span>}
          </span>
        </label>
      ))}
    </RadioGroupPrimitive.Root>
  )
}

// ---------- Switch ----------
interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}
export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-40 cursor-not-allowed')}>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-10 rounded-(--radius-full) bg-(--color-neutral-tint) border border-(--color-border-strong) data-[state=checked]:bg-(--color-primary) data-[state=checked]:border-(--color-primary) transition-colors"
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
      {label && <span className="text-sm text-(--color-text-primary)">{label}</span>}
    </label>
  )
}
