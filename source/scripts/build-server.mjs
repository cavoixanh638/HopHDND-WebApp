import {build} from 'vite';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {Script} from 'node:vm';
await mkdir('server/dist',{recursive:true});
await build({configFile:false,build:{outDir:'server/dist',emptyOutDir:false,minify:false,target:'es2020',lib:{entry:'server/core-entry.ts',name:'HDNDConfigCore',formats:['iife'],fileName:()=> 'ConfigCore.gs'}}});
const core=await readFile('server/dist/ConfigCore.gs','utf8');
const excelFiles=['ExcelWriteCore.gs','ExcelTransactions.gs','ExcelService.gs'];
let serverCode=core+'\n'+await readFile('server/Code.gs','utf8');
for(const name of excelFiles){const path='server/'+name;serverCode+='\n'+await readFile(path,'utf8');await copyFile(path,'server/dist/'+name);}
new Script(serverCode);
await copyFile('server/Code.gs','server/dist/Code.gs');
await copyFile('server/appsscript.json','server/dist/appsscript.json');
let html=await readFile('dist/Dashboard_HĐND.html','utf8');
html=html.replace('<head>','<head><base target="_top"><script>window.HDND_SOURCE = <?!= sourceJson ?>;window.HDND_EXCEL_ENABLED = <?!= excelEnabledJson ?>;</script>');
await writeFile('server/dist/Index.html',html,'utf8');
console.log('Apps Script package ready: server/dist (not deployed).');
await mkdir('server/dist-test',{recursive:true});
for(const name of ['ConfigCore.gs',...excelFiles])await copyFile('server/dist/'+name,'server/dist-test/'+name);
await copyFile('server/probes/PrivateExcelTestHost.gs','server/dist-test/TestHost.gs');
await copyFile('server/probes/private-excel-ui.appsscript.json','server/dist-test/appsscript.json');
await writeFile('server/dist-test/Index.html',html.replace('window.HDND_SOURCE =','window.HDND_TEST = true;window.HDND_SOURCE ='),'utf8');
new Script(serverCode+'\n'+await readFile('server/probes/PrivateExcelTestHost.gs','utf8'));
new Script(await readFile('server/probes/ExcelIntegrationProbe.gs','utf8'));
console.log('Private Excel UI test candidate: server/dist-test (not deployed).');
// Reviewed activation overlay. Merely packaging it never enables registry,
// uploads files, grants scopes or changes the existing main deployment.
await mkdir('server/dist-enable',{recursive:true});
for(const name of ['Code.gs','ConfigCore.gs',...excelFiles,'Index.html'])await copyFile('server/dist/'+name,'server/dist-enable/'+name);
await copyFile('server/EnableExcel.gs','server/dist-enable/EnableExcel.gs');
await copyFile('server/enable-excel.appsscript.json','server/dist-enable/appsscript.json');
new Script(serverCode+'\n'+await readFile('server/EnableExcel.gs','utf8'));
console.log('Main Excel activation candidate: server/dist-enable (requires approval; not activated).');
