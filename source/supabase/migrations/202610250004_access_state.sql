-- HopHDND / read-only authenticated capability discovery.
-- The result is advisory for the UI; *every write* still enforces ACL, freeze
-- and authenticated identity again inside its own privileged SQL transaction.
begin;

create or replace function hdnd_private.hdnd_access_state()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
declare a public.hdnd_acl%rowtype;
        c public.hdnd_control%rowtype;
        u uuid;
begin
  u:=auth.uid();
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from public.hdnd_acl where id=true;
  select * into c from public.hdnd_control where id=true;
  if a.id is not true or c.id is not true then raise exception 'CONFIG_UNAVAILABLE'; end if;
  return jsonb_build_object(
    'userId',u,'isAdmin',hdnd_private.is_admin(),
    'aclRevision',a.revision,'rights',a.rights,
    'controlRevision',c.revision,'mode',c.mode,
    'guestEditingLocked',c.guest_editing_locked,'epoch',c.epoch,
    'deadline',c.deadline);
end
$function$;

revoke all on function hdnd_private.hdnd_access_state() from public,anon,authenticated;
grant execute on function hdnd_private.hdnd_access_state() to authenticated;

create or replace function public.hdnd_access_state()
returns jsonb language sql stable security invoker set search_path = ''
as $function$ select hdnd_private.hdnd_access_state(); $function$;

revoke all on function public.hdnd_access_state() from public,anon,authenticated;
grant execute on function public.hdnd_access_state() to authenticated;
commit;
