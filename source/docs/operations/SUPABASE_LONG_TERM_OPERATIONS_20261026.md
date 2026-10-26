# Mô hình vận hành Supabase — HopHDND (26/10/2026)

> **Chưa triển khai production.** Nhánh PR #77 vẫn Draft/NO-GO. Firebase production và Supabase staging là hai hệ thống dữ liệu **tách biệt**. Không tự đồng bộ, không dual-write, không thay nguồn dữ liệu mặc định nếu chưa được phê duyệt.

## Trạng thái Cloud xác minh trực tiếp 26/10/2026

- Supabase **HopHDND-Staging** (`uguhyunuzsdrkykqgdmq`): `ACTIVE_HEALTHY`, PostgreSQL 17, khu vực `ap-southeast-1`.
- `public.hdnd_items`: **55 bản ghi**, tất cả thuộc đường dẫn dữ liệu thật `hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344`. **0 dòng giả `qa-supa-*`; 0 dòng thiếu content; `revision=1` tất cả bản ghi** (mirror cũ sử dụng `revision=0`, quá trình nhập chuẩn hóa sang 1).
- **4** tài khoản Auth; **2** Google identities; **1** Google identity khớp danh sách quản trị; **0** audit events, **0** cell locks, điều khiển `OPEN`. Các con số là thời điểm kiểm tra, có thể thay đổi khi người dùng thử nghiệm.
- RLS `hdnd_items_read`, `hdnd_acl_read`, `hdnd_audit_read` yêu cầu `hdnd_private.is_admin()`. Điều này đúng để bảo vệ dữ liệu thật trong staging, **nhưng nhân viên chưa được cấp quyền đọc và sửa thực tế**. Advisor hiện còn sáu cảnh báo nhận diện `TO authenticated` có thể bao gồm anonymous; phải đánh giá cả điều kiện `is_admin()` thực thi trước khi coi là lỗ hổng hoặc bật quyền truy cập mới. Có thêm cảnh báo bảo vệ mật khẩu bị rò rỉ đang tắt, cần xem xét theo phương thức xác thực được chọn; một `unused_index` thuộc cấp INFO.
- Nhìn thấy 55 dòng trong PostgreSQL **không phải** bằng chứng đã so khớp SHA-256 với bản Firebase đọc mới nhất hoặc đã test chỉnh sửa ghi/ACK/realtime trên nhiều tài khoản. Chỉ benchmark sau khi trình duyệt xác nhận cùng số dòng và fingerprint ở cả hai nguồn.

## Phân công rõ ràng: không phải nhờ AI cho các thao tác thường ngày

| Việc | Cơ chế vận hành dự kiến | Khi nào cần ChatGPT |
| --- | --- | --- |
| Đọc/tìm kiếm/sửa hồ sơ, lưu thay đổi, nhận cập nhật từ đồng nghiệp | WebApp + tài khoản/ACL đã phê duyệt; giao dịch ghi có ACK, lock ô, audit; **hiện đang chờ QA đầy đủ** | Không cần với mỗi bản ghi |
| Chọn Firebase hay Supabase | Bộ chọn trên WebApp sau khi nghiệm thu và phát hành. Chọn theo tab, không tác động nguồn còn lại | Không cần mỗi lần chọn |
| Quản lý tài khoản/ACL và phân quyền ô | Giao diện quản trị được kiểm thử và lưu vào đúng database đang chọn | Nhờ hỗ trợ khi thay đổi mô hình phân quyền hoặc có sự cố |
| Thêm bảng/trường, thay kiến trúc, sửa SQL/RLS/Auth, nâng cấp mô hình dữ liệu | Migrations trên GitHub → review/CI → staging → QA → release, có backup/rollback | Giao việc qua ChatGPT; AI dùng GitHub/Supabase kết nối để triển khai các thay đổi có phạm vi đã thống nhất |
| Backup/restore, đối chiếu dữ liệu, chuyển nguồn chính thức | Quy trình tác nghiệp, kiểm chứng snapshot và điểm chốt cutover riêng; **không có đồng bộ ngầm** | Nhờ AI điều phối/kiểm tra; cần phê duyệt rõ trước thao tác nguy cơ ghi đè |
| Theo dõi dung lượng/gói Free, Auth, security advisors, hiệu năng, lỗi | Công cụ giám sát tự động hoặc quy trình kiểm tra theo lịch **chỉ khi được cấu hình** | AI phân tích, cải tiến, khắc phục theo yêu cầu; không khẳng định đang giám sát ngầm |

## Điều kiện còn thiếu trước khi Supabase thay Firebase chính thức

1. Browser QA xác minh Firebase và Supabase đọc cùng snapshot 55+ dòng, SHA-256 đầy đủ; chạy đo mạng thật nhiều lượt (P50/P95/lỗi, thời điểm).
2. Thiết kế và kiểm thử **quyền nhân viên** không mở dữ liệu thật rộng cho anonymous; 2–3 tài khoản với các quyền và phiên Google/anonymous phù hợp; admin ACL/RLS không bị bypass.
3. Test end-to-end create/edit/save ACK, optimistic conflict, khóa ô, realtime, freeze/drain, permission revoke, và kiểm tra không ghi nhầm backend. Không dùng dữ liệu thật để diễn tập ghi đè.
4. Snapshot backup độc lập, restore drill, bảng kiểm dữ liệu/cấu hình, log và rollback sau thao tác chuyển nguồn; chốt một lần dữ liệu mới nhất ngay trước cutover, không lấy mốc mirror cũ mặc định nếu hồ sơ đã thay đổi.
5. Duyệt giao diện bộ chọn, phát hành PR #77 qua main trong phiên GO có rollback. Firebase vẫn là lựa chọn an toàn cho tới khi các điều kiện trên đạt.

## Quy tắc quản trị

- **Một repo điều hành:** `cavoixanh638/HopHDND-WebApp`, cùng `CURRENT_STATE.md`, `WORKBOARD.md`, và tài liệu vận hành; không lập nhiều nhánh/luồng chat không cần thiết.
- **Cấu hình thay đổi có truy vết:** mọi migration/schema/RLS/Auth mới cần lưu SQL/version/commit, kết quả kiểm thử và ghi chú rollback; không dùng tài khoản `service_role` trong giao diện, không đưa JSON thật lên GitHub công khai.
- **Phân biệt quyền:** yêu cầu phân tích/đo thử/đọc có thể thực hiện ngay. Thay đổi dữ liệu, cấp quyền rộng, nhập lại snapshot hoặc chuyển production cần mục tiêu rõ, kiểm tra hệ quả và có phê duyệt phù hợp; không tự kích hoạt nền.
- **Tương lai:** nhân viên thao tác trực tiếp trong WebApp, không nhờ AI cập nhật từng dòng. ChatGPT đóng vai trò phát triển, sửa lỗi, nâng cấp, kiểm toán và hỗ trợ thay đổi hệ thống khi chủ dự án yêu cầu.
