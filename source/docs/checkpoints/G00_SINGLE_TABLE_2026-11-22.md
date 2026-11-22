# G00 2026-11-22 — Single data table / advanced-only settings

Owner request: remove the duplicated large data table from Chỉnh sửa; keep the ordinary Danh sách dữ liệu table as the only visual layout editor with explicit Save/Hủy.

## Implementation
- `items-customize` shows `ItemColumnPanel` for advanced column schema, select options, source-column removal/restore, group labels and permissions; the data-table region is NOT mounted there.
- In `items`, the 'Chỉnh giao diện' action opens a local draft on the same real data table. Eye hide/show, rename, column reorder/resize, cards, presets, the L03 width editor and custom-column cell values update this draft. No profile write until pressing 'Lưu bố cục'; Cancel restores prior layout.
- One guarded write uses the existing `onPersistViewerLayout(next, openTimeBaseline)` CAS writer; conflicts stay visible and require explicit user choices. While editing layout, business-cell editing is disabled. No Firebase Rules, data or permission changes.
- Cross-page navigation is blocked when local draft is dirty; browser unload warns. Restore/permission route remains separated.
- The advanced manager's existing Save logic stays as-is and is not replaced by the ordinary List editor.

## Acceptance gates
- Review exact-HEAD typecheck + Vitest + Firebase emulator + real Chromium; the new smoke tests no duplicate advanced table, single List table, eye/hide draft, and Cancel restore. The previous advanced group-title save/cancel tests must remain green.
- Confirm Save in a real authorized Admin session, role loss, responsive horizontal scroll, and Firebase conflict semantics before live acceptance.
- Do not claim deployed until protected GitHub Pages owner approval succeeds and live `version.json.source_sha` matches merged main source.

## Rollback
Revert PR commit. Advanced settings continue to use the unchanged canonical layout persistence contract.
