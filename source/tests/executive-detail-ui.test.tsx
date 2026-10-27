import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDemoItems } from '../src/data/demo-items';
import { DEFAULT_REPORTS, aggregateReport } from '../src/domain/reporting';
import { defaultItemLayout } from '../src/data/item-preferences';
import { ExecutiveProgressCards, buildExecutiveSummary, filterByExecutiveStage, getExecutiveCards } from '../src/features/items/ExecutiveProgressCards';
import { ExecutiveDetailTable } from '../src/features/items/ExecutiveDetailTable';
import { abbreviateLeaderName, abbreviateVietnameseName } from '../src/features/items/compact-columns';

const config = (id: string) => DEFAULT_REPORTS.find(report => report.id === id)!;
const fixture = () => {
  const party = [
    'Sở chưa trình','VP đang thực hiện','Đã gửi ĐU','ĐU đã gửi TU, chưa họp',
    'Đã họp/xin phiếu, chưa có TBKL','Đã có TBKL','TU đã cho ý kiến','Không phải trình',
  ];
  const build = [
    'Sở chưa trình','VP đang thực hiện','Đã trình HĐND, chưa có QĐ',
    'Đã có QĐ chấp thuận','Không phải trình','Sở chưa trình','Đã có QĐ chấp thuận','VP đang thực hiện',
  ];
  return createDemoItems(8).map((item,index) => ({
    ...item,recordId:'qa-record-'+index,displayCode:'NQ'+String(index+1).padStart(2,'0'),
    documentKind:'NQ' as const,partyLevel:'TTTU',progressParty:party[index],
    progressBuild:build[index],progressCouncil:index===0?'Sở chưa trình':
      index===1?'VP đang thực hiện':'Đã trình HĐND thành phố',
    isDropped:false,archivedAt:null,
    specialist:'Nguyễn Văn An',room:'Phòng Tổng hợp',
    ubndLeader:'PCT Trần Văn Quân',vpLeader:'PCVP Trịnh Nam Hưng',
  }));
};
describe('Executive list UI: report count parity and six-column presentation', () => {
  it('party Bước tiếp theo is precisely the three intermediate states, no office or TBKL or unknown', () => {
    const items=fixture(),summary=buildExecutiveSummary(items,config('party'));
    const aggregate=aggregateReport(items,config('party'),'department');
    expect(summary.total).toBe(aggregate.total);
    expect(summary.completed).toBe(aggregate.completedCount);
    expect(summary.total).toBe(7);
    expect(summary.counts).toEqual({source:1,office:1,next:3,completed:1});
    expect(summary.unclassified).toBe(1);
    expect(summary.buckets.next.map(item=>item.displayCode)).toEqual(['NQ03','NQ04','NQ05']);
  });
  it('xây dựng: Đã trình HĐND, chưa có QĐ is ONE intermediate status',()=>{
    const summary=buildExecutiveSummary(fixture(),config('build'));
    expect(summary.total).toBe(7);
    expect(summary.counts.next).toBe(1);
    expect(summary.buckets.next[0].displayCode).toBe('NQ03');
    expect(summary.completed).toBe(2);
  });
  it('matches canonical report scoped totals and supports drill-down without changes to input data',()=>{
    const items=fixture(),before=JSON.stringify(items);
    const cards=getExecutiveCards(items,[config('party'),config('build'),config('council')]);
    expect(cards.map(card=>card.title)).toEqual([
      'Tiến độ xin ý kiến Thành ủy','Tiến độ trình xây dựng NQ','Tiến độ trình ban hành NQ',
    ]);
    for(const card of cards) {
      const aggregate=aggregateReport(items,card.config,'department');
      expect([card.total,card.percent,card.completed]).toEqual([
        aggregate.total,aggregate.percent??0,aggregate.completedCount,
      ]);
    }
    expect(filterByExecutiveStage(items,cards,{reportId:'party',stage:'next'}).map(item=>item.displayCode))
      .toEqual(['NQ03','NQ04','NQ05']);
    expect(filterByExecutiveStage(items,cards,null)).toHaveLength(8);
    expect(JSON.stringify(items)).toBe(before);
  });
  it('segments and cards are ordered Sở / VP / light intermediate / completed; council has three',()=>{
    const markup=renderToStaticMarkup(<ExecutiveProgressCards items={fixture()}
      configs={[config('party'),config('build'),config('council')]}
      selected={null} onSelect={()=>{}}/>);
    for(const key of ['executive-progress-source','executive-progress-office',
      'executive-progress-next','executive-progress-completed'])expect(markup).toContain(key);
    const first=markup.slice(markup.indexOf('executive-progress-track'),markup.indexOf('executive-status-grid'));
    const positions=['source','office','next','completed'].map(stage=>first.indexOf('executive-progress-'+stage));
    expect(positions).toEqual([...positions].sort((a,b)=>a-b));
    expect(markup).toContain('executive-status-grid-three');
    expect(markup).not.toContain('Khâu 01');
  });
  it('six physical presentation columns while retaining all original Excel fields',()=>{
    const items=fixture();
    const columns=defaultItemLayout().columns;
    const visibleFields=new Set(columns.map(c=>c.key));
    const markup=renderToStaticMarkup(<ExecutiveDetailTable items={[items[0]]}
      visibleFields={visibleFields} renderField={(item,field)=>String(item[field]??'')}
      hasDraft={()=>false} errorFor={()=>undefined} query="" onQuery={()=>{}}/>);
    expect(columns).toHaveLength(15);
    expect((markup.match(/<col class=/g)??[])).toHaveLength(6);
    expect(markup).toContain('NQ01');
    expect(markup).toContain('Phòng Tổng hợp');
    expect(markup).toContain('Thành ủy');
    expect(markup).toContain('TIẾN ĐỘ HIỆN TẠI');
    expect(markup).toContain('GHI CHÚ');
    const hiddenMarkup=renderToStaticMarkup(<ExecutiveDetailTable items={[items[0]]}
      visibleFields={new Set(['displayCode','content'])}
      renderField={(item,field)=>String(item[field]??'')}
      hasDraft={()=>false} errorFor={()=>undefined} query="" onQuery={()=>{}}/>);
    expect(hiddenMarkup).not.toContain('Phòng Tổng hợp');
    expect(hiddenMarkup).not.toContain('Sở Giáo dục');
    expect(abbreviateVietnameseName(items[0].specialist)).toBe('N.V.An');
    expect(abbreviateLeaderName(items[0].ubndLeader)).toBe('PCT T.V.Quân');
  });
});
