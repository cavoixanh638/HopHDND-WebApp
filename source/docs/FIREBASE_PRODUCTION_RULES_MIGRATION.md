# HopHDND — cập nhật Firebase Rules từ bản đang chạy (16/10/2026)

**Trạng thái:** FILE ỨNG VIÊN, chưa triển khai Firebase production. Không thay nguyên Rules từ `firebase/database.rules.json` vì file này **cố tình khóa `hdnd/items`** cho ứng dụng Pages chỉ xem Sheets, khác với Firebase Rules production hiện hữu.

## Bản được chuẩn bị riêng cho Firebase Console

- File duy nhất để xem xét copy/paste: **[database.production-candidate.rules.json](../firebase/database.production-candidate.rules.json)**.
- Đây là **toàn bộ** Firebase Realtime Database Rules dạng JSON, được lập từ Rules trên GitHub + đối chiếu với bản production do chủ dự án gửi ngày 16/10. **Không được copy bất kỳ file Rules nào khác** để thay production.
- Chưa có kết nối trực tiếp Firebase Console; test chỉ chạy trong Firebase Emulator (project ID `demo-hdnd`), không thể xác minh hash Rules production ở thời điểm Publish.
- Nếu production Rules có thay đổi sau ngày 16/10, dừng và đối chiếu lại trước khi Publish.

## Các quyền được bảo toàn

1. `rules['.read'] = false`, `rules['.write'] = false`, `hdnd['.read'] = 'auth != null'`: giữ mặc định từ chối khách chưa đăng nhập.
2. `hdnd/items['.write']`: **giữ quyền quản trị Google đã xác minh**, KHÔNG đổi thành `false` như file Rules thử nghiệm trong mã nguồn.
3. `hdnd/items/$id['.write']`: tiếp tục cho phép người dùng đã đăng nhập sửa **bản ghi đã tồn tại**, cấm tạo/xóa, và thêm điều kiện máy chủ:
   ```
   auth != null && data.exists() && newData.exists() && root.child('hdnd/control/editingLocked').val() !== true
   ```
   Khi admin khóa, người thường không thể vượt WebApp bằng REST/SDK; admin vẫn có quyền tại `hdnd/items` ở nhánh cha.
4. Giữ mọi kiểm tra `revision`, `operationId`, history 50 mục, allowlist trường, `updatedAt`, `updatedBy`, `profile`, `permissions`. Không sửa dữ liệu cũ khi chỉ Publish Rules.
5. Khi `hdnd/control` chưa có (trước lần admin khóa đầu tiên), hành vi ghi của tài khoản khác giữ như trước. Mặc định trên giao diện là chưa khóa.
6. Bộ thống kê theo phòng, chuyên viên, lãnh đạo không liên quan đến Rules, không bị thay đổi.

## Phần được bổ sung chủ đích

- `hdnd/control`: chỉ admin Google verified có quyền cập nhật `{revision,editingLocked,changedAt}`, bắt buộc revision tiến lên 1.
- `hdndReviews/<spreadsheetId>/<gid>`: chỉ admin Google verified đọc/ghi metadata, snapshot nội dung Sheets đã duyệt. Bản lưu phải tăng revision, dữ liệu có giới hạn kích thước. Snapshot chứa **toàn bộ nội dung đã duyệt**, cần bảo đảm chính sách nội bộ và quyền truy cập phù hợp.
- `hdnd/permissions/rows` và ID dạng `sheet:gid:row:number`: hỗ trợ quyền theo dòng/ô Sheets và ưu tiên `cells > rows > columns`. Bản production trước không có nhánh rows, nên đây là thay đổi nghiệp vụ mở rộng; nếu không muốn cấp quyền theo dòng, đừng tạo giá trị tại `rows`.
- `hdnd/permissions/cells/$id`: thêm hỗ trợ cấp quyền cho ô của dòng Sheets ngay cả khi chưa import bản ghi đó vào `hdnd/items`. Định dạng khóa được giới hạn tại Rules.

## Quy trình phát hành an toàn

1. Mở **Firebase Console → đúng project HopHDND → Realtime Database → Rules**.
2. **Sao chép toàn bộ Rules ĐANG CHẠY** vào một file máy tính: `firebase-rules-before-2026-10-16.json`. Giữ riêng bản sao; backup branch GitHub chỉ lưu mã nguồn, **không** khôi phục Firebase Rules.
3. So sánh bản Rules đang chạy với bản người dùng đã gửi và file candidate. Nếu bất kỳ quyền nào khác đã đổi, **dừng** để lập candidate mới.
4. Kiểm tra CI trên PR và đặc biệt suite `firebase-production-rules.test.ts`: người dùng sửa dòng cũ khi chưa khóa, bị chặn khi admin khóa, admin vẫn sửa, sau mở khóa được sửa lại; đồng thời quyền ghi/đọc admin và quyền cấp ô.
5. Chỉ khi người quản trị quyết định triển khai: copy **toàn bộ nội dung JSON từ candidate** vào ô Rules của Firebase Console. Đọc thông báo khác biệt rồi chọn Publish một lần; nếu báo lỗi cú pháp/permission, không tìm cách bỏ kiểm tra bảo mật.
6. Kiểm tra bằng **hai tài khoản thật** trên bản được phát hành sau: admin và khách. Xác nhận không có quyền sửa khi khóa, và dữ liệu Sheets vẫn được đọc bình thường.
7. Nếu có trục trặc: vào Rules, copy lại **toàn bộ bản sao tại bước 2** và Publish để phục hồi Rules cũ. Việc rollback Rules sẽ làm tính năng mới ngừng hoạt động nhưng không xóa snapshot đã lưu; cần rollback mã Pages về nhánh backup nếu phiên bản mới không tương thích.

## Lưu ý về giới hạn của khóa

Khóa Realtime Database **không** thu hồi quyền chỉnh sửa trực tiếp file Google Sheets, Apps Script hoặc dữ liệu được ghi bởi một dịch vụ khác. Nếu muốn khóa cả Google Sheets nguồn, phải đổi quyền bảo vệ/phân quyền Google riêng, với sự xác nhận rõ từ người quản trị.

## Các điều kiện NO-GO cần được xác nhận

- Không rõ Rules trong Firebase Console đã bị sửa sau bản người dùng chia sẻ.
- CI emulator/security hoặc browser không PASS ở SHA cuối của PR.
- Đăng nhập admin chưa kiểm tra được trên trình duyệt người sử dụng.
- Dữ liệu Sheets thiếu/trùng mã định danh hoặc dữ liệu phê duyệt vi phạm yêu cầu lưu trữ/bảo mật.
- Chưa có bản sao Rules production trước khi Publish.

**Lưu ý:** không lưu service account hay access token trong GitHub, file JSON này hoặc trên giao diện.
