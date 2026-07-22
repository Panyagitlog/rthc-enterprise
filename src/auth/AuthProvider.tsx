import { createContext, useContext, useEffect, useState } from "react";
// @ts-ignore
import { supabase } from "../services/supabase";

const AuthContext = createContext<any>(undefined);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser(data.user);

        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("auth_user_id", data.user.id)
          .single();

        setProfile(profileData);
      }

      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: (profile as any)?.role,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);