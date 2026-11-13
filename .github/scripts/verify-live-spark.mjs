/**
 * Re-verify current production count after user's request (2026-11-13 11:18 ICT).
 * Production smoke: public HTML/assets and one anonymous guest business READ.
 * Never writes the Realtime Database. Anonymous Auth creates a guest identity.
 * Neither tokens nor business records/IDs are printed.
 */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const base='https://cavoixanh638.github.io/HopHDND-WebApp/';
const expectedSha=process.env.EXPECTED_SOURCE_SHA;
if(!/^[a-f0-9]{40}$/.test(expectedSha??''))throw Error('Missing exact approved SHA');
const ensure=(condition,message)=>{if(!condition)throw Error(message)};
const request=async(url,init={})=>fetch(url,{...init,signal:AbortSignal.timeout(25000)});
const noCache=(relative)=>{
  const url=new URL(relative,base);
  url.searchParams.set('qa','20261113-'+expectedSha.slice(0,12));
  return url.toString();
};
const verReply=await request(noCache('version.json'),{headers:{'cache-control':'no-cache'}});
ensure(verReply.ok,'Pages version HTTP '+verReply.status);
const v=await verReply.json();
ensure(v.mode==='spark'&&v.source_sha===expectedSha,
  'Pages SHA/mode mismatch: expected '+expectedSha+' got '+v.source_sha+'/'+v.mode);
console.log('LIVE_VERSION_PASS',v.mode,v.source_sha);

const htmlReply=await request(noCache(''),{headers:{'cache-control':'no-cache'}});
ensure(htmlReply.ok,'Pages root HTTP '+htmlReply.status);
const html=await htmlReply.text();
ensure(/<div id="root"><\/div>/.test(html),'Missing app mount');
const js=html.match(/src=["'](\.\/assets\/[^"'<> ]+\.js)["']/)?.[1];
const css=html.match(/href=["'](\.\/assets\/[^"'<> ]+\.css)["']/)?.[1];
ensure(js&&css,'Missing hashed JS/CSS in public index');
for(const [name,asset,minSize] of [['script',js,1000],['stylesheet',css,100]]){
  const reply=await request(noCache(asset));
  ensure(reply.ok,'Public '+name+' HTTP '+reply.status);
  const content=await reply.text();
  ensure(content.length>minSize,'Public '+name+' unexpectedly empty');
  ensure(!/^\s*<!doctype html/i.test(content),'Public '+name+' returned HTML fallback');
  ensure(!content.includes('http://127.0.0.1:8787/parentDatasetCommit'),
    'Privileged localhost endpoint leaked in public asset');
  console.log('LIVE_ASSET_PASS',name,asset,content.length);
}

const config=readFileSync('source/src/data/firebase-config.ts','utf8');
const select=(key)=>{
  const line=config.split('\n').find(x=>x.includes(key+':'));
  const match=line?.match(/:\s*'([^']+)'/);
  ensure(match,'Missing public Firebase config '+key);
  return match[1];
};
const apiKey=select('apiKey'),projectId=select('projectId'),databaseURL=select('databaseURL');
ensure(projectId==='hophdnd-8b7b2'&&
  databaseURL==='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
  'Unexpected production instance');
