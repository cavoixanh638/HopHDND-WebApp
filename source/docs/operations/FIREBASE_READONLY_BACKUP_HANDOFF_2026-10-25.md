## H. Windows: Java chưa nhận diện sau clone/npm thành công

**Bằng chứng trên máy người vận hành (25/10/2026):** Git clone trên nhánh PR #72 thành công tại `D:\HopHDND-Firebase-QA-20261025-Retry`; `npm ci` cài 719 gói; lệnh `java -version` thất bại với `CommandNotFoundException`. Không hề bắt đầu restore backup thật; không ghi PASS. Đây là sự cố điều kiện môi trường, **không xóa/reclone hoặc sửa npm lock**, không chạm production.

- Cài bản Java 21 từ nhà phát hành uy tín theo tài liệu Microsoft: `winget install --id Microsoft.OpenJDK.21 --exact --source winget --accept-package-agreements --accept-source-agreements`. Cài đặt có thể cần quyền Admin. Mở PowerShell mới để nhận PATH.
- Xác nhận `java -version` chạy thành công. Nếu vẫn báo không nhận diện, kiểm tra thư mục cài và PATH của Java, không mặc định cài lại hoặc thay đổi môi trường global bừa bãi.
- **Tiếp tục trên clone cũ** bằng `Push-Location 'D:\HopHDND-Firebase-QA-20261025-Retry\source'`, giữ `HDND_PRIVATE_BACKUP` trỏ riêng tư, chạy `.\node_modules\.bin\firebase.cmd emulators:exec --project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json 'node scripts/firebase-backup-emulator-restore.mjs'`, kiểm `$LASTEXITCODE` và xóa biến môi trường trong `finally`.
- `npm ci` có cảnh báo 8 lỗ hổng (6 moderate, 2 high), **không tự chạy `npm audit fix` hoặc `--force`** vì có thể thay đổi dependency/lockfile. Ghi nhận thành đầu mục security release review độc lập. Bước restore vẫn thử được nếu mã/Java hoàn chỉnh.

---

## G. Windows: khi GitHub không phân giải DNS (25/10/2026)

**Bằng chứng từ PowerShell người vận hành:** `git clone` lỗi `Could not resolve host: github.com`; thư mục `D:\HopHDND-Firebase-QA-20261025\source` không tồn tại, nên `npm ci` chạy từ `C:\WINDOWS\system32` báo thiếu package-lock, rồi Firebase Emulator không tìm thấy file config. **Không có cuộc thử restore nào được thực hiện; trạng thái vẫn HOLD, không được ghi PASS.** Các lỗi sau là hậu quả của clone thất bại, không phải bằng chứng backup hỏng hay cấu hình emulator không đúng.

**Chẩn đoán chỉ đọc:**
```powershell
Clear-DnsClientCache
nslookup github.com
nslookup github.com 1.1.1.1
Test-NetConnection github.com -Port 443
```

Nếu host GitHub chưa phân giải/port 443 chưa kết nối thì dừng, kiểm DNS/VPN/proxy của chính máy; không tiếp tục chạy npm/Firebase. Không tự động đổi DNS máy cơ quan, không tắt firewall hay kiểm tra bằng cách tắt bảo vệ mạng. Khi mạng bình thường, dùng **một script block** `& { ... }` có `$ErrorActionPreference='Stop'`, kiểm `$LASTEXITCODE` sau `git clone` và `npm ci`, xác nhận tồn tại `source/package-lock.json`, `source/scripts/restore-emulator/firebase.json`, đúng thư mục `source` trước lệnh Firebase. Gõ từng dòng lệnh vào PowerShell tương tác có thể **tiếp tục sau một `throw`**, vì vậy không coi `$ErrorActionPreference='Stop'` ở prompt là cơ chế chặn cả chuỗi. Không xóa tự động bản clone dở hoặc thư mục backup riêng tư.

**Bất biến an toàn:** chỉ dùng emulator `--project demo-hdnd-restore`, `--only database`, `--config scripts/restore-emulator/firebase.json` và `HDND_PRIVATE_BACKUP` trỏ tới tệp JSON ngoài repository. Không đổi demo project thành production, không gọi Firebase `database:set`/deploy. Chỉ khi xuất hiện `LOCAL_EMULATOR_RESTORE_DRILL_PASS` với backup thật mới ghi nhận tiến độ tương ứng.

---

## F. Thử khôi phục có kiểm soát trên Emulator biệt lập (KHÔNG ghi Firebase thật)

