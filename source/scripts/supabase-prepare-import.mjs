#!/usr/bin/env node
/**
 * OFFLINE ONLY. Prepare a reviewed one-time Item[] snapshot for Supabase.
 * No network, no Firebase, no Google Sheet reads and no production writes.
 * The source JSON and full normalized output must stay OUTSIDE the Git repo.
 *
 * node scripts/supabase-prepare-import.mjs --input D:\\private\\approved-items.json
 *   --output D:\\private\\supabase-cutover-payload.json
 */
import {readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';

export const TEXT_FIELDS=[
  'content','department','type','partyLevel','progressParty','progressBuild',
  'progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'
];
export const EDITABLE_FIELDS=[...TEXT_FIELDS,'documentKind','isDropped'];
const allowed=new Set([
  'recordId','displayCode','stt','revision','archivedAt',
  ...EDITABLE_FIELDS,'partyMeeting','examined'
]);
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_:-]{1,200}$/.test(x);
const fail=m=>{throw new Error('SUPABASE_IMPORT_HOLD: '+m)};
const inRepo=(root,target)=>{
  const r=relative(root,target);
  return r===''||(!r.startsWith('..')&&!isAbsolute(r));
};
export function normalizeApprovedItems(input) {
  if(!Array.isArray(input)||!input.length||input.length>1000)fail('Must supply 1–1000 approved Item rows');
  const ids=new Set(),codes=new Set(),items=[];
  for(const row of input) {
    if(!row||typeof row!=='object'||Array.isArray(row))fail('Invalid Item object');
    if(Object.keys(row).some(k=>!allowed.has(k)))fail('Unexpected source field');
    if(!validId(row.recordId)||typeof row.displayCode!=='string'||!row.displayCode||
      row.displayCode.length>100||!Number.isSafeInteger(row.stt)||row.stt<1)
      fail('Invalid immutable ID/displayCode/STT');
    if(ids.has(row.recordId)||codes.has(row.displayCode))fail('Duplicate ID/displayCode');
    ids.add(row.recordId);codes.add(row.displayCode);
    const cleaned={recordId:row.recordId,displayCode:row.displayCode,stt:row.stt};
    for(const k of EDITABLE_FIELDS){
      const v=row[k];
      if(k==='isDropped'){if(typeof v!=='boolean')fail('Bad isDropped');}
      else if(k==='documentKind'){if(!['NQ','BC','UNCLASSIFIED'].includes(v))fail('Bad documentKind');}
      else if(typeof v!=='string'||v.length>20000||(k==='content'&&!v.trim()))fail('Invalid '+k);
      cleaned[k]=v;
    }
    if(row.archivedAt!=null&&
      (typeof row.archivedAt!=='string'||!Number.isFinite(Date.parse(row.archivedAt))))
      fail('Invalid archive timestamp');
    cleaned.archivedAt=row.archivedAt??null;
    for(const k of ['partyMeeting','examined']){
      if(row[k]!==undefined){
        if(typeof row[k]!=='string')fail('Invalid optional source '+k);
        cleaned[k]=row[k];
      }
    }
    items.push(cleaned);
  }
  return items.sort((a,b)=>a.stt-b.stt||a.recordId.localeCompare(b.recordId));
}
export function fingerprint(rows){
  return createHash('sha256').update(JSON.stringify(rows),'utf8').digest('hex');
}
function main(){
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--input'||args[2]!=='--output')fail('Use --input ABSOLUTE_PATH --output ABSOLUTE_PATH');
  const input=resolve(args[1]),output=resolve(args[3]),repo=resolve(process.cwd());
  if(!isAbsolute(args[1])||!isAbsolute(args[3]))fail('Require absolute paths');
  if(input===output)fail('Input cannot equal output');
  if(inRepo(repo,input)||inRepo(repo,output))fail('Private data cannot live inside source repository');
  if(existsSync(output)||existsSync(output+'.manifest.json'))fail('Output exists; never overwrite an existing snapshot');
  if(statSync(input).size>10_000_000)fail('Source too large for controlled cutover');
  const parsed=JSON.parse(readFileSync(input,'utf8'));
  const rows=normalizeApprovedItems(parsed);
  const sha256=fingerprint(rows);
  writeFileSync(output,JSON.stringify(rows),'utf8');
  writeFileSync(output+'.manifest.json',JSON.stringify({
    preparedAt:new Date().toISOString(),recordCount:rows.length,sha256,
    fields:EDITABLE_FIELDS,requiresDbGate:true,source:'admin-approved Item[]'
  },null,2)+'\n','utf8');
  console.log('SUPABASE_IMPORT_PREPARED_OFFLINE rows='+rows.length+' sha256='+sha256+
    ' (NOT IMPORTED, production NO-GO)');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{main();}catch(e){console.error(e instanceof Error?e.message:'SUPABASE_IMPORT_HOLD');process.exitCode=1;}
}
