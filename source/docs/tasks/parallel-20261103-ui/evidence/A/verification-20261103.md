# Stream A — scoped verification, 2026-11-03

## Provenance

- Baseline: `30b6fd3b31bc32a55790ab260f13da4a37e7c602`.
- CSS fix commit: `cc8ed8e8f50d4466cee233833bc3f01895463a3d`.
- Scope: `source/src/features/items/item-frame.css` only. No production data, permissions, merge, or deploy.

## Root cause and fix

The existing `app.css` generic selector for long-text columns sets `vertical-align:top` on `content`, `note`, `specificProgress`. A previous feature stylesheet rule targeting just `note` and `specificProgress` had equal specificity, and the later app stylesheet prevailed. The feature stylesheet override now adds `td[data-col-key]` so the middle alignment wins even if stylesheets are loaded in either order.

GitHub source inspection and static selector verification:

| Check | Result |
|---|---|
| New `item-frame.css` selector and middle declaration are present at HEAD | PASS |
| Later `app.css` selector and top declaration still present (not modified) | PASS |
| New specificity (0,3,2) higher than old (0,2,2) | PASS |
| `content` excluded; source text alignment/edit affordances not changed by patch | PASS (static) |
| Previous 3 unit files / 31 tests | PASS only at pre-fix WIP baseline, per prior checkpoint |
| Full `npm run typecheck` on final SHA | NOT RUN |
| Full `npm test -- ...` on final SHA | NOT RUN |
| Real component Chrome 12-fixture suite | BLOCKED |
| Mixed permission / editable popup editor interactions | TEST_PENDING |

## Environment blockers / reproducibility

The task runtime can use the connected GitHub API but `git ls-remote https://github.com/cavoixanh638/HopHDND-WebApp.git` in the code execution container fails with `Could not resolve host: github.com`. The repository is not present locally. Node is installed but the application `react`, `vitest` and `vite` dependencies are absent. An isolated static HTML/CSS Chrome smoke fixture (not the actual app) was attempted twice with the available `/usr/bin/chromium`, both times timed out without a DOM output, including with DISPLAY/DBUS unset. This is a tooling block, **not** evidence that the UI failed or passed.

## Remaining acceptance

Run real `source/tests/compact-table-cells-browser.mjs` against a build of the **final** branch SHA with `CHROME_PATH` set to a working browser. Record admin/guest, editable/readonly cells, popup (including writable and mixed permission), 1440/900/390, three stage value x origins, ID 52px no overlap, centered note/progress, department/type order and style, editor action, colors and field highlights. Store screenshots and DOM trace, then run final exact-SHA `npm run typecheck`, relevant Vitest and bundle QA. The existing synthetic QA popup fixture does not enable edit for the target fields; coordinate expansion with the owner of `src/qa/compact-qa-main.tsx` rather than editing an unowned file.

**Status: IN_PROGRESS / TEST_PENDING**, not DONE.
