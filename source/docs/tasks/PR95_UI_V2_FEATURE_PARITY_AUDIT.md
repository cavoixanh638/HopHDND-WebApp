# PR95 / UI V2 — LUỒNG 5: FEATURE PARITY AUDIT (fixed baseline)

**Ngày:** 2026-10-30. **Trạng thái:** AUDIT COMPLETE ON FIXED SOURCE, integration/runtime acceptance NOT PROVEN. **Không phải release GO.**

## 0. Căn cứ, điều kiện và phương pháp

- Quyết định điều hành bắt buộc: [PR95 comment 6524352700](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6524352700), thay hai phân công UI cũ.
- Repository: `cavoixanh638/HopHDND-WebApp`.
- **Fixed baseline (mọi file:line dưới đây):** `31c5117c6ec97a310c4214ea076328d3561f8d9b`. Không dùng HEAD của L1–L4.
- **Nguồn để so tính năng trước V2:** main `0129ad1fbf8972fd16491fb0eaa3d3699ef8c4ca`.
- **Nhánh audit:** `pr95/ui-v2-l5-parity-audit-20261030`, tách trực tiếp baseline; không cherry-pick nhánh khác.
- **Scope ghi mã:** đúng **duy nhất** file mới `source/docs/tasks/PR95_UI_V2_FEATURE_PARITY_AUDIT.md`. Không chỉnh App, QA, CSS, Rules, RTDB, test legacy hoặc tài liệu cũ.
- **Kiểu kiểm chứng:** đọc thực tế source cả hai SHA, đối chiếu component props / guard / API, đối chiếu unit-test oracle và kết quả CI *có sẵn của baseline*. Đây là audit tĩnh; không mô phỏng giả kết quả trình duyệt/live, không kết nối Firebase production.
- **CI có sẵn cho đúng baseline** (đọc kết quả, **không rerun**): [Verify source #41047282615](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41047282615), [Firebase staging #41047282667](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41047282667), [ACK-loss #41047282751](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41047282751), [operational QA #41047282695](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41047282695), [two admin Chrome tabs #41047282676](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41047282676): đều GitHub ghi **SUCCESS** tại thời điểm kiểm tra. Điều này chứng minh các workflow của baseline, **không chứng minh App thật trên cloud đã mở mọi đường vào hoặc bản demo đủ màn**.
- **Phân loại:** `CÒN` = tồn tại đường vào + mã hiện có trên baseline; `THIẾU DEMO` = có ở App/source nhưng QA standalone thiếu; `CỐ Ý BỎ` = yêu cầu quyết định không hồi sinh; `BỊ KHÓA` = guard theo quyền/môi trường/freeze là chủ ý; `LỖI THẬT / OPEN` = mã và đường vào baseline không khớp nhu cầu đã chốt; `MỚI / L1` = yêu cầu UX V2 chưa có nhưng **không gọi là regression của main**; `NOT PROVEN` = có API/code nhưng chưa có chứng cứ chạy App thật/production. Có thể ghi hơn một nhãn cho một tính năng.

### Ký hiệu đường dẫn

Tất cả đường dẫn sau tính từ thư mục `source/`. `A` = `src/app/App.tsx`; `L` = `src/features/items/ItemList.tsx`; `SC` = `src/features/items/ItemSummaryCards.tsx`; `RT` = `src/features/reports/ReportTable.tsx`; `DG` = `src/features/reports/ReportDetailGrid.tsx`; `QA` = `src/qa/compact-qa-main.tsx`; `F` = `src/state/use-firebase.ts`; `W` = `src/state/use-workspace.ts`; `REP` = `src/domain/reporting.ts`; `SUM` = `src/domain/item-summary.ts`. Mỗi tọa độ `L:527` là **file:line theo baseline**, không phải dòng của nhánh mới.

## 1. Inventory: App thật, báo cáo, Danh sách, các trạng thái

| ID | Tính năng và đường vào người dùng | Role / môi trường | Bằng chứng baseline file:line | Kết luận và cách tái hiện/oracle |
|---|---|---|---|---|
| F01 | Hai tab **Báo cáo tổng hợp** và **Danh sách các ND trình HĐND** ở đầu App | Admin, guest; Pages Firebase | `A:467–479`, `A:529–546` | **CÒN.** Bấm tab, đổi `page` (khi không ở `editingPage`). |
| F02 | Đủ **5 bảng**: Thành ủy, xây dựng NQ, HĐND NQ+BC, ban hành NQ, ban hành BC | Admin/guest; App Báo cáo | `REP:4–18`, `A:334`, `A:533` | **CÒN.** Kiểm danh sách `DEFAULT_REPORTS` đúng thứ tự `party,build,council,nq,bc`; các bảng có thể bị ẩn theo layout đã lưu, không phải bị xóa. `src/data/report-preferences.ts:97–120`. |
| F03 | Phân nhóm Sở/Phòng/Lãnh đạo, tổng cột, tỷ lệ % | App Báo cáo | `A:532–533`, `REP:71–99`, `RT:143–180` | **CÒN.** Đổi `GROUP_OPTIONS`; nhóm trống = "Chưa phân công", hoàn thành theo nhãn cuối, tỷ lệ khi mẫu số 0 là `null`. |
| F04 | Bấm ô báo cáo/tổng từng nhóm để mở **popup đúng danh sách hồ sơ** | App Báo cáo | `RT:80–86`, `RT:150–180`, `A:337`, `A:568–585` | **CÒN.** Ô dương là button gọi `onSelect(title,entries)`; popup lọc theo `selectedIds`. Test `tests/reporting.test.ts:33–61,117–137`. |
| F05 | Các thẻ tiến độ phía trên báo cáo và **4-4-3** bucket Danh sách | App Báo cáo/Danh sách | `RT:117–127`, `SUM:14–28`, `SC:8–37,43–73` | **CÒN.** Thành ủy 4, xây dựng NQ 4, ban hành NQ 3; riêng báo cáo HĐND/NQ/BC không có chip "next" nếu chỉ 3 mốc. Test `tests/reporting.test.ts:63–115`. |
| F06 | “Bước tiếp theo” Thành ủy chỉ gộp để **đếm và lọc** | App Danh sách/summary | `REP:6–8,24–51`, `src/domain/report-workflow.ts:6–14`, `SUM:36–58`, `L:272–275,593–598` | **CÒN. KHÔNG LỖI.** `Đã gửi ĐU`, `ĐU đã gửi TU, chưa họp`, `Đã họp/xin phiếu, chưa có TBKL` cùng stage `next`, nhưng các ô gốc vẫn giữ giá trị và editor gốc. Không đổi enum dữ liệu thành "Bước tiếp theo". |
| F07 | "Đã trình - chưa có QĐ" chỉ nhóm `build`, không đồng nghĩa "Đã có QĐ" | App Danh sách | `REP:9–11`, `SUM:21–24`, `src/domain/report-workflow.ts:12–13` | **CÒN.** Lọc `build:next` chỉ ra `Đã trình HĐND, chưa có QĐ`. |
| F08 | Tính đúng NQ QPPL / NQ HC / BC / chưa phân loại; loại hồ sơ rút/lưu trữ | App Báo cáo/Danh sách | `REP:20,54–69,102–120`, `SUM:60–71`, `SC:51–65` | **CÒN.** Không suy loại từ mã ID; phân loại theo `documentKind` và `type`; `isDropped || archivedAt` bị loại khỏi thống kê nhưng bản ghi không tự mất khỏi dữ liệu nguồn. Test `tests/item-summary.test.ts:30–47`, `tests/reporting.test.ts:532–550`. |
| F09 | Trạng thái alias, trống và chưa chuẩn hóa | App Báo cáo/Danh sách | `REP:24–51,79–99`, `SUM:36–49` | **CÒN.** `Hoàn thành` được nhận về mốc Council chính thức; nhãn Thành ủy cũ không được tự coi đã TBKL; giá trị lạ vào `Chưa chuẩn hóa`, không tạo mốc mới; mẫu số 0 không chia cho 0. |
| F10 | Bộ lọc theo cột, nhóm gộp và bộ lọc popup | App Danh sách/popup | `L:214–273,563–584`, `DG:65–66,106–111,403–413` | **CÒN dạng cũ.** Danh sách có hàng lọc riêng cột, `RoomSpecialist` dùng AND. Popup có `filters` state **độc lập**. Chưa có toolbar tổng hợp V2. |
| F11 | Thanh tìm kiếm chung + Sở/Phòng + Lọc khác và phép AND + Esc an toàn | App Danh sách | Baseline chỉ có `L:74–75,241–273,563–584` | **MỚI / OPEN L1**, không gọi là mất tính năng cũ. Oracle: tìm không dấu trên text đầy đủ, Sở/Phòng so bằng chính xác, AND tất cả; Esc ngoài form reset khi có lọc, không ăn Esc trong dialog/IME/editor. |
| F12 | NQ QPPL / HC / BC là **chip lọc** hai chiều | App Danh sách | `SC:56–65` (hiện `span`), `SC:19–34` (stage là `button`) | **MỚI / OPEN L1.** Trên baseline kind chip là số liệu, **không click**; stage chip đã click được và có `aria-pressed`. L1 chịu toàn bộ logic, tooltip/zero/toggle. |
| F13 | Hiển thị các trạng thái chi tiết không bị thay bằng nhãn bucket | App Danh sách/popup | `L:420–438,645–658`, `DG:416–434` | **CÒN.** Kiểm dưới hai dòng có nhãn gốc khác nhau rồi chọn stage `next`, phải vẫn hiện đúng hai nhãn gốc; drilldown chi tiết Thành ủy chỉ một nhãn vẫn chọn được qua filter cột. |
| F14 | Ẩn STT ở bảng xem nhưng giữ Excel B | App Danh sách/popup/Excel | `src/data/item-preferences.ts:41–57,77–82`, `L:536–563,618`, `DG:92–103,388–402`, `src/data/business-excel.ts:8–13` | **MỚI / OPEN L1.** Baseline mặc định `stt.visible=true`, popup mặc định tham chiếu `EXCEL_SOURCE_COLUMNS`. Yêu cầu mới chỉ ẩn khỏi projection/width, **không xóa `Item.stt` hoặc Excel B**. |
| F15 | Bộ lọc và bố cục popup quản lý riêng | App Báo cáo → bấm số → popup | `DG:59–66,79–103,106–111,136–175,303–335`, `src/data/report-detail-preferences.ts:5–14,41–49` | **CÒN.** Popup lưu cột/độ rộng/nhãn/filters riêng, không ép dùng cùng toolbar Danh sách. |
| F16 | Mẫu popup cá nhân và màu popup | App popup, không phải personal preset Danh sách | `DG:79–83,166–200,290–302`, `src/data/report-detail-presets.ts:6–46` | **CÒN.** Đừng nhầm với preset cá nhân của **Danh sách** đã bị bỏ theo chủ ý. Popup presets riêng vẫn có trong baseline. |

## 2. Inventory: quyền, khóa, nháp, lịch sử, đồng bộ

| ID | Tính năng, đường vào | Role / môi trường | Baseline file:line | Kết luận và bằng chứng/oracle |
|---|---|---|---|---|
| F17 | Account, login/logout Google, anonymous Firebase | Header `Quản trị` (guest) → Tài khoản; admin qua ⚙ | `A:457–464,511–515,550`, `src/features/settings/FirebasePanel.tsx:53–68`, `F:67–76,161–165` | **CÒN ở App.** Guest tự Auth ẩn danh; Google popup do người dùng bấm; không dựng login thật trong QA synthetic. |
| F18 | Một admin xác minh email + provider Google | Firebase Auth | `src/data/firebase-config.ts:11`, `src/data/firebase-repository.ts:31–32` | **CÒN.** `firebaseAdmin` kiểm email chính xác, verified và Google provider; không có admin thứ hai do UI tự tạo. Tránh ghi địa chỉ tài khoản vào fixture public. |
| F19 | Cấp quyền cột trong Quản lý cột | ⚙ Chỉnh sửa → Danh sách dữ liệu → Quản lý cột | `A:505–508,538–546`, `L:495`, `src/features/items/ItemColumnPanel.tsx:45–58,93–121,183–195` | **CÒN nhưng admin-only.** Có CAS `onSavePermissions` ở App; nếu đang có ngoại lệ dòng/ô, sửa quyền cột yêu cầu xác nhận xóa ngoại lệ (không ngầm ghi đè). |
| F20 | **Phân quyền trực tiếp từng dòng/ô** trên bảng | Admin; phải vào `items-permissions` | `A:49,344–354,505–510,538–546`, `L:147–153,485–494,530–536`, `src/features/items/InlinePermissionsTable.tsx:21–27,114–174` | **LỖI THẬT / OPEN L3.** Có page `items-permissions` nhưng baseline truyền **`permissionModeOnly={false}`** và **`externalSectionTabs={true}`**, khiến tab chuyển `permissionMode` bị ẩn; App settings hub không có entry riêng đến page này. Đường vào quyền **cột** còn, đường cấp dòng/ô **không reach được** theo luồng điều hướng thông thường. |
| F21 | Guest chỉ được sửa field được cấp; thu hồi chặn lần lưu mới | Guest ẩn danh (hoặc Google employee đã duyệt); Firebase primary, OPEN | `src/data/firebase-repository.ts:31–32,100–147`, `F:137–145,244–277,347–350`, `A:291–305,377–380,543–546` | **API CÒN, App E2E NOT PROVEN / OPEN L3** do F20. Chọn một ô, grant → guest edit; denied cell không sửa; revoke rồi save phải bị Rules/CAS từ chối. Không dùng `canEdit=true` demo làm bằng chứng. |
| F22 | UID nhân viên Google; cấp/thu hồi tư cách nhân viên, không thay thế quyền ô | Admin Tài khoản | `F:85–94,137–165`, `src/features/settings/FirebasePanel.tsx:70–88` | **CÒN.** Guest ẩn danh không cần duyệt UID; Google employee cần quyền UID **và** quyền cột/dòng/ô. |
| F23 | Lease độc quyền theo `(recordId,field)`, keep/release/draft | App editor, Firebase | `src/data/cell-edit-leases.ts:173–217`, `L:51–58,426–433`, `A:291–304` | **CÒN ở API; end-to-end production NOT PROVEN.** Không ghi nháp khi chưa có lease; không dùng bản ghi thế hệ cũ cho lease mới. |
| F24 | Khóa admin guest `editingLocked`, freeze `OPEN/DRAINING/FROZEN` | Admin Tài khoản / vận hành | `F:89–93,284–309`, `A:299–305,441–451`, `src/features/settings/FreezeAdminPanel.tsx` | **CÒN, bị khóa đúng điều kiện.** `editingLocked` khóa guest; `FROZEN` chặn thao tác sửa mới cho cả admin. Đừng phân loại là thiếu tính năng. Không gọi Firebase production để mở khóa. |
| F25 | Nháp, lưu/thoát, bảo vệ thay đổi chưa xác nhận | App Danh sách và báo cáo, editor | `W:12–19,124–179,180–202`, `A:284–305,344–353,524–528,586–587`, `L:196–204,696–698` | **CÒN.** `save` chỉ xóa draft khi kết quả ACK khớp; lỗi giữ bản nháp; nguồn/epoch khác không tự áp nháp cũ; prompt thoát/chuyển trang khi dirty. |
| F26 | Lịch sử chỉnh sửa từng ô / ghi chú | App Danh sách/popup, role phù hợp | `L:436–438,657–658`, `DG:419–432`, `A:568–586`, `src/features/history/HistoryDialog.tsx:7–14,23–53` | **CÒN.** Chỉ `note` và `specificProgress` có action lịch sử ô; thời gian mới nhất trước. 3 bản ghi `NOTE_HISTORY_DEMO` là nhãn **minh họa, không phải audit**. Không tuyên bố giữ lịch sử vô hạn (Firebase hiện ghi vòng 50 revisions, `src/data/firebase-repository.ts:128–136`). |
| F27 | Firebase realtime data subscription | App khi source `primary`; phải có Auth/epoch verified | `A:70–113,140–142`, `W:98–121`, `src/data/firebase-repository.ts:71–95` | **CÒN ở API / NOT PROVEN production.** `onValue` thông báo thay đổi; không tự fallback sang Sheets khi V2 epoch invalid. |
| F28 | Generation fence; stale-tab/old generation không được đọc/lưu lịch sử | App và RTDB Emulator | `A:97–113,121–142`, `W:72–82`, `F:97–136`, `src/data/firebase-repository.ts:47–53,64–95,100–153` | **CÒN ở source/Emulator; NOT PROVEN production.** Phải so toàn bộ active pointer, clear rows/drafts khi generation đổi, server Rules từ chối old-generation writes. Test `tests/pr95-app-generation.test.ts:28–70` và `tests/firebase-versioned-replacement.test.ts:192–222`. |
| F29 | Tùy chỉnh layout chung CAS, merge khác cột, báo xung đột | Admin ⚙ Chỉnh sửa → Danh sách | `A:313–322`, `L:174–185,370–397`, `src/data/item-layout-merge.ts`, `src/features/items/LayoutConflictResolver.tsx` | **CÒN.** Thao tác thiếu quyền hoặc đã đổi revision không âm thầm ghi đè. Bản user có thể bị hạn chế khi account chưa sẵn sàng; đó là lock có chủ ý. |

## 3. Inventory: cột gộp, bố trí, màu, Excel và QA

| ID | Tính năng, đường vào | Role / môi trường | Baseline file:line | Kết luận và oracle |
|---|---|---|---|---|
| F30 | Cột gộp Hồ sơ, Thành ủy, HĐND, Phòng/CV, lãnh đạo; giữ giá trị gốc | App Danh sách và popup | `src/features/items/compact-columns.ts:104–170`, `L:114–116,411–438,585–598`, `DG:94–103,425–430` | **CÒN.** Visual compact chỉ gộp field hiển thị, không đổi `Item`, quyền hay lease từng field; tên lãnh đạo viết tắt chỉ ở view `compact-columns.ts:81–103`. |
| F31 | Đổi tên nhóm, label, width, thứ tự, ẩn/hiện, khung tự phủ rộng | App Danh sách / admin chỉnh sửa | `L:399–404,503–519,536–563,663–695`, `src/data/item-preferences.ts:19–35,77–185`, `src/data/resize-last-column.ts:98–185` | **CÒN.** Pair-first compensate, fallback cột cuối, ID view `52 px` khi raw `68 px`, không ghi trong mỗi pixel. Admin CAS chung, guest viewing prefs riêng. |
| F32 | Quyền cột tùy chỉnh + data nguồn A–O / có thể bỏ cột khỏi view | Admin/guest | `src/features/items/ItemColumnPanel.tsx:152–182`, `src/data/item-preferences.ts:38–60,92–111` | **CÒN.** Cột tùy chỉnh là view/config, **không biến thành cột Excel/field ghi RTDB tự động**. Excel A–O keys vẫn giữ đủ kể cả ẩn trong view. |
| F33 | Palette trạng thái và highlight cá nhân | Admin trong Danh sách/popup; guest chỉ áp view | `A:165–173,434–437`, `L:405,510–511,585–598,629–658`, `src/data/status-palettes.ts:18–26,43–88,105–123`, `src/data/item-preferences.ts:9–35` | **CÒN.** Preset/localStorage không đồng nghĩa colors mặc định, không tự bật `otherEnabled`. Màu V2 dịu là **gói L2**, không thành lý do đòi API của L1. |
| F34 | Export dữ liệu, mẫu Excel nội bộ (khác mẫu nghiệp vụ A–O) | Admin Tài khoản → Excel | `A:511–515,551–565`, `src/features/settings/ExcelTransferPanel.tsx:19–27`, `src/data/excel-transfer.ts:5–22` | **CÒN** xuất & tải template. Nội bộ export có `recordId,displayCode,stt` và metadata; không đánh đồng với `BUSINESS_HEADERS` A–O. |
| F35 | Chọn file nghiệp vụ A–O, chọn sheet, kiểm tiêu đề/đảo H-I, L-M, STT, dấu/khoảng trắng | Admin Excel → Kiểm tra file | `src/features/settings/BusinessExcelReviewPanel.tsx:27–75,92–103`, `src/data/business-excel.ts:8–16,25–79,85–171` | **CÒN.** Parse giữ `stt`, mã nghiệp vụ ổn định; cấm cột thừa/nhãn sai; thông báo sheet/dòng/cột. Test `tests/business-excel.test.ts:12–93`. Không dùng dữ liệu thật. |
| F36 | Xem trước thay toàn bộ tập / đối chiếu theo mã / stale-preview | Admin Excel | `src/features/settings/BusinessExcelReviewPanel.tsx:20–24,48–52,76–103`, `src/data/dataset-replacement-preview.ts` | **CÒN.** Xem trước chỉ lấy **tập mới**, mã trùng với nội dung khác là `changed`, không nối dữ liệu tập cũ. Đây là kiểm toán logic thuần; đường **commit** vẫn guard riêng. |
| F37 | Staging, backup, commit/restore, xác nhận operation khi ACK không rõ | Admin Excel; **Firebase Emulator** | `A:551–558`, `src/features/settings/VersionedExcelReplacementPanel.tsx:66–131,138–230`, `src/data/firebase-versioned-replacement.ts:117–160,325–555` | **BỊ KHÓA có chủ ý ngoài Emulator**, **NOT PROVEN production**. `versioned` prop chỉ truyền khi `firebase.emulator && isAdmin && datasetEpochReady`. Kiểm Rules/CAS, readback/backup/replay trên staging; không chuyển thành nút production. |
| F38 | Google Sheets vận hành / nguồn chỉnh sửa chính | App Pages | `A:70–107,549–550,560–565` | **CỐ Ý BỎ** ở vận hành Pages Firebase-only; legacy path chỉ dùng trường hợp test/non-Firebase. Không gọi đây là mất tính năng khi so main cũ. |
| F39 | Personal display preset cho bảng **Danh sách** và checkbox chọn CV toàn cơ quan | App Danh sách | Baseline `L:71–77,136–140,468–529`, `src/data/list-views.ts:38–62,85–88` | **CỐ Ý BỎ** giao diện/mẫu đang kích hoạt; `clearActivePersonalView` chỉ xóa con trỏ kích hoạt, không xóa các mẫu được lưu. Vẫn có lựa chọn compact cá nhân và mẫu **popup**; không khôi phục những control cũ. |
| F40 | Ghi chú khi **không có quyền**; P/Q không hỗ trợ sửa | App Danh sách/guest | `L:409–438,619–640`, `A:299–305`, `src/data/firebase-repository.ts:31–32,100–108` | **BỊ KHÓA đúng thiết kế.** Ô note không grant thì chỉ đọc, không "mất editor". `partyMeeting/examined` P/Q cũ chỉ đọc, không được ép thêm thành editable A–O. |
| F41 | Demo QA standalone có các phần App cũ | `compact-qa.html`/localhost; synthetic only | `QA:1–3,24–25,82–103,103–128` | **THIẾU DEMO / OPEN L4.** Baseline chỉ có **ItemList** hoặc **ReportDetailGrid** một chế độ. **Không có** hai tab thực của demo, 5 ReportTable, account/menu, Excel reviewer, role switch admin/guest hay grant→revoke mô phỏng. Không phải mất ở App thật. |
| F42 | Demo edit/save/auth mô phỏng | QA synthetic only | `QA:82–85,96–128` | **GIỚI HẠN cố hữu.** `guest=1`/ `edit=1` là query flags, `canEditCell` cho all, `onSaveData=async()=>false`; không có Auth/RTDB permission, lease hoặc backend. Không thể dùng demo để tuyên bố quyền App thật đã hoàn chỉnh. |

## 4. Lỗi/thiếu đã xác nhận, đầu mối chịu trách nhiệm, không chờ worker

| Mã | Severity & phân loại | Source evidence & reproduction chính xác | Owner | Oracle nghiệm thu |
|---|---|---|---|---|
| **OPEN-L3-01** | **P1 — lỗi đường vào thật** | `A:538`: cùng một `ItemList` ở cả `items-customize` và `items-permissions` nhưng `permissionModeOnly={false}`, `externalSectionTabs={true}`; `A:505–510` không có nút đi tới `items-permissions`; `L:485–494` ẩn tabs quyền khi `externalSectionTabs`. Tái hiện với admin: ⚙ Chỉnh sửa → Danh sách, không có entry trực tiếp "Phân quyền chỉnh sửa" để mở `InlinePermissionsTable`; vẫn có checkbox quyền **cột** trong Quản lý cột. | **L3** | Admin có entry rõ; vào `items-permissions` thông qua `openOptions` và dirty guard; chuyển role/màn không mất draft; bảng quyền cột/dòng/ô mở được trên App thật; Emulator grant→guest edit→revoke. |
| **OPEN-L3-02** | **P2 — copy sai bối cảnh** | `src/features/settings/ExcelTransferPanel.tsx:23`: khi `importEnabled=false` và `versioned=undefined`, copy hiển thị **"Google Sheets đang là nguồn chính"**, dù `A:70–107` dùng Firebase-only và `A:558` khóa import. `A:320–321` cũng còn nhắc "Dữ liệu Google Sheets không bị sửa" sau lưu layout Firebase. | **L3** | Tài khoản → Excel mô tả đúng Firebase hiện hành, import được khóa hoặc chỉ mở trong Emulator; không hứa ghi Sheets, không tự mở ghi production. |
| **OPEN-L4-01** | **P1 preview parity** | `QA:96–128` chỉ điều kiện `popup=1 ? ReportDetailGrid : ItemList`. Không `ReportTable`, ExcelTransfer/BusinessExcelReview, navigation đủ màn hay role selector. | **L4** | Demo mới có hai tab, đủ 5 báo cáo, popup, account/menu, file review, mock grant→guest→revoke trong memory, kiểm toolbar desktop/mobile; ghi rõ "MÔ PHỎNG", không sử dụng kết quả này thay Firebase Auth/Rules thật. |
| **OPEN-L1-01** | **P2 yêu cầu UX V2 mới** | `SC:56–65` là `span` kind; `L:563–584` vẫn lọc trong thead. Toolbar search/Sở/Phòng/Lọc khác + kind chip toggle/Esc an toàn chưa hiện tại. | **L1** | AND chính xác, không dấu/tên đầy đủ, chip loại/stage độc lập, zero state, tooltip/aria-pressed, Esc đúng ngoại lệ, giữ đầy đủ status gốc. |
| **OPEN-L1-02** | **P2 yêu cầu hiển thị V2 mới** | `src/data/item-preferences.ts:77–82` STT mặc định visible; `DG:92–103,388–413` vẫn map cột STT. | **L1** | Ẩn **trước** width/fit ở Danh sách và popup thường, `Item.stt` + Excel B không thay, "Hiện đủ cột Excel" vẫn có STT. |
| **L2-PALETTE** | **Phạm vi thay đổi đã giao, không phải bug báo cáo** | `src/data/status-palettes.ts:18–26,64–88`, `SC:8–37` | **L2** | Default colors V2, selected outline + ✓, giữ preset và palette cá nhân, không động logic lọc. |
| **OPEN-RELEASE** | **Không phải bug được suy ra từ một trang demo** | `A:551–558` emulator-only versioned; `F:97–136` active pointer / permissions guard | **L1 integration + chủ dự án**, không giao L5 sửa | End-to-end exact integrated SHA, có Rules server, stale epoch, actual UI, test role thật trong Emulator; production GO/phát hành là quyết định riêng. |

**Tái phân loại quan trọng:** F19 có `src/features/items/ItemColumnPanel.tsx:93–99` chặn việc xóa ngoại lệ dòng/ô cũ nếu chưa tick xác nhận; **không** ghi nhầm thành lỗi tự xóa quyền. Ở baseline, nút cấp cột vẫn có; **chỉ thiếu entry đến giao diện chi tiết F20**. F39 cố ý bỏ preset Danh sách, **không** đòi xóa popup presets F16. F37 bị khóa ngoài Emulator theo quyết định an toàn, **không** mở khóa để làm đẹp demo.

## 5. Oracle nghiệm thu độc lập, tính bằng tay — không dùng hàm đang test để dự báo

### 5.1. Bộ fixture T (8 dòng synthetic, không từ production)

| Mã | Loại | Thành ủy | Xây dựng NQ | Ban hành | Hiệu lực |
|---|---|---|---|---|---|
| Q1 | NQ/HC | Đã gửi ĐU | Sở chưa trình | Sở chưa trình | active |
| Q2 | NQ/QPPL | Đã họp/xin phiếu, chưa có TBKL | Đã trình HĐND, chưa có QĐ | VP đang thực hiện | active |
| Q3 | NQ/HC | Đã có TBKL | Đã có QĐ chấp thuận | Hoàn thành (alias) | active |
| Q4 | NQ/HC | TU đã cho ý kiến (unknown) | Không phải trình xây dựng NQ | Đã trình HĐND thành phố | active |
| R1 | BC | Không phải xin ý kiến | — | Sở chưa trình | active; `partyLevel=Không phải xin ý kiến` |
| Q5 | NQ/HC | Đã có TBKL | Đã có QĐ | Hoàn thành | `isDropped=true` |
| R2 | BC | Sở chưa trình | — | Hoàn thành | `archivedAt` non-null |
| Q6 | NQ/HC | Không phải xin ý kiến | Không phải trình | trống | active; `partyLevel=Không phải xin ý kiến` |

**Kết quả kỳ vọng tính tay (không gọi hàm để tính oracle):**

- Tổng active **6** = NQ **5** (HC **4**, QPPL **1**), BC **1**, unclassified **0**. Q5/R2 không tính tổng báo cáo, vẫn ở dữ liệu nguồn nếu chưa xóa/replace.
- KPI Council over active: `Sở chưa trình` **3** (`Q1,R1,Q6`), `VP` **1** (`Q2`), hoàn thành **2** (`Q3,Q4`).
- Thẻ Thành ủy: tổng **4**; `source=0`, `office=0`, `next=2 [Q1,Q2]`, `completed=1 [Q3]`, `unmatched=1 [Q4]`, tỉ lệ **25%**. R1/Q6 excluded bằng party level/not-required.
- Thẻ xây dựng NQ: tổng **3**; `source=1 [Q1]`, `office=0`, `next=1 [Q2]`, `completed=1 [Q3]`, `unmatched=0`, hoàn thành **33%**. Q4/Q6 `Không phải trình` bị loại khỏi mẫu số.
- Thẻ ban hành NQ: tổng **5**; `source=2 [Q1,Q6]`, `office=1 [Q2]`, `completed=2 [Q3,Q4]`, `unmatched=0`, hoàn thành **40%**.
- Council tổng hợp NQ+BC: **6**, hoàn thành **2**, **33%**; riêng BC **1**, hoàn thành **0**.
- Sau click `party:next` chỉ còn **[Q1,Q2]**, nhưng ô tiến độ **phải vẫn lần lượt là** `Đã gửi ĐU` / `Đã họp/xin phiếu, chưa có TBKL`. Lọc chi tiết `Đã gửi ĐU` cho đúng **[Q1]**.
- Bộ lọc Sở=X và Phòng=Y và từ khóa không dấu `da gui du`: chỉ Q1 nếu cấp dữ liệu Q1 thuộc X/Y, Q2 khác phòng, không được lọc `next` thành một raw status.
- Một ô `note` được grant thì khách sửa được **chỉ ô đó** khi primary/OPEN/lease/Rules; ô `note` khác cùng dòng/cột không grant vẫn bị từ chối; sau revoke phải fail, không chỉ đổi CSS.
- Empty dataset: tổng 0, mọi bucket 0, `percent=null`; không `NaN` / `Infinity`.
- Thay dataset [Q1,Q2] sang [Q2 (new recordId & STT, nội dung giữ), Q1 (cùng mã nhưng đổi nội dung), Z mới] ⇒ `added=[Z]`, `changed=[Q1]`, `unchanged=[Q2]`, `removed=[]`; thay chỉ [Z] thì Q1/Q2 phải biến mất khỏi report/filter mới.
- Kiểm "Hiện đủ cột Excel" phải phục hồi STT ở đúng B, trong khi bảng xem và popup bình thường ẩn/không reserve width sau ghép L1.

*Bảng trên là oracle độc lập để L1 tích hợp và nghiệm thu; không tuyên bố đã chạy thành công toàn bộ flow V2 trên fixture này.*

### 5.2. Checklist kiểm ở bản ghép cuối (L1 + reviewer)

- [ ] Hai tab + đủ 5 bảng; tổng/cột/tỷ lệ, click count và popup khớp danh sách ID.
- [ ] Loại QPPL/HC/BC khớp cùng isActive/normalizer; rút/lưu trữ không trộn với không phải trình.
- [ ] 4-4-3 và chỉ riêng Thành ủy có "Bước tiếp theo" gộp; dưới từng record editor/history vẫn status gốc.
- [ ] Search không dấu trên mã/nội dung/tên đầy đủ/note/tiến độ; Sở+Phòng exact, các bộ lọc AND; select/toggle/zero/tooltips/aria-pressed, Esc an toàn.
- [ ] STT không chiếm width trong hai bảng xem; dữ liệu A–O/B nguyên; "Hiện đủ cột Excel" hiện lại STT.
- [ ] Admin có entry phân quyền riêng; grant theo cột/dòng/ô và thu hồi; guest không có quyền tuyệt đối không lưu được.
- [ ] Login/logout, một admin, quyền UID Google riêng; guest ẩn danh không được nhận quyền của admin.
- [ ] Lease, freeze, CAS, nháp/lịch sử, stale generation fence trên **same active generation** bằng Emulator; không thay bởi in-memory mock.
- [ ] Gộp cột, resize pair-first, tên gốc/nhãn custom, width/order/show/hide, CAS conflict/rollback; popup state riêng.
- [ ] Palette V2 dịu mặc định; không ghi đè preset cá nhân, màu dòng và highlight; otherEnabled không bị bật ngầm.
- [ ] Demo QA có đủ tab/menu/report/popup/file và mô phỏng role; rõ "không phải backend".
- [ ] Excel A–O kiểm sheet/dòng/cột, export/template, preview 2 tập theo mã và restore/ACK unknown trong Emulator; import production vẫn khóa.
- [ ] Trên **exact integrated SHA** mới chạy typecheck/test/Chrome/Emulator/CI phù hợp; không dùng CI của một worker để chứng nhận tổng thể.
- [ ] Chỉ publish `preview/pr95/` dữ liệu giả sau bước ghép, theo phê duyệt; không merge main/root Pages hay Firebase production.

## 6. Bằng chứng review & giới hạn cuối

**Đã xem trực tiếp** source theo SHA old/main và baseline: `App.tsx`, `ItemList.tsx`, `ItemSummaryCards.tsx`, `ReportTable.tsx`, `ReportDetailGrid.tsx`, `compact-qa-main.tsx`, `use-firebase.ts`, `use-workspace.ts`, `InlinePermissionsTable.tsx`, `ItemColumnPanel.tsx`, reporting/summary/workflow, compact-columns, item/report-detail prefs, palette, Excel transfer/parser/preview, versioned replacement, FirebaseRepository, history, cùng tests liên quan. Các trích dẫn `file:line` trỏ đến **fixed baseline**.

**Kiểm tĩnh đã đạt:** cùng một `page` trong App gắn nhiều component thật; chính xác nguyên nhân entry permissions bị che; đúng số reports 5, stage 4–4–3, raw statuses gốc; đúng khác biệt giữa App và QA standalone; đúng guard emulator-only của versioned controls; đúng phân biệt list preset bị bỏ và popup preset còn. **Baseline CI đã đạt** theo 5 workflow đã nêu ở §0.

**Không chứng nhận bằng audit:** click path trực tiếp trong browser của L1–L4 sau sửa; role/lease/Rules Firebase **production**; live Google ID; tính toán với dữ liệu thật; hiển thị ảnh/screenshot browser mà L5 chưa chạy; bản ghép cuối V2; permission grant→guest edit→revoke trên App live sau tích hợp. Các mục này **NOT PROVEN**, không coi là lỗi mới hoặc tự ý sửa.

**Bàn giao:** L1 đọc tài liệu này cùng đúng **diff chỉ một file**, xử lý OPEN-L1-* trong gói của L1; L3 tự xử lý OPEN-L3-*; L4 tự làm OPEN-L4-01; L2 tự làm palette. L5 audit **đã hoàn thành độc lập**, không cần API/commit/ACK từ luồng khác. Giữ mọi commit/CI lịch sử, không tự merge/publish/deploy.
