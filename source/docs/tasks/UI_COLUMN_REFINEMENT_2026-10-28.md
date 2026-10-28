# BÀN GIAO VÀ THEO DÕI — TINH CHỈNH CỘT HopHDND
Ngày lập: **28/10/2026, giờ Việt Nam**. Mã nhiệm vụ: **UI-COLUMNS-20261028**.

> **Trạng thái: NEEDS_FIX — Codex tái-review source `c145b8f371cc6f2cb7569f7d55a389e951a1c841`: R01 và R03 VERIFIED; R02 đã sửa case ID cuối nhưng còn lỗi trần cột gộp 1600 px (Lượt 008). R04 chờ chủ dự án; T9 vẫn WAITING.**
> File này là nơi trao đổi chung giữa chủ dự án, ChatGPT thực hiện và Codex kiểm tra. Mọi kết quả phải gắn commit/PR/bằng chứng; nội dung kế hoạch không phải kết quả đã làm.

## 1. Điểm xuất phát và phạm vi được giao

- Repo: [cavoixanh638/HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp).
- Nhánh được đọc khi lập kế hoạch: `main`, commit **`8172c0650580931140fc71e59d3cc4d816879594`**.
- Tree của commit trên khớp checkpoint trước UI V2: `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`.
- Giữ giao diện bản restore làm nền. Chỉ triển khai bốn yêu cầu tại mục 2; không khôi phục toàn bộ UI V2, ba thẻ KPI, bảng executive 6 cột/4 cụm hay redesign Gemini.
- Chỉ thị mới của chủ dự án trong nhiệm vụ này thay thế các quy tắc hiển thị cũ mâu thuẫn trực tiếp với bốn thay đổi được yêu cầu. Các quy tắc dữ liệu, quyền, lưu và vận hành còn hiệu lực.
- Phiên lập kế hoạch chỉ đọc mã, tạo tài liệu và lưu hai ảnh tham chiếu. Không sửa TypeScript/CSS, không ghi Firebase hoặc Sheets.

### Cách dùng file chung

1. ChatGPT đọc file này từ GitHub mới nhất trước mỗi lượt làm; đọc `source/AGENTS.md` và tài liệu liên quan.
2. ChatGPT cập nhật bảng tiến độ và nhật ký ở cuối file sau từng phần việc; ghi cả phần chưa xong, lỗi và giới hạn.
3. Codex đọc cùng file, đối chiếu diff/CI/ảnh; ghi nhận xét bằng mã R01, R02… trong bảng rà soát.
4. ChatGPT trả lời từng nhận xét bằng commit và bằng chứng, không xóa lịch sử nhận xét.
5. Chủ dự án có thể đổi yêu cầu trực tiếp tại cuộc trò chuyện. Người nhận phải cập nhật mục Quyết định; không tự coi đề xuất của một trợ lý là chỉ thị đã được chủ dự án duyệt.
6. Đây là trao đổi qua một tài liệu chung, không phải cơ chế tự gửi tin giữa hai cuộc trò chuyện. Khi đổi bên làm việc, đưa liên kết file cho bên nhận.

## 2. Đặc tả bốn thay đổi

### U01 — Loại VB + Sở + Nội dung: một cột mặc định

**Ảnh chuẩn do chủ dự án cung cấp:**

![Ảnh 1 — Cách trình bày loại văn bản, sở chủ trì và nội dung](assets/UI-COLUMNS-20261028-content.png)

Nguồn trường: `type` + `department` + `content`. Khóa neo đề xuất: `content`; nhãn hiển thị đề xuất: **Nội dung trình**.

Bố cục:

```text
[QPPL]  Sở Giáo dục và Đào tạo
Nghị quyết quy định mức thu học phí đối với cơ sở giáo dục…
```

- Dòng đầu: badge loại VB, tiếp theo tên Sở/ngành chủ trì; dòng dưới: nội dung, xuống dòng tự nhiên, dễ đọc.
- Loại VB hiển thị đúng giá trị nguồn (HC/QPPL/BC hoặc giá trị khác), không thay dữ liệu bằng nhãn minh họa.
- Khi thiếu một thành phần, giữ các thành phần còn lại; không xuất chữ undefined/null hay dấu phân cách thừa. Nội dung dài không bị cắt mất.
- Đây là cấu trúc xem mặc định bắt buộc cho cả người xem và quản trị, không phụ thuộc cờ gộp cũ hoặc localStorage.
- Bỏ các lựa chọn người dùng có thể bật/tắt việc gộp ba trường: `typeInContent`, `contentDetails`. Không để mẫu cá nhân/cấu hình cũ khôi phục ba cột tách riêng trong chế độ xem thông thường.
- Dữ liệu, schema và quyền vẫn gồm ba trường độc lập. Chỉ thành phần được cấp quyền mới được mở editor và lấy lease của chính trường đó.
- Bộ lọc/tìm kiếm phải tìm được từng giá trị đầy đủ của cả ba trường; giữ khả năng lọc theo Loại VB và Sở, không chỉ tìm chuỗi nội dung. Các bộ lọc đã lưu theo khóa cũ phải được ánh xạ vào cụm mới, không bị xóa âm thầm.

### U02 — Cấp trình + ba tiến độ: một cột mặc định

![Ảnh 2 — Ba dòng tiến độ trong cùng một cột](assets/UI-COLUMNS-20261028-progress.png)

Nguồn trường: `partyLevel` + `progressParty` + `progressBuild` + `progressCouncil`.
Khóa neo đề xuất: `partyLevel` để tận dụng vị trí của cụm Thành ủy hiện có. Nhãn cột đề xuất: **Tiến độ 3 khâu**.

Bố cục chính xác theo lời yêu cầu:

```text
1  Thành ủy (TTTU)     [giá trị progressParty]
2  Xây dựng NQ        [giá trị progressBuild]
3  Ban hành NQ        [giá trị progressCouncil]
```

- `TTTU` chỉ là ví dụ: nội dung trong ngoặc lấy từ `partyLevel`; không hardcode. Thiếu cấp thì chỉ hiện “Thành ủy”, không để ngoặc rỗng.
- **Dùng “Ban hành NQ” cho dòng 3.** Ảnh mẫu ghi “Trình HĐND”, nhưng lời yêu cầu mới của chủ dự án có ưu tiên cao hơn ảnh.
- Giữ ba dòng rõ ràng: nhãn bên trái, trạng thái tương ứng bên phải; số 1/2/3 thể hiện thứ tự nghiệp vụ như ảnh.
- Trạng thái dài được xuống dòng trong vùng của chính nó, không đè nhãn, không tràn sang hàng khác. Trên màn hẹp có thể xếp nhãn/trạng thái thành hai dòng.
- Giữ helper phân loại màu hiện có và bộ màu trạng thái đang dùng. Không tô toàn bộ ô/hàng theo một trạng thái duy nhất; ba khâu có thể mang ba màu khác nhau. Trạng thái lạ/không áp dụng không được tự coi là hoàn thành.
- Chữ nguồn giữ nguyên. Ví dụ ảnh “Đã họp/xin phiếu, chờ TBKL” không phải lệnh đổi nhãn trạng thái thật trong database.
- Gộp bắt buộc trong chế độ xem thông thường; bỏ `partyTogether`, `councilTogether` và mọi tùy chọn khác cho phép tách lại bốn trường này.
- Cấp trình có editor riêng trong phần ngoặc khi được cấp quyền; ba tiến độ có editor/lease theo đúng ba khóa nguồn. Không có “quyền sửa cả nhóm”.
- Giữ lọc độc lập theo cấp và từng tiến độ, kết hợp các bộ lọc bằng AND; tìm kiếm dùng giá trị đầy đủ. Không làm mất bộ lọc cũ khi trường trở thành thành viên ẩn của projection.
- Không thay cách tính tổng, mẫu số, tỷ lệ hay số liệu của 5 báo cáo.

### U03 — Cột ID còn 1/3 độ rộng hiện tại

