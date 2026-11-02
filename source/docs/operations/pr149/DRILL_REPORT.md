# PR149 — DRILL REPORT: offline / 3 trạng thái / FRCR-01 / backup-restore

**Giờ biên bản:** 01/11/2026, Asia/Saigon (UTC+07:00). **Production: HOLD.**  
**SHA gốc PR147:** `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` — lỗi FRCR-01 đã tái hiện.  
**SHA candidate sửa của Chat1, được kiểm độc lập:** `536f4811b84ee0f97f2841e7c746f0362df80a2e`.  
**Checkout kiểm:** PR149 ghép **chỉ script/docs QA** vào đúng source candidate; không tạo bản runtime cạnh tranh. Candidate có thể đổi SHA sau lần kiểm này; mọi SHA mới phải chạy lại và ghi report mới.  
**Cấu hình:** hoàn toàn giả lập `demo-hdnd` (Auth 9099, RTDB 9000, hai Functions thật 5001, FULL Rules đúng namespace) và `demo-hdnd-restore` (RTDB 9198). Không chạm Firebase thật.

## 0. Tiếp nối Chat 3 — kiểm toán vận hành tăng cường 02/11/2026 (Asia/Saigon)

**Không đổi nguồn runtime/Rules:** original PR147 `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` vẫn **FAIL FRCR-01**; fixed operations PR149 đã kiểm `536f4811b84ee0f97f2841e7c746f0362df80a2e`; Chat1 final candidate `5656a5eaffa4e6b32e5100b11f36697af93c7340` (duy nhất thêm browser smoke script so với 536f). Release manifest tại commit `8a6664e135ed888c7a458e4c4b1518a62890231e` giữ rõ historical `source.releaseSourceSha` và `finalFixedCandidate.sourceSha`. **Mọi run ở nhánh PR149 có merge source base 536f: không tự ghi là run exact 5656.** 

