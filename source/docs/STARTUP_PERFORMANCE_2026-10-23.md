# HopHDND — đo thời gian khởi động thực tế và ngăn đọc trùng (23/10/2026)

## Phân tích dựa trên mã nguồn (không tự suy đoán thời gian mạng)

Ở bản trước PR #29, tệp HTML JS build cuối đã gần 1.1 MB chưa nén, gzip khoảng 334 KB (giá trị ví dụ từ bản build test; khác điều kiện cache/network của từng máy). Khung React không chứa sẵn bản ghi Excel/Firebase nên kết nối mạng là cần thiết ở lần mở mới.

### Chuỗi khởi động
1. Trình duyệt tải HTML/JS, parse/chạy React/Firebase SDK.
2. `useFirebase` mở `onAuthStateChanged`. Nếu chưa có phiên hợp lệ, đăng nhập ẩn danh với Firebase Auth trước khi truy cập các nhánh RTDB cần xác thực.
3. Khi đã có User, cùng một effect đăng ký song song `.info/connected`, `hdnd/profile`, `hdnd/permissions`, `hdnd/control`. Cấu hình layout lưu trong localStorage từng xác nhận được dùng ngay trước khi profile mới tới; localStorage **không dùng để cấp quyền sửa**.
4. Tài khoản có cấu hình `dataSource=database`: `onValue(hdnd/mirrors/{fileId}/{gid})` tự cấp bản snapshot ban đầu; sau đó phát thay đổi theo thời gian thực. Cấu hình chưa cache có thể tạm trỏ sang Google Sheets cho đến khi nhận profile từ Firebase, nên lần mở đầu sau xóa storage sẽ mất thêm thời gian.
5. React tính số liệu thống kê và dựng bảng báo cáo/danh sách trong trình duyệt sau khi nhận rows. Danh sách chỉ tải UI khi người dùng chuyển sang tab Danh sách, nhưng dữ liệu chung dùng cùng một nguồn.

### Lỗi làm mất thời gian phát hiện
- Trước sửa, `useWorkspace` gọi `get()` thông qua `repository.list()` và **cùng lúc** gọi `onValue()` qua `repository.subscribe()` trên cùng đường snapshot. Điều đó tạo hai đường đọc logic cho một dữ liệu.
- `App` đưa `firebase.user.uid` vào dependencies của `useMemo` tạo repository. Khi Firebase Auth chuyển từ null sang user, object thay đổi, workspace reset `items=[]` và có thể tải lại cùng 55 dòng.
- Đã sửa tại PR #29: `subscribeInitial=true` áp dụng cho riêng Firebase mirror, không tự gọi `list()` lần đầu; chỉ subscribe khi có `firebase.user`; giữ nguyên instance repository qua thay đổi UID nếu source chưa đổi. `list()` vẫn còn phục vụ kiểm tra chuyển source của admin và refresh theo yêu cầu.

### Vì sao không thể kết luận một con số mili giây từ mã
Không có tốc độ mạng, DNS/RTT, Chrome cache, trạng thái Auth và RTDB server của máy người dùng. Không được coi CI giả lập Firebase là thời gian production. Lần đầu, lần F5, và lần mở trong cửa sổ ẩn danh có thời gian khác nhau.

### Công cụ đo KHÔNG chứa nội dung công việc

Sau khi PR #29 CI PASS và đã deploy:

1. Mở `https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1`
2. F5 (đầu tiên), chụp bảng **Chẩn đoán thời gian mở trang**. Mỗi mốc là số ms tính từ lúc bắt đầu navigation, **không cộng** các hàng vì có kênh song song.
3. Bấm **Sao chép số đo (không gồm dữ liệu bảng)** để gửi nguyên JSON timings. Nếu cần biết cold/hot, làm lần thứ hai bằng F5 sau 30 giây; lần đầu mở ẩn danh có Auth chậm hơn.
4. So sánh: `js-entry`, `firebase-initialized`, `auth-checked`, `auth-signed-in`, `rt-db-connected`, `profile-received`, `permissions-received`, `control-received`, `data-subscribe`, `data-first`, `first-data-painted`.
5. Để biết request download chi tiết và size từ mạng, mở Chrome DevTools (F12) → Network → Disable cache tùy mục tiêu → Reload → waterfall. RTDB có WebSocket; riêng timing WebSocket không tương ứng `ResourceTiming` HTTP request. Không tự đưa token, headers, bản ghi vào tài liệu công khai.

