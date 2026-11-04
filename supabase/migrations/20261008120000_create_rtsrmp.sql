create table if not exists public.rtsrmp_companies (
  company_id text primary key,
  company_name text not null,
  company_code text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rtsrmp_locations (
  location_id text primary key,
  company_id text not null references public.rtsrmp_companies(company_id) on delete restrict,
  location_name text not null,
  location_code text,
  city text,
  state text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, company_id)
);

create table if not exists public.rtsrmp_company_users (
  profile_id text primary key,
  auth_user_id text unique,
  company_id text not null references public.rtsrmp_companies(company_id) on delete restrict,
  location_id text not null,
  role text not null check (role = 'COMPANY_HR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (location_id, company_id)
    references public.rtsrmp_locations(location_id, company_id) on delete restrict
);

create table if not exists public.rtsrmp_schemes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rtsrmp_qualifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rtsrmp_stipend_rates (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.rtsrmp_companies(company_id) on delete restrict,
  location_id text not null,
  scheme text not null,
  qualification text not null,
  trade text,
  stipend_rate numeric(12,2) not null check (stipend_rate >= 0),
  effective_from date not null,
  effective_to date,
  payment_frequency text not null default 'MONTHLY',
  currency text not null default 'INR',
  coordinator_name text,
  coordinator_contact text,
  current_students integer check (current_students is null or current_students >= 0),
  requirement_count integer check (requirement_count is null or requirement_count >= 0),
  remarks text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED', 'EXPIRED')),
  created_by text not null,
  updated_by text,
  submitted_at timestamptz,
  verified_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  review_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  check (company_id <> '' and location_id <> ''),
  foreign key (location_id, company_id)
    references public.rtsrmp_locations(location_id, company_id) on delete restrict
);

create table if not exists public.rtsrmp_overtime (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.rtsrmp_stipend_rates(id) on delete cascade,
  applicable boolean not null default false,
  ot_rate numeric(12,2) check (ot_rate is null or ot_rate >= 0),
  calculation_basis text,
  rate_unit text,
  maximum_hours numeric(8,2) check (maximum_hours is null or maximum_hours >= 0),
  remarks text,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table if not exists public.rtsrmp_benefits (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete cascade,
  benefit_type text not null,
  applicable boolean not null default false,
  value text,
  amount numeric(12,2) check (amount is null or amount >= 0),
  frequency text,
  remarks text,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table if not exists public.rtsrmp_deductions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete cascade,
  deduction_type text not null,
  applicable boolean not null default false,
  amount numeric(12,2) check (amount is null or amount >= 0),
  percentage numeric(7,4) check (percentage is null or percentage between 0 and 100),
  frequency text,
  reason text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount is null or percentage is null)
);

create table if not exists public.rtsrmp_eligibility (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.rtsrmp_stipend_rates(id) on delete cascade,
  min_age integer check (min_age is null or min_age >= 0),
  max_age integer check (max_age is null or max_age >= 0),
  education text,
  qualification text,
  trade text,
  experience text,
  gender text,
  other_criteria jsonb not null default '{}'::jsonb,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_age is null or min_age is null or max_age >= min_age)
);

create table if not exists public.rtsrmp_requirements (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete cascade,
  scheme text not null,
  qualification text,
  trade text,
  requirement_count integer not null check (requirement_count >= 0),
  current_students integer check (current_students is null or current_students >= 0),
  preferred_joining_timeline text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rtsrmp_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete cascade,
  company_id text not null references public.rtsrmp_companies(company_id) on delete restrict,
  location_id text not null,
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  content_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  foreign key (location_id, company_id)
    references public.rtsrmp_locations(location_id, company_id) on delete restrict
);

create table if not exists public.rtsrmp_verification_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete cascade,
  verifier_id text not null,
  action text not null check (action in ('SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED', 'RESUBMITTED')),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.rtsrmp_rate_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.rtsrmp_stipend_rates(id) on delete restrict,
  company_id text not null references public.rtsrmp_companies(company_id) on delete restrict,
  location_id text not null,
  scheme text not null,
  qualification text not null,
  trade text,
  stipend_rate numeric(12,2) not null check (stipend_rate >= 0),
  currency text not null,
  effective_from date not null,
  effective_to date,
  status text not null,
  approved_by text not null,
  approved_at timestamptz not null,
  change_reason text,
  created_at timestamptz not null default now(),
  foreign key (location_id, company_id)
    references public.rtsrmp_locations(location_id, company_id) on delete restrict
);

