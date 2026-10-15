# Kế hoạch viết lại Dashboard tổng hợp nội dung trình HĐND

Phiên bản kế hoạch: 1.19 · Ngày: 15/10/2026 · Mục18.16: Firebase Pages đã được giao triển khai local; chưa được push/deploy/đổi dữ liệu thật. Main Google0.6.2/v6 vẫn như CURRENT_STATE.

## 1. Định hướng

**Tối ưu cả cách phát triển lẫn cách sử dụng.** Một app gọn không nhất thiết có ít file; điều quan trọng là mỗi file có nhiệm vụ rõ, mỗi quy tắc nghiệp vụ có một nơi định nghĩa, và thao tác thường dùng cần ít bước.

Giữ các giá trị tốt: danh mục nội dung đầy đủ; phân công rõ; ba nhóm báo cáo; xem chi tiết từ số tổng hợp; tìm kiếm không dấu; sửa dạng bảng; xuất dữ liệu và lịch sử. Giải pháp mới phải đạt các giá trị đó bằng kiến trúc và quy trình dữ liệu nhất quán.

## 2. Những điểm của bản cũ cần thay đổi

| Hiện trạng quan sát từ mã | Hệ quả | Phương án mới |
|---|---|---|
| HTML chính khoảng 5.781 dòng, chứa giao diện, danh mục, lưu dữ liệu và xuất file | Khó tìm vị trí sửa; một thay đổi ảnh hưởng nhiều phần | Tách theo tính năng; sơ đồ chức năng → file; phần tính toán độc lập với giao diện |
| Babel biên dịch JSX trong trình duyệt; Tailwind và thư viện lõi tải từ CDN | Có thêm công việc và phụ thuộc mạng khi mở app | Biên dịch khi đóng gói; CSS tạo sẵn; phiên bản phụ thuộc được khóa |
| Mỗi nơi tự nhận diện NQ/BC bằng ID hoặc chuỗi; KPI và bảng có tiêu chí hoàn thành khác nhau | Có thể lệch số liệu | Một mô hình loại nội dung, trạng thái và bộ hàm thống kê dùng chung |
| Pivot chỉ tính các cột hiện; trạng thái chưa có trong cấu hình có thể không vào tổng | Ẩn cột hoặc thêm trạng thái có thể làm tổng mất nội dung | Tổng tính từ toàn bộ tập dữ liệu; tách tổng, số đang hiển thị và nhóm chưa ánh xạ |
| Bản local được ghép đè cả dòng lên bản từ Sheets | Giá trị cũ có thể che thay đổi từ người khác | Máy chủ giữ bản chính; local chỉ giữ cache đọc và bản nháp có phiên bản gốc |
| Sửa ô gửi ngay lên Sheets nhưng khi thoát có lựa chọn hủy toàn phiên chỉ phục hồi local | Ý nghĩa lưu/hủy không nhất quán | Ô sửa là bản nháp; Lưu thay đổi mới ghi máy chủ; Hủy chỉ bỏ bản nháp chưa gửi |
| ID mới có nơi sinh theo số lượng dòng; nơi khác sinh lại khi tải | Dễ trùng, khó truy vết | ID nội bộ ổn định do máy chủ tạo; mã hiển thị cũ được bảo toàn |
| Khi số dòng tải về giảm, app suy đoán do Filter và khóa cập nhật | Giảm dữ liệu hợp lệ cũng bị chặn | Đọc vùng dữ liệu trực tiếp phía máy chủ; phân biệt lỗi đọc, rút và xóa theo thông tin xác định |
| Hai bộ Apps Script có giao thức khác nhau; nhánh `sync_all` gọi hàm không có trong file | Khó chọn đúng bản triển khai | Một giao thức, một bộ server; kiểm thử hợp đồng API và ghi rõ phiên bản |
| Danh mục, lãnh đạo và ánh xạ tên cũ nằm trong mã giao diện | Đổi nhân sự phải sửa code; dễ áp nhầm tên | Danh mục có mã và nhãn; quản trị trên app; chuyển đổi tên cũ qua bảng đối chiếu có rà soát |
| Lịch sử nằm chủ yếu ở trình duyệt; backup JSON dồn vào một ô Excel | Khó chia sẻ lịch sử; backup có thể quá lớn | Lịch sử trung tâm; JSON backup có phiên bản; Excel lưu metadata theo nhiều dòng |

Đây là phân tích thiết kế từ mã nguồn, chưa phải kết quả đo thời gian tải hoặc kiểm thử app đang chạy.

## 3. Công nghệ và cách triển khai đề xuất

**Phát hành giai đoạn 1 là một tệp HTML duy nhất trên Google Drive; mã nguồn vẫn chia nhiều module TypeScript/React/Vite.** Người xem mở hoặc tải HTML bằng trình duyệt; để đọc Sheets họ cần mạng và quyền đọc nguồn dữ liệu. Không cam kết Drive preview tự thực thi HTML. Giai đoạn đầu dự kiến 2–3 người xem và 20–30 người nhập trực tiếp trong Sheets; về sau 20–50 người và phần lớn thao tác qua app là mục tiêu mở rộng cần kiểm chứng.

Giữ các module giao diện, domain và adapter độc lập. HTML phát hành được đóng gói một tệp, chứa core JavaScript và CSS; phát triển vẫn dùng cấu trúc module. Chi tiết tại [Kiến trúc](ARCHITECTURE.md).

