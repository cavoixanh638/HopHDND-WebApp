// PR95 L4 regression: exact offline bundling, substitution metacharacters,
// closing-tag escaping and preserved path/chunk/asset guards. No network.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=resolve(fileURLToPath(new URL('./package-compact-qa.mjs',import.meta.url)));
const token=['$&','$$','$'+'`',"$'"].join(' ');
const js=`window.__qaMetachars=${JSON.stringify(token)};window.__qaCloser="</ScRiPt>";`;
const css=`:root{--qa-tokens:${JSON.stringify(token)};--qa-closer:"</StYlE>"}`;
const make=({scripts=1,styles=1,extraAsset=false,unsafe=false}={})=>{
  const tmp=mkdtempSync(join(tmpdir(),'pr95-l4-package-'));
  const dist=join(tmp,'dist-compact-qa'),assets=join(dist,'assets');
  mkdirSync(assets,{recursive:true});
  writeFileSync(join(assets,'bundle.js'),js,'utf8');
  writeFileSync(join(assets,'bundle.css'),css,'utf8');
  if(extraAsset)writeFileSync(join(assets,'rogue.js'),'console.log(99)');
  const scriptTag=`<script type="module" src="${unsafe?'../elsewhere.js':'./assets/bundle.js'}"></script>`;
  const cssTag='<link rel="stylesheet" href="./assets/bundle.css">';
  const html='<html><head><title>HopHDND synthetic QA</title>'+scriptTag.repeat(scripts)+cssTag.repeat(styles)+'</head><body><div id="root"></div></body></html>';
  writeFileSync(join(dist,'compact-qa.html'),html,'utf8');
  return {tmp,dist,html};
};
const run=(fixture)=>spawnSync(process.execPath,[script],{cwd:fixture.tmp,encoding:'utf8',timeout:12000});
const clean=fixture=>rmSync(fixture.tmp,{recursive:true,force:true});

test('preserves literal replacement metacharacters in JS/CSS and escapes real closing tags',()=>{
  const f=make();
  try {
    const result=run(f);assert.equal(result.status,0,result.stderr);
    const out=readFileSync(join(f.dist,'HopHDND_GopCot_XemThu.html'),'utf8');
    const escapedJs=js.replace(/<\/script/gi,'<\\/script');
    const escapedCss=css.replace(/<\/style/gi,'<\\/style');
    assert.ok(out.includes('<script type="module">'+escapedJs+'</script>'),'JS bytes not preserved');
    assert.ok(out.includes('<style>'+escapedCss+'</style>'),'CSS bytes not preserved');
    assert.ok(!out.includes('<script type="module" src='),'external JS leaked');
    assert.ok(!out.includes('rel="stylesheet" href='),'external CSS leaked');
    assert.equal((out.match(/<script\b/gi)||[]).length,1,'unexpected script tag');
    assert.equal((out.match(/<style\b/gi)||[]).length,1,'unexpected style tag');
    assert.ok(out.includes('>HopHDND synthetic QA<'));
    assert.deepEqual(readdirSync(f.dist).sort(),['HopHDND_GopCot_XemThu.html','assets','compact-qa.html'].sort());
    assert.match(result.stdout,/COMPACT_QA_SINGLE_HTML_READY/);
  } finally{clean(f);}
});

for(const [name,options,expected] of [
  ['extra unexpected JS asset',{extraAsset:true},'Unexpected extra chunks or assets'],
  ['duplicate module script',{scripts:2},'QA must have exactly one local JS and CSS bundle'],
  ['missing stylesheet',{styles:0},'QA must have exactly one local JS and CSS bundle'],
  ['non-local module path',{unsafe:true},'Non-local QA asset rejected'],
]){
  test('rejects '+name+' without producing offline artifact',()=>{
    const f=make(options);
    try{
      const result=run(f);
      assert.notEqual(result.status,0,'security guard was bypassed');
      assert.ok(result.stderr.includes(expected),result.stderr);
      assert.ok(!readdirSync(f.dist).includes('HopHDND_GopCot_XemThu.html'));
    }finally{clean(f);}
  });
}