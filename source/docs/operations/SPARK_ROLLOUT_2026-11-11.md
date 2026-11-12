# Spark takeover — 11/11/2026

> Active integration since 12/11/2026: [PR159 Spark + latest UI](PR159_SPARK_UI_INTEGRATION_2026-11-12.md).
> Continue that branch/checkpoint; this document retains the earlier Spark evidence.

Status: **EMULATOR PASS / PRODUCTION HOLD / UI IN PROGRESS**. Owner forbids Blaze,
billing and chargeable infrastructure. No production data, Rules, API, billing or
Pages deployment changed by this work. The local-operator alternative is awaiting
the owner's acceptance; the owner's question about import duration is not consent.

## Inherited checkpoint and live read-only findings

Continue [DEPLOY_TRIAL](../tasks/parallel-20261102/handoffs/DEPLOY_TRIAL.md) and
the integrated code `66e33b85a3424b2316f090e214e813cd04331afc` through docs HEAD
`b73643d247b5ee8b58586cd85407b9265004f1c6`. Do not reopen PASS workstreams.
Source is on `feat/spark-rtdb-20261111` in the separate takeover checkout.

Authenticated Firebase Management API confirms project `hophdnd-8b7b2` ACTIVE,
number `514129334433`, and the existing ACTIVE Singapore instance:
`https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app`.
The Console `Cannot read properties of undefined (reading '0')` is not evidence
of an absent database. No recreation is needed. Billing is false; Functions API
is disabled. The exact Console frontend exception's cause has not been established.

The live root contains `hdnd`, root-level `items` and `settings`. Primary
`hdnd/items` and `datasetV2` are absent; mirrors/profile/grants already exist.
Never treat this as an empty root or overwrite the root for first import.
Live Rules are legacy and have **not** been replaced with Spark Rules.

## What the two Functions did and the Spark alternative

| Existing component | Security responsibility | Spark implementation |
| --- | --- | --- |
| `cellEdit`, asia-southeast1 | Acquire/renew/release leases, save/resolve, authenticate caller, protect same-account tabs, CAS, truthful bounded history | Direct Auth + RTDB transactions + complete Rules; separate RAM-only anonymous Firebase principal per Google tab bound by the verified Google owner |
| `parentDatasetCommit`, us-central1 | Activate/replace/restore whole datasets; decode and hash candidates/backups; verify committed provenance; atomically retain generations, rights, history and operation journal | Existing handler and commit engine executed locally, loopback-only, with verified Google ID token and Rules-scoped `parentCasService` override |

RTDB Rules cannot run this engine's SHA-256/JSON decoding and arbitrary collection
verification. Moving those checks into a public browser would let an altered client
claim its own validation. This implementation retains a trusted local operator for
whole-dataset changes. It does not claim a browser-only bulk commit solution.

Employees keep GitHub Pages and direct Spark cell editing. For whole-dataset work,
the administrator opens the local operator UI on `http://127.0.0.1:4173` and signs
in with the existing Google admin account. Only that origin may call the local
endpoint on port 8787. No cloud function is deployed. The browser never receives
CLI OAuth credentials or a service claim. The service uses the existing
`databaseAuthVariableOverride`; it does not write with an unrestricted Admin SDK.

Tab bindings expire in 30 minutes and are renewed while working. Lease ownership
uses the actual authenticated tab UID; copying public UID/token/proofs cannot
impersonate it. Verified Google identity remains the owner of the binding. Audit
actors are tab UIDs traceable through retained bindings. Existing 50-entry history
retention is unchanged; this does not promise permanent unlimited history.

## Verification and source protection

