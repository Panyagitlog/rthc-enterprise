import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileText, LogOut, Save, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DMCFSLogo from "../../components/brand/DMCFSLogo";
import useAuth from "../../hooks/useAuth";
import { supabase, normalizeRole } from "../../services/supabase";

const PARAMETER_META = [
  { code: "HC", key: "headcount", label: "Headcount Supply & Retention", weight: 30 },
  { code: "JF", key: "joining", label: "Joining Formalities", weight: 20 },
  { code: "REG", key: "registration", label: "Registration", weight: 20 },
  { code: "ATT", key: "attendance", label: "Attendance & Stipend Administration", weight: 10 },
  { code: "DG", key: "discipline", label: "Discipline & Grievance Management", weight: 10 },
  { code: "TC", key: "training", label: "Training Compliance", weight: 5 },
  { code: "SF", key: "feedback", label: "Stakeholder Feedback", weight: 5 },
] as const;

const SECTION_FIELD_LABELS: Record<string, Record<string, string>> = {
  headcount: {
    requirement: "Requirement",
    candidates_supplied: "Candidates Supplied",
    joined: "Joined",
    current_filled: "Current Filled",
    vacant: "Vacant",
    attrition: "Attrition",
    replacement_required: "Replacement Required",
    replacement_completed: "Replacement Completed",
  },
  joining: {
    total_joinings: "Total Joinings",
    documents_complete: "Documents Complete",
    bank_details_complete: "Bank Details Complete",
    induction_completed: "Induction Completed",
    employee_master_updated: "Employee Master Updated",
  },
  registration: {
    total_candidates: "Total Candidates",
    registered: "Registered",
    pending: "Pending",
    registration_defects: "Registration Defects",
  },
  attendance: {
    total_employees: "Total Employees",
    attendance_submitted: "Attendance Submitted",
    attendance_errors: "Attendance Errors",
    stipend_submitted: "Stipend Submitted",
    stipend_issues: "Stipend Issues",
    issues_resolved: "Issues Resolved",
  },
  discipline: {
    grievances_received: "Grievances Received",
    grievances_resolved: "Grievances Resolved",
    grievances_pending: "Grievances Pending",
    disciplinary_cases: "Disciplinary Cases",
    counselling_cases: "Counselling Cases",
  },
  training: {
    training_required: "Training Required",
    training_attended: "Training Attended",
    training_completed: "Training Completed",
    training_pending: "Training Pending",
  },
  feedback: {
    hr_feedback_rating: "HR Feedback Rating",
    manager_feedback_rating: "Manager Feedback Rating",
    communication_rating: "Communication Rating",
    relationship_management_rating: "Relationship Management Rating",
  },
};

const emptyAssessmentState = () => ({
  company_id: "",
  location_id: "",
  coordinator_id: "",
  assessment_start: "",
  assessment_end: "",
  assessment_date: new Date().toISOString().slice(0, 10),
  headcount: {
    requirement: "",
    candidates_supplied: "",
    joined: "",
    current_filled: "",
    vacant: "",
    attrition: "",
    replacement_required: "",
    replacement_completed: "",
    remarks: "",
    rating: 0,
  },
  joining: {
    total_joinings: "",
    documents_complete: "",
    bank_details_complete: "",
    induction_completed: "",
    employee_master_updated: "",
    remarks: "",
    rating: 0,
  },
  registration: {
    total_candidates: "",
    registered: "",
    pending: "",
    registration_defects: "",
    remarks: "",
    rating: 0,
  },
  attendance: {
    total_employees: "",
    attendance_submitted: "",
    attendance_errors: "",
    stipend_submitted: "",
    stipend_issues: "",
    issues_resolved: "",
    remarks: "",
    rating: 0,
  },
  discipline: {
    grievances_received: "",
    grievances_resolved: "",
    grievances_pending: "",
    disciplinary_cases: "",
    counselling_cases: "",
    remarks: "",
    rating: 0,
  },
  training: {
    training_required: "",
    training_attended: "",
    training_completed: "",
    training_pending: "",
    remarks: "",
    rating: 0,
  },
  feedback: {
    hr_feedback_rating: 0,
    manager_feedback_rating: 0,
    communication_rating: 0,
    relationship_management_rating: 0,
    remarks: "",
    rating: 0,
  },
});

const toNumber = (value: string | number | null | undefined) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const evaluateWeightedScore = (rating: number, weight: number) => ((rating / 10) * weight).toFixed(2);

const clampRating = (value: number) => Math.min(10, Math.max(0, Math.round(value)));
const ratio = (numerator: number, denominator: number, fallback = 0) => (denominator > 0 ? Math.min(Math.max(numerator / denominator, 0), 1) : fallback);

// Retries transient failures (e.g. the Supabase project waking up from a cold start returns a stray 404/503).
const withRetry = async <T,>(run: () => Promise<{ data?: T; error: any }>, attempts = 3): Promise<{ data?: T; error: any }> => {
  let result = await run();
  for (let attempt = 1; attempt < attempts && result.error; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    result = await run();
  }
  return result;
};

