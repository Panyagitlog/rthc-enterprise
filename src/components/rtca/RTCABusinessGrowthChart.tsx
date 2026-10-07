import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RTCARow } from "../../types/rtca";

type GrowthPoint = {
  period: string;
  requirement: number;
  filled: number;
  gap: number;
  growth: number | null;
};

type RTCABusinessGrowthChartProps = {
  rows: RTCARow[];
  loading: boolean;
  error: boolean;
};

const colors = { requirement: "#0891b2", filled: "#059669", gap: "#d97706" };
const formatNumber = (value: number) => (Number.isFinite(value) ? value.toLocaleString("en-IN") : "0");
const formatGrowth = (value: number | null) => value === null || !Number.isFinite(value) ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const numericValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

function aggregateByMonth(rows: RTCARow[]): GrowthPoint[] {
  const grouped = new Map<string, { requirement: number; filled: number }>();

  rows.forEach((row) => {
    const period = typeof row.report_date === "string" ? row.report_date.slice(0, 7) : "";
    if (!/^\d{4}-\d{2}$/.test(period)) return;
    const current = grouped.get(period) || { requirement: 0, filled: 0 };
    current.requirement += numericValue(row.requirement);
    current.filled += numericValue(row.filled);
    grouped.set(period, current);
  });

  const periods = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  return periods.map(([period, values], index) => {
    const previous = periods[index - 1]?.[1];
    const growth = previous && previous.filled !== 0
      ? ((values.filled - previous.filled) / previous.filled) * 100
      : null;
    return {
      period,
      requirement: values.requirement,
      filled: values.filled,
      gap: values.requirement - values.filled,
      growth: growth !== null && Number.isFinite(growth) ? growth : null,
    };
  });
}

function displayPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export default function RTCABusinessGrowthChart({ rows, loading, error }: RTCABusinessGrowthChartProps) {
  const data = aggregateByMonth(rows);
  const current = data[data.length - 1];
  const previous = data[data.length - 2];

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="grid gap-3 sm:grid-cols-3">{["requirement", "filled", "growth"].map((item) => <div key={item} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div><div className="h-[300px] rounded-xl bg-slate-100 dark:bg-slate-800" /></div>;
  }

  if (error) {
    return <div className="flex h-[390px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-center text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">Business growth data could not be loaded.</div>;
  }

  if (!current) {
    return <div className="flex h-[390px] items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 text-center text-sm text-slate-400 dark:border-slate-700">No business growth data is available for the selected filters.</div>;
  }

  const insight = previous
    ? current.filled > previous.filled
      ? "Filled headcount increased compared with the previous period."
      : current.filled < previous.filled
        ? "Filled headcount decreased compared with the previous period."
        : current.requirement > previous.requirement
          ? "Requirement increased while filled headcount remained stable."
          : current.gap > previous.gap
            ? "Requirement-to-filled gap increased."
            : "Filled headcount is stable compared with the previous period."
    : "Growth will be calculated when a previous reporting period is available.";

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <GrowthKpi label="Current Requirement" value={formatNumber(current.requirement)} period={displayPeriod(current.period)} />
      <GrowthKpi label="Current Filled" value={formatNumber(current.filled)} period={displayPeriod(current.period)} />
      <GrowthKpi label="Growth %" value={formatGrowth(current.growth)} period={previous ? `vs ${displayPeriod(previous.period)}` : "Previous period unavailable"} tone={current.growth !== null && current.growth >= 0 ? "positive" : "neutral"} />
    </div>
    <div className="h-[300px]">
      {data.length > 1 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tickFormatter={displayPeriod} tick={{ fontSize: 10 }} minTickGap={18} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip content={<GrowthTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="requirement" name="Requirement" stroke={colors.requirement} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="filled" name="Filled" stroke={colors.filled} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">A second reporting period is needed to render the trend.</div>}
    </div>
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span className="font-semibold text-slate-800 dark:text-slate-100">Insight:</span> {insight}</div>
  </div>;
}

function GrowthKpi({ label, value, period, tone = "neutral" }: { label: string; value: string; period: string; tone?: "positive" | "neutral" }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold ${tone === "positive" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>{value}</p><p className="mt-1 text-[11px] text-slate-400">{period}</p></div>;
}

function GrowthTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GrowthPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"><p className="mb-2 font-semibold text-slate-900 dark:text-white">{displayPeriod(point.period)}</p><div className="space-y-1 text-slate-500"><p>Requirement: <strong className="text-slate-800 dark:text-slate-200">{formatNumber(point.requirement)}</strong></p><p>Filled: <strong className="text-slate-800 dark:text-slate-200">{formatNumber(point.filled)}</strong></p><p>Gap: <strong className="text-slate-800 dark:text-slate-200">{formatNumber(point.gap)}</strong></p><p>Growth: <strong className="text-slate-800 dark:text-slate-200">{formatGrowth(point.growth)}</strong></p></div></div>;
}
