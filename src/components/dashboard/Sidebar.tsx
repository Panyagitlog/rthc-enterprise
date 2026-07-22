import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  MapPinned,
  UserCog,
  Users,
  FileBarChart,
  BarChart3,
  History,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
// @ts-ignore
import { supabase } from "../../services/supabase";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Companies", icon: Building, path: "/companies" },
  { label: "Locations", icon: MapPinned, path: "/locations" },
  { label: "Coordinators", icon: UserCog, path: "/coordinators" },
  { label: "Head Count", icon: Users, path: "/headcount" },
  { label: "Reports", icon: FileBarChart, path: "/reports" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Audit Logs", icon: History, path: "/audit-logs" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.4)] backdrop-blur-xl transition-all duration-300 ease-out dark:border-slate-800/70 dark:bg-slate-950/80
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/70 px-4 dark:border-slate-800/70">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white-600 to-orange-100 text-xs font-bold text-white shadow-lg shadow-blue-500/20">
              <img src="/dmcfs.svg" alt="DMCFS logo" className="h-6 w-6" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  DMCFS
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                  Enterprise platform
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${
                  active
                    ? "bg-gradient-to-r from-blue-600/12 to-violet-600/12 text-blue-700 shadow-sm dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 rounded-full ${active ? "bg-gradient-to-b from-blue-600 to-violet-600" : "bg-transparent"}`}
                />
                <item.icon
                  className={`h-5 w-5 shrink-0 ${active ? "text-blue-600 dark:text-blue-300" : ""}`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200/70 p-3 dark:border-slate-800/70">
          <button
            onClick={onToggleCollapsed}
            className="hidden w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
            {!collapsed && "Collapse"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}