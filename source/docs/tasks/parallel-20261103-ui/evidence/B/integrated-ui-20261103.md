# B — kiểm chứng giao diện trên bản tích hợp

Code SHA: `87b4c8bdf6f9a3025ac00e3f8e342e2345ffa43b`. Trang cục bộ: bản `compact-qa` vừa dựng, dữ liệu giả trong RAM; không Firebase production.

- Admin mô phỏng: 6 nút `.column-sort-button`; guest sau đăng xuất: 0 nút và không có thao tác sort trong bảng.
- Bấm sort ID ở admin: 18 ID NQ ở đầu, tiếp theo 9 ID BC; BC đầu `BC03`, BC cuối `BC27`. Unit sort tự nhiên tăng/giảm và stable ordering đã nằm trong 846 unit PASS.
- Đặt tên `Danh sách kiểm thử HĐND` rồi lưu: heading đổi và tên còn hiển thị sau chuyển sang guest. Tab điều hướng cũng dùng tên cấu hình thay vì chuỗi cố định sau bản sửa điều phối.
- Bỏ chọn `Hiện C01`: thẻ Thành ủy có `display:none` và thuộc tính `data-hide-party=true`; C02/C03 còn hiển thị, C00 tổng số vẫn có. Chuyển guest, tên và thẻ ẩn vẫn giữ trong RAM.
- [Verify-source CI PASS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601947296) trên đúng code SHA gồm Chrome browser smoke với Firebase Emulator; [workflow hai tab admin](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601947284) và [permissions App](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601947235) PASS.

Giới hạn: kiểm chứng thủ công ở demo cục bộ không thay thế đăng nhập owner của Site riêng tư; URL private yêu cầu ChatGPT sign-in. Các đường lưu thật, quyền và xung đột được kiểm trong CI Emulator.
