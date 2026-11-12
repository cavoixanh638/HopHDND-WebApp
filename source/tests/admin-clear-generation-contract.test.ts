import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {proposeClearGeneration,EMPTY_GENERATION_DIGEST} from '../parent-commit-service/src/clear-contract.mjs';
const OP='clear_123456789012';
const sourceOp='excel_123456789012';
const expected={
  generationId:'gen_'+sourceOp,operationId:sourceOp,revision:4,
  rowCount:2,digest:'1'.repeat(64)
};
function snapshot(){
  return {
    active:{...expected},
    generations:{[expected.generationId]:{items:{
      x1:{recordId:'x1',displayCode:'NQ01',content:'First'},
      x2:{recordId:'x2',displayCode:'NQ02',content:'Second'}
    }}},
    operations:{[sourceOp]:{status:'COMMITTED',from:'legacy',to:expected.generationId,at:123}},
    permissions:{[expected.generationId]:{columns:{content:true}}},
    leases:{[expected.generationId]:{}},
    backups:{previousOperation:'sealed-backup-data'},
    candidates:{previousOperation:'sealed-candidate-data'},
    unrelated:{other:'untouched'},
  };
}
function context(){return{
  operationId:OP,actorUid:'admin-google-uid',expected,
  freeze:{mode:'FROZEN',revision:8,epoch:5},activeLeases:0,
  backupVerified:true
}}
describe('server-only irreversible-write FREE clear plan',()=>{
  it('proposes immutable empty generation without deleting any previous branch',()=>{
    const old=snapshot(),original=structuredClone(old);
    const result=proposeClearGeneration(old,context());
    expect(result.active).toEqual({
      generationId:'gen_'+OP,operationId:OP,revision:5,rowCount:0,
      digest:createHash('sha256').update('[]').digest('hex')
    });
    expect(result.active.digest).toBe(EMPTY_GENERATION_DIGEST);
    expect(result.generations['gen_'+OP]).toEqual({
      cleared:true,sourceGeneration:expected.generationId
    });
    for(const key of ['backups','candidates','unrelated','permissions','leases']){
      expect(result[key]).toEqual(old[key]);
    }
    expect(result.generations[expected.generationId])
      .toEqual(old.generations[expected.generationId]);
    expect(old).toEqual(original);
  });
  it('requires a preconfirmed independent backup and frozen editing/zero leases',()=>{
    const base=context();
    expect(()=>proposeClearGeneration(snapshot(),{...base,backupVerified:false}))
      .toThrow('backup');
    expect(()=>proposeClearGeneration(snapshot(),{...base,freeze:{...base.freeze,mode:'OPEN'}}))
      .toThrow('frozen');
    expect(()=>proposeClearGeneration(snapshot(),{...base,activeLeases:1}))
      .toThrow('leases');
  });
  it('rejects stale active pointer, operation collision, absent or edited source',()=>{
    const base=context();
    expect(()=>proposeClearGeneration(snapshot(),{...base,expected:{...expected,revision:3}}))
      .toThrow('stale');
    const s=snapshot();s.generations['gen_'+OP]={items:{}};
    expect(()=>proposeClearGeneration(s,base)).toThrow('collision');
    const corrupt=snapshot();delete corrupt.generations[expected.generationId].items.x1;
    expect(()=>proposeClearGeneration(corrupt,base)).toThrow('count');
  });
  it('cannot be used as an executable DB mutation or production REST handler',async()=>{
    const {readFileSync}=await import('node:fs');
    const src=readFileSync(new URL('../parent-commit-service/src/clear-contract.mjs',import.meta.url),'utf8');
    expect(src).not.toContain('db.ref(');
    expect(src).not.toContain('transaction(');
    expect(src).not.toContain('initializeApp(');
    expect(src).not.toContain('handleParentRequest(');
  });
});
