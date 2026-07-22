import { Building, Plus, UserPlus, Map as MapIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { UserProfile } from "../../types/dashboard";

interface HeroWelcomeProps {
  userProfile: UserProfile | null;
  onQuickAction: (action: "company" | "location" | "coordinator" | "entry") => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HeroWelcome({ userProfile, onQuickAction }: HeroWelcomeProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.8)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%)]" />

      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-100 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {getGreeting()}, {userProfile?.name?.split(" ")[0] || "there"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {userProfile?.role ? `${userProfile.role} · ` : ""}
            {userProfile?.company_id ? "Monitoring your assigned companies" : "Enterprise-wide monitoring"}
            {userProfile?.last_login && ` · Last login ${format(new Date(userProfile.last_login), "MMM d, hh:mm a")}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => onQuickAction("company")} className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20">
            <Building className="h-3.5 w-3.5" /> New Company
          </button>
          <button onClick={() => onQuickAction("location")} className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20">
            <MapIcon className="h-3.5 w-3.5" /> New Location
          </button>
          <button onClick={() => onQuickAction("coordinator")} className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20">
            <UserPlus className="h-3.5 w-3.5" /> New Coordinator
          </button>
          <button onClick={() => onQuickAction("entry")} className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px]">
            <Plus className="h-3.5 w-3.5" /> New Entry
          </button>
        </div>
      </div>
    </div>
  );
}
