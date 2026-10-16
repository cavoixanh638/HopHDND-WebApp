# Hướng dẫn sử dụng — Pages 0.7.0 và Main 0.6.2

## Dành cho quản trị viên Pages 0.7.0 (quy tắc và giới hạn hiện tại)

Tài khoản quản trị phải đăng nhập Google qua Firebase Authentication (email đã xác minh, nhà cung cấp `google.com`), không dùng mật khẩu nhúng trong HTML. Quyền cập nhật danh mục, báo cáo, bố trí danh sách, cột và quyền sửa thuộc **cùng cơ chế quản trị Firebase**; xem [FIREBASE_PAGES](FIREBASE_PAGES.md). Quyền theo ô ưu tiên trước dòng, rồi cột, mặc định không cho sửa. Các nút sửa nháp nghiệp vụ **không** ghi vào Google Sheets/Firebase.

**Giao diện đã cập nhật (16/10/2026):** Mở **⚙ → Vào chế độ tùy chỉnh danh sách**. Trong cùng màn hình có hai mục **Bố trí bảng và cột** và **Quyền chỉnh sửa**. Ở Bố trí bảng và cột, điều chỉnh hiển thị, độ rộng, thứ tự và lưu bố trí riêng. Ở Quyền chỉnh sửa (chỉ quản trị viên), cho phép sửa cả cột bằng ô chọn ở tiêu đề; đặt quyền riêng cho dòng hoặc từng ô ngay trên bảng. Bảng hiện trạng thái **Được sửa / Chỉ xem** cho từng ô theo quyền đang chọn. Nút **Lưu quyền chỉnh sửa** mới ghi cấu hình vào Firebase; nếu có thay đổi chưa lưu, phải Lưu hoặc Bỏ thay đổi trước khi rời mục Quyền chỉnh sửa.

**Cách hiểu quyền:** Ở từng ô, **Theo quyền dòng/cột** nghĩa là dùng quyền của dòng; nếu dòng chưa đặt quyền thì theo cột. **Cho phép sửa** mở riêng ô đó; **Không cho sửa** khóa riêng ô đó. Ở từng dòng, **Theo quyền cột**, **Cho phép sửa cả dòng**, **Không cho sửa dòng** có ý nghĩa tương ứng. Thứ tự ưu tiên: **ô → dòng → cột → mặc định khóa**. Vì ID dòng hiện theo vị trí Excel, thao tác cấp quyền riêng cho dòng/ô cần xác nhận cảnh báo; sau khi thêm/sắp xếp hàng Excel phải rà lại quyền.

**Giới hạn nghiệm thu:** Mã UI đã qua CI và được phát hành nhưng vẫn cần người dùng kiểm tra đăng nhập và lưu quyền thật với Firebase Rules đang chạy; không ghi dữ liệu nguồn khi sửa thử.

Quy trình vận hành/quay lại, sao lưu, khôi phục và xử lý lỗi: [VAN_HANH](VAN_HANH.md). Ý nghĩa trường, ID và rủi ro quyền theo dòng/ô: [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md).



## Pages 0.7.0 — bản local chưa phát hành

Mọi người tiếp tục nhập/sửa dữ liệu trên Google Sheets. Pages đọc A–P trực tiếp qua GViz, tự đọc lại mỗi 60 giây khi tab hiển thị hoặc qua **Đọc lại dữ liệu Sheets và cấu hình**. Khi có nháp, app chờ bạn giữ để đối chiếu hoặc bỏ phần sửa trước khi đọc lại. Lỗi đọc giữ bản trước; đăng nhập Firebase lỗi không ngăn Sheets hiển thị.

**Tài khoản và quyền chỉnh sửa** dùng Firebase Authentication đã có. Chỉ Google `cavoixanh638@gmail.com` được lưu quyền ô/cột/dòng, bố trí danh sách/báo cáo và danh mục/giá trị lựa chọn dùng chung vào Firebase. Khách xem/tìm/lọc và sửa thử ô được cấp quyền; **Áp dụng vào bảng** và **Giữ thay đổi trên máy** chỉ giữ trên browser, không ghi nguồn. Quyền ô ưu tiên dòng rồi cột, mặc định khóa. Sau khi chèn/sắp hàng Sheets, quản trị cần rà lại quyền riêng do recordId legacy theo vị trí hàng.

**Kết nối dữ liệu Google Sheets** chỉ đổi lựa chọn nguồn trên trình duyệt; không cấp quyền đọc bảng riêng tư hoặc quyền ghi. **Nhập / Xuất Excel** vẫn xuất snapshot Sheets và JSON cấu hình; nhập dữ liệu Excel bị khóa. Nhập JSON cấu hình cần Google quản trị và xác nhận lưu. Chưa push, triển khai Rules hoặc đổi dữ liệu thật. [Hướng dẫn Pages](FIREBASE_PAGES.md), [kết quả](CURRENT_STATE.md).

