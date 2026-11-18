# G01 | Inline Admin List | 18/11/2026

## Branch and ownership
- Branch: `g01/20261118-inline-list`
- Verified immutable baseline: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`
- Pull request: https://github.com/cavoixanh638/HopHDND-WebApp/pull/212 (draft, not merged)
- Last feature commit before checkpoint revision: `e43a58c3d6ee4d1ab55f64461cbda845ef29dc27`
- Code SHA (feature code, exact GitHub SHA): `e43a58c3d6ee4d1ab55f64461cbda845ef29dc27`. Checkpoint-only commits may subsequently advance the branch HEAD.
- Tested SHA: NOT_RUN / no all-green verification yet. Initial candidate `102551f51f2d4dec7bdcf565532d52f3a2a378d4` FAILED TypeScript parsing; defects fixed on later commits. GitHub Verify Source run #44290328668 for feature SHA `e43a58c3d6ee4d1ab55f64461cbda845ef29dc27` is queued.
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
| Code committed and pushed | PASS | GitHub branch commits up to `e43a58c3d6ee4d1ab55f64461cbda845ef29dc27` |
| Pull request opened against main | PASS | PR #212, draft |
| Pure transforms, role SSR cases | NOT_RUN | Test source created; CI queued, not yet completed |
| `npm run typecheck` | FAIL (initial candidate), NOT_RUN (current SHA) | GitHub Verify Source run #44289932069 failed TS1005 at ItemList.tsx:979 and the test lines 57/59. Both syntax defects committed as fixes; current run #44290328668 queued. Local container has no repository clone/npm dependencies and cannot resolve github.com. |
| `npm test` | NOT_RUN | Initial CI stopped at typecheck; current GitHub Actions Verify Source queued |
| `npm run build:compact:qa` | NOT_RUN | Current GitHub Actions runner queued; no browser fixture evidence yet |
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

## CI correction log
- 18/11/2026: initial PR Actions Typecheck **FAIL** (TS1005 in new JSX and test). Fixed in commits `ea32a754bffebc7cbed62367f76454a34ac35f5e` and `0ca9936e35ac72a2b43595e45f3f529c374da705`; subsequent focus and visibility fixes are included through `e43a58c3d6ee4d1ab55f64461cbda845ef29dc27`.
- Verification link: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290328668 . Queued is **NOT_RUN**, not PASS.
- PR remains draft; **G01 NOT DONE** pending reproducible typecheck, unit, emulator/browser results and G00 QA.
