## Windows QA — một WebApp, Firebase + Supabase (26/10/2026)

PR #78 đã merge **chỉ vào nhánh** `integration/firebase-supabase-unified-20261026` (commit `815291926da2ae001a0b4fec906c414db87e3872`), không merge `main`, không deploy Pages/Rules/DB. PR #77 vẫn Draft. Clone vào thư mục riêng (không thay clone nhân viên đang sử dụng), chạy `npm ci` trong `source`, sau đó chạy `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local-staging.ps1`. Cửa sổ này chạy Firebase Emulator `demo-hdnd`, WebApp tại `http://127.0.0.1:5173/pages.html`. Supabase là nguồn cloud staging độc lập, không được tự chuyển hoặc đồng bộ dữ liệu Firebase.

Đo mạng bằng cách nhấp đúp `source\scripts\START_NETWORK_MONITOR_1H.cmd`, khi cửa sổ local staging vẫn chạy. Mỗi **5 giây trong 60 phút** lấy mẫu song song GitHub Pages, Cloudflare baseline, Firebase RTDB, Supabase staging và localhost (720 lượt/đích). Có thể bổ sung địa chỉ host tại nhà: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\network-stability-1h.ps1 -LanUrl 'http://IP-LAN:PORT/' -SelfHostUrl 'https://DOMAIN-THAT-EXISTS/'`. Mặc định localhost là `127.0.0.1:5173/pages.html`, thay bằng `-LocalUrl` nếu dùng cổng khác. Báo cáo `samples.csv`, `summary.csv`, `report.html` nằm dưới `Documents\HopHDND-NetworkReports`.

Đây là script đã lưu trên GitHub **chưa được chạy trên máy người dùng**, không phải phép đo hoàn tất. Nếu chưa mở local WebApp mà localhost báo lỗi thì là thiếu dịch vụ tại cổng. Cloudflare baseline chỉ đo mạng Cloudflare, không đại diện cho một Cloudflare Worker/Pages HopHDND. Muốn so self-host từ máy nhân viên bên ngoài, phải thử từ một máy ngoài LAN. [Quy trình phát hành và gate](operations/DUAL_BACKEND_UNIFIED_RELEASE_20261026.md).

---
# Cài đặt và chạy — HopHDND (local, gồm Pages 0.7.0 và legacy)

## Bản GitHub Pages 0.7.0 — điểm bắt đầu hiện hành

Repo GitHub đặt toàn bộ mã trong `source/` và giữ HTML triển khai `index.html` ngoài gốc. **Chạy các lệnh dưới đây trong `source/`** khi làm việc với bản clone GitHub; nếu làm ở thư mục dự án Windows vốn là gốc mã nguồn thì chạy tại đó:

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

Đầu ra Pages là `dist-pages/index.html`; trong repo GitHub đó là `source/dist-pages/index.html`. File `source/index.html` và `source/pages.html` là **đầu vào build**, không thay bằng file HTML đã đóng gói. Chỉ sau khi kiểm thử và được duyệt mới cập nhật `index.html` ở gốc repo. `test:firebase` cần emulator/điều kiện tương ứng. [VAN_HANH](VAN_HANH.md) là quy trình chuẩn phát hành, kiểm tra Pages, quay lại phiên bản, sao lưu/khôi phục, xử lý lỗi; các chỉ dẫn Apps Script và HTML legacy phía dưới là lịch sử/biến thể riêng, không dùng thay quy trình Pages.

**Bản Pages hiện tại**: nội dung đọc từ Google Sheets/GViz, cấu hình/quyền dùng Firebase Auth/RTDB, sửa ô chỉ tạo nháp local. Không suy `npm run build:pages` thành triển khai Firebase Rules hay ghi dữ liệu thật. Trạng thái Pages người dùng phản ánh 0 dòng và chưa vào được tùy chỉnh; theo [CURRENT_STATE](CURRENT_STATE.md), chưa coi đã nghiệm thu production.



Người dùng mở artifact HTML bằng browser và không cần Node.js/npm. Người phát triển cần Node.js 24 và npm.

## Cài phụ thuộc và chạy local

Tại thư mục dự án:

```sh
npm ci
npm run dev
```

Mở địa chỉ local được Vite in trong terminal. Ứng dụng mặc định đọc Google Sheets với `gid=60961344`; cần mạng và quyền đọc nguồn qua GViz. Mở **⚙ Tùy chọn** → **Kết nối dữ liệu** để đổi nguồn hoặc chọn **Dùng dữ liệu mẫu** để thử thao tác. Khi đang ở nguồn mẫu, **Làm mới** không đọc Sheet. Thay đổi dữ liệu mẫu được lưu trong repository thử của phiên, không ghi Sheet. Tests và benchmark dùng fixture giả. Đổi nguồn mặc định cho dự án khác tại `src/data/sheet-config.ts` rồi build.

## Lệnh dự án

Các lệnh khai báo trong `package.json`:

```sh
npm run typecheck
npm test
npm run build
npm run build:react
npm run build:preact
npm run build:server
npm run docs:check
npm run benchmark
```

`npm run build` kiểm tra kiểu, build biến thể Preact và tạo một HTML tại `dist/Dashboard_HĐND.html`. `npm run build:react` tạo biến thể React tại `dist-react/Dashboard_HĐND.html`; `npm run build:preact` tạo build thử Preact tại `dist-preact/Dashboard_HĐND.html`. Sau khi build HTML, `npm run build:server` tạo gói Apps Script ở `server/dist/{Code.gs,ConfigCore.gs,Index.html,appsscript.json}`. Gói này chỉ được tạo trên đĩa; lệnh không đăng nhập, triển khai, thay quyền chia sẻ hoặc ghi dữ liệu. `npm run docs:check` kiểm tra liên kết Markdown và danh sách F01–F36. `npm run benchmark` chạy benchmark có sẵn. Các lệnh trên là hướng dẫn chạy; tài liệu này không ghi kết quả test hoặc browser chưa được thực hiện.

## Mở và chia sẻ artifact

Artifact người dùng là một tệp HTML; tải tệp từ Drive rồi mở bằng browser. Không cam kết Drive preview thực thi HTML. Cách mở tệp trực tiếp bằng `file://` chưa được kiểm tra. Khi chạy bản kết nối Sheets, browser cần mạng và người dùng cần quyền đọc Sheet qua GViz; link nguồn được lưu riêng trong `localStorage` sau khi kết nối thành công. **Kiểm tra kết nối** chỉ đọc thử, không áp dụng nguồn hoặc lưu lựa chọn. Link và gid đang sửa có checkpoint cục bộ để khôi phục. Khi rời màn hình đang có thay đổi, chọn **Kết nối và thoát**, **Không lưu và thoát** hoặc **Tiếp tục sửa**; thao tác kiểm tra kết nối không thay thế bước kết nối và tải dữ liệu.

