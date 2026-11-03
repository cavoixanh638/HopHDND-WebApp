# Theo dõi triển khai UI demo — 03/11/2026

**Điều phối:** IN_PROGRESS. Nguồn chung [README](README.md); [prompt Gemini](GEMINI_PROMPTS.md). Một writer cho mỗi nhánh; chỉ điều phối sửa file này. Điều phối đã nhận ba nhánh, tích hợp trong `ui/20261103-coordination` và mở [PR nháp #152](https://github.com/cavoixanh638/HopHDND-WebApp/pull/152) để chạy kiểm thử đúng SHA. Các checkpoint Gemini vẫn ghi TEST_PENDING; kết quả dưới đây là kiểm chứng bổ sung của điều phối, không gán ngược trạng thái DONE cho từng chat.

Monitor Codex đã bật: `theo-d-i-ba-lu-ng-gemini-ui-h-nd`, quét GitHub mỗi 30 phút, chỉ báo khi có thay đổi đáng kể hoặc cần người dùng. Không thể thấy nội dung chat Gemini nếu Gemini không ghi checkpoint/push; nhánh GitHub là nguồn theo dõi.

| Luồng | Nhánh / HEAD đã xác nhận trên GitHub | Trạng thái | Đã có | Còn thiếu trước DONE |
|---|---|---|---|---|
| A — ô bảng | `ui/20261103-table-cells` / `578b4116d3c3cb743334938dc877d3f8a3480819` | Tích hợp; exact-SHA gate chung đang chạy | CSS căn giữa, metadata sau nội dung, ba hàng tiến độ; Chrome 12 tổ hợp vai trò/kích thước/popup và hình học PASS trên bản tích hợp | Chốt CI toàn bộ trên SHA tích hợp |
| B — admin/sort | `ui/20261103-admin-controls` / `02c3127753d470675d0f02afebc0cd0a35b4432c` | Tích hợp; exact-SHA gate chung đang chạy | Admin-only sort, NQ trước BC, đổi tên danh sách, C01/C02/C03 riêng; unit/CAS PASS; demo cục bộ xác nhận quyền admin/guest và thứ tự sort | Chốt CI + kiểm chứng bản Site sau phát hành |
| C — chip lọc | `ui/20261103-filter-chip` / `2c40e38327c5edf502feb192b05d19ffd4e3c29a` | Tích hợp; exact-SHA gate chung đang chạy | Chrome hình học 7 kịch bản, chuột/Enter/Space, 1440/900/390/320 và 150% PASS trên bản tích hợp | Chốt CI toàn bộ trên SHA tích hợp |
| Điều phối | `ui/20261103-coordination` / xem HEAD của PR #152 | IN_PROGRESS | Đã merge ba nhánh vào nhánh điều phối; `npm test` 846 PASS/116 skip, typecheck, build QA/Pages PASS; sửa smoke cũ và đồng bộ tên tab | Đưa toàn bộ workflow cần thiết về PASS, lưu bằng chứng đúng SHA, đóng gói và phát hành lại Site demo riêng tư |

Không merge main, không triển khai Firebase production. Site demo hiện tại vẫn là bản cũ cho đến khi điều phối xác nhận deployment SHA mới.
