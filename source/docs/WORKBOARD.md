## ĐIỀU CHỈNH 26/10/2026 — BẮT BUỘC SAO CHÉP TRƯỚC KHI ĐO

Sự cố ở trình duyệt thật: Firebase mirror đã đọc **55 dòng / 277,6 ms** nhưng Supabase hiển thị **0 dòng / 143,1 ms**; SHA khác, `isAdmin=false`. Đây **KHÔNG PHẢI benchmark**. Đã kiểm tra Cloud trực tiếp: Supabase staging **thực tế vẫn có 6 dòng QA**, và đã có Google identity xác minh, nhưng identity hiện có **không nằm trong allowlist quản trị** nên RLS che toàn bộ dòng. UI trước đó gọi dữ liệu Supabase dù `isAdmin=false`, khiến 0 dòng dễ bị nhầm là DB rỗng; và buộc kiểm trước mới cho nạp. Đã sửa trang QA theo thứ tự: **đăng nhập Firebase + chọn đúng Supabase Google admin → nút NẠP → xác nhận copy 55 dòng staging → đọc lại toàn bộ và hash → chỉ sau đó mới mở benchmark**. Đổi Google Supabase sẽ yêu cầu `prompt=select_account` để chọn đúng tài khoản trong trình duyệt có nhiều Gmail; không tự cấp quyền Google lạ. Nút đối chiếu độc lập bây giờ báo **KHÔNG CÓ QUYỀN ĐỌC**, không báo 0 dòng khi `isAdmin=false`. Không tự ghi Firebase, không bypass RLS, chưa hề sao chép dữ liệu thật; chỉ staging cloud giữ 6 QA chờ thao tác có xác thực và xác nhận của chủ dự án.

Để nhận bản sửa trên máy Windows: GitHub Desktop → nhánh tích hợp #77 → Fetch/Pull → tắt terminal Vite cũ → chạy lại `source/scripts/START_REAL_CLOUD_BENCHMARK.cmd` → Ctrl+Shift+R. Đăng nhập Firebase Google, bấm **“Chọn lại tài khoản Google Supabase quản trị”** và chọn Gmail đã được cấp quyền (`cavoixanh638@gmail.com` theo cấu hình hiện tại), rồi bấm **“NẠP HỒ SƠ SANG SUPABASE STAGING”** và xác nhận. Khi màn hình xác minh cùng số dòng + SHA-256 thì mới bấm Bắt đầu đo. Nếu Supabase Google hiện ra account khác, đăng nhập lại đúng account; không thêm account mới vào ACL chỉ để vượt chặn.

---

## Sửa lỗi Chrome Illegal invocation — 26/10/2026

Trong UI thử nghiệm tại `http://localhost:8765/qa-benchmark.html`, bước **Kiểm tra cùng dữ liệu** có thể hiển thị `Failed to execute 'fetch' on 'Window': Illegal invocation`. Nguyên nhân đã xác định: bản cũ lưu tham chiếu trần đến `window.fetch` và gọi như phương thức của instance `this.fetcher(...)`, làm mất receiver `Window`. Nhánh tích hợp PR #77 đã sửa mặc định Auth signup/refresh, RPC và REST thành wrapper `(input,init)=>globalThis.fetch(input,init)`; thêm test hồi quy mô phỏng Chrome receiver guard. Không thay đổi dữ liệu hoặc policy Cloud.

**Khắc phục trên Windows:** trong GitHub Desktop, chọn đúng nhánh tích hợp PR #77, bấm **Fetch origin → Pull origin**, đóng cửa sổ terminal chạy benchmark bằng Ctrl+C, nhấp đúp `source/scripts/START_REAL_CLOUD_BENCHMARK.cmd` rồi ở Chrome nhấn Ctrl+Shift+R. Đăng nhập cả Firebase Google và **Supabase Google staging**; bấm Kiểm tra cùng dữ liệu. Nếu chưa xác thực Google trên Supabase, trạng thái quyền sẽ vẫn bị chặn, đây là một blocker khác với lỗi fetch. Chỉ bấm nạp dữ liệu khi đã thấy chính xác >=50 hồ sơ Firebase mirror và chứng thực admin Supabase; import có confirm, không ghi Firebase.

## BỔ SUNG 26/10/2026 — NẠP MIRROR 55 HỒ SƠ THẬT VÀ SO SÁNH TỐC ĐỘ CLOUD

Nhánh QA PR #77 đã bổ sung trang benchmark localhost:8765 và nút **“Sao chép đúng 55+ hồ sơ Firebase mirror sang Supabase staging”**. Xác nhận đường dẫn 55 hồ sơ Firebase là `hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344`, **không phải** `hdnd/items` (mốc backup trước đó là 0). Supabase staging hiện còn 6 bản ghi QA, **chưa có bằng chứng đã chép dữ liệu thật hoặc benchmark PASS**. Cần chủ dự án đăng nhập Google ở Firebase và Supabase trên trình duyệt Windows rồi chủ động xác nhận sao chép; không tự chạy nền.

