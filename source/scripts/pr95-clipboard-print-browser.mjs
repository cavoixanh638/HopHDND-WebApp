/** Real Chromium acceptance for PREVIEW-ONLY clipboard paste, search-column
 * selection and A4 landscape print. Never contacts a production backend. */
import {createServer} from 'node:http';
import {readFileSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const location=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(location==='/'?'/compact-qa.html':location));
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('not found');
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
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
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
  const toggle=page.getByRole('button',
    {name:'Mở hoặc đóng các tùy chọn hiển thị và công cụ quản trị Danh sách'});
  await toggle.click();
  const checks=page.locator('.admin-search-scope-options input[type=checkbox]');
  const count=await checks.count();
  assert(count>=13,'Missing configurable search columns');
  for(let index=0;index<count;index++){
    const option=checks.nth(index);
    if(await option.getAttribute('aria-label')!=='Tìm trong Nội dung trình')
      await option.uncheck();
  }
  await page.locator('.list-filter-search').fill('Sở mẫu A');
  await page.locator('.item-data-table td.empty').waitFor();
  await page.getByRole('checkbox',{name:'Tìm trong Sở, ngành chủ trì'}).check();
  await page.locator('.item-data-table tbody tr:not(:has(td.empty))').first().waitFor();
  await page.locator('.list-filter-search').fill('');
  await page.locator('.item-data-table tbody tr').first().waitFor();

  await page.getByRole('button',{name:'Dán nhiều ô từ Excel'}).click();
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
    return {noWrap:st?.whiteSpace,break:st?.wordBreak};
  });
  assert.equal(renderInfo.noWrap,'nowrap','ID nowrap not effective in print');
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
  const readPage=index=>{
    const result=spawnSync('pdftotext',
      ['-f',String(index),'-l',String(index),'-layout',pdfPath,'-'],
      {encoding:'utf8'});
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
    codeColumn:printed.codeCol
  }));
}finally{
  await context?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  await new Promise(done=>server.close(done));
}
