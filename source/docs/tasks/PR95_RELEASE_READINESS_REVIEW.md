# PR95 — L3 independent release-readiness review (SOURCE/CONFIG ONLY)

**Ngày kiểm:** 2026-10-30 (Asia/Bangkok) · **Trạng thái phát hành: NO-GO / HOLD**  
**Cố định mã được kiểm:** PR #110 `1b59f80e884ec7492ab8ded29b542f974479245c`, không dùng HEAD di động của PR #95.  
**PR95 baseline khi bắt đầu:** `01530a9ccedba021434626c1f717c2ac76fcaa64`; PR95 vẫn Draft tại thời điểm đọc.  
**Nguồn phân công:** [PR95 comment #6520443575](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6520443575).

**Giới hạn phép kiểm:** rà trực tiếp GitHub source/config/workflow và metadata GitHub Actions ở exact SHA; *không* đọc Firebase production kể cả GET, không gọi CLI kết nối cloud, không dùng hoặc yêu cầu token, không thay đổi code/Rules, không chạy deploy, không mở môi trường cloud. Tất cả kết luận về Rules đang Published trên cloud đều **CHƯA XÁC MINH**; không suy diễn từ các JSON GitHub.

## 1. Kết luận điều hành và phân nhóm readiness

| Phạm vi | Phân loại | Bằng chứng / điều kiện |
|---|---|---|
| Parser Excel A–O, chọn sheet, preview; khởi tạo V2 lần đầu, thay và khôi phục bằng CAS; network ACK fault; hai Chrome target cùng admin; report/filter và quyền | **Đã chứng minh trên Emulator, KHÔNG phải production** | PR110 exact SHA, năm CI đồng thời SUCCESS (§2); Chrome nhập→kích hoạt→thay→khôi phục rev 1→2→3 trên dữ liệu giả theo log đã bàn giao |
| Cho quản trị dùng V2 stage/commit/restore trên **production UI** | **BỊ KHÓA BẰNG MÃ** | `source/src/app/App.tsx:547-555`: `versioned` chỉ khi `firebase.emulator && firebase.isAdmin && firebase.datasetEpochReady`; `ExcelTransferPanel` được truyền `importEnabled={false}` và onImport luôn throw (`App.tsx:553-563`) |
| SDK Firebase **production** | **Kết nối cloud thật nhưng không bật V2** | `source/src/state/firebase-boot.ts:20-42`: chỉ `MODE==='pages-test'` mới dùng `demo-hdnd` + Auth/RTDB Emulators; ngoài mode này dùng `firebaseConfig` (project thật, `firebase-config.ts:1-11`). Hook test admin/loss chỉ trong pages-test trên loopback (`firebase-boot.ts:42-67`) |
| Cấu hình Rules dùng cho lệnh triển khai từ source | **CHƯA CHỌN V2 CANDIDATE** | `source/firebase.json:1-4` dùng `firebase/database.rules.json`; `firebase/database.exclusive-candidate.rules.json` là *file riêng*; không có chỉ dẫn an toàn tự đổi/đẩy Rules ở PR này |
| Published Rules đang có hiệu lực ở đúng RTDB instance, dữ liệu hiện hành, backup tươi | **CHƯA XÁC MINH LIVE** | Không có GET production trong gói này; cần operator kiểm bằng quy trình được duyệt (§5) |
| Cutover production và quy trình phục hồi **legacy lần đầu** | **CẦN CHỐT THIẾT KẾ VẬN HÀNH/THỰC THI** | PR95 dùng V2 `active/generations/legacyBackups`, khác tài liệu cũ về `hdnd/items`. UI restore V2 chỉ đọc `backups`, không dùng `legacyBackups` (`VersionedExcelReplacementPanel.tsx:191-217,246-273`); không có nút khôi phục nguyên trạng legacy cho lần kích hoạt đầu. Không được coi việc hoàn nguyên website/Rules là hoàn nguyên dữ liệu. |
| Phê duyệt người dùng, cửa sổ bảo trì, chốt nguồn Excel nghiệp vụ và Rules | **CHỜ PHÊ DUYỆT** | Chủ dự án phải duyệt riêng các thay đổi dữ liệu, website, Rules và chấp nhận/ràng buộc giới hạn token cùng UID (§4–6) |

**Phán quyết:** Có thể **nghiệm thu bản tích hợp thử trên Emulator**; **không đủ điều kiện cho production GO**. Đặc biệt **merge `main` KHÔNG mở nút thay Excel** vì guard đã nêu vẫn giữ nguyên, nhưng `main` có thể tự kích hoạt phát hành Pages (tác động website), do đó cũng chưa được phép merge.

## 2. Bằng chứng chính xác từ GitHub Actions tại PR110 fixed SHA

Năm workflow ở cùng head `1b59f80e884ec7492ab8ded29b542f974479245c` đều `completed/success` (đọc metadata GitHub, không khởi động lại CI):

1. [Verify source #41027149765](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149765): typecheck/unit, Rules/Emulator, build và browser.
2. [Isolated Firebase staging #41027149708](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149708).
3. [Firebase operational QA #41027149721](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149721).
4. [L3 two real Chrome admin targets #41027149785](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149785): cùng verified Google admin UID, lease/session khác nhau, server revision/history và generation fences.
5. [Network ACK loss #41027149852](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149852): ứng dụng khách nhận tình huống mất frame ACK server→SDK trong Emulator, không thay cho sự cố mạng cloud.

Theo handoff PR95 [#6518640633](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6518640633), tích hợp kiểm thử Chrome thực của Luồng 1 đã đạt `BROWSER_EXCEL_INITIAL_UI_CAS_PASS`, `BROWSER_EXCEL_REPLACEMENT_UI_CAS_PASS`, `BROWSER_EXCEL_RESTORE_UI_CAS_PASS` với active revision 1→2→3, dùng file Excel giả qua parser và quyền Google Emulator; **không lấy owner PUT thay cho ba CAS**. Không được suy rộng sang cloud Rules/data mới nhất, bảo toàn ảnh màn người dùng hoặc kết quả trên máy vận hành. Bản này không tự tạo thêm workflow.

## 3. Rules: 3 tập khác nhau, không được đánh đồng

**Đọc trực tiếp ba file ở exact SHA (không đối chiếu cloud):**

| File | Git blob SHA | Đặc trưng |
|---|---|---|
| `source/firebase/database.rules.json` | `02ece61a4ee2a2ab3ed6d25cd14486b7694b4444` | ~23.987 ký tự; KHÔNG có nhánh `hdnd/datasetV2`; `hdnd/items/.write=false` và `hdnd/items/$id/.write=false` |
| `source/firebase/database.production-candidate.rules.json` | `c849f13c5302d738492835d5eb1809dc68565c24` | ~24.245 ký tự; KHÔNG có V2; so default khác chủ yếu ở hai Rule legacy viết `items` |
| `source/firebase/database.exclusive-candidate.rules.json` | `11db368e20309811430fe81617ec75c415c2ad87` | ~154.010 ký tự; có `hdnd/datasetV2` (active, generations, candidates, backups, operations, permissions, leases, legacyBackups, bootstrap) và kiểm tra chặn ghi legacy sau V2 active |

Cấu hình mặc định **không phải** candidate đã đạt Emulator. `exclusive-candidate` có `datasetV2/.read` admin-only, riêng `active/.read=true`, `generations/$generation/items/.read` cho generation hiện hành hoặc admin (`source/firebase/database.exclusive-candidate.rules.json:363-375`), backup/operation riêng tư (`:500-580`); `hdnd/items` legacy bị rào `!root.child('hdnd/datasetV2/active').exists()` (`:6-9`). Cấu hình default khác về root-level read/write và các quyền nguồn. **Một file trên GitHub không chứng minh bất kỳ Rules nào hiện đã publish.** Trước GO phải đọc/đối chiếu Published Rules đúng project và instance rồi security-review diff, không thay `firebase.json` mặc định và chạy lệnh deploy theo quán tính.

## 4. Hai tab cùng UID: phân tích đúng giới hạn expected-failure

**Bằng chứng mã:** `source/tests/exclusive-cell-freeze.test.ts:437-472` dùng `it.fails` (expected failure) cho thao tác **cố tình đọc token lease của tab thứ nhất rồi dùng một client/tab có cùng `auth.uid` để tự tạo payload update legacy với proof**. Đây là một kiểm thử chống replay độc hại **đang được ghi nhận còn giới hạn**, không phải chứng cứ mọi chỉnh sửa hợp lệ đều thất bại. Không tự xóa xfail hoặc gắn nhãn SEC-001 đã sửa chỉ vì CI xanh.

**Đường sử dụng bình thường:** `source/src/data/cell-edit-leases.ts:48-80,81-99,128-190` tạo session UUID riêng cho mỗi tab, transaction lock, kiểm tra token/UID/session, expiry và chủ động fence generation; `source/src/data/firebase-repository.ts:45-69,95-145` đối chiếu epoch, base value, revision và audit khi lưu. Test browser thực [#41027149785](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149785) đã xác minh hai CDP targets, cùng admin, tranh chấp 1 ô bị chặn, 2 ô khác nhau cùng lưu và draft/lease cũ không ghi vào generation mới.

**Bảo mật phía server:** RTDB Rules biết `auth.uid`, không nhận dạng riêng từng tab nếu dùng chung Auth UID. Rules V2 cho phép đọc lease đối với admin và một số editor phù hợp (`database.exclusive-candidate.rules.json:540-574`). Do đó **không được khẳng định đã giải quyết kẻ chủ động replay token trong cùng UID**. Tuy nhiên **không ghi nhãn đã tái hiện tấn công replay trên V2** nếu chưa có test cụ thể tương đương V2; xfail hiện tại là **legacy**. Đây là vấn đề phải được người duyệt bảo mật **chấp nhận có điều kiện hoặc yêu cầu phương án server-side riêng trước GO**, tùy mô hình đe dọa; **không** tự mở dự án đổi Auth/Rules/session trong nhiệm vụ L3 này.

## 5. Thứ tự kiểm tra và phát hành ĐỀ NGHỊ; chỉ mô tả, không thực thi

**Giai đoạn A — có thể làm offline / Emulator, không làm cloud:**

1. Khóa exact release SHA và lưu năm CI, diff app/Rules/backup. Dùng `cd source && npm ci && npm run typecheck && npm run test:firebase && npm run build:pages:test` nếu cần kiểm lại **trên máy vận hành hoặc phiên được phê duyệt**, chỉ với dữ liệu giả và Emulator; bản audit hiện tại không chạy lại.
2. Xem hướng dẫn offline `node scripts/firebase-production-readonly-backup.mjs --help`; chạy `node scripts/firebase-verify-published-rules.mjs --self-test` **chỉ fixture/no network**, và so Rules từ **file export riêng tư đã có** bằng `node scripts/firebase-private-rules-compare.mjs --live-file ABSOLUTE_PRIVATE_RULES_JSON`. So diff chưa thay xác minh provenance của Rules Published.
3. Khả năng thử phục hồi backup bằng **Emulator demo cục bộ** (khi đã có bản backup riêng tư đủ điều kiện và được phép xử lý trên máy vận hành) đã có: cấu hình `source/scripts/restore-emulator/firebase.json`, lệnh mẫu từ `source/scripts/firebase-backup-emulator-restore.mjs:1-17`: `firebase emulators:exec --project demo-hdnd-restore --config scripts/restore-emulator/firebase.json --only database "node scripts/firebase-backup-emulator-restore.mjs"`, đặt `HDND_PRIVATE_BACKUP` thành file JSON tuyệt đối **nằm ngoài repo**. Mọi PUT trong script **chỉ vào** `127.0.0.1:9198`. Không dùng `firebase.staging.json` hay script PowerShell cũ để suy đoán đúng bản release; `source/scripts/start-local-staging.ps1:7-10` còn ghim **nhánh PR72 cũ**.

**Giai đoạn B — cần duyệt riêng và người vận hành mới được kiểm tra live chỉ đọc:**

4. Trước bất kỳ release WRITE nào: quản trị viên đối chiếu file Rules privately exported **đúng bản Published** với `source/scripts/firebase-verify-published-rules.mjs --live-file ABSOLUTE_PRIVATE_RULES_JSON`. Lệnh này dùng `firebase database:get /.settings/rules --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb` **GET live** (`scripts/firebase-verify-published-rules.mjs:30-54`): **KHÔNG chạy trong audit này**. Yêu cầu có quyền đọc và quyết định cho phép trước khi thực hiện. Nếu hash khác, HOLD.
5. Sau khi chốt nguồn dữ liệu nghiệp vụ cuối cùng (bao gồm thay đổi nhân viên chờ đồng bộ), chạy **read-only snapshot thực tế** ở đúng project/instance bằng script `firebase-production-readonly-backup.mjs`, 2 lượt export khớp, lưu Rules, hash và manifest riêng tư ngoài GitHub; rồi restore thử vào Emulator riêng. Đối chiếu đủ ID, A–O, grant/history, freeze, profile, khoản nháp đang mở và phiên bản đang hoạt động. Snapshot cũ ngày 25/10 **không thay** checkpoint cuối tại thời điểm cutover.
6. Chủ dự án cùng phụ trách bảo mật duyệt đúng Rules candidate hash, mô hình quyền guest/admin, giới hạn replay cùng UID, phương án cập nhật bản website, bảo trì/chặn client cũ, kế hoạch đóng băng legacy và **phương án phục hồi lần đầu từ legacy** (không chỉ backup V2). Chỉ sau đó mới xét một release PR enabling production path có guard/Rules/rollback đã kiểm độc lập; **không** biến `pages-test` thành production bằng đổi mode hoặc bỏ guard mù.

**Giai đoạn C — cần phê duyệt thao tác ghi production RIÊNG cho từng đối tượng, chưa cho phép:**

7. **Security Rules — THAY QUYỀN:** deploy **đúng** Rules đã được duyệt cho đúng RTDB instance, có bước đọc lại Published Rules/hash và kế hoạch hoàn tác. **KHÔNG chạy** `firebase deploy --only database` với `source/firebase.json` hiện tại: cấu hình đó trỏ Rules legacy khóa ghi, không có V2. Chỉ tài liệu hóa cấu hình deploy/đích đã thẩm định và gate fail-closed trước khi cấp lệnh thật.
8. **Dữ liệu — THAY NỘI DUNG:** quản trị viên chủ động `FROZEN` legacy + xác thực server ACK/revision/epoch, kiểm hết lease, snapshot cuối; qua quy trình V2 thực tế `prepareInitialDatasetActivation` → stage/verify private `legacyBackups` → typed confirmation → `commitInitialDatasetActivation` CAS, kiểm operation log, pointer revision=1, generation count/digest, đúng danh sách/báo cáo và quyền mới. Các lần *replace/restore V2* là CAS khác nhau, revision tăng và dùng backup riêng; **không** sử dụng trực tiếp hướng dẫn cũ `hdnd/items` empty-root/mirror migration cho V2. Cần thiết kế hoặc nghiệm thu đường production thực sự trước khi dùng.
9. **Website — THAY GIAO DIỆN:** chỉ publish exact build đã kiểm/được phê duyệt sau khi Rules và dữ liệu sẵn sàng, hoặc kế hoạch tương thích client cũ đã được xác nhận. `.github/workflows/publish-pages.yml:3-16,55-93` tự chạy trên push `main` có source paths, build `dist-pages`, cập nhật root `index.html` + `assets` và push commit; đổi web không đổi Rules hay dữ liệu. `source/scripts/prepare-hosting-staging.mjs:1-44` chỉ tạo thư mục web candidate local, không deploy.
10. **Nghiệm thu sau các điểm cắt:** test operator+guest+hai tab cùng UID, permission grant/revoke, report parity, stale local/cached JS, hoạt động có/không có mạng, audit+reconnect, index/code source hash/active generation readback. Ghi mốc/digest/biên nhận, độc lập ký GO.

## 6. Rollback: tách hẳn website, Rules và dữ liệu

| Sự kiện | Cách dừng/phục hồi được phép xem xét SAU GO riêng | Chú ý |
|---|---|---|
| Chưa commit dữ liệu; Rules vừa đổi | Dừng cutover, giữ website cũ hoặc maintenance; sau khi duyệt mới phục hồi **Rules Published cũ** từ backup/provenance đã lưu | Rules restore **có thể** thay quyền đọc/ghi và làm app mới không tương thích; chỉ restore đúng instance, xác nhận lại hash |
| Website sai, database đúng | Quay lại artifact/code website đã ghim bằng PR/revert và build/publish có kiểm tra; không reset/force push main | Không suy ra Rollback website phục hồi Firebase; nếu web cũ không hiểu V2, phải giữ trạng thái bảo trì thay vì đọc/sửa sai schema |
| V2 đã commit replacement; backup V2 hợp lệ; chưa có chỉnh sửa mới | Có thể xem xét quy trình `restoreDatasetBackup` **bằng CAS thành generation mới**, sau khi owner xác nhận và backup còn hợp lệ | Không làm `remove(items);set(items)`, không coi restore là về legacy |
| Lần đầu legacy→V2 (dữ liệu đang ở `legacyBackups`) | **HOLD**: UI hiện không mở rollback legacy qua `restoreDatasetBackup`. Cần phương án hồi phục/tương thích được thẩm định riêng trước GO | Không dùng bản backup V2 không tồn tại cho lần kích hoạt đầu, không gỡ pointer để mở lại ghi legacy bằng cách thủ công |
| Đã có chỉnh sửa nghiệp vụ được ACK sau GO | Freeze/maintenance, backup hiện trạng, đối chiếu revision/history/quyền; chỉ xử lý bằng fix-forward hoặc migration bảo toàn đủ các cập nhật | Cấm restore snapshot cũ đè các chỉnh sửa hợp lệ |
| Mất mạng / trạng thái CAS UNKNOWN | Tra cứu `operationId` **chỉ đọc** khi có server witness; không tự retry cùng thao tác hay tạo operation mới chỉ vì mất ACK | `VersionedExcelReplacementPanel.tsx:27-66,159-243` coi UNKNOWN là chưa rõ, không phải thất bại |

Nguồn vận hành lịch sử: `source/docs/VAN_HANH.md:6-18` đã nêu rõ không deploy default Rules; `source/docs/operations/FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md:20-53` ghi rõ backup/GO/rollback nhưng vẫn mô tả **đích legacy `hdnd/items`**, phải điều chỉnh theo V2 trước khi áp dụng. Không sửa tài liệu lịch sử trong gói review này.

## 7. Danh mục release gates và người chịu trách nhiệm

| Gate | Trạng thái ở fixed SHA | Đầu việc còn phải làm | Owner |
|---|---|---|---|
| Source build/Emulator 5/5 | **PASS** | L1 so cây exact SHA sau PR110→PR95, xác nhận CI 5/5 ở HEAD PR95 cuối | L1 |
| V2 production UI exposure | **HOLD (code disabled)** | Thiết kế/triển khai riêng cách mở có kiểm soát, lại kiểm thử chính bản release | Chỉ sau GO phát triển/phê duyệt của chủ dự án |
| Candidate Rules provenance/published + independent security review | **HOLD** | Chứng minh bản live và candidate khác thế nào, duyệt quyền/tác động, lựa chọn đúng config deploy | Chủ dự án / phụ trách bảo mật / operator |
| Final source and backup | **HOLD** | Final frozen export, proof ID/trường/số liệu; live read-only snapshot, restore drill; kiểm nháp | Operator theo cho phép riêng |
| Legacy→V2 first-activation rollback / compatibility | **HOLD** | Phương án phục hồi có thể thực thi, không xóa các business ACK; bảo vệ JS cache/client cũ | Release owner |
| Same-UID adversarial replay | **KNOWN LIMITATION; không phải mới chứng minh V2 exploit** | Review model đe dọa / quyết định chấp nhận hoặc bổ sung cơ chế server session; không tự gắn đã giải quyết | Security reviewer / owner |
| Publish website / Rules / data migration | **NOT AUTHORIZED** | Ba phê duyệt riêng, record hash, bảo trì, quan sát hậu triển khai | Owner / operator |

**Tóm lại:** Audit nguồn/config ở đúng SHA hoàn tất. Không tìm thấy căn cứ nào để nới Rules hoặc mở production ngay. Không có lời gọi Firebase production; không chạy bất cứ lệnh deploy, rollback, import hay GO nào. Báo cáo thuần tài liệu này không làm thay đổi source và **không cần tạo CI mới**; L1 có thể tiếp tục công việc độc lập.
