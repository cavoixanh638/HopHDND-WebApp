# PR147 – one-time operator first import (empty RTDB only)

**Status: operator code under exact-SHA Emulator verification; production still NO-GO.** This is a standalone **production-designed** CLI (not a Vitest wrapper, not a Firebase Admin SDK privileged seed). It uses the shipped `src/data/firebase-primary-bootstrap.ts::bootstrapApprovedRowsToPrimary`, true Google Auth and a single server-approved empty `hdnd/items` CAS. It **never** deploys, changes Rules, stores the token or auto-activates V2.

## Inputs prepared by authorized operator

Use the [PR149 offline auditor](https://github.com/cavoixanh638/HopHDND-WebApp/pull/149) and two fresh independent read-only full-root checks. The target must be classified **EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT**, not merely `hdnd/items == null` while other private roots exist. A fresh full-root SHA256 checkpoint and approved A–O workbook are required. Reconcile any post-backup ACK before using this tool; a new ACK requires a fresh checkpoint and a renewed approval.

`/ABSOLUTE/PRIVATE/first-import-approval.json` (contents are **examples of required fields**, NOT authorization):

```json
{
  "schema": "PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1",
  "project": "REQUIRED_UNVERIFIED",
  "databaseURL": "REQUIRED_UNVERIFIED",
  "sourceSha": "REQUIRED_UNVERIFIED",
  "workbookSha256": "REQUIRED_UNVERIFIED",
  "sheet": "REQUIRED_UNVERIFIED",
  "expectedRows": 0,
  "expectedState": "EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT",
  "fullRootSnapshotSha256": "REQUIRED_UNVERIFIED",
  "fullRootSnapshotReadAt": "REQUIRED_UNVERIFIED",
  "operatorEmail": "REQUIRED_UNVERIFIED",
  "approved": false,
  "independentRulesApproved": false,
  "publishedRulesHashReadbackVerified": false,
  "bothFunctionsAndIamVerified": false,
  "liveFreshBackupRestoreVerified": false,
  "ownerSourceAndHistoryPolicyApproved": false,
  "maintenanceWindowApproved": false,
  "operatorAuthorizedForThisExactImport": false
}
```

All `REQUIRED_UNVERIFIED` placeholders and `false` approvals are **HOLD** until independent operator verification/sign-off. The approval file is a claim from the authorized workflow, **not a cryptographic signature**; the launcher does not replace actual external authorization. The live snapshot must be fresh (under 15 minutes) and verified immediately before the CAS. Project/database URLs must match the frozen web configuration and verified live instance.

## Executable interface

From the exact frozen `source/` checkout, `npm ci` and Node22, run `node scripts/pr147-default-deploy-guard.mjs` first. No firebase deploy command is needed. The Google OAuth **ID token must be supplied on standard input** by an independently authorized OAuth flow; it is not a Firebase service-account token, Admin SDK service credential, and **not a fake Emulator credential in production**.

```sh
# Values here must be independently verified. No production defaults are supplied.
# An approved source with private permissions must NOT be committed to the repo.
OAUTH_GOOGLE_ID_TOKEN_PRODUCER_FOR_APPROVED_ADMIN_ONLY \
 | GCLOUD_PROJECT="$APPROVED_PROJECT" PR147_OPERATOR_FIRST_IMPORT_APPROVED=YES \
   node scripts/operator-first-import.mjs \
   --mode production --project "$APPROVED_PROJECT" \
   --database-url "$APPROVED_DATABASE_URL" \
   --api-key "$APPROVED_PUBLIC_WEB_API_KEY" \
   --auth-domain "$APPROVED_AUTH_DOMAIN" --app-id "$APPROVED_WEB_APP_ID" \
   --xlsx /ABSOLUTE/PRIVATE/approved.xlsx \
   --sheet "$APPROVED_SHEET" \
   --approval-file /ABSOLUTE/PRIVATE/first-import-approval.json \
   --source-sha "$EXACT_PR147_GIT_SHA" \
   --confirm "IMPORT_ONCE_${APPROVED_PROJECT}_${WORKBOOK_SHA256_FIRST_12}" \
   --output /ABSOLUTE/PRIVATE/first-import-result.json
```

The example's credential producer is **a placeholder**, not an executable command. No real credentials, project URLs, IAM or LIVE approval are provided in source. The operator must use a real approved OAuth acquisition method; Firebase Auth verifies Google provider/email and the code checks `email_verified` and the configured admin email. For missing/mismatched input, wrong identity, preflight connection failure, or an already populated root, the tool returns **prewrite HOLD (exit 2)**. Once it invokes the shared CAS, **any** rejection, lost ACK, timeout, or readback ambiguity is **UNKNOWN (exit 3)**; the tool never deliberately starts a second import.

**Output:** a private new-file-only (`wx`, 0600) attempt marker is reserved immediately before CAS. After verified readback the marker becomes a JSON receipt that binds exact source SHA, workbook SHA, project/database, actor UID, imported row count and server readback SHA; no token, source workbook cell values or secret. The CLI itself independently checks accepted row IDs, code, revision, UID and timestamp; the existing CAS implementation verifies every business field. Rerunning it cannot overwrite existing records.

**Next after successful empty import:** operator takes a new read-only checkpoint, reconciles journal and rights with approved source, then proceeds **separately** to FROZEN → source preview → staged legacy backup → authenticated parent V2 activation per PR149. Import is not itself V2 activation or a production GO.

## Demo-only proof

CI `parent-commit-service/test/integration.test.ts` runs this exact executable on synthetic A–O Excel against **demo-hdnd Auth + RTDB + both actual Functions + FULL Rules Emulator**, verified Google identity and server readback. It also asserts second execution is denied and a production-mode attempt without approval is rejected. Test credentials are explicitly valid **only** for the localhost Emulator and cannot pass production-mode input checks.

`firebase.json` is intentionally **nondeployable**: its database Rules target `firebase/REQUIRED_UNVERIFIED_NO_DEFAULT_DEPLOY_DO_NOT_CREATE.rules.json` is **absent** and must never be created. `scripts/pr147-default-deploy-guard.mjs` is a mandatory CI gate. A future, explicitly reviewed production release requires a separate approved `firebase.release.json` copy with true instance/project and two Node22 Functions plus FULL Rules. Never use unqualified `firebase deploy`; no implicit Firebase/Cloudflare Hosting migration.

**Final release boundary:** `CODE_READY` and `PACKAGE_READY` require exact matching SHA CI; `PRODUCTION_AUTHORIZED=false` until separately approved Published Rules/readback, IAM, TLS/CORS/domain, private backup/restore drill, real users and maintenance GO. Web release remains last.

## Chat 3 operator decision table (2026-11-02, demo rehearsal only)

The executable uses strict **exit states**, not the mere presence of a log line:

| Exit | Phase | Operator action |
| --- | --- | --- |
| `0` | Server CAS and per-record readback confirmed, final private receipt written | Keep `*_RESULT_V1` receipt and independently check the server state. No second import. |
| `2` | Failed **before invoking CAS** (invalid flags, frozen SHA, sheet A–O, digest, approval, confirmation, unauthenticated/wrong admin, nonempty root, empty-root preflight read timeout or input changed) | Correct the input/root and acquire a **new independent approval/snapshot** if anything changed. No DB commit was invoked by this CLI process. |
| `3` | **UNKNOWN after CAS attempt**; the request may or may not have committed, and readback or local receipt replacement could have failed | **STOP. Never retry.** Perform independent read-only server inspection and reconcile all identifiers/business values, approval digest and actor before any new decision. Escalate ambiguity; neither a missing ACK nor a missing final receipt proves rollback. |

The optional `--output` is required in **production** and must be a new absolute path outside the checkout, under private operator control; it must not preexist. The file is created as 0600 with a no-overwrite open before CAS and first contains `PR147_OPERATOR_FIRST_IMPORT_ATTEMPT_V1`. A verified import replaces that with `PR147_OPERATOR_FIRST_IMPORT_RESULT_V1`; an uncertain result is labeled `UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY`. If the process is killed before updating the marker, the original `CAS_MAY_HAVE_BEEN_SENT_DO_NOT_RETRY` remains. Always treat either marker as potentially committed. Do not put receipts or input workbooks in GitHub artifacts. Token is accepted **only through stdin**, not flags, saved input or receipts; public web API key is not the private Google ID token.

For a server reconciliation: obtain a fresh independently authorized **read-only full-root** snapshot; confirm `hdnd/items` count, each stable `recordId`, `displayCode`, STT, revision, every A–O business field, `updatedBy`, and any concurrent `hdnd` branches, against the approved source. The final result's `serverReadbackSha256` hashes the JSON snapshot as received by the client (serialization order can matter); it is not an independently canonical full-root digest. The approval's `fullRootSnapshotSha256` is an operator assertion, **not** proof verified live by this CLI. Therefore independent full-root oversight remains mandatory. A new ACK or workbook revision invalidates old approval.

### Synthetic rehearsal (never production)

The dedicated workflow [parallel-chat3-operator.yml](https://github.com/cavoixanh638/HopHDND-WebApp/blob/66e33b85a3424b2316f090e214e813cd04331afc/.github/workflows/parallel-chat3-operator.yml) tests the **actual** `node scripts/operator-first-import.mjs` with a synthetic A–O workbook on demo Auth/RTDB/Functions and FULL Rules. It includes negative preflight cases, wrong/unverified admin, seeded nonempty root and server no-change witness, and the existing FRV-02 empty-root CAS, readback and repeated-import block. Its triggers include only this branch and manual dispatch and it never deploys. The full command in an isolated Node22 checkout with emulator dependencies installed is:

```sh
npx firebase emulators:exec --project demo-hdnd --only database,auth,functions \
  --config firebase.staging.json \
  "node parallel-qa/chat3/operator-preflight.mjs && node parallel-qa/chat3/operator-lost-ack.mjs && node node_modules/vitest/vitest.mjs run parent-commit-service/test/integration.test.ts --config parent-commit-service/test/vitest.config.mjs --testNamePattern 'FRV-02 OPERATOR'"
```

The emulator fixture uses fake identities **only** on `127.0.0.1`; `--mode production` always has separate approval gates and no emulator hosts. On machines running concurrent QA, use separate worktrees and emulator port configuration; this CLI accepts localhost port numbers from the injected Emulator host variables, while the standard published staging suite uses ports 9099/9000. Never point a demo fixture at a live instance. In CLI errors no original Google token or raw workbook contents should be echoed. The workflow's final status, not its mere existence, determines a PASS.

### Reproducible lost-ACK and prewrite-network-outage drill

In the isolated GitHub Actions demo emulator, `parallel-qa/chat3/operator-lost-ack.mjs`
invokes the **shipped CLI**, not a mock writer or test-only replacement.
It uses the FULL RTDB Rules, synthetic Auth Emulator, and a local TCP proxy
on `127.0.0.1:19003` in front of the RTDB Emulator on `127.0.0.1:9000`.
The proxy decodes masked WebSocket frames **only in memory**, forwards the
actual `/hdnd/items` CAS, then suppresses its server-to-client response.
Neither the proxy nor QA directly writes the imported row; an independent
read-only Emulator REST witness confirms its final server state.

The CLI must exit `3` (`UNKNOWN`), not `0`/`2`; its private receipt must
show `UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY`. The real server must contain
exactly the approved A–O record; a later negative replay must exit `2`
without altering the server data. This confirms why UNKNOWN must **not**
be automatically retried. The script also tests an unreachable local RTDB
endpoint **before** CAS: exit `2`, no attempt receipt, demo root unchanged.

The drill only runs in an isolated demo emulator. It uses no real OAuth
credentials or live Rules and is **not** evidence of production safety or
authorization. A script's presence does not mean the test passed; always
inspect the exact-SHA CI run and the Chat 3 report.

### Clean receipt examples — illustrative, not authorization

Following an UNKNOWN operation, the private receipt can resemble:

```json
{
  "schema": "PR147_OPERATOR_FIRST_IMPORT_ATTEMPT_V1",
  "status": "UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY",
  "mode": "emulator",
  "sourceSha": "<exact 40-hex checkout SHA>",
  "project": "demo-hdnd",
  "databaseURL": "https://demo-hdnd.firebaseio.com/",
  "workbookSha256": "<sha256 of approved synthetic workbook>",
  "approvalSha256": "<sha256 of approved synthetic approval file>",
  "approvedSheet": "Approved",
  "rowCount": 1,
  "recordIdsSha256": "<sha256 of ordered ID list>",
  "uid": "<synthetic-emulator-user-id>",
  "startedAt": "<UTC ISO 8601>",
  "stoppedAt": "<UTC ISO 8601>",
  "readbackVerified": false,
  "nextAction": "READ_ONLY_SERVER_RECONCILIATION_BEFORE_ANY_NEW_ATTEMPT"
}
```

If the process is killed after the attempt marker but before it can update
the receipt, `status` may remain `CAS_MAY_HAVE_BEEN_SENT_DO_NOT_RETRY` and
`stoppedAt` may be absent. Neither proves that the server rejected the write.

A successful synthetic-only import writes a *different* final result:

```json
{
  "schema": "PR147_OPERATOR_FIRST_IMPORT_RESULT_V1",
  "mode": "emulator",
  "sourceSha": "<exact 40-hex checkout SHA>",
  "project": "demo-hdnd",
  "databaseURL": "https://demo-hdnd.firebaseio.com/",
  "operation": "EMPTY_LEGACY_ITEMS_CAS_ONCE",
  "workbookSha256": "<sha256 of approved synthetic workbook>",
  "approvedSheet": "Approved",
  "rowCount": 1,
  "uid": "<synthetic-emulator-user-id>",
  "serverReadbackSha256": "<sha256 of Firebase JSON readback>",
  "imported": 1,
  "verifiedAdmin": true,
  "readbackVerified": true,
  "legacyRootOverwrite": false,
  "usingAdminServiceBypass": false,
  "productionAuthorizedByThisCLI": false
}
```

All bracketed values are placeholders, **not** real approval or real
receipts. No Google ID token, private credentials or raw workbook cell
values belong in logged/committed evidence. The approval's
`fullRootSnapshotSha256` remains an external operator assertion;
the CLI cannot independently certify a production empty full root.


## COORD-01 — private receipt path containment on Windows/POSIX (02/11/2026)

**Prewrite safety requirement:** the `--output` receipt must be a new absolute file
**outside the Git checkout**, even if the entered path goes through a symlink or
Windows junction. Never store a production receipt in the repository.
The CLI continues to require a missing/new destination and creates the initial
marker exclusively with `wx` and private mode `0600` before any CAS attempt.

Earlier code tested `target.startsWith(checkout + '/')`, which failed to
identify a Windows child such as `C:\\repo\\HopHDND-WebApp\\private\\receipt.json`
because Windows uses `\\` as the directory separator.
The corrected CLI calls `scripts/operator-first-import-path.mjs` after
`realpathSync` of the checkout and destination's parent. Its shared helper
uses native `path.relative(checkout, target)` and rejects the checkout
itself, any child and nested child; it distinguishes `..` plus
`path.sep`, absolute relatives (notably a different Windows drive) and
same-prefix sibling names correctly.

A blocked inside-checkout output is a **pre-CAS HOLD (exit 2)** with
`PR147_BOOTSTRAP_HOLD_PRIVATE_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED`. The CLI
does not read the operator identity, connect to Auth/RTDB or write a receipt.
An allowed outside-checkout output **only passes this path preflight**;
it does not authorize an import. Without a Google ID token, the CLI still
fails safely with `PR147_BOOTSTRAP_HOLD_GOOGLE_ID_TOKEN_STDIN_REQUIRED`
and does not create an output file.

Regression commands (isolated worktree, Node22, dependencies installed):

```sh
# Pure helper under native POSIX and simulated win32 path semantics
node --test parallel-qa/chat3/operator-receipt-path.test.mjs
# Same file runs again under the native Windows job; this command is Windows-only
node parallel-qa/chat3/operator-windows-cli.mjs
```

The Windows runner invokes the **shipped**
`node scripts/operator-first-import.mjs` with an approved *synthetic*
A–O workbook, and verifies inside-repo root/children and junction paths
are HOLD while external/same-prefix sibling paths reach the missing-stdin
HOLD. The independent Linux job also runs the original Auth/RTDB/Functions
FULL Rules Emulator suite for successful empty-root CAS, prewrite network
failure, lost ACK UNKNOWN and denied replay on the exact candidate SHA.
No native Windows Firebase write test is claimed; no real credentials,
network writes, deploy or production approval are involved in the Windows
path-only CLI preflight.

Exact run/SHA and outcome: see
[Chat 3 report](../tasks/parallel-20261102/reports/CHAT_3.md);
a pending workflow does not constitute a PASS.
