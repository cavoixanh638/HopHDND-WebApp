# API — Hợp đồng đọc và lưu

> **Bản mã trên GitHub:** các thư mục `server/dist*` là đầu ra build, hiện không được lưu vào repo; chạy build tương ứng để tạo. Những đường dẫn này được giữ dạng chữ, không phải liên kết tải.

## Hợp đồng Pages hiện hành trên PR #3 (mã chưa merge vào root Pages)

- Nội dung: `SheetsRepository.list()` → GViz JSONP **A–O** từ link/gid đã chọn, parser kiểm E/F/G/H/I/N/O theo header hiện hành; A–P/A–R chỉ là đường đọc snapshot legacy khi tương thích. Có lỗi schema hoặc sai gid thì phải báo, không tự sinh dữ liệu/cột. Đọc lại/polling 60 giây qua useWorkspace; bỏ lượt tab ẩn, giữ snapshot khi lỗi và không áp dữ liệu mới lên nháp. `save()` của adapter Sheets từ chối; không có đường ghi nội dung vào Sheets/Firebase trong Pages.
- Auth/cấu hình: `useFirebase` chỉ subscribe `hdnd/profile` và `hdnd/permissions`; refresh thực sự đọc lại hai nhánh. Save profile bằng transaction `{revision,payload}` có revision lúc mở editor, kiểm schema client; Rules kiểm Google admin và revision ở server. Khởi tạo chỉ sau khi đã đọc xác nhận kho trống.
- Quyền: `columns[field]`, `rows[recordId]` và `cells[recordId][field]` boolean; ưu tiên cell → row → column → deny. Dòng/ô nhận recordId Sheets có dấu hai chấm, không yêu cầu có dòng RTDB. IDs theo vị trí legacy nên cần rà quyền khi Sheets đổi thứ tự/chèn dòng.
- Chỉ Google verified email `cavoixanh638@gmail.com`, token `firebase.sign_in_provider=google.com` được lưu profile/permissions. Khách không ghi cấu hình ở bất kỳ độ sâu hoặc multi-location update. Rules hiện khóa mọi ghi `hdnd/items`, kể cả admin. Nhập Excel ghi dữ liệu khóa; xuất dùng snapshot Sheets và JSON profile vẫn giữ.

## Adapter Firebase cho giai đoạn chuyển đổi sau (chưa kích hoạt)

FirebaseRepository giữ hợp đồng dưới đây cho chuyển đổi chính thức sau quyết định người dùng; Pages hiện không khởi tạo adapter này và Rules hiện khóa ghi dữ liệu. Auth Anonymous cho khách; Google email `cavoixanh638@gmail.com` verified/provider google.com cho quản trị. [Rules](../firebase/database.rules.json) là kiểm quyền ở server, không dùng secret trong HTML.

- `hdnd/items/{recordId}`: các trường Item; `archivedAt:null` được RTDB bỏ khỏi JSON và parser quy về null. `revision` bắt đầu1 và tăng1 khi cập nhật; `operationId`, `updatedAt=serverTimestamp`, `updatedBy=auth.uid`. Chỉ ID an toàn1–100 ký tự chữ/số/gạch dưới/gạch ngang; mã/STT/ID giữ nguyên sau tạo.
- Ghi: `runTransaction` từng dòng, so `baseValues` của đúng trường đổi; không bắt revision toàn dòng phải bằng khi khác ô. Một client save tuần tự; `applyLocally:false`. Cùng ô cũ khác nguồn trả CONFLICT và giữ nội dung trên browser. Replay ngay operationId cuối xác nhận lại không tạo lượt ghi. Lỗi/không rõ không xóa pending. Không cam kết replay vô hạn sau nhiều lượt ghi khác.
- `history/{revision % 50}` nằm trong dòng và cùng transaction: operationId,recordId,at,actor,changesJson,oldValuesJson. Các JSON thay đổi không phải key tên người; tối đa50 slot. HistoryDialog chuyển về AuditEntry để dùng giao diện cũ. UID ẩn danh không xác minh tên người.
- `hdnd/permissions/columns/{field}` boolean; `cells/{recordId}/{field}` boolean. Cell true/false ghi đè quyền dòng, quyền dòng ghi đè quyền cột; thiếu cả hai mặc địnhfalse. Admin sửa tất cả EditableField; bất kể admin, các trường ID/STT/mã vẫn giữ nguyên. Khách không tạo/xóa dòng, không sửa metadata độc lập hoặc cấu hình quyền.
- `hdnd/profile`: `{revision,payload:string}`. Payload JSON chứa catalogs,reports,items; deserialize rồi validate bằng schema hiện có. Dùng JSON vì tên chuyên viên/phòng có thể chứa '.' hoặc '/'. Save cấu hình đối chiếu revision lúc mở editor, không lấy revision mới để hợp thức hóa draft cũ.
- Import: admin `update` các ID mới atomically; kiểm trùng trên client và validation revision/identity ở Rules. Không cung cấp API replace/delete toàn nguồn qua UI.

