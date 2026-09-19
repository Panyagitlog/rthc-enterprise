import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CoordinatorForm from "./pages/CoordinatorForm";
import AreaDashboard from "./pages/AreaDashboard";
import Unauthorized from "./pages/Unauthorized.tsx";
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
import RTCPMPage from "./features/rtcpm/RTCPMPage";
import UserManagement from "./features/users/UserManagement";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import { useTheme } from "./lib/theme/ThemeProvider";


// 🌌 Global 3D background
// import GlobalThreeBackground from "./components/GlobalThreeBackground";
// import CherryBlossomBackground from "./components/CherryBlossomBackground";
// import UltimateThreeBackground from "./components/UltimateThreeBackground";


function GlobalThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[100] inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalThemeToggle />
      {/* Subtle particle field – fixed, behind everything */}
      {/* <GlobalThreeBackground />
       <CherryBlossomBackground /> */}
          {/* <UltimateThreeBackground /> */}


      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        <Route
          path="/app-select"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
                <ApplicationSelection />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rtca"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["SUPER_ADMIN", "AREA_ADMIN"]}>
                <RTCADashboard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rtcpm"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["SUPER_ADMIN", "AUDITOR"]}>
                <RTCPMPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
                <UserManagement />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Super Admin */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
                <Dashboard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Area Admin */}
        <Route
          path="/areadashboard"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["AREA_ADMIN"]}>
                <AreaDashboard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/coordinator/profile"
          element={
            
            <ProtectedRoute>
              <RoleGuard allowedRoles={["COORDINATOR"]}>
              <Profile />
              </RoleGuard>
            </ProtectedRoute>

          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />

        <Route
          path="/locations"
          element={
            <ProtectedRoute>
              <Locations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/coordinators"
          element={
            <ProtectedRoute>
              <Coordinators />
            </ProtectedRoute>
          }
        />

        <Route
          path="/Analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/Headcount"
          element={
            <ProtectedRoute>
              <Headcount />
            </ProtectedRoute>
          }
        />

        {/* Coordinator */}
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={["COORDINATOR"]}>
                <CoordinatorForm />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={"SUPER_ADMIN"}>
                <CompanyDashboard />
              </RoleGuard>
            </ProtectedRoute>
          }
        />



        {/* Unauthorized */}
        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />
      </Routes>
    </BrowserRouter>
  );
}