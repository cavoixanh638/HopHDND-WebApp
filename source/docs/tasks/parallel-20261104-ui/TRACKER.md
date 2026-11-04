# Tracker UI Danh sách — 04/11/2026

**Trạng thái chung: NOT_STARTED.** Code baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Tổng chỉ huy là writer duy nhất của file này trên `ui/20261104-coordination`. Đọc [quy ước](README.md), [nhiệm vụ A](WORKER-TABLE.md), [nhiệm vụ B](WORKER-ADMIN.md) và [checkpoint tổng chỉ huy](checkpoints/COMMANDER.md). Ghi code SHA/tested SHA riêng; docs-only commit không thay kết quả code.

| Mục nghiệm thu | Owner | Trạng thái | Code SHA / bằng chứng mới nhất | Còn thiếu |
|---|---|---|---|---|
| Nội dung trình: `(Sở - Loại VB)` và read-only nhẹ | A | NOT_STARTED | Baseline | Thiết kế, code, Chrome list/popup |
| L03: cấp trình có quyền sửa, dropdown riêng và 3 cột | A | NOT_STARTED | Baseline | Code, kiểm quyền/geometry |
| L03: chỉ đọc 2 cột, ẩn cấp trình `Không phải trình` | A | NOT_STARTED | Baseline | Code, kiểm giá trị/geometry |
| Ba trạng thái L03 cùng hàng dọc; dropdown giống nhóm người phụ trách | A | NOT_STARTED | Baseline | Chrome pointer/key, 1440/900/390 |
| Admin thấy và đổi tên danh sách ở tiêu đề/tab | B | NOT_STARTED | Baseline | UI dễ tìm, lưu/reload/guest |
| Admin thấy và bật/tắt riêng C01/C02/C03 | B | NOT_STARTED | Baseline | UI dễ tìm, CAS, responsive |
| Bản tích hợp, CI đúng SHA, gói và Site demo riêng tư | Tổng chỉ huy | NOT_STARTED | Baseline | Nhận A/B, tích hợp, test, deploy demo, bàn giao |

## Nhật ký sự kiện

- 04/11/2026: lập nhiệm vụ và ranh giới file; chưa có mã mới hoặc test mới. Mỗi chat tự ghi checkpoint đầu tiên sau khi nhận việc. Tổng chỉ huy bổ sung dòng chỉ khi có commit, kết quả test, lỗi/chặn hoặc quyết định tích hợp mới; không dùng lời báo “xong” thay bằng chứng.
