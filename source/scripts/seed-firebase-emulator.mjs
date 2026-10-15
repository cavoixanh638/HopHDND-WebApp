import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {ref,set} from 'firebase/database';
// No arbitrary host, project ID or production configuration is accepted.
const environment=await initializeTestEnvironment({projectId:'demo-hdnd',database:{host:'127.0.0.1',port:9000}});
try{
  await environment.withSecurityRulesDisabled(async context=>{
    // Only test configuration is seeded; content continues to come from Sheets.
    await set(ref(context.database(),'hdnd/permissions'),{columns:{note:true,content:true,specialist:true,progressCouncil:true},rows:{'fake-sheet:42:row:3':false},cells:{'fake-sheet:42:row:3':{note:true}}});
  });
  console.log('Seeded synthetic permissions in localhost demo-hdnd only; no business rows imported.');
}finally{await environment.cleanup();}
