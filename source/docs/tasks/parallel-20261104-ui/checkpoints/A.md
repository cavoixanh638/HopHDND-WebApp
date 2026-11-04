# Checkpoint A — REV2 (04/11/2026)

**Status: IN_PROGRESS — REV2**. Writer: worker A only. Branch `ui/20261104-table-layout`. Initial HEAD `9a78244ee09df782a9835fffae181249e8fc1371`; old A REV1 code/test complete, no reset. Integrated prior accepted SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9` from [REV2 requirements](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-coordination/source/docs/tasks/parallel-20261104-ui/REV2-REQUIREMENTS.md).

## New scope only
- **L01**: read-only keeps `(Sở - Loại VB)`; when department/type editable in ANY combination, render two aligned source member controls on same metadata line without decorative parentheses/dash; preserve each source field, permission, lease, highlighting and type tone. Type hover/focus/open must match department affordance.
- **L03**: replace old bracket/caret-rail style with standard leader/room/specialist CellPicker language; 3 tracks for editable `partyLevel` (only first row level editor); 2 tracks for readonly `partyLevel`; captions exactly `Thành ủy`, `Trình Xây dựng NQ`, `Trình ban hành NQ`; stage dropdowns same left/width/height with meaningful background AND ink. No fake readonly picker, no saved column width mutation.
- **Testing**: synthetic list/popup admin/guest/mixed/Not Required/HC/BC/palette, 1440/900/390/narrow, keyboard/Escape and source permission, exact-SHA typecheck/unit/Chrome; preserve baseline screenshot reference and add new screenshot+geometry in `evidence/A/`.
- **File ownership**: `CompactGroupedValue.tsx`, `item-frame.css`, unit A, browser script A (only). Do not touch B, tracker, backend, main, production or previously PASS code elsewhere.

## M1 — reconnaissance
- New code SHA: **NOT YET**; tested SHA REV2: **NOT RUN**; Chrome: **NOT RUN**.
- Prior REV1 **DONE**: exact tested `73c2d17a4bdbcd74ce62b8e465db78a04cbcadf0`; Verify #41762122590, V6 L1 #41762122685, V5 L3 #41762122641 all SUCCESS. Prior evidence: [CI_AND_GEOMETRY.md](../evidence/A/CI_AND_GEOMETRY.md). No rework of previously PASS logic.
- Next: (1) inspect CSS selectors / browser assertions; (2) implement delta JSX/CSS+targeted tests; (3) trigger exact-SHA CI, record measurements, checkpoint & handoff.

## M2 — source + unit regression pushed
- `2305e81f0ca6089eb54661fe04564bc8c67ffd41`: JSX L01 `data-metadata-mode` and L03 permission-driven 2/3 tracks with revised exact labels; source values retained.
- `fd9091158da1051504426f2814bdfdc3a542f4a2`: CSS REV2 with separate type/dept editable frames, standard L03 CellPicker, semantic fills on button and internal scrolling for narrow saved width.
- `254d55d3686832a8d6fce9c4c55cce950cf42eeb`: unit test assertions 4 combinations and mixed L03. **These are pushed changes, NOT tested PASS yet.**
- Status **IN_PROGRESS / TEST_PENDING**; latest code/test SHA `254d55d3686832a8d6fce9c4c55cce950cf42eeb`. Typecheck, unit, Chrome, pixel geometry: **NOT RUN** for REV2.
- Browser scripts V6/V5 currently assert old bracket/frame/caret-rail oracles; update only legitimately stale assertions, preserve mouse/keyboard/ARIA/source tests; run gates on final head.

## M3 — CI failure triage and regression-oracle corrections (REV2)
- Initial UI/test SHA `5557b68ef67d0ce5b278fc181c1f0ab2e5efd7cc`: [Verify #41803490807](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803490807) FAIL at 2 legacy labels `Ban hành NQ`; [V6 #41803490793](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803490793) Chrome failure measured row 2 **readonly** height 48px while real editable dropdowns in same group 36px. Geometry itself: left 828.515625 x3; width 186px x3; two editable buttons height 36px. [V5 #41803490805](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803490805) first readonly long status baseline delta 9.59px with center-aligned label; not an x-rail error. Guard V5 L5 succeeded.
- Applied scoped corrections: `compact-group-highlights.test.tsx` checks new exact captions and edit-vs-readonly brackets; V6 geometry now enforces all dropdown buttons same left/width/height and allows naturally wrapped readonly text, while ALL status tracks must retain same left/width. V5 browser assert respects readonly wrapping, tracks per-record left/width/height, new single button frame and highlight on button, without disabling actual hit tests.
- Latest source+test commit SHA `8892e414d9a7c0e6b71c70b23103009cf229e6fe`. **Full exact-SHA CI: NOT VERIFIED**. Previous pass REV1 remains historical, not REV2 acceptance.
- Note: PR #153 was already merged into coordination in REV1; GitHub rejects opening another PR on the same head/base (HTTP 422), but branch push itself triggers workflow runs. No new merge/deploy.
- Next: (1) read exact latest unit/V5/V6 Chrome and correct any product defects; (2) capture REV2 before/after screenshots, raw rects/hover/keyboard/palette; (3) final exact-SHA CI and checkpoint handoff.
