# KẾ HOẠCH TỔNG THỂ SẮP XẾP LẠI UI/UX HỌP HĐND — 16/11/2026

> Trạng thái: **PLAN / STATIC SOURCE REVIEW, NOT IMPLEMENTED**. Tài liệu chỉ tạo trên nhánh riêng, không đổi mã ứng dụng, Firebase Rules, database, cấu hình người dùng hoặc website đang phát hành.

## 0. Mốc nguồn và bằng chứng

- HEAD main dùng để tách nhánh tài liệu: **e2895b66b3d50ecc12b8f9021352f91c601efea7** (commit xuất Pages).
- Mã nguồn được nêu trong **version.json** của HEAD main: **7d06a72f6e99b7571bfe67e911129c03d151625b**. Mọi kiểm kê component dưới đây lấy từ SHA nguồn này, không phải code tháng 10 hoặc demo.
- GitHub Pages workflow của HEAD e2895b6: **success** khi kiểm tra; đây là kết quả CI/deploy, không thay thế nghiệm thu thao tác thật hoặc production Firebase/Rules.
- PR gần nhất đã gộp: **#198** kéo cột/tự co; **#199** quy trình phát hành; **#200** mở tùy chọn và cuộn document; **#201** footer/khoảng trắng/scroll L03; **#202** bảng guest 59 hồ sơ cao tới footer và danh sách ngắn vẫn thu gọn. Không tái triển khai hoặc đảo ngược các kết quả này.
- **PR #197** (menu admin/Excel) vẫn **DRAFT OPEN**, base đầu là commit cũ; không cherry-pick/merge thẳng khi chưa soát với #198–202. Tái áp dụng các ý hợp lý bằng PR code mới tách từ HEAD hiện hành; giữ #197 làm nguồn tham khảo cho tới khi tích hợp xong.
- Đã đọc: **source/AGENTS.md**, **source/src/app/App.tsx**, **source/src/features/items/ItemList.tsx**, **source/src/features/items/ItemColumnPanel.tsx**, **source/src/features/items/InlinePermissionsTable.tsx**, **source/src/features/reports/ReportDetailGrid.tsx**, **source/src/features/settings/{ReportSettings,ReportLayoutPanel,ExcelTransferPanel,SimpleAdminDataPanel,FirebasePanel,FirebaseProfileTransfer,ApprovalReviewPanel,FreezeAdminPanel}.tsx**, dữ liệu cấu hình và CSS, các script/tests liên quan.
- Không có kiểm tra hình ảnh trên phiên làm việc thật của người dùng trong lượt audit này. Các vấn đề dưới đây được phân loại **CODE-CONFIRMED** (có căn cứ tĩnh) hoặc **VERIFY** (cần test thực tế trước khi kết luận có lỗi).

## 1. Nguyên tắc bất biến, cấm hồi quy

