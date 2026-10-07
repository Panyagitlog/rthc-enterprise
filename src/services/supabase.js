import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
const hasRealSupabaseUrl = Boolean(
  supabaseUrl && !supabaseUrl.includes("placeholder") && !supabaseUrl.includes("your-project")
);
const hasRealAnonKey = Boolean(
  supabaseAnonKey && !supabaseAnonKey.includes("placeholder") && !supabaseAnonKey.includes("your-anon")
);

export const isSupabaseConfigured = hasRealSupabaseUrl && hasRealAnonKey;

export const normalizeRole = (role) => {
  if (!role && role !== 0) return "";

  const cleaned = String(role).trim();
  if (!cleaned) return "";

  const normalized = cleaned
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\.+/g, "_");

  if (["SUPER_ADMIN", "SUPERADMIN"].includes(normalized)) return "SUPER_ADMIN";
  if (["AREA_ADMIN", "AREAADMIN"].includes(normalized)) return "AREA_ADMIN";
  if (["COORDINATOR"].includes(normalized)) return "COORDINATOR";
  if (["AUDITOR"].includes(normalized)) return "AUDITOR";

  return normalized;
};

export const DEMO_USERS = {
  "admin@dmcfs.in": {
    id: "demo-super-admin",
    name: "Super Admin",
    email: "admin@dmcfs.in",
    password: "admin123",
    role: "SUPER_ADMIN",
  },
  "fieldofficer@dmcfs.in": {
    id: "demo-super-admin-field",
    name: "Field Officer",
    email: "fieldofficer@dmcfs.in",
    password: "admin123",
    role: "SUPER_ADMIN",
  },
  "area@dmcfs.in": {
    id: "demo-area-admin",
    name: "Area Admin",
    email: "area@dmcfs.in",
    password: "admin123",
    role: "AREA_ADMIN",
  },
  "coordinator@dmcfs.in": {
    id: "demo-coordinator",
    name: "Coordinator",
    email: "coordinator@dmcfs.in",
    password: "admin123",
    role: "COORDINATOR",
  },
  "auditor@dmcfs.in": {
    id: "demo-auditor",
    name: "Auditor",
    email: "auditor@dmcfs.in",
    password: "admin123",
    role: "AUDITOR",
  },
};

export const getDemoUser = (email, password) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  const user = DEMO_USERS[normalizedEmail];

  if (user && normalizedPassword === user.password) {
    return { ...user, auth_user_id: user.id };
  }

  if (normalizedPassword === "admin123" && normalizedEmail.endsWith("@dmcfs.in")) {
    const alias = normalizedEmail.includes("area")
      ? "AREA_ADMIN"
      : normalizedEmail.includes("coord") || normalizedEmail.includes("coordinator")
        ? "COORDINATOR"
        : normalizedEmail.includes("audit") || normalizedEmail.includes("auditor")
          ? "AUDITOR"
          : "SUPER_ADMIN";
    const normalizedAlias = normalizeRole(alias);
    const label = normalizedAlias === "SUPER_ADMIN" ? "Super Admin" : normalizedAlias === "AREA_ADMIN" ? "Area Admin" : normalizedAlias === "AUDITOR" ? "Auditor" : "Coordinator";
    const fallbackEmail = normalizedEmail.includes("area") ? "area@dmcfs.in" : normalizedEmail.includes("coord") || normalizedEmail.includes("coordinator") ? "coordinator@dmcfs.in" : normalizedEmail.includes("audit") || normalizedEmail.includes("auditor") ? "auditor@dmcfs.in" : "admin@dmcfs.in";

    return {
      id: `demo-${normalizedAlias.toLowerCase()}`,
      name: label,
      email: fallbackEmail,
      password: "admin123",
      role: normalizedAlias,
      auth_user_id: `demo-${normalizedAlias.toLowerCase()}`,
    };
  }

  return null;
};

export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem("rthc-demo-session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredSession = (user) => {
  localStorage.setItem("rthc-demo-session", JSON.stringify(user));
};

export const clearStoredSession = () => {
  localStorage.removeItem("rthc-demo-session");
};

export const getProfileFromUsersTable = async (userId) => {
  if (!isSupabaseConfigured || !userId) {
    return null;
  }

  const candidates = [
    supabase.from("users").select("*").eq("auth_user_id", userId).maybeSingle(),
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
  ];

  for (const promise of candidates) {
    const { data, error } = await promise;

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Profile lookup error:", error);
      }
      continue;
    }

    if (data) {
      return data;
    }
  }

  return null;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

if (!isSupabaseConfigured) {
  supabase.auth.getSession = async () => {
    const storedSession = getStoredSession();
    return {
      data: {
        session: storedSession
          ? {
              user: storedSession,
            }
          : null,
      },
      error: null,
    };
  };

  supabase.auth.getUser = async () => {
    const storedSession = getStoredSession();
    return {
      data: {
        user: storedSession || null,
      },
      error: null,
    };
  };

  supabase.auth.signInWithPassword = async ({ email, password }) => {
    const demoUser = getDemoUser(email, password);

    if (!demoUser) {
      return {
        data: { user: null },
        error: { message: "Invalid login credentials" },
      };
    }

    setStoredSession(demoUser);
    return {
      data: { user: demoUser },
      error: null,
    };
  };

  supabase.auth.signOut = async () => {
    clearStoredSession();
    return { error: null };
  };

  supabase.auth.onAuthStateChange = () => ({
    data: {
      subscription: {
        unsubscribe: () => {},
      },
    },
  });
}