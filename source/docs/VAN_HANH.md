## 21/10/2026 — Hướng dẫn hiển thị gọn cột

Trong Danh sách các ND trình HĐND, mở **Gộp cột** ở mép trên Bảng dữ liệu, tick một hoặc nhiều trong 4 cách. Các tick chỉ tác động cách đọc bảng trên trình duyệt; muốn xem lại cột gốc, bỏ tick hoặc nhấn **Hiện đủ cột Excel** tạm thời. Trường nằm trong ô gộp vẫn sửa riêng nếu tài khoản được cấp quyền; ô nào không cho sửa không hiển thị editor. Người quản trị muốn sửa thứ tự, width hay quyền cột phải vào chế độ tùy chỉnh, nơi hiển thị đầy đủ cột nguồn.
Tìm kiếm gõ tên đầy đủ ngay cả khi chuyên viên viết tắt, và lọc nhóm bằng từ thuộc bất kỳ trường nào bên trong. Popup không tự kế thừa tùy chọn cá nhân này. Không xóa dữ liệu nguồn khi bật/tắt, không biến kết quả hiển thị thành nội dung ghi Excel. Quy tắc kiểm thử và giới hạn đã ghi CURRENT_STATE.

## 20/10/2026 — Đối chiếu tên cột Excel nguồn và nghiệm thu giao diện PR #7

Đã xác nhận từ nội dung file Excel gốc trên Google Drive cập nhật 20/10: cột E là `Loại VB`, không được lấy tên cột mô tả tùy tiện `Loại VB (HC/QPPL/BC)`. Không đổi giá trị `HC/QPPL/BC`. Kiểm ở Danh sách/popup (cùng EXCEL_SOURCE_COLUMNS hoặc ItemLayout) và cấu hình lịch sử. Hai card điều hướng có tổng chiều rộng không vượt 820px; chỉnh màu/hover/focus không làm ảnh hưởng phép tính hay source. Bộ lọc select dùng chữ placeholder mờ, Esc chỉ xóa lọc đúng cột sau chọn. Ô quyền sửa nổi trên điều khiển, guest read-only không xuất hiện editor. CI TypeScript/unit/Firebase emulator/Chrome bắt buộc PASS, sau merge theo dõi cả GitHub Pages build+deploy. Không xuất bản file HTML thử.

## 20/10/2026 — Quy trình nghiệm thu hai khu vực chính (PR #6)

Khi đổi chrome, giữ nguồn chuẩn ở `source/src/app/App.tsx`, `source/src/styles/app.css`. Hai khu vực nguồn `overview/items` phải có thẻ chuyển rõ, không thể hiện thêm heading trùng và banner tự cập nhật. Phiên bản luôn nhìn thấy cho khách và admin; nút đăng nhập/cài đặt, phân quyền, các thao tác thật trong Tài khoản/Nguồn vẫn phải hoạt động. Không loại nhầm `unknown-note` cục bộ của báo cáo: chỉ dòng cảnh báo toàn trang không phân loại NQ/BC bị ẩn.

CI bắt buộc xác nhận: hai thẻ có kích thước đầy đủ và chỉ một active, chuyển qua lại không làm dịch chuyển khung, các bảng và popup vẫn có thể dùng; truy cập trang nguồn, bộ kiểm Firebase và bản in không bị lỗi. Sau merge theo dõi **cả** Build and publish Pages và Pages deployment success; phiên bản chính tại https://cavoixanh638.github.io/HopHDND-WebApp/ . Không gửi HTML kiểm thử riêng; không ghi production Firebase/Excel.

## 20/10/2026 — Vệ sinh phần đầu Danh sách và định vị tooltip (PR #5)