Chỉ Rules được kiểm bằng emulator với token giả; chưa áp dụng hoặc chứng minh tương thích dữ liệu đang có trong RTDB thật. Google API cũ ở dưới dành cho Google host, không đại diện cho đường Firebase.

Ngày: 15/10/2026 · App0.6.2 đã phát hành tại deployment chính Version6. Trạng thái và phạm vi đã kiểm thuộc [CURRENT_STATE](CURRENT_STATE.md). Các RPC dưới đây dùng `google.script.run` trên Google host; không có endpoint ghi vô danh hoặc token trong HTML.

## Nguồn và quyền

`source = {spreadsheetId, gid, url}` phải đúng cả ba giá trị canonical đã đăng ký trên server. `gid` là khóa nguồn của app; tên worksheet thực tế được quản trị đăng ký riêng, không suy worksheet từ gid. Main Code chỉ nhận nguồn gốc; TestHost chỉ nhận bản sao riêng đã định danh trong mã. Client không chọn được tệp Drive bất kỳ để ghi.

Loại nguồn `sourceKind: demo|google` độc lập với `readOnly`. ExcelRepository là Google có khả năng ghi; SheetsRepository là Google đọc nguồn và giữ sửa trên máy. Chọn adapter từ cấu hình server ngay khi mở app, không thay adapter bất chợt khi người dùng đang sửa. File HTML không có `google.script.run` dùng adapter chỉ đọc; phần sửa ở trình duyệt đó không tự chuyển sang trang Google.

Registry `HDND_EXCEL_REGISTRY` trong Script Properties chứa enabled, source, sheetName, ownerEmail, backupFolderId và journalFolderId; bản thử thêm expectedTitle/requirePrivate. Mặc định không có registry nên bộ ghi tắt. Scope Drive phải được Google cấp ở đúng deployment/tài khoản; link có quyền sửa không thay OAuth. Bản thử riêng dùng USER_ACCESSING/MYSELF và đúng chủ bản sao; chưa có cơ chế cấp quyền cho nhiều người.

## Dữ liệu Excel

| RPC | Yêu cầu | Phản hồi | Chiều |
|---|---|---|---|
| getDashboardSourceStatus | source | backendReady, reason, actorLabel nếu đủ quyền | Kiểm kết nối, không ghi |
| getDashboardData | source | items, warnings, ignoredRows | Excel → app |
| saveDashboardData | source, records | Chuỗi JSON chứa results: SaveResult[] | App → Excel, rồi đọc lại xác nhận |
| getDashboardHistory | source, code | AuditEntry[] | Nhật ký riêng → app |

Item/Patch/SaveResult/AuditEntry chuẩn ở [shared/types.ts](../shared/types.ts). Mỗi phần tử records là Patch kèm `code` bằng displayCode **gốc** của lần đọc, ví dụ NQ1. NQ01 là cách hiển thị; không dùng để ghi khi nguồn là NQ1. `recordId` hiện giữ định dạng `<spreadsheetId>:<gid>:row:<hàng>` để tương thích checkpoint; chỉ dùng để trả kết quả về đúng dòng phía client, không dùng làm vị trí ghi. Nếu mã gốc chuyển hàng, writer tìm lại bằng mã duy nhất. Thiếu/trùng mã bị chặn, không tự ánh xạ.

