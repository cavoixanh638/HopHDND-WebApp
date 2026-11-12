# PR160 post-merge integration acceptance

Status: **LOCAL INTEGRATION PASS / OWNER ACCEPTANCE PENDING / NO PRODUCTION**.

- Integration branch: `integration/20261112-spark-ui-69ceb`.
- Exact integrated source: `2c7c66c577ab987f1d834c964b9acf8890ebde6d` (PR160 merged
  into the selected integration branch; no `main` merge).
- Previous Spark/backend and UI acceptance: [PR159 integration checkpoint](PR159_SPARK_UI_INTEGRATION_2026-11-12.md).
- PR159 remains Draft. PR160 is merged only into the integration branch.
- Active QA worktree was based at the exact commit above. Product UI, Spark Rules,
  Firebase config and deployment files were not changed during this acceptance.

## New acceptance evidence on the integrated source

- `npm run typecheck`: PASS.
- Full Vitest suite: **958 passed / 127 skipped**, 136 passed files and 14
  skipped files. The skips are conditional tests from the existing suite.
- Focused visual-parity unit file: **3/3 PASS**.
- Builds: `build:compact:qa`, `build:spark`, and `build:spark:operator` PASS.
- Integrated full-App browser suite: **10/10 PASS** on real Auth and RTDB
  Emulators, with no Functions Emulator. It covers guest/admin desktop and
  mobile, authorization and readback, same-UID tab lock, retry after lost
  acknowledgement, popup editing, freeze/receipt, Excel preview/stage/commit/
  restore/lookup with a synthetic fixture, generation switch with an unsaved
  draft, dependent party-level behavior, and shared L03 widths after reload.
- Separate QA11 real-App preset test: PASS. It verifies cancel without write,
  one shared-profile CAS on confirmation, retained title/custom column, unchanged
  business rows and permissions, projected order and persistence after reload.
  This uses a synthetic disposable Emulator fixture.
- Actual 59-record rehearsal restore: PASS on the local `demo-hdnd` Emulator.
  The private rehearsal file's byte count and SHA-256 matched its manifest.
  The restore used root ETag/If-Match CAS against an empty Emulator, and
  full-root readback matched the rehearsal snapshot, including all 59 rows.
- Real-App vs local compact-QA reference browser run: PASS at 1920×1080,
  1600×900, 1440×900, 900×900 and 390×844. The real App rendered all 59 rows;
  the reference preview rendered its 27 synthetic rows. Both showed the same six
  list columns in order and no page-level horizontal overflow. The business data,
  permissions and freeze state were unchanged; no external requests or browser
  errors occurred. The real App's list table remains horizontally scrollable by
  design. The real App's table frame was 20–36 px wider than the reference.
  All six column widths matched
  at 1440, 900 and 390 px. At 1600 and 1920 px, flexible columns grew with the
  wider frame. The different datasets affect the card counts and row heights.
- The 59-row preview demonstrated both preset outcomes. Confirming an identical
  layout left revision 107 unchanged. A later confirmation with a different
  baseline advanced the shared profile from 117 to 118 and preserved the
  business-state hash. QA11 independently covers the explicit CAS path.
- [PR160 real-App UI parity workflow](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/43146865166)
  passed.

The local visual report and 10 screenshots are ignored QA artifacts at
`qa-results/pr160-visual-acceptance/`. Real-App screenshots show rehearsal data
and stay on the local machine. The public demo URL could not be fetched from this environment, so the
local reference was built from the unchanged compact-QA source in the integrated
checkout. Do not describe the public deployment itself as browser-verified.

## QA-only harness updates

The real-App full suite now opens the collapsed admin options before testing the
five L03 width controls. A new QA11 journey covers the integrated preset and its
shared-profile CAS. `scripts/pr160-real-app-visual-acceptance.mjs` captures the
real App and local reference at five viewport sizes, checks the list-column order,
page-level overflow, preservation of business state, and loopback-only network
use. These changes only affect test harnesses; the integrated product source and
Security Rules remain unchanged.

## Run the local preview

From `source`, install the locked dependencies with `npm ci` in the app,
`parent-commit-service` and `cell-edit-service`. Start the preview in PowerShell:

```powershell
$env:GCLOUD_PROJECT = 'demo-hdnd'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000'
$env:VITE_QA_DEFAULT_RTDB_NAMESPACE = 'false'
npx firebase emulators:exec --project demo-hdnd --config firebase.spark-test.json --only auth,database 'node scripts/start-spark-operator.mjs --emulator'
```

The real App is at `http://127.0.0.1:4173/pages.html`. Use the private rehearsal
snapshot for the 59-record view. The browser comparison also needs the local
compact-QA build served at port 4175. Run it with
`node scripts/pr160-real-app-visual-acceptance.mjs`, setting `CHROME_PATH` to a
local Chrome executable if Playwright's bundled Chromium is unavailable.

## Spark and production boundary

No Blaze upgrade, billing/API activation, production data write, production
Rules deploy, Pages deployment, or `main` merge occurred. The approved Excel
source remains 59 records/885 A–O cells and has only been validated/rehearsed
locally. In the ordinary Spark website configuration, a workbook can be
validated and previewed but the trusted full-replacement staging/commit flow is
not enabled. RTDB Rules do not independently calculate the trusted full-source
checksum/JSON integrity needed for safe replacement. Keep the existing
local-operator release gate; do not weaken Rules or silently turn on replacement.

The local backup/restore rehearsal is not evidence that production Rules were
independently re-verified or that production rollback is currently authorized.
Before any production operation, require owner acceptance/GO, independently
verify the live Rules and admin identity/IAM, create a fresh private backup and
prove restoration, then use the approved private operator release gate under a
separate production authorization. Until then, production import, Rules writes,
billing changes, Pages deployment and `main` merge remain **NOT RUN**.
