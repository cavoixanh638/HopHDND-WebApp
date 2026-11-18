# G01 | Inline Admin List | 18/11/2026

## Branch and ownership
- Branch: `g01/20261118-inline-list`
- Verified immutable baseline: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`
- Pull request: https://github.com/cavoixanh638/HopHDND-WebApp/pull/212 (draft, not merged)
- Last feature commit: `102551f51f2d4dec7bdcf565532d52f3a2a378d4`
- Code SHA: see latest commit on branch after this checkpoint (checkpoint itself advances HEAD)
- Tested SHA: NOT_RUN locally; CI run targeting feature SHA `102551f51f2d4dec7bdcf565532d52f3a2a378d4` pending
- No merge, release, Firebase production write, Rules changes, package changes or secrets.

## Changes
1. `ItemList.tsx`: explicit Admin-only **Chỉnh giao diện** mode with **Xong**, title input inline (double-click/pencil; Enter saves; Esc cancels); existing shared-layout writer `applyViewerLayout` supplies optimistic preview/CAS and rollback.
2. `ColumnHeader.tsx`: editor menu only in opt-in visual mode; rename and hide without colliding with sort, pointer drag or resize controls; keyboard focus returned after editing.
3. `ItemSummaryCards.tsx`: C01–C03 own hide buttons only during visual edit; C00 remains immutable; status chips preserve existing selection/filter actions.
4. `ItemList.tsx`: restore hidden columns and summary cards, source fields are never removed; search field and selected browser-only columns beside actual unaccented search input, existing AND search/filter behavior retained.
5. `inline-g01-layout.ts`: pure safe transformations. `inline-g01-list.css`: desktop/narrow focus+popover styling.
6. `inline-admin-g01-layout.test.tsx`: synthetic invariants for Excel keys, rename/hide/show, C00, SSR guest vs editor, sort affordance.

## Tests and evidence
| Check | Result | Evidence or limitation |
| --- | --- | --- |
| Baseline/head and ownership | PASS | GitHub API branch at baseline; only G01-owned TSX + new `inline-g01-*` and test/docs paths |
| Code committed and pushed | PASS | GitHub branch commits up to `102551f51f2d4dec7bdcf565532d52f3a2a378d4` |
| Pull request opened against main | PASS | PR #212, draft |
| Pure transforms, role SSR cases | NOT_RUN | Test source created; CI queued, not yet completed |
| `npm run typecheck` | NOT_RUN | Container has no repository clone/npm dependencies and cannot resolve github.com |
| `npm test` | NOT_RUN | Same environment limitation; GitHub Actions Verify Source started |
| `npm run build:compact:qa` | NOT_RUN | Await GitHub Actions runner results |
| Emulator `npm run test:spark` | NOT_RUN | No local emulators; no production credentials used |
| Chrome actual 1920x1080 / 900px / narrow, keyboard / drag | NOT_RUN | No browser workspace; CI real-list Chromium jobs queued |
| Two-admin CAS and rejection rollback on actual Firebase | NOT_RUN | Production expressly prohibited; use mock/staging and G00 integration |
| Excel A–O data / permissions untouched | PASS (source inspection) | No change to source schema, data writer, Rules, column drag/resize components |
| Real integrated WebApp acceptance | NOT_RUN | G00 merge/integration and end-to-end QA required |

## G00 integration handoff
- G01 does not edit `App.tsx`, `ItemColumnPanel.tsx` or `ColumnResizeHandle.tsx`; existing `onPersistViewerLayout` is the only shared CAS writer.
- Confirm owner controls remain permission-gated; status colors and data editing are independent.
- Test hidden grouped columns with G08's compact presentation, and header/pointer interactions with G07's resize controls after integration.
- Re-check narrow viewport menus and 1920x1080 layout using actual browser screenshots.
- Keep PR unmerged and release gate untouched until CI and G00 acceptance.