**Đợt offline bổ sung:** commit ops `3ae13fbdcdd021a496ebaf4c993948bd47506a4d`, [workflow #41371491257 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41371491257) và [Source Verify #41371491179 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41371491179). Thêm nguyên tắc **fail-closed**:
- Recompute staging SHA với chính `decodeCandidate` sản phẩm; pointer/manifest cùng khai một digest sai vẫn bị `ACTIVE_CANDIDATE_MANIFEST_DIGEST_MISMATCH`.
- Dùng `verifyBackup` và `verifyCommittedRestoreSource` thực của protected parent để kiểm baseline, nguồn committed, số dòng, quyền/lease generation lịch sử; backup tự khai baseline hoặc provenance không hợp lệ bị HOLD.
- Previous full-root snapshot phải có manifest cặp riêng, giữ checksum; dữ liệu không đọc được được báo `UNREADABLE` và đầu ra JSON, không tự diễn giải thành tập rỗng. Bất kỳ `HOLD` đều làm CLI trả exit khác 0, bao gồm empty-root cần bootstrap.
- Test bổ sung forged candidate, forged backup, snapshot trước-sau, historical tampering; tất cả bằng dữ liệu giả.

**Đợt chuẩn hóa tài liệu/lockfile:** ops `56435b52d6dd32c67df4cb8f5d41b392f953ae92`, đổi sang `npm ci --prefix` theo lockfile thực có của cả hai Functions, ghi tách mốc gốc/fixed/final và owner chỉ có D1–D3. **Kết luận chỉ nâng lên PASS khi workflow tương ứng với chính commit tài liệu/tool mới đạt SUCCESS**, không dùng success của commit cũ làm bằng chứng commit mới.

| Gate thêm | Kết quả đến trước CI trên SHA 56435… | Cách xử lý |
|---|---|---|
| Offline security/provenance hardening tại 3ae13… | **PASS** | CI #41371491257, cùng test S1–S3/FRCR/restore |
| Source Verify tại 3ae13… | **PASS** | CI #41371491179 |
| Run chính xác SHA 56435… gồm workflow lockfile + tài liệu | **NOT RUN / PENDING VERIFICATION** | Xem Actions PR149, chỉ cập nhật thành PASS khi CI success |
| Production live state, Published Rules, IAM, private backup, user UAT | **NOT RUN** | Giữ HARD HOLD; người vận hành có phép mới thu chứng cứ |

## 1. Chứng cứ

- **Lượt SHA gốc:** [Actions #41328381588 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328381588), [artifact demo #13092700733](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328381588/artifacts/13092700733). 5 offline fixtures, operator CLI, 6 server API tests, backup verifier, restore demo PASS. **Riêng FRCR-01 release gate FAIL** vì admin đổi được quyền generation cũ rồi restore hợp lệ bị HTTP409; test cố tình tái hiện thành công không phải FIX.
- **Lượt fixed candidate:** [Actions #41328720404 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328720404), [artifact demo #13092352552](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328720404/artifacts/13092352552). 5/5 fixture, lệnh offline operator, 6/6 real Auth+Functions+RTDB tests, bootstrap operator ngoài fixture và restore biệt lập đều PASS.
- **Đối chứng rộng hơn của Chat1 (khác SHA):** [FRCR targeted #41327380497](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41327380497) tại SHA `7bbcf1f8493ef1e5b1164818286c52a75cb9c5de`, các đường historical columns/rows/cells/delete/multipath + pointer race. Không lấy bằng chứng này thay kiểm độc lập trên `536f481...`.
- **Nguồn phát hành:** [manifest gốc](https://github.com/cavoixanh638/HopHDND-WebApp/blob/79f2e59b7c4e6116d6456836e0099ba744ba5ba0/source/docs/releases/PR147_RELEASE_MANIFEST.json) gắn mốc gốc; manifest/binary hashes cần được Chat1 tái lập khi candidate SHA thay đổi.

## 2. Ma trận PASS / FAIL / NOT RUN

| Ca | SHA gốc | SHA đã sửa | Bằng chứng server/điều kiện |
|---|---|---|---|
| O1. Parser Excel A–O và audit fixture | PASS | **PASS** | Gọi đúng `parseBusinessExcel`, kiểm sheet/header, 15 cột, mã/ID trùng, Unicode, sai nội dung; kiểm bytes/hash và metadata. |
| O2. CLI offline trên file nguồn và snapshot | PASS | **PASS** | Lệnh `operator-check.mjs` thực sự chạy trên .xlsx và full-root JSON giả: `LEGACY_NONEMPTY_NO_V2`, `PASS_LEGACY_PRESENT`, 1 row, diff 0, không kết nối production. |
| O3. Phân loại trạng thái lỗi | PASS | **PASS** | File full-root rỗng khác file thiếu manifest; malformed/unreadable phải lỗi; sai ID, pointer/journal/rights/backup tạo HOLD/INCONSISTENT. |
| S1. Firebase trống | PASS | **PASS** | V2 activation trực tiếp bị từ chối khi không legacy; `bootstrapApprovedRowsToPrimary` CAS thật nhập 2 dòng, đọc lại; gọi lần 2 bị DENY, hash không đổi; FROZEN → V2 activate COMMITTED, active 2 dòng. |
| S1b. Operator bootstrap **ngoài fixture** | NOT RUN | **PASS** | .xlsx A–O thật qua parser, Google Admin Auth Emulator, API bootstrap được bảo vệ và Rules thực; nhập 1 row, đọc lại giá trị; duplicate CAS DENIED. Log `PR149_OPERATOR_BOOTSTRAP_EMULATOR_PASS`, không dùng Rules-disabled seed. |
| S2. Legacy nonempty / V2 absent | PASS | **PASS** | Không cho bootstrap lần 2; giữ legacy rows + rights; FROZEN, stage/`legacyBackups`, parent activate; V2 mới mặc định quyền rỗng. |
| S3. V2 active đã có post-backup ACK | PASS | **PASS** | Dùng `CellEditSessionManager` + `FirebaseRepository.save` qua `cellEdit onCall`, ACK sửa Ghi chú. Fixed-run root SHA trước `e82270e03781ca52f2f318af36c852653ac18f04962944ebf6a7b34b8aec08eb` → sau `0b817208f6adbec817ed3313de00ea1d625a47e00af590ce232b732629f774b9`, row revision tăng. |
| S3 STOP rollback cũ | PASS | **PASS** | Phát hiện delta sau backup, `restoreCalls=0` và `STOP_RECONCILE_AFTER_ACK`; chụp snapshot hiện tại, server hash giữ nguyên `0b817208...`. Không được dùng backup cũ để ghi đè ACK mới. |
| FRCR-01 old-generation rights | **FAIL release gate — BUG REPRODUCED** | **PASS FIX VERIFIED** | Gốc: admin đổi được historical rights, restore hợp lệ 409. Fixed: cùng actor bị Rules từ chối ghi historical quyền columns/note, before/after không đổi; backup COMMITTED hợp lệ vẫn restore `COMMITTED`, pointer revision 3. |
| DR-02 forged backup | PASS | **PASS** | Backup giả thiếu provenance COMMITTED bị HTTP409; SHA trước/sau server giống hệt, không có journal mới. |
| R1. Valid restore | PASS nếu không tamper | **PASS** | Backup thật COMMITTED tạo generation thứ ba + revision 3, khôi phục rights và lịch sử của snapshot được backup. |
| R2. Full-root backup checksum/restore | PASS | **PASS** | Snapshot giả legacy 2 rows, 2 generations, 2 committed operations, 1 audited history row, sealed rights/backups. Script cũ `firebase-backup-emulator-restore.mjs` PUT/GET localhost 9198 và `verify-restored.mjs` so cấu trúc/rights/history. Canonical SHA256 **`0b817208f6adbec817ed3313de00ea1d625a47e00af590ce232b732629f774b9`** bằng nhau. |
| Production Rules/IAM/live data/source/owner UAT | NOT RUN | **NOT RUN** | Không suy production đang trống hoặc đã sẵn sàng; cần người vận hành có quyền được phê duyệt riêng. |

**Không đánh đồng:** Workflow harness SUCCESS trên SHA gốc chỉ xác nhận *đã tái hiện lỗi FRCR-01*, không phải release PASS. SHA sửa đã độc lập chứng minh DENY và valid RESTORE cùng một bộ FULL Rules. Tất cả PASS mới là **Emulator/đầu vào giả**, không cấp phép production.

## 3. Công cụ và cách lặp

[Runbook thực thi theo thứ tự](RUNBOOK.md) mô tả lệnh `operator-check.mjs --source ... --sheet ... --snapshot ... --manifest ... --output ...`, input/output và các điểm STOP. Công cụ:
- Nạp **file local tuyệt đối** và manifest full-root có checksum byte/SHA256, không Firebase SDK/network, không sửa input, không ghi đè báo cáo đã tồn tại.
- Dùng đúng parser A–O của App, so source với legacy/V2 active theo mã; báo hash tập ID, nội dung, quyền, lịch sử, generations/journal và backup, dấu hiệu ACK sau backup.
- Phân biệt `EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT`, `LEGACY_ITEMS_EMPTY_IN_FULL_SNAPSHOT`, `LEGACY_NONEMPTY_NO_V2`, `V2_ACTIVE`, `INCOMPLETE_SNAPSHOT`, `INCONSISTENT`; file không đọc được báo lỗi rõ, **không coi rỗng**.
- Khi lỗi/delta/FRCR/backup không tương thích, **HOLD** để operator đối chiếu, không nạp Excel lên production tự động.

## 4. Bảo toàn dữ liệu: giữ gì, làm mới gì

`bootstrap`: legacy `hdnd/items` được CAS một lần, giữ input recordId/fields, revision mới. **Không chuyển quyền/history cũ ngầm**.

`activate`: giữ nguyên legacy `items`, `permissions`, `editLocks`, sealed `legacyBackups`; tạo V2 generation theo A–O với ID kỹ thuật có thể khác legacy, active rights **rỗng**, history/editProofs cũ **không tự nhập** vào active. `replace` cũng giữ generation cũ, quyền/lease sealed backup, journal; generation mới từ file duyệt có quyền rỗng, audit history cũ còn ở generation lịch sử. `restore` từ backup historically COMMITTED tạo generation mới, khôi phục đúng rights/history được backup, không chứa ACK sau thời điểm backup. FRCR fix bảo vệ **historical rights bất biến**, không được gỡ kiểm provenance để cứu restore.

**Owner không mặc nhiên chấp nhận reset quyền hoặc bỏ lịch sử**. Những quyết định thuộc owner đã thu về ba nhóm ở hồ sơ nghiệm thu PR147 ngày 01/11/2026 (tham chiếu lịch sử; không có trong candidate này): D1 nguồn chính thức, D2 quyền/ID/lịch sử cần giữ, D3 người và thời điểm GO/NO-GO. Các số kỹ thuật phải do operator đo.

## 5. Những phần production vẫn NOT RUN và yêu cầu Chat1

Bằng chứng production chỉ có khi chủ dự án cấp quyền **đọc** và quyết định launch riêng: đúng project/instance, `hdnd/items` và V2 active/journal tại cutover, Rules Published hiện hành, IAM/HTTPS endpoints/CORS/flags hai Functions, backup+restore từ private checkpoint mới, nhân viên/guest real Chrome UAT và số hàng/ID/source chính thức.

**Gap chức năng vận hành:** API bootstrap legacy đã chứng minh dùng được ngoài fixture trên **Emulator qua wrapper chỉ demo**, nhưng PR147 build bình thường **ẩn UI first-import**. Nếu production đích thật sự trống, Chat1 cần bàn giao **đường operator đã được duyệt dùng đúng CAS API và bảo vệ**, hoặc xác nhận **STOP**; PR149 không tự mở runtime/bypass Rules.

**Tình trạng bàn giao:** `OFFLINE_AND_EMULATOR_FIXED=PASS` trên exact SHA `536f481...`; `ORIGINAL_FRCR01=FAIL`; `PRODUCTION_GO=HOLD`. Không ghi/đọc production, import thật, merge, publish/deploy hoặc thay đổi nguồn.
