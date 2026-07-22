import { BrowserRouter, Routes, Route } from "react-router-dom";

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

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";

// 🌌 Global 3D background
// import GlobalThreeBackground from "./components/GlobalThreeBackground";
// import CherryBlossomBackground from "./components/CherryBlossomBackground";
// import UltimateThreeBackground from "./components/UltimateThreeBackground";


export default function App() {
  return (
    <BrowserRouter>
      {/* Subtle particle field – fixed, behind everything */}
      {/* <GlobalThreeBackground />
       <CherryBlossomBackground /> */}
          {/* <UltimateThreeBackground /> */}


      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

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

        {/* Unauthorized */}
        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />
      </Routes>
    </BrowserRouter>
  );
}