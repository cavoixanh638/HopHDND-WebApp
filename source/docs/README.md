# Chỉ mục tài liệu dự án

Điểm bắt đầu chung: [README ở gốc](../README.md). Kết quả thực tế được ghi tại [CURRENT_STATE](CURRENT_STATE.md).

## Tài liệu hiện đã có

| Nhu cầu | Nguồn tra cứu |
|---|---|
| Mục tiêu cải tiến và lộ trình viết lại | [Kế hoạch viết lại](KE_HOACH_VIET_LAI.md) |
| Những chức năng phải đáp ứng | [FEATURES F01–F36](FEATURES.md) |
| Quy tắc làm việc | [AGENTS](../AGENTS.md) |
| Nghiệp vụ và bất biến | [SYSTEM](SYSTEM.md) |
| Kiến trúc đã chọn/dự kiến | [ARCHITECTURE](ARCHITECTURE.md) |
| Tìm file và điểm cần sửa | [REPO_MAP](REPO_MAP.md) |
| Phạm vi giao việc Luna/tổng chỉ huy | [WORKBOARD](WORKBOARD.md) |
| Sử dụng bản thử | [Hướng dẫn sử dụng](HUONG_DAN_SU_DUNG.md) |
| Chạy và đóng gói source | [Cài đặt và chạy](CAI_DAT_VA_CHAY.md) |
| GitHub Pages, Firebase Auth/Realtime Database, rules và giới hạn dữ liệu | [Firebase Pages](FIREBASE_PAGES.md) |
| Hợp đồng RPC và API server | [API](API.md) |
| Bằng chứng và giới hạn | [Kiểm tra các mốc](KIEM_THU_VA_NGHIEM_THU.md), [trạng thái hiện tại](CURRENT_STATE.md) |
| Quyết định phát sinh | [ADR 001](decisions/001-single-html-prototype.md) |
| Danh mục tài liệu cần bàn giao và quy định nguồn chuẩn | [Tài liệu và bàn giao](TAI_LIEU_VA_BAN_GIAO.md) |
| Đã hoàn thành gì, đã kiểm tra gì, còn thiếu gì; đối chiếu từng F01–F36 với bản cũ | [Trạng thái hiện tại](CURRENT_STATE.md) |

Các tài liệu kế hoạch mô tả phương án dự kiến. Chúng không xác nhận app mới đã được triển khai hoặc chạy đúng.

Rà mã ngày 14/10/2026: bảng đối chiếu cũ → mới nằm cuối CURRENT_STATE, có dòng mã cũ và khoảng trống từng Fxx. Đặc tả theo mã chức năng nằm trong [FEATURES](FEATURES.md); trạng thái và bằng chứng kiểm tra hiện hành chỉ ghi tại [CURRENT_STATE](CURRENT_STATE.md). Hợp đồng và quy trình cấu hình dùng chung xem [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md).

## Quy hoạch đã thực hiện và phần tiếp theo

| Tài liệu | Nguồn nội dung / thời điểm tạo |
|---|---|
| AGENTS/SYSTEM/FEATURES/ARCHITECTURE/REPO_MAP | Đã có, link nguồn chuẩn ở trên; file tên cũ chỉ dẫn chuyển tiếp |
| Hướng dẫn sử dụng/quản trị, API, dữ liệu, vận hành | Viết cùng tính năng theo [danh mục bàn giao](TAI_LIEU_VA_BAN_GIAO.md) |

Hướng dẫn quản trị nguồn thật và chuyển đổi/khôi phục chưa có. [API](API.md) mô tả hợp đồng server; tài liệu API không chứng minh deployment đã được nâng cấp hay capability ghi đã bật.

REPOSITORY_LAYOUT gộp vào REPO_MAP; WORKBOARD gọn đã tạo vì có các lượt giao Luna song song. CURRENT_STATE vẫn là nguồn kết quả; WORKBOARD ghi phạm vi/phụ trách.
