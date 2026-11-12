# Gemini CONTENT — UI Sở trình và Loại văn bản
Bạn là worker độc lập end-to-end. Không tạo chat/agent Codex, không làm tổng chỉ huy.
Repo cavoixanh638/HopHDND-WebApp; branch **ui/20261107-picker-parity-content** đã tạo. Reference source **e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa**.
Đọc [README](README.md) (spec bắt buộc) + [checkpoint của bạn](handoffs/CONTENT.md). Tiếp tục HEAD hiện tại, không reset/đợi worker khác.
Tổng chỉ huy: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/COMMANDER.md; tracker đọc tại https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/TRACKER.md.

## Đầu ra
Hai ô **Sở trình / Loại văn bản** trong cột Nội dung trình, ở List và popup, có geometry/hover/focus/caret như picker UBND/VP/Phòng/CV reference; giữ màu nền/màu nghiệp vụ/palette/highlight, cả readonly. Không sửa nút nội dung văn bản chính.

## Sở hữu
- Tạo source/src/features/items/picker-parity-content.css.
- source/src/features/items/CompactGroupedValue.tsx: thêm import CSS mới, chỉ nhánh contentDetails nếu markup thật sự cần. Không sửa partyTogether/teamTogether/helpers L03.
- Tạo source/tests/picker-parity-content*.test.ts* và source/scripts/picker-parity-content*.mjs theo quy ước repo; ảnh/measurements trong source/qa-results/picker-parity-content; workflow riêng prefix picker-parity-content nếu cần.
- Chỉ checkpoint handoffs/CONTENT.md trên nhánh mình. Không sửa tracker, common files hoặc checkpoint role khác.
- Không sửa CellPicker/app.css/item-frame.css/l03-track-widths.css/ItemList/ReportDetailGrid/backend/quyền/danh mục dữ liệu/width model.

## Tiêu chí bắt buộc
1. Cả hai editable: cùng dòng dưới nội dung, căn giữa ngang; không ngoặc/gạch; min-height 26,padding 4×7,font 11/550,line-height 1.35,radius 6,caret 5×3, gap 8; width vừa nội dung/max100%.
2. Mixed một editable một readonly: giữ chung dòng/giữa ngang; readonly font 13/400, không false caret/edit behavior; không ngoặc/gạch.
3. Cả hai readonly: giữ (Sở - Loại VB) và nền màu riêng mỗi giá trị nếu đang có; không nút/viền/shadow/lift. Không giữ vỏ nút disabled để giả readonly.
4. Hover/focus-visible mỗi ô sửa được lift 3px, blueoutline/shadow/180ms như reference; **không đổi nền target**, không tô cả TD. Reduced-motion/print đúng.
5. Empty writable vẫn có đường mở dropdown của riêng field; tên Sở dài/loạiQPPL/HC/BC, palette/highlight không làm vỡ layout hoặc biến đổi dữ liệu.
6. Popup/dropdown dùng CellPicker baseline nguyên hành vi và field permission; chỉ thay giao diện. L04 nhân sự/reference, L03, filters/settings/content editor không đổi.
7. Browser1440/900/390 trên full synthetic App, List+popup: admin cả2 edit/mixed/none; guest; normal/hover/keyboardfocus/open; measuredrects/computedstyle và ảnh trước/sau cùng fixtures. Đừng chỉ render story fixture riêng.
8. npm run typecheck, unit liên quan và build:compact:qa PASS; chọn/keyboard/Escape/clickngoài/scrollplacement thực hoạt động. Nếu chưa chạy giữ NOT RUN, tự dùng CI nếu có thể thay vì kết thúc sớm.

## Thực hiện liên tục
Khảo sát selectors baseline -> checkpoint sớm -> sửa scope riêng -> test -> sửa lỗi -> kiểm lại -> commit/push kết quả và checkpoint.
Tự tạo browser script assertion so UBND reference cùng page; kiểm bg trước/sau ở mọi trạng thái và sự bất hoạt readonly; không sửa reference cho test đạt.
Nếu thấy nối shared bất khả thi, ghi tái hiện/patch đề xuất cho commander, hoàn tất phần độc lập còn lại; không lấy workerSTAGES làm gate.
Kết thúc chỉ DONE khi đủ own SHA/code SHA/tested SHA, lệnh+PASS, run/artifact/ảnh/rects, danh sách file và không còn tiêu chí trong phạm vi. Ghi việc integration thuộc commander; không tự publish/merge.
