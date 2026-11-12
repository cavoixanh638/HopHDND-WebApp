# Gửi vào 3 chat Gemini độc lập

Có thể gửi đồng thời. Không mở chat/agent Codex. Đọc mỗi link sau để nhận nhiệm vụ tự đủ ngữ cảnh; không cần kể lại hội thoại. Mỗi chat tự cập nhật checkpoint trên nhánh mình. Không lịch nền cho đợt này.

## Chat 1 — Tổng chỉ huy

> Bạn là Gemini tổng chỉ huy. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261106-controls-command/source/docs/tasks/parallel-20261106-ui-controls/COMMANDER.md và README/TRACKER/checkpoint được dẫn ở đó. Chỉ làm nhánh ui/20261106-controls-command, baseline 8a201c1bf48c7916e4d0af9e1c0ca60cd6737632. Bắt đầu ngay cùng hai worker độc lập; theo dõi GitHub, giao thiếu sót đúng owner, nghiệm thu/tích hợp/test đúng SHA, dựng gói và cập nhật demo public hiện có. Nếu thiếu Sites API, chuẩn bị handoff Codex cụ thể và giữ DEMO_PENDING; không báo DONE khi demo chưa cập nhật. Không merge main/Firebase production/live migration. Lưu checkpoint sớm và tiếp tục đến đủ tiêu chí.

## Chat 2 — PICKER

> Bạn là Gemini worker PICKER độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261106-picker-restore/source/docs/tasks/parallel-20261106-ui-controls/WORKER-PICKER.md + README/checkpoint trên chính nhánh đó. Baseline 8a201c1bf48c7916e4d0af9e1c0ca60cd6737632. Khôi phục UI 4 ô Lãnh đạo UBND/VP/Phòng/CV về trước unified, reference ab8629c7575debd494c908c14bde9967a575a82a; thay caret của mọi dropdown sửa dữ liệu trong list/popup bằng tam giác nhỏ như nút Tùy chọn người phụ trách. Không đổi bộ lọc/cài đặt, không làm geometry L03. Tự khảo sát → code → test/browser → sửa lỗi → bàn giao SHA/ảnh/bằng chứng. Không đợi TRACKS, không merge/deploy; push checkpoint thường xuyên.

## Chat 3 — TRACKS

> Bạn là Gemini worker TRACKS độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261106-l03-tracks/source/docs/tasks/parallel-20261106-ui-controls/WORKER-TRACKS.md + README/checkpoint trên chính nhánh đó. Baseline 8a201c1bf48c7916e4d0af9e1c0ca60cd6737632. Thay 2 input toàn cụm L03 bằng 5 input độ rộng cột nhỏ độc lập theo contract; tự tính tổng, nối config/migration fallback/merge/CAS/admin/guest/list/popup/full demo. Không sửa skin/caret/item-frame.css/CellPicker; triển khai geometry bằng module/style riêng. Tự khảo sát → code → test/browser → sửa lỗi → bàn giao bằng chứng đúng SHA. Không đợi PICKER, không merge/deploy; push checkpoint thường xuyên.
