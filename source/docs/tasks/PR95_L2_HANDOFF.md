# PR #95 — LUỒNG 2: BÀN GIAO APP/STATE/REPOSITORY (CHƯA TÍCH HỢP)

Ngày: 2026-10-30. Trạng thái: WORKER / DRAFT / NOT RELEASE READY. Luồng 1 là **người tích hợp duy nhất**, không tự cherry-pick, merge, publish hoặc triển khai Firebase.

## 1. Phạm vi, mốc mã nguồn và quyền sở hữu

- Repository: `cavoixanh638/HopHDND-WebApp`.
- Nhánh làm việc **duy nhất**: `pr95/l2-app-state-firebase-only-20261030`.
- **SPLIT_BASE = `099132ee722fe8c1ea1e9976e64e2e4f75809641`**. Đã kiểm tra nhánh khởi đầu giống hệt commit này, `ahead_by=0`, `behind_by=0`; không reset lịch sử.
- **Mã nguồn L2 tại thời điểm soạn handoff: `237a75ef1c0dc2063f0ecc054dfac4ff65423f64`**. Commit chứa file handoff được xác định bằng HEAD mới của nhánh trên GitHub (không tự chèn SHA của chính commit chứa nó vào file).
- PR rà soát/CI riêng, **DRAFT, tuyệt đối không merge**: https://github.com/cavoixanh638/HopHDND-WebApp/pull/96 . Chỉ Luồng 1 tích hợp vào PR #95, chưa về main.
- Contract bị khóa: `source/docs/tasks/PR95_PARALLEL_CONTRACT.md` tại SPLIT_BASE; không sửa. Không thay backend V2, Firebase Rules, shared/types, domain/items, scripts/workflows, source/package.
- Không truy cập/ghi dữ liệu production, không deploy, không publish hay commit Excel thật/backup. Chỉ fixture tự tạo, unit tests và Emulator do CI chạy.

## 2. Tệp đã thay đổi — tất cả thuộc mục D của contract

| Đường dẫn | Nội dung |
| --- | --- |
| `source/src/app/App.tsx` | Tạo `FirebaseRepository` với expected active pointer; chặn khởi chạy dữ liệu Firebase khi `datasetEpochReady=false`; tách sourceKey theo `generationId/operationId/revision`; tái tạo repository/lease manager khi bất kỳ thuộc tính xác định epoch nào thay đổi; giữ luồng Google Authentication, bố cục/resize/CAS và giao diện sẵn có. |
| `source/src/state/use-firebase.ts` | Lắng nghe `datasetV2/active`, kiểm tra shape và khóa truy cập trước khi có con trỏ xác nhận; nếu V2 từng tồn tại mà pointer bị xóa/hỏng/lỗi quyền thì fail closed, không âm thầm chuyển `hdnd/items`; permission CAS kiểm tra active pointer trước và sau kể cả giai đoạn legacy. |
| `source/src/data/firebase-repository.ts` | `sameDatasetEpoch` so đầy đủ pointer; `list/history/save` kiểm pointer đầu-cuối; subscription V2 chỉ xuất bản hàng khi pointer đúng, dọn dữ liệu hiển thị cũ nếu pointer sai; không cho `importItems` API cũ trên V2. Các kiểm tra phía client **không thay thế** Rules. |
| `source/src/state/use-workspace.ts` | Loại nháp/checkpoint workspace cũ sau khi source/epoch đổi; ngăn callback subscription cũ và lưu khi source chưa active; không tự ghép nháp theo ID trùng; giữ luồng giữ nháp trong cùng thế hệ. |
| `source/src/data/cell-edit-leases.ts` | Lease theo generation; bảo vệ race `acquire` khi manager đã dispose; `cancel` giải phóng đúng generation path; `has/proof/markPending/preserveDraft/recoverDraft` đều từ chối manager đã hủy. |
| `source/src/features/settings/VersionedExcelReplacementPanel.tsx` | UI staging/readback/preview/commit/restore gọi **đúng API Luồng 1 đã có**, chỉ bật trên Emulator, thêm ô tra cứu operationId độc lập (hữu ích khi reload/mất ACK), không tự retry. |
| `source/tests/firebase-config-state.test.ts` | Cập nhật **fixture mô phỏng con trỏ legacy ban đầu** và `get` mock đúng chuỗi kiểm pointer mới; giữ nguyên assertions phân quyền/CAS thực tế. |
| `source/tests/pr95-app-generation.test.ts` (mới) | Unit tests dữ liệu giả: đối chiếu full epoch, đọc đúng path với pre/post pointer, từ chối đổi con trỏ khi đang đọc, từ chối stale save/history, subscription chờ pointer và dọn old rows sau switch. |
| `source/tests/pr95-app-lease-epoch.test.ts` (mới) | Unit tests dữ liệu giả: draft cùng ID không lẫn qua hai generation, manager dispose từ chối lease/proof và đọc/ghi nháp cũ. |
| `source/docs/tasks/PR95_L2_HANDOFF.md` (mới) | File bàn giao này. |

