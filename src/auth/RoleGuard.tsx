import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function RoleGuard({ allowedRoles, children }) {
  const auth = useAuth();

  if (!auth) {
    return <h2>Auth Context Missing</h2>;
  }

  const { role, loading } = auth;

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}