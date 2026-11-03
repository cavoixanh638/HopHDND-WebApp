# DEPLOY_TRIAL — hồ sơ G0–G2 chuẩn bị vận hành (03/11/2026)

**Phạm vi:** tiếp quản thử triển khai candidate `integration/20261102-five-streams`. **Trạng thái: `HOLD_EXTERNAL / DEPLOY_NOT_RUN / NO_PRODUCTION_GO`.** Đây là hồ sơ công khai chỉ chứa quy trình, giá trị nhận diện công khai và các trường chưa xác minh. **Không** đưa token, RTDB snapshot, Rules Published thật, IAM policy, danh sách UID, workbook A–O hoặc approval thực lên GitHub.

## Bằng chứng đã kiểm độc lập trong phiên 03/11

- GitHub refs: đầu nhánh trước ghi checkpoint `b73643d247b5ee8b58586cd85407b9265004f1c6`. So sánh từ `66e33b85a3424b2316f090e214e813cd04331afc` có đúng **2 commit chỉ tài liệu**; code/tree đã kiểm `763180ad21c5d947f081f088eac1df4e66395299` vẫn giữ. Đây không phải SHA production web `main` được chấp thuận.
- Bảy run / tám job GitHub Actions đều `success` trên SHA `66e33b85…`: `41451315451`, `41451315381`, `41451315289`, `41451315486`, `41451315363` (2 jobs), `41451315321`, `41451315419`. **Không chạy lại** suite đã PASS.
- GitHub artifact `13145110937` thuộc run `41451315381`, `head_sha=66e33b85…`, `expired=false`, `digest=sha256:1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`, hết hạn `2026-11-23T13:16:05Z`. Evidence machine-readable tại `../reviews/INTEGRATION_EVIDENCE.json`: FULL Rules raw SHA-256 `e19b8d7c395bc21a73ccb7499c3117bec034e6172f7f208754d474ce09f9a5b9` (không dùng raw hash lịch sử trong phần đầu runbook PR147).
- Source `src/data/firebase-config.ts` trỏ `projectId=hophdnd-8b7b2`, `databaseURL=https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app`. `firebase.release.json` có `REQUIRED_UNVERIFIED`, cố ý không deploy được. `firebase.json` dùng sentinel Rules vắng mặt; `firebase.staging.json` chỉ cấu hình localhost Emulator, **không** chứng minh có Firebase Cloud staging.
- Checkpoint trước ghi nhận `firebase projects:list --json` chỉ thấy `hophdnd-8b7b2`; `firebase database:instances:list` chỉ có `hophdnd-8b7b2-default-rtdb`; `firebase functions:list --project hophdnd-8b7b2` lỗi HTTP **403 `SERVICE_DISABLED` / `cloudfunctions.googleapis.com`**. Kết quả này là bằng chứng lần kiểm trước, **chưa được kiểm lại trực tiếp** ở phiên này.
- Khảo sát môi trường thực thi của phiên này: Node `v22.16.0`, không tìm thấy executable `firebase` hoặc `gcloud`, `GCLOUD_PROJECT` / `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_TOKEN` chưa được cấu hình; `git ls-remote https://github.com/cavoixanh638/HopHDND-WebApp.git refs/heads/integration/20261102-five-streams` thất bại `Could not resolve host: github.com` ở shell hiện tại. GitHub connector vẫn đọc/ghi được repo. Không thể lấy bằng chứng live Firebase hoặc clone để chạy CLI tại đây. Đây là **giới hạn môi trường**, không phải lỗi code hay chứng cứ RTDB hỏng.

## Chọn đích

| Đích | Bằng chứng hiện có | Quyết định |
| --- | --- | --- |
| Firebase Cloud staging độc lập | Chưa có project ID/instance/IAM/dữ liệu riêng được xác nhận. `demo-hdnd` là Emulator, **không phải staging Cloud**. | `NO_TARGET / DO_NOT_DEPLOY`. Chỉ tiếp tục khi operator xác nhận staging tách biệt + quyền + config không trộn production. |
| `hophdnd-8b7b2` / `hophdnd-8b7b2-default-rtdb` | Đã thấy từ CLI checkpoint trước và public web config, nhưng **chưa tái xác nhận project live trong phiên này**. | Xem là **production candidate**, tuyệt đối không biến lệnh “deploy thử” thành thay đổi production. G0–G2 phải qua trước G3. |

## Bảng gate và điều kiện thiếu

### G0 — PIN SOURCE: `PARTIAL`

