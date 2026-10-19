# Trạng thái hiện tại

## 19/10/2026 — Click/hover toàn bộ ô số lượng báo cáo (PR #3, nghiệm thu browser đang kiểm tra)

- **Yêu cầu mới đã xác định:** không cần click hoặc rê đúng lên số/nút nhỏ, toàn bộ ô đếm **có số dương** phải nhận hover + click, gồm trạng thái, tổng từng đơn vị và dòng Tổng cộng ở **cả năm** bảng mặc định. Ô rỗng (ký hiệu `—`), ô % hoàn thành và tiêu đề cột không được mở danh sách.
- Mã nguồn `src/features/reports/ReportTable.tsx`: nhãn `report-clickable-cell` chỉ có khi `!preview && entries.length>0`; nút HTML `count-drill` vẫn có `aria-label`, `onPointerOver/Out`, `onFocus/Blur`, `onClick`; thay vùng bấm bằng overlay CSS toàn ô. `report-cell-sizer` vô hình giữ nguyên chiều cao tự nhiên của dòng; render/in không nhân đôi số. Tooltip phản hồi ngay, không qua React state; nút Enter/Space mở danh sách theo ngữ nghĩa native.
- `src/styles/app.css`: td có `position:relative`, nút `position:absolute`, trải qua toàn ô; hover/focus đổi nền nhẹ + viền focus dễ nhận, không thay màu trạng thái cơ bản. Chrome smoke từng phát hiện chênh lệch tọa độ phía trên 2px, phía dưới 1px; đã thêm bù trừ phần viền và bắt buộc kiểm lại. Không sửa `columnWidths`, quy tắc thống kê/Excel, Firebase, hay API.
- Kiểm thử: `tests/reporting.test.ts` đối chiếu nút thật, tính ngữ nghĩa, preview không có vùng click, ô trống/%. `scripts/smoke-pages-browser.mjs` so kích thước nút với từng ô trong Chrome và gửi **sự kiện chuột thật tới góc ô**, kiểm mở/đóng danh sách với ô trạng thái/tổng dòng/tổng bảng. Không được coi thử `.click()` vào tâm nút là đủ.
- Bản sao mã nguồn trước sửa: `backup/before-full-report-cell-click-2026-10-19` tại commit `ce6a309b2123f1c3f93b4355504e399eb7ac4440`; bản sao main trước phát hành mới: `backup/before-full-cell-preview-publish-2026-10-19` tại `580e055fdb9827c107419100e78425cb37794d3b`. Mới sửa nhánh PR #3, **chưa merge**, không đổi trang root hay dữ liệu nghiệp vụ.
- **Trạng thái khi lập mục:** unit tests đã đạt ở bản mã trước; Chrome smoke mở rộng đang sửa lỗi hình học và chạy lại CI. **Không tự tuyên bố bản mới đã phát hành/đạt nghiệm thu** cho tới khi có CI exact SHA SUCCESS + Pages SUCCESS. Thời gian dựng modal sau click vẫn chưa benchmark trên dữ liệu thật; cải tiến lần này là vùng bấm, không phải virtualization.

## 19/10/2026 — Đồng bộ màu nhạt và tooltip tức thì khi rê qua số báo cáo

