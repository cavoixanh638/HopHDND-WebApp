# PR147 — integrated candidate contract and Emulator handoff

## Post-review FRCR-01 fix + repeatable release package (after historical 0296472 review)

The original **historical** integrated release-review SHA is `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7`. It remains immutable historical evidence only: **do not infer that its old SHA256 Rules, CI artifact or binary are the newer FRCR-01 candidate**. Current candidate identity must be read from PR147 HEAD and the exact current HEAD CI result.

- FRCR-01: `firebase/database.exclusive-candidate.rules.json` now permits verified admin `datasetV2/permissions/$generation` writes **only when that generation is active at server decision time**. The unchanged `datasetV2` parent `parentCasService` gate remains available for genuine A->B and restore transactions; no weakening of `verifyCommittedRestoreSource`.
- Real regression in `parent-commit-service/test/integration.test.ts` checks active column/row/cell grant and revoke; authentic A->B HTTP CAS; queued old A permissions rejected *after* pointer switch; deletion, multipath and all scopes rejected without partial write; anonymous and unprivileged Google denied; valid historically COMMITTED backup restores successfully. Original DR-01 and DR-02 tests stay enabled.
- Both Node22 backend dependency graphs are pinned in `cell-edit-service/package-lock.json` and `parent-commit-service/package-lock.json`. Source Verify and integrated workflows use `npm ci --prefix ...`, not floating `npm install`; CI Node24 builds the web and Node22 runs backend package checks.
- `firebase.release.json` includes **FULL Rules and exactly two named Node22 Functions** but deliberately has database instance `REQUIRED_UNVERIFIED`. It MUST NOT be used directly for a production deploy. `scripts/pr147-release-validate.mjs` independently checks the target and required env/endpoint/flag/CORS and rejects production use without external signed approvals. `pr147-package-rehearsal.yml` records exact source SHA and SHA256 for web, both Functions, and FULL Rules; the V2 web example targets the localhost *demo* Emulator only.
- `.github/workflows/publish-pages.yml` now blocks automatic publishing after merge unless independent backend/Rules approval and the **exact main SHA** are set as explicit release variables. A new web Pages build with HTTPS V2 endpoint is only permitted *after* verified backend + FULL Rules; no automatic Firebase/Cloudflare hosting switch.
- [PR149 operations (docs only)](https://github.com/cavoixanh638/HopHDND-WebApp/pull/149) remains authoritative for first-use UAT, legacy empty/non-empty/V2-active decisions, fresh private backup and owner signoff. Production remains `NOT_AUTHORIZED`; do not read/write production to satisfy code CI.

**Release flags, rehearsal-only (from `source/`):** set `GCLOUD_PROJECT=demo-hdnd`, `FIREBASE_DATABASE_URL=PARENT_DATABASE_URL=https://demo-hdnd.firebaseio.com`, `PARENT_ALLOWED_ORIGINS=http://127.0.0.1:4179`, `PARENT_COMMIT_ENABLED=true`, `VITE_PARENT_REPLACEMENT_ENABLED=true`, `VITE_PARENT_COMMIT_ENDPOINT=http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit`; then run `node scripts/pr147-release-validate.mjs --mode rehearsal --config firebase.release.json`. These values are **never production defaults**. For production, a separately authorized operator-approved config and a real HTTPS parent endpoint are required; until then validator must return HOLD.

**Verdict vocabulary:** `CODE_READY` only if all code gates PASS on the latest identical SHA; `PACKAGE_READY` may mean validated **emulator rehearsal archives only**, never a production-enabled web; `PRODUCTION_AUTHORIZED=false` until owner signs off all live checks and release window.


**Draft PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/147  
**Source branch:** `integration/pr142-cell-parent-freeze-candidate-20261101`  
**Baseline:** PR142 `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`  
**Inputs:** PR145 `bf78bdddf336f16082ad68db1c1f39723bc95251`; PR146 `9424a52767e8acb57a1f50feba2515787fb2ad26`; PR143 `c039405a9ad6802ae1d412465cc91b88745a0371`.

## Verdict must be evaluated on one HEAD (not a previous run)

`READY_FOR_CODEX_REVIEW` is permissible **only after** CI for the current exact PR147 HEAD shows:
- `pr142-integrated.yml`: `static-app`, `common-emulator`, `full-pages-browser` all green;
- `pr147-full-app-qa.yml`: real Chrome FULL App QA01–QA08 all green with server snapshots and screenshots;
- `verify-source.yml` (including `npm run test:firebase`) and `firebase-functional-qa` green; no xfail/skip for same-UID replay;
- `pr142-parent-auth-service.yml`, `pr95-network-ack-loss.yml`, `pr95-l3-two-admin-tabs.yml` (or named equivalent) green on the **same HEAD**;
- DR-01 and DR-02 fixed and witnessed on that HEAD, with actual Auth+Functions+RTDB and one exact FULL candidate Rules file.
Otherwise verdict is **HOLD**, even when particular isolated jobs are green.

## Running locally: disposable synthetic Emulator only

Run from `source/`. The commands must never use a production Firebase project, database, service account or deployment token.

```sh
npm ci --no-audit --no-fund
npm ci --prefix cell-edit-service --no-audit --no-fund
npm ci --prefix parent-commit-service --no-audit --no-fund
npm run typecheck
npm test
npm run build
npm run build:pages:test
npm run build:compact:qa
npm run docs:check
npm run test:firebase
npm run qa:firebase
npx firebase emulators:exec --project demo-hdnd --config firebase.staging.json --only auth,database,functions "node scripts/pr142-integrated-emulator.mjs"
node scripts/smoke-pages-browser.mjs
node scripts/final-app-qa-runner.mjs
```

A test that uses a different Rules payload or an isolated bare function is not evidence for integration acceptance. For *every* integrated run, record `git rev-parse HEAD` and verify the exact file SHA256 of `firebase/database.exclusive-candidate.rules.json` against the Emulator's `/.settings/rules.json?ns=demo-hdnd`. Services are real `cellEdit` (`asia-southeast1` onCall) and `parentDatasetCommit` (`us-central1` onRequest), both on Functions Emulator `127.0.0.1:5001`; Auth `127.0.0.1:9099`; RTDB `127.0.0.1:9000`. Never fall back to parent CAS or cell SDK writes.

## Business invariants that must remain protected

- Same-UID tabs cannot replay a public lease token, proofHash or row.editProofs without the holder's private 256-bit secret. Regression is ordinary **PASS**, never xfail or skipped.
- A late RENEW, RELEASE or SAVE against an old V2 generation must be rejected at the **Rules transaction decision**, even after a real parent pointer change (DR-01). Historic lease and row before/after hashes must remain identical.
- Only a historically COMMITTED replacement whose archived source matches the immutable generation/rights/lease snapshot can provide a RESTORE backup; fake internally self-consistent backup must fail and restore digest must be recalculated (DR-02).
- HC/BC `progressBuild` cannot change; unrelated allowed notes and other types remain editable by the authenticated callable. Audit actor, before/after, revision and exactly-once operationId are verified on server.
- A missing HTTP ACK remains **UNKNOWN** until read-only operation-status resolution or safe same-operationId retry; the UI must retain drafts and may never claim success based solely on client intent.
- DRAINING prevents new leases while allowing eligible existing edits until deadline; forced FROZEN rejects edits, normal FROZEN checks active leases; receipt and generation race rules remain strict.
- Excel flow is real selected A–O .xlsx → preview → staged candidate/readback → activate/replace → restore → resolve, including between-generation editor/draft fencing.

## Rollout and rollback (procedure, never authorized by this PR)

1. After Codex review and an independent security/Rules approval, establish a signed exact-release SHA, binary hashes and a read-only live backup / Rules snapshot; nominate a final authoritative and frozen business dataset. Confirm named personnel, production function IAM, endpoint/CORS/region, published Rules and distinct target RTDB instance *before* any write.
2. Stage both server functions, the matching FULL Rules and web bundle as a **single coordinated release**, under an operator-approved maintenance window. Verify service availability, Auth verification, readback of published Rules and operation log before permitting UI mutations. No partial rollout with permissive legacy fallback.
3. If any check fails **before live edits**, stop, retain old published application and create a new reviewed deployment plan; do not retry non-idempotent imports.
4. If acknowledged live edits already exist, freeze/maintenance first, capture a new read-only snapshot and journal, then reconcile before any rollback. Never restore an earlier backup over confirmed new edits. Restoring Rules alone is not a data rollback.
5. Production deploy/publish, live data access and merge are strictly out of scope for PR147. Emulator PASS never authorizes production automatically.

**Evidence:** PR147 Actions run links, archived `pr142-unified-emulator.stdout`, Chrome screenshots, `full-app-witness.local.json`, `parent-commit-service/evidence/integration-witness.json` and the independent `final-app-qa` report must cite the same candidate SHA. An incomplete/failed run is evidence of a blocker, not a successful gate.
