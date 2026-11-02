# PR147 FRCR-01 – gói phát hành tái lập và quy trình an toàn

**Tài liệu thuộc candidate, không phải giấy phép deploy.** SHA nguồn review lịch sử: `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7`. FRCR-01 được sửa ở Rules server và có thử nghiệm parent Auth/Functions/RTDB trong [CI #41327380497](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41327380497). Gói diễn tập đã có bằng chứng theo SHA `82b6db5b4011aeea322183e9e9ca13aa73674603`; artifact chứa manifest SHA **riêng theo mỗi lần CI**, không được dùng bằng chứng của một SHA để tuyên bố kiểm thử SHA khác.

## Điều kiện dùng gói

- Gói `web-pages-default-disabled.tar.gz` là Pages bình thường, **không có V2 HTTPS endpoint đã phê duyệt**.
- Gói `web-pages-test-emulator-only.tar.gz` chỉ được chạy cùng **demo-hdnd Emulator localhost**; V2 flag bật với URL `http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit`. **Tuyệt đối không đưa lên Pages/public hosting.**
- Hai tar Functions có source + package-lock Node22: `functions-cellEdit-node22.tar.gz`, `functions-parentDatasetCommit-node22.tar.gz`. Trình đóng gói đã kiểm npm ci và Node22. Hai vùng `asia-southeast1` và `us-central1` giữ nguyên.
- FULL Rules một bản: `firebase/database.exclusive-candidate.rules.json`, raw SHA256 `ba20c51b67ed8ca9ed43af02541e6d44f665ec9b9c1f3a8065e3f3a2abf6f481`. Không dùng `firebase/database.rules.json`, không dùng default `firebase.json`.
- Archive CI + `release-manifest.json` và `SHA256SUMS`: [Run #41328054403](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328054403), [artifact #13091469937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328054403/artifacts/13091469937). Bản này chỉ chứng nhận SHA `82b6db5b4011aeea322183e9e9ca13aa73674603`, là mốc history nếu candidate đổi.

## Tái lập offline / Emulator

Từ một checkout đúng candidate SHA ở `source/` (không truy cập production):

```sh
npm ci --no-audit --no-fund
npm ci --prefix cell-edit-service --no-audit --no-fund
npm ci --prefix parent-commit-service --no-audit --no-fund
npm run typecheck
npm run test:firebase
npm run qa:firebase
npm run build:pages
VITE_PARENT_REPLACEMENT_ENABLED=true VITE_PARENT_COMMIT_ENDPOINT=http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit npm run build:pages:test
node scripts/pr147-package-artifacts.mjs
cd qa-results/pr147-release-package && sha256sum -c SHA256SUMS
```

CI dùng Node24 cho web và Node22 cho hai Functions. Sử dụng `firebase.staging.json --project demo-hdnd` khi chạy Emulator; `firebase.release.json` là **template không deploy được** vì database instance mang placeholder `REQUIRED_UNVERIFIED`.

Để kiểm cấu hình rehearsal (chỉ từ source/, với các biến **demo**; không copy sang production):

```sh
GCLOUD_PROJECT=demo-hdnd PARENT_DATABASE_URL=https://demo-hdnd.firebaseio.com FIREBASE_DATABASE_URL=https://demo-hdnd.firebaseio.com \
PARENT_ALLOWED_ORIGINS=http://127.0.0.1:4179 PARENT_COMMIT_ENABLED=true \
VITE_PARENT_REPLACEMENT_ENABLED=true \
VITE_PARENT_COMMIT_ENDPOINT=http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit \
node scripts/pr147-release-validate.mjs --mode rehearsal --config firebase.release.json
```

Nếu dùng default `firebase.json`, sai binding, thiếu biến hoặc gọi production validator thiếu phê duyệt, chương trình bắt buộc trả HOLD. Không có lệnh `firebase deploy` thực thi trong bộ diễn tập.

## Thứ tự do operator có thẩm quyền thực hiện sau khi đủ GO

1. **G0 – khóa nguồn**: xác nhận chính xác candidate SHA, Rules và checksum artifact, Node, codebase, maintenance window, người phê duyệt. So SHA mọi tệp với manifest CI. Không đổi source ngầm.
2. **G1 – trạng thái live/backup riêng tư**: người vận hành có quyền riêng đọc project/instance đã xác nhận; lưu Published Rules cùng RTDB snapshot **mới** và server audit/operation journal; kiểm restore trên staging/Emulator riêng; chọn nhánh empty legacy/nonempty legacy/V2 active theo [PR149](https://github.com/cavoixanh638/HopHDND-WebApp/pull/149). **Bất kỳ dữ liệu chưa rõ hoặc snapshot không khớp → HOLD.**
3. **G2 – cấu hình production được duyệt độc lập**: tạo bản copy cấu hình ngoài repo với instance thật, đúng hai Functions+FULL Rules, project rõ ràng; đặt `PARENT_DATABASE_URL`, `FIREBASE_DATABASE_URL`, IAM, `PARENT_ALLOWED_ORIGINS`, xác nhận HTTPS `VITE_PARENT_COMMIT_ENDPOINT`; chạy validator `--mode production --config ABSOLUTE_APPROVED_CONFIG --approval ABSOLUTE_APPROVED_RECORD`. Không chấp nhận tên project lấy từ suy đoán.
4. **G3 – duy trì maintenance/khóa ghi, stage backend**: giữ web cũ, không mở V2; kiểm hoạt động thật của Cell callable, parent endpoint với chế độ chưa cho phép ghi, xác minh runtime/region/Env/CORS/OPTIONS/IAM, không dùng fallback SDK.
5. **G4 – đưa FULL Rules đúng instance, đối chiếu Published**: chỉ sau phê duyệt Rules và backup, kiểm effective Rules readback hash, chứng minh legacy direct-write, role giả và parent ghi không đủ service claim đều bị từ chối. Nếu thiếu một service/Rules không khớp, tuyệt đối chưa publish web.
6. **G5 – bật parent backend sau Rules + kiểm tra Auth, rồi xây dựng web HTTPS V2 riêng**: không tái dùng gói emulator hoặc bản Pages thiếu flags. Khóa và so hash web `index.html`/assets, staging Chrome đa account, FRCR-01, DR-01/DR-02, Excel/restore, freeze, ACK, hai tab và cached old HTML. Chỉ operator được bật biến server sau khi ký.
7. **G6 – promote web LAST**: GitHub Pages workflow phải nhận 3 điều kiện riêng `HOPHDND_RELEASE_BACKENDS_CONFIRMED=true`, `HOPHDND_PAGES_APPROVED_MAIN_SHA` đúng SHA main, và `HOPHDND_PARENT_COMMIT_ENDPOINT` HTTPS đã xác minh. Merge vào main **không tự publish** khi các điều kiện này chưa có. Không đổi sang Cloudflare/Firebase Hosting.
8. **G7 – kiểm sau phát hành / rollback**: đọc trạng thái/Rules/operations trước; chỉ thử ghi thật theo đề cương được ký. Nếu đã có ACK hoặc UNKNOWN: freeze, sao lưu fresh, reconcile từng operationId trước khi nghĩ tới rollback; **không bao giờ restore snapshot cũ đè bản sửa đã ACK**. Không riêng lẻ thay Rules bằng bản permissive.

**STOP** khi bất kỳ SHA sai, sai instance, CORS/IAM không rõ, dependency drift, Rules Published không giống candidate, backup/restore thiếu, đang có draft/ACK chưa xử lý, hoặc web có nguy cơ phát hành trước server. `CODE_READY`, `PACKAGE_READY` và `PRODUCTION_AUTHORIZED` là ba cổng riêng: CI xanh chưa tự bật cổng production.
