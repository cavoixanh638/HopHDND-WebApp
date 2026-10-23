# HopHDND — đo thời gian khởi động thực tế và ngăn đọc trùng (23/10/2026)

## Phân tích dựa trên mã nguồn (không tự suy đoán thời gian mạng)

Ở bản trước PR #29, tệp HTML JS build cuối đã gần 1.1 MB chưa nén, gzip khoảng 334 KB (giá trị ví dụ từ bản build test; khác điều kiện cache/network của từng máy). Khung React không chứa sẵn bản ghi Excel/Firebase nên kết nối mạng là cần thiết ở lần mở mới.

### Chuỗi khởi động
1. Trình duyệt tải HTML/JS, parse/chạy React/Firebase SDK.
2. `useFirebase` mở `onAuthStateChanged`. Nếu chưa có phiên hợp lệ, đăng nhập ẩn danh với Firebase Auth trước khi truy cập các nhánh RTDB cần xác thực.
3. Khi đã có User, cùng một effect đăng ký song song `.info/connected`, `hdnd/profile`, `hdnd/permissions`, `hdnd/control`. Cấu hình layout lưu trong localStorage từng xác nhận được dùng ngay trước khi profile mới tới; localStorage **không dùng để cấp quyền sửa**.
4. Tài khoản có cấu hình `dataSource=database`: `onValue(hdnd/mirrors/{fileId}/{gid})` tự cấp bản snapshot ban đầu; sau đó phát thay đổi theo thời gian thực. Cấu hình chưa cache có thể tạm trỏ sang Google Sheets cho đến khi nhận profile từ Firebase, nên lần mở đầu sau xóa storage sẽ mất thêm thời gian.
5. React tính số liệu thống kê và dựng bảng báo cáo/danh sách trong trình duyệt sau khi nhận rows. Danh sách chỉ tải UI khi người dùng chuyển sang tab Danh sách, nhưng dữ liệu chung dùng cùng một nguồn.

### Lỗi làm mất thời gian phát hiện
- Trước sửa, `useWorkspace` gọi `get()` thông qua `repository.list()` và **cùng lúc** gọi `onValue()` qua `repository.subscribe()` trên cùng đường snapshot. Điều đó tạo hai đường đọc logic cho một dữ liệu.
- `App` đưa `firebase.user.uid` vào dependencies của `useMemo` tạo repository. Khi Firebase Auth chuyển từ null sang user, object thay đổi, workspace reset `items=[]` và có thể tải lại cùng 55 dòng.
- Đã sửa tại PR #29: `subscribeInitial=true` áp dụng cho riêng Firebase mirror, không tự gọi `list()` lần đầu; chỉ subscribe khi có `firebase.user`; giữ nguyên instance repository qua thay đổi UID nếu source chưa đổi. `list()` vẫn còn phục vụ kiểm tra chuyển source của admin và refresh theo yêu cầu.

### Vì sao không thể kết luận một con số mili giây từ mã
Không có tốc độ mạng, DNS/RTT, Chrome cache, trạng thái Auth và RTDB server của máy người dùng. Không được coi CI giả lập Firebase là thời gian production. Lần đầu, lần F5, và lần mở trong cửa sổ ẩn danh có thời gian khác nhau.

### Công cụ đo KHÔNG chứa nội dung công việc

Sau khi PR #29 CI PASS và đã deploy:

1. Mở `https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1`
2. F5 (đầu tiên), chụp bảng **Chẩn đoán thời gian mở trang**. Mỗi mốc là số ms tính từ lúc bắt đầu navigation, **không cộng** các hàng vì có kênh song song.
3. Bấm **Sao chép số đo (không gồm dữ liệu bảng)** để gửi nguyên JSON timings. Nếu cần biết cold/hot, làm lần thứ hai bằng F5 sau 30 giây; lần đầu mở ẩn danh có Auth chậm hơn.
4. So sánh: `js-entry`, `firebase-initialized`, `auth-checked`, `auth-signed-in`, `rt-db-connected`, `profile-received`, `permissions-received`, `control-received`, `data-subscribe`, `data-first`, `first-data-painted`.
5. Để biết request download chi tiết và size từ mạng, mở Chrome DevTools (F12) → Network → Disable cache tùy mục tiêu → Reload → waterfall. RTDB có WebSocket; riêng timing WebSocket không tương ứng `ResourceTiming` HTTP request. Không tự đưa token, headers, bản ghi vào tài liệu công khai.

**Điều kiện nghiệm thu**: không hiển thị nhầm dữ liệu khi chưa có Auth; `get()` không bị gọi trùng từ subscriber; sau Auth, snapshot đầu tiên tới phải hiện đúng 55 dòng; cập nhật Firebase onValue phải giữ bảng không nháy trắng, kích thước/giữ quyền admin. Nếu dữ liệu 55 dòng chưa thay đổi, chuyển tab không yêu cầu tải lại nguồn.
