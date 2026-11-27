/** Real Chromium acceptance for PREVIEW-ONLY clipboard paste, search-column
 * selection and A4 landscape print. Never contacts a production backend. */
import {createServer} from 'node:http';
import {readFileSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const location=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(location==='/'?'/compact-qa.html':location));
    if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('not found');
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.woff2':'font/woff2','.png':'image/png'};
    res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream',
      'cache-control':'no-store'});res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const address='http://127.0.0.1:'+server.address().port;
let browser,context;
const external=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin===address)return route.continue();
    external.push(u.href);return route.abort();
  });
  await page.goto(address+'/compact-qa.html?full=1&preview-role=admin',
    {waitUntil:'networkidle',timeout:40000});
  await page.locator('.item-data-table tbody tr').first().waitFor();
  const initial=await page.locator('.item-data-table tbody tr').count();
  assert.equal(initial,27,'Fixture row count');
  // The single search-column picker now lives beside the search input,
  // not inside a second expanded "Tùy chọn" block.
  await page.getByRole('button',{name:'Chọn cột tìm kiếm không dấu'}).click();
  await page.locator('.inline-g01-search-choices input').first().waitFor();
  const checks=page.locator('.inline-g01-search-choices input[type=checkbox]');
  const count=await checks.count();
  assert(count>=13,'Missing configurable search columns');
  for(let index=0;index<count;index++){
    const option=checks.nth(index);
    const label=await option.locator('..').innerText();
    if(label.trim()!=='Nội dung trình')await option.uncheck();
  }
  await page.locator('.list-filter-search').fill('Sở mẫu A');
  await page.locator('.item-data-table td.empty').waitFor();
  await page.locator('.inline-g01-search-choices label')
    .filter({hasText:'Sở, ngành chủ trì'}).locator('input').check();
  await page.locator('.item-data-table tbody tr:not(:has(td.empty))').first().waitFor();
  await page.locator('.list-filter-search').fill('');
  await page.locator('.item-data-table tbody tr').first().waitFor();

  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Dán từ Excel'}).click();
  const dialog=page.getByRole('dialog',{name:'Dán dữ liệu hàng loạt từ Excel'});
  await dialog.waitFor();
  await dialog.getByRole('textbox',{name:'Dán dữ liệu nhiều ô từ Excel'}).fill(
    'Nội dung QA dán số 1\tSở mô phỏng mới A\r\nNội dung QA dán số 2\tSở mô phỏng mới B');
  await dialog.getByRole('button',{name:'Kiểm tra và xem trước'}).click();
  const planned=await dialog.locator('.bulk-paste-review').innerText();
  assert(planned.includes('hồ sơ')&&planned.includes('ô'),'Missing staged paste preview');
  assert.equal(await page.locator('.item-data-table tbody tr').first()
    .getByText('Nội dung QA dán số 1').count(),0,'Preview mutated table before approval');
  await dialog.getByRole('button',{name:/Xác nhận dán .* ô vào RAM/}).click();
  await dialog.waitFor({state:'hidden'});
  await page.locator('.item-data-table tbody tr').first()
    .getByText('Nội dung QA dán số 1').waitFor();
  const second=await page.locator('.item-data-table tbody tr').nth(1).innerText();
  assert(second.includes('Nội dung QA dán số 2'),'Second pasted row lost');

  await page.evaluate(()=>{
    window.__hdndPrintCalled=0;
    window.print=()=>{window.__hdndPrintCalled++;};
  });
  await page.getByRole('button',{name:'In hoặc lưu PDF A4 ngang'}).click();
  const printed=await page.evaluate(()=>{
    const root=document.getElementById('hdnd-a4-print-root');
    const table=root?.querySelector('table');
    return {
      invoked:window.__hdndPrintCalled,
      elements:[...(root?.children??[])].map(e=>e.tagName),
      title:root?.querySelector('h1')?.textContent,
      printRows:table?.tBodies[0]?.rows.length,
      screenRows:document.querySelector('.item-data-table')?.tBodies[0]?.rows.length,
      printedColumns:table?.tHead?.rows[0]?.cells.length,
      sourceColumns:document.querySelector('.item-data-table')?.tHead?.rows[0]?.cells.length,
      content:table?.textContent??'',
      style:document.getElementById('hdnd-a4-print-root-style')?.textContent??'',
      id:table?.tBodies[0]?.rows[0]?.querySelector('[data-print-kind="displayCode"]')?.textContent?.trim(),
      codeCol:table?.querySelector('col.hdnd-print-id-col')?.style.width,
      stages:Array.from(table?.tBodies[0]?.rows[0]?.querySelectorAll('.hdnd-print-stage-row')??[])
        .map(row=>({label:row.querySelector('.hdnd-print-stage-label')?.textContent?.trim(),
          status:row.querySelector('.hdnd-print-stage-state')?.textContent?.trim()})),
      staff:Array.from(table?.tBodies[0]?.rows[0]?.querySelectorAll('.hdnd-print-staff-row')??[])
        .map(row=>({tag:row.querySelector('.hdnd-print-staff-tag')?.textContent?.trim(),
          value:row.querySelector('.hdnd-print-staff-value')?.textContent?.trim()}))
    };
  });
  assert.equal(printed.invoked,1,'Print command not invoked');
  assert.deepEqual(printed.elements,['H1','TABLE'],'Print must have title + table ONLY');
  assert(printed.title?.includes('Danh sách các ND trình HĐND'),'Incorrect print heading');
  assert.equal(printed.printRows,printed.screenRows,'Printed rows differ from visible table');
  assert.equal(printed.printedColumns,printed.sourceColumns,'Print omitted visible column');
  assert(printed.content.includes('Nội dung QA dán số 1'),'Print did not use updated visible data');
  assert(printed.style.includes('size:A4 landscape;'),'Paper size wrong');
  assert(printed.style.includes('@page:first{@top-center{content:none}}'),
    'First-page number suppression missing');
  assert(printed.style.includes('content:counter(page)'),'Bare page number missing');
  assert(Number.parseFloat(printed.codeCol)>=5,'ID column not reserved at least 15mm');
  assert(printed.id&&!printed.id.includes('\n'),'Print ID still splits into lines');
  assert.equal(printed.stages.length,3,'Three L03 stage rows not reconstructed');
  assert(printed.stages.every(s=>s.label&&s.status),
    'Some L03 stage labels or status values lost');
  assert(printed.stages[0].label.includes('Thành ủy'),'L03 first label changed');
  assert(printed.stages[1].label.includes('Trình'),'L03 second label changed');
  assert(printed.stages[2].label.includes('Trình'),'L03 third label changed');
  assert.deepEqual(printed.staff.map(s=>s.tag),['UBND','VP','Phòng','CV'],
    'L04 personnel must retain the four labeled rows in web order');
  assert(printed.staff.every(s=>s.value),'L04 lost a displayed name');
  await page.emulateMedia({media:'print'});
  const renderInfo=await page.evaluate(()=>{
    const c=document.querySelector('#hdnd-a4-print-root td[data-print-kind="displayCode"]');
    const st=c?getComputedStyle(c):null;
    const main=document.querySelector('#hdnd-a4-print-root .hdnd-print-document-main');
    const stages=[...document.querySelectorAll('#hdnd-a4-print-root .hdnd-print-stage-state')].map(badge=>{
      const value=badge.querySelector('.hdnd-print-stage-value');
      const row=badge.closest('.hdnd-print-stage-row'),outer=badge.closest('td');
      const label=row.querySelector('.hdnd-print-stage-label');
      const r=row.getBoundingClientRect(),t=outer.getBoundingClientRect();
      const b=badge.getBoundingClientRect(),l=label.getBoundingClientRect(),v=value?.getBoundingClientRect();
      const css=getComputedStyle(badge),rowCss=getComputedStyle(row),labelCss=getComputedStyle(label);
      const labelRange=document.createRange();
      labelRange.selectNodeContents(label);
      const labelTextRect=labelRange.getBoundingClientRect();
      const labelTextLeft=l.left+parseFloat(labelCss.paddingLeft)+parseFloat(labelCss.borderLeftWidth);
      const previous=row.previousElementSibling;
      const before=previous?.getBoundingClientRect();
      const borderWidths=['Top','Right','Bottom','Left'].map(side=>parseFloat(rowCss['border'+side+'Width']));
      const borderStyles=['Top','Right','Bottom','Left'].map(side=>rowCss['border'+side+'Style']);
      const previousDivider=previous?.querySelector('.hdnd-print-stage-state')?.getBoundingClientRect();
      return {tone:badge.dataset.tone,rowTone:row.dataset.tone,background:rowCss.backgroundColor,
        outerBorderWidths:borderWidths,outerBorderStyles:borderStyles,
        divider:parseFloat(css.borderLeftWidth),dividerStyle:css.borderLeftStyle,
        extraStateBorders:['Top','Right','Bottom'].map(side=>parseFloat(css['border'+side+'Width'])),
        weight:css.fontWeight,fontStyle:css.fontStyle,color:css.color,align:css.textAlign,
        labelAlign:labelCss.textAlign,labelJustify:labelCss.justifyContent,
        labelStartsAtLeft:labelTextRect.width>0&&Math.abs(labelTextRect.left-labelTextLeft)<=1,
        pseudo:getComputedStyle(badge,'::before').content,
        label:label.textContent?.trim(),text:value?.textContent?.trim(),
        overflow:r.right>t.right+1||r.left<t.left-1||l.left<r.left-1||b.right>r.right+1||
          l.right>b.left+1||!v||v.left<b.left-1||v.right>b.right+1||
          v.top<b.top-1||v.bottom>b.bottom+1||
          label.scrollWidth>label.clientWidth+2||value.scrollWidth>value.clientWidth+2,
        centered:!!v&&Math.abs((v.left+v.right-b.left-b.right)/2)<=1&&
          Math.abs((v.top+v.bottom-b.top-b.bottom)/2)<=1,
        aligned:!before||(Math.abs(r.left-before.left)<=1&&Math.abs(r.right-before.right)<=1&&
          !!previousDivider&&Math.abs(b.left-previousDivider.left)<=1),
        sharedDivider:Math.abs(l.right-b.left)<=1&&Math.abs(l.top-b.top)<=1&&Math.abs(l.bottom-b.bottom)<=1,
        leftRatio:l.width/(l.width+b.width),
        separated:!before||r.top-before.bottom>=1.5,
        height:r.height,gap:before?r.top-before.bottom:null};
    });
    const neutral=(color)=>{
      if(color==='transparent')return true;
      const m=color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
      return !!m&&m[1]===m[2]&&m[2]===m[3];
    };
    const root=document.getElementById('hdnd-a4-print-root');
    const nonMonochrome=[root,...root.querySelectorAll('*')].flatMap(el=>{
      const css=getComputedStyle(el);
      return ['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor']
        .filter(key=>!neutral(css[key])||(key==='color'&&css[key]!=='rgb(0, 0, 0)'))
        .map(key=>({tag:el.tagName,className:el.className,key,value:css[key]}));
    });
    return {noWrap:st?.whiteSpace,break:st?.wordBreak,
      contentWeight:main?getComputedStyle(main).fontWeight:null,stages,nonMonochrome};
  });
  assert.equal(renderInfo.noWrap,'nowrap','ID nowrap not effective in print');
  assert.equal(renderInfo.contentWeight,'400','Nội dung trình must be regular weight in print');
  assert.deepEqual(renderInfo.nonMonochrome,[],'Print elements must be black text and neutral paper/grid');
  assert.equal(renderInfo.stages.length,printed.printRows*3,'Every printed record must preserve all three stage boxes');
  assert(renderInfo.stages.length>=3&&renderInfo.stages.every(s=>
    s.label&&s.text&&s.tone&&s.rowTone===s.tone&&!s.overflow&&s.separated&&s.aligned&&
    s.centered&&s.sharedDivider&&Math.abs(s.leftRatio-.45)<=.015&&s.height>=18),
    'Print stage compartments must align, use a 45/55 split, remain spaced and fully contain text: '+JSON.stringify(renderInfo.stages));
  for(const stage of renderInfo.stages){
    assert.equal(stage.background,'rgb(255, 255, 255)','Closed stage box must remain white paper');
    assert.equal(stage.color,'rgb(0, 0, 0)','All stages must use black text');
    assert(stage.outerBorderWidths.every(width=>width>0),'Each entire label/status row needs four enclosing edges');
    assert(stage.outerBorderStyles.every(style=>style===(stage.tone==='not-required'?'dashed':'solid')),
      'Not required uses a dashed outer outline; other states use a solid outline');
    assert(stage.divider>0&&stage.dividerStyle==='solid','Require a thin solid vertical internal divider');
    assert(stage.divider<=Math.min(...stage.outerBorderWidths)+.01,'Internal divider must not be heavier than outline');
    assert(stage.extraStateBorders.every(width=>width===0),'Status must not have a separate nested outline');
    assert.equal(stage.labelAlign,'left','Stage label must align left');
    // Chromium can serialize flex-start as flow-start; assert actual text geometry.
    assert(stage.labelStartsAtLeft,'Label text must start at the inner left edge: '+JSON.stringify(stage));
    assert.equal(stage.align,'center','Status labels must be centered');
    assert.equal(stage.pseudo,'none','Status text must have no pictogram');
    assert.equal(stage.weight,stage.tone==='not-submitted'?'700':'400','Print weight must emphasize only not-yet-submitted');
    assert.equal(stage.fontStyle,stage.tone==='not-required'?'italic':'normal','Not required must be distinguishable in grayscale');
  }
  assert(new Set(renderInfo.stages.map(s=>s.tone)).size>=3,'Need several distinct status classes in fixture');
  console.log('PRINT_CLOSED_MONOCHROME_STAGE_COMPARTMENTS_PASS '+JSON.stringify({
    font:renderInfo.contentWeight,tones:[...new Set(renderInfo.stages.map(s=>s.tone))],
    count:renderInfo.stages.length,
    minGap:Math.min(...renderInfo.stages.map(s=>s.gap).filter(s=>s!==null)),
    minHeight:Math.min(...renderInfo.stages.map(s=>s.height)),
    minLeftRatio:Math.min(...renderInfo.stages.map(s=>s.leftRatio)),
    maxLeftRatio:Math.max(...renderInfo.stages.map(s=>s.leftRatio)),
    allCentered:renderInfo.stages.every(s=>s.centered),
    allAligned:renderInfo.stages.every(s=>s.aligned),
    allSharedDividers:renderInfo.stages.every(s=>s.sharedDivider)}));
  const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
  mkdirSync('qa-results/print-a4',{recursive:true});
  const pdfPath='qa-results/print-a4/hdnd-current-visible-a4.pdf';
  // Always archive the real PDF, even if pagination inspection finds a defect.
  writeFileSync(pdfPath,pdf);
  const info=spawnSync('pdfinfo',[pdfPath],{encoding:'utf8'});
  assert.equal(info.status,0,'PDF info failed: '+(info.stderr??''));
  const pages=Number(info.stdout.match(/^Pages:\s*(\d+)/m)?.[1]??0);
  assert(pages>=2,'Multipage PDF test requires at least 2 pages');
  assert(/Page size:\s*84[012]\.?\d* x 59[45]/.test(info.stdout),
    'Generated PDF not A4 landscape: '+info.stdout);
  // Render the original PDF to RGB (NOT -gray) and inspect every page.
  // This catches unexpected inherited colors and PDF margin/header colors
  // that a grayscale preview or a DOM-only test would otherwise conceal.
  for(let index=1;index<=pages;index++){
    const raster=spawnSync('pdftoppm',['-f',String(index),'-l',String(index),'-r','72','-singlefile',pdfPath],
      {maxBuffer:8*1024*1024});
    assert.equal(raster.status,0,'Original PDF RGB render failed: '+String(raster.stderr??''));
    const image=raster.stdout;
    const header=image.subarray(0,128).toString('latin1').match(/^P6\s+(\d+)\s+(\d+)\s+255\r?\n/);
    assert(header,'Invalid PPM header on print page '+index);
    const count=Number(header[1])*Number(header[2])*3;
    assert.equal(image.length-header[0].length,count,'Unexpected raster size');
    let nonNeutral=0;
    for(let i=header[0].length;i<image.length;i+=3){
      // Allow one channel's rounding unit from the PDF rasterizer.
      if(Math.max(image[i],image[i+1],image[i+2])-Math.min(image[i],image[i+1],image[i+2])>1)nonNeutral++;
    }
    assert.equal(nonNeutral,0,'Original PDF page contains non-gray pixels: '+index);
  }
  console.log('PRINT_MONOCHROME_ALL_PAGES_PASS '+JSON.stringify({pages}));
  const readPage=index=>{
    let result=spawnSync('pdftotext',
      ['-f',String(index),'-l',String(index),'-layout',pdfPath,'-'],
      {encoding:'utf8'});
    if(result.error?.code==='ENOENT'&&process.env.PR159_PYTHON){
      result=spawnSync(process.env.PR159_PYTHON,['-c',
        'from pypdf import PdfReader; import sys; print(PdfReader(sys.argv[1]).pages[int(sys.argv[2])-1].extract_text(extraction_mode="layout") or "")',
        pdfPath,String(index)],{encoding:'utf8'});
    }
    assert.equal(result.status,0,'pdftotext failed: '+(result.stderr??''));
    return result.stdout.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  };
  const first=readPage(1),secondPage=readPage(2);
  assert(first[0].includes('Danh sách các ND trình HĐND'),
    'Page 1 heading lost or unexpected number above title: '+JSON.stringify(first.slice(0,4)));
  assert.equal(secondPage[0],'2',
    'Page 2 must start with a BARE number 2: '+JSON.stringify(secondPage.slice(0,6)));
  if(pages>=3)assert.equal(readPage(3)[0],'3','Page 3 counter not 3');
  assert(first.join(' ').includes(printed.id),
    'Canonical first ID broke across lines in physical PDF: '+printed.id);
  const png=spawnSync('pdftoppm',['-f','1','-l','2','-r','100','-png',
    'qa-results/print-a4/hdnd-current-visible-a4.pdf',
    'qa-results/print-a4/page'],{encoding:'utf8'});
  assert.equal(png.status,0,'Unable to render the first two printed pages: '+(png.stderr??''));
  const gray=spawnSync('pdftoppm',['-f','1','-l','1','-r','100','-gray','-png',
    pdfPath,'qa-results/print-a4/page-gray'],{encoding:'utf8'});
  assert.equal(gray.status,0,'Unable to render monochrome print page: '+(gray.stderr??''));
  console.log('PRINT_GRAYSCALE_PAGE_RENDER_PASS');
  assert(!printed.content.includes('Tổng số nội dung'),'Added a summary into print');
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('#hdnd-a4-print-root').count(),0,'Print DOM not cleaned');

  assert.deepEqual(external,[],'External network request from isolated preview');
  console.log('HDND_CLIPBOARD_A4_CHROME_PASS '+JSON.stringify({
    initialRows:initial,searchColumns:count,bulkRows:2,
    printRows:printed.printRows,printColumns:printed.printedColumns,paper:'A4 landscape',
    extraneousPrintElements:0,externalRequests:0,
    stageRows:printed.stages.length,staffRows:printed.staff.length,
    code:printed.id,pageCount:pages,secondPageNumber:secondPage[0],
    codeColumn:printed.codeCol,
    pdfTextExtractor:process.env.PR159_PYTHON?'pypdf-layout-fallback-when-pdftotext-absent':'pdftotext-layout'
  }));
}finally{
  await context?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  await new Promise(done=>server.close(done));
}
