# Hướng dẫn làm việc

## Quy tắc popup, tooltip và dropdown từ 20/10/2026

- Khách popup chỉ có bộ lọc theo cột, không thêm nút resize, xem đủ cột, tìm kiếm chung hoặc điều hướng Danh sách. Chế độ chỉnh sửa/nút history/permission đều ẩn hoàn toàn; test Chrome và unit phải chặn tái phát.
- Tooltip số trong báo cáo không được che ô số đang trỏ. Một `getBoundingClientRect` khi pointer enters ô mới là ngoại lệ được kiểm soát đối với benchmark cũ, **không thêm pointermove, body:has hay tooltip mỗi ô**. Tooltip ô sửa chỉ render ở ô thực sự được quyền, dùng singleton không dùng HTML title trì hoãn.
- Dropdown đã được cấp quyền sửa dùng cùng CellPicker và khung bo nhẹ/mũi tên; không áp dụng UI này cho ô chỉ xem, không ghi đè màu nghiệp vụ. Giữ kiểm thử Chrome tự động, không tạo bản HTML test cho người dùng.



## Quy trình phát triển và phát hành hiện hành — 20/10/2026

- **Chỉ làm mã nguồn trên GitHub và xem kết quả ở GitHub Pages chính:** https://cavoixanh638.github.io/HopHDND-WebApp/ . Không tạo, gửi hay phát hành các đường dẫn HTML kiểm thử/preview riêng cho người dùng. Những preview cũ chỉ là tài liệu lịch sử, không phải luồng phát hành.
- Phát triển bằng branch + PR, kiểm thử TypeScript/unit/Firebase emulator/Chrome với dữ liệu giả trước khi merge. Sau khi CI PASS, merge có kiểm tra và để `.github/workflows/publish-pages.yml` tự build từ source và cập nhật `main:index.html`. Bản build HTML trong CI là sản phẩm kỹ thuật bắt buộc cho Pages, **không phải file HTML thử gửi người dùng**.
- Giữ bản backup trước thay đổi lớn, theo dõi **cả workflow publish source lẫn Pages deploy** PASS, sau đó kiểm mã/marker trong root HTML. Không tự triển khai Firebase Rules hay ghi nguồn Excel/Firebase chỉ vì cập nhật giao diện.
- PR #3 đã merge vào main trong ngày 20/10/2026; các ghi chú lịch sử “không merge PR #3” bên dưới áp dụng **cho giai đoạn trước ngày này**, không còn là trạng thái hiện tại.



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

## Quy tắc chống lặp giao diện — 20/10/2026, PR #5

- Danh sách nội dung chỉ có một tiêu đề cấp trang (`Danh sách làm việc`); card bảng giữ count và chuyển cột, không lặp tiêu đề và thẻ nguồn. Với admin/người sửa, những thông tin GID/reset/tài khoản đặt tại nhóm Tài khoản/Nguồn; cảnh báo nguồn mở qua details gọn.
- Tiêu đề **cột** nguồn căn giữa theo mã cột dù đổi thứ tự; cả hàng nhãn/hàng lọc và data phải có vạch dọc mảnh. Sort ở mode sửa không được làm lệch chữ tiêu đề.
- Không dùng màu viền trái của từng ô để báo sửa; quyền vẫn phải được kiểm backend, và class `editable-cell` chỉ kích hoạt tooltip ở ô được phép. Dropdown có viền/chevron khi có quyền.
- Tooltip báo cáo và ô sửa dùng chung tính toán vị trí ngoài ô, ưu tiên hơi chếch phía phải, lật nếu sát mép; không che nguồn; không thêm hover-state React cho mỗi ô hoặc pointermove. Phép đo unit + Chrome smoke phải bắt lỗi tái phát.

## Navigation chính thống nhất — 20/10/2026, PR #6

- App có đúng 2 card chính `Báo cáo tổng hợp` / `Danh sách các ND trình HĐND`. Nhãn đầy đủ (không dùng nhãn ngắn cũ) cho cả guest/admin, nhấn card đổi page `overview`/`items`; focus/active/disabled rõ.
- Ẩn brand/banner Sheets và heading trùng trên cả hai màn chính, chỉ giữ phiên bản và đường vào đăng nhập/cài đặt trên cùng. Nút làm mới dữ liệu ở account/source, GID và khôi phục nguồn trong details. Tuyệt đối không tắt polling 60 giây hoặc bỏ quyền truy cập tài khoản.
- Bỏ cảnh báo **toàn trang** không phân loại NQ/BC; giữ cảnh báo nghiệp vụ nằm **bên trong bảng** về trạng thái chưa chuẩn hóa. Giữ nguyên tỷ lệ báo cáo, tổng số, màu trạng thái, quyền sửa và dữ liệu nguồn.
- Trước merge/triển khai phải PASS TypeScript, unit, Firebase emulator, Chrome smoke cho đủ hai trang và có bằng chứng Deploy GitHub Pages. Khi thay test, không thay điều kiện theo cách bỏ kiểm tra cảnh báo có giá trị.
