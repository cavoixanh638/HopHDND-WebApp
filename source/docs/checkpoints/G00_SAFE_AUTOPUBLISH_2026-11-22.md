# G00 — Khôi phục tự động phát hành giao diện HĐND (22/11/2026)

## Vì sao trước đây phải bấm Run workflow?
`publish-pages.yml` vẫn chạy khi push `main`, nhưng `pages-release-policy.mjs`
chỉ cho phép tự động các tệp thuộc danh sách giao diện được kiểm soát.
PR #226 đã sửa cả `App.tsx` và `ItemColumnPanel.tsx`, hai tệp chứa
logic thao tác/quyền, nên auto-publish đúng chính sách đã HOLD.

## Quyết định triển khai
- Cho phép **đúng một** commit #226 đã kiểm thử đủ 10/10 workflow, được pin
  theo SHA, SHA cha và đủ 9 đường dẫn tệp. Không thêm `App.tsx` hoặc
  `ItemColumnPanel.tsx` vào danh sách tự động chung.
- Cho phép **một** commit khôi phục chính sách ngay sau SHA #226, pin vào
  cha, thông điệp và đúng 5 tệp đã phê duyệt. Nếu baseline đã đổi, hoặc có
  thêm bất kỳ tệp nào, cổng tự động HOLD.
- Những lần sau, thay đổi chỉ chạm CSS, tệp giao diện nằm trong allowlist và
  kiểm thử tự động PASS sẽ phát hành khi merge/push lên `main`.
- Các thay đổi ở Firebase Rules, xác thực, lưu dữ liệu, phân quyền, App core,
  nguồn nhập và workflow không nằm trong ngoại lệ vẫn yêu cầu owner
  `Run workflow` đúng SHA sau khi rà soát.
- Trước khi xuất bản, workflow luôn chạy TypeScript, unit tests, đầy đủ
  Chromium smoke (bao gồm kích thước cột, Lưu/Hủy), dropdown thật,
  Firebase Spark Emulator, tài liệu và kiểm tra build không chứa API operator.

## Kiểm tra và nghiệm thu
1. `node --test source/scripts/pages-release-policy.check.mjs` và
   `node --test source/scripts/pages-release-approval.check.mjs` PASS.
2. PR HEAD chạy `Verify HopHDND source` và các CI liên quan PASS.
3. Sau merge theo đúng chính sách đã qua kiểm thử, workflow trên `main`
   phải có `release-gate = auto`, `publish = SUCCESS`.
4. `version.json.source_sha` phải bằng SHA commit nguồn đã được CI xác thực
   (không nhầm với SHA commit build tài nguyên).
5. Không deploy Firebase Rules hoặc ghi dữ liệu sản xuất.

**Điều kiện dừng:** nếu bất kỳ cổng nào FAIL, không bỏ qua bằng cách sửa biến
phát hành hoặc chạy một workflow khác. Báo rõ đường dẫn bị chặn và nguyên nhân.

## Rollback
Revert commit chính sách qua PR đã kiểm thử. Chính sách cũ giữ nguyên
cơ chế owner-dispatch; các commit phát hành không bao gồm Firebase Rules.
