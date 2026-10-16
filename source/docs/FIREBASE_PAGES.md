# Firebase Realtime Database trên GitHub Pages

> **Phân ranh tài liệu:** File này chỉ mô tả Firebase Auth/RTDB, schema và nguyên tắc Rules. Quy trình backup, khôi phục, cập nhật Pages, quay về bản cũ và xử lý sự cố tập trung ở [VAN_HANH](VAN_HANH.md). Ánh xạ trường và ID Sheets xem [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md). Các ví dụ cấu hình không xác nhận đã áp dụng Rules thật.



Ngày cập nhật: 15/10/2026. Bản GitHub Pages dùng Google Sheets qua `SheetsRepository`/GViz làm nguồn nội dung. Firebase chỉ phục vụ Auth, hồ sơ cấu hình `hdnd/profile` và quyền `hdnd/permissions`; không đồng bộ định kỳ dữ liệu Sheets sang Firebase. Tài liệu mô tả đích tích hợp, chưa áp dụng cấu hình, Auth providers, domain, hoặc Realtime Database rules lên Firebase thật; chưa ghi dữ liệu thật hay phát hành Pages.

## Thiết lập dự án thật (thủ công)

- Firebase project: `hophdnd-8b7b2`.
- Firebase Console → Authentication → Sign-in method: bật **Anonymous** và **Google**. GitHub Pages không phải Auth provider.
- Firebase Console → Authentication → Settings → Authorized domains: thêm hostname Pages đang dùng (ví dụ `owner.github.io`; với project site thì vẫn là hostname đó, không phải path dự án).
- Quản trị viên đã xác minh: `cavoixanh638@gmail.com`, provider `google.com`.
- Mở `firebase/database.rules.json`, rà toàn bộ nội dung và đối chiếu với schema cuối cùng. Sao lưu rules hiện tại, rồi chỉ **ghép nhánh `hdnd` có phạm vi hẹp** vào rules hiện hữu. Không thay toàn bộ rules của một project dùng chung hoặc xóa các nhánh khác. Giữ mặc định deny cho trường chỉnh sửa chưa có quyền cột hoặc ngoại lệ ô; quản trị viên mới cấp quyền bằng panel.
- Chưa áp dụng các bước trên vào Firebase thật. Trước khi áp dụng, review rules trên emulator và đối chiếu với rules đang có để không làm đổi quyền của nhánh không liên quan.
- Khách ẩn danh dùng Firebase Auth; Google admin phải là `cavoixanh638@gmail.com`, email đã xác minh và `sign_in_provider` là `google.com`. Auth không biến Firebase thành nguồn nội dung.
- Nội dung đọc từ Sheets. Người dùng có thể sửa thử ô được cấp quyền trong giao diện, nhưng phần sửa chỉ ở trình duyệt và không ghi Sheets hoặc Firebase.

## Realtime Database schema

Các nhánh được dùng:

```text
hdnd/
  items/                 # nhánh nghiệp vụ còn trong schema cũ; Rules hiện khóa ghi
  permissions/
    columns/             # fieldKey: boolean; quyền mặc định cho trường trên mọi dòng
    rows/                 # recordId: boolean; quyền theo dòng
    cells/                # recordId/fieldKey: boolean; ngoại lệ riêng theo ô
  profile/               # {revision, payload}; payload là JSON.stringify({catalogs,reports,items})
```

`hdnd/permissions` chỉ là cấu hình quyền do admin Google cập nhật. Mỗi giá trị `true` cho phép, `false` từ chối; quyết định quyền theo thứ tự: ngoại lệ cell, quyền row, quyền column, rồi mặc định deny. `recordId` cho row/cell lấy từ Sheets; không cần import item vào `hdnd/items` để cấu hình quyền. `recordId` của Sheets phụ thuộc vị trí hàng, vì vậy sau khi chèn hoặc sắp xếp hàng phải rà và cấp lại quyền liên quan. Không tự ánh xạ khi chưa xác định chắc chắn dòng tương ứng. Chỉ các `EditableField` được hỗ trợ mới được xuất hiện: trường văn bản, `documentKind`, và `isDropped`. Không đưa mã hiển thị, STT, trường revision hay metadata máy chủ vào danh sách ô chỉnh sửa.

