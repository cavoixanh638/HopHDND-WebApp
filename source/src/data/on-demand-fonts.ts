import type {TableFont} from './report-preferences';

/** Fonts are requested only when the admin's chosen layout needs them.
 * The default Segoe UI/system style never blocks initial report rendering. */
const family:Partial<Record<TableFont,string>>={
  inter:'Inter',roboto:'Roboto',openSans:'Open Sans',lato:'Lato',
  notoSans:'Noto Sans',plex:'IBM Plex Sans'
};
const requested=new Set<string>();
export function loadSelectedWebFont(chosen:TableFont):void{
  const name=family[chosen];
  if(!name||requested.has(name)||typeof document==='undefined'||!document.head)return;
  requested.add(name);
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(name).replace(/%20/g,'+')+
    ':wght@400;500;600;700&display=swap';
  link.setAttribute('data-hophdnd-font',chosen);
  document.head.appendChild(link);
}
