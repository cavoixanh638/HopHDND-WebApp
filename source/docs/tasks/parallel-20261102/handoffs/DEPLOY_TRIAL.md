# Checkpoint — triển khai thử sau bản tích hợp

> Tiếp quản ngày 11/11/2026: owner yêu cầu Spark, không Blaze/billing. Xem
> [Spark takeover](../../../operations/SPARK_ROLLOUT_2026-11-11.md) để tiếp tục
> nhánh Emulator đã PASS. Production vẫn HOLD; không áp dụng đề xuất bật
> Cloud Functions/billing ở checkpoint lịch sử bên dưới.

- Status: HOLD_EXTERNAL / DEPLOY_NOT_RUN; ngày 03/11/2026 Asia/Saigon.
- Owner: chat điều phối tiếp tục khi có đích/GO và gate; không mở lại 5 phần đã PASS.
- Candidate branch: `integration/20261102-five-streams`; tested/rebuilt code SHA `66e33b85a3424b2316f090e214e813cd04331afc`; docs-only HEAD trước checkpoint `16115998af6a9d2a75d60c7fcea4823a0a0f8d09`.
- [Bàn giao tích hợp](../reviews/INTEGRATION_2026-11-02.md); [runbook](../../../releases/PR147_RELEASE_RUNBOOK.md).
- User ngày 02–03/11 yêu cầu “deploy thử đi, xem lỗi gì mới sửa tiếp” rồi giao chat riêng; chat riêng lỗi workspace hết credits, điều phối tiếp tục.
- Checkout: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/parallel-five-integration`. Dirty runtime: none.

## Read-only preflight
- `firebase login:list`: cavoixanh638@gmail.com.
- `firebase projects:list --json`: chỉ một project `hophdnd-8b7b2` (ACTIVE); chưa thấy staging tách biệt.
- `firebase database:instances:list --project hophdnd-8b7b2 --json`: instance duy nhất `hophdnd-8b7b2-default-rtdb`, asia-southeast1, ACTIVE.
- `firebase functions:list --project hophdnd-8b7b2`: FAIL. Debug cho thấy GET Cloud Functions v1 API HTTP 403, reason `SERVICE_DISABLED`: `cloudfunctions.googleapis.com` chưa bật trên project. IAM probe trả quyền list, nhưng API tắt. Không suy ra trạng thái Functions từ lỗi này.
- `firebase.release.json` tracked: `database.instance=REQUIRED_UNVERIFIED`, đúng hai codebase Node22; default `firebase.json` cố ý trỏ Rules file không tồn tại. `node scripts/pr147-default-deploy-guard.mjs` PASS (chặn deploy mặc định). Validator production không có approval trả `PR147_RELEASE_HOLD USAGE_MODE_CONFIG_AND_APPROVAL`.

## Kết luận và bước tiếp
- Chưa chạy `firebase deploy`; chưa đổi project/Rules/data/hosting/Functions hoặc enable API.
- Đây là project production duy nhất đã thấy. “Deploy thử” lên project đó là thay đổi production thật, không phải staging. Chưa có Published Rules/backup thực+restore/IAM+endpoint/approval/GO theo runbook. Cloud Functions API tắt còn chặn Functions deployment.
- Nếu owner muốn staging: cung cấp hoặc tạo project staging tách biệt, xác nhận target; cấu hình staging không được trỏ localhost/public demo web. Nếu owner muốn production: xác nhận project+instance, cho phép bật Cloud Functions API và các API/billing cần thiết, cung cấp private approval/backup và hoàn tất gate G0–G2 trước deploy backend. Không dùng gói web emulator cho production.
- Khi có điều kiện: đọc lại HEAD/dirty, kiểm backup/Rules/target, tạo config riêng ngoài repo, validator production, deploy backend trước, FULL Rules sau, web cuối; theo dõi lỗi và lưu run/output. Không merge/publish web chỉ để thăm dò lỗi.
