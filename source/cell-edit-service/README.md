# PR142 Cell-edit service — IMPLEMENTATION DRAFT (not deployed)

Baseline: `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`. This isolated branch integrates **actual** `CellEditSessionManager` and `FirebaseRepository.save` with an authenticated callable, in addition to the test harness. No Chat 2 parent-CAS or Chat 3 freeze UI changes are included.

## Actual write path

- Client `src/data/cell-edit-api.ts`: lazily loads `firebase/functions` from Firebase app `hdnd-pages`, `asia-southeast1/cellEdit`. Uses Functions Emulator **only** in pages-test mode and on loopback. No SDK/REST RTDB write fallback. Missing callable = explicit failed edit and saved draft.
- `src/data/cell-edit-leases.ts`: existing `CellEditSessionManager`/draft storage remain. Each ACQUIRE produces 32-byte WebCrypto secret **in the tab's RAM**; API receives it over authenticated HTTPS. Public RTDB lease retains its existing UUID `token`, `session`, `kind`, revision, expiry and **only SHA256 `proofHash`** (non-bearer). `lastOperationId` supports idempotent renew/release; token is only a public identifier, never authorization.
- `src/data/firebase-repository.ts`: validates source/fields/baselines/checkAssignment, sends actual Patch with the original operationId and one private secret per edited field, accepts only confirmed matching rows; otherwise returns failed SaveResult and does **not** erase draft/issue raw write.
- `cell-edit-service/index.js`: real Firebase HTTPS Callable (Node22, region asia-southeast1), requires **verified** `request.auth` from callable protocol. The verified UID, provider and email_verified, never the request body, determine scoped Admin `databaseAuthVariableOverride`; adds a server-only `cellService` claim. Each request owns/deletes its scoped app. `core.js` checks secret, current lease/field, CAS baseline, active epoch, freeze and policy, updates 50-slot structured audit via Rules-enforced per-row transaction (no `transaction(hdnd)`). Read back after unknown transaction and retry same ID to avoid duplicate SAVE.

## Local isolated FULL candidate Rules test

Only a generated copy of `firebase/database.exclusive-candidate.rules.json` is used. It preserves every other `.read/.write/.validate` expression and adds `auth.token.cellService === true` to exactly four ordinary **cell/lease** `.write` paths:

```
hdnd/items/$id/.write
hdnd/editLocks/$id/$field/.write
hdnd/datasetV2/generations/$generation/items/$id/.write
hdnd/datasetV2/leases/$generation/$id/$field/.write
```

Two new lease children have `.validate`:
```json
"proofHash": {".validate": "newData.isString() && newData.val().matches(/^[a-f0-9]{64}$/)"},
"lastOperationId": {".validate": "newData.isString() && newData.val().matches(/^[0-9a-f-]{36}$/)"}
```

**Important integration hunk:** These exact four guarded `.write` clauses and two lease child-schema additions need a **separately approved** merge into the real candidate Rules before release. Do **not** publish the generated file or switch production `firebase.json`; `firebase.cell-edit.test.json` is standalone. New web client + callable must be rolled out with matching Rules. The existing `hdnd/datasetV2/.write` admin parent CAS is deliberately **untouched**, because it controls Excel activation/replacement/restore. Its separate potential write-bypass and data-integrity contract are owned by Chat 2, and are a **release blocker until resolved**, not a claimed fix here.

## Run on an authorized machine (synthetic-only)

```bash
cd source
npm ci
cd cell-edit-service
npm install --no-audit --no-fund
npm run check
npm run test:isolated
```

`test:isolated` builds the generated FULL Rules copy, launches **Auth + Functions + RTDB Emulators** on localhost ports 9099, 5001, 9000 with project `demo-pr142-cell-edit`, then runs `test/integration.mjs` and an actual Chromium adapter harness `test/browser-chrome.mjs`. For Chrome, first run `npx playwright install chromium` (Ubuntu CI uses `--with-deps`). Generated evidence: `test/witness.local.json`, `test/browser-witness.local.json`, `test/browser-*.local.png` and captured CI stdout. Never place IDs/secrets in screenshots/witness.

CI: `.github/workflows/pr142-cell-edit-service.yml` has restricted branch/path triggers, `contents:read`, isolated tests only, uploads failure evidence. There is no publish/deploy job.

## Contract / migration / non-goals

- Normal app edits are now callable-only. Any old client using RTDB directly must be denied **by the matching new Rules at release**. There must be no period with both client direct-write and callable enabled.
- ACK loss: reusing a save's original `operationId` finds its already-committed row, returns the same revision; no second audit. If the server result cannot be established, keep draft and show unknown—no blind new operation ID or direct retry.
- Source/epoch mismatch blocks before commit and on read-back; normal active-generation replacement, Excel staging, admin backup/restore, rights admin CAS and freeze UI are outside ownership and unchanged.
- Existing `CellEditSessionManager` uses timer/finish/cancel; no on-device persistent key. On reload, an abandoned lease expires by TTL; local draft is recovered but cannot be applied without new ACQUIRE.
- Existing app API `Repository.save(Patch[]): Promise<SaveResult[]>` remains, so ItemList/ReportDetailGrid/Workspace use the same adapter.
- Google verified admin/editor and anonymous cell-grants must be regression-tested with both full Rules and Chrome. Scoped Firebase Admin bypassing normal client Rules is **never** used to mutate cells; every actual row/lease transaction uses an auth override.

**Release remains HOLD** until full regressions and parent CAS/freeze integrations pass and an authorized owner approves deploy. No production access occurred in this branch.
