# DATA — migration cấp trình Thành ủy (PREPARED, LIVE HOLD)

**Không triển khai hoặc ghi dữ liệu production trong đợt UI 05/11.** Đích dự kiến: Firebase project `hophdnd-8b7b2`, RTDB instance `hophdnd-8b7b2-default-rtdb`. Chỉ có nghiệp vụ khi UI mới được người dùng nghiệm thu, Rules/Functions cùng phiên bản và quyền vận hành được phê duyệt.

## Mapping đóng
- `partyLevel: "Không phải trình" → "Không"`.
- `partyLevel: "BTV TU" → "BTV"`.
- Khi `partyLevel` mới là `Không`: `progressParty = "Không phải trình"`; không ảnh hưởng `progressBuild`/`progressCouncil`.
- `Không → TTTU/BTV/BCH` trong **giao dịch sửa ô runtime** ép `progressParty = "Sở chưa trình"`; migration không được suy đoán rằng một tiến độ đã hoàn tất ở record thuộc cấp khác cần bị reset.
- Alias lạ KHÔNG được tự đoán mapping. Kê khai riêng và HOLD trước khi chạy.

## Inventory, privacy, dry-run
Input offline là snapshot JSON **đã được phê duyệt và lưu ở máy vận hành an toàn** theo định dạng `{"items":{"<recordId>":{"partyLevel":"...","progressParty":"...","revision":1,"operationId":"..."}}}`. Không commit input, private plan, rollback hoặc dữ liệu gốc vào repo, artifact CI hay console.

```bash
cd source
node scripts/party-level-migration.fixture.mjs
node scripts/party-level-migration.mjs dry-run /secure/approved-snapshot.json /secure/redacted-manifest.json
```

Lệnh dry-run trên chỉ đọc file local, ghi manifest redacted với mode 0600, dùng `wx` không ghi đè, không có Firebase SDK/API. Console chỉ in tổng số record, số đổi cấp, số đổi tiến độ, số unknown. Manifest công khai không chứa ID thô, secret hay giá trị bất thường; danh mục chưa nhận diện được hash. `privatePlan` trả về từ module phải giữ trong khu vực bảo vệ riêng cùng backup, không ghi log/commit.

**Quy trình đề xuất cho đợt thực thi được phê duyệt riêng:**
1. Xác minh bằng đọc có quyền rằng project ID, database instance, active dataset/generation và path mục tiêu chính xác; dừng nếu dataset active chuyển.
2. Đóng băng ghi nghiệp vụ (admin cũng phải bị chặn), xác nhận không còn lease/giao dịch đang chạy. Lấy **backup toàn bộ RTDB + Rules đúng phiên bản + metadata active generation**, sha256 và bản sao thứ hai lưu riêng; thử phục hồi backup vào Firebase Emulator độc lập.
3. Inventory lại snapshot đúng thời điểm backup; so khớp source hash, tổng row, unknown=0, manifest đã duyệt và đường dẫn đích. Lập bản privatePlan chứa expected old values/revision/operationId và giá trị cũ để rollback. Chỉ sửa record có khác biệt. Nếu dữ liệu có thể bị dịch chuyển hay sửa, phải dừng và inventory lại.
4. Chỉ một operator được cấp quyền có **approval ID riêng cho live**, xác nhận đúng project `hophdnd-8b7b2`, instance `hophdnd-8b7b2-default-rtdb`, backup hash, manifest hash và code SHA; **KHÔNG dùng token/credential trong tham số command hoặc log**. Cần bổ sung executor live có kiểm tra tất cả guard; phiên bản hiện tại **chưa có executor ghi live**.
5. Executor tương lai phải dùng CAS riêng từng record (expected values/revision), giới hạn batch, journal xác nhận từng record, dừng khi conflict, bảo toàn lịch sử/version theo chính sách migration được duyệt. Không dùng update root hoặc ghi đè toàn bộ items. Sau ngắt, đọc lại tình trạng và resume từ journal, không áp lại record đã đúng.
6. Verify readback từng field, đếm lại inventory còn alias cũ=0, record ngoài manifest không thay đổi, so hash/diff toàn bộ ngoài các field cho phép; bảo đảm số sửa thực tế bằng count manifest, kiểm user permission/freeze và mở lại sau khi đạt GO.
7. Nếu lỗi: giữ đóng băng, **không rollback blind overwrite**. So từng record với snapshot/privatePlan/journal, khôi phục có CAS sau khi kiểm không có concurrent changes; nếu không bảo đảm tính nhất quán, restore toàn bộ snapshot đã xác thực qua quy trình khôi phục riêng được phê duyệt. Verify sau rollback, audit và báo NO-GO.

## Phân biệt bằng chứng
- **CI/fixture PASS** = chứng minh planner chỉ trên dữ liệu giả / Emulator. Không chứng minh backup, quyền production, dữ liệu live hoặc deploy Rules.
- **Live migration DONE** chỉ khi có GO, project/instance/active path đọc lại, backup+restore thử, inventory thật, approved private plan, executor reviewed, journal, post-run readback, rollback readiness và biên bản nghiệm thu.
- Trong đợt này: **LIVE NOT RUN / PRODUCTION HOLD**.
