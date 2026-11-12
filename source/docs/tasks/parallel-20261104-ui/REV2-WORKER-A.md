# Gemini worker A — tiếp tục L01 và Tiến độ 3 khâu

Bạn là **chat A đang tiếp tục nhiệm vụ mới**, không phải worker bắt đầu lại. Repo `cavoixanh638/HopHDND-WebApp`; nhánh sở hữu `ui/20261104-table-layout`. Đọc [yêu cầu mới](REV2-REQUIREMENTS.md), [quy ước đợt trước](README.md), [checkpoint A trên nhánh A](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-table-layout/source/docs/tasks/parallel-20261104-ui/checkpoints/A.md) và HEAD hiện tại trước khi sửa. Bằng chứng cũ của A đã PASS; nhiệm vụ mới chỉ là delta L01/L03. Không reset về baseline hoặc làm lại phần đã PASS. B không nhận việc mới.

## Sản phẩm bạn phải bàn giao

1. Trong `source/src/features/items/CompactGroupedValue.tsx` và `source/src/features/items/item-frame.css`, sửa UI L01: chỉ đọc giữ `(Sở - Loại VB)`; khi một hoặc cả hai field sửa được, hai field ở cùng hàng ngang, không ngoặc/dấu nối; Loại VB hover/focus/open giống dropdown Sở. Giữ logic field-level permissions, dữ liệu gốc, màu và highlight.
2. Thay UI L03 đang dùng khung dòng/ngoặc/caret rail bằng dropdown theo UI `Lãnh đạo/Phòng/Chuyên viên`. Khi `partyLevel` sửa được: 3 track cho cả ba dòng, dropdown cấp trình chỉ ở track 2 dòng Thành ủy, ba trạng thái ở track 3; khi `partyLevel` chỉ đọc: 2 track, cấp trình data-driven trong ngoặc cạnh Thành ủy, trạng thái ở track 2. Các trạng thái chỉ đọc không có nút giả. Dùng nhãn chính xác trong [yêu cầu mới](REV2-REQUIREMENTS.md). Màu trạng thái nằm trên nền và chữ ô dropdown. Ba dropdown tiến độ cùng trục và cùng kích thước; không đổi độ rộng cột bảng đã lưu.
3. Mở rộng test A đúng phần bị ảnh hưởng tại `source/tests/ui-20261104-worker-a.test.tsx` và browser script A nếu cần. Kiểm list/popup, admin/guest, quyền hỗn hợp, `Không phải trình`, QPPL/HC/BC, keyboard/Escape, lease, palette, 1440/900/390, cột hẹp. Đo left/width/height các dropdown và lưu ảnh/số đo. Chạy typecheck, unit và Chrome/CI trên **SHA chứa mã cuối**. Không ghi PASS cho SHA khác.

## Ranh giới và checkpoint

- Sở hữu component/CSS và test A liên quan. Nếu bắt buộc sửa file chung ngoài phạm vi, ghi đề nghị cho tổng chỉ huy trước; không sửa App/admin controls/B, tracker hay backend.
- Ngay khi bắt đầu, cập nhật [checkpoint A](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-table-layout/source/docs/tasks/parallel-20261104-ui/checkpoints/A.md) từ DONE cũ sang `IN_PROGRESS — REV2`, ghi HEAD và việc mới. Push checkpoint sau bản sửa, test, lỗi/chặn và trước khi dừng. Nếu hit limit, chat thay thế tiếp tục cùng nhánh từ checkpoint; không tạo writer thứ hai.
- Bàn giao cho tổng chỉ huy: old A integrated HEAD `9a78244ee09df782a9835fffae181249e8fc1371`, **danh sách commit mới sau mốc đó**, tested code SHA, CI/run, ảnh/số đo, diff và tiêu chí chưa đạt. Chỉ ghi DONE REV2 khi mọi tiêu chí A đạt; không merge `main` hay deploy.
- Đợt này **không cần lịch nền** theo quyết định mới của người dùng; tự checkpoint trong lúc làm vẫn bắt buộc.

