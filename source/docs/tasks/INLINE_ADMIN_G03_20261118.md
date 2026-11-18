# G03 — Inline report visual toolbar checkpoint (2026-11-18)

## Scope and provenance
- Workstream: G03, report fonts/style/colors only.
- Branch: `g03/20261118-report-visual-toolbar`.
- Fixed base and merge-base: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2` — verified with GitHub compare.
- Pull request: https://github.com/cavoixanh638/HopHDND-WebApp/pull/211 (open, not merged).
- Implementation SHA before this checkpoint: `62900b15bfc38e19c70e16f3f16f85c1b0805746`.
- **Code SHA**: see final branch HEAD after this checkpoint commit. **Tested SHA**: NOT_RUN (no executable environment for the full repository in this session; CI in progress at PR creation).

## Implementation
- `source/src/features/settings/inline-g03-ReportInlineVisualToolbar.tsx`: reusable Aa/palette, native keyboard-enabled controls, five styles, 10px size range 11–20, font list, per-report status emphasis and keyword highlight; explicit save/cancel, no direct DB access.
- `source/src/features/settings/inline-g03-report-visual-adapter.ts`: pure controlled adapter respecting canonical shared style owner and per-report visual fields; protects business counters/status/IDs and invalid UI values.
- `source/src/features/settings/inline-g03-report-visual-toolbar.css`: scoped responsive style, visible focus rings, reduced-motion, print-hidden toolbar.
- `source/src/features/settings/ReportLayoutPanel.tsx`: one toolbar above each preview, remove redundant per-table visual controls and large global visual form; reuse unsaved draft from parent.
- `source/src/features/settings/ReportSettings.tsx`: report-save callback still uses original `onSave(valid)` and existing revision/CAS writer; successful save advances visual baseline, cancel restores only visual properties.
- Tests: `source/tests/inline-admin-g03-report-visual.test.ts`; `source/tests/inline-admin-g03-toolbar.test.tsx`.

## Test matrix — never claim unexecuted tests PASS
| Test / safety check | Status | Evidence / reason |
| --- | --- | --- |
| Branch exact base and owned files only | PASS | GitHub compare: 7 implementation commits, no unrelated files |
| Five styles and shared/per-report model | NOT_RUN | Unit test implemented; GitHub Actions Verify source queued/in progress |
| Fonts, every size 11–20, keyword/state toggles | NOT_RUN | Unit and toolbar functional tests committed |
| Cancel and no change to totals/KPI/Không phải trình | NOT_RUN | Regression assertions committed |
| Admin-only visibility, explicit save, Escape | NOT_RUN | Functional invocation fixture committed; role enforcement in G00 host needed for live inline mounting |
| `npm run typecheck && npm test` | NOT_RUN | Full dependency tree unavailable in local workspace; waiting on GitHub CI |
| `npm run build:compact:qa` and Chrome viewport 1920/900/narrow + zoom | NOT_RUN | No installed browser fixture for G03 preview in local runtime |
| `npm run test:spark` emulator | NOT_RUN | Requires dependencies and isolated emulator; never accessed production |
| Firebase production data/rules, release/publish | NOT_RUN (prohibited) | No production connection or mutation |

## Integration handoff for G00
G03 is independently implemented in the ReportSettings preview; **not mounted on the live report page** because `App.tsx` and `ReportTable.tsx` belong to G02. To integrate, render `ReportInlineVisualToolbar` near the live report heading with:
1. `canEdit={verifiedAdmin && sharedConfigReady && connected}` (fail closed; no guest/staff controls).
2. `value={inlineG03VisualValue(draftLayout, reportId)}`; `onChange={patch => setDraft(inlineG03ApplyVisualChange(draftLayout,reportId,patch))}`.
3. `dirty={!inlineG03VisualEqual(inlineG03VisualValue(draftLayout,reportId),inlineG03VisualValue(savedLayout,reportId))}`.
4. `onCancel={() => setDraft(inlineG03RestoreVisual(draftLayout,savedLayout,reportId))}`; `onSave` must call existing report profile writer with revision/CAS/rollback; never direct Firebase writes.
5. Keep local personal palettes separate. Do not grant guest/staff config writes by DOM mutations. G00 must do integrated Chrome tests after G02 merge.

## Known limitations
- Preview remains within the existing report configuration page and preserves its manual collapsible disclosure; G00 must integrate into live overview.
- The Save button calls the existing whole-report settings writer; it saves other pending report layout edits as well, by the same existing settings contract. Cancellation only resets visual fields.
- CI result is pending at the time of checkpoint creation: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44289784004.
- No merge, publish, release variable, production DB, Firebase Rules, or protected file modifications.
