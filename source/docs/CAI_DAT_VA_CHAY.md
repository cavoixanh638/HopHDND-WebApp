# Cài đặt và chạy — HopHDND (local, gồm Pages 0.7.0 và legacy)

### Chẩn đoán nếu kẹt “Đang tải bố cục đã lưu…”

Trang có chế độ đo khởi động **không thay đổi dữ liệu**. Gắn `?startupMetrics=1` vào URL chưa có tham số, hoặc `&startupMetrics=1` nếu URL đã có tham số.

**Lỗi đã gặp thực tế 26/10/2026:** URL `https://cavoixanh638.github.io/HopHDND-WebApp/?utm_source=chatgpt.com?startupMetrics=1` **SAI** vì dùng dấu `?` thứ hai; trình duyệt hiểu toàn bộ thành giá trị `utm_source`, `URLSearchParams.get('startupMetrics')` là `null`, do đó bảng timing không hiện. URL **ĐÚNG**: `https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1` hoặc `https://cavoixanh638.github.io/HopHDND-WebApp/?utm_source=chatgpt.com&startupMetrics=1`. Sau khi sửa URL hãy dùng Ctrl+Shift+R (hard reload). Đây là lỗi tham số đo, **không phải kết luận Database chậm**, không sửa Firebase Rules/data hoặc source code để chữa. Mở trang và xem bảng **Startup timing** / Chrome DevTools Console (lọc `[HopHDND startup]`). Ghi thời gian các stage `auth-checked`, `auth-signed-in`, `rt-db-connected`, `profile-received`, `source-selected`, `first-data-painted`; chụp riêng thông tin thời gian, không đưa token hay dữ liệu nghiệp vụ vào lỗi công khai. Nếu `profile-received` rất muộn, cần kiểm Auth/RTDB network/Rules; nếu nhận nhanh mà không có bảng, cần kiểm `layoutPending` và cache. Cơ chế an toàn hiện tại cố tình chờ cấu hình đã xác nhận; nút `Xem dữ liệu tạm (bố cục mặc định)` chỉ cho xem thử, không đồng nghĩa đã xác nhận cấu hình chung hoặc quyền ghi. Tuyệt đối không tự reset Firebase profile, xóa backup/rules hoặc chuyển sang nguồn khác để “chữa chậm” khi chưa đo.

Tham chiếu chẩn đoán/trạng thái: [CURRENT_STATE](CURRENT_STATE.md). Khi tích hợp hai backend phải đo thời gian khởi tạo **riêng từng nguồn**, không buộc Supabase tab chờ Firebase profile nếu nguồn Supabase không dùng cấu hình đó và không mở sai quyền chỉnh sửa.

## 26/10/2026 — Thay thế phép thử 10 lượt bằng GIÁM SÁT ĐỘ ỔN ĐỊNH LIÊN TỤC 60 PHÚT

Theo chỉ đạo mới của người dùng, bài kiểm tra 10 lượt tức thời không đủ để kết luận vì mạng đang chập chờn. **Dùng bộ mới** `HopHDND_CongCu_DoMang_LienTuc_60Phut_Windows.zip` (đính kèm trong hội thoại, **chưa commit nguyên script lên GitHub**), thay cho ZIP cũ `HopHDND_CongCu_DoMang_Host_Windows.zip`. Gói mới có `DO-MANG-1-CLICK.cmd`, `DO-THU-2-PHUT.cmd`, `Do-Mang-HopHDND.ps1`, `XEM-BAO-CAO-CU.cmd`, `HUONG-DAN.txt`.

