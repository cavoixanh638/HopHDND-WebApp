\set ON_ERROR_STOP on
-- Only synthetic users, controlled local Postgres. Never use with Supabase production.
insert into hdnd_private.admin_emails(email) values ('admin@example.test');
insert into public.hdnd_items(record_id,display_code,stt,fields)
values('demo-1','NQ-TEST-001',1,jsonb_build_object(
 'content','MẪU TEST KHÔNG CÓ DỮ LIỆU THẬT',
 'department','A','type','NQ','partyLevel','BTV',
 'progressParty','Sở chưa trình','progressBuild','VP đang thực hiện',
 'progressCouncil','Sở chưa trình','specialist','A','room','R',
 'vpLeader','L1','ubndLeader','L2','specificProgress','Mẫu','note','N0',
 'documentKind','NQ','isDropped',false
));

do $$
begin
 if has_table_privilege('authenticated','public.hdnd_items','UPDATE')
   or has_table_privilege('authenticated','public.hdnd_items','INSERT')
   or has_table_privilege('anon','public.hdnd_items','SELECT') then
   raise exception 'DIRECT_TABLE_PRIVILEGE_BYPASS';
 end if;
 if has_function_privilege('anon','public.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE')
   then raise exception 'ANON_CAN_RUN_PRIVILEGED_RPC'; end if;
 if not has_function_privilege('authenticated','public.hdnd_save_cell_changes(text,uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE')
   then raise exception 'NO_AUTHENTICATED_RPC'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$
begin
 begin
   perform public.hdnd_acquire_cell('demo-1','note','short','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
   raise exception 'EXPECTED_EDIT_PAUSED';
 exception when others then
   if sqlerrm <> 'EDIT_PAUSED' then raise; end if;
 end;
 begin
   update public.hdnd_items set revision=revision+1 where record_id='demo-1';
   raise exception 'EXPECTED_DIRECT_WRITE_DENIED';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

-- Admin identity established by a verified Google row, NOT arbitrary JWT email.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.hdnd_guest_pause(1,false);
select public.hdnd_set_permissions(1,'{"columns":{"note":true},"rows":{},"cells":{"demo-1":{"note":false}}}'::jsonb);
reset role;

-- An explicit deny on one cell overrides a column-level grant.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$
begin
 begin
   perform public.hdnd_acquire_cell('demo-1','note','short','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
   raise exception 'EXPECTED_DENIED_CELL';
 exception when others then
   if sqlerrm <> 'NO_PERMISSION' then raise; end if;
 end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.hdnd_set_permissions(2,'{"columns":{"note":true},"rows":{},"cells":{"demo-1":{"note":true}}}'::jsonb);
reset role;

-- Guest1 owns the lease; guest2 cannot steal the same field, even with a fresh session.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
create temp table qa_lease (id integer primary key, token uuid, session_id uuid);
insert into qa_lease(id,token,session_id)
select 1,(p->>'token')::uuid,(p->>'session')::uuid
from (select public.hdnd_acquire_cell('demo-1','note','short',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') p) v;
do $$
begin
 if not exists(select 1 from qa_lease where id=1) then raise exception 'LEASE_NOT_CONFIRMED'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$
begin
 begin
   perform public.hdnd_acquire_cell('demo-1','note','short','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
   raise exception 'EXPECTED_CELL_BUSY';
 exception when others then
   if sqlerrm <> 'CELL_BUSY' then raise; end if;
 end;
end $$;

-- Freeze DRAINING must block new acquisitions while admitting preexisting leases.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.hdnd_freeze_transition(2,'DRAINING',false);
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$
begin
 begin
   perform public.hdnd_acquire_cell('demo-1','note','short','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
   raise exception 'EXPECTED_DRAINING_BLOCK';
 exception when others then
   if sqlerrm <> 'EDIT_PAUSED' then raise; end if;
 end;
end $$;

-- Save and audit must occur atomically; replay is exactly once.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
declare p uuid; saved jsonb; replay jsonb;
begin
 select token into p from qa_lease where id=1;
 saved:=public.hdnd_save_cell_changes('demo-1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '{"note":"N0"}','{"note":"N1"}',
  jsonb_build_object('note',p::text));
 if saved->>'ok'<>'true' or saved->'item'->>'note'<>'N1' then
   raise exception 'SERVER_ACK_MISMATCH'; end if;
 replay:=public.hdnd_save_cell_changes('demo-1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '{"note":"N0"}','{"note":"N1"}',
  jsonb_build_object('note',p::text));
 if replay->>'replay'<>'true' then raise exception 'REPLAY_NOT_IDEMPOTENT'; end if;
 begin
  perform public.hdnd_save_cell_changes('demo-1',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   '{"note":"N0"}','{"note":"FORGED"}',
   jsonb_build_object('note',p::text));
  raise exception 'EXPECTED_REPLAY_MISMATCH';
 exception when others then
  if sqlerrm<>'OPERATION_REPLAY_MISMATCH' then raise; end if;
 end;
end $$;
reset role;

do $$
begin
 if (select revision from public.hdnd_items where record_id='demo-1')<>2
   or (select count(*) from public.hdnd_audit)<>1
   or (select changes->>'note' from public.hdnd_audit limit 1)<>'N1'
   then raise exception 'AUDIT_OR_REVISION_BROKEN'; end if;
end $$;

-- Force a freeze (admin-only), then prove a new write is rejected.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.hdnd_freeze_transition(3,'FROZEN',true);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$
declare p uuid;
begin
 select token into p from qa_lease where id=1;
 begin
  perform public.hdnd_save_cell_changes('demo-1',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   '{"note":"N1"}','{"note":"N2"}',jsonb_build_object('note',p::text));
  raise exception 'EXPECTED_FROZEN';
 exception when others then
  if sqlerrm<>'FROZEN' then raise; end if;
 end;
end $$;
reset role;

-- NO import may be run before the manual go-live gate.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
do $$
declare payload jsonb;
begin
 payload:=jsonb_build_array(jsonb_build_object(
  'recordId','demo-new','displayCode','NQ-TEST-002','stt',2,
  'content','Mẫu', 'department','A','type','NQ','partyLevel','BTV',
  'progressParty','X','progressBuild','Y','progressCouncil','Z',
  'specialist','A','room','R','vpLeader','L1','ubndLeader','L2',
  'specificProgress','Mẫu','note','N0','documentKind','NQ','isDropped',false
 ));
 begin
  perform public.hdnd_import_once(payload,repeat('a',64));
  raise exception 'EXPECTED_IMPORT_GATE_CLOSED';
 exception when others then
  if sqlerrm<>'IMPORT_GATE_CLOSED' then raise; end if;
 end;
end $$;
reset role;
select 'SUPABASE_POSTGRES_SYNTHETIC_SECURITY_PASS' result;
