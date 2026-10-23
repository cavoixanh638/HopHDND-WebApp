# HopHDND — tăng tốc mở trang lần đầu, kể cả chưa có cache

Cập nhật 23/10/2026. PR #32: `perf/cold-boot-code-splitting-20261023`.

## Vấn đề và mốc trước

Bản public Pages dùng file `index.html` nhúng cả JS/CSS, nén gzip **336.691 byte** (log GitHub CI trước thay đổi). JavaScript khởi chạy ở ~741–746ms trên máy người dùng qua hai phép đo tab thường/ẩn danh trước đó. Thời gian Firebase Auth có thể lên tới 1.383ms đăng nhập khách mới; RTDB snapshot 55 dòng tốn 106–390ms sau khi mở listener. Những mốc này **khác môi trường**, không đại diện một phân phối trung bình và không được cộng như các bước tuần tự.

## Giải pháp đã kiểm thử

1. Public GitHub Pages là **tập HTML + JS/CSS chunks có hash nội dung**. Chuyển `pages` từ Vite `codeSplitting:false` sang code-split, `source/scripts/prepare-pages.mjs` tạo `dist-pages/index.html` và kiểm tra tham chiếu relative path. Workflow `.github/workflows/publish-pages.yml` publish `index.html` và `assets/*` cùng một commit, xóa assets cũ. Không thay Firebase Rules.
2. `source/src/pages-main.tsx` chuyển admin `ExcelTransferPanel` sang `React.lazy`: module `xlsx` **không tải khi người xem mở báo cáo/danh sách lần đầu**; chỉ tải khi admin chọn Excel · Trích xuất.
3. Sáu Google Fonts không còn CSS `@import` luôn luôn; `loadSelectedWebFont` chỉ yêu cầu font Google khi admin thực sự chọn font đó. Segoe UI/system không cần tải font từ ngoài.
4. Chế độ offline vẫn dùng **`npm run build` → `dist/Dashboard_HĐND.html` một file HTML**; CI kiểm chứng đầu ra đúng một file.
5. Chrome smoke `source/scripts/smoke-pages-browser.mjs` phục vụ đúng assets riêng và kiểm thử giao diện khách, tương tác, dữ liệu mô phỏng, không gọi dữ liệu Firebase production. Bổ sung log cold shell/render trên Chrome profile sạch.

## Kết quả đo từ chính CI

| Chỉ số | Trước (bản inline) | Sau (split) |
| --- | ---: | ---: |
| JS+CSS+HTML tải lúc cold open, gzip | 336.691 bytes | 176.701 bytes |
| Giảm | — | **159.990 bytes = 47,52%** |
| JS Excel quản trị (lazy), gzip | phải tải cùng HTML | khoảng **160.945 bytes**, chỉ tải khi mở công cụ |
| HTML offline độc lập | có | có; CI xây một file duy nhất |

Chỉ số trên được tính từ **sản phẩm build**, cùng gzip Node; không giả định Chrome network/CPU của người dùng sẽ giảm thời gian theo đúng tỷ lệ. GitHub Pages HTML cũ chứa JS khởi động + cả XLSX. Số liệu sau: `PAGES_COLD_PAYLOAD` trong CI PR #32.

## Nghiệm thu và hạn chế

