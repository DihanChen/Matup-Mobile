-- 20260414_leagues_visibility_and_cover.sql
--
-- Ticket: T-20260414-10 — Mobile league edit screen
--
-- Adds two editable columns to public.leagues required by the new edit form:
--   * visibility           — "public" | "private" | "invite_only"
--   * cover_image_url      — optional URL to a user-selectable cover image
--
-- Also hardens the existing UPDATE RLS policy by adding an explicit WITH CHECK
-- clause so users cannot UPDATE a row into one they don't own. The existing
-- USING qualifier ("creator_id = auth.uid()") is preserved verbatim.

alter table public.leagues
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private', 'invite_only')),
  add column if not exists cover_image_url text;

drop policy if exists "Owner can update league" on public.leagues;
create policy "Owner can update league"
  on public.leagues
  for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
