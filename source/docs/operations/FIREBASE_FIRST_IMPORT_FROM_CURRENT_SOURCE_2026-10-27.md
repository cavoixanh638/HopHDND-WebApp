# HopHDND — khởi tạo Firebase chính lần đầu từ Google Sheets / Excel đã duyệt

Ngày 27/10/2026. Phạm vi: PR #79. **Chỉ phát hành mã và kiểm thử cho phép quản trị vận hành; không tự triển khai Rules hoặc ghi dữ liệu Firebase production.**

## Vì sao cần
Sau khi hợp nhất PR #71 và #72, tính năng **Cập nhật chuyển tiếp** chỉ cập nhật các hồ sơ đã tồn tại trong `hdnd/items`; nó không thể tạo các hồ sơ đầu tiên. Luồng chuyển từ mirror cũ bị vô hiệu hóa đúng chủ đích vì mirror có thể lỗi thời. Vì vậy cần thao tác **khởi tạo một lần từ nguồn mới nhất do quản trị phê duyệt**, không dùng mirror cũ hoặc sync tự động.

## Giao diện sau khi phát hành
Tại https://cavoixanh638.github.io/HopHDND-WebApp/, đăng nhập tài khoản Google **quản trị được xác minh**; khi nguồn đọc vẫn là Sheets/mirror, mở **Tài khoản và dữ liệu → Excel · Trích xuất → Khởi tạo Firebase lần đầu từ nguồn đã duyệt**. Không hiển thị nút này khi profile đã chuyển sang `primary`. Quy trình:

1. Cần hoàn thành **backup RTDB và Rules hiện hành**, thẩm định candidate Rules, xem số hàng database thật và ký xác nhận nguồn đã chốt. Chưa làm những việc này thì **không bấm khởi tạo**.
2. Chọn **Google Sheets** (đọc qua GViz hiện có) hoặc **Excel .xlsx** (mẫu WebApp hoặc file nghiệp vụ A–O); đọc vào trình duyệt và xem trước mã/số hồ sơ/nội dung. Có cảnh báo dữ liệu, mã thiếu/trùng thì chặn.
3. Xác nhận đã backup, đã kiểm tra Rules, đã chốt dữ liệu và database hiện trống. Gõ `KHOI TAO FIREBASE` đúng nguyên văn. Bản xem trước quá 10 phút thì bắt buộc đọc lại.
4. API chỉ dành cho tài khoản quản trị Google, kiểm tra `hdnd/control.editingLocked`, `hdnd/freezeControl.mode` OPEN, `hdnd/items` hoàn toàn trống, hồ sơ hợp lệ và mã duy nhất. Ghi **đúng một `runTransaction` tại `hdnd/items` với compare-and-set `null → payload`**. Nếu ai đã ghi hàng khác, transaction dừng, **không xóa, không ghi đè, không retry tự động**.
5. Sau khi server ACK, đọc lại Firebase, kiểm đếm tất cả bản ghi và tất cả trường nghiệp vụ. Nếu đọc lại khác nguồn, báo HOLD; tuyệt đối không thử nhập lại. Khi PASS, dữ liệu đã có trên Firebase nhưng **chưa tự chuyển nguồn đọc**.
6. Quản trị vào **Tài khoản Firebase → Nguồn đọc bảng → Firebase Database chính**, chỉ chuyển sau khi đối chiếu Rules và dữ liệu. Kiểm tra Chrome/Edge 2 tài khoản Google khác UID; quyền nhân viên theo `hdnd/editors/{uid}` cùng quyền cột/ô. Xác minh edit lease, CAS, realtime, autosave và lịch sử. Không phát hành cho nhân viên trước khi GO.

## Phân ranh và điều kiện dừng
- Không tự đồng bộ nền từ Sheets, không tự thay dữ liệu nguồn Google, không đổi `profile.dataSource` trong bước import; Supabase vẫn tạm dừng.
- Nếu RTDB đã có bất kỳ hàng nào, không áp dụng luồng khởi tạo; dùng cập nhật chuyển tiếp từng hồ sơ hoặc quy trình bổ sung hồ sơ riêng đã được thẩm định.
- Nếu cần nhập các hồ sơ `isDropped=true` hoặc `archivedAt` có giá trị, bộ nhập này dừng để tránh mất dấu dữ liệu đã rút; trường hợp đó phải được duyệt riêng.
- Nhập tối đa 1.000 hồ sơ trong một lần và không dùng tên mã dạng “Dòng N (thiếu mã)”. Tệp lớn hơn cần kiểm lại phương án batch, không tăng giới hạn tùy tiện.
- Không thử bước import nếu Rules hiện hành chưa cho phép: admin-only empty-root bootstrap Rules phải được kiểm thử ở emulator và được cấp phép triển khai **riêng**.
- Khi chưa có Firebase plugin/quyền quản trị production trong ChatGPT, mọi xác nhận trạng thái Cloud là **chưa xác minh**; CI staging thành công không chứng minh production.
- Same-Google-UID trên nhiều tab vẫn là giới hạn đối với ràng buộc khóa server như tài liệu bảo mật PR72. Không chia sẻ tài khoản admin.

## Mã và kiểm chứng
- `src/data/firebase-primary-bootstrap.ts`: `bootstrapApprovedRowsToPrimary`, soát quyền và transaction + readback.
- `src/features/settings/InitialFirebaseImportPanel.tsx`: giao diện chọn Sheets/Excel, cảnh báo và xác nhận hai bước.
- `src/features/settings/ExcelTransferPanel.tsx`, `src/app/App.tsx`: gắn ở mục quản trị, giữ gộp cột và báo cáo hiện tại không đổi.
- `tests/exclusive-cell-freeze.test.ts`: thử khởi tạo trên Rules Emulator, nhập lại bị chặn, tài khoản khác bị từ chối, mã trùng và FROZEN bị chặn.
- `source/scripts/firebase-production-readonly-backup.mjs`, `firebase-verify-published-rules.mjs`, `firebase-backup-emulator-restore.mjs`: công cụ backup/đối chiếu/restore dùng ngoài GitHub repository với dữ liệu riêng tư.

**Mốc nghiệm thu production**: Rules chính xác, backup có thể khôi phục, nguồn đầy đủ, import một lần đúng recordCount, profile primary, hai tài khoản khác UID thực hiện gửi/nhận bản ghi realtime, lưu xác nhận thành công, kiểm tra gián đoạn, đóng băng và lịch sử; ghi lại biên bản GO.

