import { useState } from 'react'
import { Users, Target, TrendingDown, Moon, Sun, Building2, Plus, Home, Command as CommandIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, KPICard, SkeletonKPICard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, Drawer } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { Select } from '@/components/ui/Select'
import { Checkbox, RadioGroup, Switch } from '@/components/ui/Toggle'
import { Tooltip, TooltipProvider, Popover } from '@/components/ui/Tooltip'
import { Breadcrumb, Pagination, ProgressBar } from '@/components/ui/Navigation'
import { Table, DeltaCell, type Column } from '@/components/ui/Table'
import { NotificationItem, TimelineItem } from '@/components/ui/Feed'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { TrendAreaChart, ComparisonBarChart, DonutBreakdownChart, HeatmapGrid } from '@/components/ui/Charts'
import { DatePicker } from '@/components/ui/DatePicker'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-(--color-text-primary)">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  )
}

interface CompanyRow {
  id: string
  name: string
  state: string
  coordinator: string
  filled: number
  requirement: number
}

const companyRows: CompanyRow[] = [
  { id: '1', name: 'Acme Textiles', state: 'Maharashtra', coordinator: 'Suresh K.', filled: 42, requirement: 45 },
  { id: '2', name: 'Bharat Foods', state: 'Karnataka', coordinator: 'Priya R.', filled: 60, requirement: 60 },
  { id: '3', name: 'Delta Logistics', state: 'Gujarat', coordinator: 'Anil D.', filled: 28, requirement: 22 },
]

const companyColumns: Column<CompanyRow>[] = [
  { key: 'name', header: 'Company', render: (r) => r.name, cardPrimary: true },
  { key: 'state', header: 'State', render: (r) => r.state },
  { key: 'coordinator', header: 'Coordinator', render: (r) => r.coordinator },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <StatusBadge status={r.filled < r.requirement ? 'shortage' : r.filled === r.requirement ? 'complete' : 'surplus'} label={`${r.filled}/${r.requirement}`} />,
    cardPrimary: true,
  },
]

const trendData = [
  { label: 'Mon', value: 1180 }, { label: 'Tue', value: 1195 }, { label: 'Wed', value: 1170 },
  { label: 'Thu', value: 1210 }, { label: 'Fri', value: 1186 }, { label: 'Sat', value: 1220 }, { label: 'Sun', value: 1204 },
]
const stateComparisonData = [
  { label: 'MH', value: 320 }, { label: 'KA', value: 280 }, { label: 'GJ', value: 190 }, { label: 'TN', value: 240 },
]
const lifecycleDonutData = [
  { label: 'Joined', value: 620, tone: 'success' as const },
  { label: 'Recruiting', value: 140, tone: 'warning' as const },
  { label: 'Replacement Req.', value: 40, tone: 'danger' as const },
]
const heatCells = Array.from({ length: 16 }).map((_, i) => ({ id: String(i), label: `A${i + 1}`, value: Math.random() }))

