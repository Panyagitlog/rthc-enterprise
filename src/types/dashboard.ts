export interface Company {
  id: string;
  company_name: string;
  status?: string;
}

export interface LocationRecord {
  id: string;
  location_name: string;
  company_id: string;
  status?: string;
}

export interface Coordinator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  location_id?: string;
  status?: string;
}

export interface HeadcountRecord {
  id: string;
  requirement: number;
  filled: number;
  vacant: number;
  remarks?: string;
  created_at: string;
  company_id: string;
  location_id: string;
  coordinator_id: string;
  company?: { id: string; company_name: string };
  location?: { id: string; location_name: string };
  coordinator?: { id: string; name: string };
}

export interface DashboardFilters {
  companyId: string;
  dateRange: "all" | "today" | "week" | "month";
  status: "" | "understaffed" | "balanced" | "overstaffed";
  search: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  company_id?: string;
  last_login?: string;
}
