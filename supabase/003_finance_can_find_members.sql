-- Lets people with the 'finance' role look up members, so they can issue giving receipts.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

drop policy if exists "Members see themselves; office sees all" on public.members;
create policy "Members see themselves; office sees all" on public.members
  for select to authenticated
  using (id = auth.uid() or public.has_role(array['admin', 'office', 'pastor', 'finance']));
