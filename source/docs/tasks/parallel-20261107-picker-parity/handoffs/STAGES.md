# STAGES checkpoint — 07/11/2026

**Status: DONE — STAGES worker & Codex F02 evidence gates PASS; COMMANDER integration remains separate.**
Branch (duy nhất được ghi): `ui/20261107-picker-parity-stages`.
Reference application SHA: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Start HEAD: `2c20202236e557a82368924bf63f382a3e521912`.
**Code SHA latest:** `835b45c623014c31315504be9bfa34355c0d5be7`.
**Latest fully tested code SHA:** `835b45c623014c31315504be9bfa34355c0d5be7` (CI #42378516213).
Checkpoint này docs-only; code không bị reset.

## Scope và kết quả
- `source/src/features/items/picker-parity-stages.css` (mới): chỉ L03, true picker 26px/padding4x7/font11/550/line-height1.35/radius6/caret5x3/gap8; hover/focus lift3px, outline/shadow 180ms, keep own status backgrounds including readonly, reduced-motion/print.
- `source/src/features/items/l03-track-widths.css`: chỉ thêm CSS `@import` tại đầu file; 5-track model, width/gaps8/chrome23/rowgap5 vẫn nguyên. Không thay `CompactGroupedValue`, CellPicker, app.css, item-frame, quyền, item-preferences/backend, L01/L04.
- `source/tests/picker-parity-stages.test.ts`: CSS/width constraints và 2 preset JSON layout roundtrip. `source/tests/picker-parity-stages-permissions.test.tsx`: React projection guest/readonly/mixed và `Không` khóa progressParty kể cả grant riêng.
- `source/scripts/picker-parity-stages-browser.mjs`: real Playwright Chromium trên actual List/popup từ shared RAM fixture, viewport 1440/900/390, edit/guest/mixed/long, hover/focus/dropdown/escape/real select, computedStyle/rect và screenshots; kiểm cả 2 bộ width, reduced-motion/print. **Bổ sung cuối chưa được kiểm:** click ngoài/scroll/resize.
- Workflow độc lập `.github/workflows/picker-parity-stages.yml` pin `github.sha`, npm locked frontend+browser, typecheck, 15 unit liên quan, build full synthetic, 32 browser scenarios, 6 five-input scenarios, tạo hash + artifact. Không tự merge/publish.

## Verified PASS (không suy đoán)
CI https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42266838889
- **Exact tested SHA:** `bdb77cbefa91e6f044845fcfbafc8ab8b5ce5f95`.
- All job steps SUCCESS. `npm run typecheck`: PASS.
- `npm test -- tests/picker-parity-stages.test.ts tests/picker-parity-stages-permissions.test.tsx tests/ui-20261106-tracks.test.ts`: **15/15 tests PASS**.
- `npm run build:compact:qa`: PASS (`dist-compact-qa/compact-qa.html`, full synthetic UI).
- `node scripts/picker-parity-stages-browser.mjs`: **32 real Chromium scenarios PASS**; browser exercised two five-width presets (readonly 122/225, editable 145/82/279; readonly 93/127, editable 93/87/133), List+popup and 2/3 track alignment, reduced motion and print.
- `node scripts/ui-20261106-tracks-browser.mjs`: **6 PASS** (admin/guest 1440/900/390, 5 width inputs, real DOM tracks).
- Artifact **ID 13528280567**: `picker-parity-stages-42266838889-bdb77cbefa91e6f044845fcfbafc8ab8b5ce5f95`; screenshots/rects/computed styles, source SHA and asset hash. URL https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42266838889/artifacts/13528280567

## Failure repaired
- CI https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42266486528 caught reduced-motion transform -3px despite media rule, because specificity lost to important hover rule. CSS specificity corrected in commit `bdb77cb...`, validated by PASS #42266838889. Do not redo this fix.

## Newest independent check
- Commit `8c0d9fbc7284493dcb31018aa117595362b61119` changes **only own browser script**, adds real outside click, scroll and resize popup bounds. CI https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205 was **IN_PROGRESS, blocked in Chromium dependencies install** at last observation; no PASS/FAIL of this addition yet. Inspect run and job logs, fix if failing, then record exact new tested SHA and artifact.
- Earlier source code CSS has passed; newest test-only SHA cannot be called fully tested until run completes.
- Full product integration, Firebase Emulator persistence, L01/L04 diff, packaging and public demo are COMMANDER's later responsibilities; worker must not merge/publish or misstate RAM reload as Firebase persistence.
- The 5width JSON roundtrip unit is persistence-model regression; real browser width editor applies one preset and separate real DOM computed geometry applies two, **not backend persistence proof**.
- Scope-still-needed: browser `Không` dedicated live witness and highlight/custom palette checks if commander requires, outside click/scroll/resize latest CI, checkpoint final update. User explicitly said do not redo prior PASS.

## Recovery
Continue this branch HEAD, inspect https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205 ; no reset/cherry-pick cross-worker; preserve working CSS and only update own files. No DONE claim until verifiable evidence.

## 07/11/2026 — Codex STAGES F02 review accepted
- Nguồn nhiệm vụ: https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/STAGES.md .
- Đã recheck GitHub API: CI #42267219205 `completed/success`, tested SHA `8c0d9fbc7284493dcb31018aa117595362b61119`, artifact `13527872811`. Dòng pending trong checkpoint cũ là lịch sử, **không còn blocker**; không sửa/lặp CSS và outside-click/scroll/resize đã PASS.
- Phạm vi F02: thêm fixture/browser riêng prefix `picker-parity-stages` cho `partyLevel=Không` dù grant progressParty, keyboard cấp trình ArrowUp/Down + Enter/Space, palette/highlight 2/3 tracks List/popup, before/after trên detached baseline e095205c cùng fixture ở 1440/900/390, exact SHA CI và artifact; không sửa source ngoài scope, không merge/deploy. 
- Trạng thái thêm gates: NOT RUN tại thời điểm checkpoint này; sẽ cập nhật kết quả thật sau CI.

## FINAL STAGES/F02 completion — 07/11/2026 (authoritative; prior IN_PROGRESS blocks historical)

**Worker status: DONE / PASS.** Final application/test SHA (unchanged by this docs commit):
`835b45c623014c31315504be9bfa34355c0d5be7`.

**Exact-SHA workflow:** https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42378516213 — `completed/success`, job `verify` #128421055260 and ALL steps SUCCESS. No merge, no production deploy, no edits to CONTENT/COMMANDER or shared app/backend files.

### F02 gates and auditable commands
1. **Mounted Không + independent grant: PASS, 6 cases** (List/popup × 1440/900/390). `mode=party-grant` really grants `progressParty=true` with `partyLevel=false`; raw first record retains `partyLevel=Không`, `progressParty=Sở chưa trình`, but projected view renders inert text `Không phải trình` with zero button/caret, zero lift/shadow; Build/Council retain granted editable independent controls and semantic tint. Real DOM evidence: `review/review-witness.json` + `review/khong-*png`.
2. **Party level real keyboard: PASS, 12 cases** (List/popup × 1440/900/390 × Enter/Space). Real option focus and ArrowDown/ArrowUp navigation, actual Enter picks `TTTU`, Space picks `Không`; patch only `partyLevel` into RAM callback, Escape and outside-pointer close; after `Không`, party-progress becomes inert while raw progressParty remains unchanged. Option focus waits for CellPicker requestAnimationFrame before real key events (two earlier harness focus-races fixed without changing CellPicker). `review/keyboard-*png` and per-key focus trail/patch in JSON.
3. **Custom status palette + member highlight: PASS, 36 cases** (List/popup × 1440/900/390 × all/guest/mixed × highlight on/off). Verifies computed RGB background/foreground for normal/hover/focus/open, all three progress fields, readonly 2-track tint and editable 3-track picker tint, mixed second record readonly and editable independent grants. Example 1440 List first row: palette Party `rgb(196, 228, 255)` / `rgb(21, 78, 133)`; highlighted Build `rgb(242, 209, 252)` / `rgb(91, 24, 123)`; highlighted Council `rgb(184, 241, 242)` / `rgb(0, 75, 80)`. No fake readonly buttons; L04 unchanged.
4. **Matching before/after: PASS, 12 paired cases** = 1440/900/390 × List/popup × 2/3 tracks, with normal and editable hover/focus/open PNG, measured DOM rectangles/computed style each side, SHA256 manifest. Reference checkout **exact e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa**, detached Git worktree, copied **only identical** `picker-parity-stages-review-fixture.tsx`, `picker-parity-stages-review-fixture.html` and test runner; `git diff -- source/src` empty, no baseline CSS/component rewrite. After checkout SHA `835b45c...`. `comparison/before/measurements.json`, `comparison/after/measurements.json`, `comparison/matched-diff.json` + matched PNG. Actual 1440 List editable rails **187px/96px/248px unchanged**, button font/min-height **12px/36px BEFORE → 11px/26px AFTER**; all three status x/width aligned, L04 computed reference invariant.
5. **Exact tested source/full synthetic and core regression: PASS**:
   - `npm run typecheck`
   - `npm test -- tests/picker-parity-stages.test.ts tests/picker-parity-stages-permissions.test.tsx tests/ui-20261106-tracks.test.ts`: **15/15**.
   - `npm run build:compact:qa`: PASS, full standalone synthetic preview.
   - `node scripts/picker-parity-stages-review-browser.mjs`: **54/54 PASS** (6+36+12); no external network.
   - `node scripts/picker-parity-stages-browser.mjs`: prior **32/32 PASS** on same exact new SHA.
   - `node scripts/ui-20261106-tracks-browser.mjs`: **6/6 PASS** real five-input editor admin/guest 1440/900/390.
   - detached baseline same-fixture `node scripts/picker-parity-stages-before-after.mjs` (before/after) then `node scripts/picker-parity-stages-compare.mjs`: **12 matched PASS**; both browser sources unchanged except owned CSS after.
   - Runner exported source SHA + asset hashes and uploaded archived proof.
6. **Artifact verified:** https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42378516213/artifacts/13576553352 — ID `13576553352`, name `picker-parity-stages-42378516213-835b45c623014c31315504be9bfa34355c0d5be7`, 14,712,584 GitHub-reported bytes. Connector downloaded the 15 MB ZIP to inspect; SHA256 of downloaded ZIP `dea68f778a19734cb66ae1a15f54fcc33da41441d5d014cb40563c731176c409`; 152 archived files including 54 review PNGs and before/after captures. Inspected real baseline vs AFTER 1440 List screenshots and 390 popup screenshot (390 is a narrow scrolling viewport).
7. **Scope audit:** compared baseline `e095205c...`..candidate `835b45c...`; only STAGES-owned CSS import/selector, own scripts, fixture, unit tests and workflow changed. No L01, L04, CellPicker, ItemList, ReportDetailGrid, data/status mapping, widths model, backend or transaction writes.

### Ownership boundary / handoff
- **DONE for STAGES worker/F02.** No pending own F02 gate. Historical CI failures #42377925790/#42378102414/#42378309965 were **test harness keyboard focus timing**, not product CSS defects; all repaired and real keyboard PASS on final SHA. Preserve pre-existing CSS and functional PASS, do not rerun failures as outstanding tasks.
- **NOT RUN and NOT claimed:** actual Firebase/Sheets layout persistence, full product emulator, integrated CONTENT+STAGES SHA, final package/public demo. These belong to COMMANDER's integration acceptance. Five-width JSON roundtrip + synthetic five-input editor are NOT Firebase persistence evidence. This distinction is deliberate and not an F02 blocker.
- Branch remains `ui/20261107-picker-parity-stages`, no merge/deploy. COMMANDER should consume exactly tested code SHA `835b45c...` and the artifact above, not a docs-only HEAD.
