# Bản đồ mã nguồn và quy tắc bố trí

> **Bản sao GitHub:** một số ảnh bằng chứng trong tài liệu lịch sử chưa được đồng bộ vào `docs/assets/`. Tên tệp được giữ để tra cứu trên bản lưu gốc; không xem đường dẫn này là ảnh có sẵn hoặc bằng chứng đã kiểm trên website.

## Vị trí mã nguồn trên GitHub (chốt bố trí hiện hành)

Repository [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp) có `index.html` **đã build** ở gốc để phục vụ Pages và **toàn bộ dự án** dưới `source/` (`source/src`, `source/docs`, `source/tests`, `source/firebase`...). Các đường dẫn tương đối **trong tài liệu này** lấy gốc ở `source/`, nên `../src/app/App.tsx` là `source/src/app/App.tsx` trên GitHub. Thư mục dự án trên Windows tương ứng với nội dung `source/`, không có lớp `source/` bổ sung ở máy.

Chỉ cập nhật bản phát hành bằng cách build từ code nguồn rồi đưa `source/dist-pages/index.html` vào `index.html` gốc repository. Không vá `index.html` đã minify thay cho `src/`. GitHub không tự đồng bộ thay đổi ở Windows/Google Drive; hiện đã có CI xác minh và workflow tự build/publish từ `source/` khi thay đổi `main`; xem [VAN_HANH](VAN_HANH.md). Xem [VAN_HANH](VAN_HANH.md). Mô hình trường/ID ở [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md).



## Điểm vào Pages 0.7.0 — Sheets và Firebase quản trị

- [pages.html](../pages.html), [pages-main.tsx](../src/pages-main.tsx): entry Pages, inject Auth/config controller vào App dùng chung; nội dung dùng SheetsRepository.
- [firebase-config](../src/data/firebase-config.ts): web identifiers công khai và email admin; không credential server.
- [use-firebase](../src/state/use-firebase.ts): Auth, listener permissions/profile, cấu hình có baseline; emulator build dùng demo-hdnd.
- [firebase-repository](../src/data/firebase-repository.ts): policy ô/dòng/cột và admin; adapter realtime/transaction/history/import giữ cho chuyển đổi tương lai, không dùng làm nguồn Pages hiện tại.
- [Database Rules](../firebase/database.rules.json), [firebase.json](../firebase.json): Rules mẫu và cấu hình emulator local, chưa deploy.
- [FirebasePanel](../src/features/settings/FirebasePanel.tsx): quyền cột/dòng/ô; [ExcelTransferPanel](../src/features/settings/ExcelTransferPanel.tsx), [excel-transfer](../src/data/excel-transfer.ts), [FirebaseProfileTransfer](../src/features/settings/FirebaseProfileTransfer.tsx): xuất Sheets/JSON profile, nhập dữ liệu khóa trong giai đoạn hiện tại.
- [test-firebase](../scripts/test-firebase.mjs), [seed-emulator](../scripts/seed-firebase-emulator.mjs), [emulator tests](../tests/firebase-emulator.test.ts): chỉ demo/local. Hướng dẫn ở [FIREBASE_PAGES](FIREBASE_PAGES.md).

- [pages-sheets.test.tsx](../tests/pages-sheets.test.tsx): App dùng Sheets, refresh, nháp khách và lưu cấu hình admin; [firebase-config-state.test.ts](../tests/firebase-config-state.test.ts): baseline/refresh/quyền thống nhất.

Ngày cập nhật: 15/10/2026. Chỉ liệt kê file đã có; phần chưa có được ghi rõ ở cuối. Hành vi và bất biến xem [SYSTEM](SYSTEM.md), kiến trúc xem [ARCHITECTURE](ARCHITECTURE.md), kết quả kiểm chứng xem [CURRENT_STATE](CURRENT_STATE.md).

## Điểm vào và nơi sửa

