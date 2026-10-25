-- HopHDND / Supabase initial staging schema.
-- DO NOT apply to production without SUPABASE_RELEASE_GATE_2026-10-25.md.
-- Only a Supabase SQL migration owner runs this; never expose database secrets in Pages.

begin;

create schema if not exists hdnd_private;
revoke all on schema hdnd_private from public, anon, authenticated;
create table if not exists hdnd_private.admin_emails (email text primary key);
insert into hdnd_private.admin_emails(email) values ('cavoixanh638@gmail.com')
on conflict do nothing;

create table public.hdnd_items (
  record_id text primary key check(record_id ~ '^[A-Za-z0-9_:-]{1,200}$'),
  display_code text not null unique check(length(display_code) between 1 and 100),
  stt integer not null check(stt > 0),
  fields jsonb not null check(jsonb_typeof(fields) = 'object'),
  revision bigint not null default 1 check(revision > 0),
  archived_at timestamptz,
  operation_id uuid,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid
);
create index hdnd_items_sort_idx on public.hdnd_items(stt, record_id);
create table public.hdnd_acl (
  id boolean primary key default true check(id),
  revision bigint not null default 1 check(revision > 0),
  rights jsonb not null default '{"columns":{},"rows":{},"cells":{}}'::jsonb
);
insert into public.hdnd_acl(id) values(true) on conflict do nothing;
create table public.hdnd_profile (
  id boolean primary key default true check(id),
  revision bigint not null default 1 check(revision > 0),
  profile jsonb not null default '{}'::jsonb
);
insert into public.hdnd_profile(id) values(true) on conflict do nothing;
create table public.hdnd_control (
  id boolean primary key default true check(id),
  revision bigint not null default 1 check(revision > 0),
  guest_editing_locked boolean not null default true,
  mode text not null default 'OPEN' check(mode in ('OPEN','DRAINING','FROZEN')),
  epoch bigint not null default 0,
  changed_at timestamptz not null default clock_timestamp(),
  deadline timestamptz,
  closed_at timestamptz
);
insert into public.hdnd_control(id) values(true) on conflict do nothing;
create table public.hdnd_cell_locks (
  record_id text not null references public.hdnd_items(record_id) on delete restrict,
  field_key text not null,
  owner_uid uuid not null,
  session_id uuid not null,
  token uuid not null,
  kind text not null check(kind in ('status','search','short','multiline','long')),
  revision bigint not null check(revision > 0),
  acquired_at timestamptz not null,
  expires_at timestamptz not null,
  primary key(record_id,field_key)
);
create index hdnd_locks_owner_idx on public.hdnd_cell_locks(owner_uid,expires_at);
create table public.hdnd_audit (
  operation_id uuid primary key,
  record_id text not null references public.hdnd_items(record_id) on delete restrict,
  actor_uid uuid not null,
  at timestamptz not null default clock_timestamp(),
  changes jsonb not null,
  old_values jsonb not null,
  snapshot jsonb not null
);
create index hdnd_audit_record_idx on public.hdnd_audit(record_id,at desc);

-- Keep auth data and the admin allowlist on the server. User metadata from the
-- browser is NOT accepted as proof of Google identity or privileged status.
create or replace function hdnd_private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,true) = false
    and exists (
      select 1 from auth.users u
      join auth.identities i on i.user_id = u.id and i.provider = 'google'
      join hdnd_private.admin_emails a on lower(a.email) = lower(u.email)
      where u.id = auth.uid() and u.email_confirmed_at is not null
    );
$$;

