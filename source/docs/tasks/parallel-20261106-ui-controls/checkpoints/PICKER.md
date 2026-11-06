# PICKER checkpoint — 06/11/2026

Status: CODE_WIP_TEST_PENDING — **NOT DONE**
Owner branch: `ui/20261106-picker-restore`
Baseline: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`
Reference: `ab8629c7575debd494c908c14bde9967a575a82a`
Initial remote HEAD: `0eede66c4f8c05d416084aeab08fd5a030f5bc80` (branch ahead baseline 9 commits, docs only).
Initial checkpoint SHA: `4feba0b4d19e7955fc9af894ff27ea617b6d910f`
Current code SHA (before this checkpoint): `494c1e74320a3dd124d99eb3b32b0d49d67c59f2`
Tested SHA: **NONE**; no DONE.
Dirty tree: GitHub remote ref is committed; **no verified local worktree**. Container DNS cannot resolve github.com, so clone/real-build blocked. GitHub connector read/write succeeds.

## What changed, with explicit owner boundaries

- `source/src/features/items/item-frame.css` (code commits `5b7c952e`, `83bdd57c`): remove only L04/staff and standalone leader selectors from multi-field unified picker skin. Existing reference skin remains in `app.css` and early `item-frame.css` rules. Keep all metadata and L03 geometry/width selectors as baseline. Append *data-button-only* triangle pseudo rules for editable CellPicker, not select/filter/nav/settings. One 6×4 px filled downward `currentColor` triangle, no border glyph/rail. `::before` rail suppressed only on L03 status picker, not neighboring fields; disabled `::after` hidden. All schema/data/lease code untouched.
- Deterministic real React `ItemList`/`ReportDetailGrid` test fixture `source/tests/ui-20261106-picker-fixture.tsx`, `source/ui-20261106-picker-fixture.html`: synthetic, same data/layout on reference/baseline/after, list/popup, mixed/guest/edit, short/long personnel, no Firebase; independent test prefix.
- New `source/scripts/ui-20261106-picker-browser.mjs`: local Vite + real Playwright Chromium, 1440/900/390, four L04 fields, popup, hover/focus/open, pointer and keyboard ArrowDown/Enter/Escape, caret computed style, screenshots, rects and JSON; no network outside localhost. **Script committed but not executed.**

## Selector/skin contract

Reference: `ab8629c`; `CellPicker.tsx` and `cell-picker.css` byte-identical baseline/reference (blob `ae627581fd10a7c84b3d120be713cd9754e23886` and `f146d8b2351cea084bc533bb32173b2cff415a7f`). Historical L04 skin at `item-frame.css:604-609,723`: `.compact-pair-lines`, `.compact-pair-tag`, `.compact-part .cell-picker-trigger`, 26px min-height, 4×7px padding, 11px font, no forced 36px/12px unified override; `app.css` retains original editable hover/focus/3D for list and popup.

Current unified rules previously forced `:is(.item-data-table,.report-detail-grid) tbody td .compact-pair-lines [data-ui-picker-skin="standard"] button.cell-picker-trigger`, and `td[data-col-key="ubndLeader"|"vpLeader"]` into 36px / 7×9px / 12px / subdued no-lift hover. These scope branches are now removed from unified selectors only; L01/L03 subgrid remains intact. Their caret now uses `:is(.item-data-table,.report-detail-grid) tbody td button.cell-picker-trigger:not(:disabled)::after` with filled clipped triangle. L03 status has a narrower `.compact-stages[data-rev2="true"] .compact-stage-state[data-editable="true"]` override for its existing grid-column 2, and `::before{content:none}` on the same status only. **No `:nth-child`, no global `button`/`select` rule, no TRACKS file change.**

## Outstanding acceptance (not claimed)

1. Need exact SHA TypeScript/unit/browser real render, screenshots **before/reference/after**, and measured rects for all four personnel fields in list and popup normal/hover/focus/open, 1440/900/390 and long text. Current CSS diff is code-only; browser and screenshot work NOT DONE.
2. Need browser verification of 6 other picker fields, colored statuses, permission locked/mixed/disabled, pointer, focus/Enter/Arrow/Escape and RAM save. Need check no regression to status palette and `.compact-stages` geometry.
3. Need verified complete CI/build artifact/hash on exact code SHA before state DONE; Emulator only if backend affected (none here).

## Next 3
1. Validate script and TypeScript via isolated installed deps/CI (runtime container cannot clone via DNS; avoid claiming testing).
2. Re-render same fixture on ab8629c, baseline and final SHA; inspect differences and fix any CSS, test failures and caret geometry.
3. Store screenshots/rects/tested SHA, update checkpoint to DONE only after PASS; report commit/checkpoint to COMMANDER without merge/deploy.
