## CURRENT RELEASE STATE — employee Google allowlist + safe one-time cutover

**Engineering candidate COMPLETE for isolated test; production still gated.** Verified Google employees must appear at `hdnd/editors/{uid}=true` before RTDB Rules allow any lease or row write, in addition to per-cell grants. Anonymous users can **read but cannot write**. Administrator can grant/revoke Google UIDs on the Firebase Account panel. The earlier stale-mirror one-click import button has been removed; a current approved snapshot and maintenance window are mandatory for final primary import.

Source/build/Emulator integration verified on [PR #72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) by [Verify HopHDND source #40208414174](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40208414174) SUCCESS and [isolated Firebase staging #40208414172](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40208414172) SUCCESS. New regressions: anonymous denied, unenrolled Google denied despite column grant, admin revoke immediate, authenticated Google employee allowed across separate UIDs; updated mock controller tests. **All these are emulator/build proofs, not production deploy proofs.**

**Launch sequence still required:** 1) named final source frozen with every pending staff edit included; 2) final production read-only backup + Rules snapshot; 3) current Rules candidate independent authorization review and approved deployment; 4) exactly one reviewed data import and readback; 5) primary profile activation and deployment of tested app build; 6) employee Google UID enrollment, two-browser acceptance receipt and rollback checkpoints. **No production write/Rules publish/merge/Website update performed by this work.**

**Security contract:** mutually exclusive edits are enforced for independent Firebase Auth UIDs; normal anonymous tabs each get separate short-lived UIDs but cannot edit. Google employee/editor accounts must be individual; hostile same-UID multi-tab token replay still cannot be separated by client-only RTDB Rules. Consult [employee launch procedures](FIREBASE_EMPLOYEE_GOOGLE_LAUNCH_2026-10-25.md), [adversarial review](FIREBASE_PR72_SECURITY_REVIEW_VERDICT_2026-10-25.md), and [cutover plan](FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md).

---

## CURRENT RELEASE VERDICT — 25/10/2026, post-auth-hardening

