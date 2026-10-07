import { Link } from "react-router-dom";
import { ShieldX, Home, Mail, AlertCircle, Zap } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/2"></div>

      <div className="w-full max-w-md animate-fadeInUp">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl shadow-blue-200/50 dark:shadow-slate-900/50 rounded-3xl border border-white/80 dark:border-slate-700/50 p-10 text-center relative z-10">
          {/* Icon with gradient background */}
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-100 dark:from-blue-900 to-blue-200 dark:to-blue-800 flex items-center justify-center mb-6 shadow-inner shadow-blue-300/30 dark:shadow-blue-700/30">
            <ShieldX className="w-12 h-12 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            Access Denied
          </h1>

          <div className="mt-3 text-slate-500 dark:text-slate-400 space-y-1">
            <p>You don't have permission to access this page.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Please contact your administrator if you believe this is an error.
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-8 space-y-3">
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 text-white font-medium px-6 py-3 rounded-xl shadow-md shadow-blue-200 dark:shadow-blue-900/50 hover:shadow-lg transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              Back to Login
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 font-medium px-6 py-3 rounded-xl border border-blue-100 dark:border-slate-600 transition-all duration-200"
            >
              <AlertCircle className="w-5 h-5" />
              Retry
            </button>
          </div>

          {/* Support info */}
          <div className="mt-6 pt-6 border-t border-blue-100/60 dark:border-slate-700/50 flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Mail className="w-4 h-4 text-blue-400 dark:text-blue-500" />
            <span>Need help? </span>
            <a
              href="mailto:support@rthc.com"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              support@rthc.com
            </a>
          </div>

          {/* Version / Environment */}
          <div className="mt-4 text-xs text-slate-400/70 dark:text-slate-500 flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 text-blue-400 dark:text-blue-500" />
            RTHC Enterprise v1.0 • {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
