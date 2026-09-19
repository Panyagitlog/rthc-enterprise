import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, Bell, Moon, Sun, RefreshCw, ChevronDown, Wifi, WifiOff, Sparkles, X, Check, Globe, Settings, User, LogOut } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { HeadcountRecord } from "../../types/dashboard";
import DMCFSLogo from "../brand/DMCFSLogo";

interface HeaderProps {
  onMenuClick: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  notificationCount: number;
  recentUpdates: HeadcountRecord[];
  userProfile: any;
  onRefresh: () => void;
  lastSyncedAt: Date | null;
  onLogout: () => void;
}

export default function Header({
  onMenuClick,
  darkMode,
  onToggleDark,
  search,
  onSearchChange,
  notificationCount,
  recentUpdates,
  userProfile,
  onRefresh,
  lastSyncedAt,
  onLogout,
}: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-30 border-b border-white/30 bg-white/80 backdrop-blur-2xl shadow-sm shadow-slate-200/20 dark:border-slate-800/30 dark:bg-slate-950/80 dark:shadow-slate-900/20"
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left Section */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Menu Button */}
          <motion.button
            onClick={onMenuClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl border border-slate-200/60 bg-white/70 p-2 text-slate-600 shadow-sm shadow-slate-200/20 transition-all hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          <div className="hidden items-center gap-3 border-l border-slate-200/70 pl-3 dark:border-slate-700/70 md:flex">
            <DMCFSLogo size="sm" className="w-[118px]" />
            <div className="hidden leading-tight xl:block">
              <p className="text-xs font-bold tracking-[0.16em] text-slate-800 dark:text-slate-100">RTHC</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Real-Time Head Count</p>
            </div>
          </div>

          {/* Status Badge */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="hidden items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:flex"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </motion.div>

          {/* Date Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden items-center gap-2 rounded-full border border-slate-200/60 bg-slate-50/80 px-3.5 py-1.5 text-sm text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400 md:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            {format(new Date(), "EEEE, MMM d, yyyy")}
          </motion.div>

          {/* Global Search */}
          <div className="relative ml-1 hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <motion.input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search companies, locations, coordinators…"
              className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm shadow-slate-200/10 transition-all placeholder:text-slate-400 focus:border-blue-500/60 focus:bg-white focus:shadow-md focus:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              whileFocus={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
            {search && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Sync Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            title={online ? "Connected" : "Offline"}
            className="hidden items-center gap-2 rounded-full border border-slate-200/60 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400 sm:flex"
          >
            {online ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
            {lastSyncedAt && (
              <span className="hidden md:inline">
                synced {format(lastSyncedAt, "hh:mm a")}
              </span>
            )}
          </motion.div>

          {/* Refresh Button */}
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative rounded-full border border-slate-200/60 bg-white/70 p-2 text-slate-600 shadow-sm shadow-slate-200/20 transition-all hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <RefreshCw className="h-5 w-5" />
            </motion.div>
          </motion.button>

          {/* Notifications */}
          <div className="relative">
            <motion.button
              onClick={() => setNotifOpen(!notifOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative rounded-full border border-slate-200/60 bg-white/70 p-2 text-slate-600 shadow-sm shadow-slate-200/20 transition-all hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-sm shadow-red-500/30"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/30 bg-white/95 p-2 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/95 dark:shadow-slate-900/50"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Today's updates
                    </p>
                    {notificationCount > 0 && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        {notificationCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {recentUpdates.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Check className="h-8 w-8 text-emerald-400" />
                        <p className="mt-2 text-sm text-slate-400">All caught up</p>
                      </div>
                    )}
                    {recentUpdates.map((u, index) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl px-3 py-2.5 transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-medium">{u.coordinator?.name || "Unknown"}</span>
                          {" updated "}
                          <span className="font-medium">{u.company?.company_name}</span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="text-xs text-slate-400">
                            {format(new Date(u.created_at), "hh:mm a")}
                          </p>
                          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="text-xs text-slate-400">Headcount updated</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <motion.button
            onClick={onToggleDark}
            aria-label="Toggle color theme"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/60 bg-white/70 shadow-sm shadow-slate-200/20 transition-all hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:bg-slate-900"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 opacity-0 transition group-hover:opacity-100" />
            {darkMode ? (
              <Sun className="relative h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="relative h-5 w-5 text-slate-600" />
            )}
          </motion.button>

          {/* User Profile */}
          <div className="relative">
            <motion.button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-white/70 p-1.5 shadow-sm shadow-slate-200/20 transition-all hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:bg-slate-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 font-semibold text-white shadow-sm shadow-blue-500/30">
                {userProfile?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
                {userProfile?.name || "User"}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:inline" />
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/30 bg-white/95 py-1 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/95 dark:shadow-slate-900/50"
                >
                  <div className="border-b border-slate-100/70 px-4 py-3 dark:border-slate-700/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {userProfile?.name || "User"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {userProfile?.email || "user@example.com"}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-all hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-all hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Settings
                    </Link>
                    <button
                      onClick={onLogout}
                      className="flex w-full items-center gap-3 border-t border-slate-100/70 px-4 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50/50 dark:border-slate-700/50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }
      `}</style>
    </motion.header>
  );
}