`profile.payload` đóng gói JSON vì khóa danh mục có thể chứa dấu `.` hoặc `/`, vốn không phù hợp làm khóa trực tiếp của Realtime Database. `hdnd/items` và `FirebaseRepository` còn trong mã phục vụ chuyển đổi tương lai; Rules hiện khóa ghi nhánh items, và nhánh này chưa được kích hoạt làm nguồn nội dung. Không tự suy diễn hoặc chuyển đổi giá trị nghiệp vụ mơ hồ khi nhập dữ liệu.

Xuất dữ liệu lấy từ snapshot Sheets đã đọc; xuất JSON profile dành cho admin vẫn có. Nhập Excel dữ liệu đang khóa. Không dùng import để tạo/sửa bản ghi Firebase. Không tự đồng bộ Sheets→Firebase theo lịch.

## Bảo vệ dữ liệu

Realtime Database rules phải kiểm tra danh tính, quyền quản trị, allowlist trường và phạm vi bản ghi tại server. Rules là ranh giới bảo mật; logic giao diện và dữ liệu trong browser không phải nguồn thẩm quyền. Chỉ triển khai rules sau khi đối chiếu với schema cuối cùng và kiểm trên emulator. Cấu hình dự án thật cần được áp dụng thủ công; không lưu service account, private key, hoặc token quản trị trong HTML, repository hay biến môi trường dùng ở client.

## Đọc lại và build

- Tạo một HTML tự chứa cho GitHub Pages bằng `npm run build:pages`; artifact đầu ra là `dist-pages/index.html`.
- Emulator development cần Java 21+, với `JAVA_HOME` trỏ đúng JDK và Java `bin` trên `PATH`. Đây là yêu cầu máy phát triển; người dùng cuối không cần cài Java.
- Sheets được đọc qua GViz khi mở app, khi người dùng bấm đọc lại, và polling mỗi 60 giây khi trang hiển thị, không có nháp và không có lượt đọc đang chạy. Nếu trang ẩn hoặc có nháp thì bỏ lượt polling; lỗi đọc giữ snapshot trước đó.
- Không ghi nhận kết quả kiểm mới trong tài liệu này. Kiểm cục bộ/emulator không chứng minh cấu hình Firebase production đã được áp dụng hoặc Pages đã phát hành.

## Thành phần giao diện

`src/features/settings/FirebasePanel.tsx` là panel cấu hình quyền: quyền cột, dòng, ngoại lệ ô và thao tác lưu tường minh. Thay đổi quyền là bản nháp cục bộ tới khi admin bấm Lưu. Quyền này chỉ cấu hình ai được phép sửa thử trên giao diện; bản Pages hiện giữ các sửa nội dung tại trình duyệt, không gửi chúng tới Sheets hoặc Firebase. Rules vẫn là ranh giới bảo mật cho các nhánh Firebase.

`src/features/settings/FirebaseProfileTransfer.tsx` giữ luồng nhập/xuất JSON profile, gồm xem trước và lưu tường minh dành cho admin; tệp phải khớp schemaVersion/projectId và tối đa 300 KB. Chức năng xuất dữ liệu lấy từ Sheets, còn nhập Excel dữ liệu đang khóa.

## Mở rộng 0.7.1 — kiểm soát duyệt và khóa sửa (PR #3, chưa phát hành)

Ngoài `hdnd/profile` và `hdnd/permissions`, đề xuất thêm hai nhánh RTDB với quyền giới hạn:
- `hdnd/control`: người dùng đã xác thực đọc, **chỉ admin Google đã xác minh** được ghi giao dịch CAS `revision`, `editingLocked`, `changedAt`. Client fail-closed nếu không tải được trạng thái. Chỉ khóa sửa thử trong WebApp, **không** khóa file Sheets.
- `hdndReviews/<spreadsheetId>/<gid>`: **chỉ admin** được đọc/ghi. Mỗi mốc gồm revision, nguồn, người/giờ duyệt, snapshot dữ liệu, số nội dung thay đổi và historyJson tối đa 20 metadata. Ghi phải qua CAS revision; khi xung đột không ghi đè mốc của tab khác. Snapshot này là bản so sánh, không phải lịch sử chỉnh sửa từng sự kiện. Không chép bản mốc lên public GitHub.

Không sửa `hdnd/items` hay triển khai Rules production trong PR phát triển; trước khi dùng phải thẩm tra Rules mới, kiểm thử emulator, đối chiếu Rules production có thể đang chứa nhánh của ứng dụng khác, sao lưu và áp dụng có phạm vi. Lưu ý mã Sheets thiếu/trùng hoặc chèn/sort hàng có thể làm sai ánh xạ vị trí; màn hình duyệt cần được rà bằng dữ liệu thật trước nghiệm thu.

