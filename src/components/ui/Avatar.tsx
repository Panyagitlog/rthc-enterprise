import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg'
type Presence = 'online' | 'offline' | 'idle'

interface AvatarProps {
  name: string
  src?: string
  size?: Size
  presence?: Presence
  className?: string
}

const SIZE_PX: Record<Size, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

const PRESENCE_COLOR: Record<Presence, string> = {
  online: 'bg-(--color-success)',
  offline: 'bg-(--color-neutral)',
  idle: 'bg-(--color-warning)',
}

// Deterministic muted color per name, so a person's avatar color stays
// consistent across the app — Phase 4 §11.
const PALETTE = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777']
function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function Avatar({ name, src, size = 'md', presence, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt={name} className={cn('rounded-full object-cover', SIZE_PX[size])} />
      ) : (
        <span
          className={cn('flex items-center justify-center rounded-full font-semibold text-white', SIZE_PX[size])}
          style={{ backgroundColor: colorForName(name) }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
      <span className="sr-only">{name}</span>
      {presence && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-(--color-card)',
            PRESENCE_COLOR[presence]
          )}
          aria-label={presence}
        />
      )}
    </span>
  )
}
