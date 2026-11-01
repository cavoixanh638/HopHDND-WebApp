# PR147 — Kịch bản nghiệm thu quản trị và danh sách xác nhận duy nhất của chủ dự án

**Đi kèm:** [Hồ sơ nguồn dữ liệu / cutover / backup / rollback](PR147_FIRST_USE_AND_CUTOVER_2026-11-01.md).  
**SHA cố định:** `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` · **Ngày:** 01/11/2026 · **Tình trạng:** chỉ hướng dẫn chuẩn bị; **production GO = HOLD**.  
**Không thực hiện** bất kỳ bài thử ghi nào trên production khi chưa có lịch, quyền, Rules/Functions và dữ liệu thử đã phê duyệt. Bằng chứng `8/8 PASS` nêu dưới là Emulator/Chrome của PR147, không phải nghiệm thu sản xuất.

## 1. Cách ghi biên nhận nghiệm thu

Mỗi lượt ghi **exact SHA frontend + FULL Rules checksum + hai Function codebase/revision**, loại trình duyệt/viewport, role và loại Auth (không công khai email/UID), trạng thái server trước/sau, mã operationId đã xử lý phù hợp bảo mật, revision, audit, active pointer, freeze epoch, ảnh Chrome. **PASS chỉ khi UI và máy chủ khớp**; timeout/không đọc được/không có ảnh hoặc thiếu server snapshot = **NOT VERIFIED**, không được làm tròn thành PASS.

### Ma trận UAT ngắn

| Ca | Trình tự thực hiện (Chrome thật) | Server trước / sau và kết quả bắt buộc |
|---|---|---|
| U01. Login + đúng nguồn | Admin Google verified đăng nhập; mở Tài khoản/kiểm trạng thái Firebase; một nhân viên Google UID riêng và một khách Anonymous mở trang desktop/mobile. | Server `profile`, `datasetV2.active` hoặc legacy `items`, Rules/permissions xác minh đúng đích; không cho khách thấy phần Quản trị. Nếu session chỉ là cache/stale/không đọc được generation: chặn sửa. |
| U02. Cấp quyền | Admin cấp `editors/{uid}=true` cho nhân viên Google (khi sử dụng luồng nhân viên) và mở đúng **một** ô Ghi chú ở phân quyền cột/dòng/ô. Kiểm một ô khác không được mở; thử thu hồi quyền. Guest Anonymous chỉ thử ô được phép nếu chính sách guest-write đã ký. | Server grant/deny và Auth khớp UI; chưa cấp UID/ô thì không được lease, thu hồi quyền chặn acquire/save đang xử lý. Không vô tình mở toàn cột/toàn bảng. |
| U03. Danh sách | Người được cấp sửa Ghi chú trong Danh sách → lưu → reload/xem lại; tab khác subscribe trước để theo dõi không F5. | Bản ghi `revision` tăng chính xác 1, `operationId` xác định, `updatedBy` khớp Auth, `history` có before/after đúng; người khác thấy realtime, chỉ báo thành công sau server ACK. |
| U04. Popup | Từ một ô báo cáo mở popup hồ sơ, sửa **Ghi chú** rồi lưu; đóng và mở lại popup/danh sách. | Đúng `recordId`, đúng trường sửa; không nhầm trường Tiến độ, không xáo trộn báo cáo; revision/audit xác minh như U03. |
| U05. Hai tab, quyền & lock | Hai tab Chrome cùng **một Google UID**: A giữ lease Ghi chú, B thử giành ô bằng token/proofHash công khai; kiểm khác UID cùng ô; thử sửa 2 ô **khác nhau** của cùng dòng. | B không chiếm cùng ô khi chưa có secret, replay không nâng revision, khác UID không giành khóa; trường độc lập vẫn có thể sửa và lưu theo CAS; server lease/audit đối chứng. |
| U06. Mất ACK/mạng | Chỉ trên Emulator cắt HTTP ACK **sau khi server đã lưu**, quan sát nháp; tra operationId/`resolve` rồi retry nếu đúng đường idempotent cùng operationId. Thử mất kết nối trước khi server ACK. | UI giữ nháp và không báo thành công khi `UNKNOWN`; sau tra server ghi đúng 1 lần, không nhân đôi audit/revision. Không dùng mã thao tác mới để “thử lại” một parent commit/restore. |
| U07. Excel→staging→thay→khôi phục | Admin chọn .xlsx nghiệp vụ A–O, sheet cụ thể, preview toàn bộ row count, ID/delta; trên **Emulator** staging/backup/readback → xác nhận `THAY {op} {old} {new}` → xem trạng thái → thử restore từ backup replacement hợp lệ bằng mã mới. Đường first activation cũng kiểm riêng với legacy nonempty + FROZEN. | Chọn file/preview không ghi active; stage digest/count khớp, backup private tồn tại, parent CAS thay pointer một lần; journal `COMMITTED`. Restore tạo **generation mới** với digest mới, chỉ từ backup historically COMMITTED; không restore một nguồn giả. Production chưa được phép chạy thao tác này chỉ vì QA PASS. |
| U08. Freeze + receipt | Admin `Quản trị` chọn “Yêu cầu lưu rồi chốt” (DRAINING), chờ các editor hợp lệ; kiểm không mở lease mới. Thử force “Đóng băng ngay” khi có editor/nháp. Xem receipt, rồi kiểm quy trình OPEN theo quyền. | `freezeControl.mode=FROZEN` phải có server ACK + `freezeReceipts/{epoch}` khớp generation/rows/hash; forced không tính nháp chưa ACK, server từ chối SAVE/RENEW trái quy tắc; DRAINING không được gọi là hoàn tất. |
| U09. Đổi generation khi đang sửa | Trong Emulator A đang giữ editor/nháp cũ, admin B thực hiện replacement có duyệt; A thử lưu cũ; kiểm desktop 1440px/mobile 390px và thông báo lỗi. | Old-generation lease/SAVE bị chặn tại Rules, không ghi vào generation mới; nháp cũ được giữ để đối chiếu, phản hồi lỗi chính xác; không che nút quan trọng trên mobile. |

