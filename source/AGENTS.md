# Hướng dẫn làm việc

## Bộ màu trạng thái cá nhân (22/10/2026)

- Tính năng UI `src/features/items/StatusPaletteManager.tsx`; model/lưu local `src/data/status-palettes.ts`; cấp state chung từ `src/app/App.tsx` qua CSS vars `--hdnd-status-*` để cả bảng chính/popup cùng cập nhật. Giữ nguyên `progressTone` định nghĩa các trạng thái hoàn thành tương đương; chỉ `statusPaletteTone` mở thêm nhóm `other` **khi người dùng bật**.
- Luôn giữ bốn nhóm có HEX hợp lệ và người dùng có thể chọn màu chữ + màu nền, đặt tên, lưu/chọn/cập nhật/xóa tối đa 20 mẫu; cấu hình theo nguồn lưu **localStorage** cá nhân, không ghi dữ liệu chung/Firebase/Excel. Đổi palette không được reset, remount hay refetch bảng. Khách không thấy công cụ sửa quyền/popup; chỉ thay hiển thị.
- Default là màu V5, chưa phải preset có tên; V1/V2 vẫn là checkpoint GitHub bất biến. Tự động kiểm TypeScript, unit, Chrome (CSS computed) và Pages trước khi chốt.

## V5 thử sắc màu chữ rõ hơn (22/10/2026)

- V5 chỉ đổi màu chữ `--workflow-text`: đỏ `#D00025`, cam `#B04700`, xanh hoàn thành `#007A18` (600); dùng cho Bảng dữ liệu + popup cả pill xem và editor. Nền, viền, dot, lịch sử, quyền, dashboard không đổi. Đảm bảo contrast >=4.5:1; nếu lần sau muốn làm **sáng hơn** thực sự mà vẫn đạt WCAG thì phải đánh giá đổi nền đồng bộ Bảng tổng hợp, không chỉ làm sáng chữ không kiểm tra.
- Backup V1/V2 đã chốt không được di chuyển. V5 là bản thử chưa lưu chốt. Tham khảo `docs/CURRENT_STATE.md` và `docs/VAN_HANH.md`.

## Biến thể V4 thử màu chữ sáng hơn — 22/10/2026

- V4 chỉ thay `--workflow-text` của `Sở chưa trình` thành `#C52445`, `VP đang thực hiện` thành `#A15700`, `Hoàn thành` và tương đương thành `#00794A`, giữ `font-weight:600`. Áp dụng đồng nhất Bảng dữ liệu/popup; nền/viền/chấm/icon/history và quyền không đổi. Chữ trên nền giữ tương phản ít nhất 4,5:1; không làm nhạt quá ngưỡng để “sáng” hơn.
- Đây là **V4 thử nghiệm**, **không ghi đè** nhánh backup V1 và V2; xem `docs/CURRENT_STATE.md` và `docs/VAN_HANH.md` để phân biệt bản chốt với bản thử.

## Danh mục hai mốc màu đã chốt (22/10/2026)

- **V1 — Nền màu chuẩn, chữ cũ:** commit `6c151458561b7800af51bab64837430e147fdcef`, nhánh `backup/ui-colored-status-pill-approved-2026-10-22`; chữ `#7F1D30/#704500/#2B7450`, status font-weight 750 và completed 650.
- **V2 — Màu chữ tươi, nét mảnh 600:** commit `d6e4b447e25ede00683cdea7689af40a781c1ea8`, nhánh `backup/ui-vivid-status-ink-weight600-2026-10-22`; chữ `#B2263D/#875000/#27774B`, font-weight 600. **Nền, viền, chấm và icon không đổi** so với V1. Đây là mốc độc lập lưu theo lệnh 22/10/2026.
- **Quy tắc phục hồi:** đọc `docs/VAN_HANH.md`, chọn **đúng V1 hay V2**. Khi chỉ restore màu: lấy ba `--workflow-text` + selector chữ ở V2, **không** `git restore` toàn bộ CSS, không reset/force-push main, không sửa hai nhánh backup. Chỉ thay code sau khi soát ảnh hưởng và chạy CI/Chrome Bảng dữ liệu + popup.

