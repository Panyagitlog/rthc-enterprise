// src/pages/Analytics.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Printer, Building2, MapPin, Users,
  TrendingUp, Percent, BarChart3, PieChart, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { format, subDays } from "date-fns";
// @ts-ignore
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

// ---------- Types ----------
type HeadcountRecord = {
  id: string;
  requirement: number;
  filled: number;
  vacant: number;
  created_at: string;
  company: { company_name: string } | null;
  location: { location_name: string } | null;
  coordinator: { name: string } | null;
};

type CompanyData = {
  company: string;
  requirement: number;
  filled: number;
  vacant: number;
  utilization: number;
};

// ---------- Colors ----------
const COLORS = {
  requirement: "#818cf8", // indigo-400
  filled: "#34d399",     // emerald-400
  vacant: "#fbbf24",     // amber-400
};

// ---------- Main Component ----------
export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<HeadcountRecord[]>([]);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [coordinatorsCount, setCoordinatorsCount] = useState(0);

  // Dark mode detection
  const darkMode = document.documentElement.classList.contains("dark");

  // ---------- Fetch Data ----------
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch counts
        const [companiesRes, locationsRes, coordinatorsRes, headcountRes] = await Promise.all([
          supabase.from("companies").select("id", { count: "exact", head: true }),
          supabase.from("locations").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "COORDINATOR"),
          supabase
            .from("headcount_updates")
            .select("id, requirement, filled, vacant, created_at, company:companies ( company_name ), location:locations ( location_name ), coordinator:users ( name )")
            .order("created_at", { ascending: false })
            .limit(5000), // safe limit
        ]);

        setCompaniesCount(companiesRes.count ?? 0);
        setLocationsCount(locationsRes.count ?? 0);
        setCoordinatorsCount(coordinatorsRes.count ?? 0);
        setAllRecords(headcountRes.data || []);
      } catch (err: any) {
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---------- Computed KPIs ----------
  const overall = useMemo(() => {
    const totalRequirement = allRecords.reduce((s, r) => s + r.requirement, 0);
    const totalFilled = allRecords.reduce((s, r) => s + r.filled, 0);
    const totalVacant = allRecords.reduce((s, r) => s + r.vacant, 0);
    const utilization = totalRequirement ? Math.round((totalFilled / totalRequirement) * 100) : 0;
    return { totalRequirement, totalFilled, totalVacant, utilization };
  }, [allRecords]);

  // ---------- Company‑wise data ----------
  const companyWise = useMemo(() => {
    const map: Record<string, CompanyData> = {};
    allRecords.forEach((r) => {
      const name = r.company?.company_name || "Unknown";
      if (!map[name]) map[name] = { company: name, requirement: 0, filled: 0, vacant: 0, utilization: 0 };
      map[name].requirement += r.requirement;
      map[name].filled += r.filled;
      map[name].vacant += r.vacant;
    });
    return Object.values(map).map((c) => ({
      ...c,
      utilization: c.requirement ? Math.round((c.filled / c.requirement) * 100) : 0,
    }));
  }, [allRecords]);

  // ---------- Vacancy distribution ----------
  const vacancyDist = useMemo(() => {
    const filled = allRecords.reduce((s, r) => s + r.filled, 0);
    const vacant = allRecords.reduce((s, r) => s + r.vacant, 0);
    return [
      { name: "Filled", value: filled },
      { name: "Vacant", value: vacant },
    ];
  }, [allRecords]);

  // ---------- Trend over last 30 days (filled headcount per day) ----------
  const trendData = useMemo(() => {
    const today = new Date();
    const days: { date: string; filled: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, "MMM dd");
      days.push({ date: key, filled: 0 });
    }
    allRecords.forEach((r) => {
      const rDate = format(new Date(r.created_at), "MMM dd");
      const day = days.find((d) => d.date === rDate);
      if (day) day.filled += r.filled;
    });
    return days;
  }, [allRecords]);

  // ---------- Daily submissions (count of updates) ----------
  const dailySubmissions = useMemo(() => {
    const today = new Date();
    const days: { date: string; submissions: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, "MMM dd");
      days.push({ date: key, submissions: 0 });
    }
    allRecords.forEach((r) => {
      const rDate = format(new Date(r.created_at), "MMM dd");
      const day = days.find((d) => d.date === rDate);
      if (day) day.submissions += 1;
    });
    return days;
  }, [allRecords]);

  // ---------- Print handler ----------
  const handlePrint = () => {
    window.print();
  };

  // ---------- Card component ----------
  const KpiCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-display font-bold text-slate-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 print:px-0 print:py-0">
      {/* Header (hidden during print) */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive workforce insights for your presentation.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Workforce Analytics Report</h1>
        <p className="text-sm text-slate-500">Generated on {format(new Date(), "MMMM d, yyyy 'at' hh:mm a")}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <KpiCard label="Total Companies" value={companiesCount} icon={Building2} color="indigo" />
            <KpiCard label="Total Locations" value={locationsCount} icon={MapPin} color="cyan" />
            <KpiCard label="Coordinators" value={coordinatorsCount} icon={Users} color="violet" />
            <KpiCard label="Overall Utilisation" value={`${overall.utilization}%`} icon={Percent} color="emerald" />
          </motion.div>

          {/* Charts Grid */}
          <div className="space-y-8 print:space-y-6">
            {/* Company‑wise Headcount (Bar) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Company‑wise Headcount
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={companyWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="company" stroke={darkMode ? "#94a3b8" : "#64748b"} tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                  <Legend />
                  <Bar dataKey="requirement" fill={COLORS.requirement} name="Requirement" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="filled" fill={COLORS.filled} name="Filled" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vacant" fill={COLORS.vacant} name="Vacant" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:gap-6">
              {/* Vacancy Distribution (Pie) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-500" />
                  Vacancy Distribution
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie
                      data={vacancyDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill={COLORS.filled} />
                      <Cell fill={COLORS.vacant} />
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Utilisation Donut */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Requirement Completion
                </h3>
                <div className="flex items-center justify-center h-64">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#818cf8" strokeWidth="3.2"
                        strokeDasharray="100"
                        strokeDashoffset={100 - overall.utilization}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-display font-bold text-slate-900 dark:text-white">
                      {overall.utilization}%
                    </span>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 mt-2">
                  {overall.totalFilled.toLocaleString()} filled of {overall.totalRequirement.toLocaleString()} required
                </p>
              </motion.div>
            </div>

            {/* Trend Chart (Area) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Headcount Trend (Last 30 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="filledGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                  <Area type="monotone" dataKey="filled" stroke="#34d399" fill="url(#filledGradient)" strokeWidth={2} name="Filled" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Daily Submissions (Line) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Daily Submissions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySubmissions}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={darkMode ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                  <Line type="monotone" dataKey="submissions" stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} name="Submissions" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Company Performance Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Company Performance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Company</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Requirement</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Filled</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Vacant</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Utilisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {companyWise
                      .sort((a, b) => b.requirement - a.requirement)
                      .map((c) => (
                        <tr key={c.company} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{c.company}</td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{c.requirement.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{c.filled.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{c.vacant.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${
                              c.utilization >= 80 ? "text-emerald-600" : c.utilization >= 50 ? "text-amber-600" : "text-rose-600"
                            }`}>
                              {c.utilization}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}