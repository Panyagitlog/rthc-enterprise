// @ts-ignore
import { supabase } from "./supabase";
import type { RTCAFilters, RTCARecord, RTCARow, RTCAStats } from "../types/rtca";

type NamedRow = { id: string; company_name?: string; location_name?: string; name?: string };
type CurrentUserScope = { role: string | null; companyId: string | null; locationId: string | null };

const PAGE_SIZE = 1000;

// PostgREST caps a single response (1000 rows by default), so totals must be built from every page.
async function fetchAllRows<T = any>(buildQuery: () => any): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as T[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

const localDateKey = (value: string | null | undefined) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
};

// Calendar dates are interpreted in the user's local timezone, not UTC.
const startOfLocalDayIso = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const endOfLocalDayIso = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

async function getCurrentUserScope(): Promise<CurrentUserScope> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) {
    return { role: null, companyId: null, locationId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, company_id, location_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    return { role: null, companyId: null, locationId: null };
  }

  return {
    role: profile.role || null,
    companyId: profile.company_id || null,
    locationId: profile.location_id || null,
  };
}

function toRecord(row: any): RTCARecord {
  const shift = row.shift || "Unassigned";
  const requirement = Number(row.requirement || 0);
  const filled = Number(row.filled || 0);
  return {
    id: row.id,
    company_id: row.company_id,
    location_id: row.location_id,
    scheme_id: shift,
    coordinator_id: row.coordinator_id,
    requirement,
    filled,
    vacant: Number(row.vacant ?? requirement - filled),
    remarks: row.remarks ?? null,
    report_date: localDateKey(row.created_at),
    updated_at: row.updated_at || row.created_at,
  };
}

// Scheme submissions (NAPS/NATS/WILP etc.) are stored in `scheme_requirements`,
// a separate table from the shift-based `headcount_updates` entries.
function toSchemeRecord(row: any): RTCARecord {
  const requirement = Number(row.requirement || 0);
  const filled = Number(row.filled || 0);
  return {
    id: row.id,
    company_id: row.company_id,
    location_id: row.location_id,
    scheme_id: row.scheme_id,
    coordinator_id: row.coordinator_id,
    requirement,
    filled,
    vacant: Number(requirement - filled),
    remarks: row.remarks ?? null,
    report_date: row.report_date,
    updated_at: row.updated_at || row.report_date,
  };
}