- Test TypeScript/unit, Firebase emulator, chrome smoke, kiểm tra cấu hình nguồn + quyền admin, build offline.
- Test import admin Excel riêng: mở công cụ mới tải chunk `ExcelTransferPanel-*.js`; danh sách và báo cáo không yêu cầu chunk này.
- Sau khi publish, đo bằng tab ẩn danh mới qua `?startupMetrics=1`: 3 lần, ghi `js-entry`, `auth-start-anonymous`, `auth-signed-in`, `data-first`, `first-data-painted`. Nếu không mở admin, Network tab không có chunk Excel.
- Xác thực RTDB vẫn bắt buộc (`hdnd/.read` yêu cầu `auth != null`). Không bỏ Auth hoặc đưa 55 dòng nghiệp vụ vào public HTML để tạo cảm giác nhanh. Tối ưu mã chỉ làm **Auth được bắt đầu sớm hơn**, không làm biến mất thời gian Auth network. Nếu cần giảm thêm login lần đầu, phải tách chi phí DNS/network của Identity Toolkit bằng Chrome DevTools và đánh giá kiến trúc backend, không nới quyền dữ liệu.
- Không nhầm cache RTDB 15 phút với đồng bộ nguồn Excel: mirror 55 dòng đã import vẫn chưa có lịch tự copy Excel → Firebase.

## PR #34 — Lần mở đầu: khởi tạo Firebase Auth trước React (23/10/2026)

Yêu cầu: thời gian mở **trình duyệt mới, không cache**, không chỉ F5. Hai ảnh mới của người dùng cho thấy tab ẩn danh hiện bảng ~2.241 giây, Chrome nhiều tab ~2.000 giây. Trong tab ẩn danh, từ bắt đầu sign-in tới `auth-signed-in` là ~1.423 giây; 55 dòng RTDB sau khi subscribe đến trong 126ms. Dữ liệu không được chuyển thành public JSON hoặc làm suy yếu `hdnd/.read = auth != null`.

### Cách triển khai

- `firebase-boot.ts` tạo **một** Firebase app/Auth/Database singleton, độc lập React. `pages-main.tsx` gọi `startFirebaseWarmup()` **trước** `createRoot().render()`. Chờ `auth.authStateReady()` để không tạo tài khoản khách khi danh tính Google/admin đang khôi phục. Một `ensureGuestAuth` dùng chung Promise với hook `useFirebase` tránh hai lệnh tạo guest đồng thời.
- Production dùng `initializeAuth` với IndexedDB, browser local và fallback memory, không khởi tạo popup/redirect resolver mặc định cho khách. Chỉ khi user bấm đăng nhập Google, `login()` mới lấy `GoogleAuthProvider`, `signInWithPopup` và `browserPopupRedirectResolver`. Các kênh RTDB cần xác thực vẫn **chỉ** mở sau Auth.
- Đã thử tách **Firebase boot và toàn bộ UI** thành hai tệp JS (preload UI). Kết quả riêng trong GitHub runner: gzip khởi động 169.458 bytes, nhưng Chrome shell 927ms so với mốc 654ms trước đó. **Loại bỏ biến thể này**, không đưa lên website. Giữ UI chạy một lượt, giữ lazy-load riêng SheetJS quản trị và font chọn riêng.
- Khi đổi thứ tự gộp CSS trong biến thể tách JS, phát hiện `.app-shell.wide-table-page > main {min-width:920px}` từ `item-frame.css` vô tình ép trang khách rộng hơn cấu hình 850px. Đã khoanh quy tắc 920px đúng màn hình chỉnh sửa admin (`.settings-page`) và Chrome smoke đã xác nhận căn giữa trở lại.

### Chứng cứ CI — không coi là thời gian Firebase production

| Bản CI | gzip HTML + JS/CSS cold | Chrome clean profile: thấy khung |
| --- | ---: | ---: |
| Bản Pages trước PR #34 | 178.560 bytes | 654ms (một lần chạy, CI) |
| Tách UI riêng, bị loại | 169.458 bytes | 927ms (một lần chạy, CI) |
| Khôi phục UI một lượt, Auth gọn | 177.697 bytes | 718ms (một lần chạy, CI) |
| Auth gọn (trước khi tách module Google) | 177.836 bytes | **320ms** (một lần chạy, CI) |
| **Bản chốt PR #34**: Google login được tách thành module riêng | **177.742 bytes** | **332ms** (một lần chạy, CI) |

