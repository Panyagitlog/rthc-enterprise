import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  LogOut,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import DMCFSLogo from "../components/brand/DMCFSLogo";

const appCards = [
  {
    id: "rthc",
    label: "RTHC",
    title: "REAL-TIME HEAD COUNT",
    subtitle: "Workforce Operations",
    description:
      "Monitor workforce requirements, filled headcount, vacancies and coordinator updates across locations.",
    accent: "blue",
    route: "/dashboard",
    icon: Users,
    tags: ["LIVE", "HEADCOUNT", "LOCATIONS"],
    cta: "Open RTHC",
  },
  {
    id: "rtca",
    label: "RTCA",
    title: "CLIENT & WORKFORCE ANALYTICS",
    subtitle: "Business Intelligence",
    description:
      "Analyze client companies, schemes, locations, workforce performance and business insights.",
    accent: "cyan",
    route: "/rtca",
    icon: BarChart3,
    tags: ["ANALYTICS", "CLIENTS", "PERFORMANCE"],
    cta: "Open RTCA",
  },
] as const;

export default function ApplicationSelection() {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-slate-900 transition-colors duration-300 dark:bg-[#07111F] dark:text-slate-50">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#FF6600]/5 blur-3xl dark:bg-[#FF6600]/10" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#0F172A]/5 blur-3xl dark:bg-[#1D4ED8]/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,23,42,0.04),transparent_20%),radial-gradient(circle_at_80%_10%,rgba(17,24,39,0.04),transparent_16%),linear-gradient(to_bottom,transparent,rgba(148,163,184,0.04))]" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)] sm:px-6">
            <div className="flex items-center gap-3">
              <DMCFSLogo variant="full" size="sm" className="w-[150px] sm:w-[170px]" />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6600] text-sm font-semibold text-white shadow-sm">
                  PP
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pranav P</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7A7A7A] dark:text-slate-300">
                    Super Admin
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600]/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </header>

          <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-8 sm:py-12 lg:py-16">
            <div className="mb-8 flex flex-col gap-3 text-center sm:mb-10">
              <div className="inline-flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FF6600]">
                <span className="inline-block h-px w-7 bg-[#FF6600]/50" />
                DMCFS
                <span className="inline-block h-px w-7 bg-[#FF6600]/50" />
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-[3.25rem]">
                Welcome back, Pranav
              </h1>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                Choose your workspace to continue.
              </p>
              <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Access workforce operations and client performance intelligence from one centralized enterprise platform.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {appCards.map(({ id, label, title, subtitle, description, accent, route, icon: Icon, tags, cta }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(route)}
                  className={`group relative overflow-hidden rounded-[28px] border bg-white p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_26px_70px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600]/60 sm:p-7 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_18px_50px_rgba(2,6,23,0.38)] dark:hover:border-slate-700 ${
                    accent === "blue"
                      ? "border-slate-200/80 dark:border-slate-800"
                      : "border-slate-200/80 dark:border-slate-800"
                  }`}
                  aria-label={`Open ${label}`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FF6600]/30 to-transparent opacity-80 dark:via-[#FF6600]/50" />

                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        accent === "blue"
                          ? "bg-[#EAF3FF] text-[#0F3D91] dark:bg-[#132D5B] dark:text-[#A7C7FF]"
                          : "bg-[#E8FAF7] text-[#0A6F6C] dark:bg-[#0E3E46] dark:text-[#9AE3D7]"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                  </div>

                  <div className="mt-7">
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50 sm:text-2xl">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {subtitle}
                    </p>
                  </div>

                  <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          accent === "blue"
                            ? "border-[#cfe0ff] bg-[#f2f7ff] text-[#1d4ed8] dark:border-[#1f3f74] dark:bg-[#122544] dark:text-[#b9d2ff]"
                            : "border-[#c7f3ec] bg-[#f1fdfb] text-[#0f766e] dark:border-[#173d3f] dark:bg-[#0c2c33] dark:text-[#a5f3d5]"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <span
                      className={`inline-flex items-center gap-2 text-sm font-semibold ${
                        accent === "blue"
                          ? "text-[#0F3D91] dark:text-[#A7C7FF]"
                          : "text-[#0A6F6C] dark:text-[#9AE3D7]"
                      }`}
                    >
                      {cta}
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-200 group-hover:translate-x-1 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-slate-700">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-auto border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
              <span className="font-semibold uppercase tracking-[0.2em] text-[#7A7A7A] dark:text-slate-300">
                DMCFS PVT. LTD.
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-400 sm:block" />
              <span>People | Partnership | Progress</span>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Enterprise Workforce Platform
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