- **Chạy thử script**: nhấp đúp `DO-THU-2-PHUT.cmd` (2 phút, không dùng để kết luận chất lượng mạng).
- **Đo chính thức liên tục 1 giờ**: nhấp đúp `DO-MANG-1-CLICK.cmd`; mặc định `-DurationMinutes 60 -SampleSeconds 30`, đo GitHub Pages, Cloudflare Edge tham chiếu, Firebase RTDB/Auth, Supabase staging HEAD và localhost synthetic ~64 KiB. Bình thường khoảng **120 lần đo mỗi đích**. Nếu tất cả đích bị timeout, chu kỳ có thể dài hơn 30 giây; **từng mẫu lưu thời điểm thật, không bịa các mẫu bị trễ**.
- **Khi kết nối chập chờn**: công cụ vẫn lặp lại, phân biệt DNS/TCP/TLS/timeout/HTTP, lưu CSV **ngay sau từng phép thử**, không mất nhật ký đã ghi khi máy mất mạng hay chương trình bị đóng. Thử tạm chống Windows idle sleep trong giờ đo, tự khôi phục trạng thái khi kết thúc. Giữ máy có điện.
- **Báo cáo** `BaoCaoMang/HopHDND-Mang-<timestamp>.{csv,html,json}`: P50/P95, tỷ lệ mẫu thành công, chuỗi mẫu lỗi liên tiếp, số đột biến độ trễ, đường thời gian có đánh dấu lỗi đỏ, lỗi theo từng khoảng 5 phút. Khi mất điện/cần dựng lại HTML, nhấp `XEM-BAO-CAO-CU.cmd` và nhập đường dẫn CSV.
- **So host đúng cách**: CDN Edge không phải WebApp trên Cloudflare Pages; localhost là loopback, không phải tốc độ nhân viên từ xa. Thêm `-CloudflarePagesUrl` và `-PublicTunnelUrl` chỉ khi đã có hostname WebApp thật; đo tunnel từ **mạng ngoài** (máy nhân viên hoặc 4G). API HEAD có thể trả 401/403/404/405 bình thường, không chứng minh tài khoản hay query dữ liệu thành công. Không so sánh kết quả HTTP curl với thời gian first paint của browser nếu chưa đo `?startupMetrics=1`.
- **Giới hạn bằng chứng**: mới kiểm tra cấu trúc file ZIP / kiểm tra tĩnh biểu đồ, **chưa chạy PowerShell một giờ trên máy Windows thật**, chưa có kết quả từ mạng người dùng. Không thay Rules, DNS, Firebase/Supabase hoặc production.

Cú pháp tùy chọn (chạy từ thư mục đã giải nén):
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Do-Mang-HopHDND.ps1" -DurationMinutes 60 -SampleSeconds 30 -CloudflarePagesUrl "https://your-project.pages.dev/" -PublicTunnelUrl "https://your-domain.vn/"
```

---
## 26/10/2026 — Bộ công cụ đo đường mạng từ PC Windows / so sánh giải pháp host (read-only)

Người vận hành yêu cầu đo từ **chính máy Windows có mạng chập chờn**, so sánh GitHub Pages hiện hành, Cloudflare Edge, Firebase RTDB/Auth, Supabase staging và host trên PC. Đã tạo bộ ZIP **`HopHDND_CongCu_DoMang_Host_Windows.zip`** trong cuộc trò chuyện làm việc (không phải một file đang có sẵn trên GitHub). Trong ZIP có `Do-Mang-HopHDND.ps1`, `DO-MANG-1-CLICK.cmd`, `HUONG-DAN.txt`. Lưu nguyên bản được người vận hành tải về trong kho công cụ nội bộ khi bàn giao; không khẳng định file đã được commit vào repo.

**Chạy:** giải nén và nhấp đúp `DO-MANG-1-CLICK.cmd` (10 lượt mỗi đích). Không cần Python/npm/Java/admin/API key. Chạy lại khi thấy mạng chậm và khi mạng bình thường, ở cùng máy, tránh các ứng dụng đang tải file. Báo cáo lưu trong thư mục `BaoCaoMang\HopHDND-Mang-yyyymmdd-hhmmss.{html,json}`; HTML tự mở, JSON cho phân tích theo từng lượt. Script dùng **Windows curl.exe** để đo DNS/TCP/TLS/TTFB/HTTP total, tỷ lệ lỗi, P50/P95; không tải nội dung ứng dụng vào báo cáo, không đăng nhập và không gửi bất kỳ write nào lên Firebase/Supabase.

Các đích:
- GitHub Pages thật `https://cavoixanh638.github.io/HopHDND-WebApp/`;
- Cloudflare Edge `https://www.cloudflare.com/cdn-cgi/trace` (**chỉ kiểm tra tuyến Cloudflare, tuyệt đối không được công bố là tốc độ Cloudflare Pages của HopHDND**);
- Firebase RTDB `https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app/.json` với **HEAD**; Firebase Auth `https://identitytoolkit.googleapis.com/` với HEAD;
- Supabase staging `https://uguhyunuzsdrkykqgdmq.supabase.co/auth/v1/settings` với **HEAD**, không dùng publishable key/secret/JWT, không query dữ liệu; HTTP 401/403/404 trên nhóm HEAD có thể là phản hồi API bình thường và không tương đương thất bại kết nối;
- localhost chỉ bind `127.0.0.1:18765`, trả HTTP synthetic ~64 KiB; **không phải cùng một WebApp và không đo đường của nhân viên từ Internet**.

