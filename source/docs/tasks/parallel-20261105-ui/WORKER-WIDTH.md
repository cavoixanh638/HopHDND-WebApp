# Gemini WIDTH — hai độ rộng toàn cụm L03

Nhánh `ui/20261105-column-width`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Đọc [hợp đồng chung](README.md), checkpoint `checkpoints/WIDTH.md`, HEAD/dirty tree. Bạn là writer duy nhất của nhánh/checkpoint; bắt đầu đồng thời worker khác.

**Sở hữu:** `source/src/features/items/ItemList.tsx`, `source/src/features/items/admin-list-controls.css`, `source/src/data/item-preferences.ts` và test/persistence/browser script chuyên biệt. Không sửa `CompactGroupedValue.tsx`, `item-frame.css`, reference registry hay domain/service. Nếu layout preference nằm file khác, ghi rõ trong checkpoint trước khi mở rộng phạm vi và tránh file của worker.

1. Tìm đường lưu độ rộng cột hiện có. Admin có hai giá trị persist riêng cho **toàn cụm** Tiến độ 3 khâu: mode hai track và mode ba track. Không thêm điều khiển resize cho track con. UI admin phải tìm được cách chỉnh hai giá trị, có preview/tên rõ; validate min/max, reload, concurrent save/rollback theo cơ chế sẵn có. Guest chỉ nhận width, không thấy điều khiển.
2. Khi chỉ có readonly hai track, **cột vật lý** phải thu gọn theo width hai track, không giữ chiều rộng lớn của mode ba track. Khi hỗn hợp mode trên các dòng, table column dùng giá trị đủ cho mode rộng hơn nhưng nội dung readonly hai track vẫn compact ở bên trái; không đổi width từng hàng làm lệch cột. Kiểm cột kéo đổi vị trí, resize khác, viewport hẹp, layout cũ thiếu key mới (migration cấu hình an toàn).
3. Tách rõ width của physical column và width nội bộ; chỉ viết phần state/persist/container của bạn. Ghi contract CSS variable hoặc data attribute cho UI worker trong checkpoint ngay đầu. Browser đo rect cột/ô và screenshot admin/guest tại 1440/900/390, reload và hai mode.

Push checkpoint sau khảo sát, commit ý nghĩa, test/lỗi và trước dừng. Ghi code/test SHA, run/artifact, PASS/FAIL/NOT RUN và việc còn thiếu. Không merge/deploy/Firebase live.