Đã bổ sung hai file cấu hình test trong \`source/scripts/restore-emulator/\` và script \`source/scripts/firebase-backup-emulator-restore.mjs\` trên nhánh PR #72. Bản test chỉ chạy với namespace demo \`demo-hdnd-restore\`, host \`127.0.0.1:9198\`, không đọc hay ghi Firebase production. File Rules mở tạm trong thư mục này **chỉ phục vụ Emulator demo**, tuyệt đối không deploy lên production.

Trên máy Windows đã có clone chứa đúng nhánh PR #72 và dependencies ở \`source/node_modules\`:

\`\`\`powershell
# Clone RIÊNG bản thử nghiệm vào D:\\HopHDND-Staging (không chứa file backup)
git clone --depth 1 --branch feat/exclusive-cell-leases-admin-freeze-20261025 https://github.com/cavoixanh638/HopHDND-WebApp.git "D:\\HopHDND-Staging"
Set-Location "D:\\HopHDND-Staging\\source"
npm ci
java -version
$env:HDND_PRIVATE_BACKUP = "D:\HopHDND-Private-Backup\2026-10-25\database-1.json"
node --check scripts/firebase-backup-emulator-restore.mjs
npx firebase emulators:exec --project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json "node scripts/firebase-backup-emulator-restore.mjs"
Remove-Item Env:HDND_PRIVATE_BACKUP
\`\`\`

Phải có Java đủ mới cho Firebase Emulator. Nếu Firebase Emulator không khởi động, lệnh phải dừng, **không đổi \`--project\` thành ID production**, không dùng Firebase Console Import Data trên production. Chỉ chấp nhận dòng \`LOCAL_EMULATOR_RESTORE_DRILL_PASS\` khi đã PUT vào localhost, GET đọc lại và so SHA256 JSON chuẩn hóa toàn bộ, số dòng và các nhánh cấu hình. Nếu cấu trúc hai bên khác, phải dừng để điều tra, không chấp nhận một lượt xuất đúng hash chỉ vì file JSON parse được.

**Trạng thái hiện tại:** mã thử restore đã được lưu GitHub nhưng **chưa có bằng chứng đã chạy với file backup riêng tư trên máy người vận hành**. Không đánh dấu \`HDND-RESTORE-DRILL\` PASS trước khi có kết quả đó.


---

## E. Kết quả trên máy quản trị được báo ngày 25/10/2026 (không phải chứng nhận GO)
- `database-1.json` và `database-2.json`: mỗi file 56.185 bytes, parse JSON thành công, SHA256 giống nhau `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`.
- `rules-live.json`: 24.497 bytes, parse JSON hợp lệ và có `rules`, SHA256 `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`.
- Dữ liệu JSON chưa được trợ lý đọc; không có dữ liệu/Rules production nào được đưa vào GitHub. Mức bằng chứng là đầu ra PowerShell của người vận hành.
- Cần tiếp: xác nhận đúng Rules Published, kiểm kê metadata của dữ liệu (không in giá trị), diff candidate Rules bảo mật và nạp thử trên môi trường Firebase Emulator độc lập. Không coi 3 hash PASS là restore đã đạt.

---

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

## D. Kiểm tra lại bản sao lưu khi bàn giao/di chuyển máy
Từ thư mục `source/`, dùng **bản sao lưu nằm ở nơi riêng tư**:

```powershell
node scripts/firebase-backup-verify.mjs "C:\\HopHDND-private\\backup-before-primary"
```

Dòng `BACKUP_INTEGRITY_PASS` chỉ xác minh SHA-256, kích thước và số bản ghi **của bản sao cục bộ**; nó không chứng minh Rules là bản đang chạy hoặc đã thử restore. Nếu file bị sửa/tráo/tên chứa đường dẫn bất thường, script thoát khác 0. Kịch bản được chạy với fixture giả trong CI; không dùng credential. Không công bố dữ liệu JSON, hash có thể ghi vào hồ sơ nội bộ.

## C. Lỗi, tình huống phải dừng
- Không có quyền đọc project/instance hoặc xác thực Firebase CLI lỗi.
- File Rules không chắc chắn là bản đang publish, bị sửa sau khi sao lưu hoặc chứa dữ liệu khác.
- Database thay đổi giữa hai lần export (ví dụ mirror job còn hoạt động).
- Database trống bất ngờ, `hdnd/items` đã có dữ liệu chưa được đối chiếu, `hdnd/profile` hoặc `hdnd/permissions` thiếu.
- Không thực hiện được thử khôi phục và kiểm tra đầy đủ bản copy.
- Không có người có quyền Firebase xác nhận quyết định GO.

**Quan trọng:** GitHub Actions không chứa tài khoản Firebase production nên **không** thể tự chạy backup thật. Việc GitHub PR #71/#72 có CI SUCCESS không thay cho bước trên. Tài liệu này không xác nhận production đã sao lưu.
