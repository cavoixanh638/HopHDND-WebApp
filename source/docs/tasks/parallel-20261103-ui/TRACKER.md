# Theo dõi triển khai UI demo — 03/11/2026

**Điều phối: DONE.** Ba nhánh đã tích hợp và kiểm thử trên code SHA `87b4c8bdf6f9a3025ac00e3f8e342e2345ffa43b`. [CI nguồn PASS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601947296); workflow preview riêng rerun PASS; [PR nháp #152](https://github.com/cavoixanh638/HopHDND-WebApp/pull/152) chưa merge. [Bằng chứng bàn giao đầy đủ](HANDOFF-INTEGRATED.md).

Site demo riêng tư version 2 đã phát hành thành công: https://hophdnd-demo-20261103.kh-ng-gian-l-8341.chatgpt.site . Monitor ba luồng có thể dừng sau bàn giao. Các checkpoint riêng Gemini vẫn ghi TEST_PENDING do môi trường Gemini không chạy được exact-SHA Chrome; điều phối đã chạy các gate này trên bản tích hợp, không gán ngược DONE cho từng chat.

| Luồng | Nhánh / HEAD đã xác nhận trên GitHub | Trạng thái tích hợp | Bằng chứng |
|---|---|---|---|---|
| A — ô bảng | `ui/20261103-table-cells` / `578b4116d3c3cb743334938dc877d3f8a3480819` | Đã nghiệm thu trên bản tích hợp | Chrome 12 tổ hợp vai trò/kích thước/popup và hình học PASS. |
| B — admin/sort | `ui/20261103-admin-controls` / `02c3127753d470675d0f02afebc0cd0a35b4432c` | Đã nghiệm thu trên bản tích hợp | Unit/CAS, admin/guest, NQ trước BC, tên chung và C01/C02/C03 PASS. |
| C — chip lọc | `ui/20261103-filter-chip` / `2c40e38327c5edf502feb192b05d19ffd4e3c29a` | Đã nghiệm thu trên bản tích hợp | Chrome 7 kịch bản, chuột/Enter/Space và 150% font PASS. |
| Điều phối | `ui/20261103-coordination` / code SHA `87b4c8bd` | DONE | 846 unit PASS; browser smoke + Emulator CI PASS; gói và Site version 2 succeeded. |

Không merge main, không triển khai Firebase production. Site demo hiện tại đã nhận gói dựng lại; SHA-256 và deployment ID ghi trong [bàn giao](HANDOFF-INTEGRATED.md).
