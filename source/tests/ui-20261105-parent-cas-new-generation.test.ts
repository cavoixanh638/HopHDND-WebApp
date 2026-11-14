import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

/** Guard the narrow QA07/QA08 creation-only carveout against silent widening. */
const rules=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8')).rules;
const status=rules.hdnd.datasetV2.generations['$generation'].items['$id'].progressParty['.validate'] as string;
const parent=rules.hdnd.datasetV2['.write'] as string;
describe('UI 05/11 new-generation party status is not an arbitrary edit grant',()=>{
  it('retains parent CAS owner-only transaction gate',()=>{
    expect(parent).toContain('parentCasService');
    expect(parent).toContain('auth.token.email_verified === true');
    expect(parent).toContain('newData.child(\'active/revision\').val() === data.child(\'active/revision\').val() + 1');
    expect(parent).toContain('newData.child(\'operations\')');
  });
  it('does not change the existing row-level Rules contract',()=>{
    expect(status).toContain("root.child('hdnd/datasetV2/leases').child($generation).child($id).child('progressParty')");
    expect(status).toContain("newData.parent().child('partyLevel').val() !== data.parent().child('partyLevel').val()");
    expect(status).toContain("root.child('hdnd/datasetV2/permissions')");
  });
  it('scopes the extra status allowance to owner-verified parentCAS and a never-existing row',()=>{
    const marker=' || (auth != null && auth.token.parentCasService';
    const first=status.indexOf(marker),last=status.lastIndexOf(marker);
    expect(first).toBeGreaterThan(0);
    expect(last).toBeGreaterThan(first); // existing paired status + new paired-blank import
    const exception=status.slice(first,last);
    expect(exception).toContain('auth.token.parentCasService === true');
    expect(exception).toContain("auth.token.email_verified === true");
    expect(exception).toContain("auth.token.firebase.sign_in_provider === 'google.com'");
    expect(exception).toContain('!data.parent().exists()');
    expect(exception).toContain('newData.isString()');
    expect(exception).toContain('newData.val().length <= 20000');
    expect(exception).toContain("=== 'Không' && newData.val() === 'Không phải trình'");
    for(const value of ['TTTU','BTV','BCH'])expect(exception).toContain("=== '"+value+"'");
    expect(exception).toContain("newData.val() !== 'Không phải trình'");
    expect(exception).not.toContain("data.parent().exists() && auth.token.parentCasService");
    // Real A–O imports retain truly empty F/G cells. Only the trusted parent
    // CAS may insert the blank pair into a NEW V2 generation, never edit one.
    const blank=status.slice(last);
    expect(blank).toContain('auth.token.parentCasService === true');
    expect(blank).toContain("auth.token.email_verified === true");
    expect(blank).toContain("auth.token.firebase.sign_in_provider === 'google.com'");
    expect(blank).toContain('!data.parent().exists()');
    expect(blank).toContain('newData.isString()');
    expect(blank).toContain("newData.val() === ''");
    expect(blank).toContain("newData.parent().child('partyLevel').val() === ''");
    expect(blank).not.toContain("data.parent().exists() && auth.token.parentCasService");
  });
});
