// Temporary read/write probe, fixed to the private disposable copy, never the source.
function probeExcelCellWrite() {
  const id='19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7';
  if(id===HDND_DATA_URL.match(/\/d\/([^/]+)/)[1])throw new Error('Probe must not target the source.');
  const book=SpreadsheetApp.openById(id);
  if(!book.getName().includes('THỬ GHI EXCEL'))throw new Error('Unexpected test workbook; no write.');
  const sheet=book.getSheets()[0],cell=sheet.getRange('C4');
  if(cell.getFormula())throw new Error('Probe refuses to replace a formula.');
  cell.setValue('HDND_PROBE_NATIVE_WRITE_20261014');SpreadsheetApp.flush();
  console.log(JSON.stringify({id:book.getId(),sheets:book.getSheets().map(s=>s.getName()),cell:'C4',readBack:cell.getValue()}));
}

function probeExcelCacheRestore() {
 const book=SpreadsheetApp.openById('19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7');
 if(!book.getName().includes('THỬ GHI EXCEL'))throw new Error('Wrong probe target');
 book.getSheets()[0].getRange('C4').setValue('Kế hoạch phát triển kinh tế - xã hội thành phố năm 2027.');SpreadsheetApp.flush();
 console.log('Test-only Sheets view restored; no production write.');
}
