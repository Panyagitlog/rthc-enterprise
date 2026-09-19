import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Building2, CalendarDays, MapPin, RefreshCw, Search, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// @ts-ignore
import { supabase } from "../services/supabase";
import { fetchRTCAData, fetchRTCAOptions } from "../services/rtcaService";
import type { RTCAFilters, RTCARow, RTCAStats } from "../types/rtca";

type Option = { id: string; company_name?: string; location_name?: string; scheme_name?: string; name?: string; company_id?: string; location_id?: string };
const emptyStats: RTCAStats = { companies: 0, locations: 0, requirement: 0, filled: 0, vacant: 0, fillRate: 0 };

export default function RTCADashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RTCAFilters>({ companyId: "", locationId: "", schemeId: "", coordinatorId: "", date: "" });
  const [rows, setRows] = useState<RTCARow[]>([]);
  const [stats, setStats] = useState<RTCAStats>(emptyStats);
  const [options, setOptions] = useState<{ companies: Option[]; locations: Option[]; schemes: Option[]; coordinators: Option[] }>({ companies: [], locations: [], schemes: [], coordinators: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, availableOptions] = await Promise.all([fetchRTCAData(filters), fetchRTCAOptions()]);
      setRows(result.rows);
      setStats(result.stats);
      setOptions(availableOptions);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load RTCA data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("rtca-live-updates").on("postgres_changes", { event: "*", schema: "public", table: "scheme_requirements" }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.companyName, row.locationName, row.schemeName, row.coordinatorName].some((value) => value.toLowerCase().includes(needle)));
  }, [rows, search]);

  const schemeData = useMemo(() => Object.values(filteredRows.reduce<Record<string, { scheme: string; requirement: number; filled: number; vacant: number }>>((result, row) => {
    const current = result[row.schemeName] || { scheme: row.schemeName, requirement: 0, filled: 0, vacant: 0 };
    current.requirement += Number(row.requirement || 0);
    current.filled += Number(row.filled || 0);
    current.vacant += Number(row.vacant || 0);
    result[row.schemeName] = current;
    return result;
  }, {})), [filteredRows]);

  const companyData = useMemo(() => Object.values(filteredRows.reduce<Record<string, { company: string; requirement: number; filled: number; vacant: number }>>((result, row) => {
    const current = result[row.companyName] || { company: row.companyName, requirement: 0, filled: 0, vacant: 0 };
    current.requirement += Number(row.requirement || 0);
    current.filled += Number(row.filled || 0);
    current.vacant += Number(row.vacant || 0);
    result[row.companyName] = current;
    return result;
  }, {})), [filteredRows]);

  const locationData = useMemo(() => Object.values(filteredRows.reduce<Record<string, { location: string; company: string; requirement: number; filled: number; vacant: number }>>((result, row) => {
    const key = `${row.company_id}:${row.location_id}`;
    const current = result[key] || { location: row.locationName, company: row.companyName, requirement: 0, filled: 0, vacant: 0 };
    current.requirement += Number(row.requirement || 0);
    current.filled += Number(row.filled || 0);
    current.vacant += Number(row.vacant || 0);
    result[key] = current;
    return result;
  }, {})), [filteredRows]);

  const today = new Date().toISOString().slice(0, 10);
  const coordinatorStatus = useMemo(() => options.coordinators.map((coordinator) => {
    const latest = rows.filter((row) => row.coordinator_id === coordinator.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    return { name: coordinator.name || "Unknown coordinator", company: options.companies.find((item) => item.id === coordinator.company_id)?.company_name || "-", location: options.locations.find((item) => item.id === coordinator.location_id)?.location_name || "-", updated: latest?.report_date === today, lastUpdated: latest?.updated_at || null };
  }), [options, rows, today]);

  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const updateFilter = (key: keyof RTCAFilters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value, ...(key === "companyId" ? { locationId: "" } : {}) })); };
  const formatNumber = (value: number) => value.toLocaleString("en-IN");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><button onClick={() => navigate("/app-select")} className="rounded-lg p-2 hover:bg-white dark:hover:bg-slate-900" title="Back"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">RTCA</p><h1 className="text-2xl font-bold tracking-tight">LIVE DASHBOARD OF CLIENT COMPANIES</h1><p className="text-sm text-slate-500 dark:text-slate-400">RTHC PERFORMANCE &amp; WORKFORCE ANALYTICS</p></div></div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-900" title="Refresh data"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[{ label: "Total Companies", value: stats.companies, icon: Building2 }, { label: "Total Locations", value: stats.locations, icon: MapPin }, { label: "Total Requirement", value: stats.requirement, icon: Users }, { label: "Total Filled", value: stats.filled, icon: Activity }, { label: "Total Vacant", value: stats.vacant, icon: Users }, { label: "Fill Rate", value: `${stats.fillRate.toFixed(1)}%`, icon: BarChart3 }].map((card) => <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><card.icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-bold">{typeof card.value === "number" ? formatNumber(card.value) : card.value}</p></div>)}
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-semibold text-slate-500">Company<select value={filters.companyId} onChange={(event) => updateFilter("companyId", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"><option value="">All companies</option>{options.companies.map((item) => <option key={item.id} value={item.id}>{item.company_name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Location<select value={filters.locationId} onChange={(event) => updateFilter("locationId", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"><option value="">All locations</option>{options.locations.filter((item) => !filters.companyId || item.company_id === filters.companyId).map((item) => <option key={item.id} value={item.id}>{item.location_name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Scheme<select value={filters.schemeId} onChange={(event) => updateFilter("schemeId", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"><option value="">All schemes</option>{options.schemes.map((item) => <option key={item.id} value={item.id}>{item.scheme_name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Coordinator<select value={filters.coordinatorId} onChange={(event) => updateFilter("coordinatorId", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"><option value="">All coordinators</option>{options.coordinators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-500">Date<input type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /></label>
          <label className="text-xs font-semibold text-slate-500">Search<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search records" className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /></label>
        </section>

        <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">Scheme Performance</h2><div className="mt-4 h-72">{schemeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={schemeData}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis dataKey="scheme" /><YAxis /><Tooltip /><Legend /><Bar dataKey="requirement" fill="#0891b2" /><Bar dataKey="filled" fill="#10b981" /></BarChart></ResponsiveContainer> : <EmptyState loading={loading} />}</div></div><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">Company Performance</h2><div className="mt-4 h-72">{companyData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={companyData} layout="vertical" margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" /><XAxis type="number" /><YAxis type="category" dataKey="company" width={110} /><Tooltip /><Legend /><Bar dataKey="requirement" fill="#0891b2" /><Bar dataKey="filled" fill="#10b981" /></BarChart></ResponsiveContainer> : <EmptyState loading={loading} />}</div></div></section>

        <section className="grid gap-6 xl:grid-cols-2"><DataTable title="Location Performance" headers={["Location", "Company", "Requirement", "Filled", "Vacant", "Fill Rate"]} rows={locationData.map((row) => [row.location, row.company, formatNumber(row.requirement), formatNumber(row.filled), formatNumber(row.vacant), row.requirement ? `${((row.filled / row.requirement) * 100).toFixed(1)}%` : "0.0%"])} /><DataTable title="COORDINATOR UPDATE STATUS" headers={["Coordinator", "Company", "Location", "Today's Status", "Last Updated"]} rows={coordinatorStatus.map((row) => [row.name, row.company, row.location, row.updated ? "UPDATED" : "PENDING", row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : "-"])} /></section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800"><div><h2 className="font-semibold">LIVE CLIENT MASTER</h2><p className="text-xs text-slate-500">{filteredRows.length} records</p></div><Search className="h-4 w-4 text-slate-400" /></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{["Company", "Location", "Scheme", "Coordinator", "Requirement", "Filled", "Vacant", "Fill Rate", "Last Updated"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visibleRows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium">{row.companyName}</td><td className="px-4 py-3">{row.locationName}</td><td className="px-4 py-3">{row.schemeName}</td><td className="px-4 py-3">{row.coordinatorName}</td><td className="px-4 py-3">{formatNumber(row.requirement)}</td><td className="px-4 py-3">{formatNumber(row.filled)}</td><td className="px-4 py-3">{formatNumber(row.vacant)}</td><td className="px-4 py-3">{row.requirement ? `${((row.filled / row.requirement) * 100).toFixed(1)}%` : "0.0%"}</td><td className="px-4 py-3 text-slate-500">{new Date(row.updated_at).toLocaleString()}</td></tr>)}</tbody></table>{!loading && visibleRows.length === 0 && <EmptyState loading={false} />}</div><div className="flex items-center justify-end gap-3 border-t border-slate-200 p-3 text-sm dark:border-slate-800"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></section>
        <p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-4 w-4" />Dashboard updates from scheme requirement records in Supabase.</p>
      </div>
    </main>
  );
}

function EmptyState({ loading }: { loading: boolean }) { return <div className="flex h-full items-center justify-center text-sm text-slate-500">{loading ? "Loading live data..." : "No data matches the current filters."}</div>; }

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><h2 className="border-b border-slate-200 p-4 font-semibold dark:border-slate-800">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`}>{row.map((value, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-4 py-3">{value}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <EmptyState loading={false} />}</div></div>;
}
