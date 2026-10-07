"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIntent = resolveIntent;
exports.buildApplicationContext = buildApplicationContext;
function resolveIntent(question) {
    const normalized = question.toLowerCase();
    if (/(coordinator|who handles|who is responsible|assigned to)/.test(normalized))
        return "GET_COORDINATOR";
    if (/(assessment|performance|overall score|parameter score)/.test(normalized))
        return "GET_ASSESSMENT";
    if (/(vacan|open gap)/.test(normalized))
        return "GET_VACANCY";
    if (/\bfilled\b/.test(normalized))
        return "GET_FILLED";
    if (/requirement/.test(normalized))
        return "GET_REQUIREMENT";
    if (/(headcount|workforce|staff)/.test(normalized))
        return "GET_HEADCOUNT";
    return "GENERAL_DMCFS";
}
function serverConfig() {
    return {
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
}
async function fetchTable(table, select, accessToken, query = "") {
    const { url, anonKey, serviceRoleKey } = serverConfig();
    if (!url || (!anonKey && !serviceRoleKey) || url.includes("placeholder"))
        return [];
    const apiKey = serviceRoleKey || anonKey;
    if (!apiKey)
        return [];
    const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${query}`, {
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok)
        return [];
    return await response.json();
}
function matchingRows(rows, question, limit = 20) {
    const terms = question.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
    const matches = rows.filter((row) => {
        const text = JSON.stringify(row).toLowerCase();
        return terms.length === 0 || terms.some((term) => text.includes(term));
    });
    return (matches.length ? matches : rows).slice(0, limit);
}
const hiddenFields = new Set([
    "id",
    "auth_user_id",
    "user_id",
    "assessment_id",
    "company_id",
    "location_id",
    "coordinator_id",
    "auditor_id",
    "password",
    "email",
    "mobile",
    "token",
]);
function labelFor(field) {
    return field
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
function businessBrief(rows, limit = 30) {
    return rows.slice(0, limit).map((row, index) => {
        const values = Object.entries(row)
            .filter(([field, value]) => !hiddenFields.has(field) && !field.endsWith("_id") && value !== null && value !== undefined && value !== "")
            .map(([field, value]) => `${labelFor(field)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
        return `Record ${index + 1}: ${values.join("; ")}`;
    }).join("\n");
}
function businessContext(sections) {
    return Object.entries(sections)
        .map(([section, rows]) => `${section}:\n${businessBrief(rows) || "No records available."}`)
        .join("\n\n");
}
function searchTerms(question) {
    return question.toLowerCase().replace(/[^a-z0-9&]+/g, " ").split(/\s+/).filter((term) => term.length > 2 && !["who", "is", "the", "of", "for", "show", "me", "and", "at", "on", "this", "location", "company", "coordinator", "handles", "responsible", "assigned"].includes(term));
}
function rowMatchesTerms(row, terms) {
    const text = Object.values(row).filter((value) => typeof value === "string").join(" ").toLowerCase();
    return terms.filter((term) => text.includes(term)).length;
}
async function buildCoordinatorContext(question, accessToken) {
    const [companies, locations, coordinators] = await Promise.all([
        fetchTable("companies", "id,company_name,status", accessToken, "&limit=500"),
        fetchTable("locations", "id,location_name,company_id,state,city,status", accessToken, "&limit=1000"),
        fetchTable("users", "id,name,role,company_id,location_id,status", accessToken, "&role=eq.COORDINATOR&limit=1000"),
    ]);
    const terms = searchTerms(question);
    const locationMatches = locations.filter((row) => rowMatchesTerms(row, terms) > 0);
    const locationVocabulary = new Set(locationMatches.flatMap((location) => [location.location_name, location.city, location.state]
        .filter((value) => typeof value === "string")
        .flatMap((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/))));
    const companyTerms = terms.filter((term) => !locationVocabulary.has(term));
    const companyMatches = companyTerms.length
        ? companies.filter((row) => rowMatchesTerms(row, companyTerms) > 0)
        : [];
    const validPairs = companyMatches.flatMap((company) => locationMatches
        .filter((location) => location.company_id === company.id)
        .map((location) => ({ company, location })));
    const companyIds = new Set(validPairs.map(({ company }) => String(company.id)));
    const locationIds = new Set(validPairs.map(({ location }) => String(location.id)));
    const coordinatorMatches = coordinators.filter((coordinator) => companyIds.has(String(coordinator.company_id)) && locationIds.has(String(coordinator.location_id)));
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
async function buildApplicationContext(context, question, accessToken) {
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
            if (!userIds.size)
                return true;
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
        if (!coordinatorIds.size)
            return true;
        const text = JSON.stringify(assessment).toLowerCase();
        return [...coordinatorIds].some((id) => id && text.includes(id.toLowerCase())) || text.includes(question.toLowerCase());
    }).slice(0, 20);
    const assessmentIds = new Set(relevantAssessments.map((assessment) => String(assessment.id || "")));
    const relevantScores = scores.filter((score) => !assessmentIds.size || assessmentIds.has(String(score.assessment_id || ""))).slice(0, 50);
    const assessmentFilter = [...assessmentIds].filter(Boolean).join(",");
    const detailQuery = assessmentFilter ? `&assessment_id=in.(${encodeURIComponent(assessmentFilter)})` : "&limit=0";
    const [headcountDetails, joiningDetails, registrationDetails, attendanceDetails, disciplineDetails, trainingDetails, feedbackDetails] = await Promise.all([
        fetchTable("rtcpm_headcount", "*", accessToken, detailQuery),
        fetchTable("rtcpm_joining", "*", accessToken, detailQuery),
        fetchTable("rtcpm_registration", "*", accessToken, detailQuery),
        fetchTable("rtcpm_attendance", "*", accessToken, detailQuery),
        fetchTable("rtcpm_discipline", "*", accessToken, detailQuery),
        fetchTable("rtcpm_training", "*", accessToken, detailQuery),
        fetchTable("rtcpm_feedback", "*", accessToken, detailQuery),
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
    });
}
//# sourceMappingURL=application-context.service.js.map