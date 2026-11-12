# Chat A — Nội dung trình và L03

**Nhánh riêng:** `ui/20261104-table-layout`. **Code baseline:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Đọc [quy ước chung](README.md) và [checkpoint A](checkpoints/A.md) trước khi sửa. Bạn là writer duy nhất của các file nguồn A trong README. Không sửa file B, tracker hay backend.

## Kết quả phải giao

1. Cột **Nội dung trình**: dòng metadata sau nội dung có dạng `(Sở Nông nghiệp và Môi trường - HC)`; không đổi giá trị nguồn. Dùng đúng giá trị Sở/Loại VB của từng hồ sơ, không hard-code. Nếu chỉ một trường có giá trị, không in dấu nối hoặc ngoặc rỗng. Giữ từng trường là điều khiển độc lập khi có quyền sửa và highlight độc lập; ở chế độ chỉ đọc thì hiện nhẹ, đủ đọc, không tạo hai thẻ nổi làm rối bảng.
2. **L03**: ba hàng Thành ủy, Xây dựng NQ, Ban hành NQ dễ phân biệt và các ô trạng thái bắt đầu cùng một tọa độ ngang trong cùng record. Khi cấp trình Thành ủy sửa được, nhãn hiển thị `Thành ủy`, cấp trình là dropdown riêng có giá trị trong ngoặc như `(BTV TU ▾)`, trạng thái là dropdown khác; bố cục nhìn thành ba cột thẳng hàng. Khi cấp trình chỉ đọc, hiển thị liền `Thành ủy (BTV TU)` và trạng thái, nhìn thành hai cột nhưng trạng thái vẫn thẳng hàng với hai hàng kia. Nếu cấp trình chỉ đọc có giá trị `Không phải trình`, bỏ phần cấp trình, chỉ hiện `Thành ủy` và ô trạng thái `Không phải trình`.
3. Dropdown trong **Tiến độ 3 khâu** dùng ngôn ngữ giao diện đang có ở Lãnh đạo/Phòng/CV: chiều cao, viền, nền, mũi tên, hover/focus, vùng bấm và bảng chọn nhất quán. Cấp trình và tiến độ có vùng bấm/ARIA riêng; không mở lẫn nhau, vẫn dùng quyền/lease/commit hiện hành. Không tạo dropdown giả cho ô chỉ đọc.

## Nghiệm thu độc lập

- Kiểm tra giá trị ngắn/dài, QPPL/HC/BC, thiếu Sở hoặc Loại VB; metadata sau nội dung ở list và popup, desktop/900px/390px, không tràn cột hay tràn trang.
- Kiểm tra L03 đủ 4 ca: cấp trình có quyền sửa, không có quyền sửa, giá trị `Không phải trình`, và quyền sửa cấp trình khác quyền sửa trạng thái. Đo tọa độ trái của ba trạng thái (sai lệch tối đa 2 CSS px ở cùng viewport); mở chọn bằng chuột và phím, Escape đóng đúng, focus rõ, không tác động ô bên cạnh. Kiểm trên list và popup, desktop/900px/390px, kể cả cột hẹp có cuộn nội bộ.
- Chạy typecheck, unit liên quan, build QA và Chrome trên **code SHA cuối**. Giữ các gate về màu trạng thái, highlight riêng từng field, ID 52px, guest/read-only và HC/BC `Không phải trình`; sửa test cũ chỉ khi oracle thật sự lỗi thời, giữ ý nghĩa kiểm tra. Lưu screenshot/số đo trước và sau cùng log ngắn vào `evidence/A/`.

## Bàn giao

Cập nhật `checkpoints/A.md` rồi push tại các mốc khảo sát, bản sửa, test/CI, lỗi/chặn và trước khi kết thúc. Gửi tổng chỉ huy commit SHA, đường dẫn diff, test/run URL, screenshot và tiêu chí còn thiếu. Không merge/deploy. Chỉ ghi DONE khi mọi mục trên đạt; nếu thiếu Chrome đúng SHA, ghi TEST_PENDING rõ ràng và đề nghị tổng chỉ huy chạy gate tích hợp.
