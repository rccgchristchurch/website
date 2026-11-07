-- =====================================================================
-- RCCG Christ Church Edmonton website: full database
-- Run once in Supabase: SQL Editor > New query > paste ALL of this > Run.
-- Safe to run again: everything uses "if not exists" / "or replace".
-- Requires 001_feedback.sql to have been run first (it has).
--
-- What it creates
--   1. Staff roles ......... who may read what (admin, office, pastor, finance, ministry lead)
--   2. Form types .......... the 15 website forms and which are confidential
--   3. Form submissions .... every Connect-hub form, Membership and event registration
--   4. Business directory .. Christian Business listings (shown only once approved)
--   5. Newsletter .......... email sign-ups from the home page
--   6. Members ............. member portal profiles, created when someone signs up
--   7. Household members ... family members a member adds in the portal
--   8. Serving units ....... the 12 church units and 6 fellowships
--   9. Member units ........ which units/fellowships each member belongs to
--  10. Giving receipts ..... annual tax receipts, PDFs in a private storage bucket
--  11. Feedback ............ staff access added to the existing table
--
-- The public website key (anon) can only ADD form rows, sign-ups and listings.
-- It can never read submissions. Members signed in to the portal see only their
-- own profile, family, teams and receipts. Staff see what their role allows.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. Staff roles
-- ---------------------------------------------------------------------
create table if not exists public.staff_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'office', 'pastor', 'finance', 'ministry_lead')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
comment on table public.staff_roles is 'Which signed-in users are staff, and in what role.';

create or replace function public.has_role(roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role = any (roles)
  );
$$;
revoke all on function public.has_role(text[]) from public;
grant execute on function public.has_role(text[]) to anon, authenticated;

alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;
grant insert, delete on public.staff_roles to authenticated;

drop policy if exists "See own roles; admins see all" on public.staff_roles;
create policy "See own roles; admins see all" on public.staff_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(array['admin']));

drop policy if exists "Admins grant roles" on public.staff_roles;
create policy "Admins grant roles" on public.staff_roles
  for insert to authenticated with check (public.has_role(array['admin']));

drop policy if exists "Admins remove roles" on public.staff_roles;
create policy "Admins remove roles" on public.staff_roles
  for delete to authenticated using (public.has_role(array['admin']));


-- ---------------------------------------------------------------------
-- 2. Form types (the list of website forms)
-- ---------------------------------------------------------------------
create table if not exists public.form_types (
  code         text primary key,
  confidential boolean not null default false,  -- only pastors and admins can read these
  notify_email text,                            -- who should be told about new ones (used later)
  active       boolean not null default true
);
comment on table public.form_types is 'Every form on the website. confidential = pastors and admins only.';

insert into public.form_types (code, confidential, notify_email) values
  ('Contact Us',           false, 'info@rccgchristchurch.ca'),
  ('Join a Ministry',      false, 'info@rccgchristchurch.ca'),
  ('Register a Child',     false, 'info@rccgchristchurch.ca'),
  ('First Timer',          false, 'welcome@rccgchristchurch.ca'),
  ('New Believer',         true,  'info@rccgchristchurch.ca'),
  ('Prayer Request',       true,  'prayer@rccgchristchurch.ca'),
  ('Ask Pastor',           true,  'info@rccgchristchurch.ca'),
  ('Pastoral Care',        true,  'info@rccgchristchurch.ca'),
  ('Room Booking',         false, 'info@rccgchristchurch.ca'),
  ('Join Workforce',       false, 'info@rccgchristchurch.ca'),
  ('Baby Dedication',      false, 'info@rccgchristchurch.ca'),
  ('Special Thanksgiving', false, 'info@rccgchristchurch.ca'),
  ('Praise Report',        false, 'info@rccgchristchurch.ca'),
  ('Membership',           false, 'info@rccgchristchurch.ca'),
  ('Event Registration',   false, 'info@rccgchristchurch.ca')
on conflict (code) do nothing;

alter table public.form_types enable row level security;
revoke all on public.form_types from anon, authenticated;
grant select on public.form_types to anon, authenticated;
grant insert, update on public.form_types to authenticated;

