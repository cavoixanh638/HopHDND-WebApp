/** UI 05/11 real Chromium transport. The old system-Chrome + localhost
 * --remote-debugging-port launcher intermittently spawned a living process
 * with no CDP endpoint in GitHub Actions. Use the SAME pinned Playwright
 * Chromium as our isolated Functions Emulator, through its CDP pipe.
 * No fake browser, synthetic pointer events, Firebase or live endpoints. */
import {createRequire} from 'node:module';
import {mkdirSync,appendFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';

const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const diagnostic=resolve('qa-results/ui-20261105/chrome-cdp.jsonl');
function witness(event,details){
  const value={event,at:new Date().toISOString(),...details};
  console.log('UI_20261105_CDP '+JSON.stringify(value));
  mkdirSync(resolve('qa-results/ui-20261105'),{recursive:true});
  appendFileSync(diagnostic,JSON.stringify(value)+'\n');
}
export async function launchRealChromiumCdp({name,onRequest}){
  const start=performance.now();
  const executable=process.env.CHROME_PATH||chromium.executablePath();
  const info={name,transport:'playwright-chromium-cdp-pipe',
    executable:realpathSync(executable),node:process.version,
    endpoint:'PIPE (no TCP listener)'};
  witness('BOOT_BEGIN',info);
  let browser=null;
  try{
    // Playwright allocates a new isolated temporary profile and owns cleanup.
    // Bounded launch timeout; don't retry indefinitely or downgrade tests.
    browser=await chromium.launch({headless:true,timeout:45000,executablePath:process.env.CHROME_PATH||undefined,
      chromiumSandbox:false,args:['--no-sandbox','--disable-dev-shm-usage']});
    const context=await browser.newContext({viewport:{width:1440,height:920},
      serviceWorkers:'block'});
    const page=await context.newPage();
    const session=await context.newCDPSession(page);
    if(onRequest)session.on('Network.requestWillBeSent',e=>onRequest(e.request.url));
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Network.enable');
    await session.send('Runtime.evaluate',{expression:'1+1',returnByValue:true});
    witness('BOOT_READY',{...info,version:browser.version(),
      startupMs:Math.round(performance.now()-start),cdpSession:'READY'});
    return {send:(method,params={})=>session.send(method,params),
      close:async()=>{await browser.close();witness('CLOSED',{name});}};
  }catch(error){
    witness('BOOT_ERROR',{...info,elapsedMs:Math.round(performance.now()-start),
      message:String(error?.stack??error).slice(0,3000)});
    try{await browser?.close()}catch{}
    throw error;
  }
}
