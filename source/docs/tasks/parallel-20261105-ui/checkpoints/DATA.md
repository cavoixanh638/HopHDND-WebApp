# DATA checkpoint — UI 05/11/2026

## Khảo sát / mốc 1 (2026-11-05)
- Owner: DATA, nhánh `ui/20261105-party-data`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`; HEAD trước mốc: `aa135cfb07fbc29fe642da8710bfb11d61941927` (hai commit tạo hợp đồng/checkpoint; chưa có delta code DATA).
- Đã đọc `README.md`, `WORKER-DATA.md`, `source/AGENTS.md`; kiểm tra lịch sử nhánh bằng GitHub compare; không có mã DATA sửa từ baseline trên remote. GitHub không biểu diễn local dirty tree; chỉ kiểm được remote tree. Không checkout/force/reset.
- Contract hiện tại còn menu `TTTU/BTV TU/BCH/Không phải trình`, alias hiển thị `BTV` và `Không` bị canonical về giá trị cũ. `core.js` đang đòi lease riêng từng field trong patch; cập nhật phụ thuộc không hoạt động với grant chỉ có partyLevel. Phải sửa cả Rules cho ngoại lệ cập nhật phụ thuộc hẹp (server transaction + rules).
- Tình trạng: **IN_PROGRESS**. Đang phân tích Rules và test emulator, tiếp theo implement rồi chạy CI/fixture. **LIVE MIGRATION: NOT RUN**, không Firebase production/Excel/Hosting/Rules deploy.
- Code SHA/test SHA: NOT YET; CI/run/artifact: NOT RUN; fixture dry-run counts: NOT RUN.

## Mốc 2 — implementation và CI đầu tiên (2026-11-05)
- Đã commit menu `Không/TTTU/BTV/BCH`, canonical aliases riêng với status; server Callable `core.js` tạo cập nhật `progressParty` phụ thuộc **bên trong transaction** bằng lease `partyLevel`, chỉ ghi audit một lần; Rules `database.exclusive-candidate.rules.json` áp ngoại lệ hẹp dựa trên grant cấp trình + proof/lease + dự liệu cấp mới/cấp cũ. Chưa deploy Rules production.
- Đã thêm fixture migration offline và runbook `DATA_MIGRATION_RUNBOOK.md`, manifest redacted, inventory, CAS, crash-resume, repeat-run, unknown-values. Số **fixture** 5 record, đổi 2 record (2 cấp trình, 1 tiến độ); **đây không phải số lượng trên RTDB thật**. Target live HOLD, executor live chưa tồn tại.
- CI đầu tiên [run 41986141956](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41986141956): offline fixture PASS, typecheck PASS, domain Vitest PASS, syntax+Rules generation PASS; Emulator **FAIL** (40/40 due Functions project mismatch `demo-hdnd` vs `demo-pr142-cell-edit` => callable 404). Đã sửa ba test clients thành cùng project; CI mới đang chạy. Không gọi Emulator PASS cho đến khi có run thực.
- Code SHA trước mốc CI: `e98c89b5766e31920ab5becb65ab5ef45c9ef4ea`. Các commit test config lần lượt `d021c311...`, `ac163c37...`, `4e236c84...`. CI trên HEAD tiếp theo bắt đầu tại `21786fdd95b94c5087884fa2aa93b58c31687c7d`.
- Quyền production/backup/RTDB true values: **NOT RUN**. Browser App 1440/900/390 và UI tích hợp do commander kiểm sau merge; không claim PASS.
