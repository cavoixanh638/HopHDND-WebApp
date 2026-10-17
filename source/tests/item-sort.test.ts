import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {sortItems} from '../src/domain/sort-items';

describe('stable list sorting without modifying sheet data',()=>{
  it('sorts numeric STT naturally and preserves source order as a fallback',()=>{
    const [first,second,third]=createDemoItems(3);
    const rows=[{...first,stt:10},{...second,stt:2},{...third,stt:2}];
    const sourceOrder=rows.map(item=>item.recordId);
    expect(sortItems(rows,{key:'stt',direction:'asc'}).map(item=>item.stt)).toEqual([2,2,10]);
    expect(sortItems(rows,{key:'stt',direction:'asc'}).slice(0,2).map(item=>item.recordId))
      .toEqual([rows[1].recordId,rows[2].recordId]);
    expect(sortItems(rows,{key:'stt',direction:'desc'}).map(item=>item.stt)).toEqual([10,2,2]);
    expect(rows.map(item=>item.recordId)).toEqual(sourceOrder);
    expect(sortItems(rows,null).map(item=>item.recordId)).toEqual(sourceOrder);
  });
  it('keeps blanks last in both directions, with Vietnamese text collation',()=>{
    const [a,b,c,d]=createDemoItems(4);
    const rows=[{...a,room:'—'},{...b,room:'Bắc'},{...c,room:'Ánh'},{...d,room:''}];
    expect(sortItems(rows,{key:'room',direction:'asc'}).map(i=>i.room))
      .toEqual(['Ánh','Bắc','—','']);
    expect(sortItems(rows,{key:'room',direction:'desc'}).map(i=>i.room))
      .toEqual(['Bắc','Ánh','—','']);
  });
  it('sorts custom fields by the displayed value, not a guessed source column',()=>{
    const rows=createDemoItems(3);
    const values=new Map([[rows[0].recordId,'Z'],[rows[1].recordId,'A'],[rows[2].recordId,'B']]);
    expect(sortItems(rows,{key:'custom_123',direction:'asc'},(item)=>values.get(item.recordId)??'')
      .map(item=>item.recordId)).toEqual([rows[1].recordId,rows[2].recordId,rows[0].recordId]);
  });
});
