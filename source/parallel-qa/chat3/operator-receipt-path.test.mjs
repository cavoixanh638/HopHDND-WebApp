/** COORD-01 platform regression: these assertions import the production guard. */
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {win32,posix,join,dirname,basename,resolve} from 'node:path';
import {mkdtempSync,mkdirSync,symlinkSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isReceiptInsideCheckout} from '../../scripts/operator-first-import-path.mjs';

const fixtures=[
 {name:'win32',api:win32,checkout:'C:\\repo\\HopHDND-WebApp',
  cases:[
   ['checkout itself','C:\\repo\\HopHDND-WebApp',true],
   ['direct child','C:\\repo\\HopHDND-WebApp\\receipt.json',true],
   ['nested child','C:\\repo\\HopHDND-WebApp\\private\\receipts\\receipt.json',true],
   ['parent','C:\\repo\\receipt.json',false],
   ['same-prefix sibling','C:\\repo\\HopHDND-WebApp-backup\\receipt.json',false],
   ['different drive','D:\\private\\receipt.json',false],
   ['case-insensitive checkout','c:\\REPO\\hophdnd-webapp\\private\\receipt.json',true]
  ]},
 {name:'posix',api:posix,checkout:'/repo/HopHDND-WebApp',
  cases:[
   ['checkout itself','/repo/HopHDND-WebApp',true],
   ['direct child','/repo/HopHDND-WebApp/receipt.json',true],
   ['nested child','/repo/HopHDND-WebApp/private/receipts/receipt.json',true],
   ['parent','/repo/receipt.json',false],
   ['same-prefix sibling','/repo/HopHDND-WebApp-backup/receipt.json',false],
   ['unrelated absolute','/private/receipt.json',false]
  ]}
];

test('COORD-01 reproduces the old Windows slash guard before validating the fix',()=>{
 const checkout='C:\\repo\\HopHDND-WebApp';
 const target='C:\\repo\\HopHDND-WebApp\\private\\receipt.json';
 const oldGuard=target===checkout||target.startsWith(checkout+'/');
 assert.equal(oldGuard,false,'the historical forward-slash guard misses win32 children');
 assert.equal(isReceiptInsideCheckout(checkout,target,win32),true);
 console.log('CHAT3_COORD01_OLD_WINDOWS_GUARD_REPRODUCED');
});

for(const {name,api,checkout,cases} of fixtures){
 for(const [label,target,expected] of cases){
  test('COORD-01 production guard '+name+' '+label,()=>{
   assert.equal(isReceiptInsideCheckout(checkout,target,api),expected,
    name+' '+label+' '+JSON.stringify({checkout,target}));
  });
 }
}

test('COORD-01 native realpath canonicalization blocks symlink / junction into checkout',()=>{
 const root=mkdtempSync(join(tmpdir(),'chat3-coord01-paths-'));
 try{
  const checkout=join(root,'checkout');
  const inside=join(checkout,'private');
  const outside=join(root,'outside');
  const alias=join(root,'alias-to-checkout');
  mkdirSync(inside,{recursive:true});
  mkdirSync(outside,{recursive:true});
  const type=process.platform==='win32'?'junction':'dir';
  symlinkSync(inside,alias,type);
  const target=resolve(realpathSync(dirname(join(alias,'receipt.json'))),basename('receipt.json'));
  assert.equal(isReceiptInsideCheckout(realpathSync(checkout),target),true,
   'realpath removes external symlink alias into checkout');
  const outAlias=join(checkout,'alias-to-outside');
  symlinkSync(outside,outAlias,type);
  const externalTarget=resolve(realpathSync(dirname(join(outAlias,'receipt.json'))),basename('receipt.json'));
  assert.equal(isReceiptInsideCheckout(realpathSync(checkout),externalTarget),false,
   'realpath allows a truly external receipt even through an outbound symlink');
  console.log('CHAT3_COORD01_REALPATH_SYMLINK_PASS');
 }finally{
  rmSync(root,{recursive:true,force:true});
 }
});
