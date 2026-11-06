# Tracker — Picker parity 07/11/2026
Writer duy nhất: COMMANDER trên `ui/20261107-picker-parity-command`; tracker ở worker chỉ là seed.
Application/reference baseline `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`. Không chuyển READY sang DONE nếu không có bằng chứng cùng SHA.

## Kiểm tra thực tế — 2026-11-07 (COMMANDER tiếp nhận)
- Git refs của cả ba nhánh COMMANDER/CONTENT/STAGES đều ở `2c20202236e557a82368924bf63f382a3e521912` tại thời điểm kiểm tra (GitHub git/ref).
- Checkpoint [CONTENT](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md) và [STAGES](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/handoffs/STAGES.md) đều ghi READY_NOT_STARTED; chưa có code/tested SHA mới.
- CI #42256616362 được kế thừa cho application baseline, KHÔNG phải acceptance parity đợt07.
- Container chạy local không truy cập được `github.com` (DNS resolution failed), vì vậy dùng GitHub connector ghi/đọc và GitHub Actions để thực thi test. Không suy diễn local smoke thành PASS.
- Không chạm nhánh worker, main, Firebase production hoặc Site cũ trong mốc này.

| Owner | Branch | Status | Code/tested SHA mới | Evidence | Còn thiếu |
|---|---|---|---|---|---|
| COMMANDER | ui/20261107-picker-parity-command | IN_PROGRESS | NONE / NOT RUN | Git ref và checkpointer 07/11; checkpoint COMMANDER | Acceptance workflow, integration, exact SHA QA, package, demo/handoff |
| CONTENT | ui/20261107-picker-parity-content | IN_PROGRESS | `fa9dbbe5` / CI PASS #42269339502 | [CONTENT checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md) | UI L01, editable/readonly/mixed, background, browser/CI |
| STAGES | ui/20261107-picker-parity-stages | IN_PROGRESS (core CI PASS) | `8c0d9fb` / CI PASS #42267219205 | [STAGES checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/handoffs/STAGES.md) | UI L03, 5 widths, 2/3 tracks, readonly background, browser/CI |

Demo picker parity: NOT STARTED. Public Site hiện có vẫn version4 reference cho đến khi có evidence deployment thành công mới. Không coi docs-only commit là mã mới.

## Sự kiện tiếp theo — 07/11/2026
- CONTENT HEAD `b2ed2e9fad7453a2dda05c5a5e381823c07fa11c`: docs-only checkpoint baseline audit; status IN_PROGRESS, code NONE, tests NOT RUN.
- STAGES HEAD `a514eedbc87ef1c6eccef403ac4299e4c000c934`: docs-only checkpoint baseline audit; status IN_PROGRESS, code NONE, tests NOT RUN.
- COMMANDER tạo workflow `.github/workflows/picker-parity-20261107.yml` ở commit `6559a218a5bd0b3958662c91d1ceec0009be7357`; chưa chạy workflow, không claim PASS. Workflow không deploy, không bỏ gate; feature scripts bắt buộc `picker-parity-content-browser.mjs` và `picker-parity-stages-browser.mjs` phải khớp tên khi worker giao.
- Trước integration: xác minh worker source SHA, per-SHA browser evidence. Khi hai worker còn IN_PROGRESS, không cherry-pick, không tạo demo từ baseline.

## Xác minh STAGES trực tiếp — 07/11/2026 (sau báo cáo worker hoàn thành)
- STAGES branch HEAD `25fbef378c5c2cd9152c6e8218a7887dac27fc4c`; so sánh `8c0d9fbc7284493dcb31018aa117595362b61119...25fbef3` cho thấy **chỉ 01 docs-only commit**, không có source change sau tested SHA.
- Workflow [#42267219205](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205) completed SUCCESS, `head_sha=8c0d9fbc7284493dcb31018aa117595362b61119`. Job verify: all steps SUCCESS. Log: TypeScript PASS; unit 15/15 PASS; `build:compact:qa` PASS; real Chromium `PICKER_PARITY_STAGES_BROWSER_PASS scenarios=32`; width regression `UI_20261106_TRACKS_PASS modes=6`.
- Artifact [13527872811](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205/artifacts/13527872811) name `picker-parity-stages-42267219205-8c0d9fbc7284493dcb31018aa117595362b61119`, 3,077,003 bytes; present, not expired. Newest browser addition covers genuine outside click/scroll/resize; verified source diff.
- Compare seed..STAGES HEAD: 17 commits; only own scoped new CSS + import L03, 2 tests, browser script, own workflow and checkpoint changed (7 files). No L04, shared CellPicker, backend or model change in worker diff.
- **Acceptance decision:** feature code and exact-SHA worker CI **PASS**, do **not** redo 15 unit/32 browser/6 widths without changed source. Keep worker status IN_PROGRESS (not DONE) because checkpoint itself explicitly says pending completion and acceptance gaps remain: dedicated live `Không` case, explicit custom palette/highlight browser checks, baseline before/after captures. Owner: STAGES; acceptance requires real Chromium assertions/screenshots/rects against baseline, updated exact SHA CI and checkpoint. Commander will independently cover final integration SHA and Emulator permission/config persistence. This is not a claim worker has failed core tests.
- CONTENT checkpoint also advanced: tested SHA `fa9dbbe5a0ea0e5ff1805947717c5eb9145c939e` with [isolated CI #42269339502](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269339502) reported SUCCESS. CONTENT still IN_PROGRESS because dedicated long Sở/empty writable/HC-BC-QPPL browser matrix not yet complete. Integration awaits both worker acceptance handoffs; no premature merge.
