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
| CONTENT | ui/20261107-picker-parity-content | READY_NOT_STARTED | NONE / NOT RUN | [CONTENT checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md) | UI L01, editable/readonly/mixed, background, browser/CI |
| STAGES | ui/20261107-picker-parity-stages | READY_NOT_STARTED | NONE / NOT RUN | [STAGES checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/handoffs/STAGES.md) | UI L03, 5 widths, 2/3 tracks, readonly background, browser/CI |

Demo picker parity: NOT STARTED. Public Site hiện có vẫn version4 reference cho đến khi có evidence deployment thành công mới. Không coi docs-only commit là mã mới.
