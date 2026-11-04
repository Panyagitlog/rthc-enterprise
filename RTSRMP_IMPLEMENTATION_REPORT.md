# RTSRMP Implementation Report

## Implementation status

| Area | Status |
| --- | --- |
| Database | Two additive, `rtsrmp_`-scoped migrations are prepared; **not applied** |
| Security / RLS | Active profile, assigned company/location, immutable workflow fields, role-scoped policies, and review RPC checks are implemented; **not live-tested** |
| Authentication | Uses the existing Supabase Auth session and `public.users`; inactive, unsupported, unassigned, and expired-session access is denied |
| COMPANY_HR workflow | Draft, edit, document upload, submit, correction edit, and resubmit are implemented; **not live-tested** |
| SUPER_ADMIN workflow | All-company review, decisions, report filters, and all-company Excel download are implemented; **not live-tested** |
| Documents | Private bucket, allowed MIME types, 15 MB limit, scoped policies, metadata checks, and short-lived signed links are implemented; **not live-tested** |
| Excel | ExcelJS export includes actual authorized records, active-filter exports, an unfiltered SUPER_ADMIN all-company option, company HR attribution, summary, master, detail, pending, and expiring sheets |
| Print | DMCFS-branded A4 landscape report, generated time, filters, repeating table headings, and page numbering are implemented |
| TypeScript | `npm exec tsc -- --noEmit` passed |
| RTSRMP lint | `npm exec oxlint -- src/apps/rtsrmp` passed |
| Production build | `npm run build` passed; Vite emitted its large-bundle warning |
| SQL lint | Not completed: local PostgreSQL was unavailable at `127.0.0.1:54322`; no live project migration or query was run |

## Files

- `src/apps/rtsrmp/RTSRMPApp.tsx` — dashboards, role-aware navigation, submission and review UI, validation, filters, Excel/print reports.
- `src/apps/rtsrmp/services.ts` — authenticated profile loading, paginated data reads, live reference synchronization, persistence, RPCs, document uploads, and signed URLs.
- `src/apps/rtsrmp/types.ts` — RTSRMP roles, records, report types, and document types.
- `src/apps/rtsrmp/RTSRMPAccess.tsx` — strict route authorization and auth-session refresh handling.
- `src/apps/rtsrmp/profile-context.ts` — authenticated RTSRMP profile context.
- `src/apps/rtsrmp/rtsrmp.css` — workspace and print styles.
- `supabase/migrations/20261008120000_create_rtsrmp.sql` — RTSRMP schema, base RLS/RPC, and private bucket.
- `supabase/migrations/20261008130000_harden_rtsrmp.sql` — active-user checks, HR-scoped reference synchronization, transition and timestamp guards, policy hardening, validations, and complete approval snapshots.
- `src/App.tsx` — protected RTSRMP route.
- `src/pages/Login.tsx` — COMPANY_HR RTSRMP redirect.
- `src/pages/ApplicationSelection.tsx` — SUPER_ADMIN RTSRMP application card.
- `package.json`, `package-lock.json` — ExcelJS workbook export dependency.
- `RTSRMP_IMPLEMENTATION_REPORT.md` — this report and live-test checklist.

## Deployment requirements

Apply the migrations in timestamp order after linking and reviewing the intended Supabase project:

1. `supabase/migrations/20261008120000_create_rtsrmp.sql`
2. `supabase/migrations/20261008130000_harden_rtsrmp.sql`

The application uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Do not configure a service-role key in frontend environment variables.

The migrations create the private `rtsrmp-supporting-documents` bucket and bucket-scoped storage policies. Allowed file types are PDF, JPEG, PNG, and DOCX; the maximum file size is 15 MB.

Required RTSRMP RPCs include `rtsrmp_current_profile`, `rtsrmp_sync_current_hr_reference`, `rtsrmp_submit_submission`, and `rtsrmp_review_submission`, plus the RTSRMP role/scope helper functions defined in the migrations.

`COMPANY_HR` test accounts must exist in `public.users` with an active status, role `COMPANY_HR`, and valid `company_id` and `location_id`. SUPER_ADMIN test accounts must have an active `SUPER_ADMIN` profile. Both use the existing Supabase Auth login.

## Manual Supabase verification checklist

- [ ] **A — COMPANY_HR login:** authenticated active user reaches `/rtsrmp/dashboard`; inactive or unsupported users are denied.
- [ ] **B — Assignment:** company and location appear from the profile and are never selectable; missing/inactive assignments cannot submit.
- [ ] **C — Draft creation:** save a valid draft, refresh, and verify all entered parent and detail data persists.
- [ ] **D — Draft editing:** edit a draft and a correction-required record; verify original creator, scope, and lifecycle fields cannot be changed.
- [ ] **E — Documents:** upload each allowed file type; reject unsupported, empty, and over-15-MB files; verify HR cannot open another company’s object.
- [ ] **F — Submission:** submit valid data; verify status, submitter, timestamp, and submission log.
- [ ] **G — SUPER_ADMIN review:** verify submissions from multiple companies and locations are visible; test under-verification, approval, rejection, and correction decisions.
- [ ] **H — Correction request:** reject an empty-remarks correction request; verify a valid request records the remarks and moves to correction-required.
- [ ] **I — Resubmission:** HR edits and resubmits; verify the status and `RESUBMITTED` audit action.
- [ ] **J — Approval:** approve as SUPER_ADMIN; verify invalid direct HR/admin table updates and unauthorized RPC calls fail.
- [ ] **K — Rate history:** verify a snapshot preserves rate, effective dates, submitter/reviewer, remarks, benefit/OT/deduction/eligibility/requirement details, and document references.
- [ ] **L — Excel:** check active-filter export and SUPER_ADMIN all-company export, including every status and records beyond the Supabase default page size.
- [ ] **M — Print:** verify branding, generated timestamp, filters, landscape layout, repeated table headings, and page numbering in print preview.
- [ ] **N — Cross-company isolation:** authenticate as one COMPANY_HR and attempt direct REST/RPC/storage access to a second company; expect no rows or authorization failures.

The database migrations, auth flows, RLS behavior, document operations, Excel output, and print preview remain unverified against live Supabase data. The migrations have not been applied.
