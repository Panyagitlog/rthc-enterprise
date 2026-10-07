import { useAuthContext } from "../auth/AuthProvider";

export default function useAuth() {
  return useAuthContext();
}