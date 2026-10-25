// Static safety guards only. Not a substitute for live OAuth in Supabase Cloud.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./supabase-auth-smoke.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,'Missing standalone QA inline script');
new Script(js,{filename:'supabase-auth-smoke.js'});
assert(html.includes('https://uguhyunuzsdrkykqgdmq.supabase.co'),'QA host mismatch');
assert(html.includes('localhost')&&html.includes('8765'),'Local-only guard missing');
assert(html.includes('hdnd_qa_state')&&html.includes('sessionStorage.removeItem(PENDING)'),
  'OAuth anti-CSRF or cleanup missing');
assert(html.includes('history.replaceState'),'OAuth tokens not stripped from address bar');
assert(html.includes('/rest/v1/rpc/hdnd_access_state'),'Protected access proof missing');
assert(html.includes('/rest/v1/hdnd_items?select=record_id,display_code'),
  'Synthetic row readback missing');
assert(html.includes('sb_publishable_'),'Publishable QA key missing');
assert(!html.includes('sb_secret_')&&!html.includes('service_role'),'Privileged key present');
assert(!/\b(?:firebase|googleapis\.com\/sheets)\b/i.test(js),
  'Standalone QA probe must not contact Firebase/Google Sheets');
assert(!/sessionStorage\.setItem\([^,]+,\s*(?:token|fragment|session)/.test(js),
  'Must not persist access token');
console.log('SUPABASE_AUTH_SMOKE_STATIC_GUARDS_PASS (live OAuth not tested)');
