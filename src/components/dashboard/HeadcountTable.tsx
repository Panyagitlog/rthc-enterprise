// src/components/dashboard/HeadcountTable.tsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  History, 
  ArrowUpDown,
  MoreVertical,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  User,
  Building2,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Plus,
  SlidersHorizontal,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardFilters, HeadcountRecord, Company } from "../../types/dashboard";

// ========================================
// TYPES
// ========================================
type SortKey = "company" | "location" | "requirement" | "filled" | "vacant" | "created_at" | "coordinator";

interface HeadcountTableProps {
  data: HeadcountRecord[];
  loading: boolean;
  companies: Company[];
  filters: DashboardFilters;
  onFilterChange: (key: keyof DashboardFilters, value: string) => void;
  onResetFilters: () => void;
  onRowAction?: (action: "view" | "edit" | "delete" | "history", record: HeadcountRecord) => void;
  onExport?: () => void;
  pageSize?: number;
  totalCount?: number;
  lastSync?: Date;
}

// ========================================
// STATUS CONFIGURATION
// ========================================
const getStatusConfig = (requirement: number, filled: number) => {
  if (requirement === 0) {
    return {
      label: "No Req",
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: "text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-700",
      border: "border-slate-200 dark:border-slate-600"
    };
  }
  const percent = (filled / requirement) * 100;
  if (percent >= 100) {
    return {
      label: "Overstaffed",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800"
    };
  }
  if (percent >= 90) {
    return {
      label: "Full",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800"
    };
  }
  if (percent >= 70) {
    return {
      label: "Balanced",
      icon: <Users className="w-3.5 h-3.5" />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800"
    };
  }
  if (percent >= 40) {
    return {
      label: "Shortage",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800"
    };
  }
  return {
    label: "Critical",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800"
  };
};

// ========================================
// PROGRESS BAR
// ========================================
const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const getColor = () => {
    if (percent >= 90) return "bg-emerald-400 dark:bg-emerald-500";
    if (percent >= 70) return "bg-blue-400 dark:bg-blue-500";
    if (percent >= 40) return "bg-amber-400 dark:bg-amber-500";
    return "bg-rose-400 dark:bg-rose-500";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-[80px]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${getColor()} relative`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
      </div>
      <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 min-w-[36px] text-right">
        {Math.round(percent)}%
      </span>
    </div>
  );
};

// ========================================
// STATUS CHIP
// ========================================
const StatusChip = ({ requirement, filled }: { requirement: number; filled: number }) => {
  const status = getStatusConfig(requirement, filled);
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color} ${status.border}`}>
      {status.icon}
      {status.label}
    </span>
  );
};

// ========================================
// COMPANY CELL
// ========================================
const CompanyCell = ({ name, code }: { name: string; code?: string }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200/30 dark:border-indigo-700/30">
        {initials}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</p>
        {code && <p className="text-[10px] text-slate-400 font-mono">{code}</p>}
      </div>
    </div>
  );
};

// ========================================
// LOCATION CELL
// ========================================
const LocationCell = ({ name, city, state }: { name: string; city?: string; state?: string }) => {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</p>
      {(city || state) && (
        <p className="text-xs text-slate-400">{city}{city && state ? ', ' : ''}{state}</p>
      )}
    </div>
  );
};

// ========================================
// COORDINATOR CELL
// ========================================
const CoordinatorCell = ({ name, online }: { name: string; online?: boolean }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200/30 dark:border-blue-700/30">
          {initials}
        </div>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{name || 'Unassigned'}</p>
    </div>
  );
};

// ========================================
// EMPTY STATE ROW
// ========================================
const EmptyStateRow = ({ company }: { company: Company }) => {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3">
        <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600" disabled />
      </td>
      <td className="px-4 py-3">
        <CompanyCell name={company.company_name} code={company.company_code} />
      </td>
      <td className="px-4 py-3">
        <LocationCell name="No data" />
      </td>
      <td className="px-4 py-3">
        <CoordinatorCell name="Unassigned" />
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-400">—</td>
      <td className="px-4 py-3 text-right font-medium text-slate-400">—</td>
      <td className="px-4 py-3 text-right font-medium text-slate-400">—</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[80px]">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
              <div className="h-full rounded-full bg-slate-300 dark:bg-slate-600 w-0" />
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-400 min-w-[36px] text-right">0%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700">
          <XCircle className="w-3.5 h-3.5" />
          No Data
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
          <Plus className="w-4 h-4 text-slate-400" />
        </button>
      </td>
    </tr>
  );
};

