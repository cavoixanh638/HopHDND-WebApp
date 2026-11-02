# PR147 — Hồ sơ đưa HopHDND vào sử dụng: dữ liệu, cutover, sao lưu và quay lui

**Lập:** 01/11/2026, rà tiếp 02/11/2026 (Asia/Saigon) · **Nguồn gốc lỗi FRCR-01:** `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` · **Ứng viên fixed PR149 đã kiểm:** `536f4811b84ee0f97f2841e7c746f0362df80a2e` · **Final PR147 Chat1 `CODE_READY`:** `5656a5eaffa4e6b32e5100b11f36697af93c7340` · **production HOLD**.  
**Phạm vi:** chỉ xây dựng phương án theo tài liệu/repo và bằng chứng sẵn có; không truy cập production, import, sửa Rules/runtime, đổi nguồn, merge, publish hoặc deploy. Chat1 là integrator PR147 duy nhất. Hồ sơ này ở nhánh tài liệu **riêng**, không là candidate phát hành.


> **Bản chạy/đo kiểm thay cho checklist lý thuyết:** [PR149 RUNBOOK](pr149/RUNBOOK.md) và [báo cáo S1–S3/FRCR-01/backup restore](pr149/DRILL_REPORT.md). Các kịch bản offline/Emulator được thực thi bằng công cụ riêng; không sử dụng báo cáo bản gốc để xác nhận SHA candidate sửa mới. Manifest ở commit `8a6664e135ed888c7a458e4c4b1518a62890231e` ghi tách biệt nguồn gốc với `finalFixedCandidate`; không dùng SHA/checksum gốc cho mã đã sửa. **FRCR-01:** Rules gốc cho admin sửa quyền generation lịch sử, làm backup COMMITTED mất khả năng restore; chỉ mở sửa khi SHA mới đã chứng minh chặn đường ghi này và restore hợp lệ còn hoạt động. Múi giờ nghiệp vụ: Asia/Saigon.

**Tài liệu đồng bộ:** [Kịch bản nghiệm thu admin và MỘT danh sách xác nhận chủ dự án](PR147_ADMIN_ACCEPTANCE_AND_OWNER_CONFIRMATIONS_2026-11-01.md). Đọc cả hai trước bất kỳ quyết định GO.

## 1. Sổ bằng chứng: những gì biết và chưa biết

