/**
 * LIVE production A4, read-only acceptance:
 * - public site and actual Firebase guest-visible dataset
 * - exact production-approved TypeScript print function, transpiled and invoked
 *   against the live rendered table, without pretending to be an Admin
 * - headless Chromium print renderer and disposable PDF (never upload content)
 *
 * Cannot prove the OS-native dialog for an authenticated Admin. That button
 * has separately passed live-browser presence/click-scope smoke in issue #180.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,rmSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {transform} from 'esbuild';

const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const origin='https://cavoixanh638.github.io';
const base=origin+'/HopHDND-WebApp/';
const expected='d44bc8407333ae4d6e0e4465341421ac8fac7e1f';
const version=await fetch(base+'version.json?readonly-a4='+expected,
  {headers:{'cache-control':'no-cache'}});
assert.equal(version.status,200,'Live version.json is not HTTP 200');
const record=await version.json();
assert.equal(record.mode,'spark');
assert.equal(record.source_sha,expected,'Live Pages not on the expected reviewed source');
const source=readFileSync('src/features/items/list-print.ts','utf8');
assert(source.includes('size:A4 landscape;')&&
  source.includes('@page:first{@top-center{content:none}}'),
  'Approved print code no longer implements A4 landscape and page-one suppression');
const transpiled=await transform(source,{
  loader:'ts',format:'iife',globalName:'__approvedHDNDPrint',target:'es2022'
});
const work=mkdtempSync(join(tmpdir(),'hophdnd-prod-a4-'));
const pdfPath=join(work,'live-hdnd-private.pdf');
let browser;
let writes=0;
const diagnostic={};
try{
  browser=await chromium.launch({
    headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  const context=await browser.newContext({
    viewport:{width:1600,height:950},locale:'vi-VN',
    acceptDownloads:false,permissions:[]
  });
  const page=await context.newPage();
  await page.route(/hophdnd-8b7b2-default-rtdb\.asia-southeast1\.firebasedatabase\.app/,route=>{
    if(!['GET','HEAD'].includes(route.request().method())){
      writes++;return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const failures=[];
  page.on('pageerror',error=>failures.push(String(error.message).slice(0,200)));
  const response=await page.goto(base+'?readonly-print-qa='+expected,{
    waitUntil:'domcontentloaded',timeout:65000
  });
  assert.equal(response?.status(),200,'Live Pages index not HTTP 200');
  await page.waitForFunction(()=>{
    const table=document.querySelector('table.item-data-table');
    return !!table&&table.querySelectorAll('tbody tr').length>=59&&
      !document.querySelector('.layout-loading-placeholder');
  },{timeout:100000});
  const data=await page.evaluate(()=>{
    const table=document.querySelector('table.item-data-table');
    const rows=[...table.querySelectorAll('tbody tr')];
    const ths=[...table.querySelectorAll('thead tr:first-child th')];
    const ids=rows.map(row=>row.getAttribute('data-ui-reference-record-id'));
    return {
      rows:rows.length,
      uniqueRecords:new Set(ids).size,
      columns:ths.length,
      firstColumns:rows[0]?.cells.length??0,
      title:document.querySelector('.item-list-page-title')?.textContent?.trim()??'',
      rowCellCounts:[...new Set(rows.map(row=>row.cells.length))],
      guestAdminBulkTools:document.querySelectorAll('.admin-bulk-paste-tools').length,
      url:location.origin+location.pathname
    };
  });
  assert.equal(data.url,base.replace(/\/$/,''));
  assert.equal(data.rows,59,'Live production guest list must show 59 records');
  assert.equal(data.uniqueRecords,59,'Live guest list has duplicate record IDs');
  assert(data.columns>=5,'No meaningful columns to print');
  assert.equal(data.columns,data.firstColumns,'Header/body print columns disagree');
  assert.deepEqual(data.rowCellCounts,[data.columns],'Some rows have different cell count');
  assert(data.title.includes('Danh sách'),'List heading not present');
  assert.equal(data.guestAdminBulkTools,0,'Guest unexpectedly sees Admin bulk edit tools');
  await page.addScriptTag({content:transpiled.code});
  const libOk=await page.evaluate(()=>
    typeof window.__approvedHDNDPrint?.printVisibleListA4==='function');
  assert(libOk,'Approved print function did not load into isolated read-only QA frame');
  const printed=await page.evaluate(()=>{
    window.__productionPrintInvocations=0;
    window.print=()=>{window.__productionPrintInvocations++};
    const table=document.querySelector('table.item-data-table');
    const title=document.querySelector('.item-list-page-title')?.textContent?.trim();
    const headers=[...table.querySelectorAll('thead tr:first-child th')]
      .map(th=>th.querySelector('.column-label')?.textContent?.trim()||
        th.textContent?.trim()||'');
    window.__approvedHDNDPrint.printVisibleListA4(title,table,headers);
    const root=document.getElementById('hdnd-a4-print-root');
    const printTable=root?.querySelector('table');
    const printCells=[...printTable?.querySelectorAll('tbody tr')??[]];
    return {
      invocations:window.__productionPrintInvocations,
      rootElements:[...root?.children??[]].map(x=>x.tagName),
      printedRows:printCells.length,
      printedColumns:printTable?.tHead?.rows[0]?.cells.length,
      printStageRows:printTable?.querySelectorAll('.hdnd-print-stage-row').length??0,
      printStaffRows:printTable?.querySelectorAll('.hdnd-print-staff-row').length??0,
      css:document.getElementById('hdnd-a4-print-root-style')?.textContent??'',
      titleOk:!!root?.querySelector('h1')?.textContent?.includes('Danh sách')
    };
  });
  assert.equal(printed.invocations,1,'Expected one print invocation');
  assert.deepEqual(printed.rootElements,['H1','TABLE'],'Print contains unrelated UI elements');
  assert.equal(printed.printedRows,data.rows,'Production print does not match 59 visible records');
  assert.equal(printed.printedColumns,data.columns,'A visible column was omitted');
  assert.equal(printed.titleOk,true,'Printed title missing');
  assert(printed.css.includes('size:A4 landscape;'),'Wrong production CSS paper size');
  assert(printed.css.includes('@page:first{@top-center{content:none}}'),
    'Missing first-page counter exception');
  assert(printed.css.includes('content:counter(page)'),
    'Missing page numbering for page 2 onwards');
  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({
    preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,
    timeout:65000
  });
  writeFileSync(pdfPath,pdf);
  const pdfInfo=spawnSync('pdfinfo',[pdfPath],{encoding:'utf8'});
  assert.equal(pdfInfo.status,0,'Cannot parse generated production PDF');
  const pageCount=Number(pdfInfo.stdout.match(/^Pages:\s*(\d+)/m)?.[1]??0);
  assert(pageCount>=2,'Production 59-row report must exercise multiple A4 pages');
  assert(/Page size:\s*84[012]\.?\d*\s*x\s*59[45]/.test(pdfInfo.stdout),
    'Production PDF is not A4 landscape');
  function pageLines(n){
    const out=spawnSync('pdftotext',
      ['-f',String(n),'-l',String(n),'-layout',pdfPath,'-'],
      {encoding:'utf8'});
    assert.equal(out.status,0,'PDF text extraction failed');
    return out.stdout.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  }
  const first=pageLines(1),second=pageLines(2);
  assert(first.length>0&&first[0].includes('Danh sách'),
    'First page does not begin with List heading');
  assert.equal(second[0],'2','Second page must begin with a bare page number 2');
  if(pageCount>=3)assert.equal(pageLines(3)[0],'3','Page three counter wrong');
  // Don't print or upload actual titles, IDs, notes or PDF. Production business
  // data only exists in memory/a throwaway /tmp file while this job runs.
  const pageOne=spawnSync('pdftoppm',
    ['-f','1','-l','1','-r','90','-png','-singlefile',pdfPath,join(work,'rendered-first')],
    {encoding:'utf8'});
  assert.equal(pageOne.status,0,'Live first-page PDF render failed');
  assert.equal(writes,0,'A Firebase database write was attempted in read-only QA');
  console.log('PRODUCTION_A4_READONLY_PASS '+JSON.stringify({
    reviewedSource:expected,guestVisibleRows:data.rows,
    uniqueRows:data.uniqueRecords,visibleColumns:data.columns,
    printedRows:printed.printedRows,printedColumns:printed.printedColumns,
    pageCount,pageTwoNumber:second[0],
    pageThreeNumber:pageCount>=3?'3':'not-applicable',
    media:'A4 landscape',printRoot:'title+table only',
    groupedStageRows:printed.printStageRows,groupedStaffRows:printed.printStaffRows,
    firebaseBusinessWrites:writes,guestAdminBulkTools:data.guestAdminBulkTools,
    liveBrowserPageErrors:failures.length
  }));
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await context.close();
}catch(e){
  // Do NOT disclose any actual business row content in public CI logs.
  console.error('PRODUCTION_A4_READONLY_FAILURE: '+String(e.message??e).slice(0,650));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  rmSync(work,{recursive:true,force:true});
}
