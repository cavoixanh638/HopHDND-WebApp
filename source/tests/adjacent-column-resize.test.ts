import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {fitTableColumns} from '../src/data/fit-table-columns';
import {planAdjacentTransfer,resizeProjectedWithAdjacent,projectedAdjacentBounds,
  projectedPhysicalWidth,projectedIdWidth} from '../src/data/resize-last-column';

const width=(layout:ReturnType<typeof defaultItemLayout>,key:string,extra=0)=>
  projectedPhysicalWidth(layout.columns.find(c=>c.key===key)!.width,key,
    {[key]:extra},true);
const sum=(layout:ReturnType<typeof defaultItemLayout>,keys:string[],extras:Record<string,number>={})=>
  keys.reduce((n,key)=>n+width(layout,key,extras[key]),0);
describe('Owner L019: adjacent first, last as overflow reservoir',()=>{
 it('moves only neighboring visible columns on a normal drag and reverses without drift',()=>{
   const old=defaultItemLayout(),keys=['content','specificProgress','room','note'];
   const total=sum(old,keys);
   const next=resizeProjectedWithAdjacent(old,keys,'specificProgress',280);
   expect(width(next,'specificProgress')).toBe(280);
   expect(width(next,'room')).toBe(90);
   expect(width(next,'note')).toBe(240);
   expect(sum(next,keys)).toBe(total);
   expect(resizeProjectedWithAdjacent(next,keys,'specificProgress',200)).toEqual(old);
 });
 it('falls back to LAST only after the adjacent reaches its visible minimum',()=>{
   const old=defaultItemLayout(),keys=['specificProgress','room','note'];
   const next=resizeProjectedWithAdjacent(old,keys,'specificProgress',380);
   expect([width(next,'specificProgress'),width(next,'room'),width(next,'note')])
     .toEqual([380,60,170]);
   expect(sum(next,keys)).toBe(sum(old,keys));
   expect(validateItemLayout(next)).toBeTruthy();
   // Lower drag grows adjacent before last, regardless of its source position.
   const left=resizeProjectedWithAdjacent(old,keys,'specificProgress',160);
   expect([width(left,'specificProgress'),width(left,'room'),width(left,'note')])
     .toEqual([160,210,240]);
 });
 it('clamps at the joint visible minima, refusing phantom pixels',()=>{
   const old=defaultItemLayout(),keys=['content','stt','displayCode'];
   const bounds=projectedAdjacentBounds(old,keys,'content');
   expect(bounds).toEqual({min:60,max:456});
   const capped=resizeProjectedWithAdjacent(old,keys,'content',999);
   expect([width(capped,'content'),width(capped,'stt'),width(capped,'displayCode')])
     .toEqual([456,60,46]);
   expect(sum(capped,keys)).toBe(sum(old,keys));
   expect(resizeProjectedWithAdjacent(capped,keys,'content',999)).toBe(capped);
 });
 it('ID 52px remains untouched by normal adjacent moves; fallback converts raw once',()=>{
   const old=defaultItemLayout(),keys=['content','stt','displayCode'];
   const first=resizeProjectedWithAdjacent(old,keys,'content',450);
   expect(first.columns.find(c=>c.key==='displayCode')?.width).toBe(68);
   expect(width(first,'displayCode')).toBe(52);
   expect(width(first,'stt')).toBe(60);
   const second=resizeProjectedWithAdjacent(old,keys,'content',454);
   expect(width(second,'displayCode')).toBe(48);
   expect(projectedIdWidth(validateItemLayout(second).columns.find(c=>c.key==='displayCode')!.width))
     .toBe(48);
 });
 it('grouped 1600px cap has no phantom right drag and shrinks physically to 1590',()=>{
   for(const raw of [1470,1550,1600]){
     const old=defaultItemLayout();
     old.columns=old.columns.map(c=>c.key==='partyLevel'?{...c,width:raw}:c);
     const keys=['content','partyLevel','specificProgress','note'];
     const extras={partyLevel:130};
     const before=sum(old,keys,extras);
     expect(width(old,'partyLevel',130)).toBe(1600);
     expect(resizeProjectedWithAdjacent(old,keys,'partyLevel',1610,extras,true,extras)).toBe(old);
     const left=resizeProjectedWithAdjacent(old,keys,'partyLevel',1590,extras,true,extras);
     expect(width(left,'partyLevel',130)).toBe(1590);
     expect(width(left,'specificProgress')).toBe(210);
     expect(width(left,'note')).toBe(240);
     expect(sum(left,keys,extras)).toBe(before);
   }
 });
 it('materializes viewport auto-growth ONCE so a visibly wide adjacent can shrink',()=>{
   const old=defaultItemLayout(),keys=['specificProgress','room','note'];
   const originals=[200,170,240].map((width,i)=>({key:keys[i],width}));
   const fitted=fitTableColumns(originals,1000,{specificProgress:2,room:1,note:1});
   expect(Object.values(fitted).reduce((a,b)=>a+b,0)).toBe(1000);
   const extras=Object.fromEntries(keys.map(k=>[k,fitted[k]-width(old,k)]));
   const before=keys.reduce((n,k)=>n+fitted[k],0);
   const next=resizeProjectedWithAdjacent(old,keys,'specificProgress',
     fitted.specificProgress+200,extras,true,{});
   expect(next).not.toBe(old);
   expect(width(next,'specificProgress')).toBe(fitted.specificProgress+200);
   expect(width(next,'room')).toBe(fitted.room-200);
   expect(width(next,'note')).toBe(fitted.note);
   expect(sum(next,keys)).toBe(before);
   expect(validateItemLayout(next)).toBeTruthy();
   const stable=fitTableColumns(keys.map(k=>({key:k,width:width(next,k)})),1000);
   expect(stable).toEqual(Object.fromEntries(keys.map(k=>[k,width(next,k)])));
 });
 it('preview plan and committed projected layout have identical adjacent/fallback pixels',()=>{
   const old=defaultItemLayout(),keys=['specificProgress','room','note'];
   const plan=planAdjacentTransfer(200,380,{min:60,max:1600},
     {width:170,min:60,max:1600},{width:240,min:60,max:1600});
   const layout=resizeProjectedWithAdjacent(old,keys,'specificProgress',380);
   expect([plan.target,plan.adjacent,plan.last])
     .toEqual(keys.map(k=>width(layout,k)));
   expect(plan.min).toBe(60);expect(plan.max).toBe(490);
 });
 it('last displayed column cannot have a divider; reordered/hidden scopes use current neighbor',()=>{
   const old=defaultItemLayout(),keys=['room','content','note'];
   expect(projectedAdjacentBounds(old,keys,'note')).toBeNull();
   expect(resizeProjectedWithAdjacent(old,keys,'note',999)).toBe(old);
   const changed=resizeProjectedWithAdjacent(old,keys,'room',250);
   expect(width(changed,'room')).toBe(250);
   expect(width(changed,'content')).toBe(360);
   expect(width(changed,'note')).toBe(240);
   expect(sum(changed,keys)).toBe(sum(old,keys));
 });
});
