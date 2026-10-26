## 26/10/2026 — BẢN ĐỒ GỘP CODE VÀ TRUY VẾT HAI BACKEND

**Trạng thái đã xác minh trên GitHub ngày 26/10:** PR #72 `259c36acaa3d35367459204fda81a58bff7abc32` (Firebase security/lease); PR #73 `66553279791cddec0039c54a0da194a8ec24d1c0` (Supabase foundation); PR #75 `afb10fe2e5371a81a54fa736ecac403bb7fe57b2` (source-selector, **base là nhánh #73**); PR #76 `docs/dual-backend-coordination-20261025` (docs). Các PR đều **Draft**, chưa có integration head được nghiệm thu. Thực tế `list_pr_changed_filenames`: #72 ↔ #73 có **7** đường dẫn trùng, #72 ↔ #75 có **14** đường dẫn trùng. Đừng dùng số liệu overlap cũ (11 file) để tính công hợp nhất. Hai PR xếp chồng có thể làm diff thay đổi khi base được rebase/merge; phải đo lại ngay tại integration.

**Một bản phát hành = một commit tích hợp = một ma trận kết quả.** Không ghép PR #73 và PR #75 như hai PR độc lập vào `main` (vì #75 stacked), không merge #72 vào `main` chỉ để “lấy code”. Người tích hợp duy nhất dùng branch `integration/firebase-supabase-source-choice` bắt đầu từ **exact head mới nhất của PR #72** sau khi đóng băng phiên review, đưa vào **delta Supabase #73** trước, rồi **chỉ delta #75 so với base #73**; hợp nhất thủ công từng hunk của file trùng. Nếu việc tạo branch đó chưa thực hiện, phải giữ nguyên trạng thái “chưa tích hợp” thay vì ghi PASS. Chỉ merge PR/ghép branch bằng thao tác review được log và có commit SHA. Không tự động dùng `git merge -X theirs`, `git checkout --theirs` hay copy nguyên thư mục `src`.

**Vùng tích hợp chung phải review trực tiếp**: `App.tsx`, `use-workspace.ts`, `ItemList.tsx`, `CellPicker.tsx`, `InlineNoteEditor.tsx`, `LeaseTextInput.tsx`, `ReportDetailGrid.tsx`, `cell-edit-leases.ts`, `verify-source.yml`, `ARCHITECTURE.md`/`WORKBOARD.md`. Các thay đổi quyền Google UID, Auth state, lease, audit, freeze đã được kiểm ở Firebase #72 phải được giữ khi thêm source chooser; không hồi quy thành anonymous writer. SQL migrations/RLS Supabase của #73/#75 **không** được lẫn vào Firebase Rules.

**Backend contract (dùng khi giải quyết từng file trùng):** `sourceId=(kind, projectOrInstance, tenantOrAccount)`; mỗi tab duy trì `activeSourceId`, `authState`, `dataSnapshot`, `profile`, `permissions`, `lease`, `draft`, `pendingAck`, `audit` và `freeze` riêng; UI lấy toàn bộ từ đúng source adapter. Chuyển nguồn chỉ khi chưa có editor, lease, dirty draft, offline/pending ACK; chuyển nguồn không gây ghi Firebase `hdnd/profile.dataSource`, không tự copy/ghi hai nơi, không lấy dữ liệu nguồn A làm fallback cho B. Nếu Supabase chưa đủ RPC/Auth/Realtime thì khóa sửa rõ ràng và gắn nhãn `Supabase staging chỉ xem`, không trình bày như nguồn đã hoàn thiện.

