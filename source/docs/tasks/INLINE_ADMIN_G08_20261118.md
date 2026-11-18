# G08 | Inline Admin L03 — 18/11/2026

## Provenance
- Workstream: **G08** (G01 mentioned in dispatcher text is a typo; the assigned URL is `G08.md`).
- Repository: `cavoixanh638/HopHDND-WebApp`.
- Branch: `g08/20261118-l03-inner-widths`.
- BASE frozen: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`, verified `ahead 0 / behind 0` before changes.
- PR: https://github.com/cavoixanh638/HopHDND-WebApp/pull/215 (draft; **do not merge or publish**).
- **Code SHA** at initial submission: `c9934cce1385651ac564d87fadd376fe423f5555`.
- **Tested SHA:** `NOT_RUN` for runtime tests as of initial checkpoint. Do NOT mistake source commit for a passing tested SHA; PR CI may later establish verified SHA.
- Scope: independent G08 component and callback, **not** integrated app/production.

## Implementation
1. `source/src/features/items/L03InlineWidthControl.tsx`: admin-gated L03 overlay with one separator between 2 readonly rails, two between 3 editable rails. Pointer capture/drag preview, Esc cancellation, keyboard Left/Right (1 px), Alt/Shift (10 px), Enter one-shot commit; arrow preview never persists. `l03ResizeBoundary` only transfers pixels between adjacent inner rails, respecting unchanged `PARTY_TRACK_WIDTH_LIMITS` and preserving mode sum, group physical width and all table neighbours. No Firebase or localStorage writes.
2. `source/src/features/items/CompactGroupedValue.tsx`: optional `l03InlineEditor` opt-in. Without a trusted layout-editor session, original L03 field rendering, lease/permission and status pickers remain intact. In layout-edit mode, render inert status text and do not activate picker/dropdown or data-editing flows.
3. `source/src/features/items/inline-g08-l03-widths.css`: gap-only 8px handles, accessible focus outline + px tooltip, preview mode override, wrapping long Vietnamese titles, hidden controls on A4 print, reduced-motion guard. Other cells, table parents and global styles unchanged.
4. `source/tests/inline-admin-g08-l03.test.tsx`: SSR permission and no-picker tests, two/three-track boundaries, min/max and physical-width conservation.
5. `source/tests/inline-admin-g08-fixture.tsx` + `source/inline-admin-g08-fixture.html`: independent React actual-component harness with admin/staff, locked, editing, 2/3 modes, 1920px and 900px containers, long text and adjacent table columns.
6. `source/tests/inline-admin-g08-browser.mjs`: headless Chrome CDP smoke for keyboard preview/Esc/Enter, pointer drag/commit, inert content, fixed parent/neighbor widths and 1920/900/390px viewports; emits `docs/tasks/inline-admin-g08-evidence/` screenshots/logs only when executed.

## Validation and limitations

| Check | Status at submission | Evidence / reason |
| --- | --- | --- |
| Frozen BASE & branch isolation | **PASS** | GitHub compare pre-change: identical; PR compare only G08-owned new/modified files |
| 2 readonly + 3 editable rails, unchanged limits | **NOT_RUN** | Unit tests authored; no local `node_modules` installation or Internet access in execution container |
| Bounds, adjacent-only transfer, unchanged parent, no neighbor change | **NOT_RUN** | Unit tests authored; awaiting GitHub CI |
| Authorization-gated handles, editable source/picker remains under normal mode | **NOT_RUN** | SSR unit tests authored |
| Arrow preview, Escape cancel, Enter one-shot; pointer drag, click isolation | **NOT_RUN** | Browser CDP script authored; not executed locally |
| Text wrapping, 1920x1080, 900px, 390px | **NOT_RUN** | Fixture/browser script authored; no actual viewport result captured |
| Print A4 UI | **NOT_RUN** | `@media print` CSS guarded; no actual print/PDF rendered |
| `cd source && npm run typecheck` | **NOT_RUN** | Dependencies unavailable locally; GitHub PR CI queued |
| `cd source && npm test` | **NOT_RUN** | Dependencies unavailable locally; GitHub PR CI queued |
| `cd source && npm run build:compact:qa` | **NOT_RUN** | Dependencies unavailable locally; GitHub PR CI queued |
| `cd source && npm run test:spark` (emulator) | **NOT_RUN** | No private/isolated app test backend provisioned locally |
| Production Firebase / publishing | **NOT_RUN, forbidden** | No production access/writes, no main merge/deployment |

CI reference: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290452114 (initially queued).

### Commands for an available `source/` environment
```bash
npm ci
npm run typecheck
npm test
npm run build:compact:qa
node tests/inline-admin-g08-browser.mjs
npm run test:spark
```

## Points for G00 integration
- Only **G01** owns `ItemList.tsx`; G08 deliberately did **not** modify it. G00 / G01 must pass an authorized `l03InlineEditor` to `CompactGroupedValue`, only while a **verified Admin** is editing shared interface layout, never in guest/staff/data-edit states. This is not a client-only security boundary; shared-layout backend verifies permissions.
- Source widths: `resolvedPartyTrackWidths(activeLayout)`. Callback `onWidthsCommit(next)` should call `applyViewerLayout(base => ({...base, partyTrackWidths:next}))` through existing `onPersistViewerLayout` CAS/revision/rollback, once after pointer release or Enter. Disable controls while `viewSaving`; propagate failures; do not write in preview.
- Keep the physical `<col>` at its approved saved width, and prevent a layout-editor preview from resizing other columns. G08 transfers within rails only, preserving their total; existing ordinary table auto-fit logic and A4 print policy stay with G01/G00.
- **No** automatic application to `ReportDetailGrid.tsx` (G04 owner). Consider it a separate integration decision; G08 API remains reusable.
- **No** expansion of field-level editing permissions; no Excel A–O, status definitions, Firebase writer, lease or personal-storage changes.
- Do not label **DONE integrated** on the strength of this independent PR. Only G00 can integrate, run full QA and publish after approval.
