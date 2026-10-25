# PR #72 — Independent-style security review and release verdict

**Date:** 2026-10-25. **Scope:** `feat/exclusive-cell-leases-admin-freeze-20261025`. **Verdict: NEEDS FIX — PRODUCTION NO-GO.**

This is an adversarial source-code and Firebase Emulator review undertaken separately from the initial implementation path, **not** a third-party security certification. Exact review target is the current PR #72 head; verify that SHA again before release. Do not deploy, merge or import real data based solely on a green CI run.

## Evidence verified

- Real operator backup: isolated Emulator restoration passed, no live writes; backup source had 0 primary items at snapshot time.
- Real operator private Rules backup matches effective Published production Rules via read-only `database:get /.settings/rules`; both canonical hashes `005ee641bf70bcb15bf2300e4928cced4567374dcae745f2ab896d55a4f4ab3a`. This validates **existing Published** Rules, not the new candidate.
- Auth + RTDB Emulator primary staging synthetic seeding passed, as did multi-UID realtime functional test and safety regressions including freeze, permission grants, row CAS and structured audit.
- A previous audit forgery was discovered and fixed: client-provided opaque JSON strings for history values were accepted under a genuine lease. New structured `changes/{field}` and `oldValues/{field}` values are checked against prior/current row values by candidate Rules. Automated tests pass.

## Blocker SEC-001 — shared-UID tab can replay another tab's lease token

**Severity: MAJOR. Current verdict: OPEN, NOT FIXED.**

`hdnd/.read = auth != null` exposes `hdnd/editLocks/{id}/{field}/token` to **all** signed-in sessions (including anonymous). A second tab carrying the *same* Firebase `auth.uid` can read the first tab's lease token and construct an otherwise valid row update, even though that tab never acquired the lease. Candidate Rules check UID + token, not a server-authenticated tab identity. Test `denies same-UID second tab replaying a visible foreign tab lease token` reproduced the successful unauthorized write on the Emulator; [CI #40203951669](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40203951669) failed the negative assertion.

This does **not** allow a different UID to impersonate the lease holder merely by copying the token. There is a separate regression that denies foreign-UID replay. Nor does it imply ordinary UI in two tabs routinely ignores leases: the browser-side session manager prevents normal competing acquires. However, the earlier description **“server guarantees exclusive lock across same-UID tabs against direct client calls” is false**. A client-created `session` string is not a protected identity claim, and simply validating it in Rules or hiding it in another readable client-side node does **not** solve this.

**Release fix decision required:** either (A) enforce separate Auth principals/sessions for edit-capable independent editors, with server-verifiable session binding (a trusted backend is required for a hard same-UID multi-tab adversarial guarantee); or (B) explicitly narrow the product security contract to *different Firebase UIDs are mutually exclusive; same UID tabs receive cooperative UI-level contention protection*, communicate this limitation, and prohibit interpreting per-tab client UUIDs as server-authenticated identity. Do not silently select B as a claim of equal security.

## Security and architecture review observations

1. **Anonymous write authority:** grants in `hdnd/permissions/columns`, `rows` and `cells` apply to **any authenticated anonymous viewer**, not a named employee. When enabled on the public website, a person who can create an anonymous Firebase session may edit granted fields. Document grant scope and consider named employee authentication/UID-level grants if identity-based authorization is required. This is a requirements/security gate, not a test failure.
2. **Read scope:** `hdnd/.read` grants all authenticated identities visibility over primary data, grants, edit locks and configuration. No per-employee read isolation is implemented; do not promise it.
3. **Audit lifetime:** row history is a circular 50-event window; a project administrator or person with administrative Firebase console rights can still edit backend data outside client Rules. It is not a permanent independently immutable evidence store.
4. **Freeze receipt limits:** `freezeReceipts` accepts a checksum and count submitted by the verified admin. Rules validate shape and timing but cannot recompute the checksum of all primary items. Treat a receipt as an operator assertion pending independent readback, not a cryptographically checked server snapshot.
5. **Source freshness:** the previously backed-up production snapshot had 0 `hdnd/items` at backup time. That does not authorize assuming live is still empty, and the old mirror must **not** be mistaken for the final approved source while personnel continue temporary data entry elsewhere.
6. **Safe deployment ordering:** merge/client cutover before secure Rules deployment and verified data initialization would expose a broken empty or read-only experience. A release plan must address Rules, backup verification, one-time migration, UI activation, monitoring and rollback with explicit hold points.

## Required release evidence (all must be completed)

- [x] Restore actual backup into isolated local Emulator and verify.
- [x] Verify saved Rules equal effective Published Rules by hash, read only.
- [x] Automated emulator multi-UID edits/denial/freeze/structured history.
- [x] Isolated primary staging seed and application build CI.
- [ ] Resolve or expressly accept SEC-001 with the documented narrower security contract; preserve an adversarial regression.
- [ ] Decide whether anonymous edit grants are acceptable for public access or implement signed-in per-user grants.
- [ ] Independent review of the *final* candidate Rules against all intended authorization boundaries.
- [ ] Two-browser/2–3 identity acceptance receipt against the **current head**, including lock, realtime, reconnect, and audit; the user's informal “ok rồi” is progress but not detailed proof of these cases on the latest code.
- [ ] Approve the exact final data-export source/manifest at cutover, perform a new read-only production checkpoint immediately before import, check destination empty and freeze state, demonstrate dry run with same schema.
- [ ] Approve cutover and its recovery/rollback decision points. **Do not execute without explicit GO.**

## Operational state

**PR #72 remains Draft. No Firebase production Rules update, production Database write, Google Sheet synchronization, merge or public Pages rollout is authorized in this review.** For exact test commits and CI, consult the PR discussion rather than relying on old historical Release Gate sections.
