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

## Checkpoint sự kiện tiếp theo — workflow, fixtures, CI
- Đã thêm workflow riêng `.github/workflows/ui-20261106-controls.yml` có path filters và hỗ trợ cùng CI cho 3 nhánh; không động tới workflow 05/11.
- Đã thêm `source/scripts/ui-20261106-commander-smoke.mjs`, full synthetic (role guest/admin), fixture mixed, và popup readonly/mixed 1440/900/390 (script update commit `9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`). Ảnh/rects được upload theo source SHA của run. Chỉ là baseline smoke, không thay C01–C10.
- Đã thêm `ACCEPTANCE-MATRIX.md` nêu 15 gates, `CODEX-DEMO-HANDOFF.md` chỉ đích Site existing ID và quy trình deploy/hash/smoke.
- GitHub run #42245221036 ở `15295e` bị cancel do concurrency; run [#42245332228](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245332228) tại `1343f3d`: jobs `controls-and-package` và `isolated-cas` **SUCCESS**, job `real-app-emulator` IN_PROGRESS lúc quan sát; chưa tính full run PASS hoặc feature acceptance.
- Run [#42245720825](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245720825) trigger tại `9bbf451` sau bổ sung popup, đang PENDING khi quan sát. Docs commits sau script không tự trigger path-only CI.
- PICKER checkpoint `IN_PROGRESS_SURVEY`, HEAD `4feba0b4d19e7955fc9af894ff27ea617b6d910f` lúc khảo sát; TRACKS `IN_PROGRESS`, HEAD đã tiến tới `1fc34fc9eb39233b59de6775b91442d7308d1216` khi quan sát, chưa có bàn giao PASS/tested SHA. Không ghi nhánh worker.
- Container hiện không resolve DNS github.com; GitHub connector vẫn read/write và GitHub Actions là môi trường test phù hợp. Không có Sites API, Site ID `appgprj_6aed474532b081919e39ba36909bf6bf` vẫn **DEMO_PENDING**, version 3 chưa được thay.

### Next (tối đa 3)
1. Theo dõi worker checkpoints/HEAD/CI; yêu cầu họ tự khép C01–C10, không bắt chờ nhau, không chiếm phạm vi.
2. Khi có code bàn giao, tích hợp lên branch COMMANDER, required feature scripts và full SHA CI/Emulator/browser, kiểm ảnh/rects/CAS, sửa cross-contract.
3. Đóng gói hash đúng SHA final và hoàn thiện Codex handoff/deploy chính Site hiện có (nếu Sites API được cấp); chỉ DONE sau live smoke và version/deployment proof.

### Sự kiện CI/trigger sau smoke cập nhật
- Run `#42245332228` bị `cancelled` do concurrency khi run mới `#42245720825` bắt đầu; chỉ giữ các witness job đã báo thành công để khảo sát, không coi toàn run success.
- Run `#42245720825`, source SHA `9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`: `controls-and-package` SUCCESS và `isolated-cas` SUCCESS; `real-app-emulator` IN_PROGRESS, tại bước thực thi full real app Emulator khi kiểm gần nhất. Có artifacts `ui-20261106-controls-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` và `ui-20261106-cas-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`. Không coi smoke này là final feature test.
- **Trigger nuance:** GitHub on-push không chạy workflow từ coordination cho push worker nếu workflow file không tồn tại trong HEAD worker. Hai worker tự test với toolchain hoặc tự đặt YAML trên nhánh mình; COMMANDER sẽ test sau khi tích hợp. Ghi trong TRACKER. Không sửa nhánh worker.
- Hiện TRACKS đang sửa `item-layout-merge.ts`, `item-preferences.ts`, `ItemList.tsx`, `l03-track-widths.css`; PICKER vẫn checkpoint khảo sát, chưa có code để tích hợp. COMMANDER không cherry-pick WIP.

### CI confirmed 3/3 SUCCESS (source BEFORE feature integration)
- [Run #42245720825](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245720825): `completed / success` cho cả `controls-and-package`, `isolated-cas`, `real-app-emulator` trên exact SHA **`9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`**.
- 3 artifact: `ui-20261106-controls-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13518385649), `ui-20261106-cas-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13518945326), `ui-20261106-real-app-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13517841387).
- **GIỚI HẠN:** source SHA đó chỉ có script/CI điều phối, chưa có code PICKER + TRACKS. Đây là `BASELINE_COORDINATION_PASS`, **KHÔNG phải FINAL_INTEGRATION_PASS hoặc DEMO_DONE**. Cần rerun toàn bộ gates trên SHA tích hợp mới.

## Kiểm tra PICKER theo yêu cầu người dùng — 06/11
- HEAD worker: `dae2051c39ebf595d6f79f31d28125b8db04b5ca`; code WIP trước checkpoint `f270cbd86f337f6397288856af19f9709f6e8a7e`. Compare baseline: chỉ `item-frame.css`, hai browser scripts, fixture TypeScript và HTML thay đổi; không sửa TRACKS.
- Checkpoint worker **`CODE_WIP_TEST_PENDING — NOT DONE`**, `Tested SHA: NONE`, GitHub Actions worker `[]`; ảnh reference/baseline/after và measured rects **chưa có**. Vì vậy lời báo "xong" chưa phải bằng chứng nghiệm thu.
- COMMANDER đã tạo candidate integration/test commit `2518d71e54ef8c9153f88265613bab8550e7929f` trên branch coordination bằng cách nhập đúng 5 blobs source/test PICKER, **không thay worker branch**, không merge main. Bắt đầu run [#42248060058](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42248060058) để xác minh TypeScript/unit/build/CAS + test browser của worker. Chưa được gọi PASS cho đến khi có kết luận.
- Code review phát hiện **nguy cơ cascade**: selector cũ cho standard picker L01/L03 có specificity cao và `background:transparent!important` / `transform:rotate(45deg)!important` cho `::after`, có thể thắng selector tam giác chung ở cuối file; cần dùng computed-style evidence để kết luận, nếu FAIL thì COMMANDER sửa skin nối trên coordination và rerun.
- Reference bắt buộc `ab8629c7575debd494c908c14bde9967a575a82a`; không có screenshot/diff từ reference cho phép gọi restore PASS. Lưu trạng thái `PICKER_CANDIDATE_TESTING`, không `PICKER_DONE`.