Nguồn mặc định là [Google Sheets HĐND](https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344). Quyền chia sẻ HTML và quyền đọc Sheet là riêng. Sheet thật chỉ đọc; app tự làm mới mỗi 60 giây khi tab hiển thị hoặc khi người dùng bấm **Làm mới**. Ứng dụng chưa hỗ trợ OAuth cho Sheet riêng tư.

## Cấu hình và lưu nháp

Menu **⚙ Tùy chọn** có chế độ **Vào chế độ tùy chỉnh bảng báo cáo**, **Vào chế độ tùy chỉnh danh sách**, **Danh mục và quan hệ chuyên viên – phòng** và **Kết nối dữ liệu**. Cấu hình báo cáo, bố trí danh sách và danh mục được lưu trong browser theo từng nguồn. Bố trí danh sách gồm ID, STT, 13 trường nội dung, trạng thái Trình / Rút và Lịch sử tùy chọn. ID chuẩn hóa chỉ phục vụ hiển thị; mã nguồn và `recordId` được giữ nguyên. Header kéo thả hoặc đổi thứ tự bằng Alt+←/→; QA xác nhận kéo Sở/đơn vị qua Nội dung và đổi thứ tự bằng bàn phím. Lưu và thoát rồi mở lại giữ thứ tự mới; ở chế độ xem, resize, focus tab và kéo cột không đổi thứ tự. Chiều rộng bảng thực là `max(tableWidth, tổng width cơ sở các cột đang hiện)`, trong đó `tableWidth` 600–6000 px là minimum. Khi tableWidth lớn hơn tổng width cơ sở, browser chia phần dư cho các cột, nên width thực từng cột có thể lớn hơn giá trị cơ sở đã lưu. Bảng thật 2400 px cuộn trong khung 728 px; trang danh sách dùng full viewport, không cap 1500 px.

