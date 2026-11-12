# ADMIN MAINTENANCE SERVICE — implementation checkpoint (12 November 2026)

**Status: source implementation + offline CI PASS on verified SHA (see latest workflow); production deployment HOLD.**

## Owner goal
One canonical `https://cavoixanh638.github.io/HopHDND-WebApp/` with administrator-only download of application backup, clear of **active** records, entire A–O Excel replacement and signed-backup restore via a trusted server. Keep existing Firebase Spark/no billing and do not weaken public-browser RTDB Rules.

## Source ownership and reviewed branches
- Integration draft PR #159, branch `integration/20261112-spark-ui-69ceb`: existing integrated UI/Spark backend, *not production published*.
- PR #164 and #167 merged to integration: local Admin backup archive inspection, comparison and disabled destructive actions.
- PR #165 draft branch `feat/20261112-online-maintenance-worker` (read head before action): Cloudflare Worker Free candidate, admin-only UI, source-side Security Rules adjustment for `rowCount=0`.
- PR #168 separate draft server-only clear invariant.
- Codex verified production read-only on `qa/20261112-admin-service-host-readiness`: Spark billing disabled, RTDB running Singapore, published Rules do not yet contain Spark V2, active V2 pointer null, `/hdnd/items` count 0, root `/items` 9 unclassified immediate children. 59/885 is NOT live.

## ChatGPT continuation 12 Nov — implementation finished in source branch
1. Added `source/maintenance-worker/src/backup-store.mjs`. Every prepare must persist server-signed HMAC snapshot to a separate private object bucket and verify exact stored bytes before **any** RTDB staging write. Commit reads it again and rechecks digest, HMAC, project/instance, active pointer and exact active business rows/permissions/leases baseline. Absent or corrupted offsite archive fails closed.
2. `/health` and the mutation route fail closed unless the independent backup binding and Cloudflare `MAINTENANCE_RATE_LIMIT` are provisioned. Native approximate rate limit 6 admin actions/minute per action/location runs **before** privileged Firebase OAuth, returning 429. It is defense in depth, not a substitute for global CAS or idempotent operations.
3. Every server commit now verifies the actual stored generation, row count, all business fields, metadata and manifest SHA after CAS. Querying operation status verifies active *and historical* stored generations, not just receipts. Any mismatch is `unknown` or a postcommit unknown-ACK error, never a reason to blindly issue another replacement.
4. Browser validates server backup checksum/scope/seal shape and the exact expected active pointer before downloading. Final commit/reset clears the local approval; a new operation needs a new matching backup and authenticated confirmation. If the Worker has a URL but read capability is disabled/offline, the existing local browser-only safe backup panel remains available. No destructive browser root write is introduced.
5. Offline unit/security tests added for offsite absence, corruption, source-baseline mismatch, revoked token/rate limiter, tampered active/history, unknown-ACK after actual commit, and read-only UI fallback. Workflow `.github/workflows/maintenance-worker-ci.yml` runs Worker Node22 syntax+offline tests, source guards, Spark Rules reproducibility, TypeScript and `build:spark` (no deployment). Verify exact current head and GitHub Actions link for final PASS; an intermediate commit failing typecheck before its follow-up UI fix is *not* the final head.

## Remaining hard blockers, NOT implied done by source CI
1. Codex independent acceptance. Task: [CODEX_FIREBASE_EMULATOR_RELEASE_GATE_20261112.md](../tasks/CODEX_FIREBASE_EMULATOR_RELEASE_GATE_20261112.md). Codex-owned branch `qa/20261112-worker-independent-acceptance`, **new tests/docs only**, based on latest Worker head. Need actual Auth+RTDB Emulator/real browser integration and security adversarial review, CPU p95/p99 on synthetic 59 and 1,000 rows, correct 0-row Rules/runtime contract and no unauthorized writes.
2. **Cost/hosting consent**. Worker Free 10ms CPU/request, 128MB, 50 subrequests/request. Cloudflare **R2 requires its own subscription checkout**, potentially billable even with included free usage: it has not been approved, enabled, bound or provisioned. Explore an already managed agency HTTPS host + private independently retained backup vault, or a zero-cost compliant host verified by Codex. Do not introduce billing silently.
3. **Production Spark V2 init**. Real Firebase published Rules still legacy (read-only audit). V2 active is null. Need fresh independently retained full-root/Rules snapshot + restore rehearsal, classify and preserve root `/items` 9 children, verify private approved Excel 59 rows/885 A–O values, careful ordered Rules+initial import with operator, exact readback, two-account OAuth/locks/freeze/employee smoke and rollback. *No production dataset or Rules were changed by this code work.*
4. **Server privileged authorization**. Independent IAM/access scope review of the OAuth service account (REST may bypass Rules), exact admin UID, revocation and credential custody; secure rate-limit namespace, append-only audit, durable challenge/idempotency, R2-style bucket retention and backup encryption/restore drill. Release only after independent security GO.
5. **Formal owner release GO**. No Cloudflare deployment, no GitHub Pages/main publish, no Firebase Rules deployment, no Blaze/billing or production data write under this task. `ENABLE_READS=false`, `ENABLE_MUTATIONS=false` are checked by CI.

## Safe normal operation after future approval
- Staff uses ONLY Pages; app reads/writes Firebase Spark.
- Admin in ⚙ → Nhập/Xuất Excel can export signed backup, inspect A–O comparison, freeze/zero-lease, stage protected replacement/clear/restore, type confirmation, verify operation status and re-read live records. Never directly delete Firebase root.
- “Xóa toàn bộ hồ sơ” means **0 active business records in a new immutable generation**, not physical deletion of historical backups, Auth accounts or the unrelated nine root keys.
- Application backup is scoped to `BACKUP_PATHS`; full Firebase project disaster recovery needs separate Auth/Rules/unknown-root capture and retention. Keep signing secret offline securely; an SHA-256 checksum is not an authenticity signature.

**Do not mark production ready without actual connected release evidence and explicit approval.**
