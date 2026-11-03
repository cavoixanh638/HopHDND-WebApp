# Theo dõi triển khai UI demo — 03/11/2026

**Điều phối:** IN_PROGRESS. Nguồn chung [README](README.md); [prompt Gemini](GEMINI_PROMPTS.md). Một writer cho mỗi nhánh; chỉ điều phối sửa file này. Mỗi Gemini cập nhật checkpoint **trên nhánh của mình** và push theo mốc khảo sát, bản sửa, kết quả test, lỗi/chặn, DONE. Điều phối đọc commit/checkpoint và cập nhật bảng dưới; không dựa vào lời nhắn “xong” đơn thuần. Checkpoint là cập nhật do chat đang chạy thực hiện, không phải tiến trình nền tự chạy sau khi chat dừng.

| Luồng | Nhánh / HEAD đã xác nhận trên GitHub | Trạng thái | Đã có | Còn thiếu trước DONE |
|---|---|---|---|---|
| A — ô bảng | `ui/20261103-table-cells` / `30b6fd3b31bc32a55790ab260f13da4a37e7c602` | TEST_PENDING, bàn giao Gemini | Typecheck + 31 test PASS đúng SHA; renderer/CSS và checkpoint đã push | Chrome phát hiện căn dọc chưa đạt; sửa rồi kiểm guest/popup, responsive, editor trên SHA mới |
| B — admin/sort | `ui/20261103-admin-controls` / `195755f41f43d4b79835b628012aca7fce419ae2` | TEST_PENDING, bàn giao Gemini | WIP cấu hình layout, sort, UI và checkpoint đã push | Typecheck/build trên SHA mới; unit có 1 palette FAIL cần phân loại/sửa; Chrome admin/guest, reload, CAS, filter |
| C — chip lọc | `ui/20261103-filter-chip` / `a8a4220b21d3b138e9ad0f47ef84ef67b1570673` | TEST_PENDING, bàn giao Gemini | Typecheck + 14 test + build + Chrome desktop/mobile/150% PASS trước commit; code/bằng chứng đã push | Chạy lại test đúng commit SHA, kết luận DONE hoặc sửa lỗi nếu phát sinh |
| Điều phối | `ui/20261103-coordination` / `043bb31c` trước tài liệu này | IN_PROGRESS | Đã bỏ nhãn `HopHDND UI V3 · DEMO`; typecheck + test shell 3/3 PASS | Nhận A/B/C, tích hợp, test đúng SHA, dựng và phát hành lại demo Site riêng tư |

Không merge main, không triển khai Firebase production. Site demo hiện tại vẫn là bản cũ cho đến khi điều phối xác nhận deployment SHA mới.