Danh mục có 11 nhóm cùng quan hệ nhiều phòng cho mỗi chuyên viên, được lưu theo nguồn trong browser. CellPicker mở dropdown bằng click. Tìm chuyên viên không dấu và gợi ý tôn trọng quan hệ theo phòng; lựa chọn hiện tại vẫn được giữ nếu bị loại khỏi choices do tìm/lọc. QA trình duyệt với `mau d` lọc ra CV mẫu D, giữ current value A và tôn trọng quan hệ phòng A/D. Người dùng có thể bật **Chọn chuyên viên toàn cơ quan**. Cảnh báo quan hệ sai cần xử lý trước khi lưu thay đổi dữ liệu mẫu. Chỉ đổi tên hoặc xóa giá trị chưa được dữ liệu sử dụng; giá trị đang được dùng cần được sửa hoặc migration riêng trước khi cập nhật danh mục. Ứng dụng không tự đổi hàng loạt nội dung hiện có.

Các vùng nháp cấu hình, danh mục, biểu mẫu, nội dung, link/gid và dữ liệu mẫu tự checkpoint sau 800 mili giây không có chỉnh sửa, định kỳ 10 giây, khi ẩn tab/rời trang và lúc dọn vùng chỉnh sửa. Trình duyệt có thể trì hoãn bộ hẹn giờ ở tab nền, nên chu kỳ 10 giây không phải thời hạn bảo đảm. Khôi phục chỉ diễn ra khi bản gốc còn khớp checkpoint. Nháp tự lưu là bản dự phòng để phục hồi; cần dùng thao tác lưu riêng để áp dụng. Giá trị độ rộng hoặc trường cấu hình đang nhập dở có thể được khôi phục, sau đó validation khi lưu kiểm tra cấu trúc và giới hạn. Nếu browser từ chối lưu trữ, giao diện sẽ báo và người dùng cần lưu thủ công.

Popup Nội dung/Ghi chú có nút **Lưu** đưa nội dung vào bản nháp, có ba lựa chọn khi đóng và dùng autosave hiện có. Đây là thao tác với draft. Ở dữ liệu mẫu, **Lưu thay đổi** áp dụng các thay đổi vào repository giả trong phiên hiện tại; việc đó không tạo cache bền theo nguồn và không ghi dữ liệu nghiệp vụ vào Google Sheets/Excel. Nếu có bản nháp mẫu được checkpoint, ứng dụng có thể phục hồi khi dữ liệu mẫu gốc khớp. Thay đổi dữ liệu trong phiên không phải dữ liệu sản xuất.

Kết quả build, RPC, các lượt thử và giới hạn hiện hành được ghi tại [CURRENT_STATE](CURRENT_STATE.md) và [Kiểm thử](KIEM_THU_VA_NGHIEM_THU.md). Giữ kho riêng theo lựa chọn người dùng; không mở rộng quyền trong lượt kiểm này.

## Thiết lập và triển khai đồng bộ cấu hình

Đã có project/kho riêng. Quy trình cập nhật nguồn và deployment, quyền và chuyển cấu hình máy cũ được ghi một nơi ở [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md). Tình trạng thực tế và số đo ở [CURRENT_STATE](CURRENT_STATE.md).

Kho được giữ riêng theo lựa chọn người dùng. Owner dùng Google app để đọc/lưu cấu hình chung; người mở HTML bên ngoài Google vẫn xem nguồn Excel qua GViz nhưng chưa đọc cấu hình private. Không chuyển đổi Excel hoặc thay link nhập liệu để kích hoạt cấu hình.

Không chạy lại khởi tạo hoặc tạo thêm project khi chỉ cập nhật code. Build server tạo gói để upload; không tự công bố hoặc thay quyền.
