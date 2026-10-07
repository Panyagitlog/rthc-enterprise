import { createContext, useContext, useEffect, useState } from "react";
// @ts-ignore
import {
  supabase,
  isSupabaseConfigured,
  getStoredSession,
  clearStoredSession,
  getProfileFromUsersTable,
  normalizeRole,
} from "../services/supabase";

const AuthContext = createContext<any>(undefined);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedSession = getStoredSession();
      if (!isSupabaseConfigured) {
        if (storedSession) {
          setUser(storedSession);
          setProfile(storedSession);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser(data.user);

        const profileData = await getProfileFromUsersTable(data.user.id);
        setProfile(profileData || { role: "SUPER_ADMIN" });
      } else {
        clearStoredSession();
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    };

    loadUser();

    if (!isSupabaseConfigured) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolvedRole = normalizeRole((profile as any)?.role || (user as any)?.role || "");

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: resolvedRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);