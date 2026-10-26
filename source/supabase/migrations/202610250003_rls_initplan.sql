-- Optimizes Supabase/PostgreSQL RLS auth context (per-statement, not per-row).
-- Safe for concurrently available Firebase + Supabase; Supabase staging only.
begin;
alter policy hdnd_items_read on public.hdnd_items using ((select auth.uid()) is not null);
alter policy hdnd_acl_read on public.hdnd_acl using ((select auth.uid()) is not null);
alter policy hdnd_profile_read on public.hdnd_profile using ((select auth.uid()) is not null);
alter policy hdnd_control_read on public.hdnd_control using ((select auth.uid()) is not null);
alter policy hdnd_audit_read on public.hdnd_audit using ((select auth.uid()) is not null);
alter policy hdnd_locks_self on public.hdnd_cell_locks using (owner_uid=(select auth.uid()));
commit;
