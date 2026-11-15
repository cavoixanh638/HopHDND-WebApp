# HopHDND WebApp

GitHub Pages serves the generated **`index.html` at the repository root**. Source code, tests, configuration and documentation live under **`source/`**.

When source changes reach `main`, [the publish workflow](.github/workflows/publish-pages.yml) runs TypeScript checks, unit tests, Spark Auth/RTDB Emulator tests, security checks and `npm run build:spark`. It commits refreshed root `index.html`, `assets/` and `version.json` only after successful checks. Pull requests are checked separately by [verify-source](.github/workflows/verify-source.yml).

**UI-only deployment does not require updating GitHub Actions variables.** The release guard ([source/scripts/pages-release-policy.mjs](source/scripts/pages-release-policy.mjs)) checks **all unpublished commits since `version.json.source_sha`**, not just the last commit. Approved presentation paths (styles, selected List components, width helpers and UI QA) publish automatically after passing build/tests. A change to Firebase Rules, authentication, shared data contracts, privileged data flows, dependencies, workflow logic or another unlisted path **continues to require `HOPHDND_PAGES_APPROVED_MAIN_SHA` matching the exact `main` commit**. The one-time `HOPHDND_SPARK_PRODUCTION_CONFIRMED=true` gate and separately verified status-CAS Rules hash remain mandatory. This Pages workflow **never deploys Firebase Rules or writes production database data**.

The first policy transition from the already-reviewed UI fix (#198) is pinned to the previous published source/parent SHA; future changes to release policy itself are **not** UI-only and remain gated.

To develop locally: `cd source && npm ci && npm run dev`. To build manually: `cd source && npm run build:pages`. Never edit the bundled HTML as a substitute for TypeScript.

For architecture and status, see [source docs](source/docs/README.md) and [current state](source/docs/CURRENT_STATE.md). This repository is **not automatically synchronized back to the user's Windows / Google Drive workspace**; Firebase Rules and Sheets business data are managed separately.
