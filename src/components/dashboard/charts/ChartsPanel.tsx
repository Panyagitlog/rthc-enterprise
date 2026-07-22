import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

const AXIS_LIGHT = "#64748b";
const AXIS_DARK = "#94a3b8";
const GRID_LIGHT = "#e2e8f0";
const GRID_DARK = "#1e293b";

interface ChartsPanelProps {
  companyWiseData: { company: string; requirement: number; filled: number; vacant: number }[];
  vacancyDistribution: { name: string; value: number }[];
  hourlyData: { hour: number; submissions: number }[];
  dailyTrend: { date: string; requirement: number; filled: number; vacant: number }[];
  darkMode: boolean;
}

function tooltipStyle(darkMode: boolean) {
  return darkMode
    ? { backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", borderRadius: 8, fontSize: 12 }
    : { borderRadius: 8, fontSize: 12, borderColor: "#e2e8f0" };
}

export default function ChartsPanel({
  companyWiseData,
  vacancyDistribution,
  hourlyData,
  dailyTrend,
  darkMode,
}: ChartsPanelProps) {
  const axisColor = darkMode ? AXIS_DARK : AXIS_LIGHT;
  const gridColor = darkMode ? GRID_DARK : GRID_LIGHT;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
        <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Company-wise Headcount</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={companyWiseData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="company" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle(darkMode)} />
            <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
            <Bar dataKey="filled" stackId="a" fill="#0d9488" name="Filled" />
            <Bar dataKey="vacant" stackId="a" fill="#f43f5e" name="Vacant" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
          <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Filled vs Vacant</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={vacancyDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                <Cell fill="#0d9488" />
                <Cell fill="#f43f5e" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle(darkMode)} />
              <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
          <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Hourly Submissions (Today)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${h}:00`}
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle(darkMode)} />
              <Line type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
        <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Headcount Trend — Last 30 Days</h4>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dailyTrend}>
            <defs>
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} interval={4} />
            <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle(darkMode)} />
            <Area type="monotone" dataKey="filled" stroke="#0d9488" fill="url(#fillGradient)" strokeWidth={2} name="Filled" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
