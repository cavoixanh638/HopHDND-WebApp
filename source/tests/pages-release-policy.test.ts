import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

describe('GitHub Pages release policy: UI auto, Firebase/data fail closed',()=>{
  it('passes standalone Node policy regression matrix before allowing a UI release',()=>{
    const cwd=fileURLToPath(new URL('../',import.meta.url));
    const output=execFileSync(process.execPath,
      ['--test','scripts/pages-release-policy.check.mjs'],
      {cwd,encoding:'utf8',timeout:12000});
    expect(output).toMatch(/fail\s+0/);
  });
  it('verifies run-scoped owner dispatch and rejects any non-owner approval',()=>{
    const cwd=fileURLToPath(new URL('../',import.meta.url));
    const output=execFileSync(process.execPath,
      ['--test','scripts/pages-release-approval.check.mjs'],
      {cwd,encoding:'utf8',timeout:12000});
    expect(output).toMatch(/fail\s+0/);
  });
  it('keeps guarded releases manual-only for owner without editing a repository variable',()=>{
    const workflow=readFileSync(new URL('../../.github/workflows/publish-pages.yml',import.meta.url),'utf8');
    const helper=readFileSync(new URL('../scripts/pages-release-approval.mjs',import.meta.url),'utf8');
    expect(workflow).toContain('node source/scripts/pages-release-approval.mjs');
    expect(workflow).toContain('needs.release-gate.outputs.approved_main_sha');
    expect(workflow).toContain('node --test source/scripts/pages-release-approval.check.mjs');
    expect(helper).toContain("eventName==='workflow_dispatch'");
    expect(helper).toContain("actor.toLowerCase()!==repositoryOwner.toLowerCase()");
    expect(helper).toContain('approvedSha:head');
    expect(helper).toContain('approvedSha:legacyApprovedSha');
    expect(workflow).toContain('if [ "$(git rev-parse origin/main)" != "$GITHUB_SHA" ]');
  });
  it('keeps a separate Spark cutover gate and exact SHA approval for sensitive changes',()=>{
    const flow=readFileSync(new URL('../../.github/workflows/publish-pages.yml',import.meta.url),'utf8');
    expect(flow).toContain("vars.HOPHDND_SPARK_PRODUCTION_CONFIRMED == 'true'");
    expect(flow).toContain('needs: release-gate');
    expect(flow).toContain("needs.release-gate.outputs.release_allowed == 'true'");
    expect(flow).toContain('node source/scripts/pages-release-policy.mjs');
    expect(flow).toContain('node --test source/scripts/pages-release-policy.check.mjs');
    expect(flow).toContain('HOPHDND_PAGES_APPROVED_MAIN_SHA');
    expect(flow).toContain('--baseline "$RELEASE_BASELINE"');
    expect(flow).toContain('--assert-mode "$RELEASE_MODE"');
    expect(flow).toContain('npm run test:spark');
    expect(flow).toContain('npm run build:spark');
    expect(flow).toContain('npm run build:compact:qa');
    expect(flow).toContain('node scripts/pr95-v5-l1-dropdown-browser.mjs');
    expect(flow).not.toContain('firebase deploy');
    // Checkout credentials must not be saved for any untrusted npm/QA code.
    expect(flow).toContain('persist-credentials: false');
    expect(flow).not.toContain('persist-credentials: true');
    expect(flow).toContain('RELEASE_PUSH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(flow).toContain('push origin HEAD:main');
    expect(flow).not.toContain('npm run build:spark:operator');
  });
});