- Yêu cầu mới: cột **Không phải trình** trong báo cáo xây dựng NQ phải **nhạt hệt** `Đã trình HĐND, chưa có QĐ`; hover số lượng **chỉ lướt qua cũng phải thấy chữ**, không đợi trình duyệt vài trăm mili giây/một nhịp dừng.
- Trong `ReportTable.tsx`, gắn `report-stage-intermediate` cho cả hai cột xây dựng NQ. CSS dùng chung **cùng 4 màu nền/chữ/viền/nhấn** cho `report-stage-excluded` và `report-stage-intermediate`, bỏ quy tắc màu `excluded` mạnh riêng từng có; năm kiểu trình bày và chế độ in có cùng kết quả nhạt. Giữ `excluded` như nhóm nghiệp vụ riêng, **không** thay đổi số đếm, mẫu số/tử số hoặc file Excel.
- Tooltip cũ đến từ thuộc tính HTML `title` bị browser trì hoãn. Thay bằng `InstantCountTooltip.ts`: hiện **đồng bộ ngay ở sự kiện pointer-enter/focus**, ẩn khi rời/blur/click/scroll/resize; một DOM node nằm ngoài overflow của bảng, không qua React state hay tạo render lại cả 5 bảng; nút vẫn có `aria-label` và mở chi tiết bằng click. Không có timer/delay trong code.
- Regression: `report-style-css.test.ts` bảo vệ màu và độ tương phản; `smoke-pages-browser.mjs` kiểm màu header/thân/chân hai cột bằng computed CSS và dispatch pointerover/pointerout xác minh tooltip hiện/ẩn ngay trong cùng thao tác JavaScript. **CI PASS** mã commit `8e3e78fdd1eb0b4060cc1e4091d820e4d46b5970` tại [Verify #39194775971](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194775971): 351 unit PASS (20 skipped), 20 Firebase Emulator tests PASS, typecheck/build/Chrome mock smoke PASS. **Preview publish PASS** [#39194973248](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194973248), **Pages deployment PASS** [#39194987734](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194987734). Các URL hiện có: `preview/current/`, `preview/ux-fixes-2026-10-19/` và bản tránh cache `preview/instant-hover-2026-10-19/`. Trang `main:index.html` gốc vẫn blob `48aff33fdac08477e38c8f4d49837eb68eee0584` (không đổi).
- Điểm sao lưu trước sửa: `backup/before-instant-tooltips-muted-build-2026-10-19` tại `46aa3611c99117bb9dc376f979bbefc7093dcb89`. Mốc sao lưu main trước phát hành: `backup/before-instant-hover-preview-publish-2026-10-19` tại `450832e23e32e73cc0d210b612d323ff899af908`. Chỉ phát triển trên PR #3; không merge và không ghi Excel/Firebase. Tooltip tức thì **khác** tốc độ mở danh sách chi tiết sau click; việc đo hiệu năng modal dữ liệu thật vẫn còn mở.

## Kiểm toán yêu cầu ↔ tài liệu ↔ mã nguồn — 19/10/2026 (cập nhật sau phát hành preview)

**Phạm vi bằng chứng:** phiên chat hiện tại, các đoạn lịch sử trong project và một số trao đổi cũ truy xuất được; mã và docs trên PR #3; trạng thái GitHub Actions/Pages trực tiếp. **Không có khả năng xác nhận đã đọc toàn bộ văn bản của mọi phiên chat đã archived**, vì vậy đây là đối soát theo nguồn khả dụng, chưa là kiểm toán tuyệt đối 100%. Không lấy suy luận từ tệp đã viết làm bằng chứng rằng mọi chỉ đạo người dùng đều được ghi nhận.

**Kết quả kiểm toán:** trước lượt này **chưa đồng bộ đầy đủ**. `TU_DIEN_DU_LIEU.md` còn ghi Excel A–P, O = Ghi chú/P = Rút và tự thay ô trống bằng “Chưa phân công”; `FEATURES.md` còn nêu F14 đọc A–P, quy trình sort/kéo báo cáo/chi tiết chưa có tiêu chí nghiệm thu đầy đủ; `HUONG_DAN_SU_DUNG.md` còn mô tả lọc bằng icon, 50 dòng/trang và nhầm trạng thái preview. Các file trên phải được chỉnh theo **source đang chạy trên nhánh** thay vì kế thừa lời mô tả cũ. `SYSTEM.md` cần ghi 5 báo cáo và cách tính chính thức. Chỉ mục tại `docs/README.md` cần chỉ đúng A–O và nơi tra theo yêu cầu. Chi tiết kiểm thử thuộc `KIEM_THU_VA_NGHIEM_THU.md`. Bản ghi cũ trước 19/10 trong tài liệu này được giữ là **lịch sử**, không phải quy tắc hiện hành.

**Bằng chứng đã xác nhận ngày 19/10:**
- PR #3 mã nguồn kiểm thử tại commit `7a3a409e16b1b6621d121b09a57e9e7960c20568`; [CI run 39184896725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39184896725) kết luận **success**, 43 test files/350 unit tests PASS (2 files/20 test bỏ qua), 20 Firebase emulator tests PASS; TypeScript, build HTML và browser smoke PASS. Browser smoke có kiểm bấm tiêu đề sort, cột `Không phải trình` và mở/đóng dialog; **chưa đo FPS hoặc thời gian mở dialog trên dữ liệu/tài khoản/browser thật**.
- [Preview publish run 39185030924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185030924) PASS, ghim đúng artifact từ CI nêu trên và xuất HTML đồng nhất tại `preview/current/index.html` và `preview/ux-fixes-2026-10-19/index.html`. [Pages deployment run 39185044694](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185044694) PASS. HTML root `main:index.html` **không đổi** (blob `48aff33fdac08477e38c8f4d49837eb68eee0584`); PR #3 vẫn **chưa merge**, site chính giữ bản cũ.
- Các địa chỉ nghiệm thu: https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/ và https://cavoixanh638.github.io/HopHDND-WebApp/preview/ux-fixes-2026-10-19/ . Cùng chung backend Firebase production; **không** dùng thao tác lưu cấu hình/quyền, phê duyệt, khóa trên preview như một phép thử vô hại.
- Bản sao `main` trước phát hành: `backup/before-preview-ux-fixes-publish-2026-10-19` từ commit `7b96b23df929f6dacaa71a9e9d1d4e2b450f615b`; mã nguồn tính năng có checkpoint `backup/before-resize-sort-drilldown-2026-10-19`. Chỉ bản preview trên main được thay, không ghi Excel hay Firebase production bằng CI.

**Bốn phản hồi mới nhất — trạng thái thực tế:**
- F21: tay nắm kéo cột nguồn trong chế độ sửa, `ColumnResizeHandle` cập nhật DOM trực tiếp khi kéo; ghi layout khi thả chuột; CSS header đã trở lại `position:relative`. **Cần người dùng thử kéo thật và lưu Firebase**.
- F07/F09: cả năm bảng báo cáo có tay nắm cho cột nhóm/tổng/trạng thái/% trong chế độ chỉnh; `ReportConfig.columnWidths` lưu riêng; đã loại quy tắc CSS ép cột đầu cố định 230px. **Cần kiểm kích thước và persistence thật**.
- F13/F21: bấm tiêu đề cột hoặc icon gọn để sort ba trạng thái tăng/giảm/về nguồn; thao tác kéo tiêu đề đổi thứ tự và kéo ranh giới không đồng nghĩa click sort. Có regression Chrome mock. **Chưa nghiệm thu với browser của người dùng**.
- F06: bấm số đếm dương mở modal chi tiết, nút có ↗/hover/focus; `MemoReportTable`+`useCallback` tránh render lại bảng nền khi props giữ nguyên; tắt `backdrop-filter` của modal chi tiết. **Chưa có benchmark định lượng; chưa virtualize danh sách lớn**, không tuyên bố đã loại bỏ hoàn toàn lag.
- F02/F03/F04/F10: `build` có cột **Không phải trình** ngay sau Tổng số nội dung, H `Không phải trình xây dựng NQ` được tính trong mẫu số, không tính hoàn thành; 5 báo cáo mặc định và từ vựng trạng thái theo [từ điển](TU_DIEN_DU_LIEU.md).

**Sai khác còn tồn tại cần sửa/kiểm độc lập, không được đánh dấu PASS:**
1. `getKpis` trong `src/domain/reporting.ts` vẫn đếm KPI hoàn thành theo raw `Hoàn thành` trong khi báo cáo HĐND chuẩn hóa trạng thái `Đã trình HĐND thành phố`; có rủi ro KPI/báo cáo không nhất quán khi Excel thay giá trị. Chưa sửa mã ở lượt kiểm toán tài liệu.
2. Trải nghiệm danh sách chi tiết chưa đo trên Chrome thật với nhiều dòng; chưa có virtualization hoặc so sánh before/after ms/FPS.
3. Chưa đăng nhập admin thật và xác nhận lưu quyền/lưu bố cục trong Firebase production; Rules runtime và giao dịch từng phần phải nghiệm thu, không lấy Firebase emulator làm bằng chứng production.
4. Lịch sử chat archived không được cung cấp nguyên vẹn qua giao diện tìm kiếm hiện tại. Chỉ dẫn lịch sử truy xuất được gồm Excel A–O, trạng thái TBKL, 5 báo cáo, quản lý cột, tắt UI quyền ô, sort, layout 500/1500, font/màu, lưu tại chỗ, và lỗi mở chi tiết. **Không thể khẳng định đã bao phủ mọi phiên archived**.

**Phân vai file chuẩn:** [FEATURES](FEATURES.md) = đặc tả/tiêu chí, [SYSTEM](SYSTEM.md) = quy tắc nghiệp vụ, [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md) = Excel/schema, [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md) = thao tác, [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md) = chứng cứ/điều kiện chưa đạt, [VAN_HANH](VAN_HANH.md) = phát hành/rollback. Không tạo bản đặc tả thứ hai.

## Đang kiểm thử trên PR #3 — chỉnh độ rộng, sort và drill-down, 19/10/2026

- Điểm khôi phục trước khi sửa: commit `6bd9d5315f2c82f5fed14973fd74b0fd3fb682ae` trên nhánh tính năng và nhánh sao lưu `backup/before-resize-sort-drilldown-2026-10-19`. Chưa merge vào main hoặc phát hành ở URL root; bản preview đã phát hành sau đó, xem mục kiểm toán ở đầu tài liệu.
- Tại Danh sách dữ liệu, tay nắm ở mép phải tiêu đề cột hoạt động trong chế độ tùy chỉnh; có thể kéo chuột hoặc dùng phím mũi tên. Khi kéo, trình duyệt thay đổi chiều rộng trực tiếp; React chỉ nhận thay đổi cuối khi thả chuột, tránh cập nhật cả bảng trên từng pixel.
- Tại màn hình tùy chỉnh 5 bảng báo cáo, bổ sung tay nắm kéo cho cột phân nhóm, Tổng số nội dung, trạng thái và % hoàn thành. Độ rộng `columnWidths` thuộc riêng từng ID báo cáo, được kiểm tra 80–1200px và lưu cùng bố cục; cấu hình cũ không bị ép thêm thuộc tính rỗng.
- Nút sắp xếp bảng dữ liệu nằm trong header, mờ khi chưa áp dụng và luôn rõ khi đang sort; cho phép thao tác độc lập với tay nắm kéo.
- Click số đếm ở các cột trạng thái, tổng của từng đơn vị và tổng cuối bảng mở danh sách đúng tập nội dung; có biểu tượng ↗, con trỏ và trạng thái hover/focus. `MemoReportTable` với callback cố định tránh render lại năm bảng khi mở hộp chi tiết; hộp chi tiết tắt blur toàn màn hình. Chưa có benchmark FPS trực tiếp trên máy người dùng.
- Bảng Tiến độ trình HĐND xây dựng NQ hiển thị cột “Không phải trình” ngay sau Tổng số nội dung. Giá trị Excel “Không phải trình xây dựng NQ” được ánh xạ vào cột này và được tính trong mẫu số tỷ lệ hoàn thành; không tự đánh dấu hoàn thành. Dòng trống và báo cáo BC vẫn không thuộc phạm vi bảng này.
- CI đã PASS trên commit sau cùng (xem mục kiểm toán ở đầu tài liệu); vẫn cần kiểm trải nghiệm kéo chuột trên trình duyệt thật và lưu bố cục/quyền Firebase bằng tài khoản quản trị trước nghiệm thu.


## 19/10/2026 — Excel gốc đã sửa, CHỐT 5 báo cáo và quy tắc kết thúc

**Ghi chú có giá trị thay thế** các phần trước trong tài liệu này còn mô tả 3/4 bảng hoặc cột `TU đã cho ý kiến`.

- Đã đọc trực tiếp Google Drive XLSX `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx`, ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, modified `2026-10-18T17:41:48.954Z` (= 00:41:48 ngày 19/10 giờ VN). Tại phiên bản này, **0 ô G** còn `TU đã cho ý kiến`; **3 ô G** đã là `Đã có TBKL`. Danh mục Sheet2 cũng dùng `Đã có TBKL`.
- **5 báo cáo mặc định**, theo thứ tự: `party` (G: kết thúc = `Đã có TBKL`, KHÔNG có cột `TU đã cho ý kiến`), `build` (H: cuối = `Đã có QĐ chấp thuận`, cột `Đã trình HĐND, chưa có QĐ` được tô nhạt), `council` (tổng hợp NQ+BC từ I), `nq` (NQ từ I), `bc` (BC từ I).
- **Hai bảng NQ/BC và bảng tổng hợp** chỉ có 3 cột nguồn được hiển thị: `Sở chưa trình`, `VP đang thực hiện`, `Đã trình HĐND thành phố`. Tại file Excel hiện hành, giá trị hoàn thành cột I là `Hoàn thành`; trình đọc báo cáo chuyển thành **nhãn HIỂN THỊ** `Đã trình HĐND thành phố` theo yêu cầu người dùng. Không tạo cột `Hoàn thành` hay `Đã trình HĐND`; không sửa dữ liệu nguồn hoặc dropdown Excel.
- **Chống cột ảo**: một trạng thái nguồn bất thường được gom duy nhất vào cột kiểm tra `Chưa chuẩn hóa` (chỉ hiện khi thật sự có giá trị lạ), có ghi chú chỉ rõ giá trị gốc, KHÔNG được tính hoàn thành; không tự sinh tên cột theo từng giá trị khác ngoài danh mục. `TU đã cho ý kiến` phiên bản cũ nếu còn trong bộ nhớ tạm/nguồn chưa cập nhật cũng KHÔNG tự được hiểu là `Đã có TBKL`. Riêng tên cột/danh mục **cấu hình đã lưu** được di trú sang tên mới, không chạm ô nguồn.
- Cấu hình 3, 4, 5 báo cáo đời trước được nâng cấp thành 5 báo cáo, thêm ID còn thiếu vào vị trí chuẩn trong thứ tự đã lưu; bỏ cột `Sở xin rút` không thuộc các báo cáo hiện tại, gộp `Đã trình HĐND` + `Hoàn thành` của cấu hình thành một cột hiển thị `Đã trình HĐND thành phố`, và thay `TU đã cho ý kiến` thành `Đã có TBKL` ở **cấu hình**, giữ font, kích thước, ẩn/hiện và báo cáo tùy chỉnh.
- **Tập trung thị giác**: Bảng 1 giữ màu rõ tại `Sở chưa trình`, `VP đang thực hiện`, `Đã có TBKL`; tô nhạt 3 cột giữa; bảng xây dựng NQ tô nhạt `Đã trình HĐND, chưa có QĐ`; kích cỡ/font áp dụng cả tên bảng. Bảo toàn cả 5 cách tô màu và chế độ in.
- Bản khôi phục trước đợt sửa `backup/before-excel-grounded-five-reports-2026-10-19` tại `a7aab02982b1d8f226f0549cc5e3b7916210657b`. Chỉ thay mã trên PR #3 Draft; **không merge**, không ghi Sheets/Firebase production, không đổi `main:index.html`. Phát hành preview chỉ sau khi kiểm thử CI đúng commit, đối chiếu hash artifact, triển khai Pages thành công.



## 18/10/2026 — Bốn bảng báo cáo, bỏ nhãn phụ, cột giữa nhẹ hơn

- Đã đối chiếu `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx`, tab `Các nội dung trình HĐND`, cột H `Tiến độ trình HĐND xây dựng NQ`. Dữ liệu 53 nội dung: 15 ô `Không phải trình xây dựng NQ` và 38 hồ sơ xây dựng NQ (22 Sở chưa trình, 5 VP đang thực hiện, 1 Đã trình HĐND, chưa có QĐ, 10 Đã có QĐ chấp thuận). Chỉ trạng thái cuối là hoàn thành. Đây là phạm vi thống kê tham khảo từ bản Excel đọc 18/10, không phải số cứng trong ứng dụng.
- Chèn cấu hình `id: build` trước `nq`. Bốn bảng mặc định: `party` (G), `build` (H), `nq` (I), `bc` (I). Bảng mới lọc `documentKind==='NQ'` và H có trạng thái áp dụng, không tính `Không phải trình xây dựng NQ` hoặc H trống. Báo cáo cũ không đổi phạm vi, nguồn và tỷ lệ.
- `validateReportLayout` nâng cấp chỉ bộ ba ID cũ `party,nq,bc` thành bốn, chèn trước `nq` trong thứ tự đã lưu; bảo toàn tiêu đề tùy chỉnh, ẩn/hiện, thứ tự và ẩn cột, font/cỡ chữ, độ rộng. Shared-config/Firebase đọc qua bộ kiểm tra này. Cấu hình lạ, thiếu hoặc trùng vẫn bị từ chối.
- Xóa dòng nhãn viết hoa `report-section-kicker` ở đầu **mọi** bảng; chỉ tên bảng cùng dòng thống kê số lượng/% và nút In/PDF. Giảm màu nền trung gian `office-bg` từ `#FFE8B8` xuống `#FFF5E8`, `next-bg` từ `#DCEBFD` xuống `#F3F8FE`, viền nhạt đi cùng; giữ chữ đủ tương phản WCAG AA. Màu nhấn Sở chưa trình, Tổng số, trạng thái hoàn thành và % không bị đổi.
- Mốc trước sửa: `backup/before-four-report-build-table-and-lighter-stages-2026-10-18` tại `0f6f158938d7d9cd87ac0b74949a819cdcfcaf98`. Test hồi quy cho 4 bảng, điều kiện lọc H, đọc profile 3 bảng cũ từ local/shared-config, bỏ nhãn phụ và màu nhạt. Chỉ phát hành preview từ artifact CI exact SHA đã PASS; không merge PR, không ghi dữ liệu Google Sheets/Firebase thật, không thay `main:index.html`.



## 18/10/2026 — Chuẩn hóa nguồn Excel và font của bảng báo cáo

- Đã đọc **trực tiếp** file Google Drive `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx` (ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`; metadata phiên bản kiểm tra modified `2026-10-18T15:05:49.510Z`). Tab `Các nội dung trình HĐND`: 15 cột A–O, 53 dòng nội dung; J=Chuyên viên VPUB, K=Phòng chuyên môn, G=Tiến độ xin ý kiến Thành ủy. Tab `Sheet2` là danh mục trạng thái hiển thị dấu phẩy chuẩn.
- Bảng 1 dùng `TU đã cho ý kiến` làm mốc hoàn thành (thay `Đã báo cáo TU`), giữ đúng `ĐU đã gửi TU, chưa họp`, `Đã họp, chưa có TBKL`, `Đã họp/xin phiếu, chưa có TBKL`, `Đã có TBKL`; alias dữ liệu và cấu hình cũ được chuẩn hóa khi hiển thị/đọc, không đổi Google Sheets. Bảng nghị quyết/báo cáo đổi tên theo nhánh `Tiến độ trình HĐND ban hành NQ/BC`. Cấu hình cá nhân có tên tùy chỉnh không bị ghi đè; bản tên mặc định cũ được nâng cấp khi hợp lệ.
- Trên **cả ba bảng**, cột `Tổng số nội dung` nằm ngay sau cột nhóm, trước `Sở chưa trình`, áp dụng đồng thời cho tiêu đề, từng dòng, tổng cuối, `colgroup` và xem trước, không đổi dữ liệu tính toán.
- Đối chiếu J/K: 29 chuyên viên / 7 phòng trong 53 dòng nguồn. `mergeCatalogItems` ưu tiên quan hệ đã quan sát trực tiếp từ dữ liệu đang đọc đối với đúng chuyên viên đó; giữ các quan hệ thủ công không có bằng chứng Excel mới, không tự ghi cấu hình production. `Nạp lại từ dữ liệu` trong màn danh mục vẫn có thể tái tạo quan hệ bằng nguồn hiện hành khi quản trị chủ động lưu.
- **Font:** Trước sửa 10 lựa chọn chỉ là CSS font stack, KHÔNG nhúng font. Giờ 6 font mở Inter, Roboto, Open Sans, Lato, Noto Sans, IBM Plex Sans tải từ Google Fonts nếu có Internet; 4 lựa chọn hệ thống Apple/System UI, Segoe UI, Helvetica Neue, Arial dùng font OS hoặc fallback, không copy/font license thương mại. Khi offline/chặn Google Fonts, những font mở cũng fallback; **không** gọi đây là font nhúng nội tuyến/offline. Trạng thái font cần thử browser người dùng thực tế.
- Đã tạo backup code trước sửa `backup/before-excel-report-totals-relationships-fonts-2026-10-18` tại `9a9ca94ae3788bf719e1286decfe7e1d355702cf`. Regression tests cho thứ tự cột, % hoàn thành, migration profile, đúng dấu phẩy, quan hệ chuyên viên–phòng, yêu cầu web font. Kết quả CI phải đối chiếu exact SHA trước khi phát hành bản preview.
- **Phạm vi:** PR #3 vẫn Draft; không merge, không sửa `main:index.html` production, không thay đổi Sheets/Firebase thật. Phát hành chỉ `preview/current` qua artifact CI đã xác minh, rồi người dùng nghiệm thu.



## 18/10/2026 — 5 phong cách tô màu bảng (theo ảnh tham khảo người dùng)

- Nghiên cứu mẫu nhãn/badge, full-cell fills, edge rails, in-cell data bars và solid header bands; tham chiếu Carbon (status indicators, data tables) cùng nguyên tắc không chỉ dùng màu để diễn tả trạng thái.
- **Đã code trên PR #3**: 5 tùy chọn độc lập gồm `classic` = Phủ màu toàn ô (giữ hướng hiện tại), `signal` = Nhãn màu nổi (giống ảnh), `compact` = Viền màu phân cột, `bars` = Thanh dữ liệu theo số lớn nhất *trong từng cột trạng thái*, `band` = Dải tiêu đề màu. Đây là 5 **cách thể hiện** khác nhau, không phải chỉ 5 mức độ đậm nhạt; màu đỏ/cam/xanh dương/xanh lá/tím/xám giữ nghĩa nhất quán. Ô trống không vẽ thanh dữ liệu. Lưu kiểu `signal/classic/compact` cũ vẫn hợp lệ, nay ánh xạ vào ba phong cách đầu (không xóa profile cũ).
- `ReportLayoutPanel` có mini-preview minh họa từng phong cách; các bảng báo cáo trong phần chỉnh sửa đổi trực tiếp theo nháp, chỉ cập nhật cấu hình dùng chung sau Lưu. Cỡ chữ/font 10 lựa chọn và logic tính % vẫn tách biệt, không thay đổi nguồn Google Sheets/Firebase.
- `ReportTable` dùng đúng class trạng thái cho tiêu đề/ô dữ liệu/tổng, số liệu trong badge hoặc data bar tùy phong cách. In PDF giữ class phong cách, CSS variables font, và màu tiêu đề riêng. Các chỉ số vẫn là số đếm từng trạng thái và tỷ lệ hoàn thành giai đoạn cuối; màu không khẳng định quá hạn.
- Kiểm thử mở rộng `reporting.test.ts`, `report-style-css.test.ts`: 5 radio, tính nhất quán số liệu/kích thước bảng, tỷ lệ thanh theo max trong *cùng cột*, ô 0 không có thanh, 6 trạng thái có tương phản chữ/nền ít nhất 4,5:1 và dải tiêu đề chữ trắng trên màu đậm. Chỉ ghi PASS khi có workflow verify-source exact commit; chưa nghiệm thu màu bằng ảnh người dùng trên browser thật.
- Trước mọi sửa đã tạo mốc `backup/before-five-report-color-styles-2026-10-18` từ `68b82fff581709ee8a7e521bc3cb345c41771b4d`. Không merge PR #3, không tự ghi dữ liệu/Rules Firebase production hay Excel. Phải phát hành lại `preview/current` riêng và kiểm chứng browser trước khi báo đã hiển thị trên trang dùng thử.



## 18/10/2026 — Rà soát còn dang dở: màu và cỡ chữ Bảng báo cáo

- Trên PR #3 (Draft), mã đã có ba phương án **chỉ khác màu** (`classic`, `signal`, `compact`), một nhóm trạng thái dùng chung màu cho tiêu đề/ô dữ liệu/tổng/nhãn thống kê, cột phần trăm, 10 lựa chọn font hệ thống/hiện đại và cỡ chữ 11–20 px. Các nhóm trạng thái chỉ diễn tả mức cần chú ý, không tự suy hồ sơ quá hạn.
- Rà soát tiếp phát hiện CSS cũ cố định `th` = 12px, khiến thay đổi cỡ chữ chưa ảnh hưởng hàng tiêu đề và cột đầu dù ô số đã đổi. Sửa `source/src/styles/app.css` để mọi `th` kế thừa cỡ chữ đã chọn. Tạo `source/tests/report-style-css.test.ts` để kiểm tra font toàn bảng, thống nhất màu cùng trạng thái, mức tương phản chữ/nền tối thiểu 4.5:1 và ba palette không đổi bố cục.
- Mốc khôi phục code trước sửa: `backup/before-report-font-complete-2026-10-18` tại `5546f1955cf5ee9cbf4acbdf13a567d257b129c1`. Hai commit: `f2cb870bb3b432d6801fa0187f2451642846fa8e` (CSS) và `45c870d8e30e56902fe898a0aaa99c43974d33be` (tests). Kết quả CI cho commit mới cần xác minh bằng GitHub Actions; chưa tuyên bố chạy trình duyệt thực tế.
- **Chỉ thay mã trên nhánh PR #3**: không merge, không ghi Google Sheets/Firebase production, không chỉnh `main:index.html`. Vẫn cần nghiệm thu bản preview bằng Chrome, kiểm tra quyền admin lưu bố cục thực (nếu chủ tài khoản chủ động thử) và xác nhận font thiếu trên máy dùng fallback thích hợp.


## Firebase Rules production — người quản trị xác nhận Publish (16/10/2026)

- Người quản trị **đã báo hoàn thành thao tác Publish** trên Firebase Console sau khi nhận file `source/firebase/database.production-candidate.rules.json` và hướng dẫn `FIREBASE_PRODUCTION_RULES_MIGRATION.md`.
- Đây là **xác nhận từ người quản trị**, không phải kết quả kiểm tra trực tiếp Firebase server: GitHub connector chỉ đọc mã/CI, không có kết nối xác thực Firebase để đối chiếu Rules version hoặc kiểm tra bằng tài khoản Google thật.
- [GitHub Actions PASS SHA 4cc657b6474de22bff932d94bdc02bc386eb2114](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38844347387), trong đó production-candidate Firebase emulator xác nhận admin vẫn được sửa, guest không ghi được khi khóa, mở khóa trở lại có thể sửa, mốc duyệt chỉ admin đọc/ghi.
- **PR #3 vẫn DRAFT; `main` và GitHub Pages chưa phát hành mã mới**, nên các nút Phê duyệt và Khóa sửa chưa xuất hiện trên website hiện tại. Không có bằng chứng đã xác minh 51 dòng, luồng admin login, phê duyệt trực tiếp và phân quyền khách trên bản phát hành.
- Trước khi công bố chức năng mới: xác minh Firebase Rules hiện có đúng file đã Publish, giữ bản sao Rules cũ; thử bằng tài khoản thật và trình duyệt để nghiệm thu; chỉ merge khi đạt. Nếu cần triển khai để thử trên Pages, xem xét preview tách khỏi URL production hoặc rollout có kế hoạch rollback.


## PR #3 — mở rộng tùy chỉnh và kiểm soát phê duyệt (16/10/2026)

- Yêu cầu đã chốt: lưu nhiều mẫu giao diện cá nhân; màu theo điều kiện; bộ lọc riêng từng cột kèm dấu hiệu lọc đang áp dụng; admin so sánh thay đổi kể từ mốc phê duyệt và phê duyệt mốc mới; admin khóa chế độ sửa thử của tài khoản khác trên WebApp. **Không tạo thêm bộ thống kê theo phòng/chuyên viên/lãnh đạo**, vì các bảng ban đầu đã hỗ trợ phân nhóm và thống kê này.
- Đã tạo nhánh sao lưu bất biến ở commit `6d2226467d83e518f793d5c5e97eb11b29ba2def`: `backup/pre-features-2026-10-16`. Phát triển trên `feat/saved-views-approval-lock-filters-2026-10-16`, PR #3 **draft**. Đường rollback này chỉ cho **code**, không phải dữ liệu.
- Đã commit nguồn cho UI mẫu giao diện, lọc từng cột, quy tắc màu, backend Firebase có CAS cho trạng thái khóa và mốc phê duyệt, trang admin xem thay đổi, cùng các regression tests. Các mẫu/màu cá nhân dùng localStorage; mốc duyệt lưu Firebase `hdndReviews` chỉ admin được đọc/ghi; `hdnd/control` là trạng thái khóa cho người xem đã xác thực.
- **Chưa merge main, chưa phát hành Pages, chưa deploy Firebase Rules production, chưa kiểm nghiệm UI trên browser người dùng.** Kết quả CI chính thức phải đối chiếu theo exact PR HEAD và Actions; không gọi production PASS. Không tự chỉnh sửa Google Sheets hoặc Firebase production trong lượt này.
- Phân biệt rõ: khóa WebApp chỉ chặn chỉnh sửa thử trong UI; **không** khóa nhập trực tiếp trên Google Sheets. Các dòng Sheets thiếu/trùng mã hoặc bị sắp xếp đòi hỏi rà soát ánh xạ tại màn hình duyệt.



## Trang GitHub Pages bản sửa 16/10/2026 — code đã triển khai, trình duyệt người dùng chưa nghiệm thu

- [PR #1](https://github.com/cavoixanh638/HopHDND-WebApp/pull/1) đã merge vào `main` tại commit `e2c59b9bb1fd79cd2c577ac309eaab86eb7f1e0e`; workflow [build và publish](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778740465) đạt, tự thay `index.html` ở gốc (blob `8d334e5d005f6420e00fcb36641489156778bce0`); [GitHub Pages deploy](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778852907) báo **success**. Đây là bằng chứng cập nhật artifact/hạ tầng, **chưa** phải xác nhận màn hình người dùng đã đọc 51 dòng.
- UI có nhãn `0.7.0 · Sửa 16/10`, nút chọn lại nguồn Sheets mặc định và GID đang đọc, cho vào tùy chỉnh danh sách ngay cả khi 0 dòng; quản trị mở màn hình quyền theo cột/dòng/ô trực quan tại Danh sách. Trang tài khoản Firebase chỉ phục vụ xác thực. Quyền theo dòng/ô có cảnh báo rủi ro ID vị trí và yêu cầu xác nhận trước khi lưu.
- [CI PR](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778566739) đạt: **212 unit tests, 12 emulator tests**, typecheck, docs check và build Pages. Một probe HTTP **chỉ đọc** trên GitHub runner nhận GViz `status=ok`, HTTP 200 và khoảng 53 hàng trong phản hồi tại gid `60961344` (bao gồm tiêu đề/nhóm, không phải 53 nội dung); không chứng minh truy cập bằng browser người dùng. **Vẫn cần xác nhận thực tế Pages hiển thị 51 nội dung, login admin, quyền và cơ chế lưu cấu hình**. Không đổi Rules production hay dữ liệu nguồn.
- Workflow mới nằm tại `.github/workflows/{verify-source,publish-pages}.yml` và tự phát hành HTML từ source khi thay đổi `main`; **không** tự đồng bộ thư mục local Google Drive/Windows.


> **Bản sao GitHub:** một số ảnh bằng chứng trong tài liệu lịch sử chưa được đồng bộ vào `docs/assets/`. Tên tệp được giữ để tra cứu trên bản lưu gốc; không xem đường dẫn này là ảnh có sẵn hoặc bằng chứng đã kiểm trên website.

## Cập nhật tài liệu và tình trạng Pages được báo cáo — 16/10/2026

- Repository GitHub [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp) có **một `index.html` ở gốc** để Pages phục vụ và **mã nguồn ở `source/`**. Đây là bản nhập mã từ dự án Drive/Windows, **không tự đồng bộ** các thay đổi sau này. Có commit cập nhật `index.html` bản build 0.7.0; việc commit thành công **không đồng nghĩa** đã nghiệm thu website.
- Người dùng đã phản ánh **Pages vẫn hiển thị 0 dòng**, **chế độ tùy chỉnh danh sách chưa mở được**, và **quyền ô chỉnh sửa vẫn ở màn hình riêng thay vì trực quan ngay trong Danh sách**. Đây là lỗi/tồn tại chưa được xác minh đã khắc phục; không dùng kết quả thử local 51 dòng để ghi production PASS. Chưa xác nhận bộ Firebase Rules mới đã được áp dụng trên môi trường thật.
- Đã bổ sung hai nguồn tài liệu chuẩn [VAN_HANH](VAN_HANH.md) và [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md). [docs/README](README.md) quy định phần gộp để tránh trùng lặp: code rollback và data restore là hai việc riêng trong một tài liệu vận hành. Cập nhật tài liệu **không** sửa mã ứng dụng, không deploy Rules, không sửa nguồn Excel.
- Việc kế tiếp ở mã ứng dụng: chẩn đoán Pages đọc 0 dòng từ GViz, sửa quyền vào chế độ tùy chỉnh khi dữ liệu đang trống, và tích hợp cấp quyền ô/dòng/cột trực tiếp vào bảng. Chỉ chuyển sang trạng thái PASS sau kiểm trình duyệt Pages và test đúng quyền.



## Pages 0.7.0 — đã sửa nguồn Sheets và thống nhất quản trị, 15/10/2026 21:58

Chỉ đạo hiện hành thay cho thiết kế Firebase-only ở mốc lịch sử bên dưới: **Google Sheets vẫn là nguồn chính**. Pages khởi tạo SheetsRepository/GViz theo link/gid đã chọn, tái sử dụng parser A–P, đọc lại thủ công và polling 60 giây khi tab hiển thị/không có nháp. Không đọc `hdnd/items` làm dữ liệu hiển thị, không cần import dòng hoặc đồng bộ Sheets → Firebase. Firebase lỗi/đăng nhập chưa xong không chặn Sheets tải.

Firebase Authentication giữ nguyên Anonymous/Google. Google verified `cavoixanh638@gmail.com` là quản trị; mọi lưu bố trí danh sách/báo cáo, danh mục, giá trị lựa chọn và JSON profile đi qua cùng `hdnd/profile`; quyền ô/dòng/cột qua `hdnd/permissions`. UI quyết định quyền từ Firebase controller, độc lập loại nguồn Sheets. Có chặn lưu khi chưa tải baseline, xung đột revision, lưu trùng và thay đổi danh tính. Đọc lại cấu hình thực sự đọc profile/permissions. Khách không có đường lưu cấu hình chung qua Google bridge/local fallback. Quyền cell → row → column → deny, ID/STT chỉ đọc. Rules cho phép quyền riêng theo recordId Sheets mà không import dòng RTDB. IDs legacy theo vị trí hàng nên phải rà quyền riêng khi chèn/sắp hàng; chưa tự chuyển sang ID ổn định.

Sửa nội dung trên Pages là **nháp thử cục bộ**; báo cáo/KPI/xuất lấy snapshot Sheets. Không gửi nháp vào Firebase hoặc Sheets; nhập Excel ghi dữ liệu khóa. Rules local khóa mọi ghi `hdnd/items` cho cả admin và khách. Giữ FirebaseRepository/interface Repository cho chuyển đổi sau khi người dùng quyết định; các regression ghi adapter tương lai chạy nhánh `hdnd-test/items` chỉ có trong fixture emulator, không xuất hiện trong Rules phát hành. Luna rà luồng Sheets và cập nhật tài liệu Pages/FEATURES; parent sửa tích hợp, Rules và kiểm thử.

Bằng chứng kiểm local: `npm test` **209 passed, 12 emulator tests skipped**; `npm run test:firebase` **12 passed** riêng (tổng **221** kiểm đã chạy), gồm token khách/provider giả/email sai/chưa verified, gọi thẳng config và multi-location update bị chặn, admin lưu quyền dòng/ô cho Sheets không có items, stale revision và khóa ghi dữ liệu chính. 9 regression giao dịch tương lai giữ ở nhánh thử cô lập. Hai bộ mới gồm 6 kiểm App tích hợp Sheets thực sự qua GViz callback/parser và 7 kiểm Firebase controller/policy (quyền độc lập nguồn, fail closed, baseline, refresh, logout, khóa lưu trùng). Fake test không thay nghiệm thu OAuth thật.

UI trên **HTML pages-test đã build**, Auth/RTDB chỉ trỏ emulator `demo-hdnd`: lúc21:53 đọc **51 dòng trực tiếp từ GViz nguồn mặc định**, tự đọc tiếp lúc21:54; menu khách khóa báo cáo/danh mục, bố trí cột/khung và nút lưu chung disabled. Sửa thử Nội dung NQ01 bằng chuỗi mẫu trong popup rồi Áp dụng chỉ tạo 1 nháp, checkpoint local; Đọc lại khi có nháp giữ nguyên phần sửa. Console ứng dụng không error/warn. Kiểm emulator sau thao tác: `itemsPresent=false, profilePresent=false, testPermissionsPresent=true`. Không ghi Google Sheets hoặc Firebase thật. Ảnh nháp khách (tệp chưa đồng bộ: `assets/sheets-guest-draft-0.7.0.png`). UI được kiểm trước chỉnh thêm câu giải thích popup và ẩn lựa chọn mẫu của legacy trên panel nguồn Pages; các sửa lời giải thích đó được typecheck/test/build lại.

`typecheck`, `build` legacy, `build:pages`, `build:pages:test` và `docs:check` đạt. Đầu ra duy nhất **dist-pages/index.html 892.064 bytes; gzip277.210 bytes**; build thử891.952bytes/gzip277.115bytes; legacy161.963bytes/gzip47.061bytes. Bundle Pages vẫn giữ một HTML tự chứa, có cảnh báo kích thước chunk >500kB dự kiến cho gói SDK/Excel.

**Chưa push, deploy Pages/Rules, đổi Auth/domain hoặc ghi dữ liệu thật.** Rules ở repo là bản đã kiểm emulator, chưa xác minh/áp dụng lên Firebase đang chạy. Chưa kiểm lại Google OAuth thật trên hostname Pages hoặc tải nhiều người. GViz cần quyền đọc nguồn; đăng nhập quản trị Firebase không cấp OAuth cho Sheets riêng tư. Xem [hướng dẫn Pages](FIREBASE_PAGES.md), [API](API.md).


## Mốc lịch sử Firebase-only 0.7.0 — đã được thay bằng quyết định Sheets ở trên

Theo yêu cầu mới đã duyệt, bản GitHub Pages dùng Firebase RTDB `hophdnd-8b7b2` thay nguồn Sheets; không có backend riêng. Giữ các thành phần giao diện, báo cáo/KPI/chi tiết/in, tìm/lọc, dropdown/search chuyên viên, popup Nội dung/Ghi chú, danh mục/quan hệ và chỉnh khung/cột hiện có. `pages.html` → `src/pages-main.tsx` cung cấp Firebase cho App; entry Google/HTML cũ vẫn tồn tại. Main Google đang triển khai vẫn 0.6.2/v6, chưa cập nhật cloud.

FirebaseRepository dùng listener trực tiếp và transaction từng dòng theo recordId, kiểm baseline từng trường; sửa khác ô ghép được, cùng ô phát hiện xung đột và giữ phần nhập. Tự lưu sau 800 ms khi đã chọn dropdown hoặc Áp dụng popup; không gửi từng phím trong popup. Cho nhập tiếp khi một lượt đang lưu, xác nhận B không xóa C mới nhập; chỉ xóa phần đã được Firebase xác nhận. Lỗi không tự lặp vô hạn. Phần chưa xác nhận được checkpoint cục bộ; SDK web không thay thế lưu bền sau khi đóng trang. ID/STT/mã không đổi; history 50 lượt gần nhất/dòng. Chuyên viên–phòng vẫn kiểm tại client trước ghi.

Quyền được thực thi bởi [Database Rules](../firebase/database.rules.json): đọc cần Firebase Auth; khách ẩn danh sửa các trường/cell được cho phép; mặc định chưa cấp quyền là khóa. Quản trị phải có email Google `cavoixanh638@gmail.com`, email_verified và provider google.com; chỉ quản trị đổi permissions/profile và nhập dòng. Bố trí/danh mục lưu `{revision,payload}` JSON để tên chứa dấu chấm/gạch chéo không thành key RTDB. Rules đã kiểm local; chưa áp dụng Firebase thật, chưa bật provider hoặc đổi domain thật. Định danh khách là UID ẩn danh, không phải danh tính người thật.

Import/Export Excel được bổ sung (bản mới trước đó chưa có): xuất `.xlsx` các dòng đã lưu; nhập mẫu chuẩn của app, xem trước, admin xác nhận thêm dòng mới, trùng ID/mã thì từ chối; không âm thầm ghi đè hoặc đọc workbook legacy. Có nhập/xuất JSON danh mục/bố trí. Đây là F25/F26 tối thiểu, chưa phải đầy đủ lịch sử/backup/mapping Excel cũ của đặc tả.

Bằng chứng: `npm test` **196 passed, 9 emulator tests skipped**; 9 kiểm thử emulator chạy riêng đều **passed** (205 phép kiểm đạt khi tính hai lượt), gồm quyền admin/khách và provider giả, cell deny, client bypass, same-cell conflict, different-cell merge, realtime, mất mạng/kết nối lại, replay, add-only import, profile JSON và ring history qua 52 lần lưu. Hai hook tests kiểm A→B→C khi đang lưu và debounce/lỗi không lặp. `npm run typecheck`, `npm run build`, `npm run build:pages`, `npm run build:pages:test` đạt. Pages output **895.296 byte; gzip 278.445 byte**, đúng một `dist-pages/index.html`, không phụ thuộc file JS/CSS cạnh nó; cần Internet cho Firebase/Auth. Legacy output159.897 byte/gzip46.598byte; Firebase SDK/Excel không bị ghép vào bundle legacy.

UI trình duyệt đã chạy **HTML đã build cho emulator**: đăng nhập ẩn danh, tải 3 dòng giả, ô NQ02 bị khóa riêng, cảnh báo đóng popup chưa áp dụng, tự lưu báo máy chủ xác nhận, tab thứ hai thấy ngay mà không F5; không có console error/warn trước lần thử Google popup. Nút xuất tải được `HDND_du_lieu.xlsx`, đọc lại đúng3 dòng và nội dung vừa sửa. Ảnh tự lưu (tệp chưa đồng bộ: `assets/firebase-autosave-0.7.0.png`). Google popup trong IAB đã mở yêu cầu nhưng chưa hoàn tất; quyền Google được kiểm bằng token emulator, chưa nghiệm thu OAuth thật trên GitHub Pages. Không coi kiểm local là đã kết nối dữ liệu Firebase thật hoặc đã đo tải50 người.

`npm audit --omit=dev`:0 cảnh báo. Bộ công cụ dev Firebase CLI còn7 cảnh báo (3high/4moderate); không nằm trong HTML phát hành. Đã vá gRPC gián tiếp qua override1.14.6, không hạ Firebase SDK. Chưa push/commit, chưa tạo repository/workflow, chưa deploy Pages, chưa đọc/ghi dữ liệu RTDB thật, không chuyển nguồn Excel sản xuất. [Hướng dẫn setup và giới hạn](FIREBASE_PAGES.md).

## Đã phát hành 0.6.2 trên app Google chính — 15/10/2026

Người dùng đã duyệt “Cho phép thử rồi cập nhật app chính”, sau đó tự cấp quyền Google cho app chính. UI riêng trên bản sao đạt và bản sao đã khôi phục đúng bytes như bằng chứng bên dưới. Đã nạp gói kích hoạt vào dự án chính 1ZVs…; USER_ACCESSING/MYSELF giữ nguyên. Lần đầu gặp HTTP403 accessNotConfigured tại Drive About; bổ sung advanced Drive v2 trong manifest để bật API của default Cloud project, giữ nguyên ba OAuth scopes đã duyệt. prepareDashboardExcelStorage chạy thành công11:29, tạo kho sao lưu/nhật ký riêng và registry nguồn gốc; không PUT workbook.

Kiểm chỉ đọc11:30:08 xác nhận backendReady=true, actor=phucpixel2025@gmail.com, count51, warnings0, configRevision12. Ảnh kết nối (tệp chưa đồng bộ: `assets/main-excel-connection-pass-0.6.2.png`). Cập nhật deployment hiện hữu thành **Version6 lúc11:31, app0.6.2**, giữ [link /exec chính](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec). Phiên vừa deploy đầu tiên có RPC trạng thái báo function not found; sau khi Google hoàn tất cập nhật và mở lại11:34, UI hiển thị đúng tài khoản,51 nội dung, cấu hình12 và “Đã kết nối lưu app → Excel. Chỉ báo đã lưu sau khi đọc lại file xác nhận.” Ảnh app chính (tệp chưa đồng bộ: `assets/main-excel-ready-0.6.2.png`). Không đổi chia sẻ app/kho. Chưa gửi lệnh ghi dữ liệu vào nguồn thật; bằng chứng ghi/đọc lại thuộc bản sao thử.

Người dùng mở link Google → ⚙ → Vào chế độ tùy chỉnh danh sách → sửa ô → Lưu dữ liệu vào Excel. Chưa tự gửi phần sửa NQ01 cũ của người dùng. HTML độc lập vẫn không có cầu Google RPC; phần sửa giữ tại browser của HTML không tự chuyển sang Google.191 tests/24files, typecheck, build:server và kiểm tài liệu đạt; HTML149.008byte/gzip43.601byte. F31 vẫn còn các phần thêm/xóa/nhập hàng loạt, xử lý conflict/phục hồi, bảo trì nhật ký/quota và nghiệm thu nhiều người.

## Rà thiết kế PA1/PA2 — đề xuất chưa triển khai

Đã rà hai đánh giá người dùng gửi và mã batch mẫu, đối chiếu tài liệu chính thức về RPC, quota, batch, trigger, quyền script và phục vụ HTML từ Drive. Parent tổng hợp thiết kế tại ARCHITECTURE revision1.15; Luna bổ sung kế hoạch1.18 mục18.15 và README. Đã ghi các lỗi fallback tọa độ/ID trùng, thiếu baseline/allowlist, queue/race/lost pending, bỏ qua kết quả từng ô, polling trả muộn và header innerHTML. Nhu cầu đồng bộ hai chiều đã có trong chỉ đạo cũ. Đọc HTML từ Drive qua HtmlService vẫn cần mở link webapp Google; không coi đó là đường ghi từ file HTML độc lập.

Chỉ cập nhật tài liệu đề xuất. Chưa chuyển Excel thành Sheets, chưa chọn phương án hosting/xác thực mới hoặc bật tự lưu; không đổi code, app0.6.2/deployment6, quyền và file nguồn. Việc đổi nguồn/link, cấu hình hoặc phát hành tiếp vẫn cần quyết định cụ thể; không suy từ phần đánh giá này.

## Mốc chuẩn bị và kiểm bản sao 0.6.2 — lịch sử trước kích hoạt

**Đã kiểm UI Google trên bản sao riêng; người dùng đã duyệt tiếp tục cập nhật app chính. Các module main đang upload, chưa có Google consent/registry hoặc phát hành.** Không dùng nguồn thật và không đụng kho cấu hình. UI /dev ngày15/10 10:55 đổi Chuyên viên từ Trương Việt Hải sang Nguyễn Văn Kỳ tại mục “công nghiệp sinh thái” (UI hiện NQ37), báo “Đã lưu 1 nội dung vào Excel và đọc lại xác nhận”; đọc lại khớp và pending hết. Sau callback lỗi với phản hồi object dù file đã ghi, RPC save trả JSON string và adapter parse/validate; phản hồi JSON hỏng bị từ chối, giữ nháp. Bản sao được khôi phục có điều kiện lúc10:56:18, ETag/hash pass. Ảnh UI lưu/đọc lại (tệp chưa đồng bộ: `assets/ui-excel-save-pass-0.6.2.png`), ảnh khôi phục (tệp chưa đồng bộ: `assets/ui-excel-restore-pass-0.6.2.png`). Bằng chứng chỉ thuộc UI thử /dev và bản sao; chưa xác nhận app chính.

- ExcelRepository nối các RPC đọc/lưu/lịch sử; sourceKind tách khỏi readOnly nên Google ghi được vẫn dùng vùng lưu và nhãn nguồn Google. App chọn adapter lúc mở từ cấu hình server; không thay adapter giữa lúc sửa. Chỉ xóa phần sửa khi đúng phản hồi dòng và các giá trị đổi.
- Server có codec canonical, transaction engine và Drive transport: tìm mã gốc duy nhất, kiểm baseline, backup bytes trước ghi, receipt/operationId, PUT If-Match và đọc blob xác nhận. Chỉ mục ID/hash nhỏ ở Script Properties, nội dung nhật ký trong thư mục Drive riêng; không trộn dữ liệu dòng vào kho danh mục/bố trí. Mất phản hồi đọc đúng hash thì xác nhận; chưa rõ thì giữ phần sửa, không tự gửi lại. Chặn thiếu/trùng mã, ID/STT, công thức và nguồn không đăng ký.
- Sửa data-only không gọi lưu bố trí không đổi. Nhãn Lưu dữ liệu vào Excel chỉ chiều app→Excel; đọc lại là Google→app. Google text được trim theo parser trước khi tạo patch. Quan hệ chuyên viên–phòng kiểm khi thay phân công, không ép đổi phân công cũ lúc sửa văn bản.
- Main chưa có Google consent/registry, chưa kích hoạt hoặc phát hành writer. Gói riêng server/dist-test chỉ nhận bản sao19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7, Google USER_ACCESSING/MYSELF; không nối kho cấu hình thật. Bằng chứng UI lưu/đọc lại ở trên là từ UI thử /dev, không phải app chính.

Kiểm local: **189 tests/24files**, typecheck và build đạt. HTML149.008byte/gzip43.601byte; không thêm dependency. Fake transport chạy real codec/parser/engine cùng nhau; test còn chặn JSON string malformed và giữ phần sửa khi phản hồi chưa xác nhận. RPC save dùng JSON string qua callback Google và adapter parse/validate kết quả. Fake test không thay phép UI Google; UI được kiểm riêng trên bản sao như trên. Đây **không phải** ghi NQ01 nguồn thật.

Hợp đồng mới: [API](API.md); triển khai theo [kế hoạch mục18.14](KE_HOACH_VIET_LAI.md#1814-tích-hợp-062--kế-hoạch-117). Còn kiểm công thức/cache/quota/nhiều người và các phần đầy đủ của F31. User đã duyệt tiếp tục cập nhật main sau bản thử; phần upload hiện tại chưa đồng nghĩa consent Google, registry, kích hoạt hoặc phát hành. F31 chưa hoàn tất; không ghi nguồn thật.

Phần bên dưới ghi các mốc0.6.1 và cũ, không thay trạng thái candidate ở trên.

### Kiểm RPC tích hợp trên Google — 00:36–00:37 ngày15/10

Đã nạp codec/core/transaction/transport/TestHost/probe vào **dự án thử riêng đã được cấp Drive**, không upload app chính. testIntegratedExcelSave dùng đúng copy19fv… và tạo hai thư mục backup/journal owner-only; registry chỉ copy, không kho cấu hình. Google log00:37:12 có count51, sameRecord/savedSpecialist/readBack/replay/audit/verified/restoredOriginalBytes/pass=true. Ghi Chuyên viên qua saveDashboardData, đọc lại qua getDashboardData và kiểm getDashboardHistory; replay trả cùng kết quả. Chỉ báo pass sau khi khôi phục có điều kiện và hash bytes đúng bản trước thử. Ảnh kết quả (tệp chưa đồng bộ: `assets/integrated-rpc-save-pass-0.6.2.png`). Backup/journal riêng của lượt thử được giữ, copy giữ nguyên bytes. Chưa nghiệm thu UI Google/multiuser hoặc bật mainwriter; phép kiểm này cập nhật phần chuẩn bị/chưa chạy ở mục candidate, không cấp quyền ghi source thật.

Ngày cập nhật: **14/10/2026**. Mã/artifact hiện tại **0.6.1**; đã kiểm bản thử Google /dev, **chưa phát hành lại deployment /exec (v5/0.5.2)**. Mục18 đã được người dùng duyệt; **ghi dữ liệu ngược về Excel chưa hoàn tất**. Kho và app giữ riêng theo quyết định người dùng.

## Bổ sung 0.6.1 — làm rõ nơi lưu và kiểm quyền

Người dùng đã cấp quyền dự án thử riêng. Execution log Google lúc 15:37 ngày 14/10 ghi firstStatus200, staleStatus412, staleRejected=true, readBackPreserved=true, pass=true; đưa tệp giả vào Trash HTTP200. Ảnh kết quả (tệp chưa đồng bộ: `assets/conditional-drive-pass-0.6.1.png`). Phép thử chỉ dùng tệp giả do dự án tạo, **chưa phải ghi Excel hoặc ghi NQ01**. Mã dự án app chính không được thêm quyền Drive hoặc đổi sharing.

Đã xác định lỗi người dùng gặp khi bấm Lưu/Đồng bộ: SheetsRepository.save vẫn từ chối commit vì writer chưa tích hợp; cấp quyền probe không cài writer vào app chính. Không báo sửa xong việc lưu NQ01. Trong 0.6.1, nguồn Excel vẫn sửa ô được, nhưng action chưa hoạt động hiện **Chưa thể lưu vào Excel** (disabled), kèm giải thích phần sửa chỉ giữ trên trình duyệt. Có **Giữ thay đổi trên máy**. Thoát khi còn dữ liệu chưa ghi cho giữ phần sửa, không gọi lưu nguồn giả. Lưu bố trí dùng chung vẫn riêng.

Tên UI mới: popup **Áp dụng vào bảng**; đọc dữ liệu Google→app bằng **Đọc lại dữ liệu và danh mục từ Google**; retry chỉ thiết lập bằng **Đọc lại danh mục và bố trí**. Trang **Danh mục và bố trí dùng chung** giải thích Google Sheets riêng chứa danh mục/quan hệ/bố trí, có link đúng kho. Nút ghi vào kho là **Lưu danh mục và bố trí vào Google**, không ghi nội dung Excel. Luna sửa lời giải thích/popup/trang quản trị/hướng dẫn; tổng chỉ huy sửa capability gate ở UI, state và nghiệm thu.

138 tests/19 files, typecheck và docs check (18 Markdown/268 liên kết/36 mã Fxx) đạt; build HTML/build server trước đó đạt; HTML 142.124 byte/gzip 41.537 byte, không thêm dependency. Đã nhận 0.6.1 trên bản thử /dev; /exec vẫn v5/0.5.2, chưa phát hành lại. Kiểm Google /dev: popup Áp dụng vào bảng tạo1 phần sửa, các nút Chưa thể lưu vào Excel disabled; Giữ thay đổi trên máy báo chưa ghi file. Ảnh giao diện (tệp chưa đồng bộ: `assets/clear-save-state-0.6.1.png`). Đã bỏ đúng marker thử HDND_KIEM_TRA_NHAN_061 và bố trí bật cột Ghi chú trong tab kiểm, không ghi nguồn/kho. Kho vẫn12, nguồn 51, console không error/warn. Kết quả chi tiết trong KIEM_THU_VA_NGHIEM_THU. Repository Git hiện đã tồn tại tại thư mục dự án; chưa tạo commit/PR trong lượt này. Các ghi chú chưa có Git bên dưới thuộc lịch sử cũ.

### Kiểm tiếp ngày 14/10 — writer thử riêng

Workbook giả 3 tab do Luna tạo đã ghi/đọc thật qua dự án thử lúc 19:39: giữ ID/MIME Excel, C4 Nội dung/O4 Ghi chú đúng sau đọc blob, các XML ô khác và các part khác (gồm công thức, styles và tab phụ) nguyên bytes; ghi với ETag cũ trả412. pass=true, Trash200. Bằng chứng (tệp chưa đồng bộ: `assets/workbook-roundtrip-pass-0.6.1.png`). Lần thử đầu cần sửa MIME ZIP cho Utilities.unzip; các lần tiếp phát hiện mã fixture sai và parser hàng tự đóng nuốt hàng kế tiếp. Đã sửa, bổ sung regression hàng tự đóng. Không sửa dữ liệu sản xuất.

Core pure codec [ExcelWriteCore.gs](../server/ExcelWriteCore.gs) dò theo **mã gốc duy nhất**, không dựa NQ01 hiển thị hoặc vị trí hàng. Kiểm baseline từng trường, chặn ID/STT/công thức/ô gộp không phải ô đầu, văn bản XML/Unicode lỗi; chỉ patch trường được gửi. Core hiện được đưa vào gói server/dist. Điều này chưa nối nút lưu app thật hoặc hoàn tất ghi Cloud Excel; F31 chưa hoàn thành.

Kiểm quyền trên bản sao riêng đã có: dự án thử trả404 ở19:03, trong khi connector xác nhận tệp vẫn tồn tại và chỉ owner. Quyền drive.file đã cấp hoạt động với tệp dự án tự tạo, chưa truy cập được bản sao có sẵn. Chưa mở rộng OAuth cho app chính hoặc chia sẻ kho; cần giải quyết quyền chọn tệp trước khi dùng writer cho nguồn hiện hữu.

Đọc muộn bản sao Excel lúc19:03+: blob123.364byte,18parts/3tabs/**142 ô công thức**, C4 đúng giá trị đã phục hồi; tất cả giá trị ô và biểu thức công thức bằng snapshot gốc. Một số part worksheet/sharedStrings/styles bị viết lại; chưa xác định tác nhân. Bằng chứng này không đủ kết luận SpreadsheetApp không bao giờ ghi được Excel; chỉ phép thử đọc blob ngay sau setValue trước đó chưa đạt. Số150 công thức ghi trước đây đã sửa thành142: cách đếm prefix `<f` đã đếm cả8 thẻ `<fill>`. Mã kiểm hiện đếm đúng phần tử worksheet `f` theo namespace.

Kiểm UI /dev bổ sung: cảnh báo **Xử lý thay đổi trước khi về xem?** có Tiếp tục/Bỏ phần đang sửa/Giữ thay đổi trên máy; chọn Giữ về xem vẫn giữ1 phần sửa và báo chưa ghi nguồn. Ảnh cảnh báo (tệp chưa đồng bộ: `assets/exit-save-state-0.6.1.png`). Đã bỏ đúng marker thử HDND_KIEM_TRA_THOAT_061 trong tab kiểm, không bỏ phần sửa của người dùng. Console không error/warn; kho vẫn12. /exec vẫn chưa cập nhật.

### Office trực tiếp trên tệp giả — đã kiểm

Lúc19:45 dự án thử tạo riêng workbook giả1cTX8E9fadGfcssBW0d9Gjfz5B4_qVgYp, tên HĐND THỬ Excel giả - không nhập liệu thật, Google UI xác nhận .xlsx và Private to only me. Sửa C5 qua Office, đợi Saved to Drive. [OfficeConcurrencyProbe](../server/probes/OfficeConcurrencyProbe.gs) đọc blob có marker Office và ETag mới; ghi bằng ETag trước sửa trả412. Nạp workbook mới rồi ghép C4 theo mã ID1 đạt200, giữ C5 của Office, part/ô khác, ID/MIME; blob đọc lại đúng SHA upload. Log19:48 pass=true. Ảnh kết quả (tệp chưa đồng bộ: `assets/office-concurrency-pass-0.6.1.png`).

Office đang mở đọc C4 đã thấy marker từ writer. Đọc blob muộn19:50 (hơn2phút) có lateReadOnly=true, officeValuePreserved/appValuePreserved/pass=true. Đây chỉ một phiên/tài khoản trên workbook giả, không chứng minh20–30 người hoặc app thật. Đã đóng tab Office thử; cleanup lúc19:55 xác nhận trashed=true/HTTP200. Không sửa bản sao nguồn hiện hữu hoặc nguồn sản xuất trong phép thử này.

Ở bước chuẩn bị trước lựa chọn quyền, [probe bản sao hiện hữu](../server/probes/ExistingCopyWorkbookProbe.gs) có ID copy cố định, kiểm đúng tên/MIME/owner-only, conditional write/readback/stale412 và khôi phục bytes gốc chỉ khi ETag không đổi. [Manifest thử](../server/probes/drive-copy-test.appsscript.json) dùng quyền Drive rộng hơn. Quyết định và trạng thái upload/OAuth mới nằm ở mục tiếp theo; không coi lời cho tiếp tục là quyền mở rộng OAuth/ghi sản xuất.

### Quyết định quyền cho bước kiểm bản sao

Người dùng đã chọn **Cho phép quyền Drive rộng cho dự án thử riêng**. Đã lưu manifest dự án10BZrloGZJMyU8TCDWNOFy3rGxs9ZIv5I6ptEEnnc8LtQnFM0M5cW8HuF sang drive + external_request và mã thử đúng bản sao19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7 rồi khôi phục. OAuth Google mới chưa được xác nhận. App chính/Excel nguồn/kho dùng chung không nằm trong quyền ghi thử này. Metadata probe dùng đúng Drivev2 labels.trashed; các trường title/MIME/private/ETag đều phải đạt trước ghi. Luna thêm9 test guard mock, tổng suite138/19 và typecheck đạt. Chỉ hàm chỉ đọc được chạy để kiểm OAuth; không bấm Run writer khi chưa kiểm quyền.

Sau lưu manifest, GET23:05 vẫn404; connector xác nhận copy còn123.364byte và đúng owner. Đã thêm getAuthorizationInfo theo từng scope, requireScopes trước token/lock/HTTP vào cả readprobe/writer và kiểm tài khoản Drive bằng boolean trong readprobe. Lúc23:14 Google log driveAuthorization=REQUIRED, thiếu đúng https://www.googleapis.com/auth/drive; requireScopes dừng trước HTTP và mở Authorization required/Review permissions. Ảnh bàn giao (tệp chưa đồng bộ: `assets/drive-scope-required-0.6.1.png`). Đã hiện trình duyệt và yêu cầu người dùng tự xác nhận Google. Không suy việc function từng chạy được thành quyền đủ; scope drive.file cũ không thay Drive mới. Hàm About/đối chiếu tài khoản chưa chạy vì scope gate chặn; chưa kết luận lỗi tài khoản và chưa thử ghi copy.

### Quyền và roundtrip bản sao nguồn — đã đạt23:19–23:22

Người dùng báo đã cấp quyền Drive. Google execution23:19 xác nhận driveAuthorization=NOT_REQUIRED; About200/accountMatchesCopyOwner=true và GET bản sao200, đúng XLSX/có ETag. Đây là bằng chứng quyền dự án thử đủ, thay trạng thái chờ OAuth ở mục trên; không mở rộng quyền app chính.

Đã chạy testExistingCopyExcelRoundtrip23:21–23:22 trên đúng copy19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7. Kiểm title/MIME/owner-only/không Trash và ETag trước khi ghi; append marker vào C4 theo mã gốc duy nhất, giữ các ô/part khác. Log cuối có sameFileId/mimePreserved/contentReadBack/blobMatchesUpload/otherPartsPreserved/otherCellsPreserved/packagePass/restoredOriginalBytes/pass=true; ETag cũ bị từ chối412. **Chỉ in pass sau khi rollback có điều kiện và đọc lại bytes đúng bản trước thử.** Ảnh kết quả (tệp chưa đồng bộ: `assets/existing-copy-roundtrip-pass-0.6.1.png`). Tệp copy được giữ, không trash; nguồn1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp không bị ghi và kho vẫn chưa bị thay đổi ở bước này.

Chưa tích hợp writer vào app; /exec vẫn v5/0.5.2, /dev0.6.1 và nguồn HTML vẫn chưa ghi Excel. Bước tiếp theo là adapter/RPC/luồng đọc nhất quán, operation ID/backup/audit/retry và kiểm trên môi trường riêng trước cấp quyền/triển khai app chính. Quyền Drive đã cấp **chỉ dự án thử**, không phải cho phép ghi NQ01 thật hoặc đổi deployment/quyền app chính. Chưa nghiệm thu nhiều người, thay đổi ảnh hưởng công thức tổng hợp/cached value, timeout hoặc rollback gặp sửa mới. Không đánh dấu F31 hoàn tất.

## Đã kiểm ở 0.6.0

- Nguồn Excel đọc 51 nội dung; chỉ một bước vào chỉnh để bấm ô sửa nháp. Dropdown neo tại ô, Sở mở một lần bấm; Chuyên viên tìm không dấu (ky tìm Nguyễn Văn Kỳ), có lọc phòng/toàn cơ quan. ID/STT chỉ xem. Nội dung/Ghi chú dùng popup, Lưu đưa vào nháp. Chế độ xem không có editor.
- Nội dung sửa rồi Esc có ba lựa chọn. Ghi chú sửa rồi X có cảnh báo; Lưu vào nháp rồi mở lại/sửa/bỏ popup giữ nháp trước đó. Nút Lưu/Đồng bộ dữ liệu báo writer chưa sẵn sàng và giữ1 nháp; checkpoint10 giây quan sát được. Trình/Rút chọn Đã rút làm danh sách Đang trình còn50/51 trong nháp; bỏ nháp trả51/51. Đã bỏ các nháp dữ liệu thử, không gửi sửa nguồn. Console bản thử cuối không có error/warn.
- frameWidth riêng cho khung trắng, auto hoặc 320–6000px, giới hạn bằng vùng màn hình. Đo khung800/table1500/viewport762; nhập2400 có khung1209/table1500/viewport1171, toàn trang1265 không tràn ngang. tableWidth cũ vẫn riêng ở nâng cao. Đọc cấu hình cũ thiếu frameWidth thành auto; client cũ gửi thiếu trường bị chặn.
- Kho đọc revision 10 trước kiểm; giữ nguyên các thay đổi người dùng ở9/10. Lưu khung800 trên /dev được Google xác nhận revision 11, tab độc lập cùng tài khoản đọc11 và khung800/table1500. Trả auto ở revision 12, tab độc lập đọc lại12 và đo card1209/table1500, trang1265 không tràn; không reset thứ tự/ẩn cột/danh mục. Sửa lỗi /dev trả editorUrl không hợp lệ: giữ link /exec chuẩn trong metadata. Nhãn checkpoint sau lưu được sửa để không còn nói Chưa áp dụng; đã kiểm bằng test hook.
- Typecheck, **113 tests/17 files**, build HTML/build server đạt; **138.001 byte, gzip 40.892 byte**, không thêm dependency. Test mới kiểm nháp nguồn read-only, refresh không ghi đè nháp, save lỗi/phản hồi thiếu/phần xác nhận, frame migration, client cũ và editorUrl ở /dev. Unit test không thay kiểm cloud. Luna phụ trách popover/panel/hướng dẫn, tổng chỉ huy tích hợp và kiểm. Kiểm tài liệu đạt18 Markdown/236 liên kết/36 mã Fxx.
- [Báo cáo và ảnh](KIEM_THU_VA_NGHIEM_THU.md) ghi phạm vi. Cảnh báo X/Esc đã quan sát; click nền có xử lý trong mã nhưng chưa kiểm UI đầy đủ ở lượt này. Chưa kiểm nhiều máy/tài khoản, mở trực tiếp file:// hoặc phát hành bản 0.6.0 ra /exec.

## Đường ghi Excel — kết quả thực tế và phần còn dở

Người dùng xác nhận **Apps Script cũ chưa triển khai**. Mã legacy có luồng gửi sửa nhưng không chứng minh backend vận hành. HTML có thể gọi backend; bản mới chưa có writer Excel đã kiểm chứng, không phải HTML vốn không ghi được.

- Nguồn1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp giữ ID/link/Excel. Metadata đọc tại mốc0.6.0 là127.639byte, modifiedTime2026-10-14T02:19:40.163Z như trước phép thử. Không ghi thử hoặc chuyển đổi nguồn. Kho native1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM vẫn private; manifest app chính chỉ Sheets, USER_ACCESSING/MYSELF, không mở ANYONE.
- Bản sao riêng19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7 được xác minh chỉ owner. Thử thay đúng ôC4 bằng patch ZIP rồi Drive update giữ fileId/link đạt:18 parts,3 tabs,142 công thức; chỉ XML ô đích đổi, các parts khác nguyên bytes. Tải lại blob đúng SHA256 của bản sửa. Đã trả blob bản sao về bytes gốc. Đây chỉ là một phép ghi bản sao, chưa chống ghi đè sửa đồng thời.
- Thử SpreadsheetApp trên bản sao14:56–14:57: setValue/flush/getValue báo marker mới, nhưng tải blob xlsx vẫn nguyên hash gốc, C4 không có marker. Không chấp nhận API getValue làm bằng chứng ghi Excel. Đã phục hồi view thử về giá trị gốc lúc15:09. [Mã thử](../server/probes/ExcelWriteProbe.gs) lưu riêng, không đóng gói; hàm thử tạm trong dự án app chính đã thay bằng comment lưu trữ.
- [Phép thử có điều kiện](../server/probes/DriveConditionalProbe.gs) đã chuẩn bị ở dự án riêng [Dashboard HĐND - Thử ghi có điều kiện](https://script.google.com/home/projects/10BZrloGZJMyU8TCDWNOFy3rGxs9ZIv5I6ptEEnnc8LtQnFM0M5cW8HuF/edit). Chỉ tạo tệp giả, thử ETag/If-Match rồi đưa vào Trash; không có ID nguồn. Google đã được người dùng cấp OAuth drive.file/external_request cho dự án riêng; kết quả ở mục 0.6.1. Không đưa quyền này vào app chính.

## Bước tiếp theo

1. Quyền thử, roundtrip workbook giả, Office trực tiếp trên tệp giả và ghi/khôi phục bản sao cấu trúc nguồn đã đạt. Tiếp theo tích hợp adapter/RPC và cơ chế operation ID/backup/audit/retry, phân biệt loại nguồn với quyền ghi, kiểm đọc nhất quán và công thức/cache/rollback khi có sửa mới. Thực hiện trong môi trường riêng; chưa bật ghi source sản xuất.
2. Trình bản thử giao diện và kết quả. /exec hiện vẫn v5; chưa đánh dấu toàn bộ mục 18/F31 hoàn thành hoặc ghi nguồn sản xuất.
3. Các phần báo cáo nâng cao, lịch sử/backup/nhập xuất đầy đủ và F01–F36 chưa thay thế hết tiếp tục theo [kế hoạch 1.16](KE_HOACH_VIET_LAI.md). [Hướng dẫn](HUONG_DAN_SU_DUNG.md) và [kiến trúc](ARCHITECTURE.md) đã cập nhật0.6.0.

## Lịch sử 0.5.2 — trước lượt triển khai 0.6.0

Phần dưới là bằng chứng tại mốc 0.5.2 và các mốc cũ, không thay trạng thái hiện hành phía trên.

## Đã hoàn thiện và kiểm chứng

- Thứ tự danh mục thống nhất ở nhóm báo cáo/preview, bộ lọc, danh sách chọn và danh mục mở lại. Mục mới có trong dữ liệu được bổ sung ở cuối; không bỏ trạng thái lạ hay nạp lại mặc định đã xóa nếu không được sử dụng.
- Chế độ chỉnh bảng: giữ và kéo tiêu đề bằng pointer (chuột/cảm ứng), Alt+←/→ thay thế; kéo mép đổi độ rộng, ẩn/hiện và đổi thứ tự vẫn có thông số. Luồng kéo chuột đã quan sát đổi ID/Sở/Nội dung → ID/Nội dung/Sở. Lưu thứ tự Nội dung/ID/Sở rồi mở lại giữ nguyên. Chế độ xem không có tay nắm hoặc thao tác đổi vị trí.
- Độ rộng bảng thực dùng max(tableWidth giới hạn 600–6000, tổng độ rộng cơ sở cột hiện). Bỏ giới hạn shell 1500 ở trang danh sách. Browser đo bảng 2400 px trong khung 728 px, cuộn ngang. Nếu bảng rộng hơn tổng cơ sở, trình duyệt chia phần dư cho các cột.
- Bấm ô trường danh mục mở picker; chuyên viên có tìm không dấu và lọc theo quan hệ phòng. Query mau d tìm D, giữ tên hiện tại A nếu không khớp. Chọn D phản ánh vào nháp. ID/STT chỉ hiển thị; Nội dung và Ghi chú là văn bản tự do trong popup.
- Popup Nội dung có Lưu vào bản nháp, đóng khi đã sửa hiện ba lựa chọn Lưu/Không lưu/Tiếp tục. Đã thử sửa → đóng → cảnh báo → tiếp tục → lưu popup → lưu 1 bản ghi mẫu, giữ cả nội dung mới và chuyên viên D. Nháp được quan sát tự lưu theo chu kỳ 10 giây. Lưu bố trí có khóa thao tác trong lúc gửi; thất bại giữ editor/nháp.
- Typecheck, **104 tests/17 files** và build đạt. Một HTML **130.234 byte, gzip 38.655 byte**. Không thêm dependency; package/lock 0.5.2. Test schema/chunks/source và server fake gồm xung đột, ghi dở, retry operation, validation/lock; không coi fake là kiểm cloud.
- Kiểm riêng artifact HTML cuối qua HTTP: đọc 51 nội dung nguồn Excel gốc, bảng mẫu 2500 px, kéo Nội dung trước ID và Lưu đạt; console không lỗi/cảnh báo. Mã nguồn, thư mục và quyết định đã cập nhật trong tài liệu liên quan. [Bằng chứng và giới hạn](KIEM_THU_VA_NGHIEM_THU.md).

## Đồng bộ dùng chung: trạng thái thực tế

- Giữ nguyên Excel/link nhập liệu 1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp, gid 60961344. Không chuyển đổi hoặc ghi nội dung nghiệp vụ. Google Drive đã xác minh MIME Excel và quyền nguồn.
- Kho riêng native 1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM, tab ẩn _HDND_APP A:H. Quyền vừa đọc lại bằng Google Drive API: chỉ một owner, không permission anyone/domain/reader khác. Người dùng chọn giữ kho riêng tiếp tục thử; không thay chia sẻ.
- Apps Script standalone hiện dùng deployment v5 ngày 14/10 lúc 10:06, USER_ACCESSING + MYSELF. V5 dùng giao diện 0.5.2; RPC thật đọc revision6, lưu items7 và khôi phục8 đạt. Server và phạm vi quyền giữ như v4. Link [Google app](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec) được giữ nguyên.
- Lỗi RPC parser gặp trước v3 vì Apps Script thiếu URL/URLSearchParams đã được sửa: server kiểm canonical URL/ID/gid, core bỏ parser browser. Test thiếu API đạt và RPC thật sau v3 thành công. Không có bằng chứng lỗi tái diễn sau init/revision 2; các tài liệu ghi nhầm đã được sửa.
- Revision 1 khởi tạo đủ profile hiện tại; revision 2 lưu thứ tự lãnh đạo theo ảnh: Long/Thiện/Hưng/Anh Tuấn/Huy Hoàng/Thanh Hùng. Tab thứ hai đọc lại đúng thứ tự nhóm báo cáo.
- Revision 3 lưu width2400, tab khác đọc đúng width2400. Một nháp width2200 giữ base2 bị server chặn do stale; editor còn nguyên2200 và checkpoint. Bỏ nháp thử/nạp lại đọc3. Revision4 trả width1500 như trước thử.
- Revision5 thử đổi tên báo cáo1, tab thứ hai đọc đúng tên mới; revision6 trả về tên gốc. Revision6 giữ tên/độ rộng ban đầu và thứ tự lãnh đạo theo ảnh trước lượt kiểm 0.5.2. Ba section catalogs/items/reports đã đọc/ghi thật; không ghi dữ liệu nghiệp vụ.
- Revision7 lưu thử width1600; tab kiểm tra riêng đọc đúng7/1600. Revision8 trả width1500 ban đầu; tab kiểm tra đọc lại8/1500. Hai lần Lưu và thoát thật thành công, editor đóng đúng lúc Google xác nhận; không ghi nội dung Excel. Ảnh lưu thành công (tệp chưa đồng bộ: `assets/shared-save-0.5.2.png`), ảnh deployment v5 (tệp chưa đồng bộ: `assets/deployment-0.5.2.png`).
- Sửa race đọc cấu hình đầu tiên bị bỏ khi vào chỉnh sớm: App chờ base trước editor, hook nhận lần đọc đầu; không đổi base của nháp khi refresh nền, không để read cũ đè save mới, khóa lưu trùng và phân biệt loading/empty/error. Có Thử tải lại cấu hình và link Google editor từ HTML private. 12 regression tests đạt (repository giả; không thay bằng chứng cloud).
- Checkpoint bảng chỉ hoạt động khi chỉnh; chế độ xem không xóa nháp. Nháp khác base được giữ và có lựa chọn giữ/bỏ/nạp để đối chiếu tại bảng/báo cáo/danh mục. Nạp nháp không ghi Google. Luồng nháp khác base đã kiểm hook; modal UI chưa kiểm đủ trên Google. Không xác nhận phục hồi được nháp người dùng nếu bản cũ đã xóa trước lượt sửa.
- Mật khẩu trước Settings mới được đề xuất, chưa triển khai; không thay quyền Google bằng mật khẩu HTML.
- Hai tab dùng cùng tài khoản, chưa phải hai máy/tài khoản. HTML ở ngoài Google chưa đọc được cấu hình private qua GViz trong lượt kiểm; vẫn đọc Excel51. Không mở ANYONE hoặc quyền đọc kho sau khi người dùng chọn giữ riêng. [Bằng chứng](KIEM_THU_VA_NGHIEM_THU.md), [quy trình](DONG_BO_CAU_HINH.md).

## Kế hoạch tại mốc 0.5.2 (đã được duyệt sau đó)

Ngày 14/10: người dùng yêu cầu duyệt kế hoạch sửa dữ liệu ô thật và độ rộng khung ngoài bảng trước khi code. [Kế hoạch1.12, mục 18](KE_HOACH_VIET_LAI.md#18-sửa-ô-dữ-liệu-thật-và-độ-rộng-khung-chứa-bảng--dự-thảo-14102026) ghi hai lựa chọn đã trả lời: ID/STT chỉ xem, Ghi chú popup; khung tối đa màn hình và cuộn bảng bên trong. Đây là tình trạng trước khi người dùng duyệt; triển khai 0.6.0 xem phần hiện hành ở đầu tài liệu.

## Bước tiếp theo

1. Tiếp tục thử riêng theo quyết định của người dùng; kiểm trên máy khác cùng tài khoản nếu có điều kiện. Chưa mở cho người khác.
2. Hoàn thiện các phần còn thiếu theo [kế hoạch 1.12](KE_HOACH_VIET_LAI.md): cấu hình báo cáo nâng cao, tỷ lệ/rule và nhập/xuất/migration. App chưa thay thế đủ F01–F36.
3. Ghi Excel thật, nhiều tài khoản/máy, quota/hiệu năng, backup/audit và chia sẻ cấu hình cho người nhận HTML vẫn chưa nghiệm thu. Nội dung chỉ chỉnh trong mẫu hoặc qua Excel gốc.
## Mốc 0.4.0 — bằng chứng trước khi bổ sung đồng bộ

Phần dưới là lịch sử local 0.4.0, không thay trạng thái 0.5.2 phía trên.

## Đã thực hiện

| Phạm vi | Kết quả thực tế | Bằng chứng |
|---|---|---|
| Tài liệu/mã nguồn | TypeScript/TSX, Preact compat, domain tách UI, repository tách nguồn; kế hoạch 1.8, kiến trúc 1.7 | [Chỉ mục](README.md), [bản đồ mã](REPO_MAP.md) |
| F01–F06/F12–F13 lõi đọc | KPI, ba báo cáo, bốn cách nhóm, chi tiết, tìm không dấu và lọc; chưa đủ tỷ lệ dòng/mô tả TU/rule | Tests và browser HTTP; đối chiếu lịch sử phía dưới |
| F08/F09/F11 phần bố trí | Đổi tên/vị trí/ẩn ba bảng; thứ tự/ẩn cột từng báo cáo. Control cạnh preview trong chế độ riêng; xem mặc định không có editor. Lưu/Hủy/reset, cấu hình riêng nguồn/browser | Test report-preferences, kiểm preview và phục hồi nháp |
| F14/F15/F21 phần danh sách | Đủ cột A–P có thể mở, ID riêng NQ01/BC01; loại VB riêng; thứ tự/ẩn cột; nhập độ rộng hoặc resize; khung chung và cuộn ngang; lưu bố trí theo nguồn. Sửa selector/textarea/popup chỉ ở mẫu | Tests item-preferences/display-id/search; browser desktop |
| F16/F17 phần danh mục cục bộ | 11 nhóm: tìm không dấu, thêm/đổi tên/xóa mục chưa dùng, thứ tự/nạp giá trị; gán chuyên viên một/nhiều phòng; selector lọc theo phòng, tùy chọn toàn cơ quan; chặn lưu nháp phân công mâu thuẫn quan hệ đã biết | Tests catalogs; browser thêm/đổi/xóa và quan hệ |
| F23/F32 bảo vệ thoát | Ba lựa chọn Lưu/Không lưu/Tiếp tục ở báo cáo, danh sách, dữ liệu mẫu, popup, danh mục kể cả nhập chưa bấm Thêm/Lưu tên và link/gid. Lưu lỗi giữ nháp; Esc đóng lớp đang thao tác | Kiểm browser từng luồng; URL sai giữ nguồn |
| F33 phần nháp | Checkpoint local định kỳ 10 giây, sau dừng nhập ngắn, khi rời/ẩn trang. Phục hồi cấu hình và nháp mẫu khi base khớp; không tự áp dụng, không cache Sheets offline | Tests checkpoint/recovery; mở tab thử thứ hai phục hồi báo cáo và dữ liệu mẫu |
| F30/F32 kết nối đọc | Link/gid/test/connect; GViz A–P, làm mới thủ công/60 giây khi tab hiện. Nguồn chỉ định đọc 51 nội dung tại lượt kiểm; không ghi | Tests parser/adapter/config và browser HTTP |
| Đóng gói | Một dist/Dashboard_HĐND.html, JS/CSS inline, không nhúng dữ liệu thật, không thêm dependency | Build 0.4.0: **107.053 byte; gzip 32.553 byte** |

## Đã kiểm tra

- Typecheck và kiểm cú pháp bundle inline đạt; **68 tests/12 file đạt**. [Báo cáo kiểm tra](KIEM_THU_VA_NGHIEM_THU.md) ghi phạm vi từng lượt, không coi unit tests là thử mọi lỗi trình duyệt.
- Browser desktop HTTP: control ba báo cáo cạnh preview, đổi thứ tự cột phản ánh trên chính bảng; lưu bố trí. Danh sách thể hiện ID hai chữ số; khung 1050 px, cột nội dung 520 px; đưa Nội dung lên trước ID, resize bàn phím lên 530 px; độ rộng trống bị chặn lưu, khung vẫn dùng được. Nhóm cột có vùng cuộn riêng.
- Danh mục: đủ 11 nhóm, thêm/đổi tên/tìm không dấu/xóa mục thử chưa dùng; mục đang dùng bị chặn đổi tên. Chuyên viên mẫu A gán hai phòng và được chọn đúng khi đổi phòng trong mẫu. Không tự đổi dữ liệu nguồn.
- Thoát khi sửa: phần link/gid, bố trí, dữ liệu mẫu, popup nội dung và danh mục có ba lựa chọn; thử nhập link sai rồi chọn lưu giữ hộp thoại và nguồn cũ. Bấm Đang sửa → Xem có xác nhận riêng cho dữ liệu; bỏ nháp trả lại giá trị gốc. Esc trong ô đổi tên chỉ hủy ô đó.
- Phục hồi: quan sát trạng thái tự lưu; tab thử thứ hai phục hồi tiêu đề báo cáo chưa áp dụng và tiến độ mẫu chưa lưu; thử bỏ nháp và đóng các tab thử. Validator cho phép giữ nháp đang nhập dở nhưng Lưu vẫn kiểm nghiêm ngặt; base sai/corrupt bị từ chối. Đã sửa xóa checkpoint khi quay về giá trị gốc để không phục hồi thay đổi cũ.
- Kiểm lại phiên sạch: sửa tiêu đề rồi hoàn nguyên về gốc, thoát/mở lại không phục hồi nháp cũ. Preview báo cáo cuộn trong bảng, không tràn cả trang (scrollWidth = clientWidth 1265 px). Console lượt cuối không lỗi/cảnh báo mới; lỗi Vite HMR lúc chưa tích hợp prop onClose thuộc quá trình phát triển, đã tích hợp/typecheck/build/nạp lại. Chi tiết thuộc báo cáo kiểm tra.
- Mốc 0.3.0 đã kiểm tên/vị trí/ẩn/reset và persistence reload; mốc 0.1.0 đã kiểm desktop/390 px. Đây là bằng chứng theo mốc, không phải lượt responsive/Drive mới cho 0.4.0.

## Chưa thực hiện hoặc chưa kiểm chứng

- Mở trực tiếp file:// hoặc file tải từ Drive chưa kiểm được do công cụ browser chặn giao thức; HTTP không xác nhận quy trình mở file thật. Chưa upload/deploy hay đổi quyền nguồn.
- Chưa auth/OAuth, ghi Sheets từ app, ID nội bộ ổn định khi migration, shared catalogs hoặc audit trung tâm. Danh mục/quan hệ và bố trí hiện lưu riêng browser/source; mục đang dùng không đổi tên hàng loạt. Quan hệ chưa biết không bị tự suy diễn.
- Chưa editor báo cáo đầy đủ (thêm/xóa bảng, nguồn/trục/mapping, định dạng title, tỷ lệ dòng/mô tả TU), đổi nhãn cột tùy ý, kéo bù trừ/mở rộng toàn trang, Excel/JSON/backup, thêm/lưu trữ/khôi phục dữ liệu thật.
- Tự lưu nháp cần localStorage hoạt động; tab nền có thể trễ, sự cố trước checkpoint vẫn có thể mất phần mới nhập. Chưa kiểm crash tiến trình/mất điện. Lưu dữ liệu mẫu vẫn chỉ trong phiên; nháp phục hồi không thay backup/history bền hay cache đọc offline.
- Chưa đo quota hoặc tải đồng thời 20–50 người; chưa nghiệm thu in nhiều trang. npm audit 0 cảnh báo thuộc mốc 0.1.0; mốc sau không thêm phụ thuộc. Chưa khởi tạo Git.

## Công việc kế tiếp

1. Kiểm chứng mở một HTML theo quy trình Drive/browser thực tế của người dùng và quyền của người nhận.
2. Tiếp tục phần thiếu 1B.1: nguồn/trục/mapping, định dạng, tỷ lệ dòng/mô tả TU và thêm bảng; sau đó cấu hình JSON, in/xuất theo [kế hoạch 1.8](KE_HOACH_VIET_LAI.md).
3. Ghi dữ liệu và danh mục chung triển khai sau khi có auth/IDs/revision, trên bản sao; chưa dùng editor local làm luồng ghi sản xuất.

Phụ trách tại [WORKBOARD](WORKBOARD.md), hướng dẫn tại [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md). Bảng Fxx dưới là audit lịch sử 0.2.0; phần trên là delta hiện hành.

## Đối chiếu tính năng cũ → mới 0.2.0 — rà mã ngày 13/10/2026

Bảng này là bằng chứng tại mốc 0.2.0; thay đổi 0.3.0–0.4.0 được ghi ở phần mới phía trên. **Bản mới vẫn chưa thay thế đủ chức năng bản cũ.** Bảng dưới kiểm tra mã HTML đang dùng và hai bộ server cũ với mã mới, không lấy tên nút hoặc module mẫu làm bằng chứng đã có ghi/lịch sử thật. Lượt này rà source và tài liệu, không chạy lại bản cũ/Apps Script triển khai và không đổi HTML bàn giao. Kết quả browser/36 tests trước đó vẫn thuộc mốc kiểm tra riêng phía trên.

Nguồn bằng chứng:
- **C**: HTML cũ đang dùng (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/Báo cáo tiến độ HĐND.html`); số sau dấu hai chấm là dòng mã. Không dùng .bak làm chuẩn chức năng hiện tại.
- **G**: GoogleAppsScript_DongBo.js (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/GoogleAppsScript_DongBo.js`); **D**: Code_Dong_Bo.js (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/Code_Dong_Bo.js`). Mã tồn tại không xác nhận server nào đã deploy hoặc hoạt động.
- Mã mới: [App](../src/app/App.tsx), [reporting](../src/domain/reporting.ts), [ReportTable](../src/features/reports/ReportTable.tsx), [ItemList](../src/features/items/ItemList.tsx), [metadata](../shared/field-definitions.ts), [workspace](../src/state/use-workspace.ts), [mock](../src/data/mock-repository.ts), [Sheets](../src/data/sheets-repository.ts), [parser](../src/data/gviz-parser.ts), [kết nối](../src/features/settings/ConnectionPanel.tsx).

“Có lõi đọc” chỉ xác nhận phạm vi nêu trong ô, chưa xác nhận toàn bộ tiêu chí Fxx; “mẫu” chỉ giữ trong phiên giả; “chưa” là chưa có luồng người dùng trong bản mới. Yêu cầu và thiết kế chuẩn xem [FEATURES](FEATURES.md) và [ARCHITECTURE](ARCHITECTURE.md).

| Mã | Bằng chứng bản cũ | Có gì ở bản mới | Còn thiếu hoặc khác cần xử lý |
|---|---|---|---|
| F01 | KPI tổng/NQ/BC/chưa trình/VP/hoàn thành — C:4356,4662 | Có lõi đọc — reporting/App | Loại mâu thuẫn được báo chưa phân loại thay vì tự gán NQ; cần đối chiếu nghiệp vụ, không lấy tổng sai cũ làm chuẩn |
| F02 | Bảng TU, mapping, mô tả NQ/BC và cấp TTTU/BTV/BCH — C:103,240,292 | Một phần — reporting/ReportTable | Chưa mô tả cấp TU, chưa editor mapping; lọc “Không phải xin ý kiến” hiện so chuỗi chính xác, cần kiểm biến thể nhãn |
| F03 | Bảng NQ, tỷ lệ theo dòng/tổng — C:141,610 | Có lõi đọc, tỷ lệ chung — reporting/ReportTable | Chưa tỷ lệ từng dòng, cột hoàn thành tùy chọn và editor đầy đủ |
| F04 | Bảng BC, tỷ lệ theo dòng/tổng — C:176,610 | Có lõi đọc, tỷ lệ chung — reporting/ReportTable | Cùng khoảng trống F03; giữ nhóm chưa phân loại rõ |
| F05 | Bốn cách phân nhóm — C:4706 | Có sở/phòng/lãnh đạo VP/lãnh đạo UBND — metadata/App | Chưa nghiệm thu toàn bộ dữ liệu nghiệp vụ; phạm vi nhóm hiện dùng chung cho ba bảng |
| F06 | Bấm ô số → mã/nội dung/phòng/chuyên viên/sở — C:633,4780 | Có popup lõi tương đương/đúng tập bản ghi — ReportTable/App | Tìm trong popup, xem thêm trường và mở chi tiết tổng/cột ẩn là cải tiến chưa có, không phải chức năng bị mất so với popup cũ |
| F07 | Thêm bảng; sáu nguồn, sáu trường chia cột — C:984,1002,3830 | Chưa; chỉ ba mẫu cố định | Thiếu NQ phải xây dựng/từ khóa, chọn trục sở/phòng/lãnh đạo VP, thêm bảng. Từ khóa cũ chỉ chỉnh qua JSON; wizard cũ cắt 6 trạng thái không kế thừa |
| F08 | Tiêu đề đậm/nghiêng/gạch chân/màu/tô từ khóa và nền — C:258,862 | Chưa; tiêu đề mặc định | Cần editor cùng nơi tùy chỉnh bảng, xem trước/Lưu/Hủy |
| F09 | Thêm/xóa/đổi nhãn/thứ tự/ẩn/màu cột; nạp trạng thái thực tế — C:741,1031 | Một phần: checkbox ẩn cột mẫu trong App | Chưa quản lý cột đầy đủ, chưa lưu lựa chọn sau mở lại |
| F10 | Mapping có thứ tự, mặc định khi trống, cột hoàn thành, % dòng/tổng, mô tả — C:240,292,610,797,1172 | Một phần: hoàn thành mặc định, % chung; trạng thái lạ vẫn vào tổng | Thiếu editor quy tắc/mặc định/% từng dòng/bật tắt/mô tả; cần xem trước ảnh hưởng và không gộp sai cấp |
| F11 | Thứ tự/ẩn/xóa/khôi phục bảng — C:3950,4364,4440 | Chưa | Cờ ẩn KPI/cả danh sách cũ chỉ chỉnh JSON (C:204,4662,4757); bổ sung UI, không coi là nút cũ đã có |
| F12 | Tìm không dấu: nội dung/mã/sở/phòng/chuyên viên — C:3113 | Có năm trường này — search/ItemList | Tìm trong chi tiết hoặc thêm trường khác là mở rộng; chưa phải phần thiếu của tìm cũ |
| F13 | Loại, lãnh đạo VP, tiến độ, đang trình/rút — C:3099,3436 | Có phối hợp bốn bộ lọc — ItemList | Chưa nút xóa toàn bộ lọc; không tự đổi tên lãnh đạo theo map hard-code cũ |
| F14 | 16 cột A–P; ID/STT chỉ xem — C:2452,3494,5030 | Parser đọc đủ A–P; UI có 13 trường chữ + mã + rút | STT chưa có cột hiển thị; mã/rút bị cố định chưa chọn/đổi nhãn. Sửa chỉ ở mẫu; không yêu cầu editor ID/STT vì cũ không có |
| F15 | Sửa ô, chọn danh mục, popup nội dung, Ctrl+Enter/Esc — C:2475,3129,3185 | Một phần ở mẫu — ItemList/ContentEditor | Nhiều editor dùng input text thay selector/textarea thích hợp; chưa sửa nguồn thật, chưa workflow ghi |
| F16 | 11 danh mục; tìm/thêm/sửa/xóa/thứ tự/nạp từ dữ liệu/reset/thay hàng loạt — C:1473,1519,1641,1665,5319 | Chưa | Datalist/status constants không phải quản lý danh mục; tiến độ cụ thể cũ cũng là danh mục |
| F17 | Chuyên viên theo phòng, chọn toàn cơ quan, bổ sung và gán phòng — C:1303,1793,2103,2173 | Chưa | Trường phòng/chuyên viên có nhưng độc lập; cần quan hệ ID, rà bất nhất, không tự gán sai |
| F18 | Thêm nhanh nội dung — C:3154,5245 | Chưa | Cần validation/ID ổn định; không dùng số dòng hay mã mới cũ có thể trùng |
| F19 | Đánh dấu rút/bỏ rút, lọc lại — C:3436,3713 | Đọc/lọc rút thật; checkbox đổi rút trong mẫu — parser/ItemList | Chưa ghi/khôi phục trạng thái thật từ app; đề nghị rút không tự thành đã rút |
| F20 | Xóa dòng và tombstone local — C:5287 | Chưa; chỉ có trường archivedAt và fixture | Lưu trữ/khôi phục là thay thế tương đương cần xây, không coi trường model là thao tác đã có |
| F21 | Nhãn/thứ tự/ẩn/độ rộng, kéo bù trừ/tự do/reset, lưu local — C:2610,2840,2877,2974 | Một phần: chọn/ẩn 13 cột và reset trong phiên — ItemList | Thiếu STT/all-columns metadata, đổi nhãn/thứ tự/resize/2 chế độ/lưu bền |
| F22 | Mở rộng danh sách toàn trang và Esc — C:2999,3249,3309 | Chưa mở rộng bảng | Dialog có Esc nhưng không thay thế bảng mở rộng; kiểm bàn phím riêng khi triển khai |
| F23 | Lưu/Hủy khi thoát sửa toàn phiên — C:4288 | Mẫu có nháp/Lưu/Hủy, lỗi từng mục — workspace/mock | Chưa lưu thật. Không kế thừa Hủy local cũ sau khi đã gửi ghi từng ô lên Sheets |
| F24 | Lịch sử ô hover, nhật ký thao tác local, timestamp/trước-sau — C:344,5177,5319 | Lịch sử từng nội dung mẫu trong phiên — HistoryDialog/mock | Thiếu per-field/nhật ký chung/lưu bền/lịch sử thật; server audit là cải tiến mới |
| F25 | Excel: 16 cột, comment lịch sử, sheet nhật ký và backup — C:5364,5417,5464,5496 | Chưa | Xuất dữ liệu đọc có thể làm sớm; lịch sử phải nêu nguồn/khả dụng, không xuất lịch sử mẫu như thật |
| F26 | Nhập Excel thường và nhận _BACKUP_DATA_ — C:5524,5534,5562 | Chưa | Cần preview/kiểm tra/mapping/đối chiếu; nhập không tự ghi đè Sheets |
| F27 | Full backup data/logs/droplist nằm trong Excel — C:5496,5534 | Chưa | JSON dữ liệu đầy đủ là yêu cầu mới; cũ không có tải full-data JSON riêng |
| F28 | Xuất/nhập JSON cấu hình dashboard — C:4408,4419,4622 | Chưa | Cần version/validation/preview và reader tương thích cấu hình cũ |
| F29 | In từng bảng, clone rồi window.print — C:408 | Một phần: nút In/PDF và nguồn/ngày/tổng — ReportTable | Chưa kiểm in nhiều trang; cần mẫu giữ đủ cột/tiêu đề/phạm vi, tỷ lệ từng dòng khi có |
| F30 | JSONP đọc và chu kỳ 60s — C:4996,5164 | Có đọc/làm mới/time; tab ẩn bỏ lượt — Sheets/workspace | Chưa đo quota/nhiều người hoặc file/Drive; cần đối chiếu số liệu thay vì merge cache cũ đè nguồn |
| F31 | POST update/add/delete/batch qua GAS — C:4964,5240,5282,5303,5358; G:135 | Chưa ghi Sheets; mock không thay thế | Backend nào deploy chưa rõ; bỏ giao thức không đầy đủ/ghi công khai, thiết kế quyền/revision trước |
| F32 | Link GAS/check test/settings — C:4090,4959 | Có link Sheets/gid/test/connect local — ConnectionPanel | Hai loại link khác mục đích: mới chỉ đọc, chưa thay kết nối endpoint ghi GAS/OAuth |
| F33 | Cache data/log/config và tombstones local — C:4878,5077 | Chưa cache dữ liệu bền | Lưu link nguồn không phải cache; tương lai source/version/time riêng, không chồng bản cũ lên dữ liệu mới |
| F34 | Bỏ cache/lấy lại Sheets, reset dashboard — C:5308,4440 | Có Làm mới/Kết nối đọc snapshot | Thiếu reset báo cáo/danh mục và cache khi có; không gọi refresh là undo Sheet |
| F35 | Hướng dẫn GAS trong modal — C:4162 | Có tab hướng dẫn/version và bộ docs | Tra cứu/hướng dẫn theo chức năng tiếp tục cập nhật; không nói bản cũ có bộ tài liệu tương đương |
| F36 | C không có roles app; D có password kiểm tra ở code riêng — D:2,54 | Chưa xác thực/phân quyền | Là yêu cầu mới cho giai đoạn ghi; chưa có bằng chứng roles bản cũ, không kế thừa mật khẩu hard-code |

### Điều chỉnh kết luận sau rà soát

- “Có ba bảng” không đủ để đánh dấu F02–F04 hoàn tất: thiếu tỷ lệ từng dòng, mô tả cấp TU, cấu hình cột/rule/title/source như cũ.
- Ba bảng cố định hiện chỉ có thể ẩn cột; source/ReportConfig hiện còn hẹp (4 phạm vi, 3 trường tiến độ) so với editor cũ. Không coi dữ liệu config trong code là người dùng tùy chỉnh được.
- Tìm không dấu và bốn cách nhóm đã có phần tương đương cũ; thiếu phân quyền/ghi không làm các chức năng xem này tự trở thành chưa có. Tuy nhiên số liệu nghiệp vụ vẫn cần nghiệm thu riêng.
- Popup nội dung/nháp/lịch sử mẫu và model lưu trữ không chứng minh luồng ghi/lưu trữ/lịch sử thật.
- .bak có biểu đồ lịch sử, active HTML không có; thư viện CSV tải nhưng không có workflow rõ. Không thêm thư viện chỉ để tăng số chức năng.
- Rà lại HTML đang có ngày 14/10: không tìm thấy lời gọi sync_all ở client; G có nhánh sync_all nhưng thiếu định nghĩa handleSyncAll. Hai bộ server khác giao thức. Giữ nhu cầu nhập/đồng bộ, viết lại hợp đồng hoàn chỉnh khi làm ghi.

Phương án gom và mở đầy đủ tùy chỉnh nằm ở ARCHITECTURE mục 17; thứ tự bổ sung ở kế hoạch mục 13. Đây là bằng chứng rà soát tại mốc 0.2.0 trong CURRENT_STATE, không tạo một ma trận trạng thái cạnh tranh.



## Đối chiếu lại luồng ghi dữ liệu cũ — 14/10/2026

Tổng chỉ huy đọc hai bộ server; Luna sync_copy_review rà HTML read-only. Nguồn: Dashboard Báo cáo tổng hợp/Báo cáo tiến độ HĐND.html và GoogleAppsScript_DongBo.js, Code_Dong_Bo.js. Không gọi endpoint cũ, không ghi nguồn hoặc đổi quyền.

- HTML4969–4994: syncToGoogleSheets POST JSON tới URL Apps Script lưu trong cấu hình browser; thiếu URL thì không gửi. HTML5241 gửi update_item;5283 add_item;5304 delete_item;5359 batch_update. Luồng cập nhật còn lưu data/log cục bộ trước phản hồi server.
- GoogleAppsScript_DongBo.js135 trở đi có doPost dispatch các action;179 trở đi handleUpdateItem tìm ID/STT và setValues A:P (không tìm thấy có thể chuyển thêm dòng). Đây là code ghi, không phải chỉ một nhãn UI. Hai bộ script nhận/trả cấu trúc khác; Code_Dong_Bo.js có kiểm mật khẩu server nhưng HTML đang khảo sát không gửi hợp đồng của script đó. Chưa biết deployment cũ đang dùng bộ nào hoặc có chạy thành công trên nguồn hiện hữu hay không.
- HTML4576–4584 nút Đồng bộ lại Google Sheets gọi handleResetToGoogleSheets5308–5316: xóa cache/custom/deleted IDs rồi loadData(true). Nút này đọc lại nguồn, không gửi toàn bộ nháp lên Sheet. HTML4292 Lưu và thoát chỉ đóng mode; ghi được gửi trong handler sửa từng mục.
- Không tìm thấy sync_all trong HTML hiện hữu; chỉ server có nhánh gọi handleSyncAll mà không có định nghĩa. Điều chỉnh nhận định trước về import gọi sync_all cho đúng file đang có.
- F15/F23/F31 mới vẫn chưa có ghi dữ liệu nghiệp vụ thật; đồng bộ catalogs/reports/items là cấu hình bố trí, không thay khả năng sửa nội dung và lưu ngược nguồn. Khi khôi phục, dùng nháp → chủ động Lưu/Đồng bộ → kiểm phản hồi/đọc lại; tránh Hủy chỉ đảo local khi server đã ghi ngầm.
### Rà cuối và bước kích hoạt — 15/10

Mã gốc được giữ trong patch từ baseline lúc sửa; cache của một lượt đọc bị bỏ không được đổi mục tiêu ghi khi hàng chuyển vị trí. Nháp legacy thiếu metadata chỉ bổ sung từ baseline đã lưu, giữ operationId; lệch mã bị chặn. History dùng mã gốc item đang xem; caller/đọc đang chạy được khóa trước rerender.188 tests/24files, typecheck, build HTML148.837byte/gzip43.563byte và ba gói server đạt. Không thêm dependency.

Google Test deployments yêu cầu deploy web app lần đầu trước khi mở /dev ở project thử. Chưa tạo deployment thử/production. Gói kích hoạt [EnableExcel.gs](../server/EnableExcel.gs), [manifest](../server/enable-excel.appsscript.json) và server/dist-enable đã chuẩn bị, chưa upload/thi hành ở app chính.7 test fake kiểm guard và không PUT workbook: overlay chỉ đọc metadata, tạo hai kho riêng và đăng ký nguồn gốc. Main cần thêm Drive + external_request bên cạnh Sheets; Google cấp Drive rộng hơn một tệp. USER_ACCESSING/MYSELF và quyền chia sẻ giữ nguyên. Chờ người dùng chọn chỉ triển khai thử, hoặc thử rồi cập nhật main nếu UI đạt; người dùng tự xác nhận Google. Chưa tự gửi phần sửa NQ01 thật.