**Dẫn chứng sẵn có:** [PR147 FULL App QA #41291947075](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291947075) **8/8 PASS** trên đúng SHA với ảnh và server readback; [Integrated CI #41291946931](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946931) chứng minh 2 Functions+1 Rules, cell 32/32, Chrome 4/4; [Operational QA #41291946937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946937) **54/54 PASS**. Những ca đã có chứng cứ này không phải chạy lặp chỉ để tạo nhãn PASS mới. **UAT vận hành với nguồn, quyền, website và backend production thật: NOT RUN**.

## 2. MỘT danh sách cần chủ dự án xác nhận trước GO

Đây là **danh sách hợp nhất duy nhất**; không yêu cầu người dùng trả lời rải rác. Chủ dự án có thể chọn người vận hành/bảo mật trả lời mỗi hàng bằng **kết luận và metadata/hàm băm**, không gửi backup JSON, token, UID thực, email hay dữ liệu nghiệp vụ vào chat/PR. “Chưa rõ” tương đương **HOLD** cho hành động tương ứng.

| # | Chủ dự án / người được ủy quyền cần xác nhận | Vì sao cần / tác động nếu thiếu |
|---|---|---|
| 01 | **Một nguồn dữ liệu chính thức cuối**: Google Sheets/Excel nào, tab nào, version/SHA256, thời điểm chốt (Asia/Bangkok), số dòng, tập mã/ID, danh sách hồ sơ thêm/bớt/rút/lưu trữ, người ký. | Không có chuẩn so full A–O; mirror 55 và ảnh 57 khác mốc không quyết định được nguồn; **không import**. |
| 02 | **Đích production và trạng thái chỉ đọc hiện thời**: project/instance, `hdnd/items` là null hay nonempty, `datasetV2.active` + generation/operations/rights/receipt, số dòng và 2 checkpoint hash. | Quyết định nhánh A/B/C sai có thể mất dữ liệu; **không suy rằng đích trống từ backup 25/10**. |
| 03 | **Phiên bản web đang chạy và chế độ nguồn**: Pages URL/build SHA, cache, `profile.dataSource`, người dùng thực đang xem legacy/V2/Sheets ở bản nào, đã có người sửa WebApp chưa. | Bản PR147 mới force Firebase primary và không tự fallback Sheets; **không public web mới trước backend+dữ liệu**. |
| 04 | **Chốt thay đổi mới**: ai còn cập nhật Sheet/Excel, có nháp browser chưa ACK, có giao dịch server mới sau thời điểm backup không; ai chịu trách nhiệm gom/hòa giải. | Chặn mất dữ liệu do import/rollback lên bản cũ; **chưa dừng ghi nguồn thì không cutover**. |
| 05 | **ID và chính sách bảo toàn**: bảng mapping `recordId`↔`displayCode`, quyền theo cột/dòng/ô, UID nhân viên, revision, audit/history/receipt, legacy P/Q, hồ sơ rút/lưu trữ; có cho phép reset quyền/history ở generation V2 mới không? | Activate/replace V2 **mặc định quyền rỗng**, không tự chuyển audit cũ vào active; nếu có nghĩa vụ bảo toàn mà chưa có cách kiểm chứng thì **HOLD**. |
| 06 | **Quyền khách Anonymous Auth**: người có link có thể sửa những ô nào, hay tất cả chỉ xem; phạm vi hiển thị history/dữ liệu công khai, cách chặn sửa ác ý và người chịu trách nhiệm cấp quyền. | Quyền cấp ô cho guest cho phép người chưa xác minh danh tính ghi ô đó; cần phê duyệt bảo mật trước **MỞ SỬA**. |
| 07 | **Người quản trị và nhân viên thử**: ai có Google verified admin; 2 nhân viên/UID khác nhau; chính sách dùng chung tài khoản (không dùng chung), người xác nhận mỗi kết quả U01–U09. | Không chứng minh được phân quyền, tab cùng UID, server-ACK và điều kiện cho phép ghi ở môi trường thật. |
| 08 | **Hai backend + một FULL Rules + web**: operator IAM, đúng databaseURL/project, codebase/region, HTTPS endpoint parent, CORS origins, frontend flags, checksum artifact và rollback tương thích. | Service/Rules/web không cùng phiên bản gây từ chối ghi hoặc nguy cơ cấu hình sai; **không triển khai một nửa rồi public web**. |
| 09 | **Backup mới và nơi giữ riêng tư**: người sao lưu Rules Published, RTDB, checksum/checkpoint, quyền truy cập/retention; người thực hiện restore drill **bản mới** ở demo và đối chiếu V2. | PASS restore 25/10 chỉ chứng minh snapshot lịch sử, không đảm bảo rollback an toàn tại cutover; **HOLD**. |
| 10 | **Nếu Firebase thực sự trống**: có phê duyệt cơ chế bootstrap legacy empty-root CAS ngoài UI PR147 không, ai vận hành và kiểm Emulator/Rules trước khi kích hoạt V2? | Không có đường first import production được gắn trong App PR147; V2 cần legacy nonempty + FROZEN; **không tự viết hoặc chạy script ghi không được duyệt**. |
| 11 | **Nếu đã có dữ liệu**: tập delta và bản ghi server-ACK nào ưu tiên; có chấp thuận full V2 replace/reset rights không, backup nào đủ provenance để restore, nguyên tắc fix-forward. | Không thể mặc định “file Excel mới đúng hơn”; replace/restore thiếu duyệt có thể loại bỏ thay đổi mới. |
| 12 | **GO/NO-GO vận hành**: thời điểm bảo trì, thông báo ngừng cập nhật nguồn cũ, owner ký duyệt, người giữ quyền Rules, trigger dừng và ai quyết định hòa giải khi đã có ACK mới. | Không có quyền phát hành hoặc quy trình quay lui bảo vệ dữ liệu; **mặc định NO-GO**. |

## 3. Mẫu biên bản ký sau khi đủ chứng cứ

| Trường bắt buộc | Giá trị trước khi owner xác nhận |
|---|---|
| SHA dự kiến | PR147 `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` — Emulator PASS, vẫn Draft |
| Web/2 Functions/FULL Rules artifact và checksum, URLs/regions/IAM | **CHƯA GHI / CHƯA DUYỆT PRODUCTION** |
| Nguồn cuối A–O, cutoff, ID mapping, quyền/history cần giữ | **CHƯA CÓ BẢN KÝ** |
| Trạng thái RTDB legacy/V2 + profile + Rules Published + hash | **CHƯA KIỂM TẠI CUTOVER** |
| Backup private mới + restore demo + đối chiếu 100% | **NOT RUN cho checkpoint mới** |
| U01–U09 ở môi trường đã phê duyệt và server witnesses | **CHƯA CÓ BIÊN NHẬN PRODUCTION** |
| Owner/integrator/operator/security, rollback trigger, maintenance | **CHƯA XÁC NHẬN** |
| Quyết định cuối | **HOLD — KHÔNG DEPLOY / IMPORT / ĐỔI NGUỒN / MỞ SỬA** |

**Nguyên tắc không thay đổi:** Khi bất kỳ chỉnh sửa nào đã được server ACK, phải freeze/maintenance, tạo **snapshot mới + journal/audit**, đối chiếu và được owner duyệt fix-forward. **Tuyệt đối không phục hồi backup cũ đè lên dữ liệu mới**; không dùng rollback Git/Rules để suy ra dữ liệu đã quay lại.

## 4. Nguồn của biên nhận

- [Handoff PR147 #6555988999](https://github.com/cavoixanh638/HopHDND-WebApp/pull/147#issuecomment-6555988999) và [PR147 contract tại SHA cố định](https://github.com/cavoixanh638/HopHDND-WebApp/blob/02964722ae405a7ccf70f2b88bfe21cb7d0bcca7/source/docs/tasks/PR147_INTEGRATED_CANDIDATE.md).
- [First import cũ](FIREBASE_FIRST_IMPORT_FROM_CURRENT_SOURCE_2026-10-27.md), [One-time cutover và rollback](FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md), [Bàn giao backup riêng tư](FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md), [Release gate và lịch sử restore demo](FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md).
- Đường ứng dụng hiện hành theo `src/app/App.tsx`, `VersionedExcelReplacementPanel.tsx`, `firebase-versioned-replacement-secure.ts` và `parent-commit-service/src/commit.mjs` trên **SHA PR147 đã ghim**; không suy sản phẩm production đã cập nhật từ mã repo.

**Hồ sơ này chỉ lập kịch bản và checklist; không có hành động với production hoặc data private.**
