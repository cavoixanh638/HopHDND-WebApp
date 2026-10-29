## Lượt 025 — 29/10/2026: Khách công khai được sửa ô do admin cho phép, KHÔNG cần đăng nhập

| Mã | Trạng thái | Release gate |
| --- | --- | --- |
| **R13** | Đã sửa app + Rules candidate: guest anonymous (auto-auth, không đăng nhập Google) được sửa **chỉ ô admin bật**, cần server lease, audit, lock OPEN. Vẫn ngăn chỉnh cột/dòng không cấp, ghi thẳng, freeze. | Bằng chứng Emulator và Codex security, kiểm rủi ro khách công khai có thể sửa/ghi spam; chưa deploy Rules. |
| **R14** | Guest UI khác admin: giữ layout tối giản và popup guest riêng, cho sửa đúng ô được phép; nút Quản trị chỉ tùy chọn. | Browser smoke, ảnh QA guest, chủ dự án nghiệm thu sau preview. |
| **Nguồn dữ liệu** | Không chuyển Sheets/mirror sang Primary. | Chỉ khi nguồn primary chính thức mới ghi dữ liệu thật; tuyệt đối không dual-write hoặc import ngoài quy trình riêng. |
| **Cổng PR #92** | Code SHA `1d7190c1`; [bàn giao L025](tasks/UI_COLUMN_REFINEMENT_2026-10-28.md). | Chờ 3 CI + Codex review R13/R14, OWNER_ACCEPTED; NO MERGE/PUBLISH/DEPLOY. |

---

## 29/10/2026 — Lượt 024 PR #92: quyền khách + tiêu đề gộp (HOLD)

