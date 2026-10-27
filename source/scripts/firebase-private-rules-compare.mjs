#!/usr/bin/env node
/**
 * OFFLINE-only structural comparison of operator-private Published RTDB Rules
 * against the candidate Security Rules. Never uploads/prints rule expressions.
 * Usage: node scripts/firebase-private-rules-compare.mjs --live-file D:\\...\\rules-live.json
 * Run from source/. No Firebase SDK, CLI, network, or production writes.
 */
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';

const sha=text=>createHash('sha256').update(text).digest('hex');
const safeFile=async(path,privateFile=false)=>{
  if(!path||(privateFile&&!isAbsolute(path)))throw Error('RULES_COMPARE_HOLD: Published file must use an absolute path.');
  const file=resolve(path),metadata=await stat(file);
  if(!metadata.isFile()||metadata.size<=2||metadata.size>3*1024*1024)
    throw Error('RULES_COMPARE_HOLD: invalid file size/type.');
  let parsed;
  try{parsed=JSON.parse(await readFile(file,'utf8'));}
  catch{throw Error('RULES_COMPARE_HOLD: invalid JSON.');}
  if(!parsed||typeof parsed!=='object'||!parsed.rules||typeof parsed.rules!=='object'||Array.isArray(parsed.rules))
    throw Error('RULES_COMPARE_HOLD: missing top-level rules.');
  return parsed;
};
const canonical=value=>{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
};
const entries=(root,prefix='',result=new Map())=>{
  for(const [key,value] of Object.entries(root)){
    const place=prefix+'/'+key.replaceAll('/','~1');
    if(key.startsWith('.')&&key!=='.indexOn'){
      if(typeof value!=='string'&&typeof value!=='boolean')throw Error('RULES_COMPARE_HOLD: bad rule expression at '+place);
      result.set(place,sha(canonical(value)));
    }else if(key==='.indexOn'){
      result.set(place,sha(canonical(value)));
    }else if(value&&typeof value==='object'&&!Array.isArray(value))entries(value,place,result);
    else throw Error('RULES_COMPARE_HOLD: invalid rule tree at '+place);
  }
  return result;
};
try{
  const args=process.argv.slice(2),i=args.indexOf('--live-file');
  if(i<0||!args[i+1]||args.length!==2)throw Error('RULES_COMPARE_HOLD: use --live-file ABSOLUTE_PATH');
  const live=await safeFile(args[i+1],true);
  const candidate=await safeFile('firebase/database.exclusive-candidate.rules.json');
  const published=entries(live.rules),proposed=entries(candidate.rules);
  const added=[...proposed.keys()].filter(k=>!published.has(k));
  const removed=[...published.keys()].filter(k=>!proposed.has(k));
  const changed=[...proposed.keys()].filter(k=>published.has(k)&&proposed.get(k)!==published.get(k));
  console.log('OFFLINE_RULES_COMPARE_COMPLETED (READ ONLY; no network, no deploy)');
  console.log('Published canonical JSON SHA256: '+sha(canonical(live)));
  console.log('Candidate canonical JSON SHA256: '+sha(canonical(candidate)));
  console.log('Published rule expressions: '+published.size);
  console.log('Candidate rule expressions: '+proposed.size);
  console.log('Added rule locations: '+added.length);
  console.log('Removed rule locations: '+removed.length);
  console.log('Changed rule locations: '+changed.length);
  for(const [title,paths] of [['ADDED',added],['REMOVED',removed],['CHANGED',changed]]){
    console.log(title+' path list (no expressions):');
    for(const name of paths.slice(0,100))console.log('  '+name);
    if(paths.length>100)console.log('  ... '+(paths.length-100)+' more');
  }
  console.log('RELEASE_GATE=HOLD: structural diff is not an independent Security Rules review.');
  console.log('Published provenance must separately be verified from Firebase Console.');
}catch(err){console.error(err instanceof Error?err.message:'RULES_COMPARE_HOLD');process.exitCode=1;}
