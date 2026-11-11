# PR #95 — PARALLEL CONTRACT (API V2 + ownership + CI)

Date: 2026-10-30. Status: DRAFT / NOT RELEASE READY.
Repo: cavoixanh638/HopHDND-WebApp.
Only integration branch: feat/firebase-excel-safe-replacement-and-list-compact-20261030 (existing PR #95, never main).
Previous verified working-tree checkpoint: c123d3cac9e443618f7b84a71d3f9c3a604619aa.
SPLIT_BASE means the commit that FIRST ADDS THIS FILE on the integration branch. All three working branches must be created with that exact Git commit SHA; inspect GitHub ref before work. This is a self-referential commit definition, so its SHA is published in PR #95 handoff rather than embedded in itself.

NON-NEGOTIABLE: no production database read/write/import/remove, no real Excel/backup in GitHub, no Firebase deployment, no Pages publish, no merge to main. Keep Google Authentication. Firebase-only operational data; Excel is import input. Use fake data, RTDB/Auth Emulator only. Keep PR #95 Draft.

## A. Current truth — implemented != passed

Exists on branch before SPLIT_BASE:
- Exact business A–O Excel parser, H and I separate construction/issuance NQ, L and M separate VP/UBND leadership, full-header allowlist by column; tests swap BOTH labels and values, including two overlapping valid H/I statuses.
- SHA-256 candidate manifest, keyed server readback check, same-generation baseline fingerprint, stale pointer checker.
- src/data/firebase-versioned-replacement.ts actually uses RTDB APIs for candidate staging, readback, backup, parent-root CAS, operationId status query and restore. src/features/settings/VersionedExcelReplacementPanel.tsx displays a synthetic/emulator List+Report preview and confirmation screen, not production.
- src/state/use-firebase.ts and src/app/App.tsx already observe datasetActive/use a versioned items path in some branches; other legacy flows persist, so it is NOT yet a proven unified Firebase-only application.
- The V2 Emulator test now loads the REAL candidate Rules; temporary code disabling nested .validate was removed. Never reintroduce a validation bypass.

CI on predecessor c123d3cac9e443618f7b84a71d3f9c3a604619aa:
- Verify HopHDND source run 40993112430 = FAILURE. At Firebase Emulator: tests/firebase-versioned-replacement.test.ts has THREE permission_denied failures in commitDatasetReplacement (src/data/firebase-versioned-replacement.ts line 214): staging/commit/restore (test line 54), two tabs CAS (line 90), old/new generation lease scenario (line 100). Totals 3 failed, 55 passed, 1 expected fail; test job stops before browser smoke.
- Verify isolated Firebase staging 40993112613 = SUCCESS (does not cover successful V2 swap).
- Firebase operational QA 40993112404 = SUCCESS (does not cover successful V2 swap).
- Must report each new branch HEAD CI separately; no claim of V2 release readiness from unrelated green workflows.

NOT VERIFIED/NOT DONE: V2 Rules acceptance, full commit + restore readback, true server-side stale epoch fencing, same-generation write conflict under Rules, unknown network acknowledgment, stable replay semantics across later generations, app-wide list/report/permission/draft/lease isolation, safe first activation of V2 from populated legacy DB. Production is untouched.

## B. V2 schema already coded (CURRENT, not yet approved as production contract)

Root = hdnd/datasetV2. Below paths relative to root:
- active: ActiveDatasetPointer = {generationId:string, operationId:string, revision:positive int, rowCount:int 1..1000, digest:string SHA-256 64 hex}. CURRENT: main switch is a transaction on parent datasetV2; blocked by real Rules.
- generations/<generationId>/items/<recordId>: validated shared/types.ts Item, plus operationId/updatedAt/updatedBy, and per-row history/editProofs after updates. Key must equal recordId. Read/list/reports/history/save MUST use the SAME current generation, not a mixture or old path.
- permissions/<generationId>: CellPermissions = {columns: partial field-to-bool, rows?:recordId-to-bool, cells?:recordId-to-field-to-bool}. New generation starts with columns:{} deny. Never inherit permissions by reused displayCode.
- leases/<generationId>/<recordId>/<field>: CellLease = {uid,session,token,revision,kind,acquiredAt,expiresAt}. The Rules must reject a stale epoch, another session's token, missing rights, expired/frozen lease. No reuse of hdnd/editLocks for V2.
- candidates/<operationId>: CURRENT implementation saves JSON string {items:Record<recordId,Item>, manifest:DatasetGenerationManifest}; stage is admin-only, readback checks count, key and SHA-256. NOT a public viewer path.
- backups/<operationId>: CURRENT implementation saves private JSON string {previous:ActiveDatasetPointer,generation:{items},permissionsJson,leasesJson,baseline}. Admin-only, no artifact/log upload, restore/readback MUST be independently verified.
- operations/<operationId>: CURRENT {status:'COMMITTED',from:string,to:string,at:number}; persisted only for completed transaction. Intermediate STAGED/VERIFIED/BACKED_UP/UNKNOWN statuses are PROPOSED, NOT in server schema.

Existing types:
- DatasetGenerationManifest = {schemaVersion:1,generationId:'gen_' + operationId,operationId,rowCount,digest}.
- ReplacementApproval = {operationId,manifest,expected:ActiveDatasetPointer,baseline:string,preview:ReplacementPreview,fileName:string}.
- ReplacementOutcome = {status:'committed'|'already-committed'|'unknown',operationId}.
- Existing baseline uses stable(current active+items+permissions+leases), so row changes in the SAME generation after review must invalidate CAS. Pure checks alone do not protect the server.

## C. CURRENT public functions Luồng 2 may CALL but MUST NOT MODIFY

File src/data/firebase-versioned-replacement.ts (owner Luồng 1):
1. DATASET_V2_PATH = 'hdnd/datasetV2'.
2. stageDatasetReplacement(database:Database,user:User|null,items:readonly Item[],operationId:string,fileName:string):Promise<ReplacementApproval>.
   CURRENT: admin guard, read baseline, stage candidate, verify server readback and private backup. Emulator QA only; production disabled.
3. readStagedDataset(database:Database,approval:ReplacementApproval):Promise<Item[]>.
   CURRENT: reads candidate and verifies digest for preview List+Reports.
4. commitDatasetReplacement(database:Database,user:User|null,approval:ReplacementApproval,confirmation:string):Promise<ReplacementOutcome>.
   CURRENT confirmation literal: 'THAY ' + operationId + ' ' + oldCount + ' ' + newCount. Intended transaction validates active AND live same-generation business/rights/leases, installs new rows+pointer+operation atomically. CURRENT FAILS Emulator with permission_denied. DO NOT expose to production.
5. resolveDatasetOperation(database:Database,operationId:string):Promise<'committed'|'not-committed'|'unknown'>.
   CURRENT: returns committed only if op status=COMMITTED AND that op is still active; incorrect for historic commit after another swap/restore, unresolved.
6. restoreDatasetBackup(database:Database,user:User|null,backupOperationId:string,restoreOperationId:string,expected:ActiveDatasetPointer,confirmation:string):Promise<ReplacementOutcome>.
   CURRENT confirmation: 'KHOI PHUC ' + restoreOperationId. Intended CAS restoration into fresh generation. Missing real-Rules QA and verified postrestore readback.

File src/data/dataset-replacement-integrity.ts (owner Luồng 1): createDatasetManifest, verifyCandidateServerReadback, checkPointerSwap. Pure checks only, not server authorization.

Integration requirements:
- Luồng 2 may import these signatures but must keep all destructive V2 actions disabled outside explicitly configured Emulator. Cannot modify backend module or Rules.
- Every current app read/write/report/history must resolve the active generation, and every draft/cache/undo/save/lease invalidated on epoch change. A stale tab must ALSO be rejected by RTDB Rules, not merely by UI. Old hdnd/items writes must be fenced after cutover.
- No blind retry on timeout: operationId query, UNKNOWN state, no false success, keep backup until authoritative readback. Same operationId must never accept a different file.
- API-CHANGE process: Luồng 1 posts exact before/after signatures, wire format, client impact and new test requirements in PR #95; Luồng 2 ACKs before adapting. Luồng chính edits THIS CONTRACT only on integration branch after agreement. Unilateral cross-branch API changes forbidden.
- PROPOSED only, NOT implemented: subscribeDatasetEpoch, persistent staged/unknown state machine, explicit V2 repository session epoch type, replacement-specific admin server endpoint. Do not import proposed names.

## D. Exclusive file ownership after SPLIT_BASE

Only the paths listed under each lane may be changed. Every other existing path is FROZEN until assigned by Luồng chính in PR comment. All lanes can READ anything; only owner can WRITE own files. In particular, no silent modifications of shared/types.ts or source/src/domain/items.ts. Luồng chính alone integrates reviewed commits into PR #95.

### Luồng 1 — THIS CHAT: backend, Rules, existing Emulator tests
Working branch: pr95/l1-backend-rules-emulator-20261030
Exact owned existing paths:
- source/src/data/firebase-versioned-replacement.ts
- source/src/data/dataset-replacement-integrity.ts
- source/src/data/dataset-replacement-preview.ts
- source/src/data/business-excel.ts
- source/src/data/firebase-primary-bootstrap.ts
- source/src/data/firebase-live-readiness.ts
- source/firebase/database.exclusive-candidate.rules.json
- source/firebase/database.production-candidate.rules.json
- source/firebase/database.rules.json
- source/tests/firebase-versioned-replacement.test.ts
- source/tests/dataset-replacement-integrity.test.ts
- source/tests/business-excel.test.ts
- source/tests/firebase-production-rules.test.ts
- source/tests/exclusive-cell-freeze.test.ts
- source/tests/firebase-emulator.test.ts
- source/scripts/test-firebase.mjs
- source/scripts/firebase-backup-emulator-restore.mjs
- source/scripts/firebase-qa-report.mjs
- .github/workflows/verify-source.yml
- .github/workflows/verify-firebase-staging.yml
- .github/workflows/firebase-operational-qa.yml
Allowed new files ONLY: source/tests/pr95-backend-*.test.ts and source/docs/tasks/PR95_L1_HANDOFF.md.
Duty: repair permission_denied with full Rules, server-authoritative active/candidate/backup/operation CAS and idempotency, epoch fence on old writes, same-generation write conflict, restore, existing Emulator suites; no changes to App/state/repository/client UI.

### Luồng 2 — App/state/repository, UI and Firebase-only
Working branch: pr95/l2-app-state-firebase-only-20261030
Exact owned existing paths:
- source/src/app/App.tsx
- source/src/state/use-firebase.ts
- source/src/state/use-workspace.ts
- source/src/state/firebase-boot.ts
- source/src/state/use-recoverable-draft.ts
- source/src/state/use-shared-config.ts
- source/src/data/firebase-repository.ts
- source/src/data/cell-edit-leases.ts
- source/src/data/repository.ts
- source/src/data/draft-checkpoints.ts
- source/src/data/workspace-recovery.ts
- source/src/data/dataset-preview-fingerprint.ts
- source/src/data/firebase-snapshot-cache.ts
- source/src/data/authenticated-mirror-stream.ts
- source/src/data/source-comparison.ts
- source/src/data/sheet-config.ts
- source/src/features/settings/VersionedExcelReplacementPanel.tsx
- source/src/features/settings/BusinessExcelReviewPanel.tsx
- source/src/features/settings/ExcelTransferPanel.tsx
- source/src/features/settings/ConnectionPanel.tsx
- source/src/features/settings/FirebasePanel.tsx
- source/src/features/settings/InitialFirebaseImportPanel.tsx
- source/src/features/settings/TransitionImportPanel.tsx
- source/src/features/settings/SyncPanel.tsx
- source/src/features/items/ItemList.tsx
- source/src/features/items/InlinePermissionsTable.tsx
- source/src/features/items/LeaseTextInput.tsx
- source/src/features/reports/ReportTable.tsx
- source/src/features/reports/ReportDetailGrid.tsx
- source/src/features/history/HistoryDialog.tsx
- source/src/styles/app.css
- source/tests/firebase-config-state.test.ts
- source/tests/firebase-tab-draft-recovery.test.ts
- source/tests/item-save-flow.test.ts
- source/tests/list-view-ui.test.tsx
- source/tests/pages-sheets.test.tsx
- source/tests/column-filters.test.tsx
- source/tests/dataset-preview-fingerprint.test.ts
- source/tests/draft-checkpoints.test.ts
- source/scripts/smoke-pages-browser.mjs
Allowed new files ONLY: source/tests/pr95-app-*.test.ts, source/tests/pr95-app-*.test.tsx, source/docs/tasks/PR95_L2_HANDOFF.md.
Duty: all List/Reports/read/save/history/rights/draft/lease use active generation, old draft & tabs invalidated; remove Google Sheets operational source (retain Google Authentication); maintain current UI/CAS/resize; no backend/Rules edits.

### Luồng 3 — independent tests only, no feature/Rules/current tests
Working branch: pr95/l3-independent-tests-20261030
Allowed files are NEW AND EXACTLY:
- source/tests/pr95-independent-parser.test.ts
- source/tests/pr95-independent-generation.test.ts
- source/tests/pr95-independent-rules.test.ts
- source/tests/pr95-independent-ui.test.tsx
- source/tests/pr95-independent-race.test.ts
- source/docs/tasks/PR95_L3_FINDINGS.md

Luồng 3 must not modify ANY preexisting files, including test runner/workflow, Rules, functional modules, docs contract or existing tests. Test with fake data/Emulator. Findings include ID, reproduction, actual/expected, commit SHA. If test runner needs additions, request Luồng 1 integration. Tests must NOT disable Rules validations or substitute mocked database for a claimed real RTDB check.

### Shared / integration ownership

- THIS file source/docs/tasks/PR95_PARALLEL_CONTRACT.md: LOCKED for all three branches; only Luồng chính may revise via integration-branch commit after API agreement.
- source/docs/tasks/PR95_FIREBASE_EXCEL_REPLACEMENT_DESIGN.md and source/AGENTS.md: Luồng chính ONLY during integration, not changed in branch workers.
- FROZEN until explicit reallocation: source/shared/types.ts, source/shared/field-definitions.ts, source/src/domain/items.ts, source/package.json, source/package-lock.json, source/firebase.json, .github/workflows/publish-pages.yml, all unlisted files.
- File collision = stop, report path in PR #95; no cross-lane cherry-pick or workarounds. New API affecting shared types requires approval FIRST.

## E. Branch and integration protocol

1. All three branches MUST be created from one SPLIT_BASE commit including this contract, NOT independently from later PR #95 heads or main. Confirm sha equality before any code work.
2. Each lane commits and pushes ONLY to its working branch, records exact sha, changed paths, tests/pass/fail and blockers in its own handoff file. Optional worker PR must base on PR #95 integration branch; nobody merges main. No worker merges into PR #95 without Luồng chính.
3. Integration order: backend+Rules tests L1, then state/App L2, then independent tests L3. Luồng chính verifies diff file ownership and SHA; resolves API contracts explicitly; runs unmodified real Rules V2 Emulator, negative security, browser and full regressions. No CI-green bypass.
4. GO only when real keyed staging/readback, private backup/restore, atomic state+pointer CAS, no stale generation writes, no same-generation mid-review edits slipping through, accurate operationId replay/UNKNOWN and all List/Reports/permissions/history/edit sessions confirmed. No release until owner separately authorizes it.
5. PR #95 stays DRAFT; no publish/deploy/main merge/production data operations.

## F. UNDECIDED API/SECURITY decisions requiring Luồng chính approval

- Transaction parent-node vs staged immutable generation plus active-pointer-only CAS: full Rules fail currently. Must determine how same-generation edits and pointer swap serialize and how row write Rules check epoch.
- How to establish V2 generation from nonempty hdnd/items legacy safely; migration, stable IDs, keep rollback backup, legacy writes fenced.
- Authenticated guest active pointer reads, generation row updates, strict validated lease expiry, admin Rules paths. Ban storing admin-sensitive backup on a guest-readable parent.
- Semantics of operation status after later generations/rollback, idempotent retry, LOST ACK, network loss and duplicate operationId, operation log immutability.
- Scope and cryptographic verification of private backup including per-row history, effective rights, locks and any external related data; rollback digest/permission and mutable generation isolation.
- Final public hook/repository epoch/permission version and draft checkpoint persistence on epoch switch; test-only legacy source route removal without losing historical regression coverage.
- Exact HEAD CI on SPLIT_BASE and each lane. 3 existing V2 Emulator permission_denied cases must be repaired with Rules fully enabled.

## G. API-CHANGE-02 — AGREED contract after integrated split (2026-10-30)

L2 acknowledged exact return shape and semantics at PR #95 comment https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6514617603.
This section **supersedes only §C.5** and references to the old operation status. No other signatures changed:

```ts
resolveDatasetOperation(database:Database,operationId:string): Promise<{
  status:'committed-active'|'committed-historical'|'not-committed'|'unknown';
  operationId:string;
  generationId?:string;
}>
```

- `committed-active`: immutable server operation log states COMMITTED; verified generation exists and active pointer points to the same operation/generation.
- `committed-historical`: verified immutable COMMITTED operation still exists but active pointer has advanced (including restore). Never report a historical commit as not-committed. If generationId is included it comes from the verified server log, not a guessed active generation.
- `not-committed`: authoritative read succeeds but operation is absent and active pointer does not contradict that fact. No automatic retry is implied.
- `unknown`: cannot determine server truth, including lost connection/permission, malformed or contradictory log, or active pointer with missing operation log; stop destructive action, retain operationId and check again.
- `operationId` returned unchanged. No optimistic client proof or reuse of backup as success evidence.
- `commitDatasetReplacement` and `restoreDatasetBackup` continue returning `ReplacementOutcome` (separate API); only a verified **currently active** matching operation is an operational confirmation. Historical status must not be presented as a new active swap.
- Frontend display/status adaptation belongs to L2; independent Emulator race expectations belong to L3; L1 maintains backend and existing Emulator tests. Workers hand off exact commits. No Rules relaxation, no production switch.

API-CHANGE-01 remains **UNDECIDED**: initial V2 activation over nonempty legacy `hdnd/items` needs a server-authoritative fence atomically covering legacy writes and the new pointer. Do NOT ship a naive cross-path client get + independent pointer CAS. Existing work is restricted to synthetic Emulator tests, PR Draft.

## H. API-CHANGE-01 — backend prototype implemented; UI still HOLD (2026-10-30)

Proposed (not yet L2 ACKed) backend-only exports in `src/data/firebase-versioned-replacement.ts`:

```ts
interface InitialActivationApproval {
  operationId:string; manifest:DatasetGenerationManifest;
  legacyBaseline:string; legacyRowCount:number;
  freezeRevision:number; freezeEpoch:number;
  preview:ReplacementPreview; fileName:string;
}
prepareInitialDatasetActivation(database:Database,user:User|null,
  items:readonly Item[],operationId:string,fileName:string):
  Promise<InitialActivationApproval>;
commitInitialDatasetActivation(database:Database,user:User|null,
  approval:InitialActivationApproval,confirmation:string):
  Promise<ReplacementOutcome>;
```

Confirmation text (provisional, must be ACKed):
`KHOI TAO V2 <operationId> <legacyRowCount> <newCount>`.

**Implemented in candidate branch, not production:** admin must freeze legacy explicitly beforehand using existing `freezeControl`. `prepare` reads server-confirmed frozen revision/epoch, keyed legacy rows, permissions, and editLocks. It stages SHA-256 verified clean Excel items in the private `datasetV2/candidates/<operationId>` and preserves the complete raw legacy rows+ACL+locks in immutable private `datasetV2/legacyBackups/<operationId>`. Backup has its own SHA-256 stable baseline; no candidate generation inherits legacy rights or history from reused business codes.

`commit` requires exact confirmation, compares immutable candidate/backup and legacy snapshot again while FROZEN, then attempts a single datasetV2 parent-node CAS from `active=null` to `revision=1`, new generation, private empty rights, `bootstrap` proof and an immutable COMMITTED operation. **RTDB Rules at the server** require `freezeControl.mode=FROZEN`, `closedAt>0` and **exact matching freeze revision/epoch** at the CAS instant, plus matching staged candidate, legacy backup and new operation record. Every legacy row/permission/lease write is denied during FROZEN; after V2 active even reopening freeze cannot revive legacy writes. The old legacy rows remain as a non-mutated backup/reference, not deleted.

The current QA is an Emulator-only proof of this initial CAS workflow, not permission to activate real data. Exact tests are in the L1-owned `tests/firebase-versioned-replacement.test.ts`; do not bypass Rules, publish/deploy or expose button/UI without L2 ACK and independent L3 security review.

**Still unverified:** true network ACK disappearance exactly at CAS boundary; multi-tab browser activation/reopen; deep rollback of legacy rights/history into a fresh V2 generation; full production Firebase-only runtime; handling legacy datasets above 1,000 rows; cross-source data parity and user acceptance. Rules cannot evaluate arbitrary JSON/SHA-256 themselves: checksum readback is enforced by backend client and immutability+freeze/CAS by server Rules. Never treat green CI as release authorization.

**No cross-lane writes:** L2 owns App/state/browser and must ACK provisional interface before referencing these names. L3 owns its new tests. L1 owns backend Rules, existing Emulator test and this contract on integration branch.

## I. L1 test harness for L2/L3 — two real Chrome tabs + lost caller ACK (2026-10-30)

**Owned by L1; Emulator test only.** After L2 PR #104 is integrated into PR95, L1 provides:

1. `src/state/firebase-emulator-admin-auth.ts`: `signInAsEmulatorGoogleAdmin(auth:Auth):Promise<User>` uses the **actual Firebase SDK** `signInWithCredential(auth,GoogleAuthProvider.credential(JSON.stringify({sub:'pr95-emulator-google-admin',email:'cavoixanh638@gmail.com',email_verified:true})))` against the connected **Auth Emulator**. This is Firebase's documented *emulated IdP token* technique, NOT a fake `User` and NOT a production Google account sign-in. Verifies `providerData.google.com`, email verification and decoded Firebase `signInProvider=google.com`, hence Rules receive genuine Emulator-issued ID token. Two independently initialized Auth clients with the same `sub` must return **the same UID**, and both must pass private V2 admin Rules. No production credentials are used.
2. `src/state/firebase-boot.ts` installs two Chrome-CDP hooks **ONLY** for Vite `pages-test` mode on `127.0.0.1`/`localhost` with `demo-hdnd` Auth/RTDB Emulator. Wait for these functions in each genuinely separate Chrome target:
   - `await window.__pr95EmulatorGoogleAdminSignIn()` → `{uid,email,emailVerified,providerIds}`, then use actual App actions, edit leases, server reads/writes with same authenticated admin UID in both tabs.
   - `window.__pr95EmulatorArmLostCallerAck(operationId)` → arms an exact **one-shot** failure for the next successfully committed `commitInitialDatasetActivation`, `commitDatasetReplacement`, or `restoreDatasetBackup` on the **same RTDB SDK instance**. Trigger before the UI's commit action; do not arm a different ID. It throws `PR95_TEST_ONLY_LOST_CALLER_ACK_AFTER_SERVER_CAS` after `runTransaction` returned `committed=true`, **before the backend API returns to UI**.
3. `tests/firebase-versioned-replacement.test.ts` runs real candidate Rules/RTDB Emulator cases to prove a server-durable operation for each of the 3 APIs after one-shot fault. Read-only `resolveDatasetOperation` must return active COMMITTED, then historical after next swap; assert revision 1→2→3 and exactly 3 operations/generations, with NO second CAS. The guest/private security suite remains unchanged.

**CRITICAL LAYER LIMITATION:** The fault is injected at the **SDK→application result boundary** AFTER the Firebase RTDB SDK has received server acknowledgment. The application caller does not get a success response. This proves no application-level retry and durable read-only recovery despite a lost application result. It **does not** prove a genuine server→SDK WebSocket ACK packet was lost. An independent **transport-layer** ACK-loss test requires a separate controlled RTDB WebSocket proxy/network interceptor and must remain **OPEN / NOT VERIFIED** until such evidence exists; never use the offline cached-get test as substitute.

**L2 browser worker responsibility:** implement CDP two authenticated admin target test: both tabs sign in through the test bridge and verify same UID, provider and server admin Rules; valid real lease/save; replace to new generation via real UI CAS; stale draft and lease from old generation are rejected; Reports/List both track active generation; then use one-shot lost API result bridge on initial/replace/restore and assert manual read-only recovery/no retry, with exact log and screenshots. Keep old guest read-only two-tab smoke, candidate Rules hash, privacy assertions and all UI tests. If browser UI cannot perform a step, report the precise blocker and do not mark PASS.

**L3 independent responsibility:** review each gate separately, distinguishing (a) two SDK Auth identities sharing UID, (b) two actual Chrome CDP target IDs, (c) genuine lease/save/CAS UI actions vs privileged fixture pointer writes, (d) SDK-to-app result loss vs network ACK loss. No production credentials, no Rules relaxation, no deployment.

No merge main/hosting publish/Firebase deploy/production data actions; PR95 remains Draft.

## J. NEW PARALLEL OWNERSHIP — L1 RTDB NETWORK ACK AND IDEMPOTENCY (2026-10-30)

**Frozen common baseline:** `01530a9ccedba021434626c1f717c2ac76fcaa64`. Each lane works independently from this SHA. Preserve all existing files/behavior/API; coordinate only at final integration after all five separately hand off. L1 MUST NOT edit L2 shared browser smoke. Never merge PR95/main or deploy/publish/modify production.

| Work package | Owner | Scope |
| --- | --- | --- |
| Real RTDB network ACK loss & idempotency | **L1** | `pr95/l1-network-ack-loss-idempotency-20261030`, Draft PR #107, standalone transparent WebSocket frame proxy, direct Firebase SDK/RTDB/Auth Emulator tests, dedicated runner/workflow, backend if needed; keep public API unchanged |
| User workflow / two real Chrome admin tabs / stale drafts and leases | **L2** | Browser UI/test files only, use established API and test bootstrap without editing L1 proxy/backend |
| Independent Rules/data/privacy/network/rollback audit | **L3** | Read-only code/CI audit and separately owned adversarial test files, independent conclusions |
| Excel A–O parser correctness and validation | **L4** | **Exclusive** ownership of `source/src/data/business-excel.ts` and dedicated parser tests/fixtures; keep exported APIs unchanged; work independently from frozen baseline |
| Report/filter numerical parity and replacement preview | **L5** | **Exclusive** ownership of `source/src/domain/item-summary.ts`, `source/src/domain/reporting.ts`, `source/src/domain/report-workflow.ts`, `source/src/data/dataset-replacement-preview.ts` and dedicated parity tests; keep exported APIs unchanged; work independently from frozen baseline |

### L1 acceptance — actual server → SDK ACK must disappear

The **old §I fault** `armEmulatorPostCommitCallerAckLoss` raises only after Firebase SDK has already received its transaction result. It is **application-layer completion loss**, not network ACK loss. Preserve its tests and name. The new L1 package uses **`scripts/pr95-network-ack-proxy.mjs`** (Node TCP/WebSocket proxy bound to `127.0.0.1:19000`) between the real Firebase SDK and the disposable RTDB Emulator at `127.0.0.1:9000`.

For each `initial`, `replace`, `restore`, the proxy:
1. Observes the *real* SDK WebSocket CAS request targeting `/hdnd/datasetV2`, containing the new active `generationId`, immutable `operations[operationId].status='COMMITTED'`, a numeric wire request ID and CAS hash.
2. Forwards the CAS request unchanged to Emulator **under unchanged exclusive-candidate Rules**; observes the matching server `OK` WebSocket ACK frame.
3. **Never forwards that target ACK frame to the SDK**. Independently reads **server state via a separate loopback owner REST connection, bypassing the faulted SDK and its cache**; insists on the exact active generation, operation COMMITTED, expected revision and materialized generation before closing the faulted wire. A dropped ACK without independent server commit is FAILURE, not PASS.
4. Starts a separate Firebase SDK/Auth Emulator client, reads `resolveDatasetOperation(operationId)` via that client (not a cached-offline get), deliberately reconnects faulted SDK, retries **the same operationId**, and proves no extra `active.revision`, `generations` or `operations`. It also checks the prior operation is `committed-historical` after the next generation and that a reattempt is `already-committed`.

Synthetic fixture only; Auth Emulator Google-provider SDK principal and server-enforced candidate Rules. Test data and privileged REST observer never touch production. The proxy's **wire-level** evidence is matched request ID, CAS hash, server response status, suppressed frame, and independent direct server snapshot. If no matching CAS/ACK is observed or server data cannot be proven, the test fails with `CHUA KIEM CHUNG`, not a misleading green outcome.

**Files owned by L1:** `source/scripts/pr95-network-ack-proxy.mjs`, `source/scripts/pr95-network-ack-proxy.d.mts`, `source/scripts/run-pr95-network-ack-loss.mjs`, `source/tests/pr95-network-ack-loss.test.ts`, `.github/workflows/pr95-network-ack-loss.yml`, and this §J. No production API, `source/scripts/smoke-pages-browser.mjs`, or Auth/RTDB Rules changed. The standalone CI job is `PR95 RTDB network ACK loss - isolated Emulator` and explicitly fails if any of the three wire-level cases does not demonstrate the exact protocol.

**Scope caveat:** The exercise suppresses a **server→SDK RTDB WebSocket application-protocol ACK frame** after the server has applied the CAS; it is not packet-level loss of all possible network transports, nor a proof about real production internet conditions. Other legitimate, unsolicited server updates may have reached a subscriber before the ACK frame; the fault specifically targets the CAS completion response. It cannot be replaced by an offline cached-get, `permission_denied`, an SDK mock, or the §I test-only application-result hook.

**Current task state at contract authoring:** initial dedicated CI `#41022725043` at early worker SHA `f2bd0a60...` demonstrated all three wire-ACK cases PASS; source TypeScript checks on later worker commits must also pass before final handoff. Full integrated release remains HOLD until independently delivered L2, L3, L4 and L5 packages, not because documentation is pending.

## K. Parallel addendum — L4/L5 immediate independent ownership (2026-10-30)

**This §K supersedes earlier references to only three parallel lanes.** There are now **five independently operating lanes (L1–L5)**, all from **the same immutable baseline** `01530a9ccedba021434626c1f717c2ac76fcaa64`. This documentation update is **NOT** a prerequisite or blocker for L4 or L5 to begin, nor for any existing lane to progress. Do not introduce serial handoffs or approval dependencies between workers.

- **L4 EXCLUSIVE:** `source/src/data/business-excel.ts` and parser-only tests/fixtures. Excel A–O data interpretation, validations, error diagnostics, stable row IDs, and invalid-file behavior belong to L4. No L1 modifications to these files, even for perceived convenience.
- **L5 EXCLUSIVE:** `source/src/domain/item-summary.ts`, `source/src/domain/reporting.ts`, `source/src/domain/report-workflow.ts`, `source/src/data/dataset-replacement-preview.ts` and report/filter/preview parity tests. All row counts, category splits, click-through filter conditions and current generation parity belong to L5. No L1 modifications to these files.
- **L1 RESTRICTED:** real RTDB server→SDK network ACK suppression, independent server COMMITTED witness, idempotent initial/replace/restore and its dedicated proxy/test/runner/workflow. Keep the L1 PR #107 changes isolated. Do not edit either L4/L5 module, shared browser script or other lanes' tests. All existing public exports, signatures, semantics relied upon by other lanes must remain compatible.
- **L2/L3 UNCHANGED:** L2 owns end-to-end UI/actual browser work; L3 independently audits and tests cross-lane invariants. Both continue immediately without waiting for L1, L4 or L5.

**Integration at END OF BATCH only:** each lane independently commits, runs its own tests/CI, and hands off branch/PR + exact SHA + changed-file list + test evidence + known gaps. Sole integrator reviews ownership and compatibility, merges the packages only once all five are delivered and independently reviewable. No preliminary merge into PR95; no merging main, publishing/deploying, or touching real Firebase/Sheets. If a change seems to require another lane's file, document the exact API/fixture request on PR95 rather than quietly editing that file; no blocking worker-to-worker chain is created.

**Existing evidence is preserved:** L1's actual network ACK loss suite remains separate from the old application-result-loss hook; earlier L2/L3 tests and CI remain valid for their stated scope. Final integration will repeat full CI on the final integrated SHA without reclassifying older tests as proofs of untested behavior.
