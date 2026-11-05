import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {createDemoItems} from '../../data/demo-items';
import type {Item,TextField} from '../../../shared/types';
import type {CompactPair} from './compact-columns';
import {CompactGroupedValue,compactPartyLevelLabel,compactStageVisualTone} from './CompactGroupedValue';

const progressPair:CompactPair={
  anchor:'partyLevel',hidden:'progressParty',
  hiddenFields:['progressParty','progressBuild','progressCouncil'],
  memberFields:['partyLevel','progressParty','progressBuild','progressCouncil'],
  tags:['Cấp','Thành ủy','Xây dựng NQ','Ban hành NQ'],
  label:'Tiến độ 3 khâu',extraWidth:130,variant:'partyTogether'
};
const documentPair:CompactPair={
  anchor:'content',hidden:'department',hiddenFields:['department','type'],
  memberFields:['type','department','content'],
  tags:['Loại VB','Sở','Nội dung'],label:'Nội dung trình',
  extraWidth:0,variant:'contentDetails'
};

const fixture=(patch:Partial<Item>={}):Item=>({
  ...createDemoItems(1)[0],partyLevel:'BCH',
  progressParty:'Đã có TBKL',progressBuild:'Sở chưa trình',
  progressCouncil:'Hoàn thành',department:'Sở mẫu A',type:'QPPL',
  ...patch
});
const group=(item:Item,pair:CompactPair,rights:readonly TextField[]=[])=>{
  const writable=new Set(rights);
  const field=vi.fn((key:TextField)=>
    <button className="cell-picker-trigger" type="button" aria-label={key}>{item[key]}</button>);
  const markup=renderToStaticMarkup(<CompactGroupedValue item={item} pair={pair}
    field={field} tone={()=>undefined} editable={key=>writable.has(key)}/>);
  return {markup,field};
};

describe('UI 05/11 — compact grouped picker/party-level projection',()=>{
  it('uses 2 tracks when level is readonly, while independent status rights stay available',()=>{
    const {markup}=group(fixture({partyLevel:'BTV TU'}),progressPair,['progressParty','progressBuild']);
    expect(markup).toContain('data-level-layout="readonly"');
    expect(markup).toContain('Thành ủy');
    expect(markup).toContain('(</span>BTV<span');
    expect(markup).not.toContain('BTV TU');
    expect(markup).toContain('data-ui-reference-part="partyLevel"');
    expect(markup).toContain('data-ui-reference-part="progressBuild"');
    expect(markup).toContain('data-editable="true"');
    expect(markup).not.toContain('data-level-editor="true"');
  });
  it('uses 3 aligned semantic tracks only when partyLevel itself is editable',()=>{
    const {markup}=group(fixture(),progressPair,
      ['partyLevel','progressParty','progressBuild','progressCouncil']);
    expect(markup).toContain('data-level-layout="editable"');
    expect(markup).toContain('data-level-editor="true"');
    expect(markup).toContain('data-ui-picker-skin="standard"');
    for(const key of ['progressParty','progressBuild','progressCouncil'])
      expect(markup).toContain(`data-ui-reference-part="${key}"`);
    expect((markup.match(/data-stage-field=/g)??[]).length).toBe(3);
  });
  it('projects Không to inert Không phải trình without calling progressParty editor',()=>{
    const {markup,field}=group(fixture({partyLevel:'Không',progressParty:'Sở chưa trình'}),
      progressPair,['partyLevel','progressParty','progressBuild']);
    expect(markup).toContain('data-level-layout="editable"');
    expect(markup).toContain('data-level-not-required="true"');
    expect(markup).toContain('Không phải trình');
    expect(markup).toContain('data-progress-tone="neutral"');
    expect(field.mock.calls.map(([key])=>key)).toContain('partyLevel');
    expect(field.mock.calls.map(([key])=>key)).not.toContain('progressParty');
    const party=markup.match(/<span class="compact-stage-state"[^>]*data-ui-reference-part="progressParty"[^>]*>/)?.[0]??'';
    expect(party).not.toContain('data-editable="true"');
  });
  it('does not repeat Không in a readonly level label and still marks its semantic subfield',()=>{
    const {markup,field}=group(fixture({partyLevel:'Không',progressParty:'Đã có TBKL'}),
      progressPair,['progressParty']);
    expect(markup).toContain('data-level-layout="readonly"');
    expect(markup).toContain('data-level-not-required="true"');
    expect(markup).not.toContain('(</span>Không<span');
    expect(markup).toContain('data-ui-reference-part="partyLevel"');
    expect(field.mock.calls.map(([key])=>key)).not.toContain('progressParty');
  });
  it('preserves L01 member-specific control/marker ownership',()=>{
    const {markup}=group(fixture(),documentPair,['department','type']);
    for(const key of ['content','department','type'])
      expect(markup).toContain(`data-ui-reference-part="${key}"`);
    expect(markup).toContain('data-ui-reference-group="L01"');
    expect(markup).toContain('data-metadata-mode="editable"');
    expect((markup.match(/data-ui-picker-skin="standard"/g)??[]).length).toBe(2);
  });
  it('normalizes legacy view labels while retaining neutral R05 visual tone',()=>{
    expect(compactPartyLevelLabel('BTV TU')).toBe('BTV');
    expect(compactPartyLevelLabel('Không')).toBe('Không');
    expect(compactPartyLevelLabel('TTTU')).toBe('TTTU');
    expect(compactStageVisualTone('Không phải trình','done')).toBe('neutral');
  });
  it('keeps CSS stage tracks compact; independent widths are WIDTH worker responsibility',()=>{
    const css=readFileSync(new URL('./item-frame.css',import.meta.url),'utf8');
    const added=css.split('/* UI 2026-11-05 / PICKER.')[1]??'';
    expect(added).not.toBe('');
    expect(added).not.toMatch(/minmax\([^)]*,\s*1fr\)/);
    expect(added).toContain('--ui-stage-level-track:90px');
    expect(added).toContain('--ui-stage-status-track:238px');
    expect(added).toContain('grid-template-columns:subgrid!important');
    expect(added).not.toContain('resize:');
  });
});
