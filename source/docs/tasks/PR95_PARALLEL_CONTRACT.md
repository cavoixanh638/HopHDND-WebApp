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