- Đây là cột `displayCode`/ID, không phải `stt`/STT. Giữ nguyên mã nguồn NQ01/BC01…, không đổi số định danh và không đánh số lại.
- Trước khi sửa, đo chiều rộng **thực tế** của ID trên trình duyệt với cùng viewport, zoom, font, bố cục và dữ liệu. Lưu W0; mục tiêu là **W1 ≈ W0 / 3**, sai số đo khoảng 2 px.
- Mã hiện tại khai báo default ID 68 px; validator và nhiều helper resize áp min 60 px. 68/3 ≈ 23 px. CSS table `width:max(100%,…)` có thể phân phối thêm chỗ, nên con số 68 không chứng minh độ rộng thực đang thấy.
- Không chỉ đổi default rồi tuyên bố đạt: profile Firebase và preset cũ có thể ghi đè; padding, min-width, sort/filter control và table algorithm có thể nới cột lại.
- Ưu tiên giải pháp projection hiển thị riêng cho ID, không hạ min-width toàn bộ schema. Đổi rộng lưu trữ nếu thật sự cần phải kiểm hết validator, input, drag bounds, preview và restore. Phải ghi rõ cách ánh xạ width lưu với width hiển thị, tránh chia 3 lần nữa sau mỗi reload/save.
- Ghi kết quả đo trước/sau trong bằng chứng. Nếu tỷ lệ 1/3 làm mã ID thông dụng không đọc được, tạo bằng chứng cụ thể và ghi đề xuất độ rộng tối thiểu dễ đọc để chủ dự án quyết định; không âm thầm thay tỷ lệ rồi đánh dấu U03 hoàn tất.
- Không tự giảm font toàn bảng để ép vừa. Không để ký tự mã bị mất mà không có cách đọc đầy đủ.
- Kéo cột vẫn giữ nguyên tắc bù vào cột cuối hiện hành; nếu ID được resize thì ánh xạ và giới hạn phải tương thích, không làm các cột khác tự chia đều.

### U04 — Tùy chọn CV (Phòng) trong cột Lãnh đạo/Phòng/CV

- Giữ các tùy chọn gộp người phụ trách hiện có. Thêm một checkbox trình bày: **Chuyên viên và phòng cùng dòng**.
- Khi cột `teamTogether` đang gộp UBND + VP + Phòng + CV, bật checkbox sẽ hiện:

```text
UBND  [Lãnh đạo UBND]
VP    [Lãnh đạo Văn phòng]
CV    Trần Đức Anh (Phòng TC)
```

- Phòng nằm ngay sau tên CV trong ngoặc; không lặp lại thành một dòng Phòng riêng.
- Tắt checkbox trả về bố cục các dòng riêng hiện có. Đây là tùy chọn bổ sung, không ép thay mặc định của mọi người. Đề xuất mặc định false để giữ thói quen cũ.
- Chỉ hiện/cho bật khi nhóm tương ứng đang có cả `specialist` và `room`. Khi tắt nhóm, giữ lựa chọn đã lưu nhưng không tạo cột trùng.
- Không tự thêm tiền tố “Phòng” nếu giá trị nguồn đã có; không tự viết tắt tên phòng. Phòng trống thì không hiện ngoặc rỗng; thiếu CV nhưng có phòng vẫn phải đọc được phòng.
- Tùy chọn viết tắt CV hiện có vẫn áp dụng độc lập: bật viết tắt chỉ rút tên ở UI; dropdown, tìm kiếm, dữ liệu lưu vẫn dùng tên đầy đủ.
- Trong dòng chung, CV và Phòng vẫn có quyền/editor/lease riêng; sửa một trường không ghi lại trường kia.
- Lưu lựa chọn theo cơ chế bố cục hiện hành: quản trị lưu chung qua đường CAS có sẵn khi đang chỉnh bố cục chung; cá nhân lưu đúng scope local. Schema cũ thiếu flag mới phải đọc được, mặc định false; không tự ghi nâng cấp profile lúc mở trang.

## 3. Quy tắc phạm vi hiển thị

- Màn Danh sách chính là nơi nghiệm thu chính cho U01–U04.
- Popup chi tiết mở từ số liệu báo cáo: dùng lại renderer cụm khi trình bày các trường tương ứng để cùng hồ sơ không có hai cách diễn đạt trái nhau. Giữ cấu hình/độ rộng riêng của popup và quyền khách hiện hành; không đưa menu quản trị/Danh sách vào popup khách.
- Chế độ biên tập schema/quyền vẫn nhìn và cấu hình được 15 trường gốc. “Gộp” chỉ là projection UI, không xóa cột nguồn.
- Cần chốt rõ xử lý nút **Hiện đủ cột Excel** trong bước T0: đề xuất giữ như chế độ đối chiếu nguồn rõ ràng cho quản trị, còn chế độ xem thường luôn gộp. Không dùng nút này hoặc preset cũ làm một toggle gộp/tách trá hình cho người xem. Nếu cách này thay đổi khả năng đối chiếu của người dùng hiện có, ghi quyết định trước khi code.
- Không tự bật lại thành phần đã rollback: `ExecutiveProgressCards`, `ExecutiveDetailTable`, `executive-layout.css`; có thể tham khảo lịch sử nhưng chỉ viết phần cần cho bốn yêu cầu.
- Không tự xóa Mẫu hiển thị cá nhân, bộ màu, lịch sử, công cụ chỉnh cột, STT hay các cột khác ngoài phạm vi.

## 4. Kết quả khảo sát mã và vị trí thực hiện

| File (tính từ gốc repo) | Vai trò / việc cần kiểm tra |
| --- | --- |
| `source/src/features/items/ItemList.tsx` | Projection cột, render từng trường, menu gộp, filter index, quyền, kéo cột và mẫu cá nhân |
| `source/src/features/items/compact-columns.ts` | Nhóm cột, khóa neo, trường ẩn, viết tắt và tìm kiếm; nhóm 4 trường tiến độ mới |
| `source/src/data/item-preferences.ts` | 15 cột A–O, default 68 px ID, min 60 px, schema flag mới và đọc cấu hình cũ |
| `source/src/features/items/ItemColumnPanel.tsx` | Input/độ rộng, tùy chọn schema/nhóm; tránh để tùy chọn đã bỏ còn xuất hiện |
| `source/src/data/item-layout-merge.ts` | Merge bố cục nhiều phiên; thêm flag phải giữ được khi CAS/resolve xung đột |
| `source/src/data/list-views.ts`, `ListViewTools.tsx` | Preset cũ không được làm U01/U02 mất hiệu lực |
| `source/src/data/resize-last-column.ts`, `ColumnResizeHandle.tsx` | Chuyển đổi độ rộng, giới hạn và bù cột cuối |
| `source/src/features/items/ColumnFilterCell.tsx`, `RoomSpecialistFilterCell.tsx` | Giữ filter từng trường trong cột gộp, Esc và vị trí cuộn |
| `source/src/features/reports/ReportDetailGrid.tsx` | Popup có renderer và config riêng, không mặc nhiên kế thừa ItemList |
| `source/src/features/items/item-frame.css`, `source/src/styles/app.css` | Typography, badge, layout ba dòng, min-width và các override |
| `source/src/app/App.tsx` | Truyền lựa chọn bố cục/renderer, không đổi cách chọn nguồn hay tính báo cáo |
| `source/tests/compact-columns.test.ts`, `pages-sheets.test.tsx`, `inline-permissions.test.tsx` | Hồi quy nhóm, quyền và UI |
| `source/tests/item-preferences.test.ts`, `item-layout-merge.test.ts`, `trailing-column-width.test.ts` | Cấu hình cũ/mới, merge, min-width và resize |
| `source/scripts/smoke-pages-browser.mjs` | Kịch bản browser, ảnh và đo hình học, dữ liệu mô phỏng |
| `source/docs/CURRENT_STATE.md`, `WORKBOARD.md`, `FEATURES.md` | Cập nhật kết quả đã xác minh và đặc tả liên quan khi triển khai |

Tên file hỗ trợ có thể thay đổi theo nhánh. Kiểm tra cây mã thực tế trước khi sửa; không tạo file trùng chức năng chỉ để khớp bảng này.

### Hướng triển khai đề xuất

- Xây một mô hình projection có khóa nhóm ổn định và danh sách thành viên; U01/U02 được áp dụng từ mô hình đó, không chỉ thêm default true.
- Tách renderer cụm Hồ sơ, renderer Chuỗi tiến độ, renderer Người phụ trách khỏi ItemList nếu giúp tái sử dụng ở popup; tên component do bên thực hiện chọn.
- Tái dùng editor theo từng field hiện có; không nối chuỗi các trường rồi lưu một giá trị tổng hợp.
- Giữ cấu hình từng trường nguồn nguyên vẹn. Khi nhóm bị kéo, di chuyển nhóm như một đơn vị nhưng không phá thứ tự/metadata thành viên trong schema.
- Độ rộng nhóm là một độ rộng hiển thị, không cộng máy móc bốn cột cũ thành cột tiến độ rất lớn.
- Không hardcode số cột toàn bảng là 6 hay 8: STT, cột người phụ trách, custom column và visibility vẫn tùy cấu hình.
- Nếu một thành viên bị ẩn/removed theo bố cục hợp lệ, không làm lộ lại dữ liệu chỉ vì thuộc nhóm. Khóa neo ẩn nhưng thành viên còn hiện phải được xử lý xác định; nhóm xuất hiện một lần hoặc bị ẩn đúng quyết định bố cục. Không lấy quyền sửa làm quyền đọc.
- Dọn xung đột cờ legacy ở lớp đọc/projection; không xóa hàng loạt localStorage hoặc ghi lại Firebase profile tự động.
- Không tạo listener realtime, tooltip handler hoặc Firebase write riêng cho từng dòng hiển thị mới.

