# PR142 — authenticated V2 parent-commit service (isolated Draft PR146)

Pinned base: `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`. The immutable transaction contract is copied from PR144 `c1d48ec8e7f30586f64abec5ceb716d5cf2a8af1` and adapted behind a real Auth-verified server endpoint. This is **not** a Cloud Functions deployment and not permission to enable production editing.

## Actual application path

`VersionedExcelReplacementPanel` continues to use the current **Excel selection → file preview → stage candidate → independent readback → private backup → typed confirmation**. Only `commitInitialDatasetActivation`, `commitDatasetReplacement`, and `restoreDatasetBackup` are imported from `firebase-versioned-replacement-secure.ts`; these use `parent-commit-api.ts` to send the signed Firebase ID token, operationId, expected pointer and confirmation to the endpoint. The browser never sends a new root tree, row payload, or privileged service claim. `resolveDatasetOperation` stays **read-only** and is called after UNKNOWN/lost ACK. The adapter has **no direct RTDB fallback**. In a reviewed non-Emulator build, show this admin-only V2 panel only with `VITE_PARENT_REPLACEMENT_ENABLED=true` **and** an HTTPS `VITE_PARENT_COMMIT_ENDPOINT`; otherwise the existing transfer page remains without a V2 mutation control.

The old `firebase-versioned-replacement.ts` raw parent transaction functions remain only for legacy `MODE=test` + `demo-*` Vitest fixtures; a direct production/browser invocation is denied. The production App panel never imports those raw exports.

## Backend guarantee

`src/handler.mjs` verifies the bearer using Firebase Admin `verifyIdToken(token,true)`, checks the single configured verified Google admin email and `firebase.sign_in_provider === 'google.com'`; no caller-supplied claim or tree is accepted. It builds **one new Admin SDK app with `databaseAuthVariableOverride` scoped to the verified UID/claims**, adding a server-only `parentCasService:true`. This code must pass the genuine Rules-denied negative control in CI: a scoped Admin SDK invalid write MUST be rejected by full RTDB Rules. Unrestricted Admin SDK dataset writes are forbidden.

`src/commit.mjs` reads candidate, sealed backup and authoritative active source; `src/manifest.mjs` independently SHA256-validates canonical staged rows; the PR144 transaction contract runs **inside** the parent RTDB transaction. The new generation is constructed strictly from staged rows or a verified backup and server-owned actor/timestamp. Prior generations, permissions, leases, candidate/backup strings and operation log entries are immutable; restoring a backup creates a fresh generation without live leases. A conflicting pointer, changed freeze/legacy, tampered candidate, bad confirmation or reused generation fails closed. Immutable `operationId` allows confirmed duplicate requests to return `already-committed`; unknown ACK is never automatically retried as a new operation.

`index.mjs` exports the actual Cloud Functions V2 `onRequest` wrapper; CI invokes the **same** `handleParentRequest` via localhost `dev-server.mjs` (no mock authentication). Functions runtime wiring is intentionally excluded from the app's existing common config, pending an integrated release review.

## Local verification (only demo-hosted, never production)

Run from repository `source/` with Node 24 (test runner), the separate Cloud Functions service declaring a supported Node 22 runtime, and Java 21:

```bash
npm ci
npm install --prefix parent-commit-service --no-package-lock --ignore-scripts
node parent-commit-service/scripts/build-rules.mjs
npx firebase emulators:exec --project demo-hdnd --only database,auth \
  --config parent-commit-service/firebase.parent-commit-test.json \
  "node parent-commit-service/test/run.mjs"
```

Backend is localhost `http://127.0.0.1:8787/parentDatasetCommit`; Auth and RTDB Emulator ports `9099` and `9000`. The harness creates **actual** Auth Emulator Google ID tokens and posts them to the HTTP handler. Authenticated positive calls must use server-scoped RTDB Rules, not synthetic `authenticatedContext({parentCasService:true})`; the Rules unit-test helper is used **only to reset/seed data**. Independent owner REST GET is **read-only server witness**. It checks positive bootstrap, activation, replacement, restore, resolve, malformed/no/foreign ID token, raw browser parent bypass, intentionally invalid scoped-Admin write, staging tamper, stale pointer and lost ACK/retry; see `evidence/integration-witness.json`.

CI workflow: `.github/workflows/pr142-parent-auth-service.yml`; backend dependency package and FULL Rules trial are isolated, no modifications to published/candidate Rules.

## Required integration hunks — NOT APPLIED

1. **Database Rules:** merge into the reviewed/common FULL candidate Rules only after authenticated backend evaluation: prefix the existing `hdnd/datasetV2/.write` expression with `(auth != null && auth.token.parentCasService === true) && (...)`. Preserve all other Rules unchanged, especially empty legacy bootstrap and child stage/read policy. `scripts/build-rules.mjs` produces the exact full trial diff and hash for review. This gate MUST be deployed with its secured service and client as one compatible change. Never disable all parent writes, and never restore older broad Rules to solve a deployment outage.
2. **Functions config:** merge `{"functions":[{"source":"parent-commit-service","codebase":"parent-v2"}]}` into a reviewed common `firebase.json`, keeping current other hosting/database sections. For preview only, a separate `firebase.parent-commit-functions.json` is provided. **Do not deploy this branch.**
3. **Environment:** set frontend `VITE_PARENT_REPLACEMENT_ENABLED=true` only for an approved release; provision the admin-reviewed `PARENT_DATABASE_URL`, `PARENT_COMMIT_ENABLED=true` and exact `PARENT_ALLOWED_ORIGINS` server-side; set `VITE_PARENT_COMMIT_ENDPOINT` to the HTTPS deployed Functions URL in frontend production build. Without endpoint, the app fails closed. Do not store Firebase private keys, private service claim or bearer tokens in source or client config.
4. **Release:** stage the backend and restricted Rules together with a read-only fallback for old browsers. Re-run full E2E on staging, verify production UID authorization separately under approved release procedure, then promote only by independent owner approval. Never treat the legacy test-only direct path or test-only synthetic service claims as production evidence.

## Out-of-scope and residual risks

No cell-edit gateway, same-UID lease replay, freeze receipt/count or PR142/PR143 changes here. No global backend rewrite, bulk Excel import rewrite or production API access. Current parent Rules cannot hash the candidate JSON; **the server transaction contract and a non-forgeable service credential remain critical**. A failure to validate the override at real RTDB Rules is a blocking security FAIL. A 409 (bad preconditions) differs from unknown 503/network ACK; UI must keep drafts and allow read-only resolve. Browser screenshot test may require separate Chrome tooling and should not be implied by server-function tests.

## Tested evidence and explicit limits

The real Firebase Auth+RTDB Emulator endpoint regression test is run by the isolated GitHub Actions workflow on every PR commit; inspect the final PR comment for exact run/SHA and witness artifact, not an earlier run. It records authoritative owner REST READ-ONLY before/after snapshots with salted proof redaction, application secure-adapter calls, malformed ID token and raw SDK controls, stage SHA mismatch, stale epoch, 3 operation retries, and lost HTTP completion after actual commit. Client-side React panel navigation is also tested independently by the existing `pr95-app-initial-activation.test.tsx` fixture, but that component fixture is **not** a real Chrome UI test. A Functions Emulator HTTP routing test and a real browser screenshot test are additional release gates if not present in the final CI artifact; do not mislabel the Node HTTP harness as deployed Functions.