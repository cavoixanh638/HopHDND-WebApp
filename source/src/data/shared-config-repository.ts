import {parseSheetConfig,type SheetConfig} from './sheet-config';
import {CONFIG_STORE_URL} from './shared-store';
import {requestGviz} from './gviz-request';
import {googleCall,isGoogleHost} from './google-bridge';
import {CONFIG_TAB,configFromRows,validateSharedConfig,type SharedConfig,type ConfigSection} from './shared-config';
export async function readSharedConfig(source:SheetConfig):Promise<SharedConfig|null> {
  if(isGoogleHost()){const value=await googleCall('getDashboardConfig',source);return value===null?null:validateSharedConfig(value,source);}
  const value=await requestGviz(parseSheetConfig(CONFIG_STORE_URL),{sheet:CONFIG_TAB,range:'A:H',headers:'1'});
  const payload=value as {status?:string;table?:{rows?:{c?:({v?:unknown}|null)[]}[]}};
  if(payload?.status!=='ok'||!Array.isArray(payload.table?.rows))throw new Error('Không đọc được kho cấu hình qua bản HTML. Kho riêng cần mở trình chỉnh chung trên Google.');
  return configFromRows(payload.table.rows.map(row=>{if(!Array.isArray(row.c))throw new Error('Dòng cấu hình không hợp lệ.');return row.c.map(cell=>cell?.v??null);}),source);
}
export async function saveSharedSection(source:SheetConfig,baseRevision:number,section:ConfigSection,value:unknown,operationId:string):Promise<SharedConfig>{
  return validateSharedConfig(await googleCall('saveDashboardConfig',{source,baseRevision,section,value,operationId}),source);
}
