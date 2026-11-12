# Nghiệm thu độc lập Worker quản trị Họp HĐND — 12/11/2026

**NO-GO phát hành. Đọc production PASS. Kiểm thử độc lập 6 PASS, 3 FAIL.**

- Nguồn sản phẩm đã kiểm thử: `22ffe174babfb5ad6a312d041803a0cccf464f19`, HEAD
  của `feat/20261112-online-maintenance-worker` khi đối chiếu GitHub. Đã cập nhật từ
  `d6e90365` sau khi nhánh nguồn tiến thêm 6 commit. Nhánh QA
  `qa/20261112-worker-independent-acceptance`, commit test
  `b7a46825677bf59847f911fb093599d295051c93`. [PR nháp QA #169](https://github.com/cavoixanh638/HopHDND-WebApp/pull/169)
- Phạm vi thay đổi gồm test, workflow không triển khai và hai tài liệu QA. Đã đọc
  nhiệm vụ, AGENTS, Worker README/engine/security/REST/backup store, guard phát hành,
  checkpoint [PR #159](https://github.com/cavoixanh638/HopHDND-WebApp/pull/159),
  [#164](https://github.com/cavoixanh638/HopHDND-WebApp/pull/164),
  [#165](https://github.com/cavoixanh638/HopHDND-WebApp/pull/165),
  [#167](https://github.com/cavoixanh638/HopHDND-WebApp/pull/167) và
  [#168](https://github.com/cavoixanh638/HopHDND-WebApp/pull/168).
  [Audit production trước](https://github.com/cavoixanh638/HopHDND-WebApp/blob/45cf1be3547b1a06f3d0206b0c7e7a3397407694/source/docs/operations/ADMIN_ONLINE_HOST_READINESS_CODEX_20261112.md).
- [Bằng chứng JSON](CODEX_ADMIN_WORKER_ACCEPTANCE_20261112.json) ·
  [Actions #43201204173](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/43201204173).

## Production chỉ đọc

Lần đọc 10:18:48–10:18:49 UTC ngày 12/11/2026, 17:18 giờ Việt Nam. Firebase
CLI OAuth đã đăng nhập, các lệnh tới Firebase/RTDB/Auth/Billing đều GET 200.
Mọi giá trị gốc chỉ xử lý trong bộ nhớ. Không xuất tên mã, UID, thông tin
cá nhân, token, Rules gốc hay workbook lên repo.

| Kiểm tra | Kết quả |
| --- | --- |
| Project và billing | `hophdnd-8b7b2` ACTIVE, một RTDB `hophdnd-8b7b2-default-rtdb` ACTIVE tại `asia-southeast1`, host đúng vùng, billing false. |
| Auth | Google provider bật, bốn authorized domains, có host `cavoixanh638.github.io`. Chưa thực hiện Google sign-in production từ browser hoặc đọc UID quản trị. |
| Published Rules | Hai GET trùng 24.243 byte, SHA-256 `2654ac663f154c24f32bb3a68fea307b68e333eb24664459d7ecb861f794e662`. Chưa có V2/parent CAS. |
| V2 và primary | Hai lần đọc active pointer đều null. `/hdnd/items` có 0 hồ sơ. Chưa quan sát thấy bộ 59 ở primary hay V2. |
| `/items` gốc | 9/9 mục là record dạng cũ với 12 trường chuỗi, không theo schema recordId/displayCode hiện tại. Phải giữ nguyên cả nhánh. |
| `/hdnd/mirrors` | Một mirror, 55 dòng, 55 mã riêng. Đối chiếu theo mã với Excel: 44 mã trùng, 445/660 ô A–O trùng, 215 ô khác, 11 mã chỉ ở mirror và 15 mã chỉ ở workbook. |
| Profile và phạm vi | Profile lưu `dataSource=excel`. Tại lần đọc, root có `hdnd`, `items`, `settings`; `hdnd` có `mirrors`, `permissions`, `profile`. Kết quả không khẳng định dữ liệu đang render trên URL Pages. |

Tệp Excel người dùng đã giao có SHA-256
`df91c303156ddcab7ade143ea21e0dd5110e7ed8dd7dfe7614689cd194dd8fca`.
Hash khớp bằng chứng riêng tư đã xác minh **59 ID riêng, 885 ô A–O** và 47
công thức mã có giá trị cache đúng. Bản Excel sẵn cho importer
`HopHDND-59-ho-so-nhap.xlsx` có SHA-256
`3d30bb7ab0363a958f30db51c7df7f29591b8fba610bfc4055270230a4cd1d4d`,
khớp bản chuẩn hóa đã PASS so từng ô. Dùng bản này cho release preflight vì
parser từ chối công thức. Không thực hiện lại import private hoặc ghi
production. Kết quả 59 dòng trên Emulator ở dưới dùng Excel tổng hợp giả.

## Kiểm thử và giới hạn bằng chứng

| Hạng mục | Kết quả |
| --- | --- |
| Cài dependencies | `npm ci` app 719 package và parent service 241 package, exit 0. Sandbox mặc định chặn npm registry, cài lại qua kết nối được cấp quyền trong worktree QA. |
| Worker offline | Node 22.23.5, `node --test maintenance-worker/test/security.test.mjs maintenance-worker/test/engine.test.mjs maintenance-worker/test/http.test.mjs`, **27/27**, exit 0, trên exact HEAD. RSA/JWKS và REST giả. |
| App | `npm run typecheck`, `npm run build:spark` exit 0. `npx vitest run tests/online-maintenance-source-gates.test.ts` **3/3**. Build cảnh báo chunk lớn. |
| Spark Auth/RTDB suite hiện có | `npm run test:spark` local bị chiếm cổng 9099/9000 bởi phiên preview, không dùng lại DB đó. CI với checkout QA và product tree nguyên vẹn **54 Rules/cell + 14 local operator**, exit 0. Không Functions. Không chạy lại tệp private 59 đã PASS. [Job baseline](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/43201204173/job/131124784507) |
| Independent gate | `node maintenance-worker/test/independent-emulator.test.mjs --run-emulators` trên Node 22, **6 PASS / 3 FAIL**, exit 1 tại Windows và Linux. CI lưu log. [Job độc lập](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/43201204173/job/131124785087) |
| Browser | Parser XLSX, client chuẩn bị/xác nhận/tra cứu, và backup inspector của WebApp chạy cùng Worker API, Auth/RTDB Emulator. Đăng nhập Google popup và click toàn luồng trong Chrome chưa chạy. Chuẩn bị môi trường staging trình duyệt hai tài khoản khi gỡ các release blocker. |
| Cloudflare/HTTPS production | BLOCKED. Chưa có kết nối tài khoản Cloudflare, kho độc lập hay máy chủ cơ quan đã xác nhận. Chưa đo trên hosted Worker, chưa cấp runtime IAM, chưa tạo credential hoặc thực hiện deployment. |

Rules candidate được cài và đọc lại trên **namespace demo trống** trước mọi
test. SHA-256 file Git/Linux LF
`6db111f3669be17c91032d6a7d20c178dd29800ab40da47f89bcdd6b0d7c2441`;
Windows CRLF `8be88e210f53cd4631d42447d8397ccf7fd150d1832c4e436c3acf981ce3b03e`.
SHA-256 JSON chuẩn hóa trên Windows
`135200385509da817002e729fd64b9a3dcb8a6155d9b6539647458192d34292b`.
Không nhầm các hash này với published Rules production.

**Các ca PASS.** XLSX giả 59 × 15 và 1.000 × 15 qua parser thật, nhập và đọc
lại từng giá trị. 1.001 dòng bị từ chối trước PUT. Backup app có HMAC, store
riêng được đọc lại, khôi phục 59 sau clear 0, giữ generations cũ, history,
permissions, operation receipt và các nhánh ngoài phạm vi. CORS/thiếu token,
UID/provider sai, disabled/revoked, freeze/lease/pointer sai, backup thiếu,
sửa nội dung và tính lại SHA đều bị từ chối. Hai commit đồng thời có một
HTTP 200 và một RTDB 412 thật. Giả lập mất mạng sau PUT đã commit, tra cứu
và retry đúng operation ID không ghi lần hai. Client token không ghi được
parent, và ghi ô khi frozen bị từ chối.

**Biên trust được đo.** Handler thật gọi Firebase REST tới loopback qua adapter
`Bearer owner` mô phỏng OAuth đặc quyền, nên các PUT Worker **bypass Rules**.
Đọc/ghi đối chứng browser dùng token thực do Auth Emulator cấp và chịu Rules.
RSA production được kiểm riêng qua offline test vì Auth Emulator phát JWT
unsigned. Accounts lookup disabled/revoked là Auth Emulator thật qua adapter
endpoint. Store độc lập dùng Map riêng trong test và chưa chứng minh R2
retention. Network loss do adapter kích hoạt sau khi RTDB đã trả 200.
Không có test hoặc dữ liệu production trong CI.

## Lỗi bàn giao cho luồng Worker

| Mức | Bằng chứng và sửa đề xuất |
| --- | --- |
| **P1 — Xác nhận cũ sau đổi freeze epoch** | `source/maintenance-worker/src/engine.mjs:14`, `:206`, `:242`. Prepare ở epoch 1, thay freeze revision/epoch nhưng giữ FROZEN và cùng pointer, commit cũ trả 200. Baseline chỉ ràng buộc pointer/rows/quyền/leases. Gắn freeze revision/epoch vào record và backup baseline rồi bắt buộc khớp khi commit; thử lại trường hợp thaw rồi freeze. |
| **P1 — Backup có chữ ký của trạng thái rỗng không restore được** | `source/maintenance-worker/src/domain.mjs:46`, `:123` và `source/maintenance-worker/src/engine.mjs:268`. Clear → export backup 0 dòng (client inspector nhận) → replace 2 → prepare restore backup rỗng trả 400 `INVALID_ROW_COUNT`. Cho phép restore 0 khi signed archive và marker/manifest/active pointer cùng xác nhận 0, ở cả prepare và commit. |
| **P2 — Giới hạn response 3 MiB đo sai** | `source/maintenance-worker/src/firebase-rest.mjs:21`. JSON chứa 800.000 emoji có dưới 3 MiB code units nhưng hơn 3 MiB UTF-8, không bị chặn. Giới hạn byte trong stream trước khi cấp phát/toàn bộ parse; kiểm Unicode và response gần trần. Kiểm thêm cap body/JSON trung gian. |
| **Release gate — zero-row qua Rules** | `source/firebase/database.spark.rules.json:419` đòi node `items` khi parent chuyển thế hệ. Client thực đọc được pointer 0 từ clear đặc quyền, nhưng cả browser thường và Google token có claim parentCasService đều bị Rules từ chối khi ghi marker-only generation. Chốt Rules/schema/receipt đồng bộ và kiểm ca positive server-scoped nếu chọn identity chịu Rules. Không sửa Rules cho browser ghi trực tiếp. |
| **Release gate — host cơ quan** | `source/src/data/online-maintenance-client.ts:23` chỉ nhận workers.dev hoặc hostname mẫu `admin.hophdnd.example`. Khi chọn Node HTTPS, luồng client cần allowlist exact hostname đã duyệt cùng smoke có CORS và Google Auth. |
| **Release gate — cấu hình Pages build** | `.github/workflows/publish-pages.yml:62` chưa truyền `VITE_MAINTENANCE_API_URL` cho public build. Khi phát hành, luồng release cần truyền đúng URL HTTPS đã duyệt dưới dạng biến công khai và kiểm bundle thực. Giữ gate Spark/approved main SHA và không truyền secret cho Vite. |

HTTP archive/status có Auth/lookup nhưng không có limiter như mutation.
Dùng rate cap theo UID/IP và quota cho các đọc tốn nhiều băng thông. Origin
là toàn bộ hostname Pages, không thể cô lập theo đường dẫn repo; các site
cùng hostname phải cùng biên tin cậy. Không gửi cookie trong API, giữ
Bearer/Origin/reauth/auth_time/expiry/rate limit. Có thể pilot App Check
theo tài liệu trước khi enforce; token App Check không thay kiểm danh tính,
revocation và idempotence. [Firebase session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions) ·
[App Check cho backend](https://firebase.google.com/docs/app-check/custom-resource-backend)

## Host, chi phí và quyền

- **Workers Free** 100.000 request/ngày, 10 ms CPU/request, 128 MB, 50
  subrequest/request. Linux local chạy prepare+commit 59 dòng 168 ms wall /
  66 ms CPU tiến trình, 1.000 dòng 253 / 214 ms. Các số gồm Node/harness,
  không phải CPU mỗi invocation Cloudflare. Muốn đánh giá thật cần tài khoản
  xác nhận và pilot staging riêng đã được duyệt, đo từng endpoint trên 59,
  1.000 và archive/history gần trần, gồm p95/p99, CPU timeout, retry/ACK.
  [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- **R2 Standard** có 10 GB-month, 1 triệu Class A và 10 triệu Class B miễn phí
  mỗi tháng. Phải qua checkout subscription, phần vượt quota có tính phí.
  Kho private cần retention chống sửa/xóa và danh tính quản trị retention
  tách runtime. Chưa có chấp thuận checkout hay kho đã chứng minh restore.
  [R2 đăng ký](https://developers.cloudflare.com/r2/get-started/) ·
  [R2 pricing](https://developers.cloudflare.com/r2/pricing/) ·
  [Bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- **Ưu tiên** Node HTTPS và vault do cơ quan quản lý nếu có hạ tầng sẵn,
  xác nhận IT/host/DNS/quota/retention/người vận hành. Chi phí tăng thêm có
  thể bằng 0, chưa có bằng chứng máy chủ phù hợp. Giữ Pages là giao diện duy
  nhất. Không có lựa chọn managed đã chứng minh đủ tính năng và không phí.
- **IAM**. Lookup cần quyền đọc user `firebaseauth.users.get` cùng scope
  Identity Toolkit. OAuth runtime của Worker có khả năng bỏ qua Rules.
  Allowlist path trong JavaScript không hạn chế quyền của credential nếu lộ.
  Không cấp Owner/Editor, role quản trị instance đầy đủ hoặc key cá nhân.
  Ưu tiên identity chịu Rules giới hạn ghi hoặc OAuth ngắn hạn từ vault/WIF
  với quyền nhỏ nhất đã đo. Tách verifier, runtime ghi, DR/Rules, và người
  quản trị retention. Chứng minh phạm vi bằng negative tests, từ chối
  credential rộng chưa được duyệt. [RTDB IAM](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasedatabase) ·
  [RTDB REST auth](https://firebase.google.com/docs/database/rest/auth) ·
  [Identity Platform IAM](https://docs.cloud.google.com/identity-platform/docs/access-control)

## Trình tự thiết lập một lần sau phê duyệt

1. **Chốt release candidate.** Sửa 3 ca FAIL và chọn biên ghi cuối cùng. Chạy
   lại đúng SHA, gồm worker/Rules/client, restore rỗng, đóng băng, browser hai
   tài khoản và kiểm các nhánh không liên quan. Chốt hash file Rules deploy.
   WebApp/Worker mặc định tắt các khả năng ghi cho tới nghiệm thu.
2. **Chọn host và store.** IT xác nhận một endpoint HTTPS, vault secret,
   khóa HMAC có key ID/rotation, verified UID, rate limit, audit và kill
   switch. Giữ worker flags false. Định danh DB phải khớp project/instance.
   Thử retention và restore từ kho độc lập mã hóa trước, dùng fixture.
3. **Backup toàn dự án trước chuyển đổi.** Đặt cửa sổ bảo trì và ngăn sửa
   đồng thời theo phương án được duyệt. GET toàn root và published Rules
   hai lần. Đối chiếu hash/ETag, manifest thời gian/instance, kiểm đủ
   `/items` 9 mục, settings, mirrors, profile, quyền và nhánh lạ. Xuất Auth
   users/UID và config OAuth bằng danh tính DR riêng, lưu hash mật khẩu và
   thông số khôi phục ở phạm vi hạn chế nếu áp dụng. Mã hóa tại nguồn, lưu
   bản bất biến ngoài Firebase với người giữ khóa riêng. Chứng minh khôi
   phục full-root/Rules trên môi trường tách biệt và đo RPO/RTO. Backup
   app-scoped tải từ WebApp không thay được bản DR này.
4. **Khởi tạo có kiểm soát.** Sau GO và dry run, kiểm lại live pointer
   null, `/hdnd/items` trống và snapshot ngoài phạm vi không đổi. Cài bộ
   Rules tương thích đúng hash được duyệt trong cửa sổ bảo trì, GET readback
   và kiểm fail-closed với client trước khi tiến tiếp. Xác nhận FROZEN/không
   lease. Chạy đúng một lần luồng first import được bảo
   vệ vào primary trống từ workbook đã chốt hash, đọc lại 59 ID/885 ô.
   Bootstrap V2 bằng parent CAS đã review, với snapshot legacy, freeze
   epoch và receipt. Worker online chỉ xử lý dataset đã có V2 và không
   dùng làm bootstrap. Bảo toàn `/items`, mirrors, profile, settings,
   Auth và lịch sử. Giữ API mutation tắt trong lúc kiểm.
   [Runbook first import](PR147_OPERATOR_FIRST_IMPORT.md)
5. **Bàn giao vận hành.** Sau khi kiểm hash Rules live, active pointer,
   per-field rights, hai Google UID trên Chrome, locks, freeze, quota,
   archive và phục hồi, chủ dự án duyệt mở luồng Pages duy nhất. Admin
   thao tác trên website những lần tiếp theo. Nếu lỗi, tắt mutation trước,
   tra cứu operation ID và đọc lại, khôi phục bằng generation/CAS đã duyệt.
   Rollback Rules chỉ theo cặp Rules/dữ liệu tương thích đã diễn tập.
   Không raw root overwrite hoặc xóa lịch sử làm rollback thường lệ.

**Trạng thái cuối: NO-GO**. Cần luồng Worker sửa lỗi, IT xác nhận hạ tầng và
kho, kiểm runtime IAM/CPU và hoàn tất release preflight. Không đổi dữ liệu,
Rules, Auth, billing, Cloudflare, Pages hoặc main production trong nhiệm vụ này.