| Nhu cầu | File chịu trách nhiệm |
|---|---|
| Khởi tạo giao diện | [src/main.tsx](../src/main.tsx), [index.html](../index.html) |
| Điều hướng, KPI, thao tác nháp cấp app | [src/app/App.tsx](../src/app/App.tsx) |
| Kiểu Item/Patch/Report/nhóm và hợp đồng thay đổi | [shared/types.ts](../shared/types.ts) |
| Nhãn trường, editor, nhóm và danh sách trạng thái | [shared/field-definitions.ts](../shared/field-definitions.ts) |
| Phạm vi báo cáo, tổng, tỷ lệ, KPI | [src/domain/reporting.ts](../src/domain/reporting.ts) |
| Chuẩn hóa tìm kiếm, chỉ mục tìm | [src/domain/search.ts](../src/domain/search.ts) |
| Sắp thứ tự danh mục theo ưu tiên đã lưu, fallback tiếng Việt | [src/domain/catalog-order.ts](../src/domain/catalog-order.ts) |
| Kiểm tra thay đổi và tạo patch bản nháp | [src/domain/items.ts](../src/domain/items.ts) |
| Lưu/Hủy/Làm mới, phản hồi từng mục | [src/state/use-workspace.ts](../src/state/use-workspace.ts) |
| ID hiển thị chuẩn hóa chỉ cho giao diện, giữ nguyên mã/ID gốc | [src/domain/display-id.ts](../src/domain/display-id.ts) |
| Hợp đồng nguồn dữ liệu; `sourceKind` tách loại nguồn khỏi quyền commit `readOnly` | [src/data/repository.ts](../src/data/repository.ts) |
| Repository Excel qua data RPC, validate snapshot/save/history; `sourceKind=google`, `readOnly` là capability riêng | [src/data/excel-repository.ts](../src/data/excel-repository.ts), [src/data/google-bridge.ts](../src/data/google-bridge.ts) |
| Link mặc định, kiểm tra URL/gid, lưu lựa chọn nguồn | [src/data/sheet-config.ts](../src/data/sheet-config.ts) |
| Ánh xạ A–O hiện hành, đọc tương thích A–P/A–R, header/loại nội dung/cảnh báo dữ liệu | [src/data/gviz-parser.ts](../src/data/gviz-parser.ts) |
| Đọc Sheets JSONP, timeout, cleanup, snapshot chỉ đọc | [src/data/sheets-repository.ts](../src/data/sheets-repository.ts) |
| Tạo/yêu cầu GViz có timeout và giải phóng callback | [src/data/gviz-request.ts](../src/data/gviz-request.ts) |
| Cầu nối gọi Apps Script qua Google bridge | [src/data/google-bridge.ts](../src/data/google-bridge.ts) |
| Schema cấu hình dùng chung, chia/ghép chunk, áp dụng từng phần | [src/data/shared-config.ts](../src/data/shared-config.ts) |
| Đọc cấu hình dùng chung qua GViz; gửi thao tác ghi qua repository tới Apps Script RPC | [src/data/shared-config-repository.ts](../src/data/shared-config-repository.ts), [src/data/google-bridge.ts](../src/data/google-bridge.ts) |
| Lưu cấu hình server theo nguồn, revision và thao tác | [src/data/shared-store.ts](../src/data/shared-store.ts) |
| Hook tải/lưu cấu hình dùng chung và đồng bộ trạng thái | [src/state/use-shared-config.ts](../src/state/use-shared-config.ts) |
| Nhập link/gid, kiểm tra/kết nối/chọn mẫu | [src/features/settings/ConnectionPanel.tsx](../src/features/settings/ConnectionPanel.tsx) |
| Trạng thái cấu hình dùng chung, quyền truy cập và thao tác đồng bộ | [src/features/settings/SyncPanel.tsx](../src/features/settings/SyncPanel.tsx) |
| Validation/lưu bố trí báo cáo theo nguồn, ghép tên/thứ tự/hiển thị với nghiệp vụ | [src/data/report-preferences.ts](../src/data/report-preferences.ts) |
| Chế độ tùy chỉnh riêng: nháp/Lưu/Hủy/Esc/preview/reset/cột | [src/features/settings/ReportSettings.tsx](../src/features/settings/ReportSettings.tsx) |
| Các hàng đổi tên/ẩn/hiện/đưa bảng lên xuống | [src/features/settings/ReportLayoutPanel.tsx](../src/features/settings/ReportLayoutPanel.tsx) |
| Bố trí cột danh sách: thứ tự, hiển thị, độ rộng cơ sở và kiểm tra/lưu theo nguồn | [src/data/item-preferences.ts](../src/data/item-preferences.ts), [src/features/items/ItemColumnPanel.tsx](../src/features/items/ItemColumnPanel.tsx) |
| Bản nháp bố trí danh sách và báo cáo cho phép trạng thái đang nhập chưa hợp lệ | [src/data/item-draft.ts](../src/data/item-draft.ts), [src/data/report-draft.ts](../src/data/report-draft.ts) |
| Danh mục theo nguồn: seed từ dữ liệu, kiểm tra, tải/lưu local và quan hệ chuyên viên–phòng | [src/data/catalogs.ts](../src/data/catalogs.ts) |
| Giao diện quản lý danh mục, thêm/đổi/xóa/thứ tự và gán chuyên viên–phòng | [src/features/catalogs/CatalogSettings.tsx](../src/features/catalogs/CatalogSettings.tsx), [src/features/catalogs/CatalogPanel.tsx](../src/features/catalogs/CatalogPanel.tsx) |
| Checkpoint bản nháp trên trình duyệt và phục hồi bản nháp mẫu có đối chiếu bản gốc | [src/data/draft-checkpoints.ts](../src/data/draft-checkpoints.ts), [src/data/workspace-recovery.ts](../src/data/workspace-recovery.ts), [src/state/use-recoverable-draft.ts](../src/state/use-recoverable-draft.ts) |
| Nguồn giả giữ trong bộ nhớ, replay/conflict/lịch sử | [src/data/mock-repository.ts](../src/data/mock-repository.ts) |
| 24 nội dung giả và tạo bộ dữ liệu lớn | [src/data/demo-items.ts](../src/data/demo-items.ts) |
| **Bảng chi tiết từ ô báo cáo và cấu hình riêng** | [ReportDetailGrid.tsx](../src/features/reports/ReportDetailGrid.tsx), [report-detail-preferences.ts](../src/data/report-detail-preferences.ts), [App.tsx](../src/app/App.tsx) (nháp/quyền), [report-detail-preferences.test.ts](../tests/report-detail-preferences.test.ts) (cấu hình độc lập), [smoke-pages-browser.mjs](../scripts/smoke-pages-browser.mjs) (Chrome) |
| Bảng tổng hợp, mở chi tiết, resize report và tạo bản in | [src/features/reports/ReportTable.tsx](../src/features/reports/ReportTable.tsx), [src/components/ColumnResizeHandle.tsx](../src/components/ColumnResizeHandle.tsx) |
| **Tooltip chung và đánh dấu ô số** | [src/components/SharedReportTooltip.ts](../src/components/SharedReportTooltip.ts) (một tooltip, delegated hover), [src/styles/app.css](../src/styles/app.css) (viền ô màu teal, không global `body:has`), [src/features/reports/ReportTable.tsx](../src/features/reports/ReportTable.tsx) (nút phủ ô, focus, chi tiết); A/B tại [báo cáo hiệu năng](TOOLTIP_PERFORMANCE_AB_2026-10-19.md) |
| Resize cột Danh sách và báo cáo (cập nhật DOM trong lúc kéo) | [src/components/ColumnResizeHandle.tsx](../src/components/ColumnResizeHandle.tsx), [src/features/items/ItemList.tsx](../src/features/items/ItemList.tsx) |
| Sort bảng dữ liệu (bấm tiêu đề/nút) | [src/features/items/ColumnHeader.tsx](../src/features/items/ColumnHeader.tsx), [src/domain/sort-items.ts](../src/domain/sort-items.ts) |
| Năm báo cáo mặc định và KPI | [src/domain/reporting.ts](../src/domain/reporting.ts), [src/domain/report-workflow.ts](../src/domain/report-workflow.ts) |
| Tìm/lọc ngay dưới header, chọn cột, sửa ô và vùng cuộn cố định (không phân trang 50 dòng trong Pages mới) | [src/features/items/ItemList.tsx](../src/features/items/ItemList.tsx) |
| Cell picker popover tại ô, dropdown và lọc không dấu | [src/features/items/CellPicker.tsx](../src/features/items/CellPicker.tsx), [src/domain/search.ts](../src/domain/search.ts) |
| Popup nội dung, Ctrl+Enter, bảo vệ phần chưa áp dụng | [src/features/items/ContentEditor.tsx](../src/features/items/ContentEditor.tsx) |
| Cửa sổ dùng chung | [src/components/Modal.tsx](../src/components/Modal.tsx) |
| Xem lịch sử đã lưu | [src/features/history/HistoryDialog.tsx](../src/features/history/HistoryDialog.tsx) |
| Màu/layout/responsive/in | [src/styles/app.css](../src/styles/app.css) |
| Alias React/Preact và build một bundle | [vite.config.ts](../vite.config.ts) |
| Điểm vào server Apps Script | [server/core-entry.ts](../server/core-entry.ts), [server/Code.gs](../server/Code.gs), [server/appsscript.json](../server/appsscript.json) |
| Pure codec Excel: ZIP/XML, baseline/patch theo mã nguồn | [server/ExcelWriteCore.gs](../server/ExcelWriteCore.gs) |
| Điều phối receipt, backup, If-Match/CAS và phản hồi chưa xác định | [server/ExcelTransactions.gs](../server/ExcelTransactions.gs) |
| Drive transport Excel; mặc định tắt khi chưa có registry hợp lệ, kiểm owner và thư mục riêng | [server/ExcelService.gs](../server/ExcelService.gs) |
| Host thử riêng, khóa vào fixed private copy, tách manifest khỏi app chính | [server/probes/PrivateExcelTestHost.gs](../server/probes/PrivateExcelTestHost.gs), [server/probes/drive-copy-test.appsscript.json](../server/probes/drive-copy-test.appsscript.json) |
| Đóng gói server và host thử riêng ra `server/dist` / `server/dist-test` | [scripts/build-server.mjs](../scripts/build-server.mjs) |
| Ghép JS/CSS, kiểm tra cú pháp và xuất đúng một HTML | [scripts/package-html.mjs](../scripts/package-html.mjs) |
| Kiểm tra link tài liệu và mã Fxx | [scripts/check-docs.mjs](../scripts/check-docs.mjs) |
| Lệnh và phụ thuộc khóa phiên bản | [package.json](../package.json), [package-lock.json](../package-lock.json) |