- **Đạt:** candidate code SHA và tree, 7 workflow/8 job PASS, 6 TAR/manifest/checksum, hai codebase `pr142-cell-edit` (Node22, `asia-southeast1`), `parent-v2` (Node22, `us-central1`), FULL Rules candidate hash.
- **Chưa có:** văn bản chủ dự án/operator chỉ định đích staging **hoặc** production, người chịu trách nhiệm triển khai, lịch maintenance, người kiểm duyệt Rules độc lập, phê duyệt trình tự/rollback. Nếu dùng production validator, operator phải checkout **đúng code SHA `66e33b85…`** với `git rev-parse HEAD` khớp; không ký approval theo docs-only HEAD mới rồi coi là CI cùng SHA.
- **STOP:** SHA sai, tree drift, artifact/hash sai, target chưa xác nhận, không có thời gian bảo trì và người phê duyệt.

### G1 — LIVE STATE / PRIVATE BACKUP: `HOLD`

- **Chưa có:** effective Published Rules GET trên đúng project/instance; bản Rules xuất Console thật + nguồn gốc thời điểm, readback canonical hash; full-root RTDB snapshot **mới** 2 GET khớp byte hash; manifest; audit trạng thái root `EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT` / `LEGACY_NONEMPTY_NO_V2` / `V2_ACTIVE` / `INCOMPLETE_SNAPSHOT`, v.v.; quyền/history/leases/journal/operationId và mọi ACK/UNKNOWN; nguồn Excel A–O chốt; kiểm emulator restore **trên chính snapshot được phép dùng**; chứng cứ không có dữ liệu đổi/ACK mới trước cutover.
- **Không suy luận** từ mirror cũ, CI Emulator hoặc file Rules GitHub rằng production trống/Rules hiệu lực trùng. Nếu 2 lần GET khác nhau, snapshot thiếu metadata, có ACK mới hoặc không rõ root -> `HOLD`.

### G2 — APPROVED CONFIG / IAM / ENDPOINT / GO: `HOLD`

- **Chưa có:** bản config riêng ngoài repo thay `REQUIRED_UNVERIFIED` bằng instance **đã xác minh**; operator auth và quyền Functions/Run/RTDB/Rules/service-account; Cloud Functions API/billing ở trạng thái khả dụng; runtime và region thực; đúng `PARENT_DATABASE_URL` = `FIREBASE_DATABASE_URL` = web DB URL; `PARENT_ALLOWED_ORIGINS` không wildcard; `VITE_PARENT_COMMIT_ENDPOINT` **HTTPS live**, CORS OPTIONS/POST và invocation IAM được review; approval record cho đúng SHA+project+instance+endpoint với toàn bộ flags true; kiểm `publish-pages.yml` giữ web cũ, web chỉ publish SAU backend/Rules.
- **Trở ngại chặn thật** đã ghi ở phiên trước: `functions:list` HTTP 403 `SERVICE_DISABLED`; trạng thái có thể đã thay đổi nên phải đọc lại. **Không tự bật API, bật billing, sửa IAM hay deploy khi chưa đủ GO.**
- `PARENT_COMMIT_ENABLED=false` là giá trị dự kiến cho bước backend chưa mở ghi (chỉ sau G0–G2). Không bật true trước khi Rules/backup/approval và smoke thật.

## Bộ lệnh READ-ONLY cho operator có quyền, KHÔNG chạy trong phiên này

Thực hiện tại checkout sạch **đúng source SHA** trên máy operator có Node22, Java21, npm đã khóa và Firebase CLI có phiên đăng nhập. Xác nhận shell đang ở thư mục `source/`. Các file ghi ra phải nằm trong thư mục tuyệt đối **ngoài Git repo**, bảo mật nội bộ. Lệnh ở dưới **chỉ là hướng dẫn**, không phải bằng chứng đã PASS.

```powershell
git rev-parse HEAD
node --version
node scripts/pr147-default-deploy-guard.mjs
firebase login:list
firebase projects:list --json
firebase database:instances:list --project hophdnd-8b7b2 --json
firebase functions:list --project hophdnd-8b7b2
# Nếu 403 SERVICE_DISABLED: lưu mã lỗi vào hồ sơ private, STOP; không enable API bằng suy đoán.
# Kiểm tra độc lập enabled APIs, quyền IAM và billing từ Google Cloud Console/gcloud
# bằng danh tính operator được ủy quyền; lưu kết luận đã kiểm, không đưa IAM policy thô lên GitHub.
```

Sau khi operator **đã xuất effective Published Rules từ đúng Console** vào `D:\PRIVATE\rules-live.json` (không dùng Rules trong source thay thế):