drop policy if exists "Anyone can list active forms" on public.form_types;
create policy "Anyone can list active forms" on public.form_types
  for select to anon, authenticated using (active or public.has_role(array['admin']));

drop policy if exists "Admins manage forms" on public.form_types;
create policy "Admins manage forms" on public.form_types
  for all to authenticated
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));


-- ---------------------------------------------------------------------
-- 3. Form submissions (all Connect-hub forms, Membership, event registration)
-- ---------------------------------------------------------------------
create table if not exists public.form_submissions (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  form_type     text not null references public.form_types (code),
  name          text check (name is null or char_length(name) <= 200),
  email         text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone         text check (phone is null or char_length(phone) <= 40),
  answers       jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 20000),
  page_url      text check (page_url is null or char_length(page_url) <= 500),
  user_agent    text check (user_agent is null or char_length(user_agent) <= 400),
  submitted_by  uuid references auth.users (id) on delete set null,  -- set when a signed-in member submits
  confidential  boolean not null default false,                      -- copied from form_types
  status        text not null default 'new' check (status in ('new', 'in progress', 'done', 'declined', 'spam')),
  assigned_to   text,
  notes         text,
  handled_at    timestamptz
);
comment on table public.form_submissions is 'Every form sent from the website. The form''s own fields are in answers.';

create index if not exists form_submissions_type_created on public.form_submissions (form_type, created_at desc);
create index if not exists form_submissions_status on public.form_submissions (status) where status in ('new', 'in progress');

-- Stamp confidentiality, sender and a clean status on every new row, whatever the browser sent.
create or replace function public.form_submissions_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.confidential := coalesce((select ft.confidential from public.form_types ft where ft.code = new.form_type), true);
  new.submitted_by := auth.uid();
  new.status := 'new';
  new.assigned_to := null;
  new.notes := null;
  new.handled_at := null;
  return new;
end;
$$;
drop trigger if exists form_submissions_before_insert on public.form_submissions;
create trigger form_submissions_before_insert
  before insert on public.form_submissions
  for each row execute function public.form_submissions_before_insert();

alter table public.form_submissions enable row level security;
revoke all on public.form_submissions from anon, authenticated;
grant insert (form_type, name, email, phone, answers, page_url, user_agent) on public.form_submissions to anon, authenticated;
grant select on public.form_submissions to authenticated;
grant update (status, assigned_to, notes, handled_at) on public.form_submissions to authenticated;

drop policy if exists "Anyone can send a form" on public.form_submissions;
create policy "Anyone can send a form" on public.form_submissions
  for insert to anon, authenticated
  with check (exists (select 1 from public.form_types ft where ft.code = form_type and ft.active));

drop policy if exists "Staff read submissions" on public.form_submissions;
create policy "Staff read submissions" on public.form_submissions
  for select to authenticated
  using (
    (not confidential and public.has_role(array['admin', 'office', 'pastor']))
    or (confidential and public.has_role(array['admin', 'pastor']))
  );

drop policy if exists "Staff update submissions" on public.form_submissions;
create policy "Staff update submissions" on public.form_submissions
  for update to authenticated
  using (
    (not confidential and public.has_role(array['admin', 'office', 'pastor']))
    or (confidential and public.has_role(array['admin', 'pastor']))
  )
  with check (true);


-- ---------------------------------------------------------------------
-- 4. Christian Business directory
-- ---------------------------------------------------------------------
create table if not exists public.business_directory (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  business_name text not null check (char_length(business_name) between 1 and 200),
  category      text check (category is null or char_length(category) <= 100),
  owner_name    text check (owner_name is null or char_length(owner_name) <= 200),
  email         text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone         text check (phone is null or char_length(phone) <= 40),
  website       text check (website is null or char_length(website) <= 300),
  description   text check (description is null or char_length(description) <= 2000),
  approved      boolean not null default false,
  approved_at   timestamptz,
  submitted_by  uuid references auth.users (id) on delete set null
);
comment on table public.business_directory is 'Christian Business listings. Shown on the site only after approval.';

