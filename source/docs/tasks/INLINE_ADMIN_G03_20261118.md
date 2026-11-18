# G03 — Inline report visual toolbar checkpoint (2026-11-18)

## Scope and provenance
- Workstream: G03, report fonts/style/colors only; no data editing or production access.
- Branch: `g03/20261118-report-visual-toolbar`; PR [#211](https://github.com/cavoixanh638/HopHDND-WebApp/pull/211) — **DRAFT, unmerged**, reserved for G00 integration.
- Fixed base/merge-base: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`, verified by GitHub compare; diff contains G03-owned settings files, G03-prefixed components/tests, this checkpoint.
- **Code SHA: `99a016a8abdb900ba520c07d63c15b81d4155ed8`.**
- **Tested SHA: `99a016a8abdb900ba520c07d63c15b81d4155ed8`.**
- Exact Code SHA [Verify HopHDND source #44293127305](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293127305) **SUCCESS**; **all 10/10 PR workflows SUCCESS**. No deploy.
- This subsequent checkpoint-only documentation commit does not modify source; independently check PR HEAD CI after checkpoint.

## Implementation
- `source/src/features/settings/inline-g03-ReportInlineVisualToolbar.tsx`: reusable Aa/palette, native keyboard-enabled controls, five styles, 10px size range 11–20, font list, per-report status emphasis and keyword highlight; explicit save/cancel, no direct DB access.
- `source/src/features/settings/inline-g03-report-visual-adapter.ts`: pure controlled adapter respecting canonical shared style owner and per-report visual fields; protects business counters/status/IDs and invalid UI values.
- `source/src/features/settings/inline-g03-report-visual-toolbar.css`: scoped responsive style, visible focus rings, reduced-motion, print-hidden toolbar.
- `source/src/features/settings/ReportLayoutPanel.tsx`: toolbar above each preview and a collapsed advanced compatibility section with original shared font/style controls; both use the same update adapter and unsaved draft.
- `source/src/features/settings/ReportSettings.tsx`: report-save callback still uses original `onSave(valid)` and existing revision/CAS writer; successful save advances visual baseline, cancel restores only visual properties.
- Tests: `source/tests/inline-admin-g03-report-visual.test.ts`; `source/tests/inline-admin-g03-toolbar.test.tsx`.

## G00 review blockers resolved
1. Long-title fixture previously contained trailing whitespace; fixture now supplies a canonical trimmed title, leaving `validateReportLayout` unchanged.
2. Cancel previously materialized absent optional accent fields as empty values, causing an erroneous dirty draft. Restore now copies exact presence/absence from the saved baseline without affecting unrelated edits.
3. Existing `tests/reporting.test.ts` expects legacy ten-font selector, range input and five radios; controls were restored under a collapsed advanced disclosure, updating through the *same* adapter as Aa/palette. Original shared test is not modified.
4. Initial TypeScript TS2540 readonly accumulator error was fixed in the tested code.

## Verified test matrix — exact Code SHA 99a016a8
| Test / safety check | Status | Evidence / distinction |
| --- | --- | --- |
| Base SHA and file ownership | PASS | GitHub compare; no files owned by G01/G02/other streams changed |
| `npm run typecheck` | PASS | Verify #44293127305 |
| `npm test` full suite | PASS | Verify #44293127305: **149 test files passed, 17 skipped; 1055 tests passed, 170 skipped, 0 failed** |
| 5 styles, all fonts and sizes 11–20px | PASS (unit) | G03 adapter + original report regression test |
| State and keyword accents, long title, counts and Không phải trình unchanged | PASS (unit) | `tests/inline-admin-g03-report-visual.test.ts` |
| Exact cancel, explicit Save, Escape and admin-only toolbar contract | PASS (unit) | `tests/inline-admin-g03-toolbar.test.tsx`, adapter unit |
| Legacy ten-font/slider/radio UI regression | PASS (unit) | Original `tests/reporting.test.ts` unchanged |
| `npm run test:firebase` and isolated restore drill | PASS | Verify #44293127305; synthetic Emulator only |
| `npm run build:compact:qa`, build Pages/standalone HTML | PASS | Verify #44293127305 |
| Chrome smoke, pointer/scroll and A4 regression | PASS (app-level CI) | Verify #44293127305 plus other PR workflows; **not yet G03 live toolbar end-to-end** |
| Ten GitHub PR workflows on exact tested SHA | PASS | 10/10 success including Excel A–O, CAS, Firebase operational and two-browser test |
| G03 live in overview and 1920/2K/900px/narrow zoom-specific test | NOT_RUN | Host `App.tsx`/`ReportTable.tsx` owned by G02; G00 integration required |
| Firebase production Rules/RTDB and Pages publish | NOT_RUN (prohibited) | Never touched production, merge or release policy |

## Integration handoff for G00
G03 is independently implemented in the ReportSettings preview; **not mounted on the live report page** because `App.tsx` and `ReportTable.tsx` belong to G02. To integrate, render `ReportInlineVisualToolbar` near the live report heading with:
1. `canEdit={verifiedAdmin && sharedConfigReady && connected}` (fail closed; no guest/staff controls).
2. `value={inlineG03VisualValue(draftLayout, reportId)}`; `onChange={patch => setDraft(inlineG03ApplyVisualChange(draftLayout,reportId,patch))}`.
3. `dirty={!inlineG03VisualEqual(inlineG03VisualValue(draftLayout,reportId),inlineG03VisualValue(savedLayout,reportId))}`.
4. `onCancel={() => setDraft(inlineG03RestoreVisual(draftLayout,savedLayout,reportId))}`; `onSave` must call existing report profile writer with revision/CAS/rollback; never direct Firebase writes.
5. Keep local personal palettes separate. Do not grant guest/staff config writes by DOM mutations. G00 must do integrated Chrome tests after G02 merge.

## Remaining limits and G00 integration
- Preview toolbar works independently inside the existing ReportSettings page, not yet on live overview.
- Explicit Save delegates to the existing whole-settings `onSave` with revision/CAS/rollback; unrelated pending settings drafts are saved per existing contract. Hủy restores visual fields only.
- Existing app-level Chrome tests passed; G00 must run live inline-toolbar and role/keyboard/zoom/reduced-motion checks after G02 wiring.
- No merge, publish, release-variable, Firebase Rules or production database modifications.
- **Independent G03 code and exact-SHA CI gates: PASS. Overall integrated WebApp/publish: HOLD by G00.**
