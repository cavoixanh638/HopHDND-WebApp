import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

describe('GitHub Pages release policy: UI auto, Firebase/data fail closed',()=>{
  it('passes standalone Node policy regression matrix before allowing a UI release',()=>{
    const cwd=new URL('../',import.meta.url).pathname;
    const output=execFileSync(process.execPath,
      ['--test','scripts/pages-release-policy.test.mjs'],
      {cwd,encoding:'utf8',timeout:12000});
    expect(output).toContain('# fail 0');
  });
  it('keeps a separate Spark cutover gate and exact SHA approval for sensitive changes',()=>{
    const flow=readFileSync(new URL('../../.github/workflows/publish-pages.yml',import.meta.url),'utf8');
    expect(flow).toContain("vars.HOPHDND_SPARK_PRODUCTION_CONFIRMED == 'true'");
    expect(flow).toContain('needs: release-gate');
    expect(flow).toContain("needs.release-gate.outputs.release_allowed == 'true'");
    expect(flow).toContain('node source/scripts/pages-release-policy.mjs');
    expect(flow).toContain('node --test source/scripts/pages-release-policy.test.mjs');
    expect(flow).toContain('HOPHDND_PAGES_APPROVED_MAIN_SHA');
    expect(flow).toContain('--baseline "$RELEASE_BASELINE"');
    expect(flow).toContain('--assert-mode "$RELEASE_MODE"');
    expect(flow).toContain('npm run test:spark');
    expect(flow).toContain('npm run build:spark');
    expect(flow).not.toContain('npm run build:spark:operator');
  });
});
