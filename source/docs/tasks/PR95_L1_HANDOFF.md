# PR95 — L1 backend/Rules handoff (2026-10-30)

Shared SPLIT BASE: `099132ee722fe8c1ea1e9976e64e2e4f75809641`.
Working branch: `pr95/l1-backend-rules-emulator-20261030`.
Draft child PR: https://github.com/cavoixanh638/HopHDND-WebApp/pull/97
Integration target: PR #95 branch `feat/firebase-excel-safe-replacement-and-list-compact-20261030`, NEVER main.

## Evidence + checkpoint

- Earlier passing V2 Emulator checkpoint: `c0ef35e036ef3c02964c5a6f98bb96c8deb67e56`, Verify source run #40998130190. Unit tests SUCCESS; V2 Firebase Emulator with UNMODIFIED candidate Rules SUCCESS; browser mock Sheets smoke FAILED (L2-owned test/runtime). Two other workflows SUCCESS.
- Security-tightening code checkpoint: `47d61200d38c697f67c8fb47e4f94814b9e23136`, Verify source #40999212931: Unit tests and Firebase Emulator tests SUCCESS at verified job steps; staging #40999212882 SUCCESS and operational QA #40999212732 SUCCESS. Exact final conclusion of Verify source must be checked independently; browser smoke may fail until L2 integration.
- Run locally/CI with synthetic data only: `cd source && npm ci && npm run typecheck && npm test -- --run && npm run test:firebase`. Never bypass nested Rules validations.

## File changes ONLY L1-owned

- `source/firebase/database.exclusive-candidate.rules.json`: V2 parent transaction preserves untouched old lease fields, V2 active row write guard fixed, parent CAS restricted to admin creating a fresh generation with advancing active revision and new immutable operation log; separate admin-only immutable staging/backup paths. Reject unknown generation metadata and operation fields; operation log fields declared as valid children so wildcard doesn't reject legitimate records.
- `source/src/data/firebase-versioned-replacement.ts`: restore transaction gets a warm live cache (matching commit CAS), refreshes new generation's server-owned operationId/updatedAt/updatedBy rather than replaying invalid old metadata.
- `source/tests/firebase-versioned-replacement.test.ts`: stale old tab uses cached row; inactive generation read/write denied; admin cannot directly tamper active, operation log, stale metadata, old generation row.

No changes to App/state/client repositories/Sheets browser tests/L3 independent tests. No API function signature changes; existing V2 APIs can still be called from L2 subject to Emulator gating.

## Coordination

- L2 request API-CHANGE-01 first activation from nonempty legacy: HOLD, needs server-authoritative cross-path fencing/CAS and private backup. No invented import API in released UI.
- L2 request API-CHANGE-02 operationId historic status: proposal sent in PR #95; await L2 ACK of output shape before changing `resolveDatasetOperation`. Do not assume historic operation status correct yet.
- L3 runner request: new independent Emulator test files must be integrated **after L1 and L2**; L1 owner of `scripts/test-firebase.mjs` will include them then, no missing paths on L1 branch. The independent race test's direct unauthorized update needs a valid lease+audit path before asserting mid-review edit succeeds.
- Browser smoke failure `Mock Sheets row NQ01 did not render` belongs to L2 per contract; do not weaken production Firebase-only or change L2-owned files.

## NOT RELEASE READY / known risks

1. Existing V2 activation from nonempty `hdnd/items` is not implemented or verified.
2. `resolveDatasetOperation` incorrectly conflates historic committed op with not-committed after later generation; API change needs ACK.
3. No real network ACK-loss isolation, multi-tab browser QA, backup history from older revised rows verified yet.
4. Root CAS Rules and immutable operation log only cover rules stated in code; L3 independent adversarial suite not yet integrated; all security negatives must pass under Rules original.
5. Production V2 Rules not deployed, and local App still needs full Firebase-only verification.
6. PR #95 and worker PRs remain Draft; NEVER merge main, deploy Firebase/Pages or read/write/delete/import production data.

Sole L1 integrator must verify changed-path whitelist, merge reviewed L1 branch into PR #95 **before** L2 branch then L3 tests, and run exact integrated-HEAD full CI.
