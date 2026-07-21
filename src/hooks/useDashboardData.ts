import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase";
import type {
  Company,
  LocationRecord,
  Coordinator,
  HeadcountRecord,
  DashboardFilters,
} from "../types/dashboard";

const DEFAULT_FILTERS: DashboardFilters = {
  companyId: "",
  dateRange: "all",
  status: "",
  search: "",
};

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<HeadcountRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<HeadcountRecord[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, locationsRes, coordinatorsRes] = await Promise.all([
        supabase.from("companies").select("id, company_name, status").order("company_name"),
        supabase
          .from("locations")
          .select("id, location_name, company_id, status")
          .order("location_name"),
        supabase
          .from("users")
          .select("id, name, email, phone, company_id, location_id, status")
          .eq("role", "COORDINATOR")
          .order("name"),
      ]);
      setCompanies(companiesRes.data || []);
      setLocations(locationsRes.data || []);
      setCoordinators(coordinatorsRes.data || []);

      let query = supabase
        .from("headcount_updates")
        .select(
          `id, requirement, filled, vacant, remarks, created_at,
           company_id, location_id, coordinator_id,
           company:companies (id, company_name),
           location:locations (id, location_name),
           coordinator:users (id, name)`
        )
        .order("created_at", { ascending: false });

      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.status === "understaffed") query = query.gt("vacant", 0);
      else if (filters.status === "balanced") query = query.eq("vacant", 0);
      else if (filters.status === "overstaffed") query = query.lt("vacant", 0);

      if (filters.dateRange === "today") {
        const today = new Date();
        query = query
          .gte("created_at", startOfDay(today).toISOString())
          .lte("created_at", endOfDay(today).toISOString());
      } else if (filters.dateRange === "week") {
        query = query.gte("created_at", subDays(new Date(), 7).toISOString());
      } else if (filters.dateRange === "month") {
        query = query.gte("created_at", subDays(new Date(), 30).toISOString());
      }

      const { data: headcountsData, error } = await query;
      if (error) throw error;
      setAllRecords(headcountsData || []);

      const { data: recent } = await supabase
        .from("headcount_updates")
        .select(
          `id, requirement, filled, vacant, created_at,
           coordinator:users (name),
           company:companies (company_name),
           location:locations (location_name)`
        )
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUpdates(recent || []);
      setLastSyncedAt(new Date());
    } catch (error: any) {
      toast.error("Failed to load dashboard data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredTableData = useMemo(() => {
    const term = filters.search.toLowerCase().trim();
    if (!term) return allRecords;
    return allRecords.filter(
      (h) =>
        h.company?.company_name?.toLowerCase().includes(term) ||
        h.location?.location_name?.toLowerCase().includes(term) ||
        h.coordinator?.name?.toLowerCase().includes(term) ||
        h.remarks?.toLowerCase().includes(term) ||
        format(new Date(h.created_at), "MMM d, yyyy").toLowerCase().includes(term)
    );
  }, [allRecords, filters.search]);

  const kpis = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.status !== "Inactive").length;
    const totalLocations = locations.length;
    const totalCoordinators = coordinators.length;
    const totalRequirement = allRecords.reduce((sum, h) => sum + (h.requirement || 0), 0);
    const totalFilled = allRecords.reduce((sum, h) => sum + (h.filled || 0), 0);
    const totalVacant = allRecords.reduce((sum, h) => sum + (h.vacant || 0), 0);

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = subDays(now, 7);

    const todayUpdates = allRecords.filter((h) => new Date(h.created_at) >= todayStart).length;
    const weeklyUpdates = allRecords.filter((h) => new Date(h.created_at) >= weekStart).length;

    const filledPercent = totalRequirement > 0 ? Math.round((totalFilled / totalRequirement) * 100) : 0;
    const shortagePercent = totalRequirement > 0 ? Math.round((totalVacant / totalRequirement) * 100) : 0;

    return {
      totalCompanies,
      activeCompanies,
      totalLocations,
      totalCoordinators,
      totalRequirement,
      totalFilled,
      totalVacant,
      todayUpdates,
      weeklyUpdates,
      filledPercent,
      shortagePercent,
    };
  }, [companies, locations, coordinators, allRecords]);

  const companyWiseData = useMemo(() => {
    const map: Record<string, { company: string; requirement: number; filled: number; vacant: number }> = {};
    allRecords.forEach((h) => {
      const name = h.company?.company_name || "Unknown";
      if (!map[name]) map[name] = { company: name, requirement: 0, filled: 0, vacant: 0 };
      map[name].requirement += h.requirement || 0;
      map[name].filled += h.filled || 0;
      map[name].vacant += h.vacant || 0;
    });
    return Object.values(map);
  }, [allRecords]);

  const vacancyDistribution = useMemo(() => {
    const totals = { filled: 0, vacant: 0 };
    allRecords.forEach((h) => {
      totals.filled += h.filled || 0;
      totals.vacant += h.vacant || 0;
    });
    return [
      { name: "Filled", value: totals.filled },
      { name: "Vacant", value: totals.vacant },
    ];
  }, [allRecords]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, submissions: 0 }));
    const todayStart = startOfDay(new Date());
    allRecords.forEach((h) => {
      const createdAt = new Date(h.created_at);
      if (createdAt >= todayStart) hours[createdAt.getHours()].submissions += 1;
    });
    return hours;
  }, [allRecords]);

  const dailyTrend = useMemo(() => {
    const days: Record<string, { date: string; requirement: number; filled: number; vacant: number }> = {};
    const rangeStart = startOfDay(subDays(new Date(), 29));
    for (let i = 0; i < 30; i++) {
      const key = format(subDays(new Date(), 29 - i), "MMM d");
      days[key] = { date: key, requirement: 0, filled: 0, vacant: 0 };
    }
    allRecords.forEach((h) => {
      const createdAt = new Date(h.created_at);
      if (createdAt < rangeStart) return;
      const key = format(createdAt, "MMM d");
      if (days[key]) {
        days[key].requirement += h.requirement || 0;
        days[key].filled += h.filled || 0;
        days[key].vacant += h.vacant || 0;
      }
    });
    return Object.values(days);
  }, [allRecords]);

  return {
    loading,
    allRecords,
    companies,
    locations,
    coordinators,
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
  };
}
