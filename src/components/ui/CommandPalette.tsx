import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { Building2, Users, UserCheck, Settings, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  group: 'Companies' | 'Coordinators' | 'Employees' | 'Pages' | 'Recent'
  icon?: typeof Building2
  onSelect: () => void
}

interface CommandPaletteProps {
  items: CommandItem[]
}

const GROUP_ICON: Record<CommandItem['group'], typeof Building2> = {
  Companies: Building2,
  Coordinators: UserCheck,
  Employees: Users,
  Pages: Settings,
  Recent: Search,
}

/** Cmd/Ctrl+K opens center-overlay on desktop/tablet. On mobile, wire the
 * search icon in the top bar to open this same component full-screen via
 * the `open` prop — Phase 2 cross-cutting note. */
export function CommandPalette({ items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  const groups = Array.from(new Set(items.map((i) => i.group)))

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[15vh] animate-in fade-in sm:pt-[15vh] max-sm:pt-0 max-sm:items-stretch" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-lg overflow-hidden rounded-(--radius-lg) border border-(--color-border) bg-(--color-card) shadow-(--shadow-lg)',
          'max-sm:h-full max-sm:max-w-none max-sm:rounded-none'
        )}
      >
        <Command label="Global search">
          <div className="flex items-center gap-2 border-b border-(--color-border) px-4">
            <Search className="h-4 w-4 text-(--color-text-muted)" />
            <Command.Input
              autoFocus
              placeholder="Search companies, coordinators, pages..."
              className="h-12 w-full bg-transparent text-sm text-(--color-text-primary) outline-none placeholder:text-(--color-text-muted)"
            />
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-(--color-text-muted)">No results found.</Command.Empty>
            {groups.map((group) => (
              <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-(--color-text-muted)">
                {items
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const Icon = item.icon ?? GROUP_ICON[item.group]
                    return (
                      <Command.Item
                        key={item.id}
                        onSelect={() => {
                          item.onSelect()
                          setOpen(false)
                        }}
                        className="flex cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-2 py-2 text-sm text-(--color-text-primary) data-[selected=true]:bg-(--color-primary-tint)"
                      >
                        <Icon className="h-4 w-4 text-(--color-text-muted)" />
                        {item.label}
                      </Command.Item>
                    )
                  })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