**Các con số Chrome là bốn lần chạy khác nhau trên GitHub runners, không phải phép A/B cùng phần cứng và đường truyền**; dao động rất lớn. Không thể khẳng định tốc độ 320ms là cải thiện trung bình hoặc hứa mục tiêu 1–1,5 giây ở Firebase production. Giá trị thực tế của thay đổi là sớm hơn 1 bước React effect, bỏ phụ thuộc popup không cần thiết và không tạo tài khoản ẩn danh trùng.

### Test / điều kiện phát hành

- `firebase-warmup.test.ts`: khi Auth đang khôi phục tài khoản Google không được gọi anonymous; nếu hai thành phần cùng yêu cầu guest login thì chỉ phát sinh **một** call. `firebase-config-state.test.ts`: nút đăng nhập Google vẫn nhận popup resolver.
- Firebase emulator, TypeScript, toàn bộ unit, Chrome smoke cột/bảng/tab/UI, HTML offline độc lập và công cụ Excel lazy phải PASS.
- Đo production trên **cùng máy, cùng mạng**: `?startupMetrics=1` vào tab ẩn danh mới, ít nhất ba lần, ghi thời điểm `js-entry`, `auth-start-anonymous`, `auth-signed-in`, `data-subscribe`, `data-first`, `first-data-painted`. Chrome Network có thể đối chiếu request Identity Toolkit / WebSocket. **Không gửi token hoặc dữ liệu nghiệp vụ trong log.**
- Không ảnh hưởng vấn đề **Excel→Firebase 60s chưa triển khai tự động**; tốc độ đọc DB không có nghĩa snapshot Excel luôn mới.

