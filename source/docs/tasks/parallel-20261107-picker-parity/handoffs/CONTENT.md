# CONTENT checkpoint — 07/11/2026

## Own CONTENT scope: DONE — F01 paint clipping also verified
Branch: `ui/20261107-picker-parity-content`; reference App SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
**Own application + test code SHA / exact tested SHA: `9fb74b7fda1ab4492011dc675df5d656e74f6000`**. This subsequent checkpoint commit is docs-only and does not change tested code.

**CI:** [run #42269772715](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715) — **SUCCESS** at `9fb74b7fda1ab4492011dc675df5d656e74f6000` (each step completed/success).
**Evidence artifact:** [#13527674364](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715/artifacts/13527674364), `picker-parity-content-42269772715-9fb74b7fda1ab4492011dc675df5d656e74f6000`, 13,083,947 bytes. Includes browser PNG/JSON computed styles/rects, normal/hover/focus/open and `before/` matching baseline screenshots from untouched e095 detached worktree.

## Implementation: own files only
1. `source/src/features/items/picker-parity-content.css`: L01 Sở trình + Loại VB, field-only 26px min height / 4px×7px / Segoe11/550/1.35 / 6px radius / 5px×3px filled caret / 8px gap / content-fit + max100%, centered one row, readonly 13/400 and original parenthesized metadata; preserves type tones and individual highlight, field-only hover/focus lift 3px, blue outline/shadow 180ms, preserves background, reduced-motion/print.
2. `source/src/features/items/CompactGroupedValue.tsx`: only scoped CSS import; no other shared DOM changes.
3. `source/tests/picker-parity-content.test.tsx`: markup + permissions/empty data (both editable, mixed both directions, both readonly, empty writable/readonly).
4. `source/tests/picker-parity-content-fixture.tsx`, `source/tests/picker-parity-content-fixture.html`: extra real ItemList/ReportDetailGrid synthetic RAM-only fixture for truly long Sở, empty field, and QPPL/HC/BC values at different permissions.
5. `source/scripts/picker-parity-content-browser.mjs`: 1440/900/390, original real List/popup fixture admin/edit/mixed/guest and full synthetic App List admin/guest plus admin report drill popup, browser normal/hover/focus/open + photos/computed-style/rects; real alternative choice -> RAM patch, keyboard Enter/Arrow/Escape and outside, horizontal dropdown placement, scroll/resize when open, highlight and custom palette, long personnel and true long department, empty metadata, QPPL/HC/BC in dedicated fixture, print/reduced-motion.
6. `source/scripts/picker-parity-content-baseline.mjs`: BEFORE matched screenshots and JSON for 18 scenes using e095 detached worktree with unchanged actual App components.
7. `.github/workflows/picker-parity-content.yml`: isolated exact-SHA CI and baseline worktree; only role-specific workflow, no changes to required checks.
8. `source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md` (this checkpoint). No unrelated files changed.

## Verified commands and output on exact tested SHA
- `npm run typecheck` — **PASS**.
- `npm test -- tests/picker-parity-content.test.tsx tests/compact-group-highlights.test.tsx tests/pr95-v6-l1-type-level.test.tsx tests/pr95-v5-l1-dropdown.test.tsx` — **PASS**, 40 unit tests / 4 files.
- `npm run build:compact:qa` — **PASS**.
- `node scripts/picker-parity-content-browser.mjs` — **PASS**, including 18 main List/popup scenes, 6 full App List and 3 full App report-drill popup scenes, additional highlight/custom palette/long/blank/type edge browser matrix, resize/scroll and accessibility-media.
- `node scripts/picker-parity-content-baseline.mjs` copied to detached baseline e095 — **PASS**, 18 before scenes, identical fixture/viewport.
- No production traffic/data changes, merge, or publish performed.

## Distinctions, risks, and next owner
- Browser captures before and after matching views, but does **not** use an automatic pixel-diff tolerance; the screenshots and rect/style JSON are for visual inspection. Geometry/hover/background/permissions tests are programmatic.
- Tests are real React components running with synthetic RAM-only data, not proof of production Firebase lease/CAS/ACL. Guest full-App admin navigation is intentionally restricted; guest popup uses real ReportDetailGrid fixture and succeeds. Popup position checked for viewport horizontal fit, resizing/scrolling and absence of overflow when popover remains open; valid native dismissal on resize/scroll is allowed.
- Separate dedicated edge fixture is required for long department, empty metadata, QPPL/HC/BC because the full-App preview has fixed synthetic records. Full App itself is still exercised for normal admin/guest List and admin drill popup.
- **COMMANDER owns integration**: cherry-pick feature (not worker checkpoint), integrate STAGES, final combined source SHA checks, full unit/regression/Emulator where appropriate, package/hash and public demo publication. All COMMANDER items remain **NOT RUN here**, not implied by worker DONE. Do not merge/publish from this branch.
- Local container GitHub DNS disabled, so all commits via connected GitHub API; npm/browser evidence is GitHub Actions at exact tested SHA, not local run.


## F01 reopened after Codex review (2026-11-07)

**Status: DONE for CONTENT including Codex F01; 9fb74b7 previous acceptance remains PASS.**
Review source: `docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/CONTENT.md`.
Baseline witness: run #42269772715, artifact #13527674364, `1440-list-edit-hover.json/png`: heading y728.1875/h26 but translated QPPL button y725.1875/h26; vertical overflow:hidden clips outline and shadow. Previous browser asserted computed transform but not actual paint room. **F01 NOT YET PASS.**

Scope: alter `picker-parity-content.css` plus role-specific regression browser/test, preserve L01 geometry, cell permissions, unrelated UI, reduced-motion/print. Add real keyboard Tab focus without hover, List/popup 1440/900/390 edit/mixed, screenshot normal/hover/focus and clip ancestor/scroll/layout checks. Run own CI on new exact tested source SHA before returning DONE. Do not reset earlier work. Commander owns integration, not this worker.


## F01 progress checkpoint — 07/11/2026
Status **IN_PROGRESS / own F01 CI running**. Old 9fb74b7 PASS is preserved, only clipping acceptance reopened.
- Scoped CSS commit `7b34893fcf401d2a69bc5632ac0f40f91b5c8320`: change heading overflow to visible on both axes (the two flex members already shrink/wrap), no padding, height, transform, shadow or business color changes. Do not claim complete until real paint gate.
- New `scripts/picker-parity-content-f01-browser.mjs`: 24 List/popup x edit/mixed x Sở/Loại x 1440/900/390 real Chrome scenes; normal/hover/true keyboard Tab focus (pointer away); screenshot full/details, computed clipping ancestor/outline+shadow painted bounds, row/next-row dimensions, document width.
- New `scripts/picker-parity-content-f01-diff.mjs`: strict baseline vs after normal/hover/focus rect and style comparison, permitted pixel delta 1.1; background, lift, shadow invariance; document scroll width never grows; old version must reproduce clip.
- Separate workflow step runs **BEFORE** fixture at former tested SHA `9fb74b7fda1ab4492011dc675df5d656e74f6000` with the same F01 script in a detached worktree, after against new SHA; archives both PNG+JSON and machine-comparison report. Existing 73 browser scenes + 40 unit tests + build unchanged.
- Final exact tested SHA `23fefefb5ae73a75c12634c336e64c1b94e3996e`, GitHub Actions [#42382463641](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42382463641) **SUCCESS**. The originally cited #42377854275 was an earlier failed intermediate run; do not use it as acceptance evidence.


## F01 final acceptance and handoff — 2026-11-07

**Final own implementation/tested code SHA:** `23fefefb5ae73a75c12634c336e64c1b94e3996e`.
**CI run:** [#42382463641](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42382463641) — **SUCCESS**, every job step PASS.
**Evidence:** [artifact #13578111725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42382463641/artifacts/13578111725) (`picker-parity-content-42382463641-23fefefb5ae73a75c12634c336e64c1b94e3996e`, 29,835,928 bytes). Includes F01 screenshots/crops and clip/style/rect JSON under `f01/before/`, `f01/after/`, `f01/before-vs-after.json`, plus pre-existing 73 browser scenario evidence and 18 e095 baseline captures.

**F01 numeric results (real Chromium, old worker SHA vs fixed worker SHA):**
- BEFORE on unchanged prior accepted SHA `9fb74b7fda1ab4492011dc675df5d656e74f6000`: `PICKER_PARITY_CONTENT_F01_BEFORE_REPRODUCED scenes=24 clipped=24` (heading own overflow clips lift/outline/shadow).
- AFTER at exact tested SHA `23fefefb...`: `PICKER_PARITY_CONTENT_F01_AFTER_PASS scenes=24 clipped=0`.
- Diff: `PICKER_PARITY_CONTENT_F01_DIFF_PASS`, **maxLayoutDeltaPx = 0** across **1440 compared rect values** (heading, button, group, row, next row; normal, hover, true Tab focus); unchanged button fill, shadow specification and -3px lift; no new document horizontal scroll.
- Every effective clip ancestor must contain the complete transformed button + its 2px outline; the heading itself and other non-scrollport ancestors must also contain the whole requested shadow. At the physical edge of a scrollable modal/table/viewport, the outer halo may be naturally cropped by the existing scrollport; this is separately measured as `scrollportShadowCrops` and **not misreported as internal F01 clipping**.
- True keyboard `Tab` after pointer moves away verifies `:focus-visible`; List and real popup, Sở and Loại VB, editable and mixed, 1440/900/390. The exact original CSS geometry remains min-height26, padding4×7, font11/550, radius6, caret5×3, hover/focus lift-3 and transition180ms. The fix is exclusively scoped heading `overflow:visible` instead of `overflow-x:auto;overflow-y:hidden`, with no layout padding/height increase.

**Unchanged checks rerun on same tested SHA:** `npm run typecheck` PASS; 4 files/**40 unit tests** PASS; `npm run build:compact:qa` PASS; prior browser script **73 cases PASS**; baseline e095 detached worktree **18 captures PASS**.

**F01 owned file changes since old PASS:** `source/src/features/items/picker-parity-content.css`, `source/scripts/picker-parity-content-f01-browser.mjs`, `source/scripts/picker-parity-content-f01-diff.mjs`, `.github/workflows/picker-parity-content.yml`, and this own checkpoint. The existing broad browser script has one additional failure diagnostic only; no weakened assertions. No changes in L03/L04/shared CellPicker, backend, permissions, width model or production.

**Next owner:** COMMANDER may cherry-pick/review implementation from own final code SHA and execute combined-SHA CI/packaging/demo; worker has **not** merged, deployed or published. This checkpoint commit is docs-only and follows the tested code SHA; code and tests have no unvalidated changes.
