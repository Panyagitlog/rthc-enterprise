// src/pages/CoordinatorForm.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Building2, MapPin, Users, UserCheck, UserX,
  ArrowLeft, CheckCircle, Clock, Lock,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Percent,
  Lightbulb, Wifi, WifiOff, Info, X, LogOut, FileText,
  Sun, Moon, UserCircle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchCompanies,
  fetchLocationsByCompany,
  createHeadcountUpdate,
  fetchActiveSchemes,
  createSchemeRequirement,
// @ts-ignore
} from "../services/headcountService";
// @ts-ignore
import { supabase } from "../services/supabase";
import { useTheme } from "../lib/theme/ThemeProvider";
import DMCFSLogo from "../components/brand/DMCFSLogo";

// ---------- Types ----------
type Company = { id: string; company_name: string };
type Location = { id: string; location_name: string };
type Scheme = { id: string; scheme_name: string };
type HistoryEntry = {
  id: string;
  requirement: number;
  filled: number;
  vacant: number;
  shift?: string | null;
  created_at: string;
  coordinator: { name: string } | null;
  schemeName?: string;
  source?: "headcount" | "scheme";
  remarks: string | null;
};

// ---------- Animated Counter Hook ----------
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
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

// ---------- Smart Vacant Status ----------
const getVacantMessage = (vacant: number) => {
  if (vacant > 0) return { icon: UserX, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800", message: `${vacant} Employees Needed` };
  if (vacant < 0) return { icon: UserCheck, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", message: `${Math.abs(vacant)} Employees Above Requirement` };
  return { icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", message: "Fully Balanced" };
};

// ---------- Main Component ----------
export default function CoordinatorForm() {
  const navigate = useNavigate();
  const { isDark: darkMode, toggleTheme } = useTheme();

  // ---------- Dark Mode ----------

  // ---------- State ----------
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [shift, setShift] = useState("");
  const [requirement, setRequirement] = useState("");
  const [filled, setFilled] = useState("");
  const [remarks, setRemarks] = useState("");

  const [companySearch, setCompanySearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Coordinator profile & assignment
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [assignedCompanyId, setAssignedCompanyId] = useState<string | null>(null);
  const [assignedLocationId, setAssignedLocationId] = useState<string | null>(null);

  // Live clock & online
  const [now, setNow] = useState(new Date());
  const clockInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    clockInterval.current = setInterval(() => setNow(new Date()), 1000);
    const handle = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handle);
    window.addEventListener("offline", handle);
    return () => {
      if (clockInterval.current) clearInterval(clockInterval.current);
      window.removeEventListener("online", handle);
      window.removeEventListener("offline", handle);
    };
  }, []);

  const formattedDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Fetch coordinator details
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("users")
            .select("id, name, email, company_id, location_id")
            .eq("auth_user_id", user.id)
            .single();
          
          if (error) {
            console.error("Error fetching user profile:", error);
            toast.error("Failed to load profile data");
            return;
          }
          
          if (data) {
            setCoordinatorId(data.id);
            setCoordinatorName(data.name || "Coordinator");
            setCoordinatorEmail(data.email || "");
            if (data.company_id) {
              setAssignedCompanyId(data.company_id);
              setCompanyId(data.company_id);
            }
            if (data.location_id) {
              setAssignedLocationId(data.location_id);
              setLocationId(data.location_id);
            }
          }
        } else {
          toast.error("Please login to continue");
          navigate("/login");
        }
      } catch (err: any) {
        console.error("Profile fetch error:", err);
        toast.error("Failed to load profile");
      }
    })();
  }, [navigate]);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Submission summary modal
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Profile dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // ---------- Computed ----------
  const vacant = useMemo(() => {
    const req = parseFloat(requirement) || 0;
    const fill = parseFloat(filled) || 0;
    return req - fill;
  }, [requirement, filled]);

  const vacantStatus = useMemo(() => getVacantMessage(vacant), [vacant]);

  const utilization = useMemo(() => {
    const req = parseFloat(requirement) || 0;
    const fill = parseFloat(filled) || 0;
    if (req === 0) return 0;
    return Math.round((fill / req) * 100);
  }, [requirement, filled]);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedLocation = locations.find((l) => l.id === locationId);

  // Last entry from history
  const lastEntry = useMemo(() => (history.length > 0 ? history[0] : null), [history]);

  // Validation
  const isLocationReady = companyId && locationId;
  const isFormValid = isLocationReady && requirement !== "" && filled !== "" && parseFloat(requirement) >= 0 && parseFloat(filled) >= 0 && parseFloat(filled) <= parseFloat(requirement);

  useEffect(() => {
    fetchActiveSchemes()
      .then(setSchemes)
      .catch(() => toast.error("Failed to load schemes"));
  }, []);

  // ---------- Data fetching ----------
  useEffect(() => {
    (async () => {
      try {
        setLoadingCompanies(true);
        if (assignedCompanyId) {
          const { data } = await supabase
            .from("companies")
            .select("id, company_name")
            .eq("id", assignedCompanyId)
            .single();
          setCompanies(data ? [data] : []);
        } else {
          const data = await fetchCompanies();
          setCompanies(data);
        }
      } catch (err: any) {
        toast.error("Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, [assignedCompanyId]);

  useEffect(() => {
    if (!companyId) {
      setLocations([]);
      if (!assignedLocationId) setLocationId("");
      return;
    }
    (async () => {
      setLoadingLocations(true);
      try {
        if (assignedLocationId) {
          const { data } = await supabase
            .from("locations")
            .select("id, location_name")
            .eq("id", assignedLocationId)
            .eq("company_id", companyId)
            .single();
          setLocations(data ? [data] : []);
          if (data && data.id === assignedLocationId) setLocationId(assignedLocationId);
        } else {
          const data = await fetchLocationsByCompany(companyId);
          setLocations(data);
        }
      } catch (err: any) {
        toast.error("Failed to load locations");
      } finally {
        setLoadingLocations(false);
      }
    })();
  }, [companyId, assignedLocationId]);

  // History fetch with error handling
  useEffect(() => {
    if (!isLocationReady || !coordinatorId) {
      setHistory([]);
      setHistoryError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const [{ data: headcountRows, error: headcountError }, { data: schemeRows, error: schemeError }] = await Promise.all([
          supabase
            .from("headcount_updates")
            .select("id, requirement, filled, vacant, shift, created_at, coordinator:users!coordinator_id (name), remarks")
            .eq("company_id", companyId)
            .eq("location_id", locationId)
            .eq("coordinator_id", coordinatorId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("scheme_requirements")
            .select("id, scheme_id, requirement, filled, remarks, report_date, updated_at")
            .eq("company_id", companyId)
            .eq("location_id", locationId)
            .eq("coordinator_id", coordinatorId)
            .order("updated_at", { ascending: false })
            .limit(20),
        ]);
        if (headcountError) throw headcountError;
        if (schemeError) throw schemeError;
        const schemeNames = new Map(schemes.map((scheme) => [scheme.id, scheme.scheme_name]));
        const combinedHistory: HistoryEntry[] = [
          ...((headcountRows || []) as HistoryEntry[]).map((entry) => ({ ...entry, source: "headcount" as const })),
          ...((schemeRows || []) as Array<HistoryEntry & { scheme_id: string; report_date: string; updated_at: string }>).map((entry) => ({
            ...entry,
            source: "scheme" as const,
            schemeName: schemeNames.get(entry.scheme_id) || "Unknown scheme",
            created_at: entry.updated_at || `${entry.report_date}T00:00:00`,
            vacant: entry.requirement - entry.filled,
            shift: null,
            coordinator: { name: coordinatorName || "Coordinator" },
          })),
        ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
        if (!cancelled) {
          setHistory(combinedHistory);
          setHistoryError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("History fetch error:", err);
          setHistory([]);
          setHistoryError(err.message || "Could not load history");
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, locationId, coordinatorId, coordinatorName, schemes, isLocationReady, retryCount]);

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!coordinatorId) return toast.error("Coordinator profile missing.");

    if (assignedCompanyId && companyId !== assignedCompanyId) {
      return toast.error("You can only submit for your assigned company.");
    }

    if (assignedLocationId && locationId !== assignedLocationId) {
      return toast.error("You can only submit for your assigned location.");
    }

    const numericRequirement = parseFloat(requirement);
    const numericFilled = parseFloat(filled);
    if (!schemeId && numericFilled > numericRequirement) {
      return toast.error("Filled count cannot exceed requirement.");
    }
    if (schemeId && (!Number.isFinite(numericRequirement) || !Number.isFinite(numericFilled) || numericRequirement < 0 || numericFilled < 0 || numericFilled > numericRequirement)) {
      return toast.error("Enter valid counts: filled must be between 0 and requirement.");
    }

    const payload = {
      company_id: companyId,
      location_id: locationId,
      shift: shift.trim() || null,
      requirement: numericRequirement,
      filled: numericFilled,
      vacant,
      remarks: remarks.trim() || null,
      coordinator_id: coordinatorId,
      created_at: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (schemeId) {
        const reportDate = new Date().toISOString().slice(0, 10);
        const { data: existingRows, error: existingError } = await supabase
          .from("scheme_requirements")
          .select("id")
          .eq("company_id", companyId)
          .eq("location_id", locationId)
          .eq("scheme_id", schemeId)
          .eq("coordinator_id", coordinatorId)
          .eq("report_date", reportDate)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (existingError) throw existingError;
        const existing = existingRows?.[0];
        const schemePayload = {
          company_id: companyId,
          location_id: locationId,
          scheme_id: schemeId,
          coordinator_id: coordinatorId,
          requirement: numericRequirement,
          filled: numericFilled,
          remarks: remarks.trim() || null,
          report_date: reportDate,
        };
        if (existing) {
          const { error: updateError } = await supabase
            .from("scheme_requirements")
            .update(schemePayload)
            .eq("id", existing.id);
          if (updateError) throw updateError;
        } else {
          await createSchemeRequirement(schemePayload);
        }
      } else {
        await createHeadcountUpdate(payload);
      }
      const summary = {
        companyName: selectedCompany?.company_name || "",
        locationName: selectedLocation?.location_name || "",
        shift: payload.shift || "N/A",
        requirement: payload.requirement,
        filled: payload.filled,
        vacant,
        remarks: payload.remarks || "",
        time: new Date().toLocaleString(),
        submittedBy: coordinatorName || "User",
      };
      setSummaryData(summary);
      setShowSummary(true);

      setShift("");
      setSchemeId("");
      setRequirement("");
      setFilled("");
      setRemarks("");

      // Refresh history
      setRetryCount((c) => c + 1);
    } catch (err: any) {
      toast.error("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Logout ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // ---------- Animated numbers ----------
  const animatedReq = useCountUp(parseFloat(requirement) || 0);
  const animatedFilled = useCountUp(parseFloat(filled) || 0);
  const animatedUtil = useCountUp(utilization);

  // ---------- Filtered options ----------
  const filteredCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    l.location_name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // ---------- Custom Dropdown Render ----------
  const renderDropdown = ({
    options, displayKey, valueKey, selectedValue, onSelect,
    searchValue, onSearchChange, isOpen, setIsOpen,
    placeholder, loading, disabled, icon: Icon, label, required = false,
  }: any) => {
    const selectedOption = options.find((o: any) => o[valueKey] === selectedValue);
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
          {disabled && <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400"><Lock className="w-3.5 h-3.5" /> Assigned</span>}
        </label>
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
            isOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500"
          } ${disabled ? "cursor-not-allowed bg-slate-100 dark:bg-slate-700/70" : "bg-white dark:bg-slate-800"}`}
        >
          <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
            {selectedOption ? selectedOption[displayKey] : placeholder}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </motion.button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-60 overflow-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-slate-800 p-2 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Search ${placeholder.toLowerCase()}...`}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {loading ? (
                <div className="p-4 text-center text-sm text-slate-400">Loading...</div>
              ) : options.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">No options</div>
              ) : (
                options.map((opt: any) => (
                  <div
                    key={opt[valueKey]}
                    onClick={() => { onSelect(opt[valueKey]); setIsOpen(false); }}
                    className={`px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                      opt[valueKey] === selectedValue ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt[displayKey]}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ---------- Trend Data ----------
  const trendData = history.slice(0, 7).map((h) => ({
    date: new Date(h.created_at).toLocaleDateString(),
    value: h.filled,
  })).reverse();

  // ---------- History Table ----------
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<{ key: string; asc: boolean }>({ key: "created_at", asc: false });
  const [historyPage, setHistoryPage] = useState(1);
  const perPage = 5;

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const s = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        h.coordinator?.name?.toLowerCase().includes(s) ||
        h.schemeName?.toLowerCase().includes(s) ||
        h.remarks?.toLowerCase().includes(s) ||
        h.requirement.toString().includes(s) ||
        h.shift?.toLowerCase().includes(s)
    );
  }, [history, historySearch]);

  const sortedHistory = useMemo(() => {
    const arr = [...filteredHistory];
    const { key, asc } = historySort;
    arr.sort((a: any, b: any) => {
      let aVal = key === "created_at" ? new Date(a.created_at).getTime() : a[key];
      let bVal = key === "created_at" ? new Date(b.created_at).getTime() : b[key];
      if (aVal < bVal) return asc ? -1 : 1;
      if (aVal > bVal) return asc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredHistory, historySort]);

  const totalHistoryPages = Math.ceil(sortedHistory.length / perPage);
  const paginatedHistory = sortedHistory.slice((historyPage - 1) * perPage, historyPage * perPage);

  const toggleHistorySort = (key: string) => {
    if (historySort.key === key) setHistorySort({ key, asc: !historySort.asc });
    else setHistorySort({ key, asc: false });
  };

  // ---------- JSX ----------
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-900 font-body transition-colors duration-200">
      <Toaster position="top-right" />

      {/* Sticky Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/50 shadow-sm transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/dashboard")} 
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <DMCFSLogo size="sm" className="w-[118px]" />
            <div className="hidden leading-tight sm:block">
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white">RTHC Coordinator</span>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Real-Time Head Count</p>
            </div>
            {coordinatorName && (
              <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                👤 {coordinatorName}
              </span>
            )}
            {selectedCompany && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Building2 className="w-4 h-4" /> {selectedCompany.company_name}
              </div>
            )}
            {selectedLocation && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" /> {selectedLocation.location_name}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">{formattedDate}</span>
              <span className="font-mono font-medium">{formattedTime}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isOnline ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? "Live" : "Offline"}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              >
                <UserCircle className="w-6 h-6" />
              </button>
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <p className="font-medium text-slate-900 dark:text-white">{coordinatorName || "User"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{coordinatorEmail || "No email"}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        My Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Selection Wizard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderDropdown({
            options: filteredCompanies,
            displayKey: "company_name",
            valueKey: "id",
            selectedValue: companyId,
            onSelect: (val: string) => { setCompanyId(val); if (!assignedLocationId) setLocationId(""); },
            searchValue: companySearch,
            onSearchChange: setCompanySearch,
            isOpen: isCompanyOpen,
            setIsOpen: setIsCompanyOpen,
            placeholder: "Select a company",
            loading: loadingCompanies,
            disabled: loadingCompanies || submitting || !!assignedCompanyId,
            icon: Building2,
            label: "Company",
            required: true,
          })}
          {renderDropdown({
            options: filteredLocations,
            displayKey: "location_name",
            valueKey: "id",
            selectedValue: locationId,
            onSelect: setLocationId,
            searchValue: locationSearch,
            onSearchChange: setLocationSearch,
            isOpen: isLocationOpen,
            setIsOpen: setIsLocationOpen,
            placeholder: !companyId ? "Select a company first" : "Select a location",
            loading: loadingLocations,
            disabled: !companyId || loadingLocations || submitting || !!assignedLocationId,
            icon: MapPin,
            label: "Location",
            required: true,
          })}
        </motion.div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Scheme <span className="text-rose-500">*</span></label>
          <select
            value={schemeId}
            onChange={(event) => setSchemeId(event.target.value)}
            disabled={!isLocationReady || submitting}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-700/50"
          >
            <option value="">Select a scheme</option>
            {schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.scheme_name}</option>)}
          </select>
        </div>

        {/* Last Entry Card */}
        {isLocationReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              lastEntry 
                ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            } transition-colors duration-200`}
          >
            {lastEntry ? (
              <>
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Your Last Entry ({coordinatorName || "You"})
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    {new Date(lastEntry.created_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {new Date(lastEntry.created_at).toLocaleTimeString()}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-300">Requirement:</span>{" "}
                      <span className="font-mono text-blue-800 dark:text-blue-300">{lastEntry.requirement}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-300">Filled:</span>{" "}
                      <span className="font-mono text-blue-800 dark:text-blue-300">{lastEntry.filled}</span>
                    </div>
                    {lastEntry.shift && (
                      <div>
                        <span className="font-medium text-blue-800 dark:text-blue-300">Shift:</span>{" "}
                        <span className="text-blue-800 dark:text-blue-300">{lastEntry.shift}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <Info className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No previous entries found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your submissions for this location will appear here.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* KPIs */}
        {isLocationReady && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Requirement", value: animatedReq, icon: Users, diff: lastEntry ? parseFloat(requirement) - lastEntry.requirement : null },
              { label: "Filled", value: animatedFilled, icon: UserCheck, diff: lastEntry ? parseFloat(filled) - lastEntry.filled : null, last: lastEntry?.filled },
              { label: "Utilisation", value: `${animatedUtil}%`, icon: Percent, diff: null },
              { label: "Status", value: vacantStatus.message, icon: vacantStatus.icon, diff: null, isStatus: true },
            ].map((card, i) => (
              <motion.div 
                key={card.label} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }} 
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <card.icon className={`w-5 h-5 ${card.isStatus ? vacantStatus.color : "text-slate-400 dark:text-slate-500"}`} />
                  <span className="text-xl font-display font-bold text-slate-900 dark:text-white">{card.value}</span>
                  {card.diff !== null && card.diff !== 0 && (
                    <span className={`ml-1 text-xs font-medium ${card.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {card.diff > 0 ? `+${card.diff}` : card.diff}
                      {card.diff > 0 ? <TrendingUp className="w-3 h-3 inline ml-0.5" /> : <TrendingDown className="w-3 h-3 inline ml-0.5" />}
                    </span>
                  )}
                </div>
                {card.last !== undefined && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Last: <span className="font-mono">{card.last}</span>
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Entry Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-6 transition-colors duration-200">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-indigo-500" />
            Today's Head Count
            {!isLocationReady && (
              <span className="ml-auto text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                Select company & location first
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Shift (optional)</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                disabled={!isLocationReady || submitting}
                className={`w-full rounded-lg px-4 py-2.5 border transition-colors ${
                  isLocationReady 
                    ? "border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                    : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                <option value="">Select shift</option>
                <option value="Morning">Morning</option>
                <option value="Mid">Mid</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Requirement <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0" 
                  step="1" 
                  value={requirement} 
                  onChange={(e) => setRequirement(e.target.value)} 
                  disabled={!isLocationReady} 
                  className={`w-full rounded-lg px-4 py-2.5 border transition-colors ${
                    isLocationReady 
                      ? "border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  }`} 
                  placeholder={isLocationReady ? "0" : "Locked"} 
                />
                {!isLocationReady && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              </div>
              {lastEntry && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Last: <span className="font-mono text-slate-500 dark:text-slate-400">{lastEntry.requirement}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Filled <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0" 
                  max="99999" 
                  step="1" 
                  value={filled} 
                  onChange={(e) => setFilled(e.target.value)} 
                  disabled={!isLocationReady} 
                  className={`w-full rounded-lg px-4 py-2.5 border transition-colors ${
                    isLocationReady 
                      ? "border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  }`} 
                  placeholder={isLocationReady ? "0" : "Locked"} 
                />
                {!isLocationReady && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Max 99,999</p>
              {lastEntry && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Last Filled: <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{lastEntry.filled}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Remarks</label>
            <textarea 
              rows={3} 
              maxLength={300} 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              placeholder="Optional notes (max 300 characters)" 
              disabled={!isLocationReady} 
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors" 
            />
            <div className="flex justify-end text-xs text-slate-400 dark:text-slate-500 mt-1">{remarks.length}/300</div>
          </div>
        </motion.div>

        {/* Vacant Indicator */}
        {isLocationReady && requirement !== "" && filled !== "" && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${vacantStatus.bg} transition-colors duration-200`}>
            <vacantStatus.icon className={`w-5 h-5 ${vacantStatus.color}`} />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Vacant Status</p>
              <p className={`text-lg font-display font-bold ${vacantStatus.color}`}>{vacantStatus.message}</p>
            </div>
          </motion.div>
        )}

        {/* Live Analytics & Smart Suggestions */}
        {isLocationReady && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm transition-colors duration-200">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Live Analytics</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.2" className="dark:stroke-slate-700" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#818cf8" strokeWidth="3.2" strokeDasharray="100" strokeDashoffset={100 - utilization} className="transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-display font-bold text-slate-900 dark:text-white">{utilization}%</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Requirement vs Filled</div>
                  <div className="flex items-end gap-2 h-8">
                    <div className="w-1/2 bg-indigo-300 dark:bg-indigo-700 rounded-t" style={{ height: `${Math.min(100, ((parseFloat(requirement) || 0) / Math.max(parseFloat(requirement) || 1, 1)) * 100)}%` }} />
                    <div className="w-1/2 bg-emerald-300 dark:bg-emerald-700 rounded-t" style={{ height: `${Math.min(100, ((parseFloat(filled) || 0) / Math.max(parseFloat(requirement) || 1, 1)) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1"><span>Req</span><span>Filled</span></div>
                </div>
              </div>
              {trendData.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trend (last entries)</div>
                  <div className="flex items-end gap-1 h-8">
                    {trendData.map((d, i) => (
                      <div key={i} className="flex-1 bg-indigo-200 dark:bg-indigo-800 rounded-t" style={{ height: `${(d.value / Math.max(1, Math.max(...trendData.map(d => d.value)))) * 100}%` }} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors duration-200 ${
              vacant < 0 
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300" 
                : vacant > 0 
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" 
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            }`}>
              <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Smart Suggestion</p>
                <p className="text-sm">
                  {vacant < 0 ? `Suggested Hiring: Need ${Math.abs(vacant)} more workers to meet requirement.` : vacant > 0 ? `Surplus Workforce: ${vacant} extra workers above requirement.` : "Perfect balance — no action needed."}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Submit Button */}
        <motion.div className="flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={handleSubmit} 
            disabled={!isFormValid || submitting} 
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (<><Loader2 className="w-5 h-5 animate-spin" />Submitting...</>) : (<><CheckCircle className="w-5 h-5" />Submit Head Count</>)}
          </motion.button>
        </motion.div>

        {/* History Table */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden transition-colors duration-200">
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">My Previous Entries</h3>
            <div className="flex items-center gap-2">
              {historyError && (
                <button onClick={() => setRetryCount((c) => c + 1)} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline">
                  Retry
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search entries..." 
                  className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors" 
                  value={historySearch} 
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }} 
                />
              </div>
            </div>
          </div>

          {historyError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">⚠️ {historyError}</p>
              <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                    <tr>
                      {[ { key: "created_at", label: "Time" }, { key: null, label: "Scheme" }, { key: null, label: "Shift" }, { key: "requirement", label: "Req" }, { key: "filled", label: "Filled" }, { key: null, label: "Vacant" }, { key: null, label: "Remarks" } ].map((col) => (
                        <th key={col.label} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors" onClick={() => col.key && toggleHistorySort(col.key)}>
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.key && historySort.key === col.key && (historySort.asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {loadingHistory ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>))}</tr>
                      ))
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No entries found for you.</td></tr>
                    ) : (
                      paginatedHistory.map((entry) => {
                        const entryVacant = entry.filled - entry.requirement;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{entry.schemeName || (entry.source === "headcount" ? "General headcount" : "—")}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{entry.shift || "—"}</td>
                            <td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{entry.requirement}</td>
                            <td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{entry.filled}</td>
                            <td className={`px-4 py-2 font-medium ${entryVacant < 0 ? "text-rose-600 dark:text-rose-400" : entryVacant > 0 ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}`}>{entryVacant >= 0 ? "+" : ""}{entryVacant}</td>
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{entry.remarks || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalHistoryPages > 1 && (
                <div className="p-3 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50">
                  <button onClick={() => setHistoryPage(Math.max(1, historyPage - 1))} disabled={historyPage === 1} className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Previous</button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Page {historyPage} of {totalHistoryPages}</span>
                  <button onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))} disabled={historyPage === totalHistoryPages} className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Next</button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>

      {/* Submission Summary Modal */}
      <AnimatePresence>
        {showSummary && summaryData && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                  <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">Submitted Successfully</h2>
                </div>
                <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Company</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.companyName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Location</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.locationName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Shift</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.shift}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Requirement</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.requirement}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Filled</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.filled}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Vacant</span><span className={`font-medium ${summaryData.vacant < 0 ? "text-rose-600 dark:text-rose-400" : summaryData.vacant > 0 ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}`}>{summaryData.vacant >= 0 ? "+" : ""}{summaryData.vacant}</span></div>
                {summaryData.remarks && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Remarks</span><span className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">{summaryData.remarks}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Time</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.time}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Submitted by</span><span className="font-medium text-slate-900 dark:text-white">{summaryData.submittedBy}</span></div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowSummary(false)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-700/50 pt-4 flex flex-wrap justify-center gap-4 pb-6">
        <span>Real Time Head Count System v1.0</span>
        <span>•</span>
        <span>Enterprise Workforce Management</span>
        <span>•</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}