# Chat B — làm rõ điều khiển admin

**Nhánh riêng:** `ui/20261104-admin-controls`. **Code baseline:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Đọc [quy ước chung](README.md), [ảnh](reference-admin-controls.png) và [checkpoint B](checkpoints/B.md) trước khi sửa. Bạn là writer duy nhất của các file nguồn B trong README. Không sửa file A, tracker hay backend.

## Kết quả phải giao

Ảnh cho thấy tiêu đề `Danh sách các ND trình HĐND` ở trên, còn `Tên danh sách và thẻ tổng hợp` là một mục **đang thu gọn**. Mã hiện đã có `listTitle` và `summaryCards` trong cấu hình, nên trước hết xác minh quyền admin thực và đường lưu; xử lý khả năng người dùng **không thấy/lối vào khó nhận ra** thay vì tạo thêm cấu hình song song.

1. Cho admin lối vào hiển thị rõ cạnh tiêu đề hoặc ba thẻ: `Đổi tên danh sách` và `Hiện/ẩn C01–C03`. Người dùng không cần đoán phải mở một `details` nhỏ. Giữ bố cục gọn ở 1440/900/390px; guest không thấy điều khiển admin. Tên mới cập nhật tiêu đề trong ảnh và tab điều hướng; sau lưu/reload, người xem khác nhận cấu hình chung. Nhập sai/để rỗng phải báo lỗi và giữ giá trị đã xác nhận.
2. C01, C02, C03 bật/tắt **riêng từng thẻ tổng hợp của Danh sách**, có nhãn rõ cả mã và tên; C00 tổng số luôn có. Tắt thẻ không xóa dữ liệu, không thay công thức báo cáo/bộ lọc và không làm các thẻ còn lại lệch khung. Nếu mã hiện tại chỉ có control trong `details`, có thể chuyển/chia lối vào để dễ tìm nhưng dùng lại state, CAS/merge/rollback đang có.
3. Xác minh đường thật trong `App` cùng bản demo RAM. Không biến quyền admin mô phỏng thành quyền thật; không ghi localStorage thay cho cấu hình dùng chung của App. Giữ sort chỉ admin và thứ tự NQ trước BC đã PASS.

## Nghiệm thu độc lập

- Admin vào List nhìn thấy ngay lối sửa tên và hiện/ẩn C01–C03; dùng chuột và bàn phím được. Đổi tên, reload, vào guest và quay lại admin: tiêu đề/tab vẫn đúng; mất mạng/denied/CAS conflict không báo đã lưu giả.
- Tắt lần lượt C01, C02, C03, bật lại từng thẻ; C00, kết quả lọc và các bảng báo cáo vẫn đúng. Kiểm 1440/900/390px và không có điều khiển tương ứng ở guest. Đọc rõ tên/label khi phóng chữ.
- Typecheck, unit/config/CAS và Chrome App hoặc Emulator trên **code SHA cuối**; lưu screenshot admin/guest và log/run URL vào `evidence/B/`. Không chạy lại test đã PASS nếu không liên quan. Nếu chỉ có CI, dùng run đúng SHA và không suy diễn browser PASS từ unit.

## Bàn giao

Cập nhật `checkpoints/B.md` rồi push ở mốc khảo sát, bản sửa, test/CI, lỗi/chặn và trước khi kết thúc. Gửi tổng chỉ huy SHA, diff, test/run URL, screenshot và tiêu chí còn thiếu. Không merge/deploy. Chỉ ghi DONE khi đủ bằng chứng, nếu thiếu gate thì TEST_PENDING.
