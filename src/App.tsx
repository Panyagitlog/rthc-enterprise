import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CoordinatorForm from "./pages/CoordinatorForm";
import AreaDashboard from "./pages/AreaDashboard";
import Unauthorized from "./pages/Unauthorized";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";

export default function App() {
  return (
    <BrowserRouter>
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