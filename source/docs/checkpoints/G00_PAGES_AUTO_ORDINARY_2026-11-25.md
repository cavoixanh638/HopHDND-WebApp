# G00 — Mở rộng tự động phát hành Pages (25/11/2026)

## Quyết định của chủ dự án

Phát hành tự động sau khi merge và tất cả kiểm thử phát hành đạt với thay đổi giao diện, chức năng trình bày thông thường và tối ưu lịch CI không đổi nội dung kiểm thử. Giữ riêng cổng xác nhận Firebase Spark, kiểm tra hash Rules direct-CAS, Auth/RTDB Emulator, build không chứa operator, SHA main bất biến và các cổng bảo vệ chính sách phát hành. Không triển khai Firebase Rules hoặc ghi dữ liệu production trong đợt này.

## Chính sách thực thi

- Giữ allowlist UI đã có; mở rộng các mô-đun đã rà soát về tìm kiếm, bộ lọc, in, chiều rộng popup và hiển thị báo cáo. Các module bổ sung phải còn import tĩnh như trước, không có API ghi/persistence/network/dynamic execution trực tiếp. Kiểm tra từng commit theo blob trước/sau; thiếu dữ liệu hoặc file bị xóa => HOLD. Không coi kiểm tra tĩnh là chứng minh an toàn hoàn chỉnh; publisher vẫn chạy QA đầy đủ.
- Workflow QA đã biết và chỉ đọc: cho phép sửa timeout job từ 1 đến 360 phút, và block concurrency chuẩn chỉ hủy PR cũ. Không tự cho phép thay lệnh test, trigger, job/step condition, cache, permission, token, script scope, deployment hoặc preflight; workflow mới/không biết => HOLD. Tài liệu Markdown trong docs/ được phép.
- Chấp nhận biên nhận immutable của PR #230 (exact merge SHA `4565cbf8d4cad1d9c4cf852223795b04e737cbd1`, exact parent, baseline, 16 file), đã có 12/12 CI và 14/14 scope tests + docs-only acceptance PR #235. Không cấp phép cho commit tương tự, sửa tiếp hoặc thay chính sách mới.
- Giữ HOLD cho thay đổi Firebase Rules, auth, dữ liệu/ghi, phân quyền, App core, schema, phụ thuộc, workflow phát hành, release policy và mọi code chưa được phân loại. Không mở blanket allowlist cho tất cả .github hoặc feature modules.

## Nghiệm thu và kích hoạt

1. Chạy regression policy Node, Vitest, full PR CI trên exact SHA; kiểm tra cả auto và HOLD, commit lịch sử, mixed sensitive changes, missing blobs, sửa quyền/lệnh kiểm thử.
2. Merge PR chính sách khi tất cả required checks đạt; không bypass branch protection.
3. Lần đổi **chính policy** vẫn yêu cầu repository owner Run workflow trên main đúng SHA theo quy tắc cũ và mới. Không dùng lịch sử #230 hoặc biến giả để tự phê duyệt PR chính sách. Không được báo release DONE nếu chỉ merge code.
4. Xác nhận publisher/Pages thành công, version.json.source_sha đúng source, kiểm tra hai checkbox viết tắt tên của #236 xuất hiện. Các lần sửa giao diện và tối ưu lịch CI đủ điều kiện sau baseline mới tự phát hành; nếu có thay đổi bảo mật thực sự vẫn HOLD. Rollback bằng revert chính sách qua PR có review, giữ Rules/data không đổi.

Bằng chứng thực tế cần cập nhật PR/checkpoint sau khi CI và Pages hoàn tất. Trạng thái khi tạo tài liệu: PREPARED, production không thay đổi.
