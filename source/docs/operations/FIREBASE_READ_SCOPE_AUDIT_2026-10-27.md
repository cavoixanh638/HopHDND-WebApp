# Kiểm toán quyền đọc Firebase — 27/10/2026

**Dự án:** `hophdnd-8b7b2`, Realtime Database `hophdnd-8b7b2-default-rtdb`. **Đây là kiểm toán Rules ứng viên trên GitHub, CHƯA chứng minh đã publish Cloud.**

## Yêu cầu người dùng đã chốt
- Mọi người, bất kỳ tài khoản nào hoặc chưa đăng nhập, **được xem toàn bộ nội dung bảng vào mọi thời điểm**; trạng thái `editingLocked`/`DRAINING`/`FROZEN` **chỉ hạn chế chỉnh sửa**, không hạn chế xem.
- Chỉ người có quyền Google được duyệt mới sửa; admin mới cấp/thu hồi và quản trị. Một tài khoản Google dùng nhiều máy là cách sử dụng hợp lệ, được xem là một UID về phân quyền.
- Thông tin kỹ thuật không phục vụ xem bảng (danh sách UID nhân viên, bộ token khóa ô, biên nhận chốt) không cần công khai.

## Kết quả phát hiện
Rules cũ `hdnd/.read="auth != null"` cho phép khách đã đăng nhập ẩn danh tải **toàn bộ gốc hdnd**, bao gồm registry UID và token khóa. Không thể dùng rule con để từ chối nếu đã cho phép tại cha do Rules RTDB thừa kế quyền đọc từ cha xuống con.

Rules ứng viên sau sửa **xóa quyền đọc tại gốc `hdnd`**. Gán `.read:true` riêng từng nhánh dữ liệu nghiệp vụ cần xem, kể cả người chưa đăng nhập. Các nhánh riêng tư hạn chế cấp đúng đường dữ liệu:

| Nhánh | Không đăng nhập | Tài khoản thường/ẩn danh | Google nhân viên được cấp quyền | Quản trị |
|---|---|---|---|---|
| `hdnd` gốc | Cấm | Cấm | Cấm | Cấm |
| `hdnd/items` (cả lịch sử trên hàng) | Xem | Xem | Xem | Xem |
| `hdnd/mirrors` (nguồn Sheets chuyển tiếp) | Xem | Xem | Xem | Xem |
| `hdnd/profile`, `hdnd/permissions` (chỉ quyền sửa), `hdnd/control`, `hdnd/freezeControl` | Xem | Xem | Xem | Xem |
| `hdnd/editors` (tất cả UID nhân viên) | Cấm | Cấm | Cấm | Xem |
| `hdnd/editors/{uid}` | Cấm | Xem bản thân khi đăng nhập | Xem bản thân | Xem |
| `hdnd/editLocks` (toàn bộ token, phiên sửa) | Cấm | Cấm | Cấm | Xem |
| `hdnd/editLocks/{row}/{field}` | Cấm | Cấm | Xem từng ô khi UID được cấp quyền | Xem |
| `hdnd/freezeReceipts`, `hdndReviews` | Cấm | Cấm | Cấm | Xem |

**Cảnh báo công khai:** Cho phép `.read:true` trên `hdnd/items` và `hdnd/mirrors` nghĩa là **ai biết địa chỉ Realtime Database đều có thể đọc qua API Firebase**, không cần truy cập trang GitHub Pages, bao gồm lịch sử chỉnh sửa và các trường nghiệp vụ. Không lưu dữ liệu cần giữ bí mật ở những nhánh này. Chính sách trên được thực hiện đúng yêu cầu chủ dự án, không đánh đồng quyền đọc công khai với quyền ghi.

## Tương thích UI, khóa ô và nhiều máy
`useFirebase` đã sửa: admin theo dõi `hdnd/editors` chung; người dùng khác chỉ nghe `hdnd/editors/{own UID}`. Luồng xem bảng/nguồn mirror/profile/quyền và chốt vẫn đọc các nhánh công khai. Khóa ô từng field cần read token của field đó cho nhân viên được cấp quyền, chỉ admin đọc toàn bộ registry khóa. Nếu cùng UID trên hai máy thì việc đăng nhập hợp lệ và xem/sửa trong phạm vi quyền vẫn được chấp nhận, tuy nhiên hai phiên đó **không phải hai danh tính khác nhau** khi kiểm soát token.

## Kiểm thử và bước phát hành còn thiếu
- Firebase Emulator phải chứng minh khách không đăng nhập, Anonymous Auth, Google UID chưa cấp quyền và nhân viên cấp quyền đều đọc được nội dung; đều bị cấm ghi khi không có quyền. Cả 4 nhóm không được đọc gốc `hdnd`, danh sách UID hay token của người khác.
- Hồi quy CAS, khóa ô, lưu, realtime, thu hồi quyền giữa lúc sửa, chốt và luồng nhập nguồn.
- **Chưa có chứng cứ published Rules hiện đang chạy**: cần đọc read-only `/.settings/rules` qua Firebase CLI tài khoản quản trị, sao lưu/snapshot/khôi phục rồi mới phê duyệt triển khai Rules ứng viên. Chỉ merge GitHub không publish Firebase Rules.
- Nghiệm thu 2 Google UID riêng biệt trên trang WebApp thật, kiểm tra đọc chung, cấp/cấm ghi, live readback/realtime, khi thu hồi quyền và sau FROZEN. Không thử xóa hoặc ghi dữ liệu thật ngoài hàng thử chuyên dụng được duyệt.

**HOLD Rules production:** không có thay đổi nào với Firebase Cloud từ PR kiểm toán này. Supabase vẫn tạm dừng.
