import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Building2, CheckCircle2, Download, FileSpreadsheet, Filter, LogOut, MapPin, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// @ts-ignore
import { supabase } from "../services/supabase";
import { fetchRTCAData, fetchRTCAOptions } from "../services/rtcaService";
import type { RTCAFilters, RTCARow, RTCAStats } from "../types/rtca";
import DMCFSLogo from "../components/brand/DMCFSLogo";

type Option = { id: string; company_name?: string; location_name?: string; scheme_name?: string; name?: string; company_id?: string; location_id?: string };
type Options = { companies: Option[]; locations: Option[]; schemes: Option[]; coordinators: Option[] };
type Summary = { label: string; requirement: number; filled: number; vacant: number; fillRate: number };
type DatePreset = "today" | "yesterday" | "7" | "30" | "custom";

const emptyStats: RTCAStats = { companies: 0, locations: 0, requirement: 0, filled: 0, vacant: 0, fillRate: 0 };
const colors = { cyan: "#0891b2", green: "#059669", amber: "#d97706", navy: "#0f172a" };
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatNumber = (value: number) => value.toLocaleString("en-IN");
const rate = (filled: number, requirement: number) => requirement > 0 ? (filled / requirement) * 100 : 0;

export default function RTCADashboardPremium() {
  const navigate = useNavigate();
  const today = isoDate(new Date());
  const [appliedFilters, setAppliedFilters] = useState<RTCAFilters>({ companyId: "", locationId: "", schemeId: "", coordinatorId: "", dateFrom: today, dateTo: today });
  const [draftFilters, setDraftFilters] = useState<RTCAFilters>(appliedFilters);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [rows, setRows] = useState<RTCARow[]>([]);
  const [stats, setStats] = useState<RTCAStats>(emptyStats);
  const [options, setOptions] = useState<Options>({ companies: [], locations: [], schemes: [], coordinators: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: keyof RTCARow; direction: "asc" | "desc" }>({ key: "updated_at", direction: "desc" });
  const [page, setPage] = useState(1);
  const [trendDays, setTrendDays] = useState(7);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchRTCAData(appliedFilters);
      setRows(result.rows);
      setStats(result.stats);
      setLastUpdated(new Date());
    } catch (loadError) {
      console.error(loadError);
      setError(true);
      toast.error("Unable to load workforce analytics.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    fetchRTCAOptions().then((value) => setOptions(value as Options)).catch(() => toast.error("Unable to load dashboard filters."));
  }, []);
  useEffect(() => {
    const channel = supabase
      .channel("rtca-live-updates-premium")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheme_requirements" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "headcount_updates" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const result = needle ? rows.filter((row) => [row.companyName, row.locationName, row.schemeName, row.coordinatorName].some((value) => value.toLowerCase().includes(needle))) : rows;
    return [...result].sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [rows, search, sort]);

  const schemeData = useMemo(() => summarize(rows, (row) => row.schemeName), [rows]);
  const companyData = useMemo(() => summarize(rows, (row) => row.companyName), [rows]);
  const companyContributionData = useMemo(() => {
    const totalRequirement = rows.reduce((sum, row) => sum + Number(row.requirement || 0), 0);
    return summarize(rows, (row) => row.companyName)
      .map((item) => ({ ...item, contribution: totalRequirement > 0 ? (item.requirement / totalRequirement) * 100 : 0 }))
      .sort((left, right) => right.requirement - left.requirement);
  }, [rows]);
  const schemeContributionData = useMemo(() => {
    const totalRequirement = rows.reduce((sum, row) => sum + Number(row.requirement || 0), 0);
    return summarize(rows, (row) => row.schemeName)
      .map((item) => ({ ...item, contribution: totalRequirement > 0 ? (item.requirement / totalRequirement) * 100 : 0 }))
      .sort((left, right) => right.requirement - left.requirement);
  }, [rows]);
  const stateData = useMemo(() => {
    const totalRequirement = rows.reduce((sum, row) => sum + Number(row.requirement || 0), 0);
    const grouped = Object.values(rows.reduce<Record<string, Summary & { state: string; contribution: number }>>((result, row) => {
      const state = row.stateName || "Unknown";
      const current = result[state] || { label: state, state, requirement: 0, filled: 0, vacant: 0, fillRate: 0, contribution: 0 };
      current.requirement += Number(row.requirement || 0);
      current.filled += Number(row.filled || 0);
      current.vacant += Number(row.vacant || 0);
      current.fillRate = rate(current.filled, current.requirement);
      current.contribution = totalRequirement > 0 ? (current.requirement / totalRequirement) * 100 : 0;
      result[state] = current;
      return result;
    }, {}));
    return grouped.sort((left, right) => right.requirement - left.requirement);
  }, [rows]);
  const locationData = useMemo(() => summarize(rows, (row) => `${row.companyName}|||${row.locationName}`).map((item) => ({ ...item, company: item.label.split("|||")[0], location: item.label.split("|||")[1] })), [rows]);
  const trendData = useMemo(() => summarizeByDate(rows, trendDays), [rows, trendDays]);
  const coverageData = [{ name: "Filled", value: stats.filled }, { name: "Vacant", value: stats.vacant }];
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const activeScheme = schemeData.reduce((best, item) => item.requirement > best.requirement ? item : best, schemeData[0] || emptySummary(""));
  const openLocations = locationData.filter((item) => item.vacant > 0).length;
  const coordinatorStatus = options.coordinators.map((coordinator) => {
    const latest = rows.filter((row) => row.coordinator_id === coordinator.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    return { name: coordinator.name || "Unknown coordinator", company: options.companies.find((item) => item.id === coordinator.company_id)?.company_name || "-", location: options.locations.find((item) => item.id === coordinator.location_id)?.location_name || "-", updated: latest?.report_date === today, lastUpdated: latest?.updated_at || null };
  });
  const pendingCount = coordinatorStatus.filter((item) => !item.updated).length;

  const applyFilters = () => { setPage(1); setAppliedFilters(draftFilters); };
  const resetFilters = () => { const reset = { companyId: "", locationId: "", schemeId: "", coordinatorId: "", dateFrom: today, dateTo: today }; setPreset("today"); setDraftFilters(reset); setAppliedFilters(reset); setPage(1); };
  const selectPreset = (value: DatePreset) => {
    setPreset(value);
    if (value === "custom") return;
    const end = new Date();
    const start = new Date();
    if (value === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
    if (value === "7") start.setDate(start.getDate() - 6);
    if (value === "30") start.setDate(start.getDate() - 29);
    setDraftFilters((current) => ({ ...current, dateFrom: isoDate(start), dateTo: isoDate(end) }));
  };
  const updateDraft = (key: keyof RTCAFilters, value: string) => setDraftFilters((current) => ({ ...current, [key]: value, ...(key === "companyId" ? { locationId: "" } : {}) }));
  const toggleSort = (key: keyof RTCARow) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const logout = async () => { await supabase.auth.signOut(); navigate("/", { replace: true }); };
  const exportRows = (format: "csv" | "xlsx") => {
    const data = filteredRows.map((row) => ({ Company: row.companyName, Location: row.locationName, Scheme: row.schemeName, Coordinator: row.coordinatorName, Requirement: row.requirement, Filled: row.filled, Vacant: row.vacant, "Fill Rate": `${rate(row.filled, row.requirement).toFixed(1)}%`, "Last Updated": row.updated_at }));
    if (format === "csv") { const csv = [Object.keys(data[0] || {}).join(","), ...data.map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n"); downloadBlob(new Blob([csv], { type: "text/csv" }), "rtca-client-master.csv"); return; }
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Client Master"); XLSX.writeFile(workbook, "rtca-client-master.xlsx");
  };

  return <main className="min-h-screen bg-[#f4f7fa] text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-[#10253f] px-5 py-5 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="mb-4 inline-flex rounded-lg bg-white px-2 py-1">
          <DMCFSLogo size="sm" className="w-[118px]" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><button onClick={() => navigate("/app-select")} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" title="Back to applications"><ArrowLeft className="h-5 w-5" /></button><div><div className="flex items-center gap-3"><span className="text-sm font-bold tracking-[0.25em] text-cyan-300">RTCA</span><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Live</span></div><h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Client &amp; Workforce Analytics</h1><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Live client performance dashboard</p></div></div><div className="flex items-center gap-2 text-sm"><span className="hidden text-slate-400 sm:inline">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Awaiting data"}</span><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-medium hover:bg-white/15" title="Refresh dashboard"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button><button onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white" title="Logout"><LogOut className="h-4 w-4" />Logout</button></div></div>
        <nav className="mt-6 flex gap-2 overflow-x-auto border-t border-white/10 pt-4 text-xs font-medium text-slate-400"><a href="#overview" className="rounded-md bg-white/10 px-3 py-2 text-white">Dashboard</a><a href="#master" className="rounded-md px-3 py-2 hover:bg-white/10">Client Master</a><a href="#scheme-performance" className="rounded-md px-3 py-2 hover:bg-white/10">Scheme Analytics</a><a href="#insights" className="rounded-md px-3 py-2 hover:bg-white/10">Insights</a></nav>
      </header>

      <section id="overview" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{loading ? <KpiSkeletons /> : rows.length ? <KpiCards stats={stats} /> : null}</section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-semibold">Dashboard filters</h2><span className="text-xs text-slate-400">Reporting date</span></div><div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">{(["today", "yesterday", "7", "30", "custom"] as DatePreset[]).map((item) => <button key={item} onClick={() => selectPreset(item)} className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${preset === item ? "bg-white text-cyan-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300" : "text-slate-500"}`}>{item === "7" ? "7 Days" : item === "30" ? "30 Days" : item[0].toUpperCase() + item.slice(1)}</button>)}</div></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6"><FilterSelect label="Company" value={draftFilters.companyId} onChange={(value) => updateDraft("companyId", value)} options={options.companies.map((item) => [item.id, item.company_name || ""])} /><FilterSelect label="Location" value={draftFilters.locationId} onChange={(value) => updateDraft("locationId", value)} options={options.locations.filter((item) => !draftFilters.companyId || item.company_id === draftFilters.companyId).map((item) => [item.id, item.location_name || ""])} /><FilterSelect label="Scheme" value={draftFilters.schemeId} onChange={(value) => updateDraft("schemeId", value)} options={options.schemes.map((item) => [item.id, item.scheme_name || ""])} /><FilterSelect label="Coordinator" value={draftFilters.coordinatorId} onChange={(value) => updateDraft("coordinatorId", value)} options={options.coordinators.map((item) => [item.id, item.name || ""])} /><DateField label="From" value={draftFilters.dateFrom} onChange={(value) => { setPreset("custom"); updateDraft("dateFrom", value); }} /><DateField label="To" value={draftFilters.dateTo} onChange={(value) => { setPreset("custom"); updateDraft("dateTo", value); }} /></div><div className="mt-3 flex justify-end gap-2"><button onClick={resetFilters} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Reset filters</button><button onClick={applyFilters} className="rounded-lg bg-[#0e7490] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#155e75]">Apply filters</button></div></section>

      {error && <div className="mt-5 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>We could not load workforce data right now.</span><button onClick={() => void load()} className="font-semibold underline">Try again</button></div>}
      {!loading && !error && rows.length === 0 && <EmptyPanel onClear={resetFilters} />}

      <section id="scheme-performance" className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Panel title="Scheme performance" subtitle="Requirement versus filled workforce by active scheme" action={<span className="text-xs text-slate-400">Click a bar to filter</span>}><div className="h-[300px]">{schemeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={schemeData} layout="vertical" margin={{ left: 22, right: 18 }} onClick={(event) => { const scheme = (event?.activePayload?.[0]?.payload as Summary | undefined)?.label; const option = options.schemes.find((item) => item.scheme_name === scheme); if (option) { updateDraft("schemeId", option.id); setAppliedFilters((current) => ({ ...current, schemeId: option.id })); } }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={58} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => formatNumber(Number(value))} /><Legend /><Bar dataKey="requirement" name="Requirement" fill={colors.cyan} radius={[0, 4, 4, 0]} /><Bar dataKey="filled" name="Filled" fill={colors.green} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}</div></Panel><Panel title="Workforce coverage" subtitle="Current workforce position"><div className="flex h-[300px] items-center justify-center gap-7">{stats.requirement > 0 ? <><div className="relative h-48 w-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={coverageData} dataKey="value" innerRadius={66} outerRadius={88} paddingAngle={3} stroke="none"><Cell fill={colors.green} /><Cell fill={colors.amber} /></Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-bold">{stats.fillRate.toFixed(1)}%</strong><span className="text-xs text-slate-400">Fill rate</span></div></div><div className="space-y-4 text-sm"><MetricLegend color="bg-emerald-600" label="Filled workforce" value={stats.filled} /><MetricLegend color="bg-amber-500" label="Vacant workforce" value={stats.vacant} /><p className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">Vacancy rate {(100 - stats.fillRate).toFixed(1)}%</p></div></> : <EmptyChart />}</div></Panel></section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3"><Panel title="Client contribution" subtitle="Requirement share by company"><div className="space-y-3">{companyContributionData.slice(0, 6).map((item) => <div key={item.label}><div className="flex justify-between text-xs"><span className="truncate pr-3">{item.label}</span><strong>{item.contribution.toFixed(1)}%</strong></div><div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-cyan-600" style={{ width: `${Math.min(item.contribution, 100)}%` }} /></div></div>)}</div></Panel><Panel title="Scheme contribution" subtitle="Requirement share by scheme"><div className="space-y-3">{schemeContributionData.slice(0, 6).map((item) => <div key={item.label}><div className="flex justify-between text-xs"><span className="truncate pr-3">{item.label}</span><strong>{item.contribution.toFixed(1)}%</strong></div><div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(item.contribution, 100)}%` }} /></div></div>)}</div></Panel><Panel title="State distribution" subtitle="Requirement concentration by state"><div className="space-y-2">{stateData.slice(0, 6).map((item) => <div key={item.label} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0 dark:border-slate-800"><span className="truncate pr-3">{item.label}</span><span className="font-semibold">{formatNumber(item.requirement)} · {item.fillRate.toFixed(1)}%</span></div>)}</div></Panel></section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2"><Panel title="Workforce trend" subtitle="Daily reporting history from report_date" action={<div className="flex gap-1">{[7, 30, 90].map((days) => <button key={days} onClick={() => setTrendDays(days)} className={`rounded px-2 py-1 text-xs ${trendDays === days ? "bg-cyan-50 text-cyan-700" : "text-slate-400"}`}>{days}d</button>)}</div>}><div className="h-[280px]">{trendData.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><defs><linearGradient id="filledTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.green} stopOpacity={0.22} /><stop offset="95%" stopColor={colors.green} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Area type="monotone" dataKey="requirement" name="Requirement" stroke={colors.cyan} fill="transparent" /><Area type="monotone" dataKey="filled" name="Filled" stroke={colors.green} fill="url(#filledTrend)" /></AreaChart></ResponsiveContainer> : <EmptyChart message="Limited historical data for this range" />}</div></Panel><Panel title="Workforce insights" subtitle="Calculated from the selected reporting data"><div id="insights" className="space-y-3">{rows.length ? <>{openLocations > 0 && <Insight text={`${openLocations} locations currently have open manpower requirements.`} />}{stats.requirement > 0 && <Insight text={`Overall workforce fill rate is ${stats.fillRate.toFixed(1)}%.`} />}{activeScheme.label && <Insight text={`${activeScheme.label} represents the largest current requirement.`} />}{pendingCount > 0 && <Insight text={`${pendingCount} coordinators have not submitted today's update.`} />}</> : <p className="py-10 text-center text-sm text-slate-500">No workforce insights are available for the selected filters.</p>}</div></Panel></section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3"><Panel title="Client company performance" subtitle="Ranked workforce coverage"><div className="overflow-x-auto"><SortableTable headers={["Company", "Requirement", "Filled", "Vacant", "Fill rate"]} rows={companyData.slice(0, 8).map((row) => [row.label, formatNumber(row.requirement), formatNumber(row.filled), formatNumber(row.vacant), `${row.fillRate.toFixed(1)}%`])} /></div></Panel><Panel title="Location performance" subtitle="Workforce gaps by client location"><div className="overflow-x-auto"><SortableTable headers={["Location", "Company", "Requirement", "Filled", "Vacant", "Fill rate"]} rows={locationData.slice(0, 8).map((row) => [row.location, row.company, formatNumber(row.requirement), formatNumber(row.filled), formatNumber(row.vacant), `${rate(row.filled, row.requirement).toFixed(1)}%`])} /></div></Panel><Panel title="Coordinator update status" subtitle={`Updated ${coordinatorStatus.filter((item) => item.updated).length} · Pending ${pendingCount}`}><div className="space-y-2">{coordinatorStatus.slice(0, 7).map((item) => <div key={item.name} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-400">{item.company} · {item.location}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.updated ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.updated ? "UPDATED" : "PENDING"}</span></div>)}</div></Panel></section>

      <section id="master" className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800"><div><h2 className="font-semibold">Live client master</h2><p className="mt-1 text-xs text-slate-400">{filteredRows.length} records in the selected range</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search clients" className="w-32 bg-transparent text-xs outline-none sm:w-48" /></div><button onClick={() => exportRows("csv")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:border-cyan-400 dark:border-slate-700"><Download className="h-3.5 w-3.5" />CSV</button><button onClick={() => exportRows("xlsx")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:border-cyan-400 dark:border-slate-700"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button></div></div><div className="overflow-x-auto">{loading ? <TableSkeleton /> : <table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950"><tr>{([["companyName", "Company"], ["locationName", "Location"], ["schemeName", "Scheme"], ["coordinatorName", "Coordinator"], ["requirement", "Requirement"], ["filled", "Filled"], ["vacant", "Vacant"], ["updated_at", "Last Updated"]] as [keyof RTCARow, string][]).map(([key, label]) => <th key={key} className="px-4 py-3"><button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-cyan-700">{label}{sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : ""}</button></th>)}<th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visibleRows.map((row) => <tr key={row.id} onClick={() => setSelectedCompany(row.company_id)} className="cursor-pointer transition hover:bg-cyan-50/40 dark:hover:bg-slate-800"><td className="px-4 py-3 font-semibold">{row.companyName}</td><td className="px-4 py-3">{row.locationName}</td><td className="px-4 py-3">{row.schemeName}</td><td className="px-4 py-3">{row.coordinatorName}</td><td className="px-4 py-3">{formatNumber(row.requirement)}</td><td className="px-4 py-3">{formatNumber(row.filled)}</td><td className="px-4 py-3 text-amber-700">{formatNumber(row.vacant)}</td><td className="px-4 py-3 text-xs text-slate-500">{new Date(row.updated_at).toLocaleString()}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${row.vacant > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{row.vacant > 0 ? "OPEN GAP" : "COVERED"}</span></td></tr>)}</tbody></table>}{!loading && !visibleRows.length && <EmptyPanel onClear={resetFilters} />}</div><div className="flex items-center justify-end gap-3 border-t border-slate-200 p-3 text-xs dark:border-slate-800"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div></section>
    </div>
    {selectedCompany && <CompanyDrawer companyId={selectedCompany} rows={rows} onClose={() => setSelectedCompany(null)} />}
  </main>;
}

function summarize(rows: RTCARow[], key: (row: RTCARow) => string): Summary[] { const result: Record<string, Summary> = {}; rows.forEach((row) => { const label = key(row); const item = result[label] || emptySummary(label); item.requirement += Number(row.requirement || 0); item.filled += Number(row.filled || 0); item.vacant += Number(row.vacant || 0); item.fillRate = rate(item.filled, item.requirement); result[label] = item; }); return Object.values(result).sort((a, b) => b.requirement - a.requirement); }
function summarizeByDate(rows: RTCARow[], days: number) { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days + 1); const grouped = summarize(rows.filter((row) => new Date(`${row.report_date}T00:00:00`) >= cutoff), (row) => row.report_date); return grouped.sort((a, b) => a.label.localeCompare(b.label)).map((item) => ({ date: item.label, requirement: item.requirement, filled: item.filled, vacant: item.vacant })); }
function emptySummary(label: string): Summary { return { label, requirement: 0, filled: 0, vacant: 0, fillRate: 0 }; }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold tracking-tight">{title}</h2><p className="mt-1 text-xs text-slate-400">{subtitle}</p></div>{action}</div>{children}</div>; }
function KpiCards({ stats }: { stats: RTCAStats }) { const cards = [{ label: "Total clients", value: stats.companies, note: "Across active reporting data", icon: Building2 }, { label: "Total locations", value: stats.locations, note: "Client delivery locations", icon: MapPin }, { label: "Total requirement", value: stats.requirement, note: "Across selected schemes", icon: Users }, { label: "Total filled", value: stats.filled, note: `${stats.fillRate.toFixed(1)}% of requirement`, icon: CheckCircle2 }, { label: "Total vacant", value: stats.vacant, note: "Current manpower gap", icon: Activity }, { label: "Fill rate", value: `${stats.fillRate.toFixed(1)}%`, note: "Workforce coverage", icon: BarChart3 }]; return <>{cards.map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="rounded-lg bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><card.icon className="h-4 w-4" /></span><ShieldCheck className="h-4 w-4 text-slate-300" /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{card.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{typeof card.value === "number" ? formatNumber(card.value) : card.value}</p><p className="mt-1 text-xs text-slate-500">{card.note}</p></div>)}</>; }
function KpiSkeletons() { return <>{Array.from({ length: 6 }, (_, index) => <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800" /><div className="mt-5 h-2 w-24 rounded bg-slate-200 dark:bg-slate-800" /><div className="mt-2 h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" /><div className="mt-2 h-2 w-32 rounded bg-slate-200 dark:bg-slate-800" /></div>)}</>; }
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><option value="">All {label.toLowerCase()}s</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" /></label>; }
function MetricLegend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="text-slate-500">{label}</span><strong className="ml-auto">{formatNumber(value)}</strong></div>; }
function Insight({ text }: { text: string }) { return <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span className="mt-1 h-2 w-2 rounded-full bg-cyan-600" /><span>{text}</span></div>; }
function EmptyChart({ message = "No workforce data available for the selected filters." }: { message?: string }) { return <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">{message}</div>; }
function EmptyPanel({ onClear }: { onClear: () => void }) { return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900"><Activity className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium">No workforce data available for the selected filters.</p><button onClick={onClear} className="mt-3 text-xs font-semibold text-cyan-700 hover:underline">Clear filters</button></div>; }
function TableSkeleton() { return <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />)}</div>; }
function SortableTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <table className="w-full min-w-[620px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800"><tr>{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row, index) => <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3">{cell}</td>)}</tr>)}</tbody></table>; }
function CompanyDrawer({ companyId, rows, onClose }: { companyId: string; rows: RTCARow[]; onClose: () => void }) { const companyRows = rows.filter((row) => row.company_id === companyId); const first = companyRows[0]; const total = companyRows.reduce((result, row) => ({ requirement: result.requirement + row.requirement, filled: result.filled + row.filled, vacant: result.vacant + row.vacant }), { requirement: 0, filled: 0, vacant: 0 }); return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={onClose}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Company drill-down</p><h2 className="mt-2 text-2xl font-bold">{first?.companyName || "Company"}</h2></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Close"><X className="h-5 w-5" /></button></div><div className="mt-6 grid grid-cols-3 gap-3"><MetricLegend color="bg-cyan-600" label="Requirement" value={total.requirement} /><MetricLegend color="bg-emerald-600" label="Filled" value={total.filled} /><MetricLegend color="bg-amber-500" label="Vacant" value={total.vacant} /></div><div className="mt-7"><h3 className="font-semibold">Scheme breakdown</h3><div className="mt-3"><SortableTable headers={["Scheme", "Requirement", "Filled", "Vacant", "Fill rate"]} rows={summarize(companyRows, (row) => row.schemeName).map((item) => [item.label, formatNumber(item.requirement), formatNumber(item.filled), formatNumber(item.vacant), `${item.fillRate.toFixed(1)}%`])} /></div></div></aside></div>; }