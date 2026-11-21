/**
 * Convert a repository-owner "Run workflow" click into an approval scoped to
 * this single Actions run and its immutable main SHA.
 *
 * Normal push events still use the strict UI-only classifier. This helper does
 * not mutate GitHub repository variables, release policy, Rules or RTDB data.
 */
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const shaPattern=/^[0-9a-f]{40}$/;

export function resolvePagesApproval({
  eventName,actor,repositoryOwner,ref,head,legacyApprovedSha='',
}){
  if(ref!=='refs/heads/main'||!shaPattern.test(head??'')){
    return {allowed:false,approvedSha:'',mode:'denied',reason:'MAIN_REF_OR_SHA_INVALID'};
  }
  if(eventName==='workflow_dispatch'){
    if(typeof actor!=='string'||!actor.trim()||
       typeof repositoryOwner!=='string'||!repositoryOwner.trim()||
       actor.toLowerCase()!==repositoryOwner.toLowerCase()){
      return {allowed:false,approvedSha:'',mode:'denied',reason:'ONLY_REPOSITORY_OWNER_MAY_APPROVE'};
    }
    // The selected SHA is *not* derived from a mutable variable or input.
    // The publish job separately checks that origin/main still equals head.
    return {allowed:true,approvedSha:head,mode:'owner-dispatch',reason:''};
  }
  if(eventName==='push'){
    return {allowed:true,approvedSha:legacyApprovedSha,mode:'push',reason:''};
  }
  return {allowed:false,approvedSha:'',mode:'denied',reason:'UNSUPPORTED_EVENT'};
}

function main(){
  const result=resolvePagesApproval({
    eventName:process.env.GITHUB_EVENT_NAME,
    actor:process.env.GITHUB_ACTOR,
    repositoryOwner:process.env.GITHUB_REPOSITORY_OWNER,
    ref:process.env.GITHUB_REF,
    head:process.env.GITHUB_SHA,
    legacyApprovedSha:process.env.LEGACY_APPROVED_MAIN_SHA??'',
  });
  if(!result.allowed)throw Error('PAGES_RELEASE_HOLD: '+result.reason);
  if(!process.env.GITHUB_OUTPUT)throw Error('PAGES_RELEASE_HOLD: missing GitHub output');
  appendFileSync(process.env.GITHUB_OUTPUT,
    'approved_main_sha='+result.approvedSha+'\n'+
    'approval_source='+result.mode+'\n');
  console.log('PAGES_RELEASE_APPROVAL '+JSON.stringify({
    approval_source:result.mode,
    head:process.env.GITHUB_SHA,
    approved_main_sha:result.approvedSha,
  }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error){
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=1;
  }
}