export default function ComponentShowcase() {
  const [dark, setDark] = useState(false)
  const [filled, setFilled] = useState(42)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectValue, setSelectValue] = useState('mh')
  const [checked, setChecked] = useState<boolean | 'indeterminate'>(true)
  const [approvalMode, setApprovalMode] = useState('auto')
  const [switchOn, setSwitchOn] = useState(true)
  const [page, setPage] = useState(3)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const { push } = useToast()

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-(--color-canvas) px-6 py-10 transition-colors">
        <div className="mx-auto max-w-5xl space-y-12">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-(--color-text-primary)">RTHC Component Library</h1>
              <p className="text-sm text-(--color-text-secondary)">Phase 4 spec → Phase 5.1 implementation. QA checkpoint.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? 'Light' : 'Dark'}
            </Button>
          </header>

          <Section title="Buttons">
            <Button variant="primary">Save changes</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="success-outline">Approve</Button>
            <Button variant="danger-solid">Delete</Button>
            <Button variant="danger-text">Reject</Button>
            <Button variant="ghost" iconOnly aria-label="Add"><Plus className="h-4 w-4" /></Button>
            <Button loading>Saving</Button>
            <Button size="xl">Update (Coordinator)</Button>
          </Section>

          <Section title="Status Badges">
            <StatusBadge status="shortage" />
            <StatusBadge status="complete" />
            <StatusBadge status="surplus" />
            <StatusBadge status="pending" style="outline" />
            <StatusBadge status="approved" style="outline" />
            <StatusBadge status="absent" style="outline" />
            <StatusBadge status="present" style="dot" />
          </Section>

          <Section title="KPI Cards">
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard label="Requirement" value="1,240" icon={<Target className="h-5 w-5" />} />
              <KPICard label="Filled" value="1,186" icon={<Users className="h-5 w-5" />} />
              <KPICard label="Variation" value="-54" tone="danger" icon={<TrendingDown className="h-5 w-5" />} delta={{ value: '3.1%', direction: 'down' }} />
              <SkeletonKPICard />
            </div>
          </Section>

          <Section title="Inputs">
            <div className="w-64">
              <Input label="Filled count" type="number" size="lg" stepper value={filled} onStepperChange={setFilled} onChange={(e) => setFilled(Number(e.target.value))} />
            </div>
            <div className="w-64">
              <Input label="Remarks" placeholder="Optional note..." helperText="Visible to your Area Manager" />
            </div>
            <div className="w-64">
              <Input label="Email" error="This field is required" />
            </div>
          </Section>

          <Section title="Avatars">
            <Avatar name="Suresh Kumar" size="lg" presence="online" />
            <Avatar name="Priya Rao" size="md" presence="idle" />
            <Avatar name="Anil Deshmukh" size="sm" presence="offline" />
          </Section>

          <Section title="Cards">
            <Card hover className="w-64">
              <div className="flex items-center gap-2 text-(--color-text-secondary)">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">Acme Textiles</span>
              </div>
              <p className="mt-2 text-xs text-(--color-text-muted)">Pune · Coordinator: Suresh K.</p>
            </Card>
          </Section>

          <Section title="Tabs">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                <TabsTrigger value="shifts">Shifts</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview"><p className="text-sm text-(--color-text-secondary)">Overview content.</p></TabsContent>
              <TabsContent value="lifecycle"><p className="text-sm text-(--color-text-secondary)">Lifecycle stepper renders here.</p></TabsContent>
              <TabsContent value="shifts"><p className="text-sm text-(--color-text-secondary)">Shift cards render here.</p></TabsContent>
              <TabsContent value="history"><p className="text-sm text-(--color-text-secondary)">History table renders here.</p></TabsContent>
            </Tabs>
          </Section>

          <Section title="Modal / Drawer / Toast">
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
            <Button variant="secondary" onClick={() => push({ tone: 'success', title: 'Update saved', description: '42 → 44 confirmed' })}>
              Trigger Toast
            </Button>
          </Section>

          <Section title="Empty State">
            <Card className="w-full">
              <EmptyState
                icon={<Building2 className="h-10 w-10" />}
                title="No companies yet"
                description="Companies you add will appear here."
                action={{ label: 'Add Company', onClick: () => {} }}
              />
            </Card>
          </Section>

          <Section title="Select">
            <div className="w-56">
              <Select
                label="State"
                value={selectValue}
                onValueChange={setSelectValue}
                options={[
                  { value: 'mh', label: 'Maharashtra', group: 'Active' },
                  { value: 'ka', label: 'Karnataka', group: 'Active' },
                  { value: 'gj', label: 'Gujarat', group: 'Active' },
                  { value: 'up', label: 'Uttar Pradesh', group: 'Other' },
                ]}
              />
            </div>
            <div className="w-56">
              <DatePicker label="Report date" value={date} onChange={setDate} />
            </div>
          </Section>

          <Section title="Checkbox / Radio / Switch">
            <Checkbox checked={checked} onCheckedChange={setChecked} label="Select all companies" />
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} label="Critical alerts via SMS" />
          </Section>
          <div className="w-full max-w-sm">
            <RadioGroup
              name="approval-mode"
              value={approvalMode}
              onValueChange={setApprovalMode}
              options={[
                { value: 'auto', label: 'Auto-Approve', description: 'Updates go live instantly' },
                { value: 'multi', label: 'Multi-Stage Approval', description: 'Requires Area then State sign-off' },
              ]}
            />
          </div>

          <Section title="Tooltip / Popover">
            <TooltipProvider>
              <Tooltip content="Synced from manual entry">
                <Button variant="secondary" size="sm">Hover me</Button>
              </Tooltip>
            </TooltipProvider>
            <Popover
              trigger={<Button variant="secondary" size="sm">Click for filters</Button>}
              className="w-56"
            >
              <p className="text-sm font-medium text-(--color-text-primary)">Filter by status</p>
              <div className="mt-2 space-y-1">
                <StatusBadge status="shortage" style="outline" />
                <StatusBadge status="surplus" style="outline" />
              </div>
            </Popover>
          </Section>

          <Section title="Breadcrumb / Pagination / Progress">
            <div className="w-full space-y-4">
              <Breadcrumb items={[{ label: 'Companies', href: '#' }, { label: 'Acme Textiles', href: '#' }, { label: 'Overview' }]} />
              <Pagination page={page} totalPages={12} onPageChange={setPage} pageSize={50} onPageSizeChange={() => {}} showJump />
              <ProgressBar value={68} tone="success" className="max-w-xs" />
            </div>
          </Section>

          <Section title="Data Table (auto mobile card-list swap)">
            <div className="w-full">
              <Table columns={companyColumns} rows={companyRows} rowKey={(r) => r.id} onRowClick={() => {}} />
            </div>
          </Section>

          <Section title="Delta Cell">
            <DeltaCell from={40} to={42} />
            <DeltaCell from={45} to={41} />
          </Section>

          <Section title="Charts">
            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <p className="mb-2 text-sm font-semibold text-(--color-text-primary)">Weekly Fill Trend</p>
                <TrendAreaChart data={trendData} summary="Fill count trended from 1180 to 1204 over the past week, peaking Saturday at 1220." />
              </Card>
              <Card>
                <p className="mb-2 text-sm font-semibold text-(--color-text-primary)">State Comparison</p>
                <ComparisonBarChart data={stateComparisonData} summary="Maharashtra leads with 320 filled, followed by Tamil Nadu, Karnataka, and Gujarat." />
              </Card>
              <Card>
                <p className="mb-2 text-sm font-semibold text-(--color-text-primary)">Lifecycle Breakdown</p>
                <DonutBreakdownChart data={lifecycleDonutData} summary="620 employees joined, 140 in recruitment, 40 requiring replacement." />
              </Card>
              <Card>
                <p className="mb-2 text-sm font-semibold text-(--color-text-primary)">Area Heatmap</p>
                <HeatmapGrid cells={heatCells} summary="Area-level shortage intensity, green indicating surplus, red indicating severe shortage." />
              </Card>
            </div>
          </Section>

          <Section title="Notifications & Timeline">
            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-0 overflow-hidden">
                <NotificationItem type="critical-shortage" priority="critical" title="Critical shortage — Acme Textiles, Maharashtra" timestamp={new Date(Date.now() - 5 * 60000)} unread />
                <NotificationItem type="approval-pending" priority="high" title="3 updates awaiting your approval" timestamp={new Date(Date.now() - 40 * 60000)} unread />
                <NotificationItem type="company-created" priority="low" title="Delta Logistics added to your area" timestamp={new Date(Date.now() - 3 * 3600000)} />
              </Card>
              <Card>
                <TimelineItem actorName="Suresh Kumar" action="updated Filled count" from={40} to={42} timestamp={new Date(Date.now() - 15 * 60000)} tone="success" />
                <TimelineItem actorName="Priya Rao" action="approved a pending update" timestamp={new Date(Date.now() - 2 * 3600000)} tone="info" />
                <TimelineItem actorName="System" action="flagged a critical shortage" timestamp={new Date(Date.now() - 5 * 3600000)} tone="danger" isLast />
              </Card>
            </div>
          </Section>

          <Section title="Command Palette">
            <div className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
              <CommandIcon className="h-4 w-4" />
              Press <kbd className="rounded border border-(--color-border-strong) px-1.5 py-0.5 text-xs">⌘K</kbd> / <kbd className="rounded border border-(--color-border-strong) px-1.5 py-0.5 text-xs">Ctrl K</kbd> to open
            </div>
          </Section>
        </div>

        <CommandPalette
          items={[
            { id: 'c1', label: 'Acme Textiles', group: 'Companies', onSelect: () => push({ tone: 'info', title: 'Navigating to Acme Textiles' }) },
            { id: 'co1', label: 'Suresh Kumar', group: 'Coordinators', onSelect: () => push({ tone: 'info', title: 'Navigating to Suresh Kumar' }) },
            { id: 'p1', label: 'Go to Settings', group: 'Pages', icon: Home, onSelect: () => push({ tone: 'info', title: 'Navigating to Settings' }) },
          ]}
        />

        <Modal open={modalOpen} onOpenChange={setModalOpen} title="Confirm update" description="This will notify your Area Manager.">
          <p className="text-sm text-(--color-text-secondary)">Filled count will change from 40 to 42.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Add Company">
          <div className="space-y-4">
            <Input label="Company name" placeholder="e.g. Acme Textiles" />
            <Input label="State" placeholder="e.g. Maharashtra" />
            <Button className="w-full">Save Company</Button>
          </div>
        </Drawer>
      </div>
    </div>
  )
}
