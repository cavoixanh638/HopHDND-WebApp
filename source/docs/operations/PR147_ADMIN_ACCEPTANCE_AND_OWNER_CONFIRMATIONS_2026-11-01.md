# PR147 — Kịch bản nghiệm thu quản trị và danh sách xác nhận duy nhất của chủ dự án

**Đi kèm:** [Hồ sơ nguồn dữ liệu / cutover / backup / rollback](PR147_FIRST_USE_AND_CUTOVER_2026-11-01.md).  
**SHA gốc có FRCR-01:** `02964722ae405a7ccf70f2b88bfe21cb7d0bcca7` · **Fixed đã PR149 diễn tập:** `536f4811b84ee0f97f2841e7c746f0362df80a2e` · **Final Chat1:** `5656a5eaffa4e6b32e5100b11f36697af93c7340` · **Rà:** 02/11/2026 (Asia/Saigon) · **production GO = HOLD**.  
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

**Dẫn chứng mới, không trộn SHA:** [PR147 final FULL App #41328843966](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328843966) và [integrated #41328843999](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41328843999) PASS tại `5656a5…`; [PR149 S1–S3/FRCR/restore #41329223877](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41329223877) PASS tại `536f481…` (final khác đúng file browser-smoke). **Mốc gốc lịch sử:** [PR147 FULL App QA #41291947075](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291947075) **8/8 PASS** trên đúng SHA với ảnh và server readback; [Integrated CI #41291946931](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946931) chứng minh 2 Functions+1 Rules, cell 32/32, Chrome 4/4; [Operational QA #41291946937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41291946937) **54/54 PASS**. Những ca đã có chứng cứ này không phải chạy lặp chỉ để tạo nhãn PASS mới. **UAT vận hành với nguồn, quyền, website và backend production thật: NOT RUN**.

## 2. Chỉ ba nhóm quyết định thật sự thuộc chủ dự án

**Giữ nguyên chính sách đã chốt:** Sau cutover, Firebase là nguồn dữ liệu duy nhất; Google Sheets/Excel chỉ là nguồn ban đầu, không đồng bộ nền. Không phục hồi backup cũ đè dữ liệu server đã ACK. Ngày giờ ký dùng **Asia/Saigon**.

Các thông số kỹ thuật trước đây thuộc bảng 12 mục **chuyển cho operator đo** theo [RUNBOOK](pr149/RUNBOOK.md): đúng project/instance, trạng thái dữ liệu legacy/V2, manifest, web bundle, Published Rules, Auth/IAM, cả hai Functions, CORS/endpoint, backup/restore và server ACK. Chủ dự án không phải đoán giá trị Firebase.

| Quyết định của chủ dự án | Nội dung cần ký | Vì sao không giao kỹ thuật viên tự chọn |
|---|---|---|
| **D1 — Một nguồn nghiệp vụ cuối cùng** | Bản Google Sheets/Excel và worksheet, version/hash, mốc chốt theo Asia/Saigon, số dòng/ID và chênh lệch đã rà, người chốt nguồn và các thay đổi đang làm dở. | Công cụ đo delta nhưng không tự quyết file nào có thẩm quyền hơn dữ liệu đã ACK. |
| **D2 — Quyền, ID và lịch sử** | Bảng mapping recordId ↔ displayCode; những quyền cột/dòng/ô, UID nhân viên, audit/history và biên nhận phải lưu tra được; có chấp thuận reset quyền generation mới hay không; cách bảo toàn ACK mới. | Activate/replace tạo quyền new generation rỗng, hàng A–O mới không tự mang history legacy; không tự quyết được phép bỏ. |
| **D3 — Người và thời điểm GO** | Người có quyền Firebase/Rules, người duyệt bảo mật và nghiệp vụ, thời gian bảo trì/thông báo dừng nhập nguồn cũ, người ký GO/NO-GO và quyết định hòa giải khi đã có ACK. | Quyền phát hành và mức rủi ro còn lại phải do người được giao chịu trách nhiệm. |

Chỉ đưa ba quyết định này ra ký **sau** khi tất cả kiểm tra offline/Emulator có chứng cứ và FRCR-01 được xác nhận FIX trên SHA candidate mới. Việc đọc production vẫn cần ủy quyền riêng; không chuyển thành câu hỏi lần lượt cho owner.

## 3. Biên bản nghiệm thu và quyết định GO/NO-GO

| Trường bắt buộc | Giá trị trước khi owner xác nhận |
|---|---|
| SHA dự kiến | PR147 fixed `5656a5eaffa4e6b32e5100b11f36697af93c7340` — `CODE_READY`/Emulator PASS, vẫn Draft/chưa GO; PR149 độc lập tại `536f481…`. |
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

**Hồ sơ này đi kèm runbook có lệnh chạy, auditor offline và bằng chứng Auth/Functions/RTDB/restore Emulator tại PR149; không có hành động với production hoặc dữ liệu riêng tư.**
