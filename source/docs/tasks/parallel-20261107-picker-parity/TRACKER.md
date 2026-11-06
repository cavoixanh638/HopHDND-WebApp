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
| CONTENT | ui/20261107-picker-parity-content | IN_PROGRESS | NONE / NOT RUN | [CONTENT checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md) | UI L01, editable/readonly/mixed, background, browser/CI |
| STAGES | ui/20261107-picker-parity-stages | IN_PROGRESS | NONE / NOT RUN | [STAGES checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/handoffs/STAGES.md) | UI L03, 5 widths, 2/3 tracks, readonly background, browser/CI |

Demo picker parity: NOT STARTED. Public Site hiện có vẫn version4 reference cho đến khi có evidence deployment thành công mới. Không coi docs-only commit là mã mới.

## Sự kiện tiếp theo — 07/11/2026
- CONTENT HEAD `b2ed2e9fad7453a2dda05c5a5e381823c07fa11c`: docs-only checkpoint baseline audit; status IN_PROGRESS, code NONE, tests NOT RUN.
- STAGES HEAD `a514eedbc87ef1c6eccef403ac4299e4c000c934`: docs-only checkpoint baseline audit; status IN_PROGRESS, code NONE, tests NOT RUN.
- COMMANDER tạo workflow `.github/workflows/picker-parity-20261107.yml` ở commit `6559a218a5bd0b3958662c91d1ceec0009be7357`; chưa chạy workflow, không claim PASS. Workflow không deploy, không bỏ gate; feature scripts bắt buộc `picker-parity-content-browser.mjs` và `picker-parity-stages-browser.mjs` phải khớp tên khi worker giao.
- Trước integration: xác minh worker source SHA, per-SHA browser evidence. Khi hai worker còn IN_PROGRESS, không cherry-pick, không tạo demo từ baseline.