**Quy trình tích hợp và đóng dấu audit cho mỗi lượt:**
1. Ghi `HEAD_72`, `HEAD_73`, `HEAD_75`, commit nền PR #75, commit tài liệu #76, và bảng kiểm danh sách file trùng vào cùng [issue #74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74); một owner quyết định conflict từng file.
2. Commit 1: tiếp nhận #73 (schema/RLS, adapter Supabase, test), không sửa đường write Firebase; chạy Firebase tests + SQL tests.
3. Commit 2: tiếp nhận delta #75 (selector, guard, UI và read-only preview); xử lý xung đột file chung; chạy build/TypeScript, UI/browser smoke, Auth+RTDB Emulator, Supabase SQL RLS/RPC.
4. Commit 3+: hoàn thiện những tính năng Supabase còn thiếu (Google Auth đã xác minh, per-UID/role RLS, per-cell lease/CAS, server-ACK audit, freeze/drain, Realtime subscriptions), và test đa trình duyệt, đổi nguồn với draft/lease đang giữ, offline/reconnect, source isolation, 15 cột và 5 báo cáo. Một failing test phải giữ `HOLD`, không tắt test để qua CI.
5. Chốt manifest JSON/tài liệu **không chứa secret hoặc dữ liệu công vụ**: `integration_head_sha`, `source_sha_72/73/75/76`, migrations checksums, RTDB Rules SHA256, Supabase RLS/RPC version, asset bundle SHA256, CI URLs/status, 2-browser test receipt, decision GO/NO-GO, backup/import plan. Ghi ở `CURRENT_STATE.md` + issue #74, không tạo một hệ workboard khác.
6. Chỉ khi chủ dự án chấp thuận GO riêng, mới merge/publish exact integration commit, backup và import bộ dữ liệu được chốt, readback, cấp quyền người dùng và rollback giữ các chỉnh sửa ACK. Dự án chạy **một WebApp**, có thể chọn backend nhưng không có tính năng tự đồng bộ giữa hai kho.

**Quy tắc thay đổi tài liệu liên tục:** commit nào đổi source chooser, Auth/ACL, database schema, local scripts, build/deploy hoặc storage đều phải đi kèm cập nhật **AGENTS/ARCHITECTURE/CURRENT_STATE/CAI_DAT_VA_CHAY/VAN_HANH** thích hợp trên cùng PR. PR docs #76 là hợp đồng nền để đồng bộ vào branch tích hợp, không đồng nghĩa đã chạy merge thực tế.

---

## 25/10/2026 — Điểm phối hợp duy nhất, không mở thêm luồng phát triển

