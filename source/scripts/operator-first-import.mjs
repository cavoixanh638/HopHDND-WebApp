#!/usr/bin/env node
/**
 * PR147 operator command, NOT a Vitest wrapper and NEVER an Admin SDK bypass.
 * Run from source/ after npm ci. The pinned esbuild (via Vite) bundles the
 * existing TypeScript production API then invokes it in an isolated Node22
 * process. The caller's Google OAuth token is consumed ONLY on STDIN.
 *
 * node scripts/operator-first-import.mjs --mode emulator|production
 *   --project ... --database-url ... --api-key ... --auth-domain ... --app-id ...
 *   --xlsx /ABSOLUTE/file.xlsx --sheet ... --approval-file /ABSOLUTE/approval.json
 *   --source-sha <exact checked out git SHA> --confirm IMPORT_ONCE_<project>_<sha12>
 *   --output /ABSOLUTE/PRIVATE/new-report.json
 *
 * This script does not obtain Google tokens. Production authentication must be
 * performed independently by the authorized operator through Google OAuth.
 * It never deploys, changes Rules, or stores Google tokens.
 */
import {build} from 'vite';
import {spawn} from 'node:child_process';
import {mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
try{
 const root=resolve('.');
 if(!existsSync(resolve(root,'src/data/firebase-primary-bootstrap.ts'))||
    !existsSync(resolve(root,'scripts/operator-first-import-entry.ts')))
   throw Error('EXECUTE_FROM_SOURCE_CHECKOUT_WITH_NPM_CI');
 const outputDir=resolve(root,'node_modules/.cache/pr147-operator-first-import');
 mkdirSync(outputDir,{recursive:true,mode:0o700});
 const out=resolve(outputDir,'operator-first-import.mjs');
 await build({configFile:false,root,logLevel:'silent',
   build:{ssr:resolve(root,'scripts/operator-first-import-entry.ts'),
     outDir:outputDir,emptyOutDir:false,target:'node22',minify:false,
     rollupOptions:{output:{entryFileNames:'operator-first-import.mjs'},
       external:['firebase/app','firebase/auth','firebase/database','xlsx']}}});
 const child=spawn(process.execPath,[out,...process.argv.slice(2)],{
   cwd:root,env:{...process.env},
   // Preserve STDIN streaming; NEVER echo or persist credentials.
   stdio:['inherit','inherit','inherit']});
 const status=await new Promise((res,rej)=>{
   child.once('error',rej);child.once('exit',(code,signal)=>res(code??2));
 });
 process.exitCode=status;
}catch(error){
 console.error('PR147_OPERATOR_FIRST_IMPORT_LAUNCH_HOLD '+String(error?.message??'').slice(0,250));
 process.exitCode=2;
}
