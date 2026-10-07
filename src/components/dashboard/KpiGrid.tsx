// KpiGrid.tsx
import { Building2, MapPin, Users, UserCheck, UserX, Clock, UserCog, type LucideIcon } from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";
import { useEffect, useState, useMemo, memo } from "react";
import { supabase } from "../../services/supabase";
import { motion } from "framer-motion";

type Tone = "slate" | "indigo" | "violet" | "emerald" | "rose" | "amber" | "cyan";

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

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  subtext?: string;
  tone: Tone;
  progress?: number;
  isCoordinator?: boolean;
  trend?: number;
  status?: "success" | "warning" | "danger" | "info";
}

// Premium color palette with dark mode support
const COLOR_SCHEMES = {
  slate: {
    bg: "bg-slate-50/80 dark:bg-slate-800/60",
    border: "border-slate-200/50 dark:border-slate-700/50",
    icon: "text-slate-600 dark:text-slate-300",
    iconBg: "bg-slate-100/80 dark:bg-slate-700/50",
    progress: "bg-slate-500 dark:bg-slate-400",
    progressBg: "bg-slate-100 dark:bg-slate-700/50",
    glow: "shadow-slate-200/20 dark:shadow-slate-800/20",
    gradient: "from-slate-500/5 via-slate-400/5 to-slate-500/5 dark:from-slate-400/5 dark:via-slate-300/5 dark:to-slate-400/5",
    stream: "rgba(100, 116, 139, 0.1)",
    text: "text-slate-700 dark:text-slate-100",
    subtext: "text-slate-400/80 dark:text-slate-400/60",
    label: "text-slate-400 dark:text-slate-500",
    borderTop: "border-slate-100/80 dark:border-slate-700/50",
  },
  indigo: {
    bg: "bg-indigo-50/80 dark:bg-indigo-900/40",
    border: "border-indigo-200/50 dark:border-indigo-700/50",
    icon: "text-indigo-600 dark:text-indigo-300",
    iconBg: "bg-indigo-100/80 dark:bg-indigo-800/50",
    progress: "bg-indigo-500 dark:bg-indigo-400",
    progressBg: "bg-indigo-100 dark:bg-indigo-800/50",
    glow: "shadow-indigo-200/20 dark:shadow-indigo-800/20",
    gradient: "from-indigo-500/5 via-indigo-400/5 to-indigo-500/5 dark:from-indigo-400/5 dark:via-indigo-300/5 dark:to-indigo-400/5",
    stream: "rgba(99, 102, 241, 0.1)",
    text: "text-indigo-700 dark:text-indigo-100",
    subtext: "text-indigo-400/80 dark:text-indigo-400/60",
    label: "text-indigo-400 dark:text-indigo-500",
    borderTop: "border-indigo-100/80 dark:border-indigo-700/50",
  },
  violet: {
    bg: "bg-violet-50/80 dark:bg-violet-900/40",
    border: "border-violet-200/50 dark:border-violet-700/50",
    icon: "text-violet-600 dark:text-violet-300",
    iconBg: "bg-violet-100/80 dark:bg-violet-800/50",
    progress: "bg-violet-500 dark:bg-violet-400",
    progressBg: "bg-violet-100 dark:bg-violet-800/50",
    glow: "shadow-violet-200/20 dark:shadow-violet-800/20",
    gradient: "from-violet-500/5 via-violet-400/5 to-violet-500/5 dark:from-violet-400/5 dark:via-violet-300/5 dark:to-violet-400/5",
    stream: "rgba(139, 92, 246, 0.1)",
    text: "text-violet-700 dark:text-violet-100",
    subtext: "text-violet-400/80 dark:text-violet-400/60",
    label: "text-violet-400 dark:text-violet-500",
    borderTop: "border-violet-100/80 dark:border-violet-700/50",
  },
  emerald: {
    bg: "bg-emerald-50/80 dark:bg-emerald-900/40",
    border: "border-emerald-200/50 dark:border-emerald-700/50",
    icon: "text-emerald-600 dark:text-emerald-300",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-800/50",
    progress: "bg-emerald-500 dark:bg-emerald-400",
    progressBg: "bg-emerald-100 dark:bg-emerald-800/50",
    glow: "shadow-emerald-200/20 dark:shadow-emerald-800/20",
    gradient: "from-emerald-500/5 via-emerald-400/5 to-emerald-500/5 dark:from-emerald-400/5 dark:via-emerald-300/5 dark:to-emerald-400/5",
    stream: "rgba(16, 185, 129, 0.1)",
    text: "text-emerald-700 dark:text-emerald-100",
    subtext: "text-emerald-400/80 dark:text-emerald-400/60",
    label: "text-emerald-400 dark:text-emerald-500",
    borderTop: "border-emerald-100/80 dark:border-emerald-700/50",
  },
  rose: {
    bg: "bg-rose-50/80 dark:bg-rose-900/40",
    border: "border-rose-200/50 dark:border-rose-700/50",
    icon: "text-rose-600 dark:text-rose-300",
    iconBg: "bg-rose-100/80 dark:bg-rose-800/50",
    progress: "bg-rose-500 dark:bg-rose-400",
    progressBg: "bg-rose-100 dark:bg-rose-800/50",
    glow: "shadow-rose-200/20 dark:shadow-rose-800/20",
    gradient: "from-rose-500/5 via-rose-400/5 to-rose-500/5 dark:from-rose-400/5 dark:via-rose-300/5 dark:to-rose-400/5",
    stream: "rgba(244, 63, 94, 0.1)",
    text: "text-rose-700 dark:text-rose-100",
    subtext: "text-rose-400/80 dark:text-rose-400/60",
    label: "text-rose-400 dark:text-rose-500",
    borderTop: "border-rose-100/80 dark:border-rose-700/50",
  },
  amber: {
    bg: "bg-amber-50/80 dark:bg-amber-900/40",
    border: "border-amber-200/50 dark:border-amber-700/50",
    icon: "text-amber-600 dark:text-amber-300",
    iconBg: "bg-amber-100/80 dark:bg-amber-800/50",
    progress: "bg-amber-500 dark:bg-amber-400",
    progressBg: "bg-amber-100 dark:bg-amber-800/50",
    glow: "shadow-amber-200/20 dark:shadow-amber-800/20",
    gradient: "from-amber-500/5 via-amber-400/5 to-amber-500/5 dark:from-amber-400/5 dark:via-amber-300/5 dark:to-amber-400/5",
    stream: "rgba(245, 158, 11, 0.1)",
    text: "text-amber-700 dark:text-amber-100",
    subtext: "text-amber-400/80 dark:text-amber-400/60",
    label: "text-amber-400 dark:text-amber-500",
    borderTop: "border-amber-100/80 dark:border-amber-700/50",
  },
  cyan: {
    bg: "bg-cyan-50/80 dark:bg-cyan-900/40",
    border: "border-cyan-200/50 dark:border-cyan-700/50",
    icon: "text-cyan-600 dark:text-cyan-300",
    iconBg: "bg-cyan-100/80 dark:bg-cyan-800/50",
    progress: "bg-cyan-500 dark:bg-cyan-400",
    progressBg: "bg-cyan-100 dark:bg-cyan-800/50",
    glow: "shadow-cyan-200/20 dark:shadow-cyan-800/20",
    gradient: "from-cyan-500/5 via-cyan-400/5 to-cyan-500/5 dark:from-cyan-400/5 dark:via-cyan-300/5 dark:to-cyan-400/5",
    stream: "rgba(6, 182, 212, 0.1)",
    text: "text-cyan-700 dark:text-cyan-100",
    subtext: "text-cyan-400/80 dark:text-cyan-400/60",
    label: "text-cyan-400 dark:text-cyan-500",
    borderTop: "border-cyan-100/80 dark:border-cyan-700/50",
  },
};

