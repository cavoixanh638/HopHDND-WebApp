# Quyết định kiến trúc — Firebase là nguồn dữ liệu duy nhất của HopHDND

**Ngày chốt:** 25/10/2026 · **Người quyết định:** Chủ dự án · **Trạng thái:** QUYẾT ĐỊNH CÓ HIỆU LỰC CHO TOÀN BỘ VIỆC PHÁT TRIỂN; phát hành production chưa được thực hiện.

## Quyết định bắt buộc
1. **Khi phát triển/chưa phát hành**: nhân viên tiếp tục cập nhật công việc trên file Google Drive/Excel hiện tại. Đó là **quy trình tạm thời của người dùng**, không phải thành phần kỹ thuật phải đồng bộ liên tục hay nghiệm thu hằng ngày trong kiến trúc WebApp mới.
2. **Đích đến**: WebApp HopHDND là **giao diện nhập, xem, chỉnh sửa và quản lý duy nhất**. Firebase Realtime Database `hdnd/items` là **nguồn nghiệp vụ duy nhất (single source of truth)**. Mọi bảng chi tiết, báo cáo, chỉ số phải đọc cùng nguồn. Ghi được xác nhận bằng máy chủ, có audit, quyền sửa, khóa độc quyền theo ô và chế độ chốt số liệu.
3. **Chuyển đổi một lần khi ứng dụng sẵn sàng**: quản trị viên quyết định dữ liệu khởi tạo cuối cùng, sao lưu và kiểm chứng bản nhập, thực hiện migration an toàn từ bản nguồn được phê duyệt vào `hdnd/items` khi đích trống. **Không bắt buộc đồng bộ song song Excel↔Firebase hoặc liên tục điều tra chênh lệch snapshot mirror cũ khi mã chưa sẵn sàng.** Khi cutover, đối chiếu **đúng nguồn được chốt tại thời điểm chuyển đổi**; bảo toàn bản nháp người dùng đang mở.
4. **Sau cutover**: không còn luồng đọc/ghi liên tục từ Google Sheets/Excel hoặc Firebase mirror làm nguồn nội dung; không duy trì Cloud Scheduler để nhập đè `hdnd/items`; không tự ghi ngược từ Firebase sang Excel. Excel nếu được giữ lại chỉ là tài liệu lưu trữ/xuất thủ công, không nằm trong quy trình nghiệp vụ sống.
5. **Không đổi phạm vi UI**: giữ các trang, bảng, bố cục, phép tính nghiệp vụ, màu/trạng thái và hành vi Theme đã được nghiệm thu. Chỉ thay nguồn và cơ chế quản trị dữ liệu, không rút gọn tính năng do không còn Sheets.

## Thay đổi ưu tiên công việc
- **P0:** hoàn thiện code Firebase primary; Firebase Security Rules; phân quyền ô và chống chiếm khóa; realtime multi-user; giới hạn phiên nhập; cơ chế chốt + biên nhận; checkpoint nháp; recovery/rollback; kiểm thử Emulator/staging với dữ liệu giả/copy an toàn.
- **P1:** kiểm tra lại backup Database/Rules đang chạy, thử restore trên môi trường **demo**, rà đường ghi Rules và sự khác biệt với Rules production trước khi có quyết định triển khai.
- **ĐỂ ĐẾN CUTOVER:** xác định bộ dữ liệu khởi tạo cuối cùng và nghiệm thu ID, số dòng, trường/giá trị. Đây là **một checkpoint phát hành một lần**, không phải công việc liên tục đối chiếu Sheet/mirror trong giai đoạn coding.
- **KHÔNG TIẾP TỤC:** truy tìm lý do ảnh cũ 57 so với snapshot 55 để chặn việc hoàn thiện WebApp; giám sát thời điểm cập nhật Google Sheet; đặt KPI đồng bộ Sheets mỗi phút làm điều kiện kiến trúc đích; kiểm tra quyền chia sẻ Google Sheet như một phần nghiệm thu **kỹ thuật Firebase-only**. Các nhận định khảo sát trước đây được lưu lịch sử, **không phải blocker hiện hành**.

## Cổng phát hành thực tế
**Chỉ HOLD việc phát hành/nhập dữ liệu thật**, không HOLD hoạt động phát triển/kiểm thử offline: (a) full production backup + Rules riêng tư và recovery test; (b) security Rules staging PASS, kể cả mọi đường ghi và admin; (c) 2–3 tài khoản kiểm thử đồng thời; (d) dữ liệu khởi tạo cuối cùng được chọn/chứng minh phù hợp tại thời điểm chuyển đổi; (e) quyết định GO rõ ràng của admin. Không dùng dữ liệu demo để tự ghi lên Firebase production.

## Quy tắc đọc tài liệu
Quyết định này **ưu tiên** hơn các đoạn lịch sử 23–25/10/2026 trong CURRENT_STATE, WORKBOARD, MIRROR và các tài liệu cũ từng coi việc lệch 55/57 hoặc đồng bộ Excel chưa chạy là blocker phát triển. Giữ lịch sử để truy vết, nhưng điều hành công việc tương lai phải theo `FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md`.

**Các PR nền:** #71 nguồn Firebase chính; #72 khóa ô và đóng băng, đang Draft. Không suy diễn PR Draft/CI PASS là đã triển khai production.
