# PR147 — integrated candidate contract and Emulator handoff

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
npm install --prefix cell-edit-service --no-package-lock --no-audit --no-fund
npm install --prefix parent-commit-service --no-package-lock --no-audit --no-fund
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
