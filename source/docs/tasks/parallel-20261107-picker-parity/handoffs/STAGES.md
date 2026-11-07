# STAGES checkpoint — 07/11/2026

**Status: IN_PROGRESS — core exact-SHA CI PASS; review F02 evidence gates in progress.**
Branch (duy nhất được ghi): `ui/20261107-picker-parity-stages`.
Reference application SHA: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Start HEAD: `2c20202236e557a82368924bf63f382a3e521912`.
**Code SHA latest:** `8c0d9fbc7284493dcb31018aa117595362b61119`.
**Latest fully tested code SHA:** `8c0d9fbc7284493dcb31018aa117595362b61119` (CI #42267219205).
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
