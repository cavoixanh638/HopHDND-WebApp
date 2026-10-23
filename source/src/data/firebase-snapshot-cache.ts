import type {SheetConfig} from './sheet-config';
import {validateExcelMirror,type ExcelMirrorSnapshot} from './firebase-mirror-repository';

/**
 * Same-tab, authenticated-viewer-only snapshot cache.
 *
 * DO NOT use localStorage or publish this business content into GitHub Pages,
 * a public JSON URL, HTML bundle, service worker or an unscoped shared cache.
 * Firebase still has to authenticate before these records can be displayed.
 */
const PREFIX='hophdnd.viewer-session-mirror.v1:';
const MAX_CACHE_AGE_MS=15*60*1000;
const key=(uid:string,source:Pick<SheetConfig,'spreadsheetId'|'gid'>)=>
  PREFIX+uid+':'+source.spreadsheetId+':'+source.gid;

export function loadSessionMirror(uid:string,source:Pick<SheetConfig,'spreadsheetId'|'gid'>,
  now=Date.now()):ExcelMirrorSnapshot|null{
  if(!uid||!source.spreadsheetId||!source.gid)return null;
  let storage:Storage|undefined;
  try{
    storage=globalThis.sessionStorage;
    const raw=storage?.getItem(key(uid,source));
    if(!raw)return null;
    const value=JSON.parse(raw) as {seenAt:number;uid:string;payload:unknown};
    if(value.uid!==uid||!Number.isFinite(value.seenAt)||
      now-value.seenAt<0||now-value.seenAt>MAX_CACHE_AGE_MS) {
      storage?.removeItem(key(uid,source));return null;
    }
    return validateExcelMirror(value.payload,source);
  }catch{
    try{storage?.removeItem(key(uid,source));}catch{}
    return null;
  }
}

export function storeSessionMirror(uid:string,source:Pick<SheetConfig,'spreadsheetId'|'gid'>,
  payload:ExcelMirrorSnapshot,now=Date.now()):boolean{
  if(!uid)return false;
  try{
    const checked=validateExcelMirror(payload,source);
    globalThis.sessionStorage?.setItem(key(uid,source),JSON.stringify({
      seenAt:now,uid,payload:checked
    }));
    return true;
  }catch{return false;}
}

export function clearSessionMirrors():void{
  try{
    const storage=globalThis.sessionStorage;
    if(!storage)return;
    for(let i=storage.length-1;i>=0;i--){
      const k=storage.key(i);
      if(k?.startsWith(PREFIX))storage.removeItem(k);
    }
  }catch{}
}
