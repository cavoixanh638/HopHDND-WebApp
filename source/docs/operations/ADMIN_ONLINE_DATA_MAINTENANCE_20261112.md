# Họp HĐND — ADMIN WEB DATA MAINTENANCE CONTRACT (12 November 2026)

**State: read-only browser backup and file inspection IMPLEMENTED in this PR; destructive release operations are intentionally BLOCKED pending a trusted online backend and independent review.** No production Firebase Rules or database mutation is authorized here.

## Owner goal

A Google-verified administrator opens the **same** GitHub Pages WebApp and can eventually:

1. Export a complete validated backup for the **HopHDND application dataset**.
2. Clear all **active business records**, safely and reversibly.
3. Replace the active dataset with a reviewed A–O Excel workbook, or restore a validated backup.

No local operator or Codex should be required **for subsequent routine operations** once an authenticated online maintenance service has been deployed one time. This does not mean that the system can run without any Firebase-authorized backend: trust must be held by a server, not buried in public frontend JavaScript.

## What is implemented in this PR

- Menu \`⚙ → Nhập / Xuất Excel → Sao lưu · Xóa · Nạp dữ liệu\`.
- Export to JSON with format \`hophdnd-admin-archive\`, version 1, SHA-256 checksum, origin project/instance and timestamp.
- **Frozen read-only capture of an allowlisted application subtree**: legacy items, permissions, profile, control, edit locks, freeze state and receipts, editor allowlist, mirrors, entire datasetV2 tree (including generations, operations and private backups), and legacy reviews. The browser requires a verified Google admin, refreshes its token, asserts online state and **FROZEN with 0 active leases**, and reads all named paths twice. It refuses to export if snapshots change, a path cannot be read or data exceeds 30 MB.
- Local, non-uploading JSON inspection: checksum and origin match, complete path schema, freeze evidence, active V2 count vs generation count, legacy row count. This checksum detects accidental alteration **but is not a server signature and does not prove authenticity**.
- The existing A–O \`.xlsx\` parser and compare UI remain available separately and unchanged.
- Delete, dataset activation, server-side full restore are deliberately disabled until a trusted online service is ready; no client-side root \`set/remove/update\`, Rule widening or fake commit.

**Not a full Firebase project backup:** Firebase Authentication accounts, published Firebase Security Rules, transient \`hdnd/sparkSessions\`, unknown root paths and any other Google/Cloud resources are out of scope. A full disaster-recovery snapshot MUST be made server-side with privileged access to all the required systems; don't silently claim the browser file is a complete disaster-recovery archive.

## Why all 3 writes cannot simply be opened in Pages today

Current \`firebase/database.spark.rules.json\` rejects root reads/writes and direct V2 parent writes. The parent CAS is specifically guarded by \`auth.token.parentCasService===true\` (only the verified backend injects it); V2 active rowCount is currently constrained to **1–1000**, so an empty active dataset is not yet a valid generation. The current protected commit engine supports \`activate/replace/restore\` only and is available via local operator, not a production HTTPS API.

Making the public Google Admin browser able to root-delete or impersonate \`parentCasService\` would circumvent the independently tested authorization and verification. It would also make backups/restore non-atomic, and a modified client could claim that it verified a backup when it did not.

## Required trusted ONLINE admin service (future PR and one-time deployment)

Keep GitHub Pages as the sole *user-facing* UI. Deploy a strictly authenticated HTTPS maintenance API with backend-only credentials in a secret store. Prefer adapting the independently tested \`parent-commit-service\` and its transaction/manifest engine over reimplementing privileged semantics in the public bundle. Cloud Functions requiring Blaze are **not** selected under the owner's free-tier restriction; a different approved backend host would need separate cost/security review and one-time connection.

### API contract

- \`POST /admin/maintenance/prepare\`: Firebase ID token (Google, verified email, allowlisted admin UID), \`operationId\`, action \`clear|replace-excel|restore-backup\`, proposed source SHA-256 and expected current V2 pointer/freeze epoch. Returns a short-lived **opaque server-side challenge** with current row count, backup evidence, data changes and expiry; no mutation to active data yet.
- \`GET /admin/maintenance/export\`: server-side consistent full application snapshot + exact Rules revision and persistent HMAC/signature, streamed to the user's browser with download headers; never expose service account tokens or user session bindings.
- \`POST /admin/maintenance/commit\`: same verified admin in a *fresh token*, matching challenge, explicitly typed confirmation with exact operationId/count, FROZEN state, 0 leases, independently verified backup and restore drill policy, and expected pointer CAS; then atomically activate an immutable new generation or audited empty generation. No root \`DELETE\`, no direct old-generation deletion.
- \`GET /admin/maintenance/operations/{operationId}\`: read-only, idempotent status check for unknown completion; never retry with a new ID on an unknown ACK.
- \`POST /admin/maintenance/restore\`: verify a signed backup from the same project, validate A–O business values, permissions and type schemas, and activate a new immutable generation through the same CAS. Never trust client-supplied hash alone.
- Validate all uploaded bytes, size limits, parser settings, duplicate IDs, row count, path allowlist, ownership, generation history and metadata, with an independent server-readback hash.

### Clear semantics

**Preferred implementation:** “Xóa toàn bộ hồ sơ đang hoạt động” creates a new empty active generation with a tombstone / audit entry. It does NOT delete user accounts, Firebase Rules, admin roles, profiles, old generations, backups or journal. To support this, modify V2 pointer/checks, the commit engine, data-read UI and generated Rules *together*, with dedicated 0-row Emulator tests; do not merely change the frontend and create an inconsistent state.

An irreversible physical purge of previous generations and backups is a **separate** operation with retention/legal review, independent approval and preferably multi-party control; it must not be bundled into the ordinary “bắt đầu kỳ họp mới” button.

### Required rejection and recovery tests

- Anonymous, signed-in non-admin, forged email, forged UID, expired/revoked token and wrong project must all be denied SERVER-SIDE.
- Remote and local backup verification, modified backup with recomputed client SHA, altered business row, permissions-only tampering, wrong origin and stale generation must be rejected.
- Freeze drift, active lease, multi-tab race, double-click and concurrent operation must be denied or reconcile exactly once; operation ID is idempotent.
- Simulate network failure AFTER commit, server ACK loss, rollback failure, disconnection during download and quota limit. Unknown status => no second write until reconciliation.
- All 59 approved rows/885 A–O fields, independent project root branches and history/freeze/permission boundaries must remain consistent.
- UI screenshots/real browser E2E + complete Spark Emulator Rules tests + independent security review + owner release GO.
- No cost-bearing backend without explicit approval, no secret in GitHub repo or JS bundle, no Firebase production mutation before the signed release gate.

## Operator experience when the online service is ready

Admin login → **Quản lý dữ liệu** → choose backup/export, clear, Excel or backup restore → inspect comparison and checked backup → type explicit confirmation → server verifies and writes once → readback shows exact new data and downloadable receipt. Other staff retain the same GitHub Pages URL and see the new generation live.

**This PR alone is NOT that complete workflow**. It provides working, safe browser-side preparation, an auditable contract and an explicit fail-closed UI instead of an unsafe root delete shortcut.
