import {readFileSync,writeFileSync} from 'node:fs';
const original='parent-commit-service/test/final-data-candidate.generated.test.ts';
const renamed='parent-commit-service/test/final-data-fixed.generated.test.ts';
let s=readFileSync(original,'utf8');
function replaceOnce(a,b){
  if(s.split(a).length!==2)throw Error('FIX REVIEW EXPECTATION ANCHOR MISSING: '+a);
  s=s.replace(a,b);
}
replaceOnce("expect(oldChanged,'Probing known stale-generation lease Rules vulnerability').toBe(true);",
  "expect(oldChanged,'FIX regression: old lease must remain immutable').toBe(false);");
replaceOnce("expect(backendError?.code).toBe('failed-precondition');",
  "expect(backendError?.code).toBe('permission-denied');");
writeFileSync(renamed,s);
let r=readFileSync('parent-commit-service/test/final-data-candidate-run.generated.mjs','utf8');
const term="prefix+'/test/final-data-candidate.generated.test.ts'";
if(r.split(term).length!==2)throw Error('FIX REVIEW RUNNER ANCHOR MISSING');
r=r.replace(term,"prefix+'/test/final-data-fixed.generated.test.ts'");
writeFileSync('parent-commit-service/test/final-data-fixed-run.generated.mjs',r);
console.log('FINAL_DATA_REVIEW_FIXED_CANDIDATE_TEST_ONLY_EXPECTATION_INVERTED');
