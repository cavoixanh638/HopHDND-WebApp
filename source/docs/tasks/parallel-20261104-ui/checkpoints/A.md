# Checkpoint A — REV2 (04/11/2026)

**Status: IN_PROGRESS — REV2**. Writer: worker A only. Branch `ui/20261104-table-layout`. Initial HEAD `9a78244ee09df782a9835fffae181249e8fc1371`; old A REV1 code/test complete, no reset. Integrated prior accepted SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9` from [REV2 requirements](../REV2-REQUIREMENTS.md).

## New scope only
- **L01**: read-only keeps `(Sở - Loại VB)`; when department/type editable in ANY combination, render two aligned source member controls on same metadata line without decorative parentheses/dash; preserve each source field, permission, lease, highlighting and type tone. Type hover/focus/open must match department affordance.
- **L03**: replace old bracket/caret-rail style with standard leader/room/specialist CellPicker language; 3 tracks for editable `partyLevel` (only first row level editor); 2 tracks for readonly `partyLevel`; captions exactly `Thành ủy`, `Trình Xây dựng NQ`, `Trình ban hành NQ`; stage dropdowns same left/width/height with meaningful background AND ink. No fake readonly picker, no saved column width mutation.
- **Testing**: synthetic list/popup admin/guest/mixed/Not Required/HC/BC/palette, 1440/900/390/narrow, keyboard/Escape and source permission, exact-SHA typecheck/unit/Chrome; preserve baseline screenshot reference and add new screenshot+geometry in `evidence/A/`.
- **File ownership**: `CompactGroupedValue.tsx`, `item-frame.css`, unit A, browser script A (only). Do not touch B, tracker, backend, main, production or previously PASS code elsewhere.

## M1 — reconnaissance
- New code SHA: **NOT YET**; tested SHA REV2: **NOT RUN**; Chrome: **NOT RUN**.
- Prior REV1 **DONE**: exact tested `73c2d17a4bdbcd74ce62b8e465db78a04cbcadf0`; Verify #41762122590, V6 L1 #41762122685, V5 L3 #41762122641 all SUCCESS. Prior evidence: [CI_AND_GEOMETRY.md](../evidence/A/CI_AND_GEOMETRY.md). No rework of previously PASS logic.
- Next: (1) inspect CSS selectors / browser assertions; (2) implement delta JSX/CSS+targeted tests; (3) trigger exact-SHA CI, record measurements, checkpoint & handoff.
