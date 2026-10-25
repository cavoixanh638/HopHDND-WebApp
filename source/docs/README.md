> **CHỈ ĐẠO MỚI NHẤT — CHẠY SONG SONG FIREBASE + SUPABASE, KHÔNG BỎ DATABASE NÀO (25/10/2026).** Chọn nguồn trong cùng WebApp, độc lập các thao tác đọc/ghi, không đồng bộ tự động, chưa thay production. [ADR sửa theo quyết định mới](decisions/SUPABASE_PRIMARY_2026-10-25.md) · [GO/NO-GO có bằng chứng Cloud](operations/SUPABASE_RELEASE_GATE_2026-10-25.md) · [Nhiệm vụ tích hợp nguồn chọn](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74). Những dòng “Supabase thay Firebase” bên dưới là mô tả kế hoạch cũ, không còn là quyết định của chủ dự án.

> **TRA CỨU ĐÍCH SUPABASE (25/10/2026):** [Quyết định thay thế Firebase-only](decisions/SUPABASE_PRIMARY_2026-10-25.md) → [Kế hoạch kỹ thuật/giữ chức năng](operations/SUPABASE_MIGRATION_PLAN_2026-10-25.md) → [Một cổng GO/NO-GO duy nhất](operations/SUPABASE_RELEASE_GATE_2026-10-25.md) → [migrations](../supabase/migrations/). Supabase đang ở **nhánh thử nghiệm, production NO-GO**; các dòng “Firebase là đích” phía dưới thuộc bản đã chốt trước 20:51 ngày 25/10 và nay đã được thay thế về quyết định công nghệ.

## Hướng dẫn sao lưu production trước khi mở realtime — 25/10/2026
[Hướng dẫn backup read-only trên Windows](operations/FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md) và [GO/NO-GO](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md). Công cụ đã có trên nhánh PR #72 nhưng **chưa chạy lên dữ liệu thật**; không upload JSON/Rules thật lên GitHub.

---

## Hồ sơ hệ thống mới cần đọc trước khi phát hành (25/10/2026)
**[Cổng phát hành Firebase chính, khóa ô, đóng băng — GO/NO-GO](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md)** là điểm vào vận hành chính thức cho PR #71/#72 (Draft). [Thiết kế khóa và đóng băng](decisions/CELL_EDIT_EXCLUSIVITY_AND_FREEZE_2026-10-25.md) · [Quy trình thao tác](operations/CELL_EDIT_FREEZE_EXECUTION_2026-10-25.md). Những mục nói “Sheets là nguồn chính” bên dưới thể hiện bản production cũ/lịch sử; đích dài hạn là Firebase `hdnd/items` sau migration được xác nhận. **Chưa deploy Firebase production.**

---

# Chỉ mục tài liệu dự án HopHDND

Tài liệu trong `source/docs/` (trên máy tính: `docs/`). **Các trang 0.5.x–0.7.0 mô tả mốc quá khứ có thể còn ví dụ A–P/16 cột; mọi việc đang sửa phải ưu tiên Excel A–O mới và các đoạn 19/10/2026 trong tài liệu nguồn chuẩn. Lịch sử chat đã archived chỉ truy xuất được một phần, không được coi là đã đối soát 100%.** [README mã nguồn](../README.md) là điểm bắt đầu; **trạng thái thực tế** xem [CURRENT_STATE](CURRENT_STATE.md), không suy từ kế hoạch hoặc kết quả test local rằng production đã hoạt động.

## Nguồn chuẩn — mỗi loại thông tin một nơi

