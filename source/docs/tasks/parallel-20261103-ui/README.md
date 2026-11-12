# Điều phối UI demo — 03/11/2026

Baseline mã: `b73643d247b5ee8b58586cd85407b9265004f1c6` (runtime đã PASS ở `66e33b85a3424b2316f090e214e813cd04331afc`). Mục tiêu chung: sửa đúng các điểm người dùng nêu ở bảng Danh sách và demo, tích hợp một SHA mới, kiểm thử UI/logic liên quan, dựng lại Site demo riêng tư để người dùng thử. Không lặp kiểm thử 5 phần đã PASS nếu không bị ảnh hưởng; không merge main hoặc triển khai Firebase production.

## Quy ước chung

- Mỗi chat dùng một worktree/nhánh riêng, chỉ sửa vùng file được giao và checkpoint tại `checkpoints/`. Tự khảo sát → sửa → kiểm thử → sửa lỗi → bàn giao SHA/diff/bằng chứng. Không tự nhận DONE khi còn tiêu chí chưa đạt.
- Không sửa quyền thật, dữ liệu nguồn, Excel schema, Firebase Rules, công thức báo cáo/KPI hoặc tính năng ngoài yêu cầu. Dữ liệu demo luôn giả và chỉ trong RAM.
- Ưu tiên kiểm tra quyền admin/guest, ô được sửa/không được sửa, popup và responsive. UI không được làm rối bảng hoặc làm mất thông tin, màu trạng thái và highlight.
- Không ghi đè worktree/nhánh của chat khác. Push nhánh khi code và checkpoint đã kiểm diff; không merge/deploy. Báo lại link commit, test đúng SHA và ảnh/trace ngắn.
- Điều phối nhận đủ bàn giao, cherry-pick/tích hợp, xử lý xung đột, kiểm thử SHA cuối, cập nhật demo Site riêng tư và bằng chứng. Luồng DONE riêng không đồng nghĩa bản tích hợp DONE.

## Luồng

- [A — Trình bày ô bảng](STREAM-A.md): nội dung trình, ba khâu, căn dọc và ID.
- [B — Điều khiển admin](STREAM-B.md): sort, thứ tự mã, tên danh sách, hiện C01–C03.
- [C — Chip lọc](STREAM-C.md): căn dấu × theo ảnh người dùng.
- [Điều phối](COORDINATOR.md): bỏ nhãn demo cũ, tích hợp, kiểm thử và phát hành demo.

Ảnh gốc: `C:/Users/HP/AppData/Local/Temp/codex-clipboard-15f847ab-0a3f-4495-940e-a2481fb2567b.png` (chip “Loại VB NQ QPPL”; dấu × và chữ lệch hàng).
