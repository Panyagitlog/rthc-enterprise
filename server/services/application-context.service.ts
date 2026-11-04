type Context = "DMCFS" | "RTHC" | "RTCA" | "RTCPM" | "RTSRMP";
export type Intent = "GET_COORDINATOR" | "GET_HEADCOUNT" | "GET_REQUIREMENT" | "GET_FILLED" | "GET_VACANCY" | "GET_ASSESSMENT" | "GET_COORDINATOR_PERFORMANCE" | "GENERAL_DMCFS";

export function resolveIntent(question: string): Intent {
  const normalized = question.toLowerCase();
  if (/(coordinator|who handles|who is responsible|assigned to)/.test(normalized)) return "GET_COORDINATOR";
  if (/(assessment|performance|overall score|parameter score)/.test(normalized)) return "GET_ASSESSMENT";
  if (/(vacan|open gap)/.test(normalized)) return "GET_VACANCY";
  if (/\bfilled\b/.test(normalized)) return "GET_FILLED";
  if (/requirement/.test(normalized)) return "GET_REQUIREMENT";
  if (/(headcount|workforce|staff)/.test(normalized)) return "GET_HEADCOUNT";
  return "GENERAL_DMCFS";
}

function serverConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function fetchTable(table: string, select: string, accessToken: string, query = "") {
  const { url, anonKey, serviceRoleKey } = serverConfig();
  if (!url || (!anonKey && !serviceRoleKey) || url.includes("placeholder")) {
    throw new Error("Live business data is not configured on the server.");
  }
  const apiKey = serviceRoleKey || anonKey;
  if (!apiKey || !accessToken) {
    throw new Error("Live business data could not be accessed for this session.");
  }

  const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${query}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Live business data could not be loaded (HTTP ${response.status}). Verify the database connection and access policies.`);
  }
  return await response.json() as Record<string, unknown>[];
}

function matchingRows(rows: Record<string, unknown>[], question: string, limit = 20) {
  const stopWords = new Set([
    "about", "active", "after", "all", "also", "and", "are", "assessment", "assessments",
    "business", "can", "company", "companies", "coordinator", "coordinators", "could",
    "current", "data", "did", "does", "for", "from", "give", "growth", "have", "headcount",
    "help", "history", "how", "into", "latest", "list", "me", "month", "more", "new",
    "overview", "performance", "please", "rate", "rates", "record", "records", "requirement",
    "requirements", "rtsrmp", "scheme", "schemes", "show", "stipend", "summary", "that",
    "the", "their", "these", "this", "today", "total", "trend", "what", "when", "where",
    "which", "who", "with", "workforce", "would", "year",
  ]);
  const terms = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
  if (!terms.length) return rows.slice(0, limit);

  return rows
    .map((row) => {
      const text = JSON.stringify(row).toLowerCase();
      return { row, score: terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0) };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ row }) => row);
}

const hiddenFields = new Set([
  "id",
  "auth_user_id",
  "user_id",
  "assessment_id",
  "submission_id",
  "company_id",
  "location_id",
  "coordinator_id",
  "auditor_id",
  "profile_id",
  "created_by",
  "updated_by",
  "approved_by",
  "uploaded_by",
  "verifier_id",
  "storage_path",
  "password",
  "email",
  "mobile",
  "token",
]);

function labelFor(field: string) {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function businessBrief(rows: Record<string, unknown>[], limit = 30) {
  return rows.slice(0, limit).map((row, index) => {
    const values = Object.entries(row)
      .filter(([field, value]) => !hiddenFields.has(field) && !field.endsWith("_id") && value !== null && value !== undefined && value !== "")
      .map(([field, value]) => `${labelFor(field)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
    return `Record ${index + 1}: ${values.join("; ")}`;
  }).join("\n");
}

function businessContext(sections: Record<string, Record<string, unknown>[]>) {
  return Object.entries(sections)
    .map(([section, rows]) => `${section}:\n${businessBrief(rows) || "No records available."}`)
    .join("\n\n");
}

function searchTerms(question: string) {
  return question.toLowerCase().replace(/[^a-z0-9&]+/g, " ").split(/\s+/).filter((term) => term.length > 2 && !["who", "is", "the", "of", "for", "show", "me", "and", "at", "on", "this", "location", "company", "coordinator", "handles", "responsible", "assigned"].includes(term));
}

function rowMatchesTerms(row: Record<string, unknown>, terms: string[]) {
  const text = Object.values(row).filter((value) => typeof value === "string").join(" ").toLowerCase();
  return terms.filter((term) => text.includes(term)).length;
}

