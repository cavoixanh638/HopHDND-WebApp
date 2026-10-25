# Theme2 Imperial Sky — điều chỉnh trạng thái, hover và tiêu đề ngày 25/10/2026

Đây là lớp **bổ sung Theme2**; không sửa mã nguồn/tài liệu trên nhánh snapshot **Theme1**. Các màu và hiệu ứng cũ có thể phục hồi chọn lọc từ `snapshot/Theme1-before-ImperialSky-2026-10-24`.

## Các quyết định được người dùng yêu cầu

1. **Văn phòng đang thực hiện/đang xử lý:** mặc định chữ `#854D0E`, nền `#FEF9C3`, một tông vàng kem sáng dễ phân biệt với đỏ `#D00025`. Áp dụng mặc định trong `defaultStatusPalette()`, báo cáo, danh sách và popup. Lưu ý nếu người dùng đã lưu preset cá nhân, màu preset **được tôn trọng**; chỉ chuyển palette hoạt động khi phát hiện toàn bộ palette cũ hoàn toàn mặc định, không có preset/điều chỉnh. **Không ghi đè localStorage trong quá trình tải**. `Theme1` giữ màu cũ `#B04700/#FFE8B8`.
2. **Bảng tổng hợp:** chỉ những ô **có nút bấm thực tế** (`td.report-clickable-cell`) nổi toàn ô 3px, có **viền ngoài 2px** màu theo nhóm trạng thái: đỏ khi chưa trình, vàng khi Văn phòng xử lý, xanh lá khi hoàn thành, xanh dương nhẹ cho bước trung gian, xanh thép với Tổng cộng. Viền là `outline`, không đổi độ rộng cột/hàng, không đổi màu chữ hoặc nền trạng thái, ô số 0 không click vẫn phẳng.
3. **Cột % hoàn thành:** header/cell/tổng của `report-percent-col` dùng **cùng màu nền/chữ với Hoàn thành** theo palette hoạt động (mặc định nền `#D5F0DE`, chữ `#007A18`), không thành màu khác. Progress bar dùng màu chữ hoàn thành.
4. **Danh sách chi tiết:** hover vùng ô được phép sửa chỉ làm **nổi phần điều khiển nằm trong**, viền trong (outline 2px) màu tương ứng nhóm trạng thái (đỏ/vàng/xanh/khác), còn ô không mang trạng thái dùng xanh Imperial Sky. Cột gộp chỉ hover đúng control. Không đổi các ô read-only, dữ liệu, lịch sử sửa, focus khi đang nhập, không tô nguyên hàng. 
5. **Hiệu ứng nổi 3px (CSS pixel)** thay cho 2px trên tab chính, ô số Bảng tổng hợp, chip tổng quan có thể bấm, nút sửa Danh sách và nút sửa popup; giữ nguyên chuyển động chậm nhẹ, giảm chuyển động khi `prefers-reduced-motion`, không in shadow/outline ra giấy.
6. **Bảng "Tiến độ trình HĐND xây dựng NQ":** mặc định `includeNotRequired=false`. Nội dung `Không phải trình` **vẫn nguyên trong dữ liệu nguồn**, chỉ không nằm trong tổng và mẫu số tỷ lệ của bảng build NQ. Cấu hình **đã lưu tường minh** `includeNotRequired=true` vẫn có thể giữ nguyên theo ý admin; tùy chọn Bao gồm/Không bao gồm tiếp tục hoạt động và không động vào các bảng khác.
7. **Màu đầu bảng nhẹ:** cột đầu Bảng tổng hợp (thead/tbody/tfoot) `#EAF1F6`, chữ `#2B4D63`. Hàng tiêu đề Danh sách chi tiết `#EFF5F9`, hàng bộ lọc `#FAFCFE`. Không đổi nền ô số trạng thái hay màu nghiệp vụ do admin lưu.

## Phạm vi thay đổi và kiểm thử

- Chỉ giao diện/chính sách mặc định: `data/status-palettes.ts`, `data/report-preferences.ts`, `domain/reporting.ts`, `styles/app.css`, tests, tài liệu. Không chỉnh Firebase rules, Excel, database, quyền, ID hay danh sách.
- Tests: mặc định build NQ loại `Không phải trình`, explicit include vẫn được; palette giữ preset riêng; Chrome xác nhận màu vàng mới, hover viền semantic màu đỏ/vàng/xanh, 3px lift, % hoàn thành cùng màu Hoàn thành, header nhạt, tổng bấm được, focus và modal ổn định.
- **Rollback:** xóa lớp CSS bổ sung liên quan + khôi phục default/migration và default build count qua PR; không `git reset` mã dự án, không động vào snapshot `Theme1`/preset cá nhân.

**Ghi chú:** "3pt" trên mô tả thao tác được triển khai thành 3 **CSS px** (pixel là đơn vị đúng của transform trên trình duyệt) theo hiệu ứng 2px trước đây.


## 25/10/2026 — Chính sách ngoại lệ bảng Thành ủy

Khi cột tiến độ xin ý kiến Thành ủy có trạng thái nguồn "Không phải trình", không được gom vào "Chưa chuẩn hóa". Bổ sung "Không phải trình" như trạng thái hợp lệ, mặc định ẩn cột và loại khỏi tổng/% hoàn thành của riêng bảng Thành ủy. Admin có thể bật tính và bật hiện cột **độc lập** trong cấu hình báo cáo như bảng Build NQ. Phần Party khác giữ chuẩn 6 mốc; trạng thái cũ "TU đã cho ý kiến" vẫn là chưa chuẩn hóa, không tự suy diễn là đã có TBKL. Không sửa dữ liệu/Excel/Firebase/quyền hoặc màu của Theme2.
