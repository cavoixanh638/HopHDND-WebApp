import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const core=readFileSync(new URL('../supabase/migrations/202610250001_hophdnd_core.sql',import.meta.url),'utf8');
const importSql=readFileSync(new URL('../supabase/migrations/202610250002_single_import_gate.sql',import.meta.url),'utf8');

/**
 * Static regression sentinels only: these do NOT prove RLS or transaction safety.
 * Staging SQL + 3 real identities + malicious RPC tests remain release blockers.
 */
describe('Supabase SQL security contract static sentinels',()=>{
  it('keeps direct writes denied and business rows protected by RLS',()=>{
    expect(core).toContain('alter table public.hdnd_items enable row level security');
    expect(core).toMatch(/revoke all on public\.hdnd_items[\s\S]*?from public,anon,authenticated/);
    expect(core).toMatch(/grant select on public\.hdnd_items[\s\S]*?to authenticated/);
    expect(core).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+public\.hdnd_items\s+to\s+authenticated/i);
  });
  it('uses real server identity, verified Google provider and admin allowlist',()=>{
    expect(core).toContain('auth.uid()');
    expect(core).toContain("i.provider = 'google'");
    expect(core).toContain('email_confirmed_at is not null');
    expect(core).toContain('hdnd_private.admin_emails');
    expect(core).toContain("auth.jwt()->>'is_anonymous'");
    expect(core).toContain("security definer set search_path = ''");
    expect(core).not.toMatch(/service_role.*(apikey|Bearer)/i);
  });
  it('prioritizes cell deny over row and column grants',()=>{
    expect(core).toMatch(/\['cells',p_id,p_field\][\s\S]*?\['rows',p_id\][\s\S]*?\['columns',p_field\]/);
    expect(core).toContain('hdnd_private.can_edit(p_record_id,k)');
    expect(core).toContain('NO_PERMISSION');
  });
  it('checks session/token/revision and never allows audit-only increments',()=>{
    expect(core).toContain('l.owner_uid<>auth.uid()');
    expect(core).toContain('l.session_id<>p_session');
    expect(core).toContain('l.token::text is distinct from (p_tokens->>k)');
    expect(core).toContain("p_changes='{}'::jsonb");
    expect(core).toContain('OPERATION_REPLAY_MISMATCH');
    expect(core).toContain('insert into public.hdnd_audit');
  });
  it('serializes freeze with writes and rejects late leases',()=>{
    expect(core).toContain('for share;');
    expect(core).toContain("c.mode='FROZEN'");
    expect(core).toContain("c.mode='DRAINING'");
    expect(core).toContain('t>=c.deadline');
    expect(core).toContain('ACTIVE_EDIT_LOCKS');
  });
  it('requires closed manual release gate and empty destination for import',()=>{
    expect(importSql).toContain('is_open boolean not null default false');
    expect(importSql).toContain('DESTINATION_NOT_EMPTY');
    expect(importSql).toContain('IMPORT_GATE_CLOSED');
    expect(importSql).toContain('imported_at=clock_timestamp()');
    expect(importSql).toContain('on conflict do nothing');
    expect(importSql).not.toMatch(/^update\s+hdnd_private\.import_gate\s+set\s+is_open=true/im);
  });
});