Giữ tách mã GitHub (nhánh + PR + CI) và phát hành thẳng GitHub Pages chính sau merge, không cấp file HTML thử. Về bố cục: page title chỉ một lần, số nội dung sát lựa chọn cột, cảnh báo nguồn rút gọn nhưng không xóa; GID/reset nằm ở trang tài khoản/nguồn. Tooltips dùng chung helper tính vị trí ngoài ô, đọc rect khi đổi ô, không dùng pointermove hoặc CSS `body:has`. Không bổ sung quyền ghi nguồn. Sau deploy luôn nghiệm thu Chrome cả người sửa/admin và khách. Trạng thái CI [#39423111683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39423111683) PASS.

## 20/10/2026 — Điều chỉnh giao diện trực tiếp tại GitHub Pages

Bản sửa PR #4 gom popup khách thành bảng đọc/lọc cột; bỏ công cụ kỹ thuật và tìm kiếm trùng, căn tên bảng giữa. Tooltip báo cáo tránh che số bằng một lần đọc rect khi đổi ô; tooltip sửa dùng singleton manual popover xuất hiện ngay, popup được top-layer hỗ trợ; dropdown có viền+mũi tên, CSS không thêm observer. Kiểm thử đúng workflow Verify PR và Chrome smoke; xuất bản tự động qua `main` sau merge, không phát hành HTML thử riêng. Không ghi Firebase/Excel production. Các bằng chứng CI ghi [CURRENT_STATE](CURRENT_STATE.md).

## 20/10/2026 — Phát hành GitHub Pages trực tiếp (quy trình thay thế preview cũ)

Sau khi mã nguồn trên branch được kiểm TypeScript, unit, Firebase emulator, Chrome mock và PR merge vào `main`, GitHub tự chạy `.github/workflows/publish-pages.yml`, build Pages từ `source/`, ghi `index.html` của trang chính; Pages triển khai commit tiếp theo. URL duy nhất gửi để nghiệm thu: https://cavoixanh638.github.io/HopHDND-WebApp/ . Không phát hành HTML preview riêng hay gửi người dùng file HTML tải về; các bài kiểm thử nội bộ vẫn bắt buộc.

Lần chuyển đổi đầu tiên: backup `backup/before-direct-pages-publish-2026-10-20`; merge `d6734b1789f8f0494e50213e17a157d7bf96b569`; Build #39349869241 PASS; Pages #39350027217 PASS; commit root phát hành `c7517e0782d95fe82c3ee6b10b12cb18d0ae6876`. Khi muốn rollback, đối chiếu cả source/code/HTML, không tự khôi phục hay ghi dữ liệu nghiệp vụ. Các ghi chú preview trước ngày này giữ lại để tra cứu, không áp dụng cho phát hành mới.

---

## 20/10/2026 — Mốc source PASS, đang chờ phát hành preview

- Exact source `bb398c0d4acc3a828eb1d7f4cf75a06745b28c05` đã PASS Verify [#39296834797](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39296834797). Các cải tiến tên bảng, màu ô theo từ, sort chỉ khi sửa, tooltip quyền sửa, căn giữa và lịch sử theo ô đã commit trên PR #3.
- **Không coi CI PASS là preview đã cập nhật.** Muốn kiểm bằng link Pages phải phát hành artifact đã kiểm đúng SHA/digest vào `preview/current/index.html` theo workflow được phép, sao lưu bản preview trước; không thay `main:index.html` hoặc merge PR #3. Preview có thể kết nối Firebase đang vận hành: tránh nhấn nút ghi cấu hình/dữ liệu thật khi chỉ xem thử.
- Trong nghiệm thu riêng, kiểm ở chế độ xem/khách và admin: sort chỉ khi sửa, ô không quyền không có dấu sửa, hai bảng cùng màu từ khóa và căn ô; biểu tượng lịch sử không hiện ở khách; nguồn không có audit phải có thông báo, không phỏng đoán. Chưa đo độ trễ trên Windows/số dòng thật hoặc thử thay đổi quyền ngay lúc đang mở popup.




## Preview popup chiều rộng/quyền sửa — 19/10/2026

Preview source PASS #39270344125, exact SHA 355ec81fb274da44c19eb1e277409547a6a2d3b8; publisher commit b67cddf56b6b70471ea931faec0c7f02d61cf9b3 (19/10/2026 21:39:50 VN). Hai file preview/current/index.html và preview/popup-width-permissions-2026-10-19/index.html cùng blob 0f4656ac5d351ef4865a782d652403fdcba0bf2d; main:index.html vẫn blob 48aff33fdac08477e38c8f4d49837eb68eee0584. PR #3 Draft/chưa merge, Excel và Firebase business data không ghi. CI cuối cùng của docs #39270758690 PASS. Chưa có nghiệm thu Chrome Windows trực tiếp và chưa xác nhận website cache trên máy người dùng.

Chỉ publish các file preview trên nhánh main từ artifact CI bất biến #39270344125 (digest sha256:bd4bacec9f87a14a50736486c031abda4e3fa154e68822a4f3e6ea990b955aea); workflow ghim chính xác SHA, run, digest, kiểm marker UI trước copy. Sao lưu workflow và preview cũ tại backup/before-popup-width-permissions-preview-2026-10-19. Không sửa root hoặc merge PR #3. Nếu cần quay lại, phải phân biệt hoàn nguyên preview với dữ liệu/cấu hình người dùng; không tự động đụng Firebase/Excel.
# Vận hành HopHDND — triển khai, sao lưu, phục hồi và xử lý sự cố

**Phạm vi:** bản GitHub Pages 0.7.0 đọc dữ liệu qua Google Sheets/GViz, Firebase Authentication và cấu hình dùng chung qua Realtime Database. App Google Apps Script 0.6.2 là nhánh vận hành độc lập. Tài liệu này là **quy trình tham chiếu**, không phải xác nhận các phép kiểm sản xuất đã thành công. Trạng thái thực tế duy nhất xem [CURRENT_STATE](CURRENT_STATE.md).

## 0.2. Preview popup mới — resize, lọc, mẫu riêng, không ghi nguồn (19/10/2026)

- Mã popup mới: `ColumnResizeHandle.windowDragFallback` bật **chỉ trong modal**, dùng pointer listeners ngắn hạn AbortController, dọn trên thả/hủy/unmount; `ReportDetailGrid` table width bằng tổng `colgroup`, có kéo mép cột và phục hồi. Source-test [#39263671680](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39263671680) **PASS**, CDP cột ID 100→165px, table 2120→2185px, đóng mở giữ 165px. `backup/before-popup-grid-parity-resize-2026-10-19` at `c146ee3bbf49edb5cb29a703cddd3cf81177348c`.
- **Lần publish popup parity PASS:** [Publisher #39264618146](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264618146) + [Pages #39264646359](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264646359). Chỉ ghi `preview/popup-grid-parity-2026-10-19/index.html` và `preview/current/index.html` từ artifact `sha256:d3aed0aa167577320ac297edec488992c1ab982ab755d020e26648fa3f5a5c51` verified source SHA `37774e6d32d843f37337f5cb8936db2617e42d0d`. Các đường dẫn preview cũ còn giữ. Backup main `backup/before-popup-grid-parity-preview-2026-10-19` tại `68f039942d66ec35158cdec45ab4de0f7e4ae1f2`. Production root `index.html` không đổi, PR #3 chưa merge.
- Các mẫu hiển thị và màu riêng của popup dùng `hdnd.report-detail-presets.v1`/`hdnd.report-detail-colors.v1` và nguồn/preview-scoped localStorage. Không sửa `ItemLayout`, Firebase profile/permissions, Excel/Sheets. Không tự bật cập nhật nguồn từ popup.
- [Đối chiếu chức năng popup/Danh sách](REPORT_DETAIL_PARITY_2026-10-19.md). **Bảng quản trị schema/20 cột tự tạo, quản trị quyền/khóa/duyệt và ghi Excel thật không nhân đôi** vào popup; chỉ điều hướng về màn hình chính. Preview chỉ được xuất bản sau kiểm exact artifact CI SHA/digest, không đụng `main:index.html`, không merge PR #3.

## 0.1. Bảng chi tiết từ ô báo cáo — phạm vi triển khai thử (19/10/2026)

- `ReportDetailGrid` là bản thử UI trên PR #3, không được bật writer Excel/Firebase. Dùng `SheetsRepository` đọc, `workspace.update` giữ nháp, `workspace.keepDraft` lưu checkpoint cục bộ; bộ phận quản trị vẫn áp dụng phân quyền và khóa sửa hiện hành. Không coi nháp cập nhật nguồn.
- Cấu hình cột riêng lưu `localStorage` theo nguồn dữ liệu/preview; **không** sao lưu lên Firebase và **không** tự đồng bộ giữa máy. Rollback code/preview không tự phục hồi preferences cục bộ; khi cần có thể bấm Khôi phục mặc định trong modal.
- Mốc mã nguồn có bằng chứng [Verify #39256157291](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256157291), SHA `c2d13b56dd675e230c39d7364d9a9054397159e6`, chỉ dùng artifact PASS để publish preview. Khi bật ghi Excel thực trong tương lai phải có quyết định riêng về writer, quyền, ETag/recordId, chống xung đột và read-back confirmation.
- **Preview bảng chi tiết nhanh đã triển khai:** [Publisher #39256870483](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256870483) PASS; [Pages #39256898732](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256898732) SUCCESS. Mở [preview/detail-grid-columns-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/detail-grid-columns-2026-10-19/) hoặc `preview/current/`. Có thể quay lại bản hover trước bằng preview dated `clear-cell-hover-2026-10-19/`. **Production root giữ nguyên**, PR #3 OPEN. Backup main trước xuất preview: `backup/before-detail-grid-preview-2026-10-19` tại `0020f88253c6857b1d081f0de637aa41665643c1`.
- Các hướng dẫn preview hover cũ phía dưới thuộc lịch sử; không dùng chúng làm mốc chức năng Bảng chi tiết nhanh.

## 0. Trạng thái hiện hành — commit và preview hover đã chốt 19/10/2026

- **Đã commit trên nhánh PR #3**: thay đổi CSS ở `b22b877c8f81d840059abd738dde5d7c9a24d0a9` và Chrome A/B test ở `cb4c276b2f649a178993ab0bb3abd192f4faca83`. Mốc kiểm mã: [Verify #39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414) **PASS** tại SHA test `cb4c276b2f649a178993ab0bb3abd192f4faca83`; đơn vị 352 PASS, Firebase emulator 20 PASS, Chrome smoke và đo A/B PASS. Chi tiết ở [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- **Artifact bất biến, không build từ HEAD di động:** candidate digest `sha256:2d2f23ab40e21229556998de0bba0e649d15dd7e46a7ed77b370218463d21271`; publisher [#39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) PASS; Pages deploy [#39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864) PASS. URL đánh giá được chốt: [preview/clear-cell-hover-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/) hoặc [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/). Các preview dated trước đó **không ghi đè** và là bản để so sánh/rollback.
- **Mốc sao lưu trước thay đổi code:** `backup/before-high-contrast-cell-hover-2026-10-19` từ SHA `68893b4ac094b991cb19b82d515da1f124ae2fa3`. **Mốc sao lưu main trước publish:** `backup/before-clear-cell-hover-preview-2026-10-19` từ SHA `d16124f0f430c0003cc6aca0cead9df520fd7c2e`. Rollback preview bằng cách ghim lại HTML artifact đã kiểm hoặc sao chép preview dated cũ **vào preview/current** trong workflow có kiểm nguồn SHA; không rollback bằng cách thay root `main:index.html`, không merge PR #3 hoặc đổi dữ liệu.
- **Bất biến cần kiểm sau thay đổi:** 5 báo cáo/cột nghiệp vụ không bị thêm giả, click phủ toàn ô số dương kể cả tổng hàng/tổng bảng, tooltip singleton `Click để xem chi tiết` 190×32px, chỉ ô đang hover có nền `rgba(9,106,113,.14)` + outline 2px `#08777B`, focus 3px; **không dùng global `body:has()` / CSS Anchor**, không layout shift/timer/blur hoặc hover tô cả hàng. So sánh lại Chrome Layout/Task/A/B và kiểm đặc biệt các trường hợp Tab/Enter/Space, cuộn, in PDF trước khi chấp nhận biến thể màu mới.
- **Phân biệt preview và production:** `main:index.html` root blob `48aff33fdac08477e38c8f4d49837eb68eee0584` giữ nguyên. **PR #3 vẫn OPEN, chưa merge.** Tránh bấm tùy tiện Lưu / Duyệt / Khóa ở preview do có thể tương tác Firebase production; dữ liệu Excel và Firebase production không được thay đổi trong nhiệm vụ giao diện/ghi tài liệu.

## 0a. Mốc preview cũ — chỉ để truy nguyên, không phải bản đang nghiệm thu

### Trạng thái phát hành preview từ CI bất biến — 19/10/2026

- Nguồn GitHub Pages chính vẫn là `main:index.html`, **không** sửa artifact minified trực tiếp. PR #3 chưa merge; preview nằm dưới `preview/current/` và `preview/ux-fixes-2026-10-19/` (không là production root).
- Lượt này ghim artifact từ **exact source SHA** `7a3a409e16b1b6621d121b09a57e9e7960c20568`: [CI #39184896725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39184896725) → [publish preview #39185030924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185030924) → [Pages #39185044694](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185044694), tất cả SUCCESS. Mốc sao lưu `backup/before-preview-ux-fixes-publish-2026-10-19` từ main cũ.
- Quy trình nghiệm thu: xác định rõ URL preview/production; thử chức năng không ghi trước; dùng tài khoản quản trị kiểm lưu Firebase **có kiểm soát và rollback cấu hình riêng**. Preview và site chính **cùng Firebase production**; ở preview **không thử ngẫu nhiên các nút Phê duyệt / Khóa sửa / Lưu quyền / Lưu Bảng báo cáo**, vì chúng có thể ghi thật. Test emulator không chứng minh Rules production hoặc tốc độ browser thật.
- Khi đóng PR hoặc phát hành site chính phải xác nhận mã/CI mới, quyền thực tế và thống nhất `getKpis`/bảng báo cáo; không tự merge PR để sửa 4 lỗi UI nếu chưa nghiệm thu phần quản trị đi kèm.

## 1. Phân biệt những thao tác dễ nhầm

| Thao tác | Tác động | Không tác động |
|---|---|---|
| Build / phát hành WebApp | Mã và giao diện đang phục vụ ở GitHub Pages | Không tự thay nội dung Google Sheets hoặc Firebase |
| Quay lại bản phần mềm | Khôi phục file HTML/bản phát hành trước | Không tự khôi phục dữ liệu hay cấu hình đã thay đổi |
| Sao lưu / khôi phục dữ liệu | Snapshot và phục hồi dữ liệu/cấu hình từ nguồn đã kiểm | Không tự quay lại mã nguồn |
| Đọc lại Sheets | Tải lại dữ liệu nghiệp vụ bằng GViz | Không ghi ngược dữ liệu hay phục hồi nháp |
| Lưu cấu hình | Ghi `hdnd/profile` hoặc `hdnd/permissions` sau xác thực/quyền | Không ghi vào `hdnd/items` hay nguồn Excel |

Không dùng các thuật ngữ trên thay thế nhau. Trước thao tác có khả năng ghi, xác định **môi trường, phạm vi, người phê duyệt, bản sao và cách quay lại**.

## 2. Nơi chứa mã và môi trường

- GitHub: [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp). Thư mục `source/` chứa mã nguồn; `index.html` ở gốc repository là bản đã build phục vụ [GitHub Pages](https://cavoixanh638.github.io/HopHDND-WebApp/).
- Dự án local tương ứng: `D:\Google Drive\VP UBND\HĐND\Dashboard trình HĐND code`. GitHub chỉ là bản nhập mã tại một thời điểm, **không tự đồng bộ hai chiều với thư mục Windows/Drive**.
- Nguồn nghiệp vụ hiện hành: tệp Excel trên Google Drive qua URL Google Sheets và `gid=60961344`; xem [từ điển dữ liệu](TU_DIEN_DU_LIEU.md). Dữ liệu nghiệp vụ không được nhập sang Firebase ở giai đoạn hiện tại.
- Firebase: project `hophdnd-8b7b2`, các nhánh cấu hình `hdnd/profile`, `hdnd/permissions`. Không được mặc định coi Rules trong GitHub là Rules đang áp dụng trên server.
- App Google Apps Script (legacy) không chia sẻ quy trình triển khai với GitHub Pages. Hướng dẫn kỹ thuật riêng: [FIREBASE_PAGES](FIREBASE_PAGES.md), [DONG_BO_CAU_HINH](DONG_BO_CAU_HINH.md).

## 3. Chuẩn bị và kiểm thử trước phát hành

Thao tác tại **gốc mã nguồn** (trên GitHub là `source/`; trên Windows là thư mục dự án, không chạy ở thư mục chứa HTML phát hành):

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

`test:firebase` cần Firebase emulator và điều kiện thực thi phù hợp; không coi lỗi môi trường là test đã đạt. Thử nghiệm emulator không thay thế xác minh Auth/Rules thật. Chỉ build được một `dist-pages/index.html` chưa chứng minh môi trường Pages tải thành công.

Trước phát hành cần kiểm:
1. Git sạch/commit nguồn cụ thể; danh sách file thay đổi, kiểm không có bí mật, token, `node_modules`, log hoặc dữ liệu không được phép công khai.
2. Sao lưu file HTML đang phục vụ và ghi lại commit SHA cũ để quay lại được; không dùng bản mới khi chưa ghi nhận đường quay lại.
3. Ở **bản test**, đối chiếu số dòng/nguồn URL/gid, bộ lọc, KPI, xuất Excel, nháp không ghi nguồn, chế độ quản trị, quyền cấu hình.
4. Kiểm Firebase Rules đúng bản và quyền Google admin/anonymous qua môi trường thử; **không tự deploy Rules production** chỉ vì build HTML.
5. Người dùng/người chịu trách nhiệm duyệt thay đổi trước khi công bố.

## 4. Phát hành GitHub Pages và kiểm sau phát hành

1. Build từ mã nguồn `source/`, lấy đúng `dist-pages/index.html`. Copy **nội dung file build** vào `index.html` ở gốc repository; không ghi đè `source/index.html` (đầu vào Vite).
2. Commit có thông tin phiên bản, mã nguồn tương ứng và cách quay lại. Push `main` chỉ sau khi đã duyệt; Pages được cấu hình phục vụ từ gốc repository.
3. Mở URL Pages, tải mới không dùng cache, xác nhận đúng phiên bản/artifact. Kiểm **số dòng thực tế** và chức năng với tài khoản khách lẫn quản trị.
4. Lưu bằng chứng nghiệm thu vào [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md), cập nhật kết quả trong [CURRENT_STATE](CURRENT_STATE.md). Nếu trang lỗi, không gọi triển khai thành công chỉ vì commit thành công.

**Đã có CI/CD từ 16/10/2026:** `.github/workflows/verify-source.yml` kiểm thử trên Pull Request, `.github/workflows/publish-pages.yml` tự cài phụ thuộc, kiểm TypeScript, unit tests, Firebase emulator, docs, build Pages từ `source/` khi push `main`; chỉ khi đạt mới ghi `index.html` ở gốc và phát hành qua GitHub Pages. Không sửa HTML minified thủ công nữa. Việc tự build này **không tự đồng bộ** thư mục Windows/Google Drive, không deploy Firebase Rules hay thay dữ liệu Sheets. [Kết quả kiểm thực tế](CURRENT_STATE.md).

## 5. Quay lại phiên bản phần mềm (rollback code)

Khi bản mới bị lỗi, tìm commit đã phát hành ổn định, xác nhận nó chứa `index.html` đúng và tạo **commit phục hồi file đó** trên `main` (không force-push hay xóa lịch sử). Đợi Pages cập nhật rồi chạy kiểm tra tối thiểu. Nếu đã thay Firebase Rules/schema cùng lúc, không chỉ phục hồi HTML: đối chiếu độ tương thích và dùng quy trình thay đổi Rules riêng. Không tự ý khôi phục cấu hình/dữ liệu từ backup chỉ để xử lý lỗi giao diện.

## 6. Sao lưu và khôi phục dữ liệu / cấu hình

**Ba phạm vi khác nhau, phải sao lưu độc lập:**

| Phạm vi | Nguồn chuẩn và việc cần bảo vệ |
|---|---|
| Nội dung nghiệp vụ | Tệp Excel nguồn trên Drive; ưu tiên lịch sử phiên bản/bản sao của chính tệp, không xem file xuất từ WebApp là backup đầy đủ |
| Cấu hình chung và quyền | `hdnd/profile` và `hdnd/permissions` ở Firebase RTDB; bảo toàn cả revision, cấu trúc, quyền ô/dòng/cột |
| Bộ mã và Rules | Commit GitHub của HTML/source và `source/firebase/database.rules.json`; Rules **đang chạy** phải kiểm độc lập trước thay |

Quy trình an toàn: xác định phạm vi → lấy snapshot có thời điểm và checksum/phương án đối chiếu → thử khôi phục **trên bản sao hoặc emulator** → đối chiếu số dòng, cấu hình và quyền → xin duyệt → chỉ khi cần mới khôi phục production → kiểm đọc lại. Không xóa hay ghi đè kho dữ liệu thật để “thử”. Không lưu file backup chứa dữ liệu cá nhân, token hay cấu hình nhạy cảm vào public GitHub.

**Lưu ý:** Git rollback không tự phục hồi nội dung Firebase; phiên bản Firebase không được bảo đảm có bản backup tự động. Phải kiểm tra chính sách backup và quyền truy cập thực tế trước khi cam kết khả năng phục hồi.

## 7. Chẩn đoán sự cố

| Triệu chứng | Kiểm tra theo thứ tự | Giới hạn / hành động an toàn |
|---|---|---|
| GitHub Pages hiển thị **0 dòng** | Xem URL/gid đang chọn, `localStorage` khóa `hdnd.sheet-config.v1`, phản hồi GViz A:O hiện hành (các snapshot legacy A:P/A:R chỉ để đọc tương thích), quyền truy cập từ trình duyệt, lỗi console/network | Bản local từng đọc 51 dòng **không chứng minh** Pages cũng đọc được; không nhập sang Firebase để che lỗi |
| Không vào được tùy chỉnh danh sách | Kiểm Firebase Auth Google admin, trạng thái load cấu hình và điều kiện disable ở UI | Đã có phản ánh nút bị khóa khi 0 dòng; **chưa xác nhận đã sửa** |
| Không sửa được quyền ô/cột/dòng | Kiểm Auth `google.com`, email verified, `hdnd/permissions`, Rules production, baseline/revision | Không cấp quyền bằng cách mở Rules công khai |
| Sửa nháp nhưng dữ liệu nguồn không đổi | Đây là thiết kế hiện tại của Pages | Nháp trình duyệt không ghi Sheets/Firebase; cần phân biệt thao tác `Áp dụng` và `Lưu cấu hình` |
| Bản mới không xuất hiện | Kiểm commit `main`, file HTML gốc, trạng thái Pages, cache trình duyệt | Không sửa mã TypeScript bằng cách vá HTML đã nén |
| Lỗi/xung đột lưu cấu hình | Kiểm dữ liệu gốc/revision, kết nối, tài khoản, Rules; giữ nháp và đọc lại baseline | Không bỏ kiểm tra revision, không ghi lại liên tục khi chưa rõ trạng thái |

Khi chưa xác định nguyên nhân, chỉ thu thập bằng chứng không ghi dữ liệu; không nới quyền `anyone/write` để chữa lỗi.

## 8. Ranh giới tài liệu

- [CAI_DAT_VA_CHAY](CAI_DAT_VA_CHAY.md): cách chạy lệnh local và build; **tài liệu này** là quy trình phát hành/rollback/sao lưu/ứng cứu chuẩn.
- [FIREBASE_PAGES](FIREBASE_PAGES.md): schema Firebase, mô hình Auth và Rules; **tài liệu này** không lặp toàn bộ Rules.
- [SYSTEM](SYSTEM.md), [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md): bất biến nghiệp vụ và ánh xạ trường; không mô tả lại trong xử lý sự cố.
- [CURRENT_STATE](CURRENT_STATE.md): kết quả đang xác nhận và các tồn tại; [WORKBOARD](WORKBOARD.md): người phụ trách và tiến độ; [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md): bằng chứng thử cụ thể.

Không tự coi hướng dẫn này là giấy phép triển khai production, thay Rules hoặc phục hồi dữ liệu thực.

## 9. Mốc hồi phục trước tính năng mới (16/10/2026)

- **Rollback code chuẩn:** commit `6d2226467d83e518f793d5c5e97eb11b29ba2def`; nhánh dự phòng `backup/pre-features-2026-10-16` giữ nguyên trạng thái trước khi bổ sung lọc cột, mẫu giao diện, màu điều kiện, phê duyệt và khóa sửa. Không force push; nếu cần quay lại, tạo commit phục hồi từ mốc này rồi chạy CI và xác minh Pages.
- **Code phát triển:** nhánh `feat/saved-views-approval-lock-filters-2026-10-16`, PR #3 (draft khi tạo), không phát hành tự động lên main. GitHub branch/commit không chứa bản sao nội dung Excel hay Firebase.
- **Các mẫu giao diện cá nhân/màu:** trước rollback trình duyệt hoặc xóa dữ liệu browser, cần xuất/sao chép cấu hình nếu muốn giữ; lưu trong localStorage theo URL nguồn, không phải backend chung.
- **Mốc duyệt/khóa sửa:** sử dụng Firebase `hdndReviews` (admin-only) và `hdnd/control`. Khi đưa Rules mới vào production, lưu snapshot Rules đang chạy và thử emulator trước; không ghi đè toàn bộ Rules của project dùng chung. Rollback code **không tự xóa** mốc duyệt, trạng thái khóa hoặc khôi phục Google Sheets.
- **Phạm vi khóa:** nút khóa trong WebApp chỉ chặn người không phải admin sửa thử trong ứng dụng. Muốn ngừng sửa trực tiếp file nguồn, cần quản lý quyền Google Sheets/Drive tại nguồn theo chính sách riêng.