async function buildCoordinatorContext(question: string, accessToken: string) {
  const [companies, locations, coordinators] = await Promise.all([
    fetchTable("companies", "id,company_name,status", accessToken, "&limit=500"),
    fetchTable("locations", "id,location_name,company_id,state,city,status", accessToken, "&limit=1000"),
    fetchTable("users", "id,name,role,company_id,location_id,status", accessToken, "&role=eq.COORDINATOR&limit=1000"),
  ]);
  const terms = searchTerms(question);
  const locationMatches = locations.filter((row) => rowMatchesTerms(row, terms) > 0);
  const locationVocabulary = new Set(locationMatches.flatMap((location) =>
    [location.location_name, location.city, location.state]
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)),
  ));
  const companyTerms = terms.filter((term) => !locationVocabulary.has(term));
  const companyMatches = companyTerms.length
    ? companies.filter((row) => rowMatchesTerms(row, companyTerms) > 0)
    : [];
  const validPairs = companyMatches.flatMap((company) => locationMatches
    .filter((location) => location.company_id === company.id)
    .map((location) => ({ company, location })));
  const companyIds = new Set(validPairs.map(({ company }) => String(company.id)));
  const locationIds = new Set(validPairs.map(({ location }) => String(location.id)));
  const coordinatorMatches = coordinators.filter((coordinator) =>
    companyIds.has(String(coordinator.company_id)) && locationIds.has(String(coordinator.location_id)),
  );
  const resolutionStatus = validPairs.length === 0
    ? companyMatches.length === 0
      ? "No matching company was found in the live DMCFS data."
      : locationMatches.length === 0
        ? "No matching location was found in the live DMCFS data."
        : "No verified company-location relationship was found in the live DMCFS data."
    : validPairs.length > 1
      ? "Multiple verified company-location matches were found. Do not guess; ask the user to clarify."
      : coordinatorMatches.length === 0
        ? "The company-location relationship is verified, but no active coordinator is assigned."
        : "Verified company-location relationship and coordinator assignment.";

  return businessContext({
    "Entity resolution status": [{ status: resolutionStatus }],
    "Coordinator lookup result": coordinatorMatches,
    "Verified company": [...new Map(validPairs.map(({ company }) => [company.id, company])).values()],
    "Verified location": [...new Map(validPairs.map(({ location }) => [location.id, location])).values()],
  });
}