## 5. Trình tự công việc

| Mã | Công việc và đầu ra | Phụ thuộc | Trạng thái |
| --- | --- | --- | --- |
| T0 | Đọc main/AGENTS; ghi SHA bắt đầu; ảnh trước và W0 ID; chốt nút xem đủ cột, popup, width và scope lưu U04 | — | READY_FOR_REVIEW — W0 Chrome thực 68px trên 8172c065; quyết định D04–D07 và ảnh trước đã ghi |
| T1 | Thiết kế projection U01/U02, compatibility cờ/preset và flag U04; ghi quyết định ngắn vào file này | T0 | NEEDS_FIX — Lượt 008: projection width và trần 1600 px trong renderer/helper chưa đồng nhất |
| T2 | Làm cột Hồ sơ theo ảnh 1, giữ filter/editor/quyền từng field; bỏ hai toggle cũ | T1 | READY_FOR_REVIEW — R03 được Codex xác nhận VERIFIED; các bằng chứng cũ giữ nguyên |
| T3 | Làm cụm Cấp + 3 tiến độ theo ảnh 2, nhãn Ban hành NQ; bỏ toggle liên quan | T1 | READY_FOR_REVIEW — U02 ba dòng tiến độ + màu/permission, browser qua |
| T4 | Làm ID 1/3, kiểm cả default/profile/preset, table layout, padding và resize | T0,T1 | NEEDS_FIX — case ID cuối đã PASS; R02 còn lỗi khi cột gộp chạm trần 1600 px |
| T5 | Làm checkbox CV (Phòng), flag compatibility, lưu đúng scope và renderer | T1 | READY_FOR_REVIEW — U04 false mặc định, local UID reload/reset, CI qua |
| T6 | Nối popup, preset và menu; xử lý ẩn/hiện/removed/custom columns, filter cũ | T2–T5 | READY_FOR_REVIEW — Codex tái kiểm R01 và màu từng field list/popup của R03 đạt |
| T7 | Typecheck, unit, Firebase Emulator, browser với dữ liệu giả; chụp và sửa lỗi thực thấy | T6 | NEEDS_FIX — 40 test liên quan PASS; test biên trần cột gộp do reviewer bổ sung FAIL |
| T8 | Cập nhật docs, file trao đổi, PR có ảnh trước/sau và kết quả đúng SHA; Codex rà soát | T7 | NEEDS_FIX — đã tái-review, cần xử lý nốt R02 theo Lượt 008 |
| T9 | Chủ dự án xem kết quả; triển khai theo phạm vi đã được giao, kiểm publish + Pages riêng | T8 | WAITING |

Đề xuất một feature branch và một PR cho nhiệm vụ; chia commit theo T1–T6 để dễ rà và sửa. Tên nhánh gợi ý `feat/column-refinement-20261028`, kiểm tra chưa tồn tại trước khi tạo. Không reset/force-push main.

## 6. Ma trận kiểm thử và tiêu chí nghiệm thu

### Kiểm tra chức năng

| Mã | Điều kiện đạt |
| --- | --- |
| A01 | Reload khách mới và admin: Hồ sơ luôn là một cột; badge + Sở ở dòng trên, nội dung dòng dưới |
| A02 | Không còn toggle typeInContent/contentDetails/partyTogether/councilTogether hay toggle mới tương đương trong UI thường |
| A03 | Cột tiến độ đủ ba dòng; cấp nằm trong ngoặc cạnh Thành ủy; dòng 3 đúng “Ban hành NQ” |
| A04 | Ba trạng thái khác nhau có màu riêng; rỗng/lạ/Không phải trình không thành hoàn thành giả |
| A05 | Lọc được type, department, content, partyLevel và từng tiến độ; bộ lọc cũ còn tác dụng đúng và có thể xóa; tên đầy đủ vẫn tìm được |
| A06 | ID W1/W0 gần 1/3 cùng điều kiện đo; không bị giãn lại do max(100%) hoặc min 60; báo riêng xung đột khả năng đọc nếu có |
| A07 | Bật U04: đúng CV (Phòng), không lặp Phòng; tắt về dạng cũ; thiếu trường không sinh ngoặc rỗng |
| A08 | U04 không mất sau reload ở đúng scope; người dùng/nguồn khác không nhận nhầm lựa chọn cá nhân |
| A09 | Cấu hình Firebase/localStorage/preset cũ đều đọc được; U01/U02 không bị tắt; không auto-write profile hay xóa lựa chọn khác |
| A10 | Chỉ một trường trong nhóm được cấp quyền: chỉ trường đó có editor; sửa nó không đổi trường bên cạnh; cả tab chính/popup đều đúng |
| A11 | Lưu có ACK, xung đột/mất mạng/mất khóa giữ nháp; OPEN/DRAINING/FROZEN không bị bypass bởi renderer mới |
| A12 | Kéo biên/đổi chỗ nhóm không nhân đôi hoặc làm mất thành viên, không ghi theo từng pixel; header/filter/body cùng độ rộng |
| A13 | Cột custom, ẩn/removed, highlight từ khóa, shortLeaders/shortSpecialist, scroll/filter Esc và lịch sử N/O còn đúng |
| A14 | 5 báo cáo và tập hồ sơ khi bấm số liệu giữ nguyên với cùng fixture/config trước-sau |
| A15 | Popup khách không xuất hiện nút quản trị, sửa quyền, history hoặc tùy chọn mới ngoài quyền hiện có |
| A16 | Nghiệm thu hình ảnh tại 1440/1600 px, 768 px và 390 px; badge/trạng thái dài đọc được, dropdown không bị clip, cuộn đúng |

### Dữ liệu mô phỏng tối thiểu

- HC, QPPL, BC; tên sở rất dài; nội dung dài nhiều dòng; tiếng Việt có dấu.
- Mã NQ01, BC01 và mã dài; STT khác ID; thiếu mã theo chính sách cũ.
- Cấp TTTU/cấp khác/rỗng; ba khâu lần lượt đỏ, vàng/cam, xanh; trạng thái trung gian, Không phải trình, rỗng, ngoài danh mục.
- Người phụ trách tên dài, có chức vụ; CV và Phòng đủ/thiếu từng phần; tên phòng đã có tiền tố Phòng.
- Profile/preset cũ các cờ đều false, các cờ xung đột, localStorage lỗi; thành viên ẩn/removed; 1–20 custom columns.
- Admin, Google employee chỉ được sửa một field, khách chỉ xem; cùng UID hai tab và hai UID khác nhau trong emulator khi kiểm luồng khóa.

### Các lệnh / bằng chứng

Chạy tại `source/`:

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

- Đọc workflow hiện hành để chạy đúng browser smoke và Firebase QA; không đoán tham số script.
- Browser smoke cần click/gõ/kéo thật bằng automation, không chỉ snapshot HTML hoặc synthetic dispatch.
- Ghi exact source SHA, CI URL, ảnh desktop/mobile và bảng W0/W1; ghi rõ fixture hay dữ liệu thật.
- Nếu có công cụ design-taste-frontend ở môi trường thực hiện, có thể dùng kiểm tra màn app và ảnh trước/sau. Bốn yêu cầu của chủ dự án và phong cách hiện có có ưu tiên cao hơn quy tắc thẩm mỹ tổng quát; không đổi theme, font hay palette toàn ứng dụng.
- Không sửa test bằng cách bỏ kiểm tra hành vi đúng chỉ để làm CI xanh. Update kỳ vọng cũ chỉ khi gắn được với U01–U04.
- Không đánh dấu triển khai thành công từ build; cần kiểm riêng workflow publish, Pages deployment và nội dung build đúng source.

## 7. Giới hạn dữ liệu và phát hành

- Giữ Firebase-only; không lấy code/tích hợp Supabase đang tạm dừng.
- Không đổi schema dữ liệu Item, khóa trường A–O, recordId, rules/ACL, nguồn nghiệp vụ, logic báo cáo hoặc danh mục trạng thái để phục vụ hình thức.
- Không ghi/import/chuyển dataSource hoặc deploy Rules/Cloud Functions trong nhiệm vụ UI.
- PR #83 về bảo mật khách phải giữ tách biệt; nhiệm vụ này không được mô tả là đã giải quyết giới hạn bảo mật đó.
- Giữ auth, permission, lease/fencing, CAS/audit và freeze hiện có. Chỉ thông qua server ACK mới báo lưu thành công.
- Bản build root index/assets do workflow sinh, không sửa tay thay cho TypeScript.
- Lệnh giao việc ngày 28/10/2026 đã **cho phép sửa mã, kiểm thử và tạo PR để rà soát**, nhưng **không cho phép merge, publish Pages, import dữ liệu hoặc deploy Firebase**. Bản kế hoạch lập trước đó không phải giới hạn của phiên triển khai hiện tại.
- Khi cần quay lại, dùng commit/PR đảo thay đổi UI có kiểm tra; không reset lịch sử hoặc coi rollback code là restore dữ liệu.

