# Bộ tài liệu, tra cứu và bàn giao dự án

Ngày: 13/10/2026. Đây là **đặc tả bộ tài liệu phải xây dựng cùng app**, không phải hướng dẫn xác nhận thao tác trên app mới đã chạy.

## 1. Cách tổ chức thông tin

README ở gốc là điểm bắt đầu; `docs/README.md` là chỉ mục chi tiết cho người sử dụng, quản trị viên và người phát triển. Tài liệu dùng Markdown có thể đọc trực tiếp trong thư mục/Git; trang Trợ giúp dùng nội dung được chọn từ cùng nguồn để tránh hai bản hướng dẫn lệch nhau.

Mỗi tài liệu có tiêu đề, phạm vi, phiên bản áp dụng, ngày cập nhật và đường dẫn liên quan. Mỗi tính năng có mã Fxx từ ma trận. Tài liệu ghi rõ nội dung nào đã hoạt động, đang triển khai hoặc dự kiến.

### 1.1. Đánh giá danh sách tài liệu do người dùng cung cấp

| Tài liệu trong mẫu | Quyết định cho dự án này | Lý do và nội dung cần dùng |
|---|---|---|
| `AGENTS.md` | Cần, ở thư mục gốc; tạo trước khi viết code | Điểm vào cho AI: thứ tự đọc theo nhiệm vụ, quy tắc sửa, kiểm tra liên quan, cập nhật tài liệu, phân biệt môi trường thử/sản xuất |
| `SYSTEM.md` | Cần, trong `docs/`; gộp tài liệu nghiệp vụ tương đương | Mục tiêu, phạm vi, thuật ngữ, mô hình nghiệp vụ và bất biến: ID ổn định, tổng chính xác, nháp khác dữ liệu đã lưu, rút khác lưu trữ |
| `ARCHITECTURE.md` | Cần, trong `docs/`; phát triển từ thiết kế kỹ thuật đã có | Lớp thành phần, luồng dữ liệu, công nghệ, ranh giới API, cache, xung đột và giới hạn; chỉ ghi thành phần thực sự được chọn |
| `REPOSITORY_LAYOUT.md` | Chưa cần file riêng; gộp vào `REPO_MAP.md` | Quy tắc đặt/di chuyển file và cây thư mục còn đủ nhỏ để theo dõi chung với bản đồ mã |
| `CURRENT_STATE.md` | Cần ngay, trong `docs/` | Đã làm, đã kiểm tra, chưa kiểm chứng, giới hạn hiện tại và bước tiếp theo; tránh nhầm đề xuất thành kết quả |
| `REPO_MAP.md` | Cần khi bắt đầu tạo mã nguồn, trong `docs/` | Bản đồ file/module thực tế, trách nhiệm và nơi sửa từng tính năng; kèm quy tắc bố trí thư mục |
| `FEATURES.md` | Cần, trong `docs/`; chuyển từ ma trận F01–F36 | Nhu cầu, hành vi, tiêu chí chấp nhận và liên kết module/test/hướng dẫn; không tạo danh mục chức năng thứ hai |
| `WORKBOARD.md` | Bảng gọn đã tạo khi giao Luna song song | Phạm vi/phụ trách và link kết quả; trạng thái chuẩn vẫn ở CURRENT_STATE; chưa có Git/PR |
| `README.md` ở gốc | Cần; đã có | Giới thiệu ngắn và dẫn đến nguồn chuẩn; không lặp cả bộ tài liệu |
| `docs/README.md` | Cần ngay | Chỉ mục theo nhu cầu, trạng thái tài liệu và thứ tự đọc; không chứa bản sao nghiệp vụ/kiến trúc |

Không áp dụng con số phiên bản cấu trúc thư mục hoặc thành phần Worker từ ảnh vào dự án này; những chi tiết đó thuộc dự án mẫu.

### 1.2. Một loại thông tin — một nguồn chuẩn