```powershell
node scripts/firebase-verify-published-rules.mjs --live-file "D:\PRIVATE\rules-live.json"
node scripts/firebase-private-rules-compare.mjs --live-file "D:\PRIVATE\rules-live.json"
node scripts/firebase-production-readonly-backup.mjs --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb --rules-file "D:\PRIVATE\rules-live.json" --output-dir "D:\PRIVATE\hophdnd-checkpoint-20261103"
node scripts/firebase-backup-verify.mjs "D:\PRIVATE\hophdnd-checkpoint-20261103"
node docs/operations/pr149/operator-check.mjs --source "D:\PRIVATE\approved.xlsx" --sheet "SHEET_DA_DUYET" --snapshot "D:\PRIVATE\hophdnd-checkpoint-20261103\rtdb.before.json" --manifest "D:\PRIVATE\hophdnd-checkpoint-20261103\manifest.json" --output "D:\PRIVATE\audit-pr149.json"
```

Chú ý: `firebase-verify-published-rules.mjs` chứng minh **file Rules private là bản Published đang hiệu lực** bằng lệnh GET `/.settings/rules`; `firebase-private-rules-compare.mjs` chỉ cho biết chênh lệch với Rules candidate, **không** cấp approval security. `firebase-production-readonly-backup.mjs` có guard cứng project/instance và GET `/` hai lần; đây không phải công cụ staging chung. Nếu staging khác ID, cần quy trình riêng được review; tuyệt đối không sửa guard để trỏ dữ liệu production vào staging.

Restore chỉ vào Emulator `demo-hdnd-restore` tại localhost:9198, từ cặp full-root backup/manifest đã xác minh. Chạy một lần với kiểm tra `$LASTEXITCODE` và giữ riêng chứng cứ; không đặt biến môi trường emulator ở phiên gọi CLI live:

```powershell
$env:HDND_PRIVATE_BACKUP="D:\PRIVATE\hophdnd-checkpoint-20261103\rtdb.before.json"
$env:HDND_PRIVATE_MANIFEST="D:\PRIVATE\hophdnd-checkpoint-20261103\manifest.json"
$env:GCLOUD_PROJECT="demo-hdnd-restore"
try {
  & .\node_modules\.bin\firebase.cmd emulators:exec --project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json "node scripts/firebase-backup-emulator-restore.mjs"
  if ($LASTEXITCODE -ne 0) { throw "RESTORE_DRILL_HOLD exit=$LASTEXITCODE" }
} finally {
  Remove-Item Env:HDND_PRIVATE_BACKUP,Env:HDND_PRIVATE_MANIFEST,Env:GCLOUD_PROJECT -ErrorAction SilentlyContinue
}
```

**Giới hạn:** restore script yêu cầu nhánh `hdnd` và auditor `PASS`; một backup thực sự root trống hoặc metadata không đầy đủ có thể bị HOLD có chủ ý. Không ghi PASS giả, không dùng `pr149/verify-restored.mjs` cho backup production vì script đó kiểm **fixture tổng hợp V2_ACTIVE**. Với root trống cần quy trình restore riêng phù hợp, review độc lập, không tự nới guard.

## Mẫu cấu hình và approval riêng tư, chỉ tạo SAU khi kiểm live

Không sửa `source/firebase.release.json` đang tracked. Operator tạo `D:\PRIVATE\firebase.release.approved.json` từ template, với **đúng** hai Functions và một FULL Rules, không hosting. Dưới đây là cấu trúc *dự kiến*, project/instance phải được re-verify:

```json
{
  "database": {
    "instance": "REQUIRED_LIVE_VERIFIED_INSTANCE",
    "rules": "firebase/database.exclusive-candidate.rules.json"
  },
  "functions": [
    {"source":"cell-edit-service","codebase":"pr142-cell-edit","runtime":"nodejs22"},
    {"source":"parent-commit-service","codebase":"parent-v2","runtime":"nodejs22"}
  ]
}
```

Các biến môi trường người vận hành chỉ được điền từ live verification; web origin dự kiến của Pages hiện có là `https://cavoixanh638.github.io` nhưng vẫn phải kiểm domain được ủy quyền. Endpoint HTTPS/Cloud Run URL không được đoán; khi URL không thuộc pattern `/{project}/us-central1/parentDatasetCommit` phải có phê duyệt riêng `nonstandardEndpointReviewed`. `PARENT_COMMIT_ENABLED=false` cho dry stage. Đối với production validator: `GCLOUD_PROJECT`, `PARENT_DATABASE_URL`, `FIREBASE_DATABASE_URL`, `PARENT_ALLOWED_ORIGINS`, `PARENT_COMMIT_ENABLED`, `VITE_PARENT_REPLACEMENT_ENABLED=true`, `VITE_PARENT_COMMIT_ENDPOINT` cần có giá trị thật; validator còn đòi các URL thống nhất với `src/data/firebase-config.ts`.