## Biến thể thử điều chỉnh chữ tiến độ — 22/10/2026

- Chỉ **chữ** của nhãn nghiệp vụ ở Bảng dữ liệu/popup đổi sang `#B2263D` (Sở chưa trình), `#875000` (VP đang thực hiện), `#27774B` (hoàn thành), weight `600`, thông qua `--workflow-text`. Độ tương phản tối thiểu 4,5:1; **nền, viền, chấm, dropdown, lịch sử không đổi**. Giữ màu trạng thái Bảng tổng hợp theo nguồn.
- Đây là biến thể sau mốc đã chốt; mốc bất biến `6c151458561b7800af51bab64837430e147fdcef` và nhánh `backup/ui-colored-status-pill-approved-2026-10-22` **không được cập nhật**. Nếu người dùng bảo quay lại bản đã chốt thì theo `docs/VAN_HANH.md` và mốc cố định, không nhầm biến thể thử với bản gốc.

## Mốc khôi phục giao diện được người dùng chốt — 22/10/2026

- **Mốc ổn định “dropdown trạng thái có nền màu như ảnh”**: commit phát hành `6c151458561b7800af51bab64837430e147fdcef`, nhánh backup **`backup/ui-colored-status-pill-approved-2026-10-22`**, [quy trình rollback](docs/VAN_HANH.md). Không tự di chuyển/sửa nhánh backup.
- Trước khi thay màu dropdown hoặc lịch sử, so sánh với snapshot này và đọc đoạn mới nhất của `docs/CURRENT_STATE.md`. Chỉ chốt restore khi cả Bảng dữ liệu và popup có nền hồng/vàng/xanh tương ứng, history icon mờ mặc định, chữ done `#2B7450` và kiểm Chrome đã PASS; không lặp lại PR #13.

## Cố định UI theo ảnh sau rollback PR #13 — 22/10/2026

- Ảnh chuẩn của người dùng là **dropdown có nền trạng thái nghiệp vụ** (Sở chưa trình hồng `#FFE0E4`, VP đang thực hiện vàng `#FFE8B8`, hoàn thành xanh `#D5F0DE`), áp dụng cho ô **được phép sửa**, kể cả hover/focus, trong Bảng dữ liệu và popup; không chuyển thành nền trắng.
- Giữ `CellHistoryAction` như phiên bản trước PR #13 (icon thấy mờ mặc định `opacity:.42`) và màu chữ `Hoàn thành` của PR #12 (`#2B7450`). Chỉ khóa hồi quy và bảo đảm CSS đúng, không tự làm mới thiết kế.
- Chrome smoke phải kiểm **computed background của nút CellPicker khi có quyền sửa**, không chỉ pill read-only; kiểm đủ 3 tone ở cả hai bảng và icon history. Không sửa dữ liệu nguồn/permission để thử.

## Quy tắc popup, tooltip và dropdown từ 20/10/2026

- Khách popup chỉ có bộ lọc theo cột, không thêm nút resize, xem đủ cột, tìm kiếm chung hoặc điều hướng Danh sách. Chế độ chỉnh sửa/nút history/permission đều ẩn hoàn toàn; test Chrome và unit phải chặn tái phát.
- Tooltip số trong báo cáo không được che ô số đang trỏ. Một `getBoundingClientRect` khi pointer enters ô mới là ngoại lệ được kiểm soát đối với benchmark cũ, **không thêm pointermove, body:has hay tooltip mỗi ô**. Tooltip ô sửa chỉ render ở ô thực sự được quyền, dùng singleton không dùng HTML title trì hoãn.
- Dropdown đã được cấp quyền sửa dùng cùng CellPicker và khung bo nhẹ/mũi tên; không áp dụng UI này cho ô chỉ xem, không ghi đè màu nghiệp vụ. Giữ kiểm thử Chrome tự động, không tạo bản HTML test cho người dùng.



## Quy trình phát triển và phát hành hiện hành — 20/10/2026