## Main Google 0.6.2 — luồng đã phát hành trước đó

Main `/exec` đã cập nhật deployment v6 ngày15/10/2026. Mở [ứng dụng trên Google](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec) trong tab mới hoặc tải lại tab cũ. Kết nối main được kiểm lúc11:30:08: backend sẵn sàng, tài khoản `phucpixel2025@gmail.com`, 51 dòng, 0 cảnh báo, cấu hình revision12; UI tải mới lúc11:34 hiện đúng nguồn. Lần kiểm UI này không sửa dữ liệu nguồn chính. Save/readback thành công đã được chứng minh riêng trên bản sao thử; không coi đó là bằng chứng nguồn chính đã được ghi.

Nguồn nhập liệu mặc định là [file Excel HĐND](https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344), `gid=60961344`. Nguồn thật và dữ liệu mẫu là hai loại nguồn khác nhau; một nguồn Google vẫn có thể ở chế độ chỉ đọc.

## Mở và chọn nguồn

Mở ứng dụng bằng link Google ở đầu tài liệu. Để sửa và lưu Excel, dùng Google app này; vào **⚙ Tùy chỉnh danh sách**, sửa ô rồi bấm **Lưu dữ liệu vào Excel**. HTML tải về chỉ là giao diện và không tự mang backend Apps Script; Drive preview và `file://` chưa được xác minh.

Main v6 dùng nguồn đã đăng ký sẵn; không đổi link/`gid` trong lúc sửa. Nếu cần đổi nguồn, quản trị viên phải cập nhật nguồn đã đăng ký phía server trước. Các bản HTML độc lập/candidate có thể có **⚙ Tùy chọn → Kết nối dữ liệu**, nhưng chế độ đó không cấp quyền ghi Excel và không chuyển nháp sang Google app.

## Xem và cập nhật dữ liệu

Ở tab **Tổng quan**, xem KPI/báo cáo, đổi cách phân nhóm và bấm số để mở danh sách chi tiết. Có thể tùy chỉnh cột hiển thị; ẩn cột không đổi tổng. Tab **Danh sách nội dung** hỗ trợ tìm kiếm tiếng Việt có/không dấu, lọc theo loại, phạm vi, lãnh đạo VP và tiến độ; tối đa 50 dòng mỗi trang. Dòng chưa chuẩn hóa vẫn được báo để rà soát.

Nguồn Excel được đọc theo cấu trúc hiện tại. Dùng link **Mở file Excel nhập liệu** để xem hoặc sửa file theo quyền của bạn. App tự đọc lại mỗi 60 giây khi tab hiển thị; **Đọc lại dữ liệu và danh mục từ Google** cũng tải dữ liệu Google vào app. Đây là chiều **Google → app**, không ghi nội dung ngược vào file.

## Sửa nháp và giữ trên trình duyệt

Trong Google app, mở **⚙ Tùy chỉnh danh sách**. Sửa ô hoặc mở popup **Nội dung trình/Ghi chú**; **Áp dụng vào bảng** chỉ đưa nội dung popup vào nháp. Bấm **Lưu dữ liệu vào Excel** để gửi phần sửa. App chỉ báo đã lưu khi đọc lại file và xác nhận giá trị; nếu có lỗi, xung đột hoặc kết quả chưa rõ, phần sửa được giữ để đối chiếu. Bản sửa được checkpoint trên browser khoảng 10 giây. **Giữ thay đổi trên máy** chỉ giữ bản sửa trên trình duyệt này, không cập nhật file.

Nếu ứng dụng hiển thị **Chưa thể lưu vào Excel** hoặc vô hiệu hóa nút lưu, đừng coi bản nháp là đã lưu. Có thể tải/giữ phần sửa trên máy hoặc sửa trực tiếp file Excel rồi đọc lại. Hủy bản nháp bỏ phần chưa lưu; dữ liệu nguồn không đổi.

## Hai thao tác có chiều dữ liệu khác nhau

**Lưu dữ liệu vào Excel** là chiều **app → Excel**. Main v6 đã có backend và trạng thái kết nối được kiểm; UI chỉ báo lưu thành công sau khi server đọc lại file và xác nhận. Ghi dùng ETag/CAS để từ chối nguồn đã đổi. Save/readback trên bản sao đã pass, còn main UI mới được kiểm kết nối/sẵn sàng; không coi main đã ghi nguồn thật.

HTML độc lập hoặc bản HTML tải về không có `google.script.run` nên chỉ giữ nháp trên browser; không thể dùng để ghi Excel. Nháp cũ trên HTML không tự chuyển sang nguồn/app Google; hãy đối chiếu và nhập lại nếu cần. Bằng chứng UI save/readback hiện có thuộc `PrivateExcelTestHost.gs` và fixed private copy trong project thử; không phải ghi nguồn chính.