| Loại thông tin | Nguồn chuẩn khi triển khai | Giới hạn trách nhiệm |
|---|---|---|
| Quy tắc cho AI/người sửa code | `AGENTS.md` | Quy định cách làm, không chép nghiệp vụ và không tự mở rộng quyền thao tác |
| Nghiệp vụ và bất biến | `docs/SYSTEM.md` | Tại sao và điều kiện phải giữ; trường/cột chi tiết dẫn đến từ điển dữ liệu |
| Kiến trúc hệ thống | `docs/ARCHITECTURE.md` | Thành phần và luồng; cấu trúc file chi tiết dẫn đến REPO_MAP; payload dẫn đến API |
| Cấu trúc thư mục, trách nhiệm file và chỗ sửa | `docs/REPO_MAP.md` | Bản đồ thực tế; nhãn rõ phần dự kiến chưa có |
| Yêu cầu/hành vi và mã chức năng | `docs/FEATURES.md` | Đặc tả Fxx và link bằng chứng; trạng thái triển khai thực tế thuộc CURRENT_STATE |
| Kết quả hiện tại và việc chưa kiểm chứng | `docs/CURRENT_STATE.md` | Ghi theo mã Fxx/mốc và dẫn tới test/bản phát hành; không sao chép mô tả chức năng |
| Thứ tự triển khai dự kiến | `docs/KE_HOACH_VIET_LAI.md` | Lộ trình; không coi là nhật ký kết quả |
| Điều phối nhiều người/luồng, nếu phát sinh | `docs/WORKBOARD.md` | Task, phụ trách, phụ thuộc, PR và liên kết kết quả; không thay CURRENT_STATE |
| Cách người dùng thao tác | Hướng dẫn sử dụng/quản trị | Bước thực hiện và phản hồi trên app, dẫn tới nghiệp vụ thay vì định nghĩa lại |

### 1.3. Chuyển các tài liệu hiện có, tránh nhân bản

- `MA_TRAN_CHUC_NANG.md` → `FEATURES.md`: di chuyển khi chuẩn bị triển khai, giữ mã Fxx; bổ sung liên kết file/test/hướng dẫn khi có.
- `THIET_KE_KY_THUAT.md` → `ARCHITECTURE.md`: di chuyển và cập nhật theo kết quả thử kiến trúc; cây file chi tiết và bản đồ sửa chữa chuyển sang REPO_MAP.
- Tổng quan nghiệp vụ và quy tắc đang nằm trong kế hoạch → SYSTEM: chuyển phần định nghĩa chuẩn; kế hoạch giữ lý do cải tiến, lộ trình và liên kết.
- Không tạo thêm `TONG_QUAN_DU_AN.md`, `CHUC_NANG.md`, `CAU_TRUC_MA_NGUON.md`, `QUY_TAC_NGHIEP_VU.md` hoặc `BAN_DO_SUA_CHUA.md` như các nguồn chuẩn cạnh tranh. Nội dung tương ứng được gộp vào SYSTEM, FEATURES hoặc REPO_MAP.
- Sửa mọi liên kết khi di chuyển; file cũ, nếu cần giữ để người đọc tìm được, chỉ chứa chỉ dẫn chuyển tiếp, không duy trì bản nội dung đầy đủ thứ hai.

### 1.4. AGENTS.md cần ngắn và phù hợp nhiệm vụ

Dự kiến chứa: đọc CURRENT_STATE để biết tình trạng; tra FEATURES theo mã cần sửa; đọc SYSTEM cho thay đổi nghiệp vụ, ARCHITECTURE/API cho thay đổi dữ liệu, REPO_MAP để tìm file. Chỉ đọc sâu tài liệu liên quan, không bắt đọc toàn bộ repo mỗi lần sửa nhỏ.

Quy tắc chính: sửa nguồn thay vì artifact build; không sao chép logic thống kê; không đánh dấu xong khi chưa có bằng chứng; cập nhật đúng tài liệu; kiểm tra phù hợp thay đổi; bảo toàn dữ liệu khi chuyển đổi; không tự ghi nguồn thật hay phát hành chỉ vì tài liệu có ví dụ lệnh. AGENTS không mặc định yêu cầu phân công đa tác nhân, tạo PR hoặc thêm quy trình xác nhận cho mọi sửa chữa.

### 1.5. Khi nào tách hai tài liệu còn lại?

