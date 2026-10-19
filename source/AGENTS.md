# Hướng dẫn làm việc

- Người dùng là chỉ huy; parent agent điều phối tổng thể, Luna xử lý phần việc đơn giản được giao. Không tự mở rộng phạm vi hoặc diễn giải kế hoạch thành quyền ghi dữ liệu sản xuất.
- Đọc theo nhiệm vụ: bắt đầu với `docs/CURRENT_STATE.md` nếu cần tình trạng; tra `docs/FEATURES.md` theo Fxx; đọc `docs/SYSTEM.md` khi đổi nghiệp vụ; đọc `docs/ARCHITECTURE.md`/`docs/API.md` khi đổi luồng dữ liệu hoặc API; dùng `docs/REPO_MAP.md` để tìm mã. Chỉ đọc sâu phần liên quan.
- Sửa nguồn chuẩn và tài liệu liên quan; không sửa artifact build thay cho nguồn. Giữ tương thích mã/format legacy khi yêu cầu; không tự ánh xạ giá trị mơ hồ.
- Thực hiện local fixes trong phạm vi được giao mà không hỏi lại permission. Tài liệu kế hoạch chỉ mô tả dự kiến, không cấp quyền đọc/ghi dữ liệu thật, triển khai hoặc phát hành. Dùng dữ liệu giả khi cần.
- Không đánh dấu chức năng hoàn tất nếu chưa có bằng chứng; CURRENT_STATE là nơi ghi kết quả đã kiểm chứng, FEATURES là đặc tả. Cập nhật đúng tài liệu và kiểm tra phù hợp với thay đổi.
- Tránh nhân bản tài liệu: `docs/README.md` là chỉ mục và nơi chốt nguồn chuẩn; `docs/VAN_HANH.md` quản lý phát hành/rollback/backup/sự cố; `docs/TU_DIEN_DU_LIEU.md` ánh xạ A–P/ID/kiểu; `docs/CAI_DAT_VA_CHAY.md` chỉ hướng dẫn môi trường build local. Chỉ tách tài liệu mới khi trách nhiệm thật sự khác và sửa đồng thời chỉ mục, liên kết. Không sửa cấu hình Firebase production hoặc nội dung Excel trong nhiệm vụ tài liệu.

## Quy tắc popup Bảng chi tiết và so sánh chức năng với Danh sách — 19/10/2026

- Khi sửa popup từ ô số, đọc [`docs/REPORT_DETAIL_PARITY_2026-10-19.md`](docs/REPORT_DETAIL_PARITY_2026-10-19.md), [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) và [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). **Không xóa tay nắm kéo cột, không trở lại `width:max-content/min-width:100%`, không giả định nhập px bằng việc gán `<col>` là đủ.** `table.width` phải bằng tổng cột và phải có Chrome CDP kéo chuột thật, đóng/mở còn width.
- Chỉ popup bật `ColumnResizeHandle.windowDragFallback`, không làm global window pointermove thường trực. Dùng lại ColumnHeader/ColumnFilterCell/CellPicker/ContentEditor của bảng Danh sách, không xây lại đường kiểm quyền. Giữ layout/mẫu/màu popup riêng theo source/preview; các cột giả Excel, 20 custom columns/permissions/Excel writer là hạng mục quản trị riêng, không lẫn dữ liệu nguồn.
- Code/Tài liệu commit chỉ đưa vào preview sau exact CI success + artifact hash kiểm, không đụng production root/Excel/Firebase hoặc merge PR #3.

## Quy tắc giữ hiệu năng bảng báo cáo — quyết định đã đo 19/10/2026

- Khi sửa `ReportTable`/hover F06 phải đọc [`docs/SYSTEM.md`](docs/SYSTEM.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/FEATURES.md`](docs/FEATURES.md) và [A/B Chrome](docs/TOOLTIP_PERFORMANCE_AB_2026-10-19.md). **Không tự đưa lại `body:has(...:hover)` kết hợp CSS Anchor Positioning** cho tooltip báo cáo, không tạo tooltip/handler riêng cho mỗi ô. Việc thay kiến trúc chỉ được quyết định sau khi có phép đo Chrome phù hợp và kiểm đủ click/focus/in/5 báo cáo.
- Chỉ ô có số dương đang hover được tô nền xanh ngọc .14 và `outline:2px solid #08777B` (focus 3px); không tô cả hàng, không border làm xê dịch bảng, blur/animation/shadow đắt hoặc thay màu ngữ nghĩa. Tooltip `Click để xem chi tiết` là **một host chung**, chỉ cập nhật vị trí khi đổi ô, không chạy trên mỗi `pointermove`, không đọc geometry ở pointer path.
- Với thay đổi UI, phân biệt **mã đã commit**, **CI đã PASS**, **preview đã deploy**, **production đã đổi** và **người dùng đã nghiệm thu**. Không gọi benchmark 300 sự kiện synthetic là thời gian hiển thị thực tế. Giữ artifact bất biến theo exact SHA, chỉ publish preview riêng khi được giao; không merge PR #3 hoặc ghi Excel/Firebase/root production khi chưa được yêu cầu. Bằng chứng hiện tại tại [`docs/KIEM_THU_VA_NGHIEM_THU.md`](docs/KIEM_THU_VA_NGHIEM_THU.md) và [`docs/VAN_HANH.md`](docs/VAN_HANH.md).

## Quy tắc đồng bộ danh sách/popup — 20/10/2026

- Màu từ khóa theo từng ô lấy chung từ `ItemLayout.cellHighlights`, không trộn với màu hàng của mẫu cá nhân; validate mã HEX và giới hạn số quy tắc, không sửa dữ liệu nguồn.
- Không khôi phục sort ở chế độ xem/khách; chỉ edit có `onSort`. Marker `editable-cell` phải gắn với đúng permission hiện hành, không có cho ô bị khóa hoặc guest popup.
- Căn bảng theo `data-col-key`, không dùng `:nth-child` do thứ tự cột tùy chỉnh; riêng `content`/`note` vẫn căn trái-trên.
- `CellHistoryAction` dùng icon nhỏ/tooltip và chỉ truy vấn audit sau thao tác bấm; hiển thị **lần lưu gần nhất của chính field**, không tự xác nhận có lịch sử chỉ vì có biểu tượng; không cấp hành động cho guest ẩn danh.
- Giữ riêng các mức: source commit/CI PASS/preview deployed/production deployed/khách nghiệm thu. Quy trình preview chỉ dùng artifact bất biến kiểm exact SHA và digest, không tự ghi dữ liệu thật.
