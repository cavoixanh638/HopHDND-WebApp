# PR142 / CHAT 1 — isolated scoped-Admin Rules PoC (revision 2)

**Source candidate SHA:** `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`. This PoC tests only the mechanism described in PR142 comment 6551634189 and Codex's handoff 6552621089, **section 4 CHAT 1**. It is not connected to the WebApp, deployable backend, production database or the 157 KB candidate Rules. Keep all changes within this folder.

## What changed since Codex's actual 6 PASS / 16 FAIL run

- A **persistent value listener warms the exact row/lease path**, and stays attached during the RTDB transaction. Each transaction logs callback count, cold `null` callbacks, number of candidate values proposed, and outcome. A local `committed:false` is **`LOCAL_ABORT`**, never a Rules denial. `RULES_DENIED` is assigned only if Firebase returns `permission_denied` **after a candidate was produced**.
- Raw REST requests use the documented Firebase **ID token** transport `?auth=<idToken>`, **not** OAuth2's `Authorization: Bearer` header. Positive control: authenticated REST GET (200) of a read-permitted row; negative control: unauthenticated GET (401/403). Then authenticated REST PATCH with a forged `X-CellService` header must fail (401/403) on both row and lease, with owner REST readback unchanged. Raw client SDK writes are also tested separately.
- Concurrent callers now touch **different, uncontended cells** (`A/r1` vs `C/r2`). C has a valid but unenrolled UID and therefore must receive server-side `RULES_DENIED`, not a misleading `LOCK_HELD`. A's lease must belong to A, C's lease must remain absent. An independent unenrolled acquisition control is retained.
- The six same-UID public-hash attempts cover both `lease.proofHash` and `row.editProofs.note`, after honest A has saved, to ensure a published hash cannot be used as the private 32-byte proof. For every denial, the PoC compares authoritative before/after server values.
- Each request creates its **own limited Admin app** using the **verified Auth Emulator ID token UID** with a server-only `auth.token.cellService` override. Apps and socket listeners are disposed after use. The final report contains per-test status and transaction/authoritative row/lease SHA-256 fingerprints (no secrets or Firebase ID tokens). The runner calls `process.exit` after flushing the witness to prevent lingering sockets from hanging `emulators:exec`.

## Run in Codex's Emulator-enabled environment

Use an isolated/detached copy of the original candidate. Overlay **only** this PoC directory from branch `poc/pr142-scoped-auth-override-98ead3e`. Example:

```sh
git fetch origin poc/pr142-scoped-auth-override-98ead3e
git switch --detach 98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847
git restore --source origin/poc/pr142-scoped-auth-override-98ead3e --worktree -- source/poc/pr142-auth-override
cd source/poc/pr142-auth-override
npm install --no-audit --no-fund
npm run syntax
npm run poc
```

Requires Node.js >=20, Java and Firebase Auth/RTDB Emulator binaries. The test uses `demo-pr142-override` only and strictly checks that both `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000` are set by `firebase emulators:exec`. Ports 9099 and 9000 must be free. The harness seeds synthetic two-row data via the Emulator-only `owner` REST token; gateway transactions use **limited Admin apps, not owner**. The fixture intentionally supports only `note`, membership/grant, freeze and V2 generation state; no other real business authorization is represented.

**Expected exit:** a `SUMMARY 22 PASS / 0 FAIL, scoped apps created/deleted X/X` line, process exit code `0`, and `witness.local.json` with `status: PASS`, `counts.pass: 22`, `counts.fail: 0` and `scopedApps.open: 0`. If any expected negative aborts locally, the case fails with `LOCAL_ABORT` / `WRONG_DENIAL`, not PASS. Codex must preserve console log, exact SHA, PoC branch HEAD and witness from the real run. Each test may fail for another reason: investigate, do not relax expectations to inflate PASS.

If a test fails, `npm run poc` exits nonzero and the witness lists `cases`, sanitized `transactions` and `checks` (row/lease SHA before and after). If initialization fails, it exits with `topError`; never call such a run PASS. `witness.local.json` is `.gitignore`d.

## Scope of evidence and restrictions

This proves **only the reduced Rules mechanism** if it actually runs. It does not prove full candidate Rules, privileged V2 parent-CAS / Excel replacement / restore, anonymous and Google account role parity, callable HTTP production auth, lost ACK or production readiness. No secret is written to RTDB, logs, JSON witness, backup or `editProofs`; only a public, non-bearer SHA-256 proof hash appears in lease/row. The private secret is RAM-only. Same-UID transfer of the actual private secret, XSS and extensions are **outside scope**.

`source/firebase/database.exclusive-candidate.rules.json` stays unchanged, and so do all app and test files outside this folder. No deployment, publication, production access, merge or promotion of the security status. The independent Codex parent-CAS and freeze tasks are not prerequisites or imports of this PoC.

## Author's execution evidence for this revision

At the author's local environment: `node --check poc.mjs` and JSON syntax parsing pass, Node `v22.16.0`, Java 21. `firebase`, `firebase-admin` and `firebase-tools` were not installed; `npm view firebase-admin` failed DNS resolution for `registry.npmjs.org` (`EAI_AGAIN`), so **0/22 Emulator groups executed here — NOT RUN**. The earlier **6 PASS / 16 FAIL** belongs to Codex running the previous PoC and must not be relabeled as a result of this revision. Run `npm run poc` in Codex's installed environment and publish the actual witness before any claim of Emulator PASS.