| Nội dung | Bằng chứng hiện có | Điều chưa được xác minh |
|---|---|---|
| Mã nguồn/Emulator | **Nguồn gốc 02964722 có FRCR-01 FAIL release dù CI thường xanh**. Chat1 final `5656a5…` PASS [integrated #41328843999](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328843999), [source #41328843871](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328843871), [FULL App #41328843966](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328843966). PR149 chạy độc lập [S1–S3/FRCR/restore #41329223877](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41329223877) trên 536f. **Các run nguồn cũ chỉ làm lịch sử:** [Integrated CI #41291946931](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946931), [Source Verify #41291946979](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946979), [Operational QA #41291946937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946937) SUCCESS cùng SHA; [FULL App Chrome #41291947075](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291947075) **8/8 PASS** với ảnh và server witnesses. | Không chứng minh IAM, Rules Published, tình trạng dữ liệu và người dùng trên Cloud. Không tự suy ra production GO. |
| Đích cấu hình | Mã/tài liệu hướng đến Firebase project `hophdnd-8b7b2`, instance được nêu `hophdnd-8b7b2-default-rtdb`. `firebase.staging.json` chạy demo-hdnd với Auth 9099, RTDB 9000, Functions 5001; codebase `pr142-cell-edit` và `parent-v2`. | Người vận hành phải xác nhận project/database **thực** và website/endpoint/runtime/region/CORS/flags deploy có khớp không. |
| Dữ liệu production quá khứ | Theo kết quả người vận hành 25/10/2026, backup RTDB có `hdnd/items=0`, 1 nguồn mirror với khoảng 55 dòng, `hdnd/profile` và `hdnd/permissions` tồn tại; `profile.dataSource` không được xác minh là primary. Mirror 55 không mặc nhiên là nguồn cuối, ảnh 57 thuộc mốc khác. | **Không biết 01/11/2026 production còn trống hay đã có hàng, đã có V2 active, đã có thao tác server-ACK**. Không dùng bản backup cũ thay read-only checkpoint mới. |
| Nguồn công việc | Quyết định Firebase-only 25/10: trước cutover nhân viên tạm cập nhật Google Sheets/Excel; sau cutover WebApp/Firebase là nguồn duy nhất, không sync nền. Ghi nhận 27/10 chủ dự án chưa cho nhân viên nhập WebApp. | Cần **một** file/Sheet/version/thời điểm chốt và chữ ký mới; trạng thái người đang nhập trên Sheets, nháp trình duyệt hay đã có ACK đến ngày cutover không rõ. |
| Web PR147 | `App.tsx` bản build thường đặt `selectedSource='primary'`; khi `datasetV2.active` có giá trị, đọc `hdnd/datasetV2/generations/{generationId}/items`; nếu chưa có, đọc legacy `hdnd/items`. Không tự quay về Sheets/mirror; `hdnd/profile.dataSource` cũ không đủ chứng minh dữ liệu đang hiển thị. | **Chưa xác minh mã Pages hiện phát hành**, cache trình duyệt, `profile.dataSource` production và việc bật endpoint cần thiết. Không đưa web mới cho người dùng trước khi backend/Rules/data sẵn sàng. |
| Legacy first import | `bootstrapApprovedRowsToPrimary` dùng CAS `hdnd/items null→payload`, chỉ admin verified, `OPEN`, 1–1.000 hồ sơ hợp lệ, đọc lại tất cả sau ACK, cấm nhập lần hai. | Trong PR147 build bình thường, đường UI gọi first import legacy **không được gắn** (`onBootstrapPrimary=undefined`, `onInitialImport` chỉ trong `legacySourceTests`, `importEnabled=false`). Không được hứa rằng admin có nút nhập production. |
| Khởi tạo V2 | `prepareInitialDatasetActivation` chỉ chạy khi V2 chưa active, **legacy phải có 1–1.000 dòng**, `freezeControl=FROZEN` đã ACK, `closedAt>0`, không lease sống; staging + sealed `legacyBackups`, parent `activate` gắn xác nhận. | Đích hoàn toàn trống **không thể** kích hoạt thẳng V2 từ Excel; phải có bootstrap legacy được duyệt riêng trước. |
| Đổi/khôi phục V2 | `replace` cần V2 active, expected epoch+baseline, Excel A–O, staging/backup và parent CAS. `restore` cần backup **thực sự có nguồn historically COMMITTED**; tạo generation mới, không ghi đè generation cũ. | Activate/replace **không tự kế thừa permissions/history sang active generation** (quyền mới là `columns:{}`), nên cần quyết định lưu/đối chiếu quyền và lịch sử thật; không mặc định bảo toàn được mọi yêu cầu. |
| Sao lưu/restore | 25/10 người vận hành báo 2 backup raw 56.185 bytes, cùng SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`; Rules snapshot riêng. Tài liệu release gate `RESTORE_BACKUP_OPERATOR_PASS_20261025` báo **LOCAL_EMULATOR_RESTORE_DRILL_PASS** từ file private trên demo, canonical SHA256 `9d325e2bf15b1eae22234b5ec791a0710a952c6d138779af85d186b5a611f0c7`. | Đây là backup **cũ** (không phải release-time). Restore bản mới và kiểm sâu V2/chỉnh sửa mới **NOT RUN**. Bàn giao backup viết trước lần PASS còn ghi “chưa chạy”: kết quả cập nhật của release gate có phạm vi ngày 25/10, không được suy rộng. |
| Rules Published | Tài liệu 27/10 có GET Cloud **không Auth** trả 401 ở một số nhánh; bản Rules PR147 đã PASS Emulator. | Không biết Rules Published mới nhất, checksum, review quyền đọc/ghi thực, IAM; 401 không phải chứng nhận toàn bộ Rules hoặc quyền của người xem có Anonymous Auth. |

**Kết luận:** `PR147_ORIGINAL_FRCR01=FAIL`; `PR147_FIXED_EMULATOR=PASS`; `PR149_OPERATIONS_EMULATOR=PASS_ON_536f`; `LIVE_DATA_SOURCE=UNKNOWN`; `LIVE_PRIMARY_AND_V2_STATE=UNKNOWN`; `CURRENT_PUBLISHED_RULES=UNKNOWN`; `FRESH_BACKUP_AND_RESTORE=NOT_RUN`; `PRODUCTION_GO=HOLD`. Phân biệt mốc lịch sử và mốc cutover. Các hướng dẫn legacy PR71/72 được dùng làm điều kiện bảo vệ, không thay thế code PR147 hiện tại.

## 2. Snapshot và đối chiếu để quyết định

Người vận hành có quyền được chủ dự án chỉ định lập mốc đọc-only **ngay trước cutover**, bảo quản bên ngoài repo:

1. **Nguồn cuối được duyệt:** loại nguồn (Google Sheets/Excel), sheet/version, giờ khóa ghi, người duyệt, số hàng, tất cả `displayCode`, `recordId` nếu có, 15 cột A–O, loại HC/QPPL/BC, nội dung Unicode, hồ sơ rút/lưu trữ và SHA256 canonical. Không dùng mirror cũ hoặc số 55/57 thay nguồn chốt.
2. **Đích server:** cặp project/instance, tồn tại của `hdnd/items` và row count, `hdnd/datasetV2/active` (generationId/operationId/revision/rowCount/digest), `generations/{gen}/items`, `operations`, `candidates/backups/legacyBackups`, `profile`, quyền legacy/V2, `editLocks/leases`, `control`, `freezeControl/freezeReceipts`. Lỗi đọc phải ghi **UNKNOWN**, không ghi “0 dòng”.
3. **Đối chiếu đủ 100%:** tập ID và displayCode (không ghép theo STT), thứ tự, từng trường nghiệp vụ, giá trị trống, trạng thái tiến độ, số hồ sơ thêm/bớt/đổi, revision/operationId/updatedBy/audit/history, quyền cột/dòng/ô, các nháp chưa ACK. Excel A–O hiện tạo ID kỹ thuật `x-<hex của mã>`, có thể khác ID legacy: lập mapping và xác nhận quyền/lịch sử chịu ảnh hưởng.
4. **Chụp hai checkpoint read-only:** nếu hàng, hash, quyền hay epoch biến động trong lúc rà, **dừng**; nguồn phải được duyệt lại, không “bù” bằng import đè. Snapshot/hash nghiệp vụ có thông tin cá nhân lưu ở kho riêng, không đăng raw JSON lên GitHub.

Bắt buộc kiểm file Excel .xlsx có header A–O đúng, sheet do admin chủ động chọn, không công thức/lỗi Excel, ID không thiếu/trùng, tối đa 1.000 hồ sơ và 5 MB. Nếu dữ liệu cần bảo toàn có `isDropped/archivedAt` hoặc legacy P/Q, phải xử lý/phê duyệt riêng, không cắt âm thầm. Tránh coi số hàng bằng nhau là dữ liệu bằng nhau.

## 3. Cây quyết định triển khai dữ liệu — **không bao giờ import đè mặc định**

**Trước nhánh:** GET read-only xác minh `datasetV2.active`, generation, operations và `hdnd/items` ở **đúng instance**. Nếu V2 pointer không nhất quán với server hoặc readback thiếu quyền: **HOLD**.

### A. V2 chưa active; legacy `hdnd/items` trống thật

1. Chốt nguồn cuối, chặn thay đổi tại kênh Sheets/Excel theo lịch, thu hồi hoặc sao chép nháp chưa ACK. Backup full RTDB và Published Rules; thử restore bản backup mới trên Emulator riêng trước khi ghi.
2. **Không được chọn “Kích hoạt V2” ngay.** V2 activation đòi legacy có 1–1.000 dòng và đã FROZEN. PR147 production build lại không mở UI bootstrap legacy. Chỉ khi chủ dự án duyệt một **quy trình operator bootstrap legacy empty-root CAS đã được kiểm Emulator, Rules, quyền và readback**, mới có thể tiếp tục. Nếu chưa có đường vận hành được review: **HOLD, không tự chế script REST hoặc mở thêm tính năng trong nhiệm vụ này**.
3. Sau bootstrap được duyệt và **server-ACK**: kiểm đủ 100% hàng/ID/15 trường, revision/actor, không cho retry nếu CAS từ chối/ACK không rõ. Giữ snapshot legacy vừa xác nhận.
4. Admin đưa `freezeControl` sang `FROZEN`, có receipt/closedAt và **không lease còn sống**; chọn đúng Excel A–O đã ký → preview → tạo `candidates/{op}` và `legacyBackups/{op}` immutable, server readback SHA/count → xác nhận `KHOI TAO V2 {operationId} {legacyCount} {newCount}` → parent `activate` CAS. Kiểm lại `datasetV2.active` và journal `COMMITTED`, hash, quyền/lịch sử và trạng thái khóa trước khi cân nhắc mở sửa.
5. Vì quyền V2 active mới mặc định rỗng và history legacy không tự thành history mới, cần **quyết định riêng** cách bảo quản/đối chiếu trước GO. Không coi việc có generation mới là đã nghiệm thu quyền hoặc nghĩa vụ lưu vết.

### B. V2 chưa active; legacy `hdnd/items` đã có dữ liệu

1. **Bỏ qua first import.** So từng hàng legacy với nguồn cuối và nhận diện mọi thay đổi đã được server ACK; không ưu tiên file Excel chỉ vì file có timestamp mới. Nếu có chênh, trình chủ dự án phương án hòa giải và bảo toàn quyền/history.
2. Giữ legacy/permissions/editLocks/audit đầy đủ trong backup trước chốt. Chỉ sau duyệt, FROZEN có ACK và hết lease hợp lệ, chạy **V2 first activation từ legacy có dữ liệu** (staging + sealed legacyBackup như nhánh A bước 4), không tạo bộ legacy mới đè bộ hiện hữu.
3. Nếu nguồn dự kiến mất hàng, giá trị được ACK, quyền hoặc history bắt buộc: **HOLD**; không commit một thế hệ mới chỉ để kiểm thử production.

### C. `datasetV2.active` đã tồn tại và hợp lệ

1. Web PR147 sử dụng thế hệ V2 đang active ngay cả khi legacy cũ vẫn tồn tại. Đọc/so **generation active** với nguồn cuối. Nếu khớp: **không replace**, chuyển sang kiểm infrastructure, quyền và nghiệm thu.
2. Nếu thay toàn bộ được duyệt: sao lưu mới, danh sách delta/ID ký, kế hoạch bảo toàn mọi server-ACK mới và reset quyền/history; đảm bảo không nháp/lease hoặc giao dịch UNKNOWN; chọn Excel A–O, sheet; preview → stage `candidates/{operationId}` + `backups/{operationId}` (old pointer, rows, quyền, leases) → readback → xác nhận `THAY {operationId} {oldCount} {newCount}` → parent `replace` CAS expected epoch + baseline.
3. Nếu active pointer, rows, quyền, lease hoặc revision khác lúc duyệt, **CAS phải từ chối**; đọc lại và duyệt lại. Thế hệ mới có quyền mặc định rỗng; không tự giả định history ở generation cũ xuất hiện trong generation mới. Đối chiếu/cấp lại quyền theo quyết định riêng, không mở cấp quyền cho khách trước duyệt.
4. **Restore V2 chỉ từ backup có provenance COMMITTED**, snapshot lịch sử/rights/leases khớp, dùng operationId **mới**, tạo generation **mới** và digest tính lại. Không dùng `legacyBackups` để giả làm backup replacement. Nếu có **bất kỳ** thay đổi mới đã server-ACK kể từ mốc backup, không restore backup cũ trực tiếp; ưu tiên freeze → backup trạng thái hiện tại → hòa giải/fix-forward có duyệt, rồi mới xét bước khôi phục không mất dữ liệu.

### D. Trạng thái không rõ

V2 pointer thiếu generation/journal, digest/ID sai, không đọc được quyền/backup, operationId đã dùng với payload khác, ACK `UNKNOWN`, draft/lease hoặc freeze epoch thay đổi, Rules/endpoint không khớp → **HOLD**. Không chọn A/B/C bằng số hàng trên giao diện, không retry tự động. Chỉ tra trạng thái operationId và snapshot server; phân biệt `committed-active`, `committed-historical`, `not-committed`, `unknown`.

## 4. Sao lưu đọc-only và kiểm khôi phục (kế hoạch, **chưa thực hiện ở production**)

### 4.1. Trước bất kỳ thay đổi thật

- Người giữ quyền Firebase xác nhận **project/instance thực tế**, chép **Rules đang Published** vào file private, lưu hash/thời điểm; không dùng Rules ứng viên từ repo làm snapshot production.
- Từ clone chính xác PR147 và `source/`, script `firebase-production-readonly-backup.mjs` chỉ GET toàn RTDB **hai lần**, so SHA256 byte; đòi `--project hophdnd-8b7b2`, `--instance hophdnd-8b7b2-default-rtdb`, file Rules đã chép riêng và thư mục backup **mới** ngoài repo. Chỉ dùng các tham số này nếu operator xác nhận chúng là đúng đích; script cố tình khóa cứng, **không chỉnh mã để lách** nếu khác.
- Kiểm `firebase-backup-verify.mjs` cho `BACKUP_INTEGRITY_PASS` (hash, size, manifest, count); kiểm `firebase-verify-published-rules.mjs --live-file` cho `PUBLISHED_RULES_SNAPSHOT_MATCH_PASS` với quyền đọc-only, sau đó review riêng khác biệt Rules Published và FULL Rules PR147. File Rules/RTDB không gửi qua PR/chat/Actions.
- Làm mốc đọc-only **ngay trước cutover**; nếu hai lượt đọc lệch hoặc Rules provenance không chắc: HOLD. Sau mọi ACK thay đổi dữ liệu, chụp **mốc mới** trước khi quyết định rollback.

**Lệnh để operator cân nhắc sau khi được ủy quyền — không chạy trong hồ sơ này:**

```powershell
# Trong clone đúng SHA PR147, thư mục source
git rev-parse HEAD
node scripts/firebase-production-readonly-backup.mjs --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb --rules-file "D:\HopHDND-private\rules-published.json" --output-dir "D:\HopHDND-private\checkpoint-pr147-before-cutover"
node scripts/firebase-backup-verify.mjs "D:\HopHDND-private\checkpoint-pr147-before-cutover"
node scripts/firebase-verify-published-rules.mjs --live-file "D:\HopHDND-private\rules-published.json"
```

### 4.2. Thử restore **chỉ ở Emulator demo biệt lập**

Script `firebase-backup-emulator-restore.mjs` chỉ cho `demo-hdnd-restore` tại `127.0.0.1:9198`; đọc `HDND_PRIVATE_BACKUP` là file JSON tuyệt đối ngoài repo, **PUT chỉ localhost**, GET và so **canonical SHA256 toàn root**, kiểm nhánh `hdnd`/`items`/`mirrors`/`profile`/`permissions`. Chỉ ghi PASS nếu script in `LOCAL_EMULATOR_RESTORE_DRILL_PASS` và exit=0. Không dùng Import Data trên production.

```powershell
# Clone QA riêng, chỉ chạy demo-hdnd-restore
Set-Location "D:\HopHDND-QA-PR147\source"
java -version
$env:HDND_PRIVATE_BACKUP = "D:\HopHDND-private\checkpoint-pr147-before-cutover\rtdb.before.json"
try {
  npx firebase emulators:exec --project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json "node scripts/firebase-backup-emulator-restore.mjs"
} finally {
  Remove-Item Env:HDND_PRIVATE_BACKUP -ErrorAction SilentlyContinue
}
```

**Bài đối chiếu bổ sung bắt buộc sau restore hiện hành:** 100% `recordId`, `displayCode`, 15 cột A–O và Unicode; số dòng theo legacy **và** active V2; active pointer/operations/digest; revision/history/editProofs/updatedBy; per-generation permissions, leases, backups/legacyBackups, profile, control, freeze/receipts. Script trên so canonical toàn root nhưng **chỉ in summary legacy**, không thể tự chứng minh tất cả bất biến V2/ nghiệp vụ đã được người quản trị nghiệm thu. Ghi hash theo scope ở biên bản private.

**Tận dụng chứng cứ, không khai khống:** restore file private 25/10 đã PASS trên demo theo release gate; [PR147 integrated](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946931) và [parent](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946953) PASS kích hoạt/replace/restore/tra trạng thái trên synthetic Emulator; [FULL App Chrome](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291947075) PASS UI liên thông. Không cần chạy lặp lại chỉ để tăng số ca. **Checkpoint private release mới + restore và so khớp V2 mới: NOT RUN**.

## 5. Thứ tự phát hành dự kiến và nguyên tắc rollback dữ liệu

1. **Không mở web mới trước:** giữ chế độ an toàn cũ/maintenance. Chốt SHA/binary/checksum của web, hai Functions, FULL Rules, đúng project/instance, runtime/IAM/CORS/region/HTTPS endpoint, frontend flags. `cellEdit` callable ở `asia-southeast1` và `parentDatasetCommit` HTTP ở `us-central1`, codebase `pr142-cell-edit`/`parent-v2`. Web production chỉ cấu hình parent HTTPS được duyệt; không dùng localhost/dev endpoint.
2. **Backup + nguồn cuối + dừng ghi ngoài ứng dụng**: người có quyền thực hiện read-only checkpoint; xử lý nháp đang mở/ACK chưa rõ; áp dụng một mốc cắt duy nhất; ký kết quả đối chiếu ID/rows/permissions/history.
3. **Backend trước frontend:** chỉ trong lịch bảo trì được phê duyệt, triển khai hai Functions và FULL Rules theo kế hoạch kết hợp, đọc lại Published Rules/checksum và kiểm Auth/endpoint/CORS/allow-deny bằng dữ liệu an toàn. Không nới Rules để chữa lỗi. Một nửa backend mới/một nửa web cũ hoặc web mới trỏ service/Rules chưa tương thích là **STOP**.
4. **Theo nhánh A/B/C**, chỉ thực hiện thao tác import/activate/replace/restore đã được duyệt; mỗi chặng cần server ACK + readback count, ID, hash, journal, rights và freeze. Khi kết quả `UNKNOWN`: giữ nháp và operationId, **không tự lặp thao tác thay/khôi phục**.
5. **Mở xem rồi mới mở sửa:** chạy kịch bản nghiệm thu admin ở hồ sơ kèm, kiểm role/permission, freeze OPEN, quyền ghi chỉ khi server đã xác nhận, điều kiện rollback. Chỉ sau GO rõ ràng mới cấp quyền cho nhân viên/khách theo phạm vi đã duyệt và kết thúc maintenance.

### Cửa MỞ SỬA = GO (tất cả phải đạt)

- Có chữ ký owner, quản trị Firebase, reviewer bảo mật; exact SHA/artifact, Published Rules hash, cả hai service/IAM/CORS và bundle flags khớp; không bypass Callable hoặc parent CAS.
- Source cuối được ký và khớp **server**, active/legacy state, journal, quyền, lịch sử; no unresolved `UNKNOWN`, lease/nháp nguy hiểm; fresh full RTDB + Rules backup và restore riêng PASS.
- Firebase `freezeControl=OPEN` chỉ khi được phép; `editingLocked`/permission và `editors/{UID}` hợp lệ; chính sách khách Anonymous (ai có link có thể sửa ô được mở) đã được duyệt; không coi `DRAINING` là receipt FROZEN.
- Chrome admin/guest/nhân viên đã xác minh có server readback đúng, desktop/mobile, lỗi/ACK chính xác. Nếu thiếu một cửa: **NO-GO**, giữ web/role ở trạng thái an toàn.

### Phân biệt rollback theo thời điểm

| Tình huống | Dừng/quay lui an toàn | Không được làm |
|---|---|---|
| Chưa có data commit | Giữ web cũ/read-only, điều tra Rules/endpoint, rollback web/backend/Rules **chỉ khi** đã kiểm tương thích và Published Rules backup; không đụng DB. | Không import để thử, không auto retry. |
| Đã bootstrap/activate/replace nhưng chưa mở sửa | Giữ mọi hàng/generation đã được server ACK; khóa ghi, sao lưu và đối chiếu; fix-forward hoặc tạm quay **UI** theo kế hoạch không làm mất dữ liệu. | Không reset `hdnd/items`, xóa generation hay import lại lên nonempty. |
| **Đã có một hoặc nhiều sửa mới được server ACK** | Freeze/maintenance theo quyền; tạo snapshot **mới của dữ liệu đang sống** + audit/operation journal, so delta với backup cũ, ký quy trình hòa giải/fix-forward bảo toàn các ACK; quay UI cũ chỉ khi backend vẫn tương thích và tạm khóa ghi nếu cần. | **TUYỆT ĐỐI không restore backup cũ đè thay đổi mới**. Git/Rules rollback không phải data rollback. |
| Mất kết nối/ACK `UNKNOWN` | Giữ draft + operationId, tra log/server read-only rồi xác nhận; nếu chưa rõ, HOLD. | Không báo đã lưu, không tạo operationId mới để nhập/thay/khôi phục lần nữa. |
| DRAINING/FROZEN thiếu receipt hoặc lỗi quyền | Giữ trạng thái an toàn, đọc lại epoch/lease/receipt; chỉ mở sau người vận hành xác nhận. | Không coi UI/cache là bằng chứng chốt. |

**Quyết định hiện tại:** **HOLD / KHÔNG IMPORT / KHÔNG MỞ SỬA / KHÔNG DEPLOY**. Bảng xác nhận owner và kịch bản UAT nằm trong [hồ sơ kèm](PR147_ADMIN_ACCEPTANCE_AND_OWNER_CONFIRMATIONS_2026-11-01.md).

## 6. Nguồn và phạm vi

- [Bàn giao PR147 comment #6555988999](https://github.com/cavoixanh638/HopHDND-WebApp/pull/147#issuecomment-6555988999), [contract tích hợp tại đúng SHA](https://github.com/cavoixanh638/HopHDND-WebApp/blob/02964722ae405a7ccf70f2b88bfe21cb7d0bcca7/source/docs/tasks/PR147_INTEGRATED_CANDIDATE.md).
- [Quyết định Firebase-only](../decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md); [first import](FIREBASE_FIRST_IMPORT_FROM_CURRENT_SOURCE_2026-10-27.md); [one-time cutover/rollback](FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md); [transition import cũ](FIREBASE_TRANSITIONAL_GOOGLE_EXCEL_IMPORT_2026-10-27.md).
- [Release gate và restore PASS 25/10](FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md), [backup handoff](FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md), [CURRENT_STATE](../CURRENT_STATE.md), [VAN_HANH](../VAN_HANH.md).
- Code kiểm tra theo SHA: `src/app/App.tsx`, `src/data/firebase-primary-bootstrap.ts`, `src/data/firebase-versioned-replacement.ts`, `src/data/firebase-versioned-replacement-secure.ts`, `src/features/settings/VersionedExcelReplacementPanel.tsx`, `parent-commit-service/src/{commit,parent-contract}.mjs`, `firebase.staging.json`.
- Script vận hành đã có: `scripts/firebase-production-readonly-backup.mjs`, `firebase-backup-verify.mjs`, `firebase-verify-published-rules.mjs`, `firebase-backup-emulator-restore.mjs`.

**Không có kiểm tra Cloud hay dữ liệu private mới được thực hiện khi soạn hồ sơ này.**
