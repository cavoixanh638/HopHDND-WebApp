# ADR — Supabase là nền tảng đích của HopHDND (25/10/2026)

**Trạng thái: APPROVED FOR DEVELOPMENT / PRODUCTION NO-GO.** Người quyết định: chủ dự án, cuộc trao đổi ngày 25/10/2026. Quyết định này **THAY THẾ lựa chọn công nghệ Firebase-only** trong [FIREBASE_ONLY_POST_CUTOVER_2026-10-25](FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md), nhưng **GIỮ NGUYÊN các bất biến nghiệp vụ** được chốt trong đó: WebApp là nơi nhập/xem/sửa duy nhất sau cutover, một lần nhập dữ liệu khởi tạo, không phụ thuộc Google Sheets/Excel về lâu dài.

## Điểm tra cứu chính thức
- **Quyết định đích và phạm vi:** file này.
- **Thiết kế schema, RPC, security:** [SUPABASE_MIGRATION_PLAN](../operations/SUPABASE_MIGRATION_PLAN_2026-10-25.md).
- **Tình trạng thật, cổng phát hành, ai được phép quyết định GO:** [CURRENT_STATE](../CURRENT_STATE.md) và [cổng Supabase GO/NO-GO](../operations/SUPABASE_RELEASE_GATE_2026-10-25.md).
- **Từ điển 15 trường A–O, ID và status:** [TU_DIEN_DU_LIEU](../TU_DIEN_DU_LIEU.md).
- **Giữ đủ tính năng:** [FEATURES](../FEATURES.md), [SYSTEM](../SYSTEM.md).
- **Kiến trúc runtime:** [ARCHITECTURE](../ARCHITECTURE.md); **vận hành/backup/rollback:** [VAN_HANH](../VAN_HANH.md).
- **Nguồn mã:** `source/supabase/migrations/` và `source/src/data/supabase-*`.

## Quyết định
1. Nền tảng lưu trữ chính thức tương lai: **Supabase PostgreSQL + Supabase Auth + Realtime** (free plan). Giữ React/Pages, giữ nguyên 5 báo cáo, bảng dữ liệu, bộ lọc, tùy chỉnh, màu, popup, Excel xuất thủ công và các tính năng đã có. Firebase hiện tại chỉ là đường production/preview cũ để đối chứng, **không tự động chuyển đổi hay xóa Firebase**.
2. Hoàn thiện schema, PostgreSQL RPC, RLS, auth, realtime và migration **trên nhánh riêng/staging**; chỉ tích hợp vào production sau nghiệm thu. PR #71/#72 Firebase là tài liệu/logic đối chứng; không cần hoàn thành triển khai Firebase production trước Supabase.
3. **Quyền sửa server-side:** ô > dòng > cột > cấm; phủ quyết tường minh `false` phải giữ; ID/STT/metadata không được sửa trực tiếp. Quản trị phải là tài khoản Google đã xác thực và nằm trong allowlist, không dựa vào email/UID tự gửi từ browser. `auth.uid()` được máy chủ cung cấp.
4. **Độc quyền ô:** lease theo `recordId + field`; người giữ là UID + tab session + token; TTL, gia hạn, không cho phiên cũ giải phóng khóa phiên mới; kiểm tra khóa **trong cùng transaction với write**. Kiểm giá trị gốc theo từng field và `operationId` idempotent. Audit trong cùng transaction. Hai ô khác nhau trên cùng hồ sơ được phép cập nhật không làm mất nhau.
5. **Chốt:** OPEN → DRAINING → FROZEN; DRAINING chặn mở khóa mới, lượt sửa trước DRAINING chỉ hoàn tất trước deadline server; FROZEN chặn toàn bộ. Client không được phép tự giả trạng thái/biên nhận.
6. **An toàn dữ liệu:** khi mất mạng/timeout không coi đã lưu; giữ nháp, thông báo unknown, có readback và đối chiếu; quyền thay đổi trong lúc sửa phải được kiểm lại tại commit. Không triển khai trực tiếp các khóa `service_role`/database password trong Pages, repository hoặc log.
7. **Bản thử:** không lấy file Google Sheets liên tục, không viết mirror/cutover khi đang lập trình. Chỉ tại release gate, quản trị chọn bộ dữ liệu cuối cùng, backup, import duy nhất khi đích trống, kiểm đủ ID/15 trường, audit lịch sử.
8. **Hiệu năng:** so Firebase và Supabase cùng máy, mạng, trình duyệt, lượng dữ liệu, login guest mới/đã đăng nhập, multiuser, p50/p95. Không tuyên bố Supabase nhanh hơn cho tới khi đo. Không bỏ auth/permission hay đưa dữ liệu nội bộ thành public JSON để tăng tốc.
9. **Free plan:** kiểm quota, ngủ/tạm dừng nếu ít hoạt động, quy trình sao lưu và khôi phục thủ công, giới hạn rate/OAuth, kế hoạch khi hết free. Không nâng cấp gói trả phí hoặc bật chi phí nếu chưa được duyệt.

## Trạng thái phát triển so với production
- `main` + Pages public: **không đổi** theo ADR này; dữ liệu thật người dùng đang thao tác bên ngoài WebApp trong giai đoạn phát triển.
- Nhánh `feat/supabase-safe-migration-20261025`: chỉ mã thử nghiệm, schema và tài liệu. **Không có bằng chứng staging Supabase đã tạo, không có credentials, chưa chạy SQL thật và chưa đo multi-browser** khi lập ADR.
- Không tự merge PR #71/#72, không publish Firebase Rules, không đổi `hdnd/profile.dataSource`, không nhập/ghi dữ liệu production; bảo toàn backup Firebase/Rules riêng tư.

## Quy tắc cập nhật tài liệu
Mỗi PR Supabase cập nhật **đúng 1 cổng tình trạng ở [SUPABASE_RELEASE_GATE](../operations/SUPABASE_RELEASE_GATE_2026-10-25.md)**, dẫn chứng exact SHA, test, giới hạn và bước rollback; `CURRENT_STATE` chỉ đặt mục lục/trạng thái hiện hành; `ARCHITECTURE` tóm tắt tham chiếu. Không mở nhiều WORKBOARD hoặc tài liệu cạnh tranh. Đánh dấu FAIL/UNKNOWN/HOLD rõ ràng, không coi CI mock PASS là live/staging PASS.