- **Chỉ làm mã nguồn trên GitHub và xem kết quả ở GitHub Pages chính:** https://cavoixanh638.github.io/HopHDND-WebApp/ . Không tạo, gửi hay phát hành các đường dẫn HTML kiểm thử/preview riêng cho người dùng. Những preview cũ chỉ là tài liệu lịch sử, không phải luồng phát hành.
- Phát triển bằng branch + PR, kiểm thử TypeScript/unit/Firebase emulator/Chrome với dữ liệu giả trước khi merge. Sau khi CI PASS, merge có kiểm tra và để `.github/workflows/publish-pages.yml` tự build từ source và cập nhật `main:index.html`. Bản build HTML trong CI là sản phẩm kỹ thuật bắt buộc cho Pages, **không phải file HTML thử gửi người dùng**.
- Giữ bản backup trước thay đổi lớn, theo dõi **cả workflow publish source lẫn Pages deploy** PASS, sau đó kiểm mã/marker trong root HTML. Không tự triển khai Firebase Rules hay ghi nguồn Excel/Firebase chỉ vì cập nhật giao diện.
- PR #3 đã merge vào main trong ngày 20/10/2026; các ghi chú lịch sử “không merge PR #3” bên dưới áp dụng **cho giai đoạn trước ngày này**, không còn là trạng thái hiện tại.



- Người dùng là chỉ huy; parent agent điều phối tổng thể, Luna xử lý phần việc đơn giản được giao. Không tự mở rộng phạm vi hoặc diễn giải kế hoạch thành quyền ghi dữ liệu sản xuất.
- Đọc theo nhiệm vụ: bắt đầu với `docs/CURRENT_STATE.md` nếu cần tình trạng; tra `docs/FEATURES.md` theo Fxx; đọc `docs/SYSTEM.md` khi đổi nghiệp vụ; đọc `docs/ARCHITECTURE.md`/`docs/API.md` khi đổi luồng dữ liệu hoặc API; dùng `docs/REPO_MAP.md` để tìm mã. Chỉ đọc sâu phần liên quan.
- Sửa nguồn chuẩn và tài liệu liên quan; không sửa artifact build thay cho nguồn. Giữ tương thích mã/format legacy khi yêu cầu; không tự ánh xạ giá trị mơ hồ.
- Thực hiện local fixes trong phạm vi được giao mà không hỏi lại permission. Tài liệu kế hoạch chỉ mô tả dự kiến, không cấp quyền đọc/ghi dữ liệu thật, triển khai hoặc phát hành. Dùng dữ liệu giả khi cần.
- Không đánh dấu chức năng hoàn tất nếu chưa có bằng chứng; CURRENT_STATE là nơi ghi kết quả đã kiểm chứng, FEATURES là đặc tả. Cập nhật đúng tài liệu và kiểm tra phù hợp với thay đổi.
- Tránh nhân bản tài liệu: `docs/README.md` là chỉ mục và nơi chốt nguồn chuẩn; `docs/VAN_HANH.md` quản lý phát hành/rollback/backup/sự cố; `docs/TU_DIEN_DU_LIEU.md` ánh xạ A–P/ID/kiểu; `docs/CAI_DAT_VA_CHAY.md` chỉ hướng dẫn môi trường build local. Chỉ tách tài liệu mới khi trách nhiệm thật sự khác và sửa đồng thời chỉ mục, liên kết. Không sửa cấu hình Firebase production hoặc nội dung Excel trong nhiệm vụ tài liệu.

## Quy tắc popup Bảng chi tiết và so sánh chức năng với Danh sách — 19/10/2026

- Khi sửa popup từ ô số, đọc [`docs/REPORT_DETAIL_PARITY_2026-10-19.md`](docs/REPORT_DETAIL_PARITY_2026-10-19.md), [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) và [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). **Không xóa tay nắm kéo cột, không trở lại `width:max-content/min-width:100%`, không giả định nhập px bằng việc gán `<col>` là đủ.** `table.width` phải bằng tổng cột và phải có Chrome CDP kéo chuột thật, đóng/mở còn width.
- Chỉ popup bật `ColumnResizeHandle.windowDragFallback`, không làm global window pointermove thường trực. Dùng lại ColumnHeader/ColumnFilterCell/CellPicker/ContentEditor của bảng Danh sách, không xây lại đường kiểm quyền. Giữ layout/mẫu/màu popup riêng theo source/preview; các cột giả Excel, 20 custom columns/permissions/Excel writer là hạng mục quản trị riêng, không lẫn dữ liệu nguồn.
- Code/Tài liệu commit chỉ đưa vào preview sau exact CI success + artifact hash kiểm, không đụng production root/Excel/Firebase hoặc merge PR #3.