| ID | Trạng thái | Kiểm soát tiếp |
| --- | --- | --- |
| **R11** | **CODE_CHANGED:** popup Google employee được duyệt UID không còn bị gắn nhãn read-only như khách ẩn danh; admin list override thống nhất Rules. Anonymous giữ view-only; hiển thị rõ điều kiện Google/UID/ô/nguồn/khóa/freeze. | Codex security review, test nhân viên Google và anonymous qua Rules trên emulator (không thử write production). Phải xác nhận trạng thái quyền live riêng, không suy từ mock. |
| **R12** | **CODE_CHANGED:** shortcut **Đổi tên cột gộp** trong list admin; 5 labels, reset, lưu CAS; smoke Chromium có đường click. | Chromium PASS trên đúng HEAD và Codex UI/CAS review; hình ảnh/owner acceptance sau đó. |
| **L024 CI** | [source #40821479615](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40821479615), [staging #40821479618](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40821479618), [operational #40821479616](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40821479616). Code SHA `2a7e03b1`. | Chỉ kết luận theo kết quả từng workflow; source đã rerun vì Chrome baseline khởi động lỗi ở attempt 1. |
| **Release gate** | PR #92 OPEN, thay đổi R06–R12 chưa merge/publish. | Không triển khai Firebase hoặc Pages khi chưa có phê duyệt riêng từ chủ dự án. |

---

## 29/10/2026 — Lượt 023: sửa UI theo ảnh chụp, chỉ PR #92 (RELEASE HOLD)

| Mã | Đã xử lý | Cổng còn mở |
| --- | --- | --- |
| **R08** | Vạch resize 14px, window pointer fallback, khách/không-admin kéo local-only; admin CAS unchanged. Kéo +250px đạt tiến độ450, staff130, note100, total1562. | Verify source/Chromium exact code SHA `68a494fe`; Codex review; chủ dự án quyết định phát hành. |
| **R09** | HC và Sở `align-items:center`, cùng centerY trong Chromium. | QA visual sau merge/publish (chưa thực hiện). |
| **R10** | Bỏ justify và loại Tiến độ khỏi centered-status selector; Nội dung, Tiến độ, Ghi chú căn trái. | QA visual live sau phát hành (chưa thực hiện). |
| **CI** | [source #40820076288](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40820076288), [staging #40820076163](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40820076163), [Firebase QA #40820076291](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40820076291). | Phải kiểm result trên đúng SHA; staging + Firebase QA đã SUCCESS khi ghi. |
| **Release** | Bằng chứng và quyết định ở [L023](tasks/UI_COLUMN_REFINEMENT_2026-10-28.md). | **NO MERGE / NO PUBLISH** PR #92; chưa Codex VERIFIED/OWNER_ACCEPTED; không deploy production hay sửa dữ liệu. |

---

## 29/10/2026 — UI U01–U04, PR #92: chờ Codex xác minh độc lập (NO RELEASE)

| Mã | Kết quả thực hiện | Còn phải hoàn thành |
| --- | --- | --- |
| **R06/P1** | **FIX_TESTED**: sửa mobile cắt bảng (L021) và specificity chiều cao responsive (L022). CI trên `c285ca6` GREEN, Chromium 390×844/768×750/1280×600 và desktop PASS. | Codex tái-review CSS/layout App thực tế + ảnh QA, xác nhận VERIFIED nếu đạt. |
| **R07/P2** | **FIX_TESTED**: normalize tên popup, đồng bộ state/storage, regression nhập/xóa/chỉ khoảng trắng/reset/reload PASS. | Codex tái-review alias, save/undo/reload, xác nhận VERIFIED nếu đạt. |
| **R01–R05, L019 resize/CAS** | Hồi quy đạt; `Tiến độ 200→250`, cột liền kề `240→190`, total `1562`, các cột khác không đổi. | Không sửa thuật toán đang đạt; Codex kiểm rủi ro materialize/CAS nếu cần trước nghiệm thu. |
| **PR #92 release gate** | 3 workflow SUCCESS exact code SHA `c285ca648a63499450ed5a33900d971d912cd7ed`: [source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40815718404), [staging](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40815718256), [operational](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40815718231). [Bàn giao L022](tasks/UI_COLUMN_REFINEMENT_2026-10-28.md). | **HOLD**: chưa Codex VERIFIED, chưa OWNER_ACCEPTED; tuyệt đối không merge/publish Pages, deploy Firebase Rules/Functions hoặc nhập dữ liệu/đổi nguồn. |

---

## 27/10/2026 — ĐÃ KIỂM CHỨNG QUYỀN ĐỌC TRÊN FIREBASE CLOUD (GET-ONLY)

**Bằng chứng thực tế:** GitHub Action [Verify live Firebase public read #40499847055](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40499847055) gửi GET *không kèm credential* `?shallow=true` tới instance `hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app`, bỏ response body, chỉ lưu mã HTTP. **Sáu nhánh cần xem công khai `hdnd/items`, `hdnd/mirrors`, `hdnd/profile`, `hdnd/permissions`, `hdnd/control`, `hdnd/freezeControl` đều trả 401**, nên Rules đã publish Cloud **chưa cho phép unauthenticated direct API reads** như Rules ứng viên mới ở PR #82. Các nhánh registry/token `hdnd`, `hdnd/editors`, `hdnd/editLocks`, `hdnd/freezeReceipts` trả 401, đúng chính sách bảo vệ.

**Phân biệt:** WebApp có `ensureGuestAuth` tự đăng nhập Firebase Anonymous Auth ngầm, nên người dùng mở trang mà không tự đăng nhập Google vẫn **có thể được xem** theo Rules cũ `auth != null`. HTTP 401 trên truy vấn không auth **không chứng minh người dùng bình thường đang bị chặn xem**. Nó chứng minh Rules Cloud chưa cho phép *đọc trực tiếp không có Firebase Auth*. Cloud viewer hai UID thực chưa được thử.

**Tình trạng:** PR #82 đã merge `main`, candidate Rules cho public reads đã qua Emulator + Chrome QA. Nhưng **không có quyền Firebase CLI production trong phiên ChatGPT/GitHub** để xác minh published Rules đầy đủ, sao lưu, deploy hay thử 2 Google UID thật. Chỉ dùng bộ lệnh `firebase-verify-published-rules.mjs`, `firebase-production-readonly-backup.mjs` trên máy đã đăng nhập đúng project để hoàn thành release. Không nhầm workflow GitHub Pages deploy với Rules deployment. [Cloud GET-only workflow](https://github.com/cavoixanh638/HopHDND-WebApp/actions/workflows/verify-live-public-firebase-read.yml) có thể bấm Run workflow sau khi Rules Cloud được duyệt và publish.

---

## 27/10/2026 — CHỐT QUYỀN XEM CÔNG KHAI / PHÂN QUYỀN SỬA (PR #82 MERGED)

**Chủ dự án yêu cầu:** *Lúc nào, tài khoản nào, kể cả chưa đăng nhập cũng được xem bảng; chỉ việc chỉnh sửa mới phải được cấp quyền*. Một UID Google sử dụng từ nhiều máy là hợp lệ, coi là một định danh quyền; không bắt các máy có Google UID khác nhau.

- PR [#82](https://github.com/cavoixanh638/HopHDND-WebApp/pull/82) merged to main `014f79ff679484ee314e5ff387ac075075ac68d4`. Rules ứng viên `database.exclusive-candidate.rules.json` **bỏ `hdnd/.read` rộng**, thay bằng `.read:true` riêng tại `hdnd/items`, `hdnd/mirrors`, `hdnd/profile`, `hdnd/permissions`, `hdnd/control`, `hdnd/freezeControl`. Tất cả hồ sơ (gồm history) truy cập được bằng Firebase API kể cả không đăng nhập; không lưu thông tin mật trong các nhánh công khai này.
- `hdnd/editors` registry UID, `hdnd/editLocks` danh sách token và `hdnd/freezeReceipts` chỉ admin đọc toàn bộ. Người dùng thông thường chỉ lắng nghe `hdnd/editors/{ownUid}`; Google nhân viên được cấp quyền đọc khóa của ô cần sửa. `hdndReviews` chỉ admin.
- **Không nhầm đọc với ghi**: cấp/cấm quyền chỉnh sửa, per-cell lease, CAS/audit, DRAINING/FROZEN vẫn bảo vệ thao tác ghi. Trạng thái chốt không chặn xem.
- Exact HEAD PR #82 `abeddbff33c38bc0fe37911c437e2440d5167d3f`: [source + Chrome #40499068707](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40499068707), [Firebase staging #40499068627](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40499068627) và [Firebase QA #40499068597](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40499068597) **SUCCESS**. Kiểm thêm khách không đăng nhập đọc được content và không được đọc UID/token.
- **Chưa xác minh/publish bộ Rules lên Firebase Cloud `hophdnd-8b7b2`**: merge GitHub chỉ làm thay đổi code và ứng viên. Chưa có phiên Firebase CLI quản trị/kết nối production trong phiên này; mọi việc backup live, đối chiếu Published Rules, nghiệm thu hai Google UID và chuyển dataSource vẫn HOLD. Trang Pages tiếp tục hoạt động và chỉnh UI bình thường.
- Chính sách và cảnh báo dữ liệu công khai chi tiết tại [FIREBASE_READ_SCOPE_AUDIT_2026-10-27.md](operations/FIREBASE_READ_SCOPE_AUDIT_2026-10-27.md).

---

## 27/10/2026 — AUTO-QA FIREBASE ĐÃ ĐƯA VÀO MAIN, 51 TESTS + KNOWN RISK

- [PR #81](https://github.com/cavoixanh638/HopHDND-WebApp/pull/81) merged `d0e558510283f23013b62f84ab000ca4a4fcd2b2`. Exact HEAD PR kiểm thử [Firebase operational QA #40493383920](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40493383920) **SUCCESS**: **51 PASS / 0 FAIL / 0 SKIP** với **1 known expected-failure** của shared Google UID lease-token replay, không tuyên bố đã khắc phục. [Verify HopHDND source #40493384261](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40493384261) **SUCCESS**. Lượt tự động chạy trên main [Firebase operational QA #40493668600](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40493668600) **SUCCESS**.
- Bộ QA có thể chạy qua **GitHub Actions → Firebase operational QA — isolated multi-account test → Run workflow**, hoặc `cd source && npm run qa:firebase` trên môi trường Node+Java. Artifact `hophdnd-firebase-functional-qa` lưu báo cáo **HTML, Markdown, JSON, Vitest result**, tách riêng nhóm quyền, UID, locks, realtime, audit, freeze, import; xác định SHA-256 Rules ứng viên.
- Workflow chạy khi thay đổi mã `source/src/data`, `state`, `app`, `features`, `domain`, `source/shared`, Rules, tests và scripts QA; không chạy vào Firebase production.
- **HOLD production**: PASS Emulator và Github Pages không xác minh Rules Published của `hophdnd-8b7b2`, backup thực, hoặc kiểm thử 2 UID Google thật. Giới hạn replay chung UID và read scope `hdnd/.read=auth != null` phải có quyết định bảo mật riêng. Tài liệu [FIREBASE_FUNCTIONAL_QA_TOOL_2026-10-27.md](operations/FIREBASE_FUNCTIONAL_QA_TOOL_2026-10-27.md).

---

## 27/10/2026 — Bộ kiểm thử chức năng Firebase độc lập đã bổ sung (PR #81)

Theo yêu cầu “tự tạo công cụ test các tính năng”, thêm **QA một lệnh** `cd source && npm run qa:firebase` và workflow [Firebase operational QA](https://github.com/cavoixanh638/HopHDND-WebApp/actions/workflows/firebase-operational-qa.yml). Dùng Firebase Auth + RTDB Emulator `demo-hdnd` cô lập hoàn toàn khỏi `hophdnd-8b7b2`, 8 nhóm phân quyền, khóa ô, đồng bộ realtime, ghi CAS, audit, chốt dữ liệu, xác thực Google và khởi tạo nguồn. Tạo artifact **HTML/Markdown/JSON** với kết quả theo nhóm; giữ artifact kể cả thất bại. Bổ sung hồi quy thu hồi quyền khi UID đang giữ lease, và per-cell deny thắng quyền cột.

**Không coi PASS Emulator là Cloud GO.** Báo cáo ghi rõ Rules mới/cũ, SHA-256 candidate, known same-UID session replay và read scope, chưa kiểm chứng Published Rules/backup/cặp tài khoản Google thực; tool tự chặn khi nhầm credential/endpoint production. Quy trình: [FIREBASE_FUNCTIONAL_QA_TOOL_2026-10-27.md](operations/FIREBASE_FUNCTIONAL_QA_TOOL_2026-10-27.md). PR #81 còn chờ exact HEAD Actions trước khi merge. Các thay đổi không đụng giao diện Danh sách, Supabase hoặc Firebase dữ liệu thật.

---

## 27/10/2026 — Kiểm tra trạng thái Firebase từ WebApp trực tiếp (PR #80 merged)

**Đã hợp nhất [PR #80](https://github.com/cavoixanh638/HopHDND-WebApp/pull/80)** vào `main` tại `79ef349407d1d2258b0cde19b85cc2bccd420da7`. Kết quả kiểm thử [source + Chrome #40482172729](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40482172729) **PASS**, [Firebase staging #40482172707](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40482172707) **PASS**. Bản Pages chính thức phát hành theo quy trình CI; cần kiểm tra Actions build/Pages trước khi công bố trạng thái triển khai mới nhất.

**Đường kiểm tra trực tiếp:** Mở https://cavoixanh638.github.io/HopHDND-WebApp/, đăng nhập tài khoản **Google quản trị** → **Tài khoản Firebase** → **Kiểm tra vận hành Firebase** → **Kiểm tra Firebase đang sử dụng**. Chỉ đọc 6 nhánh `hdnd/profile`, `hdnd/items`, `hdnd/permissions`, `hdnd/editors`, `hdnd/control`, `hdnd/freezeControl` trong Firebase instance đã cấu hình; hiển thị nguồn `excel/database/primary`, số hồ sơ thực, cấu hình, quyền, số UID được cấp, cờ khóa và chế độ chốt. **Không ghi database, không trả nội dung hồ sơ hoặc UID**, không báo Rules đã duyệt chỉ từ thao tác đọc.

**Mục đích:** Loại bỏ phỏng đoán từ sao lưu 25/10 hoặc GitHub về `hdnd/items` hiện tại. Kiểm tra dự án Firebase **đã tồn tại** `hophdnd-8b7b2`, không tạo dịch vụ mới. Trạng thái Cloud thực tế chỉ có chứng cứ sau khi người dùng quản trị chạy kiểm tra trong trình duyệt. Nếu lỗi quyền/mạng, báo rõ, không coi là PASS.

**Cổng cuối chưa xong:** (1) so sánh Rules production hiệu lực với Rules ứng viên, backup RTDB & Rules riêng tư và thử restore; (2) nếu `hdnd/items` trống, khởi tạo một lần từ nguồn Sheets/Excel đã duyệt theo [quy trình nhập đầu tiên](operations/FIREBASE_FIRST_IMPORT_FROM_CURRENT_SOURCE_2026-10-27.md); nếu có dữ liệu phải đối chiếu chứ không nhập đè; (3) chuyển `dataSource` sang `primary` qua quản trị sau xác minh; (4) thử 2 UID Google khác nhau trên 2 trình duyệt với quyền được cấp, khóa ô, ACK save, cập nhật realtime và cơ chế chốt. **CI Emulator không chứng minh Rules/sao lưu của môi trường production đang đạt**. Công việc chỉnh UI Danh sách và gộp cột vẫn có thể làm độc lập khi database chưa được kích hoạt.

---

## FIREBASE LAUNCH PREPARATION — 27/10/2026: PR #79 merged, production backend still requires separate activation

**Goal clarified by owner:** no employees are currently entering WebApp data. Use `main` and the canonical Pages URL for direct UI review; keep Google Sheets available as transitional source. Firebase-only. Supabase PAUSED.

- PR [#71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) and [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) are already merged into main; **[#79](https://github.com/cavoixanh638/HopHDND-WebApp/pull/79) now merged** at `14166362684cd8220fde4e552bc1be0d6ffc008a`.
- A genuine launch gap is closed in code: **approved first import** from fresh Google Sheets or Excel into **empty** `hdnd/items` (admin, checked snapshot, duplicate/invalid records blocked, explicit two-step confirmation, server empty-root transaction, per-record readback, never overwrites and never auto-switches `dataSource`). Kept separate from transitional updates on already-existing rows. No changes to standard list, reports or 4 compact columns. See [initialization checklist](operations/FIREBASE_FIRST_IMPORT_FROM_CURRENT_SOURCE_2026-10-27.md).
- Exact tested feature head `00ce3e2bf5a7ae6dd078a001cb6c25b0f9c02b8e`: [source build + browser tests #40478916952](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40478916952) PASS; [isolated Firebase Emulator staging #40478916935](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40478916935) PASS. No production credentials/data were used in CI. Main Pages build/deployment must still be checked separately.
- **Pending Firebase production access / Cloud checks:** authoritative read-only Rules/RTDB state, fresh private backup and emulator restore check, independently reviewed deployment of exact security rules, empty-root current approved source import, profile switch to `primary`, real two-user distinct Google UID/browser lock/save/realtime/freeze test and recorded release GO. Do not conclude these checks passed from browser or Emulator CI.
- Avoid blanket root set/remove, recurring Sheets sync, silent data migration, permission expansion or premature Rules deploy. Without authenticated connection to `hophdnd-8b7b2`, the assistant cannot truthfully claim production Rules/data checks or writes.

---

## PUBLISH CHECKPOINT 27/10/2026 — MAIN HAS FIREBASE-ONLY WEBAPP SOURCE, DATABASE CUTOVER STILL SEPARATE

**Owner clarified that no employees are using the WebApp yet.** We are using the canonical GitHub Pages URL as a live UI-acceptance environment; no extra HTML download/standalone preview is necessary for routine UI review.

- PR [#71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) merged into `main` at `accde2681571e36b9548b21925fe9b2c82082236`; PR [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) merged at `c1696fa6a6b89e94013a5477fcd82650b3e343df`. PR #77 and all Supabase development stay PAUSED, not merged. 
- GitHub Pages publish workflow [run #40474477483](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40474477483) passed; the generated root `index.html` now references `./assets/pages-DUfJ2eUZ.js`, `./assets/style-BLGoX-cX.css` and the Pages build commit `43eb9b31f2b5d0943d545324974f8549cfe568d2`. GitHub Pages dynamic deployment status must be checked separately. Canonical site: https://cavoixanh638.github.io/HopHDND-WebApp/.
- **Important: code deployment is NOT Firebase data migration.** No production RTDB Rules publish, `hdnd/items` data import, profile `dataSource=primary` activation or user-role changes have been performed. Do not imply real-time employee editing is ready until the connected Firebase project has been independently checked. The existing source choice may still show Sheets/mirror and may be read-only.
- Final Firebase production activation remains contingent on verifying the real project's published Rules and snapshot/backup; validated source dataset and exactly one import if empty; matching RTDB Rules deployment authorized by owner; admin/employee Google UID sign-in and proper rights; real two-account save/readback/lock/freeze smoke; rollback. The owner explicitly wants to operate the Pages app as an initial acceptance target and reports no staff data entry, which lowers cutover coordination needs but not security/consistency requirements.
- Source now includes four compact merge options and a manual Sheets/Excel reconciliation UI, but the latter requires `primary` and authenticated admin; it is not a substitute for initial onboarding. Do not overwrite any existing records to initialize.
- This checkpoint supersedes older PR status lines below only where they state the code is not merged or the WebApp HTML has not been published. Historical unresolved RTDB security limitations remain documented and must be separately accepted/resolved before live employee editing.

---

## QUYẾT ĐỊNH GIAO THỜI — 27/10/2026: cho phép cập nhật thủ công từ Sheets/Excel sang Firebase

Theo yêu cầu mới nhất của chủ dự án: **chưa ngừng sử dụng Google Sheets**, đồng thời phát triển một luồng cập nhật chủ động từ **Google Sheets hoặc Excel .xlsx** vào Firebase. Đây là ngoại lệ chuyển tiếp đối với kế hoạch Firebase-only, **không phải đồng bộ nền vĩnh viễn**, không khôi phục Supabase (vẫn PAUSED). Tài liệu chi tiết: [FIREBASE_TRANSITIONAL_GOOGLE_EXCEL_IMPORT_2026-10-27.md](operations/FIREBASE_TRANSITIONAL_GOOGLE_EXCEL_IMPORT_2026-10-27.md).

Đã triển khai trên Firebase PR #72 (chưa phát hành): màn hình Nhập/Xuất Excel có mô-đun cập nhật chuyển tiếp dành riêng quản trị khi Firebase chính đã được kích hoạt và chế độ sửa OPEN; chọn link Sheets hoặc tệp Excel A–O / mẫu WebApp, **xem đối chiếu 13 trường văn bản** trước khi chọn 1–20 hồ sơ, xác nhận bằng cụm từ bắt buộc, đọc lại Firebase trước thao tác, chiếm khóa ô, ghi CAS/audit qua FirebaseRepository, đọc lại sau server ACK. Giữ nguyên dữ liệu nếu mã trùng/thiếu, source blank, hồ sơ mới chưa khớp, revision nguồn đổi; không thay ID/STT, status rút, xóa/thêm dòng hoặc thiết lập Rules. Không tự đọc Sheets ở màn hình chính hoặc đồng bộ theo lịch. XLSX được tách tải trễ, không đưa vào bundle khởi động chính.

**TRẠNG THÁI PHÁT HÀNH: HOLD.** Chỉ mã trên PR #72; chưa merge main, chưa thay GitHub Pages production, chưa ghi RTDB production và chưa chứng minh Cloud staging nhiều tài khoản. UI tính năng không bật khi chế độ còn đọc Excel/mirror, tránh ghi vào Firebase-primary chưa được phê duyệt. Kiểm thử tự động sẽ được xác nhận theo exact SHA trong GitHub Actions trước GO.

---

## 27/10/2026 — BẢN HTML XEM THỬ GỘP CỘT, KHÔNG CẦN CÀI ĐẶT

Theo yêu cầu chủ dự án “làm đến khi tôi xem được”, nhánh Firebase PR #72 bổ sung **bản giao diện tương tác độc lập** của chính `ItemList` bằng dữ liệu mô phỏng: `source/compact-qa.html` → Vite `dist-compact-qa` → `node scripts/package-compact-qa.mjs` → `dist-compact-qa/HopHDND_GopCot_XemThu.html` (một HTML đóng gói CSS/JS, không cần máy chủ, không có bộ kết nối Firebase, không sửa Cloud). GitHub Actions `verify-source.yml` sau khi **browser smoke PASS** sẽ tạo artifact `hophdnd-compact-interactive-offline` để chủ dự án tải tệp HTML và mở trực tiếp bằng Chrome/Edge; liên kết lấy từ trang Actions run tương ứng PR #72.

- Bản xem thử dùng **tập dữ liệu giả**, có menu 4 lựa chọn gộp (15→8 cột) và các tùy chọn khác; mở `HopHDND_GopCot_XemThu.html` offline để thao tác, không yêu cầu GitHub Desktop, npm, tài khoản Google hay Firebase.
- Ảnh chụp thực Chrome desktop/mobile và chế độ người xem trong artifact `hophdnd-browser-smoke-preview`. Lưu ý QA phiên offline mặc định là mô phỏng quản trị; `?guest=1` được dùng khi chạy trong QA server để kiểm tra chế độ khách. Không diễn giải preview thành app production.
- Bản HTML **không được tự động deploy GitHub Pages chính thức**, không merge PR #71/#72, không thay đổi Supabase, Firebase production hay dữ liệu thật. Release gate Firebase vẫn NO-GO chờ nghiệm thu nhiều tài khoản và backup/Rules.

---

## BỔ SUNG UI FIREBASE — GỘP CỘT CÁ NHÂN CHO NGƯỜI XEM (27/10/2026)

Theo yêu cầu tiếp tục làm **trực tiếp trên GitHub**, đã tách phần hiển thị của bốn nhóm gộp cột khỏi quyền ghi bố cục chung:

- Trong **Firebase Danh sách**, quản trị viên có quyền và callback lưu bố cục chung vẫn dùng thao tác cũ (ghi Firebase khi được phép); người xem/khách Firebase không có quyền bố cục chung được bật menu **Gộp cột** dạng **local-only**. Chọn/bỏ chọn chỉ ảnh hưởng UI của người dùng đó và lưu trong `localStorage` theo Firebase UID + nguồn; **không gọi Firebase write, không mở rộng ACL/quyền ô/lease**. Có nút **Khôi phục cách hiển thị chung** xóa lớp lựa chọn cá nhân để trở lại cấu hình do quản trị ban hành.
- Giới hạn qua prop `allowPersonalCompact={isFirebase}`: không thay đổi hành vi của nguồn Google/Supabase; Supabase PAUSED. `ItemList.tsx`, `App.tsx`, `compact-columns.ts`, `item-frame.css` và QA synthetic đã cập nhật. Khi UID/nguồn thay đổi, đọc lại cấu hình riêng, không dùng nhầm lựa chọn của tài khoản khác. Trình duyệt chặn `localStorage` thì thao tác còn tác dụng trong phiên và cảnh báo không lưu.
- Thêm unit tests lỗi storage/phân tách UID, bổ sung smoke Chrome trên **ItemList thật** với dữ liệu mô phỏng: khách tắt gộp Nội dung/Sở (8→10 cột), tải lại trang giữ lựa chọn, bấm khôi phục (10→8 cột) và xóa local override. Artifact ảnh `hophdnd-compact-guest-pass.png` được lưu trong `hophdnd-browser-smoke-preview` khi CI đạt. Không có bước QA nào gửi dữ liệu nghiệp vụ lên Firebase.
- **Chưa hợp nhất vào `main`, chưa deploy Pages/Rules/RTDB production.** Giữ nguyên Firebase PR #71/#72 Draft vì release gate còn yêu cầu kiểm thử đa tài khoản thực và backup/Rules. Chức năng mới đã commit nhưng nghiệm thu thực tế trên Windows chưa được xác nhận.

---

## XÁC MINH TRỰC TIẾP GITHUB — 27/10/2026: 4 nhóm gộp cột đã có trên PR #72, CHƯA PHÁT HÀNH

- Đã đối chiếu trực tiếp nhánh `feat/exclusive-cell-leases-admin-freeze-20261025` với `main` trên GitHub. **4 tùy chọn thực sự có trong mã**: `contentDetails` (Loại VB + Sở/ngành → Nội dung), `partyTogether` (Cấp xin + tiến độ Thành ủy), `councilTogether` (Trình HĐND xây dựng + ban hành), `teamTogether` (Lãnh đạo UBND + Lãnh đạo VP + Phòng + Chuyên viên). Cụ thể: `src/features/items/compact-columns.ts`, `ItemList.tsx`, `data/item-preferences.ts`, `item-frame.css` và `tests/compact-columns.test.ts`. Mở cả bốn sẽ chiếu **15 cột gốc thành 8 cột hiển thị**, không hủy giá trị nguồn; bộ lọc trên cột gộp sử dụng giá trị nguyên gốc. Tùy chọn không tương thích tự tắt khi bật kiểu gộp thay thế.
- **Điều kiện giao diện:** menu “Gộp cột” ở chế độ xem danh sách được hiển thị **chỉ khi `compactOn && !permissionMode && allowLayout && onPersistViewerLayout`** — tức cần ngữ cảnh/cấp quyền quản trị bố cục; không khẳng định mọi nhân viên đều có nút bật/tắt tùy ý. Lựa chọn hiện tại là cấu hình hiển thị chung Firebase, khi lưu phải qua cơ chế xác minh/quyền ghi bố cục. Nếu sau này muốn từng người tự gộp độc lập, phải duyệt UX/quyền riêng trước khi sửa.
- **QA tự động HEAD `1e87e3f8868cca80feee66906d0449e2d5e25788`:** [Verify HopHDND source #40380629164](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380629164) **PASS**; [Verify isolated Firebase staging #40380629272](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380629272) **PASS**. Bản UI thật đã được smoke-test Chrome/đánh giá desktop-mobile trên **dữ liệu mô phỏng**, xem biên bản ở `CURRENT_STATE.md`.
- **Chưa đưa vào `main` / Pages:** PR #71 và #72 đều **Draft, chưa merge**. Bản triển khai production không có 4 lựa chọn mới; không tự merge hoặc deploy vì release gate Firebase (Rules, backup/restore, nghiệm thu đa người dùng, quyền/lock/ACK) vẫn NO-GO. Không tác động Supabase PAUSED. Mọi sửa mã sau này thực hiện trực tiếp trên GitHub nhánh Firebase, GitHub Desktop chỉ cần để đồng bộ máy Windows khi cần chạy tại chỗ.

---

## KẾT QUẢ NGHIỆM THU UI TỰ ĐỘNG — 27/10/2026 (CHỈ FIREBASE)

**COMPACT REAL ITEMLIST QA — PASS:** [Verify HopHDND source #40379091513](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380075664) và [Verify isolated Firebase staging #40379091832](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380075707) trên bản thử có 4 kiểu gộp. Browser **Chromium headless** chạy chính component `ItemList` với tám hồ sơ giả bằng `compact-qa.html`, không kết nối dịch vụ ngoài; **không phải ảnh chụp thủ công trên Windows**. Đã kiểm: 15 trường nguồn còn nguyên; bật cả 4 gộp còn 8 cột thực tế; nhãn và trình tự 4 trường UBND–VP–Phòng–CV; menu có 9 tùy chọn, 2 nhóm; 390px không tràn ngang trang, bảng tự cuộn; chuyển `teamTogether` sang `leadersTogether` rồi quay lại khôi phục đúng 10→8 cột; sửa nội bộ **Cấp Thành ủy** trong một ô gộp không làm thay đổi **Tiến độ**. **Đã xem trực tiếp ảnh** desktop/mobile, xác nhận bản menu ban đầu quá dài rồi thu gọn: bốn nhóm chính hiện ngay, mục gộp cũ và viết tắt tên có thể mở. Chiều cao popup 379px trên desktop/mobile thay vì 560px, không tràn. Screenshot desktop/mobile lưu trong artifact `hophdnd-browser-smoke-preview` trên run này (artifact tự hết hạn sau 7 ngày). QA dùng mode build riêng `compact-qa`, không tham gia Pages production.

**Còn phải nghiệm thu trước GO:** quan sát trực tiếp bằng mắt ảnh screenshot và UI trên máy Windows của chủ dự án, thử admin thật với Firebase Emulator/Cloud staging và 2 tài khoản để xác nhận quyền/lease và quyền lưu bố cục, chốt sao lưu/Rules, GO phát hành theo gate PR #71/#72. **Chưa merge, chưa deploy, chưa ghi production**. Không phát triển Supabase (đã đóng băng theo quyết định 26/10).

---

## UI-COMPACT-4 — 27/10/2026

**ĐÃ TRIỂN KHAI MÃ PR #72 / CHỜ NGHIỆM THU TRỰC QUAN:** thêm bốn cách gộp vào menu hiển thị gọn cho Danh sách; giữ lựa chọn 2-cột và hai chế độ viết tắt. Mã `compact-columns.ts` + `ItemList.tsx` + `item-preferences.ts` + `item-frame.css`: kiểm gộp không chồng, ẩn trường hợp lệ, hiển thị tên trường con, lọc dùng giá trị đầy đủ, editor theo từng trường và schema đọc bố cục Firebase cũ. Thêm unit test ở `compact-columns.test.ts` và `item-preferences.test.ts`. CI đã **PASS** trên head mã/tài liệu: [Verify HopHDND source #40376214201](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40376214201) (typecheck, unit, browser smoke) và [Verify isolated Firebase staging #40376214430](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40376214430). Tiếp tục nghiệm thu trực quan desktop + màn hẹp (độ cao dòng, dropdown, ô sửa và focus); CI không thay thế QA bằng mắt. **Chưa deploy hoặc thay dữ liệu production.** [Đặc tả](FEATURES.md) · [Hướng dẫn thao tác](HUONG_DAN_SU_DUNG.md).

---

## 27/10/2026 — QUAY LẠI HOÀN THIỆN UI; TẠM LƯU HOST LAN

- **LAN-HOST-POC: PASS một bước:** chủ dự án xác nhận máy thứ hai trong mạng cơ quan đã mở được demo Windows trên host `:8787`; chưa phải IPlan/HopHDND thật, chưa có CSV đo 60 phút và không khẳng định sẵn sàng production. [Hồ sơ thử nghiệm](operations/LAN_HOST_PILOT_2026-10-27.md). Không tiếp tục phát triển host nếu chưa có chỉ đạo mới.
- **UI-PRIMARY: IN PROGRESS / ƯU TIÊN SỐ 1** — tiếp tục UI hiện hành trên Firebase-only PR #72 và giữ công năng Theme2, không phát sinh nhánh/luồng mới khi chưa cần. Rà theo thứ tự: (a) điều hướng Báo cáo tổng hợp / Danh sách và trạng thái chọn; (b) bảng 15 cột, bộ lọc, kéo cột, tooltip, popup chi tiết và phối màu; (c) trạng thái quyền/khóa ô/đã lưu/đang lưu/mất mạng và modal cảnh báo nháp; (d) responsive, bàn phím, tương phản màu, lỗi/loading; (e) browser smoke và kiểm chứng hồi quy trên Firebase emulator. Ưu tiên sửa **mã thật**, không thay bằng giao diện demo rời, không đụng Firebase Rules/dữ liệu production chỉ để làm UI.
- **Điều kiện ghi DONE:** rà UI bằng browser trên desktop + màn hẹp; đối chiếu `FEATURES.md`, `AGENTS.md`, Theme2 và quyết định màu mới nhất; `npm run typecheck`, `npm test`, CI source/Firebase emulator PASS; tài liệu/ảnh QA mô tả đúng tính năng đã test; chỉ merge/deploy sau release gate và GO.

### Đã bắt đầu thực hiện UI trên PR #72

- **UI-LEASE-FEEDBACK (CI PASS; chờ kiểm thử trực quan Windows):** Trong `CellPicker` và `InlineNoteEditor`, khi đang chờ Firebase cấp quyền sửa, hiển thị trạng thái “Đang xác nhận quyền sửa ô…” (`role=status`) và nút chọn trạng thái có `aria-busy`. CSS chỉ bổ sung kiểu chữ phản hồi, không đổi palette Theme2, nghiệp vụ, quyền/RLS hay dữ liệu. Mục tiêu là loại bỏ cảm giác nút sửa bị treo khi mạng chậm; chưa tuyên bố đã QA bằng mắt trên Windows.
- **Tiếp theo:** rà giao diện desktop/mobile thực tế và tích hợp skill `ui-ux-pro-max` từ máy phát triển; ưu tiên các trạng thái có rủi ro mất nháp/khóa ô rồi tới bố cục báo cáo, danh sách và popup. Yêu cầu screenshot thực tế khi nghiệm thu; không tự thay UI bằng demo LAN.


---

## ƯU TIÊN CAO NHẤT 26/10/2026 — CHỈ FIREBASE, DỪNG SUPABASE

**[Quyết định mới nhất](decisions/FIREBASE_ONLY_SUPABASE_PAUSED_2026-10-26.md):** chủ dự án yêu cầu tạm dừng mọi phát triển/tích hợp Supabase, giữ nguyên 55 bản ghi staging như dự phòng tĩnh, không xóa, không tự sync. PR #77/#73/#75 **PAUSED — không merge/deploy**. Chỉ phát triển WebApp Firebase trên chuỗi **PR #71 → PR #72**, kiểm thử Firebase emulator và release gate trước GO. Giao diện Firebase không phụ thuộc Supabase. Không thêm nhánh/luồng chat nếu không cần thiết. Nhiệm vụ còn lại: hoàn thiện/QA quyền, khóa ô, server ACK/realtime, freeze, backup/restore, UI, hiệu năng và nghiệm thu Firebase. Nhân viên tiếp tục nhập tạm Excel/Sheet cho đến cutover được duyệt; không xây sync lâu dài.

---

## QUYẾT ĐỊNH ĐIỀU HÀNH MỚI NHẤT — 25/10/2026: CHỈ PHÁT TRIỂN FIREBASE-ONLY
**[Quyết định kiến trúc ưu tiên](decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md)**: nhân viên cập nhật Excel/Google Sheet chỉ trong thời gian chuyển tiếp; WebApp đích dùng **duy nhất Firebase RTDB `hdnd/items`** để xem/sửa/báo cáo. Sau cutover, không đọc/ghi nghiệp vụ từ Sheets và không có đồng bộ hai chiều. **DỪNG** chuỗi nhiệm vụ giám sát/chạy theo mirror 55 dòng vs ảnh cũ 57 dòng, mốc sửa Excel và quyền chia sẻ file Excel: đây chỉ là ghi nhận lịch sử, **không được coi là blocker phát triển**. Một lần kiểm tra dữ liệu khởi tạo sẽ được thực hiện **tại thời điểm cutover**, không phải trong vòng coding.

| Nhiệm vụ hiện hành | Trạng thái | Mục tiêu nghiệm thu |
| --- | --- | --- |
| HDND-FIREBASE-PRIMARY | **IN DEVELOPMENT — PR #71** | Firebase `hdnd/items` là nguồn duy nhất, không phụ thuộc Sheets/mirror khi đã kích hoạt; realtime hiển thị và save ACK |
| HDND-EXCLUSIVE-CELL | **IN DEVELOPMENT — PR #72** | Khóa theo ô + tab + UID, check quyền ở Rules, TTL, bản nháp và va chạm nhiều người |
| HDND-FREEZE-ADMIN | **IN DEVELOPMENT — PR #72** | Admin tạm dừng khách, DRAINING, FROZEN, hash receipt; Rules từ chối ghi đúng mốc |
| HDND-RESTORE-SECURITY | **NEXT / HOLD production only** | Kiểm backup & restore Emulator, rà live Rules vs staging candidate, test truy cập trái phép; không cần Excel |
| HDND-CUTOVER-IMPORT | **DEFER UNTIL RELEASE** | Tại thời điểm GO, chọn snapshot nhập cuối cùng, kiểm ID/fields, tránh mất dữ liệu và ghi đè; sau đó ngắt workflow Sheet |
| HDND-RELEASE | **NO-GO cho PRODUCTION hiện tại** | Quyết định GO sau 2–3 account staging và rollback, không chặn lập trình |

Các bảng 55/57, Drive file metadata và nguồn mirror ở **phần lịch sử bên dưới không còn là việc yêu cầu chạy tiếp**.

---

## 25/10/2026 — Checkpoint mới: đối chiếu Firebase live, Excel Drive và phân quyền nguồn
| Mã | Chủ trì / trạng thái | Chứng cứ và yêu cầu |
| --- | --- | --- |
| HDND-LIVE-MIRROR | Operator / **PASS đọc live, STALE dữ liệu** | 55 rows, 0 added/removed ID vs backup, `hdnd/items=0`, mirror vẫn `syncedAt 23/10/2026 04:41:44Z`; nguồn không cập nhật realtime sau đó. |
| HDND-EXCEL-CURRENT | Reviewer / **PARTIAL PASS** | Google Drive Office .xlsx `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp` sửa `25/10/2026 04:22:14Z`; phần tab dữ liệu trích xuất có 55 dòng STT số (07 kỳ chuyên đề + 48 kỳ thường lệ). Chưa so ID và field-level values với RTDB mirror. |
| HDND-DRIVE-PERMISSIONS | Chủ sở hữu file / **SECURITY REVIEW** | Metadata Drive cho file nguồn có `anyone:writer`. Xác minh việc mở sửa cho người có link là chủ đích; siết phân quyền nếu không cần, giữ quyền cấp cho đơn vị hợp lệ. Không đổi bằng tự động hóa. |
| HDND-RESTORE | Operator / **HOLD** | Khôi phục thử bản sao trên `demo-hdnd-restore` localhost, so full readback JSON SHA; không import vào production. |
| HDND-PARITY | Reviewer / **HOLD** | So tập 55 `recordId` cùng 15 cột A–O giữa file Excel đã chốt và mirror; xác minh lý do ảnh báo cáo 57 và mốc thời gian trước GO. |
| HDND-PROD-RELEASE | Admin / **NO-GO** | Không deploy Rules, không ghi `hdnd/items` hay chỉnh `dataSource` cho đến khi restore, parity, Rule diff, staging PASS. |

---

## 25/10/2026 — Đồng bộ nguồn mirror 55 dòng: metadata thời gian đã rõ, live chưa đối chiếu
| Mã | Trạng thái | Chứng cứ còn thiếu |
| --- | --- | --- |
| HDND-MIRROR-SCHEMA | **PARTIAL PASS** | schemaVersion=1, rows=55, sourceModifiedAt=23/10/2026 02:07:11Z, syncedAt=23/10/2026 04:41:44Z. Chưa có kết quả `Mirror metadata valid` và chưa chạy `validateExcelMirror` cho toàn bộ fields. |
| HDND-LIVE-RECONCILE | **NEXT / BLOCKING** | Bản backup chốt 55 hàng từ mirror 23/10, còn người dùng từng thấy báo cáo 57 hàng trong ảnh khác mốc. Phải `firebase database:get /` **read-only** lần mới để so live row count, live `syncedAt`, `hdnd/items` và ID set trước khi migrate. |
| HDND-RESTORE-DRILL | **HOLD** | Chưa có kết quả nạp backup vào demo RTDB Emulator và full readback SHA. |
| HDND-RULES-REVIEW | **HOLD** | Chưa xác nhận Rules Published/readback và diff candidate. |
| HDND-PRODUCTION-GO | **NO-GO** | Không nhập 55 row vào `hdnd/items` hoặc deploy Rules khi dữ liệu hiện tại chưa được đối chiếu. |

---

## 25/10/2026 — Nguồn mirror 55 hàng, cần xử lý chênh lệch với giao diện
| Mã | Kết quả | Blocker / bước tiếp |
| --- | --- | --- |
| HDND-MIRROR-INVENTORY | **PARTIAL PASS** | 1 spreadsheet source, 1 GID dataset, 55 rows, 0 duplicate IDs. Chưa có kết quả `Mirror metadata valid` True/False. |
| HDND-COUNT-RECONCILIATION | **BLOCKED / PRIORITY** | Ảnh báo cáo `Tiến độ xin ý kiến Thành ủy` từng hiển thị **57 nội dung**; mirror snapshot chứa **55 dòng tổng**. Phải xác minh cùng mốc, cùng nguồn, đúng bộ lọc; không chuyển thiếu 2 nội dung do snapshot cũ. |
| HDND-LOCAL-RESTORE | **TODO / HOLD** | Chạy `firebase-backup-emulator-restore.mjs` chỉ trên emulator demo; ghi số dòng và kiểm checksum đọc lại, không nhập production. |
| HDND-RELEASE | **NO-GO** | Ngoài sao lưu/Rules/staging, phải giải quyết count/ID reconciliation và giá trị metadata trước khi import. |

---

## 25/10/2026 — Kiểm kê offline trước khi thử restore
| Mã | Trạng thái | Bằng chứng |
| --- | --- | --- |
| HDND-SOURCE-INVENTORY | **PARTIAL PASS / WAIT MIRROR ROW COUNT** | Người vận hành báo `hdnd` tồn tại; `hdnd/items=0` (tại backup), `hdnd/mirrors=1` cấp gốc, `permissions/profile` tồn tại, `profile.dataSource` trống. Cần số tab/GID, schemaVersion, số hàng, ID trùng và metadata bản sao. |
| HDND-RESTORE-DRILL | **HOLD** | Chưa khôi phục JSON vào Emulator cách ly; không chạy import production. |
| HDND-RULES-DIFF | **HOLD** | Rules production file đã có hash, chưa readback chứng minh Published hay so với candidate. |
| HDND-PROD-SWITCH | **NO-GO** | Trước migrate phải đọc lại chính xác `hdnd/items` từ server, kiểm phương án transaction và Rules ghi tập dữ liệu, backup/restore và multi-user test. |

Các số liệu trên chỉ có từ lệnh PowerShell trên backup riêng tư (không phải kết nối Firebase trực tiếp của ChatGPT).

---

## 25/10/2026 — Checkpoint backup mới, cập nhật từ đầu ra PowerShell của người vận hành
| Mã | Status | Bằng chứng / điều kiện còn thiếu |
| --- | --- | --- |
| HDND-DATA-BACKUP | **USER-VERIFIED JSON PASS** | 2 file 56.185 bytes, cả hai parse JSON và cùng SHA `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Chưa tự đọc binary/restore. |
| HDND-RULES-BACKUP | **USER-VERIFIED JSON PASS** | `rules-live.json` 24.497 bytes, JSON có `rules`, SHA `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`. Cần người có quyền xác minh đây chính xác là Rules Published đang chạy, không chỉ nội dung trình soạn thảo. |
| HDND-RESTORE-DRILL | **TODO / HOLD** | Test nạp JSON trên Database Emulator/staging biệt lập; đối chiếu số dòng và dữ liệu, không ghi production. |
| HDND-RULES-DIFF | **TODO / HOLD** | Đối chiếu local Rules thật và `firebase/database.exclusive-candidate.rules.json`, xem chặn ghi/đường cha/quyền admin, chạy security tests. |
| HDND-PRODUCTION-GO | **NO-GO** | Chưa restore drill, chưa diff Rules và chưa phê duyệt. Giữ PR #71/#72 Draft. |

Chỉ ghi hash, size, trạng thái kiểm tra (không ghi bản sao JSON, UID, email, token, nội dung Rules production lên GitHub).

---

## 25/10/2026 — Kết quả sao lưu từ máy quản trị do người vận hành xác nhận
| Mã | Owner | Trạng thái mới | Chứng cứ / bước tiếp |
| --- | --- | --- | --- |
| HDND-BACKUP-READ | Người vận hành máy Firebase CLI | **PARTIAL PASS — 2 exports same SHA** | `database-1.json` và `database-2.json` cùng SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Đầu ra PowerShell do người dùng báo; chưa đọc JSON thực, chưa có Rules hoặc restore drill. |
| HDND-BACKUP-RULES | Quản trị Firebase | **TODO / HOLD** | Lưu chính xác Rules đang được Publish trên Firebase Console vào file riêng tư, kiểm JSON, tính SHA256. **Không nhấn Publish**, không lấy candidate GitHub giả làm Rules production. |
| HDND-BACKUP-RESTORE | Quản trị Firebase / reviewer | **TODO / HOLD** | Test đọc và phục hồi bản sao trên emulator hoặc staging riêng; không ghi vào production. |
| HDND-RELEASE | Quản trị Firebase | **NO-GO** | Sau khi backup Rules, restore drill và security diff/staging được chứng minh mới xem xét phát hành PR #71/#72. |

Chứng cứ ghi nhận từ ảnh/đầu ra PowerShell của người dùng, không phải quyền truy cập Firebase của ChatGPT. Giữ nguyên dữ liệu JSON và access token ở nơi riêng tư, không commit lên GitHub.

---

## Công việc đang chặn triển khai — 25/10/2026, sau khi chuẩn bị công cụ backup
| Mã | Owner | Trạng thái | Bằng chứng cần thu |
| --- | --- | --- | --- |
| HDND-BACKUP-READ | Quản trị Firebase | **BLOCKED: chưa cấp kết nối** | Export Rules đang chạy, JSON RTDB riêng tư, 2 lượt đọc có SHA khớp, `manifest.json`, thử đọc/khôi phục nơi khác |
| HDND-RULES-DIFF | Quản trị Firebase + reviewer | **HOLD** | Đối chiếu Rules thật theo từng đường ghi, đặc biệt admin/path cha với ứng viên #72 |
| HDND-STAGING-MULTIUSER | Reviewer + 2–3 tài khoản thật | **HOLD** | Test admin/khách, 2 tab UID, ghi realtime, race, draft, DRAINING/FROZEN sau backup |
| HDND-PROD-GO | Quản trị Firebase | **NO-GO** | Có phê duyệt cụ thể sau cả ba bước trên; mới được triển khai Rules và chuyển nguồn |

`scripts/firebase-production-readonly-backup.mjs` và [hướng dẫn vận hành](operations/FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md) **chỉ là công cụ chuẩn bị**; không đồng nghĩa đã chạy thật. Cập nhật bằng chứng SHA/file mật **ngoài** GitHub; chỉ ghi hash/biên bản không nhạy cảm trong WORKBOARD.

---

**Cập nhật kiểm thử HDND-FREEZE:** Quy tắc server đã bổ sung hạn cứng DRAINING: hết hạn thì máy chủ từ chối mọi commit, **không phụ thuộc tab admin**; tuy nhiên bước chuyển trạng thái sang FROZEN và lập biên nhận vẫn cần admin đăng nhập lại hoặc backend coordinator. [CI #40160812278](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40160812278) PASS ở SHA `8391041abc727835b7d7ff8f3b12750de950d776`. **Production HOLD/NO-GO**.


## Công việc vận hành đang mở — 25/10/2026
| Mã | Owner | Trạng thái | Đầu ra / blocker |
|---|---|---|---|
| HDND-DB-PRIMARY | Repo implementer + admin Firebase | **DRAFT / HOLD** | PR #71; cần backup Rules+DB, xác nhận đích rỗng, import một lần, readback và chuyển profile |
| HDND-CELL-LOCK | Repo implementer / reviewer độc lập | **DRAFT / TEST** | PR #72; hoàn thiện security Rules, thử 2 UID + 2 tab đồng UID, grant/revoke và popup/IME |
| HDND-FREEZE | Repo implementer + admin Firebase | **DRAFT / HOLD** | DRAINING, FROZEN, receipt; cần chứng minh không còn ghi sau freeze và cách xử lý khi admin đóng tab |
| HDND-RELEASE | Admin Firebase (quyết định production) | **NO-GO** | Đối chiếu Rules thật, sao lưu/khôi phục, nghiệm thu staging, ghi bằng chứng và rollback trước merge/deploy |

**Nguồn điều hành:** [Cổng phát hành](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md). Quy tắc: không ghi dữ liệu production khi chưa có hai bản sao lưu xác nhận và quyết định rõ ràng; mỗi báo cáo PASS phải kèm exact commit và CI. Lịch sử phân công cũ bên dưới được giữ để tra cứu.

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