export default function RTCPMPage() {
  const navigate = useNavigate();
  const auth = useAuth() as any;
  const currentRole = normalizeRole(auth?.role || "");
  const [parameterPerformance, setParameterPerformance] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [coordinatorFilter, setCoordinatorFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [auditorProfile, setAuditorProfile] = useState<any | null>(null);
  const [assessment, setAssessment] = useState(emptyAssessmentState());
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    "Details",
    "Headcount",
    "Joining",
    "Registration",
    "Attendance",
    "Discipline",
    "Training",
    "Feedback",
    "Review & Submit",
  ];

  const loadDashboard = useCallback(async () => {
    const [parameterResponse, assessmentResponse] = await Promise.all([
      supabase.from("rtcpm_parameter_performance").select("*").order("parameter_name", { ascending: true }),
      supabase.from("rtcpm_assessments").select("*", { count: "exact" }).order("submitted_at", { ascending: false }),
    ]);

    // Each source is applied independently so one missing view/table doesn't hide real assessment data.
    if (parameterResponse.error) {
      console.error("Unable to load RTCPM parameter performance:", parameterResponse.error);
    } else {
      setParameterPerformance(parameterResponse.data || []);
    }

    if (assessmentResponse.error) {
      console.error("Unable to load RTCPM assessments:", assessmentResponse.error);
      toast.error(assessmentResponse.error.message || "Unable to load RTCPM assessments.");
    } else {
      setAssessments(assessmentResponse.data || []);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const [companiesResponse, locationsResponse, coordinatorsResponse] = await Promise.all([
        supabase.from("companies").select("id, company_name").order("company_name"),
        supabase.from("locations").select("id, location_name, company_id").order("location_name"),
        supabase.from("users").select("id, name, company_id, location_id").eq("role", "COORDINATOR").order("name"),
      ]);

      if (companiesResponse.error) throw companiesResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;
      if (coordinatorsResponse.error) throw coordinatorsResponse.error;

      setCompanies(companiesResponse.data || []);
      setLocations(locationsResponse.data || []);
      setCoordinators(coordinatorsResponse.data || []);
    } catch (error) {
      console.error("Unable to load RTCPM option data:", error);
    }
  }, []);

  const loadAuditor = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData?.user) return;

      const { data: profileData } = await supabase
        .from("users")
        .select("id, name, email, company_id, location_id, role")
        .eq("auth_user_id", sessionData.user.id)
        .maybeSingle();

      if (profileData) {
        setAuditorProfile(profileData);
      }
    } catch (error) {
      console.error("Unable to load auditor profile:", error);
    }
  }, []);

  useEffect(() => {
    if (currentRole === "SUPER_ADMIN") {
      void loadDashboard();
      void loadOptions();
    }

    if (currentRole === "AUDITOR") {
      void loadOptions();
      void loadAuditor();
    }
  }, [currentRole, loadDashboard, loadOptions, loadAuditor]);

  const companiesById = useMemo(() => new Map(companies.map((company) => [company.id, company.company_name])), [companies]);
  const locationsById = useMemo(() => new Map(locations.map((location) => [location.id, location.location_name])), [locations]);
  const coordinatorsById = useMemo(() => new Map(coordinators.map((coordinator) => [coordinator.id, coordinator.name])), [coordinators]);

  const filteredAssessments = useMemo(() => {
    return (assessments || []).filter((item) => {
      const matchesCompany = !companyFilter || item.company_id === companyFilter;
      const matchesLocation = !locationFilter || item.location_id === locationFilter;
      const matchesCoordinator = !coordinatorFilter || item.coordinator_id === coordinatorFilter;
      const matchesPeriod = !periodFilter || item.assessment_period_start === periodFilter || item.assessment_period_end === periodFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;
      return matchesCompany && matchesLocation && matchesCoordinator && matchesPeriod && matchesStatus;
    });
  }, [assessments, companyFilter, coordinatorFilter, locationFilter, periodFilter, statusFilter]);

  const analyticsStats = useMemo(() => {
    const submitted = filteredAssessments.filter((item) => item.status === "SUBMITTED").length;
    const drafts = filteredAssessments.filter((item) => item.status === "DRAFT").length;
    const totalAssessments = filteredAssessments.length || 0;
    const averagePerformance = filteredAssessments.reduce((total, item) => total + toNumber(item.overall_percentage || item.overall_rating), 0) / (totalAssessments || 1);

    return {
      totalAssessments,
      submitted,
      drafts,
      averagePerformance,
    };
  }, [filteredAssessments]);

  const parameterSummary = useMemo(() => {
    return PARAMETER_META.map((parameter) => {
      const matches = (parameterPerformance || []).filter((item) => (item.parameter_code || item.parameter || "").toUpperCase() === parameter.code);
      const averageRating = matches.length
        ? matches.reduce((total, item) => total + toNumber(item.average_rating || item.rating || 0), 0) / matches.length
        : 0;
      const averagePercentage = matches.length
        ? matches.reduce((total, item) => total + toNumber(item.average_percentage || item.percentage || 0), 0) / matches.length
        : 0;

      return {
        ...parameter,
        averageRating,
        averagePercentage,
      };
    });
  }, [parameterPerformance]);

  const headcountVacant = useMemo(() => {
    const requirement = toNumber(assessment.headcount.requirement);
    const currentFilled = toNumber(assessment.headcount.current_filled);
    return Math.max(requirement - currentFilled, 0);
  }, [assessment.headcount.requirement, assessment.headcount.current_filled]);

  // Vacant is derived from requirement minus current filled, so it never needs manual entry.
  useEffect(() => {
    setAssessment((current) => {
      if (Number(current.headcount.vacant) === headcountVacant && current.headcount.vacant !== "") {
        return current;
      }
      return { ...current, headcount: { ...current.headcount, vacant: String(headcountVacant) } };
    });
  }, [headcountVacant]);

  const headcountRating = useMemo(() => {
    const requirement = toNumber(assessment.headcount.requirement);
    const replacementRequired = toNumber(assessment.headcount.replacement_required);
    const fulfillment = ratio(toNumber(assessment.headcount.current_filled), requirement);
    const replacement = ratio(toNumber(assessment.headcount.replacement_completed), replacementRequired, 1);
    return clampRating(((fulfillment + replacement) / 2) * 10);
  }, [assessment.headcount.requirement, assessment.headcount.current_filled, assessment.headcount.replacement_required, assessment.headcount.replacement_completed]);

  const joiningRating = useMemo(() => {
    const total = toNumber(assessment.joining.total_joinings);
    const completion = ratio(
      toNumber(assessment.joining.documents_complete) + toNumber(assessment.joining.bank_details_complete) + toNumber(assessment.joining.induction_completed) + toNumber(assessment.joining.employee_master_updated),
      total * 4,
    );
    return clampRating(completion * 10);
  }, [assessment.joining.total_joinings, assessment.joining.documents_complete, assessment.joining.bank_details_complete, assessment.joining.induction_completed, assessment.joining.employee_master_updated]);

  const registrationRating = useMemo(() => {
    const total = toNumber(assessment.registration.total_candidates);
    const registered = toNumber(assessment.registration.registered);
    const defects = toNumber(assessment.registration.registration_defects);
    return clampRating(ratio(registered - defects, total) * 10);
  }, [assessment.registration.total_candidates, assessment.registration.registered, assessment.registration.registration_defects]);

  const attendanceRating = useMemo(() => {
    const total = toNumber(assessment.attendance.total_employees);
    const attendanceRate = ratio(toNumber(assessment.attendance.attendance_submitted) - toNumber(assessment.attendance.attendance_errors), total);
    const stipendRate = ratio(toNumber(assessment.attendance.stipend_submitted) - toNumber(assessment.attendance.stipend_issues) + toNumber(assessment.attendance.issues_resolved), total);
    return clampRating(((attendanceRate + stipendRate) / 2) * 10);
  }, [assessment.attendance.total_employees, assessment.attendance.attendance_submitted, assessment.attendance.attendance_errors, assessment.attendance.stipend_submitted, assessment.attendance.stipend_issues, assessment.attendance.issues_resolved]);

  const disciplineRating = useMemo(() => {
    const received = toNumber(assessment.discipline.grievances_received);
    const resolved = ratio(toNumber(assessment.discipline.grievances_resolved), received, 1);
    return clampRating(resolved * 10);
  }, [assessment.discipline.grievances_received, assessment.discipline.grievances_resolved]);

  const trainingRating = useMemo(() => {
    const required = toNumber(assessment.training.training_required);
    const completed = ratio(toNumber(assessment.training.training_completed), required);
    return clampRating(completed * 10);
  }, [assessment.training.training_required, assessment.training.training_completed]);

  const feedbackRating = useMemo(() => {
    const values = [
      toNumber(assessment.feedback.hr_feedback_rating),
      toNumber(assessment.feedback.manager_feedback_rating),
      toNumber(assessment.feedback.communication_rating),
      toNumber(assessment.feedback.relationship_management_rating),
    ];
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    return clampRating(average);
  }, [assessment.feedback.hr_feedback_rating, assessment.feedback.manager_feedback_rating, assessment.feedback.communication_rating, assessment.feedback.relationship_management_rating]);

  // Keep each section's stored rating in sync with the auto-calculated value derived from its inputs.
  useEffect(() => {
    setAssessment((current) => {
      if (
        current.headcount.rating === headcountRating &&
        current.joining.rating === joiningRating &&
        current.registration.rating === registrationRating &&
        current.attendance.rating === attendanceRating &&
        current.discipline.rating === disciplineRating &&
        current.training.rating === trainingRating &&
        current.feedback.rating === feedbackRating
      ) {
        return current;
      }

      return {
        ...current,
        headcount: { ...current.headcount, rating: headcountRating },
        joining: { ...current.joining, rating: joiningRating },
        registration: { ...current.registration, rating: registrationRating },
        attendance: { ...current.attendance, rating: attendanceRating },
        discipline: { ...current.discipline, rating: disciplineRating },
        training: { ...current.training, rating: trainingRating },
        feedback: { ...current.feedback, rating: feedbackRating },
      };
    });
  }, [headcountRating, joiningRating, registrationRating, attendanceRating, disciplineRating, trainingRating, feedbackRating]);

  // Once the total headcount requirement is entered, reuse it everywhere else instead of re-asking for it.
  useEffect(() => {
    const total = assessment.headcount.requirement;
    setAssessment((current) => {
      if (current.joining.total_joinings === total && current.registration.total_candidates === total && current.attendance.total_employees === total) {
        return current;
      }

      return {
        ...current,
        joining: { ...current.joining, total_joinings: total },
        registration: { ...current.registration, total_candidates: total },
        attendance: { ...current.attendance, total_employees: total },
      };
    });
  }, [assessment.headcount.requirement]);

  const overallRating = useMemo(() => {
    const allRatings = [headcountRating, joiningRating, registrationRating, attendanceRating, disciplineRating, trainingRating, feedbackRating];
    const rated = allRatings.filter((rating) => rating > 0);
    const average = rated.reduce((total, value) => total + value, 0) / Math.max(rated.length, 1);
    return Number(Math.min(10, average).toFixed(2));
  }, [headcountRating, joiningRating, registrationRating, attendanceRating, disciplineRating, trainingRating, feedbackRating]);

  const overallPercentage = useMemo(() => Number(Math.min(100, overallRating * 10).toFixed(2)), [overallRating]);

  const updateNestedField = (group: keyof typeof assessment, field: string, value: string | number) => {
    setAssessment((current) => ({
      ...current,
      [group]: {
        ...(current[group] as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  const handleStepChange = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSubmissionSuccess(false);
      setCurrentStep((step) => Math.max(step - 1, 0));
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const validateRequiredStep = () => {
    if (currentStep === 0) {
      if (!assessment.company_id || !assessment.location_id || !assessment.coordinator_id || !assessment.assessment_start || !assessment.assessment_end || !assessment.assessment_date) {
        toast.error("Please complete all details before continuing.");
        return false;
      }
      return true;
    }

    if (currentStep === 1 && !assessment.headcount.requirement) {
      toast.error("Headcount requirement is required.");
      return false;
    }

    if (currentStep === 2 && !assessment.joining.total_joinings) {
      toast.error("Joining totals are required.");
      return false;
    }

    if (currentStep === 3 && !assessment.registration.total_candidates) {
      toast.error("Registration totals are required.");
      return false;
    }

    if (currentStep === 4 && !assessment.attendance.total_employees) {
      toast.error("Attendance totals are required.");
      return false;
    }

    if (currentStep === 5 && !assessment.discipline.grievances_received) {
      toast.error("Discipline inputs are required.");
      return false;
    }

    if (currentStep === 6 && !assessment.training.training_required) {
      toast.error("Training totals are required.");
      return false;
    }

    if (currentStep === 7 && !assessment.feedback.hr_feedback_rating) {
      toast.error("Feedback ratings are required.");
      return false;
    }

    return true;
  };

  const confirmAndSave = useCallback(async (status: "DRAFT" | "SUBMITTED") => {
    if (!auditorProfile) {
      toast.error("Auditor profile is not available.");
      return;
    }

    if (status === "SUBMITTED" && !validateRequiredStep()) {
      return;
    }

    setSaving(true);

    try {
      const assessmentPayload = {
        auditor_id: auditorProfile.id,
        company_id: assessment.company_id,
        location_id: assessment.location_id,
        coordinator_id: assessment.coordinator_id,
        assessment_start: assessment.assessment_start,
        assessment_end: assessment.assessment_end,
        assessment_date: assessment.assessment_date,
        status,
        overall_rating: Number(overallRating.toFixed(2)),
        overall_percentage: Number(overallPercentage.toFixed(2)),
        submitted_at: status === "SUBMITTED" ? new Date().toISOString() : null,
      } as Record<string, unknown>;

      let assessmentId = draftId;
      if (assessmentId) {
        const { error } = await withRetry(() => supabase.from("rtcpm_assessments").update(assessmentPayload).eq("id", assessmentId));
        if (error) throw error;
      } else {
        const { data, error } = await withRetry<any>(() => supabase.from("rtcpm_assessments").insert([assessmentPayload]).select("id").single());
        if (error) throw error;
        assessmentId = data?.id ?? null;
        setDraftId(assessmentId);
      }

      const sectionRows = [
        {
          ...assessment.headcount,
          assessment_id: assessmentId,
          parameter_code: "HC",
          rating: toNumber(assessment.headcount.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.headcount.rating), 30)),
          remarks: assessment.headcount.remarks || "",
        },
        {
          ...assessment.joining,
          assessment_id: assessmentId,
          parameter_code: "JF",
          rating: toNumber(assessment.joining.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.joining.rating), 20)),
          remarks: assessment.joining.remarks || "",
        },
        {
          ...assessment.registration,
          assessment_id: assessmentId,
          parameter_code: "REG",
          rating: toNumber(assessment.registration.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.registration.rating), 20)),
          remarks: assessment.registration.remarks || "",
        },
        {
          ...assessment.attendance,
          assessment_id: assessmentId,
          parameter_code: "ATT",
          rating: toNumber(assessment.attendance.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.attendance.rating), 10)),
          remarks: assessment.attendance.remarks || "",
        },
        {
          ...assessment.discipline,
          assessment_id: assessmentId,
          parameter_code: "DG",
          rating: toNumber(assessment.discipline.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.discipline.rating), 10)),
          remarks: assessment.discipline.remarks || "",
        },
        {
          ...assessment.training,
          assessment_id: assessmentId,
          parameter_code: "TC",
          rating: toNumber(assessment.training.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.training.rating), 5)),
          remarks: assessment.training.remarks || "",
        },
        {
          ...assessment.feedback,
          assessment_id: assessmentId,
          parameter_code: "SF",
          rating: toNumber(assessment.feedback.rating),
          weighted_score: Number(evaluateWeightedScore(toNumber(assessment.feedback.rating), 5)),
          remarks: assessment.feedback.remarks || "",
        },
      ];

      const scoreInserts = sectionRows.map((entry) => ({
        assessment_id: entry.assessment_id,
        parameter_code: entry.parameter_code,
        rating: entry.rating,
        weighted_score: entry.weighted_score,
        remarks: entry.remarks,
      }));

      const headcountPayload = {
        assessment_id: assessmentId,
        requirement: toNumber(assessment.headcount.requirement),
        candidates_supplied: toNumber(assessment.headcount.candidates_supplied),
        joined: toNumber(assessment.headcount.joined),
        current_filled: toNumber(assessment.headcount.current_filled),
        vacant: toNumber(assessment.headcount.vacant),
        attrition: toNumber(assessment.headcount.attrition),
        replacement_required: toNumber(assessment.headcount.replacement_required),
        replacement_completed: toNumber(assessment.headcount.replacement_completed),
        remarks: assessment.headcount.remarks || "",
      };

      const joiningPayload = {
        assessment_id: assessmentId,
        total_joinings: toNumber(assessment.joining.total_joinings),
        documents_complete: toNumber(assessment.joining.documents_complete),
        bank_details_complete: toNumber(assessment.joining.bank_details_complete),
        induction_completed: toNumber(assessment.joining.induction_completed),
        employee_master_updated: toNumber(assessment.joining.employee_master_updated),
        remarks: assessment.joining.remarks || "",
      };

      const registrationPayload = {
        assessment_id: assessmentId,
        total_candidates: toNumber(assessment.registration.total_candidates),
        registered: toNumber(assessment.registration.registered),
        pending: toNumber(assessment.registration.pending),
        registration_defects: toNumber(assessment.registration.registration_defects),
        remarks: assessment.registration.remarks || "",
      };

      const attendancePayload = {
        assessment_id: assessmentId,
        total_employees: toNumber(assessment.attendance.total_employees),
        attendance_submitted: toNumber(assessment.attendance.attendance_submitted),
        attendance_errors: toNumber(assessment.attendance.attendance_errors),
        stipend_submitted: toNumber(assessment.attendance.stipend_submitted),
        stipend_issues: toNumber(assessment.attendance.stipend_issues),
        issues_resolved: toNumber(assessment.attendance.issues_resolved),
        remarks: assessment.attendance.remarks || "",
      };

      const disciplinePayload = {
        assessment_id: assessmentId,
        grievances_received: toNumber(assessment.discipline.grievances_received),
        grievances_resolved: toNumber(assessment.discipline.grievances_resolved),
        grievances_pending: toNumber(assessment.discipline.grievances_pending),
        disciplinary_cases: toNumber(assessment.discipline.disciplinary_cases),
        counselling_cases: toNumber(assessment.discipline.counselling_cases),
        remarks: assessment.discipline.remarks || "",
      };

      const trainingPayload = {
        assessment_id: assessmentId,
        training_required: toNumber(assessment.training.training_required),
        training_attended: toNumber(assessment.training.training_attended),
        training_completed: toNumber(assessment.training.training_completed),
        training_pending: toNumber(assessment.training.training_pending),
        remarks: assessment.training.remarks || "",
      };

      const feedbackPayload = {
        assessment_id: assessmentId,
        hr_feedback_rating: toNumber(assessment.feedback.hr_feedback_rating),
        manager_feedback_rating: toNumber(assessment.feedback.manager_feedback_rating),
        communication_rating: toNumber(assessment.feedback.communication_rating),
        relationship_management_rating: toNumber(assessment.feedback.relationship_management_rating),
        remarks: assessment.feedback.remarks || "",
      };

      const insertions = await Promise.all([
        withRetry(() => supabase.from("rtcpm_assessment_scores").upsert(scoreInserts, { onConflict: "assessment_id,parameter_code" })),
        withRetry(() => supabase.from("rtcpm_headcount").upsert([headcountPayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_joining").upsert([joiningPayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_registration").upsert([registrationPayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_attendance").upsert([attendancePayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_discipline").upsert([disciplinePayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_training").upsert([trainingPayload], { onConflict: "assessment_id" })),
        withRetry(() => supabase.from("rtcpm_feedback").upsert([feedbackPayload], { onConflict: "assessment_id" })),
      ]);

      const failedInsert = insertions.find((entry) => entry.error);
      if (failedInsert?.error) {
        throw failedInsert.error;
      }

      toast.success(status === "SUBMITTED" ? "Assessment submitted successfully." : "Draft saved successfully.");
      if (status === "SUBMITTED") {
        setSubmissionSuccess(true);
        setCurrentStep(steps.length - 1);
      }
    } catch (error) {
      console.error("Save RTCPM assessment failed:", error);
      const message = (error as { message?: string })?.message || "Unable to save the assessment. Please verify the data and try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [assessment, auditorProfile, currentStep, draftId, overallPercentage, overallRating]);

  if (currentRole === "SUPER_ADMIN") {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#07111F] dark:text-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-3xl bg-[#10253f] p-6 text-white shadow-xl shadow-slate-900/10">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate("/app-select")} className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Back to app selector">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <DMCFSLogo variant="full" size="sm" className="w-[140px]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">RTCPM</div>
                <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate("/", { replace: true }); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Super Admin</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Coordinator Performance Management</h1>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <div className="flex items-center gap-2 text-cyan-300"><BarChart3 className="h-4 w-4" /> RTCPM Analytics Dashboard</div>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Assessments" value={String(analyticsStats.totalAssessments)} icon={ClipboardCheck} />
            <StatCard title="Submitted" value={String(analyticsStats.submitted)} icon={CheckCircle2} />
            <StatCard title="Drafts" value={String(analyticsStats.drafts)} icon={FileText} />
            <StatCard title="Average Performance" value={`${Number(analyticsStats.averagePerformance || 0).toFixed(2)}%`} icon={ShieldCheck} />
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-slate-100">Filters</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              <FilterSelect label="Company" value={companyFilter} onChange={setCompanyFilter} options={companies.map((company) => ({ value: company.id, label: company.company_name }))} />
              <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={locations.filter((location) => !companyFilter || location.company_id === companyFilter).map((location) => ({ value: location.id, label: location.location_name }))} />
              <FilterSelect label="Coordinator" value={coordinatorFilter} onChange={setCoordinatorFilter} options={coordinators.filter((coordinator) => (!companyFilter || coordinator.company_id === companyFilter) && (!locationFilter || coordinator.location_id === locationFilter)).map((coordinator) => ({ value: coordinator.id, label: coordinator.name }))} />
              <FilterSelect label="Assessment Period" value={periodFilter} onChange={setPeriodFilter} options={[...new Set((assessments || []).map((item) => item.assessment_period_start || item.assessment_period_end).filter(Boolean))].map((value) => ({ value, label: value }))} />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "SUBMITTED", label: "Submitted" }, { value: "DRAFT", label: "Draft" }]} />
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-slate-100">RTCPM Assessments</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">{filteredAssessments.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 pr-4">Coordinator</th>
                      <th className="pb-3 pr-4">Company</th>
                      <th className="pb-3 pr-4">Location</th>
                      <th className="pb-3 pr-4">Period</th>
                      <th className="pb-3 pr-4">Rating</th>
                      <th className="pb-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredAssessments || []).slice(0, 10).map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 pr-4 font-medium">{coordinatorsById.get(item.coordinator_id) || "Unknown"}</td>
                        <td className="py-3 pr-4">{companiesById.get(item.company_id) || "-"}</td>
                        <td className="py-3 pr-4">{locationsById.get(item.location_id) || "-"}</td>
                        <td className="py-3 pr-4">{item.assessment_start && item.assessment_end ? `${item.assessment_start} to ${item.assessment_end}` : "-"}</td>
                        <td className="py-3 pr-4">{item.overall_percentage ?? item.overall_rating ?? "-"}</td>
                        <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "SUBMITTED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.status || "DRAFT"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-slate-100">Parameter Performance</h2>
              </div>
              <div className="space-y-4">
                {parameterSummary.map((item) => (
                  <div key={item.code}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-slate-500">{item.averagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className="h-2.5 rounded-full bg-[#FF6600]" style={{ width: `${Math.min(item.averagePercentage, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (currentRole !== "AUDITOR") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-700 dark:bg-[#07111F] dark:text-slate-200">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#FF6600]" />
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This RTCPM workspace is reserved for authorised auditor access.</p>
        </div>
      </main>
    );
  }

  const selectedLocationOptions = locations.filter((location) => !assessment.company_id || location.company_id === assessment.company_id);
  const selectedCoordinatorOptions = coordinators.filter(
    (coordinator) => (!assessment.company_id || coordinator.company_id === assessment.company_id) && (!assessment.location_id || coordinator.location_id === assessment.location_id),
  );

  const selectedCompanyName = companies.find((company) => company.id === assessment.company_id)?.company_name || "-";
  const selectedLocationName = locations.find((location) => location.id === assessment.location_id)?.location_name || "-";
  const selectedCoordinatorName = coordinators.find((coordinator) => coordinator.id === assessment.coordinator_id)?.name || "-";

  const currentSection = steps[currentStep];
  const renderSection = () => {
    if (currentStep === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Company" value={assessment.company_id} onChange={(value) => { setAssessment((current) => ({ ...current, company_id: value, location_id: "", coordinator_id: "" })); }} options={companies.map((company) => ({ value: company.id, label: company.company_name }))} />
          <SelectField label="Location" value={assessment.location_id} onChange={(value) => { setAssessment((current) => ({ ...current, location_id: value, coordinator_id: "" })); }} options={selectedLocationOptions.map((location) => ({ value: location.id, label: location.location_name }))} />
          <SelectField label="Coordinator" value={assessment.coordinator_id} onChange={(value) => setAssessment((current) => ({ ...current, coordinator_id: value }))} options={selectedCoordinatorOptions.map((coordinator) => ({ value: coordinator.id, label: coordinator.name }))} />
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Auditor</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{auditorProfile?.name || "Auditor"}</div>
          </div>
          <DateInput label="Assessment Period Start" value={assessment.assessment_start} onChange={(value) => setAssessment((current) => ({ ...current, assessment_start: value }))} />
          <DateInput label="Assessment Period End" value={assessment.assessment_end} onChange={(value) => setAssessment((current) => ({ ...current, assessment_end: value }))} />
          <DateInput label="Assessment Date" value={assessment.assessment_date} onChange={(value) => setAssessment((current) => ({ ...current, assessment_date: value }))} className="md:col-span-2" />
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <SectionCard title="Headcount (30%)" description="Requirement, supply, attrition, replacement and remarks.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Requirement" value={assessment.headcount.requirement} onChange={(value) => updateNestedField("headcount", "requirement", value)} />
            <NumberField label="Candidates Supplied" value={assessment.headcount.candidates_supplied} onChange={(value) => updateNestedField("headcount", "candidates_supplied", value)} />
            <NumberField label="Joined" value={assessment.headcount.joined} onChange={(value) => updateNestedField("headcount", "joined", value)} />
            <NumberField label="Current Filled" value={assessment.headcount.current_filled} onChange={(value) => updateNestedField("headcount", "current_filled", value)} />
            <NumberField label="Vacant" value={assessment.headcount.vacant} onChange={(value) => updateNestedField("headcount", "vacant", value)} disabled hint="Auto-calculated as Requirement minus Current Filled." />
            <NumberField label="Attrition" value={assessment.headcount.attrition} onChange={(value) => updateNestedField("headcount", "attrition", value)} />
            <NumberField label="Replacement Required" value={assessment.headcount.replacement_required} onChange={(value) => updateNestedField("headcount", "replacement_required", value)} />
            <NumberField label="Replacement Completed" value={assessment.headcount.replacement_completed} onChange={(value) => updateNestedField("headcount", "replacement_completed", value)} />
            <AutoRatingField label="Rating (0-10)" value={headcountRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.headcount.remarks} onChange={(value) => updateNestedField("headcount", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 2) {
      return (
        <SectionCard title="Joining (20%)" description="Document completion, bank updates and induction quality.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Total Joinings" value={assessment.joining.total_joinings} onChange={(value) => updateNestedField("joining", "total_joinings", value)} disabled hint="Synced from Total Employees entered in Headcount." />
            <NumberField label="Documents Complete" value={assessment.joining.documents_complete} onChange={(value) => updateNestedField("joining", "documents_complete", value)} />
            <NumberField label="Bank Details Complete" value={assessment.joining.bank_details_complete} onChange={(value) => updateNestedField("joining", "bank_details_complete", value)} />
            <NumberField label="Induction Completed" value={assessment.joining.induction_completed} onChange={(value) => updateNestedField("joining", "induction_completed", value)} />
            <NumberField label="Employee Master Updated" value={assessment.joining.employee_master_updated} onChange={(value) => updateNestedField("joining", "employee_master_updated", value)} />
            <AutoRatingField label="Rating (0-10)" value={joiningRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.joining.remarks} onChange={(value) => updateNestedField("joining", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 3) {
      return (
        <SectionCard title="Registration (20%)" description="Candidate registration completeness and defects.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Total Candidates" value={assessment.registration.total_candidates} onChange={(value) => updateNestedField("registration", "total_candidates", value)} disabled hint="Synced from Total Employees entered in Headcount." />
            <NumberField label="Registered" value={assessment.registration.registered} onChange={(value) => updateNestedField("registration", "registered", value)} />
            <NumberField label="Pending" value={assessment.registration.pending} onChange={(value) => updateNestedField("registration", "pending", value)} />
            <NumberField label="Registration Defects" value={assessment.registration.registration_defects} onChange={(value) => updateNestedField("registration", "registration_defects", value)} />
            <AutoRatingField label="Rating (0-10)" value={registrationRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.registration.remarks} onChange={(value) => updateNestedField("registration", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 4) {
      return (
        <SectionCard title="Attendance & Stipend (10%)" description="Submit compliance and issue resolution quality.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Total Employees" value={assessment.attendance.total_employees} onChange={(value) => updateNestedField("attendance", "total_employees", value)} disabled hint="Synced from Total Employees entered in Headcount." />
            <NumberField label="Attendance Submitted" value={assessment.attendance.attendance_submitted} onChange={(value) => updateNestedField("attendance", "attendance_submitted", value)} />
            <NumberField label="Attendance Errors" value={assessment.attendance.attendance_errors} onChange={(value) => updateNestedField("attendance", "attendance_errors", value)} />
            <NumberField label="Stipend Submitted" value={assessment.attendance.stipend_submitted} onChange={(value) => updateNestedField("attendance", "stipend_submitted", value)} />
            <NumberField label="Stipend Issues" value={assessment.attendance.stipend_issues} onChange={(value) => updateNestedField("attendance", "stipend_issues", value)} />
            <NumberField label="Issues Resolved" value={assessment.attendance.issues_resolved} onChange={(value) => updateNestedField("attendance", "issues_resolved", value)} />
            <AutoRatingField label="Rating (0-10)" value={attendanceRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.attendance.remarks} onChange={(value) => updateNestedField("attendance", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 5) {
      return (
        <SectionCard title="Discipline & Grievance (10%)" description="Tracking grievances, counselling and corrective actions.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Grievances Received" value={assessment.discipline.grievances_received} onChange={(value) => updateNestedField("discipline", "grievances_received", value)} />
            <NumberField label="Grievances Resolved" value={assessment.discipline.grievances_resolved} onChange={(value) => updateNestedField("discipline", "grievances_resolved", value)} />
            <NumberField label="Grievances Pending" value={assessment.discipline.grievances_pending} onChange={(value) => updateNestedField("discipline", "grievances_pending", value)} />
            <NumberField label="Disciplinary Cases" value={assessment.discipline.disciplinary_cases} onChange={(value) => updateNestedField("discipline", "disciplinary_cases", value)} />
            <NumberField label="Counselling Cases" value={assessment.discipline.counselling_cases} onChange={(value) => updateNestedField("discipline", "counselling_cases", value)} />
            <AutoRatingField label="Rating (0-10)" value={disciplineRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.discipline.remarks} onChange={(value) => updateNestedField("discipline", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 6) {
      return (
        <SectionCard title="Training (5%)" description="Training coverage, completion and pending follow-ups.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField label="Training Required" value={assessment.training.training_required} onChange={(value) => updateNestedField("training", "training_required", value)} />
            <NumberField label="Training Attended" value={assessment.training.training_attended} onChange={(value) => updateNestedField("training", "training_attended", value)} />
            <NumberField label="Training Completed" value={assessment.training.training_completed} onChange={(value) => updateNestedField("training", "training_completed", value)} />
            <NumberField label="Training Pending" value={assessment.training.training_pending} onChange={(value) => updateNestedField("training", "training_pending", value)} />
            <AutoRatingField label="Rating (0-10)" value={trainingRating} />
            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField label="Remarks" value={assessment.training.remarks} onChange={(value) => updateNestedField("training", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep === 7) {
      return (
        <SectionCard title="Stakeholder Feedback (5%)" description="HR, manager, communication and relationship assessment ratings.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NumberField label="HR Feedback Rating" value={assessment.feedback.hr_feedback_rating} onChange={(value) => updateNestedField("feedback", "hr_feedback_rating", Number(value))} min={1} max={10} />
            <NumberField label="Manager Feedback Rating" value={assessment.feedback.manager_feedback_rating} onChange={(value) => updateNestedField("feedback", "manager_feedback_rating", Number(value))} min={1} max={10} />
            <NumberField label="Communication Rating" value={assessment.feedback.communication_rating} onChange={(value) => updateNestedField("feedback", "communication_rating", Number(value))} min={1} max={10} />
            <NumberField label="Relationship Management Rating" value={assessment.feedback.relationship_management_rating} onChange={(value) => updateNestedField("feedback", "relationship_management_rating", Number(value))} min={1} max={10} />
            <div className="md:col-span-2 xl:col-span-4">
              <TextAreaField label="Remarks" value={assessment.feedback.remarks} onChange={(value) => updateNestedField("feedback", "remarks", value)} />
            </div>
          </div>
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Review & Submit" description="Confirm the final assessment before submission.">
        {submissionSuccess ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Assessment submitted successfully. It is now visible on the Super Admin RTCPM Analytics Dashboard.</p>
          </div>
        ) : null}
        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
          <ReviewItem label="Company" value={selectedCompanyName} />
          <ReviewItem label="Location" value={selectedLocationName} />
          <ReviewItem label="Coordinator" value={selectedCoordinatorName} />
          <ReviewItem label="Auditor" value={auditorProfile?.name || "-"} />
          <ReviewItem label="Assessment Period" value={`${assessment.assessment_start || "-"} to ${assessment.assessment_end || "-"}`} />
          <ReviewItem label="Assessment Date" value={assessment.assessment_date || "-"} />
        </div>

        <div className="mb-6 space-y-4">
          {PARAMETER_META.map((parameter) => {
            const sectionData = (assessment as Record<string, any>)[parameter.key] as Record<string, unknown>;
            const fieldLabels = SECTION_FIELD_LABELS[parameter.key];

            return (
              <div key={parameter.code} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{parameter.label} ({parameter.weight}%)</h4>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <ReviewItem key={field} label={label} value={String(sectionData[field] ?? "-") || "-"} />
                  ))}
                </div>
                {sectionData.remarks ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Remarks: {String(sectionData.remarks)}</p> : null}
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                <th className="pb-3 pr-4">Parameter</th>
                <th className="pb-3 pr-4">Weight</th>
                <th className="pb-3 pr-4">Rating</th>
                <th className="pb-3 pr-4">Weighted Score</th>
                <th className="pb-3 pr-4">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {PARAMETER_META.map((parameter) => {
                const ratingByKey: Record<string, number> = {
                  headcount: headcountRating,
                  joining: joiningRating,
                  registration: registrationRating,
                  attendance: attendanceRating,
                  discipline: disciplineRating,
                  training: trainingRating,
                  feedback: feedbackRating,
                };
                const rating = ratingByKey[parameter.key];
                const weightedScore = Number(((rating / 10) * parameter.weight).toFixed(2));
                const remarks = parameter.key === "headcount"
                  ? assessment.headcount.remarks
                  : parameter.key === "joining"
                    ? assessment.joining.remarks
                    : parameter.key === "registration"
                      ? assessment.registration.remarks
                      : parameter.key === "attendance"
                        ? assessment.attendance.remarks
                        : parameter.key === "discipline"
                          ? assessment.discipline.remarks
                          : parameter.key === "training"
                            ? assessment.training.remarks
                            : assessment.feedback.remarks;

                return (
                  <tr key={parameter.code} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="py-3 pr-4 font-medium">{parameter.label}</td>
                    <td className="py-3 pr-4">{parameter.weight}%</td>
                    <td className="py-3 pr-4">{rating}</td>
                    <td className="py-3 pr-4">{weightedScore}</td>
                    <td className="py-3 pr-4">{remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 dark:bg-slate-950/70">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Overall Rating</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{overallRating.toFixed(2)} / 10</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Overall Percentage</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{overallPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </SectionCard>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#07111F] dark:text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-[#10253f] p-6 text-white shadow-xl shadow-slate-900/10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate("/app-select")} className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Back to app selector">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <DMCFSLogo variant="full" size="sm" className="w-[140px]" />
            </div>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate("/", { replace: true }); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Auditor</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">RTCPM Assessment Workspace</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200">
              <CalendarRange className="h-4 w-4" />
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <div className="mt-3 text-xs font-medium text-cyan-200/80">
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · {now.toLocaleTimeString()}
          </div>
        </header>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Section</p>
              <h2 className="mt-1 text-2xl font-semibold dark:text-slate-100">{currentSection}</h2>
            </div>
            <div className="text-right text-sm text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-200">{auditorProfile?.name || "Auditor"}</div>
              <div>{auditorProfile?.email || "auditor@dmcfs.in"}</div>
            </div>
          </div>

          {renderSection()}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => handleStepChange("prev")} disabled={currentStep === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 hover:dark:border-slate-600">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button type="button" onClick={() => { if (validateRequiredStep()) { void confirmAndSave("DRAFT"); } }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 hover:dark:bg-slate-700" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {currentStep < steps.length - 1 ? (
                <button type="button" onClick={() => { if (validateRequiredStep()) handleStepChange("next"); }} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6600] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85d00]">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={() => { if (validateRequiredStep()) { void confirmAndSave("SUBMITTED"); } }} disabled={saving || submissionSuccess} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                  <CheckCircle2 className="h-4 w-4" />
                  {submissionSuccess ? "Submitted" : saving ? "Submitting..." : "Submit Assessment"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</span>
        <span className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-200"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#FF6600] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#FF6600] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max, disabled, hint }: { label: string; value: string | number; onChange: (value: string) => void; min?: number; max?: number; disabled?: boolean; hint?: string }) {
  const handleChange = (raw: string) => {
    if (raw === "" || (min === undefined && max === undefined)) {
      onChange(raw);
      return;
    }

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      onChange(raw);
      return;
    }

    const clamped = Math.min(max ?? numeric, Math.max(min ?? numeric, numeric));
    onChange(String(clamped));
  };

  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#FF6600] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
      />
      {hint ? <span className="block text-xs text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </label>
  );
}

function AutoRatingField({ label, value }: { label: string; value: number }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {value} / 10
      </div>
      <span className="block text-xs text-slate-400 dark:text-slate-500">Auto-calculated from the inputs above</span>
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#FF6600] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#FF6600] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <option value="">All {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
