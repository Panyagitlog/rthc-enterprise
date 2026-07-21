import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Filter, ChevronDown, ChevronUp, Download, Eye, Edit, Trash2, History, ArrowUpDown } from "lucide-react";
import type { DashboardFilters, HeadcountRecord, Company } from "../../types/dashboard";

function getFilledStatus(requirement: number, filled: number) {
  if (requirement === 0)
    return { label: "No Requirement", color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" };
  const percent = (filled / requirement) * 100;
  if (percent >= 95)
    return { label: "Fully Filled", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
  if (percent >= 70)
    return { label: "Partially Filled", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" };
  return { label: "Understaffed", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
}

type SortKey = "company" | "location" | "requirement" | "filled" | "vacant" | "created_at";

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
}

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
}: HeadcountTableProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "company":
          av = a.company?.company_name || "";
          bv = b.company?.company_name || "";
          break;
        case "location":
          av = a.location?.location_name || "";
          bv = b.location?.location_name || "";
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
    return arr;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "company", label: "Company" },
    { key: "location", label: "Location" },
    { key: "requirement", label: "Req", align: "right" },
    { key: "filled", label: "Filled", align: "right" },
    { key: "vacant", label: "Vacant", align: "right" },
    { key: "created_at", label: "Submitted" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Filter className="mr-1 h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </button>
            <button onClick={onResetFilters} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400">
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Search records…"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              onClick={onExport}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Company</label>
              <select
                value={filters.companyId}
                onChange={(e) => onFilterChange("companyId", e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => onFilterChange("dateRange", e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange("status", e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All</option>
                <option value="understaffed">Understaffed</option>
                <option value="balanced">Balanced</option>
                <option value="overstaffed">Overstaffed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="max-h-[600px] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Coordinator
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading records…
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                  No records match your filters
                </td>
              </tr>
            ) : (
              pageData.map((h) => {
                const status = getFilledStatus(h.requirement, h.filled);
                return (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{h.company?.company_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{h.location?.location_name || "-"}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {h.requirement || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {h.filled || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-rose-600 dark:text-rose-400">{h.vacant || 0}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(h.created_at), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{h.coordinator?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onRowAction?.("view", h)}
                          className="rounded p-1 text-slate-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-500/10"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRowAction?.("edit", h)}
                          className="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRowAction?.("delete", h)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRowAction?.("history", h)}
                          className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                        >
                          <History className="h-4 w-4" />
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

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-200 px-2.5 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-200 px-2.5 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
