import { format } from "date-fns";
import { Clock } from "lucide-react";
import type { HeadcountRecord } from "../../types/dashboard";

export default function LiveActivityFeed({ updates }: { updates: HeadcountRecord[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Clock className="h-4 w-4 text-teal-500" />
        Live Updates
      </h3>
      <ol className="mt-3 max-h-[600px] space-y-4 overflow-y-auto border-l border-slate-100 pl-4 dark:border-slate-800">
        {updates.length === 0 && <p className="text-sm text-slate-400">No recent updates</p>}
        {updates.map((u) => (
          <li key={u.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-500 dark:border-slate-900" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">{u.coordinator?.name || "Unknown"}</span> updated{" "}
              <span className="font-medium text-slate-900 dark:text-white">{u.company?.company_name}</span> →{" "}
              <span className="font-medium text-slate-900 dark:text-white">{u.location?.location_name}</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              Req {u.requirement || 0} · Filled {u.filled || 0} · Vacant {u.vacant || 0}
            </p>
            <p className="text-xs text-slate-400">{format(new Date(u.created_at), "hh:mm a")}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
