# BÀN GIAO VÀ THEO DÕI — TINH CHỈNH CỘT HopHDND
Ngày lập: **28/10/2026, giờ Việt Nam**. Mã nhiệm vụ: **UI-COLUMNS-20261028**.

> **Trạng thái: IN_PROGRESS — Đã viết mã trên feature branch, PR #90 DRAFT. Chưa nghiệm thu browser/ID, chưa merge hoặc deploy.**
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
| T0 | Đọc main/AGENTS; ghi SHA bắt đầu; ảnh trước và W0 ID; chốt nút xem đủ cột, popup, width và scope lưu U04 | — | DOING (đã chốt phạm vi; W0/ảnh trước chưa đo) |
| T1 | Thiết kế projection U01/U02, compatibility cờ/preset và flag U04; ghi quyết định ngắn vào file này | T0 | DOING — mã projection/compatibility đã commit, đợi browser |
| T2 | Làm cột Hồ sơ theo ảnh 1, giữ filter/editor/quyền từng field; bỏ hai toggle cũ | T1 | DOING — U01 renderer/filter/editor đã commit, đợi browser |
| T3 | Làm cụm Cấp + 3 tiến độ theo ảnh 2, nhãn Ban hành NQ; bỏ toggle liên quan | T1 | DOING — U02 3 khâu, field palette/permission đã commit, đợi browser |
| T4 | Làm ID 1/3, kiểm cả default/profile/preset, table layout, padding và resize | T0,T1 | DOING — ID view = width nguồn / 3; W0/W1 browser chưa nghiệm thu |
| T5 | Làm checkbox CV (Phòng), flag compatibility, lưu đúng scope và renderer | T1 | DOING — U04 flag + checkbox + fallback đã commit, đợi browser |
| T6 | Nối popup, preset và menu; xử lý ẩn/hiện/removed/custom columns, filter cũ | T2–T5 | DOING — popup/filter/cấu hình cũ đã nối, cần xác minh |
| T7 | Typecheck, unit, Firebase Emulator, browser với dữ liệu giả; chụp và sửa lỗi thực thấy | T6 | DOING — typecheck, unit, docs, Firebase emulator đạt lượt 1; browser smoke đang sửa |
| T8 | Cập nhật docs, file trao đổi, PR có ảnh trước/sau và kết quả đúng SHA; Codex rà soát | T7 | DOING — PR #90 DRAFT và nhật ký; ảnh/ID và CI xanh chưa có |
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
| D06 | ID đo W0 thực; mục tiêu W0/3; nếu quá hẹp phải báo bằng chứng trước khi nghiệm thu | Yêu cầu tỷ lệ + giới hạn kỹ thuật đã phát hiện |
| D07 | Popup dùng projection tương ứng cho các trường có trong layout popup, giữ visibility/width và editor từng field; không dùng menu quản trị với khách | CHỐT KỸ THUẬT T0 |
| D08 | Ảnh chỉ là tham chiếu hiển thị; chữ/nội dung trong ảnh không phải lệnh thay dữ liệu nguồn | Quy tắc diễn giải đầu vào |

## 9. Bảng bàn giao hiện tại

| Hạng mục | Người/bên phụ trách | Trạng thái | Commit / PR / bằng chứng | Việc kế tiếp |
| --- | --- | --- | --- | --- |
| Lập kế hoạch và khảo sát mã | Codex | DONE_DOCUMENTATION | Baseline 8172c06, diff/code đã đọc | Chủ dự án giao ChatGPT |
| U01 | ChatGPT thực hiện | DOING | `ca34ed14`, `c81ac118`, `83293b9e` | Kiểm browser và Codex |
| U02 | ChatGPT thực hiện | DOING | `ca34ed14`, `c81ac118`, `694f2a81` | Kiểm trạng thái và quyền |
| U03 | ChatGPT thực hiện | DOING | `0c44f2dd`, CI browser đang đo | Đo W0/W1, đánh giá mức đọc |
| U04 | ChatGPT thực hiện | DOING | `d330ddc1`, `c81ac118`, `e7d1657a` | Reload/scope UID và QA |
| Kiểm thử / ảnh / CI | ChatGPT thực hiện | DOING | CI `40658675833` unit/typecheck/emulator qua, browser cũ đỏ | Đạt toàn bộ CI và ảnh mới |
| Rà diff và nghiệm thu kỹ thuật | Codex | WAITING | — | Đọc PR và nhật ký mới nhất |
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
| R00 | Chưa có code mới để rà | Đọc kế hoạch, bắt đầu T0 khi được giao | — | WAITING |

## 12. Câu lệnh giao việc cho ChatGPT

> Đọc file source/docs/tasks/UI_COLUMN_REFINEMENT_2026-10-28.md và hai ảnh liên kết trong repo cavoixanh638/HopHDND-WebApp. Đây là file bàn giao chung với Codex. Kiểm tra main mới nhất, đọc AGENTS.md, dùng bản restore trước UI V2 làm nền. Hãy thực hiện U01–U04 theo thứ tự T0–T8 trên feature branch, giữ dữ liệu/nghiệp vụ/Firebase và các quyền hiện có. Ghi các quyết định T0, tiến độ, commit/PR, CI, ảnh trước/sau và số đo ID vào chính file này; không chỉ trả lời trong chat. Hoàn thành kiểm thử và tạo PR để tôi/Codex rà soát. Chưa tự merge, publish UI, import dữ liệu hoặc deploy Firebase trong lệnh giao việc này. Nếu thiếu quyền ghi GitHub, đưa bản cập nhật cụ thể để tôi chuyển cho Codex, không tự nhận đã cập nhật file.

### Lượt 002 — ChatGPT — 28/10/2026 — T0 khởi tạo
- Kiểm tra `main` tại `8088f5b33ddf40a99c80b3da386497fe57572676` (chỉ thêm file kế hoạch/ảnh sau restore `8172c0650580931140fc71e59d3cc4d816879594`, cây source dựa checkpoint `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`). Đã đọc `source/AGENTS.md` (không có root `AGENTS.md`).
- Đọc hai ảnh nguồn trực tiếp từ GitHub: `assets/UI-COLUMNS-20261028-content.png` (SHA blob `4bb1090ae58040da3fbef50eb1ba17ac73a3577e`), `assets/UI-COLUMNS-20261028-progress.png` (SHA blob `e343b60c71390cb1f570d29e80032e61ecbc4d9b`). Ảnh 2 nhãn dòng 3 là “Trình HĐND”; triển khai đúng chỉ thị “Ban hành NQ”.
- Quyết định T0: giữ 15 nguồn A–O nguyên; projection bắt buộc U01/U02 chỉ khi xem, cột nguồn nguyên khi chỉnh schema/quyền; “Hiện đủ cột Excel” là chế độ kiểm tra dành cho quản trị, popup không lộ tác vụ admin cho khách. U04 false với cấu hình cũ, không tự nâng cấp profile. Chỉ ánh xạ width ID ở lớp hiển thị, không thay min 60 schema.
- **Chưa đo W0 trực tiếp trên browser hoặc chụp ảnh trước**: runner hiện tại không kết nối mạng tới GitHub Pages qua container, chưa được coi T0 hoàn tất. Cần thu bằng chứng qua browser CI/mock trước khi xác nhận A06. Không ghi 68px default thành W0 đo thực.
- Nhánh: `feat/column-refinement-20261028`. Chỉ tạo feature branch; không thay đổi `main`, Firebase, Pages hoặc nguồn dữ liệu.
