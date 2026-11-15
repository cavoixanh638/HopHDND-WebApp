# Rà soát UX cài đặt và công cụ — 15/11/2026

Phạm vi: source/src; nhánh độc lập, **không thay đổi** Firebase Rules, dữ liệu nghiệp vụ, logic trạng thái, phân quyền hay cơ chế xác nhận thao tác phá hủy.

## Đã thay đổi trên nhánh
1. Menu bánh răng quản trị có nhãn theo nhóm: Giao diện và bố cục; Tài khoản và phân quyền; Dữ liệu và vận hành. Công cụ tra mã khu vực chuyển vào phần thu gọn Công cụ kiểm tra. Giữ nguyên callbacks và điều kiện xác nhận admin.
2. Đưa lối vào Chốt số liệu (review) vốn đã có trong trang Quản trị ra nhóm Dữ liệu và vận hành.
3. Chế độ quản trị Spark chỉ hiện hướng dẫn Excel tương ứng, không còn thông báo chung của quy trình import V2/emulator và câu "Chưa mở nhập dữ liệu". Công cụ và các rào bảo vệ không đổi.

## Các nhóm rối còn cần xử lý (không tự xóa)
| Ưu tiên | Vị trí | Vấn đề | Cách xử lý sau |
| --- | --- | --- | --- |
| P0 | Quyền tài khoản | Nhãn Đăng nhập quản trị cho khách/nhân viên dễ gây hiểu nhầm; adminTools phụ thuộc trạng thái online, khi mất kết nối có thể đóng trang sửa | Phân biệt phiên xác thực, quyền admin, quyền sửa ô; giữ trang ở trạng thái chỉ đọc trong khi xác minh lại, tránh bỏ nháp; regression 3 vai trò |
| P0 | Excel | Các luồng Spark và V2 chung một màn hình/nhãn; back-up, xuất Excel và cấu hình JSON bị đặt cạnh nhau | Chia khu vực Sao lưu dữ liệu, Nhập/thay thế dữ liệu, Xuất dữ liệu, Xuất/nhập cấu hình, hiển thị rõ phạm vi file và hậu quả |
| P1 | Danh sách | Tùy chọn người phụ trách, bộ màu, cấu hình cột, thẻ tổng hợp, L03, kiểu tìm kiếm dàn trải | Giữ lọc/tìm/in hiển thị ngay; gộp Hiển thị bảng; mở rộng Tùy chỉnh cột; các thông số px và khôi phục preset vào Nâng cao |
| P1 | Báo cáo | 5 phong cách màu, font, kích thước, độ rộng trang và từng bảng xếp thành một trang dài | Bố cục chung trước; từng bảng sau; riêng thay đổi cách tính "Không phải trình" cần ghi nhãn Tác động thống kê (không phải chỉ hiển thị) |
| P1 | Popup | Trộn xem nội dung, sửa ô, kéo cột, màu và preset | Hàng công cụ thường dùng + nhóm tùy chọn riêng; không làm popup tự thay đổi bố cục chung trừ khi chủ ý |
| P1 | Khôi phục bố cục | Đồng bộ bố cục demo và Áp dụng bố cục mẫu có thể gây cảm giác trùng chức năng | Hợp nhất tên và trình bày điểm khác biệt hoặc dùng một hành động có xem trước, không ghi đè bố cục của người dùng |
| P2 | Hiển thị cá nhân | Các tùy chọn lưu localStorage và bố cục dùng chung thiếu chỉ báo dễ hiểu | Ghi "Chỉ trên máy này" hoặc "Áp dụng cho mọi người" tại vị trí thiết lập, thể hiện trạng thái chưa lưu |
| P2 | CSS | Nhiều lớp style cho list, layout, parity, font có thể chồng nhau | Gom token kích thước, bỏ override cũ sau khi kiểm tra đối chiếu guest/edit/read-only và A4 |
| P2 | Chẩn đoán | Công cụ debug, nhãn mã khu vực, mô tả kỹ thuật không phục vụ thao tác hàng ngày | Đưa vào Công cụ kiểm tra; các cờ thử nghiệm đã được guard thì không nên nhầm là giao diện sản xuất |

## Nguyên tắc nghiệm thu
- Không thay đổi màu, dữ liệu, cách tính, quyền, cơ chế lưu dữ liệu hoặc xóa/sao lưu.
- Kiểm thử admin, nhân viên Google không có quyền quản trị, khách ẩn danh; các màn hình Danh sách, Báo cáo, popup, In A4.
- Chỉ kết luận PASS khi chạy bài test và nghiệm thu trình duyệt; hiện nhánh này **chưa chạy test và chưa kiểm tra trực quan trên website** vì môi trường không clone được GitHub.
- Không triển khai production trước khi kiểm thử và review diff.
