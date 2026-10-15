# Chỉ mục tài liệu dự án HopHDND

Tài liệu trong `source/docs/` (trên máy tính: `docs/`). [README mã nguồn](../README.md) là điểm bắt đầu; **trạng thái thực tế** xem [CURRENT_STATE](CURRENT_STATE.md), không suy từ kế hoạch hoặc kết quả test local rằng production đã hoạt động.

## Nguồn chuẩn — mỗi loại thông tin một nơi

| Cần biết | Nguồn chuẩn |
|---|---|
| AI/người phát triển phải làm việc theo quy tắc gì? | [AGENTS](../AGENTS.md) |
| Hệ thống phục vụ nghiệp vụ gì, điều gì không được vi phạm? | [SYSTEM](SYSTEM.md) |
| Chức năng/tiêu chí nghiệm thu F01–F36 | [FEATURES](FEATURES.md) |
| Kiến trúc, thành phần và ranh giới nguồn dữ liệu | [ARCHITECTURE](ARCHITECTURE.md) |
| Tìm code cần sửa, bố trí module và đường dẫn `source/` trên GitHub | [REPO_MAP](REPO_MAP.md) |
| Các trường dữ liệu, cột A–P, ID, kiểu, giá trị, quyền | [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md) |
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
| Các quyết định và lý do | [ADR 001](decisions/001-single-html-prototype.md) |

## Quy ước tránh chồng chéo

- **Code rollback khác data restore**, nhưng cả hai quy trình ở [VAN_HANH](VAN_HANH.md). Không lập đồng thời các file `TRIEN_KHAI_VA_QUAY_LAI.md`, `SAO_LUU_VA_KHOI_PHUC.md`, `XU_LY_SU_CO.md` nếu chưa có lý do tách.
- Chưa cần `HUONG_DAN_QUAN_TRI.md` riêng: hướng dẫn thao tác quản trị thuộc [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md), xác thực/Rules thuộc [FIREBASE_PAGES](FIREBASE_PAGES.md).
- Chưa cần `CHUYEN_DOI_DU_LIEU_CU.md` riêng khi migration chưa được chốt: quyết định trong [KE_HOACH_VIET_LAI](KE_HOACH_VIET_LAI.md), mapping đang có trong [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md); chỉ tách khi có triển khai chuyển đổi thực tế.
- Chưa cần `CHANGELOG.md` riêng: mốc thay đổi và trạng thái trong [CURRENT_STATE](CURRENT_STATE.md), bằng chứng ở [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- `MA_TRAN_CHUC_NANG.md` và `THIET_KE_KY_THUAT.md` là **file chuyển tiếp** đến FEATURES và ARCHITECTURE; không duy trì bản sao nội dung.
- [TAI_LIEU_VA_BAN_GIAO](TAI_LIEU_VA_BAN_GIAO.md) là **đề xuất danh mục ban đầu/lịch sử**; quy ước gộp hiện hành tại trang này có ưu tiên khi có khác biệt.

Với mỗi thay đổi, sửa **nguồn chuẩn trước**, tài liệu khác chỉ thêm liên kết/cảnh báo nếu cần. Không đánh dấu production PASS chỉ dựa vào test local hoặc emulator.