// ========================================
// ACTION MENU
// ========================================
const ActionMenu = ({ record, onAction }: { record: HeadcountRecord; onAction: (action: any, record: HeadcountRecord) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    { id: 'view', label: 'View Details', icon: Eye },
    { id: 'edit', label: 'Edit', icon: Edit },
    { id: 'history', label: 'History', icon: History },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-slate-400" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-1 w-40 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] z-50"
          >
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  onAction(action.id, record);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  action.danger 
                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ========================================
// MAIN TABLE COMPONENT
// ========================================
export default function HeadcountTable({
  data,
  loading,
  companies,
  filters,
  onFilterChange,
  onResetFilters,
  onRowAction,
  onExport,
  pageSize = 10,
  totalCount = 0,
  lastSync,
}: HeadcountTableProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("company");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // ========================================
  // CRITICAL FIX: Show ALL companies with latest data
  // ========================================
  const mergedData = useMemo(() => {
    // Create a map of company_id to latest record
    const latestMap = new Map<string, HeadcountRecord>();
    
    // First, populate with latest records from data
    data.forEach(record => {
      const companyId = record.company_id;
      const existing = latestMap.get(companyId);
      
      if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
        latestMap.set(companyId, record);
      }
    });

    // Now, ensure ALL companies are included
    const result: (HeadcountRecord & { _hasData: boolean })[] = [];
    
    companies.forEach(company => {
      const existingRecord = latestMap.get(company.id);
      
      if (existingRecord) {
        // Company has data - use the latest record
        result.push({
          ...existingRecord,
          _hasData: true
        });
      } else {
        // Company has NO data - create a placeholder
        result.push({
          id: `placeholder-${company.id}`,
          company_id: company.id,
          location_id: '',
          coordinator_id: '',
          requirement: 0,
          filled: 0,
          vacant: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          company: company,
          location: undefined,
          coordinator: undefined,
          _hasData: false
        } as any);
      }
    });

    return result;
  }, [data, companies]);

  // Filter and sort the merged data
  const processedData = useMemo(() => {
    let result = [...mergedData];

    // Search filter - search across company name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(record => 
        record.company?.company_name?.toLowerCase().includes(term) ||
        record.company?.company_code?.toLowerCase().includes(term)
      );
    }

    // Apply company filter
    if (filters.companyId) {
      result = result.filter(r => r.company_id === filters.companyId);
    }

    // Filter by status (only for records with data)
    if (filters.status) {
      result = result.filter(r => {
        if (!r._hasData) return false;
        const status = getStatusConfig(r.requirement, r.filled).label.toLowerCase();
        return status === filters.status.toLowerCase();
      });
    }

    // Sort
    result.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case "company":
          av = a.company?.company_name || "";
          bv = b.company?.company_name || "";
          break;
        case "location":
          av = a.location?.location_name || "";
          bv = b.location?.location_name || "";
          break;
        case "coordinator":
          av = a.coordinator?.name || "";
          bv = b.coordinator?.name || "";
          break;
        case "requirement":
          av = a.requirement || 0;
          bv = b.requirement || 0;
          break;
        case "filled":
          av = a.filled || 0;
          bv = b.filled || 0;
          break;
        case "vacant":
          av = a.vacant || 0;
          bv = b.vacant || 0;
          break;
        case "created_at":
          av = new Date(a.created_at).getTime();
          bv = new Date(b.created_at).getTime();
          break;
        default:
          av = a[sortKey] || 0;
          bv = b[sortKey] || 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [mergedData, sortKey, sortDir, searchTerm, filters]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const pageData = processedData.slice((page - 1) * pageSize, page * pageSize);

  // Count companies with data
  const companiesWithData = mergedData.filter(r => r._hasData).length;
  const companiesWithoutData = mergedData.filter(r => !r._hasData).length;

  // Toggle sort
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  // Toggle row selection (only for real records)
  const toggleRowSelection = (id: string) => {
    if (id.startsWith('placeholder-')) return; // Don't select placeholder rows
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    const selectableRows = pageData.filter(r => !r.id.startsWith('placeholder-'));
    if (selectedRows.size === selectableRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableRows.map(r => r.id)));
    }
  };

  // Column definitions
  const columns = [
    { key: "company" as SortKey, label: "Company", width: "200px" },
    { key: "location" as SortKey, label: "Location", width: "180px" },
    { key: "coordinator" as SortKey, label: "Coordinator", width: "180px" },
    { key: "requirement" as SortKey, label: "Req", align: "right" as const, width: "70px" },
    { key: "filled" as SortKey, label: "Filled", align: "right" as const, width: "70px" },
    { key: "vacant" as SortKey, label: "Vacant", align: "right" as const, width: "70px" },
    { key: "created_at" as SortKey, label: "Last Updated", width: "130px" },
  ];

  // Sort Icon
  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]"
    >
      {/* Toolbar - Enhanced with better styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-800/30 dark:to-slate-900/30">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search with better styling */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 w-48 sm:w-64 transition-all shadow-sm hover:shadow-md"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Filter Button - Enhanced */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              showFilters 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-md'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Company Stats - Enhanced badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {companiesWithData} with data
              </span>
            </div>
            {companiesWithoutData > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {companiesWithoutData} no data
                </span>
              </div>
            )}
          </div>

          {/* Reset Button with better styling */}
          <button
            onClick={onResetFilters}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all hover:shadow-md"
            title="Reset filters"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>

          {/* Sync Status - Enhanced */}
          {lastSync && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 hidden lg:flex bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(lastSync, { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Record count - Enhanced */}
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline bg-slate-50/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
            {processedData.length} companies
          </span>

          {/* Export Button - Enhanced */}
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Panel - Enhanced with better styling */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/30 to-white/30 dark:from-slate-800/20 dark:to-slate-900/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    Company
                  </label>
                  <select
                    value={filters.companyId}
                    onChange={(e) => onFilterChange("companyId", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  >
                    <option value="">All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => onFilterChange("status", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="full">Full</option>
                    <option value="balanced">Balanced</option>
                    <option value="shortage">Shortage</option>
                    <option value="critical">Critical</option>
                    <option value="overstaffed">Overstaffed</option>
                    <option value="no req">No Req</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => onFilterChange("dateRange", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" />
                    Fill Rate
                  </label>
                  <select
                    value={filters.fillRate || ''}
                    onChange={(e) => onFilterChange("fillRate", e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  >
                    <option value="">All</option>
                    <option value="high">High (&gt;80%)</option>
                    <option value="medium">Medium (50-80%)</option>
                    <option value="low">Low (&lt;50%)</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Bar - Enhanced */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 bg-blue-50/90 dark:bg-blue-900/20 border-b border-blue-200/50 dark:border-blue-700/50 flex items-center justify-between"
          >
            <span className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="font-semibold">{selectedRows.size}</span>
              record{selectedRows.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRows(new Set())}
                className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
              >
                <XCircle className="w-4 h-4 text-blue-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table - Enhanced with better styling */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/40 dark:to-slate-900/40">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={pageData.filter(r => !r.id.startsWith('placeholder-')).length > 0 && 
                    selectedRows.size === pageData.filter(r => !r.id.startsWith('placeholder-')).length}
                  onChange={toggleAllRows}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={{ width: col.width }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    <span className="group-hover:opacity-100 opacity-0 transition-opacity">
                      <SortIcon column={col.key} />
                    </span>
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[130px]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-[50px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
            {loading ? (
              // Skeleton Loading - Enhanced
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 mt-1" /></div>
                  </div></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 mt-1" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                  </div></td>
                  <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-slate-200 dark:bg-slate-700 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-slate-200 dark:bg-slate-700 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-slate-200 dark:bg-slate-700 ml-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" /></td>
                  <td className="px-4 py-3"><div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 ml-auto" /></td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              // Empty State - Enhanced
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="p-5 rounded-full bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-800 dark:to-slate-700/50">
                      <Building2 className="w-14 h-14 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No companies found</p>
                      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search terms</p>
                    </div>
                    <button
                      onClick={onResetFilters}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl"
                    >
                      Reset Filters
                    </button>
                  </motion.div>
                </td>
              </tr>
            ) : (
              // Data Rows - Enhanced with better hover effects
              pageData.map((record, index) => {
                const isSelected = selectedRows.has(record.id);
                const hasData = record._hasData;
                
                // If no data, show empty state
                if (!hasData) {
                  return <EmptyStateRow key={record.id} company={record.company as Company} />;
                }
                
                // Show data row
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-50/60 dark:bg-blue-900/15 shadow-inner' 
                        : 'hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-white/50 dark:hover:from-slate-800/40 dark:hover:to-slate-900/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(record.id)}
                        className="rounded border-slate-300 dark:border-slate-600 transition-all hover:scale-110"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CompanyCell 
                        name={record.company?.company_name || 'Unknown'} 
                        code={record.company?.company_code} 
                      />
                    </td>
                    <td className="px-4 py-3">
                      <LocationCell 
                        name={record.location?.location_name || 'No data'}
                        city={record.location?.city}
                        state={record.location?.state}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CoordinatorCell 
                        name={record.coordinator?.name || 'Unassigned'}
                        online={record.coordinator?.status === 'ACTIVE'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                      {record.requirement || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {record.filled || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      {record.vacant || 0}
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar value={record.filled} max={record.requirement} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusChip requirement={record.requirement} filled={record.filled} />
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                          {formatDistanceToNow(new Date(record.updated_at || record.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu record={record} onAction={onRowAction || (() => {})} />
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Enhanced */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-800/30 dark:to-slate-900/30">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing <span className="font-medium text-slate-700 dark:text-slate-200">
            {processedData.length > 0 ? ((page - 1) * pageSize) + 1 : 0}
          </span> to <span className="font-medium text-slate-700 dark:text-slate-200">
            {Math.min(page * pageSize, processedData.length)}
          </span> of <span className="font-medium text-slate-700 dark:text-slate-200">
            {processedData.length}
          </span> companies
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = page;
              if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              
              if (pageNum < 1 || pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                    page === pageNum
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl'
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:shadow-md'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </motion.div>
  );
}