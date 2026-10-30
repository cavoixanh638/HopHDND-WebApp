# PR #95 — LUỒNG 3 INDEPENDENT FINDINGS & HANDOFF

Date: 2026-10-30 (Asia/Bangkok).
Repository: `cavoixanh638/HopHDND-WebApp`.
Owned branch: `pr95/l3-independent-tests-20261030`.
SPLIT_BASE / inspected source HEAD: `099132ee722fe8c1ea1e9976e64e2e4f75809641`.
Before first write, exact branch HEAD equalled SPLIT_BASE, compare status **identical (ahead 0, behind 0)**; no reset/rebase.
PR #95 integration owner is **Luồng 1 exclusively**. This lane has not integrated, deployed, merged, published, or accessed production.

## Precise ownership

New paths written by Luồng 3, nothing else:

1. `source/tests/pr95-independent-parser.test.ts`
2. `source/tests/pr95-independent-generation.test.ts`
3. `source/tests/pr95-independent-rules.test.ts`
4. `source/tests/pr95-independent-ui.test.tsx`
5. `source/tests/pr95-independent-race.test.ts`
6. `source/docs/tasks/PR95_L3_FINDINGS.md`

No shared type, legacy test, Rules, code, script, workflow or contract was edited.

## Status semantics and execution disclosure

- **NEW — STATIC ANALYSIS / EMULATOR UNCONFIRMED**: the source visibly implements an unsafe condition; the new negative test must still be executed against real RTDB Rules.
- **KNOWN BASELINE**: the prior, independently documented failure is not called new.
- **COVERED / NOT YET EXECUTED**: test committed, no success or failure observed.
- **NOT VERIFIED**: current lane cannot establish behavior (including Chromium two-tab E2E). A synthetic UI projection is not a browser proof.

Environment limitation for this lane: local runtime could not resolve `github.com` to clone the repository; no complete dependency checkout and no local Emulator were available. GitHub connected API was used to read exact files and commit new files. **Do not infer PASS from the fact that tests are committed.** Trigger exact branch CI/Emulator on the integration runner, record run ID and exact SHA.

The base candidate Rules file `source/firebase/database.exclusive-candidate.rules.json` is loaded **unchanged** by both new Emulator test suites. RulesTestEnvironment elevated `withSecurityRulesDisabled` is used **ONLY to insert synthetic seed fixtures**. Every test action uses a genuine SDK client under authenticated RTDB Rules, never a mocked database. Emulator suites are conditional on `FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000`; skipping them in ordinary `npm test` **does not count as PASS**.

## Defect register — reproduction, actual/expected, test

### L3-KNOWN-001 — 3 existing V2 permission_denied (KNOWN BASELINE)

- Inspected: `099132ee722fe8c1ea1e9976e64e2e4f75809641`; documented predecessor `c123d3cac9e443618f7b84a71d3f9c3a604619aa`.
- Reproduce: run existing `npm run test:firebase` with unmodified candidate Rules, specifically `tests/firebase-versioned-replacement.test.ts`, stage and commit, dual-tab CAS, then active-generation lease.
- Actual: Verify source run `40994579581` (reported by Luồng 1) has 3 `permission_denied` cases; independently at previous predecessor Verify source run `40993112430` had 3 failed cases in `commitDatasetReplacement`. **No rerun by Luồng 3 yet.**
- Expected: authorized, fully validated transaction succeeds under real Rules; stale/unauthorized mutations reject, restore succeeds.
- Tests: existing `tests/firebase-versioned-replacement.test.ts`; additional adversarial `pr95-independent-race.test.ts`.
- Owner: **Luồng 1**, not modified by this lane.

### L3-STATIC-001 — historical operationId loses COMMITTED status (NEW, CODE-VERIFIED, EMULATOR PENDING)

- Inspected: `099132ee722fe8c1ea1e9976e64e2e4f75809641`, `src/data/firebase-versioned-replacement.ts`, `resolveDatasetOperation`.
- Reproduce: commit operation A; restore with new operation B (or commit replacement C); query A after active pointer changes.
- Actual from source: `resolveDatasetOperation` returns `'committed'` only if `operations[A].status==='COMMITTED' && active.operationId===A`; after B/C, it returns `'not-committed'` despite A remaining in the log. **Execution pending.**
- Expected: a durable successful operation remains `'committed'` in historical lookup, never falsely categorized as not committed. A distinct active pointer state may be reported separately if needed.
- Test: `pr95-independent-race.test.ts` → `historic COMMITTED operation remains resolvable after subsequent restore`.
- Owner: Luồng 1. Preserve unknown/lost-ACK semantics and no blind retry.

### L3-STATIC-002 — admin can apparently mutate operation log (NEW, RULES-INSPECTED, EMULATOR PENDING)

