// @ts-ignore
import { supabase } from "./supabase";
import type { RTCAFilters, RTCARecord, RTCARow, RTCAStats } from "../types/rtca";

type NamedRow = { id: string; company_name?: string; location_name?: string; name?: string };
type CurrentUserScope = { role: string | null; companyId: string | null; locationId: string | null };

// Real workforce entries live in `headcount_updates` (there is no populated
// "schemes"/"scheme_requirements" table). Each shift is treated as the
// "scheme" dimension the dashboard UI already expects.
const SHIFTS = ["Morning", "Evening", "Night"];

async function getCurrentUserScope(): Promise<CurrentUserScope> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return { role: null, companyId: null, locationId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, company_id, location_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
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
    report_date: String(row.created_at || "").slice(0, 10),
    updated_at: row.updated_at || row.created_at,
  };
}

export async function fetchRTCAData(filters: RTCAFilters): Promise<{ rows: RTCARow[]; stats: RTCAStats }> {
  const scope = await getCurrentUserScope();

  let recordsQuery = supabase.from("headcount_updates").select("*").order("created_at", { ascending: false });

  if (scope.role === "COORDINATOR" && scope.companyId && scope.locationId) {
    recordsQuery = recordsQuery.eq("company_id", scope.companyId).eq("location_id", scope.locationId);
  } else {
    if (filters.companyId) recordsQuery = recordsQuery.eq("company_id", filters.companyId);
    if (filters.locationId) recordsQuery = recordsQuery.eq("location_id", filters.locationId);
  }

  if (filters.schemeId) recordsQuery = recordsQuery.eq("shift", filters.schemeId);
  if (filters.coordinatorId) recordsQuery = recordsQuery.eq("coordinator_id", filters.coordinatorId);
  if (filters.dateFrom) recordsQuery = recordsQuery.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) recordsQuery = recordsQuery.lte("created_at", `${filters.dateTo}T23:59:59.999`);

  const [
    { data: records, error: recordsError },
    { data: companiesData, error: companiesError },
    { data: locationsData, error: locationsError },
    { data: coordinatorsData, error: coordinatorsError },
  ] = await Promise.all([
    recordsQuery,
    supabase.from("companies").select("id, company_name").order("company_name"),
    supabase.from("locations").select("id, location_name, company_id, state, city").order("location_name"),
    supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name"),
  ]);

  const error = recordsError || companiesError || locationsError || coordinatorsError;
  if (error) throw error;

  let companies = companiesData || [];
  let locations = locationsData || [];
  let coordinators = coordinatorsData || [];

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

  const rows = ((records || []).map(toRecord) as RTCARecord[]).map((record) => {
    const location = locationMap.get(record.location_id) || {};
    return {
      ...record,
      companyName: companyMap.get(record.company_id) || "Unknown company",
      locationName: location.location_name || "Unknown location",
      stateName: location.state || "Unknown",
      cityName: location.city || "Unknown",
      districtName: location.city || "Unknown",
      schemeName: record.scheme_id,
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

  const baseCompanyQuery = supabase.from("companies").select("id, company_name").order("company_name");
  const baseLocationQuery = supabase.from("locations").select("id, location_name, company_id, state, city").order("location_name");
  let coordinatorQuery = supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name");

  if (scope.role === "COORDINATOR") {
    if (scope.companyId) {
      baseCompanyQuery.eq("id", scope.companyId);
      coordinatorQuery = coordinatorQuery.eq("company_id", scope.companyId);
    }
    if (scope.locationId) {
      baseLocationQuery.eq("id", scope.locationId);
      coordinatorQuery = coordinatorQuery.eq("location_id", scope.locationId);
    }
  }

  const [{ data: companies }, { data: locations }, { data: coordinators }] = await Promise.all([
    baseCompanyQuery,
    baseLocationQuery,
    coordinatorQuery,
  ]);

  const schemes = SHIFTS.map((shift) => ({ id: shift, scheme_name: shift }));

  return { companies: companies || [], locations: locations || [], schemes, coordinators: coordinators || [] };
}
