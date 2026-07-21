import { Building2, MapPin, Users, UserCheck, UserX, Clock, UserCog, type LucideIcon } from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";

type Tone = "teal" | "indigo" | "violet" | "emerald" | "rose" | "amber";

interface Kpis {
  totalCompanies: number;
  activeCompanies: number;
  totalLocations: number;
  totalCoordinators: number;
  totalRequirement: number;
  totalFilled: number;
  totalVacant: number;
  todayUpdates: number;
  weeklyUpdates: number;
  filledPercent: number;
  shortagePercent: number;
}

const CHIP_TONE: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
};

const BAR_TONE: Record<Tone, string> = {
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  subtext?: string;
  tone: Tone;
  progress?: number;
}) {
  const animated = useCountUp(value);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${CHIP_TONE[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {animated.toLocaleString()}
      </p>
      {subtext && <p className="text-xs text-slate-400 dark:text-slate-500">{subtext}</p>}
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${BAR_TONE[tone]} transition-all duration-700`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function KpiGrid({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <KpiCard icon={Building2} label="Companies" value={kpis.totalCompanies} subtext={`${kpis.activeCompanies} active`} tone="indigo" />
      <KpiCard icon={MapPin} label="Locations" value={kpis.totalLocations} tone="violet" />
      <KpiCard icon={UserCog} label="Coordinators" value={kpis.totalCoordinators} tone="teal" />
      <KpiCard icon={Users} label="Requirement" value={kpis.totalRequirement} tone="indigo" />
      <KpiCard
        icon={UserCheck}
        label="Filled"
        value={kpis.totalFilled}
        subtext={`${kpis.filledPercent}% utilization`}
        tone="emerald"
        progress={kpis.filledPercent}
      />
      <KpiCard
        icon={UserX}
        label="Vacant"
        value={kpis.totalVacant}
        subtext={`${kpis.shortagePercent}% shortage`}
        tone="rose"
        progress={kpis.shortagePercent}
      />
      <KpiCard icon={Clock} label="Today's Updates" value={kpis.todayUpdates} subtext={`${kpis.weeklyUpdates} this week`} tone="amber" />
    </div>
  );
}
