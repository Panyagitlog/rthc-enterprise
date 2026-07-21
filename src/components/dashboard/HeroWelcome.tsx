import { Building, Plus, UserPlus, Map as MapIcon } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-6 text-white shadow-sm dark:border-slate-800 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-teal-300">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {getGreeting()}, {userProfile?.name?.split(" ")[0] || "there"}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {userProfile?.role ? `${userProfile.role} · ` : ""}
            {userProfile?.company_id ? "Monitoring your assigned companies" : "Enterprise-wide monitoring"}
            {userProfile?.last_login &&
              ` · Last login ${format(new Date(userProfile.last_login), "MMM d, hh:mm a")}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onQuickAction("company")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <Building className="h-3.5 w-3.5" /> New Company
          </button>
          <button
            onClick={() => onQuickAction("location")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <MapIcon className="h-3.5 w-3.5" /> New Location
          </button>
          <button
            onClick={() => onQuickAction("coordinator")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <UserPlus className="h-3.5 w-3.5" /> New Coordinator
          </button>
          <button
            onClick={() => onQuickAction("entry")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> New Entry
          </button>
        </div>
      </div>
    </div>
  );
}