const STATUS_INDICATORS = {
  success: "bg-emerald-400 dark:bg-emerald-500",
  warning: "bg-amber-400 dark:bg-amber-500",
  danger: "bg-rose-400 dark:bg-rose-500",
  info: "bg-blue-400 dark:bg-blue-500",
};

// Helper function to get progress status text and emoji
const getProgressStatus = (value: number) => {
  if (value === 100) return "✅ Complete";
  if (value >= 80) return "🎯 Near target";
  if (value >= 50) return "⚡ In progress";
  if (value > 0) return "📊 Needs attention";
  return "📊 Not started";
};

// Memoized KPI Card Component
const KpiCard = memo(({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
  progress,
  isCoordinator = false,
  trend,
  status,
}: KpiCardProps) => {
  const animatedValue = useCountUp(value);
  const colors = COLOR_SCHEMES[tone];
  const progressValue = useMemo(
    () => (typeof progress === "number" ? Math.min(Math.max(progress, 0), 100) : 0),
    [progress]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{
        y: -6,
        scale: 1.02,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
      }}
      className="group relative h-full"
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
           style={{
             background: `conic-gradient(from var(--angle, 0deg), transparent 0%, ${colors.stream} 25%, ${colors.stream} 50%, transparent 75%, transparent 100%)`,
           }}
      />
      
      {/* Card content with glass effect - Dark mode compatible */}
      <div className={`
        relative flex flex-col h-full p-5 rounded-2xl
        bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl
        border ${colors.border}
        shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
        transition-all duration-300
        ${colors.glow}
      `}>
        {/* Subtle background gradient */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Top streaming accent line */}
        <motion.div 
          className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Header section */}
        <div className="relative flex items-start justify-between mb-3">
          <div className={`
            flex items-center justify-center w-11 h-11 rounded-xl
            ${colors.iconBg} ${colors.icon}
            transition-all duration-300
            group-hover:scale-110 group-hover:rotate-[-4deg]
          `}>
            <Icon className="w-5 h-5" />
          </div>
          
          {/* Status badge or live indicator */}
          {isCoordinator && (
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/90 dark:bg-emerald-950/80 border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 dark:bg-emerald-400" />
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-300">Live</span>
            </motion.div>
          )}

          {status && !isCoordinator && (
            <div className={`w-2 h-2 rounded-full ${STATUS_INDICATORS[status]} shadow-lg`} />
          )}
        </div>

        {/* Content section - flex-grow to maintain alignment */}
        <div className="relative flex-1 flex flex-col">
          {/* Label */}
          <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${colors.label}`}>
            {label}
          </p>
          
          {/* Primary Value with animated counter */}
          <div className="flex items-end gap-2 mt-1.5">
            <motion.p 
              className={`text-3xl font-semibold tabular-nums ${colors.text}`}
              animate={isCoordinator ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isCoordinator ? value.toLocaleString() : animatedValue.toLocaleString()}
            </motion.p>
            
            {/* Trend indicator */}
            {trend !== undefined && (
              <span className={`text-[10px] font-medium ${trend >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>

          {/* Subtext */}
          {subtext && (
            <p className={`mt-1 text-xs ${colors.subtext}`}>
              {subtext}
            </p>
          )}
        </div>

        {/* Footer section with progress */}
        {typeof progress === "number" && (
          <div className={`relative mt-4 pt-3 border-t ${colors.borderTop}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-medium ${colors.label}`}>
                {getProgressStatus(progressValue)}
              </span>
              <span className={`text-[10px] font-mono font-semibold ${colors.text}`}>
                {Math.round(progressValue)}%
              </span>
            </div>
            
            {/* Premium progress bar with shimmer */}
            <div className={`relative h-1.5 w-full overflow-hidden rounded-full ${colors.progressBg}`}>
              <motion.div 
                className={`absolute inset-0 ${colors.progress} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  backgroundImage: `linear-gradient(90deg, 
                    ${colors.progress} 0%, 
                    ${colors.progress}dd 50%, 
                    ${colors.progress} 100%
                  )`,
                  backgroundSize: '200% 100%',
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer" />
              </motion.div>
            </div>
          </div>
        )}

        {/* Hover glow effect */}
        <div className={`
          absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 
          transition-opacity duration-500 pointer-events-none
          ${colors.glow}
        `} />
      </div>

      {/* Add keyframes for shimmer and border animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .shimmer {
          animation: shimmer 2s infinite;
        }

        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        
        @keyframes rotate-border {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
        }

        .group:hover .conic-border {
          animation: rotate-border 4s linear infinite;
        }
      `}</style>
    </motion.div>
  );
});

KpiCard.displayName = 'KpiCard';

// Main KPI Grid Component
export default function KpiGrid({ kpis }: { kpis: Kpis }) {
  const [coordinatorCount, setCoordinatorCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCoordinatorCount = async () => {
      try {
        setLoading(true);
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'COORDINATOR')
          .eq('status', 'ACTIVE');

        if (error) {
          console.error('Error fetching coordinator count:', error);
          setCoordinatorCount(kpis.totalCoordinators || 0);
        } else {
          setCoordinatorCount(count || 0);
        }
      } catch (error) {
        console.error('Error:', error);
        setCoordinatorCount(kpis.totalCoordinators || 0);
      } finally {
        setLoading(false);
      }
    };

    fetchCoordinatorCount();

    const subscription = supabase
      .channel('coordinator-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.COORDINATOR'
        },
        () => {
          fetchCoordinatorCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [kpis.totalCoordinators]);

  // Memoized calculations
  const correctVacant = useMemo(
    () => Math.max(0, kpis.totalRequirement - kpis.totalFilled),
    [kpis.totalRequirement, kpis.totalFilled]
  );
  
  const correctShortagePercent = useMemo(
    () => kpis.totalRequirement > 0 
      ? Math.round((correctVacant / kpis.totalRequirement) * 100) 
      : 0,
    [correctVacant, kpis.totalRequirement]
  );

  // Card configurations for maintainability
  const cardConfigs = useMemo(() => [
    {
      icon: Building2,
      label: "Companies",
      value: kpis.totalCompanies,
      subtext: `${kpis.activeCompanies} active`,
      tone: "indigo" as Tone,
    },
    {
      icon: MapPin,
      label: "Locations",
      value: kpis.totalLocations,
      tone: "violet" as Tone,
    },
    {
      icon: UserCog,
      label: "Coordinators",
      value: loading ? 0 : coordinatorCount,
      subtext: "Active coordinators",
      tone: "cyan" as Tone,
      isCoordinator: true,
    },
    {
      icon: Users,
      label: "Requirement",
      value: kpis.totalRequirement,
      tone: "slate" as Tone,
    },
    {
      icon: UserCheck,
      label: "Filled",
      value: kpis.totalFilled,
      subtext: `${kpis.filledPercent}% utilization`,
      tone: "emerald" as Tone,
      progress: kpis.filledPercent,
      status: kpis.filledPercent >= 80 ? "success" : kpis.filledPercent >= 50 ? "warning" : "danger",
    },
    {
      icon: UserX,
      label: "Vacant",
      value: correctVacant,
      subtext: `${correctShortagePercent}% shortage`,
      tone: "rose" as Tone,
      progress: correctShortagePercent,
      status: correctShortagePercent > 20 ? "danger" : correctShortagePercent > 10 ? "warning" : "success",
    },
    {
      icon: Clock,
      label: "Today's Updates",
      value: kpis.todayUpdates,
      subtext: `${kpis.weeklyUpdates} this week`,
      tone: "amber" as Tone,
      trend: kpis.weeklyUpdates > 0 ? Math.round((kpis.todayUpdates / kpis.weeklyUpdates) * 100) : 0,
    },
  ], [kpis, coordinatorCount, loading, correctVacant, correctShortagePercent]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 auto-rows-fr">
      {cardConfigs.map((config, index) => (
        <KpiCard
          key={config.label}
          {...config}
        />
      ))}
    </div>
  );
}