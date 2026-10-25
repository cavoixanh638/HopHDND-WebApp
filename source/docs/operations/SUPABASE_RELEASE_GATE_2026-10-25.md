# HopHDND — SUPABASE GO/NO-GO (nguồn sự thật về tiến độ triển khai)

## Kiểm tra trạng thái trước đợt triển khai mới và thực thi PR #75 — 25/10/2026

**Kiểm tra thực tế lúc bắt đầu (trước khi tạo nhánh mới):**
- GitHub [PR #72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) (Firebase) và [PR #73](https://github.com/cavoixanh638/HopHDND-WebApp/pull/73) (Supabase foundation) đều `open`, `Draft`, **chưa merge**. Đúng head PR #73: `66553279791cddec0039c54a0da194a8ec24d1c0`.
- Tại **exact commit trên**, [Verify HopHDND source #40204193173](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40204193173), [Verify isolated Firebase staging #40204193170](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40204193170), [Verify isolated Supabase PostgreSQL #40204193178](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40204193178) đều **SUCCESS**. Các kết luận CI chỉ áp dụng cho commit đó, không tự suy cho PR mới.
- Supabase project `uguhyunuzsdrkykqgdmq` trả `ACTIVE_HEALTHY` trên PostgreSQL 17 Singapore; lịch sử gồm **đúng ba migrations đã apply** (`hophdnd_core_staging_20261025`, `hophdnd_single_import_gate_staging_20261025`, `hophdnd_rls_initplan_staging_20261025`). SQL đọc trực tiếp: `item_count=0`, `audit_count=0`, `admin_count=0`, `import_open=false`, `mode=OPEN`. Security advisors: `lints=[]`.
- Nguồn webapp vẫn chưa có lựa chọn riêng Supabase, chưa có Google OAuth Supabase, native Realtime, full UI phân quyền Supabase hoặc ghi Supabase hoàn chỉnh. Không tuyên bố đã xong chỉ vì cloud migrations PASS.

**Đợt triển khai #75:** branch `feat/supabase-parallel-source-selector-20261025` sinh trực tiếp từ SHA `66553279791cddec0039c54a0da194a8ec24d1c0`; [PR #75](https://github.com/cavoixanh638/HopHDND-WebApp/pull/75) Draft **base là branch PR #73**, giữ PR #73 nguyên vẹn. Liên kết điều hành [Issue #74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74).

- Nguồn ở cấp **tab trình duyệt**, các lựa chọn `excel/database/primary/supabase`. Nguồn này **không gọi Firebase.common.save('dataSource')**; chuyển đổi bị chặn khi có draft, protected recovery, dữ liệu đang load/confirm, editor mở hoặc Firebase cell lease đang giữ. Namespace Supabase khác Firebase và Excel.
- **Read-only staging prototype**: khi có cấu hình chính xác, sử dụng Supabase REST/Auth anonymous JWT riêng, refresh token theo tab; bảng `hdnd_items` được đọc bằng RLS và kiểm tra lại 15 giây/lần khi tab hiển thị. Đây **không phải native Supabase Realtime**. Chỉ khi operator bật Anonymous Sign-Ins và cấu hình URL + `sb_publishable_...` của **staging** qua `source/.env.local` (gitignored) thì tùy chọn mới khả dụng; không để secret hoặc service_role vào mã.
- Supabase preview tuyệt đối `readOnly=true`, `canDraft=false`, `save()` từ chối; chưa chạy import hoặc tạo admin. Firebase, link Excel và thiết lập nguồn admin chung vẫn tồn tại. **Không triển khai production**.
- Tests mới: `source/tests/supabase-parallel-source.test.ts` kiểm guard/namespace, chặn key bí mật, auth JWT isolated+rotated refresh, read-only REST, không gọi RPC ghi. Chỉ xác nhận PASS khi Verify source CI trên head của #75 thành công; không bỏ qua Firebase CI.
- **CI của nhánh mới sau sửa regression:** [Verify HopHDND source #40206075304](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40206075304) **SUCCESS** tại exact commit `dc649725493fcc7de21b6dd85ea068147491edc3`: TypeScript, Vitest, docs check, Firebase Emulator, hai bundle build và browser smoke. Trước đó phiên đầu [#40205901541](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40205901541) FAILED tại smoke về bố cục khách khi thanh chọn nguồn xuất hiện. Đã sửa: chỉ hiện nguồn staging cho phiên quản trị/QA đã đăng nhập Firebase Google, không hiển thị cho khách; guest smoke PASS ở commit tiếp theo. Đây là bằng chứng kiểm thử **commit nêu trên**, không phải GO toàn hệ thống hoặc nghiệm thu REST cloud trực tiếp.
- **Các việc vẫn HOLD:** native Google OAuth, auth provider thủ công trong Supabase Dashboard, security multiuser qua REST/RLS, Supabase Realtime Postgres Changes, write lease + permission UI + freeze thực tế, so sánh hiệu năng có số liệu, backup/restore, E2E, import thật và production GO. Google Sheets tiếp tục được giữ theo nhu cầu vận hành tạm. **Không database nào bị bỏ.**

---


## Chạy song song nguồn dữ liệu — chỉ đạo mới và Cloud staging (25/10/2026)

**Yêu cầu mới ưu tiên cao nhất:** Firebase RTDB vẫn được giữ nguyên và có thể chọn; Supabase được bổ sung để chạy song song/so sánh, **không có quyết định loại bỏ database nào**. Google Sheets vẫn chỉ là nguồn tạm thời nếu được chọn trong bản app chưa cutover. Không tự đồng bộ, copy hoặc ghi đè giữa Firebase, Supabase và Sheets. Mỗi nguồn có namespace độc lập cho draft, realtime, audit, ACL, auth và freeze. Chuyển lựa chọn phải xử lý nháp/lease trước, không đổi cấu hình nguồn toàn hệ thống của Firebase để thử Supabase.

- **Supabase staging tạo thật:** project `HopHDND-Staging`, ref `uguhyunuzsdrkykqgdmq`, region `ap-southeast-1`, PostgreSQL 17, plan Free, báo giá công cụ `0 USD/tháng`; chỉ project test, chưa nạp dữ liệu thực. Chủ dự án đã chấp thuận sử dụng tổ chức Free có sẵn.
- **Applied Cloud migrations**: `hophdnd_core_staging_20261025`, `hophdnd_single_import_gate_staging_20261025`, `hophdnd_rls_initplan_staging_20261025`. Truy vấn server cho thấy **0 hồ sơ, 0 admin mặc định, import gate=false, control OPEN**; bảo đảm chỉ môi trường rỗng.
- **Supabase advisors:** bảo mật `lints: []`; hiệu năng ban đầu cảnh báo 6 lần gọi auth.uid() trên mỗi dòng RLS, đã sửa ở migration `202610250003_rls_initplan.sql` (cần kiểm tra advisors lại).
- **KHÔNG tạo auth Google client/secret, không bật import, không mở quyền write trong frontend, không thay Pages hiện hành hoặc Firebase, không chạy chuyển dữ liệu thật.**
- **G1 Cloud schema có điều kiện PASS** cho triển khai DDL/advisors; **G2-G8 và GO production vẫn HOLD** vì chưa tích hợp UI lựa chọn nguồn, Supabase Auth, browser realtime, multi-account và benchmark thật.



## Tiến độ triển khai PR #73 — 25/10/2026

- [PR #73](https://github.com/cavoixanh638/HopHDND-WebApp/pull/73) là **Draft**, base là nhánh PR #72 để review delta Supabase dễ dàng. Không merge PR #72 chỉ để phát hành Supabase. Phần UI production vẫn nguyên trạng.
- Đã commit schema SQL server-side (bảo vệ direct-write, RLS, quyền cell>row>column, auth Google verified, per-tab lease, deadline, freeze, audit, CAS và idempotent replay), release-closed one-time import, bộ adapter `SupabaseRepository` và `SupabaseCellLeaseManager`, offline importer private, kiểm thử mock và SQL sentinel.
- **CI offline thực tế:** [Verify #40201614763](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40201614763) **SUCCESS** sau khi sửa lỗi typecheck và async test; [Firebase isolated staging #40201614742](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40201614742) **SUCCESS**, chỉ xác nhận chức năng Firebase kế thừa. Các commit SQL/client sau mốc này phải có CI riêng; không suy PASS cho SQL staging.
- **Còn thiếu quan trọng:** Supabase project/Auth/Reatime staging chưa có kết nối; SQL chưa áp dụng và chưa qua penetration/RLS tests; controller Supabase Auth, Postgres Changes bridge, toàn bộ đường cấu hình/phân quyền UI và 2–3 tài khoản thật chưa tích hợp. Không cutover production; mọi cổng G1–G8 giữ HOLD.
- Do chưa có tài khoản Supabase đã được kết nối trong phiên làm việc, **không thể tạo/chạy database Supabase thật, bật Google OAuth hoặc kiểm tra quota**. Chỉ hoàn tất phần mã ngoại tuyến độc lập. Cần kết nối tài khoản Supabase vào ChatGPT và cung cấp quyền dự án staging phù hợp (không gửi mật khẩu hoặc secret trong chat).

---



## Đánh giá sau kết nối Supabase — 25/10/2026 (mới nhất)

- **Connector Supabase đã kết nối nhưng chưa có Cloud project.** Kiểm tra thực tế trả `projects: []`; chỉ tìm thấy một tổ chức `phitrongphuc2@gmail.com's Org`, plan `free`. Vì chưa có project, **KHÔNG CÓ** migrations trên Supabase Cloud, Google OAuth, Realtime/REST staging, số liệu latency, backup/restore hay quyết định production GO. Tạo mới project phải chọn tổ chức trước, không suy từ việc đã kết nối plugin rằng có DB.
- Đã thêm PostgreSQL 16 cô lập vào GitHub Actions: [workflow kiểm thử Postgres #40202897639](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40202897639) **SUCCESS** ở commit `5c4900004ea9cf7f6b1953742b03cc7cdc2f4643` (đối với đúng delta SQL/test đã chạy). CI nạp hai migration vào một Postgres sạch, Auth giả lập không liên hệ tài khoản thật, rồi thử nhiều danh tính, deny overrides, server ACK, operation replay, chống giả Google admin, giới hạn direct-write, khóa/tab cũ và chốt OPEN/DRAINING/FROZEN.
- **Quyền quản trị mặc định = rỗng.** SQL không tự cài một địa chỉ email nào vào bảng `hdnd_private.admin_emails`; môi trường staging phải xác minh tài khoản Google và chỉ định admin cụ thể trước khi thử RPC quản trị, có bằng chứng duyệt. Không suy ra admin từ email của chủ tổ chức Supabase hoặc từ metadata client.
- **Gia cố bảo mật:** mọi `SECURITY DEFINER` ghi dữ liệu chuyển vào schema **không expose** `hdnd_private`. Tầng RPC `public.hdnd_*` chỉ là `SECURITY INVOKER`, có danh sách EXECUTE được thu hẹp và kiểm tra auth từ server; không đưa `service_role` xuống browser. Có test trực tiếp chống public definer trong PostgreSQL. 
- **CI nguồn tổng thể còn FAIL:** [Verify #40202897504](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40202897504) thất bại tại bước Firebase emulator (9 bài cũ về ghi dữ liệu trả `permission_denied`). [Isolated Firebase staging #40202897443](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40202897443) vẫn PASS. Các lỗi phát sinh trong kiểm thử rules/mã Firebase kế thừa từ PR #72, không phải bằng chứng lỗi PostgreSQL; **không được đánh dấu CI tổng thể PASS** và không xóa/sửa test cũ chỉ để làm xanh. Phải đối chiếu với base và cập nhật ma trận tương thích khi tích hợp Supabase UI.
- **Giới hạn bằng chứng:** đây là Postgres 16 với `auth.uid()/auth.jwt()` fixture, **chưa phải Supabase RLS/Data API/Auth/Realtime thật**; cần tiếp tục G1–G8 như bảng dưới. Việc này không được dùng làm lý do merge/cutover.
- **Cần xác nhận từ chủ dự án:** chọn tổ chức Free để tạo *project staging riêng* (không phải production), kiểm tra chi phí hiển thị của Supabase khi thực hiện. Nếu có phí khác 0, dừng và xin phê duyệt riêng; tuyệt đối không tự phát sinh phí. Cần cấu hình OAuth Google redirect/domain; không tự đăng ký OAuth bằng bí mật không có.

---

**Ngày lập:** 25/10/2026 · **Phạm vi:** nhánh `feat/supabase-safe-migration-20261025` · **QUYẾT ĐỊNH HIỆN TẠI: NO-GO PRODUCTION**.

> Chỉ tệp này được cập nhật làm trạng thái cổng phát hành Supabase. Tài liệu kiến trúc: [ADR Supabase](../decisions/SUPABASE_PRIMARY_2026-10-25.md), [kế hoạch + bảng đối chiếu](SUPABASE_MIGRATION_PLAN_2026-10-25.md). Đích cuối cùng WebApp-only; Excel/Google Sheets hiện tại chỉ là biện pháp tạm thời của nhân viên trong lúc lập trình.

## Kiểm kê chứng cứ và người duyệt

| Cổng | Điều kiện bắt buộc | Trạng thái ngày 25/10 | Nguồn chứng cứ |
|---|---|---|---|
| G0 code isolated | Không thay main/Pages/Firebase production; nhánh riêng, PR Draft | PASS: nhánh riêng | [ADR](../decisions/SUPABASE_PRIMARY_2026-10-25.md) |
| G1 schema/RLS/RPC | SQL chạy trên Supabase staging; hạn chế quyền; test ẩn danh, Google, admin, guest, tấn công API | **HOLD** | `source/supabase/migrations` mới là code; chưa chạy staging |
| G2 chức năng | Giữ 15 trường, 5 báo cáo, popup, màu, quyền chi tiết, layout, nhập xuất, lịch sử, checkpoint, trạng thái chốt | **HOLD** | Test TypeScript/Chrome/Supabase phải PASS |
| G3 concurrency | 2–3 tài khoản/2 tab cùng UID; khóa khác ô, chặn trùng ô; mất mạng, timeout, replay, quyền đổi giữa lúc edit | **HOLD** | Chưa có Supabase staging |
| G4 xác thực | Google provider xác minh thực; guest anonymous; admin allowlist; chặn caller giả email/UID/token; không lộ secret | **HOLD** | Chưa cấu hình Auth staging |
| G5 hiệu năng | A/B p50/p95 cùng máy/mạng/cache, cold auth, first-data-painted, lưu và đồng bộ; quota free | **HOLD** | Chưa đo, không được nói Supabase nhanh hơn |
| G6 sao lưu | PostgreSQL backup riêng tư, tự động hóa ngoài gói Free nếu khả thi, restore trên staging cách ly, checksum và quyền truy cập | **HOLD** | Chưa có database thật/backup |
| G7 dữ liệu khởi tạo | Người quản trị xác nhận ảnh chụp cuối cùng một lần; đủ ID/15 trường; đích rỗng; giữ lịch sử cần thiết; đọc lại hash | **HOLD** | CHỈ KIỂM LÚC CUTOVER |
| G8 xác nhận phát hành | GO tường minh của chủ dự án, phương án rollback/tiêu chí dừng và triển khai có kiểm soát | **HOLD** | Chưa có quyết định GO |

**Không phê duyệt cutover chỉ vì CI pass hoặc vì schema đã commit.** Trước khi đổi source, hoàn thành tất cả cổng và ghi link tới log/commit/ảnh hoặc xác nhận người vận hành; tuyệt đối không đưa JSON, mật khẩu, khóa DB, token, email nhân sự lên tài liệu public.

## Sổ trạng thái
- **25/10 — Đã tạo nhánh riêng từ PR #72 (lúc tách: `3683ce487743b0b37903f5ff310149d13068d4a2`) và ADR:** Supabase đã được chủ dự án chọn là hướng đích. Lịch sử PR #71/#72 Firebase còn để truy vết, không được ngầm merge/cutover.
- **25/10 — SQL PostgreSQL đầu tiên:** schema/RPC server-side đã commit ở `source/supabase/migrations/202610250001_hophdnd_core.sql`. Đây là **source code chưa nghiệm thu SQL runtime**, phải rà soát bảo mật độc lập và chạy với database test.
- **Staging Supabase:** chưa tạo/kết nối bằng công cụ của phiên làm việc; không có URL, anon/publishable key, OAuth, backup, benchmark hoặc bằng chứng integration.
- **Firebase production:** không chỉnh Rules, không ghi dữ liệu và không đổi profile/nguồn bởi công việc Supabase này.

## Quy trình phát hành an toàn (sau khi đạt các cổng)
1. Chụp snapshot cuối cùng **một lần**, duyệt nguồn có ID bất biến; backup Firebase cấu hình/dữ liệu hiện còn và backup Supabase staging.
2. Khóa ghi WebApp hiện hành, xử lý toàn bộ nháp đang mở, xác nhận đích Supabase trống và kiểm duyệt tài khoản admin. Không chạy đồng bộ định kỳ Excel→Supabase.
3. Import một lần qua thủ tục có khóa release gate, không overwrite, kiểm count + SHA/giá trị từng trường. Bất kỳ sai biệt nào = STOP; không tự thêm/bớt hồ sơ.
4. Đổi cấu hình nguồn trên một build Pages đã được test và QA; xác thực người dùng; kiểm 2–3 tài khoản và ghi/đọc; chỉ sau đó mở sửa.
5. Nếu sai dữ liệu, quyền, audit, tốc độ vượt ngưỡng đã chọn hoặc lỗi đồng bộ: ngừng ghi, bảo toàn các thao tác mới và nháp, chuyển về chế độ an toàn; **không** tự động đẩy dữ liệu Supabase ngược Firebase.

## Các lỗi đã biết phải kiểm khi viết code
- Câu lệnh SQL client không được cho phép UPDATE/INSERT vào bảng trực tiếp, kể cả guest có JWT.
- Security definer functions cần `set search_path=''`, schema qualify, revoke EXECUTE khỏi PUBLIC/anon.
- Supabase anonymous users dùng vai trò SQL `authenticated`, cần phân biệt bằng JWT `is_anonymous`.
- Frontend không được truyền quyền admin/UID từ localStorage vào RPC như danh tính được tin cậy.
- Realtime chỉ đăng ký business rows, không broadcast khóa token/ẩn danh tính ngoài phạm vi cần thiết.
- Không xóa nháp/checkpoint sau timeout hoặc trạng thái unknown; idempotency dùng UUID operationId.
- Gói Supabase Free có giới hạn và có thể pause khi ít hoạt động, quy trình backup miễn phí phải thử restore.
