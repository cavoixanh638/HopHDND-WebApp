-- Release-only import gate, deliberately CLOSED by default.
-- DBA enables import in a separate, reviewed step after source backup/approval.
-- This migration creates no rows in hdnd_items.
begin;
create table if not exists hdnd_private.import_gate (
  id boolean primary key default true check(id),
  is_open boolean not null default false,
  last_digest text,
  imported_at timestamptz,
  imported_count integer
);
insert into hdnd_private.import_gate(id) values(true) on conflict do nothing;
revoke all on hdnd_private.import_gate from public,anon,authenticated;

create or replace function public.hdnd_import_once(p_rows jsonb,p_digest text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare g hdnd_private.import_gate%rowtype;
        row_data jsonb; doc jsonb; k text;
        fields text[]:=array['content','department','type','partyLevel',
          'progressParty','progressBuild','progressCouncil','specialist','room',
          'vpLeader','ubndLeader','specificProgress','note','documentKind','isDropped'];
        amount integer; imported integer:=0; v_record text; v_code text; v_stt integer;
begin
  if not hdnd_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0
    or jsonb_array_length(p_rows)>1000 then raise exception 'BAD_IMPORT_SIZE'; end if;
  if length(coalesce(p_digest,''))<>64 or p_digest !~ '^[a-fA-F0-9]{64}$'
    then raise exception 'BAD_SOURCE_DIGEST'; end if;
  -- lock the gate for this entire import transaction, including the empty check
  select * into g from hdnd_private.import_gate where id=true for update;
  if not g.is_open or g.imported_at is not null then raise exception 'IMPORT_GATE_CLOSED'; end if;
  select count(*) into amount from public.hdnd_items;
  if amount<>0 then raise exception 'DESTINATION_NOT_EMPTY'; end if;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(row_data)<>'object' then raise exception 'INVALID_IMPORT_ROW'; end if;
    v_record:=row_data->>'recordId';v_code:=row_data->>'displayCode';
    if v_record is null or v_record !~ '^[A-Za-z0-9_:-]{1,200}$'
      or v_code is null or length(v_code) not between 1 and 100
      or (row_data->>'stt') !~ '^[0-9]+$'
      then raise exception 'BAD_IMPORT_ID_OR_STT'; end if;
    v_stt:=(row_data->>'stt')::integer;
    if v_stt<1 then raise exception 'BAD_IMPORT_STT'; end if;
    doc:='{}'::jsonb;
    foreach k in array fields loop
      if not row_data ? k or not hdnd_private.valid_field(k,row_data->k)
        then raise exception 'BAD_IMPORT_FIELD: %',k; end if;
      doc:=doc || jsonb_build_object(k,row_data->k);
    end loop;
    -- A–O is authoritative. Preserve optional read-only source extension fields
    -- if present; they are never editable through hdnd_save_cell_changes.
    foreach k in array array['partyMeeting','examined'] loop
      if row_data ? k then
        if jsonb_typeof(row_data->k)<>'string' then raise exception 'BAD_IMPORT_EXTENSION'; end if;
        doc:=doc||jsonb_build_object(k,row_data->k);
      end if;
    end loop;
    insert into public.hdnd_items
      (record_id,display_code,stt,fields,revision,archived_at)
    values(v_record,v_code,v_stt,doc,1,
      case when nullif(row_data->>'archivedAt','') is not null then
        (row_data->>'archivedAt')::timestamptz else null end);
    imported:=imported+1;
  end loop;
  if imported<>jsonb_array_length(p_rows) then raise exception 'IMPORT_COUNT_MISMATCH'; end if;
  update hdnd_private.import_gate set is_open=false,last_digest=lower(p_digest),
    imported_at=clock_timestamp(),imported_count=imported where id=true;
  return jsonb_build_object('count',imported,'sourceDigest',lower(p_digest),
    'gateClosed',true,'confirmedAt',clock_timestamp());
end; $$;

revoke execute on function public.hdnd_import_once(jsonb,text) from public,anon,authenticated;
grant execute on function public.hdnd_import_once(jsonb,text) to authenticated;
commit;

-- ONLY AFTER explicit release GO, DBA may enable import in Supabase SQL Editor:
-- update hdnd_private.import_gate set is_open=true
-- where id=true and imported_at is null
--   and not exists(select 1 from public.hdnd_items);
-- Never enable this gate automatically from application code or GitHub CI.
