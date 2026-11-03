# Điều phối — UI demo 03/11/2026

Status: ASSIGNED. Branch `ui/20261103-coordination`; baseline `b73643d247b5ee8b58586cd85407b9265004f1c6`; tested prior runtime `66e33b85a3424b2316f090e214e813cd04331afc`. Entry: [README](README.md). Worker handoffs: [A](checkpoints/A.md), [B](checkpoints/B.md), [C](checkpoints/C.md).

Điều phối sở hữu `source/src/qa/pr95-full-preview.tsx` để bỏ dòng `HopHDND UI V3 · DEMO` và giữ các công cụ demo tương thích layout mới. Không đụng file worker khi họ đang ghi. Nhận commit từng luồng, đọc diff/bằng chứng, tích hợp vào nhánh này, sửa xung đột và test đúng SHA cuối.

Đích cuối: mọi mục trong yêu cầu người dùng nghiệm thu ở bản admin/guest và Site demo riêng tư, không chỉ ở branch worker. Typecheck, unit liên quan, browser admin/guest/responsive, smoke popup và setting PASS đúng SHA. Dựng lại artifact `compact-qa`, cập nhật Site `appgprj_6ae93f17c2e48191815caef8a642fa14` từ source SHA tích hợp, xác nhận deployment succeeded và URL hoạt động sau login. Lưu SHA, run, screenshot, limitation tại báo cáo tích hợp. Không merge main, không deploy Firebase production.

Next: tạo worktree ba worker từ commit docs này; giao chat; theo dõi checkpoint; tích hợp và phát hành.
