# Gemini STAGES — UI Tiến độ 3 khâu
Bạn là worker độc lập end-to-end. Không tạo chat/agent Codex, không làm tổng chỉ huy.
Repo cavoixanh638/HopHDND-WebApp; branch **ui/20261107-picker-parity-stages** đã tạo. Reference source **e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa**.
Đọc [README](README.md) + [checkpoint của bạn](handoffs/STAGES.md). Tiếp tục HEAD, không reset/đợi/import output CONTENT.
Tổng chỉ huy: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/COMMANDER.md; tracker đọc tại https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/TRACKER.md.

## Đầu ra
Bốn ô Cấp trình TU, Tiến độ Thành ủy, Trình Xây dựng NQ, Trình ban hành NQ lấy geometry/hover/focus/caret từ picker UBND/VP/Phòng/CV; giữ nền/màu nghiệp vụ, quyền, config5widths, List/popup2/3tracks và alignment.

## Sở hữu
- Tạo source/src/features/items/picker-parity-stages.css.
- source/src/features/items/l03-track-widths.css: import CSS riêng ở đầu file đúng cú pháp; điều chỉnh geometry L03 thật sự cần, không đổi model/formula/gaps5widths.
- Tạo source/tests/picker-parity-stages*.test.ts* và source/scripts/picker-parity-stages*.mjs; ảnh/rects/computedstyle source/qa-results/picker-parity-stages; workflow riêng prefix picker-parity-stages nếu cần.
- Chỉ checkpoint handoffs/STAGES.md trên nhánh mình. Không sửa CompactGroupedValue.tsx, CellPicker, cell-picker.css, app.css, item-frame.css, width model/preferences/App/ItemList/ReportDetailGrid/backend.
- DOM baseline có .compact-stages[data-rev2], data-level-layout, data-stage-field, data-ui-reference-part, data-editable; dùng selector theo field, không nth-child.
- l03-track-widths.css hiện loaded sau item-frame.css; import mới trước rule cũ nên cần specificity scoped phù hợp; kiểm computed cascade thật. Không sửa style chung reference.

## Tiêu chí bắt buộc
1. Trigger editable min-height 26,padding 4×7,font 11/550,line-height 1.35,radius 6,caret 5×3, gap 8; không còn style36px/caret rail lớn. Nền target giữ nguyên cảhover/focus/open; màu chữ nghiệp vụ/palette/highlight ưu tiên neutral.
2. 5widths giữ nguyên: readonly[label,status], editable[label,level,status], mỗi mode tách riêng. **Status buttons width100% track bằng nhau**, không fit-content, không reset config hoặc thêm min-width lớn.
3. L03 grid giữ column-gap8px/model23pxchrome theo baseline; row-gap5px; nhãn và các giá trị trong dòng center dọc. Mixed quyền không đổi điểm bắt đầu status; hàng có text dài tự cao đủ, không ép26 làm cắt.
4. Cấp trình edit =>3tracks, dropdown riêng cột2; cấp trình readonly=>2tracks, text cạnh Thành ủy trong ngoặc theo baseline. Không trường nào giả dropdown nếu không có quyền.
5. Readonly value font 13/400/line-height 1.35, khôngbutton/caret/border/shadow/lift; **giữ nền màu riêng phía sau giá trị hiện có**. Giữ màu chữ/palette/highlight; không xóa nền vì reference nhân sự plain.
6. Quy tắc Không và transaction đang có giữ nguyên, không đổi dữ liệu/mapping; Thành ủy bị bất hoạt khi cấp trìnhKhông kể cả có grant progressParty. Không dùng UI work để chạy migration.
7. Hover/focus lift 3px/outline/shadow180ms chỉ nút được tác động; không nâng cả cụm/tràncắtshadow; reduced-motion/print đúng.
8. Test List+popup ở1440/900/390: 2/3tracks, mixed rights, guest/admin deny/all grants, cấp trìnhKhông, longlabel/status, narrow5width configs; so rects x/width/alignment và computedstyle với reference nhân sự trên cùngruntime.
9. Thử ít nhất hai bộ5widths khác nhau; reload/persist regression qua QA model hiện có hoặc Emulator phù hợp; không đánh đồng demoRAM với persistencebackend. Thay UI không được làm mất 5 inputs/config đãPASS.
10. npm run typecheck/unitliênquan/build:compact:qa và realbrowser PASS; open/chọn/keyboard/Escape/clickngoài/scrollresize; L04 reference/L01/filter/settings không đổi.

## Thực hiện liên tục
Khảo sát baselineCSS/rects -> checkpoint sớm -> sửa scope riêng -> own tests -> sửa lỗi -> kiểm lại -> commit/push code và checkpoint.
Worker hoàn chỉnh trên baseline, không cần CONTENT/commander tạo helper trước. Nếu thật sự cần DOM change ở CompactGroupedValue thì ghi patch/tái hiện cho commander tích hợp, không sửa file worker khác; làm hết phần độc lập.
DONE chỉ khi đủ code SHA/tested SHA, commands/results, run/artifact/ảnh/measurements và không còn tiêu chí trong phạm vi. Không kết thúc chỉ vì cócommit/CIđangchạy. Không tự publish/merge.

## COMMANDER review addendum — 07/11/2026 (source of truth for remaining STAGES acceptance)
Review of [STAGES CI #42267219205](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205) confirms **PASS** on code SHA `8c0d9fbc7284493dcb31018aa117595362b61119`: typecheck, 15 unit, build, 32 real browser scenarios, 6 saved-width editor scenarios. [Artifact 13527872811](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205/artifacts/13527872811) exists. **Preserve all PASS evidence, do not rewrite/re-run unchanged cases unnecessarily.**

Only outstanding acceptance cases reported by own STAGES handoff, assigned **owner STAGES** on its branch:
1. **Repro: `Không` live browser case**, not just server rendered unit markup. In an actual mounted `ItemList`/popup with `partyLevel=Không` and an independent `progressParty` grant, assert progressParty does not open editor; still render Build/Council correctly. Screenshot+DOM state+rects for 1440/900/390 or documented narrow viewport, no production data. **Accept:** no button/caret/false editable on progressParty despite grant; existing business mapping unchanged.
2. **Repro: custom palette/highlight**, fixture data/style for an editable colored status and readonly separately tinted member. Hover/focus/open, compare computed `backgroundColor`/foreground to normal value; compare unaffected L04 reference. **Accept:** background and semantic text remain unchanged across states; readonly retains member tint without false button.
3. **Repro: baseline before/after captures** for same fixture and viewport, since current worker artifact is AFTER-only. Snapshot actual baseline source `e095205c...` in isolated worktree with identical fixture/viewport; keep paired screenshots+rects/computed styles. **Accept:** differences are limited to L03 allowed picker skin, widths/colors maintained.

After these only, run exact new SHA CI using existing worker workflow and record final code/tested SHA, URL, artifact ID, enumerated evidence in `handoffs/STAGES.md`; then update status DONE if no gaps. Do **not** touch L04/shared picker/backend/width model, do not merge main or deploy. If one case is infeasible, document precise blocker, attempted steps, and whether COMMANDER integrated acceptance can supply equivalent proof; never call untested PASS.