| Check | Result |
| --- | --- |
| Complete app unit suite | 846 PASS, 117 conditional skips, including the new release-gate tests |
| New production release gate | 11 PASS, including absent consent/UI/review, stale checkpoint, altered backup/restore/live data/Rules and dirty/wrong source |
| Existing complete Rules + direct Spark edits | 44/44 PASS, real Auth Emulator identities, including two tabs of the same Google owner, leases, races, freeze and history |
| Actual local operator + unchanged parent commit engine | 14/14 PASS; activate/replace/restore, lost ACK, forged backup denial, rights/pointer race and historical generations |
| Authoritative 59-row private snapshot rehearsal | 1/1 PASS via both existing API and guarded CLI; all 885 business cells match, unrelated branches preserved, second API import rejected |
| Cold full-root live backup and live Rules restore | PASS on isolated RTDB Emulator 9198, exact canonical data and compiled Rules readback |
| Post-import snapshot restore | PASS on isolated Emulator through the inherited hardened backup auditor |
| TypeScript and public/operator Spark builds | PASS; existing bundle-size advisory remains |
| Actual browser guest List and note flow | PASS: on `http://127.0.0.1:4173` against `demo-hdnd` Auth/RTDB Emulator, guest note save received server ACK and appeared in real history; a second independent tab was denied the same-cell edit lease; edits to different fields on the same row merged at revision 4 and the owner Emulator readback confirmed both values |
| Actual browser admin/freeze/report flow | PASS: explicit visible `(Emulator)` sign-in via the Auth Emulator helper; admin completed OPEN → DRAINING → FROZEN, received a three-row receipt, guest became read-only in realtime, admin reopened editing, and report popup showed both edits |
| Actual browser editable popup | PASS after clean reload: note save received server ACK, appeared in the other guest tab in realtime, and real history listed the new entry |
| Actual browser Excel | PASS selecting the normalized approved workbook, explicitly selecting its sheet, parsing and previewing 59 records; UI staging/activation/restore NOT RUN |
| Production deploy/import/real two-user smoke | NOT RUN |

`test:spark` starts only Auth and RTDB; the runner explicitly refuses a Functions
Emulator. Do not interpret conditional Emulator/browser skips in the unit suite as
passes. Emulator success does not establish live OAuth/IAM behavior.

Generated Rules: `firebase/database.spark.rules.json`, 202387 bytes, SHA-256
`70d71bf4c91f719835f1d923e49aa3329d255392f2f970221f0b526319bf3044`.
Generator reads the unchanged complete exclusive candidate, preserves all field,
history, freeze, generation and parent service boundaries, adapting only cell/lease
identities and adding strict owner-managed session bindings. Default deployment
sentinel and the old reviewed Functions architecture remain unchanged.

Private backups and source files are outside this checkout and must not enter Git:

- Original approved workbook SHA-256:
  `df91c303156ddcab7ade143ea21e0dd5110e7ed8dd7dfe7614689cd194dd8fca`.
- Parser-ready derivative SHA-256:
  `3d30bb7ab0363a958f30db51c7df7f29591b8fba610bfc4055270230a4cd1d4d`.
  Formula IDs NQ1–NQ47 match independently checked cached values; BC01–BC12 stay
  unchanged. All A–O business cells match the original. No source workbook edited.
- Live full-root backup SHA-256:
  `b676fc4858661ba71cae738435163e8352a49e139b47f9f60523b95956879696`.
- Original live Rules SHA-256:
  `2654ac663f154c24f32bb3a68fea307b68e333eb24664459d7ecb861f794e662`.
- Private checkpoint: sibling `firebase-takeover-20261111/private/20261111-215907`.
  Contains byte-bound manifest, double exports, restore verdict and private import
  verdict; synthetic CLI approvals are demo-only and cannot authorize production.

## Reproduce locally

From `source`, install the locked dependencies and Java required by the existing
Firebase CLI. Install `parent-commit-service` with its own lockfile. Then:

```text
npm run rules:spark
npm run typecheck
npm test
npm run test:spark
npm run build:spark
npm run build:spark:operator
```

For the private 59-row rehearsal, provide absolute `SPARK_APPROVED_XLSX` and
`SPARK_PRIVATE_CHECKPOINT` before `test:spark`. Without these the private test is
explicitly skipped. Those inputs are never checked into GitHub.

For UI testing, use the existing Firebase CLI command with only `auth,database`,
project `demo-hdnd`, config `firebase.spark-test.json`, and command
`node scripts/start-spark-operator.mjs --emulator`. Run
`node scripts/seed-spark-browser.mjs` with `GCLOUD_PROJECT=demo-hdnd` for a disposable
three-row fixture. These seed/test tools have fixed loopback endpoints and guards.
The UI fixture and dev server must use separate Vite caches (`.cache/spark-fixtures`
and `.cache/spark-dev`); sharing `.vite` caused the earlier missing `useEffect`
startup error. Emulator administrator sign-in is the explicit visible `(Emulator)`
choice backed by the existing Auth Emulator helper, enabled only for pages-test,
Spark, and emulator services. Production Google popup login is unchanged.

