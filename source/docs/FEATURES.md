# FEATURES — Ma trận chức năng

## Phạm vi bản Firebase Pages 0.7.0

Dùng lại giao diện/tính năng hiện có; không mặc định đánh dấu hoàn tất toàn bộ F01–F36. GitHub Pages đọc nội dung từ Google Sheets qua `SheetsRepository`/GViz; đọc lại thủ công hoặc polling mỗi 60 giây khi tab hiển thị và không có nháp. Firebase chỉ phục vụ Auth, `hdnd/profile` và `hdnd/permissions`; không đồng bộ định kỳ Sheets sang Firebase. Admin là tài khoản Google `cavoixanh638@gmail.com` đã xác minh với `sign_in_provider=google.com`. Khách có thể sửa thử ô được cấp quyền nhưng thay đổi chỉ ở trình duyệt, không ghi Sheets/Firebase. Quyền cell > row > column > mặc định deny; row/cell dùng `recordId` của Sheets, phụ thuộc vị trí hàng nên cần rà/cấp lại quyền sau khi chèn hoặc sắp xếp, không tự ánh xạ mơ hồ. `hdnd/items` đang khóa ghi theo Rules hiện tại; `FirebaseRepository` được giữ cho chuyển đổi tương lai, chưa kích hoạt. Xuất dữ liệu lấy từ snapshot Sheets và admin vẫn xuất JSON profile; nhập Excel dữ liệu đang khóa. Không có kết quả kiểm lượt mới được ghi ở đây. Main Google chưa phát hành bản0.7.0; bằng chứng được ghi tại [CURRENT_STATE](CURRENT_STATE.md), hướng dẫn ở [FIREBASE_PAGES](FIREBASE_PAGES.md).

Nguồn chuẩn cho yêu cầu và tiêu chí chức năng F01–F36. Đây là đặc tả dự kiến; trạng thái thực tế và bằng chứng triển khai thuộc [CURRENT_STATE](CURRENT_STATE.md). Nơi phụ trách trong ma trận là dự kiến, cần cập nhật theo mã nguồn thực tế. Rà lại ngày 13/10/2026 trên HTML cũ đang dùng, phân biệt tính năng cũ, khả năng chỉ có qua JSON và yêu cầu cải tiến mới; xem bảng đối chiếu trong CURRENT_STATE.

