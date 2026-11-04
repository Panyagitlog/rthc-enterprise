begin;

alter table public.rtsrmp_stipend_rates
  add column if not exists submitted_by text,
  add column if not exists verified_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rtsrmp_rates_contact_format_check'
      and conrelid = 'public.rtsrmp_stipend_rates'::regclass
  ) then
    alter table public.rtsrmp_stipend_rates
      add constraint rtsrmp_rates_contact_format_check
      check (
        coordinator_contact is null
        or (
          coordinator_contact ~ '^[0-9+(). -]{7,20}$'
          and length(regexp_replace(coordinator_contact, '[^0-9]', '', 'g')) between 7 and 15
        )
      ) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_benefit_type_nonempty') then
    alter table public.rtsrmp_benefits add constraint rtsrmp_benefit_type_nonempty
      check (nullif(trim(benefit_type), '') is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_deduction_type_nonempty') then
    alter table public.rtsrmp_deductions add constraint rtsrmp_deduction_type_nonempty
      check (nullif(trim(deduction_type), '') is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_eligibility_criteria_object') then
    alter table public.rtsrmp_eligibility add constraint rtsrmp_eligibility_criteria_object
      check (jsonb_typeof(other_criteria) = 'object') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_requirement_scheme_nonempty') then
    alter table public.rtsrmp_requirements add constraint rtsrmp_requirement_scheme_nonempty
      check (nullif(trim(scheme), '') is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_document_file_valid') then
    alter table public.rtsrmp_documents add constraint rtsrmp_document_file_valid
      check (
        file_size is not null
        and file_size between 1 and 15728640
        and content_type is not null
        and content_type in (
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_applicable_overtime_rate_required') then
    alter table public.rtsrmp_overtime add constraint rtsrmp_applicable_overtime_rate_required
      check (not applicable or ot_rate is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rtsrmp_applicable_deduction_value_required') then
    alter table public.rtsrmp_deductions add constraint rtsrmp_applicable_deduction_value_required
      check (not applicable or amount is not null or percentage is not null) not valid;
  end if;
end
$$;

alter table public.rtsrmp_company_users
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists status text not null default 'ACTIVE';

alter table public.rtsrmp_rate_history
  add column if not exists submitted_by text,
  add column if not exists submitted_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists verified_at timestamptz,
  add column if not exists review_remarks text,
  add column if not exists document_refs jsonb not null default '[]'::jsonb,
  add column if not exists detail_snapshot jsonb not null default '{}'::jsonb;

update public.rtsrmp_stipend_rates
set submitted_by = created_by
where submitted_at is not null and submitted_by is null;

update public.rtsrmp_stipend_rates
set verified_by = approved_by
where verified_at is not null and verified_by is null;

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
  where upper(coalesce(to_jsonb(u)->>'status', '')) = 'ACTIVE'
    and (
      to_jsonb(u)->>'auth_user_id' = auth.uid()::text
      or (
        to_jsonb(u)->>'auth_user_id' is null
        and to_jsonb(u)->>'id' = auth.uid()::text
      )
    )
  order by (to_jsonb(u)->>'auth_user_id' = auth.uid()::text) desc
  limit 1
$$;

drop policy if exists rtsrmp_company_users_read on public.rtsrmp_company_users;
create policy rtsrmp_company_users_read on public.rtsrmp_company_users
for select to authenticated
using (
  public.rtsrmp_is_super_admin()
  or exists (
    select 1 from public.rtsrmp_current_profile() p
    where p.profile_id = rtsrmp_company_users.profile_id
  )
);
drop policy if exists rtsrmp_company_users_admin_write on public.rtsrmp_company_users;
drop policy if exists rtsrmp_company_users_admin_insert on public.rtsrmp_company_users;
drop policy if exists rtsrmp_company_users_admin_update on public.rtsrmp_company_users;
create policy rtsrmp_company_users_admin_insert on public.rtsrmp_company_users
for insert to authenticated
with check (public.rtsrmp_is_super_admin());
create policy rtsrmp_company_users_admin_update on public.rtsrmp_company_users
for update to authenticated
using (public.rtsrmp_is_super_admin())
with check (public.rtsrmp_is_super_admin());

create or replace function public.rtsrmp_sync_current_hr_reference()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  profile record;
  user_data jsonb;
  company_data jsonb;
  location_data jsonb;
begin
  select * into profile from public.rtsrmp_current_profile();
  if upper(coalesce(profile.role, '')) <> 'COMPANY_HR'
    or profile.company_id is null
    or profile.location_id is null then
    raise exception 'An active assigned COMPANY_HR profile is required' using errcode = '42501';
  end if;

  select to_jsonb(u) into user_data
  from public.users u
  where to_jsonb(u)->>'id' = profile.profile_id
    and upper(coalesce(to_jsonb(u)->>'status', '')) = 'ACTIVE';
  if user_data is null then
    raise exception 'Active company HR profile not found' using errcode = '42501';
  end if;

  select to_jsonb(c) into company_data
  from public.companies c
  where to_jsonb(c)->>'id' = profile.company_id;
  if company_data is null
    or upper(coalesce(company_data->>'status', 'ACTIVE')) <> 'ACTIVE'
    or nullif(company_data->>'company_name', '') is null then
    raise exception 'The assigned company is unavailable or inactive' using errcode = '22023';
  end if;

  select to_jsonb(l) into location_data
  from public.locations l
  where to_jsonb(l)->>'id' = profile.location_id
    and to_jsonb(l)->>'company_id' = profile.company_id;
  if location_data is null
    or upper(coalesce(location_data->>'status', 'ACTIVE')) <> 'ACTIVE'
    or nullif(location_data->>'location_name', '') is null then
    raise exception 'The assigned location is unavailable, inactive, or outside the assigned company' using errcode = '22023';
  end if;

  insert into public.rtsrmp_companies (company_id, company_name, company_code, status)
  values (
    profile.company_id,
    company_data->>'company_name',
    company_data->>'company_code',
    coalesce(company_data->>'status', 'ACTIVE')
  )
  on conflict (company_id) do update set
    company_name = excluded.company_name,
    company_code = excluded.company_code,
    status = excluded.status,
    updated_at = now();

  insert into public.rtsrmp_locations (
    location_id, company_id, location_name, location_code, city, state, status
  ) values (
    profile.location_id,
    profile.company_id,
    location_data->>'location_name',
    location_data->>'location_code',
    location_data->>'city',
    location_data->>'state',
    coalesce(location_data->>'status', 'ACTIVE')
  )
  on conflict (location_id) do update set
    company_id = excluded.company_id,
    location_name = excluded.location_name,
    location_code = excluded.location_code,
    city = excluded.city,
    state = excluded.state,
    status = excluded.status,
    updated_at = now();

  insert into public.rtsrmp_company_users (
    profile_id, auth_user_id, company_id, location_id, role, name, email, status
  ) values (
    profile.profile_id,
    auth.uid()::text,
    profile.company_id,
    profile.location_id,
    'COMPANY_HR',
    user_data->>'name',
    user_data->>'email',
    coalesce(user_data->>'status', 'ACTIVE')
  )
  on conflict (profile_id) do update set
    auth_user_id = excluded.auth_user_id,
    company_id = excluded.company_id,
    location_id = excluded.location_id,
    role = excluded.role,
    name = excluded.name,
    email = excluded.email,
    status = excluded.status,
    updated_at = now();
end
$$;

create or replace function public.rtsrmp_guard_submission_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  profile record;
begin
  select * into profile from public.rtsrmp_current_profile();
  if profile.profile_id is null then
    raise exception 'Active authenticated RTSRMP profile required' using errcode = '42501';
  end if;

  if upper(profile.role) = 'COMPANY_HR' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or old.company_id is distinct from profile.company_id
      or old.location_id is distinct from profile.location_id
      or new.company_id is distinct from old.company_id
      or new.location_id is distinct from old.location_id
      or new.created_by is distinct from old.created_by
      or new.updated_by is distinct from profile.profile_id
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.review_remarks is distinct from old.review_remarks then
      raise exception 'Company HR cannot change ownership or verification fields' using errcode = '42501';
    end if;

    if new.status = old.status and old.status in ('DRAFT', 'CORRECTION_REQUIRED') then
      if new.submitted_at is distinct from old.submitted_at
        or new.submitted_by is distinct from old.submitted_by then
        raise exception 'Company HR cannot change submission metadata' using errcode = '42501';
      end if;
    elsif old.status in ('DRAFT', 'CORRECTION_REQUIRED') and new.status = 'SUBMITTED' then
      if (to_jsonb(new) - array['status', 'submitted_at', 'submitted_by', 'updated_at', 'updated_by'])
        is distinct from
         (to_jsonb(old) - array['status', 'submitted_at', 'submitted_by', 'updated_at', 'updated_by'])
        or new.submitted_by is distinct from profile.profile_id then
        raise exception 'Invalid submission transition' using errcode = '42501';
      end if;
    else
      raise exception 'Invalid company HR submission transition' using errcode = '42501';
    end if;
    return new;
  end if;

  if upper(profile.role) = 'SUPER_ADMIN' then
    if old.status not in ('SUBMITTED', 'UNDER_VERIFICATION')
      or new.status not in ('UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED')
      or (to_jsonb(new) - array['status', 'verified_at', 'verified_by', 'approved_by', 'approved_at', 'review_remarks', 'updated_at', 'updated_by'])
        is distinct from
         (to_jsonb(old) - array['status', 'verified_at', 'verified_by', 'approved_by', 'approved_at', 'review_remarks', 'updated_at', 'updated_by'])
      or new.updated_by is distinct from profile.profile_id then
      raise exception 'Invalid administrator review transition' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update RTSRMP submissions' using errcode = '42501';
end
$$;

create or replace function public.rtsrmp_guard_submission_insert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  profile record;
begin
  select * into profile from public.rtsrmp_current_profile();
  if upper(coalesce(profile.role, '')) <> 'COMPANY_HR'
    or profile.profile_id is null
    or new.company_id is distinct from profile.company_id
    or new.location_id is distinct from profile.location_id
    or new.created_by is distinct from profile.profile_id
    or new.status <> 'DRAFT'
    or new.submitted_at is not null
    or new.submitted_by is not null
    or new.verified_at is not null
    or new.verified_by is not null
    or new.approved_by is not null
    or new.approved_at is not null
    or new.review_remarks is not null then
    raise exception 'Invalid company HR draft ownership or initial status' using errcode = '42501';
  end if;
  new.created_at := now();
  new.updated_at := now();
  new.updated_by := profile.profile_id;
  return new;
end
$$;

drop trigger if exists rtsrmp_stipend_rates_guard_insert on public.rtsrmp_stipend_rates;
create trigger rtsrmp_stipend_rates_guard_insert
before insert on public.rtsrmp_stipend_rates
for each row execute function public.rtsrmp_guard_submission_insert();

drop trigger if exists rtsrmp_stipend_rates_guard_update on public.rtsrmp_stipend_rates;
create trigger rtsrmp_stipend_rates_guard_update
before update on public.rtsrmp_stipend_rates
for each row execute function public.rtsrmp_guard_submission_update();

drop policy if exists rtsrmp_rates_update on public.rtsrmp_stipend_rates;
create policy rtsrmp_rates_update on public.rtsrmp_stipend_rates
for update to authenticated
using (
  public.rtsrmp_is_company_hr()
  and public.rtsrmp_can_access(company_id, location_id)
  and status in ('DRAFT', 'CORRECTION_REQUIRED')
)
with check (
  public.rtsrmp_is_company_hr()
  and public.rtsrmp_can_access(company_id, location_id)
  and status in ('DRAFT', 'CORRECTION_REQUIRED')
);

drop policy if exists rtsrmp_rates_delete on public.rtsrmp_stipend_rates;
drop policy if exists rtsrmp_rates_insert on public.rtsrmp_stipend_rates;
create policy rtsrmp_rates_insert on public.rtsrmp_stipend_rates
for insert to authenticated
with check (
  public.rtsrmp_is_company_hr()
  and public.rtsrmp_can_access(company_id, location_id)
  and status = 'DRAFT'
  and created_by = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
  and updated_by = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
  and submitted_at is null
  and submitted_by is null
  and verified_at is null
  and verified_by is null
  and approved_by is null
  and approved_at is null
  and review_remarks is null
);

drop policy if exists rtsrmp_logs_admin_insert on public.rtsrmp_verification_logs;

drop policy if exists rtsrmp_documents_delete on public.rtsrmp_documents;
drop policy if exists rtsrmp_overtime_admin_delete on public.rtsrmp_overtime;

drop policy if exists rtsrmp_documents_insert on public.rtsrmp_documents;
create policy rtsrmp_documents_insert on public.rtsrmp_documents
for insert to authenticated
with check (
  public.rtsrmp_can_edit_submission(submission_id)
  and public.rtsrmp_can_access(company_id, location_id)
  and uploaded_by = coalesce((select p.profile_id from public.rtsrmp_current_profile() p), auth.uid()::text)
  and left(storage_path, length(company_id || '/' || location_id || '/' || submission_id::text || '/'))
    = company_id || '/' || location_id || '/' || submission_id::text || '/'
);

drop policy if exists rtsrmp_storage_insert on storage.objects;
create policy rtsrmp_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'rtsrmp-supporting-documents'
  and public.rtsrmp_is_company_hr()
  and (storage.foldername(name))[1] = (select p.company_id from public.rtsrmp_current_profile() p)
  and (storage.foldername(name))[2] = (select p.location_id from public.rtsrmp_current_profile() p)
  and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.rtsrmp_can_edit_submission((storage.foldername(name))[3]::uuid)
);

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
  if upper(coalesce(profile.role, '')) <> 'COMPANY_HR'
    or profile.company_id is null
    or profile.location_id is null then
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
  if nullif(trim(submission.scheme), '') is null
    or nullif(trim(submission.qualification), '') is null
    or submission.stipend_rate < 0
    or submission.effective_from is null
    or (submission.effective_to is not null and submission.effective_to < submission.effective_from)
    or nullif(trim(submission.payment_frequency), '') is null
    or nullif(trim(submission.currency), '') is null
    or not exists (
      select 1 from public.rtsrmp_requirements q where q.submission_id = submission_key
    )
    or exists (
      select 1 from public.rtsrmp_overtime o
      where o.submission_id = submission_key and o.applicable and o.ot_rate is null
    )
    or exists (
      select 1 from public.rtsrmp_deductions d
      where d.submission_id = submission_key
        and (nullif(trim(d.deduction_type), '') is null
          or (d.applicable and d.amount is null and d.percentage is null))
    ) then
    raise exception 'Submission is missing valid required rate or company requirement data' using errcode = '22023';
  end if;

  logged_action := case when submission.status = 'CORRECTION_REQUIRED' then 'RESUBMITTED' else 'SUBMITTED' end;
  update public.rtsrmp_stipend_rates
  set status = 'SUBMITTED',
      submitted_at = now(),
      submitted_by = profile.profile_id,
      updated_by = profile.profile_id,
      updated_at = now()
  where id = submission_key;

  insert into public.rtsrmp_verification_logs (submission_id, verifier_id, action, remarks)
  values (submission_key, profile.profile_id, logged_action, submission.remarks);
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
begin
  select * into profile from public.rtsrmp_current_profile();
  if upper(coalesce(profile.role, '')) <> 'SUPER_ADMIN' then
    raise exception 'Not authorized to review RTSRMP data' using errcode = '42501';
  end if;

  if review_action is null or review_action not in ('UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED') then
    raise exception 'Invalid verification action' using errcode = '22023';
  end if;
  if review_action in ('REJECTED', 'CORRECTION_REQUIRED') and nullif(trim(review_note), '') is null then
    raise exception 'Remarks are required for rejection or correction requests' using errcode = '22023';
  end if;

  select * into submission
  from public.rtsrmp_stipend_rates r
  where r.id = submission_key
  for update;
  if not found
    or submission.status not in ('SUBMITTED', 'UNDER_VERIFICATION')
    or (submission.status = 'UNDER_VERIFICATION' and review_action = 'UNDER_VERIFICATION') then
    raise exception 'Submission is not awaiting verification' using errcode = '22023';
  end if;

  update public.rtsrmp_stipend_rates
  set status = review_action,
      verified_at = now(),
      verified_by = profile.profile_id,
      approved_by = case when review_action = 'APPROVED' then profile.profile_id else approved_by end,
      approved_at = case when review_action = 'APPROVED' then now() else approved_at end,
      review_remarks = nullif(trim(review_note), ''),
      updated_by = profile.profile_id,
      updated_at = now()
  where id = submission_key;

  insert into public.rtsrmp_verification_logs (submission_id, verifier_id, action, remarks)
  values (submission_key, profile.profile_id, review_action, nullif(trim(review_note), ''));

  if review_action = 'APPROVED' then
    insert into public.rtsrmp_rate_history (
      submission_id, company_id, location_id, scheme, qualification, trade,
      stipend_rate, currency, effective_from, effective_to, status,
      approved_by, approved_at, change_reason, submitted_by, submitted_at,
      verified_by, verified_at, review_remarks, document_refs, detail_snapshot
    ) values (
      submission.id, submission.company_id, submission.location_id, submission.scheme,
      submission.qualification, submission.trade, submission.stipend_rate,
      submission.currency, submission.effective_from, submission.effective_to, 'APPROVED',
      profile.profile_id, now(), nullif(trim(review_note), ''),
      submission.submitted_by, submission.submitted_at, profile.profile_id, now(),
      nullif(trim(review_note), ''),
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', d.id,
          'document_type', d.document_type,
          'file_name', d.file_name,
          'storage_path', d.storage_path,
          'content_type', d.content_type,
          'file_size', d.file_size,
          'uploaded_by', d.uploaded_by,
          'created_at', d.created_at
        ) order by d.created_at)
        from public.rtsrmp_documents d where d.submission_id = submission_key
      ), '[]'::jsonb),
      jsonb_build_object(
        'overtime', coalesce((select to_jsonb(o) from public.rtsrmp_overtime o where o.submission_id = submission_key), 'null'::jsonb),
        'benefits', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at) from public.rtsrmp_benefits b where b.submission_id = submission_key), '[]'::jsonb),
        'deductions', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from public.rtsrmp_deductions d where d.submission_id = submission_key), '[]'::jsonb),
        'eligibility', coalesce((select to_jsonb(e) from public.rtsrmp_eligibility e where e.submission_id = submission_key), 'null'::jsonb),
        'requirements', coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at) from public.rtsrmp_requirements q where q.submission_id = submission_key), '[]'::jsonb)
      )
    );
  end if;

  return submission_key;
end
$$;

revoke all on function public.rtsrmp_guard_submission_update() from public, anon;
revoke all on function public.rtsrmp_guard_submission_update() from authenticated;
revoke all on function public.rtsrmp_guard_submission_insert() from public, anon;
revoke all on function public.rtsrmp_guard_submission_insert() from authenticated;
grant execute on function public.rtsrmp_sync_current_hr_reference() to authenticated;
revoke all on function public.rtsrmp_sync_current_hr_reference() from public, anon;
grant execute on function public.rtsrmp_submit_submission(uuid) to authenticated;
grant execute on function public.rtsrmp_review_submission(uuid, text, text) to authenticated;
revoke all on function public.rtsrmp_submit_submission(uuid) from public, anon;
revoke all on function public.rtsrmp_review_submission(uuid, text, text) from public, anon;

commit;
