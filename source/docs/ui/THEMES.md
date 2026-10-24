# Danh bạ theme màu HopHDND

| Mốc | Trạng thái | Tài liệu / snapshot |
|---|---|---|
| **Theme1** — màu đang phát hành lúc đóng mốc 24/10/2026 | **FROZEN** — không tự ý thay | [Theme1.md](Theme1.md), [manifest Git blob SHA](Theme1-MANIFEST.json), [kiểm kê tất cả khai báo màu](Theme1-COLOR-SOURCE-INVENTORY.md), [snapshot toàn bộ repo](https://github.com/cavoixanh638/HopHDND-WebApp/tree/snapshot/Theme1-before-ImperialSky-2026-10-24) |
| Theme2 / Imperial Sky (đề xuất) | **CHƯA TRIỂN KHAI / CHƯA PHÊ DUYỆT** | Chưa có commit đổi theme. Chỉ thực hiện sau khi người dùng chốt, không ghi đè Theme1. |

**Nguyên tắc:** tách màu giao diện/chuyển tab với màu trạng thái nghiệp vụ và các preset riêng trong localStorage / Firebase. Chỉ dùng Theme1 theo SHA và inventory, không suy diễn từ ảnh demo. Muốn quay lại màu Theme1, cherry-pick hoặc phục hồi CSS/token riêng thay vì rollback cả ứng dụng và mất các chức năng mới.
