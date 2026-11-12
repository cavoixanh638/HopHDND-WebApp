# Gemini DATA — cấp trình, giao dịch phụ thuộc và migration an toàn

Nhánh `ui/20261105-party-data`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Đọc [hợp đồng chung](README.md), checkpoint `checkpoints/DATA.md`, HEAD/dirty tree. Bạn là writer duy nhất của nhánh/checkpoint; bắt đầu đồng thời worker khác.

**Sở hữu:** `source/shared/field-definitions.ts`, `source/src/domain/status-contract.ts`, `source/cell-edit-service/core.js`, Rules/test service liên quan, migration script/test mới. Không sửa `App.tsx`, `ItemList.tsx`, `CompactGroupedValue.tsx`, CSS, registry mã. Nếu cần thay App.tsx, ghi chính xác patch contract cho commander sau khi bàn giao.

1. Danh mục cấp trình là `Không`, `TTTU`, `BTV`, `BCH`. Tách hiển thị cấp trình khỏi nhãn trạng thái. Khi ghi cấp `Không`, cùng transaction ghi `progressParty=Không phải trình`, khóa mọi sửa trực tiếp trạng thái này. Đổi từ `Không` sang cấp khác tự đặt `progressParty=Sở chưa trình`. Dịch vụ phải cho grant `partyLevel` thực hiện cập nhật phụ thuộc mà không cấp quyền tùy ý cho `progressParty`; giữ lease/CAS/version/history/rollback và validation server. Test grant chỉ cấp trình, grant chỉ tiến độ, denied/đua tranh/offline.
2. Chuẩn bị migration hàng loạt cho Firebase project `hophdnd-8b7b2`, RTDB instance `hophdnd-8b7b2-default-rtdb`: inventory giá trị cũ, mapping `Không phải trình→Không`, `BTV TU→BTV`, sửa trạng thái phụ thuộc; chỉ chạm record cần đổi. Tạo dry-run counts/manifest, backup plan, idempotency, verify post-run và rollback plan; không in secret/dữ liệu cá nhân. Dùng Emulator/fixture để thử cả chạy lại, ngắt giữa chừng, dữ liệu lạ. Command live phải có guard project/instance, explicit approval gate và chưa được chạy ở đợt này.
3. Ghi rõ điều kiện production: chỉ khi UI mới được duyệt triển khai, có backup/manifest và quyền chạy thì mới thực thi live theo đợt riêng. Không tự deploy Rules/Hosting, không ghi RTDB thật, không sửa Excel.

Push checkpoint sau khảo sát, commit ý nghĩa, test/lỗi và trước dừng. Ghi code/test SHA, run/artifact, PASS/FAIL/NOT RUN, migration dry-run counts và việc còn thiếu. Không gọi migration DONE live khi chỉ Emulator PASS.
