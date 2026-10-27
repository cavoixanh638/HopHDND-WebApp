import type {Item} from '../../shared/types';
import * as XLSX from 'xlsx';
import {readExcel} from './excel-transfer';
import {parseGvizPayload} from './gviz-parser';

export function readTransitionalExcel(input:ArrayBuffer):{items:Item[];warnings:string[]} {
  const bytes=new Uint8Array(input);
  if(!bytes.byteLength||bytes.byteLength>5*1024*1024)
    throw new Error('Chỉ hỗ trợ tệp Excel .xlsx tối đa 5 MB.');
  try{return readExcel(bytes);}catch(_templateError){
    // A real working Sheet exported as Excel has A–O business columns,
    // not the app's recordId/template schema.
    const workbook=XLSX.read(bytes,{type:'array',cellDates:false});
    const first=workbook.SheetNames[0];
    if(!first||!workbook.Sheets[first])throw new Error('Không tìm thấy trang tính trong Excel.');
    const table=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[first],
      {header:1,defval:'',raw:false,blankrows:true});
    if(!table.length||table.length>1100)throw new Error('Tệp Excel không có từ 1 đến 1.000 hồ sơ hợp lệ.');
    const columns=Math.max(15,...table.slice(0,10).map(row=>Array.isArray(row)?row.length:0));
    const payload={status:'ok',table:{
      cols:Array.from({length:columns},()=>({})),
      rows:table.map(row=>({c:Array.from({length:columns},
        (_,index)=>({v:typeof row[index]==='string'?row[index]:String(row[index]??'')}))}))
    }};
    const snapshot=parseGvizPayload(payload,'transitional:excel:upload');
    return {items:snapshot.items,warnings:snapshot.warnings};
  }
}