Chỉ tách REPOSITORY_LAYOUT khi quy tắc tổ chức repo đủ lớn hoặc có nhiều gói/môi trường để gây khó tra cứu. Khi tách, chuyển quy tắc sang file đó; REPO_MAP giữ inventory thực tế và dẫn link. Chỉ tạo WORKBOARD khi việc giao nhiệm vụ và theo dõi phụ thuộc vượt khả năng lộ trình hiện tại; một người phụ trách mỗi task, có kết quả/link bằng chứng, không yêu cầu PR nếu quy trình dự án chưa dùng PR.

## 2. Danh mục tài liệu phải bàn giao

| Tài liệu dự kiến | Nội dung bắt buộc | Đối tượng |
|---|---|---|
| `README.md`, `docs/README.md` | Bắt đầu nhanh và chỉ mục; dẫn chiếu trạng thái; lệnh thực tế khi có code | tất cả |
| `AGENTS.md` | Thứ tự đọc theo nhiệm vụ, quy tắc sửa/kiểm tra/cập nhật tài liệu và môi trường | AI/người bảo trì |
| `docs/SYSTEM.md` | Bài toán, phạm vi, thuật ngữ, nghiệp vụ, bất biến và giới hạn nghiệp vụ | tất cả |
| `docs/ARCHITECTURE.md` | Công nghệ, thành phần, luồng dữ liệu, giới hạn kỹ thuật và quyết định đã chốt/chưa kiểm chứng | phát triển |
| `docs/CURRENT_STATE.md` | Kết quả đã làm, bằng chứng, phần chưa kiểm chứng và công việc kế tiếp | tất cả |
| `docs/FEATURES.md` | Danh mục Fxx, hành vi, quyền, tiêu chí chấp nhận và link module/test/hướng dẫn | tất cả |
| `docs/REPO_MAP.md` | Cấu trúc thực tế, quy tắc đặt file, trách nhiệm và bản đồ sửa tính năng → file | phát triển |
| `docs/HUONG_DAN_SU_DUNG.md` | Quy trình tra cứu, sửa, lưu/hủy, rút, thêm, xem lịch sử, xuất/in | người sử dụng |
| `docs/HUONG_DAN_QUAN_TRI.md` | Danh mục, cấu hình bảng, phân quyền, kết nối, import/restore, kiểm tra dữ liệu | quản trị |
| `docs/CAI_DAT_VA_CHAY.md` | Yêu cầu runtime đã xác minh, cài phụ thuộc, dev, dữ liệu giả, cấu hình thử | phát triển |
| `docs/TU_DIEN_DU_LIEU.md` | Trường, kiểu, bắt buộc, ý nghĩa, danh mục, cột Sheets, ID, version, nguồn | phát triển/quản trị |
| `docs/API.md` | API version, payload, phản hồi, lỗi, quyền, conflict, partial result và timeout | phát triển |
| `docs/XU_LY_SU_CO.md` | Triệu chứng, nguyên nhân phân biệt, cách kiểm tra, xử lý và khi cần quản trị | tất cả |
| `docs/KIEM_THU_VA_NGHIEM_THU.md` | Dữ liệu mẫu, cách chạy, kết quả test, ma trận, số đo hiệu năng, giới hạn | phát triển/quản trị |
| `docs/TRIEN_KHAI_VA_QUAY_LAI.md` | Môi trường thử/sản xuất, quyền, build/deploy, smoke check, rollback và xử lý dữ liệu sau mốc | quản trị/phát triển |
| `docs/SAO_LUU_VA_KHOI_PHUC.md` | Nội dung backup, schemaVersion, nơi lưu, chu kỳ theo nhu cầu, thử phục hồi | quản trị |
| `docs/CHUYEN_DOI_DU_LIEU_CU.md` | Excel/JSON/local cũ, mapping, lỗi chuyển đổi, đối chiếu và mốc ngừng ghi | quản trị/phát triển |
| `docs/decisions/` | Các quyết định quan trọng: lý do, lựa chọn, hệ quả, điều kiện xem lại | phát triển |
| `CHANGELOG.md` | Phiên bản, ngày, thay đổi người dùng thấy, thay đổi schema/API, cách nâng cấp | tất cả |

Tài liệu phụ thuộc có license và phiên bản được ghi trong manifest/lockfile; thông tin nguồn thư viện được dẫn link. Không chép mật khẩu, token hoặc tài liệu cá nhân vào hướng dẫn.