const authReply=await request(
 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(apiKey),
 {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
if(!authReply.ok){
 const info=await authReply.text();
 throw Error('Anonymous Auth smoke failed HTTP '+authReply.status+': '+info.slice(0,350));
}
const auth=await authReply.json();
ensure(typeof auth.idToken==='string'&&auth.idToken.length>100,'Missing guest token');
const claims=JSON.parse(Buffer.from(auth.idToken.split('.')[1],'base64url').toString('utf8'));
ensure(claims.aud===projectId&&claims.firebase?.sign_in_provider==='anonymous',
  'Guest identity belongs to unexpected project/provider');
const dbURL=new URL(databaseURL+'/hdnd/items.json');
dbURL.searchParams.set('shallow','true');
dbURL.searchParams.set('auth',auth.idToken);
const guestResponse=await request(dbURL.toString());
if(!guestResponse.ok){
 const info=await guestResponse.text();
 throw Error('Guest RTDB read failed HTTP '+guestResponse.status+': '+info.slice(0,160));
}
const value=await guestResponse.json();
ensure(value===null||(value&&typeof value==='object'&&!Array.isArray(value)),
  'RTDB read shape mismatch');
const count=value?Object.keys(value).length:0;
ensure(count<=1000,'RTDB count over supported limit');
console.log('LIVE_GUEST_READ_PASS','primary_record_count='+count,'business_writes=0');
// For the post-import re-run: verify all 15 A-O business fields are structurally
// intact in Firebase, without logging their personal/business contents.
if(count>0){
  const fullURL=new URL(databaseURL+'/hdnd/items.json');
  fullURL.searchParams.set('auth',auth.idToken);
  const allResponse=await request(fullURL.toString());
  ensure(allResponse.ok,'Full guest dataset read HTTP '+allResponse.status);
  const all=await allResponse.json();
  ensure(all&&typeof all==='object'&&!Array.isArray(all),
    'Populated Firebase source is not a record map');
  const rows=Object.entries(all);
  ensure(rows.length===count,'Shallow and full read row counts differ');
  const fields=['displayCode','stt','content','department','type',
    'partyLevel','progressParty','progressBuild','progressCouncil',
    'specialist','room','vpLeader','ubndLeader','specificProgress','note'];
  const codes=new Set();
  for(const [id,item] of rows){
    ensure(item&&typeof item==='object'&&!Array.isArray(item) && item.recordId===id,
      'Firebase recordId mismatch');
    ensure(typeof item.displayCode==='string'&&item.displayCode.trim()!=='',
      'Firebase record code missing');
    ensure(!codes.has(item.displayCode),'Duplicate displayCode');
    codes.add(item.displayCode);
    ensure(Number.isSafeInteger(item.stt)&&item.stt>0,'Invalid business STT');
    for(const field of fields){
      ensure(Object.hasOwn(item,field),'Missing A-O business field '+field);
      ensure(field==='stt'||typeof item[field]==='string',
        'Incorrect business text field '+field);
    }
  }
  console.log('LIVE_PRIMARY_STRUCTURE_PASS','rows='+rows.length,
    'A_to_O_fields='+rows.length*fields.length,'unique_codes='+codes.size);
}


const browsers=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
const chosen=browsers.find(bin=>spawnSync(bin,['--version'],{encoding:'utf8',timeout:3000}).status===0);
ensure(chosen,'No Chromium binary on GitHub runner');
const chrome=spawnSync(chosen,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-extensions','--no-first-run','--no-default-browser-check',
  '--window-size=1920,1080','--virtual-time-budget=15000','--dump-dom',base
],{encoding:'utf8',timeout:85000,maxBuffer:12*1024*1024});
ensure(chrome.status===0,'Headless Chrome failed: '+String(chrome.stderr).slice(-500));
const dom=String(chrome.stdout);
const rootIndex=dom.indexOf('id="root"');
ensure(rootIndex!==-1,'Chrome did not see app mount');
const after=dom.slice(rootIndex+9,rootIndex+6000);
ensure(/<div|<main|<section|<header/.test(after)&&!/^\s*><\/div>/.test(after),
  'Chrome saw an empty React root');
const rootToBody=dom.slice(rootIndex+9,dom.indexOf('</body>',rootIndex));
const visible=rootToBody.replace(/<[^>]+>/g,' ').replace(/&[^; ]+;/g,' ').replace(/\s+/g,' ').trim();
const markers={
  title:/HĐND|Nội dung trình|Danh sách|Dữ liệu/i.test(visible),
  loading:/Đang|Đợi|Tải/i.test(visible),
  networkError:/Không kết nối|Lỗi kết nối|Failed to fetch/i.test(visible),
};
console.log('CHROME_RENDER_DIAG',JSON.stringify({
  domLength:dom.length,rootLength:rootToBody.length,visibleLength:visible.length,markers
}));
ensure(visible.length>15,'Chrome mounted HTML but app contains no visible UI text');
ensure(markers.title||markers.loading,'Chrome did not render known app title or loading state');
console.log('LIVE_CHROMIUM_RENDER_PASS','root_populated=true','page_text_verified=true');
console.log('FINAL_LIVE_SMOKE_PASS','source='+expectedSha,'guest_count='+count);
