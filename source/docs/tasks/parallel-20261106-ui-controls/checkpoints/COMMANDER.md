# COMMANDER checkpoint — UI controls 06/11/2026

Status: IN_PROGRESS_COORDINATION / CODE_TEST_PENDING / DEMO_PENDING
Owner/branch: COMMANDER / `ui/20261106-controls-command`
Baseline: `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`
HEAD tại khảo sát đầu: `0eede66c4f8c05d416084aeab08fd5a030f5bc80` (khởi tạo/điều phối; chưa có code tính năng mới)
Code/tested SHA mới: NOT YET TESTED
Reference 4 nhân sự: `ab8629c7575debd494c908c14bde9967a575a82a` (KHÔNG dùng `91c2dd4`); caret nhỏ là ngoại lệ có chủ ý.
Baseline CI: [42238116883](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42238116883), 3/3 SUCCESS theo README, **không dùng thay PASS đợt mới**.

## Khảo sát và checkpoint đầu tiên
- Đã đọc `COMMANDER.md`, `README.md`, `TRACKER.md`, 3 checkpoint, `source/AGENTS.md`, và workflow cũ `ui-20261105-coordination.yml`.
- Lúc khảo sát: ba nhánh COMMANDER / PICKER / TRACKS đều có HEAD `0eede66c4f8c05d416084aeab08fd5a030f5bc80`; checkpoint worker đều `READY_NOT_STARTED`; chưa có GitHub Actions runs trên ba nhánh mới.
- Owner duy nhất: PICKER chỉ `ui/20261106-picker-restore`, TRACKS chỉ `ui/20261106-l03-tracks`, COMMANDER chỉ `ui/20261106-controls-command`. Không ghi nhánh worker; hai worker tự chạy độc lập.
- Workflow cũ chỉ trigger `ui/20261105-coordination`: sẽ thêm workflow RIÊNG có path filters cho đợt 06/11; không hạ các checks hiện hữu.
- Môi trường công cụ phiên làm việc có GitHub connector read/write, **không có Sites API**. Do đó xây dựng/code/QA/package đến khi đủ, làm `CODEX-DEMO-HANDOFF.md` cho Site ID `appgprj_6aed474532b081919e39ba36909bf6bf`; giữ `DEMO_PENDING` tới khi chứng minh deployment succeeded + live smoke. Không tạo Site khác.
- Không merge main, không deploy Firebase production, không ghi RTDB/Excel thật, không migration live.

## Cần chứng minh trên source SHA cuối
1. PICKER: đúng skin 4 nhân sự theo `ab8629c`, giữ behavior/permissions; một caret tam giác nhỏ cho editable dropdown list/popup, không cho readonly; screenshot ở 1440/900/390 và guest/admin/mixed.
2. TRACKS: 5 widths độc lập theo mode 2/3 cột; auto computed group width; config/list/popup/demo/save/reload/CAS/permissions; thử một người và conflict.
3. COMMANDER: ghép commit theo owner, giải quyết va chạm trên coordination; TypeScript, unit, build, real browser, package synthetic và manifest SHA256 đúng cùng một code SHA; cần cả version/deployment/Sites source hash/live smoke mới DONE.

## Ba bước kế tiếp
1. Xây workflow `ui-20261106-controls.yml` và fixtures/ma trận nghiệm thu trên coordination, kiểm tra toolchain trên code hiện tại.
2. Theo dõi HEAD/checkpoints/CI hai worker, nhận bàn giao kiểm ảnh/test đúng SHA, rồi tích hợp trên coordination.
3. Kiểm full synthetic, đóng gói exact-tested SHA/hash; bàn giao Codex cập nhật Site public hiện có nếu Sites API vẫn vắng.
