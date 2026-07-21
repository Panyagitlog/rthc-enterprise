// src/pages/CoordinatorForm.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Building2, MapPin, Users, UserCheck, UserX,
  MessageSquare, ArrowLeft, CheckCircle, Clock, RefreshCw, Lock,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Percent,
  Lightbulb, Wifi, WifiOff, Info, X, LogOut
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchCompanies,
  fetchLocationsByCompany,
  createHeadcountUpdate,
} from "../services/headcountService";
import { supabase } from "../services/supabase";

// ---------- Types ----------
type Company = { id: string; company_name: string };
type Location = { id: string; location_name: string };
type HistoryEntry = {
  id: string;
  requirement: number;
  filled: number;
  vacant: number;
  shift: string | null;
  created_at: string;
  coordinator: { name: string } | null;
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
  if (vacant < 0) return { icon: UserX, color: "text-rose-600", bg: "bg-rose-50 border-rose-200", message: `🔴 Need ${Math.abs(vacant)} Employees` };
  if (vacant > 0) return { icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", message: `🟢 ${vacant} Extra Employees` };
  return { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", message: "🟡 Fully Balanced" };
};

// ---------- Main Component ----------
export default function CoordinatorForm() {
  const navigate = useNavigate();

  // ---------- State ----------
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [shift, setShift] = useState("");
  const [requirement, setRequirement] = useState("");
  const [filled, setFilled] = useState("");
  const [remarks, setRemarks] = useState("");

  const [companySearch, setCompanySearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // ---------- Coordinator profile & assignment ----------
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [assignedCompanyId, setAssignedCompanyId] = useState<string | null>(null);
  const [assignedLocationId, setAssignedLocationId] = useState<string | null>(null);

  // ---------- Live clock & online ----------
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

  // ---------- Fetch coordinator details ----------
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("id, name, company_id, location_id")
          .eq("auth_user_id", user.id)
          .single();
        if (data) {
          setCoordinatorId(data.id);
          setCoordinatorName(data.name);
          if (data.company_id) {
            setAssignedCompanyId(data.company_id);
            setCompanyId(data.company_id); // auto-select
          }
          if (data.location_id) {
            setAssignedLocationId(data.location_id);
            setLocationId(data.location_id); // auto-select
          }
        }
      }
    })();
  }, []);

  // ---------- History state ----------
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ---------- Submission summary modal ----------
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // ---------- Computed ----------
  const vacant = useMemo(() => {
    const req = parseFloat(requirement) || 0;
    const fill = parseFloat(filled) || 0;
    return fill - req;
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

  // ---------- Previous entry for comparison ----------
  const previousEntry = history.length > 0 ? history[0] : null;
  const prevReq = previousEntry?.requirement ?? undefined;
  const prevFilled = previousEntry?.filled ?? undefined;

  // ---------- Validation ----------
  const isLocationReady = companyId && locationId;
  const isFormValid = isLocationReady && requirement !== "" && filled !== "" && parseFloat(requirement) >= 0 && parseFloat(filled) >= 0 && parseFloat(filled) <= 99999;

  // ---------- Data fetching ----------
  useEffect(() => {
    (async () => {
      try {
        setLoadingCompanies(true);
        if (assignedCompanyId) {
          // Only fetch the assigned company
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
        toast.error("Failed to load companies: " + err.message);
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
        // If coordinator is assigned to a specific location, show only that one
        if (assignedLocationId) {
          const { data } = await supabase
            .from("locations")
            .select("id, location_name")
            .eq("id", assignedLocationId)
            .eq("company_id", companyId)
            .single();
          setLocations(data ? [data] : []);
          setLocationId(assignedLocationId); // keep it selected
        } else {
          const data = await fetchLocationsByCompany(companyId);
          setLocations(data);
        }
      } catch (err: any) {
        toast.error("Failed to load locations: " + err.message);
      } finally {
        setLoadingLocations(false);
      }
    })();
  }, [companyId, assignedLocationId]);

  // Fetch history – only current coordinator's entries
  useEffect(() => {
    if (!isLocationReady || !coordinatorId) {
      setHistory([]);
      return;
    }
    (async () => {
      setLoadingHistory(true);
      try {
        const { data } = await supabase
          .from("headcount_updates")
          .select(
            "id, requirement, filled, vacant, shift, created_at, coordinator:users (name), remarks"
          )
          .eq("company_id", companyId)
          .eq("location_id", locationId)
          .eq("coordinator_id", coordinatorId)
          .order("created_at", { ascending: false })
          .limit(20);
        setHistory(data || []);
      } catch (err: any) {
        toast.error("Failed to load history: " + err.message);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [companyId, locationId, coordinatorId]);

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!coordinatorId) {
      toast.error("Coordinator profile missing.");
      return;
    }

    const payload = {
      company_id: companyId,
      location_id: locationId,
      shift: shift.trim() || null,
      requirement: parseFloat(requirement),
      filled: parseFloat(filled),
      vacant,
      remarks: remarks.trim() || null,
      coordinator_id: coordinatorId,
      created_at: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await createHeadcountUpdate(payload);
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

      // Reset form (keep company/location if assigned)
      setShift("");
      setRequirement("");
      setFilled("");
      setRemarks("");

      // Refresh history
      const { data: freshHistory } = await supabase
        .from("headcount_updates")
        .select(
          "id, requirement, filled, vacant, shift, created_at, coordinator:users (name), remarks"
        )
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .eq("coordinator_id", coordinatorId)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory(freshHistory || []);
    } catch (err: any) {
      toast.error("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Logout ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
    options,
    displayKey,
    valueKey,
    selectedValue,
    onSelect,
    searchValue,
    onSearchChange,
    isOpen,
    setIsOpen,
    placeholder,
    loading,
    disabled,
    icon: Icon,
    label,
    required = false,
  }: {
    options: any[];
    displayKey: string;
    valueKey: string;
    selectedValue: string;
    onSelect: (val: string) => void;
    searchValue: string;
    onSearchChange: (val: string) => void;
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    placeholder: string;
    loading: boolean;
    disabled: boolean;
    icon: any;
    label: string;
    required?: boolean;
  }) => {
    const selectedOption = options.find((o) => o[valueKey] === selectedValue);
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
          {disabled && <Lock className="w-4 h-4 inline ml-1 text-slate-400" />}
        </label>
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
            isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20"
              : "border-slate-200 hover:border-indigo-300"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "bg-white"}`}
        >
          <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <span className="flex-1 truncate text-slate-700">
            {selectedOption ? selectedOption[displayKey] : placeholder}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto"
            >
              <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                options.map((opt) => (
                  <div
                    key={opt[valueKey]}
                    onClick={() => {
                      onSelect(opt[valueKey]);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-indigo-50 ${
                      opt[valueKey] === selectedValue
                        ? "bg-indigo-100 text-indigo-700 font-medium"
                        : "text-slate-700"
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
    <div className="min-h-screen bg-slate-50/80 font-body">
      <Toaster position="top-right" />

      {/* Sticky Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-display font-bold text-lg text-slate-900">RTHC Coordinator</span>
            {selectedCompany && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                <Building2 className="w-4 h-4" />
                {selectedCompany.company_name}
              </div>
            )}
            {selectedLocation && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" />
                {selectedLocation.location_name}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">{formattedDate}</span>
              <span className="font-mono font-medium">{formattedTime}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? "Live" : "Offline"}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Selection Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {renderDropdown({
            options: filteredCompanies,
            displayKey: "company_name",
            valueKey: "id",
            selectedValue: companyId,
            onSelect: (val) => { setCompanyId(val); setLocationId(""); },
            searchValue: companySearch,
            onSearchChange: setCompanySearch,
            isOpen: isCompanyOpen,
            setIsOpen: setIsCompanyOpen,
            placeholder: "Select a company",
            loading: loadingCompanies,
            disabled: !!assignedCompanyId || submitting, // locked if assigned
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
            disabled: !companyId || !!assignedLocationId || submitting,
            icon: MapPin,
            label: "Location",
            required: true,
          })}
        </motion.div>

        {/* KPIs (only if location ready) */}
        {isLocationReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { label: "Requirement", value: animatedReq, icon: Users, diff: prevReq !== undefined ? parseFloat(requirement) - prevReq : null },
              { label: "Filled", value: animatedFilled, icon: UserCheck, diff: prevFilled !== undefined ? parseFloat(filled) - prevFilled : null },
              { label: "Utilisation", value: `${animatedUtil}%`, icon: Percent, diff: null },
              { label: "Status", value: vacantStatus.message, icon: vacantStatus.icon, diff: null, isStatus: true },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <card.icon className={`w-5 h-5 ${card.isStatus ? vacantStatus.color : "text-slate-400"}`} />
                  <span className="text-xl font-display font-bold text-slate-900">{card.value}</span>
                  {card.diff !== null && (
                    <span className={`ml-1 text-xs font-medium ${card.diff > 0 ? "text-emerald-600" : card.diff < 0 ? "text-rose-600" : "text-slate-400"}`}>
                      {card.diff > 0 ? `+${card.diff}` : card.diff}
                      {card.diff !== 0 && (card.diff > 0 ? <TrendingUp className="w-3 h-3 inline ml-0.5" /> : <TrendingDown className="w-3 h-3 inline ml-0.5" />)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Entry Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-indigo-500" />
            Today’s Head Count
            {!isLocationReady && (
              <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Select company & location first
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Shift (optional)</label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                disabled={!isLocationReady}
                placeholder="e.g., Morning, Night"
                className={`w-full rounded-lg px-4 py-2.5 border transition-shadow ${
                  isLocationReady ? "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" : "bg-slate-50 text-slate-400 cursor-not-allowed"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Requirement <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  disabled={!isLocationReady}
                  className={`w-full rounded-lg px-4 py-2.5 border transition-shadow ${
                    isLocationReady ? "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" : "bg-slate-50 text-slate-400 cursor-not-allowed"
                  }`}
                  placeholder={isLocationReady ? "0" : "Locked"}
                />
                {!isLocationReady && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Filled <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="99999"
                  step="1"
                  value={filled}
                  onChange={(e) => setFilled(e.target.value)}
                  disabled={!isLocationReady}
                  className={`w-full rounded-lg px-4 py-2.5 border transition-shadow ${
                    isLocationReady ? "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" : "bg-slate-50 text-slate-400 cursor-not-allowed"
                  }`}
                  placeholder={isLocationReady ? "0" : "Locked"}
                />
                {!isLocationReady && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">Max 99,999</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks</label>
            <textarea
              rows={3}
              maxLength={300}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes (max 300 characters)"
              disabled={!isLocationReady}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end text-xs text-slate-400 mt-1">{remarks.length}/300</div>
          </div>
        </motion.div>

        {/* Vacant Indicator (human readable) */}
        {isLocationReady && requirement !== "" && filled !== "" && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${vacantStatus.bg}`}
          >
            <vacantStatus.icon className={`w-5 h-5 ${vacantStatus.color}`} />
            <div>
              <p className="text-sm font-medium text-slate-800">Vacant Status</p>
              <p className={`text-lg font-display font-bold ${vacantStatus.color}`}>{vacantStatus.message}</p>
            </div>
          </motion.div>
        )}

        {/* Live Analytics & Smart Suggestions */}
        {isLocationReady && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Live Analytics</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#818cf8" strokeWidth="3.2"
                      strokeDasharray="100"
                      strokeDashoffset={100 - utilization}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-display font-bold text-slate-900">{utilization}%</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-2">Requirement vs Filled</div>
                  <div className="flex items-end gap-2 h-8">
                    <div className="w-1/2 bg-indigo-300 rounded-t" style={{ height: `${Math.min(100, ((parseFloat(requirement) || 0) / Math.max(parseFloat(requirement) || 1, 1)) * 100)}%` }} />
                    <div className="w-1/2 bg-emerald-300 rounded-t" style={{ height: `${Math.min(100, ((parseFloat(filled) || 0) / Math.max(parseFloat(requirement) || 1, 1)) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Req</span>
                    <span>Filled</span>
                  </div>
                </div>
              </div>
              {trendData.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-slate-500 mb-1">Trend (last entries)</div>
                  <div className="flex items-end gap-1 h-8">
                    {trendData.map((d, i) => (
                      <div key={i} className="flex-1 bg-indigo-200 rounded-t" style={{ height: `${(d.value / Math.max(1, Math.max(...trendData.map(d => d.value)))) * 100}%` }} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                vacant < 0 ? "bg-amber-50 border-amber-200 text-amber-800" :
                vacant > 0 ? "bg-blue-50 border-blue-200 text-blue-800" :
                "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Smart Suggestion</p>
                <p className="text-sm">
                  {vacant < 0 ? `Suggested Hiring: Need ${Math.abs(vacant)} more workers to meet requirement.` :
                   vacant > 0 ? `Surplus Workforce: ${vacant} extra workers above requirement.` :
                   "Perfect balance — no action needed."}
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
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Submit Head Count
              </>
            )}
          </motion.button>
        </motion.div>

        {/* History Table – Only current coordinator's entries */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">My Previous Entries</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search entries..."
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    { key: "created_at", label: "Time" },
                    { key: null, label: "Shift" },
                    { key: "requirement", label: "Req" },
                    { key: "filled", label: "Filled" },
                    { key: null, label: "Vacant" },
                    { key: null, label: "Remarks" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none"
                      onClick={() => col.key && toggleHistorySort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.key && historySort.key === col.key && (
                          historySort.asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No entries found for you.</td>
                  </tr>
                ) : (
                  paginatedHistory.map((entry) => {
                    const entryVacant = entry.filled - entry.requirement;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2 text-slate-700">{entry.shift || "—"}</td>
                        <td className="px-4 py-2 font-mono text-slate-800">{entry.requirement}</td>
                        <td className="px-4 py-2 font-mono text-slate-800">{entry.filled}</td>
                        <td className={`px-4 py-2 font-medium ${entryVacant < 0 ? "text-rose-600" : entryVacant > 0 ? "text-blue-600" : "text-emerald-600"}`}>
                          {entryVacant >= 0 ? "+" : ""}{entryVacant}
                        </td>
                        <td className="px-4 py-2 text-slate-500 max-w-[200px] truncate">{entry.remarks || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalHistoryPages > 1 && (
            <div className="p-3 flex items-center justify-between border-t border-slate-200/60">
              <button
                onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1 text-sm rounded-lg border border-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {historyPage} of {totalHistoryPages}</span>
              <button
                onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))}
                disabled={historyPage === totalHistoryPages}
                className="px-3 py-1 text-sm rounded-lg border border-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Submission Summary Modal */}
      <AnimatePresence>
        {showSummary && summaryData && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                  <h2 className="text-lg font-display font-bold">Submitted Successfully</h2>
                </div>
                <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-medium">{summaryData.companyName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium">{summaryData.locationName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shift</span><span className="font-medium">{summaryData.shift}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Requirement</span><span className="font-medium">{summaryData.requirement}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Filled</span><span className="font-medium">{summaryData.filled}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vacant</span><span className={`font-medium ${summaryData.vacant < 0 ? "text-rose-600" : summaryData.vacant > 0 ? "text-blue-600" : "text-emerald-600"}`}>{summaryData.vacant >= 0 ? "+" : ""}{summaryData.vacant}</span></div>
                {summaryData.remarks && <div className="flex justify-between"><span className="text-slate-500">Remarks</span><span className="font-medium max-w-[200px] truncate">{summaryData.remarks}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-medium">{summaryData.time}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Submitted by</span><span className="font-medium">{summaryData.submittedBy}</span></div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSummary(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-200/60 pt-4 flex flex-wrap justify-center gap-4 pb-6">
        <span>Real Time Head Count System v1.0</span>
        <span>•</span>
        <span>Enterprise Workforce Management</span>
        <span>•</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}