**Điều kiện nghiệm thu**: không hiển thị nhầm dữ liệu khi chưa có Auth; `get()` không bị gọi trùng từ subscriber; sau Auth, snapshot đầu tiên tới phải hiện đúng 55 dòng; cập nhật Firebase onValue phải giữ bảng không nháy trắng, kích thước/giữ quyền admin. Nếu dữ liệu 55 dòng chưa thay đổi, chuyển tab không yêu cầu tải lại nguồn.

## Đo hai lần mở trang thực tế do người dùng cung cấp (23/10/2026)

Thời điểm là **mốc tính từ navigationStart**, không phải tổng thời gian của từng thao tác. Một lần browser bình thường và một lần browser ẩn danh:

| Mốc | Bình thường (ms) | Ẩn danh (ms) |
| --- | ---: | ---: |
| JS bắt đầu | 746 | 741 |
| React dựng khung | 799 | 869 |
| Auth state check | 807 | 1447 |
| Bắt đầu anonymous sign-in | 807 | — |
| Auth signed in | 2190 | 1447 |
| Database connected | 2414 | 1676 |
| Quyền | 2476 | 1868 |
| Control | 2477 | 1869 |
| Profile | 2482 | 1870 |
| Bắt đầu nghe RTDB | 2510 | 1456 |
| Nhận 55 dòng RTDB | 2616 | 1846 |
| 'First data painted' cũ | 1319 (57 dòng, không phải Database) | 1876 (55 dòng) |

**Chẩn đoán xác nhận từ mã:** khi cold-start chưa có nguồn được xác nhận, `App.tsx` chọn SheetsRepository trước, dẫn tới việc tải GViz và hiện 57 dòng trước khi cấu hình admin xác nhận nguồn Database (55 dòng). Lần bình thường tốn thêm 1.383 giây từ khi bắt đầu tới khi hoàn tất đăng nhập khách. Thời gian từ đăng ký RTDB đến nhận snapshot: **106ms** ở bình thường và **390ms** ở ẩn danh. Đây là hai mẫu riêng, không đủ kết luận trung bình toàn hệ thống; phần chính trong lần chậm nằm ở Auth/chờ profile, **không phải tốc độ truyền 55 dòng**.

**Rủi ro dữ liệu:** 57 dòng Google Sheets và 55 dòng Firebase có thể do parser khác nhau hoặc bản nhập thủ công đã cũ. Không mặc định đây là hai bản ghi mới bị thiếu: cần đối chiếu mã/ID theo nguồn và thời điểm sửa Excel. Mirror 55 dòng chưa có lịch đồng bộ tự động nên không khẳng định là nguồn mới nhất.

**Thay đổi PR #30:**
- Cấm **tự khởi chạy Excel** khi admin source chưa xác nhận. Nếu cached source là Excel nhưng Firebase vẫn ở trạng thái `loading`, đợi profile hiện hành rồi mới đọc; nếu cached source Database và Firebase Auth đã sẵn sàng, cho phép nghe RTDB song song với tải profile.
- Giữ đường `Xem dữ liệu tạm` do người dùng bấm chủ động trong trường hợp Firebase chưa kết nối, không tự thay nguồn âm thầm.
- Dời mốc `first-data-painted` sang sau khi React dựng bảng **từ nguồn đã cho phép**, không bị chặn bởi layout pending/error. Thêm mốc `source-selected`, `excel-request-start` và `excel-response` để đếm rõ tác vụ GViz thừa.
- Không đổi Firebase Rules, không thay dữ liệu admin hoặc nhập dữ liệu mới.

