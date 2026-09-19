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
  ComposedChart,
} from "recharts";
import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

const AXIS_LIGHT = "#64748b";
const AXIS_DARK = "#94a3b8";
const GRID_LIGHT = "#e2e8f0";
const GRID_DARK = "#1e293b";

// Premium color palette - enhanced
const COLORS = {
  filled: "#10b981",
  filledGradient: "rgba(16, 185, 129, 0.2)",
  vacant: "#ef4444",
  vacantGradient: "rgba(239, 68, 68, 0.2)",
  requirement: "#6366f1",
  requirementGradient: "rgba(99, 102, 241, 0.2)",
  submissions: "#8b5cf6",
  trend: "#10b981",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f59e0b",
};

// Chart-specific color palettes
const CHART_COLORS = {
  bar: {
    filled: "#10b981",
    vacant: "#ef4444",
    requirement: "#6366f1",
  },
  pie: ["#10b981", "#ef4444"],
  area: {
    filled: "#10b981",
    requirement: "#6366f1",
    vacant: "#ef4444",
  },
  line: {
    submissions: "#8b5cf6",
  },
};

interface ChartsPanelProps {
  companyWiseData: { company: string; requirement: number; filled: number; vacant: number }[];
  vacancyDistribution: { name: string; value: number }[];
  hourlyData: { hour: number; submissions: number }[];
  dailyTrend: { date: string; requirement: number; filled: number; vacant: number }[];
  darkMode: boolean;
}

// Custom tooltip with better styling
const CustomTooltip = ({ active, payload, label, darkMode }: any) => {
  if (!active || !payload) return null;

  const isDark = darkMode;
  const bgColor = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const borderColor = isDark ? "rgba(51, 65, 85, 0.5)" : "rgba(226, 232, 240, 0.8)";
  const textColor = isDark ? "#e2e8f0" : "#0f172a";
  const subTextColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="rounded-xl border shadow-2xl backdrop-blur-xl" 
         style={{ 
           backgroundColor: bgColor,
           borderColor: borderColor,
           padding: "12px 16px",
           minWidth: "160px",
         }}>
      <p className="text-xs font-medium" style={{ color: subTextColor }}>
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-xs" style={{ color: subTextColor }}>{entry.name}</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: textColor }}>
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Loading skeleton component
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="animate-pulse">
    <div className="mb-3 h-4 w-32 rounded bg-slate-200/60 dark:bg-slate-700/60" />
    <div className="rounded-xl" style={{ height }}>
      <div className="flex h-full items-end justify-around px-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-full max-w-[60px] space-y-1">
            <div className="h-16 w-full rounded bg-slate-200/40 dark:bg-slate-700/40" />
            <div className="h-3 w-full rounded bg-slate-200/30 dark:bg-slate-700/30" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Chart card wrapper with glass effect
const ChartCard = ({ 
  title, 
  children, 
  className = "",
  trend,
  subtitle,
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  trend?: { value: number; label: string };
  subtitle?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border border-white/30 bg-white/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:border-slate-800/30 dark:bg-slate-900/80 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            trend.value > 0 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : trend.value < 0
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
              : 'bg-slate-50 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400'
          }`}>
            {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {trend.value !== 0 && Math.abs(trend.value)}%
            <span className="opacity-60">{trend.label}</span>
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
};

export default function ChartsPanel({
  companyWiseData,
  vacancyDistribution,
  hourlyData,
  dailyTrend,
  darkMode,
}: ChartsPanelProps) {
  const axisColor = darkMode ? AXIS_DARK : AXIS_LIGHT;
  const gridColor = darkMode ? GRID_DARK : GRID_LIGHT;
  const [isLoading, setIsLoading] = useState(false);

  // Calculate trend for filled positions
  const filledTrend = dailyTrend.length > 1 
    ? Math.round(((dailyTrend[dailyTrend.length - 1].filled - dailyTrend[0].filled) / (dailyTrend[0].filled || 1)) * 100)
    : 0;

  // Custom legend renderer
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap items-center justify-center gap-4 pt-2">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-300">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      {/* Company-wise Headcount Chart */}
      <ChartCard 
        title="Company-wise Headcount" 
        subtitle="Current filled vs vacant positions by company"
        trend={{ value: filledTrend, label: "vs last month" }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={companyWiseData} barGap={4} barSize={32}>
            <defs>
              <linearGradient id="filledGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="vacantGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="requirementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="company" 
              stroke={axisColor} 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke={axisColor} 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} cursor={{ opacity: 0.3 }} />
            <Legend content={renderLegend} />
            <Bar 
              dataKey="filled" 
              stackId="a" 
              fill="url(#filledGradient)" 
              name="Filled" 
              radius={[0, 0, 0, 0]}
              animationDuration={800}
              animationBegin={200}
            />
            <Bar 
              dataKey="vacant" 
              stackId="a" 
              fill="url(#vacantGradient)" 
              name="Vacant" 
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationBegin={400}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two-column layout for pie and line charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Filled vs Vacant" subtitle="Overall distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <defs>
                <radialGradient id="filledPieGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                </radialGradient>
                <radialGradient id="vacantPieGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </radialGradient>
              </defs>
              <Pie
                data={vacancyDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                animationDuration={1000}
                animationBegin={300}
              >
                <Cell fill="url(#filledPieGradient)" />
                <Cell fill="url(#vacantPieGradient)" />
              </Pie>
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Submissions" subtitle="Today's activity by hour">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} opacity={0.5} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${h}:00`}
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4' }} />
              <Area 
                type="monotone" 
                dataKey="submissions" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                fill="url(#hourlyGradient)"
                animationDuration={800}
                animationBegin={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Headcount Trend Chart */}
      <ChartCard 
        title="Headcount Trend" 
        subtitle="Last 30 days overview"
        trend={{ value: filledTrend, label: "growth" }}
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={dailyTrend}>
            <defs>
              <linearGradient id="trendFilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendRequirement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendVacant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke={axisColor} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              interval={3}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis 
              stroke={axisColor} 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4' }} />
            <Legend content={renderLegend} />
            <Area 
              type="monotone" 
              dataKey="requirement" 
              stroke="#6366f1" 
              strokeWidth={2.5}
              fill="url(#trendRequirement)"
              name="Requirement"
              animationDuration={800}
              animationBegin={200}
              dot={false}
            />
            <Area 
              type="monotone" 
              dataKey="filled" 
              stroke="#10b981" 
              strokeWidth={3}
              fill="url(#trendFilled)"
              name="Filled"
              animationDuration={800}
              animationBegin={400}
              dot={false}
            />
            <Area 
              type="monotone" 
              dataKey="vacant" 
              stroke="#ef4444" 
              strokeWidth={2.5}
              fill="url(#trendVacant)"
              name="Vacant"
              animationDuration={800}
              animationBegin={600}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Loading state (hidden by default) */}
      {isLoading && (
        <div className="space-y-6">
          <ChartSkeleton height={300} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartSkeleton height={280} />
            <ChartSkeleton height={280} />
          </div>
          <ChartSkeleton height={280} />
        </div>
      )}
    </div>
  );
}