Vite cung cấp môi trường phát triển và đóng gói; việc chia giao diện theo thành phần phù hợp với hướng dẫn của React. Đây là lựa chọn cho dự án này, không phải khẳng định rằng đổi framework tự động làm app nhanh hơn. [Vite](https://vite.dev/guide/), [React](https://react.dev/learn/thinking-in-react).

Giai đoạn 1 đọc Google Sheets bằng adapter GViz JSONP chỉ đọc. Adapter này không cung cấp ghi từ app. Tests/benchmark dùng demo repository để không cần dữ liệu thật; bản 0.2.0 mặc định đọc nguồn cụ thể người dùng yêu cầu kết nối. Apps Script với `google.script.run` không ưu tiên giai đoạn 1 vì buộc phải host ứng dụng trên Google; giữ server-side write cho giai đoạn sau, sau khi xác thực người dùng/quyền và hợp đồng ghi được thiết kế, thử nghiệm.

Bản thử 0.1.0 chọn Preact compat để đóng gói nhẹ; nguồn vẫn dùng TypeScript/TSX và API tương thích React. Quyết định chỉ cho prototype đã thử các luồng cơ bản; giữ build React để kiểm tra lại khi thêm chức năng. Bằng chứng/giới hạn xem [ADR 001](decisions/001-single-html-prototype.md).

HTML một tệp phải mở được bằng browser và không cần Node.js khi sử dụng. Build cần toolchain Node/Vite ở máy phát triển. Giai đoạn 1 chưa có Excel. Onefile và tải thư viện Excel theo nhu cầu không mặc định tương thích đồng thời: một spike sau này sẽ cân nhắc nhúng thư viện vào HTML hoặc lazy-load từ CDN với thông báo phụ thuộc mạng, dung lượng và lỗi tải. Đọc Sheets cũng cần mạng; không hứa trải nghiệm dữ liệu offline.

Giai đoạn 1 production artifact duy nhất là HTML share trên Drive, cùng cơ chế đọc Sheets JSONP. Chỉ xem xét ghi từ app ở giai đoạn sau qua server có xác thực; không dùng endpoint ghi công khai hoặc coi quyền xem Drive là quyền sửa dữ liệu qua app.

Apps Script có hạn mức, không phù hợp mọi quy mô. Đo với số bản ghi, số người sử dụng và số lượt ghi thực tế trước khi chốt; nếu không đạt, đổi lớp lưu trữ, không viết lại giao diện. [Google: quotas](https://developers.google.com/apps-script/guides/services/quotas).

## 4. Trải nghiệm sử dụng mới

Chia thành bốn khu vực, dùng thanh điều hướng đơn giản:

1. **Tổng quan:** KPI, ba bảng báo cáo mặc định, phân nhóm, xem chi tiết và in.
2. **Danh sách nội dung:** tìm kiếm, bộ lọc, chỉnh sửa, bản nháp, trạng thái lưu và nhập/xuất.
3. **Cấu hình:** gom bảng báo cáo, bảng danh sách, danh mục & phân công, nguồn dữ liệu, nhập/xuất & sao lưu và lịch sử. Mở từ ⚙ Tùy chọn, vào chế độ riêng; không đặt nút tùy chỉnh tại mỗi bảng ở màn hình xem. Xem mục 14 và ARCHITECTURE mục 17.
4. **Trợ giúp:** hướng dẫn theo thao tác, lỗi thường gặp, phiên bản và đầu mối quản trị.

Nguyên tắc giao diện:

- Chế độ xem mặc định gọn; chức năng quản trị đặt trong khu vực cấu hình.
- Tìm kiếm và bộ lọc chung có thể dùng lại ở danh sách và cửa sổ chi tiết.
- Cửa sổ soạn thảo dành cho nội dung dài; ô danh mục dùng một bộ chọn chung.
- Hiển thị rõ: đang sửa, chưa lưu, đang lưu, đã lưu, lỗi hoặc xung đột.
- Phím Esc đóng bộ chọn/cửa sổ hiện tại theo thứ tự; bản nháp chưa lưu được bảo vệ.
- Toàn màn hình bảng là mở rộng trong trang, không bắt buộc dùng fullscreen API của trình duyệt.
- Có thể thao tác bằng bàn phím; màn hình nhỏ vẫn đọc và sửa nội dung được.

## 5. Quy tắc dữ liệu phải cải tiến ngay

- Mỗi nội dung có ID ổn định, loại NQ/BC rõ ràng, trạng thái chuẩn và thông tin phân công.
- `Rút/Không trình nữa` là thuộc tính loại khỏi báo cáo; không đồng nhất với câu chữ `Sở xin rút` trong một bước xử lý.
- Nội dung rút vẫn tra cứu, phục hồi và xem lịch sử được. Thao tác xóa của bản cũ được chuyển thành lưu trữ có thể phục hồi; không mất chức năng loại khỏi danh sách làm việc.
- Khi có bản nháp, làm mới dữ liệu không ghi đè phần đang sửa; thông báo khi dữ liệu gốc thay đổi.
- Máy chủ kiểm tra dữ liệu và quyền trước khi lưu; không tin tên trường hoặc danh tính do trình duyệt gửi lên.
- Tổng, tỷ lệ hoàn thành và danh sách chi tiết cùng dùng một tập dữ liệu và một quy tắc. Bộ lọc chỉ thay đổi phạm vi tính; ẩn cột chỉ thay đổi trình bày.
- Lịch sử ghi tập trung theo thao tác đã lưu; hủy bản nháp không tạo lịch sử nghiệp vụ giả.
- Cấu hình dùng chung và lựa chọn cá nhân phải tách rõ. Tên đơn vị/nhân sự không dùng làm khóa.

Chi tiết kiến trúc nằm trong [ARCHITECTURE](ARCHITECTURE.md).

## 6. Các giai đoạn và điều kiện hoàn thành

| Giai đoạn | Công việc | Sản phẩm và điều kiện qua bước |
|---|---|---|
| 0 — Chốt nghiệp vụ | Lập ma trận chức năng; xác định trạng thái; khảo sát số dòng, người dùng, cách sửa Sheets và bản local; tổ chức AGENTS/SYSTEM/FEATURES và chỉ mục tài liệu | Danh sách nghiệp vụ, dữ liệu mẫu đã bỏ thông tin cần bảo vệ; mọi điểm khác bản cũ có lý do; quy định nguồn tài liệu chuẩn |
| 1 — Thử kiến trúc | Build React/Vite thành HTML đơn; mở/tải bằng browser; đọc bản sao Sheets qua GViz JSONP; demo repository local; đo độ trễ và kiểm tra quyền đọc | Một artifact HTML đọc được và bản demo local chạy; giới hạn Drive preview/permission được ghi. Không có luồng ghi từ app trong giai đoạn này |
| 2 — Nền tảng dữ liệu | Schema, repository, chuẩn hóa, xác thực, bản nháp, kiểm tra xung đột, lịch sử, chống ghi trùng | Lưu đúng và có thể phục hồi sau timeout; hai người sửa không âm thầm ghi đè |
| 3 — Danh sách làm việc | Tìm kiếm, lọc, sửa ô/nội dung, danh mục, thêm, rút, lưu trữ, cấu hình cột và độ rộng | Hoàn thành các mục tương ứng trong ma trận; tài liệu thao tác đi kèm |
| 4 — Tổng hợp và cấu hình | KPI, ba bảng mặc định, bộ tính tổng chung, xem chi tiết, thêm/sắp xếp/ẩn bảng, mapping, in | Đối chiếu với dữ liệu chuẩn; ẩn cột và trạng thái lạ không làm mất tổng |
| 5 — Xuất/nhập và trợ giúp | Excel, JSON, lịch sử, backup/restore, đọc backup cũ, trang trợ giúp | Backup phục hồi được; nhập có xem trước và báo cáo lỗi; hướng dẫn đủ dùng |
| 6 — Chạy song song và chuyển đổi | Kiểm thử, đo hiệu năng, đối chiếu, hướng dẫn quản trị, chuyển đổi có mốc rõ | Đủ ma trận; các chênh lệch được giải thích; có bản phát hành và kế hoạch quay lại |

Tài liệu được viết cùng tính năng. Quy mô và hướng nhập trực tiếp Sheets đã được người dùng nêu; quyền triển khai và quy trình mở HTML vẫn cần kiểm chứng. Revision 1.6 bổ sung mốc 1B hoàn thiện xem/tùy chỉnh và xuất snapshot trước các giai đoạn ghi 2–3; giai đoạn 4–5 được tách phần không cần ghi để không phải chờ backend. Chưa bỏ yêu cầu nào trong F01–F36.

## 7. Chuyển đổi từ app cũ

1. Sao lưu Sheets, xuất Excel kèm lịch sử và xuất cấu hình JSON từ bản cũ. Bản local có thể khác Sheets: thu thập từ từng trình duyệt còn dùng và đối chiếu riêng.
2. Chuyển đổi trên bản sao. Bảo toàn mã cũ; bổ sung ID nội bộ; lập báo cáo dòng thiếu ID/trùng ID, trường không nhận diện, trạng thái chưa ánh xạ và phân công bất nhất.
3. Nhập bảng cấu hình, droplist, quan hệ chuyên viên–phòng và lịch sử có thể đọc được. Lịch sử cũ không có người sửa được ghi nguồn `legacy`, không tự gán danh tính.
4. Không đổi tên người hoặc suy ra loại văn bản chỉ theo tiền tố ID khi có dữ liệu mâu thuẫn. Trường mơ hồ cần được rà soát trong báo cáo chuyển đổi.
5. So sánh số lượng NQ/BC, số đang trình/rút/lưu trữ, từng trạng thái, từng đơn vị/phòng/lãnh đạo và mẫu nội dung dài. Không lấy số liệu sai của app cũ làm tiêu chuẩn nếu nó bỏ trạng thái hoặc cột.
6. Chạy bản mới trên bản sao; tại mốc chuyển đổi dừng ghi ở bản cũ, sao lưu cuối và chuyển phần chênh lệch. Không cho hai hệ thống đồng thời ghi một nguồn theo hai giao thức khác nhau.
7. Quay lại bằng snapshot và nhật ký sau mốc chuyển đổi; đối chiếu trước khi phục hồi. Không lấy snapshot cũ ghi đè các thay đổi hợp lệ phát sinh ở bản mới.

## 8. Tiêu chí nghiệm thu

- Mọi chức năng trong [ma trận](MA_TRAN_CHUC_NANG.md) có kết quả kiểm tra hoặc ghi rõ thay đổi tương đương.
- Dữ liệu không mất khi làm mới, rút, lưu trữ, nhập hoặc có lỗi mạng; lịch sử khớp thay đổi được xác nhận.
- Tìm kiếm trên dữ liệu thử 1.000 dòng có phản hồi mục tiêu dưới 200 ms sau khi dữ liệu đã tải, đo trên máy/trình duyệt người dùng. Đây là mục tiêu phải đo, chưa phải kết quả.
- Chỉ render một trang danh sách mặc định 50 dòng; thử thêm mức 5.000 dòng để tìm giới hạn, không mặc định hứa hỗ trợ quy mô chưa đo.
- JS lõi + CSS mục tiêu không quá 350 KiB khi nén; đây là mục tiêu chưa đo. Giai đoạn 1 chưa có Excel. Ghi dung lượng HTML thực tế, thời gian khởi tạo và độ trễ đọc Sheets ở môi trường phát hành.
- Có bộ dữ liệu kiểm tra NQ/BC mâu thuẫn, trạng thái lạ, cột ẩn, bản ghi rút, trùng ID, văn bản dài và ký tự tiếng Việt.
- Hướng dẫn bắt đầu, cấu trúc, chức năng, dữ liệu, sửa chữa, triển khai và phục hồi đều được đối chiếu với phiên bản phát hành.
- Một người bảo trì có thể tìm đúng file cho thay đổi tên cột, trạng thái, báo cáo, đồng bộ hoặc xuất Excel thông qua chỉ mục, không phải đọc toàn bộ mã.

## 9. Quyết định còn phải kiểm chứng

| Điểm cần kiểm chứng | Giả định để lập kế hoạch | Cách chốt |
|---|---|---|
| Tài khoản và phạm vi chia sẻ | App nội bộ, người xem và người sửa có danh sách được phép | Đọc HTML qua Drive và đọc Sheets qua GViz cần mạng/quyền đọc nguồn; thử phạm vi chia sẻ, không đồng nhất quyền đó với xác thực ghi từ app |
| Chỉnh trực tiếp trên Sheets | Cần đọc được thay đổi trực tiếp, nhưng không coi Sheets là cơ sở dữ liệu giao dịch | Chốt cột nào được sửa trực tiếp, cách nhập và giới hạn đảm bảo xung đột |
| Quy mô | Danh mục nhỏ/vừa, nhóm người dùng hạn chế | Khảo sát và đo thực tế trước khi khóa ngân sách hiệu năng |
| Nhịp làm mới | 60 giây khi trang đang hoạt động, có nút làm mới | Điều chỉnh theo nhu cầu và hạn mức đã đo |
| Excel với artifact onefile | Chưa có ở giai đoạn 1 | Khi có nhu cầu, spike so sánh nhúng thư viện vào HTML với lazy CDN có phụ thuộc mạng; đo dung lượng và kiểm tra lỗi tải |

Các điểm trên không ngăn việc chuẩn hóa nghiệp vụ và tổ chức mã nguồn, nhưng cần được giải quyết trước khi triển khai sản xuất.

## 10. Bổ sung cách quản lý tài liệu dự án

Áp dụng các giá trị phù hợp từ danh sách tài liệu do người dùng cung cấp: quy tắc làm việc cho AI; chuẩn nghiệp vụ; chuẩn kiến trúc; bản đồ mã; danh mục tính năng; tình trạng đã kiểm chứng và chỉ mục dẫn đường. Không đưa các thành phần như Worker hoặc quy ước phiên bản thư mục của dự án khác vào chỉ vì có trong mẫu.

Quy hoạch gọn: `AGENTS.md` ở gốc; `SYSTEM.md`, `ARCHITECTURE.md`, `CURRENT_STATE.md`, `REPO_MAP.md`, `FEATURES.md` và `README.md` trong `docs/`. Cụ thể nội dung, nguồn chuẩn, thời điểm tạo và cách chuyển tài liệu đang có nằm tại [Tài liệu và bàn giao](TAI_LIEU_VA_BAN_GIAO.md).

- **Tạo ngay:** `docs/README.md` dẫn đường và `docs/CURRENT_STATE.md` ghi đúng việc đã làm/chưa kiểm chứng.
- **Giai đoạn 0:** viết `AGENTS.md` ngắn; gộp tổng quan và quy tắc nghiệp vụ vào `SYSTEM.md`; chuyển ma trận hiện có thành `FEATURES.md`, giữ mã F01–F36.
- **Giai đoạn 1:** chuyển thiết kế kỹ thuật hiện có thành `ARCHITECTURE.md`; phân biệt quyết định đã chốt và giả định đang thử. Lập `REPO_MAP.md` từ cấu trúc thực tế, có quy tắc đặt file và bảng sửa tính năng → file.
- **Mỗi thay đổi:** cập nhật tài liệu chịu trách nhiệm cho thông tin đó; `CURRENT_STATE` chỉ ghi kết quả thực tế và bằng chứng. Không dùng kế hoạch như bản xác nhận chức năng đã hoàn thành.
- **Chưa tách riêng:** `REPOSITORY_LAYOUT.md` được gộp vào `REPO_MAP.md`; `WORKBOARD.md` chỉ tạo khi xuất hiện nhiều người/luồng công việc cần phân công và theo dõi phụ thuộc. Hiện dùng lộ trình trong kế hoạch và mục công việc kế tiếp ở `CURRENT_STATE`.

Khi chuyển tên/gộp tài liệu, di chuyển nội dung và sửa liên kết trong cùng thay đổi; không để hai bản đầy đủ cùng được coi là chuẩn. Các file lập kế hoạch được giữ làm căn cứ thiết kế và dẫn tới chuẩn mới, không tiếp tục sao chép cấu trúc/hành vi hiện hành.

## 11. Mốc triển khai và phát sinh ngày 13/10/2026

Mốc 0.1.0 đã tổ chức chuẩn tài liệu và dựng prototype dữ liệu giả: tổng quan, tìm/lọc, sửa nháp và HTML độc lập. Mốc 0.2.0 thêm adapter Sheets chỉ đọc và cấu hình link theo mục 12. Chưa đóng toàn bộ giai đoạn 1: còn kiểm chứng quyền những người nhận file và mở file theo quy trình Drive thật. Kết quả/số đo tại [CURRENT_STATE](CURRENT_STATE.md), [báo cáo kiểm tra](KIEM_THU_VA_NGHIEM_THU.md).

- Một HTML cho người xem; module và tài liệu cho người phát triển.
- Nhập giai đoạn đầu ở Sheets, app đọc; luồng ghi chỉ thử trên mock, không đưa ra sản xuất.
- Chọn Preact compat cho prototype sau so sánh cùng source và kiểm tra UI; chưa suy ra hiệu năng toàn bộ app.
- Thay plugin có cảnh báo phụ thuộc bằng script đóng gói nhỏ; kiểm cú pháp bundle và đúng một file, không ép đổi phiên bản để che lỗi.
- Thay confirm native bị kẹt trong browser kiểm tra bằng hộp xác nhận trong app; giữ bảo vệ nháp.
- WORKBOARD gọn đã tạo vì giao Luna các phần đơn giản song song; tổng chỉ huy review và tích hợp, đúng điều kiện mục 10.

Tiếp theo: kiểm chứng chia sẻ/mở HTML và đối chiếu số liệu nguồn → chức năng còn lại theo ma trận. Không nghiệm thu toàn bộ app chỉ bằng demo hoặc test tự động.

## 12. Phát sinh tùy chọn link nguồn — revision 1.5

Người dùng yêu cầu thêm tùy chọn kết nối và cung cấp file Sheets hiện tại. Giữ một HTML cho người xem; không thêm backend/dependency chỉ để đổi link. Nguồn mặc định: `https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344`. Gid lấy theo cấu hình app cũ và kiểm tra trên nguồn người dùng chỉ định.

- Tab Kết nối dữ liệu nhập URL/gid; chỉ chấp nhận link Google Sheets HTTPS đúng host/path và gid số. Kiểm tra đọc thử không thay nguồn. Kết nối đọc/parse thành công mới lưu và đổi nguồn; lỗi giữ nguồn đang dùng.
- Lưu cấu hình riêng trên browser, không nhúng bản ghi vào HTML. Chọn link ở một máy không tự đổi cấu hình mọi người; nếu cần nguồn chung đổi đồng loạt sẽ bổ sung cơ chế cấu hình chung sau, không tự xây ở mốc này.
- Đọc A–P qua GViz; giữ/cảnh báo dòng thiếu-trùng mã hoặc loại mơ hồ. Không ghi Sheet, không đổi chia sẻ; chưa OAuth. Nguồn riêng tư cần phương án xác thực trước khi dùng.
- App đọc khi mở, có Làm mới và chu kỳ 60 giây khi tab hiện. Giữ lần đọc thành công gần nhất khi lỗi; thay nguồn không để snapshot/phản hồi nguồn cũ lẫn vào nguồn mới. Cần đo lại polling khi tăng người dùng.
- Dữ liệu mẫu là tùy chọn riêng; các nút sửa/lịch sử mẫu ẩn với nguồn thật và tầng state/repository cũng chặn ghi. Key dòng trong snapshot chỉ để đọc, không thay cho ID ổn định cần có trước khi phát triển ghi.
- Tổng chỉ huy tích hợp/review/kiểm chứng; Luna xử lý cấu hình, panel, tests parser và hai hướng dẫn. Cập nhật FEATURES F30/F32, ARCHITECTURE, REPO_MAP, CURRENT_STATE, WORKBOARD và test report cùng mốc.

Kết quả 0.2.0 và 51 nội dung tại lượt đọc thử được ghi ở CURRENT_STATE. Đó là mốc tích hợp đọc, không phải số dòng cố định hoặc nghiệm thu toàn bộ app. Mở HTML thật từ Drive và quyền từng người nhận file vẫn là điểm kiểm chứng kế tiếp.

## 13. Rà đủ tính năng cũ và gom tùy chỉnh — revision 1.6

Theo yêu cầu mới, đã đối chiếu HTML cũ đang dùng và hai bộ script với source 0.2.0; bảng từng F01–F36 và dòng mã chứng minh nằm tại [CURRENT_STATE](CURRENT_STATE.md). Chỉ đọc mã, không xác nhận bộ server nào đang deploy. Bản mới hiện chưa thay thế đầy đủ: tùy chỉnh báo cáo/danh mục/độ rộng/lịch sử/Excel còn thiếu nhiều; luồng sửa mẫu không là ghi thật.

Giữ một điểm cấu hình cho mỗi đối tượng; theo revision 1.7, mở từ nhóm ⚙ Tùy chọn và vào chế độ riêng. Editor báo cáo có Trình bày, Dữ liệu, Cột, Quy tắc tính; mỗi phần có preview/Lưu/Hủy/reset. Mọi điều chỉnh đã cam kết phải có control UI, kể cả từ khóa/cờ hiển thị cũ vốn chỉ có trong JSON. Chi tiết kiến trúc ở mục 17 ARCHITECTURE; FEATURES đã bổ sung các chi tiết trước đây chưa rõ: sáu trường chia cột, tỷ lệ từng dòng, mô tả cấp TU, 11 danh mục gồm tiến độ cụ thể và khả năng hiển thị đủ 16 cột.

### Thứ tự bổ sung sau rà soát

| Mốc | Phạm vi | Điều kiện qua bước |
|---|---|---|
| 1A — kiểm chứng đọc | Mở một HTML theo Drive/browser; đối chiếu số liệu và nhãn TU/trạng thái | Không mất dòng/tổng/chi tiết; quyền nguồn và giới hạn môi trường rõ |
| 1B.1 — cấu hình báo cáo đầy đủ | Metadata/schema/version/source scope; một editor; F02–F11, F28/F34 phần cấu hình; tỷ lệ dòng/mô tả TU | Tạo/đổi source/trục/nhãn/cột/rule/title/thứ tự/ẩn/reset; preview, lưu mở lại, JSON lỗi an toàn; không sửa Sheet |
| 1B.2 — danh sách xem đầy đủ | STT và mọi cột A–P; F06/F13/F21–F22; cột/độ rộng/mở rộng và chi tiết | Một bảng, tùy chọn gọn nhưng mở đủ; giữ qua mở lại; không trộn cấu hình nguồn; bàn phím/màn hình nhỏ |
| 1B.3 — in và xuất | F29, F25 phần dữ liệu đọc; JSON cấu hình đã ở 1B.1 | In nhiều trang; Excel đủ A–P; nguồn/time/phạm vi; chỉ xuất lịch sử thật khi có, không dùng history mock |
| 2 — nền tảng ghi | IDs/migration/auth/repository/revision/audit, F31/F36 | Thử trên bản sao; hai người sửa/timeout/lỗi từng phần; không ghi đè âm thầm |
| 3 — nhập liệu & danh mục | F14–F20/F23–F24, quản lý 11 danh mục và quan hệ, thêm/rút/lưu trữ/khôi phục | Có quyền/ID stable/xem trước thay hàng loạt; Lưu/Hủy đúng; hướng dẫn dữ liệu thật |
| 5–6 — nhập/backup/chuyển đổi | F26–F27/F33–F34 còn lại; compatibility Excel/JSON cũ và đối chiếu | Import/restore preview, backup phục hồi và đủ ma trận; nghiệm thu riêng từng Fxx |

Đây là thứ tự điều chỉnh, không phải lịch hoàn thành hay báo cáo đã triển khai. Danh mục nghiệp vụ không đổi bản ghi thật qua cấu hình local. Chức năng chưa có nằm trong trạng thái và kế hoạch, không dựng nút giả để giao diện có vẻ đầy đủ.

### Những cách làm cũ không kế thừa

- Không cắt bảng mới ở sáu trạng thái hoặc tính tổng chỉ trên cột hiện. Tùy chỉnh nhãn/màu/ẩn/thứ tự là trình bày, không làm mất bản ghi.
- Không hard-code đổi tên lãnh đạo hoặc gộp tiến độ khác cấp thành hoàn thành; chuẩn hóa có bảng đối chiếu/xem trước và giữ giá trị gốc.
- Không Hủy local sau khi ô đã ghi thật; không dùng số dòng làm ID ghi; không cache cả dòng đè thay đổi mới của Sheets.
- Không dùng JSON trong một ô Excel làm định dạng backup mới; vẫn có reader file cũ. JSON cấu hình cũ khác full-data backup; phân quyền/server audit là cải tiến mới, không giả định bản cũ đã có.

Tổng chỉ huy review nghiệp vụ/thiết kế/trạng thái, Luna xử lý inventory và các phần UI/test/docs đơn giản được giao. Mỗi mốc cập nhật đúng nguồn tài liệu và kiểm tra theo tiêu chí; không suy ra đủ chức năng từ tên menu.



## 14. Chế độ xem mặc định, cấu hình trong nhóm riêng — revision 1.7

Chỉ đạo mới: phần tùy chỉnh gom gọn, không lộ control chỉnh sửa ở màn hình xem; muốn chỉnh phải chủ động mở nhóm rồi vào chế độ riêng. Thay phương án nút Tùy chỉnh cạnh từng bảng bằng bánh răng nhỏ ở header. Tìm/lọc/phân nhóm và In/PDF là thao tác xem, vẫn dùng bình thường.

Mốc 0.3.0 bổ sung phần bố trí của 1B.1: tên, vị trí, ẩn/hiện ba bảng, chọn cột báo cáo, nháp/Lưu/Hủy/reset và preview, lưu riêng theo source/browser. Tùy chỉnh danh sách và kết nối đi qua nhóm riêng; không mở chức năng ghi Sheets. Danh sách hiện chỉ giữ lựa chọn cột giữa hai chế độ của cùng bảng, chưa có lưu bền.

Luna làm panel tên/thứ tự/hiển thị và hai hướng dẫn; tổng chỉ huy viết schema/storage/state, ghép UI, kiểm nghiệp vụ và browser. Phát sinh Esc nhập nhanh có thể đọc trạng thái cũ: đã dùng ref cập nhật trong render, kiểm lại yêu cầu xác nhận bỏ nháp. Không thêm dependency. Bằng chứng chuẩn ở CURRENT_STATE và báo cáo kiểm tra; đây chưa là editor báo cáo đầy đủ hoặc hoàn tất F08–F11.

Tiếp tục 1B.1 theo phần còn thiếu: định dạng tiêu đề, nguồn/trục và mapping, thêm/xóa bảng, JSON cấu hình; triển khai từng mốc sau kiểm các bất biến. Không đưa các nút chưa hoạt động vào nhóm tùy chọn.

## 15. Bổ sung theo yêu cầu 0.4.0 — revision 1.8

Giữ màn hình xem gọn; khi vào chế độ riêng, đặt control sát bảng thực tế để thấy ngay thay đổi. Bổ sung thứ tự cột, ID riêng dạng NQ01, độ rộng từng cột/khung chung, 11 danh mục và quan hệ chuyên viên–phòng. Bảo vệ mọi đường thoát editor và tự lưu nháp định kỳ 10 giây là yêu cầu xuyên suốt, không chỉ của dữ liệu.

0.4.0 thực hiện phần bố trí và danh mục cục bộ: report preview cạnh control; cột danh sách A–P/ẩn/thứ tự/resize, khung có cuộn; ID hiển thị không sửa nguồn; danh mục/quan hệ dùng browser/source; các editor và kết nối có ba lựa chọn thoát, checkpoint phục hồi cả form nhập dở. Phạm vi kiểm chứng thuộc CURRENT_STATE, không coi toàn bộ F16/F17/F21/F33 hoàn thành.

Phát sinh xử lý trong mốc: validator phục hồi phải cho phép giá trị đang nhập dở nhưng validator Lưu nghiêm ngặt; nhập tên danh mục chưa bấm Thêm vẫn là nháp; giữ danh mục đang chọn để tránh phục hồi sai nhóm; Esc nhanh đọc ref mới nhất; khi trở về giá trị gốc phải xóa checkpoint cũ; resize không hợp lệ clamp phần preview; chặn rename mục đang dùng và kiểm quan hệ ở cả hai đường Lưu. Nhóm cột dài có vùng cuộn để không đẩy bảng quá xa.

Điều chỉnh thứ tự: làm thử danh mục và quan hệ local sớm để kiểm UI/nhập mẫu; danh mục dùng chung/ID ổn định/thay hàng loạt vẫn ở mốc 2–3 cùng backend quyền/revision. Không thay đổi giai đoạn hiện tại: người dùng cập nhật Sheets, app đọc. Cấu hình cá nhân và nháp không tự đồng bộ giữa người dùng.

Sau mốc này tiếp tục editor report còn thiếu, JSON cấu hình và in/xuất. Kiểm quy trình mở HTML thật trên Drive/browser vẫn là điều kiện riêng của 1A. Tổng chỉ huy kiểm tích hợp/nghiệp vụ/guards/build; Luna thực hiện panel, tests và docs được giao, ghi ở WORKBOARD.

## 16. Cấu hình dùng chung và thao tác bảng — revision 1.10

Quyết định: giữ nguyên Excel và link nhập liệu. Cấu hình catalogs/reports/items dùng kho native riêng, không đặt tab cấu hình vào Excel hoặc chuyển workbook sang link mới. Google app dành cho quản lý cấu hình, một HTML dành cho người xem khi có đủ quyền nguồn/kho. Schema/revision, khóa và commit marker bảo vệ bản chung; nháp local chỉ phục hồi. Hợp đồng tại [ARCHITECTURE](ARCHITECTURE.md), kết quả tại [CURRENT_STATE](CURRENT_STATE.md).

Yêu cầu 14/10 đã triển khai: giữ/kéo header đổi cột, Alt+←/→; nhập độ rộng bảng thực và resize cột, cuộn trong bảng; bấm ô mở picker, chuyên viên tìm không dấu theo quan hệ phòng; Nội dung/Ghi chú có popup Lưu và cảnh báo thoát. Chỉnh nghiệp vụ vẫn chỉ trong mẫu. Nguồn Excel chỉ đọc.

### Phát sinh và phương án đã xử lý

- Bảng bị cảm giác khóa 1500 vì tham số cũ chỉ tác động khung. Đổi sang độ rộng bảng thực, bỏ cap shell ở trang danh sách; độ rộng cơ sở cột và phần dư được giải thích trong control.
- Native HTML drag/drop trong IAB không đổi cột khi thử. Dùng pointer capture, tách resize, giữ keyboard alternative; đã kiểm source và artifact qua HTTP.
- RPC Apps Script gặp lỗi parser URL trước v3: môi trường V8 thiếu API browser. Tách server kiểm nguồn canonical và bỏ parser khỏi core server; test thiếu URL/URLSearchParams và kiểm cloud sau sửa đạt.
- Tài liệu bị ghi nhầm chronology RPC như lỗi tái diễn sau revision 2. Parent đối chiếu UI read/write tới revision 6 và sửa nguồn chuẩn; không giữ kết luận sai. Xem báo cáo kiểm thử để phân biệt bằng chứng giả/thật.
- ANYONE bị duyệt tự động chặn vì phạm vi chưa xác nhận. Dùng USER_ACCESSING + MYSELF. Người dùng chọn giữ kho riêng tiếp tục kiểm thử; không mở quyền, không hỏi lại khi quyết định chưa thay đổi.

### Tiêu chí đã kiểm và phần tiếp theo

Cấu hình ba phần đã đọc/lưu qua RPC thật và đọc lại ở tab thứ hai cùng tài khoản. Stale save bị chặn, nháp giữ nguyên. Tên bảng và độ rộng thử đã trả về ban đầu; thứ tự lãnh đạo theo ảnh được giữ. Số revision/deployment và kích thước hiện hành chỉ ghi tại CURRENT_STATE. Chưa thử nhiều máy/tài khoản, quota, Drive preview, share cấu hình cho người nhận HTML hoặc ghi Excel thật.

Tiếp tục các mốc 1B.1/1B.2 còn thiếu (editor báo cáo đầy đủ, rule/tỷ lệ/migration/nhập xuất theo Fxx). Việc thử riêng cấu hình không đồng nghĩa hoàn thành toàn app hoặc cấp quyền ghi sản xuất. Kiểm thử private tiếp trước khi người dùng quyết định phạm vi sử dụng tiếp theo.

## 17. Phát sinh 14/10/2026 — không lưu tùy chỉnh (0.5.2)

Ảnh người dùng xác nhận lỗi “Chưa thiết lập lưu chung” khi lưu bố trí. Mã có race: vào chỉnh trước lần tải cấu hình đầu tiên khiến kết quả đọc bị bỏ qua. Chặn vào các editor chung cho tới khi có base; lần đọc đầu tiên không bị bỏ vì mở màn khác. Phân biệt loading/empty/error, cho thử tải lại, khóa gửi lưu trùng, không để phản hồi đọc cũ đè kết quả ghi. Lưu vẫn dùng revision gốc; không tự cập nhật base trong lúc sửa hoặc bỏ kiểm xung đột.

Giữ checkpoint khi chỉ xem bảng và khi cấu hình gốc khác; người dùng chọn giữ/bỏ/nạp để đối chiếu trước khi lưu. Nạp nháp không ghi Google. Luna sửa microcopy, modal nháp cho báo cáo/danh mục và hướng dẫn; tổng chỉ huy sửa hook/App, kiểm thử, tích hợp và triển khai.

Mật khẩu trước Settings do người dùng đề xuất đang là phương án thảo luận, chưa triển khai. Mật khẩu kiểm tra chỉ trong HTML không cấp quyền ghi Google; phương án mật khẩu xác minh trên server cần thiết kế phiên/quyền/lượt thử và lựa chọn triển khai riêng. Đợt sửa này giữ Google USER_ACCESSING + MYSELF và kho riêng, không đổi quyền nguồn. Bằng chứng và trạng thái triển khai chuẩn: [CURRENT_STATE](CURRENT_STATE.md).

Đối chiếu bổ sung 14/10: bản cũ có POST ghi update/add/delete/batch trong handler chỉnh; nút Đồng bộ lại là đọc nguồn. Giữ sửa nội dung ngay trên app và lưu ngược nguồn như yêu cầu tương đương F15/F23/F31. Mốc cấu hình không thay luồng này. Khôi phục phải làm rõ nháp/Lưu/Đồng bộ và kiểm ghi nguồn thực tế; code cũ ghi ngầm không được bê nguyên. Bằng chứng chi tiết thuộc CURRENT_STATE; chưa cấp quyền ghi thử nguồn chỉ từ việc rà mã.

## 18. Sửa ô dữ liệu thật và độ rộng khung chứa bảng — dự thảo 14/10/2026

**Trạng thái:** người dùng đã duyệt bằng “ok bạn làm đi”. Đang triển khai và kiểm bản thử 0.6.0. Bằng chứng hoàn thành từng phần thuộc CURRENT_STATE; chưa cấp quyền ghi nguồn sản xuất hoặc thay quyền chia sẻ.

### 18.1. Phạm vi đã được người dùng làm rõ

- Người dùng muốn click ô để sửa dữ liệu nghiệp vụ thật trong chế độ chỉnh, không chỉ thử trên dữ liệu mẫu.
- ID/STT chỉ xem. Nội dung và Ghi chú mở popup văn bản. Các trường danh mục mở droplist, Chuyên viên có search không dấu và lọc theo phòng.
- Độ rộng toàn bảng trong yêu cầu là độ rộng **khung nền trắng chứa phần Bảng dữ liệu**, không chỉ thẻ table bên trong. Khung tối đa bằng phần màn hình còn dùng được; bảng dài cuộn bên trong.
- Chế độ xem mặc định không có editor. Mọi control bố trí để gần bảng trong nhóm thu gọn. Chưa chốt đổi quyền chia sẻ hay cơ chế mật khẩu mới.

### 18.2. Nguyên nhân ở mã hiện tại

ItemList canEdit phụ thuộc customizing && editing && !readOnly; nguồn thật luôn readOnly nên không mount CellPicker/ContentEditor. Cần tách quyền sửa nháp, quyền ghi nguồn và quyền chỉnh bố trí; không chỉ xóa readOnly hoặc đổi flag trong repository để báo có lưu thật.

ItemLayout.tableWidth và input Độ rộng bảng hiện áp vào table. item-list-card/.table-wrap vẫn theo chiều rộng container. Trước đây kiểm bảng2400px không chứng minh khung ngoài đổi rộng; cần nghiệm thu riêng khung trắng và bảng.

### 18.3. Hành vi dự kiến cho ô dữ liệu

| Trường | Khi bấm trong chế độ chỉnh |
|---|---|
| ID, STT | Chỉ xem; ID hiển thị không được dùng thay khóa ID gốc khi ghi |
| Sở/đơn vị, Loại văn bản, Cấp xin ý kiến, các Tiến độ, Phòng, Lãnh đạo VP/UBND, Tiến độ cụ thể | Mở ngay droplist tại ô (popover), không yêu cầu một bước mở hộp thoại rồi click select; danh mục giữ thứ tự đã lưu |
| Chuyên viên | Popover có ô search không dấu và danh sách tên; mặc định lọc theo quan hệ phòng; cho mở danh sách toàn cơ quan rõ ràng và cảnh báo phân công không khớp |
| Nội dung, Ghi chú | Popup textarea; Lưu vào nháp/Đóng. Nội dung không được rỗng; Ghi chú được rỗng |
| Trình/Rút | Droplist hai lựa chọn Đang trình/Đã rút; trạng thái lưu trữ không bị đổi ngầm |
| Lịch sử | Nút Xem riêng nếu dữ liệu lịch sử có thật; không biến thành editor |

Chỉ một bước vào chế độ chỉnh để sửa được ô; không yêu cầu bật thêm nút Sửa bản nháp như bản hiện tại. Chọn droplist chỉ thay nháp và đánh dấu ô/dòng đã sửa. Không gửi ghi ngầm mỗi lần chọn. Giữ nguyên giá trị đang dùng nhưng không còn trong danh mục (kèm chỉ dẫn), không ép về giá trị đầu tiên. Đổi phòng không tự gán chuyên viên khác; chuyên viên không khớp phải được đối chiếu trước khi lưu. Cho phép giá trị trống ở trường tùy chọn, không thêm ràng buộc dữ liệu bắt buộc ngoài SYSTEM nếu chưa duyệt.

Popup thay đổi rồi bấm X, Esc hoặc click nền đều phải hỏi Lưu vào nháp / Không lưu thay đổi popup / Tiếp tục sửa. Không lưu popup chỉ bỏ phần đang nhập của popup, không xóa những nháp đã sửa trước đó. Lưu popup không được gọi là đã lưu nguồn.

### 18.4. Nháp và Lưu/Đồng bộ dữ liệu

Một nút chính **Lưu/Đồng bộ dữ liệu** áp dụng các ô đã sửa; phần **Lưu bố trí** tách rõ vì ghi kho cấu hình khác ghi nội dung nguồn. Hiện số dòng thay đổi và trạng thái Chưa đồng bộ/Đang lưu/Đã lưu nguồn/Lỗi. Sau phản hồi ghi thành công phải đọc lại nguồn và đối chiếu; không báo thành công dựa trên localStorage hoặc nút đóng editor.

Lưu và thoát khi cả dữ liệu/bố trí đang thay đổi phải hiện rõ kết quả từng phần; không giả định hai kho là một transaction. Chỉ thoát sau khi các phần người dùng chọn lưu được xác nhận. Phần đã ghi thành công không tự ghi lại chỉ vì phần khác lỗi.

Nháp tự giữ định kỳ10 giây và khi chuyển/đóng trang; không tự gửi nguồn. Thoát chế độ chỉnh khi còn nháp có Lưu/Không lưu/Tiếp tục; đổi trang/đổi nguồn cũng có guard. Khi lưu lỗi, timeout hoặc xung đột, giữ nháp và editor. Cập nhật từ nguồn trong khi sửa không được thay baseline/draft; xung đột hiện giá trị gốc/đang có/nháp để xử lý. Hai người sửa cùng ô không âm thầm ghi đè; thao tác khác ô chỉ được gộp khi kiểm tra phiên bản chứng minh an toàn. Ghi thành công một phần thì chỉ bỏ nháp phần đã xác nhận, phần lỗi còn nguyên; ID gốc, source ID/gid, revision/giá trị gốc và operation ID phải được kiểm phía server.

HTML không bị khóa toàn bộ menu chỉ vì không có google.script.run. Mục tiêu là thao tác sửa nháp ngay trong app HTML và gửi yêu cầu ghi qua backend đã xác thực. Google host dùng cùng UI/hợp đồng nháp. Quyền ghi thật kiểm ở server, không phải chỉ mật khẩu/nút Settings trong HTML. Không mở quyền public hoặc nhúng token/mật khẩu vào tệp khi chưa có quyết định tương ứng.

### 18.5. Kiểm chứng đường ghi với nguồn Excel giữ nguyên link

Nguồn đã xác minh là .xlsx; URL docs.google.com không đủ để coi là native Google Sheets. Google hướng dẫn phải chuyển đổi Office để sử dụng Apps Script theo cách native; chuyển đổi tạo bản sao ([Google](https://support.google.com/docs/answer/9406611?hl=en)). Vì người dùng yêu cầu giữ Excel/link nhập liệu, không mặc nhiên ghép SpreadsheetApp cũ vào source hiện tại hoặc chuyển đổi file thật.

Bước đầu kiểm read-only deployment/hợp đồng cũ nếu xác định được, sau đó dựng thử ghi trên dữ liệu giả/bản thử Excel. Đánh giá đường cập nhật Excel qua backend giữ nguyên định dạng, ID file/link, công thức/tab/định dạng và các sửa trực tiếp đồng thời. Drive API có API cập nhật nội dung file theo fileId ([files.update](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update)); đó chưa phải hợp đồng ghi từng ô hoặc chứng minh chống ghi đè khi người khác sửa trực tiếp. Chỉ chốt adapter sau khi kiểm bảo toàn workbook và xung đột; không cam kết thay cả tệp là phương án tối ưu.

Nếu không chứng minh được đường ghi an toàn giữ nguồn hiện tại, báo bằng chứng và phương án thay thế để người dùng quyết định trước khi triển khai ghi thật. Không coi bật ô sửa mẫu là hoàn tất, không tự đổi link/nguồn hoặc tạo nguồn chính thứ hai. Kế hoạch này không cấp quyền ghi thử file sản xuất hoặc đổi sharing.

### 18.6. Độ rộng khung nền ngoài bảng

- Áp width cho item-list-card: khung trắng gồm tiêu đề Bảng dữ liệu, bộ lọc, table viewport và chân phân trang; không kéo rộng thanh điều hướng/topbar hay tất cả báo cáo khác.
- Control gần bảng: **Độ rộng khung bảng** với Tự động (vừa vùng màn hình còn dùng được) hoặc số px. Số px lớn hơn vùng hiện có bị giới hạn bởi vùng đó; hiển thị rõ độ rộng thực tế. Căn khung trong vùng làm việc, không tạo cuộn ngang cho toàn trang.
- Bảng bên trong theo độ rộng các cột, khi vượt khung chỉ cuộn .table-wrap. Độ rộng cột không bị co đồng loạt chỉ vì khung hẹp. Control cũ tableWidth nếu cần giữ phải đặt tên riêng **Độ rộng nội dung bảng** ở nâng cao; không dùng cùng một số cho hai ý nghĩa.
- Bổ sung frameWidth riêng, mặc định auto khi đọc cấu hình cũ; không tự đổi ý nghĩa tableWidth đã lưu. Kiểm tương thích/migration, checkpoint, validator, kho chung và chặn client cũ ghi mất trường mới. Schema/version cụ thể chỉ chốt khi triển khai.
- Lưu chung bố trí khung/cột, mở lại hoặc tab/máy khác đọc cùng cấu hình. Màn hình nhỏ giới hạn độ rộng hiển thị mà giữ giá trị cấu hình đã lưu cho màn hình lớn.

### 18.7. Thứ tự triển khai sau khi duyệt

1. Chốt đường ghi source và hợp đồng quyền/xung đột bằng bản thử; chưa tác động source thật.
2. Tách quyền sửa nháp khỏi adapter ghi, triển khai droplist tại ô, popup Nội dung/Ghi chú, search Chuyên viên, cùng guard/autosave. Kiểm đủ từng nhóm trường bằng fixture và source đọc hiện có.
3. Thêm độ rộng khung/migration tương thích; nghiệm thu khung ngoài và cột riêng.
4. Ghép nút Lưu/Đồng bộ, kiểm thành công/lỗi/timeout/xung đột/phần ghi dở trên môi trường thử. Xác minh roundtrip dữ liệu nguồn; dừng nếu việc ghi Excel làm mất tab/công thức/định dạng hoặc sửa trực tiếp của người khác.
5. Trình bản thử cụ thể và kết quả cho người dùng; triển khai/ghi source thật theo phạm vi được xác nhận. Cập nhật tài liệu và phân biệt hoàn tất mã/đã kiểm thật.

Luna: inventory, metadata/dropdown/panel đơn giản và tài liệu theo hợp đồng tổng chỉ huy. Tổng chỉ huy: quyết định adapter/auth/save, bảo vệ dữ liệu, tích hợp/schema/migration/review và nghiệm thu. Luna đã được giao popover, panel khung và hai hướng dẫn; tổng chỉ huy kiểm tích hợp và đường ghi.

### 18.8. Tiêu chí để người dùng kiểm

- Chế độ xem click ô không sửa; vào chỉnh click một lần mở editor phù hợp. ID/STT không sửa; Ghi chú và Nội dung popup đúng.
- Danh mục theo thứ tự đã lưu; chuyên viên search không dấu/lọc phòng; không mất giá trị cũ/lạ.
- Sửa popup rồi thoát theo cả3cách đều hỏi; autosave10 giây giữ nháp; Không lưu không xóa nháp khác.
- Chọn droplist không gửi server. Lưu/Đồng bộ thật đọc lại đúng; lỗi/conflict không mất nháp hoặc báo thành công giả.
- Đổi độ rộng khung thấy **khung trắng** thay đổi; lớn hơn viewport không tràn trang; bảng nhiều cột chỉ cuộn trong khung. Tên control phân biệt khung/cột/nội dung bảng; mở lại đọc cùng cấu hình.
- File nguồn/link, workbook và sửa trực tiếp của người nhập dữ liệu được bảo toàn; chưa có bằng chứng này thì chưa đánh dấu ghi thật hoàn thành.


### 18.9. Phát sinh khi triển khai 0.6.0 — kế hoạch 1.13

Người dùng xác nhận Apps Script cũ chưa triển khai. Vì vậy chỉ kế thừa yêu cầu sửa/lưu trong mã cũ, không coi là backend đã vận hành. Đã tách sửa nháp khỏi quyền ghi: nguồn Excel vẫn sửa nháp trên UI, checkpoint và cảnh báo hoạt động; nút Lưu/Đồng bộ chưa báo thành công khi adapter thật chưa sẵn sàng.

Thử SpreadsheetApp trên bản sao Excel cho thấy API setValue/flush/getValue phản ánh giá trị mới, nhưng tải lại blob .xlsx từ Drive vẫn nguyên bytes và không có giá trị thử. Do đó adapter native chưa được chấp nhận. Thử thay blob đúng fileId trên bản sao giữ link và các thành phần workbook đạt trong một lần ghi; chưa chứng minh bảo vệ người sửa Excel đồng thời. Chi tiết số đo/bằng chứng thuộc CURRENT_STATE và KIEM_THU_VA_NGHIEM_THU.

Bước kiểm kế tiếp là dự án riêng chỉ tạo tệp giả, thử If-Match với ETag cũ và đọc lại blob. Chỉ chấp nhận nếu phản hồi từ chối stale (412) và nội dung đã lưu không bị ghi đè. Chưa triển khai phép thử, chưa cấp OAuth Drive cho app chính; code probe không đóng gói vào server/dist. Nếu không chứng minh được điều kiện ghi nguyên tử phù hợp với Office, không bật ghi toàn tệp trong sản xuất. Dù phép thử tệp giả đạt, vẫn phải kiểm trên bản sao Excel có người sửa trực tiếp, roundtrip/khôi phục và auth cụ thể trước khi tích hợp adapter.

Khung dùng frameWidth riêng (auto hoặc 320–6000), đọc cấu hình cũ mặc định auto, tableWidth giữ nghĩa bảng bên trong. Giữ schema chung1, server từ chối client cũ thiếu frameWidth để tránh mất trường mới. Phát sinh /dev trả link dịch vụ không hợp lệ cho editorUrl đã sửa bằng giữ link /exec chuẩn; không ghi URL preview vào kho.


### 18.10. Làm rõ nơi lưu và kết quả quyền — kế hoạch 1.14

Người dùng phản ánh NQ01 vẫn lỗi lưu sau cấp quyền và các tên bản nháp/đồng bộ/cấu hình khó hiểu. Đã xác định repository nguồn chưa tích hợp writer; cấp quyền dự án thử không phải hoàn tất chức năng. Đổi từ ngữ sang phần sửa trên máy/chưa ghi file; popup Áp dụng vào bảng khác Lưu thay đổi vào file nguồn (app→Excel). Action ghi chưa hoạt động phải nói Chưa thể lưu vào Excel; vẫn cho sửa và giữ trên máy, không khóa cả editor. Đọc lại dữ liệu/danh mục làGoogle→app; danh mục/quan hệ/bố trí ở Google Sheets riêng, có nút lưu vào Google và đọc về riêng, không dữ liệu dòng Excel.

OAuth thử riêng đã hoạt động; If-Match/ETag cũ bị từ chối412, readback giữ dữ liệu đã ghi, Trash200. Bước thử tệp giả hoàn tất; còn thử bản sao Excel với người nhập trực tiếp, roundtrip blob và GViz/Office, quyền theo tệp được chọn rồi adapter/app/server. Không diễn giải kết quả này thành quyền ghi sản xuất, không thêm Drive vào app chính hoặc tự đổi nguồn. Bản0.6.1 chỉ hoàn thiện thông báo/guard cho phần đang thiếu, không đánh dấu F31 hoàn thành. Không suy ra nguồn dữ liệu mẫu chỉ từ việc adapter có quyền ghi khi thiết kế writer mới.

### 18.11. Ghi workbook và quyền theo tệp — kế hoạch 1.15

Phép thử ghi/đọc workbook giả đã đạt trên Google, gồm giữ ID/link, ô khác/công thức/styles/tab, ký tự tiếng Việt/emoji/XML, chèn Ghi chú trống và từ chối ETag cũ. Core thử dò mã gốc duy nhất và baseline, chặn trường không được sửa; chưa đóng gói writer thật. Đã sửa lỗi parser hàng tự đóng sau khi cloud phát hiện; Luna bổ sung regression, tổng chỉ huy tích hợp và nghiệm thu.

Phát sinh quyền: drive.file của dự án thử chỉ truy cập được tệp nó tự tạo, bản sao đã có trả404 dù vẫn tồn tại. Ưu tiên chọn/cấp quyền từng tệp; không tự mở rộng toàn Drive hoặc chuyển quyền public. Việc cấp OAuth probe không bật writer ở app chính. Chuẩn bị phương án quyền cụ thể để người dùng quyết định trước hành động mở rộng quyền.

Tiếp tục kiểm riêng Office: tạo workbook giả, sửa trực tiếp trên giao diện Excel Google, đợi blob phản ánh giá trị rồi thử ETag cũ phải bị từ chối; nạp bản mới và chỉ ghép trường không xung đột. Kiểm đọc muộn để phát hiện Office đang mở ghi đè lại. Nếu Office chưa cập nhật blob, không thử ghi; nếu không bảo vệ được sửa trực tiếp thì dừng adapter whole-file. Kết quả fake không thay kiểm bản sao đúng cấu trúc nguồn, idempotency/timeout/backup/rollback hoặc nhiều người.

Đọc muộn bản sao thấy XML được viết lại nhưng tất cả giá trị/công thức đúng; chưa rõ tác nhân. Không kết luận từ echo API hoặc một lần đọc ngay rằng native writer luôn thất bại. Thống kê công thức chuẩn142, sửa cách đếm prefix nhầm thẻ fill; chi tiết bằng chứng chỉ ở CURRENT_STATE/báo cáo kiểm thử.

Kết quả Office trên workbook giả: sửa trực tiếp C5 được đọc trong blob, ETag cũ bị từ chối412; nạp lại và ghép C4 giữ cả sửa Office. Đọc muộn hơn2phút còn cả2phần, Office đang mở thấy cập nhật C4. Chưa thay nghiệm thu nhiều người hoặc cấu trúc nguồn thật. Bản sao nguồn hiện hữu cần quyền riêng: đã chuẩn bị probe target cố định/private và rollback có điều kiện cùng manifest quyền Drive rộng chỉ để review; chưa upload/chạy. Chờ người dùng lựa chọn phạm vi OAuth hoặc chuẩn bị chọn từng tệp, không tự cấp phạm vi mới từ kế hoạch này.

### 18.12. Quyết định quyền thử bản sao — kế hoạch 1.16

Người dùng đã chọn cho phép quyền Drive rộng trong dự án thử riêng. Áp dụng drive + external_request cho dự án thử, giữ app chính chỉ Sheets/private. Google phải xác nhận OAuth mới; đồng ý trong chat không được ghi thành bằng chứng Google đã cấp. Kiểm quyền trước bằng hàm chỉ GET metadata bản sao cố định. Sau khi đọc đúng mới chạy probe ghi/đọc/ETag cũ và khôi phục trên bản sao riêng, không nguồn chính. Chỉ chấp nhận pass khi bảo toàn workbook và rollback đọc lại đúng bytes; nếu ETag đổi thì không khôi phục đè sửa mới.

Trước upload đã sửa metadata theo hợp đồng Drivev2: labels.trashed thay cho trashed ở root. Luna bổ sung test giả cho các điều kiện sai tệp/tên/MIME/Trash/private/ETag đổi trong lúc đọc, tổng chỉ huy review mã và phạm vi quyền. Không tự triển khai endpoint hoặc mở app/kho; quyết định quyền này chỉ dự án thử và phép kiểm bản sao đã nêu.

Phát sinh khi kiểm OAuth: sau lưu manifest, một lần GET vẫn404 trong khi connector xác nhận copy còn tồn tại/đúng owner. Không suy ra quyền Google mới đã cấp chỉ từ việc hàm chạy được. Thêm getAuthorizationInfo theo scope cụ thể và requireScopes trước token/lock/HTTP; probe chỉ đọc kiểm thêm tài khoản khớp owner bằng boolean, không xuất token/email khác. Google hỗ trợ chạy khi chưa có tất cả granular consent, nên dùng [requireScopes](https://developers.google.com/apps-script/reference/script/script-app) để dừng phần cần quyền còn thiếu. Kết quả OAuth thực tế phải ghi CURRENT_STATE trước phép ghi copy.

Kết quả bước quyền/copy: sau khi người dùng tự cấp Google, execution23:19 xác nhận đúng scope và tài khoản, đọc copy200. Roundtrip23:21–23:22 đạt và chỉ báo pass sau khi khôi phục bytes gốc. Chi tiết/bằng chứng ở CURRENT_STATE và báo cáo kiểm thử. Kết quả này chốt phép thử adapter workbook, không cấp quyền source thật hoặc deployment app chính.

### 18.13. Bước tích hợp sau khi chốt đường ghi

1. Tách loại nguồn (mẫu/Google) khỏi khả năng ghi. Nguồn Google có writer vẫn phải dùng đúng URL và vùng lưu/checkpoint Google, không bị App suy thành demo từ readOnly=false. Kiểm regression đổi capability không đổi nguồn hay khóa lưu nháp.
2. Xác định nguồn/trang tính đã đăng ký ở server; đọc workbook bằng cùng đường với writer khi cần xác nhận sau lưu. Dò theo mã gốc duy nhất, không dùng NQ01 hiển thị hoặc số hàng làm khóa ghi. Giữ nháp cũ khi đổi ID/revision/reader; chỉ đối chiếu giá trị nguồn rõ ràng, không tự ánh xạ mơ hồ.
3. Hợp đồng lưu chứa operation ID, nguồn, mã gốc, giá trị gốc và chỉ các trường đổi; backend kiểm caller/quyền/capability và baseline. Bổ sung journal/backup/audit riêng tư, không trộn dữ liệu dòng vào kho chỉ chứa danh mục/bố trí. Khóa Apps Script phối hợp các lệnh app; CAS vẫn bảo vệ sửa trực tiếp Office.
4. Timeout/ghi thành công nhưng mất phản hồi phải giữ phần sửa và dùng cùng operation ID để kiểm/retry, không ghi đè mới hoặc báo lỗi/thành công giả. Phản hồi từng dòng và đọc lại đúng mới xóa phần sửa tương ứng. Kiểm cả rollback bị chặn bởi sửa mới, batch, cache/công thức tổng hợp và giới hạn quyền trên môi trường riêng.
5. Nối UI Áp dụng vào bảng/Giữ thay đổi trên máy/Lưu thay đổi vào file nguồn/Đọc lại dữ liệu đúng chiều và đúng nơi. Chỉ bật nút lưu nguồn khi server có writer đã kiểm và quyền thật; HTML tải từ Drive cần đường tới backend đã xác thực, không nhúng token/mật khẩu hoặc tự mở public.
6. Làm mã và kiểm local/môi trường riêng trước; cập nhật tài liệu/phiên bản/bằng chứng. Quyền Drive đã cấp cho dự án thử không chuyển sang app chính; chỉ trình bước cấp quyền/triển khai/ghi sản xuất khi bản tích hợp cụ thể đã đủ điều kiện review.

### 18.14. Tích hợp 0.6.2 — kế hoạch 1.17

Đã làm mã local cho adapter/RPC và writer có backup/journal/operationId/CAS/readback. RPC save trả JSON string qua Apps Script callback; adapter parse và validate kết quả từng dòng, JSON malformed/thiếu xác nhận giữ nháp. Luna làm adapter, kiểm IO fake/component/hook và cập nhật map/hướng dẫn; parent điều phối transaction/transport/tích hợp. Số đo và test local ở CURRENT_STATE, hợp đồng ở API. Đã sửa nguồn Google không bị coi là demo khi có quyền ghi; lưu ô không ghi bố trí không đổi. Chỉ mục nhỏ trong Properties rút bớt các lệnh Drive theo từng dòng và tránh trễ search; không chứa nội dung dòng trong Properties.

Người dùng đã duyệt kiểm bản thử rồi tiếp tục cập nhật app chính. UI /dev trên copy riêng ngày15/10 lúc10:55 đổi dropdown Chuyên viên Trương Việt Hải→Nguyễn Văn Kỳ tại mục “công nghiệp sinh thái” (UI hiện NQ37), báo đã lưu và đọc lại xác nhận; readback đúng, pending hết. Bản sao được khôi phục có điều kiện lúc10:56:18, ETag/hash pass. Ảnh UI và khôi phục ở [CURRENT_STATE](CURRENT_STATE.md). Bằng chứng thuộc test host/copy, không xác nhận app chính hoặc nguồn thật. Sau khi người dùng tự cấp Google consent, đã thiết lập registry/kho riêng và cập nhật deployment chính Version6 lúc11:31 ngày15/10. Quyền USER_ACCESSING/MYSELF giữ nguyên; chưa tự ghi nguồn thật.

Các bước tiếp, thực hiện tuần tự:

1. Đã kiểm UI thử riêng trên Google copy, xác nhận RPC/save/readback và khôi phục bytes có điều kiện. Không dùng NQ01 thật.
2. Tiếp tục kiểm text/drop/mã thiếu-trùng/row move/công thức-cache/quota và lỗi journal/backup/mất phản hồi; đánh giá nhiều người. Bằng chứng fake và một lượt UI copy không thay các kiểm này.
3. Đã hoàn tất Google consent, registry nguồn/trang tính và kho riêng theo duyệt của người dùng; phát hành main Version6 cùng URL cũ. Kiểm chỉ đọc backendReady/tài khoản/51 dòng/cấu hình12 và phiên UI mới hiển thị kết nối ghi đạt. Không gửi phần sửa NQ01 hoặc lệnh ghi thử vào nguồn thật.
4. Giữ/đối chiếu phần sửa đang có trên browser; không tự bỏ hoặc chuyển nháp từ HTML sang Google.
5. Hoàn thiện conflict UI/khôi phục backup/retention/nhập thêm-lưu trữ-hàng loạt và quyền nhiều người theo F31/F36. Không đánh dấu cả F31 từ việc sửa được một ô.

Phát sinh rà soát cuối18.14: giữ mã gốc trong patch và truyền mã gốc khi đọc history. Cache lượt refresh bị bỏ có thể đã thay mapping theo hàng; không dùng nó để đổi mục tiêu phần sửa cũ. Nháp legacy chỉ bổ sung mã từ baseline đã lưu, wire payload/operationId tương thích. RPC Google đổi Chuyên viên/đọc lại/replay/audit/khôi phục copy đạt lúc00:37; UI copy đạt lúc10:55 và cleanup ETag/hash lúc10:56:18. Main đã được cấp quyền và phát hành Version6; bổ sung Drive advanced service v2 để xử lý HTTP403 accessNotConfigured mà không thêm OAuth scope. Helper chỉ đọc xác nhận trạng thái và UI mới đạt. Không tự ghi NQ01; bằng chứng ghi/khôi phục vẫn thuộc copy. Khi Google vừa cập nhật deployment, mở lại phiên app trước khi kết luận lỗi RPC.

### 18.15. Đề xuất kiến trúc Google Sheets hai chiều — kế hoạch 1.18, chưa phê duyệt triển khai

Nhu cầu đọc nguồn về app và lưu thay đổi app về nguồn đã chốt. Còn cần chốt riêng nguồn chuẩn và cách chạy: hiện giữ file Excel và link nguồn cho tới khi được duyệt đổi; nếu chuyển sang Google Sheets native thì phải công bố link nguồn mới. Google-hosted app/GAS và HTML độc lập chạy local có cơ chế xác thực, giữ nháp và lưu khác nhau. Có thể làm POC chạy HTML động bằng HtmlService, nhưng cách đó không giải quyết việc mở file local; cần release version và rollback rõ, không tự đồng bộ hoặc tự đọc phiên bản đang được đồng bộ. Đây là các lựa chọn cần đánh giá, chưa phải quyết định đổi nguồn/hosting.

Giữ thao tác sửa dropdown và ID/STT chỉ đọc. Popup Nội dung/Ghi chú tiếp tục cần xác nhận Lưu tường minh. Việc tự lưu dropdown có thể đánh giá như lựa chọn riêng, hiện chưa chốt; không tự áp dụng khi sửa phương án.

Các bước đề xuất, tuần tự và chỉ trên bản sao:

1. Chốt source of truth (native Sheets hay giữ Excel/link hiện tại), nơi chạy (Google hay HTML local), xác thực và chính sách Lưu. Cho đến khi có quyết định, giữ Excel hiện tại.
2. Làm POC trên các bản sao; kiểm ID duy nhất, tiêu đề cột, công thức, allowlist phía server, kiểu dữ liệu và baseline từng trường. Thiếu/trùng định danh hoặc header phải dừng, không fallback sang vị trí hàng/cột.
3. Tuần tự hóa ghi; tách inflight/pending/unknown; checkpoint bền cùng operationId; đọc lại xác nhận theo từng ô. Khi không rõ kết quả thì giữ nháp và đối chiếu, không tự ghi lại; không có fallback im lặng.
4. Nếu polling, chạy mỗi30 giây khi tab hiển thị, thêm jitter; merge theo generation để bảo vệ trường dirty và bỏ phản hồi cũ đến trễ. Không dựa riêng vào Apps Script onEdit để phát hiện thay đổi.
5. Trên copy, kiểm A→B→C, phản hồi chậm, busy/retry, công thức bị từ chối, partial result, mất phản hồi, sắp xếp và sửa trực tiếp ở các tab khác; đo tải với20–50 người. Phân biệt gộp HTTP request từ browser với batch API ghi Sheets: quota UrlFetchApp chỉ áp dụng lệnh gọi UrlFetchApp ở server, không phải mọi browser `fetch`.
6. Chỉ sau kết quả POC mới review chuyển nguồn, chia sẻ và deploy. Nếu được duyệt chuyển, phải di trú có đối chiếu danh mục/quan hệ/bố trí/độ rộng sang khóa nguồn mới; không giữ nhầm khóa nguồn Excel cho dữ liệu Sheets. Nháp cũ được giữ riêng để đối chiếu, không tự đổi ID hoặc gửi sang nguồn khác. Không đánh dấu F31 hoàn tất trước khi các kiểm tra và quyết định còn lại xong.

Đề xuất chi tiết PA1/PA2 và giới hạn hiện có ở mục kiến trúc “Đề xuất sau rà soát PA1/PA2 — chưa triển khai”.


### 18.16 Firebase Pages tối thiểu — kế hoạch1.19 đã được giao làm local

Người dùng chốt giữ giao diện/tính năng, 50–70 dòng, ưu tiên miễn phí, Firebase RTDB HopHDND thay Sheets cho Pages; Anonymous sửa theo quyền, Google admin cấp quyền; Excel, một index.html, kiểm cơ bản. Không backend riêng/workflow/repository mới; không push hoặc chạm dữ liệu Firebase thật. Web config và emailadmin mới do người dùng cung cấp.

1. Dùng adapter Firebase trên App hiện có, giữ entry Google; không rewrite giao diện hoặc tự chuyển dữ liệu từ Excel. Đã làm local.
2. Rules deny mặc định, admin verifiedGoogle, quyền cột/cell, ID/STT khóa; listener dữ liệu/profile. Đã làm và kiểm trên emulator.
3. Tự lưu khi commit ô, debounce800ms, transaction/baseline theo ô; giữ phần mới nhập khi ack cũ về, cảnh báo popup, checkpoint/lỗi/xung đột. Đã kiểm hook/emulator/UI giả; chưa kiểm production.
4. Import/Export Excel: phát hiện bản mới chưa có thực sự, bổ sung mẫu chuẩn add-only có preview; giữ JSON profile. Chưa bổ sung import workbook legacy/mapping/replace/backup đầy đủ; ghi rõ phạm vi tối thiểu, không gọi F25–F27 hoàn tất.
5. Build Pages một file; SDK/Excel chỉ entry Pages, không tăng bundle legacy bằng các thư viện đó. Đã tạo dist-pages/index.html. Kiểm và số liệu ở CURRENT_STATE.
6. Chưa thực hiện: bật Auth providers, thêm authorized domain thực tế, đối chiếu/áp dụng Rules với project đang có, nhập dữ liệu ban đầu, nghiệm thu OAuth thật/Pages thật. Các bước này thay đổi dịch vụ thật nên không nằm trong lượt chỉ sửa local; không suy kế hoạch thành quyền thực hiện.

Parent xử lý adapter/Rules/auto-save/tích hợp/kiểm nghiệm, Luna xử lý panel quyền, Excel utility và tài liệu theo phạm vi giao; parent đã kiểm tra và sửa các điểm cần thiết. Không thêm database/server riêng hoặc nhiều repository. Hướng dẫn vận hành chi tiết tại [FIREBASE_PAGES](FIREBASE_PAGES.md).