## Kiểm tra khi sửa

- Thống kê/phạm vi: [reporting.test.ts](../tests/reporting.test.ts).
- Bố trí không đổi nghiệp vụ, lưu theo nguồn, cấu hình lỗi/reset: [report-preferences.test.ts](../tests/report-preferences.test.ts).
- Thứ tự danh mục: [catalog-order.test.ts](../tests/catalog-order.test.ts); lưu/tải danh mục, giữ thứ tự đã lưu và xử lý giá trị mới: [catalogs.test.ts](../tests/catalogs.test.ts).
- Schema, chunk, nguồn và cập nhật từng phần cấu hình dùng chung: [shared-config.test.ts](../tests/shared-config.test.ts); store/config server: [config-server.test.ts](../tests/config-server.test.ts).
- Bố trí danh sách: [item-preferences.test.ts](../tests/item-preferences.test.ts); danh mục và quan hệ chuyên viên–phòng: [catalogs.test.ts](../tests/catalogs.test.ts); ID hiển thị: [display-id.test.ts](../tests/display-id.test.ts).
- Checkpoint/nháp báo cáo, danh sách và phục hồi nháp mẫu: [draft-checkpoints.test.ts](../tests/draft-checkpoints.test.ts), [workspace-recovery.test.ts](../tests/workspace-recovery.test.ts).
- Tìm kiếm tiếng Việt: [search.test.ts](../tests/search.test.ts).
- Bản nháp, conflict, chống ghi lặp, lỗi từng mục: [repository.test.ts](../tests/repository.test.ts).
- Cấu hình link và lưu lựa chọn: [sheet-config.test.ts](../tests/sheet-config.test.ts); ánh xạ A–O/legacy: [gviz-parser.test.ts](../tests/gviz-parser.test.ts); timeout/cleanup/read-only: [sheets-repository.test.ts](../tests/sheets-repository.test.ts).
- Đổi UI: kiểm tra màn hình liên quan, popup/bàn phím, trường hợp chưa lưu và màn hình nhỏ; ghi giới hạn nếu chưa làm được.
- Đổi đóng gói: build và kiểm tra cú pháp script inline, số file đầu ra, phụ thuộc JS/CSS còn sót; thử mở theo đúng môi trường chia sẻ trước khi nghiệm thu sản xuất.

