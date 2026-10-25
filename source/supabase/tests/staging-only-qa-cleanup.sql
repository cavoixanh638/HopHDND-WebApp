-- REVIEW BEFORE USE. Explicitly purge only QA-prefixed synthetic records.
-- Removal of QA audit/locks is destructive: staging-only, after test evidence archived.
begin;
do $guard$
begin
 if exists(select 1 from public.hdnd_items where record_id like 'qa-supa-%'
   and display_code not like 'QA-NQ-%') then
     raise exception 'QA_RECORD_RENAMED; manual review required';
 end if;
end $guard$;
delete from public.hdnd_audit where record_id like 'qa-supa-%';
delete from public.hdnd_cell_locks where record_id like 'qa-supa-%';
delete from public.hdnd_items where record_id like 'qa-supa-%' and display_code like 'QA-NQ-%';
commit;
