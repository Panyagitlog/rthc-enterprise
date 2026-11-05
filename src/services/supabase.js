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

export const getProfileFromUsersTable = async (userId) => {
  if (!isSupabaseConfigured || !userId) {
    return null;
  }

  const byAuthId = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!byAuthId.error && byAuthId.data) {
    return byAuthId.data;
  }

  if (byAuthId.error && !["42703", "PGRST204"].includes(byAuthId.error.code)) {
    throw byAuthId.error;
  }

  const byProfileId = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (byProfileId.error) {
    throw byProfileId.error;
  }

  return byProfileId.data;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});