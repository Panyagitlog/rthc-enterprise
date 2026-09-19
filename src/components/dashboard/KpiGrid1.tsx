import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  MapPin, 
  UserCheck,
  Calendar,
  Activity,
  Bell,
  Settings,
  Search,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import DashboardKpiCard from '../DashboardKpiCard';
import { supabase } from '../../services/supabase.js';

interface DashboardData {
  todayRequirement: number;
  todayFilled: number;
  todayVacant: number;
  todayUpdates: number;
  companies: number;
  locations: number;
  coordinators: number;
}

interface ShiftRequirement {
  id: string;
  company_id: string;
  location_id: string;
  coordinator_id: string;
  requirement: number;
  filled: number;
  vacant: number;
  created_at: string;
  updated_at: string;
  company?: { id: string; company_name: string };
  location?: { id: string; location_name: string };
  coordinator?: { id: string; name: string };
}

interface KpiGridProps {
  loading?: boolean;
}

const KpiGrid: React.FC<KpiGridProps> = ({ loading: externalLoading = false }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayRequirement: 0,
    todayFilled: 0,
    todayVacant: 0,
    todayUpdates: 0,
    companies: 0,
    locations: 0,
    coordinators: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [records, setRecords] = useState<ShiftRequirement[]>([]);

  // Fetch today's data from Supabase
  const fetchTodayData = useCallback(async () => {
    try {
      setError(null);
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch headcount updates for today
      const { data: shifts, error: shiftsError } = await supabase
        .from('headcount_updates')
        .select(`*, company:companies(id, company_name), location:locations(id, location_name), coordinator:users(id, name)`)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (shiftsError) throw shiftsError;
      setRecords((shifts as ShiftRequirement[]) || []);

      // Calculate KPIs
      let totalRequirement = 0;
      let totalFilled = 0;
      let totalUpdates = 0;
      const uniqueCompanies = new Set<string>();
      const uniqueLocations = new Set<string>();
      const uniqueCoordinators = new Set<string>();

      if (shifts) {
        shifts.forEach((shift: ShiftRequirement) => {
          totalRequirement += shift.requirement || 0;
          totalFilled += shift.filled || 0;
          totalUpdates += 1;
          
          if (shift.company_id) uniqueCompanies.add(shift.company_id);
          if (shift.location_id) uniqueLocations.add(shift.location_id);
          if (shift.coordinator_id) uniqueCoordinators.add(shift.coordinator_id);
        });
      }

      const totalVacant = totalRequirement - totalFilled;

      setDashboardData({
        todayRequirement: totalRequirement,
        todayFilled: totalFilled,
        todayVacant: totalVacant,
        todayUpdates: totalUpdates,
        companies: uniqueCompanies.size,
        locations: uniqueLocations.size,
        coordinators: uniqueCoordinators.size,
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setLoading(false);
    }
  }, []);

  // Initial data fetch and realtime subscription
  useEffect(() => {
    let subscription: any;

    const initializeDashboard = async () => {
      await fetchTodayData();

      // Set up realtime subscription for automatic sync
      subscription = supabase
        .channel('headcount_updates_changes')
        .on(
          'postgres_changes',
          {
            event: ['INSERT', 'UPDATE', 'DELETE'],
            schema: 'public',
            table: 'headcount_updates',
          },
          () => {
            fetchTodayData();
          }
        )
        .subscribe();
    };

    initializeDashboard();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [fetchTodayData]);

  // Auto refresh dashboard every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayData();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchTodayData]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTodayData();
    setIsRefreshing(false);
  };

  // Format number for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // KPI configuration
  const kpiConfigs = [
    {
      id: 'requirement',
      title: "Today's Requirement",
      value: dashboardData.todayRequirement,
      icon: TrendingUp,
      color: 'blue' as const,
      description: `Total ${formatNumber(dashboardData.todayRequirement)} requirements`,
      isLive: true,
    },
    {
      id: 'filled',
      title: "Today's Filled",
      value: dashboardData.todayFilled,
      icon: UserCheck,
      color: 'green' as const,
      description: `${dashboardData.todayFilled > 0 ? ((dashboardData.todayFilled / dashboardData.todayRequirement) * 100).toFixed(1) : 0}% fill rate`,
      status: 'success' as const,
    },
    {
      id: 'vacant',
      title: "Today's Vacant",
      value: dashboardData.todayVacant,
      icon: Users,
      color: 'red' as const,
      description: `${dashboardData.todayVacant > 0 ? ((dashboardData.todayVacant / dashboardData.todayRequirement) * 100).toFixed(1) : 0}% vacancy rate`,
      status: dashboardData.todayVacant > 0 ? 'warning' as const : 'success' as const,
    },
    {
      id: 'updates',
      title: "Today's Updates",
      value: dashboardData.todayUpdates,
      icon: Activity,
      color: 'purple' as const,
      description: `${dashboardData.todayUpdates} records updated`,
    },
    {
      id: 'companies',
      title: 'Companies',
      value: dashboardData.companies,
      icon: Building2,
      color: 'indigo' as const,
      description: 'Active companies today',
    },
    {
      id: 'locations',
      title: 'Locations',
      value: dashboardData.locations,
      icon: MapPin,
      color: 'yellow' as const,
      description: 'Active locations',
    },
    {
      id: 'coordinators',
      title: 'Coordinators',
      value: dashboardData.coordinators,
      icon: Calendar,
      color: 'gray' as const,
      description: 'Active coordinators',
      status: 'info' as const,
    },
  ];

  // Loading state
  if (loading || externalLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Error Loading Dashboard</h3>
            <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Live</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div> */}

      {/* KPI Grid - First Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiConfigs.slice(0, 4).map((kpi) => (
          <DashboardKpiCard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            description={kpi.description}
            loading={false}
            isLive={kpi.isLive}
            status={kpi.status}
            onClick={() => console.log(`Clicked: ${kpi.title}`)}
          />
        ))}
      </div>

      {/* KPI Grid - Second Row (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiConfigs.slice(4, 7).map((kpi) => (
          <DashboardKpiCard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            description={kpi.description}
            loading={false}
            isLive={kpi.isLive}
            status={kpi.status}
            onClick={() => console.log(`Clicked: ${kpi.title}`)}
          />
        ))}
      </div>

      {/* Table Section with Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Company', 'Location', 'Coordinator', 'Req', 'Filled', 'Vacant', 'Last Updated', 'Prog'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {records.length > 0 ? (
                records.slice(0, 5).map((shift) => {
                  const progress = shift.requirement > 0 ? Math.round((shift.filled / shift.requirement) * 100) : 0;
                  const progressColor =
                    progress >= 90
                      ? 'bg-emerald-400 dark:bg-emerald-500'
                      : progress >= 70
                      ? 'bg-blue-400 dark:bg-blue-500'
                      : progress >= 40
                      ? 'bg-amber-400 dark:bg-amber-500'
                      : 'bg-rose-400 dark:bg-rose-500';

                  return (
                    <tr key={shift.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {shift.company?.company_name || shift.company_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {shift.location?.location_name || shift.location_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {shift.coordinator?.name || shift.coordinator_id}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {shift.requirement}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {shift.filled}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {shift.vacant}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-slate-400">
                        {new Date(shift.updated_at || shift.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-[80px]">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                              <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 min-w-[36px] text-right">
                            {progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p>Real-time company data will appear here</p>
                      <p className="text-sm">Connected to Supabase</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {dashboardData.companies > 0 ? `Showing ${dashboardData.companies} companies` : 'No companies active today'}
          </span>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</button>
        </div>
      </div>
    </div>
  );
};

export default KpiGrid;