create or replace function public.business_directory_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.approved := false;
  new.approved_at := null;
  new.submitted_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists business_directory_before_insert on public.business_directory;
create trigger business_directory_before_insert
  before insert on public.business_directory
  for each row execute function public.business_directory_before_insert();

drop trigger if exists business_directory_touch on public.business_directory;
create trigger business_directory_touch
  before update on public.business_directory
  for each row execute function public.touch_updated_at();

alter table public.business_directory enable row level security;
revoke all on public.business_directory from anon, authenticated;
grant select on public.business_directory to anon, authenticated;
grant insert (business_name, category, owner_name, email, phone, website, description) on public.business_directory to anon, authenticated;
grant update, delete on public.business_directory to authenticated;

drop policy if exists "Anyone can see approved listings" on public.business_directory;
create policy "Anyone can see approved listings" on public.business_directory
  for select to anon, authenticated
  using (approved or public.has_role(array['admin', 'office']));

drop policy if exists "Anyone can submit a listing" on public.business_directory;
create policy "Anyone can submit a listing" on public.business_directory
  for insert to anon, authenticated with check (true);

drop policy if exists "Office approves and edits listings" on public.business_directory;
create policy "Office approves and edits listings" on public.business_directory
  for update to authenticated
  using (public.has_role(array['admin', 'office'])) with check (public.has_role(array['admin', 'office']));

drop policy if exists "Office removes listings" on public.business_directory;
create policy "Office removes listings" on public.business_directory
  for delete to authenticated using (public.has_role(array['admin', 'office']));


-- ---------------------------------------------------------------------
-- 5. Newsletter sign-ups
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  email           text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name            text check (name is null or char_length(name) <= 200),
  source          text check (source is null or char_length(source) <= 100),
  unsubscribed_at timestamptz
);
create unique index if not exists newsletter_subscribers_email_unique on public.newsletter_subscribers (lower(email));
comment on table public.newsletter_subscribers is 'Home-page newsletter sign-ups. A repeat sign-up of the same email is rejected as a duplicate.';

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert (email, name, source) on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "Office manages subscribers" on public.newsletter_subscribers;
create policy "Office manages subscribers" on public.newsletter_subscribers
  for all to authenticated
  using (public.has_role(array['admin', 'office'])) with check (public.has_role(array['admin', 'office']));


-- ---------------------------------------------------------------------
-- 6. Members (member portal profiles)
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id             uuid primary key references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  first_name     text check (first_name is null or char_length(first_name) <= 100),
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 100),
  last_name      text check (last_name is null or char_length(last_name) <= 100),
  email          text check (email is null or char_length(email) <= 254),
  phone          text check (phone is null or char_length(phone) <= 40),
  address        text check (address is null or char_length(address) <= 300),
  birthday       date,
  member_since   date,            -- first day of the month they joined
  gender         text check (gender is null or char_length(gender) <= 40),
  membership_status text not null default 'pending'
                   check (membership_status in ('pending', 'member', 'inactive')),  -- set by the office
  notes          text             -- office-only notes, not shown to the member
);
comment on table public.members is 'One row per portal account. The member edits their own details; the office confirms membership.';

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

-- Create the member row automatically when someone signs up in the portal.
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.members (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_member();

alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
grant insert (id, first_name, preferred_name, last_name, email, phone, address, birthday, member_since, gender) on public.members to authenticated;
grant update (first_name, preferred_name, last_name, email, phone, address, birthday, member_since, gender) on public.members to authenticated;
grant update (membership_status, notes) on public.members to authenticated;  -- policy below limits this to the office
grant delete on public.members to authenticated;

drop policy if exists "Members see themselves; office sees all" on public.members;
create policy "Members see themselves; office sees all" on public.members
  for select to authenticated
  using (id = auth.uid() or public.has_role(array['admin', 'office', 'pastor']));

drop policy if exists "Members create their own row" on public.members;
create policy "Members create their own row" on public.members
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "Members edit themselves; office edits all" on public.members;
create policy "Members edit themselves; office edits all" on public.members
  for update to authenticated
  using (id = auth.uid() or public.has_role(array['admin', 'office']))
  with check (id = auth.uid() or public.has_role(array['admin', 'office']));

drop policy if exists "Admins remove members" on public.members;
create policy "Admins remove members" on public.members
  for delete to authenticated using (public.has_role(array['admin']));

-- A member may not change their own membership status or office notes.
create or replace function public.members_guard_office_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_role(array['admin', 'office']) then
    new.membership_status := old.membership_status;
    new.notes := old.notes;
  end if;
  return new;
end;
$$;
drop trigger if exists members_guard_office_fields on public.members;
create trigger members_guard_office_fields before update on public.members
  for each row execute function public.members_guard_office_fields();


-- ---------------------------------------------------------------------
-- 7. Household members
-- ---------------------------------------------------------------------
create table if not exists public.household_members (
  id           bigint generated always as identity primary key,
  member_id    uuid not null references public.members (id) on delete cascade,
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 200),
  relationship text check (relationship is null or char_length(relationship) <= 60),
  birthday     date
);
create index if not exists household_members_member on public.household_members (member_id);

