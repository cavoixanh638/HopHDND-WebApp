# Đánh giá Firebase production và host HTTPS quản trị — 12/11/2026

**Đọc production: PASS. Phát hành dịch vụ quản trị: BLOCKED.**

Nhánh Codex `qa/20261112-admin-service-host-readiness`, mốc được giao
`07b26f29d96ac1c9fa0d5f7024f703a582e2b405`. Đã đối chiếu
`source/AGENTS.md`, checkpoint PR #159 và hợp đồng PR #164. Tại thời điểm đọc,
head PR #159 là `8854ea2b20ed6a68725607e72ae4621adfe8da3e`. Hai tài liệu là
đầu ra duy nhất của luồng Codex. [Nhiệm vụ](https://github.com/cavoixanh638/HopHDND-WebApp/blob/integration/20261112-spark-ui-69ceb/source/docs/tasks/CODEX_PARALLEL_ADMIN_SERVICE_20261112.md) · [PR #159](https://github.com/cavoixanh638/HopHDND-WebApp/pull/159) · [PR #164](https://github.com/cavoixanh638/HopHDND-WebApp/pull/164) · [Bằng chứng JSON](ADMIN_ONLINE_HOST_READINESS_CODEX_20261112.json)

## Kết quả đọc production

Ngày 12/11/2026, 08:50:03–08:50:04 UTC (15:50 giờ Việt Nam). Dùng OAuth của
Firebase CLI đã đăng nhập, chỉ gọi GET tới Firebase Management, RTDB
Management/Data REST, Identity Toolkit và Cloud Billing. Sandbox mặc định
từ chối đọc configstore CLI với `EPERM`. Lần đọc có quyền kết nối đã thành
công. Không in hoặc lưu token, nội dung Rules, UID, tên hồ sơ hoặc dữ liệu gốc.
[Firebase RTDB REST auth](https://firebase.google.com/docs/database/rest/auth) · [Auth getConfig](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getConfig)

| Hạng mục | Kết quả trực tiếp |
| --- | --- |
| Firebase `hophdnd-8b7b2` | HTTP 200, ACTIVE. Cloud Billing trả `billingEnabled=false`. |
| Instance RTDB | API liệt kê đúng một instance, `hophdnd-8b7b2-default-rtdb`, ACTIVE, DEFAULT_DATABASE, `asia-southeast1` (Singapore). Host khu vực khớp. |
| Rules đang chạy | Hai GET 200 trả cùng 24.243 byte. SHA-256 trên nội dung phản hồi là `2654ac663f154c24f32bb3a68fea307b68e333eb24664459d7ecb861f794e662`. Không thấy nhánh Rules `hdnd/datasetV2` hay cờ `parentCasService`. Hash này khớp bản đọc ngày 11/11, và thuộc Rules đang chạy chứ không phải Rules Spark trong repo. |
| Google Authentication | GET config và cấu hình provider đều 200. Google provider bật và đã cấu hình OAuth client. Có 4 authorized domains. Host `cavoixanh638.github.io`, Firebase auth domain mặc định và `localhost` có trong danh sách. Digest của danh sách trong JSON. |
| Con trỏ V2 | Hai GET `/hdnd/datasetV2/active` trả 200 và `null`. Không có thế hệ đang hoạt động để đếm, vì vậy số dòng V2 là N/A. |
| Dữ liệu cũ | Hai lượt GET shallow cho `/hdnd/items` đều cho 0 hồ sơ. `/items` ở gốc có 9 mục con trực tiếp trong cả hai lượt. Chưa phân loại nội dung các mục đó. |
| 59 hồ sơ Excel | Không quan sát thấy ở tập active V2 hoặc `/hdnd/items`. Bằng chứng 59 hồ sơ/885 ô thuộc diễn tập Emulator theo PR #159. |

Các lần GET riêng lẻ không tạo snapshot nguyên tử. Kiểm tra Auth xác nhận cấu
hình provider/domain, chưa thực hiện đăng nhập Google production từ trình
duyệt. Chưa có credential của dịch vụ, quyền host hoặc kho offsite để chạy thử
kết nối từ runtime. Kết quả live đã đủ cho audit chỉ đọc. Rules hiện tại và
con trỏ trống là hai điều kiện còn thiếu để mở luồng V2. Lỗi Console khi bấm
Enable không cản trở API trên instance đang ACTIVE. Chưa có bằng chứng về
nguyên nhân JavaScript ban đầu.

## Lựa chọn host trong giới hạn không bật billing Firebase

Giữ một giao diện GitHub Pages. API HTTPS riêng chịu trách nhiệm xác thực và
thực hiện nghiệp vụ quản trị. Ưu tiên **máy chủ Node do cơ quan quản lý**, nếu đã
có tài nguyên, HTTPS và kho lưu trữ độc lập được phép dùng. Giữ engine Node của
repo là điểm xuất phát, pin runtime theo lockfile và khai báo engine của bản
phát hành. Chi phí tăng thêm có thể bằng 0 nếu hạ tầng đã có. Cần người vận
hành, cập nhật bản vá, giám sát, dung lượng lưu trữ và kiểm tra khôi phục. Chưa
có xác nhận cơ quan có host/kho phù hợp.

| Phương án | Chi phí, giới hạn và quyết định |
| --- | --- |
| Máy chủ cơ quan sẵn có | Ưu tiên khi có HTTPS, bảo vệ secret, kho độc lập có retention, giám sát và người chịu trách nhiệm. Dự toán cụ thể theo hạ tầng hiện có. |
| Cloudflare Workers Free | 100.000 request/ngày, 10 ms CPU/request, 128 MB RAM và 50 subrequest/request theo bảng Free. Phù hợp thử API nhỏ với dữ liệu giả, chưa chứng minh đủ CPU cho giải nén Excel, kiểm schema, hash, chữ ký và commit. Nếu thử, dùng Web Crypto, giới hạn/chia bước tải, đo CPU p95/p99 và số subrequest với dữ liệu sát trần. Xác minh tương thích SDK hoặc adapter REST giữ nguyên hợp đồng và negative tests. Dùng trạng thái challenge nhất quán như SQLite Durable Objects hoặc transactional store. Workers secrets chứa secret phía server. [Limits](https://developers.cloudflare.com/workers/platform/limits/) · [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) · [Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| Cloudflare R2 Standard | Tách khỏi quota Workers. Mức miễn phí gồm 10 GB-month, 1 triệu Class A và 10 triệu Class B mỗi tháng. R2 yêu cầu checkout subscription và có tính phí vượt mức. Bucket lock ngăn sửa/xóa object còn hạn nhưng người có quyền chỉnh cấu hình có thể gỡ lock. Chỉ cân nhắc khi chủ dự án chấp nhận subscription, chính sách dữ liệu và quyền retention tách biệt. [Đăng ký](https://developers.cloudflare.com/r2/get-started/) · [Giá](https://developers.cloudflare.com/r2/pricing/) · [Bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) |
| Render Free, Vercel Hobby | Render Free ngủ sau 15 phút, 750 giờ/workspace/tháng, disk tạm và có thể tính vượt băng thông. Nhà cung cấp khuyến cáo không dùng production. Vercel Hobby dành cho dự án cá nhân phi thương mại, chưa phù hợp dịch vụ của cơ quan. Có thể dùng tài khoản phù hợp cho thử nghiệm dữ liệu giả. [Render Free](https://render.com/docs/free) · [Vercel Hobby](https://vercel.com/docs/plans/hobby) |
| OCI Always Free | VM chạy được Node nhưng cần xác nhận năng lực cấp máy, sở hữu tài khoản và kho backup riêng. OCI có thể thu hồi máy Always Free bị đánh giá nhàn rỗi trong 7 ngày. Công cụ quản trị ít dùng có rủi ro gián đoạn. [OCI Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) |
| Firebase Cloud Functions, Cloud Run | Loại theo ràng buộc Spark/no billing. Việc liên kết tài khoản Cloud Billing tự nâng project lên Blaze. [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) |

Chưa xác nhận được gói managed nào đáp ứng đồng thời runtime, bảo mật secret,
backup bất biến độc lập và cam kết không phát sinh phí. Cloudflare Free là lựa
chọn thử nghiệm khi chưa có máy chủ cơ quan. Không dùng GitHub Actions như API
tương tác phục vụ request trình duyệt.

Spark có 1 GB RTDB lưu trữ, 10 GB tải xuống/tháng và 100 kết nối đồng thời.
Đưa nhiều bản backup lịch sử vào cùng RTDB tiêu tốn cả storage lẫn băng thông.
Ví dụ 30 lần sao lưu, mỗi lần đọc 2 lượt dữ liệu 30 MB, tiêu thụ khoảng 1,8 GB
download trước lưu lượng WebApp. Đo kích thước thật, tính cả generation,
history và backup, đặt ngưỡng dừng trước quota. Worker trả lỗi khi quá tải, và
WebApp tra cứu operation cũ khi kết quả chưa rõ. [Firebase pricing](https://firebase.google.com/pricing) · [RTDB limits](https://firebase.google.com/docs/database/usage/limits)

## Kiểm soát bắt buộc cho API

1. **Xác minh danh tính ở server.** Nhận Firebase ID token qua Bearer HTTPS.
   Dùng `verifyIdToken(token, true)` với Admin SDK Node, hoặc xác minh RS256
   với khóa Google và kiểm revocation/disabled từ Auth backend khi dùng edge.
   Chốt đúng project, issuer, audience, chữ ký, thời hạn, UID trong allowlist
   server, `email_verified` và `firebase.sign_in_provider=google.com`. UID
   của quản trị viên được lấy từ Auth sau khi xác minh độc lập. Không nhận UID,
   email hoặc claim đặc quyền tự khai. Kiểm `auth_time` gần lúc commit, ví dụ
   5 phút và yêu cầu Google reauthentication khi quá hạn. Refresh ID token
   không làm mới thời điểm đăng nhập. Khi Auth backend hoặc khóa xác minh
   không khả dụng, đóng quyền ghi. [Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) · [Manage sessions](https://firebase.google.com/docs/auth/admin/manage-sessions)
2. **Origin, CSRF, phiên và hạn mức.** Allowlist duy nhất
   `https://cavoixanh638.github.io` cho API browser, kiểm ở preflight và request
   thật, `Vary: Origin`, chỉ phương thức/header cần thiết, cấm cookie credential,
   cache và wildcard. Origin không gồm `/HopHDND-WebApp/` nên nội dung Pages
   khác cùng hostname nằm trong cùng biên tin cậy browser. Chỉ thêm hostname
   API vào Firebase Authorized domains nếu nó thực sự phục vụ sign-in. Kiểm
   popup trên browser mục tiêu. Nếu dùng redirect, xác minh riêng auth handler,
   redirect URI và giới hạn third-party storage. Không thay `authDomain` sang
   Pages một cách tự động. Chống replay bằng challenge ngẫu nhiên, một lần,
   gắn UID/action/hash/pointer/freeze epoch/operation ID và hết hạn, ví dụ
   5 phút. Một commit in-flight mỗi dataset, rate limit theo UID và IP tại
   proxy, giới hạn kích thước upload và dữ liệu giải nén. Trả lỗi tổng quát,
   không phản chiếu lỗi chứa payload. [Firebase redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices)
3. **Tách quyền và secret.** Runtime xác minh revocation chỉ cần quyền đọc
   Auth user như `firebaseauth.users.get`, không cấp sửa user/config hay
   export hash. Luồng audit dùng quyền đọc RTDB/Auth config riêng. Luồng
   backup toàn dự án và sửa Rules có danh tính riêng. Ưu tiên credential ngắn
   hạn qua Workload Identity Federation khi host có issuer phù hợp. Giới hạn
   subject/audience và service account cụ thể. Nếu cần key dài hạn, chỉ tạo
   sau duyệt, lưu vault/secret store, tách staging và production, cấp người
   vận hành tối thiểu, xoay và thu hồi có diễn tập. Không mang OAuth cá nhân,
   key, refresh token, khóa ký backup hoặc credential vào GitHub/Pages/log.
   [Auth IAM](https://docs.cloud.google.com/identity-platform/docs/access-control) · [RTDB IAM](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasedatabase) · [WIF](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)
4. **Kiểm tra biên ghi thực tế.** Handler hiện có đã dùng
   `verifyIdToken(token,true)`, verified Google email và Rules override
   `parentCasService`. Cần bổ sung đối chiếu allowlist UID và Origin bắt buộc
   cho route browser quản trị. `databaseAuthVariableOverride` giới hạn ứng
   dụng SDK đang chạy. Nó không biến credential IAM có quyền ghi rộng thành
   credential theo từng path nếu bị lấy cắp. Đề xuất thử ở Emulator một
   Firebase service UID riêng, claim server-only, Rules buộc UID/claim/provider
   và giới hạn path CAS. Một lần bootstrap ngoài runtime có thể cấp custom
   session vào vault để runtime dùng ID token chịu Rules và thu hồi được.
   Không đặt signer có quyền mint tùy ý trong web runtime. Phương án service UID
   cần Rules/hợp đồng riêng do luồng triển khai duyệt, vì Rules hiện hành
   của candidate gắn parent CAS với Google admin. Nếu dùng lại Admin SDK
   override, đo quyền IAM tối thiểu và ghi nhận quyền bypass còn lại trước khi
   duyệt. Chạy negative tests chứng minh client, service sai UID, ghi ngoài
   path, ghi root và ghi Rules bị từ chối theo thiết kế đã chọn.
   [Parent handler tại baseline](https://github.com/cavoixanh638/HopHDND-WebApp/blob/07b26f29d96ac1c9fa0d5f7024f703a582e2b405/source/parent-commit-service/src/handler.mjs) · [Admin SDK limited privileges](https://firebase.google.com/docs/database/admin/start#authenticate-with-limited-privileges)
5. **Backup, CAS và nhật ký.** Server tự đọc, kiểm độc lập workbook A–O,
   chống ZIP bomb và đối chiếu count/hash/schema. Ghi backup vào kho private
   giữ phiên bản, đọc lại kiểm hash/chữ ký rồi mới cấp challenge. Chốt trên
   cùng ranh giới nguyên tử pointer/receipt, kiểm freeze epoch, zero leases
   và expected generation tại thời điểm commit bằng Rules/transaction.
   `operationId` ràng buộc với actor/action/input. Retry ID cũ đọc journal,
   cùng ID khác payload bị từ chối. Nếu ACK mất, tra cứu operation và xác
   minh readback trước khi tiếp tục. Lưu audit append-only ngoài nơi có
   quyền sửa nghiệp vụ, ghi actor UID đã xác minh, thời gian, action, count,
   digest, trạng thái và bản phát hành, hạn chế quyền đọc log. Clear tạo
   generation rỗng có receipt và giữ thế hệ cũ. Candidate hiện giới hạn
   1–1000 dòng, cần hỗ trợ 0 dòng đồng bộ trên engine, Rules và UI trước khi
   bật clear. Giữ chặn root delete. [Hợp đồng PR #164](ADMIN_ONLINE_DATA_MAINTENANCE_20261112.md) · [REST conditional requests](https://firebase.google.com/docs/reference/rest/database#conditional_requests)
6. **App Check là lớp bổ sung.** Đánh giá reCAPTCHA Enterprise ở chế độ
   monitor trước. Tài liệu công bố 10.000 assessment/tháng miễn phí và
   Spark chỉ có một số mức score. Kiểm lượng request, browser false positives
   và điều kiện billing trước khi bắt buộc. Custom backend có thể xác minh
   App Check token. Chỉ cân nhắc consume limited-use token trên route commit
   nếu stack hỗ trợ và role token verifier được duyệt. Giữ kiểm Google/UID,
   revocation, challenge và rate limit độc lập. Khi nghi lộ tài khoản, loại UID
   khỏi allowlist, thu hồi refresh tokens qua kênh quản trị riêng, tắt write
   switch, kiểm journal và xoay credential bị ảnh hưởng. [App Check](https://firebase.google.com/docs/app-check) · [Verify custom backend](https://firebase.google.com/docs/app-check/custom-resource-backend)

## Sao lưu ứng dụng và khôi phục thảm họa

PR #164 xuất 11 đường dẫn đã chọn khi FROZEN và không có lease, và kiểm file
JSON trên trình duyệt. Checksum phát hiện file đổi nhưng ai sửa file cũng có
thể tính lại. Bản backup đủ điều kiện commit cần chữ ký server (key ID, project,
instance, schema, time, Rules digest, active pointer, số dòng và digest nội
dung), mã hóa và đọc kiểm độc lập từ kho private. App restore chỉ kích hoạt
generation mới bằng CAS, giữ nguyên Auth, Rules và dữ liệu ngoài phạm vi
hợp đồng. Chỉ nhận file ký bởi khóa tin cậy cho luồng restore tự động.

Full disaster recovery là quy trình riêng. Kiểm kê và xuất đủ RTDB root
(kể cả nhánh chưa biết), Rules đang chạy, Auth users/UID/provider linkage/
claims theo khả năng export, Auth/OAuth config và các thiết lập cần dựng lại.
Hash mật khẩu và thông số import có quyền riêng, mã hóa riêng và chỉ dùng khi
cần phục hồi Auth. Kiểm lại phương án sign-in Google sau import/migrate. Tài
khoản giữ khóa giải mã và retention độc lập với tài khoản API. Giữ bản offsite
bất biến theo retention đã duyệt, cộng bản mã hóa ngoài host và ngoài tài khoản
Firebase. Thử giải mã, dựng lại Rules, phục hồi dữ liệu và quyền trên Emulator
hoặc môi trường tách biệt bằng fixture, đo RPO/RTO và ghi bằng chứng. Sau khi
được duyệt mới diễn tập với bản backup thật trong môi trường riêng.
[Firebase Auth import/export](https://firebase.google.com/docs/cli/auth) · [RTDB REST Rules/export](https://firebase.google.com/docs/reference/rest/database)

## Thiết lập một lần và điều kiện mở dịch vụ

| Bước | Chủ trì và bằng chứng cần có |
| --- | --- |
| 1. Chọn host và kho | Chủ dự án/IT xác nhận host cơ quan, DNS/TLS, chính sách dữ liệu, người vận hành, retention và chi phí. Nếu chưa có host, cho phép pilot Workers Free với dữ liệu giả và đo trước khi chọn. |
| 2. Tạo biên danh tính | Quản trị Firebase tạo identity riêng theo mục 3–4 sau duyệt. Chốt admin Google UID qua kênh riêng, quyền Auth read, phạm vi CAS, vault, xoay/thu hồi secret và nút tắt ghi. Kiểm IAM/capabilities và các yêu cầu âm tính trong staging. |
| 3. Chuẩn bị endpoint | Luồng ChatGPT/backend chốt contract PR #164, build theo SHA đã review, TLS, Pages origin, limiter, challenge store, write switch mặc định tắt và audit. Kiểm runtime triển khai thử với Emulators/fixtures, cả tải sát trần và mất ACK. |
| 4. Kho backup và khôi phục | IT cấu hình retention, encryption, quyền tạo/đọc riêng với quyền xóa và quản lý lock. Chứng minh overwrite/delete bị từ chối, đọc lại signature/hash, thực hiện restore drill. Sau GO, tạo backup production mới và đọc kiểm trước bất kỳ bước ghi nào. |
| 5. Đồng bộ candidate | Chốt exact SHA/hash Rules + service + WebApp. Chạy Auth/RTDB Emulator với sai UID/provider/project, hết hạn/thu hồi, giả backup, race/freeze/lease, clear 0 dòng, restore, duplicate, quota, mất ACK. Kiểm đủ 59 ID và 885 giá trị A–O trong rehearsal, nhánh ngoài phạm vi giữ nguyên. Kế thừa bằng chứng PASS đúng SHA. |
| 6. Phê duyệt và phát hành | Sau GO riêng, kiểm Rules live/hash và Auth lại. Triển khai bộ tương thích với write switch tắt, xác minh chứng cứ deploy/hash/read-only smoke, giữ `/items` cũ và nhánh khác. Chỉ mở và thực hiện import một lần sau kiểm backup/rollback và phê duyệt dữ liệu. Rollback ưu tiên CAS về generation đã xác minh hoặc tắt write switch. |

## Bàn giao

- **PASS** đọc production và đối chiếu kết quả. Không có vướng quyền đọc còn
  lại trên các endpoint yêu cầu. Số liệu tại thời điểm audit.
- **PASS kế thừa** rehearsal 59/885 và Spark Auth/RTDB-only 69/69 tại checkpoint
  PR #159, cùng CI preview backup PR #164 tại
  `a20553b616eed63a4797710d6954d0d52b15d529`. Không chạy lại các ca đó vì báo
  cáo không sửa mã. [PR159 checkpoint](https://github.com/cavoixanh638/HopHDND-WebApp/blob/5e2bf92575aa924880fa70d6360042e4d4a38a40/source/docs/operations/PR159_SPARK_UI_INTEGRATION_2026-11-12.md) · [PR164 CI](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/43177511949)
- **BLOCKED phát hành**. Chưa có host/kho và runtime identity được cấp để thử.
  Rules production thiếu V2 CAS. Exact candidate, drill và GO của chủ dự án
  còn chờ. Quyền deploy Firebase/Pages, Rules, billing và ghi dữ liệu production
  không được sử dụng trong audit này. Không tạo backup production mới.
