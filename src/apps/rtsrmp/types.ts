export type RTSRMPRole = "SUPER_ADMIN" | "COMPANY_HR";

export type RTSRMPProfile = {
  id: string;
  role: RTSRMPRole;
  company_id: string | null;
  location_id: string | null;
  name?: string | null;
  email?: string | null;
};

export type RTSRMPCompany = {
  company_id: string;
  company_name: string;
  company_code: string | null;
  status: string;
};

export type RTSRMPCompanyUser = {
  profile_id: string;
  auth_user_id: string | null;
  company_id: string;
  location_id: string;
  role: "COMPANY_HR";
  name: string | null;
  email: string | null;
  status: string;
};

export type RTSRMPScheme = {
  id: string;
  name: string;
  is_active: boolean;
};

export type RTSRMPQualification = {
  id: string;
  qualification_code: string | null;
  qualification_name: string;
  is_active: boolean;
};

export type RTSRMPLocation = {
  location_id: string;
  company_id: string;
  location_name: string;
  location_code: string | null;
  city: string | null;
  state: string | null;
  status: string;
};

export type RTSRMPStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_VERIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "CORRECTION_REQUIRED"
  | "EXPIRED";

export type RTSRMPSubmission = {
  id: string;
  company_id: string;
  location_id: string;
  scheme_id: string | null;
  qualification_id: string | null;
  scheme: string;
  qualification: string;
  trade: string | null;
  stipend_rate: number;
  effective_from: string;
  effective_to: string | null;
  payment_frequency: string;
  currency: string;
  coordinator_name: string | null;
  coordinator_contact: string | null;
  current_students: number | null;
  requirement_count: number | null;
  remarks: string | null;
  status: RTSRMPStatus;
  created_by: string;
  submitted_at: string | null;
  submitted_by?: string | null;
  verified_at: string | null;
  verified_by?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type RTSRMPOvertime = {
  id?: string;
  submission_id: string;
  applicable: boolean;
  ot_rate: number | null;
  calculation_basis: string;
  rate_unit: string;
  maximum_hours: number | null;
  remarks: string;
  effective_from: string | null;
  effective_to: string | null;
};

export type RTSRMPBenefit = {
  id?: string;
  submission_id: string;
  benefit_type: string;
  applicable: boolean;
  value: string;
  amount: number | null;
  frequency: string;
  remarks: string;
  effective_from: string | null;
  effective_to: string | null;
};

export type RTSRMPDeduction = {
  id?: string;
  submission_id: string;
  deduction_type: string;
  applicable: boolean;
  amount: number | null;
  percentage: number | null;
  frequency: string;
  reason: string;
  remarks: string;
};

export type RTSRMPEligibility = {
  id?: string;
  submission_id: string;
  min_age: number | null;
  max_age: number | null;
  education: string;
  qualification: string;
  trade: string;
  experience: string;
  gender: string;
  other_criteria: Record<string, unknown>;
  remarks: string;
};

export type RTSRMPRequirement = {
  id?: string;
  submission_id: string;
  scheme: string;
  qualification: string;
  trade: string;
  requirement_count: number;
  current_students: number | null;
  preferred_joining_timeline: string;
  remarks: string;
};

export type RTSRMPDocument = {
  id: string;
  submission_id: string;
  company_id: string;
  location_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
};

export type RTSRMPVerificationLog = {
  id: string;
  submission_id: string;
  verifier_id: string;
  action: string;
  remarks: string | null;
  created_at: string;
};

export type RTSRMPHistory = {
  id: string;
  submission_id: string;
  company_id: string;
  location_id: string;
  scheme: string;
  qualification: string;
  trade: string | null;
  stipend_rate: number;
  previous_rate: number | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  status: string;
  approved_by: string;
  approved_at: string;
  change_reason: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  review_remarks: string | null;
  document_refs: Record<string, unknown>[];
  detail_snapshot: Record<string, unknown>;
};

export type RTSRMPData = {
  schemes: RTSRMPScheme[];
  qualifications: RTSRMPQualification[];
  companies: RTSRMPCompany[];
  locations: RTSRMPLocation[];
  companyUsers: RTSRMPCompanyUser[];
  submissions: RTSRMPSubmission[];
  overtime: RTSRMPOvertime[];
  benefits: RTSRMPBenefit[];
  deductions: RTSRMPDeduction[];
  eligibility: RTSRMPEligibility[];
  requirements: RTSRMPRequirement[];
  documents: RTSRMPDocument[];
  verificationLogs: RTSRMPVerificationLog[];
  history: RTSRMPHistory[];
};

export const RTSRMP_DOCUMENT_TYPES = [
  "Company Circular",
  "HR Letter",
  "Stipend Policy",
  "Offer Document",
  "Official Rate Document",
  "Other Supporting Evidence",
] as const;

export const RTSRMP_BENEFIT_TYPES = [
  "Accommodation",
  "Food",
  "Transport",
  "Uniform",
  "Insurance",
  "Medical",
  "Attendance Bonus",
  "DBT",
  "Bus Facility",
  "Canteen Facility",
  "Other",
] as const;

export const RTSRMP_REPORT_TYPES = [
  "Stipend Rate Master Report",
  "Company-wise Stipend Report",
  "Location-wise Stipend Report",
  "Scheme-wise Report",
  "Qualification-wise Report",
  "Company Requirement Report",
  "OT Report",
  "Benefits Report",
  "Deductions Report",
  "Eligibility Report",
  "Pending Submission Report",
  "Verification Report",
  "Approved Rate Report",
  "Rejected / Correction Report",
  "Rate History Report",
  "Expiring Rate Report",
] as const;