async function buildRTSRMPSections(question: string, accessToken: string) {
  const [companies, locations, rates, overtime, benefits, deductions, eligibility, requirements, documents, verificationLogs, history] =
    await Promise.all([
      fetchTable("rtsrmp_companies", "company_id,company_name,company_code,status", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_locations", "location_id,company_id,location_name,city,state,status", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_stipend_rates", "*", accessToken, "&order=created_at.desc&limit=1000"),
      fetchTable("rtsrmp_overtime", "submission_id,applicable,ot_rate,calculation_basis,rate_unit,maximum_hours,remarks,effective_from,effective_to", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_benefits", "submission_id,benefit_type,applicable,value,amount,frequency,remarks,effective_from,effective_to", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_deductions", "submission_id,deduction_type,applicable,amount,percentage,frequency,reason,remarks", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_eligibility", "submission_id,min_age,max_age,education,qualification,trade,experience,gender,other_criteria,remarks", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_requirements", "submission_id,scheme,qualification,trade,requirement_count,current_students,preferred_joining_timeline,remarks", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_documents", "submission_id,document_type,file_name,content_type,file_size,created_at", accessToken, "&limit=1000"),
      fetchTable("rtsrmp_verification_logs", "submission_id,action,remarks,created_at", accessToken, "&order=created_at.desc&limit=1000"),
      fetchTable("rtsrmp_rate_history", "submission_id,company_id,location_id,scheme,qualification,trade,stipend_rate,currency,effective_from,effective_to,status,approved_at,change_reason", accessToken, "&order=approved_at.desc&limit=1000"),
    ]);

  const companyNames = new Map(companies.map((company) => [String(company.company_id), String(company.company_name ?? "")]));
  const locationNames = new Map(locations.map((location) => [String(location.location_id), String(location.location_name ?? "")]));
  const enrichedRates = rates.map((rate) => ({
    ...rate,
    company_name: companyNames.get(String(rate.company_id)) ?? "",
    location_name: locationNames.get(String(rate.location_id)) ?? "",
  }));
  const relevantRates = matchingRows(enrichedRates, question, 30);
  const submissionIds = new Set(relevantRates.map((rate) => String(rate.id)));
  const related = (rows: Record<string, unknown>[]) => rows.filter((row) => submissionIds.has(String(row.submission_id)));
  const companyIds = new Set(relevantRates.map((rate) => String(rate.company_id)));
  const locationIds = new Set(relevantRates.map((rate) => String(rate.location_id)));
  const enrichedHistory: Record<string, unknown>[] = history.map((record) => ({
    ...record,
    company_name: companyNames.get(String(record.company_id)) ?? "",
    location_name: locationNames.get(String(record.location_id)) ?? "",
  }));
  const relevantHistory = relevantRates.length
    ? enrichedHistory.filter((record) =>
      submissionIds.has(String(record.submission_id)) || companyIds.has(String(record.company_id)),
    ).slice(0, 30)
    : matchingRows(enrichedHistory, question, 30);

  return {
    "RTSRMP stipend submissions": relevantRates,
    "RTSRMP companies": companies.filter((company) => companyIds.has(String(company.company_id))),
    "RTSRMP locations": locations.filter((location) => locationIds.has(String(location.location_id))),
    "RTSRMP overtime": related(overtime),
    "RTSRMP benefits": related(benefits),
    "RTSRMP deductions": related(deductions),
    "RTSRMP eligibility": related(eligibility),
    "RTSRMP requirements": related(requirements),
    "RTSRMP supporting document metadata": related(documents),
    "RTSRMP verification history": related(verificationLogs),
    "RTSRMP approved rate history": relevantHistory,
  };
}

export async function buildApplicationContext(context: Context, question: string, accessToken: string) {
  if (context === "RTSRMP") {
    return businessContext(await buildRTSRMPSections(question, accessToken));
  }

  if (resolveIntent(question) === "GET_COORDINATOR") {
    return buildCoordinatorContext(question, accessToken);
  }

  if (context === "RTCPM") {
    const [assessments, scores, parameters, users] = await Promise.all([
      fetchTable("rtcpm_assessments", "*", accessToken, "&order=submitted_at.desc&limit=100"),
      fetchTable("rtcpm_assessment_scores", "*", accessToken, "&limit=500"),
      fetchTable("rtcpm_parameter_performance", "*", accessToken, "&limit=100"),
      fetchTable("users", "id,name,email,role", accessToken, "&role=eq.COORDINATOR&limit=200"),
    ]);
    const relevantUsers = matchingRows(users, question, 10);
    const userIds = new Set(relevantUsers.map((user) => String(user.id || "")));
    const relevantAssessments = assessments.filter((assessment) => {
      if (!userIds.size) return false;
      const text = JSON.stringify(assessment).toLowerCase();
      return [...userIds].some((id) => id && text.includes(id.toLowerCase())) || text.includes(question.toLowerCase());
    }).slice(0, 10);
    const assessmentIds = new Set(relevantAssessments.map((assessment) => String(assessment.id || "")));
    const relevantScores = scores.filter((score) => assessmentIds.has(String(score.assessment_id || ""))).slice(0, 100);
    const assessmentFilter = [...assessmentIds].filter(Boolean).join(",");
    const detailQuery = assessmentFilter ? `&assessment_id=in.(${encodeURIComponent(assessmentFilter)})` : "&limit=0";
    const [headcount, joining, registration, attendance, discipline, training, feedback] = await Promise.all([
      fetchTable("rtcpm_headcount", "*", accessToken, detailQuery),
      fetchTable("rtcpm_joining", "*", accessToken, detailQuery),
      fetchTable("rtcpm_registration", "*", accessToken, detailQuery),
      fetchTable("rtcpm_attendance", "*", accessToken, detailQuery),
      fetchTable("rtcpm_discipline", "*", accessToken, detailQuery),
      fetchTable("rtcpm_training", "*", accessToken, detailQuery),
      fetchTable("rtcpm_feedback", "*", accessToken, detailQuery),
    ]);

    return businessContext({
      "RTCPM coordinators": relevantUsers,
      "RTCPM assessments": relevantAssessments,
      "RTCPM assessment scores": relevantScores,
      "RTCPM parameters": parameters,
      "RTCPM headcount details": headcount,
      "RTCPM joining details": joining,
      "RTCPM registration details": registration,
      "RTCPM attendance details": attendance,
      "RTCPM discipline details": discipline,
      "RTCPM training details": training,
      "RTCPM feedback details": feedback,
    });
  }

  if (context === "RTHC") {
    const [headcount, locations, users] = await Promise.all([
      fetchTable("headcount_updates", "*", accessToken, "&order=created_at.desc&limit=100"),
      fetchTable("locations", "id,location_name,company_id,state,city", accessToken, "&limit=100"),
      fetchTable("users", "id,name,email,role", accessToken, "&role=eq.COORDINATOR&limit=100"),
    ]);
    return businessContext({
      "RTHC headcount updates": matchingRows(headcount, question),
      "RTHC locations": matchingRows(locations, question),
      "RTHC coordinators": matchingRows(users, question),
    });
  }

  if (context === "RTCA") {
    const [updates, requirements, companies, locations] = await Promise.all([
      fetchTable("headcount_updates", "*", accessToken, "&order=created_at.desc&limit=100"),
      fetchTable("scheme_requirements", "*", accessToken, "&order=updated_at.desc&limit=100"),
      fetchTable("companies", "*", accessToken, "&limit=100"),
      fetchTable("locations", "*", accessToken, "&limit=100"),
    ]);
    return businessContext({
      "RTCA headcount updates": matchingRows(updates, question),
      "RTCA scheme requirements": matchingRows(requirements, question),
      "RTCA companies": matchingRows(companies, question),
      "RTCA locations": matchingRows(locations, question),
    });
  }

  const [headcount, requirements, assessments, scores, companies, locations, coordinators] = await Promise.all([
    fetchTable("headcount_updates", "*", accessToken, "&order=created_at.desc&limit=100"),
    fetchTable("scheme_requirements", "*", accessToken, "&order=updated_at.desc&limit=100"),
    fetchTable("rtcpm_assessments", "*", accessToken, "&order=submitted_at.desc&limit=50"),
    fetchTable("rtcpm_assessment_scores", "*", accessToken, "&limit=250"),
    fetchTable("companies", "id,company_name,status", accessToken, "&limit=100"),
    fetchTable("locations", "id,location_name,company_id,state,city,status", accessToken, "&limit=100"),
    fetchTable("users", "id,name,email,role,company_id,location_id", accessToken, "&limit=200"),
  ]);
  const relevantCoordinators = matchingRows(coordinators, question, 30);
  const coordinatorIds = new Set(relevantCoordinators.map((coordinator) => String(coordinator.id || "")));
  const relevantAssessments = assessments.filter((assessment) => {
    if (!coordinatorIds.size) return true;
    const text = JSON.stringify(assessment).toLowerCase();
    return [...coordinatorIds].some((id) => id && text.includes(id.toLowerCase())) || text.includes(question.toLowerCase());
  }).slice(0, 20);
  const assessmentIds = new Set(relevantAssessments.map((assessment) => String(assessment.id || "")));
  const relevantScores = scores.filter((score) => !assessmentIds.size || assessmentIds.has(String(score.assessment_id || ""))).slice(0, 50);
  const assessmentFilter = [...assessmentIds].filter(Boolean).join(",");
  const detailQuery = assessmentFilter ? `&assessment_id=in.(${encodeURIComponent(assessmentFilter)})` : "&limit=0";
  const [headcountDetails, joiningDetails, registrationDetails, attendanceDetails, disciplineDetails, trainingDetails, feedbackDetails, rtsrmpSections] = await Promise.all([
    fetchTable("rtcpm_headcount", "*", accessToken, detailQuery),
    fetchTable("rtcpm_joining", "*", accessToken, detailQuery),
    fetchTable("rtcpm_registration", "*", accessToken, detailQuery),
    fetchTable("rtcpm_attendance", "*", accessToken, detailQuery),
    fetchTable("rtcpm_discipline", "*", accessToken, detailQuery),
    fetchTable("rtcpm_training", "*", accessToken, detailQuery),
    fetchTable("rtcpm_feedback", "*", accessToken, detailQuery),
    buildRTSRMPSections(question, accessToken),
  ]);

  return businessContext({
    "RTHC headcount updates": matchingRows(headcount, question, 30),
    "RTHC locations": matchingRows(locations, question, 30),
    "RTCA scheme requirements": matchingRows(requirements, question, 30),
    "RTCA companies": matchingRows(companies, question, 30),
    "RTCPM coordinators": relevantCoordinators,
    "RTCPM assessments": relevantAssessments,
    "RTCPM assessment scores": relevantScores,
    "RTCPM headcount details": headcountDetails,
    "RTCPM joining details": joiningDetails,
    "RTCPM registration details": registrationDetails,
    "RTCPM attendance details": attendanceDetails,
    "RTCPM discipline details": disciplineDetails,
    "RTCPM training details": trainingDetails,
    "RTCPM feedback details": feedbackDetails,
    ...rtsrmpSections,
  });
}
