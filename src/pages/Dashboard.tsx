// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  UserX,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  UserPlus,
  Building,
  Map,
  Settings,
  LogOut,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  User,
  LayoutDashboard,
  MapPinned,
  UserCog,
  FileBarChart,
  History,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";
import ManagementModal from "../components/ManagementModal";

// ---------- Helper: get status based on filled % ----------
const getFilledStatus = (requirement: number, filled: number) => {
  if (requirement === 0)
    return {
      label: "No Requirement",
      color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      progressColor: "bg-gray-400",
    };
  const percent = (filled / requirement) * 100;
  if (percent >= 95)
    return {
      label: "Fully Filled",
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      progressColor: "bg-green-500",
    };
  if (percent >= 70)
    return {
      label: "Partially Filled",
      color:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      progressColor: "bg-yellow-500",
    };
  return {
    label: "Understaffed",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    progressColor: "bg-red-500",
  };
};

// ---------- Main Dashboard Component ----------
export default function Dashboard() {
  const navigate = useNavigate();

  // ----- State -----
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [headcounts, setHeadcounts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<
    "companies" | "locations" | "coordinators"
  >("companies");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Weather static
  const weather = { temp: 24, condition: "Sunny", icon: Sun };

  // Filters – default to 'all' (show ALL history)
  const [filters, setFilters] = useState({
    companyId: "",
    dateRange: "all", // 'all' | 'today' | 'week' | 'month'
    status: "",
    search: "",
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // ----- Fetch user profile -----
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

  // ----- Fetch Data -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch companies, locations, coordinators
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

      // Build query for headcount updates
      let query = supabase
        .from("headcount_updates")
        .select(
          `
          id,
          requirement,
          filled,
          vacant,
          remarks,
          created_at,
          company_id,
          location_id,
          coordinator_id,
          company:companies (id, company_name),
          location:locations (id, location_name),
          coordinator:users (id, name)
        `
        )
        .order("created_at", { ascending: false });

      // Apply filters (except date range – we handle that separately)
      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.status) {
        if (filters.status === "understaffed") query = query.gt("vacant", 0);
        else if (filters.status === "balanced") query = query.eq("vacant", 0);
        else if (filters.status === "overstaffed") query = query.lt("vacant", 0);
      }

      // Date range: apply only if not 'all'
      if (filters.dateRange === "today") {
        const today = new Date();
        query = query
          .gte("created_at", startOfDay(today).toISOString())
          .lte("created_at", endOfDay(today).toISOString());
      } else if (filters.dateRange === "week") {
        const weekAgo = subDays(new Date(), 7);
        query = query.gte("created_at", weekAgo.toISOString());
      } else if (filters.dateRange === "month") {
        const monthAgo = subDays(new Date(), 30);
        query = query.gte("created_at", monthAgo.toISOString());
      }
      // else 'all' → no date filter

      const { data: headcountsData } = await query;
      
      // DEBUG: log raw data
      console.log("🔍 Raw headcount data:", headcountsData?.length, "records");
      if (headcountsData?.length > 0) {
        console.log("📊 First record:", headcountsData[0]);
      }

      setAllRecords(headcountsData || []);

      // TEMPORARY: Show all records (disable grouping for debugging)
      setHeadcounts(headcountsData || []);
      // If you want grouping back, uncomment:
      // const latest = groupLatestRecords(headcountsData || []);
      // setHeadcounts(latest);

      // Notification count: number of updates today
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayUpdates = (headcountsData || []).filter(
        (h) => new Date(h.created_at) >= todayStart
      );
      setNotificationCount(todayUpdates.length);

      // Recent updates (last 5) for live feed
      const { data: recent } = await supabase
        .from("headcount_updates")
        .select(
          `
          id,
          requirement,
          filled,
          vacant,
          created_at,
          coordinator:users (name),
          company:companies (company_name),
          location:locations (location_name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUpdates(recent || []);
    } catch (error: any) {
      toast.error("Failed to load dashboard data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ----- Computed KPIs -----
  const kpis = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(
      (c) => c.status !== "Inactive"
    ).length;
    const totalLocations = locations.length;
    const totalRequirement = allRecords.reduce(
      (sum, h) => sum + (h.requirement || 0),
      0
    );
    const totalFilled = allRecords.reduce((sum, h) => sum + (h.filled || 0), 0);
    const totalVacant = allRecords.reduce((sum, h) => sum + (h.vacant || 0), 0);
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayUpdates = allRecords.filter(
      (h) => new Date(h.created_at) >= todayStart
    ).length;
    const filledPercent =
      totalRequirement > 0
        ? Math.round((totalFilled / totalRequirement) * 100)
        : 0;
    return {
      totalCompanies,
      activeCompanies,
      totalLocations,
      totalRequirement,
      totalFilled,
      totalVacant,
      todayUpdates,
      filledPercent,
    };
  }, [companies, locations, allRecords]);

  // ----- Filter handlers -----
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      companyId: "",
      dateRange: "all",
      status: "",
      search: "",
    });
  };

  // ----- Table data (with search) -----
  const filteredTableData = useMemo(() => {
    const searchTerm = filters.search.toLowerCase().trim();
    if (!searchTerm) return headcounts;
    return headcounts.filter(
      (h) =>
        h.company?.company_name?.toLowerCase().includes(searchTerm) ||
        h.location?.location_name?.toLowerCase().includes(searchTerm) ||
        h.coordinator?.name?.toLowerCase().includes(searchTerm) ||
        h.remarks?.toLowerCase().includes(searchTerm) ||
        format(new Date(h.created_at), "MMM d, yyyy")
          .toLowerCase()
          .includes(searchTerm)
    );
  }, [headcounts, filters.search]);

  // ----- Analytics data (uses allRecords for full history) -----
  const companyWiseData = useMemo(() => {
    const map: Record<string, any> = {};
    allRecords.forEach((h) => {
      const name = h.company?.company_name || "Unknown";
      if (!map[name])
        map[name] = { company: name, requirement: 0, filled: 0, vacant: 0 };
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
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      submissions: 0,
    }));
    const now = new Date();
    const todayStart = startOfDay(now);
    allRecords.forEach((h) => {
      const createdAt = new Date(h.created_at);
      if (createdAt >= todayStart) {
        const hour = createdAt.getHours();
        hours[hour].submissions += 1;
      }
    });
    return hours;
  }, [allRecords]);

  // ----- Render helpers -----
  const KpiCard = ({
    icon: Icon,
    label,
    value,
    subtext = "",
    color = "text-blue-600",
    bgColor = "",
  }) => (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3 hover:shadow-md transition-shadow ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}
    >
      <div
        className={`p-2 rounded-full ${bgColor || `bg-${color.split("-")[1]}-50`} ${darkMode ? "bg-opacity-20" : ""}`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p
          className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          {label}
        </p>
        <p
          className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
        >
          {value}
        </p>
        {subtext && (
          <p
            className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  const QuickAction = ({ icon: Icon, label, onClick, color = "blue" }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-${color}-50 text-${color}-700 hover:bg-${color}-100 transition-colors ${darkMode ? `bg-${color}-900/30 text-${color}-300 hover:bg-${color}-800/50` : ""}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  // ----- Sidebar Navigation -----
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Companies", icon: Building, path: "/companies" },
    { label: "Locations", icon: MapPinned, path: "/locations" },
    { label: "Coordinators", icon: UserCog, path: "/coordinators" },
    { label: "Head Count", icon: Users, path: "/headcount" },
    { label: "Reports", icon: FileBarChart, path: "/reports" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  // ----- JSX -----
  return (
    <div
      className={`min-h-screen flex ${darkMode ? "bg-gray-900" : "bg-gray-50/90"}`}
    >
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 bg-white border-r border-gray-200 ${darkMode ? "bg-gray-800 border-gray-700" : ""} flex flex-col shadow-xl`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
              RTHC
            </span>
            <span
              className={`font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Enterprise
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : `hover:bg-gray-100 ${darkMode ? "hover:bg-gray-700 text-gray-300" : "text-gray-700"}`
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header
          className={`sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm ${darkMode ? "bg-gray-800/80 border-gray-700/80" : ""}`}
        >
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <h1
                className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                Real Time Head Count
              </h1>
              <span
                className={`text-sm hidden sm:inline ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <span className="w-1.5 h-1.5 mr-1 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Weather */}
              <div
                className={`flex items-center gap-1.5 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"} bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full`}
              >
                <weather.icon className="w-4 h-4 text-yellow-500" />
                <span>{weather.temp}°C</span>
                <span className="hidden sm:inline">{weather.condition}</span>
              </div>

              {/* Notification bell */}
              <button className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Quick header actions */}
              <button
                onClick={fetchData}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Export Excel"
                onClick={() => toast("Export coming soon")}
              >
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Print"
                onClick={() => window.print()}
              >
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                    {userProfile?.name?.[0] || "U"}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${darkMode ? "text-white" : "text-gray-700"}`}
                  >
                    {userProfile?.name || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showUserMenu && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} py-1 z-50`}
                  >
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p
                        className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {userProfile?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userProfile?.email}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className={`block px-4 py-2 text-sm ${darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className={`block px-4 py-2 text-sm ${darkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        navigate("/login");
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm text-red-600 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <KpiCard
              icon={Building2}
              label="Companies"
              value={kpis.totalCompanies}
              color="text-blue-600"
              subtext={`${kpis.activeCompanies} active`}
              bgColor="bg-blue-50 dark:bg-blue-900/20"
            />
            <KpiCard
              icon={MapPin}
              label="Locations"
              value={kpis.totalLocations}
              color="text-indigo-600"
              bgColor="bg-indigo-50 dark:bg-indigo-900/20"
            />
            <KpiCard
              icon={Users}
              label="Requirement"
              value={kpis.totalRequirement}
              color="text-purple-600"
              bgColor="bg-purple-50 dark:bg-purple-900/20"
            />
            <KpiCard
              icon={UserCheck}
              label="Total Filled"
              value={kpis.totalFilled}
              color="text-green-600"
              subtext={`${kpis.filledPercent}% filled`}
              bgColor="bg-green-50 dark:bg-green-900/20"
            />
            <KpiCard
              icon={UserX}
              label="Vacant"
              value={kpis.totalVacant}
              color="text-red-600"
              bgColor="bg-red-50 dark:bg-red-900/20"
            />
            <KpiCard
              icon={Clock}
              label="Today's Updates"
              value={kpis.todayUpdates}
              color="text-orange-600"
              bgColor="bg-orange-50 dark:bg-orange-900/20"
            />
          </div>

          {/* Main Content: Table + Live Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Table & Filters */}
            <div className="lg:col-span-3 space-y-6">
              {/* Filter Bar */}
              <div
                className={`bg-white rounded-xl shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border ${darkMode ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                      >
                        <Filter className="w-4 h-4 mr-1" />
                        Filters
                        {showFilters ? (
                          <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </button>
                      <button
                        onClick={resetFilters}
                        className={`text-sm ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filters.search}
                          onChange={(e) =>
                            handleFilterChange("search", e.target.value)
                          }
                          className={`pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300"}`}
                        />
                      </div>
                      <button
                        className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                      >
                        <Download className="w-4 h-4 mr-1" /> Export
                      </button>
                    </div>
                  </div>

                  {showFilters && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-4 dark:border-gray-700">
                      <div>
                        <label
                          className={`block text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Company
                        </label>
                        <select
                          value={filters.companyId}
                          onChange={(e) =>
                            handleFilterChange("companyId", e.target.value)
                          }
                          className={`mt-1 block w-full border rounded-md text-sm py-1.5 px-2 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                        >
                          <option value="">All</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className={`block text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Date Range
                        </label>
                        <select
                          value={filters.dateRange}
                          onChange={(e) =>
                            handleFilterChange("dateRange", e.target.value)
                          }
                          className={`mt-1 block w-full border rounded-md text-sm py-1.5 px-2 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className={`block text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            handleFilterChange("status", e.target.value)
                          }
                          className={`mt-1 block w-full border rounded-md text-sm py-1.5 px-2 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"}`}
                        >
                          <option value="">All</option>
                          <option value="understaffed">Understaffed</option>
                          <option value="balanced">Balanced</option>
                          <option value="overstaffed">Overstaffed</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={resetFilters}
                          className="w-full px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
              >
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead
                      className={`${darkMode ? "bg-gray-700" : "bg-gray-50"} sticky top-0 z-10`}
                    >
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Req
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Filled
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Vacant
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Filled %
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Submitted By
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Submitted Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Remarks
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}
                    >
                      {loading ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : filteredTableData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            No records found
                          </td>
                        </tr>
                      ) : (
                        filteredTableData.map((h) => {
                          const filledPercent =
                            h.requirement > 0
                              ? Math.round((h.filled / h.requirement) * 100)
                              : 0;
                          const status = getFilledStatus(
                            h.requirement,
                            h.filled,
                          );
                          return (
                            <tr
                              key={h.id}
                              className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {h.company?.company_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {h.location?.location_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                                {h.requirement || 0}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                                {h.filled || 0}
                              </td>
                              <td
                                className={`px-4 py-3 text-sm text-right font-medium ${
                                  (h.vacant || 0) > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {h.vacant || 0}
                              </td>
                              <td
                                className={`px-4 py-3 text-sm text-right font-medium ${
                                  filledPercent >= 80
                                    ? "text-green-600 dark:text-green-400"
                                    : filledPercent >= 50
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {filledPercent}%
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                >
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {h.coordinator?.name || "Unknown"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(h.created_at), "MMM d, HH:mm")}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {h.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-yellow-600 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                    title="History"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
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

            {/* Right: Live Feed */}
            <div className="lg:col-span-1 space-y-6">
              <div
                className={`bg-white rounded-xl shadow-sm border p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
              >
                <h3
                  className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  <Clock className="w-4 h-4 text-blue-500" />
                  Live Updates
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto mt-3">
                  {recentUpdates.map((u) => (
                    <div
                      key={u.id}
                      className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-green-400 flex-shrink-0"></div>
                        <div>
                          <p
                            className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-800"}`}
                          >
                            <span className="font-medium">
                              {u.coordinator?.name || "Unknown"}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {" "}
                              updated{" "}
                            </span>
                            <span className="font-medium">
                              {u.company?.company_name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {" "}
                              →{" "}
                            </span>
                            <span className="font-medium">
                              {u.location?.location_name}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>Req: {u.requirement || 0}</span>
                            <span>•</span>
                            <span>Filled: {u.filled || 0}</span>
                            <span>•</span>
                            <span>Vacant: {u.vacant || 0}</span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {format(new Date(u.created_at), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentUpdates.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No recent updates
                    </p>
                  )}
                </div>
              </div>
              {/* Quick Actions */}
              <div
                className={`bg-white rounded-xl shadow-sm border p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
              >
                <h3
                  className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"} mb-3`}
                >
                  ⚡ Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction
                    icon={Building}
                    label="Company"
                    onClick={() => {
                      setManagementModalOpen(true);
                      setManagementTab("companies");
                    }}
                    color="blue"
                  />
                  <QuickAction
                    icon={Map}
                    label="Location"
                    onClick={() => {
                      setManagementModalOpen(true);
                      setManagementTab("locations");
                    }}
                    color="indigo"
                  />
                  <QuickAction
                    icon={UserPlus}
                    label="Coordinator"
                    onClick={() => {
                      setManagementModalOpen(true);
                      setManagementTab("coordinators");
                    }}
                    color="purple"
                  />
                  <QuickAction
                    icon={Plus}
                    label="New Entry"
                    onClick={() => navigate("/coordinator")}
                    color="green"
                  />
                  <QuickAction
                    icon={Download}
                    label="Export"
                    onClick={() => toast("Export coming soon")}
                    color="gray"
                  />
                  <QuickAction
                    icon={RefreshCw}
                    label="Refresh"
                    onClick={fetchData}
                    color="gray"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Overview / Analytics / Reports */}
          <div className="mt-8">
            <div
              className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`py-2 px-1 border-b-2 text-sm font-medium ${
                    activeTab === "overview"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : `border-transparent ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`py-2 px-1 border-b-2 text-sm font-medium ${
                    activeTab === "analytics"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : `border-transparent ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`py-2 px-1 border-b-2 text-sm font-medium ${
                    activeTab === "reports"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : `border-transparent ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
                  }`}
                >
                  Reports
                </button>
              </nav>
            </div>

            <div className="py-6">
              {activeTab === "overview" && (
                <div
                  className={`bg-white rounded-xl shadow-sm border p-6 ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
                >
                  <h3
                    className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"} mb-4`}
                  >
                    📊 Summary
                  </h3>
                  <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                    Detailed overview is shown in the table above. Use filters
                    to narrow down.
                  </p>
                </div>
              )}

              {activeTab === "analytics" && (
                <div
                  className={`bg-white rounded-xl shadow-sm border p-6 space-y-8 ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
                >
                  <div>
                    <h4
                      className={`text-md font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-4`}
                    >
                      Company-wise Head Count (All History)
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={(() => {
                          const map: Record<string, any> = {};
                          allRecords.forEach((h) => {
                            const name = h.company?.company_name || "Unknown";
                            if (!map[name])
                              map[name] = {
                                company: name,
                                requirement: 0,
                                filled: 0,
                                vacant: 0,
                              };
                            map[name].requirement += h.requirement || 0;
                            map[name].filled += h.filled || 0;
                            map[name].vacant += h.vacant || 0;
                          });
                          return Object.values(map);
                        })()}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? "#444" : "#ccc"}
                        />
                        <XAxis
                          dataKey="company"
                          stroke={darkMode ? "#aaa" : "#666"}
                        />
                        <YAxis stroke={darkMode ? "#aaa" : "#666"} />
                        <Tooltip
                          contentStyle={
                            darkMode
                              ? {
                                  backgroundColor: "#333",
                                  borderColor: "#555",
                                  color: "#fff",
                                }
                              : {}
                          }
                        />
                        <Legend
                          wrapperStyle={{ color: darkMode ? "#fff" : "#333" }}
                        />
                        <Bar
                          dataKey="requirement"
                          fill="#8884d8"
                          name="Requirement"
                        />
                        <Bar dataKey="filled" fill="#82ca9d" name="Filled" />
                        <Bar dataKey="vacant" fill="#ffc658" name="Vacant" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4
                        className={`text-md font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-4`}
                      >
                        Vacancy Distribution
                      </h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={(() => {
                              const counts = { filled: 0, vacant: 0 };
                              allRecords.forEach((h) => {
                                if ((h.vacant || 0) > 0)
                                  counts.vacant += h.vacant;
                                else counts.filled += h.filled || 0;
                              });
                              return [
                                { name: "Filled", value: counts.filled },
                                { name: "Vacant", value: counts.vacant },
                              ];
                            })()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            <Cell fill="#82ca9d" />
                            <Cell fill="#ff6b6b" />
                          </Pie>
                          <Tooltip
                            contentStyle={
                              darkMode
                                ? {
                                    backgroundColor: "#333",
                                    borderColor: "#555",
                                    color: "#fff",
                                  }
                                : {}
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4
                        className={`text-md font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-4`}
                      >
                        Hourly Submissions (Today)
                      </h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart
                          data={(() => {
                            const hours = Array.from(
                              { length: 24 },
                              (_, i) => ({ hour: i, submissions: 0 }),
                            );
                            const now = new Date();
                            const todayStart = startOfDay(now);
                            allRecords.forEach((h) => {
                              const createdAt = new Date(h.created_at);
                              if (createdAt >= todayStart) {
                                const hour = createdAt.getHours();
                                hours[hour].submissions += 1;
                              }
                            });
                            return hours;
                          })()}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={darkMode ? "#444" : "#ccc"}
                          />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(h) => `${h}:00`}
                            stroke={darkMode ? "#aaa" : "#666"}
                          />
                          <YAxis stroke={darkMode ? "#aaa" : "#666"} />
                          <Tooltip
                            contentStyle={
                              darkMode
                                ? {
                                    backgroundColor: "#333",
                                    borderColor: "#555",
                                    color: "#fff",
                                  }
                                : {}
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="submissions"
                            stroke="#8884d8"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reports" && (
                <div
                  className={`bg-white rounded-xl shadow-sm border p-6 ${darkMode ? "bg-gray-800 border-gray-700" : "border-gray-200"}`}
                >
                  <h3
                    className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"} mb-4`}
                  >
                    📄 Generate Reports
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Daily
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Weekly
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Monthly
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <Download className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Export Excel
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <Download className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Export PDF
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-3 border rounded-md ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      <Printer className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Print
                    </button>
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