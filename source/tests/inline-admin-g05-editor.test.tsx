import {beforeEach,describe,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({
  slots:[] as unknown[],i:0,
  begin(){this.i=0;},
  reset(){this.slots=[];this.i=0;},
  useState(initial:unknown){
    const id=this.i++;
    if(!(id in this.slots))this.slots[id]=typeof initial==='function'?(initial as ()=>unknown)():initial;
    return [this.slots[id],(next:unknown)=>{
      this.slots[id]=typeof next==='function'?(next as (old:unknown)=>unknown)(this.slots[id]):next;
    }];
  },
}));
vi.mock('react',()=>({
  useState:(initial:unknown)=>hooks.useState(initial),
  useMemo:(calculate:()=>unknown)=>calculate(),
}));
import {G05ChoiceEditor} from '../src/features/items/inline-g05-choice-editor';
import type {G05ChoiceEditorProps} from '../src/features/items/inline-g05-choice-editor';
import {g05ApplyCatalogAction} from '../src/features/items/inline-g05-catalog-logic';
import {catalogFromItems,validateCatalog} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';

function all(node:any):any[]{
  if(Array.isArray(node))return node.flatMap(all);
  if(!node||typeof node!=='object')return [];
  return [node,...all(node.props?.children)];
}
function draw(props:G05ChoiceEditorProps){
  hooks.begin();
  return G05ChoiceEditor(props);
}
function input(tree:any,label:string){
  const node=all(tree).find(n=>n.type==='input'&&n.props?.['aria-label']===label);
  expect(node,'missing input '+label).toBeDefined();
  return node;
}
function button(tree:any,label:string){
  const node=all(tree).find(n=>n.type==='button'&&n.props?.children===label);
  expect(node,'missing button '+label).toBeDefined();
  return node;
}
beforeEach(()=>hooks.reset());

