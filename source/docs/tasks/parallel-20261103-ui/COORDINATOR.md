# Điều phối — UI demo 03/11/2026

Status: DONE (03/11/2026 ICT). Branch `ui/20261103-coordination`; exact tested code SHA `87b4c8bdf6f9a3025ac00e3f8e342e2345ffa43b`. Full [integrated handoff](HANDOFF-INTEGRATED.md), [TRACKER](TRACKER.md), [PR nháp #152](https://github.com/cavoixanh638/HopHDND-WebApp/pull/152). Worker handoffs: [A](checkpoints/A.md), [B](checkpoints/B.md), [C](checkpoints/C.md).

Điều phối sở hữu `source/src/qa/pr95-full-preview.tsx` để bỏ dòng `HopHDND UI V3 · DEMO` và giữ các công cụ demo tương thích layout mới. Không đụng file worker khi họ đang ghi. Nhận commit từng luồng, đọc diff/bằng chứng, tích hợp vào nhánh này, sửa xung đột và test đúng SHA cuối.

Đích cuối: mọi mục trong yêu cầu người dùng nghiệm thu ở bản admin/guest và Site demo riêng tư, không chỉ ở branch worker. Typecheck, unit liên quan, browser admin/guest/responsive, smoke popup và setting PASS đúng SHA. Dựng lại artifact `compact-qa`, cập nhật Site `appgprj_6ae93f17c2e48191815caef8a642fa14` từ source SHA tích hợp, xác nhận deployment succeeded và URL hoạt động sau login. Lưu SHA, run, screenshot, limitation tại báo cáo tích hợp. Không merge main, không deploy Firebase production.

## Tiến độ

- A chat Codex `01a19f56-7556-7002-b905-5a58055ce4e0`, B `01a19f56-8a0d-7f82-9df4-4efb41fb8241`, C `01a19f56-9a0d-74e2-80ec-db9bf1adea8b` đã dừng theo điều chỉnh của người dùng, lưu WIP và push lên ba nhánh riêng. Gemini tiếp quản theo prompt; không có hai writer đồng thời.
- Điều phối bỏ toàn bộ dòng `HopHDND UI V3 · DEMO` ở preview, commit `1ccbcbcfa75ab2e497a5cfc62c208a7f3087f1ba`; typecheck và test preview-shell 3/3 PASS. B được giao thêm `item-layout-merge.ts` trong `bcfea44b18c428e1195c238161576110872f8676` vì cấu hình mới cần merge/CAS.
- Các tiêu chí UI còn chờ A/B/C, kiểm thử SHA tích hợp, dựng lại demo và xác nhận URL sau đăng nhập. Không lặp các gate 5 phần cũ nếu không bị ảnh hưởng.

Đã nhận đủ ba nhánh, kiểm thử đúng code SHA trên CI, dựng lại gói và phát hành Site demo riêng tư version 2 thành công. Nội dung tiến độ cũ phía trên chỉ là lịch sử; bằng chứng cuối và giới hạn sử dụng nằm trong [HANDOFF-INTEGRATED](HANDOFF-INTEGRATED.md). Không merge main, không deploy Firebase production.
