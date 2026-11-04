import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Building2, MapPin, Maximize2, Minimize2, RefreshCw, Tv } from "lucide-react";
// @ts-ignore
import { supabase } from "../services/supabase";
import DMCFSLogo from "../components/brand/DMCFSLogo";
import { fetchRTCAData } from "../services/rtcaService";
import type { RTCAFilters, RTCARow, RTCAStats } from "../types/rtca";

const EMPTY_FILTERS: RTCAFilters = {
  companyId: "",
  locationId: "",
  schemeId: "",
  coordinatorId: "",
  dateFrom: "",
  dateTo: "",
};
const EMPTY_STATS: RTCAStats = {
  companies: 0,
  locations: 0,
  requirement: 0,
  filled: 0,
  vacant: 0,
  fillRate: 0,
};
const PAGE_SIZE = 6;
const REFRESH_INTERVAL = 60_000;
const PAGE_INTERVAL = 12_000;
const formatNumber = (value: number) => value.toLocaleString("en-IN");

export default function TVMode() {
  const [rows, setRows] = useState<RTCARow[]>([]);
  const [stats, setStats] = useState<RTCAStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchRTCAData(EMPTY_FILTERS);
      if (currentRequestId !== requestId.current) return;
      setRows([...result.rows].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
      setStats(result.stats);
      setLastUpdated(new Date());
      setError(null);
    } catch (loadError) {
      if (currentRequestId !== requestId.current) return;
      console.error("Unable to load TV mode updates.", loadError);
      setError("Unable to load nationwide updates. Check the connection and try again.");
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshTimer = window.setInterval(() => void load(), REFRESH_INTERVAL);
    const channel = supabase
      .channel("rtca-tvmode-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheme_requirements" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "headcount_updates" }, () => void load())
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`TV mode realtime subscription status: ${status}`);
        }
      });

    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = useMemo(() => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [page, rows]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const pageTimer = window.setInterval(() => setPage((current) => (current + 1) % pageCount), PAGE_INTERVAL);
    return () => window.clearInterval(pageTimer);
  }, [pageCount]);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (fullscreenError) {
      console.error("Unable to change fullscreen mode.", fullscreenError);
      setError("Fullscreen is unavailable in this browser. Use the browser's fullscreen control instead.");
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-9">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <div className="flex items-center gap-5">
            <div className="rounded-xl bg-white px-3 py-2">
              <DMCFSLogo size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                <Tv className="h-5 w-5" />
                Nationwide live updates
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-4xl">All India Workforce Dashboard</h1>
              <p className="mt-2 text-sm text-slate-400">Live headcount and scheme updates from every state</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-2 text-sm font-semibold text-emerald-300">
                <Activity className="h-4 w-4" />
                LIVE
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN")}` : "Connecting to updates"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60"
              aria-label="Refresh updates"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <section className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total requirement" value={stats.requirement} accent="cyan" />
          <SummaryCard label="Filled positions" value={stats.filled} accent="emerald" />
          <SummaryCard label="Current vacancies" value={stats.vacant} accent="amber" />
          <SummaryCard label="States / locations" value={`${new Set(rows.map((row) => row.stateName).filter((state) => state && state !== "Unknown")).size} / ${stats.locations}`} accent="violet" />
        </section>

        <section className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-[#0d1b2b] shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Latest updates across India</h2>
              <p className="mt-1 text-sm text-slate-400">All companies, states, locations and schemes · newest first</p>
            </div>
            <p className="text-sm font-medium tabular-nums text-slate-400">
              {rows.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, rows.length)} of ${formatNumber(rows.length)} updates` : "No updates"}
            </p>
          </div>

          {error && (
            <div role="alert" className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-rose-200 sm:mx-7">
              <span>{error}</span>
              <button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-16 text-lg text-slate-400">
              <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Loading nationwide updates…
            </div>
          ) : !rows.length ? (
            <div className="flex flex-1 items-center justify-center py-16 text-lg text-slate-400">
              No workforce updates are available yet.
            </div>
          ) : (
            <div className="flex flex-1 flex-col divide-y divide-white/10">
              {visibleRows.map((row) => <UpdateRow key={`${row.id}-${row.scheme_id}`} row={row} />)}
            </div>
          )}

          <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4 text-xs text-slate-500 sm:px-7">
            <span>Updates refresh automatically · use fullscreen for TV display</span>
            <span className="tabular-nums">Page {page + 1} / {pageCount}</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  const accentClasses: Record<string, string> = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    violet: "text-violet-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1b2b] px-5 py-4">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums sm:text-4xl ${accentClasses[accent]}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function UpdateRow({ row }: { row: RTCARow }) {
  const updatedAt = new Date(row.updated_at);

  return (
    <article className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(3,minmax(90px,0.55fr))] sm:items-center sm:px-7">
      <div className="min-w-0">
        <p className="truncate text-lg font-bold sm:text-xl">{row.companyName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-cyan-300" />{row.stateName || "Unknown"} · {row.locationName}</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 shrink-0 text-slate-500" />{row.schemeName}</span>
        </div>
      </div>
      <div className="text-sm text-slate-400 sm:text-base">
        <span className="text-slate-500">Coordinator </span>{row.coordinatorName}
        <p className="mt-1 text-xs">{Number.isNaN(updatedAt.getTime()) ? "Time unavailable" : updatedAt.toLocaleString("en-IN")}</p>
      </div>
      <Metric label="Required" value={row.requirement} />
      <Metric label="Filled" value={row.filled} tone="text-emerald-300" />
      <Metric label="Vacant" value={row.vacant} tone={row.vacant > 0 ? "text-amber-300" : "text-slate-300"} />
    </article>
  );
}

function Metric({ label, value, tone = "text-white" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between sm:block">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums sm:mt-1 sm:text-2xl ${tone}`}>{formatNumber(value)}</p>
    </div>
  );
}