Nguồn gốc và nghiệp vụ: [SYSTEM](SYSTEM.md), [kế hoạch viết lại](KE_HOACH_VIET_LAI.md).
| Mã | Chức năng | Phương án mới / tiêu chí kiểm tra | Nơi phụ trách dự kiến |
|---|---|---|---|
| F01 | KPI tổng, NQ/BC, Sở chưa trình, VP thực hiện, hoàn thành | Cùng nguồn dữ liệu và bộ quy tắc với báo cáo | `features/overview`, `domain/reporting` |
| F02 | Bảng tiến độ Thành ủy | Giữ phạm vi xin ý kiến; mô tả tổng NQ/BC và TTTU/BTV/BCH; rà nhãn/cấp mơ hồ; trạng thái lạ vẫn vào tổng. Không sao chép quy tắc cũ gộp gửi TU/chưa có TBKL thành đã báo cáo mà không đối chiếu nghiệp vụ | `features/reports` |
| F03 | Bảng trình ban hành nghị quyết | Phân loại NQ rõ; tính đủ trạng thái | `features/reports` |
| F04 | Bảng báo cáo trình HĐND | Phân loại BC rõ; cùng cơ chế tính | `features/reports` |
| F05 | Phân nhóm theo sở/phòng/lãnh đạo VP/lãnh đạo UBND | Đổi nhóm không đổi tổng; mục chưa phân công có nhóm riêng | `domain/reporting` |
| F06 | Bấm số xem danh sách nội dung | Số trong ô bằng số bản ghi chi tiết; giữ mã/nội dung/phòng/chuyên viên/sở như popup cũ. Tìm trong chi tiết, mở chi tiết tổng/nhóm/cột ẩn và xem thêm trường là cải tiến thêm | `features/reports` |
| F07 | Tạo bảng mới; chọn dữ liệu và trường chia cột | Giữ all/NQ/BC/Thành ủy/NQ phải xây dựng/từ khóa; giữ cả trường chia cột tiến độ TU/HĐND/xây dựng, sở, phòng, lãnh đạo VP như cũ; không giới hạn ngầm 6 trạng thái. Ô nhập từ khóa là bổ sung UI cho field cũ vốn chỉ chỉnh qua JSON | `features/settings/reports` |
| F08 | Đổi tiêu đề, đậm/nghiêng/gạch chân, màu và từ khóa nổi bật | Dữ liệu cấu hình có schema; xem trước; hủy được | `features/settings/reports` |
| F09 | Thêm/bỏ/đổi tên/sắp xếp/ẩn cột báo cáo; màu cột | Thứ tự riêng từng bảng, preview cạnh control; ẩn/bỏ khỏi trình bày không làm mất tổng | `features/settings/reports` |
| F10 | Quy tắc gộp trạng thái; cột hoàn thành; tỷ lệ; dòng mô tả | Giữ thứ tự quy tắc, trạng thái trống mặc định, chọn cột hoàn thành; tỷ lệ từng dòng và toàn bảng, bật/tắt tỷ lệ/mô tả. Xem trước dòng bị ảnh hưởng; xung đột quy tắc phải rõ, không đổi giá trị nguồn | `domain/statuses`, `domain/reporting` |
| F11 | Sắp xếp/ẩn/xóa bảng; khôi phục mặc định | Bảng bị xóa không xóa dữ liệu nghiệp vụ; có khôi phục mẫu. Bật/tắt khối KPI là UI mới cho cờ config cũ; danh sách vẫn truy cập qua tab riêng dù ẩn trên Tổng quan | `features/settings/reports` |
| F12 | Tìm kiếm tiếng Việt không dấu | Nội dung, mã, sở, chuyên viên, phòng; chuẩn hóa một lần khi dữ liệu đổi | `domain/search`, `features/items` |
| F13 | Lọc NQ/BC, lãnh đạo VP, tiến độ HĐND, đang trình/rút | Lọc phối hợp; xóa lọc; số kết quả chính xác | `features/items` |
| F14 | Xem đủ 16 cột A–P; sửa các trường nghiệp vụ được phép | Cột ID riêng; mã nhận diện được hiển thị tối thiểu hai chữ số như NQ01/BC01, không sửa mã nguồn hay recordId, số >=100 giữ đủ. STT/ID chỉ xem. Tách loại nội dung và loại VB; nguồn chỉ đọc phải nêu rõ; ghi thực tế cần quyền và hợp đồng ghi | `domain/items`, `features/items` |
| F15 | Sửa ô và soạn thảo nội dung dài | Một bước vào chỉnh; ID/STT chỉ xem, Popup nội dung/ghi chú có Áp dụng vào bảng (chưa ghi file nguồn) và bảo vệ X/Esc/nền; dropdown neo tại ô, chuyên viên hỗ trợ tìm không dấu và giữ lựa chọn hiện tại khi lọc; thoát có Lưu/Không lưu/Tiếp tục và checkpoint phục hồi | `features/items/editing` |
| F16 | 11 danh mục lựa chọn, tìm kiếm, thêm/sửa/xóa/sắp xếp, nạp giá trị thực tế | Sở, loại VB, cấp ý kiến, 3 tiến độ, chuyên viên, phòng, 2 lãnh đạo, tiến độ cụ thể; tìm không dấu, thêm nhanh/khôi phục mặc định. Danh mục có ID; mục đang dùng có ngừng sử dụng và xem trước thay hàng loạt | `features/catalogs` |
| F17 | Chuyên viên theo phòng; chọn toàn cơ quan; bổ sung người | Một chuyên viên có thể thuộc nhiều phòng; lọc theo phòng, tùy chọn toàn cơ quan, cảnh báo và chặn lưu nháp phân công mâu thuẫn quan hệ đã biết; không tự phân công. Đích dùng ID; cấu hình local nhãn không thay thế backend chung | `features/catalogs`, `features/items` |
| F18 | Thêm dòng | Nội dung bắt buộc; máy chủ tạo ID; bấm lại sau timeout không tạo đôi | `features/items`, `server/item-service` |
| F19 | Rút/không trình nữa; tra cứu lại | Không vào KPI/bảng chính; vẫn có trong danh sách rút; có phục hồi | `features/items` |
| F20 | Xóa dòng khỏi danh sách làm việc | Đổi thành lưu trữ mềm có thể phục hồi; không tự đánh đồng với rút | `features/items`, `server/item-service` |
| F21 | Chỉnh tên/thứ tự/ẩn cột danh sách; độ rộng; kéo bù trừ/tự do; reset | Dùng một bảng xem/sửa; nhóm control gần bảng, lưu theo source/browser. Độ rộng bảng thực tế là max(600, min(6000, độ rộng đặt), tổng độ rộng cơ sở cột đang hiện); frameWidth riêng cho khung trắng (auto hoặc 320–6000px), max bằng viewport; bảng cuộn ngang bên trong, tableWidth riêng ở nâng cao. Nếu độ rộng đặt lớn hơn tổng cơ sở, trình duyệt phân phối phần dư vào các cột nên width hiển thị có thể lớn hơn width cơ sở. Kéo pointer/drag tiêu đề và Alt+←/→ đổi thứ tự chỉ trong chế độ sửa; hỗ trợ embedded/touch và pointer capture; ở chế độ xem không kéo/resize và các tay nắm resize không nhận focus Tab. | `features/items/table` |
| F22 | Bảng mở rộng toàn trang; Esc; bàn phím | Chỉ đóng lớp đang thao tác; không mất nháp | `features/items`, `components` |
| F23 | Lưu/hủy khi thoát chế độ sửa | Các editor dữ liệu/cấu hình/nội dung/kết nối phải bảo vệ Về xem/Đóng/Esc có thay đổi bằng Lưu, Không lưu, Tiếp tục. Lưu lỗi không đóng/mất nháp; chỉ bỏ phần chưa gửi. Reload/đóng tab dùng cảnh báo browser; tự lưu nháp cục bộ định kỳ 10 giây, không thay Lưu | `features/items/editing`, `state` |
| F24 | Lịch sử theo ô và nhật ký chung | Giữ thời điểm, giá trị trước/sau, lịch sử trường và nhật ký thao tác. Server lưu là cải tiến tương lai, khác lịch sử local bản cũ; không coi history mẫu trong phiên là lịch sử thật | `features/history`, `server/audit` |
| F25 | Xuất Excel dữ liệu, lịch sử và ghi chú ô | Giữ tương thích; giới hạn lịch sử được thông báo; metadata không dồn một ô | `features/transfer` |
| F26 | Nhập Excel; đọc backup Excel cũ | Xem trước, mapping cột, kiểm tra dòng/trùng mã, báo cáo lỗi trước khi áp dụng | `features/transfer`, `migration` |
| F27 | Backup và khôi phục dữ liệu/danh mục/lịch sử | Bản cũ backup đầy đủ trong Excel _BACKUP_DATA_; JSON riêng cũ chỉ là cấu hình F28. JSON dữ liệu đầy đủ có schemaVersion là cải tiến mới; restore có xem trước và snapshot | `features/transfer`, `server/backup` |
| F28 | Nhập/xuất JSON cấu hình báo cáo | Có phiên bản và kiểm tra cấu trúc; cấu hình lỗi không phá app | `features/settings`, `migration` |
| F29 | In/lưu PDF từng bảng | Mẫu in riêng, ngang, đầy đủ tiêu đề/tổng/ngày/phạm vi; kiểm tra nhiều trang | `features/reports/print` |
| F30 | Đọc Sheets, làm mới tự động, thời điểm cập nhật | Giai đoạn 1 GViz chỉ đọc; bỏ lượt polling khi tab ẩn; báo lần đọc thành công; bản nháp tách khỏi dữ liệu đã lưu, được giữ cục bộ cả ở nguồn thật. Server đọc có xác thực xem xét khi cần nguồn riêng tư | `data`, `state` |
| F31 | Ghi ngược Sheets: thêm/sửa/rút/lưu trữ/đổi hàng loạt | Một giao thức; kiểm quyền/nguồn, baseline+ETag, backup/journal/operationId và readback.0.6.2 đã tích hợp sửa/rút và bật trên app Google riêng tư; ghi/đọc lại đã kiểm qua UI trên bản sao. Chưa đầy đủ thêm/lưu trữ/hàng loạt, phục hồi và nghiệm thu nhiều người; bằng chứng thực tế ở CURRENT_STATE | `data`, `server`, [API](API.md) |
| F32 | Kết nối, kiểm tra kết nối, tải lại bản chính | Người dùng nhập link/gid theo yêu cầu mới; kiểm tra không lưu, đọc thành công mới đổi nguồn; lưu lựa chọn riêng trên browser. Ghi và quyền nguồn không do ô link cấp | `features/settings`, `data` |
| F33 | Cache và mở lại dữ liệu đã đọc | Cache có phiên bản/nguồn/thời điểm; hiển thị đang xem bản cache; nháp tách riêng. Checkpoint nháp phải kiểm schema/base trước phục hồi, lưu cả nhập dở và xóa khi lưu/hủy/trở về giá trị gốc; checkpoint không phải cache Sheets offline | `data/cache`, `state` |
| F34 | Khôi phục dữ liệu gốc từ Sheets và cấu hình mặc định | Tải lại bản chính hoặc reset cấu hình; không gọi là hoàn tác dữ liệu đã lưu | `features/settings`, `features/items` |
| F35 | Thông tin dự án, hướng dẫn, tra cứu lỗi và phiên bản | Trang Trợ giúp + bộ tài liệu trong repo; chỉ mục sửa tính năng → file | `features/help`, `docs` |
| F36 | Phân quyền xem/sửa/quản trị | Kiểm tra ở server; danh tính được xác minh; không dựa vào ẩn nút | `server/auth`, `features/settings` |

