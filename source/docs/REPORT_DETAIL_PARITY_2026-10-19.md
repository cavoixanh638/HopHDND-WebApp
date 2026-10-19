# Đối chiếu toàn bộ chức năng bảng Danh sách nội dung và Bảng chi tiết nhanh từ ô báo cáo

Mốc: 19/10/2026 · Nhánh: `feat/saved-views-approval-lock-filters-2026-10-16` · **Preview/PR #3**, không phải production.

## Mục tiêu và lý do sửa

Người dùng thấy cửa sổ popup không thể kéo độ rộng cột, dù form Cấu hình cột có nhập px. Phân tích mã cho thấy popup thiếu `ColumnResizeHandle`, `ColumnHeader` và áp dụng `table {width:max-content; min-width:100%}` khiến trình duyệt phân phối lại độ rộng. Giải pháp hiện hành dùng **cùng thành phần resize/drag/filter/editor của Danh sách**, `<colgroup>` với **chiều rộng bảng cố định bằng tổng độ rộng các cột đang hiện**, cho phép Chrome kéo ranh giới header và xem ngay thay đổi. `windowDragFallback` chỉ bật tại popup vì Chrome nested dialog không giữ pointer capture giữa các bước CDP; ngoài popup không thay handler kéo của Danh sách. Window listeners chỉ tồn tại **trong một phiên kéo**, hủy khi thả/hủy/unmount, không re-render theo từng pixel. Độ rộng cuối lưu localStorage riêng popup; settings mở thì chỉ preview nháp cho tới lúc Save.

## Ma trận chức năng so sánh

| Chức năng bảng Danh sách | Popup trước sửa | Popup hiện hành trên nhánh | Ranh giới/ghi chú |
| --- | --- | --- | --- |
| Bấm ô số lọc đúng hồ sơ | Có | **Giữ**, dùng recordId + workspace.workingItems | Không query Sheets khi click |
| Đủ 15 trường nguồn Excel A–O | Có lựa chọn, mặc định 10 | **Giữ**; nút `Hiện đủ cột Excel` bật tạm tất cả | Không tự tạo cột nguồn ngoài Excel |
| Khách ẩn danh có quyền sửa thử ở Danh sách | Đã thấy nút Chỉnh sửa nháp/config/mẫu trên popup | **Mới sửa nguồn PR #3:** popup khách chỉ xem, loại bỏ các nút sửa và quản lý; chặn onUpdate ở callback theo quyền | Test mới; CI #39279720743 đang chờ, preview chưa cập nhật |
| Thanh chỉnh **độ rộng toàn popup** ngay ở toolbar | Trước đó chỉ có số px ẩn trong Cấu hình cột, người dùng không thấy trên ảnh | Thanh kéo Rộng popup, hiển thị px, lưu tự động, giới hạn theo viewport; khách cũng kéo được vì chỉ đổi cách xem | Test riêng chờ CI; chưa phát hành preview mới |
| Độ rộng **toàn cửa sổ popup** | Chỉ có giới hạn CSS 1480 px, chưa có công cụ chỉnh | Đã bổ sung trên PR #3: nhập 640–2400 px, xem trước/lưu độc lập từng cột và bảng | Đã xuất bản preview mới ngày 19/10; cần kiểm trên Chrome Windows người dùng |
| Đổi chiều rộng bằng **kéo mép cột** | **Không** | **Đã thêm** dùng `ColumnResizeHandle`, cả chuột/keyboard; hẹn cập nhật React khi thả | Có `windowDragFallback` chỉ cho nested modal |
| Đổi chiều rộng bằng nhập px | Có nhưng cảm giác không ăn theo bảng | **Sửa** cùng `colgroup`/tableWidth tính từ tổng; preview ngay trong settings | 70–800px, lưu riêng |
| Kéo thả để đổi thứ tự cột | Chỉ ↑/↓ trong panel | **Đã thêm** `ColumnHeader` kéo tiêu đề trong chế độ cấu hình + Alt+←/→; vẫn giữ ↑/↓ | Có xác nhận khi rời settings mà chưa lưu |
| Ẩn/hiện cột | Có | Giữ, có preview ngay khi tick; ẩn hết bị chặn | Riêng popup/nguồn/preview |
| Khôi phục mặc định | Có | Giữ | 10 cột hay dùng, 15 cột khả dụng |
| Bấm tiêu đề sắp xếp 3 trạng thái | Có nút sort riêng | **Dùng `ColumnHeader` như danh sách**; tăng → giảm → gốc | Không thay tập recordId của ô gốc |
| Hàng lọc ngay dưới tiêu đề | Chỉ input text | **Dùng `ColumnFilterCell` như danh sách**; lựa chọn nhanh khi số giá trị ít, input khi nhiều, nút X xóa từng bộ lọc | Search tiếng Việt không dấu |
| Tìm kiếm tổng, xóa toàn bộ bộ lọc | Có ô tìm | Thêm nút **Xóa bộ lọc** (bao gồm sort), vẫn có ô tìm tổng | Popup chỉ lọc trong tập đã bấm |
| Cuộn ngang/dọc, sticky 2 hàng tiêu đề | Có | Giữ, tối ưu width và overflow | Không thay giao diện báo cáo phía sau |
| Mẫu hiển thị cá nhân | Không | **Đã thêm** lưu tên, chọn, cập nhật, xóa mẫu với bố cục, filters, colors; tối đa 12 mẫu | LocalStorage riêng popup; không ghi mẫu Danh sách |
| Màu theo quy tắc | Không | **Đã thêm** nền dòng mint/amber/rose/blue theo điều kiện bằng giá trị nguồn | Cấu hình màu riêng popup; không thay semantic colors báo cáo |
| Nhãn cột đổi tên của Danh sách | Không, dùng nhãn mặc định A–O | **Đã đồng bộ nhãn** từ `itemLayout.columns`, nhưng thứ tự/ẩn/rộng của popup vẫn độc lập | Không đồng bộ giữa nhiều trình duyệt |
| Loại editor `text` / dropdown | Dropdown mặc định | **Theo cấu hình cột nguồn** từ Danh sách, dùng `CellPicker` tìm chuyên viên và editor text khi loại = text | Chỉ sửa `TEXT_FIELDS` có quyền |
| Sửa Nội dung / Ghi chú | Ô nhập trực tiếp đơn giản | **Dùng `ContentEditor` hiện có** (cảnh báo bỏ sửa chưa áp dụng, nháp và kiểm rỗng) | Không ghi Excel từ popup |
| Cảnh báo sai liên hệ chuyên viên–phòng | Không | **Đã thêm** `assignmentIssue` dưới ô chuyên viên | Chưa thay validation lưu backend |
| Lịch sử từng hồ sơ | Không | **Đã thêm** nút ↺ trên ID khi được phép dùng chức năng lịch sử | Nguồn Sheets read-only có thể không có lịch sử |
| Quyền theo ô và khóa sửa | Có chặn sửa cơ bản | **Giữ chung** `canEditCell` / `mayEdit` / khóa từ App, không tạo hệ phân quyền thứ hai | Quản trị quyền chính vẫn ở Danh sách |
| Bản nháp, giữ trên máy | Có nháp chung | Giữ chung `workspace.update` / `workspace.keepDraft` với Danh sách | Không khẳng định đã ghi Excel/Firebase |
| Điều hướng đến bảng Danh sách đầy đủ | Không | **Thêm** nút `Mở Danh sách dữ liệu` | Có thể thao tác chức năng quản trị nâng cao tại bảng gốc |

