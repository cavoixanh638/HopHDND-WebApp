# Luồng A — Trình bày ô Danh sách

Role: writer A. Branch `ui/20261103-table-cells`; baseline chung xem [README](README.md); checkpoint mới nhất [A](checkpoints/A.md). Worktree: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/ui-20261103-table-cells`.

Chỉ sở hữu `source/src/features/items/CompactGroupedValue.tsx`, `item-frame.css` và test mới/cũ trực tiếp của hai file. Nếu cần file khác, báo điều phối trước; không chạm ItemList/ColumnHeader.

Đích cuối: trên bảng và popup, L02 đưa tên Sở và Loại VB xuống sau Nội dung trình; khi không sửa được vẫn thấy hai thông tin nhưng kiểu chữ/viền tiết chế. L03 trình bày ba khâu theo hàng nhãn + giá trị như cột người phụ trách, vẫn phân biệt Thành ủy / Xây dựng NQ / Ban hành NQ; dòng Thành ủy viết liền `Thành ủy (BTV TU ↗)` khi có quyền sửa và `Thành ủy (BTV TU)` khi chỉ đọc (ký hiệu mũi tên theo affordance đang dùng, không thêm quyền). Giá trị trạng thái của cả ba hàng thẳng một trục x trong cả hai chế độ quyền. `Tiến độ hiện tại` và `Ghi chú` căn giữa theo chiều dọc. Header L01 `ID` phải đọc đủ ở độ rộng hiển thị 52px cả khi có sort icon admin và khi khách không có icon.

Điều kiện DONE: kiểm DOM/CSS hoặc Chrome ở admin/guest, ô có/không quyền; popup và viewport 900px/mobile không che chữ/overflow; màu tiến độ, highlight từng field, editor vẫn đúng. Typecheck + test liên quan PASS trên SHA bàn giao. Lưu screenshot trước/sau hoặc số đo DOM tại `source/docs/tasks/parallel-20261103-ui/evidence/A/` và ghi kết quả trong checkpoint. Commit/push chỉ file sở hữu và evidence/checkpoint A.
