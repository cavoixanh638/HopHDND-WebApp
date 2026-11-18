# G07 — Chuẩn hóa thao tác chỉnh độ rộng, 18/11/2026

- **Owner:** G07, không sửa file owned bởi G01–G06/G08/G09.
- **BASE:** `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`; nhánh `g07/20261118-resize-gestures`.
- **PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/214 (Draft; G00 review/merge).
- **Code SHA (source/tests trước checkpoint):** `96fde859a773ee609ef25b1512e9b19b9e90d393`.
- **Tested SHA:** `NOT_RUN` (chưa có kết quả PASS của CI trên `96fde859a773ee609ef25b1512e9b19b9e90d393`); [Verify source run #44290496357](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290496357) đang QUEUED. Cần đọc lại đúng head trước khi G00 kết luận.
- **Integration status:** HOLD — không merge, publish hoặc deploy Firebase.

## Thay đổi đã push

1. `source/src/components/ColumnResizeHandle.tsx`: một session pointer/keyboard, giữ native pointer capture và window fallback, lọc pointerId khi move/up/cancel; Escape/blur/lost-capture/unmount hủy và hoàn nguyên chính xác style gốc; không commit khi hủy; chống double-commit khi pointerup nhận đồng thời ở window và component.
2. Giữ `planAdjacentTransfer` nguyên vẹn, không sửa `resizeProjectedWithAdjacent`, `ItemList`, `ReportTable`, popup, CAS, Firebase hay quyền. DOM preview cập nhật colgroup và compensator tại chỗ; `onPreview` chỉ là callback local tùy chọn; `onCommit` chỉ gọi khi độ rộng thật thay đổi sau khi nhả pointer hoặc phím.
3. Hỗ trợ CSS zoom bằng tỷ lệ tọa độ visual/offsetWidth, RTL, touch/pen, ArrowLeft/ArrowRight, Shift+Arrow (50px), Escape, Enter, blur, focus và ARIA min/max/current.
4. `source/src/components/inline-g07-resize.css`: tăng vùng chạm trong suốt (18px, coarse pointer 24px) giữ vạch phân cách; focus ring.
5. `source/src/components/inline-g07-DeferredWidthInput.tsx`: adapter tùy chọn cho input số, nháp khi gõ, Enter/blur một lần, Escape hủy, chặn giá trị sai, giữ nháp/caret khi host rerender.
6. `source/tests/inline-admin-g07-resize-gestures.test.tsx`, `source/tests/inline-admin-g07-deferred-width.test.tsx`: fixture không dùng DB về boundary 70/800/1600, adjacent-first, outside pointer, cancel, double-up, keyboard, RTL/scale, unmount, typed input.

## Bằng chứng kiểm tra

| Hạng mục | Trạng thái ban đầu | Lý do/đối chiếu |
| --- | --- | --- |
| Base đúng và chỉ thay file G07 | **PASS** | GitHub compare base...branch 9 commits ahead, 0 behind tại lúc cập nhật; chỉ file thuộc G07 trước checkpoint |
| Trạng thái PR | **PASS** | PR #214 tạo dưới dạng Draft, base main, chưa merge |
| Unit G07 trên Node | **NOT_RUN** | Workflow Verify source #44290496357 đang queued khi lập checkpoint; không đồng nhất fixture đã viết với bài đã chạy |
| `npm run typecheck`, `npm test` | **NOT_RUN** | Môi trường container không truy cập npm/GitHub host; phải kiểm Actions sau chạy |
| `npm run build:compact:qa` + Chromium thực | **NOT_RUN** | Chưa chạy browser trực tiếp với source mới |
| `npm run test:spark` emulator | **NOT_RUN** | Chưa có executable setup local; không viết Firebase sản xuất |
| Multi-browser, zoom, touch/pen trên thiết bị thật | **NOT_RUN** | Cần QA G00/G09 trên trình duyệt/thiết bị thật |
| Firebase production | **NOT_RUN** | Cấm truy cập/ghi sản xuất theo chỉ đạo |

## Rủi ro và điểm nối dành G00

- File `source/src/features/items/DeferredWidthInput.tsx` đang nằm ngoài quyền chỉnh sửa của G07. G00/G01/G04 cân nhắc đổi import trong host sang adapter `InlineG07DeferredWidthInput` sau khi test trên giao diện; G07 không sửa host.
- `ColumnResizeHandle` giữ props cũ tương thích, không cần nối thêm; `onPreview` chỉ nên dùng cho hiệu ứng local, tuyệt đối không trỏ vào writer Firebase.
- Các trình duyệt có CSS zoom transform đặc biệt, pointer capture khác Chrome, UI 900px/1920px và CSS vạch separator phải được Chrome QA độc lập trước khi G00 nghiệm thu.
- Không thay thuật toán adjacency-first, nguồn Excel, localStorage, writer revision/CAS, luật quyền, rules hay release policy.

**Kết luận:** Mã/fixture đã push, nhưng **chưa DONE nghiệm thu độc lập** đến khi có PASS thực từ CI và bổ sung bằng chứng exact SHA.
