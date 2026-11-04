// @ts-ignore The existing Supabase client is JavaScript and has no declaration file.
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import type {
  RTSRMPBenefit,
  RTSRMPCompany,
  RTSRMPCompanyUser,
  RTSRMPData,
  RTSRMPDeduction,
  RTSRMPDocument,
  RTSRMPEligibility,
  RTSRMPHistory,
  RTSRMPOvertime,
  RTSRMPProfile,
  RTSRMPRequirement,
  RTSRMPSubmission,
  RTSRMPVerificationLog,
} from "./types";

export const DOCUMENT_BUCKET = "rtsrmp-supporting-documents";

type Row = Record<string, any>;

class RTSRMPValidationError extends Error {}

export function safeErrorMessage(error: unknown): string {
  console.error("RTSRMP operation failed:", error);
  if (error instanceof RTSRMPValidationError) return error.message;
  if (error && typeof error === "object") {
    const detail = error as { code?: unknown; message?: unknown; status?: unknown };
    const code = String(detail.code ?? "");
    const message = String(detail.message ?? "").toLowerCase();
    const status = Number(detail.status);
    if (code === "42501" || /row-level security|not authorized|permission denied/.test(message)) {
      return "You are not authorized to perform this RTSRMP action. Check your role and company/location assignment.";
    }
    if (code === "23505") return "This RTSRMP record already exists. Refresh the page and review the existing record.";
    if (code === "23503") return "A referenced RTSRMP record (company, location, scheme or qualification) was not found.";
    if (code === "23514" || code === "22023") {
      return "Some RTSRMP information is invalid or incomplete. Review the form and try again.";
    }
    if (status === 401 || /invalid jwt|jwt expired|session.*missing/.test(message)) {
      return "Your session has expired. Sign in again to continue.";
    }
    if (/failed to fetch|network|fetch failed/.test(message)) {
      return "RTSRMP could not connect to Supabase. Check your connection and retry.";
    }
    if (/choose a pdf|supporting documents must be|no longer in the expected state/.test(message)) {
      return String(detail.message);
    }
    if (/bucket not found|storage.*not found/.test(message)) {
      return "RTSRMP document storage is not configured. Contact your administrator.";
    }
  }
  const info = error && typeof error === "object" ? (error as { code?: unknown; message?: unknown }) : {};
  const reason = [info.code, info.message].filter(Boolean).join(": ");
  return `The RTSRMP request could not be completed${reason ? ` (${reason})` : ""}. Please retry or contact your administrator.`;
}

function throwIfError<T extends { error: unknown }>(result: T): void {
  if (result.error) throw result.error;
}

async function fetchAllRows(
  table: string,
  orderBy: [string, boolean][] = [],
  filters: [string, string][] = [],
  columns = "*",
): Promise<Row[]> {
  const pageSize = 1000;
  // "id" is only a pagination tie-breaker; tables without it are read with their listed order columns.
  const attempts = [[...orderBy, ["id", true] as [string, boolean]], orderBy];
  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    const rows: Row[] = [];
    let missingColumn = false;
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from(table).select(columns);
      for (const [column, ascending] of attempts[attempt]) query = query.order(column, { ascending });
      for (const [column, value] of filters) query = query.eq(column, value);
      const result = await query.range(offset, offset + pageSize - 1);
      if (result.error) {
        if (result.error.code === "42703" && attempt < attempts.length - 1) {
          missingColumn = true;
          break;
        }
        throw result.error;
      }
      const page = result.data ?? [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
    if (!missingColumn) return rows;
  }
  return [];
}

// Retries a write after removing a column that the existing table does not have.
async function writeTolerant(
  rows: Row[],
  run: (payload: Row[]) => PromiseLike<{ data?: any; error: any }>,
): Promise<void> {
  let payload = rows;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const result = await run(payload);
    if (!result.error) return;
    const missing = /Could not find the '([^']+)' column/.exec(String(result.error.message ?? ""));
    if (result.error.code !== "PGRST204" || !missing) throw result.error;
    console.warn(`RTSRMP: column "${missing[1]}" does not exist in the database and was not saved.`);
    payload = payload.map((row) => {
      const next = { ...row };
      delete next[missing[1]];
      return next;
    });
  }
  throw new Error("RTSRMP could not match the submitted fields to the database.");
}

