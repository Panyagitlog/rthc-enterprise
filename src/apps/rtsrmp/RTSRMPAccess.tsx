import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
// @ts-ignore The existing Supabase client is JavaScript and has no declaration file.
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import { loadAuthorizedProfile, safeErrorMessage } from "./services";
import { RTSRMPProfileContext } from "./profile-context";
import type { RTSRMPProfile } from "./types";

export default function RTSRMPAccess({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<RTSRMPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      const authorizedProfile = await loadAuthorizedProfile();
      if (requestId.current === currentRequest) setProfile(authorizedProfile);
    } catch (error) {
      safeErrorMessage(error);
      if (requestId.current === currentRequest) {
        setFailed(true);
        setProfile(null);
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (!session || event === "SIGNED_OUT") {
        requestId.current += 1;
        setProfile(null);
        setFailed(false);
        setLoading(false);
      } else if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        refreshTimer = window.setTimeout(() => void load(), 0);
      }
    });
    void load();
    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      requestId.current += 1;
      subscription.unsubscribe();
    };
  }, [load]);

  if (!isSupabaseConfigured) {
    return (
      <AccessMessage
        title="RTSRMP is not configured"
        message="Connect this application to its configured Supabase project before using RTSRMP."
        onRetry={load}
      />
    );
  }

  if (loading) {
    return <AccessMessage title="Checking access" message="Verifying your RTSRMP account…" />;
  }

  if (failed) {
    return (
      <AccessMessage
        title="RTSRMP access could not be verified"
        message="Your account must have an assigned SUPER_ADMIN or COMPANY_HR role and the required company/location scope."
        onRetry={load}
      />
    );
  }

  if (!profile) return <Navigate to="/unauthorized" replace />;
  return <RTSRMPProfileContext.Provider value={profile}>{children}</RTSRMPProfileContext.Provider>;
}

function AccessMessage({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">RTSRMP</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="mt-6 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Retry
          </button>
        )}
      </section>
    </main>
  );
}
