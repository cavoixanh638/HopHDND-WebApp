# Từ điển dữ liệu HopHDND

**Nguồn chuẩn:** các kiểu dữ liệu thực tế trong [shared/types.ts](../shared/types.ts), ánh xạ trong [gviz-parser.ts](../src/data/gviz-parser.ts), nhãn/danh mục trong [field-definitions.ts](../shared/field-definitions.ts). Tài liệu này mô tả **mã đang có**, không tự tạo schema mới hoặc tuyên bố dữ liệu đã được chuyển sang Firebase. Bản ứng dụng liên quan: Pages 0.7.0; khi code thay đổi phải cập nhật cả bảng này.

## 1. Nguồn nghiệp vụ và quy tắc đọc

- Tệp hiện dùng: `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, `gid=60961344`. Trên Google Drive, tệp là **Excel .xlsx** được mở qua URL Google Sheets; GViz được gọi từ trình duyệt qua `docs.google.com/spreadsheets/d/.../gviz/tq`.
- Trình đọc chỉ yêu cầu dải `A:P` (16 cột), tìm hàng tiêu đề trong 10 hàng đầu bằng cột C chứa “Nội dung”, cột D chứa “Sở”. Các hàng trống, tiêu đề phụ và tiêu đề nhóm được bỏ qua theo parser.
- Mã dòng, STT và loại NQ/BC có thể không nhất quán. Parser giữ các dòng trùng mã, sinh cảnh báo chứ không tự gộp. Danh sách 51 dòng chỉ là **kết quả từng được kiểm local**; Pages đang có phản ánh hiển thị 0 dòng, chưa nghiệm thu tải nguồn trên production.
- Nguồn dữ liệu chính hiện vẫn là file trên Drive, không phải `hdnd/items`. Xuất Excel/KPI dùng snapshot đã đọc. Chỉnh nghiệp vụ trên Pages hiện chỉ là nháp trong trình duyệt.

## 2. Ánh xạ cột A–P sang Item

| Cột | Trường trong `Item` | Ý nghĩa / cách parser xử lý |
|---|---|---|
| A | `displayCode` | Mã nội dung gốc; thiếu mã hiển thị nhãn “Dòng N (thiếu mã)” và cảnh báo |
| B | `stt` | STT: `Number(B)` nếu có giá trị số hợp lệ khác 0, nếu không dùng thứ tự tính từ hàng tiêu đề |
| C | `content` | Nội dung trình; nếu rỗng dùng “(Chưa có nội dung)” kèm cảnh báo |
| D | `department` | Sở/đơn vị; rỗng dùng “Chưa phân công” |
| E | `type` | Loại văn bản dạng chữ gốc; được dùng cùng mã A để suy ra `documentKind` |
| F | `partyLevel` | Cấp xin ý kiến |
| G | `progressParty` | Tiến độ xin ý kiến |
| H | `progressBuild` | Tiến độ xây dựng |
| I | `progressCouncil` | Tiến độ trình HĐND |
| J | `specialist` | Chuyên viên; rỗng dùng “Chưa phân công” |
| K | `room` | Phòng; rỗng dùng “Chưa phân công” |
| L | `vpLeader` | Lãnh đạo Văn phòng; rỗng dùng “Chưa phân công” |
| M | `ubndLeader` | Lãnh đạo UBND; rỗng dùng “Chưa phân công” |
| N | `specificProgress` | Tiến độ cụ thể |
| O | `note` | Ghi chú |
| P | `isDropped` | Boolean: parser nhận `rut`, `x`, `true`, `1`, `khong trinh nua` sau chuẩn hóa; không nhận thì false |

Giá trị ô được `String(cell.v ?? cell.f ?? '')` và `trim()`. Một số cột sẽ được làm sạch/hiển thị mặc định; vì vậy **không thể giả định xuất snapshot luôn giữ nguyên bytes Excel gốc**. Đây là ánh xạ để hiển thị, không phải hợp đồng ghi ngược Excel.

## 3. Các trường không nằm trực tiếp ở A–P

| Trường | Kiểu | Giá trị khi đọc GViz / lưu ý |
|---|---|---|
| `recordId` | string | `<spreadsheetId>:<gid>:row:<số-hàng-vật-lý>`; **legacy theo vị trí** |
| `documentKind` | `NQ \| BC \| UNCLASSIFIED` | Suy từ E và tiền tố mã A; nếu mâu thuẫn thì UNCLASSIFIED + cảnh báo |
| `archivedAt` | `string \| null` | `null` đối với dữ liệu đọc từ GViz hiện tại |
| `revision` | number | `0` cho snapshot GViz; không phải revision máy chủ của Excel |
| `sourceCode` trong `Patch` | string tùy chọn | Mã gốc đóng băng của bản nháp; khác mã hiển thị sau định dạng |
| `baseRevision`, `baseValues`, `changes`, `operationId` | số/object/UUID | Thông tin đối chiếu và chống lẫn bản nháp; **không có nghĩa Pages đã ghi nghiệp vụ thành công** |

**Rủi ro hiện hữu:** chèn, xóa hoặc sắp xếp lại hàng sẽ thay đổi `recordId` theo số hàng. Vì `hdnd/permissions/rows` và `hdnd/permissions/cells` đang tham chiếu `recordId`, cấu hình theo dòng/ô có thể áp nhầm hàng sau thao tác Excel. **Chưa có cơ chế tự dịch chuyển ID ổn định**. Chỉ dùng quyền theo cột như phương án an toàn tạm thời cho đến khi có thiết kế identity, migration và test đối chiếu.

## 4. Trường được phép chỉnh sửa và trường chỉ đọc

- `TextField` (13 trường): `content`, `department`, `type`, `partyLevel`, `progressParty`, `progressBuild`, `progressCouncil`, `specialist`, `room`, `vpLeader`, `ubndLeader`, `specificProgress`, `note`.
- `EditableField` = 13 `TextField` ở trên cộng `documentKind` và `isDropped`. Đây là danh sách **các trường code hỗ trợ xét quyền**, không phải mặc nhiên cấp phép sửa.
- `recordId`, `displayCode`, `stt`, `archivedAt`, `revision` và metadata thao tác không có trong danh sách trường chỉnh sửa. Cập nhật trực tiếp tại Pages đang chỉ tạo nháp, không commit nghiệp vụ.
- Validation: `content` phải là chuỗi không rỗng sau trim; các `TextField` là chuỗi tối đa 20.000 ký tự; `isDropped` là boolean; `documentKind` thuộc ba giá trị quy định. Chi tiết máy chủ/Rules xem [FIREBASE_PAGES](FIREBASE_PAGES.md).

## 5. Quy tắc trạng thái và danh mục

Ba trường trạng thái chính có tập gợi ý trong `shared/field-definitions.ts`; danh mục dùng chung và giá trị nguồn có thể không trùng tập gợi ý. Không được âm thầm ép trạng thái lạ vào nhóm gần giống. Quy tắc báo cáo/KPI và phân biệt “Sở xin rút” với “Đã rút” xem [SYSTEM](SYSTEM.md), [reporting.ts](../src/domain/reporting.ts).

- `progressParty`: Sở chưa trình; VP đang thực hiện; Đã gửi ĐU; ĐU đã gửi TU chưa họp; Đã họp chưa có TBKL; Đã báo cáo TU; Không phải xin ý kiến; Sở xin rút.
- `progressBuild`: Không phải trình xây dựng NQ; Trình xây dựng NQ; Đã trình HĐND chưa có QĐ; Đã có QĐ chấp thuận.
- `progressCouncil`: Sở chưa trình; VP đang thực hiện; Đã trình HĐND; Hoàn thành; Sở xin rút.

## 6. Cấu hình Firebase khác dữ liệu nghiệp vụ

```text
hdnd/
  profile/               {revision, payload}
  permissions/
    columns/             fieldKey: boolean
    rows/                recordId: boolean
    cells/               recordId/fieldKey: boolean
  items/                 Adapter tương lai; Rules bản local hiện khóa ghi
```

`profile.payload` là JSON string chứa `{catalogs, reports, items}`; nó **không phải** hàng nghiệp vụ Google Sheets. Quyền tra theo thứ tự **ô → dòng → cột → mặc định từ chối**; thiếu quyền không đồng nghĩa có quyền. Chỉ Google admin được xác minh mới lưu thay đổi cấu hình chung. Cần đối chiếu Rules chạy thực tế trước khi xác nhận; trạng thái xem [CURRENT_STATE](CURRENT_STATE.md).

## 7. Khi thay đổi schema

Nếu thêm/đổi vị trí cột nguồn hoặc định nghĩa trường: cập nhật parser, `shared/types.ts`, `field-definitions.ts`, code quyền và báo cáo liên quan, unit test theo fixture, rồi **mới** sửa từ điển. Không sửa file nguồn nghiệp vụ để “phù hợp” với giả định của từ điển. Các vấn đề chưa có thiết kế (ID ổn định, migration, danh mục ID) phải được ghi vào [WORKBOARD](WORKBOARD.md) và chỉ triển khai sau quyết định riêng.