## Quy tắc thư mục

`shared` là hợp đồng/metadata chung; `domain` là nghiệp vụ không gọi trình duyệt/mạng; `data` là adapter nguồn; `state` quản lý bản chính và nháp; `features` là giao diện theo tính năng. Một quy tắc nghiệp vụ có một nơi định nghĩa. File nguồn được sửa rồi build; không sửa HTML minified để bảo trì.

`dist` là một bản HTML bàn giao; `dist-react`/`dist-preact` phục vụ phép thử cùng source, không phải ba app khác nhau. `node_modules`/`.cache` là thư viện và cache phát triển; không chia sẻ cho người xem. Các thư mục build/cache bỏ qua quản lý phiên bản. `docs/assets` chứa ảnh kiểm tra giao diện; ảnh kết nối 0.2.0 chỉ có cấu hình nguồn và kết quả số lượng.

Danh mục, bố trí báo cáo và bố trí danh sách vẫn lưu theo nguồn/capability. Google RPC và `sourceKind` cho biết loại nguồn; `readOnly` riêng quyết định có thể commit hay không. `ExcelRepository` gửi data RPC cho đọc/lưu/lịch sử, còn HTML ngoài Google host không có RPC. Checkpoint giữ nháp trên browser khoảng 10 giây; không tự áp dụng/lưu nguồn. Lưu cấu hình dùng chung là luồng riêng với nội dung Excel.

