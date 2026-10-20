# Từ điển dữ liệu HopHDND

**Nguồn chuẩn thực thi:** [shared/types.ts](../shared/types.ts), [item-preferences.ts](../src/data/item-preferences.ts), [gviz-parser.ts](../src/data/gviz-parser.ts), [sheets-repository.ts](../src/data/sheets-repository.ts), [field-definitions.ts](../shared/field-definitions.ts), [reporting.ts](../src/domain/reporting.ts). Trang này mô tả **mã trên PR #3 tính đến 19/10/2026**; không khẳng định trang Pages gốc đã nhận mã mới. Mốc phát hành, bằng chứng và giới hạn xem [CURRENT_STATE](CURRENT_STATE.md).

## 1. File nguồn và cách đọc hiện hành

- Excel gốc: `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx`, spreadsheet ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, tab `gid=60961344`. **Phiên bản nguồn được đối chiếu ngày 17–19/10/2026 có 15 cột A–O; O là Ghi chú.**
- `SheetsRepository` yêu cầu GViz `range=A:O`, phát hiện hàng tiêu đề ở 10 hàng đầu theo C = Nội dung trình và D = Sở; kiểm tên các header E/F/G/H/I/N. Chọn nhầm tab/đổi schema phải báo lỗi, không im lặng làm rỗng dữ liệu.
- `gviz-parser.ts` còn nhánh *tương thích dữ liệu cũ* A–R (O = Rút, P = Họp TU, Q = Đã thẩm tra chưa, R = Ghi chú) và A–P (O = Ghi chú, P = Trình/Rút). **Không** được tái thêm P/Q/R hoặc cột nghiệp vụ giả vào danh sách nguồn A–O hiện tại. Khi thay đổi file thực tế phải đối chiếu lại trước khi đổi parser.
- Loại bỏ dòng trống, tiêu đề phụ và dòng nhóm La Mã; dòng thiếu/trùng mã được giữ theo chính sách parser và cảnh báo. Ô Excel rỗng được giữ là chuỗi rỗng trong dữ liệu; UI hiển thị dấu `—` khi thích hợp, **không** âm thầm thay thành “Chưa phân công” hay “(Chưa có nội dung)” trong dữ liệu gốc.
- Nguồn dữ liệu nghiệp vụ vẫn là Excel/Sheets, không phải `hdnd/items`. WebApp Pages đọc GViz; mọi sửa thử Sheets ở WebApp chưa phải ghi Excel và không được coi là giao dịch thành công. Số dòng thống kê theo từng lần đọc; các con số cũ 51/53 không phải hằng số.

## 2. Ánh xạ đúng 15 cột A–O của bản nguồn

| Excel | Khóa `Item` / cột UI | Nhãn nguồn hiện hành |
|---|---|---|
| A | `displayCode` | ID |
| B | `stt` | STT |
| C | `content` | Nội dung trình |
| D | `department` | Sở, ngành chủ trì |
| E | `type` | Loại VB |
| F | `partyLevel` | Cấp Thành ủy cho ý kiến |
| G | `progressParty` | Tiến độ xin ý kiến Thành ủy |
| H | `progressBuild` | Tiến độ trình HĐND xây dựng NQ |
| I | `progressCouncil` | Tiến độ trình HĐND ban hành NQ/BC |
| J | `specialist` | Chuyên viên VPUB |
| K | `room` | Phòng chuyên môn |
| L | `vpLeader` | Lãnh đạo VP |
| M | `ubndLeader` | Lãnh đạo UBND TP |
| N | `specificProgress` | Tiến độ hiện tại |
| O | `note` | Ghi chú |

Các cột `history`, `partyMeeting`, `examined`, `isDropped` **không phải cột nguồn hiện hành**. Lịch sử hiển thị bằng thao tác riêng. `partyMeeting`/`examined` chỉ phục vụ đọc tương thích nguồn cũ, không có dữ liệu ở A–O. `isDropped` ở parser A–O mặc định `false`, không được suy ra từ ghi chú O.

## 3. Trường suy ra và giới hạn danh tính

| Trường | Mô tả |
|---|---|
| `recordId` | `<spreadsheetId>:<gid>:row:<số dòng vật lý>` — ID theo vị trí, có thể đổi khi Excel thêm/xóa/sắp lại hàng |
| `documentKind` | `NQ` / `BC` / `UNCLASSIFIED` suy từ cột E và mã A; nếu mâu thuẫn thì cảnh báo, không cưỡng ép |
| `isDropped` | A–O mặc định `false`; các bản nguồn legacy có cột Rút riêng mới xét chuyển đổi |
| `archivedAt`, `revision` | Ảnh chụp GViz đọc vào có `null` và `0`; không phải version/ETag thực của file Excel |
| `partyMeeting`, `examined` | Trường đọc dành cho định dạng A–R cũ; không thuộc 15 cột đang hiển thị |

**Rủi ro quyền theo hàng/ô:** `recordId` phụ thuộc số dòng vật lý, nên thêm/xóa/sắp xếp Excel có nguy cơ khiến quyền cũ trỏ nhầm. UI mới chủ trương quản lý quyền theo **cột**; cấu trúc Firebase `permissions.rows/cells` legacy vẫn có thể còn tồn tại, phải xử lý xác nhận khi thay thế — không tự xóa dữ liệu quyền khi mở trang. ID/STT chỉ đọc, chưa cho sửa nguồn.