**Build cuối** (Verify HopHDND source CI #39943024303): tệp `google-popup-login-*.js` thật sự tồn tại, gzip **132 bytes**, được tải theo thao tác admin. Tuy nhiên tổng cold gzip chỉ thay đổi dưới 1% so với bản trước, vì phần lớn Firebase Auth SDK vẫn nằm trong bundle chính; **không được coi đây là tối ưu giảm mạnh dung lượng**. Điểm ưu tiên là Auth bắt đầu trước React effect, loại bỏ khởi tạo popup/redirect resolver cho khách, giữ nguyên chức năng quản trị và bảo mật. Chrome smoke PASS, bản offline và emulator PASS.

## PR #36 — tải bảng trước, quản trị tải khi dùng

Yêu cầu mới: "các chức năng chỉnh sửa, tài khoản... load sau được không? quan trọng nhất là các bảng, dữ liệu".

**Đã triển khai**:
- Trang mặc định `Báo cáo tổng hợp`: tải ngay UI khung, dữ liệu, Firebase Authentication, profile/layout admin (cần để xác nhận nguồn), các KPI và `ReportTable`. Không làm thay đổi bảo mật hoặc các quy tắc đọc.
- Tách theo `React.lazy` cho `ItemList` (tab thứ 2), `ReportDetailGrid` (khi click số lượng), `HistoryDialog`, `ConnectionPanel`, `FirebasePanel` (tài khoản), `ReportSettings`, `CatalogSettings`, `SyncPanel`, `ApprovalReviewPanel`. `ExcelTransferPanel` và `google-popup-login` đã deferred ở PR cũ và được giữ nguyên.
- Sau khi nguồn bảng đã hiện, đợi 1,2 giây rồi **prefetch mã tab Danh sách**, tránh tranh băng thông với dữ liệu Firebase của lần mở đầu. Nếu bấm tab sớm thì dùng Suspense fallback.
- Bản HTML offline vẫn một file, chỉ thay kiểm tra cú pháp để dùng kiểm tra ESM đúng `<script type=module>` (các dynamic import có thể sử dụng `import.meta`). Không bổ sung đường dẫn JS ngoài cho bản offline.

**Kết quả CI build so sánh** (hai lượt GitHub runner khác nhau, KHÔNG phải cùng máy/CPU):
| Đo | Main trước PR #36 (run 39949606538) | PR #36 (run 39955485568) |
| --- | ---: | ---: |
| Gzip HTML + các JS/CSS bắt buộc cho lượt đầu | 178.692 B | **144.120 B** |
| Giảm | — | **34.572 B (19,35%)** |
| Số asset bắt buộc | 2 | 10 (nhiều chunk dùng chung) |
| Chrome CI khung giao diện | 555 ms | 694 ms |
| Bản offline độc lập | PASS (gzip 148.782 B) | PASS (gzip 153.428 B) |
| TypeScript, unit, Firebase emulator, browser smoke | PASS | PASS |

**Không được tuyên bố Chrome thực tế đã tăng tốc** chỉ dựa vào 19% gzip vì nhiều request nhỏ hơn có thể tăng overhead, và Chrome smoke từ các runner khác nhau. Bản mới cải thiện **đường dữ liệu cần tải trước**, nhưng thời điểm first paint phải kiểm chứng qua `?startupMetrics=1` trên cùng máy và mạng: `first-data-painted`, Firebase `data-first`, JS entry; trung vị ít nhất 3 lần. Nếu first paint xấu đi rõ rệt cần điều chỉnh chiến lược chunking/rollback.

**Thẩm quyền**: danh sách chỉ mở chế độ sửa đúng cơ chế cũ, kiểm tra Firebase Auth/quyền qua server; React.lazy chỉ hoãn mã giao diện, **không thay đổi quyền**. Layout admin và nguồn là điều kiện xác nhận cần thiết và phải kiểm tra trước khi cho phép cấu hình hay sửa. Dữ liệu Excel vs DB vẫn là nguồn admin đã lưu, A/B URL chỉ đọc không đổi profile. Bản Firebase mirror hiện chưa có lịch tự đồng bộ Excel 60 giây.

## PR #37 — quyết định khôi phục bản tải giao diện một lượt

Ngày 23/10/2026, sau khi PR #36 phát hành, người dùng đo trực tiếp hai phiên Chrome:
- Tab ẩn danh: JS entry 387ms, đăng nhập 842ms, RTDB subscribe 848ms, kết nối 1788ms, nhận 55 dòng 2187ms, hiển thị 2225ms.
- Chrome nhiều tab: JS entry 889ms, đăng nhập 1249ms, subscribe 1253ms, kết nối 1927ms, nhận 55 dòng 2459ms, hiển thị 2492ms.
- Đo bản **trước PR #36** (hai phiên khác nhau): hiển thị 1704ms và 2221ms. Trung bình bản trước 1962,5ms; bản mới 2358,5ms; **tăng khoảng 396ms (~20,2%)**, nhưng số mẫu nhỏ và không A/B cùng phiên nên chưa khẳng định duy nhất nguyên nhân.
- CI bản trước (run 39949606538): Chrome shell 555ms, initial gzip 178692B, hai assets đầu.
- CI PR #36 (run 39955485568): Chrome shell 694ms, initial gzip 144120B, **10 assets** bắt buộc. Gzip giảm 19% nhưng shell chậm hơn trong phép thử. Nhiều chunk và scheduling/roundtrips có thể làm lợi ích bị triệt tiêu; phần RTDB kết nối cũng biến động độc lập.

Quyết định: rollback **riêng phần lazy-load giao diện PR #36** (App, test virtual-tree, offline packager, deferred-sections), giữ nguyên tối ưu PR #32–35 (Excel import lazy, font chọn theo yêu cầu, Auth warmup và Google popup lazy, chẩn đoán RTDB, so sánh Excel vs Database). Đồng thời không thay đổi Firebase Rules hoặc dữ liệu. Để tiếp tục việc hoãn giao diện chỉnh sửa trong tương lai, phải thiết kế split 1–2 chunk, thiết lập A/B production có đối chứng ít nhất 5 lần và ngưỡng thất bại/rollback trước khi triển khai thay đổi mặc định. Tối ưu **first-data-painted** thay vì chỉ gzip payload.

Nghiệm thu rollback: typecheck/unit/Emulator/offline single HTML/Chrome smoke và Pages PASS; so sánh log CI `PAGES_COLD_PAYLOAD` và `COLD_CHROME_SHELL`; kiểm tra riêng hai tab/các trang admin không mất chức năng. Nguồn Firebase vẫn có 55 dòng với `syncedAt` 11:41:44 23/10/2026; đây là vấn đề tươi mới dữ liệu, không phải thời gian tải trang.

## PR #38 — khởi động đọc dữ liệu sau Auth, song song cấu hình/quyền

Cơ sở ảnh từ người dùng: sau rollback PR #37 có hai lần bảng hiển thị lúc 3.912s và 3.379s. Lần đầu Auth hoàn tất 2.349s nhưng mirror listener chỉ bắt đầu 3.571s (chờ 1.222s); lần hai subscribe 1.295s nhưng có data lúc 3.344s (chờ 2.049s). Khoảng chờ này **không liên quan số lượng 55 dòng** và không được khắc phục chỉ bằng gộp bundle JS.

Thay đổi:
1. Sau khi Firebase Auth xác thực người dùng, `useFirebase` khởi động **đọc RTDB mirror** song song với `hdnd/profile`, `hdnd/permissions`, `hdnd/control`, `.info/connected`. Không đợi có quyền sửa hoặc tải xong chức năng admin trước khi yêu cầu dữ liệu.
2. `authenticated-mirror-stream.ts` quản lý một listener cho mỗi `Database + UID + source path`. Khi profile xác nhận Database, `FirebaseMirrorRepository.subscribe()` tái sử dụng listener và snapshot đã đến, **không gọi network listener lần hai**. Sau đó realtime updates vẫn chạy. Listener tắt khi hết chủ sở hữu.
3. Nếu profile đã cache và chọn Excel, không mở mirror. Nếu profile live xác nhận Excel, dừng warm-up Database; Excel đọc theo cơ chế gốc. Dữ liệu được đọc sớm **không được hiển thị khi nguồn vẫn chưa được xác nhận**; không công khai dữ liệu, không vượt Firebase Rules, không chia cache giữa UID.
4. Các mốc `mirror-warm-start` và `mirror-warm-first` cho phép phân biệt thời gian Auth→mở listener, listener→nhận snapshot, nhận snapshot→profile/layout đủ điều kiện, và thời gian render. Không dùng chúng như bằng chứng rằng nguồn đã xác nhận.
5. Giữ nguyên số tệp JS ban đầu theo PR #37, không tách thêm giao diện. Quyền sửa tiếp tục cần `permissionsReady + control.ready + mayEdit` và xác thực; không được nâng quyền vì ưu tiên bảng.

**Giới hạn:** Prefetch mirror có thể tải thêm 1 payload (~55 dòng) nếu browser mới chưa có profile cache nhưng admin thật sự chọn Excel, dù listener sẽ đóng sau khi xác nhận nguồn. Đổi lại nếu live config chọn Database, listener đã chạy song song và có thể loại bỏ chờ tuần tự. Chưa có bằng chứng đó giảm 1.222s cho mọi lượt, vì độ trễ Firebase/Chrome vẫn biến động.

Nghiệm thu: unit manager (UID isolation, only one listener, cleanup), Firebase hook (5 listeners concurrently), full TypeScript/unit/emulator/Chrome/offline test. Sau publish: đo ít nhất 5 lần incognito mới trên cùng máy/mạng, so median `first-data-painted`, 95th percentile và thời gian `mirror-warm-first` với `profile-received`. Nếu không cải thiện hoặc gây lỗi thì rollback. **Không chạm vào lịch Excel→Firebase 60s (chưa thực sự hoạt động).**
