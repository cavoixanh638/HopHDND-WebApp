-- QA ONLY. This script may be run on the dedicated EMPTY HopHDND-Staging project.
-- NEVER use against Firebase, production, or a Supabase project with real business rows.
begin;
do $guard$
begin
 if exists(select 1 from public.hdnd_items where record_id not like 'qa-supa-%')
   then raise exception 'NON_QA_ROWS_PRESENT; staging fixture refused'; end if;
 if (select is_open from hdnd_private.import_gate where id=true) is true
   then raise exception 'IMPORT_GATE_OPEN; fixture refused'; end if;
end $guard$;
insert into public.hdnd_items(record_id,display_code,stt,fields)
select 'qa-supa-'||lpad(i::text,4,'0'),
       'QA-NQ-'||lpad(i::text,4,'0'),
       900000+i,
       jsonb_build_object(
         'content','[DỮ LIỆU GIẢ — QA SUPABASE] Nội dung thử nghiệm số '||i,
         'department',case when i%2=0 then 'Sở Tài chính (QA)' else 'Ban quản lý (QA)' end,
         'type','Nghị quyết (QA)',
         'partyLevel','Không áp dụng (QA)',
         'progressParty','Sở chưa trình',
         'progressBuild','VP đang thực hiện',
         'progressCouncil','Sở chưa trình',
         'specialist','Người kiểm thử',
         'room','Phòng kiểm thử',
         'vpLeader','Lãnh đạo QA',
         'ubndLeader','Lãnh đạo QA',
         'specificProgress','Đang kiểm thử hệ thống, không phải hồ sơ thật',
         'note','QA ONLY — có thể xóa hoàn toàn sau nghiệm thu',
         'documentKind',case when i%3=0 then 'BC' else 'NQ' end,
         'isDropped',false
       )
from generate_series(1,6) i
on conflict(record_id) do nothing;
commit;