Để thử nghiệm công bằng hơn khi có các host thật:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Do-Mang-HopHDND.ps1" -Rounds 10 -CloudflarePagesUrl "https://ten-du-an.pages.dev/" -PublicTunnelUrl "https://host-ten-mien-cua-ban.vn/"
```
Nếu đã chạy trang WebApp trên máy đó, thêm `-LocalWebAppUrl "http://127.0.0.1:5173/pages.html"`. **Không mở Vite dev server ra Internet**. Chỉ so sánh Cloudflare Pages khi đã triển khai **cùng build** trên Cloudflare; muốn đo nhân viên truy cập máy chủ qua Cloudflare Tunnel phải chạy từ **mạng khác** (4G hoặc máy nhân viên), không dùng loopback làm kết luận. Với WebApp, curl chỉ đo đường HTTP; cần đo `?startupMetrics=1` để đánh giá DOM, Firebase Auth và first-data-painted riêng.

**Quyết định host/production chưa được phê duyệt.** Công cụ không đổi DNS, deploy Pages, mở firewall/tunnel hoặc thay Firebase/Supabase. Không gửi nội dung tài khoản/token hay JSON bản ghi trong báo cáo. Kết quả đo mới chỉ có sau khi người vận hành chạy tại máy của họ.

---

## 25/10/2026 — Chạy thử Firebase realtime trên Windows (PR #72; KHÔNG phải production)

**Đã có script thật trong GitHub, không chỉ có hướng dẫn chat:** [`source/scripts/start-local-staging.ps1`](https://github.com/cavoixanh638/HopHDND-WebApp/blob/feat/exclusive-cell-leases-admin-freeze-20261025/source/scripts/start-local-staging.ps1), và [hướng dẫn nghiệm thu hai trình duyệt](https://github.com/cavoixanh638/HopHDND-WebApp/blob/feat/exclusive-cell-leases-admin-freeze-20261025/source/docs/operations/FIREBASE_LOCAL_MULTI_BROWSER_STAGING_2026-10-25.md). Script ở **branch** `feat/exclusive-cell-leases-admin-freeze-20261025` của PR #72; không nhầm với main, không trộn với code Supabase PR #75.

Máy QA hiện dùng clone `D:\HopHDND-Firebase-QA-20261025-Retry`, đã `npm ci` và cài Microsoft OpenJDK 21. Từ PowerShell, chạy nguyên khối:

```powershell
& {
  $ErrorActionPreference = "Stop"
  $repo = "D:\HopHDND-Firebase-QA-20261025-Retry"
  $branch = "feat/exclusive-cell-leases-admin-freeze-20261025"
  git -C $repo -c http.version=HTTP/1.1 pull --ff-only origin $branch
  if ($LASTEXITCODE -ne 0) { throw "Khong cap nhat duoc GitHub. DUNG." }
  & "$repo\source\scripts\start-local-staging.ps1"
  if ($LASTEXITCODE -ne 0) { throw "Staging da loi. DUNG." }
}
```

Nếu máy không cho chạy `.ps1`, **chỉ ở phiên PowerShell kiểm thử** có thể dùng:
`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\HopHDND-Firebase-QA-20261025-Retry\source\scripts\start-local-staging.ps1"`.

- URL chỉ trên **máy Windows đó**: `http://127.0.0.1:5173/pages.html`. Giữ terminal mở để Emulator Auth `127.0.0.1:9099`, RTDB `127.0.0.1:9000` và Vite chạy; `Ctrl+C` để dừng. Firebase project **`demo-hdnd`**, tạo ba bản ghi **giả**; **không đọc/ghi production**.
- Anonymous chỉ được xem trong Rules ứng viên mới. Muốn nghiệm thu lưu thật bằng Google trên môi trường giả lập phải đăng nhập các UID Google thử nghiệm được quản trị viên cấp quyền, và chứng minh UID A/B khác nhau; không coi chỉ mở hai cửa sổ ẩn danh là PASS cho phần edit.
- Không cần clone/npm ci/Java lại khi các bước đã thành công; không chạy cùng thư mục với agent khác đang checkout Supabase. Dùng **clone/worktree riêng** cho Supabase, tách cấu hình localhost/port và không chia sẻ `.env.local`/credential qua nhánh.
- Script không kết nối Supabase và **không làm WebApp production chạy realtime**. Chỉ khi có tích hợp trên một exact commit được nghiệm thu mới thử được nút chọn Supabase trong WebApp. Supabase PR #75 vẫn Draft/read-only QA tùy trạng thái thực tế ở [issue #74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74).

**Cảnh báo:** source ở main chưa chứa các file staging PR #72 cho tới khi PR được ghép và phát hành an toàn. Lệnh này thực thi bản feature đã kiểm thử, không hứa dữ liệu công việc thật.

---



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
