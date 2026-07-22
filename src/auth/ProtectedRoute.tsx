import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children }: { children: any }) {
  const auth = useAuth() as any;


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