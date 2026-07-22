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
    <div className="group relative overflow-hidden rounded-[22px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_-28px_rgba(15,23,42,0.35)] dark:border-slate-800/60 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/60 dark:shadow-[0_18px_60px_-28px_rgba(2,6,23,0.48)] dark:hover:shadow-[0_28px_80px_-28px_rgba(2,6,23,0.55)] card-3d">
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent dark:from-white/10 dark:via-transparent dark:to-transparent" />
      <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-gradient-to-r from-blue-400/10 to-violet-400/10 blur-2xl group-hover:blur-3xl transition-all" />
      
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${CHIP_TONE[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="relative mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{animated.toLocaleString()}</p>
      {subtext && <p className="relative mt-1 text-xs text-slate-400 dark:text-slate-500">{subtext}</p>}
      {typeof progress === "number" && (
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100/80 dark:bg-slate-800/80">
          <div className={`h-full rounded-full ${BAR_TONE[tone]} transition-all duration-700 shadow-[0_0_12px_currentColor]/50`} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
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