## 3. Thông tin dự án cần hiển thị

Trang **Trợ giúp → Thông tin ứng dụng** phải có:

- tên app, mục đích và phiên bản;
- ngày phát hành, phiên bản dữ liệu và API khi hữu ích cho hỗ trợ;
- phạm vi dữ liệu và kỳ báo cáo nếu dữ liệu thực tế có quản lý kỳ;
- thời điểm đọc nguồn thành công gần nhất; trạng thái cache và nháp;
- người/tổ quản trị và cách liên hệ do chủ dự án cung cấp;
- link hướng dẫn sử dụng, ghi chú phiên bản và lỗi thường gặp.

Thông tin hạ tầng chi tiết, Spreadsheet ID và log kỹ thuật nằm ở trang quản trị/chẩn đoán phù hợp quyền; người dùng thông thường chỉ thấy thông tin giúp hiểu dữ liệu hoặc xử lý thao tác.

Không tự thêm chức năng quản lý nhiều kỳ họp vào scope viết lại khi dữ liệu cũ chưa có trường kỳ; ghi rõ việc đó là nhu cầu mở rộng cần xác định riêng.

## 4. Hướng dẫn sử dụng theo công việc

Mỗi quy trình theo mẫu: mục đích → điều kiện/quyền → thao tác → kết quả mong đợi → trường hợp lỗi → cách quay lại. Minh họa bằng ảnh từ app mới và dữ liệu thử; tránh ảnh/mô tả từ app cũ.

| Công việc | Nội dung hướng dẫn phải giải thích |
|---|---|
| Tìm một nội dung | Từ khóa không dấu, tìm theo mã/người/phòng, phối hợp bộ lọc, xóa lọc |
| Xem tiến độ tổng hợp | Phạm vi báo cáo, phân nhóm, tỷ lệ, cột ẩn, nhóm chưa ánh xạ, bấm số |
| Chỉnh sửa nội dung | Mở ô/popup, danh mục và chuyên viên theo phòng, chỉ báo nháp, lưu/hủy |
| Lưu có xung đột | So sánh ba giá trị, chọn giữ/đổi, không dùng nút ghi đè mù quáng |
| Thêm nội dung | Trường bắt buộc, chọn loại NQ/BC, nhận mã server; xử lý timeout |
| Rút và lưu trữ | Phân biệt đề nghị rút, đã rút và lưu trữ; tác động báo cáo; phục hồi |
| Xem lịch sử | Đọc thời điểm, người/nguồn, giá trị cũ/mới; giới hạn dữ liệu legacy |
| Xuất Excel/in | Phạm vi xuất, toàn bộ hay kết quả lọc, lịch sử, bố cục in/PDF |
| Nhập dữ liệu | Xem trước, mapping, dòng lỗi, hành động thêm/cập nhật; quyền quản trị |
| Mất mạng hoặc đóng tab | Nháp chưa gửi khác dữ liệu đã lưu; cách mở lại và đối chiếu |

Ví dụ sử dụng dự kiến: chuyên viên lọc các nội dung của phòng → sửa hai tiến độ → thấy hai dòng chưa lưu → bấm Lưu thay đổi → server xác nhận → thấy lịch sử và KPI cập nhật. Nếu một dòng xung đột, hướng dẫn phải thể hiện một dòng đã lưu và một dòng còn nháp, không mô tả cả hai đã thành công.

## 5. Bản đồ sửa chữa dự kiến

Khi viết app, chuyển bảng dưới đây vào REPO_MAP rồi thay đường dẫn dự kiến bằng file cụ thể, symbol/hàm và mã test có thật; tài liệu này chỉ dẫn chiếu tới đó. Không để bảng chỉ trỏ đến cả thư mục sau khi đã bàn giao.

