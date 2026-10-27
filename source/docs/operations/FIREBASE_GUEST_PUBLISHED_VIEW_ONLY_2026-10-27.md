# Phân quyền khách CHÍNH XÁC — chỉ xem hai bảng theo bố cục admin
**27/10/2026 · Quyết định thay thế chính sách công khai nguyên bản trong PR #82.**

## Yêu cầu chốt của chủ dự án
**Khách** (chưa đăng nhập Google hoặc Google không có quyền chỉnh sửa) chỉ được **XEM**:
1. **Báo cáo tổng hợp**: các báo cáo, nhóm, số liệu, nhãn màu, cột và thứ tự mà quản trị viên đã lưu/cho hiển thị.
2. **Danh sách chi tiết**: các hàng, cột, thứ tự, độ rộng và nội dung thuộc bố cục chung mà quản trị viên đã duyệt hiển thị. Có thể đọc/lọc/thao tác xem chi tiết trong phạm vi đó.

Khách **không được** truy cập: màn hình tùy chỉnh/chỉnh sửa, màn hình nguồn Google Sheets/Excel, dữ liệu thô Firebase `hdnd/items`, `hdnd/mirrors`, toàn bộ cấu hình raw `hdnd/profile`, ma trận quyền `hdnd/permissions`, registry UID, token khóa ô, lịch sử nội bộ hay JSON gốc. Việc không hiển thị các nút không đủ đảm bảo an toàn: phải cấm đọc những path thô tại Firebase Security Rules. Khách vẫn có thể xem mọi lúc, kể cả hệ thống đóng băng/chặn sửa.

**Nhân viên được cấp quyền Google:** vẫn dùng đường đọc/ghi dữ liệu nguồn qua Rules, nhưng chỉ sửa các cột/ô được cấp. **Quản trị viên:** toàn quyền thiết kế bố cục và duyệt dữ liệu hiển thị. Cùng một Google UID đăng nhập nhiều thiết bị là hợp lệ, không coi đó là hai UID khác nhau.

## Kiến trúc cần triển khai
Không thể cho client khách đọc `hdnd/items` rồi “ẩn cột bằng React”: họ vẫn lấy được hidden fields bằng REST/SDK. Cần **data projection (bản hiển thị công khai tối thiểu)**:

- Nhánh RTDB mới `hdnd/publicViews/current`: chỉ có dữ liệu dùng để vẽ 2 tab, không có `recordId` gốc, `operationId`, `revision` từng hàng, audit, lịch sử nội bộ, khóa sửa, dữ liệu các cột ẩn hoặc giá trị cột custom bị ẩn. Được backend tin cậy **xuất bản** từ dữ liệu thật và **bố cục chung đã xác nhận của admin**. Không cho browser ghi trực tiếp vào path này.
- Khách chỉ subscribe `hdnd/publicViews/current` và chỉ dùng dữ liệu từ projection. Khi chưa có snapshot hợp lệ, **fail closed**: thông báo “Chưa có bản hiển thị được quản trị viên công bố”; không thử đọc raw/mirror/Google Sheets để fallback.
- Chức năng “đăng nhập Google” tách khỏi 2 tab đọc-only. Cổng quản trị và các màn hình layout/data chỉ xuất hiện và được mount sau khi xác thực admin; nhân viên được cấp quyền chỉ được vào chỉnh sửa ô hợp lệ. Guest không được lưu layout cá nhân vào view chính nếu trái bố cục admin (phải bỏ `allowPersonalCompact` cho khách và khóa các popover cấu hình bảng).
- **Mọi lần sửa dữ liệu hoặc bố cục admin** phải làm mới snapshot bằng **nguồn phát hành đáng tin cậy** (Cloud Function trigger hoặc backend được xác thực), có phiên bản, tín hiệu dữ liệu mới và kiểm tra lỗi đồng bộ. Không được để admin mở trình duyệt mới có thể “nhấn xuất bản” là phương thức duy nhất nếu nhân viên sửa realtime.
- Firebase Security Rules bảo vệ từng nguồn gốc bằng Google verified admin/editor allowlist; riêng `hdnd/publicViews/current` cho phép đọc không xác thực, không client-write. Tất cả thay đổi Rules phải so với current Cloud, backup, thử Emulator và triển khai độc lập với GitHub Pages.

## Đã có trên nhánh thiết kế an toàn (KHÔNG phát hành)
- Rules **ứng viên** đã chuyển `items/mirrors/profile/permissions/control/freezeControl` sang Google admin hoặc nhân viên được cấp. Bỏ `hdnd/items/.read=true` nguy hiểm. Chỉ publicViews/current đọc được bởi khách, browser không có quyền ghi projection.
- `src/data/admin-published-public-view.ts`: hàm dựng projected data với đúng `itemLayout.columns.visible` và `configuredReports` từ cấu hình admin; **chỉ dành cho backend tin cậy**, không được gọi trong guest client. Có kịch bản thử chỉ chứa giá trị cột hiện và dữ liệu tổng hợp, không lộ row ID, ô ẩn, lịch sử.
- `tests/admin-published-public-view.test.ts` và `tests/exclusive-cell-freeze.test.ts`: kiểm tách quyền xem/ghi và không lộ nguồn gốc qua SDK Emulator.

## Chưa hoàn thành — không được merge vội
1. **Trusted publisher** xuất snapshot server-side có quyền đọc raw, kiểm nguồn/bố cục đã xác nhận của admin và cập nhật khi nhân viên ghi hoặc admin thay layout. Nếu Cloud Functions cần billing chưa kích hoạt, cần quyết định cơ chế server phù hợp trước triển khai; không thể giả định Firebase RTDB Rules tự dựng projection.
2. **Guest UI** đã có đường riêng đọc projection và hai bảng, nhưng chưa có ảnh nghiệm thu với publisher thực; cần kiểm thử Chrome không gọi raw/GViz và hoàn thiện đồng nhất layout báo cáo, gộp cột.
3. Test Chrome guest request interception assert **không có** `/hdnd/items`, `/hdnd/mirrors`, `hdnd/profile`, Sheets GViz, và không lộ dữ liệu ẩn qua payload; test hai UID + no-login + Rules Emulators.
4. Thực hiện backup và đối chiếu Rules published Cloud; chỉ deploy đồng thời khi publisher có sẵn snapshot, viewer đã kiểm thử và có kế hoạch chuyển đổi một lần. Nếu không, người xem có thể thấy bảng trống.

**Trạng thái:** DRAFT/HOLD. Phần frontend khách đã thêm nhưng chưa nghiệm thu cùng publisher realtime; KHÔNG tự merge/release.  `main` hiện vẫn chứa UI cũ và Rules ứng viên từng lỡ cho raw public trong PR #82; **không đồng nghĩa Rules ấy đã publish Cloud**. Không tuyên bố khách chỉ nhìn được layout cho tới khi 4 bước trên hoàn tất.
