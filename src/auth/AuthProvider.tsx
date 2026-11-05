import { createContext, useContext, useEffect, useState } from "react";
// @ts-ignore
import {
  supabase,
  isSupabaseConfigured,
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
      if (!isSupabaseConfigured) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          setUser(null);
          setProfile(null);
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user) {
          setUser(null);
          setProfile(null);
          return;
        }

        const profileData = await getProfileFromUsersTable(data.user.id);
        if (
          !profileData?.role ||
          String(profileData.status ?? "").toUpperCase() !== "ACTIVE"
        ) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(data.user);
        setProfile(profileData);
      } catch (error) {
        console.error("Unable to load the authenticated user profile:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
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