-- Christ Church Edmonton website: review feedback table.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
--
-- Anyone visiting the site can ADD a row. Nobody using the public key can READ,
-- change or delete rows. Read them in Table Editor > feedback (dashboard login).

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  page        text not null check (char_length(page) between 1 and 200),
  name        text not null check (char_length(name) between 1 and 120),
  department  text check (department is null or char_length(department) <= 120),
  message     text not null check (char_length(message) between 1 and 5000),
  url         text check (url is null or char_length(url) <= 500),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 400),
  status      text not null default 'new' check (status in ('new', 'in progress', 'done', 'declined')),
  notes       text
);

comment on table public.feedback is 'Feedback from the website review (Feedback button on every page).';

alter table public.feedback enable row level security;

-- The public site may insert, and only the reviewer-facing columns.
grant usage on schema public to anon;
grant insert (page, name, department, message, url, user_agent) on public.feedback to anon;

drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback"
  on public.feedback
  for insert
  to anon
  with check (status = 'new' and notes is null);

-- No select, update or delete policy for anon: the public key cannot read or change feedback.