## 4. Bố trí danh sách và cột do ứng dụng tạo

- `EXCEL_SOURCE_COLUMNS` luôn giữ 15 khóa nguồn. Người quản trị có thể đổi nhãn, thứ tự, ẩn/hiện/gỡ khỏi giao diện và khôi phục, **không xóa cột thực trong Excel**. Kéo tiêu đề để đổi vị trí; kéo ranh giới tiêu đề để đổi độ rộng trong chế độ chỉnh.
- Độ rộng cột danh sách hợp lệ 60–1600 px; `frameWidth` = auto hoặc 320–6000 px; `tableWidth` = 500–6000 px theo validator hiện hành. Độ rộng hiển thị thực còn phụ thuộc bố cục/các cột đang hiện. Độ rộng từng cột báo cáo được lưu trong `ReportConfig.columnWidths` (80–1200 px), khóa `__group`, `__total`, từng trạng thái, `__percent`.
- Tối đa 20 **cột tự tạo** `custom_...` có `origin=custom`, kiểu nhập text hoặc select (tối đa 50 lựa chọn). Giá trị cột tự tạo nằm riêng trong cấu hình ứng dụng theo ID dòng; **không ghi vào Excel**. Không đồng nhất giá trị cột tự tạo với ô nguồn và không tự xóa khi đổi mẫu cá nhân.
- Cột nguồn dùng danh mục lựa chọn dùng chung; danh sách chọn của cột tự tạo lưu trong cấu hình cột. Quyền sửa dữ liệu nghiệp vụ và quyền cấu hình là các luồng khác nhau.

## 5. Từ vựng thống kê và quy tắc hoàn thành

Theo [DEFAULT_REPORTS](../src/domain/reporting.ts) có **5 báo cáo mặc định** theo thứ tự:
1. `party` — Tiến độ xin ý kiến Thành ủy, cột kết thúc **Đã có TBKL**. Không có cột `TU đã cho ý kiến`; nhãn cũ nếu xuất hiện trong **giá trị nguồn** phải đưa ra kiểm tra `Chưa chuẩn hóa`, không tự coi là TBKL.
2. `build` — Tiến độ trình HĐND xây dựng NQ: **Không phải trình** → Sở chưa trình → VP đang thực hiện → Đã trình HĐND, chưa có QĐ → **Đã có QĐ chấp thuận**. Cột Không phải trình đứng sau Tổng số nội dung. Giá trị H `Không phải trình xây dựng NQ` ánh xạ **chỉ để hiển thị** thành `Không phải trình`, có trong tổng và mẫu số, nhưng không phải hồ sơ hoàn thành.
3. `council` — Tiến độ các Nghị quyết và Báo cáo trình HĐND, nguồn I, loại NQ+BC.
4. `nq` — Tiến độ trình HĐND ban hành NQ, nguồn I, chỉ NQ.
5. `bc` — Tiến độ trình HĐND ban hành BC, nguồn I, chỉ BC.

Ba bảng `council/nq/bc` cùng 3 cột **Sở chưa trình**, **VP đang thực hiện**, **Đã trình HĐND thành phố** (cột cuối được tính hoàn thành). Giá trị legacy `Hoàn thành`/ `Đã trình HĐND` trong nguồn có thể được chuẩn hóa **trong báo cáo hiển thị**; không tự thêm cột tên `Hoàn thành` và không sửa giá trị Excel. Trạng thái nguồn chưa khớp gom vào **Chưa chuẩn hóa** có cảnh báo, không tự phát minh cột nghiệp vụ; cột ẩn không làm giảm tổng.

**Lỗi còn phải đối chiếu:** hàm `getKpis` hiện vẫn đếm KPI hoàn thành theo chuỗi `Hoàn thành`, trong khi 3 báo cáo hội đồng chuẩn hóa sang `Đã trình HĐND thành phố`. Phải kiểm thử KPI so với thống kê và quy tắc nguồn trước khi tuyên bố hai bộ số nhất quán; đây **chưa phải đã sửa**.

## 6. Quyền, nguồn ghi và phiên bản

`hdnd/profile` là cấu hình chung với revision CAS: báo cáo, danh mục và bố trí/giá trị cột độc lập; không chứa bản sao đồng bộ của Excel. `hdnd/permissions` chứa quyền theo cột và có thể còn phần quyền legacy dòng/ô. Giao diện quản trị đã bỏ biên tập quyền từng ô, không có nghĩa backend tự hủy dữ liệu đó. `hdnd/control` dành cho khóa sửa trên WebApp, `hdndReviews` dành cho mốc phê duyệt; cần kiểm tra Rules production riêng.

Không dùng code rollback để khôi phục dữ liệu Firebase/Excel. Không cấp quyền lưu bằng cách chỉ ẩn/hiện một nút ở UI. Bố trí cá nhân trong browser khác bố trí chung Firebase; bản nháp khác dữ liệu đã được chấp thuận.

**Khi Excel đổi schema:** xác minh đúng workbook/gid, header, dải đọc, parser và fixture, rà các báo cáo/danh mục/quyền theo ID, chạy CI trước khi cập nhật bảng này. Tài liệu lưu các quyết định, không thay bằng chứng thử trên tài khoản quản trị thật.
