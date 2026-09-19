// @ts-ignore
import { supabase } from "./supabase";
import type { RTCAFilters, RTCARecord, RTCARow, RTCAStats } from "../types/rtca";

type NamedRow = { id: string; company_name?: string; location_name?: string; name?: string };
type CurrentUserScope = { role: string | null; companyId: string | null; locationId: string | null };

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

  let recordsQuery = supabase.from("headcount_updates").select("*").order("created_at", { ascending: false });
  let schemeQuery = supabase.from("scheme_requirements").select("*").order("updated_at", { ascending: false });

  if (scope.role === "COORDINATOR" && scope.companyId && scope.locationId) {
    recordsQuery = recordsQuery.eq("company_id", scope.companyId).eq("location_id", scope.locationId);
    schemeQuery = schemeQuery.eq("company_id", scope.companyId).eq("location_id", scope.locationId);
  } else {
    if (filters.companyId) {
      recordsQuery = recordsQuery.eq("company_id", filters.companyId);
      schemeQuery = schemeQuery.eq("company_id", filters.companyId);
    }
    if (filters.locationId) {
      recordsQuery = recordsQuery.eq("location_id", filters.locationId);
      schemeQuery = schemeQuery.eq("location_id", filters.locationId);
    }
  }

  if (filters.coordinatorId) {
    recordsQuery = recordsQuery.eq("coordinator_id", filters.coordinatorId);
    schemeQuery = schemeQuery.eq("coordinator_id", filters.coordinatorId);
  }
  if (filters.dateFrom) {
    recordsQuery = recordsQuery.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
    schemeQuery = schemeQuery.gte("report_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    recordsQuery = recordsQuery.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
    schemeQuery = schemeQuery.lte("report_date", filters.dateTo);
  }

  // A real scheme filter (WILP/NAPS/NATS) only ever matches `scheme_requirements` rows.
  if (filters.schemeId) {
    schemeQuery = schemeQuery.eq("scheme_id", filters.schemeId);
  }

  const [
    { data: records, error: recordsError },
    { data: schemeRecords, error: schemeRecordsError },
    { data: companiesData, error: companiesError },
    { data: locationsData, error: locationsError },
    { data: coordinatorsData, error: coordinatorsError },
    { data: schemesData, error: schemesError },
  ] = await Promise.all([
    filters.schemeId ? Promise.resolve({ data: [], error: null }) : recordsQuery,
    schemeQuery,
    supabase.from("companies").select("id, company_name").order("company_name"),
    supabase.from("locations").select("id, location_name, company_id, state, city").order("location_name"),
    supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name"),
    supabase.from("schemes").select("id, scheme_name").order("scheme_name"),
  ]);

  const error = recordsError || schemeRecordsError || companiesError || locationsError || coordinatorsError || schemesError;
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

  const [{ data: companies }, { data: locations }, { data: coordinators }, { data: schemesData }] = await Promise.all([
    baseCompanyQuery,
    baseLocationQuery,
    coordinatorQuery,
    supabase.from("schemes").select("id, scheme_name").order("scheme_name"),
  ]);

  const schemes = (schemesData || []).map((item: any) => ({ id: item.id, scheme_name: item.scheme_name }));

  return { companies: companies || [], locations: locations || [], schemes, coordinators: coordinators || [] };
}