## Tùy chỉnh đầy đủ, giao diện mặc định gọn

Đích 0.6.0: cell picker mở popover neo tại ô bằng một lần bấm; tùy chọn tìm kiếm chuẩn hóa tiếng Việt không dấu. Lọc không thay đổi giá trị; lựa chọn hiện tại được giữ và ghi chú nếu không còn khớp, bao gồm lựa chọn phụ thuộc quan hệ phòng.

Tình trạng thực hiện và bằng chứng kiểm tra chức năng xem [CURRENT_STATE](CURRENT_STATE.md); hợp đồng cấu hình dùng chung xem [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md).

Mặc định chỉ xem; các lựa chọn cấu hình nằm trong nhóm nhỏ ⚙ Tùy chọn và phải bấm vào chế độ riêng mới chỉnh được. Trong chế độ riêng, control từng báo cáo ở cạnh preview chính bảng đó; control danh sách ngay phía trên bảng, nhóm dài có vùng cuộn để vẫn thấy bảng. Một trình chỉnh cho mỗi loại đối tượng. Thiết kế đích của báo cáo có bốn nhóm Trình bày, Dữ liệu, Cột, Quy tắc tính; danh sách có trường/nhãn/thứ tự/độ rộng; danh mục và quan hệ gom chung Danh mục & phân công. Kết nối nằm trong Nguồn dữ liệu; Excel/JSON/backup gom trong Nhập, xuất & sao lưu. Phạm vi đã triển khai xem CURRENT_STATE, thiết kế ở [ARCHITECTURE](ARCHITECTURE.md).

