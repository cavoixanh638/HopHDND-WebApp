# Yêu cầu tiếp tục UI L01 và Tiến độ 3 khâu — 04/11/2026

## Căn cứ và phạm vi

- Repo: `cavoixanh638/HopHDND-WebApp`. Bản tích hợp nguồn/test đã PASS 9/9 workflow áp dụng tại code SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`; [tracker đợt trước](TRACKER.md) và [checkpoint tổng chỉ huy](checkpoints/COMMANDER.md) là bằng chứng. Các commit tài liệu sau đó không tự đổi tested code SHA.
- Worker A đã DONE đợt trước trên `ui/20261104-table-layout`, nhưng **yêu cầu UI mới dưới đây mở lại phạm vi A**. Worker B trên `ui/20261104-admin-controls` vẫn DONE; không sửa lại admin controls, sort, tên danh sách, C01–C03 hay các phần khác đã PASS.
- Chỉ hai chat Gemini tiếp tục: worker A sửa L01/L03; tổng chỉ huy cập nhật tracker, nghiệm thu, tích hợp và phát hành lại Site demo riêng tư nếu có công cụ/quyền. Không tạo chat Codex. Người dùng nói đợt này đơn giản, **không lập lịch nền**. Mỗi chat vẫn chủ động commit/push checkpoint khi làm, sau sửa/test/lỗi/chặn và trước khi dừng để chịu được hit limit.

## Quyết định UI của người dùng

### L01 — Nội dung trình, Sở, Loại văn bản

1. Khi cả Sở và Loại văn bản **đều chỉ đọc**, giữ cách hiển thị đang được người dùng chấp nhận: `(Sở Nông nghiệp và Môi trường - HC)`; không tạo ngoặc/dấu nối thừa nếu thiếu một giá trị.
2. Nếu **ít nhất một** trong hai field được sửa, dòng metadata ngay dưới Nội dung trình gồm hai ô độc lập **cùng một dòng và gióng thẳng hàng ngang**; không có cặp ngoặc `()` bao cả dòng và không có dấu `-` giữa hai ô. Field chỉ đọc còn lại vẫn hiện, không thành dropdown giả. Giữ field-level permission, highlight, lease và lưu giá trị như trước.
3. Khi hover/focus/mở dropdown **Loại văn bản**, hình thức và trạng thái tương tác phải giống **Sở** để chọn dropdown: vùng nhấn, đường viền/nền/outline, caret và trạng thái mở; vẫn giữ màu loại văn bản nếu màu này là thông tin có ý nghĩa. Không sửa logic danh mục hay quyền chỉ để đạt bề ngoài.

### Cột Tiến độ 3 khâu

1. Khi **cấp trình Thành ủy sửa được**, toàn bộ cụm ba dòng dùng **ba cột nhỏ chung trục**: cột 1 nhãn `Thành ủy`, `Trình Xây dựng NQ`, `Trình ban hành NQ`; cột 2 chỉ dòng đầu là dropdown cấp trình Thành ủy, hai dòng sau giữ track trống; cột 3 là ba giá trị tiến độ. Dropdown cấp trình và các dropdown tiến độ dùng UI chọn của cột `Lãnh đạo/Phòng/Chuyên viên`, không còn ngoặc, dấu nối, khung ngoài/caret rail hoặc kiểu dropdown đặc thù hiện tại. Dropdown tiến độ vẫn mang **màu tương ứng trên nền và chữ chính ô chọn**, kể cả palette tùy chỉnh.
2. Khi **cấp trình Thành ủy chỉ đọc**, toàn bộ cụm dùng **hai cột nhỏ**: cột 1 nhãn `Thành ủy (giá trị cấp trình)` cùng hai nhãn khâu còn lại; cột 2 là các trạng thái. Giá trị ví dụ có thể là `BCH` hoặc `BTV TU`: dùng dữ liệu thực, không hardcode. Nếu cấp trình là `Không phải trình`, ẩn riêng giá trị cấp trình như quy tắc đã PASS, còn trạng thái `Không phải trình` vẫn hiện. Các trạng thái có quyền sửa vẫn dùng dropdown mới; trạng thái chỉ đọc vẫn là chữ, không có affordance sửa giả.
3. Ở trường hợp quyền hỗn hợp, chọn bố cục **theo quyền sửa của cấp trình cho toàn bộ cụm**: cấp trình sửa được thì 3 cột; cấp trình chỉ đọc thì 2 cột, dù một hoặc vài trạng thái sửa được. Các ô dropdown nằm trong cùng cột phải có cùng vị trí ngang, chiều rộng và chiều cao; ba giá trị tiến độ gióng cùng trục tại 1440/900/390 px và khi cột bảng đã được kéo hẹp. Không ép đổi độ rộng cột do người dùng đã lưu; nếu cần, cuộn bên trong ô gộp.

## Điều kiện nghiệm thu

- A kiểm Danh sách và popup, admin/guest, cả bốn tổ hợp quyền Sở/Loại, cấp trình sửa/chỉ đọc và tiến độ sửa/chỉ đọc hỗn hợp, dữ liệu dài/thiếu, `Không phải trình`, hover/focus/keyboard/Escape/lease, màu thường và palette tùy chỉnh, viewport 1440/900/390 và cột hẹp. Đo các `getBoundingClientRect()` của ba ô tiến độ: cùng left/width/height trong từng cụm khi là dropdown; screenshot thật trước/sau và test đúng code SHA.
- Tổng chỉ huy chỉ nhận A khi checkpoint có commit, tested SHA, unit/Chrome PASS và ảnh/số đo. Tích hợp **chỉ delta mới của A** lên nhánh coordination hiện tại để giữ B PASS; chạy typecheck, unit, browser/Emulator và gate liên quan trên SHA tích hợp cuối; dựng lại gói demo và ghi hash. Cập nhật Site demo riêng tư hiện có, xác minh deployment/URL/quyền truy cập nếu công cụ hỗ trợ. Nếu Site không thể cập nhật, giữ `SITE_PENDING` và ghi blocker thật; không nhận vơ DONE.
- Không merge `main`, không deploy Firebase production, không thay Rules/dữ liệu thật/Excel schema. Không mở rộng tính năng ngoài các yêu cầu trên.

