# Gemini UI — picker và căn L03

Nhánh `ui/20261105-picker-layout`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Đọc [hợp đồng chung](README.md), checkpoint `checkpoints/UI.md`, HEAD/dirty tree. Bạn là writer duy nhất của nhánh/checkpoint này; bắt đầu ngay, không đợi worker khác.

**Sở hữu:** `source/src/features/items/CompactGroupedValue.tsx`, `source/src/features/items/item-frame.css`, picker component/style trực tiếp dùng bởi file này nếu cần, test UI và browser script riêng. Không sửa `ItemList.tsx`, `item-preferences.ts`, registry reference-code, domain/service.

1. Dùng ô Lãnh đạo UBND làm mẫu thực tế, sao chép **nguyên khối UI/control behavior** sang picker Sở trình, Loại Văn bản, Cấp trình TU và cả ba trạng thái tiến độ. Hợp nhất component/style để không lệch hover/focus/caret/height/hit area; giữ màu nền/chữ theo status. Read-only không tạo affordance giả.
2. L03 cấp trình editable là ba track, readonly là hai track. Trong ảnh readonly, trạng thái đang kéo rất rộng; bỏ giãn `1fr`, compact nội dung. Căn thẳng từng nhãn/giá trị theo chiều dọc giữa các hàng trong cả hai mode, kể cả wrap. Cấp trình picker đủ 5 ký tự + caret/padding; ba status picker rộng bằng nhau, vừa nhãn dài nhất + caret/padding. Không tạo control resize track; WIDTH worker xử lý width toàn cụm/cột vật lý. Cho phép container nhận width từ layout setting nhưng grid nội bộ không stretch.
3. Thêm `data-ui-reference-part` ổn định cho các subfield L01/L03 và Ghi chú trong vùng file sở hữu; trao contract trong checkpoint. UI đọc giá trị `Không`, `TTTU`, `BTV`, `BCH` theo domain contract chung; khi `Không`, trạng thái hiển thị `Không phải trình` nhưng không có picker sửa. Trường hợp không có quyền cấp trình, nhãn hiện `Thành ủy (BCH/BTV/TTTU)` và status ở track thứ hai; không lặp cấp `Không`.
4. Test pointer/keyboard/Escape, list/popup, 1440/900/390 px, trạng thái dài, quyền hỗn hợp; screenshot và rects chứng minh alignment/width. Giữ test baseline vẫn PASS.

Push checkpoint sau khảo sát, commit ý nghĩa, test/lỗi và trước dừng. Ghi code/test SHA, run/artifact, PASS/FAIL/NOT RUN và việc còn thiếu. Không merge/deploy/ghi Firebase thật.
