# Checkpoint — triển khai thử sau bản tích hợp

- Ngày: 03/11/2026 Asia/Saigon. **HOLD_EXTERNAL / DEPLOY_NOT_RUN**; phần read-only khả dụng đã hoàn tất.
- Nhánh bàn giao: `deploy-trial/20261103-cloud-preflight`, từ candidate HEAD `b73643d247b5ee8b58586cd85407b9265004f1c6`; checkpoint đầu `fa0d43c4b4db294929b009b8133eb7c88eec5df2`.
- Candidate: `integration/20261102-five-streams`; tested/rebuilt code SHA `66e33b85a3424b2316f090e214e813cd04331afc`; tree `763180ad21c5d947f081f088eac1df4e66395299`.
- Đã đọc [bàn giao tích hợp](../reviews/INTEGRATION_2026-11-02.md), [runbook](../../../releases/PR147_RELEASE_RUNBOOK.md), AGENTS và quy ước v3. Không mở lại 5 phần PASS.
- Không sửa runtime, merge PR/nhánh, deploy, publish, bật API hoặc ghi dữ liệu. Không CI mới; các commit bàn giao chỉ docs.

## Bằng chứng kiểm lại trong lượt cloud
- Remote candidate vẫn b73643d; compare từ code SHA có 2 commits, chỉ 6 file docs. Checkout sạch trước/sau kiểm.
- GitHub API: 7 workflow / 8 jobs completed/success đúng code SHA; run IDs: 41451315451, 41451315381, 41451315289, 41451315486, 41451315363, 41451315321, 41451315419. Không chạy lại suite.
- [Release artifact #13145110937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381/artifacts/13145110937) chưa hết hạn; expires 23/11/2026. Đã tải lại ZIP, hash bytes khớp `1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`.
- SHA256SUMS 7 mục PASS; 6 TAR inventory PASS, đủ 179 files, byte lengths/hashes khớp manifest. Đối chiếu checkout với manifest: 3 locks, FULL Rules, 2 configs và guard đều khớp.
- FULL Rules raw SHA256 `e19b8d7c395bc21a73ccb7499c3117bec034e6172f7f208754d474ce09f9a5b9`. Runbook có hash lịch sử khác; dùng manifest/code SHA hiện tại, không dùng checksum cũ.
- `node scripts/pr147-default-deploy-guard.mjs`: exit 0, PR147_DEFAULT_DEPLOY_FAIL_CLOSED_PASS; không network/deploy.
- `node scripts/pr147-release-validate.mjs --mode production --config firebase.release.json`: exit 2, PR147_RELEASE_HOLD USAGE_MODE_CONFIG_AND_APPROVAL. Đây là negative check thiếu approval, không phải production validation PASS.
- Local Node24 chỉ chạy guard; không rebuild Functions. Artifact ghi builder Node22, codebase pr142-cell-edit (asia-southeast1) và parent-v2 (us-central1), runtime nodejs22.
- Cloud không có Firebase CLI/gcloud hoặc xác thực sẵn dùng tại các vị trí chuẩn đã kiểm; không có connector Firebase/GCP. Không thể thực hiện live preflight/deploy. Không tải hoặc công khai credentials/backup/approval.

## G0–G2: chưa đủ GO
| Gate | Đã xác minh | Còn thiếu / chủ thể gỡ chặn |
|---|---|---|
| G0 PARTIAL | Exact SHA, Rules, ZIP/TAR/inventory, locks, codebases/runtime, CI | Owner/operator xác nhận target, người duyệt, cửa sổ maintenance và SHA thực thi |
| G1 HOLD | Chỉ có checkpoint lịch sử | Operator có quyền: đọc project/instance, Published Rules, fresh full RTDB snapshot + audit/journal; đối soát ACK/UNKNOWN, phân loại empty legacy/nonempty legacy/V2 active và restore độc lập khớp hash |
| G2 HOLD | Template còn REQUIRED_UNVERIFIED; default deploy chặn; web publish tách riêng | Config/approval riêng tư, IAM runtime+invoker, API/billing, database binding, Auth domain, HTTPS endpoint/CORS, maintenance/rollback/GO; validator production đủ approval |

## Bằng chứng kế thừa, KHÔNG kiểm lại live
- Máy trước thấy duy nhất project `hophdnd-8b7b2`, instance `hophdnd-8b7b2-default-rtdb` tại asia-southeast1; chưa có staging đã biết.
- functions:list trước đó HTTP 403 SERVICE_DISABLED (Cloud Functions API chưa bật). Không suy ra Functions đang có/không có, IAM đầy đủ hoặc API hiện vẫn tắt.
- Không coi checkpoint cũ hoặc Emulator PASS là bằng chứng production.

## Đầu vào tối thiểu và tối đa 3 bước tiếp
1. Có môi trường operator được xác thực và target rõ ràng. Nếu staging: project/RTDB độc lập, quyền/API/billing và Auth users thử. Web hiện ghim production trong firebase-config.ts, validator production cũng bắt khớp: cần cấu hình staging riêng + kiểm binding/kiểm thử SHA mới; không chỉ đổi --project, không public gói localhost.
2. Nếu production: operator hoàn tất bằng chứng G0–G2 riêng tư. Phê duyệt bật API/billing khác phê duyệt FULL Rules, deploy backend, bật parent, publish web và import dữ liệu. Yêu cầu “deploy thử” chưa thay thế các gate này. Approval phải đúng HEAD checkout thực thi (validator so git HEAD), không tự dùng SHA docs thay code SHA.
3. Chỉ khi đủ GO: private config + approval đầy đủ → validator production; maintenance/khóa ghi → backend với parent chưa bật ghi → FULL Rules/readback → bật parent sau kiểm Auth → web HTTPS cuối. Không merge theo yêu cầu hiện tại; nếu publish cần main/merge thì vẫn HOLD tới khi được giao riêng. ACK/UNKNOWN: freeze, snapshot fresh, reconcile; không restore cũ đè ACK.

**Kết luận:** read-only preflight DONE trong khả năng môi trường; triển khai thật HOLD_EXTERNAL. Không phát hiện lỗi runtime triển khai mới vì deploy chưa chạy. Không còn tác vụ sửa mã độc lập có căn cứ trong lượt này.