alter table public.household_members enable row level security;
revoke all on public.household_members from anon, authenticated;
grant select, insert, update, delete on public.household_members to authenticated;

drop policy if exists "Members manage their household" on public.household_members;
create policy "Members manage their household" on public.household_members
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists "Office sees households" on public.household_members;
create policy "Office sees households" on public.household_members
  for select to authenticated using (public.has_role(array['admin', 'office', 'pastor']));


-- ---------------------------------------------------------------------
-- 8. Serving units and fellowships
-- ---------------------------------------------------------------------
create table if not exists public.serving_units (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  kind       text not null check (kind in ('unit', 'fellowship')),
  email      text,
  sort_order int not null default 0,
  active     boolean not null default true
);

insert into public.serving_units (name, kind, email, sort_order) values
  ('Prayer',                       'unit',       'prayer@rccgchristchurch.ca',      1),
  ('Choir · Living Stone Voices',  'unit',       'choir@rccgchristchurch.ca',       2),
  ('Evangelism',                   'unit',       'info@rccgchristchurch.ca',        3),
  ('Welcome',                      'unit',       'welcome@rccgchristchurch.ca',     4),
  ('Media',                        'unit',       'media@rccgchristchurch.ca',       5),
  ('Drama',                        'unit',       'info@rccgchristchurch.ca',        6),
  ('Hospitality',                  'unit',       'hospitality@rccgchristchurch.ca', 7),
  ('Sanctuary Keepers',            'unit',       'sanctuary@rccgchristchurch.ca',   8),
  ('Ushering',                     'unit',       'info@rccgchristchurch.ca',        9),
  ('Sunday School',                'unit',       'info@rccgchristchurch.ca',       10),
  ('Transportation',               'unit',       'info@rccgchristchurch.ca',       11),
  ('Beautification',               'unit',       'info@rccgchristchurch.ca',       12),
  ('Men of Impact',                'fellowship', null,                             21),
  ('Women of Zion',                'fellowship', null,                             22),
  ('Couples',                      'fellowship', null,                             23),
  ('Christ Church Seniors',        'fellowship', null,                             24),
  ('Lighthouse (young adults)',    'fellowship', null,                             25),
  ('House Fellowship',             'fellowship', null,                             26)
on conflict (name) do nothing;

alter table public.serving_units enable row level security;
revoke all on public.serving_units from anon, authenticated;
grant select on public.serving_units to anon, authenticated;
grant insert, update, delete on public.serving_units to authenticated;

drop policy if exists "Anyone can list units" on public.serving_units;
create policy "Anyone can list units" on public.serving_units
  for select to anon, authenticated using (active or public.has_role(array['admin', 'office']));

drop policy if exists "Office manages units" on public.serving_units;
create policy "Office manages units" on public.serving_units
  for all to authenticated
  using (public.has_role(array['admin', 'office'])) with check (public.has_role(array['admin', 'office']));


