// src/pages/Reports.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, RefreshCw, Download, FileSpreadsheet,
  Building2, MapPin, Users, TrendingUp, Clock,
  ChevronUp, ChevronDown, Filter, X, Eye,
  AlertCircle, CheckCircle2, Mail, Phone, User, FileText
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
// @ts-ignore
import { supabase } from "../services/supabase";
import * as XLSX from 'xlsx';

// ---------- Types ----------
interface Company {
  id: string;
  company_name: string;
  company_code: string;
  contact_person?: string;
  email?: string;
  mobile?: string;
  status: string;
}

interface Location {
  id: string;
  company_id: string;
  location_name: string;
  location_code: string;
  status: string;
}

interface HeadcountUpdate {
  id: string;
  company_id: string;
  location_id: string;
  coordinator_id: string;
  shift: string;
  requirement: number;
  filled: number;
  vacant: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  coordinator?: { name: string; email: string; mobile: string };
  location?: { location_name: string };
}

interface LocationReport {
  id: string;
  location_name: string;
  location_code: string;
  requirement: number;
  filled: number;
  vacant: number;
  shift: string;
  utilization: number;
  last_submission: string | null;
  coordinator_name: string;
  coordinator_email: string;
  coordinator_mobile: string;
  has_data: boolean;
}

interface CompanyReport {
  id: string;
  company_name: string;
  company_code: string;
  contact_person: string;
  email: string;
  mobile: string;
  status: string;
  has_data: boolean;
  locations: LocationReport[];
  total_requirement: number;
  total_filled: number;
  total_vacant: number;
  overall_utilization: number;
  last_updated: string | null;
  submitted_by: string;
}