**Nghiệm thu bằng cùng trình duyệt:** mở `?startupMetrics=1` rồi F5 thường/ẩn danh, so `source-selected` và `first-data-painted`; khi admin đã chọn Database thì không được xuất hiện `excel-request-start` lúc mở mới, và `first-data-painted` phải ghi **55 dòng · Database** (hoặc số thực tế RTDB). Đo ít nhất 3 lần mỗi chế độ để tránh kết luận từ một mẫu.

## Tiếp tục tối ưu 23/10 — đọc từ bộ nhớ đệm phiên, xác thực chạy song song

Đề nghị từ người dùng: auth chạy nền; admin save tạo layout mặc định; 55 dòng trích nhanh để đọc ngay. Đánh giá theo **quy tắc Firebase production**:

- **Có thể dựng khung/layout ngay**: profile `hdnd.confirmed-profile.v1:hophdnd-8b7b2` đã cache sau khi Firebase xác nhận, trong `localStorage`. Khi admin lưu, `storeConfirmedProfile(valid)` đã tạo bản xem nhanh trên thiết bị đang lưu, còn các thiết bị khác nhận từ Firebase và tạo cache sau lần kết nối đầu. Không có bước build lại GitHub Pages sau khi admin save.
- **Không được vô hiệu hóa Auth cho nội dung**: production rule `hdnd/.read = auth != null`; công bố snapshot 55 dòng ở HTML/GitHub Pages/JSON công khai sẽ làm mất ranh giới này, kể cả khách thông thường có thể đăng nhập ẩn danh. Có thể chạy **Auth bất đồng bộ song song với UI shell**, nhưng dữ liệu lần đầu vẫn phải xác thực.
- **Tốc độ dữ liệu thực**: hai mẫu đo trên máy người dùng cho thấy sau khi bắt đầu nghe RTDB, 55 dòng tới trong 106–390ms; tốc độ này không tỉ lệ thuận với số dòng mà còn có RTT/handshake. Nếu đọc toàn bộ 55 dòng trong JSON, dung lượng đủ nhỏ; tách fetch theo trang không chắc giảm thời gian và có thể làm sai số thống kê.
- **PR #31** tạo cache theo phiên tab, UID đã xác thực, Excel ID, GID, TTL 15 phút, kiểm tra schema. Sau Auth, `useWorkspace` dựng ngay snapshot cache nếu có; `onValue()` tiếp tục xác minh trực tuyến và cập nhật; trong lúc chờ **chỉ xem**, nhãn cảnh báo rõ đây là bản cũ. Mất kết nối không xóa cache nhưng giữ read-only. Khi đăng xuất xóa cache; không đẩy nội dung lên GitHub công khai. Không dùng `localStorage` lâu dài để tránh dữ liệu nghiệp vụ tồn lưu trên máy dùng chung.
- Lần mở **tab ẩn danh mới** hoặc **thiết bị chưa từng mở** không có cache, vì thế thời gian Auth + network vẫn tồn tại; không hứa hiển thị 55 dòng trước Firebase. Nếu muốn preload nội dung trước Auth cần quyết định/chính sách cho phép dữ liệu đó đọc công khai, không thể tự thay đổi Rules.
- Đo lại hai kiểu: F5 trong **cùng tab** sau lần đọc thành công (có thể có `data-cache-hydrated` trước `data-first`), và cửa sổ incognito mới (không có cache). Không cộng thời gian milestone. Đối chiếu số dòng, `syncedAt` và `sourceModifiedAt`: cache chỉ nhanh, không tự biến bản Excel nhập thủ công thành bản mới.
- Muốn giảm tiếp khoảng 740ms từ lúc tải trang đến khi JavaScript bắt đầu và giảm Auth lần đầu 1.383ms phải tối ưu **khởi động JS/đường truyền/Auth** trên chứng cứ waterfall. Bản build Pages đang đóng gói **1 HTML chứa JS/CSS** theo quy tắc offline; code-splitting/lazy loading admin module đòi thay kiến trúc gói không được thực hiện ngầm.

