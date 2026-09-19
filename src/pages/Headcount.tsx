// src/pages/Headcount.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, Users, UserCheck, RefreshCw,
  Clock, AlertTriangle, X, Building, MapPin,
  User, Mail, Phone, Calendar, Eye, ChevronDown,
  ChevronUp, Download, FileSpreadsheet, Filter,
  Sun, Moon, Wifi, Database, UserPlus, UserMinus,
  Activity
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import toast from "react-hot-toast";
import * as XLSX from 'xlsx';
// @ts-ignore
import { supabase } from "../services/supabase";

// ---------- Types ----------
interface Coordinator {
  id: string;
  auth_user_id: string;
  employee_code: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  company_id: string | null;
  location_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface HeadcountRecord {
  id: string;
  company_id: string;
  location_id: string;
  coordinator_id: string;
  shift: string | null;
  requirement: number;
  filled: number;
  vacant: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  company_name: string;
  company_code: string;
  contact_person: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  location_name: string;
  location_code: string;
  company_id: string;
  address: string;
  city: string;
  state: string;
  contact_person: string;
  mobile: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ---------- Component ----------
export default function HeadcountPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [headcountRecords, setHeadcountRecords] = useState<HeadcountRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [showOnlyWithData, setShowOnlyWithData] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // ---------- Fetch data ----------
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching coordinators...');
      const { data: coordinatorsData, error: coordError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "COORDINATOR")
        .eq("status", "ACTIVE")
        .order("name");

      if (coordError) throw coordError;
      console.log(`✅ Found ${coordinatorsData?.length || 0} coordinators`);

      // FIXED: Using the correct table name - headcount_updates (plural)
      console.log('🔄 Fetching headcount records from headcount_updates...');
      const { data: headcountData, error: headcountError } = await supabase
        .from("headcount_updates")  // ← Fixed: plural with 's'
        .select("*")
        .order("updated_at", { ascending: false });

      if (headcountError) {
        console.error('❌ Headcount fetch error:', headcountError);
        setHeadcountRecords([]);
      } else {
        console.log(`✅ Found ${headcountData?.length || 0} headcount records`);
        setHeadcountRecords(headcountData || []);
      }

      console.log('🔄 Fetching companies...');
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("company_name");

      if (companiesError) throw companiesError;
      console.log(`✅ Found ${companiesData?.length || 0} companies`);

      console.log('🔄 Fetching locations...');
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .order("location_name");

      if (locationsError) throw locationsError;
      console.log(`✅ Found ${locationsData?.length || 0} locations`);

      setCoordinators(coordinatorsData || []);
      setCompanies(companiesData || []);
      setLocations(locationsData || []);
      setLastUpdated(new Date());

      if ((coordinatorsData || []).length === 0) {
        setError('No coordinators found in the database.');
      }

    } catch (err: any) {
      console.error('❌ Error in fetchData:', err);
      setError(err.message || 'Failed to load data.');
      toast.error("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Setup Realtime Subscriptions ----------
  const setupRealtime = useCallback(() => {
    try {
      console.log('🔄 Setting up real-time subscriptions...');

      // Subscribe to headcount_updates table changes
      const channel = supabase
        .channel('headcount-updates-channel')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'headcount_updates'
          },
          (payload) => {
            console.log('📡 Real-time update received:', payload);
            // Refresh data when any change occurs
            fetchData();
            toast.success('📊 Headcount data updated in real-time!');
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
            console.log('✅ Real-time connected successfully!');
          } else {
            setIsRealtimeConnected(false);
          }
        });

      // Also subscribe to users table changes (in case coordinator status changes)
      const userChannel = supabase
        .channel('users-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            console.log('📡 User change detected:', payload);
            fetchData();
          }
        )
        .subscribe();

      return () => {
        console.log('🔄 Cleaning up real-time subscriptions...');
        supabase.removeChannel(channel);
        supabase.removeChannel(userChannel);
      };
    } catch (err) {
      console.error('❌ Error setting up realtime:', err);
    }
  }, []);

  // Initial data fetch and realtime setup
  useEffect(() => {
    fetchData();
    const cleanup = setupRealtime();

    // Auto-refresh every 30 seconds as backup
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, []);

  // ---------- Helper functions ----------
  const getHeadcountByCoordinator = (coordinatorId: string) => {
    return headcountRecords.filter(hc => hc.coordinator_id === coordinatorId);
  };

  const getCompanyById = (companyId: string | null) => {
    if (!companyId) return null;
    return companies.find(c => c.id === companyId);
  };

  const getLocationById = (locationId: string | null) => {
    if (!locationId) return null;
    return locations.find(l => l.id === locationId);
  };

  // Check if coordinator submitted today (has any record updated today)
  const hasSubmittedToday = (coordinatorId: string) => {
    const today = new Date();
    const startOfToday = startOfDay(today).toISOString();
    const endOfToday = endOfDay(today).toISOString();
    
    return headcountRecords.some(hc => 
      hc.coordinator_id === coordinatorId &&
      hc.updated_at >= startOfToday &&
      hc.updated_at <= endOfToday
    );
  };

  // Get last submission date for coordinator
  const getLastSubmission = (coordinatorId: string) => {
    const records = headcountRecords
      .filter(hc => hc.coordinator_id === coordinatorId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    return records.length > 0 ? records[0].updated_at : null;
  };

  // ---------- Computed sets ----------
  const submittedIds = useMemo(() => {
    const ids = new Set<string>();
    headcountRecords.forEach(hc => {
      if (hasSubmittedToday(hc.coordinator_id)) {
        ids.add(hc.coordinator_id);
      }
    });
    return ids;
  }, [headcountRecords]);

  // ---------- Filtered list ----------
  const filteredCoordinators = useMemo(() => {
    let list = coordinators;

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          (c.mobile || "").includes(s) ||
          c.employee_code.toLowerCase().includes(s)
      );
    }

    if (companyFilter) {
      list = list.filter((c) => c.company_id === companyFilter);
    }

    if (locationFilter) {
      list = list.filter((c) => c.location_id === locationFilter);
    }

    if (showOnlyPending) {
      list = list.filter((c) => !submittedIds.has(c.id));
    }

    if (showOnlyWithData) {
      list = list.filter((c) => getHeadcountByCoordinator(c.id).length > 0);
    }

    return list;
  }, [coordinators, search, companyFilter, locationFilter, showOnlyPending, showOnlyWithData, submittedIds, headcountRecords]);

  // Pagination
  const displayedCoordinators = filteredCoordinators.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCoordinators.length;

  // ---------- Stats ----------
  const totalCoordinators = coordinators.length;
  const submittedCount = submittedIds.size;
  const pendingCount = totalCoordinators - submittedCount;
  const totalHeadcountRecords = headcountRecords.length;
  const coordinatorsWithData = coordinators.filter(c => getHeadcountByCoordinator(c.id).length > 0).length;

  const totalRequirement = headcountRecords.reduce((sum, hc) => sum + hc.requirement, 0);
  const totalFilled = headcountRecords.reduce((sum, hc) => sum + hc.filled, 0);
  const totalVacant = headcountRecords.reduce((sum, hc) => sum + hc.vacant, 0);
  const fillRate = totalRequirement > 0 ? Math.round((totalFilled / totalRequirement) * 100) : 0;

  // ---------- Export Excel ----------
  const handleExportExcel = () => {
    try {
      const excelData: any[] = [];

      filteredCoordinators.forEach(coordinator => {
        const hcRecords = getHeadcountByCoordinator(coordinator.id);
        const company = getCompanyById(coordinator.company_id);
        const location = getLocationById(coordinator.location_id);
        const hasSubmitted = submittedIds.has(coordinator.id);
        
        if (hcRecords.length > 0) {
          hcRecords.forEach((hc, index) => {
            excelData.push({
              'Coordinator': coordinator.name,
              'Employee Code': coordinator.employee_code,
              'Email': coordinator.email,
              'Mobile': coordinator.mobile || 'N/A',
              'Company': company?.company_name || 'N/A',
              'Location': location?.location_name || 'N/A',
              'Record #': index + 1,
              'Shift': hc.shift || 'N/A',
              'Requirement': hc.requirement,
              'Filled': hc.filled,
              'Vacant': hc.vacant,
              'Fill Rate %': hc.requirement > 0 ? Math.round((hc.filled / hc.requirement) * 100) : 0,
              'Remarks': hc.remarks || 'N/A',
              'Last Updated': format(new Date(hc.updated_at), 'MMM dd, yyyy HH:mm'),
              'Submitted Today': hasSubmitted ? 'Yes' : 'No'
            });
          });
        } else {
          excelData.push({
            'Coordinator': coordinator.name,
            'Employee Code': coordinator.employee_code,
            'Email': coordinator.email,
            'Mobile': coordinator.mobile || 'N/A',
            'Company': company?.company_name || 'N/A',
            'Location': location?.location_name || 'N/A',
            'Record #': 'N/A',
            'Shift': 'N/A',
            'Requirement': 'N/A',
            'Filled': 'N/A',
            'Vacant': 'N/A',
            'Fill Rate %': 'N/A',
            'Remarks': 'N/A',
            'Last Updated': 'N/A',
            'Submitted Today': hasSubmitted ? 'Yes' : 'No'
          });
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Headcount');
      
      const fileName = `headcount_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Excel exported successfully!');
    } catch (err: any) {
      toast.error('Failed to export Excel: ' + err.message);
    }
  };

  // ---------- Toggle row expansion ----------
  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // ---------- Render ----------
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className={`inline-flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'} mb-6 transition-colors`}
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
              <h1 className={`text-3xl font-display font-bold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-3`}>
                <Database className="text-indigo-500" />
                Headcount Tracking
              </h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                Monitor coordinator submissions and headcount data in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2.5 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-50'} rounded-xl border ${darkMode ? 'border-slate-600' : 'border-slate-200'} transition-colors`}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2.5 ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'} border rounded-xl text-sm font-medium disabled:opacity-50 transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-rose-900/30 border-rose-800' : 'bg-rose-50 border-rose-200'} border text-rose-700 dark:text-rose-300`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error loading data</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={fetchData}
                    className="mt-2 text-sm font-medium text-rose-700 dark:text-rose-300 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Connection Status - Real-time indicator */}
          <div className={`flex items-center gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isRealtimeConnected ? '🟢 Live' : '🟡 Connecting...'}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-time updates active</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>Last updated: {format(lastUpdated, 'hh:mm:ss a')}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>{coordinators.length} coordinators, {headcountRecords.length} records</span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Coordinators</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalCoordinators}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Submitted Today</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{submittedCount}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Pending</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-purple-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Total Records</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalHeadcountRecords}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>With Data</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{coordinatorsWithData}</p>
                </div>
              </div>
            </div>
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <UserMinus className="w-5 h-5 text-rose-500" />
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase`}>Fill Rate</p>
                  <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fillRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-xl border p-4 shadow-sm`}>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search name, email, employee code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 ${darkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {search && (
                  <button onClick={() => setSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className={`${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]`}
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className={`${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]`}
              >
                <option value="">All Locations</option>
                {locations
                  .filter((l) => !companyFilter || l.company_id === companyFilter)
                  .map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
              </select>
              <div className="flex items-center gap-4 flex-wrap">
                <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'} cursor-pointer select-none`}>
                  <input
                    type="checkbox"
                    checked={showOnlyPending}
                    onChange={(e) => setShowOnlyPending(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Pending only
                </label>
                <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'} cursor-pointer select-none`}>
                  <input
                    type="checkbox"
                    checked={showOnlyWithData}
                    onChange={(e) => setShowOnlyWithData(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  With data only
                </label>
              </div>
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-2xl border shadow-sm overflow-hidden`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Coordinator</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Company / Location</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Headcount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden lg:table-cell">Last Submission</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className={`h-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded animate-pulse`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : displayedCoordinators.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className={`w-8 h-8 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {coordinators.length === 0 
                              ? 'No coordinators found in the database. Please check your users table.' 
                              : 'No coordinators match your filters.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedCoordinators.map((coordinator) => {
                      const hasSubmitted = submittedIds.has(coordinator.id);
                      const lastSub = getLastSubmission(coordinator.id);
                      const hcRecords = getHeadcountByCoordinator(coordinator.id);
                      const hasData = hcRecords.length > 0;
                      const isExpanded = expandedRow === coordinator.id;
                      const company = getCompanyById(coordinator.company_id);
                      const location = getLocationById(coordinator.location_id);

                      return (
                        <React.Fragment key={coordinator.id}>
                          <tr className={`${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}>
                            <td className="px-4 py-3">
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{coordinator.name}</div>
                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {coordinator.employee_code}
                                {hasData && ` • ${hcRecords.length} record(s)`}
                                {!hasData && ' • No data'}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{coordinator.email}</div>
                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{coordinator.mobile || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {company?.company_name || '—'}
                              </div>
                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {location?.location_name || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasData ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={`font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                      {hcRecords.reduce((sum, h) => sum + h.filled, 0)}
                                    </span>
                                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>/</span>
                                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                                      {hcRecords.reduce((sum, h) => sum + h.requirement, 0)}
                                    </span>
                                  </div>
                                  <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ 
                                        width: `${Math.min(100, (hcRecords.reduce((sum, h) => sum + h.filled, 0) / hcRecords.reduce((sum, h) => sum + h.requirement, 0)) * 100 || 0)}%` 
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {lastSub
                                  ? format(new Date(lastSub), "MMM d, hh:mm a")
                                  : "Never"}
                              </div>
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
                            <td className="px-4 py-3 text-center">
                              {hasData && (
                                <button
                                  onClick={() => toggleExpand(coordinator.id)}
                                  className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'} transition-colors`}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              {!hasData && (
                                <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row - Shows Headcount Details */}
                          {isExpanded && hasData && (
                            <tr>
                              <td colSpan={7} className={`px-4 py-4 ${darkMode ? 'bg-slate-900/30' : 'bg-slate-50'}`}>
                                <div className="space-y-3">
                                  <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2`}>
                                    <Database className="w-4 h-4 text-indigo-500" />
                                    Headcount Records for {coordinator.name}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {hcRecords.map((hc, idx) => {
                                      const hcCompany = getCompanyById(hc.company_id);
                                      const hcLocation = getLocationById(hc.location_id);
                                      const hcFillRate = hc.requirement > 0 ? Math.round((hc.filled / hc.requirement) * 100) : 0;
                                      
                                      return (
                                        <div key={hc.id} className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl p-4 border shadow-sm`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                              Record #{idx + 1}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                              hc.shift === 'Morning' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                              hc.shift === 'Evening' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                              hc.shift === 'Night' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                              hc.shift === 'Afternoon' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                              {hc.shift || 'No Shift'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Requirement</div>
                                              <div className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{hc.requirement}</div>
                                            </div>
                                            <div>
                                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Filled</div>
                                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">{hc.filled}</div>
                                            </div>
                                            <div>
                                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Vacant</div>
                                              <div className="font-semibold text-rose-600 dark:text-rose-400">{hc.vacant}</div>
                                            </div>
                                          </div>
                                          <div className="mt-2">
                                            <div className="flex justify-between text-xs">
                                              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Fill Rate</span>
                                              <span className={`font-medium ${
                                                hcFillRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                                hcFillRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                                'text-rose-600 dark:text-rose-400'
                                              }`}>
                                                {hcFillRate}%
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                              <div 
                                                className={`h-full rounded-full ${
                                                  hcFillRate >= 80 ? 'bg-emerald-500' :
                                                  hcFillRate >= 50 ? 'bg-amber-500' :
                                                  'bg-rose-500'
                                                }`}
                                                style={{ width: `${Math.min(hcFillRate, 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                          {hc.remarks && (
                                            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'} text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                              <span className="font-medium">Remarks:</span> {hc.remarks}
                                            </div>
                                          )}
                                          <div className={`mt-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {format(new Date(hc.updated_at), 'MMM dd, yyyy hh:mm a')}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {!loading && hasMore && (
              <div className={`py-4 text-center ${darkMode ? 'border-slate-700' : 'border-slate-100'} border-t`}>
                <button
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className={`text-sm ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} font-medium hover:underline`}
                >
                  Load more ({filteredCoordinators.length - visibleCount} remaining)
                </button>
              </div>
            )}
            {!loading && visibleCount >= filteredCoordinators.length && filteredCoordinators.length > 0 && (
              <div className={`py-4 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-400'} border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                ✓ All {filteredCoordinators.length} coordinators loaded
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}