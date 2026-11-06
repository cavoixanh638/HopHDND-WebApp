/**
 * Compare measured skin from three exact-source real Chromium runs.
 *
 * For each checkout, COPY the same ui-20261106-picker-fixture.tsx and
 * ui-20261106-picker-fixture.html into its source/ directory and run:
 *   PICKER_VARIANT=reference node scripts/ui-20261106-picker-browser.mjs
 *   PICKER_VARIANT=baseline  node scripts/ui-20261106-picker-browser.mjs
 *   PICKER_VARIANT=after     node scripts/ui-20261106-picker-browser.mjs
 *
 * Copy the resulting artifact folders into one qa-results/ui-20261106-picker/
 * and run this tool from the after checkout. No guessing reference SHA.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve(process.env.PICKER_COMPARE_DIR??'qa-results/ui-20261106-picker');
const out=[];
const fields=['ubndLeader','vpLeader','room','specialist'];
const snapshots=['normal','hover','focus','expanded'];
const data=(variant,name)=>{
 const file=join(dir,variant,name+'.json');
 if(!existsSync(file))throw Error('Measured browser file missing: '+file);
 return JSON.parse(readFileSync(file,'utf8'));
};
const signature=(p)=>{
 if(!p)return null;
 const {background,border,borderWidth,borderRadius,padding,fontSize,fontWeight,lineHeight,
  color,display,boxShadow,transform,rect}=p;
 return {background,border,borderWidth,borderRadius,padding,fontSize,fontWeight,
   lineHeight,color,display,boxShadow,transform,height:rect?.h};
};
const referenceSHA='ab8629c7575debd494c908c14bde9967a575a82a';
const baselineSHA='8a201c1bf48c7916e4d0af9e1c0ca60cd6737632';
const errors=[];
for(const width of [1440,900,390]){
 for(const surface of ['list','popup']){
  for(const suffix of ['short','long']){
   const prefix=[surface,'edit',width,suffix].join('-');
   for(const state of snapshots){
    const name=prefix+'-'+state;
    const [ref,base,after]=['reference','baseline','after'].map(v=>data(v,name));
    const entry={name,fields:{}};
    for(const field of fields){
     const pre=signature(ref.fields[field]?.trigger);
     const baseline=signature(base.fields[field]?.trigger);
     const current=signature(after.fields[field]?.trigger);
     if(!pre||!baseline||!current)throw Error('Missing actual picker: '+field+' '+name);
     // Exclude caret deliberately: it is the sole allowed new visual.
     // Tables/stage tracks can shift absolute positions between commits.
     const mismatched=Object.keys(pre).filter(key=>key==='height'
       ?Math.abs((pre.height??0)-(current.height??0))>1.5
       :pre[key]!==current[key]);
     const beforeDifferences=Object.keys(pre).filter(key=>key==='height'
       ?Math.abs((pre.height??0)-(baseline.height??0))>1.5
       :pre[key]!==baseline[key]);
     entry.fields[field]={reference:pre,baseline,current,
       beforeDiff:beforeDifferences,afterDiff:mismatched,
       caretReference:ref.fields[field].trigger.caret,
       caretBaseline:base.fields[field].trigger.caret,
       caretAfter:after.fields[field].trigger.caret};
     if(mismatched.length)errors.push(name+' '+field+' skin drift: '+mismatched.join(','));
    }
    out.push(entry);
   }
  }
 }
}
writeFileSync(join(dir,'reference-vs-baseline-vs-after.json'),JSON.stringify({
 referenceSHA,baselineSHA,compared:out.length,errors,details:out
},null,2));
assert.equal(errors.length,0,'Personnel skin reference mismatch:\n'+errors.join('\n'));
console.log('UI_20261106_PICKER_REFERENCE_DIFF_PASS '+referenceSHA+' '+out.length+' snapshots');
