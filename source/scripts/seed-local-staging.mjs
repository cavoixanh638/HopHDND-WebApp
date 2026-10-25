#!/usr/bin/env node
/**
 * LOCAL DEMO ONLY: seed an isolated Auth + RTDB Emulator using synthetic items,
 * primary profile, and minimal test cell grants; anonymous users cannot edit. No Firebase production I/O.
 * Intended for: firebase emulators:exec --project demo-hdnd --only auth,database
 *   --config scripts/staging-emulator/firebase.json "node scripts/seed-local-staging.mjs"
 */
import {createServer} from 'vite';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set} from 'firebase/database';

const PROJECT='demo-hdnd';
const databaseHost='127.0.0.1:9000',authHost='127.0.0.1:9099';
const forbid=message=>{throw Error('STAGING_SEED_HOLD: '+message);};

async function main(){
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!==databaseHost||
      process.env.FIREBASE_AUTH_EMULATOR_HOST!==authHost)
    forbid('Require LOCAL database 127.0.0.1:9000 AND auth 127.0.0.1:9099 emulators.');
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT;
  if(project!==PROJECT)forbid('Only the demo-hdnd emulator project is allowed.');
  if(process.env.FIREBASE_REALTIME_URL)forbid('Custom database URL override is unsafe.');

  // Vite SSR transpiles our existing TS demo items/profile defaults. This
  // prevents synthetic staging from drifting from the production app schema.
  const vite=await createServer({
    configFile:'vite.config.ts',mode:'pages-test',server:{middlewareMode:true},
    appType:'custom',logLevel:'error'
  });
  let examples,profile;
  try{
    const [demo,catalogs,reports,layouts]=await Promise.all([
      vite.ssrLoadModule('/src/data/demo-items.ts'),
      vite.ssrLoadModule('/src/data/catalogs.ts'),
      vite.ssrLoadModule('/src/data/report-preferences.ts'),
      vite.ssrLoadModule('/src/data/item-preferences.ts')
    ]);
    examples=demo.createDemoItems(3);
    profile={dataSource:'primary',
      catalogs:catalogs.catalogFromItems(examples),
      reports:reports.defaultReportLayout(),items:layouts.defaultItemLayout()};
  }finally{await vite.close();}

  const timestamp=Date.now();
  const entries=Object.fromEntries(examples.map((item,i)=>{
    const {archivedAt,...stored}=item;
    return [item.recordId,{...stored,revision:1,operationId:'synthetic-staging-'+(i+1),
      updatedAt:timestamp,updatedBy:'staging-seed'}];
  }));
  const environment=await initializeTestEnvironment({projectId:PROJECT,database:{
    host:'127.0.0.1',port:9000
  }});
  try{
    await environment.clearDatabase();
    await environment.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database(),'hdnd'),{
        items:entries,
        permissions:{columns:{note:true,specificProgress:true}},
        profile:{revision:1,payload:JSON.stringify(profile)},
        control:{revision:1,editingLocked:false,changedAt:new Date(timestamp).toISOString()}
      });
    });
    await environment.withSecurityRulesDisabled(async context=>{
      const db=context.database();
      const items=(await get(ref(db,'hdnd/items'))).val();
      const config=(await get(ref(db,'hdnd/profile'))).val();
      if(Object.keys(items??{}).length!==3||JSON.parse(config?.payload??'{}').dataSource!=='primary')
        forbid('Demo seed readback did not match synthetic primary profile.');
    });
    console.log('LOCAL_PRIMARY_STAGING_SEED_PASS (synthetic; NO production writes)');
    console.log('Demo project: '+PROJECT);
    console.log('Primary rows: 3');
    console.log('Granted fields after enrolled Google login: note, specificProgress');
    console.log('Anonymous sessions: VIEW ONLY; employee UID must be allowlisted by verified administrator.');
    console.log('Local browser page: http://127.0.0.1:5173/pages.html');
  }finally{await environment.cleanup();}
}
try{await main();}catch(error){console.error(error?.message??'STAGING_SEED_HOLD');process.exitCode=1;}