## Coordination preferences

The owner requests parallel work across independent scopes and Luna for simple
tasks. The root agent owns integration and security decisions. Do not repeat a
completed PASS without a changed scope, and do not infer production authorization
from emulator work or other approvals.

## Remaining release gates; do not mark them PASS

1. Owner accepts the local operator workflow. Finish actual browser acceptance:
   Excel operator preview, editable popup, login/logout, refresh, and any remaining
   acceptance evidence. Record screenshots and readback. Guest List/note/history,
   same-cell two-tab denial, merged different-field edits, admin freeze/receipt,
   realtime read-only, and report popup have emulator browser evidence; they are
   not production OAuth or real-user evidence.
2. Independent security review of the generated complete Spark Rules and local
   operator credential/IAM behavior. Do not weaken Rules to fix an IAM failure.
3. Fresh private full-root + original Rules backup, double read and restore drill,
   then exact production Rules deploy/readback under a separately recorded GO.
4. The production local operator additionally requires a private
   `SPARK_OPERATOR_RELEASE_V1` file outside the checkout. It binds exact clean Git
   HEAD, project/URL, Rules file SHA, backup manifest, successful restore evidence,
   a <=15-minute checkpoint, independent review reference, UI verification, owner
   local-operator acceptance and production GO. Startup performs authenticated
   GET of live root and Rules and refuses a mismatch. Environment flags alone
   cannot start the production handler.
5. Build the operator package, then launch
   `node scripts/start-spark-operator.mjs --release-file ABSOLUTE_PRIVATE_FILE`.
   This starts a local static preview, not a cloud deployment. A failed gate stops
   both child processes. No production release file has been created or used.
6. First import uses the protected CLI with exact source SHA/workbook SHA and
   `LEGACY_ITEMS_EMPTY_IN_FULL_SNAPSHOT`, Spark-specific independently verified
   backend gate and private receipt. Never use a root PUT or replace/delete command.
   Read all 59 records/885 cells back; compare all other branches; take a new backup.
7. Only after verified import and release GO switch the existing profile to primary,
   publish the exact tested Spark Pages build and perform real two-Google-user
   smoke. Unknown ACK means read-only reconciliation, never a blind retry.

Later Excel imports should reuse the installed operator and tested pipeline:
open local tool, choose Excel, review comparison, confirm operation. The initial
architecture implementation/review is not repeated for every workbook. Still take
and validate a fresh backup before replacement; never skip safety for speed.

## Spark operating limits

### Checkpoint 12/11/2026

- Root coordinated two Luna agents for scoped verification and handoff review.
  Latest delta: TypeScript PASS, 46 relevant unit tests PASS, docs links PASS,
  public and local-operator builds PASS. No emulator test assertion/helper in
  either production output. Earlier 846-unit and 59-Emulator results are inherited,
  not newly rerun for this UI-only delta.
- Fixed separate fixture/dev Vite caches; added visible, strictly pages-test +
  Spark + connected-Emulator admin login; production OAuth popup remains unchanged.
  Local-operator copy now accurately identifies writes to configured Firebase.
- Browser Use was removed from the available tools before UI bulk staging.
  Windows Computer Use fallback stopped because it could not confidently determine
  Chrome's current URL to enforce policy. No bypass attempted. This is distinct
  from the previously resolved browser permission setting.
- Remaining: resume UI staging/activation/restore when supported browser control
  returns; complete logout/refresh acceptance and independent Rules/IAM review;
  obtain local-operator workflow acceptance and production GO, refresh private
  backups/restore evidence before deploying Rules or importing production.
- Production mutations, billing changes and deployments remain zero. The owner
  authorized publishing code/checkpoints on the separate GitHub branch only.

Official [pricing](https://firebase.google.com/pricing) and
[RTDB limits](https://firebase.google.com/docs/database/usage/limits) list Spark
100 simultaneous connections, 1 GB stored and 10 GB/month download. A Google
editing tab can hold two database connections (primary reader plus editing session),
so 100 connections does not mean 100 simultaneous editors. Capacity testing and
usage observation remain necessary; no paid upgrade is authorized. The local
operator has to be running for whole-dataset changes. Public Pages alone cannot
provide that specific trusted cryptographic bulk-commit capability in this design.