### Kiểm thử bắt buộc
1. Mở lần đầu chưa có Auth: không đọc `hdnd/mirrors`, không hiển thị cache người khác.
2. Sau auth: cache đúng UID/source, chưa quá 15 phút, schema hợp lệ được dựng ở chế độ chỉ xem; RTDB vẫn đăng ký **một** kênh `onValue`.
3. Khi RTDB xác nhận: gỡ cảnh báo, mở quyền xem/sửa thử theo quyền hiện tại, thay nội dung nếu nguồn cập nhật.
4. Khi RTDB lỗi: giữ cache nhưng vẫn khóa sửa, cảnh báo nguồn chưa được xác nhận. Đăng xuất xóa cache.
5. Không xuất JSON nội dung HĐND ra public repo/web assets, không sửa Rules, không tự đổi dataSource.

## 23/10/2026, ảnh tiếp nhận sau khi Pages đã code-split — phản hồi chậm cực đoan

Hai ảnh gửi bởi người dùng cùng ngày (mở incognito / mở Chrome với nhiều tab):

| Mốc (ms từ navigationStart) | Ảnh 1, incognito | Ảnh 2, Chrome nhiều tab |
| --- | ---: | ---: |
| JS entry | 402 | 19.419 |
| React | 449 | 19.505 |
| Firebase Auth ready | 1.957 | 31.448 |
| Database listener subscribe | 2.335 | 31.462 |
| .info/connected = true | 2.199 | 89.192 |
| 55 rows first snapshot | 2.465 | **203.545** |
| valid first paint | 2.488 | **203.570** |
| profile/permissions/control | ~2.275–2.305 | ~203.645 |

Thời gian 19.419ms trước JS entry **không phải do tính toán 55 dòng**; cần tách HTML TTFB, bundle asset finish và browser scheduling. 172.083 giây từ đăng ký listener tới snapshot (với RTDB connected vào 89s) **không phải tốc độ xử lý JSON**; có thể do mạng, proxy chặn/buffer WebSocket, tab background/suspended, hoặc SDK reconnect sau mạng không ổn định. **Không kết luận chính xác nguyên nhân chỉ từ hai ảnh; không quy lỗi chắc chắn cho WebSocket.**

Thay đổi PR tiếp theo:
- `captureNetworkDiagnostics`: Navigation Timing (TTFB HTML, DOM ready), static bundle JS/CSS Resource Timing, browser visibility, connection effectiveType nếu trình duyệt cung cấp. Không đưa full URLs, API keys, tokens, business data vào clipboard.
- `?startupMetrics=1`: cảnh báo nếu Auth chưa xong sau 12s hoặc listener RTDB chưa có snapshot sau 12s; người dùng có lựa chọn **so sánh** đường kết nối Firebase thường và chế độ `?dbTransport=longpoll`. Firebase `forceLongPolling()` được gọi trước khi khởi tạo DB; không áp dụng mặc định hoặc ép người dùng chuyển, vì ở môi trường WebSocket bình thường long-polling có thể chậm hơn.
- Cửa sổ ẩn danh nhiều/ít tab không đồng nghĩa mạng ổn định/không ổn định. Khi so sánh phải đo cùng mạng, cùng máy, tab foreground, không chuyển tab chờ tải. Mỗi giao thức ít nhất ba lần mở mới; theo dõi nguồn và số dòng như cũ.
- Khi tab nền, Chrome có thể throttle hoặc suspend; chỉ dựa `visibilityState` thời điểm snapshot không đủ chứng minh tab đã bị suspend trước JS entry. Cần thêm Chrome Performance/Network waterfall nếu xuất hiện mốc >10s.

**Giới hạn:** Đây là tính năng chẩn đoán và lựa chọn kết nối, không phải cam kết giảm thời gian thực tế từ 203s xuống số giây cụ thể. Không bỏ Firebase Authentication hoặc sửa Firebase Rules; dữ liệu HĐND không được công khai trong build.
