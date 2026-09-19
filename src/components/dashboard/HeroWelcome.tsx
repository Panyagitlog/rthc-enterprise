import { Building, Plus, UserPlus, Map as MapIcon, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { UserProfile } from "../../types/dashboard";

interface HeroWelcomeProps {
  userProfile: UserProfile | null;
  onQuickAction: (action: "company" | "location" | "coordinator" | "entry") => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HeroWelcome({ userProfile, onQuickAction }: HeroWelcomeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.03,
      y: -2,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    tap: {
      scale: 0.97,
      transition: { duration: 0.1, ease: "easeOut" },
    },
  };

  const primaryButtonVariants = {
    hover: {
      scale: 1.05,
      y: -2,
      boxShadow: "0 8px 40px rgba(59, 130, 246, 0.5)",
      transition: { duration: 0.2, ease: "easeOut" },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1, ease: "easeOut" },
    },
  };

  const quickActions = [
    { action: "company" as const, icon: Building, label: "New Company" },
    { action: "location" as const, icon: MapIcon, label: "New Location" },
    { action: "coordinator" as const, icon: UserPlus, label: "New Coordinator" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/95 via-yellow-900/95 to-blue-950/95 p-[1px] shadow-[0_12px_40px_-20px_rgba(15,23,42,0.6)] backdrop-blur-xl"
    >
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-blue-500/30 opacity-60 blur-sm animate-pulse" />
      
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-blue-950/95 p-4 backdrop-blur-xl sm:p-5">
        {/* Floating gradients - more subtle */}
        <motion.div
          animate={{
            x: [0, 15, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -10, 0],
            y: [0, 10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl"
        />
        
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.04),transparent_40%)]" />

        <div className="relative">
          {/* Header row - always visible */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-100 backdrop-blur-sm flex-shrink-0"
              >
                <Sparkles className="h-2.5 w-2.5 text-blue-300" />
                <span className="hidden sm:inline">{format(new Date(), "EEE, MMM d")}</span>
                <span className="sm:hidden">{format(new Date(), "MMM d")}</span>
              </motion.div>
              
              <motion.h2
                variants={itemVariants}
                className="text-base font-bold tracking-tight text-white sm:text-lg truncate"
              >
                {getGreeting()},{" "}
                <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
                  {userProfile?.name?.split(" ")[0] || "there"}
                </span>
              </motion.h2>

              {userProfile?.role && (
                <span className="hidden md:inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-medium text-blue-200 flex-shrink-0">
                  {userProfile.role}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Quick action buttons - smaller */}
              <div className="hidden sm:flex items-center gap-1.5">
                {quickActions.map(({ action, icon: Icon, label }) => (
                  <motion.button
                    key={action}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => onQuickAction(action)}
                    className="group inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20 active:bg-white/10"
                  >
                    <Icon className="h-3 w-3 text-slate-400 transition-colors group-hover:text-blue-300" />
                    <span className="hidden lg:inline tracking-wide">{label}</span>
                  </motion.button>
                ))}
              </div>
              
              <motion.button
                variants={primaryButtonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => onQuickAction("entry")}
                className="group inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1.5 text-[9px] font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 active:shadow-blue-500/20"
              >
                <Plus className="h-3 w-3 transition-transform group-hover:rotate-90" />
                <span className="hidden xs:inline tracking-wide">New Entry</span>
                <span className="xs:hidden">Add</span>
              </motion.button>

              {/* Expand/Collapse button */}
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-white/10">
                  <motion.p
                    variants={itemVariants}
                    className="text-xs text-slate-300/90 sm:text-sm"
                  >
                    <span className="text-slate-300">
                      {userProfile?.company_id ? "Monitoring your assigned companies" : "Enterprise-wide monitoring"}
                    </span>
                    {userProfile?.last_login && (
                      <>
                        <span className="mx-2 text-slate-500">·</span>
                        <span className="text-[10px] text-slate-400">
                          Last login {format(new Date(userProfile.last_login), "MMM d, hh:mm a")}
                        </span>
                      </>
                    )}
                  </motion.p>

                  {/* Mobile quick actions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:hidden">
                    {quickActions.map(({ action, icon: Icon, label }) => (
                      <motion.button
                        key={action}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => onQuickAction(action)}
                        className="group inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-medium text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20"
                      >
                        <Icon className="h-3 w-3 text-slate-400 transition-colors group-hover:text-blue-300" />
                        <span className="tracking-wide">{label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Additional info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] text-slate-400">System online</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-500">•</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {userProfile?.email && (
                      <>
                        <span className="text-[9px] text-slate-500">•</span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[150px]">
                          {userProfile.email}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decorative line */}
        <motion.div
          variants={itemVariants}
          className="absolute bottom-0 left-0 h-[1.5px] w-20 bg-gradient-to-r from-blue-500/40 to-transparent"
        />
      </div>
    </motion.div>
  );
}