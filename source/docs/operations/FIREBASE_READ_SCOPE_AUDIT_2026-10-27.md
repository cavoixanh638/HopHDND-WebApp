# Kiểm toán quyền đọc Firebase — 27/10/2026

**Phạm vi:** `hophdnd-8b7b2` / Rules ứng viên `source/firebase/database.exclusive-candidate.rules.json`. **Không phải Rules đang Publish**, chưa truy cập được nguồn Rules Cloud trong phiên GitHub.

## Phát hiện chính
Bộ Rules ứng viên trước sửa cho phép `hdnd/.read = auth != null`. Vì WebApp dùng Firebase Anonymous Auth để xem danh sách, mọi khách ẩn danh đã đăng nhập cũng có thể `get(hdnd)` và đọc **toàn bộ** bản ghi, danh sách UID Google được cấp, quyền, token khóa ô của các phiên khác, cấu hình, mirror và biên nhận chốt. Cấm ghi **không** ngăn đọc.

## Chính sách sửa tối thiểu, tương thích WebApp
| Đường dẫn | Khách đã xác thực ẩn danh | Google chưa được duyệt | Google UID nhân viên được duyệt | Google Admin |
|---|---|---|---|---|
| `hdnd` (gốc) | Cấm | Cấm | Cấm | Cấm |
| `hdnd/items` (bao gồm 50 sự kiện history/row) | Đọc | Đọc | Đọc | Đọc |
| `hdnd/permissions`, `hdnd/profile`, `hdnd/control`, `hdnd/freezeControl` | Đọc | Đọc | Đọc | Đọc |
| `hdnd/mirrors` | Đọc (để không phá chế độ chuyển tiếp) | Đọc | Đọc | Đọc |
| `hdnd/editors` (danh sách toàn bộ UID) | Cấm | Cấm | Cấm | Đọc |
| `hdnd/editors/{uid}` | Chỉ chính UID | Chỉ chính UID | Chỉ chính UID | Đọc |
| `hdnd/editLocks` (danh sách tất cả khóa) | Cấm | Cấm | Cấm | Đọc |
| `hdnd/editLocks/{row}/{field}` | Cấm | Cấm | Đọc nếu nằm trong allowlist Google | Đọc |
| `hdnd/freezeReceipts` | Cấm | Cấm | Cấm | Đọc |
| `hdndReviews` | Cấm | Cấm | Cấm | Đọc |

**Cảnh báo chính sách chưa thể tự quyết:** Người dùng chưa yêu cầu khóa quyền *xem hồ sơ*. Vì vậy vẫn cho phép các phiên Firebase Anonymous Auth đọc `hdnd/items`, bao gồm **history** và các trường nghiệp vụ. Đây là quyền đọc có chủ đích của UI hiện hành, nhưng **không thích hợp nếu hồ sơ là nội bộ/bí mật**. Nếu cần hạn chế cho tài khoản cơ quan, thay `items/.read` thành verified Google allowlist/admin và điều chỉnh trải nghiệm khách/bảng trống đồng thời. Không coi "đã thu hẹp registry/token" là đã bảo vệ toàn bộ nội dung nghiệp vụ.

Cấm gốc `hdnd/.read` để chặn tải trọn cây không đồng nghĩa cấm các child đã được cho phép. Trong RTDB, quyền ở cha **được kế thừa xuống mọi con**, do đó không được để `hdnd/.read=auth!=null` rồi kỳ vọng hạn chế bằng rule con. `useFirebase` được sửa để người dùng thường chỉ lắng nghe `hdnd/editors/{ownUid}`, trong khi admin vẫn lắng nghe danh sách đầy đủ.

## Bằng chứng bắt buộc
- Rules unit test `exclusive-cell-freeze.test.ts`: một khách ẩn danh, một Google chưa duyệt, Google đã cấp quyền và Google admin; thử đọc gốc, registry, token, own grant, màn hình dữ liệu và các nhánh cấu hình.
- Hồi quy các test khóa ô, realtime, audit, freeze, import.
- Mọi testcase không được chạy Firebase thật để "thử" chặn ghi/xóa.
- Trước khi deploy Rules Cloud: backup/restore dữ liệu + Rules; so với published hiện hành qua lệnh `firebase database:get /.settings/rules --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb` (chỉ trên máy Firebase CLI đã đăng nhập); thẩm định các đường chưa biết trong live Rules trước khi thay toàn bộ.
- Hai phiên tài khoản Google thật: xác minh admin xem được toàn bộ, nhân viên chỉ xem own UID, hai bên nhận realtime, khi bị thu hồi thì server chặn lưu. Không dùng chung UID để kiểm thử *hai nhân viên độc lập*; cùng UID trên nhiều máy vẫn là một identity và được người dùng chấp nhận vận hành.

**Tình trạng:** Đã chuẩn bị Rules + client + kiểm thử, **chưa thay Published Rules**, không thay Firebase profile, không nhập dữ liệu, không đổi Supabase. Release phải tách code main/Pages khỏi Rules Cloud.