1. Giữ **một website GitHub Pages chính**, nguồn nghiệp vụ **Firebase Spark primary**, không bật lại Sheets, Supabase, Functions/V2 hay test-mode trong giao diện thực.
2. Không sửa hoặc xóa dữ liệu nghiệp vụ, import/xóa/restore thử trên Firebase production, không deploy Rules, không đổi schema 15 trường A–O hoặc ID/STT, không đổi công thức thống kê, không nới quyền.
3. Giữ phân quyền theo **quản trị Google xác minh**, **nhân viên Google đã được duyệt + quyền ô**, và **khách Firebase Anonymous được sửa đúng ô đã cấp**. Khách không được công cụ quản trị; frontend không thay thế Firebase Rules.
4. Không mất sửa nháp: giữ checkpoint, lịch sử, CAS/audit/lease, server ACK, xử lý xung đột, thông báo lỗi, trạng thái OFFLINE/DRAINING/FROZEN và chặn ghi khi epoch chưa xác minh.
5. Giữ **5 bảng báo cáo**, 4 thẻ tổng hợp Danh sách, bộ lọc không dấu/AND, L03 readonly/editable với 5 thông số rail, nhóm Phòng/CV và Lãnh đạo, bút chì Ghi chú, màu trạng thái, chọn ngay và lưu có xác nhận.
6. Giữ chuẩn **font 12px nội dung Danh sách** (PR #195), chữ trạng thái L03 đồng đều (PR #196), kéo cột adjacent-first và responsive auto-fit (PR #198), footer/scroll/page-fit (#200–202), popup chỉ hiện công cụ đúng quyền, in A4 ngang.
7. Phân biệt bốn loại thiết lập khi hiển thị và lưu: **dữ liệu nghiệp vụ**, **cấu hình dùng chung trên Firebase**, **lựa chọn cá nhân trên trình duyệt**, **nháp chưa lưu**. Không “gộp UI” bằng cách trộn các backend hoặc thay đổi phạm vi lưu.
8. Một PR một miền chức năng; mọi thay đổi bảo mật/dữ liệu cần quy trình riêng. Không để nhiều nhánh cùng sửa App.tsx, ItemList.tsx hoặc app.css không điều phối.

## 2. Kiểm kê hiện trạng và quyết định UX

| ID | Ưu tiên | Vấn đề / bằng chứng nguồn | Hướng xử lý và mức can thiệp |
| --- | --- | --- | --- |
| UX-01 | P0 | App.tsx: useEffect khi !adminTools tự đóng gear, đổi page sang items và reset editorUnsaved/selection/history; adminTools phụ thuộc kết nối, status ready, epoch. CODE-CONFIRMED | Phân biệt **role bị thu hồi thực** với **mất kết nối/tạm xác minh**. Khi mạng yếu: khóa nút ghi và cho biết lý do, bảo toàn trang/nháp. Khi thu hồi role: ẩn vùng riêng tư ngay nhưng bảo toàn checkpoint an toàn; không cho thao tác tiếp. Test transition thật, không nới quyền. |
| UX-02 | P0 | Gear khi không admin luôn hiện “Đăng nhập quản trị”; nhân viên Google đã login nhưng không phải admin vẫn ở nhánh này. CODE-CONFIRMED | Đổi entry theo vai trò: “Tài khoản / Đăng nhập Google” cho khách, “Tài khoản / Đăng xuất” cho nhân viên; “Quản trị” chỉ sau xác minh admin. Giữ popup OAuth có chủ ý, không tự đăng nhập Google ngoài thao tác. |
| UX-03 | P0 | Luồng lưu ô guest/employee và popup đã sửa nhiều lượt, có trạng thái nháp/ACK/CAS; UI vẫn cần soát toàn tuyến khi chuyển trang và reconnect. VERIFY | Thống nhất thông báo 4 trạng thái: đang chỉnh, đang gửi, máy chủ xác nhận, lỗi/nháp giữ trên máy. Không thêm nút lưu giả; không tự retry thao tác sau ACK không rõ. Khóa regression #183/#188/#190. |
| UX-04 | P0 | PR #197 chứa thay đổi menu/Excel trên base cũ, trong khi #198–202 đã gộp. CODE-CONFIRMED | Không merge #197 nguyên trạng. Rebase về mặt thiết kế, triển khai có kiểm thử trên HEAD mới, đối chiếu từng chức năng không bị mất. |
| UX-05 | P1 | Header gear 6 hành động ngang hàng; hai nhóm tabs chỉnh sửa và tài khoản riêng; có lối vào một phần lặp nhau. CODE-CONFIRMED | Một **Settings Hub** có nhóm chức năng rõ và breadcrumb/quay lại; giữ màn làm việc chính ở tối đa hai tab hiện có. Không tạo thêm tab thường trực. |
| UX-06 | P1 | ItemList vùng “Tùy chọn” trộn khôi phục bố cục, đổi tên, phạm vi tìm không dấu, dán Excel, thẻ C01-C03 và 5 thông số L03. CODE-CONFIRMED | Chia **Hiển thị**, **Tìm kiếm**, **Dữ liệu hàng loạt**, **Nâng cao**; mặc định đóng, mở chính xác nhóm đang cần. Không phát sinh scroll lồng nhau (#200). |
| UX-07 | P1 | “Đồng bộ bố cục demo” và “Áp dụng bố cục mẫu (như demo)” cùng mở xác nhận reference preset. CODE-CONFIRMED | Một hành động **Khôi phục bố cục chuẩn**, chỉ xuất hiện khi khác chuẩn hoặc trong Nâng cao. Giữ confirm và CAS; mô tả đúng các giá trị giữ lại. |
| UX-08 | P1 | “Đổi tên cột gộp” xuất hiện ở ItemList và ItemColumnPanel; popup có tên cột gộp riêng. CODE-CONFIRMED | Một entry ưu tiên ở cấu hình Danh sách; có shortcut ngữ cảnh tại tiêu đề nếu hữu ích; popup giữ **tên riêng trên máy**, không nhập nhằng với tên dùng chung. |
| UX-09 | P1 | Gộp Phòng/CV, viết tắt tên, Hiện đủ cột Excel, trạng thái palette nằm dàn hàng ở view. CODE-CONFIRMED | Chỉ giữ **Hiện đủ cột** khi cần; “Cách xem bảng” thu gọn chứa gộp/viết tắt/màu. Giữ kích thước nút & bảng khi mở menu, tránh bật tắt làm giật. |
| UX-10 | P1 | Phạm vi tìm kiếm hiện lưu ở browser; palette và preset popup cũng localStorage; bố cục dùng chung thì Firebase. CODE-CONFIRMED | Nhãn ngay cạnh nút: **Chỉ máy này**, **Dùng chung** hoặc **Chưa lưu**. Không đổi scope lưu mặc định. Hỏi xác nhận chỉ khi chuyển scope hoặc phá hủy. |
| UX-11 | P1 | ReportDetailGrid: toolbar rộng, chỉnh popup width ở 2 chỗ, mẫu popup + tạo/cập nhật/xóa luôn hiện và panel cột/màu. CODE-CONFIRMED | Trên popup thường chỉ giữ **lọc, số lượng, sửa (nếu có quyền), đóng**; mở “Thiết lập popup” mới thấy mẫu, width, cột, màu. Giữ cá nhân/popup độc lập, không tự ghi cấu hình toàn hệ thống. |
| UX-12 | P1 | ReportLayoutPanel: 5 phong cách, font, font-size, page-width và toàn bộ cấu hình từng bảng nối dài; thay **includeNotRequired** có ảnh hưởng kết quả thống kê. CODE-CONFIRMED | Hai cấp “Chung” và “Từng bảng”; tách riêng **Quy tắc đếm số liệu** có cảnh báo tác động, không đặt chung như hiệu ứng màu. Preview tức thì, save có xác nhận. |
| UX-13 | P1 | ReportSettings thông báo reset ghi “Ba bảng” trong khi defaultReportLayout có 5 bảng. CODE-CONFIRMED | Sửa text dựa trên số bảng thực, và làm rõ “khôi phục nháp” chưa ghi Firebase. Viết unit contract. |
| UX-14 | P1 | Quản lý quyền UID nhân viên ở FirebasePanel, quyền cột trong ItemColumnPanel, dòng/ô trong InlinePermissionsTable. CODE-CONFIRMED | Một hub **Tài khoản & phân quyền**; tách “Ai được phép đăng nhập sửa” và “Ô nào được sửa” bằng hai bước. Giữ các lớp backend cấp phép độc lập. |
| UX-15 | P1 | ExcelTransferPanel hiện cùng lúc warning “Chưa mở nhập” và SimpleAdminDataPanel cho phép import/replace khi Spark admin; phần mô tả V2/emulator gây hiểu lầm. CODE-CONFIRMED | Chỉ hiện nội dung đúng mode **Spark production**; legacy panel chỉ build/test mode. Không thay importEnabled, các guard, điều kiện xác nhận. Kế thừa ý nhỏ của PR #197 nhưng làm lại trên HEAD mới. |
| UX-16 | P1 | Trang Excel trộn “Xuất .xlsx”, “Backup .json dữ liệu”, “Restore/replace/clear” và “Nhập/Xuất JSON cấu hình danh mục/bố trí”. CODE-CONFIRMED | Chia “Xuất dữ liệu”, “Nhập/Thay thế”, “Sao lưu và khôi phục dữ liệu”, “Sao lưu cấu hình”; hiển thị phạm vi và số hồ sơ, phân tách hành động phá hủy ở vùng nguy hiểm. |
| UX-17 | P1 | SimpleAdminDataPanel có backup hash, preview và confirm nhưng 4 entry chức năng cùng toolbar. CODE-CONFIRMED | Luồng tuần tự: **backup → chọn file/đối chiếu → preview khác biệt → xác nhận đúng thao tác**. Xóa tách thành Danger zone. Giữ kiểm tra SHA, fail-closed khi dữ liệu thay đổi. |
| UX-18 | P2 | Vận hành chốt số liệu, freeze, kiểm tra Firebase nằm ở hai trang; chức năng kỹ thuật lẫn chức năng thường dùng. CODE-CONFIRMED | Hub **Vận hành**: Chốt & khóa sửa (nghiệp vụ) / Kiểm tra hệ thống (nâng cao), không hiển thị nút nguy hiểm giữa workflow làm báo cáo. |
| UX-19 | P2 | ItemList.tsx 1389 dòng, App.tsx 793 dòng, app.css 2842 dòng cộng các CSS List; nhiều style override/selector :has, dựa vào chế độ xem và media query. CODE-CONFIRMED | Refactor module/style theo miền sau khi UI/QA ổn. Giữ DOM/test hooks, token font/spacing và các rule #198–202; tuyệt đối không đại tu CSS một lần. |
| UX-20 | P2 | Các widget pulse/hover/tooltip/focus, compact rows ở nhiều viewport có nguy cơ thay đổi cao. VERIFY | Kiểm Chrome thật: keyboard/Tab/Escape, prefers-reduced-motion, focus ring, contrast tối thiểu 4.5:1, sticky header, scroll, zoom 75/100/125%, guest/admin/employee. Không sửa animation trước khi đo/kiểm. |
| UX-21 | P2 | ListViewTools chứa personal list views nhưng ItemList đang cố định personalViewActive=false; một số đường dùng cho legacy/test. CODE-CONFIRMED | Rà soát build imports + dữ liệu local trước; chỉ bỏ **entry sản xuất không dùng**, không xóa cấu hình user lưu hoặc test oracle khi chưa có migration/phê duyệt. |
| UX-22 | P2 | Wording, trang trống, thông báo nháp/rollback “Firebase/Excel/mẫu”, CTA thoát và trạng thái ghi có độ dài lớn. CODE-CONFIRMED | Soạn một từ điển nhãn/nội dung, trạng thái người dùng; tách bản cho admin/nhân viên/khách; thông báo vận hành chi tiết nằm trong details khi lỗi. |

## 3. Kiến trúc giao diện đích

### 3.1 Điều hướng mức chính

- **Quản trị:** hai tab công việc đang có **Bảng thống kê** và **Danh sách nội dung trình**. Nút bánh răng mở **Trung tâm quản trị**. Không mở thêm 5-8 tab cấp cao.
- **Nhân viên Google:** Danh sách được cấp quyền sửa; một entry **Tài khoản**, không hiện cấu hình chung/dữ liệu/quản trị. Không gắn nhãn “Khách” nhầm trên UI.
- **Khách Anonymous:** Danh sách, bộ lọc/tìm kiếm, xem và sửa đúng ô đã cấp; **Đăng nhập Google** trong menu tài khoản nếu muốn. Không hiện UID/diagnostics/admin; vẫn có chỉ báo kết quả lưu khi cần.
- **Báo cáo cho khách/nhân viên:** không mở rộng khỏi quyền hiện hành trong dự án UX này; chỉ thay nếu có yêu cầu/phê duyệt quyền và đối chiếu Rules riêng.

### 3.2 Trung tâm quản trị (4 nhóm; thành phần nâng cao bên trong)

1. **Giao diện & danh mục:** Danh sách (cột, tên, gộp, font, màu, thẻ), Báo cáo (chung/từng bảng), Danh mục lựa chọn (chuyên viên/phòng...). Dùng sidebar/section nhỏ, không trang nhiều tab ngang.
2. **Tài khoản & phân quyền:** phiên đăng nhập, danh sách UID nhân viên được duyệt, quyền cột → dòng → ô, trạng thái quyền đã lưu; cảnh báo khác nhau cho “có tài khoản” và “có quyền sửa ô”.
3. **Dữ liệu:** Xuất Excel, Dán nhiều ô (lối vào từ Danh sách là shortcut), Nhập/thay thế Excel A–O, backup/restore JSON **dữ liệu**, JSON **cấu hình**, xóa dữ liệu trong vùng nguy hiểm; chỉ hiện điều kiện phù hợp Spark hiện tại.
4. **Vận hành:** chốt/khóa/mở sửa, lịch sử và kiểm tra kết nối. **Nâng cao** chứa tra mã khu vực, thông số L03 px, restore preset, chẩn đoán và công cụ thử nghiệm (test build only).

Không dùng chung một chức năng sau khi gộp chỉ vì tên giống nhau: backup nghiệp vụ khác backup cấu hình; bộ màu status local khác quy tắc tô màu cell dùng chung; tên cột popup khác cột Danh sách.

### 3.3 Nguyên tắc thanh công cụ

- Mỗi view ưu tiên **một hàng** thao tác chính; dùng menu/accordion ít dùng, mở ra không đẩy/chắn bảng bất ngờ.
- Danh sách thường dùng: **Tìm không dấu | Sở | Phòng | Lọc khác | Xóa lọc | In/PDF** (admin nếu được hiện). Duy trì filter chip và X/Y.
- Tính năng admin nhập hàng loạt chỉ ở “Dữ liệu” hoặc shortcut rõ nghĩa. Reset bố cục, 5 rail L03, font/màu, quyền không lẫn vào bộ lọc nghiệp vụ.
- Popup thường dùng: tiêu đề, số hồ sơ, lọc/tác vụ với ô đang xem, thoát; bộ mẫu/độ rộng/đổi cột ở màn mở thêm.
- Phân biệt trạng thái cài đặt: **Đã lưu chung**, **Chỉ trên trình duyệt này**, **Đang xem trước**, **Chưa lưu**, **Đang đồng bộ**, **Lỗi và giữ nháp**. Không thông báo “Đã lưu” trước server ACK.
- Thao tác cấu hình toàn hệ thống và phá hủy: có preview và xác nhận, không yêu cầu nhiều popup cho hành động chỉ xem/đổi bộ lọc.

## 4. Thứ tự triển khai và quyền sở hữu mã (mỗi pha một PR nguồn)

### PH0 — Khóa mốc và kiểm thử bảo toàn (P0; tiền đề)

- Tách code PR từ main mới nhất; ghi Source SHA, Tested SHA, published SHA, Rules fingerprint nếu có **bằng chứng từ môi trường thích hợp**.
- Kiểm screenshot/DOM trước khi sửa: 3 role x Danh sách, các popup, 5 báo cáo, In A4, mở/đóng admin options; 59 hồ sơ và 0/2 kết quả.
- Ghi snapshot config, audit data bằng đọc an toàn. Không tải production backup vào PR/artifacts công khai.
- Golden tests bắt buộc: #183/#188/#190, #195/#196, #198/#200/#201/#202. Kết quả đã PASS đúng SHA không chạy lại vô ích nếu source không ảnh hưởng.

### PH1 — P0 phiên đăng nhập, mất mạng, và giữ bản nháp (PR-A)

- Chủ file: App.tsx + tests role transition/use-firebase/workspace, không sửa Rules.
- Lưu được trạng thái trang/selection/checkpoint qua mất kết nối tạm thời; gỡ trang private ngay nếu role bị thu hồi thực.
- Nhãn tài khoản đúng với người dùng, luôn phân biệt signed-in Google staff vs anonymous vs admin.
- Test 3 vai trò, offline/reconnect, revoke, dirty draft, popup/permissions, không bypass backend.

### PH2 — Khung Settings Hub và chuẩn nhãn (PR-B)

- Chủ file: App.tsx và component mới SettingsHub, CSS shell riêng. Hoàn thành sau PR-A, tránh cùng sửa App.
- Gộp menu theo 4 nhóm; giữ callback/guard hiện hành, không đổi business logic.
- Tái áp dụng phần hợp lý từ #197 theo đúng HEAD mới. Breadcrumb “Trở về danh sách/báo cáo”, không chuyển khi chưa lưu.
- Kiểm menu không che, focus hợp lệ, dùng được bàn phím; tab ngang không mọc thêm.

### PH3 — Danh sách & điều khiển nâng cao (PR-C)

- Chủ file: ItemList.tsx, ItemColumnPanel.tsx, CSS List, tests responsive.
- Tách “Tùy chọn” thành 3-4 disclosure có tên cụ thể; giữ tác vụ hằng ngày hiện ngay.
- Một CTA khôi phục mẫu có xác nhận; đổi tên cột gộp thống nhất điểm vào; gộp người phụ trách & viết tắt hợp lý.
- Phạm vi tìm kiếm cá nhân đánh dấu local; bảng màu ghi rõ scope; các rail L03 vào Nâng cao, tổng mode vẫn nhìn thấy khi mở.
- Không chạm việc table viewport-fill (#202), adjacent-first (#198), scroll (#200/#201) trừ khi có test chứng minh cần.

### PH4 — Popup và Báo cáo (PR-D1, PR-D2; độc lập khi không sửa CSS chung)

- D1: ReportDetailGrid.tsx + report-detail-preferences/presets. Rút toolbar popup, gom config/preset/màu; giữ popup độc lập/đúng quyền và bảo vệ dirty popup settings.
- D2: ReportLayoutPanel.tsx, ReportSettings.tsx, report-preferences. Cấu hình chung/từng bảng, đưa quy tắc đếm vào “Chỉ tiêu thống kê”, sửa chữ “Ba bảng” và preview/reset.
- D1/D2 không thay đổi trạng thái/nghiệp vụ, công thức và Firebase; nếu cần thay wording về cách tính phải kiểm thử số liệu sau cấu hình.

### PH5 — Tài khoản, phân quyền, dữ liệu (PR-E1, PR-E2; nhánh kỹ thuật độc lập)

- E1: FirebasePanel.tsx, InlinePermissionsTable.tsx, ItemColumnPanel integration (sau PR-C). Hai lớp quyền nhân viên và quyền cột/dòng/ô; test revoke/permission conflict/dirty confirmation.
- E2: ExcelTransferPanel.tsx, SimpleAdminDataPanel.tsx, FirebaseProfileTransfer.tsx. Phân rõ dữ liệu thực và cấu hình JSON; UI chỉ hiển thị sản phẩm Spark, legacy test được cô lập; chọn/sao lưu/preview/confirm.
- Toàn bộ E2 chạy **chỉ Emulator và fixture**. Không kiểm thực hành xóa/restore trên production. Không đổi backup/hash/candidate/fingerprint/Rules.

### PH6 — Đồng nhất tương tác, CSS, và accessibility (PR-F)

- Chủ CSS chung/app.css + shared components sau khi PR-A..E đã hoàn tất; tránh merge đồng thời các file CSS giao cắt.
- Gom token font 12/13 px, spacing, focus, hover, trạng thái lưu, thông báo; tách CSS riêng màn.
- Chỉ loại selector/legacy sau khi xuất danh sách import/render ở production và không còn test phụ thuộc.
- Animation tôn trọng prefers-reduced-motion; không tạo thao tác hover-only cho keyboard/touch.

### PH7 — Tích hợp, canary và phát hành (PR-G)

- Rebase theo main mới nhất, kiểm mọi hạng mục code HEAD. Không dùng lại kết quả PASS của SHA đã đổi làm kết quả của SHA mới.
- Lệnh nền: npm ci; npm run typecheck; npm test; npm run docs:check; npm run build:spark; **npm run test:spark** / Firebase Emulator, headless Chrome UI/print/keyboard (theo workflow hiện có).
- Chạy smoke ở 1600x900, 1920x1080, 2560x1440 và viewport 2133x1200 DPR/zoom tương đương 75%, 125%, cùng mobile; đúng 3 role; 0/2/59 hồ sơ.
- Kiểm 2 phiên trình duyệt khác danh tính trên Emulator: save ACK/collision/audit, quyền revoke, reconnect, freeze, bản nháp khi thoát popup, in A4, 5 báo cáo và dữ liệu trùng đúng.
- Chỉ merge/publish theo gate repository đang dùng; xác nhận version.json.source_sha là commit đã kiểm thử, release workflow SUCCESS và QA sau deploy. Không khai báo production GO chỉ dựa vào CI.

## 5. Ma trận nghiệm thu bắt buộc (không rút gọn)

| Persona/Chức năng | Kết quả phải có |
| --- | --- |
| Khách Anonymous — Danh sách | Không thấy admin/options; 59 hồ sơ tận dụng viewport; lọc 0/2 hồ sơ co tự nhiên; được sửa đúng ô mở quyền, có ACK/error, không tự retry mù. |
| Nhân viên Google | Hiển thị tài khoản/đăng xuất đúng; sửa đúng ô được cấp và không thấy admin menu; chưa được duyệt UID hoặc thu hồi thì không ghi được. |
| Quản trị | Báo cáo + Danh sách + 4 nhóm settings; đổi bố cục dùng chung bằng đúng CAS; mở options không mất chân bảng hoặc chặn thanh cuộn; 5 rail L03 và font 12px không đổi ngoài ý muốn. |
| Reports/Popup | Năm bảng và tổng số không đổi nếu chỉ thay style; quy tắc đếm “Không phải trình” được nêu riêng; popup local không ghi lên cấu hình Danh sách; guest vẫn có quyền ô phù hợp. |
| Excel/backup | Xuất đúng A–O; nhập xem trước và so diff; backup JSON hợp lệ và bắt tải mới nếu source thay; xóa/restore chỉ khi admin chủ ý xác nhận, Emulator; không nhầm JSON cấu hình với JSON dữ liệu. |
| Mất mạng/đổi tab/đổi quyền | Không tạo “đã lưu” giả, không mất nháp; không hiển thị quyền sai khi revoke; không cho ghi khi backend chưa xác nhận. |
| Trình bày | Không có khoảng trắng guest dài, không 59 thanh cuộn L03, không trang admin bị cắt khi mở controls; print A4 ngang chỉ phần theo thiết kế, width ID không vỡ. |
| Accessibility | Tab/Enter/Escape, focus-visible, contrast, nhãn input đầy đủ, hỗ trợ reduced-motion, popup focus return và phím Esc không vô tình bỏ sửa. |

## 6. Điều kiện DONE cho từng PR và phát hành

- **CODE:** diff nhỏ, scope phân định, không vướng PR cũ, không sửa dữ liệu/Rules, có migration nếu thay đổi persistence key (mặc định không thay).
- **TEST:** ghi Code SHA = Tested SHA của đúng head; log PASS/FAIL/NOT_RUN riêng. Không ghi PASS thay cho manual browser/production.
- **VISUAL:** ảnh/bằng chứng DOM trước-sau đủ vai trò & viewport; số lượng hàng/chiều cao/scroll/focus không hồi quy.
- **DATA SAFETY:** mọi thao tác xóa/thay thế được test bằng Emulator; bản sao nguồn thật không đưa vào repo. Kiểm backup/restore nếu đụng đường bảo trì.
- **RELEASE:** production Pages chỉ phát hành khi qua gate; rollback bằng source SHA đã phát hành, không reset database; ghi release manifest và bất kỳ hạng mục còn NOT_RUN.
- **NO-GO:** test thất bại; draft có nguy cơ mất; role bị nới sai; table/zoom/A4 hồi quy; bản phát hành không khớp SHA; chưa xác minh Rules khi có sửa backend.

## 7. Phân kỳ ưu tiên / quyết định kiến trúc

- **Bắt buộc trước:** PH0 → PH1 → PH2 (P0 bảo vệ trạng thái & luồng).
- **Ưu tiên trải nghiệm chính:** PH3, PH4 (giao diện làm việc và popup/báo cáo).
- **Ưu tiên an toàn quản trị:** PH5 (dữ liệu, UID, phân quyền).
- **Sau cùng:** PH6 → PH7; nếu các PR độc lập hoàn chỉnh có thể tích hợp sớm, nhưng không bỏ gate.
- Không “cắt bỏ” chức năng chỉ vì nằm trong mã legacy: phải chứng minh nó không ở build sản xuất, không có dữ liệu cá nhân tồn tại và có phương án migration. Cắt entry UI dư thừa ≠ xóa cơ chế lưu.
- Mọi thay đổi tính toán, quyền/Rules, import schema, dữ liệu hoặc sản phẩm multi-role ngoài phạm vi thiết kế phải thành yêu cầu/PR riêng.

**Kết luận audit:** Không cần viết lại toàn bộ WebApp. Trọng tâm là **bảo toàn bản phát hành ổn định mới nhất + thiết kế lại cấu trúc cài đặt theo đối tượng/ngữ cảnh + tách rõ scope lưu + loại lối vào trùng, giữ nguyên hệ thống dữ liệu/ghi an toàn**.