## 3. CI và bằng chứng phân biệt lỗi gốc

**Đã xác minh tại commit `69f276e068184ba4006a0c203417e75e377fcde7`:**

- `Verify HopHDND source` run **40997810504: FAILURE** tại riêng bước **Firebase emulator tests**. `npm run typecheck`: **PASS**; `npm test` (unit): **PASS**; các bước trước Emulator không bị lược bỏ.
- Vẫn **3 lỗi `permission_denied`** trong `tests/firebase-versioned-replacement.test.ts` ở case staging/commit/restore (line 54), two tabs CAS (line 90), old/new lease (line 100), lỗi phát sinh tại `src/data/firebase-versioned-replacement.ts:214`; **đã được ghi rõ từ SPLIT_BASE/tiền nhiệm trong contract** (run nền #40993112430). Đây là phần backend/Rules Luồng 1, không phải unit regression còn lại của L2. Không tắt `.validate`, không nới Rules và không xóa test.
- `Verify isolated Firebase staging` run **40997810616: SUCCESS** (không đủ chứng minh V2 swap thành công).
- `Firebase operational QA — isolated multi-account test` run **40997810551: SUCCESS** (không đủ chứng minh V2 swap).
- Các lần commit trung gian có lỗi assertion fixture do L2 gây ra; đã sửa. **Code HEAD `237a75ef1c0dc2063f0ecc054dfac4ff65423f64`:** verify source run **40998185861**: **typecheck PASS, unit tests PASS**, test kích thước cột R02 PASS, kiểm tra backup offline PASS, docs check PASS; **Firebase Emulator vẫn đúng 3 lỗi nền `permission_denied`**, không có lỗi mới. Isolated staging **40998185874 SUCCESS**, operational QA **40998185840 SUCCESS**.
- **Handoff commit `6acef56ec5fd75405c86d7c2cf3232085de129f7`:** Verify HopHDND source **40998275920 FAILURE** chỉ tại bước Firebase Emulator (typecheck/unit/docs PASS); isolated staging **40998275946 SUCCESS**, operational QA **40998275915 SUCCESS**. Kết quả này không được suy rộng thành V2 GO.
- Browser smoke/build Pages sau bước Emulator vẫn chưa chạy trong verify source này do workflow dừng ở lỗi nền; chưa có bằng chứng end-to-end List/Report sau swap thực dưới Rules.

## 4. Những điều đã triển khai và chưa được xác minh

**Client implemented:** List/Reports cùng nhận `workspace.items` từ một instance repository theo epoch; history/save cùng instance; chưa tải nguồn Google Sheets trong đường dữ liệu sản xuất nếu ứng dụng có Firebase; Google OAuth vẫn giữ nguyên. Epoch switch reset workspace, nguồn xem và manager lease; cùng recordId hoặc displayCode không được coi là quyền áp dụng nháp cũ. Preview staging/ReportTable dùng bản candidate mà API đọc lại; thao tác ghi thật V2 panel luôn bị khóa ngoài Firebase Emulator.

**NOT VERIFIED / NOT DONE:** quyền đọc active pointer cho guest thực tế; full Rules-signed generation writes, server-authoritative stale epoch fencing, CAS giữa chỉnh sửa cùng generation và replacement, full UI read/write/history/permission/lease trong Emulator sau khi swap; chuyển lần đầu từ `hdnd/items` legacy còn dữ liệu; độ bền trạng thái STAGED/UNKNOWN qua reload; semantic operationId sau swap/restore; restore/readback và tiêu chí production release. L2 chỉ thêm client preflight/postflight để giảm lỗi người dùng; race giữa preflight và transaction **phải do Rules của L1 xử lý trên server**, không thể đảm bảo an toàn bằng client.

## 5. Đề nghị API-CHANGE cho Luồng 1 — đã gửi trực tiếp PR #95

**Comment API-CHANGE trong PR #95:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6514293219

1. **API-CHANGE-01 — kích hoạt V2 lần đầu từ legacy có dữ liệu**: hiện `stageDatasetReplacement(...):Promise<ReplacementApproval>` yêu cầu `expected:ActiveDatasetPointer`, nên không đủ bảo đảm khởi tạo khi pointer null và legacy populated. Đã đề nghị tách prepare/commit activation với baseline legacy, backup/rights/locks, server CAS, readback, chặn old writes. **Chỉ là đề nghị**, L2 chưa thêm API hay type.
2. **API-CHANGE-02 — tra cứu lịch sử `operationId`**: hiện `resolveDatasetOperation(...)` trả `'committed'|'not-committed'|'unknown'` và chỉ nhận committed nếu đang active; đề nghị phân biệt `committed-active`, `committed-historical`, `not-committed`, `unknown` với generationId để hỗ trợ LOST ACK, restore và replay. Chờ L1 ACK chữ ký/wire.
3. **L1 Rules required**: guest/admin đọc con trỏ và items đúng thế hệ, quyền V2/cell lease, write stale generation bị từ chối tại server; old `hdnd/items` bị chặn sau cutover; same-generation writes không lọt qua snapshot CAS. Các điều này **không thể được giải quyết bằng mã client**.

**Quy tắc phối hợp:** Luồng 1 ghi rõ before/after API + wire format + test và ACK trong PR #95; Luồng 2 mới điều chỉnh chữ ký sau đồng ý. Không thay shared types, contract hoặc backend ở nhánh này.

## 6. Hướng dẫn tích hợp và kiểm tra

- Luồng 1 đối chiếu diff từ `099132ee722fe8c1ea1e9976e64e2e4f75809641` tới HEAD của `pr95/l2-app-state-firebase-only-20261030`; chỉ các file liệt kê ở mục 2 được sửa.
- Không cherry-pick vào main. Luồng chính tích hợp vào PR #95 theo thứ tự L1 → L2 → L3 sau khi thống nhất API và chốt security Rules.
- Chạy `npm run typecheck`, `npm test`, `npm run test:firebase`, `npm run build:pages`, browser smoke với Emulator/dữ liệu giả; **không skip test nào** và phải xem CI đúng HEAD, không suy diễn từ workflow xanh không chứa V2.
- Chưa GO và tuyệt đối không deploy Firebase/Pages hay sử dụng Excel thật. Chờ Luồng 1 sửa ba lỗi backend, trả lời API-CHANGE và chạy chéo Luồng 3.


---

## 7. L2 follow-up sau mốc tích hợp `1c9dbf0780375bd426db6dbe42e78d06e01829dc` — API-CHANGE-02

Ngày 2026-10-30. Phần này **bổ sung** cho bàn giao ban đầu ở trên; các thông tin CI/lỗi nền ở mục 3–6 là lịch sử tại thời điểm chia ba luồng, không còn mô tả toàn bộ trạng thái tích hợp hiện nay.

### Phối hợp ACK / nhánh / nguyên tắc

- ACK chính xác chữ ký mới của L1 trong PR #95: https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6514617603
- **Chữ ký đã thống nhất:** `resolveDatasetOperation(database:Database,operationId:string):Promise<{status:'committed-active'|'committed-historical'|'not-committed'|'unknown';operationId:string;generationId?:string}>`.
- Nhánh tiếp nối **độc lập**, được tạo và kiểm tra từ đúng tích hợp `1c9dbf0780375bd426db6dbe42e78d06e01829dc` (0 ahead/behind trước sửa): `pr95/l2-operation-status-v2-after-integration-20261030`. Không reset/đổi nhánh L2 cũ.
- **Code commit của đợt này trước khi ghi handoff:** `5985a7d54c00b468e4525c22e93c8739665456c6`. File handoff mới nhất có commit SHA riêng sau commit mã. Luồng 1 cần xác minh HEAD/diff trước khi tích hợp.
- Luồng 1 đã merge PR nháp worker #100 ở commit code `8a0537e9c931124bcfb5eef216e5a1f9ac6c97bb`, chỉ một **checkpoint sớm**; những điều chỉnh bổ sung sau checkpoint được mở bằng **PR nháp #101**: https://github.com/cavoixanh638/HopHDND-WebApp/pull/101 . **Không tự merge**.
- L1 triển khai backend ở PR #95 riêng; L2 **không sửa** `src/data/firebase-versioned-replacement.ts`, Firebase Rules, test của L1/L3, shared types hoặc contract.

### File L2 đã sửa trong follow-up

1. `source/src/features/settings/VersionedExcelReplacementPanel.tsx`: UI-only `presentDatasetOperation` và `readOperationView` đọc kiểu trả về object mới, đối chiếu operationId và optional generationId; hiển thị 4 trạng thái rõ ràng, đặc biệt `committed-historical` là **đã commit thành công trong lịch sử, không phải lỗi**. Kiểu string cũ/shape lệch/truy vấn thất bại được coi `unknown`, không chuyển thành `not-committed`. Sau kết quả commit/restore thông thường tra cứu một lần; khi backend throw do thao tác đã thành historical thì chỉ tra cứu **read-only**, không thực hiện lại giao dịch. `UNKNOWN` khoá nút thực hiện lại cùng operationId/restoreId và tạm khóa staging mới khi kết quả ghi chưa rõ. Panel vẫn chỉ thực thi các API ghi khi `enabled` do Firebase Emulator.
2. `source/tests/pr95-app-operation-status.test.tsx` (file mới hợp lệ theo mục D): kiểm thử fixture giả cho 4 trạng thái, legacy string/malformed ID/generation, read/network failure, lookup thủ công, `UNKNOWN` không retry hoặc tạo staging tiếp, lỗi backend nhưng log historic COMMITTED của commit/restore, không truy vấn khi disabled.
3. `source/docs/tasks/PR95_L2_HANDOFF.md`: ghi bàn giao bổ sung (file này).

### Bằng chứng CI, lỗi cũ và giới hạn

- Tại `8a0537e9c931124bcfb5eef216e5a1f9ac6c97bb`, Verify source #41000733694: **Typecheck PASS, Unit tests PASS, Docs PASS**, thất bại ở **independent L3 real Emulator suite**, không phải ở unit/UI của L2. Test L3 tại thời điểm đó còn so `resolveDatasetOperation(...)` với string cũ và có một ca ghi ô chưa đúng chuẩn lease/audit; đã nêu rõ trong review. Không sửa Rules hoặc tắt test.
- L1 sau đó cập nhật backend theo đúng signature ACK và cập nhật L3 independent race test trên nhánh tích hợp (các commit sau `1c9dbf`). L2 giữ code trên branch riêng, tuyệt đối không tự thay backend/L3.
- **Follow-up HEAD trước cập nhật kết quả CI: `7eb66d4371bf8d983ac5875e237d6cfb0719781b`** (code SHA `5985a7d54c00b468e4525c22e93c8739665456c6`). **Verify HopHDND source #41001160514 = FAILURE duy nhất ở bước `Browser smoke with mock Sheets and headless Chrome`**. **Typecheck PASS, Unit tests PASS, Docs PASS, Firebase Emulator tests PASS với Rules thật, build Pages / Pages test PASS, historical W0 measurement PASS**. `Firebase operational QA — isolated multi-account test` **#41001160522 = SUCCESS**. Browser log ghi `BROWSER_SMOKE_FAIL: Mock Sheets row NQ01 did not render` và `Sai Firebase project/instance`; đây là lỗi mock Sheets/browser route đã được L1 nêu ở PR #95 trước khi L2 sửa status API, **không phải lỗi TypeScript, unit hay V2 Emulator mới**. Không sửa/nới Rules, không quay lại Google Sheets vận hành, không bật production. Bước browser smoke cần phân tích độc lập và không được tuyên bố end-to-end PASS.
- Commit ghi nhận CI trong file handoff được đẩy **sau** `7eb66d`; workflow tại commit tài liệu mới có thể chạy lại, và phải được kiểm tra theo HEAD cuối nếu tiếp tục công việc.
- Không GO production. Các điểm còn chờ Luồng 1: API-CHANGE-01 kích hoạt V2 từ populated legacy với cross-path CAS; kiểm chứng full Rules, lost ACK/restore/historical operation và Chromium 2-tab end-to-end; CI full pass, browser smoke. Không đọc/ghi/import/delete production.

### Bàn giao tích hợp

L1 kiểm tra **diff còn lại** giữa PR #95 integration branch hiện hành và PR nháp **#101**; chỉ áp dụng thay đổi trong 3 file L2 ở trên. Không cherry-pick toàn bộ commit cũ trong worker nếu phần trước đã được tích hợp bởi PR #100. Chạy `npm run typecheck`, `npm test`, `npm run test:firebase` (Rules thật), `npm run build:pages`, browser smoke; phân biệt lỗi L3/backend đã tồn tại với regressions do L2. Không merge main/publish/deploy.

---

## 8. L2 follow-up — Firebase-only Browser smoke sau tích hợp `143e34c05c6ec431eb2ebf80021045a2213e1d15`

**Ngày 30/10/2026; đây là lượt tiếp nối độc lập, không reset nhánh L2 cũ.**
- Branch: `pr95/l2-firebase-only-browser-smoke-20261030`, tạo tại đúng `143e34c05c6ec431eb2ebf80021045a2213e1d15`, xác nhận trước sửa 0 ahead/behind.
- **Exact CI-tested code SHA:** `b5db6aba6bc4d5481fa42b032ac7ec53a3d1caf5`.
- **L2 Draft worker PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/102 (chỉ tích hợp bởi Luồng 1).
- **Only changed existing source:** `source/scripts/smoke-pages-browser.mjs`; mục 8 handoff này là thay đổi documentation L2 được phép. Không chỉnh backend/Rules/workflow/project allowlist, không publish/deploy/production.

### Thay nguồn kiểm thử, KHÔNG làm yếu kiểm tra

1. Bản trước intercept `docs.google.com/spreadsheets/*/gviz` trả bảng giả và bấm `Xem dữ liệu tạm`; lỗi ở Firebase-only vì ứng dụng không còn vận hành bằng Google Sheets. Đã bỏ **chỉ mock và thao tác chuyển nguồn**, không bỏ kiểm tra `NQ01` hoặc bộ assert giao diện cũ.
2. Script khởi động Auth + RTDB emulators ngay trong phiên bằng `firebase emulators:start --project demo-hdnd --only database,auth --config firebase.json`, đợi Hub xác nhận port localhost `9099`/`9000`, chỉ kết thúc khi Chrome QA hoàn tất. Bản kiểm thử tự sở hữu vòng đời Emulator nên không cần sửa workflow/runner; chạy sau `npm run test:firebase` cũng dùng phiên Emulator mới.
3. Dùng REST **owner token chỉ trên localhost demo Emulator** để nạp dữ liệu giả, readback kiểm tra đủ 54 rows và con trỏ `hdnd/datasetV2/active`, generation `gen_pr95_browser_smoke_20261030`. Các hồ sơ nằm trong đúng đường dẫn `hdnd/datasetV2/generations/<generationId>/items` mà `FirebaseRepository` của App đọc. Auth đăng nhập ẩn danh thật qua Emulator và RTDB Rules thật.
4. Chrome xác nhận Danh sách có `NQ01`, `NQ54`, Ghi chú, đủ 54 rows, không bấm chế độ tạm; mở Báo cáo và xác nhận **5 report tables**, phòng ban `Sở kiểm thử` và nonzero counts (tổng hợp fixture). Quay lại Danh sách tiếp tục full regression UI. Chặn request `docs.google.com/spreadsheets` và Firebase production trong phiên.
5. Toàn bộ script browser CDP test hơn ba nghìn dòng về bố cục, 52px ID, resize, hover, 15 filter, search, lịch sử của khách, popup, báo cáo, mobile và screenshot vẫn được thực thi, không skip vì thay nguồn.

### Bằng chứng GitHub Actions / exact SHA

**Verify HopHDND source #41004145273 = SUCCESS** tại chính `b5db6aba6bc4d5481fa42b032ac7ec53a3d1caf5`:
https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41004145273

- Typecheck **PASS**, unit tests **PASS**, Firebase Emulator Rules/race **PASS**, Pages builds/compatibility **PASS**, W0 historic measurement **PASS**, Browser smoke **PASS**, screenshots/previews generated. Không deploy.
- Log có `FIREBASE_BROWSER_SEED_VERIFIED` `rowCount:54`, `FIREBASE_ONLY_LIST_REAL_BROWSER_PASS` `rows:54`, `FIREBASE_ONLY_REPORT_REAL_BROWSER_PASS` `tables:5`, `GUEST_TWO_FIELD_HISTORY_PASS`, và cuối `BROWSER_SMOKE_PASS`.
- Lượt CI trước `d94a...` FAIL do health-check Auth **trong test mới**, dù Emulator thực tế đã ready; L2 sửa dùng Emulator Hub, không thay đổi App hay Rules. Đây không phải lỗi cấu hình Firebase production.
- Dòng `Sai Firebase project/instance` thuộc **negative backup-helper test** và test đó PASS. Không sửa project allowlist.
- Tên bước workflow hiện vẫn là `Browser smoke with mock Sheets and headless Chrome` dù bên trong đã là Firebase-only; **đề nghị Luồng 1 đổi nhãn** thành `Browser smoke with real Firebase Emulators and headless Chrome` tại `.github/workflows/verify-source.yml` (ngoài ownership L2), chỉ sửa nhãn, không đổi test logic. Không bắt buộc đổi nhãn để CI PASS.

**Handoff:** Luồng 1 review diff PR #102, chỉ cherry-pick/merge phần L2 script + tài liệu theo đúng ownership vào **nhánh tích hợp PR #95**, không main. Chạy toàn bộ CI tại HEAD tích hợp mới; worker-green `b5db6ab` không thay thế bằng chứng integrated HEAD. PR #95 giữ DRAFT; chưa sẵn sàng GO production cho đến khi toàn bộ release gates khác được chốt.