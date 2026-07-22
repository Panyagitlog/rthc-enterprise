// src/pages/Headcount.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, Users, UserCheck, RefreshCw,
  Clock, AlertTriangle, X
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import toast from "react-hot-toast";
// @ts-ignore
import { supabase } from "../services/supabase";

// ---------- Types ----------
interface Coordinator {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  company_id?: string | null;
  location_id?: string | null;
  company?: { company_name: string } | null;
  location?: { location_name: string } | null;
}

interface Submission {
  coordinator_id: string;
  created_at: string;
}

// ---------- Component ----------
export default function HeadcountPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [todaySubmissions, setTodaySubmissions] = useState<Submission[]>([]);
  const [lastSubmissions, setLastSubmissions] = useState<Record<string, string>>({}); // coordinator_id -> date string
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // ---------- Fetch data ----------
  const fetchData = async () => {
    setLoading(true);
    try {
      // Coordinators
      const { data: coordinatorsData, error: coordError } = await supabase
        .from("users")
        .select("id, name, email, mobile, company_id, location_id, company:companies(company_name), location:locations(location_name)")
        .eq("role", "COORDINATOR")
        .order("name");

      if (coordError) throw coordError;

      // Companies & locations for filters
      const { data: companiesData } = await supabase.from("companies").select("id, company_name").order("company_name");
      const { data: locationsData } = await supabase.from("locations").select("id, location_name, company_id").order("location_name");

      // Today's submissions
      const today = new Date();
      const { data: todayData, error: todayError } = await supabase
        .from("headcount_updates")
        .select("coordinator_id, created_at")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (todayError) throw todayError;

      // Get coordinator IDs who submitted today
      const submittedIds = (todayData || []).map((s: Submission) => s.coordinator_id);

      // For coordinators who did NOT submit today, get their last submission date
      const notSubmittedCoordinators = (coordinatorsData || []).filter((c: any) => !submittedIds.includes(c.id));
      let lastSubs: Record<string, string> = {};
      if (notSubmittedCoordinators.length > 0) {
        const { data: lastData } = await supabase
          .from("headcount_updates")
          .select("coordinator_id, created_at")
          .in("coordinator_id", notSubmittedCoordinators.map((c: any) => c.id))
          .order("created_at", { ascending: false });

        // Build map: coordinator_id -> latest created_at
        const map: Record<string, string> = {};
        (lastData || []).forEach((r: any) => {
          if (!map[r.coordinator_id]) map[r.coordinator_id] = r.created_at;
        });
        lastSubs = map;
      }

      setCoordinators(coordinatorsData || []);
      setTodaySubmissions(todayData || []);
      setLastSubmissions(lastSubs);
      setCompanies(companiesData || []);
      setLocations(locationsData || []);
    } catch (err: any) {
      toast.error("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Computed sets ----------
  const submittedIds = useMemo(() => new Set(todaySubmissions.map((s) => s.coordinator_id)), [todaySubmissions]);

  // ---------- Filtered list ----------
  const filteredCoordinators = useMemo(() => {
    let list = coordinators;

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          (c.mobile || "").includes(s)
      );
    }

    // Company filter
    if (companyFilter) {
      list = list.filter((c) => c.company_id === companyFilter);
    }

    // Location filter
    if (locationFilter) {
      list = list.filter((c) => c.location_id === locationFilter);
    }

    // Show only pending
    if (showOnlyPending) {
      list = list.filter((c) => !submittedIds.has(c.id));
    }

    return list;
  }, [coordinators, search, companyFilter, locationFilter, showOnlyPending, submittedIds]);

  // ---------- Stats ----------
  const totalCoordinators = coordinators.length;
  const submittedCount = submittedIds.size;
  const pendingCount = totalCoordinators - submittedCount;

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
              Headcount Tracking
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monitor which coordinators have submitted today’s data.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Coordinators</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{totalCoordinators}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Submitted Today</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{submittedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Pending</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Locations</option>
            {locations
              .filter((l) => !companyFilter || l.company_id === companyFilter)
              .map((l) => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Pending only
          </label>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Coordinator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Last Submission</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredCoordinators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                      No coordinators found.
                    </td>
                  </tr>
                ) : (
                  filteredCoordinators.map((coordinator) => {
                    const hasSubmitted = submittedIds.has(coordinator.id);
                    const lastSub = lastSubmissions[coordinator.id] || null;
                    return (
                      <tr key={coordinator.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{coordinator.name}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{coordinator.email}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {coordinator.company?.company_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {coordinator.location?.location_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {lastSub
                            ? format(new Date(lastSub), "MMM d, hh:mm a")
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <UserCheck className="w-3.5 h-3.5" />
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}