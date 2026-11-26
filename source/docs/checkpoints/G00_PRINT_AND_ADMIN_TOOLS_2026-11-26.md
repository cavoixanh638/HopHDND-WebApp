# G00 — Bản in A4 và công cụ dành cho Admin (26/11/2026)

## Yêu cầu của chủ dự án

1. Nội dung trình trong bản in PDF phải là chữ thường (regular), không đậm.
2. Tiến độ 3 khâu có ba dòng phân cách, nhãn công đoạn và trạng thái canh đều; màu nền nhạt và ký hiệu độc lập với màu: ! chưa trình, • đang xử lý, … đã gửi/chờ, ✓ hoàn thành, — không phải trình. Giữ nguyên văn bản trạng thái, không suy diễn giá trị lạ thành hoàn thành. Không đổi nghiệp vụ hoặc giao diện trên màn hình.
3. Xem lần sửa gần nhất của Ghi chú/Tiến độ hiện tại chỉ Admin; áp dụng Danh sách và popup chi tiết báo cáo, cả callback và dialog. Khách vẫn đọc giá trị hiện tại và sửa những cột được cấp quyền. Chỉ admin được gọi history() qua FirebaseRepository của app, kiểm tra trước/sau đọc.
4. A+/A− chỉ Admin; khách kế thừa cỡ chữ bố cục đã lưu, không có chỉnh riêng.

Yêu cầu 3 thay thế quy định QA cũ GUEST_TWO_FIELD_HISTORY_PASS. Không chỉ giấu CSS: kiểm tra host đã xác thực Admin, component, dialog, repo. Role loss đóng dialog và gỡ controls.

## Ranh giới bảo mật quan trọng

Đây là phân quyền tính năng WebApp. RTDB hiện có history lồng trong hàng `hdnd/items` và active `datasetV2/.../items` được đọc công khai ở cha; RTDB không thể thu hồi read bằng rule ở con. Do đó **chưa bảo mật lịch sử ở tầng API/raw database**. Không tuyên bố guest bị chặn truy xuất raw data. Muốn đảm bảo điều đó phải thiết kế tách audit private khỏi bản ghi công khai và giữ transaction/CAS, backup, compatibility, migration; cần đợt bảo mật độc lập, kiểm thử và phê duyệt Rules/dữ liệu. Không sửa Rules hoặc dữ liệu production trong PR này.

## Nghiệm thu

- Unit test phân loại đúng status theo khâu, không đổi giá trị gốc; Chromium PDF thật kiểm tra weight 400, hình học/marker và xuất page grayscale.
- Firebase Emulator xác nhận guest không gọi history() qua repo, Admin đọc được lịch sử sau guest save và đủ 50 bản ghi rollover; không làm thay đổi quyền ghi cột.
- Browser smoke bằng anonymous thật, Admin Google Emulator thật, sau signout; guest popup được cung cấp callback vẫn không hiện action. Giữ QA in A4 nhiều trang, page counter, các tính năng Admin.
- Chỉ merge exact SHA PASS; đây là thay đổi quyền tính năng + repo nên giữ owner approval cho release, cùng PR243 nếu chưa phát hành. Không tự thay variables, Rules hoặc dữ liệu.