create index if not exists rtsrmp_rates_company_location_status_idx
  on public.rtsrmp_stipend_rates(company_id, location_id, status);
create index if not exists rtsrmp_rates_scheme_qualification_idx
  on public.rtsrmp_stipend_rates(scheme, qualification);
create index if not exists rtsrmp_rates_effective_dates_idx
  on public.rtsrmp_stipend_rates(effective_from, effective_to);
create index if not exists rtsrmp_documents_submission_idx
  on public.rtsrmp_documents(submission_id);
create index if not exists rtsrmp_logs_submission_created_idx
  on public.rtsrmp_verification_logs(submission_id, created_at desc);
create index if not exists rtsrmp_history_company_location_idx
  on public.rtsrmp_rate_history(company_id, location_id, approved_at desc);

insert into public.rtsrmp_companies (company_id, company_name, company_code, status)
select to_jsonb(c)->>'id', to_jsonb(c)->>'company_name',
       to_jsonb(c)->>'company_code', coalesce(to_jsonb(c)->>'status', 'ACTIVE')
from public.companies c
where nullif(to_jsonb(c)->>'id', '') is not null
  and nullif(to_jsonb(c)->>'company_name', '') is not null
on conflict (company_id) do update
set company_name = excluded.company_name,
    company_code = excluded.company_code,
    status = excluded.status,
    updated_at = now();

insert into public.rtsrmp_locations (location_id, company_id, location_name, location_code, city, state, status)
select to_jsonb(l)->>'id', to_jsonb(l)->>'company_id', to_jsonb(l)->>'location_name',
       to_jsonb(l)->>'location_code', to_jsonb(l)->>'city', to_jsonb(l)->>'state',
       coalesce(to_jsonb(l)->>'status', 'ACTIVE')
from public.locations l
join public.rtsrmp_companies c on c.company_id = to_jsonb(l)->>'company_id'
where nullif(to_jsonb(l)->>'id', '') is not null
  and nullif(to_jsonb(l)->>'location_name', '') is not null
on conflict (location_id) do update
set company_id = excluded.company_id,
    location_name = excluded.location_name,
    location_code = excluded.location_code,
    city = excluded.city,
    state = excluded.state,
    status = excluded.status,
    updated_at = now();

insert into public.rtsrmp_company_users (profile_id, auth_user_id, company_id, location_id, role)
select to_jsonb(u)->>'id', to_jsonb(u)->>'auth_user_id', to_jsonb(u)->>'company_id',
       to_jsonb(u)->>'location_id', to_jsonb(u)->>'role'
from public.users u
join public.rtsrmp_locations l
  on l.location_id = to_jsonb(u)->>'location_id'
 and l.company_id = to_jsonb(u)->>'company_id'
where upper(coalesce(to_jsonb(u)->>'role', '')) = 'COMPANY_HR'
  and nullif(to_jsonb(u)->>'id', '') is not null
  and nullif(to_jsonb(u)->>'company_id', '') is not null
  and nullif(to_jsonb(u)->>'location_id', '') is not null
on conflict (profile_id) do update
set auth_user_id = excluded.auth_user_id,
    company_id = excluded.company_id,
    location_id = excluded.location_id,
    role = excluded.role,
    updated_at = now();

create or replace function public.rtsrmp_current_profile()
returns table (role text, company_id text, location_id text, profile_id text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select to_jsonb(u)->>'role',
         to_jsonb(u)->>'company_id',
         to_jsonb(u)->>'location_id',
         to_jsonb(u)->>'id'
  from public.users u
  where to_jsonb(u)->>'auth_user_id' = auth.uid()::text
     or to_jsonb(u)->>'id' = auth.uid()::text
  order by (to_jsonb(u)->>'auth_user_id' = auth.uid()::text) desc
  limit 1
$$;

create or replace function public.rtsrmp_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.rtsrmp_current_profile() p
    where upper(coalesce(p.role, '')) = 'SUPER_ADMIN'
  )
