import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {STATUS_OPTIONS} from '../shared/field-definitions';
import {partyProgressEditIssue,selectablePartyProgress} from '../src/domain/party-progress-edit';
import {statusEditSelection,statusDisplayValue} from '../src/features/items/status-display';

describe('Guest cell status and visible save feedback',()=>{
  const base={partyLevel:'BCH',progressParty:'Sở chưa trình'};
  it('never offers forbidden Thành ủy no-submit status to BCH/BTV/TTTU',()=>{
    const all=STATUS_OPTIONS.progressParty;
    expect(all).toContain('Không phải trình');
    for(const level of ['BCH','BTV','TTTU','Ban Chấp hành Thành ủy']){
      const choices=selectablePartyProgress(level,all);
      expect(choices).not.toContain('Không phải trình');
      expect(choices).toContain('VP đang xử lý');
      expect(choices).toContain('Sở chưa trình');
    }
    expect(selectablePartyProgress('Không',all)).toEqual([]);
  });
  it('rejects invalid edits BEFORE optimistic draft and keeps valid status changes',()=>{
    expect(partyProgressEditIssue(base,{progressParty:'Không phải trình'}))
      .toMatch(/Cấp trình/);
    expect(partyProgressEditIssue({...base,partyLevel:'Không'},
      {progressParty:'Sở chưa trình'})).toMatch(/máy chủ/);
    expect(partyProgressEditIssue(base,{partyLevel:'Không',progressParty:'Không phải trình'}))
      .toMatch(/Chỉ sửa Cấp trình/);
    expect(partyProgressEditIssue(base,{partyLevel:'Không'})).toBeNull();
    expect(partyProgressEditIssue(base,{progressParty:'VP đang xử lý'})).toBeNull();
    expect(partyProgressEditIssue(base,{note:'Ghi chú hợp lệ'})).toBeNull();
  });
  it('preserves source/alias values when a picker is merely opened',()=>{
    expect(statusDisplayValue('progressParty','Văn phòng đang thực hiện'))
      .toBe('VP đang xử lý');
    expect(statusEditSelection('progressParty','Văn phòng đang thực hiện',
      'VP đang xử lý')).toBeNull();
  });
  it('routes rejected edits through false return to release the acquired picker lease',()=>{
    const app=readFileSync('src/app/App.tsx','utf8');
    const list=readFileSync('src/features/items/ItemList.tsx','utf8');
    const picker=readFileSync('src/features/items/CellPicker.tsx','utf8');
    expect(app.indexOf('partyProgressEditIssue(item,changes)'))
      .toBeLessThan(app.indexOf('leaseManager.markPending(id,field as EditableField)'));
    expect(app.indexOf('mayEdit(firebase.permissions'))
      .toBeLessThan(app.indexOf('leaseManager.markPending(id,field as EditableField)'));
    expect(list).toContain('selectablePartyProgress(item.partyLevel,available)');
    expect(list).toContain('return next===null?false:guardBuildUpdate');
    expect(picker).toContain('chosen.current=onChange(nextValue)!==false;');
  });
  it('shows a compact ID marker, never a full error paragraph in a narrow ID cell',()=>{
    const list=readFileSync('src/features/items/ItemList.tsx','utf8');
    expect(list).toContain('className="list-save-errors"');
    expect(list).toContain('className="item-save-error-marker"');
    expect(list).not.toContain('<p className="error-text" role="alert">{errors[item.recordId]}</p>');
    const css=readFileSync('src/features/items/real-list-visual-parity.css','utf8');
    expect(css).toContain('.item-data-table .item-save-error-marker');
    expect(css).toContain('white-space:nowrap;');
  });
  it('optimizes Spark reads without eliminating the server epoch and lease checks',()=>{
    const spark=readFileSync('src/data/spark-cell-api.ts','utf8');
    expect(spark).toContain('Promise.all([serverNow(db),assertEpoch()])');
    expect(spark).toContain('result.committed?result.snapshot.val()');
    expect(spark).toContain('holdValue(db,rowPath)');
    expect(spark).toContain('holdValue(db,leaseRoot');
  });
});