Mục tiêu file nguồn có trách nhiệm gọn, thường 100–250 dòng; nếu dài rà soát trách nhiệm thay vì chia vụn. Khi đổi vị trí file phải sửa import, test và link trong cùng thay đổi; REPO_MAP giữ bản đồ thực tế. Không tạo REPOSITORY_LAYOUT riêng ở quy mô hiện tại.

## Chưa có mã nguồn

Migration bổ sung IDs ổn định/catalogue IDs, nhập/xuất Excel/JSON và cache dữ liệu nguồn bền chưa được triển khai. Candidate local 0.6.2 có pure codec, ExcelTransactions, ExcelService và ExcelRepository; writer chỉ có thể bật trên Google host với flag/registry/quyền hợp lệ. Main deployment vẫn v5/0.5.2 và main manifest Sheets chưa đổi; source writer chưa được phát hành vào app đang dùng. ID hiển thị chuẩn hóa không thay ID/mã ổn định. Probe host khóa vào một fixed private copy riêng, không nối nguồn app chính. Xem [CURRENT_STATE](CURRENT_STATE.md) về trạng thái và giới hạn.

Bổ sung 0.5.2: src/state/use-shared-config.ts giữ trạng thái tải và baseline/revision, loại phản hồi cũ và khóa ghi trùng; src/app/App.tsx chặn vào editor trước base, chỉ dẫn từ HTML private tới trình chỉnh Google. src/state/use-recoverable-draft.ts giữ checkpoint khác base/chế độ xem; tests/config-state.test.ts kiểm 12 tình huống tải/ghi/nháp bằng repository giả và scheduler hook.


Bổ sung 0.6.0: [item-frame.css](../src/features/items/item-frame.css) và [ItemColumnPanel](../src/features/items/ItemColumnPanel.tsx) quản lý khung ngoài, tách tableWidth. [cell-picker.css](../src/features/items/cell-picker.css) đi với popover CellPicker. [repository](../src/data/repository.ts) khai báo canDraft/readOnly, [use-workspace](../src/state/use-workspace.ts) giữ nháp nguồn thật và xác nhận kết quả ghi. [Code.gs](../server/Code.gs) có chẩn đoán read-only và bảo vệ client cũ.

Probe không phát hành: [ExcelWriteProbe](../server/probes/ExcelWriteProbe.gs) chỉ bản sao cố định; [DriveConditionalProbe](../server/probes/DriveConditionalProbe.gs) chỉ tệp giả tự tạo, [manifest thử](../server/probes/drive-probe.appsscript.json) tách quyền khỏi app chính; [check-excel-package.py](../scripts/probes/check-excel-package.py) kiểm bảo toàn ZIP/cell/công thức trước phép thử. .private-probes giữ bản tải riêng để đối chiếu, không đưa vào build/chia sẻ.