-- ---------------------------------------------------------------------
-- 9. Which units / fellowships each member belongs to
--    (the portal recommends at most two serving units; it warns, it does not block)
-- ---------------------------------------------------------------------
create table if not exists public.member_units (
  member_id uuid   not null references public.members (id) on delete cascade,
  unit_id   bigint not null references public.serving_units (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (member_id, unit_id)
);
create index if not exists member_units_unit on public.member_units (unit_id);

alter table public.member_units enable row level security;
revoke all on public.member_units from anon, authenticated;
grant select, insert, delete on public.member_units to authenticated;

drop policy if exists "Members manage their teams" on public.member_units;
create policy "Members manage their teams" on public.member_units
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists "Leaders and office see teams" on public.member_units;
create policy "Leaders and office see teams" on public.member_units
  for select to authenticated using (public.has_role(array['admin', 'office', 'pastor', 'ministry_lead']));


-- ---------------------------------------------------------------------
-- 10. Giving receipts (official tax receipts; PDFs in private storage)
-- ---------------------------------------------------------------------
create table if not exists public.giving_receipts (
  id             bigint generated always as identity primary key,
  member_id      uuid not null references public.members (id) on delete cascade,
  tax_year       int  not null check (tax_year between 2000 and 2100),
  amount_cents   bigint not null check (amount_cents >= 0),
  receipt_number text unique,
  file_path      text,   -- path inside the 'receipts' bucket, e.g. '<member id>/2025.pdf'
  issued_at      timestamptz not null default now(),
  unique (member_id, tax_year)
);
comment on table public.giving_receipts is 'One official receipt per member per tax year. Issued by finance.';

alter table public.giving_receipts enable row level security;
revoke all on public.giving_receipts from anon, authenticated;
grant select, insert, update, delete on public.giving_receipts to authenticated;

drop policy if exists "Members see their receipts" on public.giving_receipts;
create policy "Members see their receipts" on public.giving_receipts
  for select to authenticated using (member_id = auth.uid() or public.has_role(array['admin', 'finance']));

drop policy if exists "Finance issues receipts" on public.giving_receipts;
create policy "Finance issues receipts" on public.giving_receipts
  for insert to authenticated with check (public.has_role(array['admin', 'finance']));

drop policy if exists "Finance corrects receipts" on public.giving_receipts;
create policy "Finance corrects receipts" on public.giving_receipts
  for update to authenticated
  using (public.has_role(array['admin', 'finance'])) with check (public.has_role(array['admin', 'finance']));

drop policy if exists "Finance removes receipts" on public.giving_receipts;
create policy "Finance removes receipts" on public.giving_receipts
  for delete to authenticated using (public.has_role(array['admin', 'finance']));

-- Private bucket for the receipt PDFs. Each member's files live in a folder named with their id.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Members download their own receipts" on storage.objects;
create policy "Members download their own receipts" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(array['admin', 'finance']))
  );

drop policy if exists "Finance uploads receipts" on storage.objects;
create policy "Finance uploads receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and public.has_role(array['admin', 'finance']));

drop policy if exists "Finance replaces receipts" on storage.objects;
create policy "Finance replaces receipts" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and public.has_role(array['admin', 'finance']));

drop policy if exists "Finance deletes receipts" on storage.objects;
create policy "Finance deletes receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.has_role(array['admin', 'finance']));


-- ---------------------------------------------------------------------
-- 11. Feedback (table made by 001_feedback.sql): staff access
-- ---------------------------------------------------------------------
grant select on public.feedback to authenticated;
grant update (status, notes) on public.feedback to authenticated;

drop policy if exists "Admins read feedback" on public.feedback;
create policy "Admins read feedback" on public.feedback
  for select to authenticated using (public.has_role(array['admin', 'office']));

drop policy if exists "Admins triage feedback" on public.feedback;
create policy "Admins triage feedback" on public.feedback
  for update to authenticated
  using (public.has_role(array['admin', 'office'])) with check (true);


-- =====================================================================
-- AFTER YOU HAVE SIGNED UP IN THE MEMBER PORTAL (later, not now):
-- make yourself the first admin by running this one line on its own,
-- with your sign-up email. Until then, read everything in Table Editor.
--
--   insert into public.staff_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'precie2010.pd@gmail.com'
--   on conflict do nothing;
-- =====================================================================