create or replace function hdnd_private.valid_field(p_field text, p_value jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when p_field in ('content','department','type','partyLevel',
      'progressParty','progressBuild','progressCouncil','specialist','room',
      'vpLeader','ubndLeader','specificProgress','note') then
      jsonb_typeof(p_value) = 'string'
      and length(p_value #>> '{}') <= 20000
      and (p_field <> 'content' or length(btrim(p_value #>> '{}')) > 0)
    when p_field = 'documentKind' then p_value in ('"NQ"'::jsonb,'"BC"'::jsonb,'"UNCLASSIFIED"'::jsonb)
    when p_field = 'isDropped' then jsonb_typeof(p_value) = 'boolean'
    else false
  end;
$$;

create or replace function hdnd_private.can_edit(p_id text, p_field text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare r jsonb;
begin
  if not hdnd_private.valid_field(p_field, case when p_field='isDropped' then 'false'::jsonb when p_field='documentKind' then '"NQ"'::jsonb else '"x"'::jsonb end)
    then return false; end if;
  if hdnd_private.is_admin() then return true; end if;
  select rights into r from public.hdnd_acl where id=true;
  return coalesce(
    (r #>> array['cells',p_id,p_field])::boolean,
    (r #>> array['rows',p_id])::boolean,
    (r #>> array['columns',p_field])::boolean,
    false);
end; $$;

-- Reject direct item/control/ACL/audit/lease writes from browsers. Authenticated
-- users can read business data but MUST invoke the restricted RPCs to mutate it.
alter table public.hdnd_items enable row level security;
alter table public.hdnd_acl enable row level security;
alter table public.hdnd_profile enable row level security;
alter table public.hdnd_control enable row level security;
alter table public.hdnd_cell_locks enable row level security;
alter table public.hdnd_audit enable row level security;

revoke all on public.hdnd_items,public.hdnd_acl,public.hdnd_profile,
  public.hdnd_control,public.hdnd_cell_locks,public.hdnd_audit
  from public,anon,authenticated;
grant select on public.hdnd_items,public.hdnd_acl,public.hdnd_profile,
  public.hdnd_control,public.hdnd_audit to authenticated;
grant select on public.hdnd_cell_locks to authenticated;
create policy hdnd_items_read on public.hdnd_items for select to authenticated using (auth.uid() is not null);
create policy hdnd_acl_read on public.hdnd_acl for select to authenticated using (auth.uid() is not null);
create policy hdnd_profile_read on public.hdnd_profile for select to authenticated using (auth.uid() is not null);
create policy hdnd_control_read on public.hdnd_control for select to authenticated using (auth.uid() is not null);
create policy hdnd_audit_read on public.hdnd_audit for select to authenticated using (auth.uid() is not null);
-- Never reveal another user's lease token to another authenticated client.
create policy hdnd_locks_self on public.hdnd_cell_locks for select to authenticated
using (owner_uid=auth.uid());

create or replace function hdnd_private.hdnd_acquire_cell(
  p_record_id text,p_field text,p_kind text,p_session uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.hdnd_control%rowtype;
        v public.hdnd_cell_locks%rowtype;
        t timestamptz := clock_timestamp();
begin
  if auth.uid() is null or p_session is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('status','search','short','multiline','long') then raise exception 'BAD_EDITOR_KIND'; end if;
  select * into c from public.hdnd_control where id=true for share;
  if c.mode <> 'OPEN' or (c.guest_editing_locked and not hdnd_private.is_admin()) then
    raise exception 'EDIT_PAUSED'; end if;
  if not hdnd_private.can_edit(p_record_id,p_field) then raise exception 'NO_PERMISSION'; end if;
  perform 1 from public.hdnd_items where record_id=p_record_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  insert into public.hdnd_cell_locks as l
    (record_id,field_key,owner_uid,session_id,token,kind,revision,acquired_at,expires_at)
  values (p_record_id,p_field,auth.uid(),p_session,gen_random_uuid(),p_kind,1,t,t+interval '45 seconds')
  on conflict(record_id,field_key) do update set
    owner_uid=excluded.owner_uid,session_id=excluded.session_id,
    token=excluded.token,kind=excluded.kind,revision=l.revision+1,
    acquired_at=excluded.acquired_at,expires_at=excluded.expires_at
  where l.expires_at <= clock_timestamp()
  returning * into v;
  if not found then raise exception 'CELL_BUSY'; end if;
  return jsonb_build_object('token',v.token,'session',v.session_id,'expiresAt',v.expires_at,
     'acquiredAt',v.acquired_at,'revision',v.revision,'kind',v.kind);
end; $$;

create or replace function hdnd_private.hdnd_renew_cell(
  p_record_id text,p_field text,p_session uuid,p_token uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v public.hdnd_cell_locks%rowtype; c public.hdnd_control%rowtype;
        t timestamptz := clock_timestamp(); max_secs integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from public.hdnd_control where id=true for share;
  if c.mode='FROZEN' then raise exception 'FROZEN'; end if;
  select * into v from public.hdnd_cell_locks
    where record_id=p_record_id and field_key=p_field for update;
  if not found or v.owner_uid <> auth.uid() or v.session_id <> p_session or
     v.token <> p_token or v.expires_at <= t then raise exception 'LEASE_LOST'; end if;
  max_secs := case v.kind when 'status' then 45 when 'search' then 90
               when 'short' then 120 when 'multiline' then 300 else 600 end;
  if t >= v.acquired_at + make_interval(secs=>max_secs)
     or (c.mode='DRAINING' and (v.acquired_at >= c.changed_at or t >= c.deadline))
     then raise exception 'EDIT_EXPIRED'; end if;
  update public.hdnd_cell_locks set expires_at=t+interval '45 seconds',
    revision=revision+1 where record_id=p_record_id and field_key=p_field returning * into v;
  return jsonb_build_object('token',v.token,'session',v.session_id,
    'expiresAt',v.expires_at,'revision',v.revision);
end; $$;

create or replace function hdnd_private.hdnd_release_cell(
  p_record_id text,p_field text,p_session uuid,p_token uuid
) returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  -- Never delete newer leases. A stale token can never clear a replacement.
  update public.hdnd_cell_locks set expires_at=clock_timestamp(), revision=revision+1
    where record_id=p_record_id and field_key=p_field and owner_uid=auth.uid()
      and session_id=p_session and token=p_token;
  return found;
end; $$;

create or replace function hdnd_private.hdnd_save_cell_changes(
  p_record_id text,p_session uuid,p_operation_id uuid,p_base jsonb,
  p_changes jsonb,p_tokens jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.hdnd_control%rowtype;
        d public.hdnd_items%rowtype; a public.hdnd_audit%rowtype;
        l public.hdnd_cell_locks%rowtype;
        k text; v jsonb; old_vals jsonb := '{}'::jsonb;
        t timestamptz := clock_timestamp(); snap jsonb;
        specialist_rooms jsonb; allowed_rooms jsonb; new_fields jsonb;
begin
  if auth.uid() is null or p_operation_id is null or p_session is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_changes)<>'object' or jsonb_typeof(p_base)<>'object'
     or jsonb_typeof(p_tokens)<>'object'
     or p_changes='{}'::jsonb or
     (select count(*) from jsonb_object_keys(p_changes))>15
     then raise exception 'BAD_PATCH'; end if;
  select * into a from public.hdnd_audit where operation_id=p_operation_id;
  if found then
    if a.actor_uid<>auth.uid() or a.record_id<>p_record_id or
       a.changes<>p_changes or a.old_values<>p_base
       then raise exception 'OPERATION_REPLAY_MISMATCH'; end if;
    return jsonb_build_object('ok',true,'item',a.snapshot,'replay',true);
  end if;
  -- This row lock serializes edits against administrative freeze/pause transitions.
  select * into c from public.hdnd_control where id=true for share;
  if c.mode='FROZEN' then raise exception 'FROZEN'; end if;
  if c.guest_editing_locked and not hdnd_private.is_admin() then raise exception 'EDIT_PAUSED'; end if;
  select * into d from public.hdnd_items where record_id=p_record_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  for k,v in select key,value from jsonb_each(p_changes) loop
    if not hdnd_private.valid_field(k,v) then raise exception 'BAD_FIELD: %',k; end if;
    if not p_base ? k or (d.fields -> k) is distinct from (p_base -> k)
      then raise exception 'CONFLICT: %',k; end if;
    if not hdnd_private.can_edit(p_record_id,k) then raise exception 'NO_PERMISSION: %',k; end if;
    if (d.fields->k) is not distinct from v then raise exception 'NO_CHANGE: %',k; end if;
    select * into l from public.hdnd_cell_locks
      where record_id=p_record_id and field_key=k for update;
    if not found or l.owner_uid<>auth.uid() or l.session_id<>p_session
       or l.token::text is distinct from (p_tokens->>k) or l.expires_at<=t
       then raise exception 'LEASE_LOST: %',k; end if;
    if t >= l.acquired_at + make_interval(secs=>
       case l.kind when 'status' then 45 when 'search' then 90
       when 'short' then 120 when 'multiline' then 300 else 600 end)
      then raise exception 'EDIT_EXPIRED: %',k; end if;
    if c.mode='DRAINING' and (l.acquired_at >= c.changed_at or c.deadline is null or t>=c.deadline)
      then raise exception 'DRAINING: %',k; end if;
    old_vals:=jsonb_set(old_vals,array[k],d.fields->k,true);
  end loop;
  -- Mirror the existing assignmentIssue() business invariant on the SERVER.
  -- Client validation alone can be bypassed by calling RPC directly.
  if p_changes ? 'specialist' or p_changes ? 'room' then
    new_fields:=d.fields||p_changes;
    select profile #> '{catalogs,specialistRooms}' into specialist_rooms
      from public.hdnd_profile where id=true;
    if jsonb_typeof(specialist_rooms)='object' then
      allowed_rooms:=specialist_rooms -> (new_fields->>'specialist');
      if jsonb_typeof(allowed_rooms)='array' and jsonb_array_length(allowed_rooms)>0
         and not exists (
           select 1 from jsonb_array_elements_text(allowed_rooms) as t(room)
           where t.room = new_fields->>'room'
         ) then raise exception 'ASSIGNMENT_CONFLICT'; end if;
    end if;
  end if;
  update public.hdnd_items set fields=d.fields||p_changes,revision=d.revision+1,
    updated_at=t,updated_by=auth.uid(),operation_id=p_operation_id
    where record_id=p_record_id returning * into d;
  snap := d.fields || jsonb_build_object('recordId',d.record_id,
    'displayCode',d.display_code,'stt',d.stt,'revision',d.revision,
    'archivedAt',d.archived_at);
  insert into public.hdnd_audit(operation_id,record_id,actor_uid,at,changes,old_values,snapshot)
    values(p_operation_id,p_record_id,auth.uid(),t,p_changes,old_vals,snap);
  return jsonb_build_object('ok',true,'item',snap,'replay',false);
end; $$;

create or replace function hdnd_private.hdnd_set_permissions(p_expected bigint,p_rights jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare current_rev bigint;
begin
  if not hdnd_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_rights)<>'object' or jsonb_typeof(p_rights->'columns')<>'object'
     or jsonb_typeof(p_rights->'rows')<>'object'
     or jsonb_typeof(p_rights->'cells')<>'object' then raise exception 'BAD_RIGHTS'; end if;
  -- Do not accept arbitrary permission keys or non-boolean permissions.
  if exists (
    select 1 from jsonb_each(p_rights->'columns') e
    where not hdnd_private.valid_field(e.key,
      case when e.key='isDropped' then 'false'::jsonb when e.key='documentKind' then '"NQ"'::jsonb else '"x"'::jsonb end)
      or jsonb_typeof(e.value)<>'boolean'
  ) or exists (
    select 1 from jsonb_each(p_rights->'rows') e
    where e.key !~ '^[A-Za-z0-9_:-]{1,200}$' or jsonb_typeof(e.value)<>'boolean'
  ) or exists (
    select 1 from jsonb_each(p_rights->'cells') r, jsonb_each(r.value) e
    where r.key !~ '^[A-Za-z0-9_:-]{1,200}$'
      or not hdnd_private.valid_field(e.key,
      case when e.key='isDropped' then 'false'::jsonb when e.key='documentKind' then '"NQ"'::jsonb else '"x"'::jsonb end)
      or jsonb_typeof(e.value)<>'boolean'
  ) then raise exception 'BAD_RIGHTS'; end if;
  select revision into current_rev from public.hdnd_acl where id=true for update;
  if current_rev<>p_expected then raise exception 'RIGHTS_CONFLICT'; end if;
  update public.hdnd_acl set rights=p_rights,revision=revision+1 where id=true returning revision into current_rev;
  return current_rev;
end; $$;

create or replace function hdnd_private.hdnd_set_profile(p_expected bigint,p_profile jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare current_rev bigint;
begin
  if not hdnd_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_profile)<>'object' then raise exception 'BAD_PROFILE'; end if;
  select revision into current_rev from public.hdnd_profile where id=true for update;
  if current_rev<>p_expected then raise exception 'PROFILE_CONFLICT'; end if;
  update public.hdnd_profile set profile=p_profile,revision=revision+1 where id=true returning revision into current_rev;
  return current_rev;
end; $$;

create or replace function hdnd_private.hdnd_guest_pause(p_expected bigint,p_locked boolean)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare c public.hdnd_control%rowtype;
begin
  if not hdnd_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into c from public.hdnd_control where id=true for update;
  if c.revision<>p_expected then raise exception 'CONTROL_CONFLICT'; end if;
  update public.hdnd_control set revision=revision+1,guest_editing_locked=p_locked
    where id=true returning * into c;
  return c.revision;
end; $$;

create or replace function hdnd_private.hdnd_freeze_transition(
 p_expected bigint,p_next text,p_force boolean default false
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c public.hdnd_control%rowtype; t timestamptz:=clock_timestamp(); active_count bigint;
begin
  if not hdnd_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into c from public.hdnd_control where id=true for update;
  if c.revision<>p_expected then raise exception 'CONTROL_CONFLICT'; end if;
  if not ((c.mode='OPEN' and p_next in ('DRAINING','FROZEN')) or
          (c.mode='DRAINING' and p_next in ('FROZEN','OPEN')) or
          (c.mode='FROZEN' and p_next='OPEN')) then raise exception 'INVALID_TRANSITION'; end if;
  if p_next='FROZEN' and c.mode='DRAINING' and not p_force then
    select count(*) into active_count from public.hdnd_cell_locks where expires_at>t;
    if active_count>0 then raise exception 'ACTIVE_EDIT_LOCKS'; end if;
  end if;
  update public.hdnd_control set mode=p_next,revision=revision+1,
    epoch=epoch+case when mode='OPEN' and p_next<>'OPEN' then 1 else 0 end,
    changed_at=t, deadline=case when p_next='DRAINING' then t+interval '50 seconds' else null end,
    closed_at=case when p_next='FROZEN' then t else null end
  where id=true returning * into c;
  return jsonb_build_object('mode',c.mode,'revision',c.revision,'epoch',c.epoch,
    'changedAt',c.changed_at,'deadline',c.deadline,'closedAt',c.closed_at);
end; $$;

-- Privileged state-changing functions live in a NONEXPOSED schema.
-- Public RPCs below are SECURITY INVOKER wrappers, never privileged definer APIs.
grant usage on schema hdnd_private to authenticated;
revoke execute on function hdnd_private.hdnd_acquire_cell(text,text,text,uuid) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_acquire_cell(text,text,text,uuid) to authenticated;
create or replace function public.hdnd_acquire_cell(p_record_id text,p_field text,p_kind text,p_session uuid)
 returns jsonb language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_acquire_cell($1,$2,$3,$4); $$;
revoke execute on function public.hdnd_acquire_cell(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.hdnd_acquire_cell(text,text,text,uuid) to authenticated;

revoke execute on function hdnd_private.hdnd_renew_cell(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_renew_cell(text,text,uuid,uuid) to authenticated;
create or replace function public.hdnd_renew_cell(p_record_id text,p_field text,p_session uuid,p_token uuid)
 returns jsonb language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_renew_cell($1,$2,$3,$4); $$;
revoke execute on function public.hdnd_renew_cell(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.hdnd_renew_cell(text,text,uuid,uuid) to authenticated;

revoke execute on function hdnd_private.hdnd_release_cell(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_release_cell(text,text,uuid,uuid) to authenticated;
create or replace function public.hdnd_release_cell(p_record_id text,p_field text,p_session uuid,p_token uuid)
 returns boolean language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_release_cell($1,$2,$3,$4); $$;
revoke execute on function public.hdnd_release_cell(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.hdnd_release_cell(text,text,uuid,uuid) to authenticated;

revoke execute on function hdnd_private.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
create or replace function public.hdnd_save_cell_changes(p_record_id text,p_session uuid,p_operation_id uuid,p_base jsonb,p_changes jsonb,p_tokens jsonb)
 returns jsonb language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_save_cell_changes($1,$2,$3,$4,$5,$6); $$;
revoke execute on function public.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb) to authenticated;

revoke execute on function hdnd_private.hdnd_set_permissions(bigint,jsonb) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_set_permissions(bigint,jsonb) to authenticated;
create or replace function public.hdnd_set_permissions(p_expected bigint,p_rights jsonb)
 returns bigint language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_set_permissions($1,$2); $$;
revoke execute on function public.hdnd_set_permissions(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.hdnd_set_permissions(bigint,jsonb) to authenticated;

revoke execute on function hdnd_private.hdnd_set_profile(bigint,jsonb) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_set_profile(bigint,jsonb) to authenticated;
create or replace function public.hdnd_set_profile(p_expected bigint,p_profile jsonb)
 returns bigint language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_set_profile($1,$2); $$;
revoke execute on function public.hdnd_set_profile(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.hdnd_set_profile(bigint,jsonb) to authenticated;

revoke execute on function hdnd_private.hdnd_guest_pause(bigint,boolean) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_guest_pause(bigint,boolean) to authenticated;
create or replace function public.hdnd_guest_pause(p_expected bigint,p_locked boolean)
 returns bigint language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_guest_pause($1,$2); $$;
revoke execute on function public.hdnd_guest_pause(bigint,boolean) from public,anon,authenticated;
grant execute on function public.hdnd_guest_pause(bigint,boolean) to authenticated;

revoke execute on function hdnd_private.hdnd_freeze_transition(bigint,text,boolean) from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_freeze_transition(bigint,text,boolean) to authenticated;
create or replace function public.hdnd_freeze_transition(p_expected bigint,p_next text,p_force boolean default false)
 returns jsonb language sql security invoker set search_path = ''
 as $$ select hdnd_private.hdnd_freeze_transition($1,$2,$3); $$;
revoke execute on function public.hdnd_freeze_transition(bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.hdnd_freeze_transition(bigint,text,boolean) to authenticated;

-- Postgres Changes should be enabled only for the business rows, not secret tokens.
do $$
begin
  if not exists(select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='hdnd_items')
    then alter publication supabase_realtime add table public.hdnd_items;
  end if;
end $$;

commit;
