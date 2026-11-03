# A checkpoint — continuation after CSS cascade fix (2026-11-03)

**Status: IN_PROGRESS / TEST_PENDING — NOT DONE.**

Branch: `ui/20261103-table-cells`.
Entry SHA: `30b6fd3b31bc32a55790ab260f13da4a37e7c602`.
CSS patch: `cc8ed8e8f50d4466cee233833bc3f01895463a3d`.
Evidence commit: `1c2ff7c0bcc38627da4c0dc5bfcdd17bf37d398f`.
This checkpoint is a further commit. The actual current branch SHA must be checked after this write.

## Retain prior PASS / avoid rework

The entry commit already implemented content → department/type ordering; three flat named rows with shared state-value origin and source-specific highlighting; narrower ID header; added 4 unit regression scenarios; created a 12-fixture real-component Chrome browser runner and initial DOM trace. Previous *pre-fix* tests were: typecheck PASS, 3 unit files / 31 tests PASS, `build:compact:qa` PASS, diff check PASS. Chrome completed only the 1440/admin stage alignment/content order checks before failing vertical center. These are **historical**, not final-SHA PASS.

## New fix

Only owned file `source/src/features/items/item-frame.css` was modified. The existing middle vertical-align for note/specificProgress lost against the later app.css long-text top alignment because specificity was tied. A selector explicitly including `td[data-col-key]` now raises specificity from (0,2,2) to (0,3,2); content remains top-aligned and text alignment is untouched. Pushed fix commit `cc8ed8e8f50d4466cee233833bc3f01895463a3d` immediately following change.

## Verification since entry

- GitHub source STATIC PASS: compared the current real CSS texts; rule present; new specificity 0,3,2 > app rule 0,2,2; no content selector leak. Recorded in `evidence/A/verification-20261103.md`.
- `npm run typecheck` on final SHA: **NOT RUN**.
- Targeted Vitest on final SHA: **NOT RUN**.
- Real-app Chrome on final SHA: **BLOCKED / TEST_PENDING**. Two isolated Chromium CSS fixture attempts timed out before rendering (neither is valid real-app proof).
- Local checkout/build limitation: runtime `git ls-remote` cannot resolve github.com; no repo checkout and no React/Vite/Vitest packages are available. GitHub connector successfully reads/writes the branch.
- 900px/mobile, guest, writable/read-only mixed field, popup editable, picker/editor, colors, ID, and highlight exact-SHA acceptance: **TEST_PENDING**.
- Existing QA synthetic popup is read-only for target stage fields, so editable/mixed popup acceptance needs coordination with QA fixture owner. Do not change unowned QA file.

## Resume / remaining

1. On a workstation or CI runner with repository checkout, dependencies and functioning Chrome, first verify current branch HEAD. Run `cd source && npm ci && npm run typecheck && npm test -- tests/compact-group-highlights.test.tsx tests/compact-columns.test.ts tests/admin-compact-layout.test.ts && npm run build:compact:qa`.
2. Run `CHROME_PATH=<working Chrome> node tests/compact-table-cells-browser.mjs`, then extend browser acceptance for editable popup and mixed permissions, actual editor click and computed per-field colors/highlights (request QA fixture owner changes first). Save 1440/900/390 DOM trace, 900px/mobile screenshots, actual alignment measurements and tests for final exact SHA. Review original `evidence/A/dom-measurements.json` only as the pre-fix failing sample.
3. Fix remaining issues only within A-owned files; checkpoint/push after edit and tests. If all acceptance passes, change to DONE with exact-SHA evidence; otherwise retain TEST_PENDING.

No merge, no deploy, no changes to unowned source code or production permissions/data.
