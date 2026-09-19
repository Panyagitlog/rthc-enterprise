// LiveActivityFeed.tsx
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, Users, Building, MapPin, Activity, Zap, 
  TrendingUp, TrendingDown, Calendar, BarChart3,
  PieChart, ChevronRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HeadcountRecord } from "../../types/dashboard";

interface LiveActivityFeedProps {
  updates: HeadcountRecord[];
  maxHeight?: string;
}

export default function LiveActivityFeed({ 
  updates, 
  maxHeight = "500px" 
}: LiveActivityFeedProps) {
  // Sort updates by created_at (newest first)
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative rounded-2xl border border-white/30 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/40 backdrop-blur-xl p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]">
      {/* Header with Date Only */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-1.5 shadow-lg shadow-blue-500/20 dark:shadow-blue-600/30">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight leading-none">
              Live Activity
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 border border-emerald-500/20 dark:border-emerald-500/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-white/30 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
            {updates.length} updates
          </span>
        </div>
      </div>

      {/* Feed */}
      <div 
        className="relative overflow-y-auto pr-1 custom-scrollbar"
        style={{ maxHeight }}
      >
        {/* Timeline */}
        <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-0.5 bg-gradient-to-b from-blue-500/20 via-slate-200/30 dark:via-slate-700/30 to-transparent" />
        
        <AnimatePresence mode="popLayout">
          {sortedUpdates.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="rounded-full bg-white/30 dark:bg-slate-800/50 p-3 backdrop-blur-sm">
                <Clock className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-400 dark:text-gray-500">No recent updates</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">Waiting for activity to appear</p>
            </motion.div>
          ) : (
            sortedUpdates.map((u, index) => {
              const filled = u.filled || 0;
              const required = u.requirement || 1;
              const vacant = u.vacant || 0;
              const percentage = Math.min((filled / required) * 100, 100);
              const isComplete = percentage >= 100;
              const isOverfilled = vacant < 0;
              const timeAgo = formatDistanceToNow(new Date(u.created_at), { addSuffix: true });

              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="relative pl-7 pb-3 last:pb-0 group"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[3px] top-1.5 flex h-5 w-5 items-center justify-center">
                    <div className={`absolute h-2.5 w-2.5 rounded-full ${
                      isComplete ? 'bg-emerald-500 dark:bg-emerald-400' : 
                      isOverfilled ? 'bg-amber-500 dark:bg-amber-400' :
                      vacant > 0 ? 'bg-rose-500 dark:bg-rose-400' : 'bg-blue-500 dark:bg-blue-400'
                    } shadow-lg ${
                      isComplete ? 'shadow-emerald-500/30 dark:shadow-emerald-400/30' : 
                      isOverfilled ? 'shadow-amber-500/30 dark:shadow-amber-400/30' :
                      vacant > 0 ? 'shadow-rose-500/30 dark:shadow-rose-400/30' : 'shadow-blue-500/30 dark:shadow-blue-400/30'
                    }`}>
                      <div className={`absolute inset-0 rounded-full ${
                        isComplete ? 'bg-emerald-400 dark:bg-emerald-300' : 
                        isOverfilled ? 'bg-amber-400 dark:bg-amber-300' :
                        vacant > 0 ? 'bg-rose-400 dark:bg-rose-300' : 'bg-blue-400 dark:bg-blue-300'
                      } animate-ping opacity-75`} />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="rounded-xl border border-white/30 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/40 p-3 backdrop-blur-sm hover:bg-white/30 dark:hover:bg-slate-800/60 transition-all hover:shadow-md dark:hover:shadow-slate-800/30">
                    {/* Header: Coordinator & Time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {u.coordinator?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          <Building className="inline h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{u.company?.company_name || "N/A"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <Clock className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                          {format(new Date(u.created_at), "hh:mm a")}
                        </span>
                      </div>
                    </div>

                    {/* Location & Time Ago */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {u.location?.location_name || "Unknown Location"}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium bg-white/30 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-full">
                        {timeAgo}
                      </span>
                    </div>

                    {/* Stats Grid - 3 columns with icons */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      <div className="rounded-lg bg-white/30 dark:bg-slate-800/50 p-1.5 text-center backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-0.5">
                          <Users className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
                          <p className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Required</p>
                        </div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{required}</p>
                      </div>
                      <div className={`rounded-lg p-1.5 text-center backdrop-blur-sm border ${
                        isComplete 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30' 
                          : 'bg-white/30 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50'
                      }`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <TrendingUp className={`h-2.5 w-2.5 ${isComplete ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                          <p className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Filled</p>
                        </div>
                        <p className={`text-xs font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {filled}
                        </p>
                      </div>
                      <div className={`rounded-lg p-1.5 text-center backdrop-blur-sm border ${
                        isOverfilled 
                          ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 dark:border-amber-500/30' 
                          : vacant > 0 
                            ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 dark:border-rose-500/30'
                            : 'bg-white/30 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50'
                      }`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <TrendingDown className={`h-2.5 w-2.5 ${
                            isOverfilled ? 'text-amber-500 dark:text-amber-400' : 
                            vacant > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'
                          }`} />
                          <p className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vacant</p>
                        </div>
                        <p className={`text-xs font-semibold ${
                          isOverfilled 
                            ? 'text-amber-600 dark:text-amber-400' 
                            : vacant > 0 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {vacant}
                        </p>
                      </div>
                    </div>

                    {/* Graphical Analytics - Mini Chart */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <PieChart className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
                          <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Completion
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-semibold ${
                            isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {Math.round(percentage)}%
                          </span>
                          {/* Status indicator */}
                          {isComplete && (
                            <Sparkles className="h-2.5 w-2.5 text-emerald-500 dark:text-emerald-400" />
                          )}
                          {isOverfilled && !isComplete && (
                            <TrendingUp className="h-2.5 w-2.5 text-amber-500 dark:text-amber-400" />
                          )}
                          {!isComplete && !isOverfilled && vacant > 0 && (
                            <TrendingDown className="h-2.5 w-2.5 text-rose-500 dark:text-rose-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Progress bar with gradient */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/30 dark:bg-slate-800/50 backdrop-blur-sm">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isComplete 
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-300 dark:to-emerald-500' 
                              : isOverfilled
                                ? 'bg-gradient-to-r from-amber-400 to-amber-600 dark:from-amber-300 dark:to-amber-500'
                                : vacant > 0
                                  ? 'bg-gradient-to-r from-rose-400 to-rose-600 dark:from-rose-300 dark:to-rose-500'
                                  : 'bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-300 dark:to-blue-500'
                          }`}
                          style={{ 
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s infinite linear'
                          }}
                        />
                      </div>

                      {/* Mini bar chart - shows distribution */}
                      <div className="flex items-center gap-0.5 mt-1 h-3">
                        <div className="flex-1 flex items-end gap-0.5">
                          {[...Array(6)].map((_, i) => {
                            const height = Math.random() * 100;
                            const isActive = i < Math.round((filled / required) * 6);
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-sm transition-all duration-500 ${
                                  isActive 
                                    ? isComplete 
                                      ? 'bg-emerald-400 dark:bg-emerald-500' 
                                      : 'bg-blue-400 dark:bg-blue-500'
                                    : 'bg-gray-200/50 dark:bg-gray-700/50'
                                }`}
                                style={{ 
                                  height: `${isActive ? Math.max(20, height) : 20}%`,
                                  opacity: isActive ? 1 : 0.4
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-0.5 ml-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isComplete ? 'bg-emerald-500 dark:bg-emerald-400' : 
                            isOverfilled ? 'bg-amber-500 dark:bg-amber-400' :
                            vacant > 0 ? 'bg-rose-500 dark:bg-rose-400' : 'bg-blue-500 dark:bg-blue-400'
                          }`} />
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono">
                            {filled}/{required}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isComplete && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
                          <Sparkles className="h-2.5 w-2.5" />
                          Complete
                        </span>
                      )}
                      {isOverfilled && !isComplete && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Overfilled (+{Math.abs(vacant)})
                        </span>
                      )}
                      {!isComplete && !isOverfilled && vacant > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30">
                          <TrendingDown className="h-2.5 w-2.5" />
                          {vacant} vacant {vacant > 1 ? 'positions' : 'position'}
                        </span>
                      )}
                      {!isComplete && !isOverfilled && vacant === 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30">
                          <Activity className="h-2.5 w-2.5" />
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer with Analytics Summary */}
      <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {updates.length} {updates.length === 1 ? 'update' : 'updates'}
          </span>
          {updates.length > 0 && (
            <>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">
                    {updates.filter(u => ((u.filled || 0) / (u.requirement || 1)) >= 1).length} complete
                  </span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">
                    {updates.filter(u => (u.vacant || 0) > 0).length} open
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-2.5 w-2.5 text-blue-400 dark:text-blue-500" />
          <span className="text-[9px] text-gray-300 dark:text-gray-600">Auto-sync</span>
          <ChevronRight className="h-2.5 w-2.5 text-gray-300 dark:text-gray-600" />
        </div>
      </div>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37,99,235,0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37,99,235,0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30,41,59,0.3);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37,99,235,0.4);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37,99,235,0.6);
        }
      `}</style>
    </div>
  );
}