// ---------- Status Badge ----------
const StatusBadge = ({ status }: { status?: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
      status === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
        : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
    {status || "INACTIVE"}
  </span>
);

// ---------- Main Component ----------
export default function Reports() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [companyReports, setCompanyReports] = useState<CompanyReport[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [dataFilter, setDataFilter] = useState<"ALL" | "HAS_DATA" | "NO_DATA">("ALL");
  const [sortKey, setSortKey] = useState<string>("company_name");
  const [sortAsc, setSortAsc] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---------- Fetch Data ----------
  const fetchData = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      console.log("🔄 Fetching reports data...");

      // 1. Get all companies with contact info
      const { data: companiesData, error: compError } = await supabase
        .from("companies")
        .select("id, company_name, company_code, contact_person, email, mobile, status")
        .eq("status", "ACTIVE")
        .order("company_name");

      if (compError) {
        console.error("❌ Companies error:", compError);
        toast.error("Failed to load companies");
        throw compError;
      }

      console.log(`✅ Found ${companiesData?.length || 0} companies`);

      // 2. Get all locations
      const { data: locationsData, error: locError } = await supabase
        .from("locations")
        .select("id, company_id, location_name, location_code, status")
        .eq("status", "ACTIVE");

      if (locError) {
        console.error("❌ Locations error:", locError);
        toast.error("Failed to load locations");
        throw locError;
      }

      console.log(`✅ Found ${locationsData?.length || 0} locations`);

      // 3. Get all headcount updates with coordinator info
      const { data: headcountData, error: hcError } = await supabase
        .from("headcount_updates")
        .select(`
          id,
          company_id,
          location_id,
          coordinator_id,
          shift,
          requirement,
          filled,
          vacant,
          remarks,
          created_at,
          updated_at,
          coordinator:users!coordinator_id (name, email, mobile)
        `)
        .order("created_at", { ascending: false });

      if (hcError) {
        console.error("❌ Headcount error:", hcError);
        toast.error("Failed to load headcount data");
        throw hcError;
      }

      console.log(`✅ Found ${headcountData?.length || 0} headcount records`);

      // Fix: Recalculate vacant based on requirement - filled
      const fixedHeadcountData = (headcountData || []).map((hc: any) => {
        const filled = hc.filled || 0;
        const requirement = hc.requirement || 0;
        // Ensure vacant is always requirement - filled (not negative)
        const calculatedVacant = Math.max(0, requirement - filled);
        return {
          ...hc,
          vacant: calculatedVacant
        };
      });

      console.log("✅ Fixed headcount data with correct vacant values");

      // 4. Build company reports
      const reports: CompanyReport[] = (companiesData || []).map((company: Company) => {
        // Get locations for this company
        const companyLocations = (locationsData || [])
          .filter((loc: Location) => loc.company_id === company.id);

        // Build location reports
        const locationReports: LocationReport[] = companyLocations.map((loc: Location) => {
          // Find all updates for this location
          const locationUpdates = fixedHeadcountData
            .filter((hc: HeadcountUpdate) => hc.location_id === loc.id);
          
          // Get latest update
          const latestUpdate = locationUpdates.length > 0 
            ? locationUpdates.reduce((a: HeadcountUpdate, b: HeadcountUpdate) => 
                new Date(a.created_at).getTime() > new Date(b.created_at).getTime() ? a : b
              )
            : null;

          const has_data = !!latestUpdate;
          
          // Calculate utilization for this location
          const utilization = has_data && latestUpdate.requirement > 0 
            ? Math.round((latestUpdate.filled / latestUpdate.requirement) * 100) 
            : 0;

          return {
            id: loc.id,
            location_name: loc.location_name,
            location_code: loc.location_code,
            requirement: has_data ? latestUpdate.requirement : 0,
            filled: has_data ? latestUpdate.filled : 0,
            vacant: has_data ? latestUpdate.vacant : 0,
            shift: has_data ? latestUpdate.shift : 'N/A',
            utilization: utilization,
            last_submission: has_data ? latestUpdate.created_at : null,
            coordinator_name: has_data ? latestUpdate.coordinator?.name || 'Not Assigned' : 'Not Assigned',
            coordinator_email: has_data ? latestUpdate.coordinator?.email || '' : '',
            coordinator_mobile: has_data ? latestUpdate.coordinator?.mobile || '' : '',
            has_data: has_data
          };
        });

        // Check if company has any data
        const has_data = locationReports.some(loc => loc.has_data);

        // Calculate totals
        const total_requirement = locationReports.reduce((sum, loc) => sum + loc.requirement, 0);
        const total_filled = locationReports.reduce((sum, loc) => sum + loc.filled, 0);
        const total_vacant = locationReports.reduce((sum, loc) => sum + loc.vacant, 0);
        const overall_utilization = total_requirement > 0 ? Math.round((total_filled / total_requirement) * 100) : 0;

        // Find latest update across all locations
        const allUpdates = fixedHeadcountData
          .filter((hc: HeadcountUpdate) => companyLocations.some((loc: Location) => loc.id === hc.location_id))
          .sort((a: HeadcountUpdate, b: HeadcountUpdate) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        const latestUpdate = allUpdates[0];
        const submitted_by = latestUpdate?.coordinator?.name || '';

        return {
          id: company.id,
          company_name: company.company_name,
          company_code: company.company_code,
          contact_person: company.contact_person || '',
          email: company.email || '',
          mobile: company.mobile || '',
          status: company.status,
          has_data: has_data,
          locations: locationReports,
          total_requirement: total_requirement,
          total_filled: total_filled,
          total_vacant: total_vacant,
          overall_utilization: overall_utilization,
          last_updated: latestUpdate?.created_at || null,
          submitted_by: submitted_by
        };
      });

      setCompanyReports(reports);
      setLastUpdated(new Date());

      const dataCount = reports.filter(r => r.has_data).length;
      console.log(`✅ Reports generated: ${dataCount} companies with data, ${reports.length - dataCount} without data`);
      
      // Log companies with data
      reports.filter(r => r.has_data).forEach(r => {
        console.log(`📊 ${r.company_name}: ${r.total_filled}/${r.total_requirement} (${r.overall_utilization}%) Vacant: ${r.total_vacant}`);
      });

      if (showToast) {
        toast.success(`Data refreshed! ${dataCount} companies with data`);
      }

    } catch (err: any) {
      console.error("❌ Failed to load data:", err);
      toast.error("Failed to load reports: " + err.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  // ---------- Real-time subscription ----------
  useEffect(() => {
    // Initial fetch
    fetchData(true);

    // Subscribe to headcount_updates changes
    const subscription = supabase
      .channel('reports-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'headcount_updates'
        },
        (payload) => {
          console.log('🔄 Real-time update detected:', payload);
          // Use the new data to update the view
          fetchData(false);
          toast.success('📊 Reports updated automatically!', { 
            duration: 2000,
            icon: '🔄'
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Auto-refresh every 30 seconds
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(() => {
      if (autoRefresh && !loading) {
        console.log('🔄 Auto-refresh triggered...');
        fetchData(false);
      }
    }, 30000);

    // Cleanup
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData, autoRefresh]);

  // ---------- Filtered & Sorted Data ----------
  const filteredReports = useMemo(() => {
    let list = [...companyReports];

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.company_name.toLowerCase().includes(s) ||
          r.company_code.toLowerCase().includes(s) ||
          r.contact_person.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.mobile.includes(s) ||
          r.locations.some(l => l.location_name.toLowerCase().includes(s)) ||
          r.submitted_by.toLowerCase().includes(s)
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Data filter
    if (dataFilter === "HAS_DATA") {
      list = list.filter((r) => r.has_data);
    } else if (dataFilter === "NO_DATA") {
      list = list.filter((r) => !r.has_data);
    }

    // Sort
    list.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (sortKey === "overall_utilization") {
        aVal = a.overall_utilization;
        bVal = b.overall_utilization;
      } else if (sortKey === "total_requirement") {
        aVal = a.total_requirement;
        bVal = b.total_requirement;
      } else if (sortKey === "total_filled") {
        aVal = a.total_filled;
        bVal = b.total_filled;
      } else if (sortKey === "total_vacant") {
        aVal = a.total_vacant;
        bVal = b.total_vacant;
      } else if (sortKey === "has_data") {
        aVal = a.has_data ? 1 : 0;
        bVal = b.has_data ? 1 : 0;
      } else if (sortKey === "contact_person") {
        aVal = a.contact_person || "";
        bVal = b.contact_person || "";
      } else {
        aVal = a[sortKey] || "";
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [companyReports, search, statusFilter, dataFilter, sortKey, sortAsc]);

  // ---------- Export to Excel ----------
  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Create detailed export with all data
      const exportData = filteredReports.map((company) => {
        const locationRows = company.locations.map((loc) => ({
          'Company': company.company_name,
          'Company Code': company.company_code,
          'Contact Person': company.contact_person || 'N/A',
          'Email': company.email || 'N/A',
          'Mobile': company.mobile || 'N/A',
          'Location': loc.location_name || 'N/A',
          'Location Code': loc.location_code || 'N/A',
          'Shift': loc.shift || 'N/A',
          'Requirement': loc.requirement || 0,
          'Filled': loc.filled || 0,
          'Vacant': loc.vacant || 0,
          'Utilization': loc.has_data ? `${loc.utilization}%` : 'No Data',
          'Coordinator': loc.coordinator_name || 'Not Assigned',
          'Coordinator Email': loc.coordinator_email || 'N/A',
          'Coordinator Mobile': loc.coordinator_mobile || 'N/A',
          'Last Submission': loc.last_submission ? format(new Date(loc.last_submission), 'MMM d, hh:mm a') : 'Never',
          'Has Data': loc.has_data ? 'Yes' : 'No'
        }));
        return locationRows;
      }).flat();

      // Add summary rows
      const totalCompanies = filteredReports.length;
      const companiesWithData = filteredReports.filter(r => r.has_data).length;
      const totalReq = filteredReports.reduce((sum, r) => sum + r.total_requirement, 0);
      const totalFilled = filteredReports.reduce((sum, r) => sum + r.total_filled, 0);
      const totalVacant = filteredReports.reduce((sum, r) => sum + r.total_vacant, 0);
      const avgUtilization = totalReq > 0 ? Math.round((totalFilled / totalReq) * 100) : 0;

      const summaryRows = [
        {},
        { 'Company': '═══════════════════════════════════════════════════════════════════════════════════════' },
        { 'Company': '📊 SUMMARY REPORT' },
        { 'Company': '═══════════════════════════════════════════════════════════════════════════════════════' },
        { 'Company': `Total Companies: ${totalCompanies}` },
        { 'Company': `Companies with Data: ${companiesWithData}` },
        { 'Company': `Companies without Data: ${totalCompanies - companiesWithData}` },
        { 'Company': `Total Requirement: ${totalReq}` },
        { 'Company': `Total Filled: ${totalFilled}` },
        { 'Company': `Total Vacant: ${totalVacant}` },
        { 'Company': `Overall Utilization: ${avgUtilization}%` },
        { 'Company': `Last Updated: ${format(lastUpdated, 'MMM d, hh:mm a')}` },
        { 'Company': '═══════════════════════════════════════════════════════════════════════════════════════' },
      ];

      const finalData = [...exportData, ...summaryRows];

      const ws = XLSX.utils.json_to_sheet(finalData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Company
        { wch: 20 }, // Company Code
        { wch: 25 }, // Contact Person
        { wch: 30 }, // Email
        { wch: 15 }, // Mobile
        { wch: 30 }, // Location
        { wch: 20 }, // Location Code
        { wch: 15 }, // Shift
        { wch: 12 }, // Requirement
        { wch: 12 }, // Filled
        { wch: 12 }, // Vacant
        { wch: 15 }, // Utilization
        { wch: 25 }, // Coordinator
        { wch: 30 }, // Coordinator Email
        { wch: 20 }, // Coordinator Mobile
        { wch: 25 }, // Last Submission
        { wch: 12 }, // Has Data
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Company Reports');
      
      // Add a summary sheet
      const summarySheetData = [
        ['Report Generated', format(new Date(), 'MMMM d, yyyy hh:mm:ss a')],
        [''],
        ['METRICS', 'Value'],
        ['Total Companies', totalCompanies],
        ['Companies with Data', companiesWithData],
        ['Companies without Data', totalCompanies - companiesWithData],
        ['Total Requirement', totalReq],
        ['Total Filled', totalFilled],
        ['Total Vacant', totalVacant],
        ['Overall Utilization', `${avgUtilization}%`],
        ['Data Fill Rate', `${totalCompanies > 0 ? Math.round((companiesWithData / totalCompanies) * 100) : 0}%`],
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summarySheetData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

      XLSX.writeFile(wb, `Company_Reports_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      
      toast.success(`✅ Excel exported successfully! (${finalData.length - summaryRows.length} rows)`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  // ---------- Handlers ----------
  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const viewCompanyDetails = (company: CompanyReport) => {
    setSelectedCompany(company);
    setShowDetails(true);
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchData(true);
  };

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
              Company Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time headcount reports for all companies and locations.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {companyReports.filter(r => r.has_data).length} companies with data • 
                {companyReports.filter(r => !r.has_data).length} companies pending
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Last updated: {format(lastUpdated, 'MMM d, hh:mm:ss a')}
              </span>
              {autoRefresh && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-refresh enabled
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' 
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </button>
            <button
              onClick={exportToExcel}
              disabled={exporting || filteredReports.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, contacts, emails..."
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
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-200 dark:border-slate-600 rounded-xl text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={dataFilter}
              onChange={(e) => setDataFilter(e.target.value as any)}
              className="border border-slate-200 dark:border-slate-600 rounded-xl text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Companies</option>
              <option value="HAS_DATA">With Data</option>
              <option value="NO_DATA">No Data</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {filteredReports.length} companies shown
          </span>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("company_name")}>
                    <div className="flex items-center gap-1">Company {sortKey === "company_name" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("company_code")}>
                    <div className="flex items-center gap-1">Code {sortKey === "company_code" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("contact_person")}>
                    <div className="flex items-center gap-1">Contact {sortKey === "contact_person" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("total_requirement")}>
                    <div className="flex items-center gap-1">Headcount {sortKey === "total_requirement" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("overall_utilization")}>
                    <div className="flex items-center gap-1">Utilization {sortKey === "overall_utilization" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort("last_updated")}>
                    <div className="flex items-center gap-1">Last Updated {sortKey === "last_updated" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      {companyReports.length === 0 
                        ? "No companies found in the database." 
                        : "No companies match your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((company, index) => {
                    const hasData = company.has_data;
                    // Get first location with data for display
                    const dataLocation = company.locations.find(l => l.has_data);
                    
                    return (
                      <tr 
                        key={company.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!hasData ? 'opacity-70' : ''}`}
                      >
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-center">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-4 h-4 ${hasData ? 'text-indigo-500' : 'text-slate-400'}`} />
                            {company.company_name}
                          </div>
                          {!hasData && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 block mt-0.5">⚠ No headcount data</span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500 block">{company.email || 'No email'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {company.company_code || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 dark:text-white font-medium">{company.contact_person || '—'}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {company.email || 'No email'}
                          </div>
                          {company.mobile && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {company.mobile}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {hasData ? dataLocation?.shift || 'N/A' : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {hasData ? (
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {company.total_filled} / {company.total_requirement}
                              </span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Vacant: {company.total_vacant}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {company.locations.filter(l => l.has_data).length} of {company.locations.length} locations
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">No Data</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasData ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    company.overall_utilization >= 80 
                                      ? 'bg-emerald-500' 
                                      : company.overall_utilization >= 50 
                                        ? 'bg-amber-500' 
                                        : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, company.overall_utilization)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${
                                company.overall_utilization >= 80 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : company.overall_utilization >= 50 
                                    ? 'text-amber-600 dark:text-amber-400' 
                                    : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {company.overall_utilization}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No data</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">
                          {company.last_updated 
                            ? format(new Date(company.last_updated), "dd MMM yyyy, hh:mm a")
                            : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={company.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => viewCompanyDetails(company)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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

      {/* Company Details Modal */}
      {showDetails && selectedCompany && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDetails(false)}
        >
          <motion.div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  {selectedCompany.company_name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Code: {selectedCompany.company_code} • 
                  {selectedCompany.locations.filter(l => l.has_data).length}/{selectedCompany.locations.length} Locations with data
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Company Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Contact Person</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedCompany.contact_person || 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedCompany.email || 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mobile</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedCompany.mobile || 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                  <StatusBadge status={selectedCompany.status} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last Updated</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedCompany.last_updated 
                      ? format(new Date(selectedCompany.last_updated), "dd MMM yyyy, hh:mm a")
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Submitted By</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedCompany.submitted_by || 'Not Submitted'}</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Requirement</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedCompany.has_data ? selectedCompany.total_requirement : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Filled</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedCompany.has_data ? selectedCompany.total_filled : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Vacant</p>
                  <p className={`text-2xl font-bold ${
                    !selectedCompany.has_data ? 'text-slate-400' :
                    selectedCompany.total_vacant === 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : selectedCompany.total_vacant > 0 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {selectedCompany.has_data ? selectedCompany.total_vacant : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Utilization</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedCompany.has_data ? `${selectedCompany.overall_utilization}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Locations Table */}
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Location Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Shift</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Req.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Filled</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Vacant</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Utilization</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Coordinator</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {selectedCompany.locations.map((loc) => (
                      <tr key={loc.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!loc.has_data ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {loc.location_name || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{loc.location_code || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2">
                          {loc.has_data ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{loc.has_data ? loc.shift : "N/A"}</td>
                        <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{loc.has_data ? loc.requirement : "—"}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{loc.has_data ? loc.filled : "—"}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          !loc.has_data ? 'text-slate-400' :
                          loc.vacant === 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : loc.vacant > 0 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {loc.has_data ? loc.vacant : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {loc.has_data ? (
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    loc.utilization >= 80 
                                      ? 'bg-emerald-500' 
                                      : loc.utilization >= 50 
                                        ? 'bg-amber-500' 
                                        : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, loc.utilization)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${
                                loc.utilization >= 80 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : loc.utilization >= 50 
                                    ? 'text-amber-600 dark:text-amber-400' 
                                    : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {loc.utilization}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {loc.has_data ? (
                            <div>
                              <div className="text-slate-700 dark:text-slate-300">{loc.coordinator_name}</div>
                              {loc.coordinator_email && (
                                <div className="text-xs text-slate-400 dark:text-slate-500">{loc.coordinator_email}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Not Assigned</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 text-xs">
                          {loc.last_submission 
                            ? formatDistanceToNow(new Date(loc.last_submission), { addSuffix: true })
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}