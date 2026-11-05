import { Moon, Sun } from "lucide-react";
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CoordinatorForm from "./pages/CoordinatorForm";
import AreaDashboard from "./pages/AreaDashboard";
import Unauthorized from "./pages/Unauthorized";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Companies from "./pages/Companies";
import Locations from "./pages/Locations";
import Coordinators from "./pages/Coordinators";
import Analytics from "./pages/Analytics";
import Headcount from "./pages/Headcount";
import CompanyDashboard from "./pages/CompanyDashboard";
import ApplicationSelection from "./pages/ApplicationSelection";
import RTCADashboard from "./pages/RTCADashboardPremium";
import TVMode from "./pages/TVMode";
import RTCPMPage from "./features/rtcpm/RTCPMPage";
import UserManagement from "./features/users/UserManagement";
import AIChat from "./pages/AIChat";
import RTSRMPApp from "./apps/rtsrmp/RTSRMPApp";
import RTSRMPAccess from "./apps/rtsrmp/RTSRMPAccess";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import { useTheme } from "./lib/theme/ThemeProvider";
import { useLocation } from "./lib/router";

function GlobalThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const pathname = useLocation().pathname;
  const isLoginPage = pathname === "/";

  if (pathname === "/tvmode") return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[100] inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
      style={isLoginPage && isDark ? { borderColor: "var(--brand-pink)", boxShadow: "0 0 0 1px var(--brand-pink)" } : undefined}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function RootLayout() {
  return (
    <>
      <GlobalThemeToggle />
      <Outlet />
    </>
  );
}

function protectedPage(
  Page: React.ComponentType,
  allowedRoles?: string | string[],
) {
  return function ProtectedPage() {
    const page = allowedRoles ? (
      <RoleGuard allowedRoles={allowedRoles}>
        <Page />
      </RoleGuard>
    ) : (
      <Page />
    );

    return <ProtectedRoute>{page}</ProtectedRoute>;
  };
}

function rtsrmpPage() {
  return (
    <ProtectedRoute>
      <RTSRMPAccess>
        <RTSRMPApp />
      </RTSRMPAccess>
    </ProtectedRoute>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: "/", component: Login }),
  createRoute({ getParentRoute: () => rootRoute, path: "/app-select", component: protectedPage(ApplicationSelection, ["SUPER_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/rtca", component: protectedPage(RTCADashboard, ["SUPER_ADMIN", "AREA_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/tvmode", component: protectedPage(TVMode, ["SUPER_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/rtcpm", component: protectedPage(RTCPMPage, ["SUPER_ADMIN", "AUDITOR"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/users", component: protectedPage(UserManagement, ["SUPER_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/ai-chat", component: protectedPage(AIChat, ["SUPER_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/rtsrmp", component: rtsrmpPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/rtsrmp/*", component: rtsrmpPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/dashboard", component: protectedPage(Dashboard, ["SUPER_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/areadashboard", component: protectedPage(AreaDashboard, ["AREA_ADMIN"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/profile", component: protectedPage(Profile) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/coordinator/profile", component: protectedPage(Profile, ["COORDINATOR"]) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: protectedPage(Settings) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/companies", component: protectedPage(Companies) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/locations", component: protectedPage(Locations) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/coordinators", component: protectedPage(Coordinators) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/Analytics", component: protectedPage(Analytics) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/Headcount", component: protectedPage(Headcount) }),
  createRoute({ getParentRoute: () => rootRoute, path: "/coordinator", component: protectedPage(CoordinatorForm, ["COORDINATOR"]) }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/reports",
    component: protectedPage(CompanyDashboard, "SUPER_ADMIN"),
  }),
  createRoute({ getParentRoute: () => rootRoute, path: "/unauthorized", component: Unauthorized }),
]);

const router = createRouter({ routeTree });

export default function App() {
  return <RouterProvider router={router} />;
}
