# HopHDND — nghiệm thu realtime 2 trình duyệt trên môi trường Firebase demo cô lập

**Trạng thái:** chỉ staging cục bộ, không phải production GO. Không sử dụng bản backup thật, không cần mở Google Sheets.

## Mục tiêu

Mở cùng WebApp `pages.html` trong Chrome bình thường và Microsoft Edge (hoặc Chrome Ẩn danh) để có hai phiên Firebase Auth Emulator ẩn danh độc lập. Thử tài khoản A lưu `note`, tài khoản B nhận trực tiếp qua Firebase RTDB `onValue` **không tải lại trang**, đồng thời xác nhận khóa ô độc quyền và giữ bản nháp khi mạng lỗi. Môi trường dùng ba bản ghi hoàn toàn giả, quyền thử `note` và `specificProgress`, profile `dataSource=primary`.

## Chạy trên Windows QA

Đã clone nhánh PR #72 ở `D:\HopHDND-Firebase-QA-20261025-Retry` và `npm ci` / Java 21 thành công trước đó. Mở PowerShell và dán **nguyên khối**:

```powershell
& {
  $ErrorActionPreference = "Stop"
  $repo = "D:\HopHDND-Firebase-QA-20261025-Retry"
  $branch = "feat/exclusive-cell-leases-admin-freeze-20261025"
  git -C $repo -c http.version=HTTP/1.1 pull --ff-only origin $branch
  if ($LASTEXITCODE -ne 0) { throw "Git update failed. Stop." }
  Push-Location "$repo\source"
  try {
    & ".\node_modules\.bin\firebase.cmd" emulators:exec `
      --project demo-hdnd `
      --only auth,database `
      --config firebase.staging.json `
      "node scripts/seed-local-staging.mjs && node node_modules/vite/bin/vite.js --mode pages-test --host 127.0.0.1 --port 5173 --strictPort"
    if ($LASTEXITCODE -ne 0) { throw "Staging emulator failure; no production change." }
  } finally { Pop-Location }
}
```

Chờ dòng `LOCAL_PRIMARY_STAGING_SEED_PASS` và Vite thông báo local URL. Giữ PowerShell đó mở trong thời gian thử; URL thực tế là **http://127.0.0.1:5173/pages.html**. Toàn bộ dịch vụ chỉ bind `127.0.0.1`; không mở cho mạng cơ quan hay Internet. **Không** thay `demo-hdnd` bằng Firebase project production.

## Checklist nghiệm thu

1. Mở `http://127.0.0.1:5173/pages.html` trong trình duyệt A (Chrome thường) và B (Edge hoặc Chrome Ẩn danh), chờ kết nối Firebase. Cả hai phải hiển thị ba bản ghi **giả** và nhãn **Firebase Database · nguồn chính**. Nếu thấy dữ liệu công việc thật hoặc nguồn Sheets thì **DỪNG**; môi trường chưa đúng.
2. A sửa `Ghi chú` (`note`) ở cùng một dòng mẫu, nhấn Lưu, đợi tín hiệu lưu thành công. Trong B không tải lại, nội dung phải đổi sang giá trị A vừa lưu. Ghi nhận thời gian bắt đầu và lúc nội dung hiện trên B (không suy diễn tốc độ từ UI).
3. A bắt đầu sửa một ô `note`, giữ editor mở. B thử cùng ô: phải nhận thông báo ô đang được sửa, không được ghi đè. B vẫn phải có thể thử sửa `specificProgress` cùng dòng (nếu đã được cấp quyền).
4. Lưu từ B trong `specificProgress`, kiểm A tự nhận giá trị mới. Mất mạng/đóng tab khi còn bản nháp không được báo lưu thành công; những bản nháp này không tính vào dữ liệu chung.
5. Thử Chrome thường và Edge Ẩn danh (hoặc nhiều cửa sổ tách phiên). Không dùng hai tab thuộc **cùng một** anonymous login để tuyên bố có hai UID độc lập.
6. Chụp màn hình giả lập / ghi kết quả (chỉ dữ liệu mẫu), kèm thời gian, browser, 2 UID nếu nhìn thấy; không chụp nội dung thật hoặc token đăng nhập.

Khi xong, dừng PowerShell bằng Ctrl+C; Firebase Emulator và server Vite dừng, dữ liệu staging phiên này không cần giữ.

## Ranh giới GO/NO-GO

- Đây là kiểm thử **WebApp thật với Firebase SDK và hai trình duyệt thật**, nhưng với Auth/Database **Emulator** và synthetic fixtures, chưa phải test production.
- Nếu bất kỳ kiểm tra nào FAIL: giữ PR #72 Draft và không phát hành. Ghi thêm regression test cho lỗi phát hiện.
- Ngay cả khi toàn bộ PASS, vẫn cần independent Security Rules audit, staging thực sự đủ tài khoản/quyền, snapshot cutover một lần được duyệt và release GO trước khi triển khai lên Firebase production.
- Không dùng `firebase deploy`, `database:set`, `database:update`, thay Rules production, hay đồng bộ Google Sheets.
