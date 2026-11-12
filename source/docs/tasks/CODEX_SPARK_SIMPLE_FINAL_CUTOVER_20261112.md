# CODEX — Final one-time Firebase Spark cutover for simple JSON/Excel Admin (12 Nov 2026)

**Project:** `cavoixanh638/HopHDND-WebApp`, Firebase `hophdnd-8b7b2`, RTDB instance `hophdnd-8b7b2-default-rtdb`, region Singapore.

**Owner GO:** Complete the single production GitHub Pages website and first approved 59-row dataset. The owner explicitly chose **simple local JSON backup and restore**, no R2, Worker, secondary private vault, paid Cloud services or service-account key in the frontend. Normal future updates must be performed by Admin on the same website without Codex.

**Source:** release PR #173, branch `release/20261112-spark-simple-admin-main-candidate`. This is a one-commit clean source snapshot from PR #171 + PR #159 onto current `main`; NOT the unmergeable 1,217-commit PR #172. Verify current HEAD before acting. Do not re-do any PASS tests.

## A. Verification and controlled Firebase activation — Codex only

1. Confirm Firebase login/project/instance and Spark FREE billing, Google Auth (anonymous + Google), authorized domain `cavoixanh638.github.io`; do not enable Blaze, billing, Functions, hosting or new providers. Require exact project/instance match.
2. Read-only inspect live RTDB and published Rules. Prior independent audit: V2 active **null**; primary `/hdnd/items` **0 rows**, mirror **55**, unrelated root `/items` **9**; re-check live rather than trusting those historical counts.
3. Export **one simple local backup** of full current RTDB root and exact currently published Rules to files OUTSIDE this PUBLIC GitHub repository. Confirm nonempty, readable snapshot and preservation of mirror/root keys. Do not upload business records, backups, tokens, admin ID tokens or credentials to GitHub.
4. Use release candidate `source/firebase/database.spark.rules.json` (generated from `source/scripts/build-spark-rules.mjs`). CI must pass the exact Rules generation no-drift check. Perform a live readback comparison after deployment. Deploy **only** Realtime Database Rules, never default `source/firebase.json` (deliberately invalid). From `source/` use the explicit `firebase.spark-live-rules.json` configuration with `firebase deploy --only database --project hophdnd-8b7b2 --config firebase.spark-live-rules.json`. First confirm `firebase database:instances:list --project hophdnd-8b7b2` shows correct default instance; if multiple, use proper target binding and verify exact instance before deployment. Document exact Rules digest and receipt.
5. Emulator suite must verify that `hdnd/simpleMaintenancePermit` can be set only by verified Google Admin and permits `hdnd/items` replacement while FROZEN; guest and ordinary frozen cell writes denied. Do not relax `/.write`, `hdnd/.write` or give everyone Admin rights.
6. Original approved owner Excel: `Tổng hợp các ND kỳ chuyên đề và kỳ thường lệ cuối năm 2026 (2)(4).xlsx`; normalized easier import file in the owner's Họp HĐND Library: `HDND_2026_du_lieu_nhap_chuan_59_ho_so.xlsx`. **Not present in public GitHub repo.** Get actual bytes through user's authorized local/connected source; do not reconstruct rows from screenshots, summaries or mirror. Verify exactly **59 distinct ID rows and 885 A–O cells** and approved code mapping before writing. If unavailable, report precisely that the owner should use the Admin upload button once the page is published; DO NOT import 55 mirrors or invented data instead.
7. Option A: with actual approved file and authorized authenticated access, import via the exact same `SimpleAdminDataPanel` flow or equivalent scoped, verified transactional Admin call to **`hdnd/items` only**; verify 59 keyed rows and all 15 business values. Never run `database:set /` or `database:remove /`. No blind retry after unknown ACK; first compare current state. Preserve `/items` 9 and mirror 55. If approved file isn't accessible, leave primary empty and proceed to publish a safe admin-import-ready website after Rules success, then user imports the existing approved Excel using the website.
8. **No manual source switch is needed in public Spark Pages**: `App.tsx` fixes `selectedSource='primary'` outside historical test mode. Do NOT edit `hdnd/profile.dataSource` merely to force this switch. Check one Google Admin browser and one guest: List, report totals, grants, locks, frozen editing, history, no broken dropdown.

## B. GitHub Pages release — only AFTER Spark Rules GO

9. Clean release PR #173 currently based directly on `main` with one commit; check all focused CI and exact head, 57/57 Auth+RTDB Emulator, 14 parent local tests, TypeScript, Rules/no-drift, `build:spark`. Earlier generic Functions workflow failures already exist on the integration base; discriminate pre-existing failures from actual Spark release blockers. Do not merge untested changes.
10. Use GitHub merge PR #173 **only after exact Firebase Rules GO is evidenced**, updating PR from draft as appropriate. Confirm `main` head SHA after merge.
11. The new guarded `.github/workflows/publish-pages.yml` only publishes when repo Actions Variables `HOPHDND_SPARK_PRODUCTION_CONFIRMED=true` and `HOPHDND_PAGES_APPROVED_MAIN_SHA` = exact current `main` SHA; authorize them only for correct Rules-ready production. Trigger publish workflow on main. It MUST use public `npm run build:spark`, not `build:spark:operator` or loopback endpoint. Verify Pages and `version.json` / asset hashes at canonical URL:
    https://cavoixanh638.github.io/HopHDND-WebApp/
12. Once live, complete initial Excel import by Admin if not yet done; refresh and verify 59 rows appear immediately from Firebase primary without a source selector. Finish screenshot/browser smoke. Keep 9 root + 55 mirror unchanged.
13. When every step GO, update PR #173 with exact SHA, Rules hash, counts, source workbook fingerprint, Pages build URL, two-account smoke, billing remained free and any decision/rollback evidence. **No credentials/data files in PR.** If blocked, mark precise remaining blocker and assign only that one action.

## Safety, scope and status

- Approval to simplify backup is NOT approval to delete historical/unrelated branches or make public write access broad. No R2/Cloudflare; no new external hosting.
- Keep old local full-root backup only for one-time emergency rollback; normal Admin downloads simple `hdnd/items` JSON.
- One-time Rules publication + GitHub guarded main release are separate from data import; never claim them complete because emulator passed.
- **Current status at task creation:** source and 59-row synthetic Emulator CI PASS, release PR DRAFT; PRODUCTION Rules/pages/data untouched from ChatGPT. Real Firebase credential absent from ChatGPT; Codex must perform connected checks.
