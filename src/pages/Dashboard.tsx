// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// @ts-ignore
import { supabase } from "../services/supabase";
// @ts-ignore
import { useDashboardData } from "../hooks/useDashboardData";
import { useTheme } from "../hooks/useTheme";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import HeroWelcome from "../components/dashboard/HeroWelcome";
import KpiGrid from "../components/dashboard/KpiGrid";
import ChartsPanel from "../components/dashboard/charts/ChartsPanel";
import HeadcountTable from "../components/dashboard/HeadcountTable";
import LiveActivityFeed from "../components/dashboard/LiveActivityFeed";
import QuickActionsPanel from "../components/dashboard/QuickActionsPanel";
import ManagementModal from "../components/ManagementModal";
import ThreeBackground from "../components/dashboard/ThreeBackground";
import type { HeadcountRecord, UserProfile } from "../types/dashboard";

type ManagementTab = "companies" | "locations" | "coordinators";

export default function Dashboard() {
  const navigate = useNavigate();
  const { darkMode, toggle: toggleDark } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<ManagementTab>("companies");

  const {
    loading,
    companies,
    recentUpdates,
    filters,
    handleFilterChange,
    resetFilters,
    filteredTableData,
    kpis,
    companyWiseData,
    vacancyDistribution,
    hourlyData,
    dailyTrend,
    fetchData,
    lastSyncedAt,
  } = useDashboardData();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUser();
  }, []);

  const openManagement = (tab: ManagementTab) => {
    setManagementTab(tab);
    setManagementModalOpen(true);
  };

  const handleQuickAction = (action: "company" | "location" | "coordinator" | "entry") => {
    if (action === "entry") {
      navigate("/coordinator");
      return;
    }
    const tabMap: Record<"company" | "location" | "coordinator", ManagementTab> = {
      company: "companies",
      location: "locations",
      coordinator: "coordinators",
    };
    openManagement(tabMap[action]);
  };

  const handleRowAction = (action: "view" | "edit" | "delete" | "history", record: HeadcountRecord) => {
    toast(`${action[0].toUpperCase()}${action.slice(1)}: wire this up to your existing ${action} flow for ${record.company?.company_name ?? "this record"}`);
  };

  const handleExport = () => {
    toast("Wire this up to your CSV/Excel export utility");
  };

  return (
    <>
      <DashboardLayout
        darkMode={darkMode}
        onToggleDark={toggleDark}
        search={filters.search}
        onSearchChange={(v) => handleFilterChange("search", v)}
        notificationCount={kpis.todayUpdates}
        recentUpdates={recentUpdates}
        userProfile={userProfile}
        onRefresh={fetchData}
        lastSyncedAt={lastSyncedAt}
      >
        {/* Hero — command-center welcome band with ambient 3D depth */}
        <section
          className="animate-in fade-in relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 shadow-[0_20px_60px_-15px_rgba(30,27,75,0.45)] sm:p-8"
          aria-label="Welcome"
        >
          {/* Inner highlight ring for glass depth */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
          <ThreeBackground />
          <div className="relative z-10">
            <HeroWelcome userProfile={userProfile} onQuickAction={handleQuickAction} />
          </div>
        </section>

        <div className="animate-in fade-in space-y-8" style={{ animationDelay: "40ms" }}>
          <KpiGrid kpis={kpis} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="space-y-6 lg:col-span-3">
              <HeadcountTable
                data={filteredTableData}
                loading={loading}
                companies={companies}
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                onRowAction={handleRowAction}
                onExport={handleExport}
              />
            </div>
            <div className="space-y-6 lg:col-span-1">
              <LiveActivityFeed updates={recentUpdates} />
              <QuickActionsPanel
                onCompany={() => openManagement("companies")}
                onLocation={() => openManagement("locations")}
                onCoordinator={() => openManagement("coordinators")}
                onNewEntry={() => navigate("/coordinator")}
                onExport={handleExport}
                onRefresh={fetchData}
              />
            </div>
          </div>

          <ChartsPanel
            companyWiseData={companyWiseData}
            vacancyDistribution={vacancyDistribution}
            hourlyData={hourlyData}
            dailyTrend={dailyTrend}
            darkMode={darkMode}
          />
        </div>
      </DashboardLayout>

      <ManagementModal
        isOpen={managementModalOpen}
        onClose={() => setManagementModalOpen(false)}
        initialTab={managementTab}
        onDataChange={fetchData}
        darkMode={darkMode}
      />
    </>
  );
}