## Quy tắc giữ hiệu năng bảng báo cáo — quyết định đã đo 19/10/2026

- Khi sửa `ReportTable`/hover F06 phải đọc [`docs/SYSTEM.md`](docs/SYSTEM.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/FEATURES.md`](docs/FEATURES.md) và [A/B Chrome](docs/TOOLTIP_PERFORMANCE_AB_2026-10-19.md). **Không tự đưa lại `body:has(...:hover)` kết hợp CSS Anchor Positioning** cho tooltip báo cáo, không tạo tooltip/handler riêng cho mỗi ô. Việc thay kiến trúc chỉ được quyết định sau khi có phép đo Chrome phù hợp và kiểm đủ click/focus/in/5 báo cáo.
- Chỉ ô có số dương đang hover được tô nền xanh ngọc .14 và `outline:2px solid #08777B` (focus 3px); không tô cả hàng, không border làm xê dịch bảng, blur/animation/shadow đắt hoặc thay màu ngữ nghĩa. Tooltip `Click để xem chi tiết` là **một host chung**, chỉ cập nhật vị trí khi đổi ô, không chạy trên mỗi `pointermove`, không đọc geometry ở pointer path.
- Với thay đổi UI, phân biệt **mã đã commit**, **CI đã PASS**, **preview đã deploy**, **production đã đổi** và **người dùng đã nghiệm thu**. Không gọi benchmark 300 sự kiện synthetic là thời gian hiển thị thực tế. Giữ artifact bất biến theo exact SHA, chỉ publish preview riêng khi được giao; không merge PR #3 hoặc ghi Excel/Firebase/root production khi chưa được yêu cầu. Bằng chứng hiện tại tại [`docs/KIEM_THU_VA_NGHIEM_THU.md`](docs/KIEM_THU_VA_NGHIEM_THU.md) và [`docs/VAN_HANH.md`](docs/VAN_HANH.md).

## Quy tắc đồng bộ danh sách/popup — 20/10/2026

- Màu từ khóa theo từng ô lấy chung từ `ItemLayout.cellHighlights`, không trộn với màu hàng của mẫu cá nhân; validate mã HEX và giới hạn số quy tắc, không sửa dữ liệu nguồn.
- Không khôi phục sort ở chế độ xem/khách; chỉ edit có `onSort`. Marker `editable-cell` phải gắn với đúng permission hiện hành, không có cho ô bị khóa hoặc guest popup.
- Căn bảng theo `data-col-key`, không dùng `:nth-child` do thứ tự cột tùy chỉnh; riêng `content`/`note` vẫn căn trái-trên.
- `CellHistoryAction` dùng icon nhỏ/tooltip và chỉ truy vấn audit sau thao tác bấm; hiển thị **lần lưu gần nhất của chính field**, không tự xác nhận có lịch sử chỉ vì có biểu tượng; không cấp hành động cho guest ẩn danh.
- Giữ riêng các mức: source commit/CI PASS/preview deployed/production deployed/khách nghiệm thu. Quy trình preview chỉ dùng artifact bất biến kiểm exact SHA và digest, không tự ghi dữ liệu thật.

## Quy tắc chống lặp giao diện — 20/10/2026, PR #5

- Danh sách nội dung chỉ có một tiêu đề cấp trang (`Danh sách làm việc`); card bảng giữ count và chuyển cột, không lặp tiêu đề và thẻ nguồn. Với admin/người sửa, những thông tin GID/reset/tài khoản đặt tại nhóm Tài khoản/Nguồn; cảnh báo nguồn mở qua details gọn.
- Tiêu đề **cột** nguồn căn giữa theo mã cột dù đổi thứ tự; cả hàng nhãn/hàng lọc và data phải có vạch dọc mảnh. Sort ở mode sửa không được làm lệch chữ tiêu đề.
- Không dùng màu viền trái của từng ô để báo sửa; quyền vẫn phải được kiểm backend, và class `editable-cell` chỉ kích hoạt tooltip ở ô được phép. Dropdown có viền/chevron khi có quyền.
- Tooltip báo cáo và ô sửa dùng chung tính toán vị trí ngoài ô, ưu tiên hơi chếch phía phải, lật nếu sát mép; không che nguồn; không thêm hover-state React cho mỗi ô hoặc pointermove. Phép đo unit + Chrome smoke phải bắt lỗi tái phát.

## Navigation chính thống nhất — 20/10/2026, PR #6

- App có đúng 2 card chính `Báo cáo tổng hợp` / `Danh sách các ND trình HĐND`. Nhãn đầy đủ (không dùng nhãn ngắn cũ) cho cả guest/admin, nhấn card đổi page `overview`/`items`; focus/active/disabled rõ.
- Ẩn brand/banner Sheets và heading trùng trên cả hai màn chính, chỉ giữ phiên bản và đường vào đăng nhập/cài đặt trên cùng. Nút làm mới dữ liệu ở account/source, GID và khôi phục nguồn trong details. Tuyệt đối không tắt polling 60 giây hoặc bỏ quyền truy cập tài khoản.
- Bỏ cảnh báo **toàn trang** không phân loại NQ/BC; giữ cảnh báo nghiệp vụ nằm **bên trong bảng** về trạng thái chưa chuẩn hóa. Giữ nguyên tỷ lệ báo cáo, tổng số, màu trạng thái, quyền sửa và dữ liệu nguồn.
- Trước merge/triển khai phải PASS TypeScript, unit, Firebase emulator, Chrome smoke cho đủ hai trang và có bằng chứng Deploy GitHub Pages. Khi thay test, không thay điều kiện theo cách bỏ kiểm tra cảnh báo có giá trị.

## Quy tắc UX ngày 20/10/2026 — PR #7

- Hai card mục chính tổng max 820px, căn giữa khung; màu chủ đạo riêng từng card và trạng thái active có chữ trắng, focus rõ; không khôi phục kiểu dài hết bề ngang.
- Không tự đặt thêm chú thích vào tên cột Excel: cột E là **Loại VB** theo file nguồn hiện tại. Giữ logic giá trị HC/QPPL/BC, migration cấu hình nhãn cũ hẹp và giữ nhãn người dùng sửa.
- Một `ColumnFilterCell` chung: placeholder select `Chọn để lọc` mờ như input, Esc khi đang focus và có giá trị phải xóa lọc của cột đó; ngăn Esc không cần thiết khi bộ lọc trống.
- Chỉ tô viền/màu nhẹ các thành phần nhập/chọn thực của ô được cấp quyền, tránh tô cả ô hoặc làm mất màu ngữ nghĩa; không làm giả quyền edit. Duy trì popup và danh sách đồng nhất.

## Chế độ gộp cột chỉ để trình bày — 21/10/2026 / PR #8

- Chỉ thực hiện projection trong `ItemList` qua `compact-columns.ts` và localStorage độc lập, 4 cờ mặc định false. Không được sửa `EXCEL_SOURCE_COLUMNS` hoặc Firebase `ItemLayout`, và không được cộng các giá trị gộp rồi ghi Excel.
- Mỗi nguồn trong ô gộp giữ quyền theo khóa gốc, giá trị đầy đủ, editor và lịch sử độc lập. Bộ lọc trên cột gộp dùng cả hai chuỗi gốc; tên chuyên viên rút gọn **chỉ hiển thị**, search/select/sửa tiếp tục dùng tên đầy đủ. Tắt tùy chọn hoặc bật Hiện đủ cột Excel phải khôi phục các cột chuẩn.
- Chế độ chỉnh schema của admin và popup vẫn dùng layout nguyên gốc và cấu hình riêng; không ép chế độ gộp vào popup. Khi thay đổi phải chạy TypeScript, unit, Firebase emulator, Chrome với kịch bản bật/tắt/gõ họ tên và quyền đọc.
- Không gộp mặc định các bước nghiệp vụ tiến độ vì có nguy cơ mất ngữ cảnh; không thêm listeners tooltip mới. Đường kẻ dọc dịu `#dfe9e2`, giữ cả hàng tiêu đề, lọc và nội dung.

## Quy tắc giao diện 22/10/2026 — PR #9

- Hiển thị gọn có **5** lựa chọn cá nhân, `shortLeaders` độc lập với `leadersTogether` và `shortSpecialist`. Mọi dropdown, search, save giữ tên nguồn; tên ngắn chỉ để hiển thị. Thao tác vẫn dựa trên quyền từng trường, tránh sinh quyền chung khi gộp.
- `progress-visual.ts` là phân loại màu UI duy nhất cho trạng thái này, không sửa báo cáo/KPI, và không suy các trạng thái `Đã trình HĐND` thành hoàn thành. Bảng chính và popup dùng cùng helper.
- Header chính/popup nhạt nhẹ (`#edf4ef`), filter row `#f9fcfa`, placeholder control 13px. Test Chrome phải xác nhận hoạt động trên dữ liệu mô phỏng và unit kiểm chặt các trạng thái loại trừ.

## Quy tắc 22/10/2026 — tránh mất UI khi poll và sai màu báo cáo (PR #10)

- Không để `useWorkspace.refresh` làm dependency khởi tạo/reset của `useWorkspace`; thay đổi hàm gọi poll KHÔNG đồng nghĩa đổi nguồn. Đọc nền 60s không `setBusy`, không reset/replace items nếu JSON nguồn giống bản đã xác nhận. Bản đọc chỉ commit khi hoàn chỉnh và nguồn vẫn đúng; nháp được ưu tiên. Timer/subscribe không chạy lại chỉ vì mảng rows đổi.
- Giữ cache `useSharedConfig` đang có nếu read mới giống hệt hoặc tạm lỗi. Không hiển thị placeholder cho trường hợp common đã có config hợp lệ; lần khởi động chưa có layout vẫn chờ để đảm bảo an toàn quyền.
- Palette Bảng tổng hợp là chuẩn: source đỏ hồng `#FFE0E4`, office vàng cam `#FFE8B8`, completed xanh `#D5F0DE`. Bảng chính/popup dùng nguồn/VP y như vậy, riêng completed **xanh đậm** `#126442` + trắng để không lẫn màu nền ô input. Chỉ các giá trị đúng theo `progress-visual.ts` được tô; terminal equivalents chỉ trong cột tương ứng; không tô các bước giữa và không sửa dữ liệu/KPI.
- Header `#f6f9f7`, filter `#fbfdfc`, font 15px. Regression test bắt buộc kiểm run 60 giây không thay nội dung, run có dữ liệu đổi và lần đầu thiếu layout; test Chrome đo màu/font.

## Điều chỉnh tương phản thứ bậc — 22/10/2026

- Giữ màu nền hoàn thành của Bảng tổng hợp (`#D5F0DE`), nhãn chữ tại Danh sách/popup dùng xanh dịu `#2B7450` (weight 650, vẫn >=4,5:1). Chấm trạng thái giữ xanh sẫm để dễ nhận; không đổi report stage palette.
- **Các ô có thể sửa nhưng không phải trạng thái cần chú ý** dùng bộ màu slate-blue nhạt `#F2F6F9`/`#426274`/`#B7CBD6` (nền/chữ/viền), không được tô cả `td` hay tự bật quyền; hover/focus chỉ đổi affordance của nút/input. Ô không sửa được là plain text. Không biến trạng thái trung gian thành cờ hoàn thành.
- Mọi chỉnh màu áp dụng đồng nhất Bảng dữ liệu và popup, kiểm CSS/Chrome, ưu tiên trạng thái nghiệp vụ so với trường sửa thường; không được làm hồi quy poll 60s, phân quyền hay highlight theo từ khóa.

## Đồng nhất xanh hoàn thành — 22/10/2026, PR #11

- Không dùng màu đặc `#126442` chữ trắng cho nhãn completion trong Danh sách/popup nữa. Dùng chính xác màu hoàn thành của Bảng tổng hợp `#D5F0DE` / `#125B35` / `#91CFA8` (nền/chữ/viền), chấm màu chữ; giữ các tone khác và mapping `progressTone`. Sửa test CSS & Chrome cùng một lúc, không đụng sync 60 giây hay dữ liệu Excel.