- Inspected: `099132ee722fe8c1ea1e9976e64e2e4f75809641`, `firebase/database.exclusive-candidate.rules.json`.
- Reproduce: after seeding a valid COMMITTED operation in the **Emulator only**, authenticated verified Google admin does `set(hdnd/datasetV2/operations/l3_second_operation/status, 'FORGED')`.
- Actual from Rules inspection: parent `datasetV2/.write` grants verified admin; `operations/$operation` has a private `.read`, but no explicit `.validate` guarding immutable status. A parent write grant appears to flow down. **Not observed on live Emulator.**
- Expected: operation log entries must be append-only/immutable after commit, including same-admin stale tab, or server-authoritative equivalent.
- Test: `pr95-independent-rules.test.ts` → `must not accept admin mutation of inactive generation metadata or operation log`.
- Owner: Luồng 1; no Rules patched in this lane.

### L3-STATIC-003 — inactive generation metadata mutation (NEW, RULES-INSPECTED, EMULATOR PENDING)

- Inspected: same commit/rules as L3-STATIC-002.
- Reproduce: with `gen_second` active, Google admin writes `hdnd/datasetV2/generations/gen_first/rogueMetadata` (synthetic only).
- Actual from Rules inspection: inherited admin write at V2 parent, no child validation at `rogueMetadata`; likely accepted. **Execution pending.**
- Expected: all inactive generation mutations rejected; only approved, validated metadata structure permitted.
- Test: `pr95-independent-rules.test.ts` → same negative test.
- Owner: Luồng 1.

## Coverage inventory (committed; NOT YET EXECUTED)

| Test file | Coverage and threat | Runtime |
| --- | --- | --- |
| `pr95-independent-parser.test.ts` | Reversed header **and value** H/I, L/M; multiple valid sheets; explicit sheet selection; duplicates; missing code/content, serial/status/type invalid; empty bytes/sheet; formula and P column; order-invariant IDs | Vitest + XLSX, pure |
| `pr95-independent-generation.test.ts` | SHA-256 invariance, row tamper, keyed readback and inherited metadata denial, pointer CAS mismatch, reused display code preview | Vitest, pure; **not Rules** |
| `pr95-independent-rules.test.ts` | Guest privacy and read/write restrictions; no legacy writes postcutover; inactive generation rights, reused codes, old leases; immutable operations and generation hierarchy | **Real RTDB Emulator/Rules** only |
| `pr95-independent-race.test.ts` | Real staging/readback, private backup, immutable candidate; two separate authenticated clients with SAME admin UID; race; post-review same-generation mutation; duplicate operationId; restore; operation history; `UNKNOWN` on inaccessible query | **Real RTDB Emulator/Rules** only |
| `pr95-independent-ui.test.tsx` | Synthetic List/Report projections and SSR report receive only supplied active-generation records, including reused display codes | React server-rendered **simulation only**, no Chromium, no App subscription |

## Remaining gaps and explicit integration requests

**L3-RUNNER-001 (blocked by ownership)**: `source/scripts/test-firebase.mjs` explicitly enumerates legacy suites and does **not** include `tests/pr95-independent-rules.test.ts` or `tests/pr95-independent-race.test.ts`. Only Luồng 1 may update runner; add these two files to the RTDB/Auth Emulator suite (without disabling candidate Rules), run serially if environment requires it, record exact HEAD, run ID and pass/fail. `npm test` may execute their `describe.skipIf` as skipped when Emulator is absent — not security verification.

**L3-UI-001 (WAIT FOR L2 INTEGRATION)**: verify real App/Danh sách/Báo cáo/history all use the same active generation; old tab, lease, draft, cached rows and rights must be invalidated both in UI and by server Rules. Current `pr95-independent-ui.test.tsx` does **not** cover mounted App, live subscription, localStorage recovery, browser two-tabs or Chromium.

**L3-NET-001 (NOT VERIFIED)**: dropped network ACK and retry timing cannot be faithfully produced from a plain unit test or from a guest permission denial. The `UNKNOWN` test models an *unreadable status query under actual Rules*, not packet loss. Require an isolated fault-injection Emulator/SDK test with durable operationId status lookup; never label mock exceptions as real lost network.

**L3-BACKUP-001 (NOT VERIFIED)**: readback comparison of a restored full generation (history, permissions, leases, digest), not just item content, must be exercised once Luồng 1 fixes backend/Roles and publishes stable API. No production backups are involved.

**L3-SEC-001 (NOT VERIFIED)**: transition from populated legacy DB to active V2, guest rights before/after cutover, and no old-path bypass must be proven with the real Rules and a positive-control authorized edit; negative-only checks are insufficient to prove the epoch fence itself.

## Commands for integration owner (demo-only)

From `source/`, with dependencies installed, **never production**:

```bash
npm run typecheck
npx vitest run tests/pr95-independent-parser.test.ts tests/pr95-independent-generation.test.ts tests/pr95-independent-ui.test.tsx
# After Luồng 1 adds the two files to source/scripts/test-firebase.mjs:
npm run test:firebase
# Alternatively, with an already isolated local RTDB Emulator at 127.0.0.1:9000:
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 npx vitest run tests/pr95-independent-rules.test.ts tests/pr95-independent-race.test.ts --no-file-parallelism
```

Decision: **NO GO** until Rules-enabled tests pass and genuine browser evidence exists. No test assertion should be weakened to bypass baseline `permission_denied`. Luồng 1 must review failures and integrate these new files explicitly; Luồng 3 does not cherry-pick or merge.
