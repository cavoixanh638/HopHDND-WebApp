import {createServer} from 'vite';
import fs from 'node:fs';
if(process.env.GCLOUD_PROJECT!=='demo-hdnd')throw Error('Demo-only browser fixture');
const server=await createServer({configFile:false,cacheDir:'.cache/spark-fixtures',server:{middlewareMode:true},appType:'custom'});
try{
 const {createDemoItems}=await server.ssrLoadModule('/src/data/demo-items.ts');
 const {defaultItemLayout}=await server.ssrLoadModule('/src/data/item-preferences.ts');
 const {defaultReportLayout}=await server.ssrLoadModule('/src/data/report-preferences.ts');
 const catalogs=await server.ssrLoadModule('/src/data/catalogs.ts');
 const items=createDemoItems(3);
 const profile={catalogs:catalogs.catalogFromItems(items),items:defaultItemLayout(),reports:defaultReportLayout(),dataSource:'primary'};
 const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
 const rules=await fetch('http://127.0.0.1:9000/.settings/rules.json?ns=demo-hdnd',{method:'PUT',headers,body:fs.readFileSync('firebase/database.spark.rules.json')});
 if(!rules.ok)throw Error('Rules install failed');
 const result=await fetch('http://127.0.0.1:9000/.json?ns=demo-hdnd',{method:'PUT',headers,body:JSON.stringify({hdnd:{items:Object.fromEntries(items.map(x=>{const {archivedAt,...row}=x;return [x.recordId,{...row,revision:1,operationId:'seed',updatedAt:Date.now(),updatedBy:'seed'}];})),permissions:{columns:{note:true,specificProgress:true}},profile:{revision:1,payload:JSON.stringify(profile)}}})});
 if(!result.ok)throw Error('Fixture seed failed');
 console.log('SPARK_BROWSER_FIXTURE_READY',items.length);
}finally{await server.close();}