Quy trình chuẩn: [REAL_CLOUD_PARITY_IMPORT_AND_BENCHMARK_20261026.md](operations/REAL_CLOUD_PARITY_IMPORT_AND_BENCHMARK_20261026.md). Cloud staging đã có RLS admin-only và RPC nhập snapshot một lần có chặn dữ liệu hiện hữu. Firebase production/GitHub Pages main không thay đổi.

---

> **26/10/2026 — TIẾN ĐỘ TÍCH HỢP:** PR [#78](https://github.com/cavoixanh638/HopHDND-WebApp/pull/78) đã được gộp vào nhánh [#77](https://github.com/cavoixanh638/HopHDND-WebApp/pull/77), merge SHA `815291926da2ae001a0b4fec906c414db87e3872`; #77 tiếp tục Draft/NO-GO. Launcher local Windows cho phép nhánh tích hợp; script đo 60 phút/5 giây hỗ trợ localhost/LAN/self-host; chưa chạy phép đo thực tế trên máy người dùng. Tiếp tục CI cùng HEAD, Supabase Cloud Auth/RLS/Realtime 2–3 user, hoàn thiện tài liệu, backup và phê duyệt phát hành. [Runbook chuẩn](operations/DUAL_BACKEND_UNIFIED_RELEASE_20261026.md).

> **NHIỆM VỤ HIỆN HÀNH — 25/10/2026: HOÀN THIỆN SUPABASE + FIREBASE CHỌN NGUỒN.** [PR #75](https://github.com/cavoixanh638/HopHDND-WebApp/pull/75) (Draft, stacked trên #73) có lựa chọn theo tab, Auth JWT Supabase riêng, server-side ACL, khóa ô và RPC ghi, admin pause/freeze, WebSocket Postgres Changes + polling an toàn, đo tốc độ đọc theo nguồn. Supabase Free staging Cloud có **4 migrations, 6 hồ sơ thử nghiệm**, 0 admin bootstrap và import đóng; hiện thiếu cấu hình Google OAuth/Anonymous Auth trong Dashboard, kiểm thử 3 phiên thật, Cloud Realtime, benchmark có parity, backup/restore, GO. **Không xóa Firebase hoặc tự đồng bộ giữa các nguồn.** Tiến độ chi tiết, rollback và điều kiện GO chỉ quản lý tại [cổng Supabase](operations/SUPABASE_RELEASE_GATE_2026-10-25.md), không phát sinh WORKBOARD khác. Các dòng Firebase-only / Supabase-only bên dưới là mốc lịch sử.

> **QUYẾT ĐỊNH HIỆN HÀNH — 25/10/2026:** Khai thác **Firebase RTDB + Supabase PostgreSQL song song** trong WebApp, nguồn do người sử dụng chọn ở cấp tab, không loại bỏ database nào, không tự đồng bộ/copy dữ liệu giữa hai hệ thống. Google Sheets/Excel vẫn là phương án vận hành tạm khi app chưa đủ điều kiện cutover. Bên dưới có các quyết định Firebase-only và Supabase-only **lịch sử, đã bị thay thế**, không được diễn giải thành lệnh xóa database. [GO/NO-GO thực tế](operations/SUPABASE_RELEASE_GATE_2026-10-25.md) · [PR #73 nền](https://github.com/cavoixanh638/HopHDND-WebApp/pull/73) · [PR #75 bộ chọn nguồn (Draft)](https://github.com/cavoixanh638/HopHDND-WebApp/pull/75) · [Issue #74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74). **Production vẫn HOLD.**

> **MỐC QUYẾT ĐỊNH 25/10/2026:** chuyển hướng kiến trúc đích sang Supabase. Việc triển khai Supabase/QA/GO được quản lý **ở một cổng** [SUPABASE_RELEASE_GATE](operations/SUPABASE_RELEASE_GATE_2026-10-25.md), quyết định ở [ADR Supabase](decisions/SUPABASE_PRIMARY_2026-10-25.md). Không dùng các nhiệm vụ Firebase-only lịch sử dưới đây làm điều kiện buộc phát hành. PR #71/#72 chỉ làm cơ sở kế thừa code, **không tự merge**.

## QUYẾT ĐỊNH ĐIỀU HÀNH MỚI NHẤT — 25/10/2026: CHỈ PHÁT TRIỂN FIREBASE-ONLY
**[Quyết định kiến trúc ưu tiên](decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md)**: nhân viên cập nhật Excel/Google Sheet chỉ trong thời gian chuyển tiếp; WebApp đích dùng **duy nhất Firebase RTDB `hdnd/items`** để xem/sửa/báo cáo. Sau cutover, không đọc/ghi nghiệp vụ từ Sheets và không có đồng bộ hai chiều. **DỪNG** chuỗi nhiệm vụ giám sát/chạy theo mirror 55 dòng vs ảnh cũ 57 dòng, mốc sửa Excel và quyền chia sẻ file Excel: đây chỉ là ghi nhận lịch sử, **không được coi là blocker phát triển**. Một lần kiểm tra dữ liệu khởi tạo sẽ được thực hiện **tại thời điểm cutover**, không phải trong vòng coding.

| Nhiệm vụ hiện hành | Trạng thái | Mục tiêu nghiệm thu |
| --- | --- | --- |
| HDND-FIREBASE-PRIMARY | **IN DEVELOPMENT — PR #71** | Firebase `hdnd/items` là nguồn duy nhất, không phụ thuộc Sheets/mirror khi đã kích hoạt; realtime hiển thị và save ACK |
| HDND-EXCLUSIVE-CELL | **IN DEVELOPMENT — PR #72** | Khóa theo ô + tab + UID, check quyền ở Rules, TTL, bản nháp và va chạm nhiều người |
| HDND-FREEZE-ADMIN | **IN DEVELOPMENT — PR #72** | Admin tạm dừng khách, DRAINING, FROZEN, hash receipt; Rules từ chối ghi đúng mốc |
| HDND-RESTORE-SECURITY | **NEXT / HOLD production only** | Kiểm backup & restore Emulator, rà live Rules vs staging candidate, test truy cập trái phép; không cần Excel |
| HDND-CUTOVER-IMPORT | **DEFER UNTIL RELEASE** | Tại thời điểm GO, chọn snapshot nhập cuối cùng, kiểm ID/fields, tránh mất dữ liệu và ghi đè; sau đó ngắt workflow Sheet |
| HDND-RELEASE | **NO-GO cho PRODUCTION hiện tại** | Quyết định GO sau 2–3 account staging và rollback, không chặn lập trình |

Các bảng 55/57, Drive file metadata và nguồn mirror ở **phần lịch sử bên dưới không còn là việc yêu cầu chạy tiếp**.

---

## 25/10/2026 — Checkpoint mới: đối chiếu Firebase live, Excel Drive và phân quyền nguồn
| Mã | Chủ trì / trạng thái | Chứng cứ và yêu cầu |
| --- | --- | --- |
| HDND-LIVE-MIRROR | Operator / **PASS đọc live, STALE dữ liệu** | 55 rows, 0 added/removed ID vs backup, `hdnd/items=0`, mirror vẫn `syncedAt 23/10/2026 04:41:44Z`; nguồn không cập nhật realtime sau đó. |
| HDND-EXCEL-CURRENT | Reviewer / **PARTIAL PASS** | Google Drive Office .xlsx `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp` sửa `25/10/2026 04:22:14Z`; phần tab dữ liệu trích xuất có 55 dòng STT số (07 kỳ chuyên đề + 48 kỳ thường lệ). Chưa so ID và field-level values với RTDB mirror. |
| HDND-DRIVE-PERMISSIONS | Chủ sở hữu file / **SECURITY REVIEW** | Metadata Drive cho file nguồn có `anyone:writer`. Xác minh việc mở sửa cho người có link là chủ đích; siết phân quyền nếu không cần, giữ quyền cấp cho đơn vị hợp lệ. Không đổi bằng tự động hóa. |
| HDND-RESTORE | Operator / **HOLD** | Khôi phục thử bản sao trên `demo-hdnd-restore` localhost, so full readback JSON SHA; không import vào production. |
| HDND-PARITY | Reviewer / **HOLD** | So tập 55 `recordId` cùng 15 cột A–O giữa file Excel đã chốt và mirror; xác minh lý do ảnh báo cáo 57 và mốc thời gian trước GO. |
| HDND-PROD-RELEASE | Admin / **NO-GO** | Không deploy Rules, không ghi `hdnd/items` hay chỉnh `dataSource` cho đến khi restore, parity, Rule diff, staging PASS. |

---

## 25/10/2026 — Đồng bộ nguồn mirror 55 dòng: metadata thời gian đã rõ, live chưa đối chiếu
| Mã | Trạng thái | Chứng cứ còn thiếu |
| --- | --- | --- |
| HDND-MIRROR-SCHEMA | **PARTIAL PASS** | schemaVersion=1, rows=55, sourceModifiedAt=23/10/2026 02:07:11Z, syncedAt=23/10/2026 04:41:44Z. Chưa có kết quả `Mirror metadata valid` và chưa chạy `validateExcelMirror` cho toàn bộ fields. |
| HDND-LIVE-RECONCILE | **NEXT / BLOCKING** | Bản backup chốt 55 hàng từ mirror 23/10, còn người dùng từng thấy báo cáo 57 hàng trong ảnh khác mốc. Phải `firebase database:get /` **read-only** lần mới để so live row count, live `syncedAt`, `hdnd/items` và ID set trước khi migrate. |
| HDND-RESTORE-DRILL | **HOLD** | Chưa có kết quả nạp backup vào demo RTDB Emulator và full readback SHA. |
| HDND-RULES-REVIEW | **HOLD** | Chưa xác nhận Rules Published/readback và diff candidate. |
| HDND-PRODUCTION-GO | **NO-GO** | Không nhập 55 row vào `hdnd/items` hoặc deploy Rules khi dữ liệu hiện tại chưa được đối chiếu. |

---

## 25/10/2026 — Nguồn mirror 55 hàng, cần xử lý chênh lệch với giao diện
| Mã | Kết quả | Blocker / bước tiếp |
| --- | --- | --- |
| HDND-MIRROR-INVENTORY | **PARTIAL PASS** | 1 spreadsheet source, 1 GID dataset, 55 rows, 0 duplicate IDs. Chưa có kết quả `Mirror metadata valid` True/False. |
| HDND-COUNT-RECONCILIATION | **BLOCKED / PRIORITY** | Ảnh báo cáo `Tiến độ xin ý kiến Thành ủy` từng hiển thị **57 nội dung**; mirror snapshot chứa **55 dòng tổng**. Phải xác minh cùng mốc, cùng nguồn, đúng bộ lọc; không chuyển thiếu 2 nội dung do snapshot cũ. |
| HDND-LOCAL-RESTORE | **TODO / HOLD** | Chạy `firebase-backup-emulator-restore.mjs` chỉ trên emulator demo; ghi số dòng và kiểm checksum đọc lại, không nhập production. |
| HDND-RELEASE | **NO-GO** | Ngoài sao lưu/Rules/staging, phải giải quyết count/ID reconciliation và giá trị metadata trước khi import. |

---

## 25/10/2026 — Kiểm kê offline trước khi thử restore
| Mã | Trạng thái | Bằng chứng |
| --- | --- | --- |
| HDND-SOURCE-INVENTORY | **PARTIAL PASS / WAIT MIRROR ROW COUNT** | Người vận hành báo `hdnd` tồn tại; `hdnd/items=0` (tại backup), `hdnd/mirrors=1` cấp gốc, `permissions/profile` tồn tại, `profile.dataSource` trống. Cần số tab/GID, schemaVersion, số hàng, ID trùng và metadata bản sao. |
| HDND-RESTORE-DRILL | **HOLD** | Chưa khôi phục JSON vào Emulator cách ly; không chạy import production. |
| HDND-RULES-DIFF | **HOLD** | Rules production file đã có hash, chưa readback chứng minh Published hay so với candidate. |
| HDND-PROD-SWITCH | **NO-GO** | Trước migrate phải đọc lại chính xác `hdnd/items` từ server, kiểm phương án transaction và Rules ghi tập dữ liệu, backup/restore và multi-user test. |

Các số liệu trên chỉ có từ lệnh PowerShell trên backup riêng tư (không phải kết nối Firebase trực tiếp của ChatGPT).

---

## 25/10/2026 — Checkpoint backup mới, cập nhật từ đầu ra PowerShell của người vận hành
| Mã | Status | Bằng chứng / điều kiện còn thiếu |
| --- | --- | --- |
| HDND-DATA-BACKUP | **USER-VERIFIED JSON PASS** | 2 file 56.185 bytes, cả hai parse JSON và cùng SHA `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Chưa tự đọc binary/restore. |
| HDND-RULES-BACKUP | **USER-VERIFIED JSON PASS** | `rules-live.json` 24.497 bytes, JSON có `rules`, SHA `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`. Cần người có quyền xác minh đây chính xác là Rules Published đang chạy, không chỉ nội dung trình soạn thảo. |
| HDND-RESTORE-DRILL | **TODO / HOLD** | Test nạp JSON trên Database Emulator/staging biệt lập; đối chiếu số dòng và dữ liệu, không ghi production. |
| HDND-RULES-DIFF | **TODO / HOLD** | Đối chiếu local Rules thật và `firebase/database.exclusive-candidate.rules.json`, xem chặn ghi/đường cha/quyền admin, chạy security tests. |
| HDND-PRODUCTION-GO | **NO-GO** | Chưa restore drill, chưa diff Rules và chưa phê duyệt. Giữ PR #71/#72 Draft. |

Chỉ ghi hash, size, trạng thái kiểm tra (không ghi bản sao JSON, UID, email, token, nội dung Rules production lên GitHub).

---

## 25/10/2026 — Kết quả sao lưu từ máy quản trị do người vận hành xác nhận
| Mã | Owner | Trạng thái mới | Chứng cứ / bước tiếp |
| --- | --- | --- | --- |
| HDND-BACKUP-READ | Người vận hành máy Firebase CLI | **PARTIAL PASS — 2 exports same SHA** | `database-1.json` và `database-2.json` cùng SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Đầu ra PowerShell do người dùng báo; chưa đọc JSON thực, chưa có Rules hoặc restore drill. |
| HDND-BACKUP-RULES | Quản trị Firebase | **TODO / HOLD** | Lưu chính xác Rules đang được Publish trên Firebase Console vào file riêng tư, kiểm JSON, tính SHA256. **Không nhấn Publish**, không lấy candidate GitHub giả làm Rules production. |
| HDND-BACKUP-RESTORE | Quản trị Firebase / reviewer | **TODO / HOLD** | Test đọc và phục hồi bản sao trên emulator hoặc staging riêng; không ghi vào production. |
| HDND-RELEASE | Quản trị Firebase | **NO-GO** | Sau khi backup Rules, restore drill và security diff/staging được chứng minh mới xem xét phát hành PR #71/#72. |

Chứng cứ ghi nhận từ ảnh/đầu ra PowerShell của người dùng, không phải quyền truy cập Firebase của ChatGPT. Giữ nguyên dữ liệu JSON và access token ở nơi riêng tư, không commit lên GitHub.

---

## Công việc đang chặn triển khai — 25/10/2026, sau khi chuẩn bị công cụ backup
| Mã | Owner | Trạng thái | Bằng chứng cần thu |
| --- | --- | --- | --- |
| HDND-BACKUP-READ | Quản trị Firebase | **BLOCKED: chưa cấp kết nối** | Export Rules đang chạy, JSON RTDB riêng tư, 2 lượt đọc có SHA khớp, `manifest.json`, thử đọc/khôi phục nơi khác |
| HDND-RULES-DIFF | Quản trị Firebase + reviewer | **HOLD** | Đối chiếu Rules thật theo từng đường ghi, đặc biệt admin/path cha với ứng viên #72 |
| HDND-STAGING-MULTIUSER | Reviewer + 2–3 tài khoản thật | **HOLD** | Test admin/khách, 2 tab UID, ghi realtime, race, draft, DRAINING/FROZEN sau backup |
| HDND-PROD-GO | Quản trị Firebase | **NO-GO** | Có phê duyệt cụ thể sau cả ba bước trên; mới được triển khai Rules và chuyển nguồn |

`scripts/firebase-production-readonly-backup.mjs` và [hướng dẫn vận hành](operations/FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md) **chỉ là công cụ chuẩn bị**; không đồng nghĩa đã chạy thật. Cập nhật bằng chứng SHA/file mật **ngoài** GitHub; chỉ ghi hash/biên bản không nhạy cảm trong WORKBOARD.

---

**Cập nhật kiểm thử HDND-FREEZE:** Quy tắc server đã bổ sung hạn cứng DRAINING: hết hạn thì máy chủ từ chối mọi commit, **không phụ thuộc tab admin**; tuy nhiên bước chuyển trạng thái sang FROZEN và lập biên nhận vẫn cần admin đăng nhập lại hoặc backend coordinator. [CI #40160812278](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40160812278) PASS ở SHA `8391041abc727835b7d7ff8f3b12750de950d776`. **Production HOLD/NO-GO**.


## Công việc vận hành đang mở — 25/10/2026
| Mã | Owner | Trạng thái | Đầu ra / blocker |
|---|---|---|---|
| HDND-DB-PRIMARY | Repo implementer + admin Firebase | **DRAFT / HOLD** | PR #71; cần backup Rules+DB, xác nhận đích rỗng, import một lần, readback và chuyển profile |
| HDND-CELL-LOCK | Repo implementer / reviewer độc lập | **DRAFT / TEST** | PR #72; hoàn thiện security Rules, thử 2 UID + 2 tab đồng UID, grant/revoke và popup/IME |
| HDND-FREEZE | Repo implementer + admin Firebase | **DRAFT / HOLD** | DRAINING, FROZEN, receipt; cần chứng minh không còn ghi sau freeze và cách xử lý khi admin đóng tab |
| HDND-RELEASE | Admin Firebase (quyết định production) | **NO-GO** | Đối chiếu Rules thật, sao lưu/khôi phục, nghiệm thu staging, ghi bằng chứng và rollback trước merge/deploy |

**Nguồn điều hành:** [Cổng phát hành](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md). Quy tắc: không ghi dữ liệu production khi chưa có hai bản sao lưu xác nhận và quyết định rõ ràng; mỗi báo cáo PASS phải kèm exact commit và CI. Lịch sử phân công cũ bên dưới được giữ để tra cứu.

---

# Điều phối triển khai

> **Bản sao GitHub:** một số ảnh bằng chứng trong tài liệu lịch sử chưa được đồng bộ vào `docs/assets/`. Tên tệp được giữ để tra cứu trên bản lưu gốc; không xem đường dẫn này là ảnh có sẵn hoặc bằng chứng đã kiểm trên website.

Rà thiết kế sau PA1/PA2 ngày15/10: Luna rà chỉ đọc mã queue/batch và cập nhật kế hoạch1.18/README; parent kiểm nguồn chính thức, xác định lỗi và bổ sung ARCHITECTURE1.15 cùng trạng thái đánh giá. Đây là đề xuất, không phải triển khai native Sheets hoặc đổi quyền/nguồn thật. Xem kế hoạch mục18.15.

Ngày cập nhật: 15/10/2026. Bảng này ghi phạm vi giao việc; kết quả/bằng chứng chuẩn xem [CURRENT_STATE](CURRENT_STATE.md). Dự án đã có Git; lượt này chưa tạo commit hoặc PR.

| Công việc | Phụ trách | Phạm vi và phụ thuộc | Bàn giao |
|---|---|---|---|
| Chuẩn nghiệp vụ, ma trận và quy tắc AI | Luna, tổng chỉ huy duyệt | AGENTS/SYSTEM/FEATURES; giữ F01–F36 | Tài liệu nguồn chuẩn và stub link cũ |
| Metadata trường, tìm kiếm và mẫu giả | Luna, tổng chỉ huy duyệt | Hợp đồng shared/types từ tổng chỉ huy | 13 trường, search, fixture; đã sửa lỗi bất nhất fixture sau review |
| CSS giao diện | Luna, tổng chỉ huy duyệt | Class từ UI; bố cục/responsive/dialog/print | Styles; điều chỉnh sau ảnh kiểm tra |
| Hướng dẫn chạy và dùng bản thử | Luna, tổng chỉ huy duyệt | Đọc UI thực tế; không hứa chức năng chưa có | Hai hướng dẫn tiếng Việt |
| Chuyển kiến trúc sang một HTML | Luna cập nhật tài liệu; tổng chỉ huy quyết định | Chỉ đạo mới về Drive/Sheets | Kế hoạch 1.3, ARCHITECTURE và stub tài liệu cũ |
| Nghiệp vụ, repository, nháp và UI tích hợp | Tổng chỉ huy | Kế hoạch, SYSTEM và hợp đồng | Bản thử 0.1.0, test và kiểm tra browser |
| Đóng gói/đánh giá React–Preact | Tổng chỉ huy | Cùng source và fixture | Script trong repo, số đo và quyết định prototype |
| Cấu hình nguồn và test cấu hình | Luna, tổng chỉ huy duyệt | URL/gid và storage; default source do người dùng chỉ định | Module, 15 tests; tổng chỉ huy bổ sung phản hồi storage và nhãn tiếng Việt |
| Panel kết nối và hướng dẫn 0.2.0 | Luna, tổng chỉ huy duyệt | Panel theo hợp đồng App; hai hướng dẫn bám UI thực tế | Panel, hướng dẫn; tổng chỉ huy sửa giữ gid khi dán cùng file không có gid |
| Test parser | Luna, tổng chỉ huy duyệt | Mapping/tiêu đề/mâu thuẫn/mã thiếu-trùng bằng fake | 7 tests; tổng chỉ huy review và chạy |
| Adapter/parser, tích hợp nguồn thật chỉ đọc | Tổng chỉ huy | Nguồn cụ thể được người dùng yêu cầu; không ghi/đổi chia sẻ | 0.2.0, 51 nội dung; 4 tests adapter và browser HTTP; file/Drive workflow chưa kiểm |
| Kế hoạch/kiến trúc/trạng thái/bản đồ/test report | Tổng chỉ huy | Phát sinh link nguồn, giới hạn quyền/persistence | Cập nhật tương ứng mốc 0.2.0 và revision kế hoạch 1.5 |
| Rà các thao tác cũ: danh sách/danh mục/lịch sử/Excel/cache/ghi | Luna audit_legacy_controls, tổng chỉ huy đối chiếu | Read-only HTML đang dùng và hai script; phân biệt UI/code/JSON/deploy | Inventory dòng mã, xác minh ID/STT chỉ xem và JSON cấu hình khác backup Excel |
| Rà độ phủ source mới F01–F36 | Luna audit_new_coverage, tổng chỉ huy duyệt | Chỉ mã hiện có; nguồn thật chỉ đọc khác lưu mẫu | Inventory khoảng trống; tổng chỉ huy đối chiếu lại popup cũ để không ghi nhầm trường bị mất |
| Chuẩn đối chiếu và phương án gom tùy chỉnh | Tổng chỉ huy | Bằng chứng hai inventory + đọc trực tiếp báo cáo/editor cũ | CURRENT_STATE đủ 36 dòng; FEATURES chi tiết bổ sung; kế hoạch 1.6, ARCHITECTURE 1.5 mục 17 |

Luna chỉ sửa các file được giao; tổng chỉ huy review, tích hợp và chạy kiểm tra. Khi phát sinh, cập nhật kế hoạch/quyết định, chỉ mục mã và hướng dẫn liên quan; task hoàn tất không đồng nghĩa toàn bộ Fxx được nghiệm thu sản xuất.

Mốc 0.3.0: Luna `layout_panel` bàn giao ReportLayoutPanel và hai hướng dẫn. Tổng chỉ huy review, viết report-preferences/ReportSettings, tách chế độ xem/tùy chỉnh, kiểm 42 tests và browser HTTP, sửa Esc đọc trạng thái cũ, build một HTML và cập nhật kế hoạch 1.7/kiến trúc 1.6. Không ghi Sheets hoặc thêm thư viện.

Mốc 0.4.0: ba agent Luna gồm `catalog_panel` (panel danh mục), `column_controls` (panel cột/tests/hướng dẫn), `inline_reports` (report preview/kết nối/tests/bản đồ mã). Tổng chỉ huy viết schema/domain/checkpoint/state, review/tích hợp App, kiểm các guard và quan hệ ở cả hai đường Lưu, kiểm browser và đóng gói. Danh mục/bố trí lưu cục bộ theo nguồn/browser; autosave chỉ giữ nháp phục hồi, không áp dụng cấu hình hoặc ghi Sheets; ID hiển thị không thay ID nguồn. 68 tests/12 file, typecheck và docs check đạt; build một HTML đạt, kích thước/bằng chứng chuẩn ở CURRENT_STATE. Không coi mốc local này là nghiệm thu toàn bộ app hoặc quy trình Drive.

Mốc cấu hình dùng chung và thứ tự danh mục: Luna `catalog_order` phụ trách comparator/thứ tự; Luna `sync_panel` phụ trách panel và kiểm thử UI. Tổng chỉ huy tích hợp repository, RPC Apps Script, GViz reader, checkpoint và gói server; review kết quả local. Bằng chứng triển khai và kiểm tra hiện hành xem [CURRENT_STATE](CURRENT_STATE.md) và [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md).

Mốc 0.5.1: tổng chỉ huy phụ trách tích hợp bảng danh sách, cell picker, editor nội dung/ghi chú, checkpoint và cấu hình dùng chung. Tổng chỉ huy kiểm cloud đọc/ghi cả ba phần, đọc lại từ tab thứ hai, chặn stale save và giữ nháp; trả giá trị thử về ban đầu. Quyền kho đã đọc lại chỉ có owner. Người dùng chọn giữ riêng; không mở cho tài khoản khác. Bằng chứng, giới hạn và trạng thái còn lại được ghi tại [CURRENT_STATE](CURRENT_STATE.md) và [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md); hướng dẫn thao tác tại [Hướng dẫn sử dụng](HUONG_DAN_SU_DUNG.md).



Mốc 0.5.2: Luna sync_copy_review sửa nhãn chỉ đọc, rà save-failure của editor, thêm modal checkpoint khác base cho báo cáo/danh mục và cập nhật hai hướng dẫn. Tổng chỉ huy xử lý race tải cấu hình, gate App, retry/read/write sequencing, bảo vệ nháp bảng, viết regression tests và kiểm cloud. Kết quả/bằng chứng chuẩn ở CURRENT_STATE; không đổi quyền riêng tư hoặc cài mật khẩu mới.


Mốc 0.6.0, mục 18 đã duyệt: Luna frame_controls sửa ItemColumnPanel/item-frame.css; Luna sync_copy_review sửa CellPicker/cell-picker.css và hai hướng dẫn. Tổng chỉ huy phụ trách repository/draft/guard/schema/server/test, review toàn bộ và nghiệm thu bản thử riêng. User xác nhận chưa triển khai Apps Script cũ. Đường ghi Excel vẫn đang kiểm; probe bản sao và tệp giả không cấp quyền ghi file nguồn hoặc mở kho. Kết quả cloud và phần chưa kiểm thuộc CURRENT_STATE.


Mốc 0.6.1: tổng chỉ huy kiểm execution log dự án conditional probe, xác nhận200/412/readback/Trash trên tệp giả. Luna sync_copy_review sửa popup/SyncPanel/hai hướng dẫn, frame_controls sửa chữ CatalogSettings/CatalogPanel/ReportSettings. Tổng chỉ huy sửa App/ItemList/state/nhãn commit không sẵn sàng, review hướng dẫn, đóng gói và kiểm UI. Không ghi nguồn hoặc đổi deployment /exec/quyền Drive của app chính.

Kiểm tiếp0.6.1: Luna frame_controls tạo fixture Excel giả3tab và cập nhật REPO_MAP; Luna sync_copy_review viết test core mã dòng/baseline/Unicode, bổ sung regression hàng tự đóng; guard tests nay9, full suite 138/19, typecheck và docs check đạt (18 Markdown, 265 liên kết, 36 mã Fxx). Tổng chỉ huy viết/review core ZIP/XML/conditional driver, kiểm Google workbook roundtrip200/412/Trash, rà quyền theo tệp và bản sao đọc muộn, kiểm modal giữ phần sửa rồi dọn marker riêng. OfficeConcurrencyProbe do tổng chỉ huy chuẩn bị và đã kiểm workbook giả. Quyền Drive đã cấp cho dự án thử riêng. Google lúc 23:19 trả `getAuthorizationInfo=NOT_REQUIRED`, About 200/account match chủ sở hữu bản sao=true, GET bản sao 200 XLSX/ETag. `testExistingCopyExcelRoundtrip` lúc 23:21–23:22 trên fixed copy `19fv…` đạt cùng ID/MIME, stale ETag 412, contentReadBack/blobMatchesUpload/otherParts/otherCells=true và restoredOriginalBytes=true; ảnh ở docs/assets/existing-copy-roundtrip-pass-0.6.1.png. Đây chỉ là kiểm tra bản sao cố định: workbook Excel nguồn/kho nguồn không đổi, writer chưa tích hợp vào app, F31 chưa xong. Kế hoạch1.15 cập nhật phát sinh; bằng chứng và giới hạn chuẩn ở CURRENT_STATE/KIEM_THU_VA_NGHIEM_THU.


Mốc 0.6.2 — 15/10/2026: tổng chỉ huy tích hợp `ExcelRepository`/data RPC, `ExcelTransactions` (receipt, backup, CAS và unknown reply), `ExcelService` (Drive transport và registry owner-only), core pure codec và script `build:server`. Luna cập nhật REPO_MAP, README, WORKBOARD và hướng dẫn dùng để phân biệt **Lưu dữ liệu vào Excel** (app → Excel) với **Đọc lại dữ liệu và danh mục từ Google** (Google → app). Kiểm local đạt 191 tests/24 files, typecheck, build HTML/server; HTML149.008 byte/gzip43.601 byte.

Mốc Firebase Pages: tổng chỉ huy phụ trách tích hợp repository, Auth, rules/emulator và kiểm tra browser; Luna bàn giao `FirebasePanel`, JSON profile transfer, nhãn storage cho cấu hình báo cáo/danh mục và hướng dẫn [Firebase Pages](FIREBASE_PAGES.md). Kiểm cục bộ đã báo 196 unit pass/9 skip, 9 emulator checks pass và `build:pages:test`/typecheck pass; kiểm Google popup chưa hoàn tất. Firebase production, Auth và rules chưa bị sửa.

Theo duyệt của người dùng, main được kích hoạt và deploy tại deployment v6 lúc11:31 ngày15/10. `prepareDashboardExcelStorage` hoàn tất lúc11:29; `checkDashboardExcelConnection` lúc11:30:08 chỉ đọc và ghi log backendReady=true, actor `phucpixel2025@gmail.com`, 51 dòng, 0 cảnh báo, configRevision12. UI tải mới lúc11:34 xác nhận đúng nguồn (ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, gid60961344), 51 dòng và chế độ sửa; không submit sửa lên nguồn chính. Ảnh: main kết nối/sẵn sàng (tệp chưa đồng bộ: `assets/main-excel-ready-0.6.2.png`), kiểm tra chỉ đọc (tệp chưa đồng bộ: `assets/main-excel-connection-pass-0.6.2.png`). Save/readback/restore chỉ được nghiệm thu trên copy riêng: lưu UI bản sao (tệp chưa đồng bộ: `assets/ui-excel-save-pass-0.6.2.png`), khôi phục bản sao (tệp chưa đồng bộ: `assets/ui-excel-restore-pass-0.6.2.png`). Không gộp hai bằng chứng thành ghi thành công nguồn thật. F31 chưa hoàn tất; lịch sử và tình trạng còn lại ở [CURRENT_STATE](CURRENT_STATE.md).

## ĐIỀU PHỐI DUY NHẤT — 26/10/2026: INTEGRATION PR #77

| Đơn vị công việc | Đầu vào cố định | Trách nhiệm |
|---|---|---|
| Firebase [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) | `259c36ac…` | Auth Google UID allowlist, RTDB Rules, leases, freeze, bản nháp và audit; giữ nguyên kiểm thử bảo mật |
| Supabase [#73](https://github.com/cavoixanh638/HopHDND-WebApp/pull/73) | `66553279…` | SQL migrations/RLS/RPC, repository/permission, security PostgreSQL |
| Supabase chooser [#75](https://github.com/cavoixanh638/HopHDND-WebApp/pull/75) | `afb10fe2…` | Chọn nguồn theo tab, auth/realtime Supabase, guard chuyển khi có draft/ACK |
| **Tích hợp [#77](https://github.com/cavoixanh638/HopHDND-WebApp/pull/77)** | `manifest.json` | Một đầu mối ghép hunk file dùng chung, kiểm thử cùng build, quản lý phát hành/rollback |
| Tài liệu [#76](https://github.com/cavoixanh638/HopHDND-WebApp/pull/76) | Theo exact head lúc cập nhật | Gộp hướng dẫn hệ thống vào PR tích hợp sau khi đối chiếu, không ghi đè code/docs mới |

**Quy tắc:** PR #77 Draft/NO-GO đến khi tất cả gate trong [runbook](operations/DUAL_BACKEND_UNIFIED_RELEASE_20261026.md) đạt. CI riêng PR #72 hoặc #75 không thay cho CI tích hợp; không cherry-pick mà bỏ một nửa adapter, không deploy dữ liệu giả/production khi vẫn còn blocker. Mọi quyết định và bằng chứng giao việc nằm trong issue [#74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74) để dễ truy vết.

---
