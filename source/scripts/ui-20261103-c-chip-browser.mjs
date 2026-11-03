// Reuse the synthetic full-app regression, adding chip geometry and real input checks.
// Run from source after npm run build:compact:qa. No backend or production data.
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve(process.env.CHIP_EVIDENCE_DIR??'docs/tasks/parallel-20261103-ui/evidence/C');
mkdirSync(out,{recursive:true});
let runner=readFileSync('scripts/pr95-v6-l4-browser.mjs','utf8').replaceAll('\r\n','\n');
runner=runner.replace("server.close();", "server.close();await delay(1200);");
runner=runner.replace("target.startsWith(root+'/')","target.startsWith(root+ (process.platform==='win32'?'\\\\':'/'))");
runner=runner.replace("const chrome=['google-chrome'", "const chrome=process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':null) || ['google-chrome'");
runner=runner.replace('writeFileSync(file,bytes);',`writeFileSync(resolve(${JSON.stringify(out)},file),bytes);`);
// Pointer activation goes through Chrome hit testing, not HTMLElement.click().
runner=runner.replace(/const click=async selector=>\{[\s\S]*?\n\};/,`const click=async selector=>{
  const point=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)return null;el.scrollIntoView({block:"center"});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  assert(point,'missing click '+selector);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
};`);
const matrix=async()=>{
  const chipMeasurements=[];
  const measure=async label=>{
    await evaluate("document.querySelector('.list-active-filters').scrollIntoView({block:'center'})");
    const geometry=await evaluate(`(()=>{
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height,cy:r.top+r.height/2}};
      const zone=document.querySelector('.list-active-filters');
      return {viewport:innerWidth,zone:rect(zone),scroll:zone.scrollWidth,client:zone.clientWidth,
        chips:[...zone.querySelectorAll('.list-active-filter-chip')].map(chip=>({id:chip.dataset.activeFilterId,
          chip:rect(chip),label:rect(chip.querySelector('.list-active-filter-chip-label')),
          value:rect(chip.querySelector('.list-active-filter-chip-value')),
          button:rect(chip.querySelector('button')),icon:rect(chip.querySelector('button svg, button span')),
          aria:chip.querySelector('button').getAttribute('aria-label')}))};
    })()`);
    chipMeasurements.push({label,...geometry});
    writeFileSync(resolve(CHIP_OUT,'chip-geometry.json'),JSON.stringify(chipMeasurements,null,2));
    await screenshot('chip-'+label+'.png');
    if(!process.env.CHIP_BASELINE){
      assert(geometry.scroll<=geometry.client+1,label+' zone overflow');
      for(const c of geometry.chips){
        assert(c.button.width>=31&&c.button.height>=31,label+' hit target '+c.id);
        assert(c.chip.right<=geometry.zone.right+1&&c.chip.left>=geometry.zone.left,label+' chip overflow '+c.id);
        assert(c.button.right<=c.chip.right&&c.button.left>=c.value.right-1,label+' button overlaps text '+c.id);
        assert(Math.abs(c.label.cy-c.value.cy)<=1&&Math.abs(c.value.cy-c.icon.cy)<=1,label+' center mismatch '+JSON.stringify(c));
        assert(c.aria?.startsWith('Bỏ điều kiện '),label+' accessible name '+c.id);
      }
    }
  };
  await evaluate("document.querySelector('.list-active-filters').scrollIntoView({block:'center'})");
  await measure('desktop-1440');
  for(const width of [900,390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await measure('width-'+width);
  }
  const original=await evaluate(`(()=>{const c=document.querySelector('[data-active-filter-id=search]');return [c.children[0].textContent,c.children[1].textContent]})()`);
  await evaluate(`(()=>{const c=document.querySelector('[data-active-filter-id=search]');c.children[0].textContent='Cột · Nhãn điều kiện tìm kiếm rất dài không bị che khuất';c.children[1].textContent='ChuỗiKhôngCóKhoảngTrắng'.repeat(8)})()`);
  await measure('long-320');
  await send('Emulation.setDeviceMetricsOverride',{width:900,height:1100,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelectorAll('.list-active-filter-chip').forEach(c=>c.style.fontSize='18px')");
  await measure('long-font-150-percent-900');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:1100,deviceScaleFactor:1,mobile:false});
  await measure('long-font-150-percent-390');
  await evaluate('(()=>{const c=document.querySelector("[data-active-filter-id=search]");const values='+JSON.stringify(original)+';c.children[0].textContent=values[0];c.children[1].textContent=values[1];document.querySelectorAll(".list-active-filter-chip").forEach(c=>c.style.removeProperty("font-size"));})()');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
};
runner=runner.replace('  // One X must',matrix.toString().slice(matrix.toString().indexOf('{' )+1,-1).replaceAll('CHIP_OUT',JSON.stringify(out))+'\n  // One X must');
runner=runner.replace("  await click('.list-active-filter-clear-all');\n  await expectInventory(0,27,'clear all without changing row data');",String.raw`
  await evaluate("document.querySelector('[data-active-filter-id=room] button').focus({preventScroll:true})");
  const outline=await evaluate("getComputedStyle(document.activeElement).outlineStyle");
  assert(outline==='solid','keyboard focus outline missing');
  await screenshot('chip-keyboard-focus.png');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await expectInventory(0,27,'Space removes remaining room only');
`);
await import('data:text/javascript;base64,'+Buffer.from(runner).toString('base64'));