| Luồng / PR | Vùng sở hữu | Không được làm | Điều kiện bàn giao |
|---|---|---|---|
| Firebase [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) | RTDB Rules/Auth/nhân viên UID, row CAS, cell leases, freeze, local staging | Tự sửa router chọn Supabase, ghép PR #75 hoặc deploy main | Exact head, CI Firebase, nhận diện thay đổi trong file UI chung |
| Supabase nền [#73](https://github.com/cavoixanh638/HopHDND-WebApp/pull/73) | Postgres schema/migrations/RLS/RPC, auth và adapter riêng | Đè file Firebase/Auth từ snapshot cũ; nhập dữ liệu thật | SQL/RLS security CI, schema ABI, không lộ secret |
| Supabase giao diện [#75](https://github.com/cavoixanh638/HopHDND-WebApp/pull/75) (base #73) | Tab source switch, guard nháp/lease/ACK, Supabase QA read-only rồi write-path khi đủ gate | Ghi `profile.dataSource` Firebase chung khi đổi nguồn, fallback ngầm, sửa chung file không đối chiếu | Exact head, nguồn đích visible, Supabase auth/ACL/audit/realtime E2E, Firebase regression |
| **Người tích hợp (điều phối #74)** | Quyết định hunk ở `App.tsx`, `use-workspace.ts`, `ItemList.tsx`, editors và docs; tập hợp final build | Merge độc lập/ghi đè cả file, triển khai Rules/data/web khi chưa GO | Hợp đồng chuẩn, cùng 1 SHA tích hợp và CI cả hai, browser 2–3 UID, rollback đầy đủ |

**Hiện chưa có head tích hợp đã được nghiệm thu; các PR vẫn Draft.** Không tạo thêm nhiều AI-chat/workboard riêng cho từng xung đột nhỏ; ghi trạng thái/tài liệu thực hiện ngay trong [issue #74](https://github.com/cavoixanh638/HopHDND-WebApp/issues/74) và [CURRENT_STATE](CURRENT_STATE.md). Rà soát PR #72/#73/#75 theo ngày/commit, không gắn nhãn hoàn thành nếu CI đầu nhánh khác mới PASS.

---

# Điều phối triển khai

> **Bản sao GitHub:** một số ảnh bằng chứng trong tài liệu lịch sử chưa được đồng bộ vào `docs/assets/`. Tên tệp được giữ để tra cứu trên bản lưu gốc; không xem đường dẫn này là ảnh có sẵn hoặc bằng chứng đã kiểm trên website.

Rà thiết kế sau PA1/PA2 ngày15/10: Luna rà chỉ đọc mã queue/batch và cập nhật kế hoạch1.18/README; parent kiểm nguồn chính thức, xác định lỗi và bổ sung ARCHITECTURE1.15 cùng trạng thái đánh giá. Đây là đề xuất, không phải triển khai native Sheets hoặc đổi quyền/nguồn thật. Xem kế hoạch mục18.15.

Ngày cập nhật: 15/10/2026. Bảng này ghi phạm vi giao việc; kết quả/bằng chứng chuẩn xem [CURRENT_STATE](CURRENT_STATE.md). Dự án đã có Git; lượt này chưa tạo commit hoặc PR.

| Công việc | Phụ trách | Phạm vi và phụ thuộc | Bàn giao |
|---|---|---|---|
| Chuẩn nghiệp vụ, ma trận và quy tắc AI | Luna, tổng chỉ huy duyệt | AGENTS/SYSTEM/FEATURES; giữ F01–F36 | Tài liệu nguồn chuẩn và stub link cũ |
| Metadata trường, tìm kiếm và mẫu giả | Luna, tổng chỉ huy duyệt | Hợp đồng shared/types từ tổng chỉ huy | 13 trường, search, fixture; đã sửa lỗi bất nhất fixture sau review |
| CSS giao diện | Luna, tổng chỉ huy duyệt | Class từ UI; bố cục/responsive/dialog/print | Styles; điều chỉnh sau ảnh kiểm tra |
| Hướng dẫn chạy và dùng bản thử | Luna, tổng chỉ huy duyệt | Đọc UI thực tế; không hứa chức năng chưa có | Hai hướng dẫn tiếng Việt |
| Chuyển kiến trúc sang một HTML | Luna cập nhật tài liệu; tổng chỉ huy quyết định | Chỉ đạo mới về Drive/Sheets | Kế hoạch 1.3, ARCHITECTURE và stub tài liệu cũ |
| Nghiệp vụ, repository, nháp và UI tích hợp | Tổng chỉ huy | Kế hoạch, SYSTEM và hợp đồng | Bản thử 0.1.0, test và kiểm tra browser |
| Đóng gói/đánh giá React–Preact | Tổng chỉ huy | Cùng source và fixture | Script trong repo, số đo và quyết định prototype |
| Cấu hình nguồn và test cấu hình | Luna, tổng chỉ huy duyệt | URL/gid và storage; default source do người dùng chỉ định | Module, 15 tests; tổng chỉ huy bổ sung phản hồi storage và nhãn tiếng Việt |
| Panel kết nối và hướng dẫn 0.2.0 | Luna, tổng chỉ huy duyệt | Panel theo hợp đồng App; hai hướng dẫn bám UI thực tế | Panel, hướng dẫn; tổng chỉ huy sửa giữ gid khi dán cùng file không có gid |
| Test parser | Luna, tổng chỉ huy duyệt | Mapping/tiêu đề/mâu thuẫn/mã thiếu-trùng bằng fake | 7 tests; tổng chỉ huy review và chạy |
| Adapter/parser, tích hợp nguồn thật chỉ đọc | Tổng chỉ huy | Nguồn cụ thể được người dùng yêu cầu; không ghi/đổi chia sẻ | 0.2.0, 51 nội dung; 4 tests adapter và browser HTTP; file/Drive workflow chưa kiểm |
| Kế hoạch/kiến trúc/trạng thái/bản đồ/test report | Tổng chỉ huy | Phát sinh link nguồn, giới hạn quyền/persistence | Cập nhật tương ứng mốc 0.2.0 và revision kế hoạch 1.5 |
| Rà các thao tác cũ: danh sách/danh mục/lịch sử/Excel/cache/ghi | Luna audit_legacy_controls, tổng chỉ huy đối chiếu | Read-only HTML đang dùng và hai script; phân biệt UI/code/JSON/deploy | Inventory dòng mã, xác minh ID/STT chỉ xem và JSON cấu hình khác backup Excel |
| Rà độ phủ source mới F01–F36 | Luna audit_new_coverage, tổng chỉ huy duyệt | Chỉ mã hiện có; nguồn thật chỉ đọc khác lưu mẫu | Inventory khoảng trống; tổng chỉ huy đối chiếu lại popup cũ để không ghi nhầm trường bị mất |
| Chuẩn đối chiếu và phương án gom tùy chỉnh | Tổng chỉ huy | Bằng chứng hai inventory + đọc trực tiếp báo cáo/editor cũ | CURRENT_STATE đủ 36 dòng; FEATURES chi tiết bổ sung; kế hoạch 1.6, ARCHITECTURE 1.5 mục 17 |

Luna chỉ sửa các file được giao; tổng chỉ huy review, tích hợp và chạy kiểm tra. Khi phát sinh, cập nhật kế hoạch/quyết định, chỉ mục mã và hướng dẫn liên quan; task hoàn tất không đồng nghĩa toàn bộ Fxx được nghiệm thu sản xuất.

Mốc 0.3.0: Luna `layout_panel` bàn giao ReportLayoutPanel và hai hướng dẫn. Tổng chỉ huy review, viết report-preferences/ReportSettings, tách chế độ xem/tùy chỉnh, kiểm 42 tests và browser HTTP, sửa Esc đọc trạng thái cũ, build một HTML và cập nhật kế hoạch 1.7/kiến trúc 1.6. Không ghi Sheets hoặc thêm thư viện.

Mốc 0.4.0: ba agent Luna gồm `catalog_panel` (panel danh mục), `column_controls` (panel cột/tests/hướng dẫn), `inline_reports` (report preview/kết nối/tests/bản đồ mã). Tổng chỉ huy viết schema/domain/checkpoint/state, review/tích hợp App, kiểm các guard và quan hệ ở cả hai đường Lưu, kiểm browser và đóng gói. Danh mục/bố trí lưu cục bộ theo nguồn/browser; autosave chỉ giữ nháp phục hồi, không áp dụng cấu hình hoặc ghi Sheets; ID hiển thị không thay ID nguồn. 68 tests/12 file, typecheck và docs check đạt; build một HTML đạt, kích thước/bằng chứng chuẩn ở CURRENT_STATE. Không coi mốc local này là nghiệm thu toàn bộ app hoặc quy trình Drive.

Mốc cấu hình dùng chung và thứ tự danh mục: Luna `catalog_order` phụ trách comparator/thứ tự; Luna `sync_panel` phụ trách panel và kiểm thử UI. Tổng chỉ huy tích hợp repository, RPC Apps Script, GViz reader, checkpoint và gói server; review kết quả local. Bằng chứng triển khai và kiểm tra hiện hành xem [CURRENT_STATE](CURRENT_STATE.md) và [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md).

Mốc 0.5.1: tổng chỉ huy phụ trách tích hợp bảng danh sách, cell picker, editor nội dung/ghi chú, checkpoint và cấu hình dùng chung. Tổng chỉ huy kiểm cloud đọc/ghi cả ba phần, đọc lại từ tab thứ hai, chặn stale save và giữ nháp; trả giá trị thử về ban đầu. Quyền kho đã đọc lại chỉ có owner. Người dùng chọn giữ riêng; không mở cho tài khoản khác. Bằng chứng, giới hạn và trạng thái còn lại được ghi tại [CURRENT_STATE](CURRENT_STATE.md) và [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md); hướng dẫn thao tác tại [Hướng dẫn sử dụng](HUONG_DAN_SU_DUNG.md).



Mốc 0.5.2: Luna sync_copy_review sửa nhãn chỉ đọc, rà save-failure của editor, thêm modal checkpoint khác base cho báo cáo/danh mục và cập nhật hai hướng dẫn. Tổng chỉ huy xử lý race tải cấu hình, gate App, retry/read/write sequencing, bảo vệ nháp bảng, viết regression tests và kiểm cloud. Kết quả/bằng chứng chuẩn ở CURRENT_STATE; không đổi quyền riêng tư hoặc cài mật khẩu mới.


Mốc 0.6.0, mục 18 đã duyệt: Luna frame_controls sửa ItemColumnPanel/item-frame.css; Luna sync_copy_review sửa CellPicker/cell-picker.css và hai hướng dẫn. Tổng chỉ huy phụ trách repository/draft/guard/schema/server/test, review toàn bộ và nghiệm thu bản thử riêng. User xác nhận chưa triển khai Apps Script cũ. Đường ghi Excel vẫn đang kiểm; probe bản sao và tệp giả không cấp quyền ghi file nguồn hoặc mở kho. Kết quả cloud và phần chưa kiểm thuộc CURRENT_STATE.


Mốc 0.6.1: tổng chỉ huy kiểm execution log dự án conditional probe, xác nhận200/412/readback/Trash trên tệp giả. Luna sync_copy_review sửa popup/SyncPanel/hai hướng dẫn, frame_controls sửa chữ CatalogSettings/CatalogPanel/ReportSettings. Tổng chỉ huy sửa App/ItemList/state/nhãn commit không sẵn sàng, review hướng dẫn, đóng gói và kiểm UI. Không ghi nguồn hoặc đổi deployment /exec/quyền Drive của app chính.

Kiểm tiếp0.6.1: Luna frame_controls tạo fixture Excel giả3tab và cập nhật REPO_MAP; Luna sync_copy_review viết test core mã dòng/baseline/Unicode, bổ sung regression hàng tự đóng; guard tests nay9, full suite 138/19, typecheck và docs check đạt (18 Markdown, 265 liên kết, 36 mã Fxx). Tổng chỉ huy viết/review core ZIP/XML/conditional driver, kiểm Google workbook roundtrip200/412/Trash, rà quyền theo tệp và bản sao đọc muộn, kiểm modal giữ phần sửa rồi dọn marker riêng. OfficeConcurrencyProbe do tổng chỉ huy chuẩn bị và đã kiểm workbook giả. Quyền Drive đã cấp cho dự án thử riêng. Google lúc 23:19 trả `getAuthorizationInfo=NOT_REQUIRED`, About 200/account match chủ sở hữu bản sao=true, GET bản sao 200 XLSX/ETag. `testExistingCopyExcelRoundtrip` lúc 23:21–23:22 trên fixed copy `19fv…` đạt cùng ID/MIME, stale ETag 412, contentReadBack/blobMatchesUpload/otherParts/otherCells=true và restoredOriginalBytes=true; ảnh ở docs/assets/existing-copy-roundtrip-pass-0.6.1.png. Đây chỉ là kiểm tra bản sao cố định: workbook Excel nguồn/kho nguồn không đổi, writer chưa tích hợp vào app, F31 chưa xong. Kế hoạch1.15 cập nhật phát sinh; bằng chứng và giới hạn chuẩn ở CURRENT_STATE/KIEM_THU_VA_NGHIEM_THU.


Mốc 0.6.2 — 15/10/2026: tổng chỉ huy tích hợp `ExcelRepository`/data RPC, `ExcelTransactions` (receipt, backup, CAS và unknown reply), `ExcelService` (Drive transport và registry owner-only), core pure codec và script `build:server`. Luna cập nhật REPO_MAP, README, WORKBOARD và hướng dẫn dùng để phân biệt **Lưu dữ liệu vào Excel** (app → Excel) với **Đọc lại dữ liệu và danh mục từ Google** (Google → app). Kiểm local đạt 191 tests/24 files, typecheck, build HTML/server; HTML149.008 byte/gzip43.601 byte.

Mốc Firebase Pages: tổng chỉ huy phụ trách tích hợp repository, Auth, rules/emulator và kiểm tra browser; Luna bàn giao `FirebasePanel`, JSON profile transfer, nhãn storage cho cấu hình báo cáo/danh mục và hướng dẫn [Firebase Pages](FIREBASE_PAGES.md). Kiểm cục bộ đã báo 196 unit pass/9 skip, 9 emulator checks pass và `build:pages:test`/typecheck pass; kiểm Google popup chưa hoàn tất. Firebase production, Auth và rules chưa bị sửa.

Theo duyệt của người dùng, main được kích hoạt và deploy tại deployment v6 lúc11:31 ngày15/10. `prepareDashboardExcelStorage` hoàn tất lúc11:29; `checkDashboardExcelConnection` lúc11:30:08 chỉ đọc và ghi log backendReady=true, actor `phucpixel2025@gmail.com`, 51 dòng, 0 cảnh báo, configRevision12. UI tải mới lúc11:34 xác nhận đúng nguồn (ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, gid60961344), 51 dòng và chế độ sửa; không submit sửa lên nguồn chính. Ảnh: main kết nối/sẵn sàng (tệp chưa đồng bộ: `assets/main-excel-ready-0.6.2.png`), kiểm tra chỉ đọc (tệp chưa đồng bộ: `assets/main-excel-connection-pass-0.6.2.png`). Save/readback/restore chỉ được nghiệm thu trên copy riêng: lưu UI bản sao (tệp chưa đồng bộ: `assets/ui-excel-save-pass-0.6.2.png`), khôi phục bản sao (tệp chưa đồng bộ: `assets/ui-excel-restore-pass-0.6.2.png`). Không gộp hai bằng chứng thành ghi thành công nguồn thật. F31 chưa hoàn tất; lịch sử và tình trạng còn lại ở [CURRENT_STATE](CURRENT_STATE.md).