Tạo `D:\PRIVATE\approval.json` với biểu mẫu bên dưới; **mọi false/missing đều có nghĩa HOLD, không tự thay bằng true để qua validator**. Các giá trị trường nhận diện phải khớp exact SHA và URL live. Không được commit bản đã điền hay chụp private data vào GitHub.

```json
{
  "sourceSha": "66e33b85a3424b2316f090e214e813cd04331afc",
  "project": "REQUIRED_LIVE_VERIFIED_PROJECT",
  "databaseInstance": "REQUIRED_LIVE_VERIFIED_INSTANCE",
  "databaseUrl": "REQUIRED_LIVE_VERIFIED_DATABASE_URL",
  "parentEndpoint": "REQUIRED_VERIFIED_HTTPS_ENDPOINT",
  "webOrigin": "REQUIRED_APPROVED_WEB_ORIGIN",
  "operatorIdentityVerified": false,
  "databaseInstanceVerified": false,
  "liveRulesReviewed": false,
  "fullRulesIndependentlyApproved": false,
  "functionIamReviewed": false,
  "webAuthorizedDomainVerified": false,
  "functionPackagesLocked": false,
  "freshBackupAndRestoreVerified": false,
  "maintenanceWindowApproved": false,
  "pagesPublishSuppressed": false,
  "rolloutRollbackApproved": false,
  "enableParentApproved": false,
  "nonstandardEndpointReviewed": false
}
```

Operator chỉ chạy offline validator tại **checkout đúng SHA đã test**, sau khi tất cả bằng chứng/duyệt độc lập hiện hữu (không chạy lệnh này trong phiên thiếu credentials):

```powershell
node scripts/pr147-release-validate.mjs --mode production --config "D:\PRIVATE\firebase.release.approved.json" --approval "D:\PRIVATE\approval.json"
```

**Lưu ý bảo mật:** validator chỉ kiểm cấu trúc/config/claim của approval, **không** tự xác minh IAM, Published Rules, backup thật hoặc chữ ký; đầu ra `PR147_RELEASE_CONFIG_OFFLINE_PASS` **chưa phải quyền deploy**. Approval phải có operator/owner chứng nhận độc lập, stored private kèm thời điểm và evidence URL/nội bộ.

## Hồ sơ GO và thứ tự khi đã đủ điều kiện

Operator lưu riêng một record quyết định: project/instance/DB URL live, tài khoản/roles kiểm, API/billing status và thời điểm; code SHA/tree, artifact/hashes và Node; Published Rules canonical hash + diff/approval; backup bytes/hash/timestamp + emulator restore witness; loại dữ liệu (trống/legacy/V2), A–O source/hash/đối soát ACK/UNKNOWN; maintenance window, IAM/CORS/HTTPS endpoint; người phê duyệt security/operator/owner; kế hoạch khôi phục không đè ACK; Pages suppression; kết quả validator và chữ ký **GO hoặc NO-GO**.

- Nếu staging độc lập được xác nhận và quyền đủ: triển khai đúng staging, smoke read-only/negative trước, ghi endpoint/log, chỉ kiểm ghi trên dữ liệu test đã được duyệt; sửa lỗi rồi chạy lại gate ảnh hưởng theo SHA mới. Không dùng website demo localhost để publish.
- Nếu chỉ production: **không** sang G3 trước khi hồ sơ GO thật hoàn chỉnh. Sau GO theo `PR147_RELEASE_RUNBOOK.md`: G3 Functions với parent chưa mở ghi → G4 FULL Rules đúng instance và readback → G5 server enable + web HTTPS riêng có phê duyệt → G6 Pages last (main SHA được duyệt) → G7 giám sát và rollback ACK-safe. Không merge PR/nhánh trong tác vụ này. Default `firebase.json` và web emulator localhost tuyệt đối không dùng để publish.
- HOLD nếu `SERVICE_DISABLED` chưa xử lý được, published Rules thiếu, snapshot không ổn định, IAM/CORS/endpoint chưa rõ, approval thiếu hoặc bất kỳ ACK/UNKNOWN sau backup chưa reconcile.

## Kết quả thực thi trong phiên 03/11

**Chỉ thực hiện GitHub read-only metadata/file/compare, kiểm môi trường shell, thử `git ls-remote` thất bại do DNS.** Không chạy Firebase CLI, không tạo/sửa project, không enable API, không chạm RTDB/Rules/Functions, không upload dữ liệu, không chạy `firebase deploy`, không merge/main push/web publish. Không có URL triển khai candidate; URL Pages `https://cavoixanh638.github.io/HopHDND-WebApp/` là trang main tồn tại từ trước, **không** phải bằng chứng candidate đã triển khai.
