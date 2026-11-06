# CONTENT checkpoint — 07/11/2026

## Own scope: DONE — standalone feature accepted on GitHub Actions
Branch: `ui/20261107-picker-parity-content`; reference App SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
**Own application + test code SHA / exact tested SHA: `9fb74b7fda1ab4492011dc675df5d656e74f6000`**. This subsequent checkpoint commit is docs-only and does not change tested code.

**CI:** [run #42269772715](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715) — **SUCCESS** at `9fb74b7fda1ab4492011dc675df5d656e74f6000` (each step completed/success).
**Evidence artifact:** [#13527674364](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715/artifacts/13527674364), `picker-parity-content-42269772715-9fb74b7fda1ab4492011dc675df5d656e74f6000`, 13,083,947 bytes. Includes browser PNG/JSON computed styles/rects, normal/hover/focus/open and `before/` matching baseline screenshots from untouched e095 detached worktree.

## Implementation: own files only
1. `source/src/features/items/picker-parity-content.css`: L01 Sở trình + Loại VB, field-only 26px min height / 4px×7px / Segoe11/550/1.35 / 6px radius / 5px×3px filled caret / 8px gap / content-fit + max100%, centered one row, readonly 13/400 and original parenthesized metadata; preserves type tones and individual highlight, field-only hover/focus lift 3px, blue outline/shadow 180ms, preserves background, reduced-motion/print.
2. `source/src/features/items/CompactGroupedValue.tsx`: only scoped CSS import; no other shared DOM changes.
3. `source/tests/picker-parity-content.test.tsx`: markup + permissions/empty data (both editable, mixed both directions, both readonly, empty writable/readonly).
4. `source/tests/picker-parity-content-fixture.tsx`, `source/tests/picker-parity-content-fixture.html`: extra real ItemList/ReportDetailGrid synthetic RAM-only fixture for truly long Sở, empty field, and QPPL/HC/BC values at different permissions.
5. `source/scripts/picker-parity-content-browser.mjs`: 1440/900/390, original real List/popup fixture admin/edit/mixed/guest and full synthetic App List admin/guest plus admin report drill popup, browser normal/hover/focus/open + photos/computed-style/rects; real alternative choice -> RAM patch, keyboard Enter/Arrow/Escape and outside, horizontal dropdown placement, scroll/resize when open, highlight and custom palette, long personnel and true long department, empty metadata, QPPL/HC/BC in dedicated fixture, print/reduced-motion.
6. `source/scripts/picker-parity-content-baseline.mjs`: BEFORE matched screenshots and JSON for 18 scenes using e095 detached worktree with unchanged actual App components.
7. `.github/workflows/picker-parity-content.yml`: isolated exact-SHA CI and baseline worktree; only role-specific workflow, no changes to required checks.
8. `source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md` (this checkpoint). No unrelated files changed.

## Verified commands and output on exact tested SHA
- `npm run typecheck` — **PASS**.
- `npm test -- tests/picker-parity-content.test.tsx tests/compact-group-highlights.test.tsx tests/pr95-v6-l1-type-level.test.tsx tests/pr95-v5-l1-dropdown.test.tsx` — **PASS**, 40 unit tests / 4 files.
- `npm run build:compact:qa` — **PASS**.
- `node scripts/picker-parity-content-browser.mjs` — **PASS**, including 18 main List/popup scenes, 6 full App List and 3 full App report-drill popup scenes, additional highlight/custom palette/long/blank/type edge browser matrix, resize/scroll and accessibility-media.
- `node scripts/picker-parity-content-baseline.mjs` copied to detached baseline e095 — **PASS**, 18 before scenes, identical fixture/viewport.
- No production traffic/data changes, merge, or publish performed.

## Distinctions, risks, and next owner
- Browser captures before and after matching views, but does **not** use an automatic pixel-diff tolerance; the screenshots and rect/style JSON are for visual inspection. Geometry/hover/background/permissions tests are programmatic.
- Tests are real React components running with synthetic RAM-only data, not proof of production Firebase lease/CAS/ACL. Guest full-App admin navigation is intentionally restricted; guest popup uses real ReportDetailGrid fixture and succeeds. Popup position checked for viewport horizontal fit, resizing/scrolling and absence of overflow when popover remains open; valid native dismissal on resize/scroll is allowed.
- Separate dedicated edge fixture is required for long department, empty metadata, QPPL/HC/BC because the full-App preview has fixed synthetic records. Full App itself is still exercised for normal admin/guest List and admin drill popup.
- **COMMANDER owns integration**: cherry-pick feature (not worker checkpoint), integrate STAGES, final combined source SHA checks, full unit/regression/Emulator where appropriate, package/hash and public demo publication. All COMMANDER items remain **NOT RUN here**, not implied by worker DONE. Do not merge/publish from this branch.
- Local container GitHub DNS disabled, so all commits via connected GitHub API; npm/browser evidence is GitHub Actions at exact tested SHA, not local run.
