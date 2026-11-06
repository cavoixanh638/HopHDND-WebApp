# TRACKS checkpoint

Status: IN_PROGRESS — khảo sát model, geometry, persistence/merge/preview
Baseline: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`
Branch: `ui/20261106-l03-tracks`
HEAD trước checkpoint: `0eede66c4f8c05d416084aeab08fd5a030f5bc80` (9 commits tài liệu từ baseline)
Working tree: thao tác qua GitHub Git objects/Contents API; không có local checkout; HEAD branch đã kiểm, không có thay đổi code từ baseline qua compare.
Code/tested SHA: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632` baseline (new task TEST_PENDING)
Scope: `item-preferences.ts`, `item-layout-merge.ts`, `ItemList.tsx`, `admin-list-controls.css`, mới `l03-track-widths.css`; các đường App/popup/shared-config/test/preview cần thiết.
Entry: ../WORKER-TRACKS.md + ../README.md
Guardrails: không sửa `CellPicker.tsx`, `item-frame.css`, `app.css`, `CompactGroupedValue.tsx`; không chờ PICKER, không production writes, không merge/deploy.

### Khảo sát khởi đầu — 2026-11-06
- Đã đọc hợp đồng chung và yêu cầu TRACKS trên đúng branch. Chưa có thay đổi code, chưa test tính năng mới.
- Bằng chứng baseline CI: run #42238116883, 897 unit PASS theo README (chưa chạy lại).
- Cần kiểm thử sự phân tách 5 rail, fallback legacy chỉ trong RAM, CAS 5 field và measured DOM list/popup.

### 3 bước kế tiếp
1. Đọc mọi path parse/validate/save/merge/popup/preview và CSS thực, xác định các điểm tích hợp.
2. Triển khai và commit code theo phạm vi + unit cho fallback/merge.
3. Build/typecheck/browser/Emulator phù hợp, ghi chính xác run/rects/tested SHA, sửa cho tới khi PASS hoặc nêu chặn có bằng chứng.
