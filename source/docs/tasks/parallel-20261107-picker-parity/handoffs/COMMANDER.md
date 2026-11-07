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

## STAGES verification — 07/11 (new event; supersedes worker's "CI pending" note)
- Stage tested source SHA `8c0d9fbc7284493dcb31018aa117595362b61119` fully passed [CI #42267219205](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205) with 15 unit, 32 browser cases, 6 width editor scenarios, exact SHA pin and build; checked GitHub workflow job/log, not the worker claim alone.
- Run artifact `13527872811` exists and is unexpired; [download page](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205/artifacts/13527872811). HEAD `25fbef378c5c2cd9152c6e8218a7887dac27fc4c` is docs-only after tested code; diff confirms no source delta.
- Scope diff from shared seed has only new STAGES CSS, L03 CSS import, own browser/units/workflow/handoff; no shared CellPicker/L04/backend/width model touched.
- Decision: mark stage **core implementation PASS** and do NOT repeat those verified PASS tests. Worker checkpoint still **IN_PROGRESS**, lacks browser evidence dedicated `Không`/highlight-custom-palette and matched before/after baseline. Owner STAGES to complete/explicitly justify those gates; commander owns full integrated exact SHA and emulator. Never elevate DONE on words or run success alone.
- Tracker committed as [`b2c9376`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/b2c93761701722af8949db843c493882ed145404). No source integration yet, no package/demo release.

## 2026-11-07 review reconciliation — canonical latest event
**COMMANDER: IN_PROGRESS. Integrated source/tested SHA: NONE. Site demo parity: DEMO_PENDING (existing v4 not accepted).**
Imported [Codex evidence review](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/README.md) and [COMMANDER instructions](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/COMMANDER.md) into canonical [TRACKER](../TRACKER.md). These supersede earlier snapshot wording that CONTENT still had gaps long Sở/empty/HC/BC/QPPL, or STAGES' latest CI was pending.
- CONTENT tested `9fb74b7fda1ab4492011dc675df5d656e74f6000` [CI 42269772715 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715) 40 unit / 73 browser / 18 BEFORE, artifact `13527674364`. Latest branch HEAD `c530ec237ef73484192170ace6ab1e3908b1dfa8`, docs-only since code. **F01 NEEDS_FIX**: hover/focus clip by `.compact-document-heading` overflow-y hidden, visible screenshot and rect (y728.1875 clip versus y725.1875 button). Owner CONTENT has [executable review prompt](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/CONTENT.md); no changes to CONTENT branch by commander. Do not re-run unchanged 40/73 evidence unnecessarily.
- STAGES tested `8c0d9fbc7284493dcb31018aa117595362b61119`, [CI 42267219205 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205) 15 unit/32 browser/6 widths, artifact `13527872811`. Latest `25fbef378c5c2cd9152c6e8218a7887dac27fc4c`, docs-only. **F02 PENDING**: real mounted Không+grant, palette/highlight, baseline before/after, real keyboard ArrowUp/Down+Enter/Space at cấp trình. Owner STAGES has [executable review prompt](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/STAGES.md); outside/scroll/resize existing PASS.
- COMMANDER workflow `.github/workflows/picker-parity-20261107.yml` exists, but has not run for integrated source. No source cherry-pick yet: do not import F01-defective CSS or call combined acceptance PASS. Prepare exact SHA acceptance and release-package receipts, then integrate when both workers supply verified new own SHA/tests.
- Container git network still fails DNS; use GitHub connector for GitHub objects and CI on remote Actions. GitHub connector supports writing files but has no Sites deployment action; plan executable DEMO_HANDOFF if none becomes available. No live/production writes.

Recovery: inspect new worker HEADs and their checkpoint/run IDs; compare tested SHA to actual code; integrate **only** source/test/fixture/evidence script with no docs overwrite when F01/F02 evidence complete; trigger exact SHA workflow on command; final SHA package manifest and demo. Do not reset branch or redo previously PASS work. Latest tracker writer commit 428ce26270ee8d863526ec77448731c2a7fb0bf3.