[ExcelWriteCore.gs](../server/ExcelWriteCore.gs) là pure codec canonical được build vào server/dist. [WorkbookRoundtripProbe.gs](../server/probes/WorkbookRoundtripProbe.gs), [ExistingCopyAccessProbe.gs](../server/probes/ExistingCopyAccessProbe.gs), [create-write-fixture.py](../scripts/probes/create-write-fixture.py) và [excel-write-core.test.ts](../tests/excel-write-core.test.ts) phục vụ kiểm tra trên fixture/bản sao thử. Probe scripts không được đóng gói vào app; việc đóng gói core không chứng minh ghi workbook nguồn thật đã được nối vào app.

[OfficeConcurrencyProbe.gs](../server/probes/OfficeConcurrencyProbe.gs) đã được kiểm trên workbook giả tự tạo: lúc 19:48, ghi sau khi sửa qua Office thành công và ETag cũ trả 412; lúc 19:50, lần đọc muộn vẫn thấy cả hai sửa đổi. Đây chỉ là kết quả probe trên workbook giả, không chứng minh ghi workbook nguồn hay hoàn tất F31; probe không đóng gói vào app.

[ExistingCopyWorkbookProbe.gs](../server/probes/ExistingCopyWorkbookProbe.gs) và manifest [drive-copy-test.appsscript.json](../server/probes/drive-copy-test.appsscript.json) được dùng trong dự án thử riêng; quyền Drive thử đã được cấp. Lúc 23:19, `getAuthorizationInfo` trả `NOT_REQUIRED`, About trả 200 và `accountMatchesCopyOwner=true`, còn GET bản sao trả 200 với MIME XLSX và ETag. `testExistingCopyExcelRoundtrip` chạy 23:21–23:22 trên fixed copy `19fv…` đạt: giữ cùng ID/MIME, ETag cũ trả 412, `contentReadBack`, `blobMatchesUpload`, `otherParts` và `otherCells` đều true; `restoredOriginalBytes=true`. Ảnh kết quả: existing-copy-roundtrip-pass-0.6.1.png (tệp chưa đồng bộ: `assets/existing-copy-roundtrip-pass-0.6.1.png`). Đây chỉ là phép thử trên bản sao cố định; workbook Excel nguồn và kho nguồn không đổi. Writer chưa tích hợp vào app và F31 chưa hoàn thành.

[existing-copy-probe.test.ts](../tests/existing-copy-probe.test.ts) kiểm tra các guard trước ghi bằng API Drive mock (metadata, chủ sở hữu/quyền riêng tư, ETag, scope gate và nhả lock); 9 guard tests, full suite 138/19, typecheck và docs check đạt. Docs check kiểm 18 Markdown, 265 liên kết và 36 mã Fxx. Đây là bằng chứng cục bộ, ngoài phép thử bản sao cố định mô tả ở trên; không phải nghiệm thu ghi workbook nguồn.



## Candidate local 0.6.2 — 15/10/2026, chưa deploy

Candidate tách `sourceKind` (demo/Google) khỏi capability `readOnly`; việc là nguồn Google không tự đồng nghĩa được phép ghi. `ExcelRepository` dùng Google bridge data RPC. `ExcelWriteCore.gs` là pure codec; `ExcelTransactions.gs` điều phối receipt, backup, CAS/If-Match và phản hồi chưa xác định; `ExcelService.gs` dùng Drive transport, mặc định OFF nếu registry chưa cấu hình hợp lệ và kiểm tra owner-only registry/kho. `PrivateExcelTestHost.gs` chỉ nhận fixed private copy trong project thử. `npm run build:server` tạo `server/dist` và `server/dist-test`; đây là artifact local, không phải deploy.

Main `/exec` vẫn v5/0.5.2; manifest Sheets chính chưa đổi. Drive scope được cấp cho project thử riêng, không cho app chính. Chưa host UI test candidate. Không suy ra ứng dụng đang mở đã lưu được vào Excel; đợi release/deployment được xác nhận. Hợp đồng RPC xem [API](API.md).
