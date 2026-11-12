# PR95 UI V4 — Luồng 5: Rà độc lập baseline và hồ sơ nghiệm thu (31/10/2026)

**Trạng thái:** BASELINE AUDIT COMPLETE — SOURCE-LEVEL ONLY. **Không phải V4 PASS, không phải tích hợp, không phải release GO.**

## A. Mốc và giới hạn không được đánh đồng

- Điều hành duy nhất: [PR #95 — bình luận #6539201741](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6539201741).
- Repo `cavoixanh638/HopHDND-WebApp`; nhánh gốc PR95 `feat/firebase-excel-safe-replacement-and-list-compact-20261030`.
- **Fixed baseline kiểm toán:** `89da5355a0d955f1f300f1004d25f9fc90058162`. **Mọi tọa độ file:line bên dưới tính theo đúng SHA này**, không dùng HEAD mới của L1–L4.
- Nhánh riêng: `pr95/ui-v4-l5-independent-review`; **chỉ thêm chính tài liệu này** vào `source/docs/tasks/`. Không sửa App, QA, CSS, component, domain, test/fixture chung, `CURRENT_STATE.md` hoặc workflow.
- Cách làm: đọc trực tiếp source theo SHA, đối chiếu contract, selector CSS và test hiện hữu; lập bộ dữ liệu + kết quả kỳ vọng **tự tính bằng tay**. Không chạy Chrome, không chụp ảnh/đo computed hitbox mới; các thông số CSS là **giá trị khai báo source**, chưa phải đo pixel thực nghiệm. Không đọc/ghi production, không kết luận code tương lai của bốn luồng.
- Bằng chứng lịch sử **chỉ cho baseline**: [Verify source #41165414469](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41165414469), [synthetic preview #41165414526](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41165414526), [staging #41165414503](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41165414503), [Emulator 2 tab #41165414477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41165414477) đều **SUCCESS** theo GitHub lúc kiểm toán. Không dùng chúng để ghi V4 PASS; không rerun full CI cho một file Markdown.

Quy ước: `CÓ Ở BASELINE` = source hiện có; `V4 OPEN` = việc V4 chưa có trên baseline; `GIỮ NGUYÊN` = bất biến; `RỦI RO GIAO DIỆN` = phát hiện có bước tái hiện, nhưng không sửa ngoài ownership. Các tên L1–L4 sau đây là **người chịu ownership theo phân công, không phải tình trạng hoàn thành**.

## B. Kết luận nguồn gốc và bước tái hiện — không nhầm nguyên nhân

| ID / phân loại | Bằng chứng **file:line** trên baseline | Nguyên nhân / cách tái hiện / ý nghĩa | Scope xử lý |
|---|---|---|---|
| **B01 V4 OPEN — nhãn cũ trên List** | `src/features/items/ItemList.tsx:453–479,685–689,719–748` | `compactField` dùng `item[field]` (raw) ở cả readonly và `CellPicker.value`; bảng cột rời tương tự. `displayValue` chỉ cho viết tắt tên người, **không dùng `canonicalStatus` với 4 workflow fields**. Nhập raw `VP đang thực hiện` → list vẫn in tên cũ dù báo cáo đã hiểu alias. | L1 display projection, main + standalone |
| **B02 V4 OPEN — nhãn cũ trên popup** | `src/features/reports/ReportDetailGrid.tsx:218–246,409–423` | `const raw=String(item[key]??'')` được in thẳng ở readonly và truyền `CellPicker.value={raw}` khi edit; grouped popup gọi lại `cell(item,field)` nên vẫn raw. Mở ô dữ liệu cũ từ report → popup còn chữ cũ. | L1 popup |
| **B03 V4 OPEN — menu cho raw hiện hành** | `src/data/catalogs.ts:4–9,34–38,84–92`, `src/features/items/ItemList.tsx:326–336`, `src/features/reports/pr95-l1-popup-options.ts:5–23`, `src/features/items/CellPicker.tsx:58–66,153–175` | **Catalog V3 đã canonical**, kể cả đọc profile cũ. Nhưng List `options` tự hợp `item[field]`; popup options chỉ canonical, **CellPicker lại thêm `value` raw vào `visibleOptions` khi không có trong choices** và so selected với raw. Đây là cơ chế bảo toàn dữ liệu đúng V3 nhưng cần projection V4 để alias có chữ/selected canonical mà **không tự patch**. Unknown vẫn phải còn raw, không bị xóa. | L1 phối hợp API có sẵn, không sửa CellPicker của L2 |
| **B04 V4 OPEN — demo mặc định tên cũ** | `src/data/demo-items.ts:9–10,24–41`, `src/qa/pr95-full-preview.tsx:8,68,152,224–229,302–310` | Generator mặc định sinh `VP đang thực hiện`, `ĐU đã gửi TU, chưa họp`, `Đã họp/xin phiếu, chưa có TBKL`, `Ban Chấp hành`, `BTV`, `Không phải xin ý kiến`, `Không phải trình xây dựng NQ`, `Đã trình HĐND, chưa có QĐ`, `Đã có QĐ chấp thuận`. QA lấy generator đó nên bản xem có alias cũ dù menu V3 mới. Khởi tạo 27 mẫu, mở Danh sách/popup sẽ thấy. | L4 **demo-items only**, giữ fixture legacy riêng |
| **B05 CÓ Ở BASELINE — bộ từ điển** | `shared/field-definitions.ts:26–43`; `src/domain/status-contract.ts:9–82` | 4 menu canonical đúng và theo thứ tự. `canonicalStatus` là **read-only**, alias theo đúng field, unknown còn nguyên; `partyLevel` không phải StatusField của backend. Không cần migrate Firebase/profile/Excel để sửa nhãn xem. | GIỮ NGUYÊN |
| **B06 CÓ Ở BASELINE — số liệu/lọc** | `src/domain/report-workflow.ts:7–15`; `src/domain/reporting.ts:7–20,28–48,53–81`; `src/domain/item-summary.ts:14–29,30–58`; `src/features/items/list-toolbar-filters.ts:49–71,81–92` | Các report, thẻ 4–4–3 và lọc chi tiết đã áp alias theo field; `Bước tiếp theo` chỉ nhãn bucket Thành ủy (ba mốc), không phải Item value. Unknown không tự completed, blank báo cáo về Sở chưa trình. **Không sửa công thức để giải quyết display.** | GIỮ NGUYÊN, test sau ghép |
| **B07 V4 OPEN — caret chạy sát chữ** | `src/features/items/CellPicker.tsx:153–176`; `src/styles/app.css:1096–1111,1667–1669`; `src/features/items/item-frame.css:1049–1058,1073–1076` | Chevron **không phải icon JSX**: CSS `button.cell-picker-trigger::after` tạo bằng hai cạnh border quay 45°. Với grouped stage, `::after` chỉ `margin-left:5px` sau chuỗi; **chưa có fixed rail/auto-left**. Dài/ngắn khác nhau → vị trí tương đối với mép phải không ổn định. Popup legacy dùng `width:max-content`; grouped CSS rộng 100% nhưng `justify-content:flex-start` và caret vẫn bám sau text. | L2 caret column |
| **B08 V4 OPEN — dấu chấm trạng thái** | `src/features/items/item-frame.css:839–866`, `src/styles/app.css:1357–1369,1422–1425`, `src/features/items/item-frame.css:1027–1045` | Dấu 6×6px được sinh bởi `.compact-stage-state[data-progress-tone]::before` (grouped). Một dấu khác bởi `.workflow-status-value::before` (standalone readonly); override tại `item-frame.css:1042–1045` chỉ ẩn **dấu của child** trong grouped, không ẩn dot của **parent state**. Tái hiện ô tiến độ có tone. Không nhầm với số ①②③, dấu chưa lưu, selected ✓. | L2 chỉ đúng status dot |
| **B09 V4 OPEN — hitbox/hover** | `src/features/items/CompactGroupedValue.tsx:53–75`; `src/features/items/item-frame.css:803–832,839–870,1027–1086`; `src/styles/app.css:1097–1118,1661–1711,1718–1756,1780–1796,1934–1940,2482–2495` | Frame cả khâu là `.compact-stage-row`; hai vùng **riêng biệt** `.compact-stage-level` (cấp) và `.compact-stage-state` (tiến độ). Nút con hiện bị nhiều rule hover/size khác nhau; trạng thái grouped override về `padding:0`/background transparent và chỉ tô frame khi hover nút. **Yêu cầu mới:** toàn bộ vùng **giá trị của đúng field** là hit target, không phải toàn hàng; giữ một frame ngoài + hover/focus có chủ đích. | L2 CSS/CellPicker/CompactGroupedValue |
| **B10 CÓ Ở BASELINE — tránh click nhầm field** | `src/features/items/activate-editable-cell.ts:7–24`; `src/features/items/ItemList.tsx:453–477,679–689`; `src/features/reports/ReportDetailGrid.tsx:226–246,409–423` | Click trống trên `td` chỉ forward nếu **đúng 1** editor; merged cell có nhiều editor thì không đoán. Cấp nằm **trong label** của progressParty, tiến độ ở state sibling. Giữ giới hạn; cấm biến cả row thành button. | GIỮ NGUYÊN, nghiệm thu L2 |
| **B11 CÓ Ở BASELINE — quyền, patch/lease/save** | `src/data/firebase-repository.ts:31–32,95–106,114–145`; `src/app/App.tsx:353–368,630,640–648,670–687`; `src/state/use-workspace.ts:122–169,180–202`; `src/features/items/CellPicker.tsx:41–43,75–80,163–173` | Quyền xác định **theo field**; lease `(recordId,field)` trước mở, chỉ `onChange` khi chọn khác value; update tập `changes` gồm field được sửa, lưu kiểm quyền/epoch/CAS và chỉ audit sau ACK. Render/click mở/đóng không phải patch. Guest grant/deny không được đổi bởi overlay. | GIỮ NGUYÊN |
| **B12 CÓ Ở BASELINE — source/export/history** | `src/data/gviz-parser.ts:65–99`; `src/data/business-excel.ts:130–140,153–166`; `src/data/excel-transfer.ts:5–35,90–109`; `src/data/firebase-repository.ts:123–140,151–154`; `src/features/history/HistoryDialog.tsx:7–13,23–53` | F–I Excel giữ nguyên chuỗi cũ khi nhập; parser và export lấy **Item raw**, `recordId/displayCode/stt` nguyên. Lịch sử phản ánh thay đổi đã lưu, không ghi projection. Đây là bất biến nghiêm ngặt, không phải lỗi tên cũ. | GIỮ NGUYÊN |
| **B13 V4 OPEN — mã khu vực** | `src/app/App.tsx:544–576`; `src/qa/pr95-full-preview.tsx:21–31,159–194`; `src/features/items/ItemSummaryCards.tsx:9–25,53–74`; `src/features/items/ItemList.tsx:571–628,677–689`; `src/features/reports/ReportDetailGrid.tsx:253–254,380–423` | Gear admin/guest và hai nav cards đã có. **Chưa có toggle “Hiện mã khu vực”, registry/overlay theo contract UI V4**; mặc định ẩn đúng mới cần làm. Đường vào gear **chỉ admin**; logout/mất quyền tắt. Tránh thêm mã vào value/Excel/aria nghiệp vụ. | L3 registry+overlay+toggle |
| **B14 RỦI RO GIAO DIỆN — report R01–R05 chưa có DOM key semantic** | `src/domain/reporting.ts:7–20`; `src/features/reports/ReportTable.tsx:130–133`; `src/app/App.tsx:635`; `src/qa/pr95-full-preview.tsx:221` | `config.id` có `party/build/council/nq/bc`, nhưng `<section class="report-surface...">` không đưa id này ra `data-*` trong DOM; React `key` cũng không phải attribute. Không dùng vị trí thứ n, title có thể đổi. L3 **được phép thêm data anchor** tại ReportTable nếu thực sự cần, giữ tên selector và props khác. | L3; ghi rõ trên bước tích hợp |
| **B15 RỦI RO GIAO DIỆN — copy tĩnh còn chữ cũ** | `src/app/App.tsx:632` (KPI “VP đang thực hiện”); `src/data/status-palettes.ts:9–13` (tên/mô tả palette) | Đây là **nhãn UI tĩnh khác** với bốn giá trị source. Nếu chủ dự án còn thấy chữ cũ ngoài ô, tái hiện tại KPI Báo cáo và mô tả màu (khi admin mở palette). Gói L1 V4 **không sở hữu App/palette**; không lợi dụng audit để sửa vượt phạm vi. Có thể để reviewer tích hợp xác nhận có cần yêu cầu thay copy riêng không. | ĐIỂM CẦN RÀ SAU GHÉP; không tự giao thêm việc |

### B.1. Hợp đồng hiển thị mới phải nằm ở ranh giới thích hợp

`F–I / Item raw` → `canonicalStatus(field, raw)` **để hiển thị biết alias** → `ItemList.compactField / standalone` hoặc `ReportDetailGrid.cell` → `CellPicker.value` / `displayValue` / menu selected → **chỉ khi người dùng chọn giá trị KHÁC** mới `onChange` → `App.updateDataDraft` → `workspace.update` → lease, quyền, CAS, xác nhận và audit → `createExcel` xuất raw đã lưu.

Không biến projection thành `setItems`, autosave, import, migration profile/RTDB. Với raw alias `VP đang thực hiện`, có thể hiển thị `VP đang xử lý` nhưng giá trị nguồn vẫn phải là `VP đang thực hiện` **đến khi người dùng thực sự đổi lựa chọn**. Unknown giữ giá trị cũ cả trên màn và nếu có chọn trong menu, không đưa vào danh mục chính thức của workflow.

## C. Bốn menu và bảng alias đã được baseline xác nhận

| Field / Excel | Menu chuẩn **đúng thứ tự** | Bằng chứng |
|---|---|---|
| `partyLevel` / F | TTTU · BTV TU · BCH · Không phải trình | `shared/field-definitions.ts:30–32` |
| `progressParty` / G | Không phải trình · Sở chưa trình · VP đang xử lý · Đã gửi ĐU · ĐU gửi TU, chưa họp · Đã xin ý kiến, chờ TBKL · Đã có TBKL | `shared/field-definitions.ts:33–37` |
| `progressBuild` / H | Không phải trình · Sở chưa trình · VP đang xử lý · Đã trình, chờ QĐ · Đã có QĐ | `shared/field-definitions.ts:38–41` |
| `progressCouncil` / I | Sở chưa trình · VP đang xử lý · Hoàn thành | `shared/field-definitions.ts:42` |

| Raw/legacy đầu vào | Field | Canonical hiển thị kỳ vọng | Line cho phép |
|---|---|---|---|
| Ban Chấp hành; Ban Chấp hành Thành ủy | partyLevel | BCH | `status-contract.ts:10–11` |
| Ban Thường vụ Thành ủy; BTV; BTVTU | partyLevel | BTV TU | `status-contract.ts:12,14–15` |
| Thường trực Thành ủy | partyLevel | TTTU | `status-contract.ts:13` |
| Không phải xin ý kiến; Không xin ý kiến; Không | partyLevel | Không phải trình | `status-contract.ts:16–18` |
| VP đang thực hiện; Văn phòng đang thực hiện | progressParty | VP đang xử lý | `status-contract.ts:21–22` |
| ĐU đã gửi TU, chưa họp; ĐU đã gửi TU chưa họp | progressParty | ĐU gửi TU, chưa họp | `status-contract.ts:23–24` |
| Đã họp/xin phiếu, chưa có TBKL; Đã họp/xin phiếu chưa có TBKL; Đã họp, chưa có TBKL; Đã họp chưa có TBKL | progressParty | Đã xin ý kiến, chờ TBKL | `status-contract.ts:25–28` |
| Không phải xin ý kiến; Không xin ý kiến; Không phải trình xin ý kiến Thành ủy; Không phải trình Thành ủy | progressParty | Không phải trình | `status-contract.ts:29–32` |
| VP đang thực hiện; Văn phòng đang thực hiện | progressBuild | VP đang xử lý | `status-contract.ts:35–36` |
| Không phải trình xây dựng NQ | progressBuild | Không phải trình | `status-contract.ts:37` |
| Đã trình HĐND, chưa có QĐ; Đã trình, chưa có QĐ | progressBuild | Đã trình, chờ QĐ | `status-contract.ts:38–39` |
| Đã có QĐ chấp thuận | progressBuild | Đã có QĐ | `status-contract.ts:40` |
| VP đang thực hiện; Văn phòng đang thực hiện | progressCouncil | VP đang xử lý | `status-contract.ts:43–44` |
| Đã trình HĐND thành phố; Đã trình HĐND TP; Đã trình HĐND | progressCouncil | Hoàn thành | `status-contract.ts:45–49` |
| TU đã cho ý kiến; Đã báo cáo TU | progressParty | **Giữ nguyên unknown**, không done | `status-contract.ts:69–76` |
| Đã trình - chờ ký (không được định nghĩa) | progressCouncil | **Giữ nguyên unknown**, không done | `status-contract.ts:45–49,69–79` |
| Chuỗi trống | tất cả 4 field | Không tự invent menu; `canonicalStatus` trả `''`. **Chỉ aggregation report** cho blank về Sở chưa trình để tính mẫu số. | `status-contract.ts:73–76`, `reporting.ts:28–31` |

**Không được** áp alias xuyên field: `Đã trình HĐND` chỉ là terminal trong `progressCouncil`, không tự hoàn thành `progressBuild`. `Không phải trình` là excluded với Party/Build (`report-workflow.ts:12`), tuyệt đối không xanh “done”.

## D. Fixture nghiệm thu **tính tay, độc lập** (không chạm demo/production)

Fixture mã `T-NQ01…` là ký hiệu trong tài liệu. Khi hiện mã vùng dùng **mã hiển thị thực của fixture**, ví dụ có thể nhập `NQ02`/ `BC03`; không nhầm STT thành ID. Mỗi dòng được dựng rõ `recordId` duy nhất, `displayCode` như dưới, `stt` dương, `revision=1`, `isDropped=false`, `archivedAt=null` trừ khi ghi khác; các trường khác chuỗi hợp lệ synthetic.

| ID hiển thị | Kind/type | partyLevel RAW → display | progressParty RAW → display | progressBuild RAW → display | progressCouncil RAW → display |
|---|---|---|---|---|---|
| NQ01 | NQ/QPPL | Ban Chấp hành → **BCH** | VP đang thực hiện → **VP đang xử lý** | Đã trình HĐND, chưa có QĐ → **Đã trình, chờ QĐ** | VP đang thực hiện → **VP đang xử lý** |
| NQ02 | NQ/HC | BTV → **BTV TU** | ĐU đã gửi TU, chưa họp → **ĐU gửi TU, chưa họp** | Đã có QĐ chấp thuận → **Đã có QĐ** | Đã trình HĐND TP → **Hoàn thành** |
| NQ03 | NQ/QPPL | Thường trực Thành ủy → **TTTU** | Đã họp/xin phiếu, chưa có TBKL → **Đã xin ý kiến, chờ TBKL** | Sở chưa trình → **Sở chưa trình** | Sở chưa trình → **Sở chưa trình** |
| NQ04 | NQ/HC | Không phải xin ý kiến → **Không phải trình** | Không phải xin ý kiến → **Không phải trình** | Không phải trình xây dựng NQ → **Không phải trình** | Hoàn thành → **Hoàn thành** |
| NQ05 | NQ/HC | BCH → **BCH** | TU đã cho ý kiến → **unknown, giữ nguyên** | VP đang thực hiện → **VP đang xử lý** | Đã trình - chờ ký → **unknown, giữ nguyên** |
| BC03 | BC/BC | Không phải trình → **Không phải trình** | Không phải trình → **Không phải trình** | Không phải trình → **Không phải trình** | Sở chưa trình → **Sở chưa trình** |
| NQ07 | NQ/QPPL | TTTU → **TTTU** | trống → **trống ở ô**, report coi source | Đã trình, chờ QĐ → **Đã trình, chờ QĐ** | trống → **trống ở ô**, report coi source |
| NQ06 | NQ/HC | BCH | Đã có TBKL | Đã có QĐ | Hoàn thành · **isDropped=true**, không trong thống kê |
| BC04 | BC/BC | Không phải trình | Không phải trình | Không phải trình | Hoàn thành · **archivedAt khác null**, không trong thống kê |

**Oracle tổng/bucket tính tay** (không gọi `summarizeListItems` để tính đáp án):

| Scope | Tổng | Sở chưa trình | VP đang xử lý | Bước kế / đã trình chờ QĐ | Hoàn thành | Unknown | Tỷ lệ |
|---|---:|---|---|---|---|---|---:|
| Total active | **7** = NQ **6** (QPPL **3**, HC **3**) + BC **1** | — | — | — | — | — | — |
| Thành ủy / C01 | **5** | **1** NQ07 | **1** NQ01 | **2** NQ02, NQ03 | **0** | **1** NQ05 | **0%** |
| Xây dựng NQ / C02 | **5** | **1** NQ03 | **1** NQ05 | **2** NQ01, NQ07 | **1** NQ02 | **0** | **20%** |
| Ban hành NQ / C03 | **6** | **2** NQ03, NQ07 | **1** NQ01 | Không có bucket này | **2** NQ02, NQ04 | **1** NQ05 | **33%** (2/6 làm tròn) |
| NQ+BC / R03 | **7** | **3** NQ03, NQ07, BC03 | **1** NQ01 | Không có bucket này | **2** NQ02, NQ04 | **1** NQ05 | **29%** (2/7 làm tròn) |
| BC / R05 | **1** | **1** BC03 | **0** | — | **0** | **0** | **0%** |

- Bấm C01.3 phải trả chính xác **[NQ02,NQ03]**; vẫn in nhãn chi tiết riêng tại từng hàng, không “Bước tiếp theo” trong source/editor. C02.3 trả **[NQ01,NQ07]**; đây là **chờ QĐ**, không hoàn thành. C03.3 trả **[NQ02,NQ04]**. Đối chiếu `count===số ID distinct trong filter` cho mỗi bucket, loại dropped/archived.
- Blank raw `NQ07.progressParty` và `NQ07.progressCouncil` không được tự ghi `Sở chưa trình`. Chỉ report/summary đưa vào source bucket theo `normalizeReportStatus`.
- Khi **zero rows**: tổng/bucket 0, domain `percent=null`; UI có thể hiển thị 0% nhưng không `NaN`/`Infinity`; không tự thêm record.
- Hoán đổi ID/STT mà giữ `displayCode` và raw source khác là kịch bản kiểm tra projection mã vùng khác với id nội bộ; không tự dùng `rowIndex`/STT làm mã nghiệp vụ.

### D.1. Bộ thử tương tác + kết quả kỳ vọng (chưa chạy V4)

1. **Open/close an toàn:** nạp `NQ01.progressParty='VP đang thực hiện'`; nhìn thấy `VP đang xử lý` ở List và popup, trigger `aria-label` hữu ích, selected canonical; mở, Esc/đóng ngoài → **0 onUpdate, 0 Patch, 0 source/history write**, raw vẫn nguyên. Thử `NQ05` unknown vẫn được giữ nguyên và không tự completed.
2. **Thay đúng field:** admin hoặc guest được cấp `(NQ01,progressBuild)`; chọn `Đã có QĐ` → đúng **1 patch field progressBuild**, không đổi `progressParty`, `partyLevel`, `displayCode`, `stt`. Chọn giá trị giống raw ban đầu → **0 patch**. Backend/Emulator nghiệm thu riêng, không lấy QA RAM làm auth thật.
3. **Hai field cùng dòng:** tại NQ01 click **BCH** trong `.compact-stage-level` → editor `partyLevel`; click phần trạng thái bên phải khâu Thành ủy → editor `progressParty`. Click nhãn “Thành ủy”, số thứ tự 1 hoặc khoảng trống ngoài giá trị → **không tự mở sai**. `activateEditableCell.ts:16–23` ngăn đoán khi nhóm có nhiều editor.
4. **Quyền và revoke:** grant chỉ NQ01.progressParty, NQ01.note, NQ01.specificProgress; khách thấy caret chỉ tại đúng select được grant, các ô khác plain read-only; note/current progress vẫn sửa được. Thu hồi khi đang mở/chuẩn bị save phải fail-closed, lease hết/epoch đổi không save; `src/data/firebase-repository.ts:100–106`.
5. **Optional clear:** `department`/`room`/`specialist`/`vpLeader`/`ubndLeader`/`type` được hiển thị lựa chọn xóa nếu thuộc optional assignment; status 3 field, partyLevel và isDropped **không** được bịa thêm lựa chọn trống. `CellPicker.tsx:8–20,62–66`.
6. **Visual 3 hàng:** dựng ba raw độ dài khác nhau trong **cùng một cột**: Sở chưa trình; VP đang thực hiện (display VP đang xử lý); Đã họp/xin phiếu, chưa có TBKL (display Đã xin ý kiến, chờ TBKL). Sau V4, đo `caret.getBoundingClientRect().right` ở cả ba: cùng mép phải trong sai số CSS anti-alias chấp nhận **≤2px**, hit target là phần giá trị từ mép trái đến mép phải, không chỉ chữ và tam giác. Kiểm cột hẹp/desktop 1440, 1280, mobile 390, trong popup và custom palette.
7. **Dot/frames:** computed pseudo `.compact-stage-state::before` và grouped readonly `.workflow-status-value::before` không render dot; không xóa số khâu 1/2/3, dấu pending, lịch sử hay ✓ đang lọc. Mỗi khâu có một outer `.compact-stage-row` tone; không có border/pill nền lồng ở child/button. Focus-visible/hover rõ nhưng không tạo permission giả.
8. **Palette/highlight:** chọn custom text/background tại `status-palettes.ts:18–26,97–115`, bật/tắt `otherEnabled` và highlight một member. Chỉ field đó đổi màu; readonly completed vẫn flat, không thừa dot; report và main không được overwrite local palette. `CompactGroupedValue.tsx:23–35`, `item-frame.css:884–902,1077–1083`.
9. **Keyboard và popup:** Tab tới trigger, Enter/Space mở, ArrowUp/Down chọn, Enter kích hoạt, Esc đóng trả focus; `CellPicker.tsx:118–146,153–215`. Choices-only menu không thêm heading `Xây dựng NQ · NQ02`, vẫn có `aria-label` và `aria-selected`.
10. **Source identity:** sau tất cả thao tác chỉ xem, `JSON.stringify(Item)`, Excel A–O F–I, ID/STT và lịch sử không đổi. Sau edit có chủ đích chỉ patch đúng field, không migrate tự động những dòng khác. Bảng `reporting`, bộ lọc và `filterListBySummary` tiếp tục cùng tập ID.

## E. Bảng tra mã khu vực **đúng contract khóa của L3** (không tự cài đặt)

Mã có tính **ngữ nghĩa**, không phụ thuộc vị trí cột, chiều rộng, STT hay tên báo cáo người dùng sửa. Cùng ý nghĩa ở Danh sách và popup; khi có ô cụ thể dùng mã + **ID hiển thị** (ví dụ `L03.2, NQ02`). Không dùng `recordId` nội bộ/row index để thay tên hồ sơ người dùng nhìn thấy.

| Mã | Ý nghĩa | Neo baseline đã có (file:line) / lưu ý |
|---|---|---|
| **A01** | Báo cáo tổng hợp | `App.tsx:564–575` button `page=overview`; QA `pr95-full-preview.tsx:166–174` `reports`. |
| **A02** | Danh sách | Cùng nav, `page=items`; QA `items`. |
| **A03** | Nút gear | `App.tsx:544–561` `.options-menu.v3-settings-menu`; QA `pr95-full-preview.tsx:176–192` `.pr95-preview-gear`. |
| **B00** | Tổng nội dung | `ItemSummaryCards.tsx:53–59` `[data-summary-card=total]`. |
| **B01** | NQ QPPL | `ItemSummaryCards.tsx:60–74` `[data-summary-kind=qppl]`. |
| **B02** | NQ HC | `[data-summary-kind=hc]` tại cùng đoạn. |
| **B03** | BC | `[data-summary-kind=bc]` tại cùng đoạn. |
| **C01** | Thẻ tiến độ Thành ủy | `ItemSummaryCards.tsx:9–25,77–78`, `data-summary-card=party`. |
| **C01.1 / .2 / .3 / .4** | Sở chưa trình / VP đang xử lý / **Bước tiếp theo** / Đã có TBKL | `data-summary-report=party` + `data-summary-stage=source/office/next/completed`; `item-summary.ts:14–19`. |
| **C02** | Thẻ Xây dựng NQ | `data-summary-card=build`. |
| **C02.1 / .2 / .3 / .4** | Sở chưa trình / VP đang xử lý / **Đã trình, chờ QĐ** / Đã có QĐ | `data-summary-report=build` + `data-summary-stage=source/office/next/completed`; `item-summary.ts:20–24`. |
| **C03** | Thẻ Ban hành | `data-summary-card=nq`. |
| **C03.1 / .2 / .3** | Sở chưa trình / VP đang xử lý / Hoàn thành | `data-summary-report=nq` + `data-summary-stage=source/office/completed`; `item-summary.ts:25–28`. |
| **F01** | Tìm kiếm | `ItemList.tsx:572–576`, `.list-filter-search`. |
| **F02** | Lọc Sở/ngành | `ItemList.tsx:577–582`, `.list-filter-organisation[aria-label="Lọc Sở, ngành"]`. |
| **F03** | Lọc Phòng | `ItemList.tsx:583–588`, `aria-label="Lọc Phòng"`. |
| **F04** | Lọc khác | `ItemList.tsx:589–609`, `.list-filter-other`. |
| **F05** | Xóa lọc | `ItemList.tsx:611–614`, `.list-filter-clear`. |
| **L00** | Bảng List | `ItemList.tsx:628,677–710`, `.item-data-table`. |
| **L01** | ID | `ItemList.tsx:708–710`, `td[data-col-key=displayCode]`; `displayId(item)` là mã đang xem. |
| **L02** | Nội dung trình | `CompactGroupedValue.tsx:36–51`, member `content`; `item-preferences.ts:44–46`. |
| **L03** | Tiến độ 3 khâu | `compact-columns.ts:133–145` pair `partyTogether`; `CompactGroupedValue.tsx:53–75`. |
| **L03.1** | Thành ủy | `[data-stage-field=progressParty]` + `partyLevel` là **member riêng trong label**, không đổi field tiến độ. |
| **L03.2** | Xây dựng NQ | `[data-stage-field=progressBuild]`; `CompactGroupedValue.tsx:55–57,61–73`. |
| **L03.3** | Ban hành | `[data-stage-field=progressCouncil]`. |
| **L04** | Lãnh đạo / Phòng / CV | `compact-columns.ts:112–119,146–152`; `CompactGroupedValue.tsx:77–103`. |
| **L05** | Tiến độ hiện tại | `ItemList.tsx:729–732`, field `specificProgress`, raw Excel N. |
| **L06** | Ghi chú | `ItemList.tsx:725–729`, field `note`, raw Excel O. |
| **P00** | Cửa sổ báo cáo chi tiết | `ReportDetailGrid.tsx:253–254,380–381`, `.report-grid-modal`, bảng `.report-detail-grid`. |
| **P01 / P02** | ID / Nội dung | `ReportDetailGrid.tsx:218–225,381–423`, `data-col-key=displayCode` và `content` (có thể gộp). |
| **P03** | Tiến độ 3 khâu trong popup | `ReportDetailGrid.tsx:409–423` tái sử dụng `CompactGroupedValue`. |
| **P03.1 / .2 / .3** | Thành ủy / Xây dựng NQ / Ban hành | Các `data-stage-field=progressParty/progressBuild/progressCouncil` trong grouped popup. Nếu popup đang trình bày cột rời thì bám `td[data-col-key]` cùng **field**, không suy từ cột thứ 3. |
| **P04 / P05 / P06** | Lãnh đạo/Phòng/CV / Tiến độ hiện tại / Ghi chú | `ReportDetailGrid.tsx:409–425`, các member hoặc `td[data-col-key=...]`. |
| **R01** | Báo cáo Thành ủy `party` | `reporting.ts:8–10`, `ReportTable.tsx:130–133`; chưa có `data-report-id` DOM baseline. |
| **R02** | Báo cáo xây dựng NQ `build` | `reporting.ts:11–13`; định danh từ `config.id`, không vị trí thứ 2. |
| **R03** | Báo cáo NQ+BC `council` | `reporting.ts:14–16`; không nhầm với R04. |
| **R04** | Báo cáo ban hành NQ `nq` | `reporting.ts:17–18`. |
| **R05** | Báo cáo ban hành BC `bc` | `reporting.ts:19–20`. |

**Cách người dùng gửi phản hồi:** `C02.3` = chip “Đã trình, chờ QĐ” trong thẻ xây dựng NQ; `L03.2, NQ02` = khâu Xây dựng NQ của hồ sơ NQ02 trên List; `P03.3, BC03` = khâu Ban hành của BC03 trong popup. Mã vùng không tự xuất thành một “giá trị trạng thái”; chỉ hiện khi **admin** bật “Hiện mã khu vực”, mặc định OFF.

**L3 cần chú ý:** baseline chưa có `data-report-id` ở ReportTable; React `key={config.id}` không lộ trong DOM. Thêm anchor ổn định ở đúng file L3 được quyền nếu cần. Ở bảng gộp nếu đổi thứ tự/ẩn cột, `compact-columns.ts:127–163` có thể đổi **anchor hiển thị**, vì vậy code phải theo `memberFields/data-stage-field`/field key; đừng dùng `nth-child`. Mỗi `tr` React dùng `key={recordId}` nhưng key không lộ DOM; để hiển thị mã người dùng dùng `displayId` ở ID cell và xử lý mã trùng cẩn thận (`ItemList.tsx:708–709`).

## F. Checklist nghiệm thu sau ghép — **mọi mục chưa thực hiện ở L5: NOT TESTED ON V4**

### F1 — L1: canonical display trên List/popup

- [ ] Mọi nhãn chuẩn đúng **4 field** tại List, popup **read-only, edit trigger, selected menu, option text, accessible label**. Giá trị alias tại §C và fixture §D hiện tên mới đúng trường.
- [ ] Unknown `TU đã cho ý kiến`, `Đã trình - chờ ký` hiện nguyên, không tự đánh dấu completed; blank hiển thị blank/placeholder hợp lệ, không mutate.
- [ ] Chỉ mở/đóng/hover/Esc **0 patch**, export/history và `Item` raw bất biến. User đổi lựa chọn mới → đúng field và một patch, không đổi ID/STT hoặc field cạnh.
- [ ] Popup giữ `popupFieldOptions` và `CellPicker` API; không để `selectedIsFilteredOut` reintroduce một alias đã được canonical trong official menu. Nhãn unknown vẫn truy cập/chọn được.

### F2 — L2: caret rail, dot, hit area

- [ ] Caret của **ít nhất ba hàng** dài/ngắn trong **cùng cột** thẳng mép phải (đo geometry, sai lệch ≤2px) ở 1440/1280/mobile/popup.
- [ ] Bấm mép trái, giữa và phải của **giá trị** đều mở đúng field; chỉ đọc không có caret, hover giả hay button; click cấp không mở progress, click nhãn stage không mở nhầm cấp.
- [ ] Xóa đúng chấm status ở parent `.compact-stage-state::before` và readonly `.workflow-status-value::before`, nhưng giữ số 1/2/3, icon lịch sử, pending và selected check.
- [ ] Một frame/color surface cho grouped stage, không có pill nested. Tonal fill và custom palette/highlight từng member còn; hover/focus-visible/aria/selected/keyboard/lease/clear optional đúng.

### F3 — L3: code overlays chỉ cho admin

- [ ] Default OFF ở **App thật và full synthetic preview**. Chỉ admin thấy switch `Hiện mã khu vực` trong gear; guest/Google non-admin/loading/error không thấy; logout/revoke đóng/tắt overlay.
- [ ] Mã đúng §E: A/B/C/F/L/P/R và bucket subcodes đúng thứ tự; cặp code + ID người dùng đang nhìn thấy; R01..R05 ổn định bằng `config.id`, không theo sort/title.
- [ ] Overlay/tooltip **không đổi value/aria/export/history**, không che chữ/caret, `pointer-events:none` khi cần; không thay layout chiều rộng/cột. Scroll/resize/reorder/filter/popup vẫn bám đúng member; cleanup khi đóng.
- [ ] Không thêm field Firebase, profile hoặc Excel; không ghi cloud chỉ để bật marker.

### F4 — L4: demo fixture chuẩn, nhưng vẫn có test legacy

- [ ] `createDemoItems` mặc định **không còn raw alias cũ** ở bốn field; giữ 27 IDs, display codes, STT, type/kind, isDropped, archived, ý nghĩa giai đoạn và tổng/bucket/filter IDs tương đương baseline.
- [ ] Legacy + unknown + blank trong **fixture test riêng có tên**, kiểm canonical projection vẫn giữ raw; không mất coverage vì làm đẹp demo.
- [ ] Main demo, 5 report, popup, Excel A–O đều từ component/domain thật, không hardcode số. Không lưu browser/cloud production, không publish worker.

### F5 — hồi quy quan trọng và nghiệm thu bản tích hợp (chỉ Codex/lượt ghép cuối)

- [ ] Exact 5 delta ghép từ same baseline, giữ tất cả tests/hunks; typecheck, unit, Chrome computed CSS/click/focus, Emulator permission/lease/ACK/Firebase-only trên **exact integrated SHA**, có ảnh admin/guest trước–sau.
- [ ] Tổng NQ QPPL/NQ HC/BC, 4–4–3 buckets và năm báo cáo count=filter IDs. `Bước tiếp theo` chỉ aggregate, `Đã trình, chờ QĐ` ≠ `Đã có QĐ`, `Không phải trình` excluded, unknown không done, zero không NaN.
- [ ] Guest gear chỉ login admin; guest vẫn tìm/lọc/sort và chỉnh **mọi field được grant**, gồm `note`/`specificProgress`; admin tools/Excel không xuất hiện ở guest, role transition không để controls rò.
- [ ] Raw source/Excel A–O, ID/STT, lịch sử, quyền hàng/cột/ô, CAS/lease/generation/freeze được giữ, không convert dữ liệu source hàng loạt.
- [ ] Xác nhận nhãn tĩnh `App.tsx:632` và `status-palettes.ts:9–13` nếu còn gây hiểu lầm (đây là **điểm phát hiện ngoài source ownership L1 V4**, không tự sửa trong L5).
- [ ] Chỉ sau review và phê duyệt riêng mới cập nhật preview synthetic; không merge main/publish/deploy Firebase/ghi production ở worker.

## G. Bằng chứng kiểm độc lập và trạng thái bàn giao

**ĐÃ KIỂM TĨNH trên baseline:** `source/AGENTS.md`, exact PR95 V4 directive, source definition/status contract, catalogs/demo generator, domain báo cáo/summary/filter/visual tone, List + popup + CellPicker + CompactGroupedValue, app.css + item-frame.css + cell-picker.css, route/menu App và QA, parser Excel/gviz/Firebase repository/workspace, permission/lease/save/history và existing V3 tests (ví dụ `tests/pr95-ui-v3-l3-status-contract.test.ts:33–225`, `tests/pr95-ui-v3-l1-popup-status.test.ts:19–57`, `tests/pr95-ui-v3-l5-preview-shell.test.ts:7–49`). Mọi trích dẫn đều là line từ baseline.

**CHƯA KIỂM / KHÔNG NHẬN LÀM:** không có CSS computed/screenshot browser riêng, không có test V4 thực chạy, không đo hitbox, không xác nhận 4 branch khác đã sửa, không nghiệm thu candidate, không quyền release. PASS lịch sử của baseline chỉ xác nhận hành vi V3 đã kiểm khi đó.

**Điểm mới có bước tái hiện:** B01+B02 raw display, B03 menu raw selection, B04 generator legacy, B07 caret bám chữ, B08 dot parent chưa loại, B09 hitbox bị CSS cạnh tranh, B14 report thiếu semantic DOM id, B15 label KPI/palette tĩnh còn chữ cũ. Ownership theo bảng, **không tự sửa sản phẩm**.

**Bàn giao độc lập:** đúng một file tài liệu mới; review/PR Draft base PR95; không tích hợp, deploy, publish hoặc dùng Firebase production. **Không chờ ACK hay commit của L1–L4 để gọi audit complete.**