Mỗi tùy chọn cần chỗ mở rõ, giá trị hiện tại, xem trước và Lưu/Hủy/Khôi phục. Không bỏ tính năng cũ vì đang ẩn mặc định; không buộc sửa JSON/code để làm thao tác đã cam kết. Chỉ hiện hành động áp dụng cho nguồn và quyền hiện tại. Tùy chỉnh báo cáo không được đổi dữ liệu gốc, tổng hoặc quyền nguồn.

Giữ F01–F36 làm mã ổn định, bổ sung tiểu mục trong Fxx khi phát hiện chi tiết bị sót. Tìm kiếm trong popup/JSON backup dữ liệu/OAuth-phân quyền là yêu cầu cải tiến, không được ghi như chức năng đã có ở HTML cũ. Cấu hình qua JSON cũ và UI cũ phải phân biệt trong đối chiếu.

## Quy tắc nghiệm thu ma trận

- Khi phát triển, bổ sung liên kết module, bằng chứng kiểm tra và tài liệu sử dụng; tình trạng hoàn thành/phiên bản thực tế ghi tại CURRENT_STATE theo mã Fxx rồi dẫn chiếu, không duy trì hai bảng trạng thái cạnh tranh.
- Nếu thay trải nghiệm, ghi thao tác mới đạt cùng nhu cầu nào; không bỏ chức năng vì việc cài đặt cũ bất tiện.
- Các biểu đồ trong `.bak` là chức năng lịch sử, không có ở bản HTML hiện tại. Không tự thêm Chart.js vào bản mới; ghi nhận là mở rộng nếu người dùng cần.
- CSV parser đang được tải ở bản hiện tại nhưng chưa có luồng CSV rõ ràng: không coi thư viện đang tải là yêu cầu phải giữ.
- `sync_all` chưa có hàm thực hiện trong bộ server đã khảo sát: chức năng nhập/khôi phục mới phải có hợp đồng triển khai đầy đủ, không kế thừa endpoint thiếu.

