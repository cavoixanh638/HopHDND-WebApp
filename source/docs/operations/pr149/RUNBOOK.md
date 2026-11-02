# PR149 — Runbook offline → Firebase Emulator → điều kiện chuyển đổi

**Mốc mã nguồn gốc:** PR147 `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` — FRCR-01 chưa sửa.  
**Ứng viên FRCR-fixed đã PR149 kiểm độc lập:** `536f4811b84ee0f97f2841e7c746f0362df80a2e` ([DRILL_REPORT](DRILL_REPORT.md)); PR147 final Chat1 `5656a5eaffa4e6b32e5100b11f36697af93c7340` chỉ sửa thêm file smoke browser (so sánh 536f→5656). Đừng gán một lượt PR149 chạy tại 536f cho exact SHA 5656; Chat1 chịu trách nhiệm chứng cứ final SHA và runtime/Rules.  
**Release manifest mới nhất:** [PR147_RELEASE_MANIFEST.json](https://github.com/cavoixanh638/HopHDND-WebApp/blob/8a6664e135ed888c7a458e4c4b1518a62890231e/source/docs/releases/PR147_RELEASE_MANIFEST.json) giữ nguồn lịch sử `source.releaseSourceSha=0296…` và phân biệt `finalFixedCandidate.sourceSha=5656…`; production NO-GO. Không dùng checksum nguồn cũ cho mã sửa.  
**Múi giờ:** Asia/Saigon (UTC+07:00). **Production: HOLD**. Các lệnh thực thi dưới đây chỉ kiểm file local hoặc demo emulator, không kết nối/ghi production.

## G0 — Chuẩn bị và xác định SHA

Dùng clone QA tách biệt với nhánh Chat1. Node 24 theo CI, Java 21; hai Functions ở ứng viên đã sửa có `package-lock.json` riêng cho Node 22 runtime, dùng `npm ci --prefix` để tái lập đúng phụ thuộc, không cài trôi phiên bản.

~~~sh
cd /PATH/TO/HopHDND-WebApp/source
git rev-parse HEAD
node --version
java -version
npm ci --no-audit --no-fund
npm ci --prefix cell-edit-service --no-audit --no-fund
npm ci --prefix parent-commit-service --no-audit --no-fund
node docs/operations/pr149/operator-check.mjs --help
~~~

**STOP:** HEAD không đúng SHA đang xét, FULL Rules/config/service chưa cùng mã, Node/Java thiếu. Không được chạy `firebase deploy`, `database:set` hoặc `database:remove`.

## G1 — Lệnh offline với nguồn A–O và full-root snapshot

Đầu vào từ người vận hành trong thư mục **ngoài repository**: (i) Excel A–O được nghiệp vụ chốt, có tên sheet; (ii) `rtdb.before.json` full root và `manifest.json` do hai lượt GET read-only tạo, byte SHA256 khớp; (iii) bản sao riêng tư Rules thật đang Published để đối chiếu sau này. **Không lấy mirror 55 dòng cũ làm nguồn mặc định; không suy production còn trống.**

~~~sh
cd /PATH/TO/HopHDND-WebApp/source
node scripts/firebase-backup-verify.mjs /ABSOLUTE/PRIVATE/checkpoint
node docs/operations/pr149/operator-check.mjs --source /ABSOLUTE/PRIVATE/approved.xlsx --sheet "Sheet duoc duyet" --snapshot /ABSOLUTE/PRIVATE/checkpoint/rtdb.before.json --manifest /ABSOLUTE/PRIVATE/checkpoint/manifest.json --output /ABSOLUTE/PRIVATE/reports/audit-pr149.json
# Có mốc cũ để phát hiện ACK/biến động? thêm:
# --previous /ABSOLUTE/PRIVATE/checkpoint-previous/rtdb.before.json --previous-manifest /ABSOLUTE/PRIVATE/checkpoint-previous/manifest.json
~~~

Công cụ **không có Firebase SDK/network** ở lõi kiểm; launcher dùng Vitest có sẵn trong `node_modules` để gọi chính parser `src/data/business-excel.ts::inspectBusinessExcel/parseBusinessExcel`. Không sửa file đầu vào. `--output` ghi báo cáo mới với chế độ không đè file cũ, stdout chỉ có số dòng, hash, mã sai lệch và ID đã băm. `--previous` bắt buộc kèm `--previous-manifest` cùng checkpoint. Auditor **tái tính digest** từ staged rows bằng `decodeCandidate`, kiểm backup bằng `verifyBackup` và `verifyCommittedRestoreSource` thực của parent; JSON tự khai digest/baseline không được tin. `HOLD` (kể cả đích trống cần bootstrap) trả exit khác 0; file JSON báo `UNREADABLE` vẫn được tạo cho file/JSON không đọc được nếu đầu ra hợp lệ. Kiểm 15 cột A–O, header, công thức/lỗi Excel, sheet do admin chọn, mã/recordId thiếu/trùng, thứ tự, Unicode, source digest, 13 trường text, revision/operationId, quyền và lịch sử, generation pointer/journal/backup. Raw JSON, email/UID không đưa lên PR.

| Phân loại | Ý nghĩa và hành động |
|---|---|
| `EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT` | Full-root có hai lượt đọc trùng hash và root thực rỗng **ở mốc này**. Chưa chứng minh production lúc triển khai còn trống; phải đọc lại ngay trước CAS. |
| `LEGACY_ITEMS_EMPTY_IN_FULL_SNAPSHOT` | Có nhánh khác nhưng `hdnd/items` trống; không gọi cả DB trống. |
| `LEGACY_NONEMPTY_NO_V2` | Đích có legacy; cấm bootstrap lần nữa. |
| `V2_ACTIVE` | Đọc active pointer, đúng generation/operation journal; đối chiếu đúng hàng active, không lấy `hdnd/items` cũ làm dữ liệu chính. |
| `INCOMPLETE_SNAPSHOT` | Manifest full-root/2 GET thiếu, hash không trùng hoặc chỉ xuất một nhánh; **không biến thành 0 hàng**. |
| `UNREADABLE` | JSON/file không đọc được; exit khác 0, không chọn nhánh. |
| `INCONSISTENT` | ID/key, pointer, rowCount, journal, backing rights/historical backup không hợp lệ; HARD STOP. |

**Output giả minh họa** (không phải production):

~~~json
{"mode":"OFFLINE_ONLY","snapshotIntegrity":"FULL_ROOT_BACKUP_HASH_VERIFIED",
 "target":"LEGACY_NONEMPTY_NO_V2","counts":{"legacy":{"count":1},"source":1},
 "comparison":{"added":0,"removed":0,"changed":0,"unchanged":1},
 "issues":[],"verdict":"PASS_LEGACY_PRESENT"}
~~~

Khi code trả `HOLD` do delta, phải xem report ở kho riêng và được operator đối chiếu; không tự ghi file đích.

## G2 — Diễn tập ba trạng thái với API thật / FULL Rules / hai Functions

[Workflow PR149](https://github.com/cavoixanh638/HopHDND-WebApp/actions/workflows/pr149-operations-drill.yml) chỉ chạy `demo-hdnd`, có guard cấm project khác. Kết quả và run-id xem `DRILL_REPORT.md`.

~~~sh
cd source
node node_modules/vitest/vitest.mjs run docs/operations/pr149/offline-fixture.test.ts --reporter=verbose
node docs/operations/pr149/operator-check.mjs --source "$PWD/pr149-ops-evidence/approved-source.xlsx" --sheet Approved --snapshot "$PWD/pr149-ops-evidence/offline-checkpoint.json" --manifest "$PWD/pr149-ops-evidence/offline-manifest.json" --output "$PWD/pr149-ops-evidence/operator-report.json"
export GCLOUD_PROJECT=demo-hdnd
export PARENT_COMMIT_ENABLED=true
export PARENT_DATABASE_URL=https://demo-hdnd.firebaseio.com
export PARENT_ALLOWED_ORIGINS=http://127.0.0.1:4173
npx firebase emulators:exec --project demo-hdnd --config firebase.staging.json --only auth,database,functions "node docs/operations/pr149/emulator-run.mjs"
~~~

- **S1 trống:** xác thực V2 activation bị từ chối khi legacy chưa có dữ liệu; sử dụng đúng `bootstrapApprovedRowsToPrimary` admin Auth Google thật trên Emulator với CAS `hdnd/items: null→approvedRows`, server readback; lần 2 từ chối và hash bất biến. Chốt FROZEN, staging + legacyBackups, parent `activate` được xác thực. **Bản web PR147 thông thường không mở UI bootstrap**: đường operator thực ngoài fixture phải được Chat1 bàn giao, không viết runtime cạnh tranh hoặc script REST tùy ý.
- **S2 legacy nonempty:** không bootstrap, giữ `hdnd/items`/legacy rights/locks/old audit, kiểm nguồn A–O với bản đã ACK; FROZEN+ACK, stage+sealed legacyBackup, parent activate, kiểm new generation và journal. Nếu nguồn làm mất sửa đã ACK hay quyền/history cần giữ: STOP.
- **S3 active V2:** stage/replace qua parent thật, lưu backup COMMITTED, dùng `CellEditSessionManager` + `FirebaseRepository.save` qua **cellEdit onCall** để sinh một sửa **server ACK** sau backup. Công cụ so trước/sau, giữ audit và STOP trước khi gọi restore cũ, chụp backup hiện tại, lập delta/fix-forward. V2 pointer stale hoặc ACK UNKNOWN: STOP, không retry bằng operationId mới.
- **FRCR-01:** SHA gốc cho phép admin sửa quyền của generation cũ (release **FAIL**), sau đó valid backup RESTORE bị 409. SHA sửa **chỉ PASS** nếu Rules từ chối ghi historical rights ngay trên server, giữ hash, valid restore vẫn COMMITTED. Không nới `verifyCommittedRestoreSource`. **DR-02:** backup giả không có nguồn historically COMMITTED phải 409 và server không đổi.
- Bằng chứng: `pr149-ops-evidence/environment.json`, `emulator-witness.json`, `s3-reconcile.json` cùng hash before/after, Auth/Functions/RTDB live readback. Không bao giờ gọi unit fixture PASS là production E2E.

## G3 — Sao lưu, phục hồi trên Emulator tách biệt

Suite S3 tạo snapshot giả có legacy rows, quyền, history, nhiều generation, operations và ACK mới, lưu `pr149-ops-evidence/rtdb.before.json` và `manifest.demo.json`. Đầu tiên chạy regression của script verifier cũ, sau đó dùng chính `firebase-backup-emulator-restore.mjs` với demo namespace `demo-hdnd-restore` ở `127.0.0.1:9198`. Bản bổ sung `verify-restored.mjs` kiểm toàn root canonical SHA256, active pointer, operations COMMITTED, ít nhất hai generation, history/revision, old/new rights, leases, backups, freeze và legacy.

~~~sh
cd source
node --test scripts/firebase-backup-verify.fixture.mjs
export HDND_PRIVATE_BACKUP="$PWD/pr149-ops-evidence/rtdb.before.json"
npx firebase emulators:exec --project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json "node scripts/firebase-backup-emulator-restore.mjs && node docs/operations/pr149/verify-restored.mjs"
unset HDND_PRIVATE_BACKUP
~~~

Chỉ kết luận **PASS** nếu có cả `LOCAL_EMULATOR_RESTORE_DRILL_PASS` và `PR149_EMULATOR_SYNTHETIC_RESTORE_PASS`, hash dữ liệu/rights/history trùng; không test phục hồi trên production. Restore bản private mới ở cutover là kiểm tra operator riêng, **NOT RUN** trong PR149.

## G4 — Cây quyết định dữ liệu, STOP và rollback

1. **Không V2, legacy trống thật**: chỉ bootstrap nếu operator có đường thực sự được bảo vệ, review và phê duyệt (UI PR147 không có); CAS một lần, ACK+readback 100%; sau đó mới FROZEN→V2 activate. Không gọi V2 trực tiếp khi root rỗng.
2. **Legacy đã có dữ liệu**: bỏ qua bootstrap; so 100% mã, ID và A–O + history/rights với nguồn được chốt; chỉ after freeze/receipt, stage/backups và activate, không import đè legacy.
3. **V2 active**: nếu dữ liệu đúng thì **không replace**. Nếu cần replace, ký duyệt thay đổi thêm/bớt/đổi từng ID, capture backup rights/history, expected epoch CAS, readback. Restore chỉ từ nguồn có COMMITTED provenance; nếu có ACK sau backup, **tuyệt đối không restore backup đó trực tiếp**.
4. **UNKNOWN/INCONSISTENT**: dừng, giữ nháp và operationId, tra read-only server status, lấy checkpoint mới, không coi lỗi đọc là “trống” hoặc retry.
5. **Nếu đã có server ACK mới**: bảo trì/freeze có quyền → backup **trạng thái mới** → so delta từng ID/field/revision/audit/rights với backup cũ → trình phương án hòa giải/fix-forward có duyệt, không khôi phục backup cũ đè thay đổi mới. Quay lui web/code/Rules chỉ trong bộ tương thích, không phải rollback dữ liệu.

## G5 — Hợp đồng ID, quyền, history (không tự thay chính sách)

- Bootstrap legacy giữ ID/13 trường nghiệp vụ của file đã kiểm, revision 1; không kế thừa audit/quyền cũ một cách ngầm.
- V2 **activate** giữ nguyên `hdnd/items`, quyền và khóa legacy, có sealed `legacyBackups`; new generation từ Excel A–O (recordId `x-UTF8hex(displayCode)` có thể khác legacy), row revision mới, **quyền new generation rỗng**, không tự mang history/editProofs cũ vào active.
- V2 **replace** giữ generations cũ và backup private gồm rows, rights, leases, journal COMMITTED; new generation dùng nguồn A–O, quyền rỗng, không tự chuyển audit cũ. FRCR-01 phải bảo vệ **historical permissions immutable**, nếu không backup hợp lệ có thể mất khả năng restore.
- V2 **restore** tạo generation mới từ backup đã COMMITTED với snapshot history/rights lịch sử, không hồi phục ACK phát sinh sau mốc snapshot.
- Quyết định đã chốt **Firebase-only sau cutover**, không sync tự động Sheets↔Firebase, không mở guest writes ngoài ô đã được duyệt, không công nhận nháp local là ACK. Owner phải duyệt rõ chính sách giữ quyền/history, không mặc định reset.

## G6 — Cửa mở sửa, điều kiện production chưa làm

HARD HOLD cho đến khi Chat1 có SHA mới và manifest checksum web + hai Functions + FULL Rules, frontend V2-enabled HTTPS endpoint đúng, IAM/CORS/region/data URL được operator kiểm, bảo đảm **không dùng source/firebase.json mặc định** (Rules cũ và thiếu Functions). Cần fresh full RTDB backup + Published Rules hash và thử restore, nguồn cuối ký và mapping ID/history/quyền, không còn lease/ACK UNKNOWN, thông báo ngừng nhập Sheets theo lịch, Chrome UAT admin/guest/hai tab/freeze/Excel có readback. Mở sửa **sau cùng**, không public web mới trước Rules+Functions+data tương thích.

**Chỉ được xác minh khi có quyền production:** live `hdnd/items`/`datasetV2.active`/profile, Rules Published, người thật/role, cloud IAM/Functions/cors/endpoint, backup tại thời điểm cutover, smoke dưới quyền. Đây là nhiệm vụ operator **NOT RUN**, không chuyển thành câu hỏi kỹ thuật cho owner. Ba nhóm quyết định thật sự của owner tập trung trong [tài liệu nghiệm thu](../PR147_ADMIN_ACCEPTANCE_AND_OWNER_CONFIRMATIONS_2026-11-01.md).
