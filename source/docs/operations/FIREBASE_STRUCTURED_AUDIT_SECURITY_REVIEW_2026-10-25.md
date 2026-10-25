# HopHDND — kiểm tra tính toàn vẹn lịch sử chỉnh sửa Firebase

Ngày: 25/10/2026. Phạm vi: PR #72 (Firebase primary + cell leases + freezing) trên Emulator hoàn toàn giả lập. Không dùng dữ liệu thật, không ghi Rules production.

## Phát hiện và xác minh

- Candidate Rules trước sửa yêu cầu phải thay đổi ít nhất một editable field khi tăng `revision`, nhưng `history/{slot}/changesJson` và `oldValuesJson` là **chuỗi JSON do client tự đặt**. RTDB Security Rules không phân tích, đối chiếu được nội dung bên trong chuỗi JSON với giá trị hàng trước/sau.
- Kiểm thử tấn công bằng tài khoản A có lease hợp lệ: thay đổi thật trường `note`, đồng thời khai báo sai `changesJson` / `oldValuesJson`. Emulator **đã chấp nhận** giao dịch giả mạo này, dẫn đến CI #40202429462 **FAIL có chủ ý** tại `prevents a valid editor from forging history JSON while changing a leased cell`. Đó là lỗi candidate **chưa triển khai production**.
- Các kiểm thử chống sửa trực tiếp `note` hoặc ghi xuống `history` không phát hiện kiểu tấn công nói trên vì nó nằm trong cùng một giao dịch cập nhật hàng hợp lệ.

## Biện pháp sửa đã được kiểm thử

Thay audit event ở primary thành các node có kiểu dữ liệu thực, do RTDB Rules đọc được:
```text
hdnd/items/{recordId}/history/{revision mod 50}
  operationId, recordId, at, actor
  changes/{editableField} = giá trị SAU
  oldValues/{editableField} = giá trị TRƯỚC
```

- Rules tại `hdnd/items/$id/.validate` yêu cầu trong **slot history đúng revision**, từng trường editable thay đổi phải có đúng hai giá trị `changes` và `oldValues` khớp hàng mới và dữ liệu trước giao dịch. Các trường không thay đổi **không được** xuất hiện trong hai map này; không chấp nhận hai chuỗi audit JSON tuỳ ý cho event mới.
- Các validator con giới hạn tên trường, định dạng và tính bất biến của slot cũ. Chỉ khi revision thực sự tăng và slot là slot hiện tại mới được ghi giá trị event mới. Các edit hợp lệ liên tiếp vẫn giữ audit cũ.
- `FirebaseRepository.save` tự xây hai map từ biến đổi thực tế, không nhận tin mù quáng dữ liệu audit từ phía client. `history()` ưu tiên map có cấu trúc mới, vẫn đọc được dữ liệu JSON cũ trong các bộ thử tương thích legacy.
- Bản phát hành đang chờ không viết `changesJson` hay `oldValuesJson` vào primary; adapter kiểm thử legacy không lease vẫn giữ giao thức cũ của Rules đời trước.

**Bằng chứng:** GitHub Actions [#40202969192](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40202969192) **PASS** toàn bộ workflow sau sửa, gồm Emulator tests: ghi audit đúng, từ chối forgery, từ chối viết trực tiếp ô/descendant audit, hai user sửa khác trường cùng hàng, realtime ba account và đóng băng. [#40202968998](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40202968998) **PASS** staging seed (synthetic only).

## Giới hạn và cổng phát hành

1. Kết quả CI trên dữ liệu mô phỏng không thay thế nghiệm thu Chrome/Edge của người thật và thẩm định Security Rules độc lập. Người vận hành trả lời “ok rồi” sau khi nhận cách chạy local staging, được lưu như **tín hiệu hoàn tất bước thao tác**, không phải biên bản đo realtime chi tiết hai UID.
2. Candidate Rules thay đổi so với hash đã so sánh offline trước đây; lần phân tích trước đó **không còn mô tả đúng candidate mới**. Không coi snapshot Rules production đã được chứng minh trùng với candidate mới, vì mới chứng minh production khớp **bản backup Published hiện hành**.
3. RTDB `history` lưu vòng 50 lần chỉnh sửa; không phải kho nhật ký bất biến vĩnh viễn. Nếu cần audit vĩnh viễn hoặc chống mọi hành vi của admin sở hữu project, phải thiết kế backend lưu sự kiện tin cậy, có quyền riêng.
4. **NO-GO production** tới khi có review độc lập candidate Rules, staging nghiệm thu chi tiết, chọn dữ liệu khởi tạo chốt ở thời điểm cutover, rollback và quyết định triển khai của chủ dự án. PR #72 vẫn DRAFT; không dùng Google Sheets làm hệ thống ghi sau cutover.

