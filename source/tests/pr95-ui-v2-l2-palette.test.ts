import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {defaultStatusPalette,statusPaletteCssVariables} from '../src/data/status-palettes';

const frame=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/styles/app.css',import.meta.url),'utf8');
const summary=readFileSync(new URL('../src/features/items/ItemSummaryCards.tsx',import.meta.url),'utf8');

const reference={
  source:{background:'#FFF1F3',text:'#B14052',border:'#EFD4DA'},
  office:{background:'#FFF8E9',text:'#805C22',border:'#EBDFC4'},
  next:{background:'#F0F5FC',text:'#3E6591',border:'#D7E2F0'},
  completed:{background:'#EEF8F1',text:'#346E48',border:'#D0E4D7'}
} as const;

function brightness(hex:string){
  const values=hex.slice(1).match(/../g)!.map(part=>parseInt(part,16)/255).map(value=>
    value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
}
function contrast(a:string,b:string){
  const [dark,light]=[brightness(a),brightness(b)].sort((a,b)=>a-b);
  return (light+0.05)/(dark+0.05);
}

describe('PR95 V2 L2 soft semantic palette, CSS only',()=>{
  it('keeps all four approved chips legible without changing stored status values',()=>{
    for(const [kind,swatch] of Object.entries(reference)){
      expect(frame).toContain('.item-summary-bucket[data-summary-stage="'+kind+'"]');
      expect(frame).toContain(swatch.background);
      expect(frame).toContain(swatch.text);
      expect(frame).toContain(swatch.border);
      expect(contrast(swatch.background,swatch.text),kind).toBeGreaterThanOrEqual(4.5);
    }
    expect(summary).toContain('data-summary-stage={bucket.stage}');
    expect(summary).toContain('aria-pressed={selection?.report===stage.id&&selection?.stage===bucket.stage}');
    expect(summary).toContain('{bucket.label}');
    expect(summary).not.toContain('✓'); // semantic data/DOM is unchanged; selection belongs in CSS
  });

  it('keeps every summary card white and neutrally bordered without a colored top stripe',()=>{
    expect(frame).toContain('background:#fff;\n  border:1px solid #DCE5E0;border-top:3px solid #DCE5E0');
    for(const className of ['party','build','nq']){
      expect(frame).toContain('.item-summary-'+className+'{--summary-accent:');
      expect(frame).not.toMatch(new RegExp('\\.item-summary-'+className+'\\{[^}]*background:#'));
    }
    expect(frame).toContain('.item-summary-percent{font-size:21px;font-weight:800;color:#526B64;');
    expect(frame).toContain('.item-summary-progress span{display:block;height:100%;background:var(--summary-accent)');
  });

  it('gives both baseline stage buttons and future type buttons a stable outline/check',()=>{
    expect(frame).toContain('.item-summary-bucket[aria-pressed="true"]');
    expect(frame).toContain('.item-summary-subcounts > :is(span,button)[data-summary-kind][aria-pressed="true"]');
    expect(frame).toContain("content:' ✓'");
    expect(frame).toContain('outline:2px solid #356C8B;outline-offset:1px');
    expect(frame).toContain('outline:3px solid #356C8B;outline-offset:2px');
    // The ring/check is separate: pressed state never overwrites the semantic background.
    const selected=frame.match(/\.item-summary-bucket\[aria-pressed="true"\][\s\S]*?\{([^}]*)\}/)?.[1];
    expect(selected).not.toContain('background:');
    expect(selected).not.toContain('color:');
  });

  it('synchronizes list and detail popups with user variables, without forcing otherEnabled',()=>{
    const palette=defaultStatusPalette();
    const vars=statusPaletteCssVariables(palette);
    expect(palette.otherEnabled).toBe(false);
    for(const [kind,group] of [
      ['source','not-submitted'],['office','office'],['completed','done']
    ] as const){
      expect(vars['--hdnd-status-'+group+'-bg']).toBe(reference[kind].background);
      expect(vars['--hdnd-status-'+group+'-text']).toBe(reference[kind].text);
      expect(vars['--hdnd-stage-'+group+'-border']).toBe(reference[kind].border);
    }
    expect(app).toContain('.report-detail-grid tbody td[data-progress-tone="office"]');
    expect(app).toContain('--workflow-border:var(--hdnd-stage-office-border,#EBDFC4)');
    expect(app).toContain('--workflow-border:var(--hdnd-stage-done-border,#D0E4D7)');
    expect(app).toContain('--workflow-text:var(--hdnd-status-done-text,#346E48)');
    expect(app).not.toContain('otherEnabled:true');
  });
});