| Muốn thay đổi | Nơi sửa dự kiến | Kiểm tra quan trọng | Tài liệu cập nhật |
|---|---|---|---|
| Tên/ẩn/thứ tự cột danh sách | field definitions và `features/items/table` | View/Edit cùng cấu hình; dữ liệu không đổi | FEATURES, HUONG_DAN_SU_DUNG |
| Thêm hoặc đổi danh mục | Trang quản trị + schema `domain/items.ts` khi đổi cấu trúc | Tham chiếu cũ không mất; nhãn đổi không đổi ID | TU_DIEN_DU_LIEU, HUONG_DAN_QUAN_TRI |
| Trạng thái/tiêu chí hoàn thành | `domain/statuses.ts`, cấu hình báo cáo | Tổng và KPI dùng cùng quy tắc; dữ liệu cũ | SYSTEM, CHUYEN_DOI |
| Thêm bảng tiến độ | Cấu hình report; chỉ sửa code khi thêm khả năng mới | Tập dữ liệu/tổng/chi tiết bằng nhau | FEATURES, HUONG_DAN_QUAN_TRI |
| Sửa cách tìm kiếm | `domain/search.ts` | Không dấu, đ/Đ, chữ hoa, mã, chuỗi rỗng | SYSTEM |
| Sửa chuyên viên theo phòng | Danh mục quan hệ + validation | Đổi phòng cảnh báo; không mất giá trị cũ | HUONG_DAN_QUAN_TRI |
| Sửa Lưu/Hủy hoặc báo conflict | `state` + `features/items/editing` | Nháp, partial save, timeout, refresh | HUONG_DAN_SU_DUNG, API |
| Đổi nguồn Sheets/cột | Cấu hình server + `server/sheets.ts` | Mapping đọc/ghi và kết quả đối chiếu | TU_DIEN_DU_LIEU, TRIEN_KHAI |
| Sửa quyền truy cập | `server/auth.ts`, chính sách tài khoản/Sheets | Server từ chối request trực tiếp sai quyền | API, HUONG_DAN_QUAN_TRI |
| Sửa Excel/backup | `features/transfer`, `server/backup.ts`, `migration` | Xuất–nhập–đối chiếu; backup cũ và dữ liệu lớn | SAO_LUU, CHUYEN_DOI |
| Sửa in PDF | `features/reports/print`, `styles/print` | Nhiều trang, tổng, chữ Việt, cột ẩn | HUONG_DAN_SU_DUNG |
| Đổi nhịp làm mới/cache | `data` và hook đọc dữ liệu | Tab ẩn, backoff, nháp không bị đè | API, XU_LY_SU_CO |
| Đổi màu/cỡ chữ/layout | `styles` và component liên quan | Khả năng đọc, độ tương phản, bàn phím, bản in | CHANGELOG nếu thay trải nghiệm |

## 6. Quy trình sửa một tính năng

1. Tìm mã Fxx và đọc nghiệp vụ/giới hạn liên quan.
2. Theo bản đồ sửa chữa đến đúng file; xác định thay đổi dữ liệu, API hay chỉ trình bày.
3. Sửa ở lớp chịu trách nhiệm; không tạo bản sao quy tắc trong component khác.
4. Chạy typecheck và test liên quan; nếu đổi contract/schema thì kiểm tra chuyển đổi và tích hợp.
5. Thử với dữ liệu mẫu và app thật ở môi trường thử khi hành vi đòi hỏi.
6. Cập nhật hướng dẫn, feature map và changelog trong cùng thay đổi.
7. Build, ghi phiên bản, phát hành theo hướng dẫn và kiểm tra kết quả sau phát hành.

Code comment dành cho lý do và giới hạn khó suy ra; không chú thích lại từng dòng. Tên file/hàm/field nhất quán; giao diện và hướng dẫn dùng tiếng Việt. Không để secret hoặc dữ liệu nghiệp vụ thật trong fixture.

## 7. Tài liệu xử lý sự cố

