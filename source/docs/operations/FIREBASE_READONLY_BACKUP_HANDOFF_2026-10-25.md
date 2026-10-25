# HopHDND — Bàn giao sao lưu Firebase production (READ-ONLY)
**Ngày:** 25/10/2026 · **Trạng thái:** Chưa chạy trên Firebase thật, chưa có file Rules/data production, KHÔNG GO.

## A. Chính xác những gì công cụ có thể làm
`source/scripts/firebase-production-readonly-backup.mjs` chỉ thực hiện **hai** lệnh `firebase database:get /` đọc nguyên Realtime Database của `hophdnd-8b7b2`, instance `hophdnd-8b7b2-default-rtdb`. Kịch bản sẽ:
1. Đòi đường dẫn Rules **đang chạy** được người quản trị chép từ Firebase Console (không dùng Rules candidate trên GitHub).
2. Lưu JSON vào thư mục riêng tư **ngoài repository**, không bao giờ ghi credentials vào GitHub.
3. Tải lại RTDB lần thứ hai và so SHA-256 hai bản byte-for-byte. Nếu biến động, báo `BACKUP_NOT_VERIFIED`, dừng.
4. Chép Rules vào kho backup và so hash. Tạo `manifest.json` chứa hash, số lượng bản ghi, cờ trạng thái **productionRulesIndependentlyVerified=false / restoreDrillPerformed=false / releaseAuthorization=false**.
5. Không dùng `database:set`, `database:update`, `database:remove`, `firebase deploy`. Không chuyển nguồn profile, không đổi permissions, không Publish Rules.

Công cụ không có quyền tự đọc Rules production từ Firebase Console; người vận hành **phải** xác nhận bản sao là bản thật, đúng thời điểm. Hai bản JSON trùng SHA chỉ chứng minh **ổn định giữa 2 lượt đọc**, không chứng minh backup an toàn phục hồi nếu chưa thử trên môi trường riêng.

## B. Thực hiện từ máy Windows với quyền quản trị Firebase
Yêu cầu Firebase CLI đã đăng nhập bằng tài khoản có quyền đọc RTDB (không gửi cho AI access token, service account, JSON dữ liệu nghiệp vụ).

1. Trên Firebase Console, xác nhận project ID `hophdnd-8b7b2` và instance `hophdnd-8b7b2-default-rtdb`. Vào **Realtime Database → Rules**, chép **toàn bộ Rules đang được publish** (không phải file GitHub) vào file cục bộ riêng tư, ví dụ `C:\HopHDND-private\rules-live.json`. Xác minh đây là Rules đang chạy, không phải bản dự thảo trên giao diện. Firebase hỗ trợ quản lý Rules trong Console hoặc CLI; deploy từ CLI có thể ghi đè Rules Console.
2. Mở PowerShell tại thư mục `source` trong bản clone của `cavoixanh638/HopHDND-WebApp`, checkout nhánh PR #72 **đúng SHA đã kiểm**.
3. Chạy `npm ci`, sau đó `npx firebase login` nếu chưa đăng nhập CLI. Không dùng token tải từ người khác.
4. Tạo **thư mục cha riêng tư ngoài repository** như `C:\HopHDND-private\`, nhưng **không tạo sẵn thư mục backup đích**. Chạy:

```powershell
node scripts/firebase-production-readonly-backup.mjs `
  --project hophdnd-8b7b2 `
  --instance hophdnd-8b7b2-default-rtdb `
  --rules-file "C:\HopHDND-private\rules-live.json" `
  --output-dir "C:\HopHDND-private\backup-before-primary"
```

5. Chỉ khi hiện `BACKUP_READONLY_OK`, bảo quản thư mục ở nơi riêng tư, cấp quyền truy cập hạn chế và sao lưu ngoại tuyến phù hợp. **Không đính kèm RTDB JSON vào issue/PR/Actions/Drive công khai**. Trình duyệt Ẩn danh còn bản nháp chỉ ở localStorage, script KHÔNG sao lưu nháp trình duyệt.
6. Đối chiếu Rules với ứng viên `firebase/database.exclusive-candidate.rules.json` trên PR #72, xác nhận tất cả nhánh không thuộc HopHDND và các quyền admin hiện hành. Rà cả từng `.write` của nhánh cha; test Firebase Emulator, thử khôi phục **trên emulator hoặc Firebase staging KHÁC project**. Không thực hiện thử phục hồi trên production.
7. Ghi vào `docs/CURRENT_STATE.md`/biên bản riêng **chỉ các mã SHA và kết quả test không nhạy cảm**, không đính kèm dữ liệu hoặc email/UID. Khi tất cả điều kiện khác trong [cổng GO/NO-GO](FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md) đạt mới có thể triển khai Rules và chuyển `hdnd/profile/dataSource` có kiểm soát.

## C. Lỗi, tình huống phải dừng
- Không có quyền đọc project/instance hoặc xác thực Firebase CLI lỗi.
- File Rules không chắc chắn là bản đang publish, bị sửa sau khi sao lưu hoặc chứa dữ liệu khác.
- Database thay đổi giữa hai lần export (ví dụ mirror job còn hoạt động).
- Database trống bất ngờ, `hdnd/items` đã có dữ liệu chưa được đối chiếu, `hdnd/profile` hoặc `hdnd/permissions` thiếu.
- Không thực hiện được thử khôi phục và kiểm tra đầy đủ bản copy.
- Không có người có quyền Firebase xác nhận quyết định GO.

**Quan trọng:** GitHub Actions không chứa tài khoản Firebase production nên **không** thể tự chạy backup thật. Việc GitHub PR #71/#72 có CI SUCCESS không thay cho bước trên. Tài liệu này không xác nhận production đã sao lưu.
