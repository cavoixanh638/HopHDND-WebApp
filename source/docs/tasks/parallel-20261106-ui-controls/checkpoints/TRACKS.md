# TRACKS checkpoint — UI controls 06/11/2026

Status: **IN_PROGRESS — CODE COMPLETE, FINAL QA IN FLIGHT (do not merge/deploy yet)**
Worker branch: `ui/20261106-l03-tracks` only
Baseline: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`
Latest code candidate: `e706f7beed6e3ab4f2c74b345a5db92b5548533c` (CI 42249786788)
Known green tested UI SHA: `297f2cc93514096f289e80698f9420d9a140cd51` (CI 42248771926; UI PASS)
PR for commander: https://github.com/cavoixanh638/HopHDND-WebApp/pull/158 (draft, NO merge)

## Implemented on branch
- `source/src/data/item-preferences.ts`: optional `ItemLayout.partyTrackWidths={readonly:{label,status}, editable:{label,level,status}}` in **CSS px**, integer validation each field, asymmetric mode values and no silent sync.
- `source/src/data/item-layout-merge.ts`: merge/CAS conflict each 5 fields separately. Keep original/remote explicit setting precedence. `shared-config`, `use-firebase`, `App` already traverse `validateItemLayout`/merge.
- `source/src/features/items/ItemList.tsx`, `admin-list-controls.css`, **new** `l03-track-widths.css`: administrator-only five-input editor grouped by readonly/editable, computed totals, single persist, per-field errors, draft retained on failed CAS; list `col` physical width from mode totals; each row independent subgrid width.
- `source/src/features/reports/ReportDetailGrid.tsx`: popup uses shared 5 rails but retains separate popup frame. Existing L03 DOM/data attributes untouched.
- `source/tests/ui-20261106-tracks.test.ts` (8 tests); browser `source/scripts/ui-20261106-tracks-browser.mjs` for real full synthetic preview, five-field save, guest role, 3 viewports, screenshots/rects.
- `source/scripts/final-app-qa-runner.mjs` QA10 updated from 2 legacy totals to 5 fields, authentic app/RTDB/reload/admin/guest, with physical/computed-width proofs.
- `source/scripts/ui-20261105-picker-layout-browser.mjs`: removed obsolete 238px hardcoded assertion, now computed CSS track.
- `.github/workflows/ui-20261106-tracks.yml`: branch+draft-PR CI, typecheck/all unit, real Chromium full preview plus mixed/popup wrapping regression, isolated backend and real full App Emulator. No production deployment.

## Geometry contract and deterministic old-profile fallback
`L03_CELL_CHROME_PX=23` = TD left padding 11 + right padding 11 + right border 1. `L03_RAIL_GAP_PX=8`.
- readonly physical = readonly.label + readonly.status + 8 + 23.
- editable physical = editable.label + editable.level + editable.status + 2×8 + 23.
- one HTML physical column: readonly-only uses readonly physical; where editable appears, max(readonly physical, editable physical). Each inner subgrid retains own rail widths. If one mode narrower, unused space is unavoidable in common HTML `<col>`.
- CSS rail `grid-template-columns` pixel values, `box-sizing:border-box`, `subgrid` aligns three progress states. Empty level track reserved on rows 2/3.
- Minimum per-rail: readonly label 84/status 112; editable label 84/level 76/status 112. These fit basic wrapping; level 76 allows Không/TTTU + small caret/padding, avoids viewport-driven 1fr and old 360/500 group min. Max status/label 1400, level 900 allows user-requested wide values.
- Legacy-only `partyGroupWidths` is **read in RAM only**; no automatic migration/save. For each mode, subtract above chrome/gaps once; readonly label = clamp(round(48% of remaining),84..1400), status=remaining-label clamped 112..1400; editable level=clamp(round(18% of remaining),76..900); label=clamp(round(43% of remaining minus level),84..1400), status=remainder clamped 112..1400. Small legacy totals may expand due per-rail minimum; explicit five fields always override legacy totals on reload.

## Evidence (at current checkpoint)
- CI 42248771926 at UI SHA `297f2cc9`: real Chromium **PASS**, admin+guest viewport 1440/900/390. 6 PNG and JSON rects: artifact ID 13517973653 (GitHub Actions).
- Measured 5 asymmetric rail inputs readonly {label:122,status:225} => 378px physical; editable {label:145,level:82,status:279} => 545px physical. All 3 status rectangles per mode share x and width, measured grid lengths equal inputs.
- `npm run typecheck` PASS; `npm test` **905 passed, 116 skipped**; new `ui-20261106-tracks.test.ts` **8/8 PASS**. Confirmed CI runs 42248771926 and 42249122107.
- Canonical `cell-edit-service/npm run test:isolated` PASS in CI 42249122107, real App QA01–QA09 PASS. QA10 in that run failed because original test used old two-field control selector; QA10 updated and committed, awaiting latest CI.
- Broader legacy `npm run test:firebase` produced 40/92 failures (403 lease, 400 generation) in run 42247805382, outside 5-rail model; do not suppress, distinguish from canonical isolated suite. No production writes.

## Latest QA
`42249786788`: branch candidate after updating QA10 and adding actual mixed/popup/wrap regression step. **Pending**. Inspect jobs, screenshots and artifacts before DONE.

## Safety and ownership
- **Never touched** PICKER worker-owned `CellPicker.tsx`, `CompactGroupedValue.tsx`, or shared `item-frame.css` / `app.css`.
- No production write, deploy, or merge; draft PR #158 only.
- Next: inspect run 42249786788; repair failures in owner scope; persist tested SHA/run/screenshot/rects; mark DONE only when isolated App/Emulator + real browser mixed/popup all PASS.
