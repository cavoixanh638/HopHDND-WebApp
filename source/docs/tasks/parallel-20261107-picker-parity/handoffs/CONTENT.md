# CONTENT checkpoint — 07/11/2026

**Status: IN_PROGRESS — implementation + own-SHA CI PASS; some acceptance evidence still outstanding.**
Branch / sole writer: `ui/20261107-picker-parity-content`.
Reference baseline: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
**Latest code SHA = tested SHA = `877705c8b2f1b716b04f73912b2b6730a5c2bdee`.**
Docs-only checkpoint commit after tested code does not modify application.
CI [run #42267562286](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267562286): **SUCCESS** at exact SHA. Artifact [#13527941494](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267562286/artifacts/13527941494), named `picker-parity-content-42267562286-877705c8b2f1b716b04f73912b2b6730a5c2bdee`, 6,770,469 bytes (screenshots + JSON computed styles/rects).
Prior run #42267336801 exposed actual reduced-motion hover lift and FAIL; fixed within CONTENT CSS; latest Chrome PASS. Earlier failures/cancellations superseded by this run.

## Committed deliverables (owned files only)
- `source/src/features/items/picker-parity-content.css`: isolated L01 metadata geometry (26px min, 4x7 padding, Segoe11/550, radius6, filled5x3 caret), two-field one row centered; separate member backgrounds/type tone/highlight, plain readonly 13/400, hover/focus field lift and unchanged target fill, real reduced motion and print.
- `source/src/features/items/CompactGroupedValue.tsx`: sole CSS import; no modification to L03 partyTogether, L04 teamTogether or permissions.
- `source/tests/picker-parity-content.test.tsx`: markup/permission cases both editable, mixed both directions, readonly, empty writable and empty readonly.
- `source/scripts/picker-parity-content-browser.mjs`: real List and popup synthetic React components + full synthetic App navigation and report drill popup; screenshot+computed-style+rect every 1440/900/390 variant; normal/hover/focus/open, guest/admin/mixed, L04 same page where present; real option click RAM patch, keyboard Enter/Arrow/Escape, outside click, viewport popover fit, print and reduced-motion checks; prohibits production traffic.
- `.github/workflows/picker-parity-content.yml`: independent push CI, exact-SHA pin + npm ci + Chromium + artifacts.
- `source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md` (this checkpoint).

## Exact validation #42267562286 (PASS)
1. `npm run typecheck` — PASS.
2. `npm test -- tests/picker-parity-content.test.tsx tests/compact-group-highlights.test.tsx tests/pr95-v6-l1-type-level.test.tsx tests/pr95-v5-l1-dropdown.test.tsx` — PASS, 4 files / **40 tests**.
3. `npm run build:compact:qa` — PASS; full synthetic QA output.
4. `node scripts/picker-parity-content-browser.mjs` — PASS; 18 List/popup admin/mixed/guest fixture cases; 6 full synthetic App List admin/guest cases; 3 full-App admin report-drill popup cases; additional screen vs reduced-motion/print. Screenshots and computed rects/style JSON in artifact. Real click selected a different Type and reached RAM patch; Escape/outside click and horizontal placement verified.
5. Unchanged reference L04 measured where source group exists; read-only no fake buttons. No production write/merge/publish.

## Remaining acceptance gaps; **do not mistake CI PASS for complete user acceptance**
- Browser **before/after** matched fixtures from baseline SHA are not yet exported as independent baseline screenshots; current artifact is AFTER only.
- Dedicated **long Sở name / HC / BC / QPPL / empty field**, custom status palette, and field highlight browser matrix is **NOT RUN**; current tests cover empty markup and baseline full-App values, but not a comprehensive edge matrix.
- Scroll/resize dropdown placement beyond horizontal viewport fit is **NOT RUN** as dedicated dynamic scroll/resize interaction.
- Guest full-App report drill is not directly reachable from guest's intentionally restricted navigation; guest popup covered via real ReportDetailGrid component fixture. Browser role-specific matrix is not a production permission/lease/Emulator verification.
- Integration, integrated exact-SHA E2E, package and public demo remain solely COMMANDER scope. No merge or publish allowed by worker.

## Next action to finish worker acceptance
Extend only `picker-parity-content-browser.mjs` or new `picker-parity-content*.test.ts*` with deterministic full synthetic App edge data/permission scenarios, dynamic scroll/resize, matched baseline screenshots; rerun same isolated CI, update exact tested SHA and artifact; change status to DONE only when every criterion covered. Commander should cherry-pick code SHA only after review and test same final integration SHA.

## Runtime
Local container DNS cannot clone github.com; source writes performed by connected GitHub connector; validation run on GitHub Actions. No local test falsely claimed.