**Đọc lại dữ liệu và danh mục từ Google** là chiều **Google → app**. Lệnh này nạp lại nội dung nguồn và cấu hình/danh mục theo phạm vi được phép; nó không lưu nháp vào Excel. Lưu danh mục/bố trí dùng chung là một luồng riêng, không thay đổi các dòng nghiệp vụ trong file Excel.

## Khi thao tác lưu báo lỗi

- Nếu backend chưa bật, nút lưu bị khóa hoặc thông báo cho biết chưa thể lưu vào nguồn. Giữ nháp trên browser hoặc cập nhật trực tiếp Excel.
- Nếu báo xung đột, file đã thay đổi trong lúc sửa. Đọc lại nguồn, đối chiếu với nháp rồi quyết định chỉnh lại.
- Nếu timeout hoặc phản hồi chưa xác định, giữ bản sửa và đọc lại file trước khi thử lần khác. Hệ thống dùng receipt để đối soát và không tự gửi lại cả lần ghi một cách mù quáng.
- Nếu thiếu quyền Drive/registry hoặc kho sao lưu không hợp lệ, dừng ở thông báo lỗi; việc truy cập nguồn đọc được không chứng minh quyền ghi đã có.

Tham khảo [hợp đồng API](API.md), [bản đồ mã](REPO_MAP.md), [CURRENT_STATE](CURRENT_STATE.md) và [đồng bộ cấu hình](DONG_BO_CAU_HINH.md) để xem giới hạn và trạng thái triển khai. Candidate local hoặc test trên bản sao không xác nhận đã ghi thành công trong app đang mở.

## Tính năng bổ sung 0.7.1 — đang kiểm thử trên PR #3

**Lưu nhiều mẫu giao diện cá nhân.** Trong Danh sách, nhập tên mẫu rồi bấm **Lưu mẫu mới**. Một mẫu gồm cách bố trí cột đang hiển thị, tìm kiếm, bộ lọc, lọc riêng từng cột và quy tắc màu. Chọn mẫu bằng hộp **Mẫu giao diện** để nạp lại. Các nút Cập nhật mẫu/Xóa mẫu áp dụng cho mẫu đang chọn. Tối đa 20 mẫu **trên chính trình duyệt**; không tự xuất hiện trên thiết bị khác, không thay đổi bố trí chung.

**Lọc từng cột.** Nhấn biểu tượng lọc nhỏ trên tiêu đề cột; nhập một phần giá trị cần tìm (hỗ trợ tiếng Việt không dấu). Các lọc kết hợp với nhau và với bộ lọc hiện có. Dải **Đang lọc theo cột** cho biết cột/giá trị nào đang lọc; nhấn × để bỏ từng lọc hoặc Bỏ tất cả lọc cột. Không sửa dữ liệu gốc.

**Đổi màu theo điều kiện.** Trong Tùy chỉnh danh sách, mở phần Màu theo điều kiện; chọn cột, nhập giá trị chính xác cần so sánh và màu. Có tối đa 30 quy tắc; dòng được tô bằng quy tắc đầu tiên phù hợp. Chỉ là màu hiển thị trong trình duyệt, không định dạng trực tiếp Excel/Sheets.

**Dành cho quản trị:** sau khi đăng nhập Google bằng tài khoản quản trị, trong ⚙ Tùy chọn chọn **Thay đổi và phê duyệt (quản trị)**. Trang này liệt kê nội dung mới, không còn và các ô đổi giá trị so với mốc đã duyệt. Bấm **Phê duyệt** và xác nhận để lưu snapshot hiện tại thành mốc mới (có revision, thời gian và lịch sử tối đa 20 metadata). Từ lần đọc dữ liệu tiếp theo, so sánh bắt đầu từ mốc mới. Không phê duyệt nếu chưa đọc thành công dữ liệu, có 0 dòng hoặc còn nháp.

**Khóa sửa trong WebApp.** Ngay trên trang phê duyệt, quản trị chọn **Khóa sửa trên WebApp** hoặc **Mở sửa trên WebApp**. Khi khóa, khách không được sửa thử trong ứng dụng, nhưng vẫn xem/lọc. Đây **không** phải cài đặt bảo vệ phạm vi hoặc quyền chỉnh sửa trực tiếp trong file Google Sheets; quyền sửa nguồn phải quản lý tại Google.

**Điều kiện kích hoạt:** PR #3 chưa phải production; các chức năng phê duyệt và khóa sửa yêu cầu Rules RTDB mới được kiểm tra và triển khai riêng. Mốc GitHub để hoàn nguyên phần mềm: `backup/pre-features-2026-10-16`; không dùng code rollback để khôi phục dữ liệu.

