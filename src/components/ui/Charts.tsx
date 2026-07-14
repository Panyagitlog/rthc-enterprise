import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

// Consistent dark tooltip regardless of app theme — Phase 4 §23
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-(--radius-sm) bg-(--color-text-primary) px-3 py-2 text-xs text-(--color-canvas) shadow-(--shadow-md)">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="tabular-nums">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

const CHART_COLORS = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  grid: 'var(--color-chart-grid)',
}

interface BasePoint {
  label: string
  value: number
}

interface ChartWrapperProps {
  /** Screen-reader summary of the trend — Phase 1 §25 / Phase 4 §23 */
  summary: string
  height?: number
  className?: string
}

// ---------- Trend Area Chart ----------
export function TrendAreaChart({ data, summary, height = 240, className }: ChartWrapperProps & { data: BasePoint[] }) {
  return (
    <div className={cn('w-full', className)}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} aria-hidden="true">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Comparison Bar Chart ----------
export function ComparisonBarChart({ data, summary, height = 240, className }: ChartWrapperProps & { data: BasePoint[] }) {
  return (
    <div className={cn('w-full', className)}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} aria-hidden="true">
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-neutral-tint)' }} />
          <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Trend Graph (multi-series, e.g. Requirement vs Filled) ----------
interface MultiSeriesPoint {
  label: string
  [seriesKey: string]: string | number
}
export function TrendGraph({
  data, series, summary, height = 240, className,
}: ChartWrapperProps & { data: MultiSeriesPoint[]; series: { key: string; name: string; tone: keyof typeof CHART_COLORS }[] }) {
  return (
    <div className={cn('w-full', className)}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} aria-hidden="true">
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={CHART_COLORS[s.tone]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Donut Breakdown Chart ----------
export function DonutBreakdownChart({
  data, summary, height = 220, className,
}: ChartWrapperProps & { data: (BasePoint & { tone: keyof typeof CHART_COLORS })[] }) {
  return (
    <div className={cn('w-full', className)}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart aria-hidden="true">
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={CHART_COLORS[d.tone]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Sparkline (inline KPI-card mini-trend, no axes) ----------
export function Sparkline({ data, tone = 'primary', height = 32 }: { data: BasePoint[]; tone?: keyof typeof CHART_COLORS; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[tone]} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ---------- Heatmap Grid (geographic or tabular intensity) ----------
interface HeatmapCell {
  id: string
  label: string
  value: number // 0-1 normalized intensity
}
export function HeatmapGrid({ cells, summary, className }: { cells: HeatmapCell[]; summary: string; className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <span className="sr-only">{summary}</span>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" aria-hidden="true">
        {cells.map((cell) => (
          <div
            key={cell.id}
            title={`${cell.label}: ${Math.round(cell.value * 100)}%`}
            className="flex aspect-square items-center justify-center rounded-(--radius-sm) text-[10px] font-medium text-white"
            style={{ backgroundColor: heatColor(cell.value) }}
          >
            {cell.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// Sequential green→amber→red scale — Phase 3 §3
function heatColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped < 0.5) {
    return interpolate('#16A34A', '#D97706', clamped / 0.5)
  }
  return interpolate('#D97706', '#DC2626', (clamped - 0.5) / 0.5)
}
function interpolate(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r}, ${g}, ${bl})`
}
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
