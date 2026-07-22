import { Building, Map, UserPlus, Plus, Download, RefreshCw, type LucideIcon } from "lucide-react";

type Tone = "teal" | "indigo" | "violet" | "emerald" | "slate" | "amber";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: Tone;
}

interface QuickActionsPanelProps {
  onCompany: () => void;
  onLocation: () => void;
  onCoordinator: () => void;
  onNewEntry: () => void;
  onExport: () => void;
  onRefresh: () => void;
}

const TONE_MAP: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20",
  indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20",
  violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
  emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
};

export default function QuickActionsPanel({
  onCompany,
  onLocation,
  onCoordinator,
  onNewEntry,
  onExport,
  onRefresh,
}: QuickActionsPanelProps) {
  const actions: QuickAction[] = [
    { icon: Building, label: "Company", onClick: onCompany, tone: "indigo" },
    { icon: Map, label: "Location", onClick: onLocation, tone: "violet" },
    { icon: UserPlus, label: "Coordinator", onClick: onCoordinator, tone: "teal" },
    { icon: Plus, label: "New Entry", onClick: onNewEntry, tone: "emerald" },
    { icon: Download, label: "Export", onClick: onExport, tone: "amber" },
    { icon: RefreshCw, label: "Refresh", onClick: onRefresh, tone: "slate" },
  ];

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 ${TONE_MAP[a.tone]}`}
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
