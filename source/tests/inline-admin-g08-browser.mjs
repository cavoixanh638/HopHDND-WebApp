// G08 real-component Chromium smoke (no browser-testing package required).
// Run from source/: node tests/inline-admin-g08-browser.mjs
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';
const results=[];
const check=(condition,message)=>{results.push({message,pass:!!condition});if(!condition)throw Error(message);};
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port','0','--mode','preact'],{cwd:resolve('.'),stdio:['ignore','pipe','pipe']});
let address='';
let viteLog='';
for(const stream of [vite.stdout,vite.stderr])stream.on('data',buffer=>{
 viteLog+=buffer.toString();
 const found=viteLog.match(/http:\/\/127\.0\.0\.1:(\d+)/);
 if(found)address='http://127.0.0.1:'+found[1];
});
const chrome=spawn(process.env.CHROME_PATH||
  (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/chromium'),
  ['--headless=new','--no-sandbox','--disable-gpu','--no-first-run',
    '--remote-debugging-port=0','--user-data-dir='+mkdtempSync(join(tmpdir(),'g08-chrome-')),
    'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let endpoint='',ws,seq=0;
const pending=new Map();
chrome.stderr.on('data',buffer=>{
 const found=String(buffer).match(/DevTools listening on (ws:\/\/\S+)/);
 if(found)endpoint=found[1];
});
const send=(method,params={})=>new Promise((ok,bad)=>{
 const id=++seq;pending.set(id,{ok,bad});
 const timeout=setTimeout(()=>{if(pending.delete(id))bad(Error('Timeout '+method));},15000);
 ws.send(JSON.stringify({id,method,params}));
 const entry=pending.get(id);entry.ok=value=>{clearTimeout(timeout);ok(value)};
 entry.bad=reason=>{clearTimeout(timeout);bad(reason)};
});
const evaluate=async expression=>{
 const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));
 return response.result.value;
};
const snapshot=()=>evaluate(`(()=>{
 const table=document.querySelector('table');
 const td=document.querySelector('td[data-l03-layout]');
 const stage=td?.querySelector('.compact-stages');
 const buttons=[...td?.querySelectorAll('[role="separator"]')??[]];
 const group=stage?.getBoundingClientRect();
 const col=table?.querySelectorAll('col');
 return {
  ready:!!stage,handles:buttons.length,mode:stage?.dataset.inlineG08Mode,
  widths:document.querySelector('[data-qa="g08-widths"]')?.textContent,
  commits:Number(document.querySelector('[data-qa="g08-commits"]')?.textContent?.match(/\\d+/)?.[0]??0),
  parent:col?.[1]?.getBoundingClientRect().width,
  neighbor:col?.[2]?.getBoundingClientRect().width,
  total:table?.getBoundingClientRect().width,
  bodyWidth:document.documentElement.clientWidth,
  bodyScroll:document.documentElement.scrollWidth,
  text:stage?.textContent,
  hasPicker:!!stage?.querySelector('button'),
  firstHandle:buttons[0]?.getBoundingClientRect().toJSON(),
  hasOverflow:!!group&&stage.scrollWidth>stage.clientWidth+1
 };
})()`);
const pick=async (selector,value)=>{
 await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await sleep(120);
};
const key=async value=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code:value,
  windowsVirtualKeyCode:value==='Enter'?13:value==='Escape'?27:value==='ArrowRight'?39:37});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code:value,
  windowsVirtualKeyCode:value==='Enter'?13:value==='Escape'?27:value==='ArrowRight'?39:37});};
try{
 for(let n=0;n<120&&(!endpoint||!address);n++)await sleep(100);
 check(!!endpoint,'Chromium websocket ready');check(!!address,'Vite ready: '+viteLog);
 const pages=await (await fetch('http://'+new URL(endpoint).host+'/json')).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(resolve=>ws.addEventListener('open',resolve));
 ws.addEventListener('message',event=>{
  const data=JSON.parse(event.data);
  if(data.id){const p=pending.get(data.id);pending.delete(data.id);
   if(p)(data.error?p.bad(data.error):p.ok(data.result));}
 });
 await send('Page.enable');await send('Runtime.enable');
 for(const width of [1920,900,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:address+'/inline-admin-g08-fixture.html'});
  for(let i=0;i<100;i++){if((await snapshot()).ready)break;await sleep(100)}
  let state=await snapshot();
  check(state.ready,'L03 fixture mounts '+width);
  check(state.handles===2,'editable 3 rails / 2 handles '+width);
  check(!state.hasPicker,'layout mode has no active data picker '+width);
  check(state.text.includes('Hoàn thành'),'status content preserved '+width);
  const baseline={parent:state.parent,neighbor:state.neighbor,total:state.total,widths:state.widths};
  // Focus a separator and exercise preview, Escape and Enter.
  await evaluate(`document.querySelector('[role="separator"]').focus()`);
  await key('ArrowRight');state=await snapshot();
  check(state.commits===0,'arrow previews without commit '+width);
  await key('Escape');state=await snapshot();
  check(state.widths===baseline.widths&&state.commits===0,'Escape cancels '+width);
  await key('ArrowRight');await key('Enter');await sleep(80);
  state=await snapshot();
  check(state.commits===1&&state.widths!==baseline.widths,'Enter commits once '+width);
  check(state.parent===baseline.parent&&state.neighbor===baseline.neighbor&&state.total===baseline.total,
    'rail resize does not affect parent or other columns '+width);
  // Real mouse pointer down/move/up over gap, not synthetic React callbacks.
  const rect=state.firstHandle;
  check(!!rect,'handle physical box '+width);
  const x=rect.x+rect.width/2,y=rect.y+Math.max(5,rect.height/2);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+4,y,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+4,y,button:'left',clickCount:1});
  await sleep(100);
  state=await snapshot();
  check(state.commits===2,'pointer release commits exactly once '+width);
  check(state.parent===baseline.parent&&state.neighbor===baseline.neighbor,
    'pointer preserves fixed table columns '+width);
  await pick('select[aria-label="Chế độ L03"]','readonly');state=await snapshot();
  check(state.handles===1,'readonly 2 rails / 1 handle '+width);
  await evaluate(`document.querySelectorAll('input[type=checkbox]')[0].click()`);
  state=await snapshot();
  check(state.handles===0,'guest hides handles '+width);
  await evaluate(`document.querySelectorAll('input[type=checkbox]')[0].click()`);
  await evaluate(`document.querySelectorAll('input[type=checkbox]')[2].click()`);
  state=await snapshot();
  check(state.handles===0,'data editing hides handles '+width);
  if(width===900){
   const screenshot=await send('Page.captureScreenshot',{format:'png'});
   const out=resolve('docs/tasks/inline-admin-g08-evidence');
   mkdirSync(out,{recursive:true});
   writeFileSync(join(out,'g08-900.png'),Buffer.from(screenshot.data,'base64'));
  }
 }
 console.log('G08 CHROME PASS',results.length,'assertions');
}finally{
 ws?.close();chrome.kill();vite.kill();
 const out=resolve('docs/tasks/inline-admin-g08-evidence');
 mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'g08-browser-result.json'),JSON.stringify(results,null,2));
}