| Triệu chứng | Cách kiểm tra và hướng xử lý cần mô tả |
|---|---|
| Không thấy dữ liệu | Quyền tài khoản, nguồn/môi trường, lỗi API, cache; không reset dữ liệu ngay |
| Số tổng khác chi tiết | Phạm vi lọc, bản ghi rút/lưu trữ, status mapping, nhóm chưa phân công |
| Số liệu khác giữa hai máy | Thời điểm đọc nguồn, đang xem cache, bản nháp và cấu hình cá nhân |
| Lưu chậm hoặc timeout | Dùng operationId kiểm tra kết quả; không bấm tạo lại nhiều lần |
| Dữ liệu bị người khác sửa | Hiển thị đối chiếu; tải lại bản chính mà giữ nháp |
| Một phần batch lỗi | Đọc danh sách kết quả từng mục; chỉ gửi lại mục chưa áp dụng |
| Chưa nhận diện được email | Kiểm tra chế độ triển khai và chính sách Google; không mở quyền ghi công khai để xử lý |
| Không nhập được Excel | Định dạng, mapping cột, ID, phiên bản backup, thư viện và dung lượng |
| In thiếu cột hoặc nhiều trang sai | Phạm vi in, cột ẩn, browser, hướng giấy, mẫu in; xem preview |
| Lỗi quota | Ghi API/thời điểm/mã lỗi, dừng retry dồn dập, đối chiếu nhịp làm mới và quy mô |

Log chẩn đoán có requestId/operationId và mã lỗi; hạn chế đưa nội dung nhạy cảm vào log. Người dùng nhận thông báo có cách xử lý, không nhận stack trace làm nội dung chính.

## 8. Giữ tài liệu đúng với mã nguồn

- `docs:check` kiểm tra link/file tham chiếu, field IDs, các API public đã có implementation và đủ mục trong ma trận; không hứa công cụ kiểm tra được mọi mô tả hành vi.
- Schema và danh mục field dùng chung làm nguồn để tạo bảng từ điển dữ liệu; phần ý nghĩa nghiệp vụ vẫn được rà soát thủ công.
- App version, API version và schemaVersion xuất phát từ metadata thống nhất.
- Ảnh hướng dẫn được cập nhật khi màn hình thay đổi; tài liệu ghi phiên bản áp dụng.
- Không có tính năng được đánh dấu hoàn thành khi chưa có hướng dẫn phù hợp người sử dụng/quản trị và kiểm tra cần thiết.
- Ghi quyết định đổi kiến trúc vào `docs/decisions/`; nêu lý do chọn, hệ quả và khi nào xem xét lại, không ghi nhật ký thử nghiệm dài vào hướng dẫn sử dụng.
- CURRENT_STATE ghi sự thật đã kiểm tra, loại bằng chứng và ngày kiểm tra; không gán tình trạng hoàn thành theo tên file hoặc số dòng đã viết. FEATURES giữ đặc tả và dẫn chiếu kết quả.
- Mỗi phần thông tin chỉ cập nhật ở nguồn chuẩn theo mục 1.2; README/chỉ mục không tự tạo mô tả chuẩn cạnh tranh. Khi gộp/di chuyển phải cập nhật liên kết trong cùng thay đổi.

## 9. Checklist bàn giao cuối cùng

- [ ] README có hướng dẫn chạy thực tế trên máy sạch; không còn lệnh dự kiến chưa triển khai.
- [ ] Cấu trúc và bản đồ sửa chữa trỏ đúng file/hàm; mọi Fxx có trạng thái và bằng chứng.
- [ ] Hướng dẫn sử dụng đã được làm theo trên app mới bởi người chưa biết mã nguồn.
- [ ] Quản trị viên có thể quản lý danh mục, cấu hình, quyền, backup và restore theo tài liệu.
- [ ] Quy tắc tổng hợp có ví dụ số liệu; các chênh lệch với app cũ được giải thích.
- [ ] Kết quả kiểm thử và đo hiệu năng ghi môi trường, dữ liệu, ngày đo và giới hạn.
- [ ] Chuyển đổi có bản backup, báo cáo đối chiếu, mốc ngừng ghi và cách quay lại không mất dữ liệu mới.
- [ ] Có changelog, dependency lockfile và thông tin bản source/build/deployment tương ứng.
- [ ] Thông tin tài khoản/quyền phụ thuộc môi trường thực tế được ghi rõ, không còn giả định chưa kiểm chứng.
- [ ] Bộ tài liệu và code được quản lý phiên bản cùng nhau; dữ liệu/secret được lưu đúng nơi riêng.
- [ ] AGENTS ngắn, đọc theo nhiệm vụ; SYSTEM/ARCHITECTURE/FEATURES/REPO_MAP có phạm vi rõ; CURRENT_STATE phản ánh bằng chứng thật; các chỉ mục dẫn đúng nguồn chuẩn.