$$;

create or replace function public.rtsrmp_is_company_hr()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.rtsrmp_current_profile() p
    where upper(coalesce(p.role, '')) = 'COMPANY_HR'
      and p.company_id is not null
      and p.location_id is not null
  )
$$;

create or replace function public.rtsrmp_can_access(company_key text, location_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.rtsrmp_is_super_admin()
      or exists (
        select 1 from public.rtsrmp_current_profile() p
        where upper(coalesce(p.role, '')) = 'COMPANY_HR'
          and p.company_id = company_key
          and p.location_id = location_key
      )
$$;

create or replace function public.rtsrmp_can_view_submission(submission_key uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.rtsrmp_stipend_rates r
    where r.id = submission_key
      and public.rtsrmp_can_access(r.company_id, r.location_id)
  )
$$;

create or replace function public.rtsrmp_can_edit_submission(submission_key uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.rtsrmp_stipend_rates r
    where r.id = submission_key
      and public.rtsrmp_is_company_hr()
      and public.rtsrmp_can_access(r.company_id, r.location_id)
      and r.status in ('DRAFT', 'CORRECTION_REQUIRED')
  )
$$;

alter table public.rtsrmp_companies enable row level security;
alter table public.rtsrmp_locations enable row level security;
alter table public.rtsrmp_company_users enable row level security;
alter table public.rtsrmp_schemes enable row level security;
alter table public.rtsrmp_qualifications enable row level security;
alter table public.rtsrmp_stipend_rates enable row level security;
alter table public.rtsrmp_overtime enable row level security;
alter table public.rtsrmp_benefits enable row level security;
alter table public.rtsrmp_deductions enable row level security;
alter table public.rtsrmp_eligibility enable row level security;
alter table public.rtsrmp_requirements enable row level security;
alter table public.rtsrmp_documents enable row level security;
alter table public.rtsrmp_verification_logs enable row level security;
alter table public.rtsrmp_rate_history enable row level security;

create policy rtsrmp_company_read on public.rtsrmp_companies for select to authenticated
using (public.rtsrmp_is_super_admin() or exists (
  select 1 from public.rtsrmp_current_profile() p
  where upper(coalesce(p.role, '')) = 'COMPANY_HR'
    and p.company_id = rtsrmp_companies.company_id
));
create policy rtsrmp_company_admin_write on public.rtsrmp_companies for all to authenticated
using (public.rtsrmp_is_super_admin()) with check (public.rtsrmp_is_super_admin());

create policy rtsrmp_location_read on public.rtsrmp_locations for select to authenticated
using (public.rtsrmp_is_super_admin() or exists (
  select 1 from public.rtsrmp_current_profile() p
  where upper(coalesce(p.role, '')) = 'COMPANY_HR'
    and p.company_id = rtsrmp_locations.company_id
    and p.location_id = rtsrmp_locations.location_id
));
create policy rtsrmp_location_admin_write on public.rtsrmp_locations for all to authenticated
using (public.rtsrmp_is_super_admin()) with check (public.rtsrmp_is_super_admin());

create policy rtsrmp_company_users_read on public.rtsrmp_company_users for select to authenticated
using (
  public.rtsrmp_is_super_admin()
  or auth_user_id = auth.uid()::text
  or profile_id = auth.uid()::text
);
create policy rtsrmp_company_users_admin_write on public.rtsrmp_company_users for all to authenticated
using (public.rtsrmp_is_super_admin()) with check (public.rtsrmp_is_super_admin());

create policy rtsrmp_schemes_read on public.rtsrmp_schemes for select to authenticated
using (public.rtsrmp_is_super_admin() or public.rtsrmp_is_company_hr());
create policy rtsrmp_schemes_admin_write on public.rtsrmp_schemes for all to authenticated
using (public.rtsrmp_is_super_admin()) with check (public.rtsrmp_is_super_admin());
create policy rtsrmp_qualifications_read on public.rtsrmp_qualifications for select to authenticated
using (public.rtsrmp_is_super_admin() or public.rtsrmp_is_company_hr());
create policy rtsrmp_qualifications_admin_write on public.rtsrmp_qualifications for all to authenticated
using (public.rtsrmp_is_super_admin()) with check (public.rtsrmp_is_super_admin());

create policy rtsrmp_rates_read on public.rtsrmp_stipend_rates for select to authenticated
using (public.rtsrmp_can_access(company_id, location_id));
create policy rtsrmp_rates_insert on public.rtsrmp_stipend_rates for insert to authenticated
with check (
  public.rtsrmp_is_company_hr()
  and public.rtsrmp_can_access(company_id, location_id)
  and status = 'DRAFT'
  and created_by = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
);
create policy rtsrmp_rates_update on public.rtsrmp_stipend_rates for update to authenticated
using (
  (public.rtsrmp_is_super_admin() and status in ('SUBMITTED', 'UNDER_VERIFICATION'))
  or (
    public.rtsrmp_can_access(company_id, location_id)
    and status in ('DRAFT', 'CORRECTION_REQUIRED')
  )
)
with check (
  (public.rtsrmp_is_super_admin() and status in ('SUBMITTED', 'UNDER_VERIFICATION'))
  or (
    public.rtsrmp_is_company_hr()
    and public.rtsrmp_can_access(company_id, location_id)
    and status = 'DRAFT'
  )
);
create policy rtsrmp_rates_delete on public.rtsrmp_stipend_rates for delete to authenticated
using (
  public.rtsrmp_is_company_hr()
  and public.rtsrmp_can_access(company_id, location_id)
  and status = 'DRAFT'
);

create policy rtsrmp_overtime_read on public.rtsrmp_overtime for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_overtime_insert on public.rtsrmp_overtime for insert to authenticated
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_overtime_update on public.rtsrmp_overtime for update to authenticated
using (public.rtsrmp_can_edit_submission(submission_id))
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_overtime_admin_delete on public.rtsrmp_overtime for delete to authenticated
using (public.rtsrmp_is_super_admin());

create policy rtsrmp_benefits_read on public.rtsrmp_benefits for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_benefits_insert on public.rtsrmp_benefits for insert to authenticated
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_benefits_update on public.rtsrmp_benefits for update to authenticated
using (public.rtsrmp_can_edit_submission(submission_id))
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_benefits_delete on public.rtsrmp_benefits for delete to authenticated
using (public.rtsrmp_can_edit_submission(submission_id));

create policy rtsrmp_deductions_read on public.rtsrmp_deductions for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_deductions_insert on public.rtsrmp_deductions for insert to authenticated
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_deductions_update on public.rtsrmp_deductions for update to authenticated
using (public.rtsrmp_can_edit_submission(submission_id))
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_deductions_delete on public.rtsrmp_deductions for delete to authenticated
using (public.rtsrmp_can_edit_submission(submission_id));

create policy rtsrmp_eligibility_read on public.rtsrmp_eligibility for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_eligibility_insert on public.rtsrmp_eligibility for insert to authenticated
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_eligibility_update on public.rtsrmp_eligibility for update to authenticated
using (public.rtsrmp_can_edit_submission(submission_id))
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_eligibility_delete on public.rtsrmp_eligibility for delete to authenticated
using (public.rtsrmp_can_edit_submission(submission_id));

create policy rtsrmp_requirements_read on public.rtsrmp_requirements for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_requirements_insert on public.rtsrmp_requirements for insert to authenticated
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_requirements_update on public.rtsrmp_requirements for update to authenticated
using (public.rtsrmp_can_edit_submission(submission_id))
with check (public.rtsrmp_can_edit_submission(submission_id));
create policy rtsrmp_requirements_delete on public.rtsrmp_requirements for delete to authenticated
using (public.rtsrmp_can_edit_submission(submission_id));

create policy rtsrmp_documents_read on public.rtsrmp_documents for select to authenticated
using (public.rtsrmp_can_access(company_id, location_id) and public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_documents_insert on public.rtsrmp_documents for insert to authenticated
with check (
  public.rtsrmp_can_edit_submission(submission_id)
  and public.rtsrmp_can_access(company_id, location_id)
  and uploaded_by = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
);
create policy rtsrmp_documents_delete on public.rtsrmp_documents for delete to authenticated
using (public.rtsrmp_can_edit_submission(submission_id) or public.rtsrmp_is_super_admin());

create policy rtsrmp_logs_read on public.rtsrmp_verification_logs for select to authenticated
using (public.rtsrmp_can_view_submission(submission_id));
create policy rtsrmp_logs_admin_insert on public.rtsrmp_verification_logs for insert to authenticated
with check (
  public.rtsrmp_is_super_admin()
  and verifier_id = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
);

create policy rtsrmp_history_read on public.rtsrmp_rate_history for select to authenticated
using (public.rtsrmp_can_access(company_id, location_id));

create or replace function public.rtsrmp_submit_submission(submission_key uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  submission public.rtsrmp_stipend_rates%rowtype;
  profile record;
  logged_action text;
begin
  select * into profile from public.rtsrmp_current_profile();
  if profile.role is distinct from 'COMPANY_HR' or profile.company_id is null or profile.location_id is null then
    raise exception 'Not authorized to submit RTSRMP data' using errcode = '42501';
  end if;

  select * into submission
  from public.rtsrmp_stipend_rates r
  where r.id = submission_key
    and r.company_id = profile.company_id
    and r.location_id = profile.location_id
  for update;
  if not found or submission.status not in ('DRAFT', 'CORRECTION_REQUIRED') then
    raise exception 'Submission is not available for submission' using errcode = '22023';
  end if;
  if submission.stipend_rate < 0 or submission.scheme = '' or submission.qualification = '' then
    raise exception 'Submission has invalid required fields' using errcode = '22023';
  end if;

  logged_action := case when submission.status = 'CORRECTION_REQUIRED' then 'RESUBMITTED' else 'SUBMITTED' end;
  update public.rtsrmp_stipend_rates
  set status = 'SUBMITTED', submitted_at = now(), updated_at = now()
  where id = submission_key;
  insert into public.rtsrmp_verification_logs (submission_id, verifier_id, action, remarks)
  values (submission_key, coalesce(profile.profile_id, auth.uid()::text), logged_action, submission.remarks);
  return submission_key;
end
$$;

create or replace function public.rtsrmp_review_submission(submission_key uuid, review_action text, review_note text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  submission public.rtsrmp_stipend_rates%rowtype;
  profile record;
  next_status text;
begin
  select * into profile from public.rtsrmp_current_profile();
  if profile.role is distinct from 'SUPER_ADMIN' then
    raise exception 'Not authorized to review RTSRMP data' using errcode = '42501';
  end if;

  if review_action not in ('UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED') then
    raise exception 'Invalid verification action' using errcode = '22023';
  end if;
  if review_action in ('REJECTED', 'CORRECTION_REQUIRED') and nullif(trim(review_note), '') is null then
    raise exception 'Remarks are required for rejection or correction requests' using errcode = '22023';
  end if;

  select * into submission
  from public.rtsrmp_stipend_rates r
  where r.id = submission_key
  for update;
  if not found or submission.status not in ('SUBMITTED', 'UNDER_VERIFICATION') then
    raise exception 'Submission is not awaiting verification' using errcode = '22023';
  end if;

  next_status := review_action;
  update public.rtsrmp_stipend_rates
  set status = next_status,
      verified_at = case when review_action = 'UNDER_VERIFICATION' then verified_at else now() end,
      approved_by = case when review_action = 'APPROVED' then coalesce(profile.profile_id, auth.uid()::text) else approved_by end,
      approved_at = case when review_action = 'APPROVED' then now() else approved_at end,
      review_remarks = nullif(trim(review_note), ''),
      updated_by = coalesce(profile.profile_id, auth.uid()::text),
      updated_at = now()
  where id = submission_key;

  insert into public.rtsrmp_verification_logs (submission_id, verifier_id, action, remarks)
  values (submission_key, coalesce(profile.profile_id, auth.uid()::text), review_action, nullif(trim(review_note), ''));

  if review_action = 'APPROVED' then
    insert into public.rtsrmp_rate_history (
      submission_id, company_id, location_id, scheme, qualification, trade,
      stipend_rate, currency, effective_from, effective_to, status,
      approved_by, approved_at, change_reason
    ) values (
      submission.id, submission.company_id, submission.location_id, submission.scheme,
      submission.qualification, submission.trade, submission.stipend_rate,
      submission.currency, submission.effective_from, submission.effective_to, 'APPROVED',
      coalesce(profile.profile_id, auth.uid()::text), now(), nullif(trim(review_note), '')
    );
  end if;

  return submission_key;
end
$$;

create or replace function public.rtsrmp_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'rtsrmp_companies', 'rtsrmp_locations', 'rtsrmp_company_users',
    'rtsrmp_schemes', 'rtsrmp_qualifications', 'rtsrmp_stipend_rates',
    'rtsrmp_overtime', 'rtsrmp_benefits', 'rtsrmp_deductions',
    'rtsrmp_eligibility', 'rtsrmp_requirements'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.rtsrmp_set_updated_at()',
      target_table || '_updated_at', target_table
    );
  end loop;
end
$$;

grant select, insert, update, delete on
  public.rtsrmp_companies, public.rtsrmp_locations, public.rtsrmp_company_users,
  public.rtsrmp_schemes, public.rtsrmp_qualifications, public.rtsrmp_stipend_rates,
  public.rtsrmp_overtime, public.rtsrmp_benefits, public.rtsrmp_deductions,
  public.rtsrmp_eligibility, public.rtsrmp_requirements, public.rtsrmp_documents,
  public.rtsrmp_verification_logs, public.rtsrmp_rate_history
to authenticated;
grant execute on function public.rtsrmp_current_profile() to authenticated;
grant execute on function public.rtsrmp_is_super_admin() to authenticated;
grant execute on function public.rtsrmp_is_company_hr() to authenticated;
grant execute on function public.rtsrmp_can_access(text, text) to authenticated;
grant execute on function public.rtsrmp_can_view_submission(uuid) to authenticated;
grant execute on function public.rtsrmp_can_edit_submission(uuid) to authenticated;
grant execute on function public.rtsrmp_submit_submission(uuid) to authenticated;
grant execute on function public.rtsrmp_review_submission(uuid, text, text) to authenticated;
revoke all on function public.rtsrmp_current_profile() from public, anon;
revoke all on function public.rtsrmp_is_super_admin() from public, anon;
revoke all on function public.rtsrmp_is_company_hr() from public, anon;
revoke all on function public.rtsrmp_can_access(text, text) from public, anon;
revoke all on function public.rtsrmp_can_view_submission(uuid) from public, anon;
revoke all on function public.rtsrmp_can_edit_submission(uuid) from public, anon;
revoke all on function public.rtsrmp_submit_submission(uuid) from public, anon;
revoke all on function public.rtsrmp_review_submission(uuid, text, text) from public, anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rtsrmp-supporting-documents',
  'rtsrmp-supporting-documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy rtsrmp_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'rtsrmp-supporting-documents'
  and case
    when public.rtsrmp_is_super_admin() then true
    when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      (storage.foldername(name))[1] = (select p.company_id from public.rtsrmp_current_profile() p)
      and (storage.foldername(name))[2] = (select p.location_id from public.rtsrmp_current_profile() p)
      and public.rtsrmp_can_view_submission((storage.foldername(name))[3]::uuid)
    else false
  end
);

create policy rtsrmp_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'rtsrmp-supporting-documents'
  and public.rtsrmp_is_company_hr()
  and (storage.foldername(name))[1] = (select p.company_id from public.rtsrmp_current_profile() p)
  and (storage.foldername(name))[2] = (select p.location_id from public.rtsrmp_current_profile() p)
  and case
    when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.rtsrmp_can_edit_submission((storage.foldername(name))[3]::uuid)
    else false
  end
);

create policy rtsrmp_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'rtsrmp-supporting-documents'
  and public.rtsrmp_is_company_hr()
  and (storage.foldername(name))[1] = (select p.company_id from public.rtsrmp_current_profile() p)
  and (storage.foldername(name))[2] = (select p.location_id from public.rtsrmp_current_profile() p)
  and case
    when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.rtsrmp_can_edit_submission((storage.foldername(name))[3]::uuid)
    else false
  end
);
