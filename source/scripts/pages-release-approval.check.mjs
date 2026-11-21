import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolvePagesApproval} from './pages-release-approval.mjs';

const head='16b68fe2898587987916e4f984930e98de873eac';
const other='a69a99900969d3053a8cac18e2ce693318ee19af';
const baseline={
  eventName:'push',actor:'github-actions[bot]',repositoryOwner:'cavoixanh638',
  ref:'refs/heads/main',head,legacyApprovedSha:other,
};

test('ordinary push never approves its own SHA: strict UI-only policy still decides',()=>{
  assert.deepEqual(resolvePagesApproval(baseline),{
    allowed:true,approvedSha:other,mode:'push',reason:'',
  });
  assert.notEqual(resolvePagesApproval(baseline).approvedSha,head);
});

test('repository owner may approve the exact selected main SHA by clicking Run workflow',()=>{
  assert.deepEqual(resolvePagesApproval({...baseline,eventName:'workflow_dispatch',
    actor:'cavoixanh638'}),{
    allowed:true,approvedSha:head,mode:'owner-dispatch',reason:'',
  });
  // GitHub logins compare case-insensitively, but blank identities fail closed.
  assert.equal(resolvePagesApproval({...baseline,eventName:'workflow_dispatch',
    actor:'CAVOIXANH638'}).allowed,true);
});

test('collaborator, bot, missing actor or unrelated owner cannot approve guarded source',()=>{
  for(const actor of ['other-collaborator','github-actions[bot]','',undefined]){
    const result=resolvePagesApproval({...baseline,eventName:'workflow_dispatch',actor});
    assert.equal(result.allowed,false,JSON.stringify({actor,result}));
    assert.equal(result.approvedSha,'');
    assert.equal(result.reason,'ONLY_REPOSITORY_OWNER_MAY_APPROVE');
  }
  assert.equal(resolvePagesApproval({...baseline,eventName:'workflow_dispatch',
    actor:'cavoixanh638',repositoryOwner:''}).allowed,false);
});

test('no manual approval on a PR, tag, wrong ref, invalid head or unsupported event',()=>{
  for(const overrides of [
    {eventName:'pull_request',actor:'cavoixanh638'},
    {eventName:'workflow_run',actor:'cavoixanh638'},
    {eventName:'workflow_dispatch',actor:'cavoixanh638',ref:'refs/heads/dev'},
    {eventName:'workflow_dispatch',actor:'cavoixanh638',ref:'refs/tags/v1'},
    {eventName:'workflow_dispatch',actor:'cavoixanh638',head:'main'},
    {eventName:'push',head:'not-sha'},
  ]){
    const result=resolvePagesApproval({...baseline,...overrides});
    assert.equal(result.allowed,false,JSON.stringify({overrides,result}));
    assert.equal(result.approvedSha,'');
  }
});

test('manual dispatch cannot authorize a later SHA or bypass a changed main',()=>{
  const approved=resolvePagesApproval({...baseline,eventName:'workflow_dispatch',
    actor:'cavoixanh638'});
  assert.equal(approved.approvedSha,head);
  assert.notEqual(approved.approvedSha,other);
  // The publisher already validates origin/main === GITHUB_SHA after tests.
  // Passing a later head would require a separately initiated owner run.
  assert.equal(resolvePagesApproval({...baseline,eventName:'push',
    legacyApprovedSha:''}).approvedSha,'');
});
