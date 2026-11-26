# G00 — Bổ sung chọn giao diện, cỡ chữ và độ rộng bảo vệ (26/11/2026)
- Tiếp nối PR #239 (mẫu Firebase và hai gộp độc lập), PR #240 (căn thẳng hàng đã PASS 10/10 và phát hành).
- Một nút Chọn giao diện cùng tone/cỡ với Tùy chọn cột; popup portal dùng cùng thuật toán đặt vị trí. Dấu tích, dấu + và đổi tên/xóa từng mẫu. Giữ Save/Cancel, không chuyển mẫu khi có nháp chưa lưu.
- Cỡ chữ 11–20px: Admin chỉnh nháp và lưu chung vào ItemLayout/preset qua CAS hiện có; khách điều chỉnh tạm thời ở trình xem, không có quyền ghi profile. Mẫu cũ thiếu field kế thừa cỡ chữ hiện hành.
- Đo chiều rộng text thật ở trình duyệt, bảo vệ cả L03 readonly/editable và L04 nhóm/đơn, chống wrap ngay cả khi font tăng. Tự tăng min-width rồi fit các cột khác; cuộn ngang khi không đủ. Không tự ghi độ rộng phát sinh, không đổi bản in, dữ liệu hồ sơ, quyền hoặc Firebase Rules.
- Kiểm thử bổ sung menu pointer + geometry 1600/1280/390px, create/rename/select, font 20px và nowrap, unit test migration/CAS/preset/resize floor. Chờ CI đúng head; chưa nghiệm thu production cho PR mới.

- Bổ sung 26/11: nút Lưu thành giao diện mới ngay cạnh Lưu bố cục/Hủy. Dùng đường CAS tạo mẫu hiện hữu từ nháp; kiểm thử browser chọn lại gốc 1 (13px), bản sao 20px và Hủy. Không thay đổi nút + hoặc thao tác đổi tên/xóa. CSS hai nút dropdown dùng chung selector để tránh lệch tone.

- Regression L023: retain the measured editable picker floor when layout draft changes editing chrome at the same font/group/visibility; all unrelated physical columns (including L03) must keep their width. Save As browser proof includes unabridged staff names and joined CV/Phòng.