Qua ranh giới google.script.run, RPC lưu tuần tự hóa kết quả thành chuỗi JSON; adapter parse rồi kiểm đầy đủ từng kết quả trước khi bỏ phần sửa. Giữ khả năng đọc phản hồi object cũ. Kiểm UI ngày 15/10 đã phát hiện trường hợp server Completed và file đọc lại đúng nhưng callback báo thất bại với phản hồi object; không dùng trạng thái execution thay cho xác nhận phía người dùng.

`baseRevision` hiện bằng 0; chống xung đột bằng baseValues từng trường **và** ETag workbook, không coi số 0 là khóa phiên bản file. Chỉ C–O (13 trường văn bản) và P (isDropped) được sửa. A/B, documentKind tính từ dữ liệu, ô công thức và ô gộp không phải ô đầu bị chặn. Giới hạn text20.000 ký tự, tối đa100 dòng/lần lưu. Client chuẩn hóa khoảng trắng đầu/cuối theo parser; server từ chối payload chưa chuẩn hóa. Nội dung không được rỗng, Trình/Rút phải boolean. Quan hệ chuyên viên–phòng được kiểm từ kho chung khi thay phân công; không tự đổi các phân công cũ khi sửa ghi chú/nội dung.

Đọc metadata → blob → metadata và chỉ nhận khi ETag không đổi. Ghi batch kiểm toàn bộ baseline/codec trước upload: một PUT workbook có If-Match, không ghi từng ô từng lượt. Script lock phối hợp lệnh app; ETag bảo vệ sửa trực tiếp Office. HTTP412 trả CONFLICT và giữ phần sửa. Lỗi validation hoặc hạ tầng ném lỗi, không xác nhận dòng nào. Client chỉ bỏ phần sửa nếu ok/item/mã dòng và tất cả giá trị đổi khớp chính xác.

## Sao lưu, xác nhận và thử lại

Hai thư mục Drive riêng cho chủ sở hữu: bản sao bytes workbook trước ghi và nhật ký JSON. Không đặt nội dung dòng Excel trong kho danh mục/bố trí. Trước PUT phải tải lại bản sao và khớp SHA256, ghi receipt cùng chỉ mục operationId. Receipt chứa source, fingerprint payload, records, trước/sau hash, backupId, actor, thời điểm và phase.

- `prepared`: chưa xác nhận kết quả; không tự lặp PUT. Bấm lưu lại cùng operationId chỉ đối chiếu blob với hash dự kiến. Hash không khớp giữ phần sửa và yêu cầu đối chiếu.
- `committed`: đọc blob đúng hash, các ô đúng giá trị, journal được xác nhận; trả lại kết quả đã ghi khi thử lại cùng payload, không PUT lần nữa.
- `rejected`: ETag cũ bị từ chối; giữ xung đột. Không tự lấy baseline mới để ghi đè.

Mã thao tác dùng lại cho payload/batch khác bị chặn. Nếu bị ngắt lúc tạo nhật ký hoặc không xác nhận được journal sau PUT, phần sửa vẫn còn, cần đối chiếu; không hứa mọi lỗi đều tự khôi phục. Không tự rollback khi nguồn có thể đã được sửa mới. Chưa có giao diện phục hồi backup/giải quyết conflict hoặc chính sách xóa backup định kỳ. Chỉ mục HDND_BATCH_/HDND_OP_ trong Script Properties chứa ID/hash, không chứa nội dung dòng; được lưu trước PUT để lần thử lại đọc trực tiếp đúng receipt thay vì chờ search Drive. Trong lượt có cache ID/ETag. Nếu Properties hết quota hoặc mất chỉ mục, chưa ghi/không tự suy đã thành công; cần quản trị bảo trì kho/index cùng nhau.

Timeout client: đọc dữ liệu/lịch sử30 giây, lưu90 giây; timeout không hủy được tác vụ Google đang chạy. Mất phản hồi không có nghĩa chưa ghi. App giữ operationId và phần sửa, không tự gửi lại. Lịch sử hiện giới hạn100 batch; nếu có trang tiếp theo thì báo giới hạn, không trả lịch sử thiếu như đầy đủ.

## Danh mục và bố trí