## Phần **cố ý không nhân đôi** trong popup và cần quyết định riêng

1. **Quản lý schema cột dùng chung** (tạo tối đa 20 cột custom, xóa/đổi loại, quản trị các lựa chọn) thuộc `ItemColumnPanel` và cấu hình nguồn/capability chung. Popup hiện chỉ có **15 cột dữ liệu nguồn A–O**, không mượn localStorage để tự tạo “cột Excel”. Khi cần chỉnh schema, dùng bảng Danh sách/Quản lý cột; việc hiển thị cột custom trong popup cần thêm hợp đồng dữ liệu riêng và phép thử.
2. **Phân quyền Firebase và khóa/duyệt** thuộc màn hình quản trị hiện tại. Popup sử dụng quyền hiệu lực nhưng **không có nút sửa quyền** trong bảng để tránh phát sinh giao dịch quản trị khác với baseline/revision của hệ thống.
3. **Ghi Excel thật, đồng bộ cấu hình giữa nhiều máy**, quản lý backup, xuất/nhập và in báo cáo là các luồng riêng, không gắn tự động vào popup chỉ bằng thao tác đổi cột. SheetsRepository trên Pages `readOnly=true`; sửa từ popup **chỉ là nháp**.
4. **Hiệu năng rất lớn**: không mặc định virtualize data table vì sticky header, filter và các dialog đang dùng cấu trúc bảng native. Nếu nhiều nghìn hồ sơ trong một ô, cần trace trên Chrome Windows và cân nhắc phân trang/virtualization sau khi kiểm lợi ích.
5. **Cảnh báo xung đột khi thoát editor** dùng ContentEditor hiện có. Cấu hình cột trong popup có xác nhận Lưu/Bỏ/tiếp tục; nháp dữ liệu được giữ ở workspace, cần nghiệm thu UX trực tiếp với tài khoản được cấp quyền.

## Tiêu chuẩn kiểm thử/bảo vệ

- Cột đầu ID có tay nắm thật trên ranh giới, 36 thao tác hover không làm tăng layout công việc nền. Chrome CDP phải rê đến handle, `mousePressed`, di chuyển sang phải 65px và `mouseReleased`, sau đó kiểm **cả `colgroup col.style.width`, `table.getBoundingClientRect().width` và dữ liệu localStorage**. Đóng/mở popup lại vẫn phải phục hồi đúng giá trị và thứ tự/ẩn cột; layout Danh sách không đổi.
- `ReportDetailGrid` dựng có điều kiện khi bấm ô, một popup; tooltip singleton chỉ tồn tại ở 5 báo cáo. Không dùng `body:has(...:hover)` + CSS Anchor cho hover, không theo dõi pointermove ngoài lúc kéo.
- `report-detail-preferences.test.ts` và `report-detail-presets.test.ts` kiểm schema/nguồn/preview cô lập, tên mẫu, bộ lọc và màu. Browser smoke phải xác nhận cả tương tác mở từ mép ô, ẩn/hiện cột, kéo viền, restore sau đóng/mở.
- Chỉ phát hành từ **exact source commit đã Verify PASS** đến `preview/popup-grid-parity-2026-10-19/` và `preview/current/`. Không sửa root `main:index.html`, không merge PR #3, không ghi Excel/Firebase. Nếu Chrome test FAIL thì **không publish**.