const text = (value: unknown, fallback = ""): string => (value == null ? fallback : String(value));
const nullableText = (value: unknown): string | null => (value == null || value === "" ? null : String(value));
const nullableNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function loadAuthorizedProfile(): Promise<RTSRMPProfile> {
  if (!isSupabaseConfigured) {
    throw new Error("RTSRMP requires a configured Supabase project.");
  }

  const { data: userResponse, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userResponse.user;
  if (!user) throw new Error("An authenticated user is required.");

  const byAuthId = await supabase
    .from("users")
    .select("id, name, email, role, company_id, location_id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  throwIfError(byAuthId);

  let profile = byAuthId.data;
  if (!profile) {
    const byProfileId = await supabase
      .from("users")
      .select("id, name, email, role, company_id, location_id, status")
      .eq("id", user.id)
      .is("auth_user_id", null)
      .maybeSingle();
    throwIfError(byProfileId);
    profile = byProfileId.data;
  }

  if (!profile?.id || !profile.role) {
    throw new Error("The authenticated account has no RTSRMP profile.");
  }
  if (String(profile.status ?? "").trim().toUpperCase() !== "ACTIVE") {
    throw new Error("The authenticated account is inactive.");
  }

  const role = String(profile.role).trim().toUpperCase();
  if (role !== "SUPER_ADMIN" && role !== "COMPANY_HR") {
    throw new Error("The account is not authorized for RTSRMP.");
  }

  let companyId = profile.company_id ? String(profile.company_id) : null;
  let locationId = profile.location_id ? String(profile.location_id) : null;

  if (role === "COMPANY_HR") {
    // rtsrmp_company_users is the RTSRMP assignment source; the user profile is only a fallback.
    const assignment = await supabase
      .from("rtsrmp_company_users")
      .select("company_id, location_id, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    throwIfError(assignment);
    if (assignment.data?.company_id && assignment.data?.location_id) {
      companyId = String(assignment.data.company_id);
      locationId = String(assignment.data.location_id);
    }
    if (!companyId || !locationId) {
      throw new Error("The company HR account is missing its company or location assignment.");
    }
  }

  return {
    // Auth user id: RTSRMP tables key their user columns on the Supabase auth identity.
    id: user.id,
    role,
    company_id: companyId,
    location_id: locationId,
    name: profile.name ? String(profile.name) : user.user_metadata?.name ?? null,
    email: profile.email ? String(profile.email) : user.email ?? null,
  };
}

async function loadHRNames(): Promise<Map<string, { name: string | null; email: string | null }>> {
  const names = new Map<string, { name: string | null; email: string | null }>();
  try {
    const users = await fetchAllRows("users", [["id", true]], [["role", "COMPANY_HR"]], "id, auth_user_id, name, email");
    for (const user of users) {
      const entry = { name: nullableText(user.name), email: nullableText(user.email) };
      names.set(text(user.id), entry);
      if (user.auth_user_id) names.set(text(user.auth_user_id), entry);
    }
  } catch (error) {
    console.warn("RTSRMP could not read Company HR names:", error);
  }
  return names;
}

function parseEligibilityCriteria(raw: unknown) {
  const result = {
    education: "",
    qualification: "",
    trade: "",
    experience: "",
    remarks: "",
    other: {} as Record<string, unknown>,
  };
  if (raw == null || raw === "") return result;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      result.other = { note: raw };
      return result;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    result.other = { note: String(raw) };
    return result;
  }
  const record = parsed as Record<string, unknown>;
  result.education = text(record.education);
  result.qualification = text(record.qualification);
  result.trade = text(record.trade);
  result.experience = text(record.experience);
  result.remarks = text(record.remarks);
  result.other = record.other && typeof record.other === "object" && !Array.isArray(record.other)
    ? (record.other as Record<string, unknown>)
    : {};
  return result;
}

export const DEFAULT_SCHEMES = ["WILP", "NAPS", "NATS"];
export const DEFAULT_QUALIFICATIONS = ["10th", "12th", "ITI", "Diploma", "Graduation"];

// Adds the standard scheme/qualification options when the option tables are empty.
async function ensureOptionRows(): Promise<void> {
  try {
    const schemes = await supabase.from("rtsrmp_schemes").select("scheme_name");
    if (!schemes.error) {
      const have = new Set((schemes.data ?? []).map((row: Row) => text(row.scheme_name).trim().toUpperCase()));
      const missing = DEFAULT_SCHEMES.filter((name) => !have.has(name.toUpperCase()));
      if (missing.length) {
        await writeTolerant(
          missing.map((name) => ({ scheme_name: name, scheme_code: name, is_active: true })),
          (payload) => supabase.from("rtsrmp_schemes").insert(payload),
        );
      }
    }
    const qualifications = await supabase.from("rtsrmp_qualifications").select("qualification_name");
    if (!qualifications.error) {
      const have = new Set((qualifications.data ?? []).map((row: Row) => text(row.qualification_name).trim().toUpperCase()));
      const missing = DEFAULT_QUALIFICATIONS.filter((name) => !have.has(name.toUpperCase()));
      if (missing.length) {
        await writeTolerant(
          missing.map((name) => ({ qualification_code: name.toUpperCase(), qualification_name: name, is_active: true })),
          (payload) => supabase.from("rtsrmp_qualifications").insert(payload),
        );
      }
    }
  } catch (error) {
    console.warn("RTSRMP could not add the standard scheme/qualification options:", error);
  }
}

export async function loadRTSRMPData(): Promise<RTSRMPData> {
  await ensureOptionRows();
  const [
    schemeRows,
    qualificationRows,
    companyRows,
    locationRows,
    companyUserRows,
    rateRows,
    overtimeRows,
    benefitRows,
    deductionRows,
    eligibilityRows,
    requirementRows,
    documentRows,
    logRows,
    historyRows,
    hrNames,
  ] = await Promise.all([
    fetchAllRows("rtsrmp_schemes", [["scheme_name", true]]),
    fetchAllRows("rtsrmp_qualifications", [["qualification_name", true]]),
    fetchAllRows("rtsrmp_companies", [["company_name", true]]),
    fetchAllRows("rtsrmp_locations", [["location_name", true]]),
    fetchAllRows("rtsrmp_company_users"),
    fetchAllRows("rtsrmp_stipend_rates", [["created_at", false]]),
    fetchAllRows("rtsrmp_overtime", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_benefits", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_deductions", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_eligibility", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_requirements", [["company_id", true]]),
    fetchAllRows("rtsrmp_documents", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_verification_logs", [["stipend_rate_id", true]]),
    fetchAllRows("rtsrmp_rate_history", [["approved_at", false]]),
    loadHRNames(),
  ]);

  const schemes = schemeRows.map((row) => ({
    id: text(row.id),
    name: text(row.scheme_name ?? row.name),
    is_active: row.is_active !== false,
  }));
  const qualifications = qualificationRows.map((row) => ({
    id: text(row.id),
    qualification_code: nullableText(row.qualification_code),
    qualification_name: text(row.qualification_name),
    is_active: row.is_active !== false,
  }));
  const schemeNames = new Map(schemes.map((item) => [item.id, item.name]));
  const qualificationNames = new Map(qualifications.map((item) => [item.id, item.qualification_name]));

  const companies: RTSRMPCompany[] = companyRows.map((row) => ({
    company_id: text(row.id),
    company_name: text(row.company_name),
    company_code: nullableText(row.company_code),
    status: row.is_active === false ? "INACTIVE" : "ACTIVE",
  }));
  const locations: RTSRMPData["locations"] = locationRows.map((row) => ({
    location_id: text(row.id),
    company_id: text(row.company_id),
    location_name: text(row.location_name),
    location_code: nullableText(row.location_code),
    city: nullableText(row.city),
    state: nullableText(row.state),
    status: row.is_active === false ? "INACTIVE" : "ACTIVE",
  }));
  try {
    const me = await loadAuthorizedProfile();
    if (me.company_id && !companies.some((item) => item.company_id === me.company_id)) {
      const pub = await supabase.from("companies").select("id, company_name, company_code, status").eq("id", me.company_id).maybeSingle();
      if (pub.data) {
        companies.push({
          company_id: text(pub.data.id),
          company_name: text(pub.data.company_name),
          company_code: nullableText(pub.data.company_code),
          status: "ACTIVE",
        });
      }
    }
    if (me.location_id && !locations.some((item) => item.location_id === me.location_id)) {
      const pub = await supabase.from("locations").select("id, company_id, location_name, location_code, city, state").eq("id", me.location_id).maybeSingle();
      if (pub.data) {
        locations.push({
          location_id: text(pub.data.id),
          company_id: text(pub.data.company_id),
          location_name: text(pub.data.location_name),
          location_code: nullableText(pub.data.location_code),
          city: nullableText(pub.data.city),
          state: nullableText(pub.data.state),
          status: "ACTIVE",
        });
      }
    }
  } catch (error) {
    console.warn("RTSRMP could not resolve the assigned company/location names:", error);
  }
  const companyUsers: RTSRMPCompanyUser[] = companyUserRows.map((row) => {
    const profileId = text(row.auth_user_id ?? row.id);
    const identity = hrNames.get(profileId) ?? hrNames.get(text(row.id));
    return {
      profile_id: profileId,
      auth_user_id: nullableText(row.auth_user_id),
      company_id: text(row.company_id),
      location_id: text(row.location_id),
      role: "COMPANY_HR",
      name: identity?.name ?? nullableText(row.name),
      email: identity?.email ?? nullableText(row.email),
      status: row.is_active === false ? "INACTIVE" : "ACTIVE",
    };
  });

  const submissions: RTSRMPSubmission[] = rateRows.map((row) => {
    const status = text(row.status, "DRAFT") as RTSRMPSubmission["status"];
    const approved = status === "APPROVED";
    return {
      id: text(row.id),
      company_id: text(row.company_id),
      location_id: text(row.location_id),
      scheme_id: nullableText(row.scheme_id),
      qualification_id: nullableText(row.qualification_id),
      scheme: schemeNames.get(text(row.scheme_id)) ?? "",
      qualification: qualificationNames.get(text(row.qualification_id)) ?? "",
      trade: nullableText(row.trade_category),
      stipend_rate: Number(row.stipend_rate ?? 0),
      effective_from: text(row.effective_from),
      effective_to: nullableText(row.effective_to),
      payment_frequency: text(row.payment_frequency, "MONTHLY"),
      currency: text(row.currency, "INR"),
      coordinator_name: null,
      coordinator_contact: null,
      current_students: null,
      requirement_count: null,
      remarks: nullableText(row.remarks),
      status,
      created_by: text(row.submitted_by),
      submitted_at: nullableText(row.submitted_at),
      submitted_by: nullableText(row.submitted_by),
      verified_at: nullableText(row.verified_at),
      verified_by: nullableText(row.verified_by),
      approved_by: approved ? nullableText(row.verified_by) : null,
      approved_at: approved ? nullableText(row.verified_at) : null,
      review_remarks: nullableText(row.verification_remarks),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    };
  });
  const submissionMap = new Map(submissions.map((item) => [item.id, item]));

  const overtime: RTSRMPOvertime[] = overtimeRows.map((row) => ({
    id: nullableText(row.id) ?? undefined,
    submission_id: text(row.stipend_rate_id),
    applicable: row.applicable !== false,
    ot_rate: nullableNumber(row.ot_rate ?? row.rate),
    calculation_basis: text(row.calculation_basis),
    rate_unit: text(row.rate_unit),
    maximum_hours: nullableNumber(row.maximum_applicable_hours),
    remarks: text(row.remarks),
    effective_from: nullableText(row.effective_from),
    effective_to: nullableText(row.effective_to),
  }));
  const benefits: RTSRMPBenefit[] = benefitRows.map((row) => ({
    id: nullableText(row.id) ?? undefined,
    submission_id: text(row.stipend_rate_id),
    benefit_type: text(row.benefit_type),
    applicable: row.applicable !== false,
    value: text(row.value),
    amount: nullableNumber(row.amount),
    frequency: text(row.frequency),
    remarks: text(row.remarks),
    effective_from: nullableText(row.effective_from),
    effective_to: nullableText(row.effective_to),
  }));
  const deductions: RTSRMPDeduction[] = deductionRows.map((row) => ({
    id: nullableText(row.id) ?? undefined,
    submission_id: text(row.stipend_rate_id),
    deduction_type: text(row.deduction_type),
    applicable: row.applicable !== false,
    amount: nullableNumber(row.amount),
    percentage: nullableNumber(row.percentage),
    frequency: text(row.frequency),
    reason: text(row.reason),
    remarks: text(row.remarks),
  }));
  const eligibility: RTSRMPEligibility[] = eligibilityRows.map((row) => {
    const criteria = parseEligibilityCriteria(row.other_criteria);
    return {
      id: nullableText(row.id) ?? undefined,
      submission_id: text(row.stipend_rate_id),
      min_age: nullableNumber(row.minimum_age),
      max_age: nullableNumber(row.maximum_age),
      education: criteria.education,
      qualification: criteria.qualification,
      trade: criteria.trade,
      experience: criteria.experience,
      gender: text(row.gender_requirement),
      other_criteria: criteria.other,
      remarks: criteria.remarks,
    };
  });

  // Requirements are keyed by company/location/scheme/qualification/trade, not by stipend rate.
  const requirements: RTSRMPRequirement[] = [];
  for (const row of requirementRows) {
    for (const submission of submissions) {
      if (
        submission.company_id === text(row.company_id) &&
        submission.location_id === text(row.location_id) &&
        submission.scheme_id === nullableText(row.scheme_id) &&
        submission.qualification_id === nullableText(row.qualification_id) &&
        (submission.trade ?? "") === text(row.trade)
      ) {
        requirements.push({
          id: nullableText(row.id) ?? undefined,
          submission_id: submission.id,
          scheme: submission.scheme,
          qualification: submission.qualification,
          trade: text(row.trade),
          requirement_count: Number(row.required_trainees ?? 0),
          current_students: null,
          preferred_joining_timeline: text(row.preferred_joining_timeline),
          remarks: text(row.remarks),
        });
        if (submission.requirement_count == null) submission.requirement_count = Number(row.required_trainees ?? 0);
      }
    }
  }

  const documents: RTSRMPDocument[] = documentRows.map((row) => ({
    id: text(row.id),
    submission_id: text(row.stipend_rate_id),
    company_id: text(row.company_id),
    location_id: text(row.location_id),
    document_type: text(row.document_type),
    file_name: text(row.document_name),
    storage_path: text(row.storage_path),
    content_type: nullableText(row.mime_type),
    file_size: nullableNumber(row.file_size),
    uploaded_by: text(row.uploaded_by),
    created_at: text(row.created_at ?? row.uploaded_at),
  }));
  const verificationLogs: RTSRMPVerificationLog[] = logRows.map((row) => ({
    id: text(row.id),
    submission_id: text(row.stipend_rate_id),
    verifier_id: text(row.performed_by),
    action: text(row.action),
    remarks: nullableText(row.remarks),
    created_at: text(row.created_at ?? row.performed_at),
  })).sort((left, right) => right.created_at.localeCompare(left.created_at));

  const history: RTSRMPHistory[] = historyRows.map((row) => {
    const rate = submissionMap.get(text(row.stipend_rate_id));
    return {
      id: text(row.id),
      submission_id: text(row.stipend_rate_id),
      company_id: text(row.company_id),
      location_id: text(row.location_id),
      scheme: schemeNames.get(text(row.scheme_id)) ?? "",
      qualification: qualificationNames.get(text(row.qualification_id)) ?? "",
      trade: rate?.trade ?? null,
      stipend_rate: Number(row.new_rate ?? 0),
      previous_rate: nullableNumber(row.previous_rate),
      currency: rate?.currency ?? "INR",
      effective_from: text(row.effective_from),
      effective_to: nullableText(row.effective_to),
      status: rate?.status ?? "APPROVED",
      approved_by: text(row.approved_by),
      approved_at: text(row.approved_at),
      change_reason: nullableText(row.change_reason),
      submitted_by: rate?.submitted_by ?? null,
      submitted_at: rate?.submitted_at ?? null,
      verified_by: rate?.verified_by ?? null,
      verified_at: rate?.verified_at ?? null,
      review_remarks: rate?.review_remarks ?? null,
      document_refs: documents
        .filter((document) => document.submission_id === text(row.stipend_rate_id))
        .map((document) => ({ id: document.id, file_name: document.file_name, storage_path: document.storage_path })),
      detail_snapshot: {},
    };
  });

  const all: RTSRMPData = {
    schemes,
    qualifications,
    companies,
    locations,
    companyUsers,
    submissions,
    overtime,
    benefits,
    deductions,
    eligibility,
    requirements,
    documents,
    verificationLogs,
    history,
  };

  let me: RTSRMPProfile | null = null;
  try {
    me = await loadAuthorizedProfile();
  } catch {
    me = null;
  }
  if (!me || me.role !== "COMPANY_HR") return all;

  const inScope = (row: { company_id?: string | null; location_id?: string | null }) =>
    row.company_id === me!.company_id && row.location_id === me!.location_id;
  const mine = all.submissions.filter(inScope);
  const ids = new Set(mine.map((item) => item.id));
  const own = <T extends { submission_id: string }>(rows: T[]) => rows.filter((row) => ids.has(row.submission_id));
  return {
    ...all,
    companies: all.companies.filter((item) => item.company_id === me!.company_id),
    locations: all.locations.filter((item) => item.location_id === me!.location_id),
    companyUsers: all.companyUsers.filter((item) => item.company_id === me!.company_id),
    submissions: mine,
    overtime: own(all.overtime),
    benefits: own(all.benefits),
    deductions: own(all.deductions),
    eligibility: own(all.eligibility),
    requirements: all.requirements.filter((item) => ids.has(item.submission_id)),
    documents: own(all.documents),
    verificationLogs: own(all.verificationLogs),
    history: all.history.filter(inScope),
  };
}

export type SubmissionInput = {
  id?: string;
  company_id: string;
  location_id: string;
  scheme_id: string;
  qualification_id: string;
  trade: string | null;
  stipend_rate: number;
  effective_from: string;
  effective_to: string | null;
  payment_frequency: string;
  currency: string;
  remarks: string | null;
  created_by: string;
};

// Creates the RTSRMP company/location row from the master tables when it does not exist yet (foreign-key target).
async function ensureReferenceRows(companyId: string, locationId: string): Promise<void> {
  const company = await supabase.from("rtsrmp_companies").select("id").eq("id", companyId).maybeSingle();
  throwIfError(company);
  if (!company.data) {
    const pub = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    throwIfError(pub);
    if (!pub.data) throw new RTSRMPValidationError("The assigned company was not found.");
    await writeTolerant(
      [{
        id: companyId,
        company_name: pub.data.company_name,
        company_code: pub.data.company_code,
        state: pub.data.state,
        city: pub.data.city,
        address: pub.data.address,
        hr_contact_name: pub.data.contact_person,
        hr_contact_email: pub.data.email,
        is_active: true,
      }],
      (payload) => supabase.from("rtsrmp_companies").insert(payload),
    );
  }
  const location = await supabase.from("rtsrmp_locations").select("id").eq("id", locationId).maybeSingle();
  throwIfError(location);
  if (!location.data) {
    const pub = await supabase.from("locations").select("*").eq("id", locationId).maybeSingle();
    throwIfError(pub);
    if (!pub.data) throw new RTSRMPValidationError("The assigned location was not found.");
    await writeTolerant(
      [{
        id: locationId,
        company_id: companyId,
        location_name: pub.data.location_name,
        location_code: pub.data.location_code,
        state: pub.data.state,
        city: pub.data.city,
        address: pub.data.address,
        is_active: true,
      }],
      (payload) => supabase.from("rtsrmp_locations").insert(payload),
    );
  }
}

export async function saveDraft(input: SubmissionInput): Promise<string> {
  await ensureReferenceRows(input.company_id, input.location_id);
  const values = {
    company_id: input.company_id,
    location_id: input.location_id,
    scheme_id: input.scheme_id,
    qualification_id: input.qualification_id,
    trade_category: input.trade?.trim() || null,
    stipend_rate: input.stipend_rate,
    payment_frequency: input.payment_frequency.trim(),
    currency: input.currency.trim(),
    effective_from: input.effective_from,
    effective_to: input.effective_to || null,
    remarks: input.remarks?.trim() || null,
  };

  if (input.id) {
    const result = await supabase
      .from("rtsrmp_stipend_rates")
      .update(values)
      .eq("id", input.id)
      .select("id")
      .single();
    throwIfError(result);
    return String(result.data.id);
  }

  const result = await supabase
    .from("rtsrmp_stipend_rates")
    .insert({ ...values, status: "DRAFT", submitted_by: input.created_by })
    .select("id")
    .single();
  throwIfError(result);
  return String(result.data.id);
}

function parseBenefitValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new RTSRMPValidationError("Benefit values must be numbers.");
  }
  return parsed;
}

async function replaceByRate(table: string, stipendRateId: string, rows: Row[]): Promise<void> {
  const removal = await supabase.from(table).delete().eq("stipend_rate_id", stipendRateId);
  throwIfError(removal);
  if (rows.length) {
    await writeTolerant(rows, (payload) => supabase.from(table).insert(payload));
  }
}

async function saveSingleRow(table: string, stipendRateId: string, row: Row): Promise<void> {
  const existing = await supabase.from(table).select("stipend_rate_id").eq("stipend_rate_id", stipendRateId).limit(1);
  throwIfError(existing);
  if (existing.data?.length) {
    await writeTolerant([row], (payload) => supabase.from(table).update(payload[0]).eq("stipend_rate_id", stipendRateId));
  } else {
    await writeTolerant([{ ...row, stipend_rate_id: stipendRateId }], (payload) => supabase.from(table).insert(payload));
  }
}

export async function saveDetails(
  submissionId: string,
  details: {
    overtime: Omit<RTSRMPOvertime, "id" | "submission_id">;
    benefits: Omit<RTSRMPBenefit, "id" | "submission_id">[];
    deductions: Omit<RTSRMPDeduction, "id" | "submission_id">[];
    eligibility: Omit<RTSRMPEligibility, "id" | "submission_id">;
    requirement: {
      company_id: string;
      location_id: string;
      scheme_id: string;
      qualification_id: string;
      trade: string;
      requirement_count: number;
      preferred_joining_timeline: string;
      remarks: string;
    };
  },
): Promise<void> {
  const overtime = details.overtime;
  await saveSingleRow("rtsrmp_overtime", submissionId, {
    applicable: overtime.applicable,
    ot_rate: overtime.ot_rate,
    calculation_basis: overtime.calculation_basis || null,
    rate_unit: overtime.rate_unit || null,
    maximum_applicable_hours: overtime.maximum_hours,
    remarks: overtime.remarks || null,
    effective_from: overtime.effective_from,
    effective_to: overtime.effective_to,
  });

  await replaceByRate(
    "rtsrmp_benefits",
    submissionId,
    details.benefits.map((benefit) => ({
      stipend_rate_id: submissionId,
      benefit_type: benefit.benefit_type,
      applicable: benefit.applicable,
      value: parseBenefitValue(benefit.value),
      amount: benefit.amount,
      frequency: benefit.frequency || null,
      remarks: benefit.remarks || null,
      effective_from: benefit.effective_from,
      effective_to: benefit.effective_to,
    })),
  );

  await replaceByRate(
    "rtsrmp_deductions",
    submissionId,
    details.deductions.map((deduction) => ({
      stipend_rate_id: submissionId,
      deduction_type: deduction.deduction_type,
      applicable: deduction.applicable,
      amount: deduction.amount,
      percentage: deduction.percentage,
      frequency: deduction.frequency || null,
      reason: deduction.reason || null,
      remarks: deduction.remarks || null,
    })),
  );

  const eligibility = details.eligibility;
  const criteria: Record<string, unknown> = {};
  for (const key of ["education", "qualification", "trade", "experience", "remarks"] as const) {
    if (eligibility[key].trim()) criteria[key] = eligibility[key].trim();
  }
  if (Object.keys(eligibility.other_criteria).length) criteria.other = eligibility.other_criteria;
  await saveSingleRow("rtsrmp_eligibility", submissionId, {
    minimum_age: eligibility.min_age,
    maximum_age: eligibility.max_age,
    gender_requirement: eligibility.gender.trim() || null,
    other_criteria: Object.keys(criteria).length ? JSON.stringify(criteria) : null,
  });

  const requirement = details.requirement;
  let match = supabase
    .from("rtsrmp_requirements")
    .select("id")
    .eq("company_id", requirement.company_id)
    .eq("location_id", requirement.location_id)
    .eq("scheme_id", requirement.scheme_id)
    .eq("qualification_id", requirement.qualification_id);
  match = requirement.trade.trim() ? match.eq("trade", requirement.trade.trim()) : match.is("trade", null);
  const existing = await match.limit(1);
  throwIfError(existing);
  const requirementValues = {
    company_id: requirement.company_id,
    location_id: requirement.location_id,
    scheme_id: requirement.scheme_id,
    qualification_id: requirement.qualification_id,
    trade: requirement.trade.trim() || null,
    required_trainees: requirement.requirement_count,
    preferred_joining_timeline: requirement.preferred_joining_timeline || null,
    remarks: requirement.remarks || null,
  };
  if (existing.data?.length) {
    await writeTolerant([requirementValues], (payload) =>
      supabase.from("rtsrmp_requirements").update(payload[0]).eq("id", existing.data[0].id),
    );
  } else {
    await writeTolerant([requirementValues], (payload) => supabase.from("rtsrmp_requirements").insert(payload));
  }
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("An authenticated user is required.");
  return data.user.id as string;
}

async function logAction(stipendRateId: string, action: string, performedBy: string, remarks: string | null) {
  const result = await supabase.from("rtsrmp_verification_logs").insert({
    stipend_rate_id: stipendRateId,
    action,
    performed_by: performedBy,
    remarks,
  });
  throwIfError(result);
}

async function moveStatus(
  submissionId: string,
  from: string[],
  values: Row,
): Promise<{ row: Row; previousStatus: string }> {
  const current = await supabase.from("rtsrmp_stipend_rates").select("status").eq("id", submissionId).single();
  throwIfError(current);
  const previousStatus = String(current.data.status);
  if (!from.includes(previousStatus)) {
    throw new Error("This submission is no longer in the expected state. Refresh and try again.");
  }
  const result = await supabase
    .from("rtsrmp_stipend_rates")
    .update(values)
    .eq("id", submissionId)
    .eq("status", previousStatus)
    .select("*")
    .single();
  throwIfError(result);
  return { row: result.data, previousStatus };
}

export async function submitDraft(submissionId: string): Promise<void> {
  const userId = await currentUserId();
  const { previousStatus } = await moveStatus(submissionId, ["DRAFT", "CORRECTION_REQUIRED"], {
    status: "SUBMITTED",
    submitted_at: new Date().toISOString(),
    verified_by: null,
    verified_at: null,
    verification_remarks: null,
  });
  await logAction(
    submissionId,
    previousStatus === "CORRECTION_REQUIRED" ? "RESUBMITTED" : "SUBMITTED",
    userId,
    null,
  );
}

export async function reviewSubmission(
  submissionId: string,
  action: "UNDER_VERIFICATION" | "APPROVED" | "REJECTED" | "CORRECTION_REQUIRED",
  remarks: string,
): Promise<void> {
  const userId = await currentUserId();
  const note = remarks.trim() || null;
  const { row } = await moveStatus(submissionId, ["SUBMITTED", "UNDER_VERIFICATION"], {
    status: action,
    verified_by: userId,
    verified_at: new Date().toISOString(),
    verification_remarks: note,
  });
  await logAction(submissionId, action, userId, note);

  if (action !== "APPROVED") return;

  let previous = supabase
    .from("rtsrmp_stipend_rates")
    .select("stipend_rate")
    .eq("company_id", row.company_id)
    .eq("location_id", row.location_id)
    .eq("scheme_id", row.scheme_id)
    .eq("qualification_id", row.qualification_id)
    .eq("status", "APPROVED")
    .neq("id", submissionId)
    .lt("effective_from", row.effective_from);
  previous = row.trade_category ? previous.eq("trade_category", row.trade_category) : previous.is("trade_category", null);
  const prior = await previous.order("effective_from", { ascending: false }).limit(1);
  throwIfError(prior);

  const history = await supabase.from("rtsrmp_rate_history").insert({
    stipend_rate_id: submissionId,
    company_id: row.company_id,
    location_id: row.location_id,
    scheme_id: row.scheme_id,
    qualification_id: row.qualification_id,
    previous_rate: prior.data?.[0]?.stipend_rate ?? null,
    new_rate: row.stipend_rate,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    change_reason: note,
    approved_by: userId,
    approved_at: row.verified_at,
  });
  throwIfError(history);
}

export async function uploadSupportingDocument(
  file: File,
  profile: RTSRMPProfile,
  submission: RTSRMPSubmission,
  documentType: string,
): Promise<void> {
  if (!profile.company_id || !profile.location_id) {
    throw new Error("A company and location assignment is required to upload documents.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const contentType = extension ? allowedTypes[extension] : undefined;
  if (!contentType || (file.type && file.type !== contentType)) {
    throw new Error("Choose a PDF, JPEG, PNG, or DOCX supporting document.");
  }
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
    throw new Error("Supporting documents must be greater than 0 bytes and no larger than 15 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${profile.company_id}/${profile.location_id}/${submission.id}/${crypto.randomUUID()}_${safeName}`;
  const upload = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, {
    contentType,
    upsert: false,
  });
  throwIfError(upload);

  const metadata = await supabase.from("rtsrmp_documents").insert({
    stipend_rate_id: submission.id,
    company_id: submission.company_id,
    location_id: submission.location_id,
    document_type: documentType,
    document_name: file.name,
    storage_path: storagePath,
    mime_type: contentType,
    file_size: file.size,
    uploaded_by: profile.id,
  });
  if (metadata.error) {
    const cleanup = await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    if (cleanup.error) console.error("RTSRMP upload cleanup failed:", cleanup.error);
    throw metadata.error;
  }
}

export async function createDocumentUrl(storagePath: string): Promise<string> {
  const result = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 60);
  throwIfError(result);
  return result.data.signedUrl;
}

// Option values prefixed with "new:" are standard options not yet in the database; this creates or finds the real row id.
export async function resolveOptionId(kind: "scheme" | "qualification", value: string): Promise<string> {
  if (!value.startsWith("new:")) return value;
  const name = value.slice(4);
  const table = kind === "scheme" ? "rtsrmp_schemes" : "rtsrmp_qualifications";
  const nameColumn = kind === "scheme" ? "scheme_name" : "qualification_name";
  const existing = await supabase.from(table).select("id").ilike(nameColumn, name).limit(1).maybeSingle();
  throwIfError(existing);
  if (existing.data?.id) return String(existing.data.id);
  const row = kind === "scheme"
    ? { scheme_name: name, scheme_code: name.toUpperCase(), is_active: true }
    : { qualification_name: name, qualification_code: name.toUpperCase(), is_active: true };
  const created = await supabase.from(table).insert(row).select("id").single();
  throwIfError(created);
  return String(created.data.id);
}