## 8. Quyết định và điểm cần xác nhận trong khi thực hiện

| Mã | Nội dung | Tình trạng |
| --- | --- | --- |
| D01 | Lấy bản restore 8172c06 / checkpoint 5db47f0 làm nền | Đã xác minh khi lập kế hoạch |
| D02 | Nhãn khâu 3 dùng Ban hành NQ; cấp hiện trong ngoặc cạnh Thành ủy | Yêu cầu trực tiếp của chủ dự án |
| D03 | U01/U02 mặc định bắt buộc; bỏ toggle tương ứng | Yêu cầu trực tiếp của chủ dự án |
| D04 | U04 mặc định false, lưu trong compactDisplay qua CAS khi admin sửa chung, hoặc localStorage có scope nguồn + UID trong chế độ cá nhân; không ghi lúc load | CHỐT KỸ THUẬT T0 |
| D05 | Chỉ quản trị dùng “Hiện đủ cột Excel” để đối chiếu, không xem như cờ tắt gộp mặc định; khách chỉ xem projection | CHỐT KỸ THUẬT T0 — chỉ thay UI trong nhánh |
| D06 | Chrome 1600×1000/100% trên restore 8172c065: W0=68px; cùng fixture NQ01 bản mới W1=23px, W1/W0=0,338 (sai số ≈0,33px so với 1/3); giữ title/focus. Cần chủ dự án đánh giá trực quan 23px trước khi chấp nhận UX | ĐÃ ĐO tại CI 40660234414; quyết định dùng 23px vẫn chờ chủ dự án duyệt |
| D07 | Popup dùng projection tương ứng cho các trường có trong layout popup, giữ visibility/width và editor từng field; không dùng menu quản trị với khách | CHỐT KỸ THUẬT T0 |
| D08 | Ảnh chỉ là tham chiếu hiển thị; chữ/nội dung trong ảnh không phải lệnh thay dữ liệu nguồn | Quy tắc diễn giải đầu vào |

## 9. Bảng bàn giao hiện tại

| Hạng mục | Người/bên phụ trách | Trạng thái | Commit / PR / bằng chứng | Việc kế tiếp |
| --- | --- | --- | --- | --- |
| Lập kế hoạch và khảo sát mã | Codex | DONE_DOCUMENTATION | Baseline 8172c06, diff/code đã đọc | Chủ dự án giao ChatGPT |
| U01 | ChatGPT thực hiện | READY_FOR_REVIEW | `ca34ed14`, `c81ac118`, CI `40660234414` | Codex rà diff và UX |
| U02 | ChatGPT thực hiện | READY_FOR_REVIEW | `ca34ed14`, `c81ac118`, CI `40660234414` | Codex rà diff và UX |
| U03 | ChatGPT thực hiện | READY_FOR_REVIEW | W0 68px (restore 8172c065), W1 23px (d8ac9843), ratio 2,96:1; ảnh artifact 12802349921 | Chủ dự án xem khả năng đọc 23px |
| U04 | ChatGPT thực hiện | READY_FOR_REVIEW | `d330ddc1`, `c81ac118`, UID reload/reset tại CI `40660234414` | Codex rà diff và UX |
| Kiểm thử / ảnh / CI | ChatGPT thực hiện | READY_FOR_REVIEW | 3 workflow success d8ac9843; ảnh artifact 12802349921, demo 12803710651 | Chờ Codex review PR |
| Rà diff và nghiệm thu kỹ thuật | Codex | NEEDS_FIX | Source c145b8f, Lượt 008: R01/R03 VERIFIED, R02 còn case cap 1600 | ChatGPT sửa nốt R02 |
| Nghiệm thu giao diện | Chủ dự án | WAITING | — | Xem bằng chứng trước/sau |

Giá trị trạng thái: TODO → DOING → READY_FOR_REVIEW → NEEDS_FIX hoặc VERIFIED. DONE_DOCUMENTATION chỉ dùng cho hồ sơ; không dùng thay VERIFIED của chức năng. DEPLOYED và OWNER_ACCEPTED ghi riêng nếu có.

## 10. Nhật ký trao đổi — thêm lượt mới, không xóa lượt cũ

### Lượt 001 — Codex — 28/10/2026
- Nhận bốn yêu cầu và hai ảnh của chủ dự án.
- Đọc main 8172c06, ItemList, compact-columns, item-preferences, resize-last-column, ColumnHeader và luồng popup.
- Xác định code cũ có các cờ gộp tùy chọn; chỉ đổi default không bảo đảm preset/profile cũ hiển thị nhóm bắt buộc.
- Xác định default ID 68 px và min width 60 px cần xử lý cùng table layout thực.
- Tạo kế hoạch, bảng tiêu chí và lưu hai ảnh làm tham chiếu GitHub.
- **Chưa viết code chức năng, chưa chạy bộ test cho thay đổi mới, chưa triển khai giao diện mới.**

