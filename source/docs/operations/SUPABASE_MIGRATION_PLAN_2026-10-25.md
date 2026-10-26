# Kế hoạch kỹ thuật và đối chiếu chức năng — Supabase HopHDND

**Quyết định nguồn:** [ADR Supabase](../decisions/SUPABASE_PRIMARY_2026-10-25.md). **Trạng thái:** [SUPABASE_RELEASE_GATE](SUPABASE_RELEASE_GATE_2026-10-25.md). Tài liệu này mô tả yêu cầu kỹ thuật, không xác nhận production đã đổi.

## Giữ cấu trúc ứng dụng

Giữ nguyên `src/app/App.tsx`, các feature `reports/`, `items/`, `history/`, `settings/` và `shared/types.ts` về nghiệp vụ và giao diện. Chỉ bổ sung adapter `SupabaseRepository implements Repository` và controller Supabase Auth/config. Không clone UI và không viết lại logic báo cáo, bộ lọc, màu, tính toán.

Dữ liệu 15 trường editable theo `shared/types.ts`: 13 trường text (content,department,type,partyLevel,progressParty,progressBuild,progressCouncil,specialist,room,vpLeader,ubndLeader,specificProgress,note) + documentKind,isDropped. `recordId`, `displayCode`, `stt`, `revision` và `archivedAt` là metadata không sửa qua save cell. Lưu `record_id` bất biến và `fields` JSONB để không mất cách biểu diễn trạng thái, tên lãnh đạo, định dạng văn bản; lưu bảng audit append-only.

## Hợp đồng truy cập cần đạt trước khi bật UI

| Nhu cầu | Supabase | Bảo đảm |
|---|---|---|
| Đọc dữ liệu | `hdnd_items` RLS SELECT khi `auth.uid()` hợp lệ | Không công khai qua anon API key thuần |
| Quyền | `hdnd_acl` một record `rights.columns/rows/cells`; RPC `hdnd_set_permissions` CAS | precedence cell > row > column; false khác undefined |
| Cấu hình | `hdnd_profile`, RPC CAS `hdnd_set_profile` | Không ghi cấu hình trước khi có baseline server |
| Khóa ô | `hdnd_acquire_cell`, `hdnd_renew_cell`, `hdnd_release_cell` | UID+tab session+token; TTL45s, max theo editor 45/90/120/300/600s |
| Ghi | `hdnd_save_cell_changes` trong PostgreSQL transaction | Trường cho phép, baseline của từng field, quyền, token, freeze, audit, idempotency |
| Realtime | Supabase Postgres Changes `hdnd_items` | Nhận delta sau server-ACK, không cấp quyền theo tín hiệu client |
| Lịch sử | `hdnd_audit` | Append-only, không xóa 50 vòng như Firebase; popup lọc đúng field |
| Chốt | `hdnd_guest_pause` và `hdnd_freeze_transition` | Guest pause khác full freeze; deadline trên máy chủ |
| Nhập dữ liệu | SQL release-only / import staging, đích trống | Một lần tại cutover; no overwrite; đọc lại count/ID/15 giá trị |
| Google/guest | Supabase Auth anonymous + Google OAuth | Admin = verified Google provider + server allowlist, KHÔNG dựa vào client email |

## Test matrix bắt buộc (không giảm vì Supabase miễn phí)

1. Tất cả 5 bảng báo cáo, drilldown, thống kê Thành ủy/Build, ẩn “Không phải trình”, cột gộp, độ rộng cột, màu/status, popup/lịch sử, Excel export/in, chế độ mobile/desktop không hồi quy.
2. Không quyền/guest bị khóa/tài khoản không hợp lệ tự gọi REST UPDATE, RPC, đổi request JSON, giả admin, giả operationId hoặc giả session: **không ghi được**, không sinh audit.
3. Permissions `false` ô phủ quyết `true` dòng/cột, sửa khác ô trên cùng dòng thành công, sửa cùng ô đồng thời chỉ một session giữ lease; hai tab cùng UID không dùng chung token.
4. Editor timeout, bỏ tab, lease bị thay thế, renew sai token, release trễ không làm mất lease người mới; DRAINING không cấp lease mới và chỉ nhận commit trước deadline.
5. Thử 2 khách/1 admin đồng thời, sửa ô và đọc nguồn bằng nhiều trình duyệt khác nhau mà không refresh; mất mạng giữa commit/readback phải giữ draft, retry idempotent, không nhân đôi audit.
6. Lịch sử có timestamp server, actor UID server, operationId duy nhất, đúng old/new, không thể ghi metadata-only hay giả entry.
7. Lưu profile/permissions CAS version; hai admin độc lập không làm mất cập nhật của nhau; màu/preset cá nhân localStorage không bị chuyển thành shared.
8. Kiểm định 100% ID, trường, record count bằng snapshot được admin ký chọn chỉ ở thời điểm cutover. Không tự truy xét/chặn development bởi mirror cũ 55/57.
9. Cold first-data-painted p50/p95, reconnect/realtime speed và quota free dưới tải 20–50 phiên; đối chứng với Firebase trên cùng mạng và commit, không dùng benchmark giả cho kết luận thực tế.

## Quy trình triển khai theo thứ tự

**P0 database/security:** áp dụng migrations lên Supabase staging mới, chạy SQL tests bằng ít nhất 3 JWT thật (admin Google, khách anonymous, người không quyền), test quyền direct-table và injected RPC; reviewer độc lập đánh giá definer/RLS/grants/SQL injection.

**P1 ứng dụng:** thêm `supabase-js` có lockfile tương thích `npm ci`; `SupabaseController` Auth/session/profile/permission/freeze; đặt config runtime publishable URL/key (không chứa service_role); chuyển `App` sang datasource Supabase bằng feature flag staging, không giữ Firebase Auth làm điểm chờ. `Repository.save` phải đọc lại server ACK, `subscribe()` phải trả initial snapshot rồi subscribe delta đúng UID/source.

**P2 QA:** chạy `npm run typecheck && npm test && npm run build:pages && npm run docs:check`, browser smoke, SQL auth tests, 2–3 account thật staging; đo performance. CI PASS thuần JS không thay thế SQL staging PASS.

**P3 release:** backup private + restore rehearsal, duyệt snapshot cuối, import một lần, so checksum, admin GO, cutover có rollback và khóa ghi. Sau chuyển chỉ Supabase là nguồn dữ liệu live; không có sync Sheet tự động.

## Những việc KHÔNG được làm
- Không dùng Supabase `service_role` key trong `index.html`, JS client, file env commit, GitHub Pages.
- Không bỏ đăng nhập ẩn danh bằng cách mở bảng dữ liệu public.
- Không thay `hdnd/profile.dataSource` ở Firebase để thử tính năng mới.
- Không merge PR Supabase sang `main` khi release gate HOLD, và không đóng/xóa Firebase backup.
- Không cam kết tốc độ nhanh hơn chỉ bằng lời quảng cáo.
