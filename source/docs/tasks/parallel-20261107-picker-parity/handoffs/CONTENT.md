# CONTENT checkpoint — 07/11/2026

**Status: IN_PROGRESS (own feature + isolated CI PASS; remaining final acceptance boundary listed).**
Branch sole writer: `ui/20261107-picker-parity-content`.
Reference App SHA: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
**Own code SHA / tested SHA: `fa9dbbe5a0ea0e5ff1805947717c5eb9145c939e`.**
Workflow: [run #42269339502](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269339502) — **SUCCESS**, exact tested SHA.
Evidence artifact: [#13529360146](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269339502/artifacts/13529360146) — `picker-parity-content-42269339502-fa9dbbe5a0ea0e5ff1805947717c5eb9145c939e`; 9,551,324 bytes, PNG screenshots plus geometry/computed styles JSON, baseline and after.

## Implementation, files committed
1. `source/src/features/items/picker-parity-content.css`: scoped L01 geometry, max-width/content-fit, 26px min height, padding4x7, Segoe11/550, radius6, filled caret5x3, 8px gap, centered/nowrap row; editable field-only hover/focus lift -3, blue outline/shadow 180ms without changing member fill; readonly 13/400 with type swatch/member highlight; reduced-motion/print behavior.
2. `source/src/features/items/CompactGroupedValue.tsx`: import role-specific CSS only; L03/L04 branches unchanged.
3. `source/tests/picker-parity-content.test.tsx`: two editable, two mixed permissions, both readonly, empty writable and empty readonly DOM. Source logic remains real CellPicker, not a fork.
4. `source/scripts/picker-parity-content-browser.mjs`: real Chromium 1440/900/390 real ItemList+ReportDetailGrid synthetic List/popup admin/guest/mixed normal/hover/focus/open; 6 full synthetic App List and 3 report-drill popup; real alternate option click -> RAM update, Enter/ArrowDown/Escape/outside, open picker background and viewport checks, highlight and palette variation, long-label fixture, resize/scroll of open picker, reduced motion and print. PNG/rects/computed styles after.
5. `source/scripts/picker-parity-content-baseline.mjs`: 18 matched **BEFORE** normal scenes against untouched e095 source in detached worktree. In artifact `before/` vs corresponding AFTER screenshots/JSON.
6. `.github/workflows/picker-parity-content.yml`: exact-SHA browser/unit/build and baseline detached-worktree capture, artifact upload. Does not mutate shared/required workflow.
7. This checkpoint only under `handoffs/CONTENT.md`.

## PASS evidence at own-SHA
- `npm run typecheck` — PASS.
- `npm test -- tests/picker-parity-content.test.tsx tests/compact-group-highlights.test.tsx tests/pr95-v6-l1-type-level.test.tsx tests/pr95-v5-l1-dropdown.test.tsx` — PASS 40 tests / 4 files.
- `npm run build:compact:qa` — PASS.
- `node scripts/picker-parity-content-browser.mjs` — PASS. Includes hover and keyboard-focus no change to member background; readonly absence of fake buttons; screenshots+styles+rects 1440/900/390, List/popup and full App, real selection RAM, Escape/outside, horizontal dropdown fit, popover resize/scroll, highlight/custom palette, long-personnel fixture, reduced motion/print.
- Baseline `node scripts/picker-parity-content-baseline.mjs` on reference SHA — PASS 18 matched BEFORE normal scenes (real components unchanged).
- All tests are isolated synthetic RAM only. No production credentials, Firebase/Sheets writes, merge or publish.

## Honest remaining coverage / integration gates
- **NOT RUN**: targeted *long department metadata* and specifically empty-writable metadata as real browser interaction; DOM unit covers empty writable; fixture `long=1` stresses personnel text rather than a specially extended Sở name. The default synthetic dataset/palette tests exercise document-kind values but the browser script does not explicitly assert each HC/BC/QPPL type swatch.
- The browser captures baseline vs after in identical fixture viewports, but no automated pixel-diff threshold; geometry comparisons are computed in JSON and live CSS assertions, visual reviewer can compare PNGs.
- Guest full-App report drill navigation unavailable by intentional role restriction; guest ReportDetailGrid tested as actual mounted component, not a fake.
- Real production permission/lease/Emulator conditions and entire integration final-SHA QA not demonstrated by CONTENT worker and remain COMMANDER scope.
- Dedicated repeated keyboard option-selection beyond the real selection + Enter/Arrow/Escape described above is not separately asserted.

## Handoff
COMMANDER owns cherry-pick/integration, final-SHA comprehensive acceptance, package hash/Site demo. No worker merge/publish. If stricter acceptance requires remaining long-department/empty browser matrix or explicit per-kind CSS screenshots, continue on HEAD, add only owned prefix scripts/tests/fixtures, run exact-SHA CI again, then change status to DONE. Do not redo unrelated historical tests already PASS.
Last `git clone` locally unavailable due container DNS, so source writes were through connected GitHub connector; npm/Chromium PASS are verified CI logs, not claimed locally.
