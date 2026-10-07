import { Building, Map, UserPlus, Plus, Download, RefreshCw, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

type Tone = "teal" | "indigo" | "violet" | "emerald" | "slate" | "amber";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: Tone;
  description?: string;
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
  teal: "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20 border-teal-200/50 dark:border-teal-500/20",
  indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 border-indigo-200/50 dark:border-indigo-500/20",
  violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 border-violet-200/50 dark:border-violet-500/20",
  emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 border-emerald-200/50 dark:border-emerald-500/20",
  amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 border-amber-200/50 dark:border-amber-500/20",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200/50 dark:border-slate-700",
};

const ICON_BG_MAP: Record<Tone, string> = {
  teal: "bg-teal-200/50 dark:bg-teal-500/20",
  indigo: "bg-indigo-200/50 dark:bg-indigo-500/20",
  violet: "bg-violet-200/50 dark:bg-violet-500/20",
  emerald: "bg-emerald-200/50 dark:bg-emerald-500/20",
  amber: "bg-amber-200/50 dark:bg-amber-500/20",
  slate: "bg-slate-200/50 dark:bg-slate-700/50",
};

export default function QuickActionsPanel({
  onCompany,
  onLocation,
  onCoordinator,
  onNewEntry,
  onExport,
  onRefresh,
}: QuickActionsPanelProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const actions: QuickAction[] = [
    { 
      icon: Building, 
      label: "Company", 
      onClick: onCompany, 
      tone: "indigo",
      description: "Manage companies"
    },
    { 
      icon: Map, 
      label: "Location", 
      onClick: onLocation, 
      tone: "violet",
      description: "Manage locations"
    },
    { 
      icon: UserPlus, 
      label: "Coordinator", 
      onClick: onCoordinator, 
      tone: "teal",
      description: "Add coordinator"
    },
    { 
      icon: Plus, 
      label: "New Entry", 
      onClick: onNewEntry, 
      tone: "emerald",
      description: "Create new entry"
    },
    { 
      icon: Download, 
      label: "Export", 
      onClick: onExport, 
      tone: "amber",
      description: "Export data"
    },
    { 
      icon: RefreshCw, 
      label: "Refresh", 
      onClick: onRefresh, 
      tone: "slate",
      description: "Refresh data"
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80"
    >
      {/* Header with icon and badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-2 dark:from-blue-500/20 dark:to-indigo-500/20">
            <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Quick Actions
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {actions.length} actions available
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          Live
        </span>
      </div>

      {/* Action Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-2.5"
      >
        {actions.map((action) => (
          <motion.button
            key={action.label}
            variants={itemVariants}
            onClick={action.onClick}
            onMouseEnter={() => setHoveredAction(action.label)}
            onMouseLeave={() => setHoveredAction(null)}
            className={`
              group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl 
              border px-3 py-3 text-xs font-semibold transition-all duration-200
              hover:-translate-y-1 hover:shadow-lg active:scale-[0.96]
              ${TONE_MAP[action.tone]}
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
          >
            {/* Background glow effect */}
            <div className={`
              absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
              ${ICON_BG_MAP[action.tone]} group-hover:opacity-100
            `} />
            
            {/* Icon with container */}
            <div className="relative">
              <div className={`
                rounded-xl p-1.5 transition-all duration-200
                ${ICON_BG_MAP[action.tone]} 
                group-hover:scale-110
              `}>
                <action.icon className="relative h-4 w-4 transition-transform duration-200" />
              </div>
            </div>
            
            {/* Label */}
            <span className="relative text-[10px] font-medium tracking-tight">
              {action.label}
            </span>

            {/* Tooltip on hover */}
            {hoveredAction === action.label && action.description && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg 
                  bg-slate-800 px-2.5 py-1 text-[8px] font-medium text-white shadow-lg
                  dark:bg-slate-700"
              >
                {action.description}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
                  border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Footer with quick stats */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
        <div className="flex items-center gap-3 text-[9px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            System ready
          </span>
          <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
          <span>v2.0.0</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-medium 
            text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700
            dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <RefreshCw className="h-3 w-3" />
          Sync
        </button>
      </div>
    </motion.div>
  );
}