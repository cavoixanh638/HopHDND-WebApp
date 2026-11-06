# COMMANDER checkpoint — 2026-11-07

Status: **IN_PROGRESS** (coordination/acceptance preparation only).
Branch: `ui/20261107-picker-parity-command`.
Application/reference baseline: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Inherited docs-only seed HEAD (before this checkpoint): `2c20202236e557a82368924bf63f382a3e521912`.
Code SHA new: **NONE**; final tested SHA: **NONE**; picker parity acceptance **NOT RUN**.

## Confirmed, not inferred
- Read `COMMANDER.md`, `README.md`, `PLAN.md`, `TRACKER.md`, both worker task files and checkpoints; verified 3 branch refs at same seed SHA on 07/11.
- CONTENT and STAGES are **READY_NOT_STARTED**, tested SHA NONE, NOT RUN. Do not count either as DONE until full own-SHA acceptance/evidence.
- Earlier reference CI run [#42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362) remains baseline evidence, not current code acceptance.
- GitHub clone from execution container failed DNS (`Could not resolve host: github.com`); GitHub connector supports writing and GitHub Actions can test; do not assert local/browser passes.

## Next execution sequence
1. Create new isolated acceptance workflow `.github/workflows/picker-parity-20261107.yml` on COMMANDER, exact SHA, typecheck/full tests/both builds, real browser feature scripts mandatory (no silent skip), unchanged L04 reference & permission/CAS regression, SHA manifest/package; CI artifact outputs retained.
2. Re-read both worker branch refs/checkpoints and CI before integration; leave READY until commit+evidence. Where deficits: owner + repro + acceptance in command task file, do not edit worker branches.
3. When BOTH pass, integrate their actual committed source into COMMANDER (not main), audit diff L04/coreCellPicker/backend, run acceptance at **same final source SHA**; rerun affected checks if source changes.
4. Rebuild and hash assets/package from tested SHA; deploy existing public Site only if API access exists. Otherwise `DEMO_PENDING` with executable `DEMO_HANDOFF.md` and no false deployment claim.
5. Update this checkpoint and TRACKER at each material event; docs-only changes separate from code SHA.

Scope guard: no merge main, Firebase production, migration, RTDB/Excel writes, source changes, new agent/chat. Continue HEAD, do not reset.

## Tiến độ đã commit (07/11)
- Tracker HEAD updates: `a738f50` (initial), `5512f6a` (worker IN_PROGRESS verified).
- Workflow exact-SHA acceptance + package + isolated CAS: [`6559a21`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/6559a218a5bd0b3958662c91d1ceec0009be7357); tạo thành công, file đã được fetch lại/verify. **Chưa chạy**; workflow chỉ push trigger khi source/scripts/tests thay đổi hoặc workflow_dispatch, tránh báo FAIL giả do worker chưa bàn giao.
- Worker docs-only HEAD: CONTENT `b2ed2e9`, STAGES `a514eed`; cả hai IN_PROGRESS, code SHA NONE và tests NOT RUN, không tích hợp sớm. Checkpoint của mỗi worker là source of truth tiếp theo.
- Tên script mà workflow đòi là `source/scripts/picker-parity-content-browser.mjs` và `source/scripts/picker-parity-stages-browser.mjs`. Trước chạy CI phải đối chiếu tên script thực tế worker; không hạ yêu cầu browser acceptance xuống optional.
- Public Site demo vẫn v4; DEMO_PENDING về mặt nhiệm vụ, chưa có gói final SHA, artifact hoặc deployment mới.

Tiếp quản ngay: đọc lại worker HEAD/checkpoint, sửa workflow nếu script contract khác, tích hợp khi có code+evidence, chạy workflow ở integrated exact SHA, dựng gói và ghi DEMO_HANDOFF nếu Sites API không có. Không claim DONE từ checkpoint docs-only.
