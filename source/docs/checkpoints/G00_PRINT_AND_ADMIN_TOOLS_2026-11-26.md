# G00 — Bản in A4 và công cụ dành cho Admin (26/11/2026)

## Yêu cầu của chủ dự án

1. Nội dung trình trong bản in PDF phải là chữ thường (regular), không đậm.
2. Theo phản hồi tiếp theo của chủ dự án, thay phương án ô màu/ký hiệu bằng bảng con hành chính tối giản: ba dòng phân cách mảnh, nhãn công đoạn và trạng thái canh đều; không hộp, không nền màu, không biểu tượng. Chỉ trạng thái Sở chưa trình in đậm; Không phải trình in nghiêng; còn lại chữ thường. Chủ dự án chốt in đen trắng ngày 27/11: tất cả chữ đen, nền trắng, chỉ dùng đường kẻ trung tính; bỏ màu cả tiêu đề, metadata, cột người phụ trách và số trang. Giữ nguyên văn bản trạng thái, không suy diễn giá trị lạ thành hoàn thành. Không đổi nghiệp vụ hoặc giao diện trên màn hình.
3. Xem lần sửa gần nhất của Ghi chú/Tiến độ hiện tại chỉ Admin; áp dụng Danh sách và popup chi tiết báo cáo, cả callback và dialog. Khách vẫn đọc giá trị hiện tại và sửa những cột được cấp quyền. Chỉ admin được gọi history() qua FirebaseRepository của app, kiểm tra trước/sau đọc.
4. A+/A− chỉ Admin; khách kế thừa cỡ chữ bố cục đã lưu, không có chỉnh riêng.

Yêu cầu 3 thay thế quy định QA cũ GUEST_TWO_FIELD_HISTORY_PASS. Không chỉ giấu CSS: kiểm tra host đã xác thực Admin, component, dialog, repo. Role loss đóng dialog và gỡ controls.

## Ranh giới bảo mật quan trọng

Đây là phân quyền tính năng WebApp. RTDB hiện có history lồng trong hàng `hdnd/items` và active `datasetV2/.../items` được đọc công khai ở cha; RTDB không thể thu hồi read bằng rule ở con. Do đó **chưa bảo mật lịch sử ở tầng API/raw database**. Không tuyên bố guest bị chặn truy xuất raw data. Muốn đảm bảo điều đó phải thiết kế tách audit private khỏi bản ghi công khai và giữ transaction/CAS, backup, compatibility, migration; cần đợt bảo mật độc lập, kiểm thử và phê duyệt Rules/dữ liệu. Không sửa Rules hoặc dữ liệu production trong PR này.

## Nghiệm thu

- Unit test phân loại đúng status theo khâu, không đổi giá trị gốc; Chromium PDF thật kiểm tra weight 400, hình học, trạng thái không nền/khung/biểu tượng, độ đậm/nghiêng theo trạng thái và xuất page grayscale; kiểm tra CSS và pixel RGB của mọi trang PDF gốc không có màu (không dùng cờ -gray để che lỗi).
- Firebase Emulator xác nhận guest không gọi history() qua repo, Admin đọc được lịch sử sau guest save và đủ 50 bản ghi rollover; không làm thay đổi quyền ghi cột. Test tranh chấp cùng thế hệ xác nhận khách ghi được dữ liệu và lịch sử vẫn đầy đủ, nhưng chỉ Admin đọc history() trong app.
- Browser smoke bằng anonymous thật, Admin Google Emulator thật, sau signout; guest popup được cung cấp callback vẫn không hiện action. Giữ QA in A4 nhiều trang, page counter, các tính năng Admin.
- Chỉ merge exact SHA PASS; đây là thay đổi quyền tính năng + repo nên giữ owner approval cho release, cùng PR243 nếu chưa phát hành. Không tự thay variables, Rules hoặc dữ liệu.
