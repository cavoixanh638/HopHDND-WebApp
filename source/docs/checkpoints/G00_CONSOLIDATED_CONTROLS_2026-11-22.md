# G00 — Tinh gọn công cụ Danh sách và Quản lý cột (22/11/2026)

## Phạm vi tích lũy từ các yêu cầu của người dùng
1. Bỏ nút `Tùy chọn` dư thừa ở Danh sách. Phạm vi cột tìm kiếm chỉ còn ở `Cột tìm`, không lặp bảng lớn trong tùy chọn hoặc `Lọc nâng cao`.
2. Đổi `Lọc khác` thành `Lọc nâng cao`; giữ các bộ lọc nghiệp vụ, không nhúng bộ chọn trường tìm kiếm trùng lặp.
3. Đưa nút `Dán từ Excel` ra cạnh thanh lọc; vô hiệu khi đang chỉnh giao diện, giữ popup xem trước/duyệt.
4. `Chỉnh giao diện` sở hữu thẻ tổng hợp C01–C03, chỉnh 5 độ rộng L03, tùy chọn người phụ trách/cột gộp, preset chuẩn và bảng chính có `Lưu bố cục / Hủy thay đổi`. Các thao tác này sửa bản nháp, không ghi Firebase trước Lưu.
5. `Quản lý cột nâng cao`: tên cột dùng nút bút hiện khi hover/focus, Enter xác nhận và Esc hủy; kiểu nhập là dropdown ngay trên dòng; quyền chung của cả cột vẫn checkbox cạnh đó; nút `Sửa` đổi thành `Nâng cao`, giữ danh sách chọn, liên kết chuyên viên–phòng, di chuyển/xóa cột.
6. Quan trọng: thay đổi checkbox quyền cột **không xóa** quyền riêng theo dòng và ô. Chỉ xóa ngoại lệ khi quản trị tích chọn ô xác nhận rõ ràng; quyền riêng từng dòng/ô vẫn nằm trong tab Phân quyền.

## Hàng rào an toàn
- Không thay Firebase Rules, nguồn dữ liệu, dữ liệu sản xuất hoặc quyền người dùng ngoài thao tác quản trị chủ động.
- Tất cả thiết lập nâng cao vẫn yêu cầu bấm `Lưu thay đổi`; đổi tên/kiểu không tự ghi Firebase.
- Kiểu nhập khóa đối với cột nguồn không cho phép chuyển đổi; ID/STT, nội dung/ghi chú có quy tắc riêng.
- Quy trình tự phát hành hiện tại vẫn phân loại thay đổi trong `ItemColumnPanel.tsx` là ngoài allowlist. Không bypass hoặc coi PR merge là website đã cập nhật.

## Kiểm thử và nghiệm thu
- Kiểm tra source contracts + permission preservation unit regression.
- Build TypeScript, Vitest, Firebase Emulator, Chromium end-to-end.
- Trong Chrome, xác nhận chỉ một Cột tìm, không còn nút Tùy chọn, Lọc nâng cao đủ trường, Dán Excel riêng, Chỉnh giao diện hiện thẻ/L03 và Lưu/Hủy.
- Tab Quản lý cột: hover tên, Enter/Esc, dropdown kiểu với cột nguồn cố định, checkbox Cho sửa, Nâng cao quản lý danh sách/di chuyển/xóa, giữ quyền riêng theo dòng/ô.
- Chỉ đánh dấu `DEPLOYED` sau khi Actions Pages và version nguồn khớp; không tự bypass gate khi còn HOLD.

Rollback: revert commit sau khi được rà soát; không động đến Firebase Rules.
