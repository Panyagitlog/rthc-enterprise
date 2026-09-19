import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { normalizeRole } from "../services/supabase";

export default function RoleGuard({ allowedRoles, children }: { allowedRoles: any; children: any }) {
  const auth = useAuth() as any;

  if (!auth) {
    return <h2>Auth Context Missing</h2>;
  }

  const { role, loading } = auth;
  const normalizedRole = normalizeRole(role);
  const allowed = Array.isArray(allowedRoles)
    ? allowedRoles.map((item) => normalizeRole(item))
    : [normalizeRole(allowedRoles)];

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!normalizedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowed.includes(normalizedRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}