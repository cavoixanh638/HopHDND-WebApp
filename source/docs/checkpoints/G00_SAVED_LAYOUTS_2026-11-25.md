# G00 — Tùy chọn gộp độc lập và giao diện dùng chung đã lưu (25/11/2026)

- Baseline: e33524f147f3b050ff0bd1d7444dbba04eb4a917 (main, published UI #238).
- Hai cờ mới độc lập; dữ liệu cũ thiếu cờ tiếp tục gộp cả hai. Tiến độ 3 khâu không đổi.
- Thay nút khôi phục bố cục chuẩn bằng chọn mẫu, lưu mới, đổi tên và xóa mẫu. Lưu bố cục cập nhật mẫu đang chọn, Hủy giữ cấu hình đã xác nhận. Không đổi khi có nháp chưa lưu.
- Mẫu lưu trong ItemLayout thuộc payload hdnd/profile, qua đường ghi admin và CAS hợp nhất hiện hữu. Chỉ cấu hình trình bày, không sao chép giá trị/định nghĩa cột tự tạo, không sửa dữ liệu kỳ họp, quyền, lịch sử, Firebase Rules hay workflow.
- Giới hạn 12 mẫu, tên tối đa 60 ký tự, không trùng; ngân sách 80.000 ký tự riêng cho mẫu, dưới trần payload hiện tại 200.000 ký tự. Demo RAM không được báo đã lưu Firebase.
- Kiểm thử: ma trận 4 cách gộp, migration, JSON reload, tạo/chọn/cập nhật/đổi tên/xóa, giữ custom values/options và CAS conflict. Chromium kiểm tra menu production CSS và thao tác trên fixture tổng hợp. Kết quả CI chờ exact head; chưa nghiệm thu production. Không bỏ qua release guard.