**Implementation CI:** [#40205895722](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40205895722) PASS; [isolated staging #40205895723](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40205895723) PASS. These include Auth Emulator evidence that two normal anonymous editor tabs obtain separate Firebase UIDs; backend still validates cross-UID leases. React/login unit tests ensure a canceled Google popup does not persist anonymous credentials.

**Production status: NO-GO.** No code deployed, no import, no merge. Same valid Google UID shared between malicious tabs is still outside the enforced server-side lease contract and remains an acknowledged risk; Google/admin is a trusted account but its tabs are not separately authenticated security principals. Anonymous public write policy is not yet approved as a named-employee authorization system. Candidate Rules are still only in PR #72. Read detailed security verdict and one-time rollback plan linked below.

**Previously completed:** local restore of real private database backup PASS; effective Published production Rules hash match PASS. These do not need to be repeated until the final release-time read-only checkpoint. Operator's earlier staging “ok rồi” predates the latest auth changes; current browser-level acceptance still needs a final verification before GO.

- [Current security verdict](FIREBASE_PR72_SECURITY_REVIEW_VERDICT_2026-10-25.md)
- [One-time migration and rollback plan](FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md)
- [Local two-browser staging](FIREBASE_LOCAL_MULTI_BROWSER_STAGING_2026-10-25.md)

---

## 25/10/2026 — Published Rules provenance: first live attempt HOLD, GET-based fix

Người vận hành cập nhật nhánh đến `9397fcb` và chạy bộ so sánh mới. Offline diff: private Rules canonical SHA256 `005ee641bf70bcb15bf2300e4928cced4567374dcae745f2ab896d55a4f4ab3a`, candidate mới canonical SHA256 `b38c6a0f82c089c93597daaa2c260d0a70f6dcda8af93dc9facb05becfd9e53f`; số biểu thức **85→115, 30 ADDED / 0 REMOVED / 19 CHANGED**. Kết quả trùng dự kiến sau bản sửa ghost-audit ở `/hdnd/items/$id/.validate`.

Lượt kiểm Published đầu tiên qua `firebase-verify-published-rules.mjs` trả `RULES_PROVENANCE_HOLD: Firebase CLI read-only query failed`; **không chứng minh được rằng thiếu quyền hoặc Rules không khớp** (công cụ trước đó nuốt nguyên nhân lỗi). Rà trực tiếp nguồn Firebase CLI `firebase-tools@15.34.0`: `database:rules:list` dùng metadata API và IAM `firebasedatabase.instances.get`. Google hướng dẫn đọc RTDB Rules hiện hành bằng **HTTP GET** tới `/.settings/rules.json`. Đã sửa helper sang gọi `firebase database:get /.settings/rules --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb` bằng child process, giữ toàn bộ JSON trong bộ nhớ, chỉ so hash và in trạng thái; không đọc/ghi Google Sheets, không deploy, không ghi production. Công cụ chặn emulator/custom database URL override để không nhầm môi trường, có `--self-test` giả lập GET không dùng mạng và được CI kiểm.

**Cần người vận hành xác minh tiếp trên bản clone đã có:**
```powershell
git -C "D:\HopHDND-Firebase-QA-20261025-Retry" -c http.version=HTTP/1.1 pull --ff-only origin feat/exclusive-cell-leases-admin-freeze-20261025
Push-Location "D:\HopHDND-Firebase-QA-20261025-Retry\source"
try {
  node scripts/firebase-verify-published-rules.mjs --self-test
  node scripts/firebase-verify-published-rules.mjs --live-file "D:\HopHDND-Private-Backup\2026-10-25\rules-live.json"
} finally { Pop-Location }
```
Chỉ nếu CLI GET thực sự trả hash khớp mới đánh dấu `PUBLISHED_RULES_SNAPSHOT_MATCH_PASS`. Nếu lỗi giữ `HOLD`; không tự cấp quyền IAM hoặc deploy Rules. Các cổng staging đa tài khoản, Security Rules review độc lập và cutover cuối cùng vẫn **NO-GO**.

---

## 25/10/2026 — OFFLINE_RULES_DIFF_20261025 và sửa lỗ hổng ghost audit

**Kết quả máy Windows do người vận hành cung cấp** khi chạy `firebase-private-rules-compare.mjs` trên nhánh PR #72: `OFFLINE_RULES_COMPARE_COMPLETED`. File private `rules-live.json` có canonical SHA256 `005ee641bf70bcb15bf2300e4928cced4567374dcae745f2ab896d55a4f4ab3a`; bản Rules ứng viên TRƯỚC sửa ghost-audit có canonical SHA256 `e54fc8d9872139412bbe8f9ab877a133fffd3b3ee33999ca054348a1d29e14dd`. **85 → 115** rule expressions; **30 mới, 0 xóa, 18 thay đổi**. Các đường cập nhật gồm `/hdnd/items/.write`, `/hdnd/items/$id/.write`, 15 editable field validators, `recordId/.validate`. Đường mới gồm `editProofs`, `editLocks`, `freezeControl`, `freezeReceipts`. Đây mới chỉ là diff cấu trúc **với file rules-live trên máy**; người vận hành **chưa chứng minh bản này trùng stable Rules đang áp dụng thật**.

**Kiểm thử tấn công thêm:** Một khách không cần khóa có thể tăng `revision` và thêm `history` giả **mà không sửa bất kỳ ô nào** dưới Rules ứng viên ban đầu. Bài test `rejects ghost metadata-only revisions and forged audit without a changed leased field` đã FAIL kỳ vọng (máy chủ cho phép), bằng chứng [CI #40199148735](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40199148735). Đã thêm row-level validation bắt buộc có ít nhất một editable field thực sự khác baseline khi tăng revision (không bỏ kiểm khóa và quyền trường); test nay PASS cùng toàn bộ suite tại [CI #40199287995](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40199287995), commit `ae5b558797a190da1d25da52d812f200ecf86a7d`. **Hash ứng viên mới không còn bằng hash ứng viên ở output diff cũ** — phải chạy lại so sánh sau khi cập nhật clone.

**Kiểm tra Published tự động bằng lệnh chỉ đọc:** `source/scripts/firebase-verify-published-rules.mjs` gọi Firebase CLI `database:rules:list` (lấy nhãn `stable`) và `database:rules:get <stable-id>` trên project `hophdnd-8b7b2`, instance `hophdnd-8b7b2-default-rtdb`, so SHA256 JSON chuẩn hóa với snapshot private. Không in Rules, không tạo bản backup công khai, không cập nhật Rules hay production data. `PUBLISHED_RULES_SNAPSHOT_MATCH_PASS` chỉ xác thực provenance và nội dung đúng thời điểm truy vấn, **không thay đánh giá độc lập security hoặc GO deploy**. Nếu không có quyền đọc ruleset, CLI trả lỗi hoặc sai nội dung, giữ HOLD.

**Còn thiếu:** chứng cứ `stable` thật, đánh giá Rules kể cả ràng buộc toàn vẹn audit/lease của bản mới, staging browser đa tài khoản, dữ liệu khởi tạo đã được chốt theo mốc phát hành, phê duyệt GO. **Không tự động deploy/merge/cutover**.

---

## 25/10/2026 — Kiểm soát Rules độc lập trước khi phát hành

**Bổ sung bảo vệ tự động (commit `d6b4a23`):** thử Firebase Emulator dưới Rules độc quyền ứng viên: chặn sửa hàng/metadata qua đường dẫn `hdnd/items` hoặc `hdnd/items/r1` khi không có lease, kể cả tài khoản admin; chặn người dùng giả quyền Google/admin tạo dữ liệu; chặn nhập mới khi `FROZEN`. [CI #40198453823](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40198453823) **PASS**. Các bài kiểm thử không viết production.

**Công cụ so sánh Rules riêng tư không đưa file lên GitHub:** `source/scripts/firebase-private-rules-compare.mjs`, chỉ đọc JSON `--live-file` từ đường dẫn tuyệt đối và candidate local, in hash canonical JSON và số lượng/đường dẫn `.read/.write/.validate` được thêm, xóa hoặc sửa, **không in biểu thức** và **không kết nối mạng**. Có fixture chặn tiết lộ biểu thức/private value; CI chạy `node --test scripts/firebase-private-rules-compare.fixture.mjs`. Chạy từ `D:\HopHDND-Firebase-QA-20261025-Retry\source` sau `git pull` vào đúng nhánh, không chạy trên thư mục chứa backup:

```powershell
Set-Location "D:\HopHDND-Firebase-QA-20261025-Retry\source"
node scripts/firebase-private-rules-compare.mjs --live-file "D:\HopHDND-Private-Backup\2026-10-25\rules-live.json"
```

**Chưa được phép tuyên bố Rules PASS:** kết quả diff chỉ là công cụ hỗ trợ rà soát; `rules-live.json` do người vận hành lưu vẫn cần xác thực **đúng bản Published trong Firebase Console và đúng instance**. Chưa có chứng cứ staging multi-browser người thật hoặc phát hành. Do đó **NO-GO** production vẫn giữ.

---

## 25/10/2026 — RESTORE_BACKUP_OPERATOR_PASS_20261025 (bằng chứng do người vận hành cung cấp)

**Đã PASS cổng thử khôi phục backup dữ liệu, chỉ trên emulator demo cục bộ.** Người vận hành chạy clone `D:\HopHDND-Firebase-QA-20261025-Retry\source` với `--project demo-hdnd-restore --only database --config scripts/restore-emulator/firebase.json`; sau khi cài Microsoft OpenJDK 21.0.12.1, script `firebase-backup-emulator-restore.mjs` báo `LOCAL_EMULATOR_RESTORE_DRILL_PASS (NO production writes)`, exit code 0, sau đó `HOAN THANH RESTORE DRILL`.

- Input private `D:\HopHDND-Private-Backup\2026-10-25\database-1.json`; **không đưa file backup lên GitHub**.
- Kích thước 56.185 bytes; **SHA256 chuẩn hóa JSON sau PUT/GET Emulator** `9d325e2bf15b1eae22234b5ec791a0710a952c6d138779af85d186b5a611f0c7` khớp nguồn. Lưu ý đây **không phải SHA256 bytes nguyên gốc**, nên khác checksum raw backup `D9EF2CBA...` trước đó.
- Snapshot này chứa **0 primary item**, 1 mirror top-level source, profile/permissions hiện diện. Đây là trạng thái của file backup, **không được suy ra live production hiện còn rỗng**.
- **Đã giải quyết:** cổng *backup restore drill trên Emulator thật với JSON người vận hành* chuyển sang PASS. **Chưa giải quyết:** Rules Published nguồn gốc/chính xác bản đang có hiệu lực, review toàn bộ candidate Rules và đường ghi cha/con, staging đa trình duyệt/tài khoản, nguồn dữ liệu khởi tạo cuối cùng và GO của quản trị.
- Tiếp tục **NO-GO deploy/migration/merge production**; không đồng bộ Google Sheets trong giai đoạn phát triển. Không biến restore PASS thành căn cứ phát hành đơn lẻ.

---

## CẬP NHẬT PHẠM VI CHÍNH THỨC 25/10/2026 — ưu tiên hơn nội dung lịch sử bên dưới
**Đọc [quyết định Firebase-only](../decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md) trước tiên.** Nhân viên vẫn dùng Google Sheet/Excel trong giai đoạn WebApp đang lập trình; đó là **phương thức làm việc tạm**, không nằm trong kiến trúc production mục tiêu. Khi đủ điều kiện, admin chốt nguồn khởi tạo một lần và cutover sang `hdnd/items`, **sau đó không dùng Sheets/mirror làm nguồn, không chạy job nhập đè**.

Không dùng chênh lệch 55/57 trong các tài liệu lịch sử làm **blocker sửa mã Firebase, chạy test, hoàn thiện chức năng**. Chỉ kiểm **tại mốc cutover một lần** bộ dữ liệu khởi tạo mới nhất để bảo toàn công việc nhân viên. Việc kiểm các file Google Sheet mỗi ngày không còn là nhiệm vụ của luồng này.

**Cổng release production còn hiệu lực:** backup JSON/Rules + restore thử biệt lập, Rules security review, multi-user staging, readback `hdnd/items` và quyết định nhập một lần với snapshot đã phê duyệt. Giữ `NO-GO production` khi chưa đủ các chứng cứ; **không HOLD phát triển/kiểm thử trên emulator**.

---

## 25/10/2026 — Yêu cầu kiểm tra realtime giữa các tài khoản (đã xác minh giới hạn production)
- **WebApp đang public trên `main` chưa có ghi chung realtime:** chế độ Sheets/mirror của bản hiện hành chỉ cho sửa nháp trình duyệt; vì thế thử hai tài khoản khác nhau trên Website này không thể chứng minh đồng bộ. Không coi việc mở hai account trên `main` là kiểm thử code trong PR #71/#72.
- Bổ sung bài thử **ba tài khoản Firebase Emulator độc lập** (1 tài khoản sửa + 1 tài khoản khách theo dõi + 1 tài khoản quản trị theo dõi); cả hai tài khoản theo dõi subscribe trước, nhận server-ACK qua `onValue` không cần reload và đọc lại `hdnd/items` cùng giá trị. Chạy dưới **Rules ứng viên độc quyền #72**, không đọc Google Sheets. Exact code commit `940055adad5dd83d972cb2957eeb4f423ce4e934`; [CI #40192723187](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40192723187) **PASS** (có Chrome smoke mock).
- **Chưa chứng minh hoạt động giữa tài khoản trên production:** chưa phát hành front-end PR, chưa thay Rules production, chưa nhập/đọc lại nguồn dữ liệu khởi tạo thực, chưa kiểm 2–3 trình duyệt thật kết nối Firebase staging đã cô lập. Không hạ cấp cổng NO-GO chỉ vì CI PASS.
- **Bước tiếp theo có thể làm trên máy vận hành, không cần chạm Sheets:** sử dụng `database-1.json` riêng tư đã sao lưu, thực thi `source/scripts/firebase-backup-emulator-restore.mjs` với `--project demo-hdnd-restore` và `--config scripts/restore-emulator/firebase.json`; sau đó kiểm Rules Published bằng tài khoản admin trong Firebase Console, so với candidate và thử staging. Đừng đính kèm bản Rules/data gốc vào GitHub.

---

## 25/10/2026 — Kết quả kiểm thử tích hợp Firebase-only mới
- **PR #72 exact commit** `54ff4eeb45ba1e3ed0c30a15d3a85c7d6768b828`; [GitHub Actions #40190875312](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40190875312) **PASS** (unit, TypeScript, Firebase Emulator, browser smoke, Pages build). Đây là kiểm thử trên branch DRAFT, **không triển khai production**.
- Workflow `.github/workflows/verify-source.yml` không còn ba bước CI bắt buộc kiểm GViz trực tiếp, bootstrap Cloud Shell mirror và Python mirror. Kiểm thử Chrome vẫn sử dụng fixture/mock lịch sử để chống hồi quy giao diện, **không ghi hoặc kiểm kê Google Sheets thật**.
- Bổ sung **thử khôi phục RTDB từ JSON giả** trên emulator cô lập `demo-hdnd-restore` (`127.0.0.1:9198`), PUT/GET và SHA256 của JSON chuẩn hóa khớp. Chứng cứ này **không thay thế** thử restore với file backup riêng tư trên máy người vận hành.
- Bổ sung bài test xuyên PR: admin chuyển bộ mirror mẫu một lần sang `hdnd/items` dưới **Rules khóa ô ứng viên #72**. Test đầu tiên đã **FAIL `permission_denied`** vì quy tắc yêu cầu lease cho cả bản ghi mới; đã sửa ngoại lệ chỉ cho quản trị viên được xác thực **khi `hdnd/items` chưa tồn tại**, giữ nguyên lease cho cập nhật tiếp theo. Test và toàn bộ CI hiện **PASS**; thử nhập lần hai phải bị từ chối.
- **Vẫn NO-GO production:** phải xác minh Rules Published thật, thử restore backup riêng tư trên emulator, rà đường ghi Rules và nghiệm thu 2–3 tài khoản staging; sau đó mới phê duyệt triển khai. Không khảo sát định kỳ Sheet/mirror như một nhiệm vụ phát triển WebApp.

## 25/10/2026 — Đối chiếu LIVE mirror và Office Excel mới nhất
- Người vận hành đã chạy `firebase database:get /` live read-only; `hdnd/items=0`, mirror vẫn 55 dòng cùng tập ID với snapshot và vẫn `syncedAt=2026-10-23T04:41:44.104873Z`. Không có bằng chứng đồng bộ hoạt động sau 23/10.
- Read-only Google Drive metadata của file Office nguồn (`1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`) báo `modifiedTime=2026-10-25T04:22:14.272Z`. Trích xuất nội dung đọc được 55 dòng STT số trong tab dữ liệu (7 nội dung kỳ chuyên đề tháng 10, 48 nội dung còn lại). Số đếm **tạm khớp**, nhưng modifiedTime mới hơn và chưa biết thay đổi nào; chưa so từng ID và nội dung.
- Cảnh báo: Drive metadata báo phân quyền `anyone / writer` cho file Excel nguồn. Chủ file cần kiểm tra ngay trên Share settings, phân biệt việc chia sẻ cho nội bộ/khách; không mặc nhiên chấp nhận cho nguồn nghiệp vụ lâu dài.
- **GO gate:** thử khôi phục bản sao localhost, so `recordId` và 15 trường A–O bằng dữ liệu Office nguồn đã chốt tại cùng mốc, rà `syncedAt` thực và reason ảnh báo cáo 57. Nếu khác nhau, có thể tạo lại snapshot đối chiếu bằng quy trình một lần, **không ghi đè** primary/Excel; cần phê duyệt khi chuyển. `NO-GO` cho deploy Firebase Rules/migration production.

---

## 25/10/2026 — Metadata bổ sung: snapshot 23/10, không phải bản live ngày 25/10
- `schemaVersion=1`, `syncedAt=2026-10-23T04:41:44.104873Z`, `sourceModifiedAt=2026-10-23T02:07:11.387Z`, `rows=55`. Đầu ra PowerShell do người vận hành gửi từ file `database-1.json` riêng tư.
- Bản mirror có timestamp cũ hơn hai ngày so với ngày kiểm tra. Đếm ID trùng=0 trên backup, **chưa có bằng chứng live**: không bật `dataSource=primary`, không lập luận dataset đã đầy đủ chỉ từ số 55. Chênh lệch 57/55 từ ảnh khác thời điểm phải xác minh nguồn và phép lọc, không tự ý bù/xóa hai nội dung.
- GO gate mới: đọc RTDB **read-only** hiện tại vào file timestamped riêng tư, in **chỉ metadata** (total rows, ID count, syncedAt, items count) và đối chiếu bộ ID với backup. Sau đó chạy `validateExcelMirror`/restore staging mới xem xét kết luận nguồn.

---

## 25/10/2026 — Cửa kiểm kê dữ liệu trước migration (không để mất nội dung)
- Người vận hành đã đếm trên backup: 1 mirror source/1 dataset/55 dòng/0 ID trùng; `Mirror metadata valid` chưa trả kết quả rõ trong transcript. **Không đánh dấu mirror verified**.
- **Bất thường có thể nghiêm trọng:** báo cáo giao diện người dùng trước đó cho thấy `Tiến độ xin ý kiến Thành ủy (57 nội dung)`; nếu cùng nguồn và cùng thời điểm, việc chuyển 55 dòng sẽ làm thiếu ít nhất hai dòng. Cần kiểm tra dữ liệu ở website tương ứng mốc nào, mirror `syncedAt`/sourceModifiedAt và danh sách recordId trước khi GO. Không suy rằng chắc chắn thiếu dữ liệu khi chưa xác nhận nguồn/mốc.
- Điều kiện GO bổ sung: `validateExcelMirror` đạt, staging restore toàn bộ backup khớp hash, số nội dung khớp bản live và expected source IDs, không sót bản nháp local, kiểm `hdnd/items` vẫn rỗng ngay tại thời điểm transaction. **NO-GO** cho import production nếu tồn tại chênh lệch chưa giải thích.

---

## 25/10/2026 — Kết quả kiểm kê các nhánh trên backup (reported by operator)
- `hdnd/items`: 0 tại thời điểm backup. `hdnd/mirrors`: 1 khóa con trực tiếp (có thể bao gồm nhiều GID); `hdnd/profile` và `hdnd/permissions` tồn tại; `hdnd/profile.dataSource` trống/không hiển thị. Không coi đây là bằng chứng có thể switch source tức thì.
- **Tiếp theo:** kiểm đúng cấu trúc `hdnd/mirrors/{spreadsheetId}/{gid}`, `schemaVersion=1`, `rows` không rỗng, metadata `source`/SHA/timestamp và record IDs trước staging import. Backup phải restore thành công trên Emulator cô lập.
- **Bắt buộc kiểm lại live khi GO:** RTDB export tại ngày backup có thể cũ. Ngay trước migration phải đọc `hdnd/items` thật để chắc chắn vẫn chưa có bản ghi và kiểm tra biên nhận Rules của đúng project/instance. Không ghi vào `hdnd/items` trước khi test quyền parent write + child validations trên Emulator.

---

## 25/10/2026 — Bằng chứng backup mới nhất và mức chứng minh
Đầu ra PowerShell người vận hành cung cấp (không tự truy cập file trong ChatGPT/GitHub): cả hai `database-[1,2].json` cùng 56.185 bytes và SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`; `rules-live.json` 24.497 bytes, SHA256 `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`. Ba file đã qua PowerShell `ConvertFrom-Json`; Rules có trường `rules`.

**GO/NO-GO:** xuất dữ liệu và sao lưu file Rules qua kiểm tra JSON ban đầu. Chưa độc lập xác nhận bản Rules là bản Published thật, chưa xác minh nguồn dữ liệu nghiệp vụ/đích migration rỗng, chưa thử phục hồi, chưa diff candidate với Rules live và thử 2 tài khoản. **NO-GO** cho thay đổi Rules/Database production. Bảo mật: file Rules và Database ở máy người vận hành, không chia sẻ nội dung qua GitHub/ChatGPT. Tiếp tục kiểm tra metadata và restore drill chỉ trên emulator/staging đã cô lập. Không chạy lệnh `firebase deploy` hoặc `database:set` đối với project production.

---

## Ghi nhận CHECKPOINT sao lưu READ-ONLY — 25/10/2026
- Đã nhận **kết quả PowerShell do quản trị viên cung cấp**: Firebase CLI export `/` 2 lần trên `hophdnd-8b7b2/hophdnd-8b7b2-default-rtdb` và cả hai tệp có cùng SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Tệp nằm trên máy người vận hành, **chưa được công cụ GitHub/ChatGPT tự đọc**.
- Đây mới là `DATA_EXPORT_CONSISTENCY=USER_REPORTED_PASS`, không phải đầy đủ `BACKUP_PRODUCTION_VERIFIED` vì chưa xác minh cấu trúc file, chưa sao lưu Rules Published, chưa thử phục hồi hay kiểm tra chặn đường ghi/đường cha.
- **Cửa kế tiếp:** vào Firebase Console → Realtime Database → Rules, chép Rules **đang có hiệu lực** ra JSON riêng tư trong cùng kho sao lưu (không click Publish), kiểm `ConvertFrom-Json` và SHA256. Sau đó so với candidate bằng bản copy không công khai và thử restore riêng. Không chạy `firebase deploy`, `database:set`, `database:update` hay thay đổi profile.

---

## Công cụ bổ sung cho bước sao lưu: read-only operator helper
- Đã thêm `source/scripts/firebase-production-readonly-backup.mjs`, cùng [hướng dẫn Windows](FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md). Công cụ dùng Firebase CLI **chỉ thực hiện `database:get /`** hai lần với project và instance bị giới hạn, so hash, cất Rules người vận hành cung cấp, tạo manifest ở nơi riêng tư ngoài repo.
- **Chưa chạy production:** không có Firebase Console đang đăng nhập trong phiên làm việc và không lấy dữ liệu bằng GitHub. Không được đổi GO/NO-GO sang PASS nếu chưa có bằng chứng export thật, đối chiếu Rules đã Publish, thử khôi phục và phê duyệt.
- Kết quả thử offline trong CI không thay thế quyền Firebase production. Quy trình được thiết kế để tránh đẩy dữ liệu nghiệp vụ hoặc file Rules thật lên GitHub.

---

## Bổ sung bảo vệ 25/10: deadline từ chối ghi ngay trên Firebase Rules
- Candidate Rules đã kiểm tra `now < hdnd/freezeControl/deadline` cho **mọi ghi nội dung trong DRAINING** và việc gia hạn khóa cũ: ngay cả khi tab admin đóng, sau deadline sẽ không ai tiếp tục cập nhật dữ liệu được; điều này bảo vệ dữ liệu chờ chốt.
- **Đây không phải server coordinator:** chỉ admin/browser sau khi trở lại mới có thể chuyển giá trị `mode` sang `FROZEN` và ghi biên nhận. Nếu admin đóng tab khi DRAINING, phải quay lại kiểm tra/chốt, không thông báo cho người dùng rằng biên nhận đã sinh tự động.
- Bằng chứng CI staging cuối mã [#40160812278](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40160812278) PASS trên `8391041abc727835b7d7ff8f3b12750de950d776`, **không** chứng minh backup/triển khai production.

# HopHDND — Cổng phát hành Firebase chính, khóa ô và chốt số liệu
**Ngày:** 25/10/2026 · **Áp dụng:** PR #71 → PR #72 · **Trạng thái:** CHƯA PHÁT HÀNH PRODUCTION (HOLD)

> Tài liệu này là **điểm vào vận hành có hiệu lực** cho việc chuyển khỏi Excel. Những mô tả trước đó khẳng định Excel là nguồn dữ liệu lâu dài chỉ mang ý nghĩa lịch sử. Không suy ra đã phát hành từ việc CI PASS, PR được merge, hoặc Pages được build.

## 1. Kiến trúc và trạng thái
- **Website đang chạy (main `c85b16dd9b0ea3c02d2eae98d80985dc5d8de8f4` khi lập tài liệu):** bản dữ liệu Excel/mirror Firebase, các sửa được giữ trên máy; không bảo đảm đồng bộ sửa thực.
- **PR #71 (Draft):** nguồn dữ liệu chính `hdnd/items`, import một lần từ bản sao được xác nhận `hdnd/mirrors/{spreadsheetId}/{gid}`. Không tự truy cập Google Sheets sau khi chọn `dataSource=primary`. Chuyển nguồn phải do admin xác thực, xác nhận rõ, chỉ khi đích rỗng và đọc lại mọi dòng khớp. Tuyệt đối không nhập chồng bản ghi và không xóa bản nháp local.
- **PR #72 (Draft, dựa trên #71):** khóa độc quyền `hdnd/editLocks/{recordId}/{field}` (uid + phiên tab + token + thời hạn), `hdnd/freezeControl` (OPEN → DRAINING → FROZEN → OPEN), `hdnd/freezeReceipts/{epoch}`, quy tắc bảo vệ `firebase/database.exclusive-candidate.rules.json`. Trình sửa chính và popup dùng chung khóa, lưu theo Firebase CAS, chỉ server ACK mới được coi là thành công.
- **Không phải cùng một chế độ:** `hdnd/control/editingLocked` dừng khách (admin tiếp tục được ghi), `freezeControl.mode=FROZEN` ngăn cả khách và admin ghi nội dung. Excel/Google Sheet **không còn là nguồn thật** sau khi chuyển, có thể giữ để export/đối chiếu dự phòng.
- **Tài liệu thiết kế:** [CELL_EDIT_EXCLUSIVITY_AND_FREEZE](../decisions/CELL_EDIT_EXCLUSIVITY_AND_FREEZE_2026-10-25.md) và [quy trình chạy thử](CELL_EDIT_FREEZE_EXECUTION_2026-10-25.md).

## 2. Điều kiện GO / NO-GO trước khi động tới production
Tất cả phải có bằng chứng độc lập, gắn **exact SHA**, URL bản build và tên người xác nhận:

| Cửa kiểm tra | Bằng chứng phải thu thập | Nếu thiếu |
| --- | --- | --- |
| SHA cố định, 2 PR không stale | `main`, head #71, head #72, kết quả merge preview và CI PASS tại đúng head cuối | **HOLD** |
| Sao lưu Firebase hiện hành | Toàn bộ Rules + Database JSON (bao gồm `hdnd/profile`, `hdnd/permissions`, `hdnd/control`, `hdnd/items`, `hdnd/mirrors` nếu có). Bản sao lưu **ở nơi riêng tư ngoài GitHub**, có SHA-256 và thử đọc/khôi phục trên emulator hoặc môi trường thử nghiệm | **HOLD** |
| Đối chiếu Rules đang chạy | Chủ dự án/nhân sự có quyền đọc Firebase Console chép đầy đủ Rules mới nhất; so với `database.exclusive-candidate.rules.json`, rà nhánh khác và mọi đường admin write cha. Không giả định bản 16/10 còn đúng | **HOLD** |
| Nguồn nhập hợp lệ | Bản sao Firebase có đủ schema/ID/giá trị; đích `hdnd/items` rỗng; kiểm tổng số dòng/hash, `permissions`, quyền từng ô và nháp Chrome Ẩn danh trước khi chuyển | **HOLD** |
| Security & concurrency | Emulator thử: 2 UID + 2 tab cùng UID cùng ô, các trường khác nhau, stale token, timeout, role grant/revoke, forged parent write, xóa dòng, mất mạng, freeze đột ngột | **HOLD** |
| Staging Browser | Trình duyệt thực mở 2–3 tài khoản; dropdown/IME/note/modal, xác nhận ACK, lịch sử, báo cáo và rollback; không chạm dữ liệu production | **HOLD** |
| Đóng băng sau khi admin đóng tab | Hiện trạng: bộ đếm/auto-freeze chạy ở UI admin; nếu admin rời trang khi DRAINING, hệ thống **không tự bảo đảm chuyển FROZEN đúng hạn**. Cần backend điều phối đã được phép triển khai **hoặc** vận hành bắt buộc admin mở phiên chốt đến khi nhận biên nhận và đối chiếu `FROZEN` trước khi phê duyệt | **HOLD đối với cam kết đóng băng tự động không người trực** |
| Triển khai Production | Kiểm tra tài khoản/quyền, kích hoạt Rules đúng project và readback Rules, chuyển dữ liệu bằng admin, 2 người sửa, thử đóng băng, bản sao lưu rollback và ghi nhật ký quyết định | **HOLD** |

**Đặc biệt:** GitHub Pages chỉ chạy mã front-end. Workflow `.github/workflows/publish-pages.yml` **không** tự cập nhật Realtime Database Rules, không xuất hay sao lưu RTDB và không cung cấp Firebase Admin SDK. Không merge các PR nhằm “bật nhanh” trước khi có Rules thật và bản sao lưu.

## 3. Quy trình chuyển nguồn có thể thực thi khi GO
1. Quản trị xác nhận đúng **Firebase project `hophdnd-8b7b2`** và đúng instance RTDB trong `src/data/firebase-config.ts`. Kiểm tra trên Firebase Console, không chỉ tên URL trên ứng dụng.
2. Sao lưu **Rules và toàn bộ JSON dữ liệu** từ Firebase Console vào kho an toàn có kiểm soát truy cập. Lưu hai bản độc lập; xác minh SHA-256 và đọc được JSON. Không đính kèm JSON nghiệp vụ, email/UID, access token hoặc service account lên GitHub/PR/Actions.
3. Đối chiếu tại chỗ Rules production với candidate. Chạy kiểm thử `npm ci && npm test && npm run typecheck && npm run test:firebase && npm run docs:check` tại `source/`; thử cả hành vi **cho phép** và **từ chối**. Nếu thực tế Rules đã đổi, tạo candidate mới và test lại, không ghi đè nguyên file.
4. **Chỉ sau khi đã có bản sao Rules thật**, phát hành candidate đã duyệt qua Firebase Console/CLI có chỉ định chính xác project. Chú ý lệnh `firebase deploy --only database` sẽ ghi đè **toàn bộ** Rules theo `firebase.json`; mặc định trong repo hiện tham chiếu `database.rules.json` (khóa ghi nghiệp vụ), **không được chạy lệnh này trực tiếp** với cấu hình mặc định. Không đẩy candidate lên `database.rules.json` trước khi được phê duyệt.
5. Đọc lại Rules phía server (không chỉ tín hiệu thành công CLI). Thử 2 người thật bằng dữ liệu thử cho phép và hành động bị chặn. Nếu không khớp phải quay Rules cũ và giữ Website ở chế độ cũ.
6. Xác nhận `hdnd/items` chưa có dữ liệu; đối chiếu snapshot trong `hdnd/mirrors`, quyết định dừng job mirror làm nguồn nghiệp vụ. Phải có bản sao đầy đủ của `hdnd/profile` và quyền. Kiểm tra mọi bản nháp local còn đang mở; yêu cầu người dùng sao chép/đối chiếu và không đóng cửa sổ Ẩn danh khi chưa an toàn.
7. Admin thực hiện **chuyển một lần**, đọc lại toàn bộ `hdnd/items` và từng trường. Chỉ sau đó mới đặt `hdnd/profile/dataSource=primary`; nếu một bước lỗi, KHÔNG tự động chuyển ngược sang Excel, KHÔNG nhập lại; đưa trạng thái **HOLD** để điều tra.
8. Từ hai trình duyệt đã cấp quyền: A chiếm Ghi chú, B bị chặn trên cùng ô; B vẫn sửa được một ô khác. Thử một tab khác cùng UID. Lưu ACK và kiểm tra client thứ ba thấy cập nhật realtime. Thử thu hồi quyền sửa khi có editor, mất kết nối, lease hết hạn, nhập tiếng Việt, Esc dropdown.
9. Admin chọn **Yêu cầu lưu rồi chốt**: server đặt DRAINING và từ chối khóa mới, đợi ACK; sau khi chuyển FROZEN đọc lại dữ liệu, số dòng, hash từ Firebase và xác nhận biên nhận. **Không** tuyên bố chốt nếu admin đóng tab khi còn DRAINING; mở lại admin để xác nhận/tiếp tục. Test **Đóng băng ngay** với bản nháp chưa ACK, bảo đảm giữ nháp và không tính số liệu.
10. Ghi vào biên bản: thời điểm/mã SHA, trạng thái READBACK của DB/Rules, số dòng, số ô bị chặn do khóa, hai tài khoản thử, link CI và biên nhận chốt; sau đó mới công bố nghiệm thu.

## 4. Rollback an toàn
- **Không xóa bất cứ nhánh dữ liệu nào** để rollback. Nếu lỗi UI, dùng bản Pages/commit đã lưu trước đó, đồng thời **không mở ghi lại** khi Rules không tương thích. Nếu lỗi Rules, khôi phục đúng bản Rules production đã sao lưu, rồi xác nhận server readback; phương án cũ có thể không hiểu kiểu nguồn `primary` nên phải đối chiếu profile trước khi quay về UI cũ.
- Khi `hdnd/items` đã nhận thay đổi người dùng thật, **không reset /hdnd/items** hoặc nhập lại snapshot Excel. Chỉ tiến hành khôi phục dữ liệu riêng lẻ sau khi đối chiếu lịch sử và có quyết định rõ từ quản trị.
- Nếu `FROZEN` nhưng thiếu biên nhận, giữ FROZEN, truy hồi JSON server ở trạng thái chốt và lập biên nhận trước khi mở lại. Nếu DRAINING bị kẹt vì admin rời trang, không tự ghi local draft; đăng nhập lại để xác nhận khóa/ACK, chọn hoàn tất chốt hoặc hủy DRAINING theo tình hình.
- Khi phát hiện xung đột/mất mạng: nháp chưa ACK vẫn là **dữ liệu trên thiết bị**, người dùng phải đối chiếu trước khi gửi lại; không thông báo “đã lưu chung”.

## 5. Những việc tuyệt đối không làm
Không đăng service account lên GitHub; không sửa Rules production chỉ dựa trên kết quả emulator; không nhập chồng `hdnd/items`; không bấm “Bỏ nháp” khi chưa đối chiếu; không chuyển nhãn mặc định `dataSource` sang `primary` bằng mã để bỏ qua bước migrate; không tính trạng thái DRAINING là một snapshot; không coi Excel/mirror là nguồn chính sau khi chuyển.
