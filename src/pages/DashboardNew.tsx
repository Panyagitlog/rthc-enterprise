// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import {
  Building2, MapPin, Users, UserCheck, UserX, Clock, Plus,
  RefreshCw, Search, Filter, Download, FileText, Printer,
  ChevronDown, ChevronUp, Eye, Edit, Trash2, UserPlus,
  Building, Map, Settings, LogOut, Bell, Moon, Sun, Menu, X,
  LayoutDashboard, MapPinned, UserCog, FileBarChart, History,
  Zap, Activity
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
// @ts-ignore
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";
import ManagementModal from "../components/ManagementModal";

// --- Helper: Animated counter hook ---
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// --- Helper: Status badge colors ---
const getFilledStatus = (requirement: number, filled: number) => {
  if (requirement === 0) return {
    label: "No Requirement",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    dot: "bg-slate-400"
  };
  const percent = (filled / requirement) * 100;
  if (percent >= 95) return {
    label: "Fully Filled",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-emerald-500"
  };
  if (percent >= 70) return {
    label: "Partially Filled",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-amber-500"
  };
  return {
    label: "Understaffed",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    dot: "bg-rose-500"
  };
};

// --- Workforce Pulse Gauge (SVG) ---
const PulseGauge = ({ percent, darkMode }: { percent: number; darkMode: boolean }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="140" viewBox="0 0 180 140" className="transform -rotate-90">
        <circle
          cx="90" cy="100" r={radius}
          fill="none"
          stroke={darkMode ? "#334155" : "#e2e8f0"}
          strokeWidth="12"
        />
        <circle
          cx="90" cy="100" r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-2">
        <span className={`text-3xl font-display font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
          {percent}%
        </span>
        <span className={`block text-xs text-center ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Filled
        </span>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [headcounts, setHeadcounts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [, setCoordinators] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<"companies" | "locations" | "coordinators">("companies");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const weather = { temp: 24, condition: "Clear", icon: Sun };

  // Filters
  const [filters, setFilters] = useState({
    companyId: "",
    dateRange: "all",
    status: "",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Dark mode class toggle
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, locationsRes, coordinatorsRes] = await Promise.all([
        supabase.from("companies").select("id, company_name, status").order("company_name"),
        supabase.from("locations").select("id, location_name, company_id, status").order("location_name"),
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
          `id, requirement, filled, vacant, remarks, created_at, company_id, location_id, coordinator_id,
           company:companies (id, company_name), location:locations (id, location_name),
           coordinator:users (id, name)`
        )
        .order("created_at", { ascending: false });

      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.status) {
        if (filters.status === "understaffed") query = query.gt("vacant", 0);
        else if (filters.status === "balanced") query = query.eq("vacant", 0);
        else if (filters.status === "overstaffed") query = query.lt("vacant", 0);
      }
      if (filters.dateRange === "today") {
        const today = new Date();
        query = query.gte("created_at", startOfDay(today).toISOString()).lte("created_at", endOfDay(today).toISOString());
      } else if (filters.dateRange === "week") {
        query = query.gte("created_at", subDays(new Date(), 7).toISOString());
      } else if (filters.dateRange === "month") {
        query = query.gte("created_at", subDays(new Date(), 30).toISOString());
      }

      const { data: headcountsData } = await query;
      setAllRecords(headcountsData || []);
      setHeadcounts(headcountsData || []); // show all records; can add grouping later

      const todayStart = startOfDay(new Date());
      setNotificationCount(
        (headcountsData || []).filter((h: any) => new Date(h.created_at) >= todayStart).length
      );

      const { data: recent } = await supabase
        .from("headcount_updates")
        .select(`id, requirement, filled, vacant, created_at, coordinator:users (name), company:companies (company_name), location:locations (location_name)`)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUpdates(recent || []);
    } catch (error: any) {
      toast.error("Failed to load dashboard data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed KPIs
  const kpis = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.status !== "Inactive").length;
    const totalLocations = locations.length;
    const totalRequirement = allRecords.reduce((sum, h) => sum + (h.requirement || 0), 0);
    const totalFilled = allRecords.reduce((sum, h) => sum + (h.filled || 0), 0);
    const totalVacant = allRecords.reduce((sum, h) => sum + (h.vacant || 0), 0);
    const todayUpdates = allRecords.filter(
      (h) => new Date(h.created_at) >= startOfDay(new Date())
    ).length;
    const filledPercent = totalRequirement > 0 ? Math.round((totalFilled / totalRequirement) * 100) : 0;
    return { totalCompanies, activeCompanies, totalLocations, totalRequirement, totalFilled, totalVacant, todayUpdates, filledPercent };
  }, [companies, locations, allRecords]);

  const animated = {
    totalCompanies: useCountUp(kpis.totalCompanies),
    activeCompanies: useCountUp(kpis.activeCompanies),
    totalLocations: useCountUp(kpis.totalLocations),
    totalRequirement: useCountUp(kpis.totalRequirement),
    totalFilled: useCountUp(kpis.totalFilled),
    totalVacant: useCountUp(kpis.totalVacant),
    todayUpdates: useCountUp(kpis.todayUpdates),
    filledPercent: kpis.filledPercent // percent doesn't need counting
  };

  // Filter handlers
  const handleFilterChange = (key: string, value: any) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters({ companyId: "", dateRange: "all", status: "", search: "" });

  // Table data with search
  const filteredTableData = useMemo(() => {
    const search = filters.search.toLowerCase().trim();
    if (!search) return headcounts;
    return headcounts.filter(
      (h) =>
        h.company?.company_name?.toLowerCase().includes(search) ||
        h.location?.location_name?.toLowerCase().includes(search) ||
        h.coordinator?.name?.toLowerCase().includes(search) ||
        h.remarks?.toLowerCase().includes(search) ||
        format(new Date(h.created_at), "MMM d, yyyy").toLowerCase().includes(search)
    );
  }, [headcounts, filters.search]);

  // Chart data
  const companyWiseData = useMemo(() => {
    const map: Record<string, any> = {};
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
    const counts = { filled: 0, vacant: 0 };
    allRecords.forEach((h) => {
      if ((h.vacant || 0) > 0) counts.vacant += h.vacant;
      else counts.filled += h.filled || 0;
    });
    return [
      { name: "Filled", value: counts.filled },
      { name: "Vacant", value: counts.vacant },
    ];
  }, [allRecords]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, submissions: 0 }));
    const todayStart = startOfDay(new Date());
    allRecords.forEach((h) => {
      const d = new Date(h.created_at);
      if (d >= todayStart) hours[d.getHours()].submissions += 1;
    });
    return hours;
  }, [allRecords]);

  // Navigation items
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Companies", icon: Building, path: "/companies" },
    { label: "Locations", icon: MapPinned, path: "/locations" },
    { label: "Coordinators", icon: UserCog, path: "/coordinators" },
    { label: "Head Count", icon: Users, path: "/headcount" },
    { label: "Reports", icon: FileBarChart, path: "/reports" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  // Quick action button
  const QuickAction = ({ icon: Icon, label, onClick, color = "indigo" }: any) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-${color}-50 text-${color}-700 hover:bg-${color}-100 dark:bg-${color}-900/30 dark:text-${color}-300 dark:hover:bg-${color}-800/50 transition-colors`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 font-body transition-colors duration-300">
      {/* Glass Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 border-r border-slate-200/60 dark:border-slate-700/50 flex flex-col shadow-2xl`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-lg">RTHC</span>
            <span className="font-display font-bold text-slate-900 dark:text-white">Enterprise</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200/60 dark:border-slate-700/50 p-4">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30 w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Glass Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/50 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                RTHC <span className="text-indigo-600 dark:text-indigo-400">Command</span>
              </h1>
              <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 font-medium">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 mr-1 bg-emerald-500 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <weather.icon className="w-4 h-4 text-amber-500" />
                <span>{weather.temp}°C</span>
                <span className="hidden sm:inline">{weather.condition}</span>
              </div>
              <button className="relative p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button onClick={fetchData} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Refresh">
                <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Export" onClick={() => toast("Export coming soon")}>
                <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Print" onClick={() => window.print()}>
                <Printer className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                    {userProfile?.name?.[0] || "U"}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline text-slate-700 dark:text-white">
                    {userProfile?.name || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-700/50">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{userProfile?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{userProfile?.email}</p>
                    </div>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Profile</Link>
                    <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Settings</Link>
                    <button onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }} className="block w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* HERO: Workforce Pulse Gauge + Welcome */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 shadow-sm backdrop-blur-sm p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 mb-4">
                  <Activity className="w-3.5 h-3.5" /> Live Command Center
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  Welcome back, <br />
                  <span className="text-indigo-600 dark:text-indigo-400">{userProfile?.name || "User"}</span>
                </h2>
                <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md">
                  Real‑time headcount monitoring across {kpis.totalCompanies} companies and {kpis.totalLocations} locations.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/25 transition-all">
                    <RefreshCw className="w-4 h-4" /> Refresh Data
                  </button>
                  <button onClick={() => navigate("/headcount")} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    <Plus className="w-4 h-4" /> New Headcount
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <PulseGauge percent={animated.filledPercent} darkMode={darkMode} />
              </div>
            </div>
            {/* Decorative background gradient */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          </div>

          {/* KPI Cards – Glass style with animated counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[
              { icon: Building2, label: "Companies", value: animated.totalCompanies, sub: `${animated.activeCompanies} active`, color: "indigo" },
              { icon: MapPin, label: "Locations", value: animated.totalLocations, sub: "", color: "cyan" },
              { icon: Users, label: "Requirement", value: animated.totalRequirement, sub: "", color: "violet" },
              { icon: UserCheck, label: "Filled", value: animated.totalFilled, sub: `${animated.filledPercent}%`, color: "emerald" },
              { icon: UserX, label: "Vacant", value: animated.totalVacant, sub: "", color: "rose" },
              { icon: Clock, label: "Today", value: animated.todayUpdates, sub: "submissions", color: "amber" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="relative group bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 p-4 flex items-center gap-3 backdrop-blur-sm hover:-translate-y-0.5"
              >
                <div className={`p-2.5 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">{item.value.toLocaleString()}</p>
                  {item.sub && <p className="text-xs text-slate-400 dark:text-slate-500">{item.sub}</p>}
                </div>
                {/* Subtle progress bar for filled percent on the Filled card */}
                {item.label === "Filled" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700 rounded-b-xl overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${animated.filledPercent}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Content: Table + Live Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Filter Bar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <Filter className="w-4 h-4 mr-1" /> Filters
                        {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </button>
                      <button onClick={resetFilters} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        Reset
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text" placeholder="Search..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange("search", e.target.value)}
                          className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                      <button className="inline-flex items-center px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Download className="w-4 h-4 mr-1" /> Export
                      </button>
                    </div>
                  </div>
                  {showFilters && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Company</label>
                        <select value={filters.companyId} onChange={(e) => handleFilterChange("companyId", e.target.value)} className="mt-1 block w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm py-1.5 px-2 bg-white dark:bg-slate-800">
                          <option value="">All</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Date Range</label>
                        <select value={filters.dateRange} onChange={(e) => handleFilterChange("dateRange", e.target.value)} className="mt-1 block w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm py-1.5 px-2 bg-white dark:bg-slate-800">
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                        <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="mt-1 block w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm py-1.5 px-2 bg-white dark:bg-slate-800">
                          <option value="">All</option>
                          <option value="understaffed">Understaffed</option>
                          <option value="balanced">Balanced</option>
                          <option value="overstaffed">Overstaffed</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button onClick={resetFilters} className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Reset</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Table – Glass card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                      <tr>
                        {["Company","Location","Req","Filled","Vacant","Filled %","Status","Submitted By","Submitted Time","Remarks","Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 11 }).map((_, j) => (
                              <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                            ))}
                          </tr>
                        ))
                      ) : filteredTableData.length === 0 ? (
                        <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No records found</td></tr>
                      ) : (
                        filteredTableData.map((h) => {
                          const filledPercent = h.requirement > 0 ? Math.round((h.filled / h.requirement) * 100) : 0;
                          const status = getFilledStatus(h.requirement, h.filled);
                          return (
                            <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{h.company?.company_name || "-"}</td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{h.location?.location_name || "-"}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono text-indigo-600 dark:text-indigo-400">{h.requirement || 0}</td>
                              <td className="px-4 py-3 text-sm text-right font-mono text-emerald-600 dark:text-emerald-400">{h.filled || 0}</td>
                              <td className={`px-4 py-3 text-sm text-right font-mono ${(h.vacant || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>{h.vacant || 0}</td>
                              <td className={`px-4 py-3 text-sm text-right font-mono ${filledPercent >= 80 ? "text-emerald-600" : filledPercent >= 50 ? "text-amber-600" : "text-rose-600"}`}>{filledPercent}%</td>
                              <td className="px-4 py-3 text-sm"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}><span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>{status.label}</span></td>
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{h.coordinator?.name || "Unknown"}</td>
                              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{format(new Date(h.created_at), "MMM d, HH:mm")}</td>
                              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{h.remarks || "-"}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30" title="View"><Eye className="w-4 h-4" /></button>
                                  <button className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30" title="Edit"><Edit className="w-4 h-4" /></button>
                                  <button className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                  <button className="p-1 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30" title="History"><History className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Live Feed & Quick Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-4 backdrop-blur-sm">
                <h3 className="text-sm font-display font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Zap className="w-4 h-4 text-cyan-500" /> Live Feed
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto mt-3">
                  {recentUpdates.map((u) => (
                    <div key={u.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm text-slate-800 dark:text-slate-200">
                            <span className="font-medium">{u.coordinator?.name || "Unknown"}</span>
                            <span className="text-slate-500 dark:text-slate-400"> updated </span>
                            <span className="font-medium">{u.company?.company_name}</span>
                            <span className="text-slate-500 dark:text-slate-400"> → </span>
                            <span className="font-medium">{u.location?.location_name}</span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>Req: {u.requirement || 0}</span><span>•</span>
                            <span>Filled: {u.filled || 0}</span><span>•</span>
                            <span>Vacant: {u.vacant || 0}</span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{format(new Date(u.created_at), "hh:mm a")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentUpdates.length === 0 && <p className="text-sm text-slate-400">No recent updates</p>}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-4 backdrop-blur-sm">
                <h3 className="text-sm font-display font-semibold text-slate-700 dark:text-slate-300 mb-3">⚡ Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction icon={Building} label="Company" onClick={() => { setManagementModalOpen(true); setManagementTab("companies"); }} color="indigo" />
                  <QuickAction icon={Map} label="Location" onClick={() => { setManagementModalOpen(true); setManagementTab("locations"); }} color="cyan" />
                  <QuickAction icon={UserPlus} label="Coordinator" onClick={() => { setManagementModalOpen(true); setManagementTab("coordinators"); }} color="violet" />
                  <QuickAction icon={Plus} label="New Entry" onClick={() => navigate("/coordinator")} color="emerald" />
                  <QuickAction icon={Download} label="Export" onClick={() => toast("Export coming soon")} color="slate" />
                  <QuickAction icon={RefreshCw} label="Refresh" onClick={fetchData} color="slate" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Overview / Analytics / Reports */}
          <div className="mt-8">
            <div className="border-b border-slate-200 dark:border-slate-700">
              <nav className="-mb-px flex space-x-8">
                {["overview","analytics","reports"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 text-sm font-display font-semibold transition-colors ${
                      activeTab === tab
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="py-6">
              {activeTab === "overview" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-4">📊 Summary</h3>
                  <p className="text-slate-500 dark:text-slate-400">Detailed overview is shown in the table above. Use filters to narrow down.</p>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-6 space-y-8">
                  <div>
                    <h4 className="text-md font-display font-semibold text-slate-700 dark:text-slate-300 mb-4">Company‑wise Headcount</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={companyWiseData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                        <XAxis dataKey="company" stroke={darkMode ? "#94a3b8" : "#64748b"} tick={{fontSize: 12}} />
                        <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                        <Legend wrapperStyle={{ color: darkMode ? "#cbd5e1" : "#334155" }} />
                        <Bar dataKey="requirement" fill="#818cf8" name="Requirement" radius={[4,4,0,0]} />
                        <Bar dataKey="filled" fill="#34d399" name="Filled" radius={[4,4,0,0]} />
                        <Bar dataKey="vacant" fill="#fb923c" name="Vacant" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-md font-display font-semibold text-slate-700 dark:text-slate-300 mb-4">Vacancy Distribution</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={vacancyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            <Cell fill="#34d399" />
                            <Cell fill="#f87171" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-md font-display font-semibold text-slate-700 dark:text-slate-300 mb-4">Hourly Submissions (Today)</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                          <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} />
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f1f5f9" : "#0f172a" }} />
                          <Line type="monotone" dataKey="submissions" stroke="#818cf8" strokeWidth={2} dot={{r: 3}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-4">📄 Generate Reports</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {["Daily","Weekly","Monthly","Export Excel","Export PDF","Print"].map((label) => (
                      <button key={label} className="flex items-center justify-center px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <FileText className="w-5 h-5 mr-2 text-slate-500" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Management Modal */}
      <ManagementModal
        isOpen={managementModalOpen}
        onClose={() => setManagementModalOpen(false)}
        initialTab={managementTab}
        onDataChange={fetchData}
        darkMode={darkMode}
      />
    </div>
  );
}