// src/components/layout/DashboardLayout.tsx
import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { supabase } from "../../services/supabase";
import type { HeadcountRecord } from "../../types/dashboard";

interface DashboardLayoutProps {
  children: ReactNode;
  darkMode: boolean;
  onToggleDark: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  notificationCount: number;
  recentUpdates: HeadcountRecord[];
  userProfile: any;
  onRefresh: () => void;
  lastSyncedAt: Date | null;
  /** Interval in milliseconds for automatic data refresh. Set to 0 to disable. Default 30000 (30s). */
  autoRefreshInterval?: number;
}

export default function DashboardLayout({
  children,
  darkMode,
  onToggleDark,
  search,
  onSearchChange,
  notificationCount,
  recentUpdates,
  userProfile,
  onRefresh,
  lastSyncedAt,
  autoRefreshInterval = 30000,   // default 30 seconds
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Auto‑refresh effect
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    const id = setInterval(() => {
      onRefresh();
    }, autoRefreshInterval);

    return () => clearInterval(id);
  }, [autoRefreshInterval, onRefresh]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
        <Header
          onMenuClick={() => setMobileOpen(true)}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
          search={search}
          onSearchChange={onSearchChange}
          notificationCount={notificationCount}
          recentUpdates={recentUpdates}
          userProfile={userProfile}
          onRefresh={onRefresh}
          lastSyncedAt={lastSyncedAt}
          onLogout={handleLogout}
        />
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}