getDashboardConfig/saveDashboardConfig giữ giao thức hiện hữu: source, baseRevision, section(all/catalogs/reports/items), value, operationId. Dữ liệu chuẩn/chunk/commit marker ở [shared-config.ts](../src/data/shared-config.ts). Nơi lưu và hướng dẫn ở [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md). Đây là luồng độc lập với nội dung Excel. Lưu ô không gọi lưu bố trí khi bố trí không đổi.

## Giới hạn và bước phát hành

ZIP tối đa10MB nén/30MB sau mở,500parts và10.000hàng. Writer giữ XML của các ô/part khác; không tính lại cached value của công thức workbook. Báo cáo trong app tính từ items đọc lại; công thức Excel cần kiểm riêng với Office. Đã kiểm ghi/đọc lại qua UI Google trên bản sao và bật writer chính sau duyệt; chưa gửi lệnh ghi nguồn thật trong lượt triển khai. Chưa nghiệm thu20–30 người đồng thời, quota, cache/công thức hoặc giao diện rollback/phục hồi.

`npm run build:server` xuất server/dist (tệp chưa đồng bộ: `../server/dist`) (main, manifest Sheets giữ nguyên, writer OFF) và server/dist-test (tệp chưa đồng bộ: `../server/dist-test`) (UI thử chỉ bản sao, manifest Drive v2/USER_ACCESSING/MYSELF). Không chạy upload/deploy hoặc chuẩn bị thư mục từ build. Cấp quyền Drive cho dự án thử không cấp cho app chính. Bước kích hoạt/triển khai phải có quyết định người dùng sau khi xem bản cụ thể; không suy từ kế hoạch. Không báo F31 hoàn tất ở candidate này.

## Bổ sung giữ mã và overlay kích hoạt

Patch có sourceCode tùy chọn, giữ mã gốc từ baseline lúc sửa. Metadata chỉ ở client/checkpoint; adapter bỏ nó và gửi code trong wire payload. Không lấy lại mã từ cache của lượt đọc bị UI từ chối khi hàng chuyển. Nháp cũ thiếu metadata chỉ được bổ sung từ chính baseline đã lưu, không từ hàng mới; lệch mã bị chặn, operationId/wire payload không đổi. HistoryDialog truyền mã gốc item đang xem; server trả thứ tự thời gian tăng dần để UI dùng cùng quy tắc mới nhất trước như repository mẫu.

server/dist-enable (tệp chưa đồng bộ: `../server/dist-enable`) là overlay activation: manifest bật Advanced Drive service v2 (`dependencies.enabledAdvancedServices`, `userSymbol: Drive`, `serviceId: drive`, `version: v2`). Overlay giữ đúng ba OAuth scopes đã duyệt (`spreadsheets`, `drive`, `script.external_request`) và `USER_ACCESSING/MYSELF`; không thêm scope mới. Với default Cloud project, Apps Script bật Drive API khi advanced service được thêm/lưu; nếu dùng standard Cloud project, phải bật Google Drive API riêng trong Cloud Console. UI-test manifest cũng khai báo Drive advanced service v2, giữ hai OAuth scopes vốn có (`drive`, `script.external_request`) và `USER_ACCESSING/MYSELF` cho copy thử. Tham khảo [Advanced Google services](https://developers.google.com/apps-script/guides/services/advanced) và [Google Cloud projects](https://developers.google.com/apps-script/guides/cloud-platform-projects).

`checkDashboardExcelConnection` là helper chỉ đọc sau thiết lập: gọi status, snapshot và config, rồi log trạng thái backend, nhãn actor, số dòng, số cảnh báo và revision cấu hình. Không log cell contents, không gọi save hoặc ghi HTTP. Main đã được người dùng cấp quyền, đăng ký đúng nguồn và phát hành Version6 ngày15/10; bằng chứng kiểm trạng thái ở CURRENT_STATE. `ownerEmail` trong registry là tài khoản quản trị được phép gọi writer; nguồn còn cần quyền owner/writer thực của tài khoản đó. Build tự nó không kích hoạt/upload/deploy overlay.191 tests/24 files và typecheck đạt; không báo toàn bộ F31 hoàn tất.
