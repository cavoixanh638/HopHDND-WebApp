# A checkpoint — handoff to Gemini
Status: TEST_PENDING / STOPPED at coordinator request (2026-11-03). Do not treat as DONE.
Branch: ui/20261103-table-cells. Worktree: D:/Google Drive/VP UBND/HĐND/Codex HĐND/ui-20261103-table-cells.
Start HEAD: 1c5d82c8bd4486a124bbc3bc0a5308f4e76a8132. Handoff SHA: commit containing this checkpoint; final chat reports exact SHA and post-commit verification.

## WIP changes
- CompactGroupedValue.tsx: render content once before department/type; department has per-field editable marker; remove numbered stage bubbles, retain all 3 stage labels and source editors/highlights.
- item-frame.css: append scoped L02 subdued read-only metadata, L03 flat label/value rows retaining state color, tighter inline party level, attempted vertical centering and narrow ID padding.
- tests/compact-group-highlights.test.tsx: four ordering/single-render/named-row tests.
- tests/compact-table-cells-browser.mjs: Windows headless Chrome + local synthetic real-component fixture; intended 12 combinations (1440/900/390 × admin/guest/popup/highlight), writes DOM evidence. No backend calls/deployment.

## Verified and unresolved
- npm run typecheck: PASS on current code before handoff commit.
- npm test -- tests/compact-group-highlights.test.tsx tests/compact-columns.test.ts tests/admin-compact-layout.test.ts: PASS, 3 files / 31 tests.
- npm run build:compact:qa: PASS (existing bundle-size warning).
- git diff --check: PASS.
- Chrome starts successfully with --no-sandbox and explicit Runtime/Page enable. First fixture 1440/admin produced evidence/A/dom-measurements.json. Three-row state/text alignment, inline level and content/metadata ordering assertions passed before vertical-centering assertion FAILED. Likely later app.css rule overrides attempted item-frame.css specificity; inspect computed style/cascade next.
- ID assertions have not yet executed (they follow vertical assertion). Guest, popup, 900px/mobile, highlights and editor interaction still require browser verification. No screenshots yet. Popup editable / mixed permissions should be added to acceptance beyond existing read-only popup fixture. No before-baseline measurements collected.
- Do not claim complete L03 acceptance, exact BTV TU presentation, colors, highlight/editor behavior or responsive coverage until verified.

## Resume
1. Fix actual computed vertical-align for note/specificProgress without modifying unowned files, or coordinate ownership.
2. Run existing browser test, inspect DOM/screenshots, then expand popup editable/mixed permissions and editor action checks. Preserve source rights.
3. Review CSS cascade/visual result; retain useful regression tests; final exact-SHA typecheck/test/browser proof.

Local npm ci --ignore-scripts --offline installed ignored node_modules. Untracked source/dist-compact-qa is generated local QA output, intentionally not committed. Only owned source/tests/checkpoint/evidence are committed. No merge, deploy or production changes.
