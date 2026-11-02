# Chat 3 — Operator first import report (02/11/2026)

## Scope / status
- Branch: `parallel/20261102-chat3-bootstrap`.
- Last **code / test / workflow** SHA: `e0ebe52b7f2455e2c396c46544adfa0cb764eb99`.
- Exact independent GitHub Actions [run 41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875) — **PENDING at checkpoint preparation**, not PASS.
- Production: **NOT RUN / NO GO**. Only synthetic demo identities and local emulator fixture are authorized.
- Direct local run: **NOT RUN** (container has no reachable github.com DNS and no checkout or root node_modules; all GitHub changes made through connected GitHub API).

## Modifications, owned files only
1. `scripts/operator-first-import-entry.ts`: verifies workbook and approval bytes a second time just before invoking CAS, marks a private attempt receipt before the first possible CAS write, records UNKNOWN after potential CAS, exit 3 for unknown versus exit 2 for prewrite HOLD, exit 0 after server readback + final receipt. Production requires private receipt path; rejects checkout-path receipt including symlink-parent escape. Adds timeouts for preflight and CAS/readback and accepts isolated localhost emulator ports from injected hosts.
2. `parallel-qa/chat3/operator-preflight.mjs`: launches the **actual executable** for missing approval, wrong source SHA, wrong confirmation, approval digest mismatch, corrupted Excel, missing stdin identity, unverified/wrong Google admin and nonempty emulator root. Uses a read-only server witness to compare before/after. Only synthetic workbook and fixture, cleaned after suite.
3. `.github/workflows/parallel-chat3-operator.yml`: isolated NO DEPLOY job on branch push/manual, pinned npm install + typecheck/default deploy guard, actual Auth/RTDB/Functions with source FULL Rules and both Functions dependencies, new negative CLI script followed by existing FRV-02 real CAS/readback/repeat-guard test.
4. `docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`: decision table, receipt and reconciliation procedure, demo-only invocations, clear production boundary.

## Expected operator behavior
- **Exit 2** before CAS: safe to diagnose input; invalid source/digest/approval/admin/root rejected, no CLI database write invoked.
- **Exit 3** after CAS invocation: commit status UNKNOWN; stop, read live server independently, reconcile A–O business data/IDs/actor and root. NEVER auto-retry.
- **Exit 0**: CAS + detailed backend readback + saved private RESULT receipt verified. Receipt excludes bearer/Google token, raw cells and private credentials.
- Attempt receipt is an operator-private marker, not a server-side transaction log. Forced process termination and local filesystem failure can leave it incomplete, so absence of a successful final receipt is not evidence of no commit.

## Test evidence / limitations
| Item | SHA | Result | Details |
|---|---|---|---|
| GitHub receipt of code and new workflow | e0ebe52b7f2455e2c396c46544adfa0cb764eb99 | COMMITTED | Branch-specific changes through GitHub connector. |
| Dedicated exact-SHA workflow | e0ebe52b7f2455e2c396c46544adfa0cb764eb99 | PENDING | [run 41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875). |
| Isolated local Node22/Auth/RTDB/Functions | same | NOT RUN | No clone/dependency/network available in current container; CI is authoritative if completed. |
| Malformed source / negative auth / nonempty / happy path repeat | same | NOT YET CONFIRMED | Dedicated workflow carries executable cases. |
| Change-after-stdin and forced lost-ACK | same | NOT RUN | CLI code guards before CAS and marks unknown after request; test needs fault injection to verify exact timing. |
| Production target or credentials | n/a | NOT RUN | Explicitly forbidden. |

## Safety constraints and integration
- Never change shared `business-excel.ts`, `firebase-primary-bootstrap.ts`, FULL Rules, release config, root package/lock, backup or other chat branches.
- Current implementation cannot prove an independently signed full-root snapshot, and `fullRootSnapshotSha256` remains an external operator attestation. No production authorization implied by the tool.
- A browser UI/import source activation/PR149 conversion is separate; not covered by this branch.

## Next verification
1. Read [run 41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875) conclusion and logs. If FAIL, inspect exact failing job; apply fix only in owned files and rerun on new code SHA.
2. Run fault injection for source mutation after STDIN, broken readback after server commit, and transport failure. Record server witness and private receipt states. No production.
3. If green, record exact tested code SHA/CI run and mark checkpoint DONE or DONE_WITH_EXTERNAL_GAPS, keeping production NOT RUN.

- Proven prior CI PASS: [run #41407800031](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407800031) for earlier code SHA `f0c3f88af23371d4e87a97227fc4c15f63981014` (before adding stdin-race tests). This does not prove the latest code SHA.