export async function fetchRTCAData(filters: RTCAFilters): Promise<{ rows: RTCARow[]; stats: RTCAStats }> {
  const scope = await getCurrentUserScope();

  const applyFilters = (query: any, dateColumn: "created_at" | "report_date") => {
    let next = query;
    if (scope.role === "COORDINATOR" && scope.companyId && scope.locationId) {
      next = next.eq("company_id", scope.companyId).eq("location_id", scope.locationId);
    } else {
      if (filters.companyId) next = next.eq("company_id", filters.companyId);
      if (filters.locationId) next = next.eq("location_id", filters.locationId);
    }
    if (filters.coordinatorId) next = next.eq("coordinator_id", filters.coordinatorId);
    if (filters.dateFrom) next = next.gte(dateColumn, dateColumn === "created_at" ? startOfLocalDayIso(filters.dateFrom) : filters.dateFrom);
    if (filters.dateTo) next = next.lte(dateColumn, dateColumn === "created_at" ? endOfLocalDayIso(filters.dateTo) : filters.dateTo);
    return next;
  };

  const buildRecordsQuery = () => applyFilters(supabase.from("headcount_updates").select("*"), "created_at").order("created_at", { ascending: false }).order("id");
  // A real scheme filter (WILP/NAPS/NATS) only ever matches `scheme_requirements` rows.
  const buildSchemeQuery = () => {
    let query = applyFilters(supabase.from("scheme_requirements").select("*"), "report_date");
    if (filters.schemeId) query = query.eq("scheme_id", filters.schemeId);
    return query.order("updated_at", { ascending: false }).order("id");
  };

  const [records, schemeRecords, companiesData, locationsData, coordinatorsData, schemesData] = await Promise.all([
    filters.schemeId ? Promise.resolve([]) : fetchAllRows(buildRecordsQuery),
    fetchAllRows(buildSchemeQuery),
    fetchAllRows(() => supabase.from("companies").select("id, company_name").order("company_name").order("id")),
    fetchAllRows(() => supabase.from("locations").select("id, location_name, company_id, state, city").order("location_name").order("id")),
    fetchAllRows(() => supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name").order("id")),
    fetchAllRows(() => supabase.from("schemes").select("id, scheme_name").order("scheme_name").order("id")),
  ]);

  let companies: any[] = companiesData;
  let locations: any[] = locationsData;
  let coordinators: any[] = coordinatorsData;

  if (scope.role === "COORDINATOR") {
    if (scope.companyId) {
      companies = companies.filter((company) => company.id === scope.companyId);
    } else {
      companies = [];
    }

    if (scope.companyId && scope.locationId) {
      locations = locations.filter((location) => location.id === scope.locationId && location.company_id === scope.companyId);
      coordinators = coordinators.filter((coordinator) => coordinator.company_id === scope.companyId && coordinator.location_id === scope.locationId);
    } else {
      locations = [];
      coordinators = [];
    }
  }

  const companyMap = new Map((companies || []).map((item: NamedRow) => [item.id, item.company_name || "Unknown company"]));
  const locationMap = new Map((locations || []).map((item: any) => [item.id, item]));
  const coordinatorMap = new Map((coordinators || []).map((item: NamedRow) => [item.id, item.name || "Unknown coordinator"]));
  const schemeNameMap = new Map((schemesData || []).map((item: any) => [item.id, item.scheme_name]));

  const combinedRecords: RTCARecord[] = [
    ...(records || []).map(toRecord),
    ...(schemeRecords || []).map(toSchemeRecord),
  ];

  const rows = combinedRecords.map((record) => {
    const location = locationMap.get(record.location_id) || {};
    return {
      ...record,
      companyName: companyMap.get(record.company_id) || "Unknown company",
      locationName: location.location_name || "Unknown location",
      stateName: location.state || "Unknown",
      cityName: location.city || "Unknown",
      districtName: location.city || "Unknown",
      schemeName: schemeNameMap.get(record.scheme_id) || record.scheme_id,
      coordinatorName: coordinatorMap.get(record.coordinator_id) || "Unknown coordinator",
    };
  });

  const requirement = rows.reduce((sum, row) => sum + Number(row.requirement || 0), 0);
  const filled = rows.reduce((sum, row) => sum + Number(row.filled || 0), 0);
  const vacant = rows.reduce((sum, row) => sum + Number(row.vacant || 0), 0);
  const uniqueCompanies = new Set(rows.map((row) => row.company_id));
  const uniqueLocations = new Set(rows.map((row) => row.location_id));
  return {
    rows,
    stats: {
      companies: uniqueCompanies.size,
      locations: uniqueLocations.size,
      requirement,
      filled,
      vacant,
      fillRate: requirement > 0 ? (filled / requirement) * 100 : 0,
    },
  };
}

export async function fetchRTCAOptions() {
  const scope = await getCurrentUserScope();

  const companyQuery = () => {
    const query = supabase.from("companies").select("id, company_name").order("company_name").order("id");
    return scope.role === "COORDINATOR" && scope.companyId ? query.eq("id", scope.companyId) : query;
  };
  const locationQuery = () => {
    const query = supabase.from("locations").select("id, location_name, company_id, state, city").order("location_name").order("id");
    return scope.role === "COORDINATOR" && scope.locationId ? query.eq("id", scope.locationId) : query;
  };
  const coordinatorQuery = () => {
    let query = supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name").order("id");
    if (scope.role === "COORDINATOR") {
      if (scope.companyId) query = query.eq("company_id", scope.companyId);
      if (scope.locationId) query = query.eq("location_id", scope.locationId);
    }
    return query;
  };

  const [companies, locations, coordinators, schemesData] = await Promise.all([
    fetchAllRows(companyQuery),
    fetchAllRows(locationQuery),
    fetchAllRows(coordinatorQuery),
    fetchAllRows(() => supabase.from("schemes").select("id, scheme_name").order("scheme_name").order("id")),
  ]);

  const schemes = schemesData.map((item: any) => ({ id: item.id, scheme_name: item.scheme_name }));

  return { companies, locations, schemes, coordinators };
}