describe('G05 catalog mini-editor keyboard, save boundary, and reload fixtures',()=>{
  it('Enter commits one catalog choice; typing/searching never invoke persistence',()=>{
    const onApply=vi.fn();
    const props:G05ChoiceEditorProps={label:'Sở ngành',options:['Sở Nội vụ','Sở Y tế'],onApply};
    let tree=draw(props);
    input(tree,'Thêm lựa chọn Sở ngành').props.onChange({currentTarget:{value:'Sở Giáo dục'}});
    expect(onApply).not.toHaveBeenCalled();
    tree=draw(props);
    input(tree,'Thêm lựa chọn Sở ngành').props.onKeyDown({
      key:'Enter',preventDefault:vi.fn(),
    });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({type:'add',value:'Sở Giáo dục'});
    tree=draw(props);
    input(tree,'Tìm lựa chọn Sở ngành').props.onChange({currentTarget:{value:'NOI VU'}});
    expect(onApply).toHaveBeenCalledTimes(1);
    tree=draw(props);
    expect(all(tree).filter(n=>n.type==='li')).toHaveLength(1);
  });

  it('Escape cancels an unfinished rename without mutation; rename Enter commits once',()=>{
    const onApply=vi.fn();
    const props:G05ChoiceEditorProps={label:'Phòng',options:['Phòng Một','Phòng Hai'],onApply};
    let tree=draw(props);
    button(tree,'Đổi tên').props.onClick();
    tree=draw(props);
    input(tree,'Tên mới cho Phòng Một').props.onChange({currentTarget:{value:'Phòng mới'}});
    tree=draw(props);
    input(tree,'Tên mới cho Phòng Một').props.onKeyDown({key:'Escape'});
    tree=draw(props);
    expect(input(tree,'Tìm lựa chọn Phòng')).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
    button(tree,'Đổi tên').props.onClick();
    tree=draw(props);
    input(tree,'Tên mới cho Phòng Một').props.onChange({currentTarget:{value:'Phòng mới'}});
    tree=draw(props);
    input(tree,'Tên mới cho Phòng Một').props.onKeyDown({key:'Enter',preventDefault:vi.fn()});
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({type:'rename',previous:'Phòng Một',value:'Phòng mới'});
  });

  it('used source entries expose usage counts but disable rename/delete',()=>{
    const onApply=vi.fn();
    const tree=draw({label:'Sở',options:['Sở Nội vụ','Sở Y tế'],usedValues:[' SỞ NỘI VỤ '],onApply});
    const first=all(tree).find(n=>n.type==='li');
    const buttons=all(first).filter(n=>n.type==='button');
    expect(buttons.find(n=>n.props.children==='Đổi tên')?.props.disabled).toBe(true);
    expect(buttons.find(n=>n.props.children==='Xóa')?.props.disabled).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('drag/drop commits a single reorder after drop; arrow buttons remain keyboard reachable',()=>{
    const onApply=vi.fn();
    const props:G05ChoiceEditorProps={label:'Loại',options:['A','B','C'],onApply};
    let tree=draw(props);
    const rows=all(tree).filter(n=>n.type==='li');
    expect(rows).toHaveLength(3);
    expect(rows[0].props.draggable).toBe(true);
    const transfer={effectAllowed:''};
    rows[0].props.onDragStart({dataTransfer:transfer});
    expect(transfer.effectAllowed).toBe('move');
    expect(onApply).not.toHaveBeenCalled();
    tree=draw(props);
    const nextRows=all(tree).filter(n=>n.type==='li');
    const preventDefault=vi.fn();
    nextRows[1].props.onDragOver({preventDefault});
    expect(preventDefault).toHaveBeenCalled();
    nextRows[1].props.onDrop({preventDefault});
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({type:'move',value:'A',to:1});
    expect(button(tree,'↑').props.disabled).toBe(true);
  });

  it('undo restores an unsaved list after a removal without a writer call',()=>{
    const rollback=vi.fn(),onApply=vi.fn().mockReturnValue(rollback);
    const props:G05ChoiceEditorProps={label:'Phòng',options:['A','B'],onApply};
    let tree=draw(props);
    button(tree,'Xóa').props.onClick();
    tree=draw(props);
    button(tree,'↶ Hoàn tác thay đổi danh sách vừa thực hiện').props.onClick();
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({type:'remove',value:'A'});
  });

  it('long catalog remains searchable without additions; official statuses have no mutation controls',()=>{
    const onApply=vi.fn(),values=Array.from({length:140},(_,i)=>i===56?'Sở Đà Nẵng':`Phòng số ${i}`);
    const props:G05ChoiceEditorProps={label:'Sở',options:values,onApply};
    let tree=draw(props);
    expect(all(tree).filter(n=>n.type==='li')).toHaveLength(140);
    input(tree,'Tìm lựa chọn Sở').props.onChange({currentTarget:{value:'da nang'}});
    tree=draw(props);
    expect(all(tree).filter(n=>n.type==='li')).toHaveLength(1);
    expect(onApply).not.toHaveBeenCalled();
    hooks.reset();
    const locked=draw({label:'Trạng thái',options:['Hoàn thành'],locked:true,onApply});
    expect(all(locked).filter(n=>n.type==='button')).toHaveLength(0);
    expect(input(locked,'Tìm lựa chọn Trạng thái')).toBeTruthy();
  });

  it('reloaded validated catalog keeps Unicode choices, order, links and source records',()=>{
    const items=createDemoItems(1),sourceBefore=JSON.stringify(items);
    let persisted=catalogFromItems(items);
    persisted=g05ApplyCatalogAction(persisted,items,'department',{type:'add',value:'  Sở Giáo dục '});
    persisted=g05ApplyCatalogAction(persisted,items,'department',{type:'move',value:'Sở Giáo dục',to:0});
    const saved=JSON.stringify(validateCatalog(persisted));
    const reopened=validateCatalog(JSON.parse(saved));
    expect(reopened.options.department[0]).toBe('Sở Giáo dục');
    expect(reopened.specialistRooms).toEqual(persisted.specialistRooms);
    expect(reopened.groupIdentities).toEqual(persisted.groupIdentities);
    expect(JSON.stringify(items)).toBe(sourceBefore);
  });
});
