# Checkpoint — triển khai thử sau bản tích hợp

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


## Tiếp quản 03/11/2026 — G0–G2 evidence-backed (mới nhất)

- **Status: HOLD_EXTERNAL / DEPLOY_NOT_RUN / NO_GO.** Có [hồ sơ G0–G2 và lệnh operator chi tiết](DEPLOY_TRIAL_GO_PREP_2026-11-03.md) (gồm config/approval mẫu, Rules Published, backup thực/restore, IAM, endpoint và trình tự GO); không có staging Cloud độc lập được xác nhận. `firebase.staging.json` chỉ là Emulator localhost, không phải Firebase project staging.
- GitHub đối chiếu `66e33b85a3424b2316f090e214e813cd04331afc` → HEAD trước lượt này `b73643d247b5ee8b58586cd85407b9265004f1c6`: ahead 2, **chỉ docs**. 7 workflow/8 job `success` trên đúng code SHA, không rerun. Artifact `13145110937` tồn tại, `expired=false`, `head_sha=66e33b85...`, ZIP digest `sha256:1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`, hết hạn 23/11/2026.
- **G0 PARTIAL:** code/tree/package PASS; thiếu target xác nhận, maintenance window, người vận hành và ký duyệt. **G1 HOLD:** thiếu Published Rules readback, fresh private full-root double GET, manifest/audit/ACK/UNKNOWN, restore bằng snapshot thực, nguồn A–O. **G2 HOLD:** thiếu private release config và approval đúng SHA, IAM/API/billing, HTTPS parent endpoint, CORS, validator production PASS; `functions:list` HTTP 403 `SERVICE_DISABLED` do API chưa bật là chứng cứ từ lượt trước, **chưa tái kiểm live**.
- Phiên môi trường hiện tại `node --version = v22.16.0`; `firebase` và `gcloud` không có trong PATH, `GCLOUD_PROJECT/GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_TOKEN` unset. `git ls-remote https://github.com/cavoixanh638/HopHDND-WebApp.git refs/heads/integration/20261102-five-streams` tại shell trả `Could not resolve host: github.com` (exit 128); GitHub connector vẫn đọc/ghi được. **Không có quyền/khả năng CLI để xác minh Cloud Firebase trực tiếp**. Không suy production trống/tình trạng Functions từ kết quả giả định.
- Lượt này chỉ dùng GitHub connector đọc metadata/files/compare và cập nhật **tài liệu** trên nhánh integration; không thay runtime, không merge, không `firebase deploy`, không enable API, không đọc/ghi RTDB production, không publish web, không dùng localhost demo làm web publish.
- **Tiếp theo:** operator có quyền dùng hồ sơ G0–G2 để xác minh độc lập staging hoặc ký đủ G0–G2 production, lưu tài liệu riêng tư ngoài repo, rồi mới quyết định G3. Nếu có staging thật+quyền: deploy staging, smoke/negative, sửa lỗi và rerun gate trên code SHA mới; nếu chỉ production, tiếp tục HOLD cho tới khi có security/backup/IAM/endpoint/GO và xử lý `SERVICE_DISABLED` có thẩm quyền. Chỉ đánh dấu GO theo bằng chứng live, không theo claim trong approval JSON.