| Cần biết | Nguồn chuẩn |
|---|---|
| AI/người phát triển phải làm việc theo quy tắc gì? | [AGENTS](../AGENTS.md) |
| Hệ thống phục vụ nghiệp vụ gì, điều gì không được vi phạm? | [SYSTEM](SYSTEM.md) |
| **Thử ưu tiên dữ liệu + bố cục trước quyền chỉnh sửa (khách, A/B)** | [DATA_FIRST_REORDER_2026-10-23](DATA_FIRST_REORDER_2026-10-23.md) |
| **Đo Chrome thực tế, so sánh 3 host và giới hạn rollback** | [HOSTING_STARTUP_AB_2026-10-23](HOSTING_STARTUP_AB_2026-10-23.md) |
| **Ma trận đối chiếu popup với Danh sách và kiểm thử kéo cột** | [REPORT_DETAIL_PARITY](REPORT_DETAIL_PARITY_2026-10-19.md) |
| **Bảng chi tiết mở từ ô báo cáo; cấu hình cột hiển thị riêng** | [FEATURES — phần Bảng chi tiết nhanh](FEATURES.md), [ARCHITECTURE — ReportDetailGrid](ARCHITECTURE.md), [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md) |
| Chức năng/tiêu chí nghiệm thu F01–F36 | [FEATURES](FEATURES.md) |
| Kiến trúc, thành phần và ranh giới nguồn dữ liệu | [ARCHITECTURE](ARCHITECTURE.md) |
| Tìm code cần sửa, bố trí module và đường dẫn `source/` trên GitHub | [REPO_MAP](REPO_MAP.md) |
| Các trường dữ liệu, 15 cột A–O hiện hành, ID, kiểu, giá trị, quyền | [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md) |
| Hiện đã làm gì, còn lỗi gì, cái gì chưa nghiệm thu? | [CURRENT_STATE](CURRENT_STATE.md) |
| Ai được giao việc gì, vướng phụ thuộc gì? | [WORKBOARD](WORKBOARD.md) |
| Kế hoạch/lộ trình và lịch sử đề xuất | [KE_HOACH_VIET_LAI](KE_HOACH_VIET_LAI.md) |
| Người dùng thao tác thế nào, quản trị làm gì? | [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md) |
| Chạy local và các lệnh build/test | [CAI_DAT_VA_CHAY](CAI_DAT_VA_CHAY.md) |
| Triển khai Pages, quay lại, sao lưu, phục hồi, xử lý sự cố | [VAN_HANH](VAN_HANH.md) |
| Xác thực, cấu trúc RTDB, Security Rules | [FIREBASE_PAGES](FIREBASE_PAGES.md) |
| Cấu hình của app Google/HTML legacy | [DONG_BO_CAU_HINH](DONG_BO_CAU_HINH.md) |
| Hợp đồng API/RPC | [API](API.md) |
| Bằng chứng test, nghiệm thu từng mốc | [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md) |
| **Phương án tooltip đã chốt, số đo A/B và ràng buộc hiệu năng hover** | [TOOLTIP_PERFORMANCE_AB_2026-10-19](TOOLTIP_PERFORMANCE_AB_2026-10-19.md), [FEATURES — F06](FEATURES.md), [ARCHITECTURE — hover báo cáo](ARCHITECTURE.md) |
| Các quyết định và lý do | [ADR 001](decisions/001-single-html-prototype.md) |
| Đối chiếu yêu cầu trao đổi 17–19/10, phát hành preview, lỗi còn mở | [FEATURES — phần nghiệm thu bổ sung](FEATURES.md), [CURRENT_STATE — kiểm toán 19/10](CURRENT_STATE.md), [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md) |

**Mốc hiện hành 19/10/2026:** kiểu tương tác ô thống kê được chốt ở [bản preview viền rõ](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/) — ô đếm dương bấm toàn ô, viền xanh ngọc 2px, tooltip dùng chung và không dùng CSS Anchor/`body:has()`. [CURRENT_STATE](CURRENT_STATE.md) chứa tình trạng và SHA triển khai, [VAN_HANH](VAN_HANH.md) chứa rollback. Các mô tả CSS Anchor trong bản kiểm thử cũ là **lịch sử, không là chuẩn hiện tại**. PR #3 chưa merge; production root chưa đổi.

## Quy ước tránh chồng chéo

- **Code rollback khác data restore**, nhưng cả hai quy trình ở [VAN_HANH](VAN_HANH.md). Không lập đồng thời các file `TRIEN_KHAI_VA_QUAY_LAI.md`, `SAO_LUU_VA_KHOI_PHUC.md`, `XU_LY_SU_CO.md` nếu chưa có lý do tách.
- Chưa cần `HUONG_DAN_QUAN_TRI.md` riêng: hướng dẫn thao tác quản trị thuộc [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md), xác thực/Rules thuộc [FIREBASE_PAGES](FIREBASE_PAGES.md).
- Chưa cần `CHUYEN_DOI_DU_LIEU_CU.md` riêng khi migration chưa được chốt: quyết định trong [KE_HOACH_VIET_LAI](KE_HOACH_VIET_LAI.md), mapping đang có trong [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md); chỉ tách khi có triển khai chuyển đổi thực tế.
- Chưa cần `CHANGELOG.md` riêng: mốc thay đổi và trạng thái trong [CURRENT_STATE](CURRENT_STATE.md), bằng chứng ở [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- `MA_TRAN_CHUC_NANG.md` và `THIET_KE_KY_THUAT.md` là **file chuyển tiếp** đến FEATURES và ARCHITECTURE; không duy trì bản sao nội dung.
- [TAI_LIEU_VA_BAN_GIAO](TAI_LIEU_VA_BAN_GIAO.md) là **đề xuất danh mục ban đầu/lịch sử**; quy ước gộp hiện hành tại trang này có ưu tiên khi có khác biệt.

Với mỗi thay đổi, sửa **nguồn chuẩn trước**, tài liệu khác chỉ thêm liên kết/cảnh báo nếu cần. Không đánh dấu production PASS chỉ dựa vào test local hoặc emulator.
