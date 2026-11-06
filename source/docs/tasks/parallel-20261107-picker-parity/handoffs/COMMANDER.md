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