### Lượt 003 — ChatGPT — 28/10/2026 — T1–T8 triển khai đang kiểm thử
- **Branch/PR:** [PR #90 DRAFT](https://github.com/cavoixanh638/HopHDND-WebApp/pull/90), `feat/column-refinement-20261028`; base `8088f5b33ddf40a99c80b3da386497fe57572676`; không chỉnh `main`.
- **T1/U01/U02:** `d330ddc1` + `ca34ed14` thêm flag mới tương thích, hai nhóm hiển thị bắt buộc bất kể cờ legacy; `b39c8c5` bộ lọc AND nguồn theo từng trường; `c81ac118` renderer dùng chung; `83293b9e`, `694f2a81` nối list/CSS; không đổi tên trường hay nội dung báo cáo.
- **T4/U03:** `0c44f2dd` áp `Math.round(sourceWidth/3)` vào ID *chỉ trong view*, không sửa source validator min60; ID có title và keyboard focus, bỏ resize trực tiếp trên ID view. **Độ rộng hiển thị thực W0/W1 chưa xác nhận**; script đo mới phân biệt trước là mô phỏng DOM 68px, không phải ảnh lịch sử đã chụp.
- **T5/U04:** checkbox chỉ lộ khi teamTogether có phòng+CV; flag false với cấu hình cũ; nguồn localStorage theo scope và UID hoặc CAS admin sẵn có. `2a13369b` giữ editor các trường rỗng.
- **T6:** `671d4297` popup áp projection khi xem thông thường và vẫn dùng popup layout/permissions riêng; hai nhóm có filter tách biệt; không phát sinh API Firebase hay ghi dữ liệu.
- **T7:** [CI Verify source lượt 40658675833](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40658675833): Typecheck/unit/docs check/Firebase emulator và các build đến bước browser smoke **qua**, browser smoke **đỏ** vì còn kỳ vọng 15 cột DOM cũ. Đã cập nhật kịch bản mới có kiểm đủ **15 khóa lọc nguồn** và bắt buộc U01/U02; chưa gọi toàn bộ CI xanh.
- [Firebase operational QA lượt 40658345905](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40658345905) **success** và [staging isolated lượt 40658345837](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40658345837) **success** trên exact `4905a4b5f094c52fa0611fa5e23328dc71d22cb4`, không phải chứng cứ mọi commit sau đã qua.
- **Ảnh:** ảnh tham chiếu trước là 2 PNG nguồn ở mục 2, không phải screenshot bản UI cũ; workflow upload PNG desktop/mobile/guest và ID DOM trước/sau đang được chỉnh, **chưa có bằng chứng screenshot thành công để dẫn**. Đích đo gồm 1600 và 390px; **768px chưa chứng minh**.
- **Chưa xong:** E2E browser, W0 thực trước thay đổi, UX ID đọc ở mức 1/3, toàn bộ CI mới nhất, rà Codex. Mọi mục đều chưa xác nhận READY_FOR_REVIEW.
- **Cần Codex rà:** field permission/lease trong renderer gộp, callback nội dung trường rỗng, popup giữ cấu hình riêng, tỷ lệ W0/W1 và phần browser smoke thay đổi. **Không merge, không deploy, không import, không publish.**

### Lượt 004 — ChatGPT — 28/10/2026 — T0–T8 kiểm thử đạt, bàn giao PR
- **Mốc nguồn và thay đổi:** `main` vẫn `8088f5b33ddf40a99c80b3da386497fe57572676`, branch `feat/column-refinement-20261028` xây trên restore `8172c0650580931140fc71e59d3cc4d816879594`. Exact SHA mã đã được CI xác minh: **`d8ac9843d329f5a7ffbadb87d1b7889c937060ea`**. Lượt cập nhật tài liệu sau SHA đó không đổi logic ứng dụng; phải đối chiếu CI của HEAD PR sau cùng.
- **CI source:** [Verify HopHDND source — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660234414): 70 tệp unit pass, **496 tests passed / 52 skipped**; Firebase emulator **51 passed / 1 expected fail**; TypeScript, docs check, Pages test build, offline HTML, browser Chrome và tạo ảnh đều qua. Bước CI tạo bundle **chưa deploy/publish**.
- **CI Firebase tách biệt:** [Verify isolated Firebase staging — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660234422); [Firebase operational QA đa tài khoản — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660234431), cả hai chạy trên SHA `d8ac9843`, dữ liệu giả/emulator, không tác động Firebase đang dùng.
- **Đo ID thật đối chiếu hai commit:**
  | Thước đo | Restore `8172c065` (trước sửa) | Mã `d8ac9843` (sau sửa) |
  | --- | --- | --- |
  | Trình duyệt / viewport | Chrome 1600×1000, devicePixelRatio=1, Segoe UI | Chrome 1600×1000, devicePixelRatio=1; cùng fixture QA |
  | Mã dòng minh họa | NQ01 | NQ01 |
  | Rộng thực `td[data-col-key=displayCode]` | **W0=68 px** | **W1=23 px** |
  | Tỷ lệ | — | **W0/W1=2,9565 ≈ 2,96:1**; W1−W0/3=+0,33px |
  | Bảo vệ đọc mã | Trước: đủ 68px | Sau: mã đầy đủ trong DOM, title nguồn, aria-label, tabIndex=0; không overflow |
- **Ảnh before/after thực và các kích thước:** [Artifact ảnh browser SHA d8ac9843](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660234414/artifacts/12802349921) có `hophdnd-id-before-real.png` (**ảnh chụp thật trên restore 8172c065**), `hophdnd-id-after.png`, `hophdnd-id-before-simulated.png` (chỉ đối chiếu DOM bổ sung), `hophdnd-compact-desktop-pass.png`, `hophdnd-compact-tablet-pass.png` (768px), `hophdnd-compact-mobile-pass.png` (390px), `hophdnd-compact-guest-pass.png` và `hophdnd-ui-smoke-pass.png`. Không dùng ảnh mô phỏng thay ảnh baseline thật.
- **Bản xem thử offline không cần dữ liệu thật:** [Artifact HTML tương tác](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660234414/artifacts/12803710651). Chỉ demo trình duyệt và dữ liệu giả; chưa được publish lên Pages.
- **Hành vi qua browser:** U01 badge+Sở ở hàng trên, nội dung ở dưới; U02 đúng 3 nhãn và 3 nguồn; nhóm 15 filter gốc còn đủ; quyền/cập nhật một `partyLevel` tại QA không thay 3 tiến độ còn lại; U04 guest mặc định false, bật CV (Phòng), reload giữ theo UID, reset trở về shared; 1600/768/390 không tràn trang.
- **Rà diff so với main:** 15 file thay đổi, chỉ React/TypeScript/CSS/tests, workflow và tài liệu; không sửa dữ liệu, Firebase Rules/Auth/Storage, source schema A–O, file import, đường deploy hoặc Supabase. Source được so sánh 34 commit đi trước và 0 commit đi sau main lúc kiểm tra.
- **Điểm chủ dự án cần duyệt:** **23px làm mã 4 ký tự có thể xuống dòng nhiều lần** dù đầy đủ và đọc qua tooltip/ARIA, ảnh là bằng chứng. Nếu cần mã đọc ngang liền mạch, đề xuất chủ dự án cân nhắc độ rộng tối thiểu khoảng 52–64px; **không tự áp dụng** vì trái tỷ lệ 1/3 đã giao. Phần font/spacing chỉ thay trong ID UI, không giảm font toàn bảng.
- **Phạm vi kỹ thuật còn cần Codex review:** các quyền lease/fencing với grouped editor, quyền popup, nhãn lỗi trạng thái lạ, preset/removed/custom ẩn hiện, tương tác với PR #83 security. CI pass không phải thay kết luận kiểm toán bảo mật.
- **Trạng thái bàn giao:** T0–T8 **READY_FOR_REVIEW**, T9 **WAITING**. Không merge PR, không dùng auto-merge, không deploy Firebase, không import, không publish Pages.

### Mẫu lượt tiếp theo
- **Lượt / ngày giờ Việt Nam / bên thực hiện:**
- **Branch + source SHA + PR:**
- **Đã làm (U/T/A tương ứng):**
- **Quyết định mới và căn cứ từ chủ dự án:**
- **Files thay đổi:**
- **Test đã chạy, kết quả và exact SHA:**
- **Ảnh / số đo W0, W1 / CI URLs:**
- **Lỗi hoặc việc chưa xong:**
- **Cần bên kia rà gì:**
- **Bước tiếp theo:**

## 11. Bảng nhận xét Codex ↔ ChatGPT

| Mã | Vị trí / vấn đề / ảnh hưởng | Yêu cầu sửa hoặc kiểm tra | Trả lời của bên thực hiện + commit | Kết quả rà lại |
| --- | --- | --- | --- | --- |
| R00 | Hồ sơ đã có PR #90 để rà | Đã kiểm source 3194553441 | Codex, lượt 005 / mục 13 | REVIEWED |
| R01 / P2 | ItemList.tsx:230–245 — bộ lọc nhóm người phụ trách chỉ tìm trường neo | Khôi phục tìm đủ tên lãnh đạo/CV/Phòng, giữ AND theo field U01/U02; bổ sung browser regression | `3780379` staff merged index; `b991ff2` AND U01; `bb39560` sửa selector test. Chromium R01 PASS (full CV/lãnh đạo UBND/VP/Phòng; có/không dấu, U04, AND), source CI 40667590073 | VERIFIED — Codex tái kiểm source c145b8f, Lượt 008 |
| R02 / P2 | ItemList.tsx:446–455 — ID thu 1/3 được dùng làm cột bù nhưng min vẫn 60 và commit tính width nguồn | Giữ đúng chiều kéo và tổng width khi ID ở cuối; thống nhất miền width hiển thị/nguồn, thêm hồi quy | `f077053` + `2960dfe` physical width; `07974e3` unit; `48899dd` CDP keyboard/drag. Tổng 1533→1533px (ID last), custom 1552→1552px, group last 1533→1533; CI 40667590073 PASS | NEEDS_FIX — ID cuối đạt; còn lỗi cap 1600 px, tổng 2813→2883; xem Lượt 008 |
| R03 / P2 | ItemList.tsx:481–489, CompactGroupedValue.tsx và popup — style chỉ xét trường neo | Áp quy tắc cellHighlights cho từng trường con theo raw value + field key, giữ thứ tự ưu tiên màu; kiểm cả list/popup | `e6bb809`/`f3de2fe`/`b6c861e`/`fc4a574` source highlight theo member; `d6a8759` unit; `71c5d13` CDP list/popup/ẩn/editor PASS; rule Sở rgb(204,0,0), không tô cả group | VERIFIED — Codex tái kiểm source c145b8f, Lượt 008 |
| R04 / UX | ID 23px đạt tỷ lệ nhưng mã bị tách dòng | Chủ dự án quyết định UX sau khi R02 sửa; không tự đổi 52–64px | Chờ quyết định chủ dự án | OWNER_DECISION |

## 12. Câu lệnh giao việc cho ChatGPT

> Đọc file source/docs/tasks/UI_COLUMN_REFINEMENT_2026-10-28.md và hai ảnh liên kết trong repo cavoixanh638/HopHDND-WebApp. Đây là file bàn giao chung với Codex. Kiểm tra main mới nhất, đọc AGENTS.md, dùng bản restore trước UI V2 làm nền. Hãy thực hiện U01–U04 theo thứ tự T0–T8 trên feature branch, giữ dữ liệu/nghiệp vụ/Firebase và các quyền hiện có. Ghi các quyết định T0, tiến độ, commit/PR, CI, ảnh trước/sau và số đo ID vào chính file này; không chỉ trả lời trong chat. Hoàn thành kiểm thử và tạo PR để tôi/Codex rà soát. Chưa tự merge, publish UI, import dữ liệu hoặc deploy Firebase trong lệnh giao việc này. Nếu thiếu quyền ghi GitHub, đưa bản cập nhật cụ thể để tôi chuyển cho Codex, không tự nhận đã cập nhật file.

### Lượt 002 — ChatGPT — 28/10/2026 — T0 khởi tạo
- Kiểm tra `main` tại `8088f5b33ddf40a99c80b3da386497fe57572676` (chỉ thêm file kế hoạch/ảnh sau restore `8172c0650580931140fc71e59d3cc4d816879594`, cây source dựa checkpoint `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`). Đã đọc `source/AGENTS.md` (không có root `AGENTS.md`).
- Đọc hai ảnh nguồn trực tiếp từ GitHub: `assets/UI-COLUMNS-20261028-content.png` (SHA blob `4bb1090ae58040da3fbef50eb1ba17ac73a3577e`), `assets/UI-COLUMNS-20261028-progress.png` (SHA blob `e343b60c71390cb1f570d29e80032e61ecbc4d9b`). Ảnh 2 nhãn dòng 3 là “Trình HĐND”; triển khai đúng chỉ thị “Ban hành NQ”.
- Quyết định T0: giữ 15 nguồn A–O nguyên; projection bắt buộc U01/U02 chỉ khi xem, cột nguồn nguyên khi chỉnh schema/quyền; “Hiện đủ cột Excel” là chế độ kiểm tra dành cho quản trị, popup không lộ tác vụ admin cho khách. U04 false với cấu hình cũ, không tự nâng cấp profile. Chỉ ánh xạ width ID ở lớp hiển thị, không thay min 60 schema.
- **Chưa đo W0 trực tiếp trên browser hoặc chụp ảnh trước**: runner hiện tại không kết nối mạng tới GitHub Pages qua container, chưa được coi T0 hoàn tất. Cần thu bằng chứng qua browser CI/mock trước khi xác nhận A06. Không ghi 68px default thành W0 đo thực.
- Nhánh: `feat/column-refinement-20261028`. Chỉ tạo feature branch; không thay đổi `main`, Firebase, Pages hoặc nguồn dữ liệu.


## 13. Codex review — Lượt 005 — 28/10/2026

**Kết luận: NEEDS_FIX.** Rà đúng source PR #90 `3194553441e3c3edd1d52c8c00ef8d38fb81f8c2`; không sửa mã ứng dụng, không merge hoặc deploy. Commit bổ sung review/tài liệu sau đó không thay source đã kiểm.

### Phạm vi đã kiểm và bằng chứng

- Đã đọc diff 15 file, phần projection/renderer/filter, popup, min-width/resize, compatibility flag U04 và thay đổi test.
- Đã xác minh bằng GitHub API: ba workflow của **đúng SHA 3194553441** đều SUCCESS: [source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660689700), [staging](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660689673), [operational QA](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40660689758). Đây là trạng thái CI có sẵn, không phải các workflow Codex vừa chạy.
- Codex đã chạy cục bộ `vitest run tests/compact-columns.test.ts tests/item-save-flow.test.ts tests/trailing-column-width.test.ts`: **3 file, 31 test PASS**. Không chạy lại toàn bộ Emulator/CI và không khẳng định đã kiểm toán bảo mật toàn hệ thống.
- Đã mở component ItemList thật từ exact checkout qua Vite ở Windows, dùng fixture `compact-qa.html`, không đăng nhập và không kết nối database. Browser viewport thực khi tái hiện: **1280 px**. Đo ID hiện tại được **23 px**.
- Dùng một fixture cục bộ bổ sung để thử `cellHighlights`, chỉ tạo dữ liệu demo và quy tắc màu trong bộ nhớ. Fixture này không nằm trong PR và không phải tính năng ứng dụng.
- Tài liệu hiện hành T0–T8 READY_FOR_REVIEW được hiểu là bên thực hiện đã bàn giao, không phải Codex hoặc chủ dự án đã nghiệm thu. Các hàng bị ảnh hưởng đã chuyển NEEDS_FIX; nhật ký bàn giao cũ giữ nguyên để lưu vết.

### R01 — [P2] Bộ lọc Lãnh đạo/Phòng/CV không tìm tên thành viên nhóm

Vị trí: [ItemList.tsx:230–245](https://github.com/cavoixanh638/HopHDND-WebApp/blob/3194553441e3c3edd1d52c8c00ef8d38fb81f8c2/source/src/features/items/ItemList.tsx#L230); control của nhóm tại dòng 469–476.

**Tái hiện thực tế:**
1. Mở fixture compact QA mặc định có `teamTogether=true`, 8 hồ sơ.
2. Hồ sơ NQ01 và NQ05 có chuyên viên nguồn **Chuyên viên mẫu A** (UI viết tắt C.V.M.A).
3. Nhập **Chuyên viên mẫu A** vào ô “Tìm kiếm cột Lãnh đạo / Phòng / CV”.
4. Kết quả thực: **Không tìm thấy nội dung phù hợp**, trong khi phải có 2 hồ sơ.

**Nguyên nhân:** control vẫn nhận `getValue=compactFilterText` và dùng khóa neo `room`, nhưng phần lọc mới bỏ đường `merged:` và chỉ kiểm `values.room`. `values['merged:room']` vẫn được tạo nhưng không được sử dụng. Nhóm `leadersTogether` cũng có cùng vấn đề khi tìm tên của trường không phải neo.

**Yêu cầu sửa:** phân biệt filter từng field độc lập của U01/U02 với filter chuỗi gộp của các nhóm người phụ trách. Không khôi phục đường cũ bằng cách làm mất AND của U01/U02. Thêm test browser tìm tên CV đầy đủ, lãnh đạo UBND, lãnh đạo VP và Phòng khi bật/tắt U04, có chữ viết tắt và không dấu.

![R01 — Tên CV có trong dữ liệu nhưng tìm trong nhóm trả về rỗng](assets/PR90-review-filter.png)

### R02 — [P2] Đưa ID về cuối làm tăng cột thành thu nhỏ và tổng width sai

Vị trí: [ItemList.tsx:446–455](https://github.com/cavoixanh638/HopHDND-WebApp/blob/3194553441e3c3edd1d52c8c00ef8d38fb81f8c2/source/src/features/items/ItemList.tsx#L446), liên quan `visualWidth` dòng 268–270 và `ColumnResizeHandle.clamp`.

**Tái hiện bằng UI thật, không sửa DOM:**
1. Trên fixture compact QA, focus header ID, dùng **Alt+ArrowRight** đưa ID qua các cột tới cuối bảng.
2. Trước resize: Nội dung **440 px**, ID **23 px**, tổng bảng **1533 px**.
3. Focus separator “Kéo ranh giới để đổi độ rộng cột Nội dung trình”, nhấn **ArrowRight** một lần.
4. Sau thao tác: Nội dung **403 px** (bị giảm 37 px), ID **35 px**, tổng bảng **1508 px** (giảm 25 px).

**Nguyên nhân:** ID hiển thị đã chia 3, nhưng compensator vẫn có min 60 px; `clamp` tính cận trên = 440 + 23 − 60 = 403. Sau đó `resizeWithLastColumn` ghi bù trên width nguồn ID 68 px và render lại chia 3, nên tổng vật lý không được bảo toàn. Bỏ tay nắm trực tiếp của ID không ngăn lỗi này.

**Yêu cầu sửa:** thống nhất width vật lý và width lưu trong cả preview, bounds và commit khi cột cuối là ID. Giữ được nguyên tắc bù một cột cuối hoặc ghi quyết định rõ về cột bù hợp lệ khi ID không đủ khoảng; không được âm thầm kéo ngược. Test cả ArrowLeft/Right, drag thật, ID cuối, cột nhóm cuối và profile có ID custom width; xác nhận total trước/sau không đổi.

### R03 — [P2] Mất quy tắc tô màu theo field khi field trở thành thành viên nhóm

Vị trí: [ItemList.tsx:481–489](https://github.com/cavoixanh638/HopHDND-WebApp/blob/3194553441e3c3edd1d52c8c00ef8d38fb81f8c2/source/src/features/items/ItemList.tsx#L481), renderer `CompactGroupedValue` và đường grouped cell tương tự trong `ReportDetailGrid.tsx`.

**Tái hiện:** tạo fixture với `cellHighlights=[{id:'review-department',field:'department',word:'Sở mẫu A',textColor:'#FFFFFF',backgroundColor:'#CC0000'}]`.
- Chế độ mặc định gộp: trường **Sở mẫu A** có nền trong suốt, chữ `rgb(41,59,52)`; quy tắc không hiện.
- Bấm “Hiện đủ cột Excel” với cùng layout/dữ liệu: ô Sở có nền `rgb(204,0,0)`, chữ trắng `rgb(255,255,255)` đúng cấu hình.

**Nguyên nhân:** ô gộp chỉ gọi `cellHighlightStyle(item[anchor],anchor,...)`; `compactField`/renderer không áp style theo trường con. Các rule dành riêng cho department, type, progressBuild, progressCouncil… không được đánh giá khi các field đó bị ẩn vật lý. Do U01/U02 trở thành mặc định bắt buộc, quy tắc từng ô đang dùng mất tác dụng ngay ở chế độ xem mặc định. Popup có cùng đường xét style theo neo.

**Yêu cầu sửa:** tính style trên raw value và field key của từng thành viên rồi áp đúng vùng hiển thị của nó, giữ ưu tiên quy tắc hiện hành và màu trạng thái. Không tô cả cụm bằng màu của một thành viên. Thêm test cho rule field cụ thể và wildcard, cả list/popup, field bị ẩn thật, trạng thái và editor.

![R03 — Gộp: rule Sở mẫu A chưa được áp dụng](assets/PR90-review-highlight-grouped.png)

![R03 — Cùng dữ liệu ở cột nguồn: rule nền đỏ hoạt động](assets/PR90-review-highlight-source.png)

### Ghi nhận đạt / giới hạn của review

- U01/U02 có bố cục tương ứng ảnh, ba nhãn Thành ủy / Xây dựng NQ / Ban hành NQ, phần cấp trong ngoặc và đủ source filter trong fixture đã xem.
- Phép đo 23 px và việc giữ source width để tránh chia lặp là có thật. **Khả năng đọc ID 23 px vẫn là quyết định UX của chủ dự án**, không phải lỗi phải sửa thành 52–64 px khi chưa có lệnh mới.
- Không phát hiện thay đổi Firebase Rules, dữ liệu nghiệp vụ hoặc logic báo cáo trong diff; không có nghĩa đã chứng minh mọi đường quyền/lease/Cloud production an toàn.
- Bản browser QA đã xem là source checkout chạy cục bộ, không phải artifact HTML được tải từ Actions. Đã xác minh CI của artifact/run được dẫn, nhưng không mô tả việc này thành đã tải và thử artifact đó.
- Chưa nghiệm thu popup/full browser matrix độc lập ở mọi kích thước; cần bên thực hiện bổ sung test những lỗi trên và exact SHA mới để Codex rà lại.

**Bàn giao cho ChatGPT:** sửa R01–R03 trên PR #90, giữ lịch sử các nhận xét, bổ sung test tái hiện và ghi commit/CI mới vào cột phản hồi. Chưa chuyển T9 sang triển khai khi các mục OPEN chưa đóng.

### Lượt 006 — ChatGPT — 28/10/2026 — sửa review 005 (R01–R03), đang xác nhận CI

- **Nhận xét nguồn:** Giữ nguyên toàn văn Lượt 005, cả ba R01/R02/R03 là P2 và R04 do chủ dự án quyết định. PR #90 vẫn cùng branch `feat/column-refinement-20261028`, không sửa main, không deploy.
- **R01 đã commit:** `378037920e48099df7b88d2d049aaba383e9c02f` phân biệt bộ lọc nhóm nhân sự (dùng `merged:anchor` từ `compactFilterText`) và U01/U02 theo từng khóa source AND; không thay index text. `b991ff23c5dff3eb789d283c84fe41853cdec165` bổ sung Chromium gõ full tên CV/VP/UBND/Phòng, diacritics/no-diacritics, leadersTogether, bật U04 và ghép thêm filter Sở phải AND.
- **R02 đã commit:** `f077053658a09d0dc04e5125453f3cb42cac158c` + `2960dfe3a7c2c9a88c9321c47bded3cc559c1513` thêm physical width projection khi ID cuối, ID raw vẫn min60. Preview clamp và commit `resizeProjectedWithLastColumn` dùng cùng domain; không resize trực tiếp ID. Test `07974e377211d4b55a8e290fe73c949631c802ec` bao gồm ArrowLeft/Right, pointer delta, group-last, ID custom125/reload. Browser `48899dd1840071e431c656fbbedc8d08e7aca6a8` thực hiện Alt+ArrowRight, keyboard và pointer real, đo tổng cột/trước–sau.
- **R03 đã commit:** `e6bb8099092ff79def9a5e9d78dc5619a58f83f2`, `f3de2fe9f49e080e8fc3574ebec09c86ab4e7e1c`, `b6c861e94b86498c030d24845d88742042a6d911`, `fc4a5742ff2adb66a5f82dadf0a1c0c8de0e6216`: dùng `cellHighlightStyle(raw,field,...)` cho từng span/badge/3 trạng thái, editor và popup; không apply style của anchor lên toàn ô gộp. Test unit `d6a87592de1412b897e9a71dcf63aa1136a64139` cho field/wildcard/ưu tiên/hide/edit/U04. Browser `71c5d1312b9c411be9944640a0b07b1b5197e1a2` kiểm màu nguồn và màu gộp, hiển thị ẩn và popup.
- **Fixture** chỉ được thêm trong `source/src/qa/compact-qa-main.tsx` qua query param QA và dữ liệu mock, không nằm trong production bundle.
- **Đang chờ:** CI đầy đủ sau commit browser test mới nhất, số đo browser R02 cuối và kết quả R01/R03. Không coi code đã commit là VERIFIED. Sẽ ghi exact SHA, URL workflow, logs, ảnh khi CI hoàn tất; để Codex tái-review trước khi đóng R01–R03.

### Lượt 007 — ChatGPT — 28/10/2026 — đóng vòng sửa R01–R03 ở mức CI, chờ Codex tái-review

- **HEAD source đã kiểm chính xác:** `bb39560657a8ac8d4778ca9c8383cc5c53566ccb` trên `feat/column-refinement-20261028`, PR [#90](https://github.com/cavoixanh638/HopHDND-WebApp/pull/90) vẫn OPEN/Ready for review, **chưa merge**.
- **CI source:** [Verify HopHDND source #40667590073 — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667590073): TypeScript, **505 unit PASS / 52 skipped**, Firebase emulator **51 PASS / 1 expected fail**, docs check, build và Chrome smoke **PASS**. [Isolated Firebase staging #40667589950 — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667589950); [Firebase operational QA #40667590460 — SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667590460). Dữ liệu CI là giả lập; không kiểm chứng dữ liệu hoặc quyền Firebase production.
- **R01:** Chromium tìm tên đầy đủ được `Chuyên viên mẫu A` → **NQ01/NQ05**; `Phong mau 2` → **NQ02/BC06**; `PCVP Trần Văn B` và `PCT Nguyễn Văn C` mỗi tên trả đúng **NQ01**, cả không dấu và `leadersTogether`, bật U04 cũng đúng. Thử nhóm tên CV và bộ lọc Sở theo nguồn với toán tử **AND**: không khớp = rỗng; xóa một lọc phục hồi 2 dòng, xóa tiếp phục hồi 8 dòng. Trong quá trình thêm test có một lần CI đỏ do tìm sai node `th[data-filter-key=department]` thay vì node `[data-filter-key=department]` nằm bên trong cột gộp; sửa test `bb395606...`, CI source cuối xanh. Không thay đổi quyền hay dữ liệu tìm kiếm.
- **R02:** Thao tác thực browser Alt+ArrowRight đưa ID về cuối, nhấn ArrowRight: Nội dung **440→443px**, ID **23→20px**, tổng **1533→1533px**; ArrowLeft: Nội dung **433px**, ID **30px**, tổng vẫn **1533px**; kéo chuột: Nội dung **438px**, ID **25px**, tổng **1533px**. ID source custom125 → ID vật lý **42→32px**, tổng **1552px** trước/sau; đặt nhóm tiến độ ở cuối → Nội dung **440→450px**, nhóm **320→310px**, tổng **1533px**. Min width nguồn >=60 được giữ, không chia width khi reload. **R04 vẫn do chủ dự án quyết định UX 23px**, không tự sửa.
- **R03:** `department` Sở mẫu A trong cụm có nền **rgb(204,0,0)**, chữ trắng; loại VB và Nội dung **không** bị nhuộm cùng màu. Wildcard cấp Thành ủy nền **rgb(18,52,86)**, tiến độ xây dựng theo rule nền **rgb(255,238,85)**. So với “Hiện đủ cột Excel” cùng rule đều đúng; trường Sở thật sự `visible:false` không lộ chữ hoặc màu; editor Sở khi có quyền giữ màu; popup dùng chung renderer hiển thị đúng màu trường con và **không** tô cả ô.
- **Ảnh sau sửa, ảnh baseline trước và log CI:** [Artifact browser 12806049938 tại run #40667590073](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667590073/artifacts/12806049938) gồm `hophdnd-review-r01-after.png`, `hophdnd-review-r02-after.png`, `hophdnd-review-r03-after.png` (đối chiếu với ảnh R01/R03 của Codex ở Lượt 005), và ảnh ID before-real/after, desktop/tablet/mobile từ vòng trước. Ảnh fixture/mock, không phải Pages production.
- **Phạm vi bất biến:** không sửa `hdnd/items`, dữ liệu nguồn, logic 5 báo cáo, permission Rules, lease/fencing/CAS, Firebase production, Supabase hoặc file deploy. Ba R01–R03 đã **FIX_TESTED**; bảng review vẫn để Codex kiểm tra lại, không tự đánh dấu REVIEWED/CLOSED. T9 vẫn WAITING; PR #83 bảo mật độc lập.


## 14. Lượt 008 — Codex tái-review R01–R03 — 28/10/2026

**Source được kiểm:** `c145b8f371cc6f2cb7569f7d55a389e951a1c841`, PR #90, branch `feat/column-refinement-20261028`.
**Kết luận:** R01 và R03 **VERIFIED** trong phạm vi tái kiểm; R02 **NEEDS_FIX** vì còn một trường hợp hợp lệ ở trần độ rộng cột gộp. R04 giữ **OWNER_DECISION**. T9 vẫn WAITING.

### Bằng chứng độc lập và trạng thái CI

- Đã đọc diff từ commit review trước `6f10f3e` tới source mới, các helper resize, renderer highlight và bộ lọc.
- Xác minh **đúng HEAD c145b8f** có ba workflow SUCCESS: [Verify source #40667952017](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667952017), [staging #40667952043](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667952043), [operational QA #40667952021](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40667952021). Không chỉ dựa vào CI của source bb395606 được dẫn ở Lượt 007.
- Codex chạy cục bộ 4 file test liên quan: `compact-columns.test.ts`, `item-save-flow.test.ts`, `trailing-column-width.test.ts`, `compact-group-highlights.test.tsx`: **40 test PASS**.
- Một test reviewer bổ sung cho cap 1600 px **FAIL**: total thực mong đợi 2813 nhưng nhận 2883.
- Browser chạy source checkout chính xác trên Windows, viewport 1280 px, fixture giả/local, không Firebase thật. Đây là kiểm thử độc lập bằng mã source; không tuyên bố đã tải và mở artifact Actions.

### R01 — VERIFIED

Đã gõ trên ô tìm của nhóm nhân sự, kết quả browser:
- `Chuyên viên mẫu A` và `chuyen vien mau A` → **NQ01, NQ05**.
- `PCVP Trần Văn B` và `PCT Nguyen Van C` → **NQ01**.
- `Phong mau 2` → **NQ02, BC06**.
- Tìm Chuyên viên mẫu A kết hợp Sở mẫu B → **0 hồ sơ**, đúng AND. Xóa lọc phục hồi dữ liệu.
Đường `staffGroupTerms` dùng `merged:anchor` đã được phục hồi, U01/U02 giữ filter theo khóa nguồn.

### R03 — VERIFIED

Đã kiểm danh sách bằng fixture `highlight=1`:
- Sở mẫu A nền **rgb(204,0,0)**, chữ **rgb(255,255,255)**.
- Sở mẫu B không bị tô; vùng nội dung và `td` gộp vẫn nền trong suốt.
- Rule wildcard tại cấp Thành ủy nền **rgb(18,52,86)**.
Đã mở popup thật từ fixture `popup=1&highlight=1`: Sở mẫu A vẫn nền đỏ/chữ trắng, `td` gộp không bị nhuộm cả cụm. Kết hợp unit tests renderer về wildcard/field ẩn/U04/editor và diff truyền highlight theo field, có đủ bằng chứng đóng nhận xét R03 đã nêu. Đây không phải tuyên bố đã rà mọi cấu hình CSS/đường quyền trên production.

### R02 — case ID cuối đã PASS, nhưng còn lỗi cap của cột gộp

**Trường hợp cũ đã sửa đúng:**
- Đưa ID về cuối bằng Alt+ArrowRight: Nội dung 440, ID 23, total 1533 px.
- ArrowRight: Nội dung **443**, ID **20**, total **1533 px**.
- ArrowLeft: Nội dung **433**, ID **30**, total **1533 px**.
Không còn kéo ngược hoặc thay tổng như review trước.

**Trường hợp còn lỗi — cấu hình hợp lệ, không cần thay schema:**
1. Dùng layout đủ A–O bình thường, `teamTogether=true`, đặt width nguồn `partyLevel=1550` (trong giới hạn 60–1600).
2. Nhóm tiến độ có extraWidth 130. Renderer `compactVisibleColumns` đang cap thành **1600 px**. Ghi chú cuối bảng **240 px**, total **2813 px**.
3. Focus separator “Kéo ranh giới để đổi độ rộng cột Tiến độ 3 khâu”, nhấn **ArrowRight**.
4. Kết quả browser độc lập: nhóm tiến độ vẫn **1600 px**, Ghi chú lại tăng thành **310 px**, total thành **2883 px** — tăng **70 px** dù bấm tăng cột Tiến độ.

**Vị trí mã:**
- [resize-last-column.ts:40–45](https://github.com/cavoixanh638/HopHDND-WebApp/blob/c145b8f371cc6f2cb7569f7d55a389e951a1c841/source/src/data/resize-last-column.ts#L40): `physicalWidth` và `physicalLimits` dùng sourceWidth + extraWidth, cho nhóm đạt 1730 px.
- [compact-columns.ts:150](https://github.com/cavoixanh638/HopHDND-WebApp/blob/c145b8f371cc6f2cb7569f7d55a389e951a1c841/source/src/features/items/compact-columns.ts#L150): renderer lại dùng `Math.min(1600, sourceWidth + extraWidth)`.
- [resize-last-column.ts:69–78](https://github.com/cavoixanh638/HopHDND-WebApp/blob/c145b8f371cc6f2cb7569f7d55a389e951a1c841/source/src/data/resize-last-column.ts#L69): commit lấy “before” 1680 thay vì width thực 1600; desired 1610 bị hiểu là giảm 70, bù sang Ghi chú.

**Yêu cầu sửa tiếp:** dùng cùng một projection và cap trong renderer, preview, bounds và inverse/commit. Nếu nhóm đã chạm trần, tăng phải clamp/no-op hợp lệ; không bù pixel cho thay đổi không thực sự hiển thị. Kiểm cả nhóm làm target và nhóm làm cột cuối, source gần/qua ngưỡng cap (ví dụ 1470, 1550, 1600), cả ArrowLeft/Right và drag. Giữ schema, quyền và dữ liệu nguyên.

**Test tối thiểu tái hiện (đã chạy FAIL trên c145b8f):**

Chép tạm vào `source/tests/pr90-review-boundary.test.ts`, chạy `npm exec -- vitest run tests/pr90-review-boundary.test.ts`:

```ts
import {it,expect} from 'vitest';
import {defaultItemLayout} from '../src/data/item-preferences';
import {DEFAULT_COMPACT_DISPLAY,compactVisibleColumns,activeCompactPairs} from '../src/features/items/compact-columns';
import {resizeProjectedWithLastColumn,projectedIdWidth} from '../src/data/resize-last-column';
it('review R02: capped group resize keeps the actual projected total',()=>{
  const layout=defaultItemLayout();
  layout.columns=layout.columns.map(c=>c.key==='partyLevel'?{...c,width:1550}:c);
  const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
  const cols=compactVisibleColumns(layout.columns,prefs);
  const extras=Object.fromEntries(activeCompactPairs(layout.columns,prefs).map(p=>[p.anchor,p.extraWidth]));
  const renderedTotal=(value:typeof layout)=>compactVisibleColumns(value.columns,prefs)
    .reduce((sum,c)=>sum+(c.key==='displayCode'?projectedIdWidth(c.width):c.width),0);
  const target=cols.find(c=>c.key==='partyLevel')!;
  const next=resizeProjectedWithLastColumn(layout,cols.map(c=>c.key),'partyLevel',target.width+10,extras,true);
  expect(renderedTotal(next)).toBe(renderedTotal(layout));
  expect(compactVisibleColumns(next.columns,prefs).find(c=>c.key==='note')!.width).toBeLessThanOrEqual(240);
});
```

Kết quả reviewer: `AssertionError: expected 2883 to be 2813`.
Fixture browser cục bộ mount **ItemList thật** với cùng layout đã tái hiện đúng các số trên, không sửa DOM để giả lập kết quả. Fixture/test reviewer chỉ phục vụ kiểm tra, chưa được commit vào mã ứng dụng.

**Bàn giao tiếp:** ChatGPT sửa nốt R02 (không cần mở lại R01/R03 nếu không ảnh hưởng), cập nhật commit/CI và phép đo case cap; Codex rà vòng tiếp theo. Không tự đổi ID 23 px theo R04 và không chuyển T9 sang merge/publish.
