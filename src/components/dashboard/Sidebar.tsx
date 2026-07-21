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
  type LucideIcon,
} from "lucide-react";
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

export default function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapsed }: SidebarProps) {
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-900
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        ${collapsed ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
              RT
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-teal-400" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-400" />
            </div>
            {!collapsed && (
              <span className="truncate font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                RTHC Enterprise
              </span>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
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
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-teal-600 dark:text-teal-300" : ""}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={onToggleCollapsed}
            className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:flex"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && "Collapse"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
