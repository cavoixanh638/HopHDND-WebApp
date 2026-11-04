# Tracker UI Danh sách — 04/11/2026

**Trạng thái chung: IN_PROGRESS — điều phối đã khởi động; hai worker chưa có code commit.** Baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Chỉ tổng chỉ huy cập nhật trên `ui/20261104-coordination`. Không lấy docs-only HEAD làm tested code SHA. Mốc kiểm tra 04/11/2026 09:09 ICT.

| Mục nghiệm thu | Owner | Trạng thái | Code SHA / tested SHA / bằng chứng | Còn thiếu |
|---|---|---|---|---|
| Nội dung trình: `(Sở - Loại VB)` và read-only nhẹ | A | NOT_STARTED | A HEAD `6031ef55` (docs-only); code `d779dde0` (baseline); tested mới NOT RUN | Code, Chrome list/popup, screenshot |
| L03: cấp trình có quyền sửa, dropdown riêng và 3 cột | A | NOT_STARTED | A HEAD `6031ef55` (docs-only); tested mới NOT RUN | Code, kiểm quyền và geometry |
| L03: chỉ đọc 2 cột, ẩn cấp trình `Không phải trình` | A | NOT_STARTED | A HEAD `6031ef55`; tested mới NOT RUN | Code, Chrome các trạng thái |
| Ba trạng thái L03 cùng hàng dọc; dropdown giống nhóm người phụ trách | A | NOT_STARTED | A HEAD `6031ef55`; tested mới NOT RUN | Chrome pointer/key, 1440/900/390 |
| Admin thấy và đổi tên danh sách ở tiêu đề/tab | B | NOT_STARTED | B HEAD `6031ef55` (docs-only); code `d779dde0` (baseline); tested mới NOT RUN | UI dễ tìm, lưu/reload, guest |
| Admin thấy và bật/tắt riêng C01/C02/C03 | B | NOT_STARTED | B HEAD `6031ef55`; tested mới NOT RUN | UI, CAS và responsive |
| Bản tích hợp, CI đúng SHA, gói và Site demo riêng tư | Tổng chỉ huy | NOT_STARTED | HEAD điều phối ban đầu `6031ef55`; integrated/tested SHA NOT RUN; Site NOT RUN | Nhận A/B; diff/CI/test; HTML hash; demo; báo cáo |

## Nhánh và CI

- **A:** [HEAD](https://github.com/cavoixanh638/HopHDND-WebApp/commits/ui/20261104-table-layout), [checkpoint A](checkpoints/A.md): `NOT_STARTED`, code commit mới chưa có, CI đúng SHA mới chưa có.
- **B:** [HEAD](https://github.com/cavoixanh638/HopHDND-WebApp/commits/ui/20261104-admin-controls), [checkpoint B](checkpoints/B.md): `NOT_STARTED`, code commit mới chưa có, CI đúng SHA mới chưa có.
- **Baseline verified:** compare `d779dde0...6031ef55` của cả 3 nhánh = ahead 1 / behind 0, chỉ bổ sung 10 file nhiệm vụ. [Source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316595), [grouped Chrome](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316556), [Firebase isolated](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316559) `success` tại baseline; **không** thay thế gate worker hoặc tích hợp.

## Nhật ký sự kiện

- **04/11/2026 09:09 ICT:** Commander đã đọc các nhiệm vụ, quy ước, checkpoint A/B, Git refs, compare và các run baseline. Chưa có thay đổi mã, test hay bàn giao từ A/B. Theo dõi và cập nhật khi xuất hiện bằng chứng mới, không tạo commit nếu không đổi trạng thái.
