# Họp HĐND — one canonical Spark Pages URL (12 November 2026)

**State: RELEASE PREPARED; production data/Rules and Pages NOT changed.**

Canonical **daily-use** URL (after the one-time authorized cutover):
https://cavoixanh638.github.io/HopHDND-WebApp/

Both ChatGPT and Codex edit ONE GitHub repository, `cavoixanh638/HopHDND-WebApp`. GitHub Pages hosts only the public frontend; Firebase Realtime Database `hophdnd-8b7b2` holds the authoritative business records, access policies, leases and audit. An up-to-date static HTML page is *not* evidence that 59 real records were imported or the production Security Rules are correct.

## Source and release gates

- Exact integration baseline at handoff: `integration/20261112-spark-ui-69ceb`, `6e4c65eea309b75469d32c24605e9074cbd400b0` (including PR161 dropdown fix). Re-read GitHub before cutover and record any later commits.
- The existing root `main`/Pages publish pipeline is still legacy until this PR is accepted. This branch prepares a replacement; it does **not** publish anything now.
- Use `npm run build:spark` for the public site, **never** `build:spark:operator`, legacy `build:pages` with a Functions HTTPS endpoint, or the RAM demo.
- The adjusted `.github/workflows/publish-pages.yml` requires BOTH `HOPHDND_SPARK_PRODUCTION_CONFIRMED=true` and `HOPHDND_PAGES_APPROVED_MAIN_SHA` equal to the exact main commit. Historic `HOPHDND_RELEASE_BACKENDS_CONFIRMED` does not unlock Spark.
- On a GO-approved SHA it runs npm ci, typecheck, unit tests, Spark Auth+RTDB Emulator, docs check and public Spark build; verifies no loopback bulk-operator endpoint was bundled; preserves previous hashed assets for browsers using cached HTML; then publishes `index.html` and `version.json` containing the approved source SHA.

## Required one-time Firebase work (authorized connected operator only)

1. Read-only check the live Firebase instance and **published** Rules, including Auth authorized domains and the public-vs-employee read policy. GitHub Pages assets are public. Firebase Security Rules, not frontend hiding, must guard private data.
2. Take two independent full-root and published-Rules backups outside GitHub; check restore. Verify the approved original Excel and its 59 IDs / 885 A–O cells.
3. Independently review/deploy/read back full **Spark** Rules and production identity/lease policy. No Blaze, Cloud Functions or weakening Rules to pass a test.
4. Protected one-time local operator import/activate after maintenance freeze with exact release/approval file. Read all 59 records/885 values back, preserve unrelated root branches, record operation receipt; reconcile unknown ACKs, never blindly retry or overwrite.
5. Confirm Google login domain `cavoixanh638.github.io` in Firebase authorized domains and run real two-user/guest/admin smoke: data, edit, lock, audit, freeze, reports and UI layout.
6. Only after separate recorded GO, merge exact tested candidate and this release workflow into `main`, set the two release vars above, run the guarded Pages publish and verify live `version.json`/Firebase readback.

**Do not infer that the user asking for one URL authorizes blind root deletion, Rules weakening, billing changes or upload of private workbook/backups to GitHub.**

## Normal operation once launched

- Staff uses **only the canonical GitHub Pages URL** for daily viewing, filtering, editing and reports; there is one Firebase production dataset. The localhost server is only an occasional privileged maintenance tool, not a second daily WebApp.
- ChatGPT and Codex can independently make GitHub code PRs; after review and CI, each exact new main commit requires approval to publish. The stable URL does not change.
- On new Excel upload, the normal Pages UI already supports file inspection, A–O parsing and comparison without writing. **Whole-dataset replace/activate/restore currently requires the protected local Spark operator**, not just public GitHub Pages. A trained authorized operator can do this without Codex once the one-time setup is complete. Code-only UI updates need no Codex.
- To eliminate the local operator entirely, separately design an authenticated online trusted bulk-import/backup service, secure secrets and audit, review its cost/security, and then connect it to the same single Pages UI. **Do not claim that service exists today.**
- Firebase Rules, initial/periodic protected imports, user Auth configuration, backup/restore, billing and incident response still need a connected authorized tool/operator (Codex, or ChatGPT only after an appropriate Firebase connection is genuinely available).

## Production acceptance checklist

Exact source SHA and Rules fingerprint; fresh full-root/Rules private backups plus restore result; 59/885 source verification and live readback; Google auth authorized domain; guest/employee/admin edit and audit tests; UI parity and responsive screenshots; published `version.json`; no unresolved ACKs; no production billing; no accidental historical Rules or Functions deployments.
