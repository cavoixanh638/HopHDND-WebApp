# HopHDND — One-time Firebase primary cutover and safe rollback plan

**Status:** PREPARED ONLY / NOT AUTHORIZED. Date 2026-10-25. Linked PR #71 + PR #72. This procedure is NOT an instruction to run now. The current independent-style security verdict remains **NEEDS FIX** due to same-UID tab lease replay; see `FIREBASE_PR72_SECURITY_REVIEW_VERDICT_2026-10-25.md`.

## Source of truth and hard safety principles

- Until GO, operate as currently published. Do not sync, compare, or read Google Sheets during Firebase development.
- Only at the scheduled cutover, an administrator must nominate a **final approved and frozen data export**. It can be a reviewed one-time copy/import, but an old Firebase mirror is not automatically the current final data. Personnel must stop editing the temporary system during this checkpoint or submit any pending changes for inclusion. Validate latest source counts/IDs/values **only once at cutover**.
- Intended post-GO system: WebApp **only** for CRUD + reporting, authoritative `hdnd/items` and Firebase profile `dataSource='primary'`. Do not maintain parallel Sheets synchronization or dual-write.
- No destructive command can be run automatically. In particular, never run `database:set /`, `database:remove` on production or overwrite nonempty `hdnd/items`.

## Phase 0 — Release gates (do not begin cutover until all pass)

1. Confirm exact PR #72 commit SHA, complete independent Rules review, and resolve/explicitly accept the same-UID lock limitation; confirm intended identity and anonymous editing policy.
2. Review successful GitHub checks for that exact commit; two-browser/2–3 UID browser smoke using the **final** app with Auth and Database Emulators; test grants, lease, denied edit, realtime, reconnect, conflicts, freeze and history.
3. Confirm security candidate hash plus effective currently Published Rules provenance. Authorize the **exact** candidate Rules file to be promoted and create an explicit release approval record.
4. Admin identifies single final business dataset and verifies an immutable, private manifest: source description, cutoff time (Asia/Bangkok), row count, unique IDs, required fields, canonical SHA256, approved by, record of staff pending edits, version of app/profiles and applicable permission mappings.
5. Decide rollback triggers and how to protect edits after primary GO. Prepare release maintenance communication.

## Phase 1 — Read-only checkpoint immediately before any live write

- Disable *release actions* while checking. On the operator's Windows machine fetch a fresh, time-stamped production **read-only** backup using existing `firebase-production-readonly-backup.mjs` with exact project/instance and private output path; do not print or commit backup JSON.
- Independently verify private backup through isolated demo Emulator, and confirm Saved Rules canonical SHA256 matches the effective Published live Rules at that moment using `firebase-verify-published-rules.mjs`.
- Check exact live `hdnd/items` state under operator read-only credentials: **must be empty** to use automatic one-time primary import. If it contains any row, STOP; do not merge, overwrite, truncate or silently adopt without formal reconciliation.
- Record profile, permissions, freeze mode, pending drafts, schema/config version. Confirm no unacknowledged source edits remain.
- **HOLD** if live changes between two read-only checkpoints, timestamps/hashes do not match or final source has missing/duplicate record IDs.

## Phase 2 — Controlled production deployment (requires explicit GO)

Perform in a maintenance window, preserving evidence at every boundary. Only a responsible operator may execute production commands.

1. Stage and review release bundle; verify the candidate Rules and client correspond to the **same commit** and that no client can start primary edits before Rules and data are ready.
2. Deploy **approved Security Rules alone** for the exact RTDB instance. Immediately read back effective Rules and compare canonical hash with candidate. If mismatch: HOLD; do not import.
3. Import the one-time **approved final dataset**, using server-CAS empty-to-full migration, preserving record IDs and grants. Do not use an uncontrolled stale mirror. If import is rejected or has unexpected count/hash: HOLD; leave UI on previous mode and investigate without retries that can duplicate.
4. Read back primary data. Verify count, all original IDs, business fields, ordering/revision and effective grants. Compare against the signed final-source manifest, not just the old 0-row backup.
5. Only after confirmed import and Rules: administrator switches shared Firebase profile `dataSource='primary'`; assert all list/report views read `hdnd/items`. Run validation with several authenticated UIDs and observe actual realtime updates and audit/freeze behavior.
6. Publish the exact tested WebApp Pages bundle if release requires it; verify fresh and cached browser sessions, login, report calculations, layout preservation, reconnect, permissions, and no unwanted Sheets network traffic in primary mode.
7. Record live hash, profile revision, time, operator and decision. End maintenance window only after a second health/checkpoint pass.

## Phase 3 — Safe stop and rollback, WITHOUT losing accepted edits

- Before any questionable action, **freeze edits or switch WebApp to maintenance/read-only UI**. Capture a fresh read-only primary snapshot and count/revision journal. Never delete or replace primary data to “undo a trial”.
- If failure occurs **before data import**, stop the release: keep old profile mode; restore old Published Rules only after an approved exact-source comparison and operator decision; do not touch primary data.
- If failure occurs **after import but before editing GO**, leave new primary records intact, lock primary edits, collect evidence, and either fix-forward or explicitly approve restoring app/profile visibility while preserving the imported snapshot. Do not reimport onto nonempty primary.
- If live edits have been acknowledged **after GO**, automatic rollback to an old backup would discard valid business updates: **forbidden**. Freeze/maintenance, backup current primary data, reconcile new operations, then decide a reviewed fix-forward or data-preserving manual migration.
- A Rules restore is not a data restore. Before restoring Rules, check whether new client paths and permissions would become unusable; do not create an accidental read/write bypass.
- Record each transition (before/after SHA, count, profile, rule hash, uptime, screenshots with no sensitive data). No tool or CI should auto-execute these operational steps.

## STOP conditions

**NO-GO** if any of the following: unresolved SEC-001; wrong Firebase project or instance; imported source not signed/final; primary already populated; mismatched data count/IDs/values/hash; candidate Rules not independently reviewed or effective Rules mismatch; real 2–3-user browser receipt absent; operator GO absent; no safe freeze/read-only path; or missing private backup.

All implementation work is permitted on branches/emulators; these conditions only block **production cutover and destructive actions**.

## Existing relevant files

- `source/scripts/firebase-production-readonly-backup.mjs`
- `source/scripts/firebase-backup-emulator-restore.mjs`
- `source/scripts/firebase-private-rules-compare.mjs`
- `source/scripts/firebase-verify-published-rules.mjs`
- `source/src/data/firebase-primary-bootstrap.ts`
- `source/docs/decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md`
- `source/docs/operations/FIREBASE_PR72_SECURITY_REVIEW_VERDICT_2026-10-25.md`
