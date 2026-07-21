import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, Bell, Moon, Sun, RefreshCw, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import type { HeadcountRecord } from "../../types/dashboard";

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
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>

          <span className="hidden text-sm text-slate-400 dark:text-slate-500 md:inline">
            {format(new Date(), "EEEE, MMM d, yyyy")}
          </span>

          <div className="relative ml-1 hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search companies, locations, coordinators…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-teal-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div title={online ? "Connected" : "Offline"} className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
            {online ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-red-500" />}
            {lastSyncedAt && <span>synced {format(lastSyncedAt, "hh:mm a")}</span>}
          </div>

          <button
            onClick={onRefresh}
            title="Refresh"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Today's updates
                </p>
                <div className="max-h-72 overflow-y-auto">
                  {recentUpdates.length === 0 && (
                    <p className="px-2 py-3 text-sm text-slate-400">No updates yet today</p>
                  )}
                  {recentUpdates.map((u) => (
                    <div key={u.id} className="rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <p className="text-slate-700 dark:text-slate-200">
                        <span className="font-medium">{u.coordinator?.name || "Unknown"}</span> updated{" "}
                        <span className="font-medium">{u.company?.company_name}</span>
                      </p>
                      <p className="text-xs text-slate-400">{format(new Date(u.created_at), "hh:mm a")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleDark}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
                {userProfile?.name?.[0] || "U"}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:inline">
                {userProfile?.name || "User"}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:inline" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{userProfile?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userProfile?.email}</p>
                </div>
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Settings
                </Link>
                <button
                  onClick={onLogout}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
