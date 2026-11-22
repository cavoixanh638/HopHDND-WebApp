/**
 * HĐND PR test selection v1. Keeps required workflow jobs alive while skipping
 * expensive steps ONLY for a narrowly audited set of presentation/doc changes.
 * Unknown, security, data, workflow, parser and integration changes run FULL QA.
 *
 * The PR workflow checkout must use fetch-depth: 2 so HEAD^1 is available.
 * This script never deploys, writes a GitHub status or calls a network API.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const SUITE_KINDS = Object.freeze({
  'excel-schema': ['excel', 'critical'],
  'original-excel': ['excel', 'critical'],
  'guest-save': ['picker', 'item-style', 'critical'],
  'two-browser': ['picker', 'critical'],
  'list-browser': ['presentation', 'picker', 'item-style', 'print', 'report', 'critical'],
  'list-ui-parity': ['presentation', 'picker', 'item-style', 'print', 'report', 'critical'],
  'simple-admin': ['presentation', 'picker', 'item-style', 'report', 'critical'],
  'status-cas': ['picker', 'critical'],
});

const safePresentationModules = new Set([
  'source/src/components/ColumnResizeHandle.tsx',
  'source/src/components/useElementWidth.ts',
  'source/src/data/fit-table-columns.ts',
  'source/src/data/resize-last-column.ts',
  'source/src/features/items/compact-columns.ts',
]);
const pickerPresentationModules = new Set([
  'source/src/features/items/CellPickerPopupView.tsx',
  'source/src/features/items/CellPickerPositioning.ts',
  'source/src/features/items/pr95-v5-l1-picker-placement.ts',
]);

/** Only explicitly audited paths may avoid all safety/integration suites. */
export function classifyPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('..') || path.startsWith('/')) return 'critical';
  // Workflow / script / policy edits are ALWAYS full matrix, even for this script.
  if (path.startsWith('.github/') || path.startsWith('qa-standards/')) return 'critical';
  if (path === 'README.md' || path.startsWith('docs/') || path.startsWith('source/docs/') || path.endsWith('.md')) return 'docs';
  if (path === 'source/src/features/items/list-print.ts') return 'print';
  if (pickerPresentationModules.has(path)) return 'picker';
  if (safePresentationModules.has(path)) return 'presentation';
  // CSS cannot change Firebase Rules or write logic, but may change guest/admin affordances.
  if (path.startsWith('source/src/') && path.endsWith('.css')) {
    return path.startsWith('source/src/features/items/') ? 'item-style' : 'presentation';
  }
  if (/^source\/src\/qa\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|css)$/.test(path)) return 'presentation';
  if (path === 'source/tests/list-print.test.ts') return 'print';
  if (/^source\/tests\/(?:pr95-v5-l1-layout|pr95-v6-l3-layout|real-demo-visual-parity|item-viewport-width|group-label-r15-ui)\.test\.tsx?$/.test(path)) return 'presentation';
  // Only the no-write/report rendering module family is known to be side-effect free.
  if (/^source\/src\/features\/reports\/Report(?:Table|View)\.tsx$/.test(path)) return 'report';
  // Parser/source-schema changes are tested by both Excel suites and by full QA.
  if (/^source\/src\/data\/business-excel(?:-schema-fingerprint)?\.ts$/.test(path)) return 'critical';
  // Do not infer safety from a filename: any other path can affect security or data.
  return 'critical';
}

export function decideScope(suite, changedPaths) {
  if (!Object.hasOwn(SUITE_KINDS, suite)) throw new Error('Unknown QA suite: ' + suite);
  if (!Array.isArray(changedPaths) || changedPaths.length < 1 || changedPaths.length > 3000) {
    return {run: true, reason: 'missing-or-oversized-diff', kinds: ['critical']};
  }
  const kinds = [...new Set(changedPaths.map(classifyPath))].sort();
  const run = kinds.some(kind => SUITE_KINDS[suite].includes(kind));
  return {run, reason: run ? 'affected-or-unknown' : 'not-affected-by-allowlisted-changes', kinds};
}

/**
 * HEAD is GitHub's synthetic pull_request MERGE commit. Compare against first
 * parent (base) to include the complete PR diff. Missing parent/fetch fails open.
 */
export function changedPathsFromCheckout(cwd = process.cwd()) {
  const opts = {cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']};
  const parents = execFileSync('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], opts).trim().split(/\s+/);
  if (parents.length !== 3) throw new Error('HEAD is not a 2-parent pull request merge commit');
  const output = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', 'HEAD^1', 'HEAD', '--'], opts);
  return output.split('\0').filter(Boolean);
}

export function evaluateCheckout(suite, {eventName = process.env.GITHUB_EVENT_NAME, cwd = process.cwd()} = {}) {
  if (!Object.hasOwn(SUITE_KINDS, suite)) throw new Error('Unknown QA suite: ' + suite);
  if (eventName !== 'pull_request') return {run: true, reason: 'non-pr-event-full-qa', kinds: ['critical'], files: 0};
  try {
    const paths = changedPathsFromCheckout(cwd);
    const decision = decideScope(suite, paths);
    return {...decision, files: paths.length};
  } catch (error) {
    return {run: true, reason: 'diff-unavailable-run-all', kinds: ['critical'], files: 0, detail: String(error).slice(0, 180)};
  }
}

function main() {
  const [flag, suite] = process.argv.slice(2);
  if (flag !== '--suite' || !Object.hasOwn(SUITE_KINDS, suite)) {
    console.error('Usage: node .github/scripts/ci-pr-scope.mjs --suite <' + Object.keys(SUITE_KINDS).join('|') + '>');
    process.exitCode = 2;
    return;
  }
  const decision = evaluateCheckout(suite);
  const status = decision.run ? 'RUN' : 'NOT_APPLICABLE';
  console.log(`HOPHDND_QA_SCOPE suite=${suite} status=${status} reason=${decision.reason} kinds=${decision.kinds.join(',')} changed_files=${decision.files}`);
  if (decision.detail) console.warn('Diff unavailable; full suite required: ' + decision.detail);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `run=${decision.run ? 'true' : 'false'}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### HĐND PR suite: ${suite}\n- **${status}** (${decision.reason}); changed files: ${decision.files}; kinds: ${decision.kinds.join(', ')}.\n` +
      (!decision.run ? '- Heavy steps: **NOT_RUN / NOT_APPLICABLE**, not a test PASS. Existing job check remains available for branch rules.\n' : '') +
      '- Unknown, auth, Firebase, permissions, importer and workflow changes run full QA. Pages release workflow is independent.\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();