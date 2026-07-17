import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();

  if (!auth) {
    return <h2>Auth Context Missing</h2>;
  }

  const { user, loading } = auth;

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}