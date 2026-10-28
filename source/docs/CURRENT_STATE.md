## 28/10/2026 — ĐÃ CHỐT MỐC BÀN GIAO GEMINI UI (TÀI LIỆU, KHÔNG THAY NGHIỆP VỤ)

- **Nguồn bàn giao:** [GEMINI.md](../../GEMINI.md) và [GEMINI_UI_HANDOFF_2026-10-28.md](operations/GEMINI_UI_HANDOFF_2026-10-28.md). Snapshot code/UI trước commit docs: `c5cc9838c646af39d07b810233d6ea75065b7a25`; bản sau tài liệu theo nhánh `checkpoint/gemini-ui-handoff-2026-10-28`.
- UI V2 đã merge PR #84, hotfix PR #86 merge `faf649b0f8597c563e7fd378c42ad54cfcc99d4b`. Đã sửa chữ trong các ô, bỏ “Mẫu hiển thị cá nhân”, giữ 3 thẻ tiến độ, 6 cột/4 cụm, chế độ từng cột và đủ 15 cột gốc, cuộn dọc với header sticky. [Publish #40540518313](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540518313), [Pages #40540517515](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540517515), [QA #40540518324](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540518324) đều SUCCESS trên `faf649b`. Workflow Pages-generated checkpoint gần nhất trước bàn giao `c5cc983` cũng deploy SUCCESS [#40540678823](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40540678823).
- **Chỉ bàn giao giao diện cho Gemini**: sửa TypeScript/CSS trên nhánh mới, giữ logic báo cáo và 15 cột nguồn, security CAS/lease, không sửa Firebase production. Các PR #73/#75/#77 Supabase PAUSED. **PR #83 bảo mật khách chỉ đọc bảng admin đã công bố vẫn DRAFT/HOLD, chưa verify/publish Cloud.** Không nhầm việc ẩn dữ liệu bằng CSS là quyền đọc được bảo vệ.
- Không xác nhận đã commit các file chưa đẩy từ máy Windows người dùng: snapshot trên là **GitHub remote**, phải kiểm tra `git status` riêng trên từng máy nếu có thay đổi local.

---

## 27/10/2026 — UI DANH SÁCH CHI TIẾT V2 ĐÃ MERGE / GITHUB PAGES ĐÃ PHÁT HÀNH

- Đặc tả chính: [EXECUTIVE_DETAIL_UI_V2_2026-10-27.md](operations/EXECUTIVE_DETAIL_UI_V2_2026-10-27.md).
- Nhánh `feature/executive-detail-ui-20261027` xuất phát từ checkpoint `5db47f0` trước sửa UI, **PR #84 đã MERGE vào main (`fa5e8d9`) và GitHub Pages deploy SUCCESS #40533214193**. Hai thành phần mới: `ExecutiveProgressCards` (tái sử dụng số liệu và status grouping của Báo cáo tổng hợp) và `ExecutiveDetailTable` (6 ô theo 4 cụm, mã NQ01/BC01, viết tắt CV, phòng trong ngoặc; giữ tiến độ hiện tại và ghi chú riêng). Bố cục gọn mặc định nhưng còn chế độ từng cột/đầy đủ Excel.
- Thẻ báo cáo: Thành ủy có một ô Bước tiếp theo = 3 mốc giữa VP và TBKL; Xây dựng NQ có một ô Đã trình, chưa có QĐ; thanh màu đỏ → cam → xanh nhạt → xanh theo tiến độ. Exact head `88c3f38` đã đạt Verify source + Chrome + Firebase Emulator #40532768478 và Firebase operational QA #40532768475.
- **Bảo mật khách còn HOLD:** PR #83 DRAFT chưa merge; backend production chưa được xác minh chỉ cho khách đọc các bảng đã công bố và chặn raw items/mirrors/profile/permissions. Ẩn dữ liệu trong frontend không thay thế Firebase Rules. PR #84 không thay Firebase production, quyền sửa hay dataSource.

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

## CHECKPOINT UI GỘP CỘT — CI / BROWSER PASS (27/10/2026)

Bản **QA trực quan cuối đã được xem bằng ảnh desktop/mobile** và chạy tự động Chrome trên **component `ItemList` thật** với dữ liệu giả, không có kết nối Firebase thật; không liên quan trang Pages production. [Run #40380075664](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380075664) **SUCCESS**, ghi `COMPACT_REAL_ITEMLIST_DESKTOP_MOBILE_PASS` và `COMPACT_GROUPED_FIELD_EDIT_IN_MEMORY_PASS`: 8 cột hiển thị với 4 kiểu gộp, bốn dòng UBND–VP–Phòng–CV đúng nhãn; menu 9 lựa chọn trong 2 nhóm, hình học desktop 1600px + màn hẹp 390px đạt, thử chuyển lựa chọn cũ/mới rồi khôi phục không mất cột; test chỉnh một trường con giữ nguyên trường con khác. **Screenshot** trong artifact `hophdnd-browser-smoke-preview` (desktop, mobile, screenshot chung). [Firebase Emulator staging #40380075707](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380075707) **SUCCESS**.

Menu sau khi rà ảnh: **4 lựa chọn mới hiển thị ngay**, các gộp cũ và viết tắt tên thu vào hai nhóm tùy mở. Popup từ 560px xuống **379px** trên Chrome 1600px và 390px, giữ các thao tác và dữ liệu nguồn. Ảnh PNG desktop/mobile đã được tải và kiểm tra trực quan trong phiên ChatGPT; ghi nhận vẫn chưa phải kiểm chứng trực tiếp trên máy Windows của chủ dự án.

Kết quả này là **kiểm thử tự động Chrome trên Linux với dữ liệu mô phỏng**, chưa phải QA trực quan do người dùng xác nhận trên Windows, chưa phải Cloud multiuser E2E hoặc duyệt triển khai. Supabase PAUSED, không chỉnh cấu hình/dữ liệu, chỉ phát triển Firebase PR #72; frontend website chính và RTDB production nguyên trạng.

---

## UI: Thêm 4 tùy chọn gộp cột — 27/10/2026 (Firebase PR #72)

Đã sửa mã nguồn trên nhánh `feat/exclusive-cell-leases-admin-freeze-20261025`: **Loại VB + Sở vào Nội dung; Cấp + Tiến độ Thành ủy; Tiến độ trình HĐND xây dựng + ban hành; Lãnh đạo UBND + VP + Phòng + Chuyên viên**. Menu hiển thị chia nhóm `Gộp cột` / `Tên hiển thị`, giữ lựa chọn trước, tránh bật đè, không trộn các trường dữ liệu, nhãn rõ từng phần, tìm theo toàn bộ giá trị gốc và mỗi trường sửa theo quyền riêng. Bố cục Firebase lưu cũ được mở rộng bốn flag mới mặc định tắt. Đã bổ sung test và xử lý kéo cột theo độ rộng nguồn khi gộp. **CI PASS:** [source #40376214201](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40376214201), [Firebase emulator #40376214430](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40376214430). Đây là thay đổi UI; chưa kiểm tra trực quan tại máy Windows, chưa triển khai website chính, chưa ghi RTDB production. [Đặc tả](FEATURES.md) · [Theo dõi test/UI](WORKBOARD.md).

---

## KẾT QUẢ HOST LAN 27/10/2026 — ĐÃ KẾT NỐI LIÊN MÁY, QUAY LẠI UI

Người dùng xác nhận demo tại `localhost:8787` đã được máy thứ hai trong LAN cơ quan truy cập thành công (PASS **khả năng kết nối giữa hai máy**). Chưa đo đủ 60 phút/5 giây, chưa kiểm chứng độ trễ từ máy thứ hai và chưa chạy HopHDND thật trên host LAN; giao diện 5 dòng `DEMO-*` chỉ là dữ liệu giả. Không suy ra SLA 100%, khả năng chạy offline của Firebase, hoặc an toàn triển khai production. [Biên bản và cách tái sử dụng](operations/LAN_HOST_PILOT_2026-10-27.md).

**Ưu tiên từ đây:** tạm lưu phương án LAN, **quay lại hoàn thiện UI WebApp HopHDND trên Firebase-only PR #72**. Không lấy mã trên nhánh Supabase và chưa tự deploy. Skill `ui-ux-pro-max` người dùng đã cài trên máy Windows, chỉ dùng hỗ trợ thiết kế khi chạy Codex; cần kiểm tra hiệu quả thực tế bằng ảnh/chạy browser và hồi quy.

### Tiến độ UI Firebase PR #72 — 27/10/2026

Đã chỉnh `src/features/items/CellPicker.tsx`, `InlineNoteEditor.tsx` và `cell-picker.css` để hiển thị phản hồi khi chờ cấp quyền sửa ô qua Firebase; nút chọn có `aria-busy`, thông báo dùng `role=status`. Đây là thay đổi UX cấp ô, **không** đổi quyền, lease, hợp đồng ghi, bảng báo cáo hoặc nguồn dữ liệu. Kiểm thử CI tại thay đổi UI **PASS**: [Verify HopHDND source #40372289275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40372289275) và [Verify isolated Firebase staging #40372289221](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40372289221). Đây là hồi quy tự động, chưa thay cho đánh giá trực quan trên Windows; chưa deploy production. [Theo dõi UI trong WORKBOARD](WORKBOARD.md).


---

## TRẠNG THÁI QUYẾT ĐỊNH MỚI 26/10/2026 — FIREBASE-ONLY

[**Chỉ thị chính thức: Firebase-only, Supabase tạm dừng và giữ dự phòng**](decisions/FIREBASE_ONLY_SUPABASE_PAUSED_2026-10-26.md). Phát triển tiếp trên Firebase PR #71 và #72; không tiếp tục nhánh tích hợp Firebase+Supabase PR #77 hay các PR Supabase #73/#75, không tự merge/deploy/copy/sync. Supabase staging hiện là bản sao cố định 55 hồ sơ của nguồn Firebase mirror, **không phải dữ liệu luôn mới**. Firebase production/WebApp đang phục vụ người dùng chưa được thay đổi bằng quyết định này; vẫn cần các kiểm thử/backup/Rules và phê duyệt phát hành. Các đoạn tài liệu cũ nói phát triển đồng thời 2 backend chỉ còn giá trị lịch sử.

---

## TRẠNG THÁI/PHẠM VI MỚI NHẤT — 25/10/2026
**Nguồn chuẩn:** [Quyết định Firebase-only](decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md). Người dùng đã khẳng định Google Sheet/Excel chỉ là công cụ nhân viên sử dụng **tạm thời khi WebApp chưa hoàn thiện**; sau khi bàn giao, mọi thao tác nhập/xem/sửa và báo cáo phải thực hiện **duy nhất trên WebApp**, lưu Firebase RTDB `hdnd/items`. **Không xây workflow đồng bộ Google Sheet lâu dài**.

Hiện PR #71/#72 vẫn Draft; production chưa cutover. Công việc ưu tiên là cơ chế Firebase primary, khóa độc quyền từng ô, quyền, freeze/ACK, phục hồi và kiểm thử staging. **Ngừng coi 55 hàng snapshot Firebase 23/10 vs 57 hàng ảnh cũ hoặc thời gian sửa Sheet 25/10 là blocker hoàn thiện app**. Một lần đối chiếu dữ liệu khởi tạo cuối cùng được thực hiện **khi chuẩn bị phát hành**, không phải từng bước lúc phát triển.

Các kết quả kiểm kê mirror/Drive và cảnh báo lịch sử **bên dưới chỉ để lưu vết**, không chỉ đạo công việc kế tiếp. Không chỉnh sửa Google Sheet hay metadata/quyền chia sẻ bằng tự động hóa của dự án.

---

## 25/10/2026 — Đối chiếu live Firebase mirror với file Excel Drive đã kết nối
- **Firebase live (người vận hành đọc read-only):** 1 mirror source/1 dataset, 55 hàng, 0 ID thêm, 0 ID xóa so với backup, `hdnd/items=0`. `syncedAt=2026-10-23T04:41:44.104873Z`; `sourceModifiedAt=2026-10-23T02:07:11.387Z`; `schemaVersion=1`. Mirror **chưa có bản phát hành mới sau 23/10**.
- **Excel Drive nguồn được đọc trực tiếp, không ghi:** file ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, Office .xlsx, `modifiedTime=2026-10-25T04:22:14.272Z` (11:22 giờ VN). Nội dung tab theo dõi trích xuất có **55 dòng STT số**, chia nhóm 7 nội dung chuyên đề tháng 10 và 48 nội dung còn lại; đây là dấu hiệu số lượng **có thể vẫn khớp** mirror, nhưng chưa so từng `recordId` và 15 trường A–O. Việc file được sửa 25/10 không chứng minh nội dung nghiệp vụ nào đã đổi.
- **Rà soát an ninh Drive:** metadata connector báo file Excel nguồn có phân quyền kiểu `anyone / writer` (liên kết có thể sửa), `allowFileDiscovery=false`. Đây là **rủi ro an toàn nguồn**, cần chủ sở hữu xác minh và thu hẹp quyền phù hợp trước khi chốt bản nhập. Không thay quyền tự động vì có thể tác động công việc hiện tại.
- Số 57 trong một ảnh báo cáo cũ không đủ bằng chứng để kết luận thiếu hai hàng vì thời điểm và phạm vi tính có thể khác nhau. Cần đối chiếu danh sách ID, ngày sửa và quy tắc lọc trước GO.
- **Trạng thái:** `MIRROR_LIVE_STALE`, `DRIVE_EXCEL_55_ROWS_READONLY`, `PRIMARY_EMPTY_AT_LIVE_CHECK`, `IDENTITY_AND_CELL_PARITY_NOT_VERIFIED`. **NO-GO** cho import và Rules deployment production.

---

## 25/10/2026 — Xác nhận metadata của bản mirror 55 dòng (đầu ra người vận hành)
- Bản sao riêng tư `database-1.json` có **1 source / 1 dataset / 55 nội dung / 0 recordId trùng** như đã ghi.
- `schemaVersion=1`; `syncedAt=2026-10-23T04:41:44.104873Z` (**11:41:44 ngày 23/10 giờ Việt Nam**); `sourceModifiedAt=2026-10-23T02:07:11.387Z` (**09:07:11 ngày 23/10 giờ Việt Nam**); `rows=55`. Đây là bản mirror cập nhật **23/10**, không phải kết quả đọc live ngày 25/10.
- **Chưa được xác nhận:** `Mirror metadata valid` True/False (không xuất trong lời đáp), khớp cặp source/gid, SHA256 nguồn, từng trường trong 55 hàng, và bản live hiện hành. Không tự suy luận chênh lệch 57 (ảnh trước) vs 55 là lỗi mất dữ liệu; có thể do khác thời điểm/nguồn.
- **Giữ NO-GO** cho migration và Rules deploy; ưu tiên đọc live chỉ đọc để đối chiếu mốc `syncedAt`, `rows`, ID và đích `hdnd/items` trước khi chạy thử import.

---

## 25/10/2026 — Kiểm kê chi tiết mirror (bằng chứng PowerShell do người vận hành cung cấp)
- Trong bản sao riêng tư `database-1.json`: `Mirror sources=1`; `Mirror datasets=1`; `Total content rows=55`; `Duplicate record IDs=0`.
- Giá trị `Mirror metadata valid` **chưa có trong đầu ra** (người vận hành gửi đến dòng lệnh trước khi có kết quả True/False). **Chưa được khẳng định** schema/timestamps/SHA/source của mirror đáp ứng tiêu chuẩn chuyển đổi.
- **Rủi ro đối chiếu cần giải quyết:** ảnh giao diện trước đó thể hiện báo cáo `Tiến độ xin ý kiến Thành ủy (57 nội dung)`, nhưng bản sao chỉ có 55 bản ghi tổng. Có thể là khác mốc đồng bộ, khác nguồn dữ liệu hoặc sự không nhất quán. **Không chuyển 55 bản ghi lên Primary** trước khi chứng minh không thiếu nội dung; kiểm live mirror và nguồn mà giao diện sử dụng, so mã ID trên các nguồn.
- Bước tiếp: xác nhận metadata True/False, chạy restore test trên Emulator **cách ly**, và trước khi migration phải lấy lại bản sao live/mốc đồng bộ, đối chiếu số dòng, ID đầy đủ, quyền, sau đó mới ra quyết định.

---

## 25/10/2026 — Kiểm kê nhánh dữ liệu trên bản sao RTDB (bằng chứng PowerShell do người vận hành gửi)
- Bản sao `database-1.json` JSON hợp lệ: `hdnd` có dữ liệu; `hdnd/items` **0 bản ghi**; `hdnd/mirrors` **1 nguồn cấp cao nhất**; `hdnd/permissions` tồn tại; `hdnd/profile` tồn tại; `hdnd/profile.dataSource` không có giá trị hiển thị.
- **Lưu ý:** Con số 1 là số khóa trực tiếp dưới `hdnd/mirrors`, **chưa chắc** là số bản sao tab/GID; phải kiểm tra các khóa con và số hàng `rows`. `items=0` chỉ chứng minh tại thời điểm backup, không khẳng định Database hiện tại vẫn rỗng. Giá trị `dataSource` trống không được suy đoán là `primary`.
- **Chưa có quyền xem file nội bộ của người dùng**, chưa khôi phục emulator, chưa đối chiếu bản Rules Published. Không chuyển nguồn/ghi production. Bước kế: kiểm metadata mirror bằng script chỉ đọc (schema, số tab, tổng dòng, ID trùng, dấu thời gian) rồi thử restore cách ly, lấy lại trạng thái live ngay trước khi có quyết định migrate.

---

## 25/10/2026 — Bằng chứng người vận hành: hai bản DB + bản Rules JSON kiểm tra đạt (chưa GO)
- Người vận hành trên Windows đã xác nhận cả ba file trong thư mục riêng tư trên máy (không upload lên GitHub): `database-1.json` **56.185 bytes**, `database-2.json` **56.185 bytes**, `rules-live.json` **24.497 bytes**. Cả ba `ConvertFrom-Json` thành công; file Rules có thuộc tính `rules`.
- Hai bản Database SHA256 cùng bằng `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`.
- File Rules (người vận hành chép từ Firebase Console) SHA256 bằng `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`.
- **Phân loại chứng cứ:** `DATA_EXPORT_JSON_AND_MATCH=USER_REPORTED_PASS`; `RULES_FILE_JSON_AND_HASH=USER_REPORTED_PASS`. **Chưa** chứng minh file Rules thực sự khớp phiên bản Published tại thời điểm kiểm tra bằng readback độc lập. **Chưa** thử restore một bản backup lên môi trường cô lập hoặc chạy kiểm thử staging với hai tài khoản.
- **Quyết định:** giữ PR #71/#72 Draft, chưa deploy Rules, chưa chuyển `dataSource=primary`, chưa merge hoặc ghi dữ liệu production. Tiếp theo: xem metadata backup không tiết lộ nội dung, so Rules hiện hành và candidate ở máy riêng tư, restore drill trên emulator.

---

## 25/10/2026 — Người vận hành đã thực hiện hai lượt sao lưu READ-ONLY RTDB (chứng cứ do người dùng cung cấp)
- Firebase CLI của máy quản trị nhận đúng project `hophdnd-8b7b2`, instance `hophdnd-8b7b2-default-rtdb`.
- Người vận hành đã chạy thành công `firebase database:get /` hai lần, xuất ra hai JSON riêng tư và `Get-FileHash -Algorithm SHA256` cho ra **cùng một digest** `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`.
- **Phạm vi chứng cứ:** đầu ra PowerShell do người dùng cung cấp trong chat; trợ lý **không** có quyền đọc file gốc, chưa tự kiểm JSON, chưa xác minh Rules đang Published hoặc thử khôi phục. Không đánh dấu cổng sao lưu production là PASS hoàn chỉnh.
- **Việc cần thực hiện tiếp:** kiểm định hai JSON là bản sao đầy đủ, lưu riêng bản Rules hiện hành từ Firebase Console ở chế độ **CHỈ ĐỌC**, tính hash Rules, tạo thêm bản bảo quản và thử khôi phục có kiểm soát trên môi trường khác. PR #71/#72 vẫn Draft; **HOLD/NO-GO đối với Rules deploy, migration và writes production**.

---

## 25/10/2026 — Công cụ sao lưu Firebase chỉ đọc được chuẩn bị (CHƯA CHẠY THẬT)
- PR #72 bổ sung `source/scripts/firebase-production-readonly-backup.mjs`. Công cụ không chứa hành động ghi database; giới hạn cứng project `hophdnd-8b7b2` và instance `hophdnd-8b7b2-default-rtdb`, xuất hai lượt JSON so SHA-256, đối chiếu file Rules hiện hành do người quản trị tự lấy từ Console, và tạo manifest ở thư mục riêng tư ngoài GitHub.
- **Chưa có quyền Firebase quản trị trong phiên ChatGPT, chưa xuất được Rules/Database thật, chưa có SHA production, chưa thử khôi phục, chưa chấp thuận phát hành.** Không gọi là đã backup hoặc deploy.
- [Quy trình Windows](operations/FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md) và [cổng GO/NO-GO](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md). GitHub chỉ kiểm tra cú pháp và fail-closed sai project (KHÔNG đọc production).

---

**Kiểm thử bổ sung 25/10:** [CI #40160812278](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40160812278) **SUCCESS** tại exact code SHA `8391041abc727835b7d7ff8f3b12750de950d776`: gồm quyền xin khóa ô, hai tab cùng UID, quyền admin/tạm dừng khách, hard deadline DRAINING, chặn ghi sau deadline khi admin offline, Firebase Emulator và browser smoke giả lập. Đây là bằng chứng **mã staging**, không phải Firebase production. Rules và dữ liệu thật vẫn chưa được backup/đối chiếu/readback.


## 25/10/2026 — Phát triển Firebase chính và khóa ô (KHÔNG PHẢI production)
- **Production:** `main` vẫn `c85b16dd9b0ea3c02d2eae98d80985dc5d8de8f4` tại thời điểm lập biên bản. Dữ liệu chưa ghi realtime giữa tài khoản, nháp trình duyệt không là dữ liệu chính.
- **PR #71:** [database-primary](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) vẫn **Draft**; nhập mirror một lần rồi chuyển `dataSource=primary`, không phụ thuộc link Google Sheets sau đó.
- **PR #72:** [cell-leases/freeze](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) vẫn **Draft**, base là #71. Mã đã triển khai khóa ô per-field/per-tab, timeout, Firebase ACK, khôi phục nháp và OPEN/DRAINING/FROZEN cùng UI quản trị. Rules chuyên biệt **chỉ có trong source**, không ở production.
- **Bằng chứng từng có:** CI [#40159751225](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40159751225) PASS tại SHA `527229b9919117c4ef012ce2a84fe73726895455`. Các lần bổ sung phân quyền/tài liệu **phải có CI PASS ở SHA cuối** và thử nghiệm staging trước merge; không dùng run cũ chứng minh head mới.
- **Điểm chặn:** chưa có bản sao lưu có hash và phép thử khôi phục Database/Rules thật; chưa đối chiếu Rules production hiện tại; chưa có backend điều phối đóng băng khi tab admin đóng; chưa có nghiệm thu hai–ba phiên thật. **NO-GO** đối với chuyển nguồn/Rules/deploy production cho đến khi cổng phát hành đạt.
- Điều hành/bàn giao/rollback: [Cổng phát hành](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md) và [Quy trình thử nghiệm](operations/CELL_EDIT_FREEZE_EXECUTION_2026-10-25.md).

---

## 23/10/2026 — Cột cuối bù độ rộng, UBND trước VP, dữ liệu Tiến độ hiện tại và lịch sử 2 cột

- **ID** mặc định 68px (trước 100px); cấu hình ID còn ở độ rộng mặc định cũ đúng `100`px sẽ được đưa về 68px khi đọc; độ rộng ID đã chỉnh khác 100 vẫn giữ. ID chỉ là mã tối đa 4 ký tự trong trường hợp điển hình; các mã dài vẫn có tooltip.
- **Kéo cột:** chỉ thay độ rộng của cột đang kéo và **cột CUỐI đang hiển thị** theo tỷ lệ 1:1; tổng số px các cột không đổi. Các cột còn lại không đổi. Cột cuối làm nơi nhận/trả chênh lệch, vì thế **không có chốt kéo ở mép ngoài cột cuối**. Clamp mỗi cột 60–1600px; khi cột cuối đã chạm giới hạn thì cột đang kéo cũng dừng. Resize preview vẫn thao tác trực tiếp `<col>`, chỉ lưu một lần khi thả và vẫn dùng Firebase CAS/merge cho admin ở chế độ xem. `trailingWidthBounds` / `resizeWithLastColumn` cung cấp một logic được unit test cho cả sửa giao diện và xem admin.
- **Gộp cột:** `Gộp Lãnh đạo UBND và VP` có tiêu đề **“Lãnh đạo UBND / VP”**, hai dòng **UBND trên, VP dưới**, giữ nguyên hai dữ liệu gốc và chức vụ (PCVP, Q.CVP, PCT, PCTT). Bỏ tự cộng 75px/80px khi gộp lãnh đạo và Phòng/CV; loại bỏ `min-width:170px` ở ô lọc Phòng để các cột gộp thu bé được theo độ rộng 60px. Khi độ rộng quá nhỏ, chữ có thể wrap/truncate theo CSS nhưng không thay dữ liệu nguồn.
- **Loại văn bản HC:** suffix dạng `(HC)`, `(QPPL)` được giữ cả cụm không bẻ dòng; nút lịch sử của loại văn bản đã ẩn, tránh chen biểu tượng giữa dấu ngoặc và chữ như ảnh người dùng.
- **Excel:** cột N `Tiến độ hiện tại` (mapping `specificProgress:values[13]` từ trước) và cột O `Ghi chú` (mapping `note:values[14]` từ trước). Giữ 15 cột A–O, KHÔNG tự tạo cột mới. `Tiến độ hiện tại` chuyển từ kiểu select sang văn bản nhiều dòng như Ghi chú, sử dụng ContentEditor và bộ lọc tìm chữ; quyền sửa ở từng ô/Firebase, nguồn dữ liệu và giá trị không đổi.
- **Lịch sử hiển thị:** nút lịch sử **chỉ ở cột `note` và `specificProgress`** trong bảng chính và popup, không hiện ở ID, cột gộp hay các cột khác. Khi mở trường, hiển thị **toàn bộ các lần sửa thực của đúng trường** mới nhất trước (không chỉ một sự kiện gần nhất), mỗi dòng chỉ thời gian màu xanh và nội dung mới; không đánh số “Lần sửa N”. Giữ ba mốc Ghi chú minh họa có nhãn **DỮ LIỆU DEMO**, giờ/nội dung và thứ tự gần nhất trước, không tạo audit/ghi Firebase hoặc Excel.
- Không đổi quyền, polling, dropdown màu, các mốc backup V1/V2. CI và Chrome smoke phải PASS trước merge/Pages.

---

## 23/10/2026 — Kéo ngay ở đường kẻ dọc và chống nhảy scroll khi mở bộ lọc

- **Đổi độ rộng cột:** giữ bộ xử lý kéo theo pixel và lưu một lần khi thả đã có; **không có icon/tay nắm màu riêng**. Hit-zone trong suốt rộng 8px trùng chính đường viền giữa hai tiêu đề, khi hover chỉ nhấn nét của đường kẻ dọc. Admin Firebase dùng chế độ xem vẫn được kéo và lưu chung; khách không được sửa bố cục.
- **Gộp Phòng chuyên môn / Chuyên viên:** nhãn dropdown đổi thành `Chọn để lọc Phòng` và cả chọn Phòng/tìm tên CV đều 15px; hàng lọc cao hơn cho đủ hai dòng, không chồng lên các cột khác.
- **Giữ vị trí khi mở “Chọn để lọc”:** input/select trong sticky header chủ động nhận focus bằng `focus({preventScroll:true})` ở pointerdown và hoàn lại scrollTop/Left ngay sau focus nếu trình duyệt tự kéo về vị trí DOM thông thường. Đây là giữ vị trí **khi mở bộ lọc**; sau khi thực sự chọn điều kiện làm danh sách ngắn đi, trình duyệt vẫn có thể giới hạn scrollTop theo chiều cao kết quả còn lại. `overflow-anchor:none` và chiều cao viewport cố định từ trước không đổi.
- **Phân bổ độ rộng:** `ColumnResizeHandle` chỉ cập nhật `<col>` được kéo và tổng độ rộng bảng trong lúc rê, không chia phần chênh lệch sang cột khác và không cố ý dồn cột cuối. Sau lưu, bảng có `width:max(100%,tableWidth)` cùng `table-layout:fixed`; nếu tổng độ rộng các cột nhỏ hơn chiều rộng tối thiểu/vùng nhìn, phần dư được trình duyệt phân phối theo thuật toán bảng CSS, nên độ rộng thực hiển thị có thể khác số pixel từng cột. Không thay thuật toán phân phối ở PR này.
- Giữ nguyên Firebase merge/CAS, dữ liệu, phân quyền, bảng tổng hợp, popup, bộ màu/preset và backup V1/V2. Chrome smoke mở dropdown bằng CDP mouse sau khi cuộn sâu để xác minh không nhảy; CSS/unit kiểm đường kẻ và 15px.

---

## 23/10/2026 — Gộp Phòng/CV, kéo thả cột ngay ở trang xem cho admin, demo lịch sử Ghi chú

- **Bảng dữ liệu → Gộp cột:** thay cặp cũ `Sở chủ trì / Phòng chuyên môn` bằng `Phòng chuyên môn / Chuyên viên`, giữ cột Sở chủ trì độc lập. Cặp mới gộp **Phòng** (cột gốc `room`) và **CV** (cột gốc `specialist`) trên hai dòng; hàng bộ lọc có **hai dòng riêng:** `Lọc theo Phòng` (select), `Tìm kiếm tên CV` (search theo tên đầy đủ). Hai điều kiện lọc đồng thời; không sửa cột gốc hay dữ liệu. Tên CV ở dòng gộp tôn trọng tùy chọn viết tắt tên CV. Khóa cấu hình cá nhân đổi từ `departmentRoom` sang `roomSpecialist` để không tự bật hành vi mới cho người dùng đã lưu cặp cũ.
- **Admin xem Bảng dữ liệu:** khi ở giao diện chung không chọn mẫu cá nhân/không ép hiện đủ cột, admin Firebase đã kết nối kéo tiêu đề đổi vị trí hoặc kéo mép cột đổi độ rộng ngay chế độ **xem**. Chỉ commit **khi thả/ấn phím**, sử dụng `onPersistViewerLayout` và giao thức `saveItemLayoutConfig` / Firebase transaction `mergeItemLayout`, giữ nguyên cấu hình không liên quan và rollback nếu mất mạng/xung đột/quyền lỗi. Hiện trạng thái đang lưu/thành công/lỗi. Khách và tài khoản không có quyền admin không thấy tay nắm, không kéo cột; sort vẫn chỉ trong chế độ chỉnh sửa. Bộ lọc, màu và quyền sửa ô không đổi. Muốn kéo trong một mẫu xem cá nhân, quay lại giao diện chung trước để tránh vô tình đẩy mẫu cá nhân lên tất cả người dùng.
- **Ghi chú:** mở biểu tượng lịch sử ô Ghi chú để xem thêm **ba mốc ngày và giá trị demo** (18, 20, 22/10/2026), nhãn **DỮ LIỆU DEMO** rõ ràng; lịch sử thật (nếu có) vẫn tải riêng ở trên, demo không thêm vào kho audit, Excel, Google Sheets, Firebase hay thống kê. Mỗi ô Ghi chú có cùng ba tình huống minh họa, không giả lập là các lần sửa thực tế của hồ sơ đó.
- Test thêm cặp gộp, hai điều kiện lọc + DOM hai điều khiển, demo lịch sử, rollback và bảo vệ quyền quản trị qua CI/Chrome. Giữ nguyên màu V1/V2 backup và trạng thái đã chốt.

---

## 22/10/2026 — Bỏ nền vàng tô cả dòng đang sửa; chỉ viết tắt tên lãnh đạo

- Bỏ tô **nền vàng cả hàng** `tr.dirty-row` ở Bảng dữ liệu và bỏ sọc cam `tr.report-grid-row-dirty` của popup. Trạng thái nháp/dấu đếm nháp và cảnh báo lưu vẫn giữ, lịch sử ô, phân quyền, màu trạng thái theo nghiệp vụ và màu dòng người dùng thiết lập riêng không thay đổi. Không liên quan cập nhật dữ liệu, Excel, Firebase hay polling.
- **Gộp cột/viết tắt tên Lãnh đạo VP/UBND:** thêm `abbreviateLeaderName` để giữ đúng **chức vụ** `PCVP`, `Q.CVP`, `PCT`, `PCTT` (và `CVP`, `CT` khi xuất hiện), chỉ viết tắt họ và tên đệm. Ví dụ `PCVP Trịnh Nam Hưng → PCVP T.N.Hưng`, `Q.CVP Nguyễn Ngọc Hùng → Q.CVP N.N.Hùng`, `PCT Trần Văn Quân → PCT T.V.Quân`, `PCTT Phạm Minh Đức → PCTT P.M.Đức`. Không sửa tên gốc, lựa chọn dropdown hay tìm kiếm; cả cột độc lập và gộp cột dùng cùng logic. Tên chuyên viên giữ logic rút gọn hiện tại.
- Có test đơn vị với từng loại chức vụ và Chrome smoke ở bảng gộp/tách; CSS test ngăn nền vàng toàn hàng xuất hiện lại. Backup V1/V2 cùng bộ màu người dùng đã lưu giữ nguyên.

---

## 22/10/2026 — Bộ màu trạng thái có thể tùy chỉnh và lưu nhiều mẫu (PR #mới)

- Mục **🎨 Bộ màu trạng thái** trong thanh Bảng dữ liệu và (với người dùng đã đăng nhập) thanh công cụ popup. Có 4 nhóm: **Sở chưa trình, Văn phòng đang thực hiện, Hoàn thành và tương đương, Trạng thái khác**; mỗi nhóm độc lập **màu chữ + màu nền** bằng color picker và mã HEX `#RRGGBB`. Bảng chính/popup nhận cùng cấu hình qua app shell; màu thay đổi ngay mà không làm mới dữ liệu.
- Mặc định giữ nguyên V5 (chữ `#D00025/#B04700/#007A18`, nền `#FFE0E4/#FFE8B8/#D5F0DE`, nét 600). **Trạng thái khác mặc định không tô**, có checkbox riêng; bật mới tạo pill/định dạng trong 4 trường tiến độ, không áp dụng tràn sang các cột khác. Danh sách trạng thái tương đương theo chính `progressTone` cũ; không thay logic thống kê, không ghi thay giá trị.
- Có **Lưu bộ mới (tên tùy chọn), chọn bộ có tên, cập nhật bộ đã chọn, xác nhận xóa**, khôi phục màu mặc định. Tối đa 20 bộ, tên tối đa 60 ký tự, kiểm tra trùng tên/mã, màu HEX hợp lệ. **Tự lưu cấu hình đang xem trên localStorage theo nguồn và preview scope**; bộ màu đặt tên vẫn giữ độc lập khi đổi màu đang dùng. Lưu cá nhân trên **cùng trình duyệt**, không đồng bộ thiết bị và không ghi Firebase/Excel. Nếu localStorage lỗi thông báo, không tuyên bố đã lưu.
- Popup của khách vẫn ẩn công cụ quản trị, tùy chọn này không cấp quyền sửa ô. Dữ liệu, quyền, polling 60s không thay đổi. Có unit validator/CRUD và Chrome smoke bắt buộc kiểm màu trong danh sách + popup. **Hai nhánh backup V1/V2 không được sửa**.

---

## 22/10/2026 — V5 thử màu chữ rực và tươi rõ hơn (không đổi nền)

- Theo phản hồi “vẫn vậy, cho các màu tươi thêm chút nữa”, V5 chuyển **chỉ màu chữ** nhãn trạng thái trên Bảng dữ liệu + popup từ V4 sang sắc độ bão hòa rõ hơn: **Sở chưa trình** đỏ `#C52445 → #D00025`; **VP đang thực hiện** cam `#A15700 → #B04700`; **Hoàn thành và tương đương** từ xanh ngọc `#00794A → #007A18` (xanh lá thuần rõ hơn). Trọng lượng vẫn **600**.
- **Giữ nguyên nền** hồng `#FFE0E4`, vàng `#FFE8B8`, xanh `#D5F0DE` đúng Bảng tổng hợp; giữ viền, chấm, mũi tên dropdown, icon lịch sử, quyền, dữ liệu, KPI, polling 60 giây. Chỉ thay `--workflow-text`; `--workflow-fg` cho chấm/viền không đổi.
- Độ tương phản của V5 lần lượt khoảng **4,59:1 / 4,67:1 / 4,57:1**, đạt 4,5:1 trên nền hiện hành. Unit + Chrome smoke trên giả lập kiểm màu thực của cả pill chỉ đọc và dropdown có quyền sửa trong bảng chính/popup. **V5 chưa là mốc nghiệm thu/sao lưu**; backup V1 `backup/ui-colored-status-pill-approved-2026-10-22` và V2 `backup/ui-vivid-status-ink-weight600-2026-10-22` giữ nguyên.
- Kết quả PR CI / Pages phải kiểm theo đúng SHA sau khi chạy, không mặc định đã PASS.

---

## 22/10/2026 — V4 THỬ MÀU CHỮ SÁNG/TƯƠI HƠN V3

- Thử tăng rõ độ tươi của **chữ trạng thái** trong **Bảng dữ liệu và popup**, không đổi nền: `Sở chưa trình` từ `#BA2E42` sang **`#C52445`** (đỏ tươi hơn); `VP đang thực hiện` từ `#935300` sang **`#A15700`** (cam sáng hơn); `Hoàn thành`/tương đương từ `#08784E` sang **`#00794A`** (xanh lá thuần và tươi hơn một chút). Chữ giữ font-weight **600**. Màu xanh bị giới hạn độ sáng vì nền xanh `#D5F0DE` và yêu cầu tương phản chữ tối thiểu **4,5:1**.
- Nền nghiệp vụ V1–V3 **giữ nguyên**: hồng `#FFE0E4`, vàng `#FFE8B8`, xanh `#D5F0DE`; viền, chấm trạng thái, popup/dropdown, hiển thị icon lịch sử, KPI, phân quyền và đồng bộ 60 giây cũng giữ nguyên. Kiểm Chrome trên cả pill chỉ đọc và dropdown quyền sửa.
- **Chỉ là thử nghiệm V4, chưa được người dùng chốt lưu riêng.** Backup V1 `backup/ui-colored-status-pill-approved-2026-10-22` và V2 `backup/ui-vivid-status-ink-weight600-2026-10-22` phải giữ bất biến. CI và Pages cần xác minh PASS trước khi phát hành.

---

## 22/10/2026 — V3 THỬ MÀU CHỮ TƯƠI/SÁNG HƠN V2 (chưa chốt làm mốc backup)

- Thử thay **chỉ màu chữ** trong ba tone nghiệp vụ Bảng dữ liệu + popup: đỏ `#B2263D → #BA2E42`, cam `#875000 → #935300`, xanh `#27774B → #08784E` (xanh tăng độ tươi/sắc xanh, giới hạn độ sáng để duy trì tương phản tối thiểu 4,5:1). Chữ giữ **font-weight 600**.
- **Bất biến:** nền hồng `#FFE0E4` / vàng `#FFE8B8` / xanh `#D5F0DE`; viền, chấm, mũi tên dropdown, icon lịch sử mờ, phân quyền và cơ chế cập nhật dữ liệu 60 giây đều giữ nguyên. Bảng tổng hợp không thay đổi.
- **Đây là phiên bản thử V3**, không ghi đè hai mốc V1 và V2: `backup/ui-colored-status-pill-approved-2026-10-22` và `backup/ui-vivid-status-ink-weight600-2026-10-22`. Kiểm TypeScript/unit/Chrome và xem thực tế trên Pages trước khi người dùng quyết định giữ V3 hay quay lại V2.

---

## Phiên bản bộ màu V2 đã lưu riêng — 22/10/2026

- **Tên:** **HopHDND — Màu chữ tươi, nét mảnh 600 — V2**. Mốc code + HTML đã phát hành: [`d6e4b447e25ede00683cdea7689af40a781c1ea8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/d6e4b447e25ede00683cdea7689af40a781c1ea8). Backup độc lập: [`backup/ui-vivid-status-ink-weight600-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-vivid-status-ink-weight600-2026-10-22); nhánh backup V1 `backup/ui-colored-status-pill-approved-2026-10-22` vẫn giữ nguyên.
- Màu chữ V2: **Sở chưa trình `#B2263D` (đỏ tươi hơn), VP đang thực hiện `#875000` (cam tươi hơn), Hoàn thành/tương đương `#27774B` (xanh dịu hơn), chữ `font-weight:600`**. Chỉ đổi màu chữ và độ đậm; nền/viền/chấm và dropdown/history giữ nguyên, Bảng dữ liệu + popup cùng cách trình bày.
- Bằng chứng [CI #39784818033](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39784818033), [Publisher #39785115951](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39785115951), [Pages #39785243101](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39785243101) đều **SUCCESS**. Cách restore **chỉ màu V2** (không ghi đè toàn bộ mã), đối chiếu V1/V2 và các bất biến: xem đầu [VAN_HANH.md](VAN_HANH.md).
- Đây là mốc riêng khi người dùng nói “khôi phục màu chữ tươi, nét mảnh 600”; nếu nói “khôi phục màu bản có nền như ảnh trước khi chỉnh chữ” thì dùng mốc **V1** `6c151458561b7800af51bab64837430e147fdcef`. Không được nhầm.

---

## 22/10/2026 — Thử màu chữ tiến độ tươi hơn và mảnh hơn (PR tiếp theo)

- Theo yêu cầu thử tinh chỉnh **chỉ màu chữ** trong **Bảng dữ liệu + popup**: đỏ `Sở chưa trình` từ `#7F1D30` → `#B2263D`; vàng cam `VP đang thực hiện` từ `#704500` → `#875000`; xanh `Hoàn thành` và tương đương từ `#2B7450` → `#27774B` (nhạt thêm rất ít). Toàn bộ nhãn tiến độ dùng font-weight `600` thay cho 750/650, bao gồm chế độ xem lẫn ô được quyền chọn.
- **Không đổi bất kỳ nền, viền hay chấm trạng thái**: nguồn hồng `#FFE0E4`, VP vàng `#FFE8B8`, hoàn thành xanh `#D5F0DE`. Màu chữ được tách thành `--workflow-text`, giữ `--workflow-fg` hiện tại cho chấm/hover. Các điều khiển được quyền sửa ngoài trạng thái, biểu tượng lịch sử, dropdown, phân quyền, KPI, cập nhật nền 60s đều không thay đổi. Độ tương phản mỗi nhóm màu chữ đạt WCAG AA (>=4,5:1) trên nền cũ.
- **Mốc khôi phục đã chốt vẫn bất biến**: `6c151458561b7800af51bab64837430e147fdcef` / `backup/ui-colored-status-pill-approved-2026-10-22`. Đây là biến thể **thử nghiệm tiếp theo**, không ghi đè backup. Chrome smoke và unit kiểm computed color/font-weight của các dropdown trên Bảng dữ liệu & popup; kết quả CI/Pages ghi theo thực tế.

---

## Mốc phiên bản khôi phục cố định — 22/10/2026 (giao diện có nền màu như ảnh)

- **Tên:** `HopHDND UI — Colored Status Pill — 22/10/2026`. **Commit phát hành:** [`6c151458561b7800af51bab64837430e147fdcef`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/6c151458561b7800af51bab64837430e147fdcef). **Nhánh backup:** [`backup/ui-colored-status-pill-approved-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-colored-status-pill-approved-2026-10-22).
- Bản này là PR #15 đã merge, [Verify #39778929334](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39778929334) / [Publisher #39779152810](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39779152810) / [Pages #39779299040](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39779299040) **PASS**. Bao gồm đúng nút dropdown trạng thái có nền hồng/vàng/xanh khi được quyền sửa trong danh sách/popup, icon lịch sử mờ mặc định, chữ completed `#2B7450`. Không tái áp dụng PR #13.
- **Quy trình khôi phục chi tiết, phạm vi mã/dữ liệu, câu lệnh Git và cách kiểm artifact:** xem đầu [VAN_HANH.md](VAN_HANH.md). Không tự sửa nguồn Excel/Firebase hoặc reset main để rollback giao diện. Nhánh backup được tạo từ **exact commit**, không theo `main` di động.

---

## 22/10/2026 — Khóa hồi quy theo ảnh: dropdown trạng thái có nền màu (PR mới)

- Ảnh người dùng xác nhận: **trong chế độ được quyền sửa**, ô chọn `Sở chưa trình` phải là pill **hồng `#FFE0E4`**, chữ `#7F1D30`, viền `#E7A1AD`; `VP đang thực hiện` dùng vàng `#FFE8B8`, `Hoàn thành` dùng xanh `#D5F0DE` và chữ `#2B7450`. Nền màu phải giữ khi hover/focus; danh sách/popup giống nhau.
- Không tái áp dụng **PR #13** (nền dropdown trắng, chấm bổ sung, ẩn nút history, chuyển chữ completed thành `#307651`). **PR #14 đã khôi phục đúng source của PR #12**; bổ sung selector CSS khóa trường hợp bị generic edit style ghi đè và Chrome smoke kiểm màu **nút chọn đang sửa thật** bằng giả lập DOM trong cả bảng chính và popup; trước đây smoke chỉ kiểm pill chỉ đọc.
- Giữ icon history mặc định như phiên bản cũ (`opacity:.42`), không tác động polling 60 giây, dữ liệu Sheets/Excel, quyền hay KPI. Kết quả CI/Pages cần ghi theo thực tế trước khi nghiệm thu.

---

## 22/10/2026 — Tinh chỉnh độ nổi của chữ hoàn thành và ô có quyền sửa (PR mới)

- Theo phản hồi giao diện: chữ **Hoàn thành** và mọi trạng thái tương đương trong **Bảng dữ liệu/popup** chuyển từ xanh sẫm `#125B35` sang xanh vừa `#2B7450`, trọng lượng chữ `650`; nền `#D5F0DE`, viền `#91CFA8` và chấm xanh sẫm vẫn giữ. Tương phản chữ/nền đạt ít nhất 4,5:1; màu báo cáo tổng hợp **không đổi**.
- Các giá trị thường **được quyền sửa** (không thuộc ba tone nghiệp vụ) dùng nền xanh xám rất nhẹ `#F2F6F9`, chữ `#426274`, viền `#B7CBD6` và độ đậm 550, có hover/focus nhẹ. Giá trị **chỉ đọc** vẫn là chữ thường, không tự sinh nút sửa. Thứ tự ưu tiên: đỏ Sở chưa trình / vàng VP đang thực hiện / xanh hoàn thành dễ nhận biết hơn ô sửa thông thường; màu từ khóa theo ô và phân loại nghiệp vụ không thay đổi.
- CSS, unit đối chiếu độ tương phản và Chrome smoke kiểm computed style của nhãn hoàn thành/các nút sửa. Chỉ sửa giao diện; không thay dữ liệu Excel, quyền Firebase, KPI hay đồng bộ 60 giây. **Chưa coi phát hành thành công trước khi PR CI và Pages đều PASS.**

---

## 22/10/2026 — Đồng nhất xanh hoàn thành Bảng dữ liệu với Bảng tổng hợp (PR #11)

- Theo yêu cầu mới: thay màu xanh đậm hoàn thành (`#126442` chữ trắng) ở **Bảng dữ liệu và popup** bằng đúng màu Bảng tổng hợp `#D5F0DE`, chữ `#125B35`, viền `#91CFA8`. Chấm trạng thái cũng `#125B35`. Cả `Hoàn thành`, `Đã có TBKL`, `Không phải xin ý kiến`, `Không phải trình`, `Đã có QĐ chấp thuận`, `Đã trình HĐND thành phố` đang thuộc tone `done` theo đúng cột nhận cùng UI xanh nhạt; phân loại / tổng hợp / dữ liệu không đổi.
- Bỏ sắc xanh đặc bất nhất trước đó; vẫn nhận biết trạng thái hoàn thành bằng nhãn có viền và chấm cùng màu, chữ tương phản, không phủ cả nền ô. Giữ nguyên màu `Sở chưa trình`, `VP đang thực hiện`, những trạng thái trung gian và màu tô từ khóa tùy chỉnh.
- Không thay đồng bộ nền 60 giây, kích thước bộ lọc hay Firebase Rules. Unit CSS kiểm màu y hệt report và độ tương phản; Chrome smoke kiểm màu computed. CI/Pages cần PASS trước khi xác nhận phát hành.

---

## 22/10/2026 — Ổn định đồng bộ 60 giây; màu tiến độ thống nhất Bảng tổng hợp (PR #10)

- [PR #10](https://github.com/cavoixanh638/HopHDND-WebApp/pull/10), nhánh `fix/polling-stable-consistent-status-2026-10-22`: lỗi bảng tạm mất khi poll liên quan `useWorkspace` tái khởi tạo theo closure `refresh` và việc ghi `setItems(rows)` ngay cả khi dữ liệu không đổi. Sửa: khởi tạo/reset **chỉ khi repository hoặc sourceKey đổi**; poll 60s đọc ngầm (không `setBusy`/màn chờ), fingerprint JSON của bản đọc để **không thay array state** khi các dòng y hệt, chỉ commit sau khi nguồn trả hoàn chỉnh và thực sự đổi. Không cấm nhập nháp trong lúc đọc ngầm; nếu phát sinh nháp giữa chừng thì bỏ áp dụng bản poll; có nháp từ trước thì tự bỏ lượt poll im lặng. Hiệu ứng subscribe/timer không tái gắn do dataSource đổi; tránh giật/nháy màn hình. Thời điểm `loadedAt` chỉ thay đổi nếu nguồn thực sự đổi.
- `useSharedConfig` giữ nguyên object config khi refresh trả giống hiện tại; lúc có bản đã xác nhận thì sự cố đọc lại chỉ cảnh báo, không thay bằng trạng thái chờ. `App` chỉ hiển thị màn chờ tải layout nếu chưa có cấu hình nguồn hợp lệ; vẫn khóa lần đầu thiếu cấu hình và không cho phép ghi vượt quyền. Không tự áp layout mặc định khi Firebase lỗi.
- Đối chiếu trực tiếp `source/src/styles/app.css`: Bảng tổng hợp dùng source `#FFE0E4` đỏ hồng (không phải vàng), office `#FFE8B8` vàng cam (không phải xanh), completed `#D5F0DE` xanh nhạt. Bảng dữ liệu/popup dùng đúng màu source/office; trạng thái hoàn thành dùng **xanh lá đậm `#126442` chữ trắng** để phân biệt nền mint đang dùng cho ô chỉnh sửa. Chỉ tô nhãn các trạng thái chính xác (`progress-visual.ts`), các bước khác để nguyên không tạo dấu mốc giả.
- Kết thúc tương đương theo đúng cột: `progressParty` nhận `Không phải xin ý kiến`/`Đã có TBKL`; `progressBuild` nhận `Không phải trình`/`Không phải trình xây dựng NQ`/`Đã có QĐ chấp thuận`; `progressCouncil` nhận terminal `Đã trình HĐND thành phố` theo Bảng tổng hợp Council. Không thay phân loại/đếm tổng hợp, trạng thái nguồn hay dữ liệu Excel. Lưu ý **Báo cáo tổng hợp** vẫn làm nhạt riêng cột `Không phải trình` theo thiết kế báo cáo; yêu cầu gắn nhãn như hoàn thành chỉ ở Danh sách dữ liệu/popup.
- Chữ ô lọc **15 px** (tăng từ 13), cao 36px. Nền tiêu đề Bảng dữ liệu/popup nhạt `#f6f9f7`, hàng lọc `#fbfdfc`; vẫn giữ phân tách các cột. Các thông báo nguồn hoặc phiên bản không bị xóa.
- Kiểm thử mới: unit cho phân loại đúng theo từng cột, browser Chrome cho CSS báo cáo/nhãn; test `pages-sheets` giả lập hai lần 60s giống và khác nguồn, kiểm tra **cùng tham chiếu rows và không busy** khi request đang chạy, kiểm màn chờ chỉ ở lần đầu chưa có layout. Không ghi Google Sheets/Firebase thật. Chỉ merge sau CI cuối PASS và xác nhận build + deploy Pages.

---

## 22/10/2026 — Viết tắt lãnh đạo và nhãn tiến độ, bộ lọc rõ chữ (PR #9)

- PR #9 / nhánh `feat/leader-shortnames-status-visual-2026-10-22`: thêm cờ cá nhân `shortLeaders` trong menu `Gộp cột`. Áp dụng đồng thời cho `vpLeader` và `ubndLeader` khi hai cột đang tách hoặc gộp; giá trị gốc, tên trong dropdown, tìm kiếm họ tên đầy đủ và phân quyền theo trường giữ nguyên. Các bản lưu localStorage `v1` thiếu cờ được nạp mặc định tắt; không sửa layout Firebase/Excel.
- Bảng dữ liệu và popup báo cáo dùng `progressTone` chỉ cho bốn cột tiến độ, đúng chuỗi sau chuẩn hóa dấu/hoa: `Sở chưa trình` (hổ phách), `VP đang thực hiện / Đang ở Văn phòng / Văn phòng đang thực hiện` (xanh lam), `Hoàn thành / Đã hoàn thành` (xanh lục). Ô chỉ đọc có pill và chấm nhận diện; nút chọn/ô nhập được phép sửa nhận đúng tông nhưng không tô nền cả ô. **Không** biến `Đã trình HĐND thành phố`, `Đã có TBKL` hay `Đã trình HĐND, chưa có QĐ` thành hoàn thành. Không đổi KPI, reporting pipeline hoặc status dữ liệu.
- Nền tiêu đề Bảng dữ liệu và popup từ xanh xám đậm sang `#edf4ef`; hàng lọc `#f9fcfa`. Font `Tìm kiếm`/`Chọn để lọc` tăng lên 13px ở cả hai bảng, chiều cao control 34px; giữ nguyên Esc xóa lọc.
- CI [#39641851995](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39641851995) PASS gồm TypeScript, unit test strict status + leader, Firebase emulator, Chrome với 5 options, lọc bằng họ tên đầy đủ, nền và cỡ font. Sau docs cần CI cuối PASS rồi mới merge và kiểm tra Build/Pages. Không ghi Sheets production hoặc Firebase Rules.

---

## 21/10/2026 — Chế độ hiển thị gọn riêng cho Bảng dữ liệu (PR #8)

- PR #8, nhánh `feat/compact-columns-personal-2026-10-21`. Mỗi người dùng có menu **Gộp cột** trong Bảng dữ liệu với 4 lựa chọn độc lập, **mặc định tắt**, lưu localStorage theo source scope (`hdnd.compact-display.v1:<scope>`): (1) đặt Loại VB trong ngoặc sau Nội dung trình, (2) gộp Lãnh đạo VP / Lãnh đạo UBND TP trong hai dòng có nhãn, (3) gộp Sở chủ trì / Phòng chuyên môn trong hai dòng có nhãn, (4) viết tắt tên chuyên viên `Nguyễn Ngọc Hùng → N.N.Hùng`.
- 15 khóa cột A–O, giá trị Excel, cấu hình layout Firebase, báo cáo và phân quyền từng trường giữ nguyên. Projection chỉ ẩn cột thứ hai **khi cả hai nguồn đang hiển thị**; nếu cột nguồn chưa hiện thì không tự kéo dữ liệu bị ẩn ra. Hai nhóm chính và tên chuyên viên vẫn tìm kiếm bằng **tên đầy đủ**, kể cả khi hiển thị đã rút gọn. Dropdown editor dùng giá trị đầy đủ; mỗi trường của ô gộp có quyền sửa riêng và lịch sử riêng.
- Chế độ quản trị cấu hình luôn giữ cột nguồn tách biệt; mở **Hiện đủ cột Excel** tạm tắt projection để kiểm chứng 15 cột, trở về sẽ áp dụng lại tùy chọn cá nhân. Menu không đồng bộ sang popup (popup có bộ cấu hình riêng).
- Lưới dọc Bảng dữ liệu gồm header, filter, body chuyển từ `#cbdad1` xuống `#dfe9e2`, giữ 1px và không mất ranh giới. Bộ lọc được lập kế hoạch 1 lần trong useMemo, không tạo event handler trên mỗi lần rê chuột.
- Kiểm thử đơn vị `source/tests/compact-columns.test.ts` và Chrome smoke bật 4 tùy chọn/kiểm chữ gộp/tên đầy đủ/xóa tùy chọn, ngoài TS/Firebase emulator. CI gần nhất trước tài liệu [#39636999622](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39636999622) PASS; cần PASS cuối trước merge. Không sửa dữ liệu nguồn hoặc Firebase Rules.

---

## 20/10/2026 — Thẻ điều hướng nhỏ, nhãn Excel chuẩn, lọc Esc, editor nổi bật (PR #7)

- Nguồn đã kiểm **trực tiếp** qua Google Drive: `Tổng hợp các ND kỳ chuyên đề và kỳ thường lệ cuối năm 2026.xlsx`, ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, cập nhật ngày 20/10. Cột E chính xác **Loại VB**, không kèm `(HC/QPPL/BC)`. Đổi `TEXT_FIELDS`, `EXCEL_SOURCE_COLUMNS`, test và từ điển dữ liệu. `validateItemLayout` chỉ sửa nhãn cũ chính xác khi nạp cấu hình, giữ nhãn do người dùng đặt khác.
- Hai thẻ Báo cáo tổng hợp / Danh sách các ND trình HĐND rộng tổng tối đa 820px, căn giữa; tông xanh lam/xanh ngọc phân biệt hai khu vực, card active nền đậm tương phản, inactive nền sáng, focus rõ, mobile xếp dọc. Không thay routing `overview/items`.
- Ô lọc dạng chọn hiển thị `Chọn để lọc` xám nhạt như placeholder input, khi có bộ lọc màu chữ đậm; bấm **Escape** khi select/input còn được focus để xóa đúng lọc của cột. `ColumnFilterCell` dùng chung cho Danh sách và popup. Chỉ xử lý khi có giá trị, không tác động phím Esc của popup nếu không có lọc.
- Thay dấu hiệu editable: viền 1.5px màu xanh ngọc vừa + nền xanh nhạt **chỉ trên điều khiển thực được cấp quyền sửa** (CellPicker, nút Nội dung/Ghi chú, input), hover tăng phản hồi và focus có outline rõ; dấu bút nhỏ với nút text. Không tô toàn bộ nền ô, không làm mất màu tiến độ hoặc conditional highlight; guest read-only không hiển thị editor. Không gắn thêm listeners khi hover ô.
- CI xác minh nguồn trước ghi tài liệu [#39446224592](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39446224592) PASS (TS, unit, Firebase emulator, Chrome). Bản sau docs/test cần CI cuối PASS trước merge. Chưa thử dữ liệu người dùng trên Windows, không ghi Firebase/Excel nguồn.

---


## 20/10/2026 — Hai khối điều hướng chính và tối giản giao diện (PR #6)

- Người dùng đã yêu cầu tiếp tục ghi thẳng GitHub thay vì bản HTML thử. Nhánh `fix/two-main-sections-compact-chrome-2026-10-20` / PR #6. Giữ quy trình backup → PR → Verify → merge → Pages.
- Hai mục dữ liệu cấp cao trở thành **hai card điều hướng lớn**: `Báo cáo tổng hợp` và `Danh sách các ND trình HĐND`, có biểu tượng, mô tả ngắn, trạng thái active/hover/focus rõ và tự xếp dọc ở điện thoại. Hai card hiển thị đồng nhất cho khách, người sửa, admin; vẫn khóa chuyển trang khi đang ở mode cấu hình như trước. Không thay dữ liệu hoặc phép tính.
- Giảm chrome: bỏ logo `HĐ`/tên giới thiệu, phụ đề thương hiệu, nút làm mới/sửa thử đầu trang, toàn bộ banner Google Sheets/tự cập nhật, cùng tiêu đề phụ `TỔNG HỢP NỘI DUNG TRÌNH / Theo dõi tiến độ` ở hai màn chính. Bỏ **chỉ** cảnh báo toàn trang `Có X nội dung chưa phân loại NQ/BC` ở báo cáo (không đổi thống kê/giá trị; giữ cảnh báo trong từng bảng về trạng thái chưa chuẩn hóa). **Số phiên bản vẫn hiện cả khi khách**. Giữ nút Đăng nhập hoặc menu Cài đặt trên hàng tiện ích thu gọn.
- Giữ tự đọc nguồn Sheets mỗi 60 giây khi trang hoạt động; nút `Làm mới dữ liệu` chuyển vào trang Tài khoản/Nguồn, `GID` và khôi phục nguồn được đặt trong phần `Thông tin và khôi phục nguồn` có thể mở; không xóa chức năng thật. Quyền sửa ô/khách không thay, bộ lọc và popup giữ nguyên.
- Kiểm thử các vòng cho đến lúc đạt: [#39440476395](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39440476395) PASS (TypeScript, unit, Firebase emulator, Chrome smoke). Chrome bỏ kiểm tra nhầm `unknown-note` thuộc một bảng báo cáo, vẫn chặn cảnh báo `main > .unknown-note` mà người dùng muốn ẩn. **Lượt CI cuối sau tài liệu và số phiên bản cần xác minh lại trước merge.** Chưa khẳng định GitHub Pages đã cập nhật trước khi publish.

---

## 20/10/2026 — Gọn Danh sách, tiêu đề cột, tooltip và phân cách (PR #5)

- Nhánh `fix/list-header-tooltips-visual-2026-10-20`, PR #5. Trong Bảng dữ liệu (`ItemList`) nhãn tiêu đề A–O/cột tùy chỉnh căn giữa ngang với `ColumnHeader` giữ sort/resize hoạt động; nút sort tuyệt đối ở bên phải không làm lệch nhãn. Đường dọc hàng tiêu đề, hàng bộ lọc và ô dữ liệu rõ hơn rất nhẹ (`#cbdad1`, 1px), không tô đặc.
- Ô được quyền sửa vẫn có class `editable-cell`, tooltip tức thì và `CellPicker` bo viền nhưng **không còn viền trái xanh hay viền xanh khi hover**. Không thay quyền Firebase, màu tiến độ hay dữ liệu nguồn.
- `SharedReportTooltip` và `SharedEditTooltip` dùng hàm `outsideCellTooltipPosition`: tooltip hiện chếch trên/phải ngoài ô, đổi sang phía trái ở sát mép; nếu hai bên đều thiếu chỗ thì chọn trên/dưới. Nút lịch sử từng ô cũng dùng `SharedEditTooltip` với nhãn `data-quick-tooltip` (không dùng browser title chậm); lịch sử nguồn chỉ truy vấn khi click, quyền xem không thay đổi. Mỗi ô mới chỉ đọc `getBoundingClientRect` một lần, không theo `pointermove` và không tạo DOM mỗi ô. Test unit kiểm hình học các mép; Chrome kiểm tooltip thật không che ô.
- Trang Danh sách của cả admin/người sửa/khách chỉ còn một tên **Danh sách làm việc** ở tiêu đề trang; card bảng chỉ báo số nội dung + nút hiện đủ cột, bỏ tên bảng lặp và nhãn nguồn lần hai. Với trang Tổng quan/Danh sách của người đăng nhập, ẩn riêng dòng email/role và thời gian đọc khi không đang tải; nút tải lại có tooltip thông tin thời điểm. Banner nguồn chỉ gọn `Google Sheets · Tự cập nhật mỗi 60 giây · Mở bảng nguồn`; mã GID và `Dùng lại nguồn mặc định` giữ trong mục Tài khoản/Nguồn, không vứt chức năng. Cảnh báo nguồn vẫn giữ trong details thu gọn để tránh mất dữ liệu kiểm tra.
- Kiểm thử [#39423111683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39423111683) PASS sau bộ smoke tăng cường (nguồn giả lập); chưa nhận định phát hành Pages/Chrome trên máy người dùng trước merge. Không thay Firebase Rules hoặc Excel production.

---


## 20/10/2026 — Popup khách gọn, tooltip nhanh và dropdown rõ ràng (PR #4)

- PR #4: `fix/guest-popup-tooltip-dropdown-2026-10-20`. Khách ẩn danh trong `ReportDetailGrid` chỉ có thông tin số nội dung và hàng lọc theo từng cột. Ẩn `Hiện đủ cột Excel`, `Xóa bộ lọc` toàn bảng, `Rộng popup`, `Mở Danh sách dữ liệu` cùng toàn bộ cấu hình/mẫu/sửa/lịch sử. Bỏ cả ô tìm kiếm chung cho mọi tài khoản (đã có lọc từng cột). Các ô lọc dạng chọn ghi `Chọn để lọc` thay cho `Tất cả`.
- Tên bảng báo cáo, Danh sách nội dung, tiêu đề popup được căn giữa; không đổi căn cột dữ liệu. Tooltip số lượng báo cáo được đặt hoàn toàn phía trên hoặc dưới chính ô đang hover (không che số), lấy một `getBoundingClientRect` khi đổi ô, không chạy pointermove. Đây là thay đổi so với benchmark cũ đòi không đọc layout; cần đo thực tế máy người dùng nếu có phản ánh mới.
- Tooltip ô sửa không còn dùng `title` có độ trễ trình duyệt, thay bằng một `SharedEditTooltip` dùng event delegation và manual popover top-layer, xuất hiện cùng sự kiện hover; chỉ ô có lớp `editable-cell` được gắn với quyền hiện hành mới hiện. Ô lựa chọn `CellPicker` có khung mảnh bo góc và mũi tên ▼, chỉ render khi sửa được, dùng cùng component với popup.
- Kiểm thử CI [#39357574934](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39357574934) PASS nhóm 1; [#39358357894](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39358357894) PASS sau cập nhật test hiệu năng; [#39358572239](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39358572239) PASS, bao gồm Chrome xác nhận tooltip mở đồng bộ. **Chưa kết luận site chính đã phát hành trước merge PR #4**. Không đổi Firebase Rules hoặc dữ liệu nguồn.

---

## 20/10/2026 — Đã chuyển sang phát hành GitHub Pages chính, không dùng HTML preview

- Theo yêu cầu mới, PR #3 đã merge vào `main` tại commit `d6734b1789f8f0494e50213e17a157d7bf96b569` từ PR head `bb82f727eb3a48ea6a2619d3c9aed4d04108d147`. Trước merge, sao lưu `main` thành `backup/before-direct-pages-publish-2026-10-20` từ `8026c7098166d62cb84b0c1981e2be51ec4ca1e1`.
- GitHub Actions [Build #39349869241](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39349869241) **SUCCESS**; workflow tạo `main:index.html` mới tại `c7517e0782d95fe82c3ee6b10b12cb18d0ae6876`; [Pages Deploy #39350027217](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39350027217) **SUCCESS**. Root HTML được đối chiếu chứa dấu chức năng `cell-history-action`, `report-title-accent`, `cell-highlights-editor`, `Bấm để sửa` và `report-grid-modal`.
- Đường sử dụng chính: https://cavoixanh638.github.io/HopHDND-WebApp/ . Không tạo HTML preview độc lập cho các yêu cầu tiếp theo. Giữ CI browser smoke, unit/emulator/typecheck ở hậu trường; không tạo artifact HTML downloadable. Không thay Excel/Firebase Rules, không xác nhận quyền đăng nhập thật hoặc UX tại máy Windows của người dùng khi chưa kiểm được.
- Hai workflow publish preview cũ đã nghỉ sử dụng, lưu được trong Git history/backup. Các mục trạng thái PR #3 “Draft/chưa merge/chưa publish” phía dưới là **lịch sử trước 20/10**, không còn là trạng thái hiện hành.

## 20/10/2026 — Sáu cải tiến bảng và popup, PR #3 (mã đã kiểm, chưa phát hành)

**Trạng thái có bằng chứng:** mã trên nhánh `feat/saved-views-approval-lock-filters-2026-10-16`; exact SHA `bb398c0d4acc3a828eb1d7f4cf75a06745b28c05` đã PASS Verify [#39296834797](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39296834797), gồm TypeScript, unit, Firebase emulator, build trang độc lập, Chrome smoke dùng mock Sheets. Các bước trước đã PASS tại #39293831656, #39294418834, #39295256801, #39295618460, #39296061634. **Chưa phát hành exact SHA mới ra preview/current hay site chính, chưa nghiệm thu Chrome/Windows của người dùng, chưa ghi Excel/Firebase production.**

1. Tên từng bảng báo cáo có tùy chọn tô màu chữ của từ/cụm từ, dùng `titleAccentText/titleAccentColor` trong report layout; mã màu HEX6 được kiểm tra khi lưu. Không thay cách tính báo cáo.
2. Quy tắc `ItemLayout.cellHighlights` tô **từng ô** chứa từ khóa, có màu chữ và nền riêng, tùy chọn cột/tất cả cột, không phân biệt chữ hoa và dấu; tối đa 30 quy tắc. Danh sách/Popup dùng **chung quy tắc đã lưu**; màu hàng của mẫu xem cá nhân vẫn độc lập.
3. Sort chỉ xuất hiện/hoạt động khi vào chế độ sửa Danh sách hoặc `Chỉnh sửa nháp` popup; viewer/guest không có sort trên tiêu đề. Khi ra chế độ sửa popup, sort tạm được xóa.
4. Ô được phép sửa có viền trái xanh nhẹ và tooltip ngắn **“Bấm để sửa”**; quyền ô được xét trước khi đánh dấu, khách popup không được đánh dấu. Không gắn hover listener từng ô.
5. Mỗi ô ngoài `content` và `note` được căn giữa hai chiều theo mã cột ổn định; Nội dung/Ghi chú căn trái và trên trong cả hai bảng, không phụ thuộc đổi thứ tự cột.
6. Biểu tượng đồng hồ lịch sử `CellHistoryAction` 18px nằm trong ô trường nguồn, tooltip **“Xem lần sửa gần nhất”**; click mới đọc `Repository.history`, lọc chính xác field và lấy thay đổi đã lưu mới nhất (trước → sau, thời gian). Biểu tượng **không khẳng định có bản ghi lịch sử**; nếu nguồn không cung cấp sẽ thông báo chưa có. ID vẫn mở lịch sử cả hồ sơ. Không hiển thị hành động lịch sử cho khách ẩn danh. Nguồn Firebase có giới hạn giữ lịch sử gần đây; nháp không được tính là thay đổi nguồn.

**Phạm vi kiểm thử:** CI mock/emulator đã PASS; quyền thực tế Firebase, thời gian phản hồi trên máy người dùng và nghiệm thu sau deploy chưa xác minh. Không nâng phiên bản production, không merge PR #3.

---


## 19/10/2026 22:32 VN — Khắc phục quyền khách và thanh chỉnh độ rộng toàn popup

- **Phản hồi ảnh người dùng:** popup Q.CVP Nguyễn Hoàng Long / Sở chưa trình vẫn để khách thấy nút Chỉnh sửa nháp, Cấu hình cột riêng, Mẫu bảng popup. Việc áp dụng lại quyền sửa ở Danh sách cho popup là sai yêu cầu tách chế độ khách.
- **Sửa nguồn trên PR #3 (chưa merge):** App truyền readOnlyViewer=anonymousVisitor vào ReportDetailGrid. Khách ẩn danh chỉ xem, lọc, tìm, sắp xếp, xem đủ cột và mở Danh sách; các nút Chỉnh sửa nháp, Cấu hình popup / cột, Mẫu bảng popup/lưu mẫu, lưu nháp và các chốt kéo độ rộng từng cột đều không render. Kiểm tra popupMayEdit, canEditCell và editing ở từng editor/callback để chặn cập nhật dữ liệu kể cả khi khách có quyền sửa thử trong Danh sách. Người dùng không ẩn danh vẫn được bật sửa nháp đúng phạm vi ô được cấp quyền.
- **Độ rộng toàn cửa sổ hiển thị rõ:** thanh trượt Rộng popup kèm giá trị px ngay ở toolbar (kể cả chế độ xem của khách, chỉ là tùy chọn cách hiển thị). Giới hạn từ 640 px đến chiều rộng màn hình có sẵn, tối đa 2400 px; thay đổi tự lưu localStorage theo nguồn/đường preview. Ô số nhập chính xác 640–2400 px vẫn ở Cấu hình popup / cột dành cho tài khoản không ẩn danh; độ rộng từng cột không đổi.
- **Test bổ sung:** source/tests/report-detail-guest.test.tsx kiểm trường hợp khách có quyền sửa danh sách vẫn bị chặn trong popup; thu hồi quyền giữa lúc soạn; lưu/phục hồi độ rộng toàn popup. **CI Verify #39279720743 đang QUEUED**, chưa có PASS/FAIL; chưa thể xác nhận tương tác trực tiếp Chrome Windows.
- **Phát hành:** Mã mới chỉ có trong nhánh PR #3 Draft. **Chưa xuất bản phiên bản sửa lượt này lên preview/current, preview/popup-width-permissions-2026-10-19 hoặc trang chính.** Preview hiện hành vẫn là phiên bản trước của lượt kiểm tra này; không yêu cầu người dùng kiểm nghiệm chức năng mới tại đường cũ. Không ghi dữ liệu Firebase/Excel.

## 19/10/2026 — Đã xuất bản bản xem thử chiều rộng popup / phân quyền

Preview source PASS #39270344125, exact SHA 355ec81fb274da44c19eb1e277409547a6a2d3b8; publisher commit b67cddf56b6b70471ea931faec0c7f02d61cf9b3 (19/10/2026 21:39:50 VN). Hai file preview/current/index.html và preview/popup-width-permissions-2026-10-19/index.html cùng blob 0f4656ac5d351ef4865a782d652403fdcba0bf2d; main:index.html vẫn blob 48aff33fdac08477e38c8f4d49837eb68eee0584. PR #3 Draft/chưa merge, Excel và Firebase business data không ghi. CI cuối cùng của docs #39270758690 PASS. Chưa có nghiệm thu Chrome Windows trực tiếp và chưa xác nhận website cache trên máy người dùng.

Đường xem thử: https://cavoixanh638.github.io/HopHDND-WebApp/preview/popup-width-permissions-2026-10-19/ . Đường preview/current cùng artifact; đường preview/popup-grid-parity-2026-10-19 vẫn giữ bản trước (blob 687d1ae59962b20540c440857c6ff87719e2d88e). Không suy việc có HTML trên GitHub thành xác nhận thao tác người dùng hoặc ghi dữ liệu.

## 19/10/2026 — Popup: chiều rộng chung và quyền sửa theo ô

- **Quyền:** ReportDetailGrid mặc định ở chế độ xem; chỉ cho bật "Chỉnh sửa nháp" khi có ít nhất một ô được cấp quyền; editor từng ô kiểm tra canEditCell(recordId, field), allowDraft và khóa sửa của Firebase. Người xem được cấp quyền chỉ sửa đúng nội dung/trường cho phép, không tự có quyền ghi nguồn.
- **Thiếu sót và sửa:** Trước đây cửa sổ popup có chiều rộng tối đa cố định 1480 px, chưa có điều khiển độ rộng chung. Nay có DetailGridPreferences.dialogWidth 640–2400 px (mặc định 1480), chỉnh trong "Cấu hình cột riêng", xem trước, lưu trên trình duyệt theo nguồn/đường preview. Độ rộng cửa sổ riêng với tổng chiều rộng bảng và từng cột; giới hạn bởi viewport trên màn hình nhỏ. Cấu hình v1 cũ không có dialogWidth được tự điền mặc định, giữ thứ tự/ẩn/độ rộng các cột.
- **Quyền thay đổi khi đang soạn:** nếu bị thu hồi quyền hoặc khóa sửa thì ContentEditor từ chối Áp dụng nhưng giữ nội dung đang gõ và thông báo, không âm thầm xóa. Bản nháp chung với Danh sách, không ghi Excel/Firebase thật từ popup.
- **Bằng chứng CI:** [Verify #39270344125](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39270344125) SUCCESS với commit nguồn 355ec81fb274da44c19eb1e277409547a6a2d3b8: typecheck, unit tests, Firebase emulator, build và Chrome smoke đều PASS. Unit test có kiểm 640–2400, cấu hình cũ và nguồn độc lập. **Chưa có kiểm thử tương tác trực tiếp kích thước cửa sổ trên Chrome Windows người dùng**.
- **Phát hành:** code ở PR #3 Draft, chưa đưa bản mới vào preview/current hoặc production main/index.html. Đường preview popup-grid-parity ngày 19/10 đang phát hành trước sửa này; chưa chứa điều khiển chiều rộng chung.

## 19/10/2026 — Bảng chi tiết popup: kéo độ rộng thật và đối chiếu chức năng Danh sách

- **Nguyên nhân lỗi:** popup phiên bản đầu có số px trong Cấu hình cột nhưng **không có tay nắm kéo trực tiếp**; `width:max-content/min-width:100%` có thể làm Chrome phân phối lại độ rộng cột. Đã dùng lại `ColumnResizeHandle`, `ColumnHeader`, `ColumnFilterCell`, `CellPicker`, `ContentEditor` từ bảng Danh sách; `colgroup` gắn width từng cột và `table.style.width` đúng tổng số px, chỉ commit khi thả.
- **Chrome nested modal:** pointer capture bị mất khi chuột rời tay nắm, nên thêm `windowDragFallback` tùy chọn trong `ColumnResizeHandle` **chỉ bật ở popup**, window listeners chỉ gắn khi đang kéo và dọn khi thả/hủy/unmount. Browser CDP **PASS** [Verify #39263671680](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39263671680) ở exact HEAD `37774e6d32d843f37337f5cb8936db2617e42d0d`: cột ID **100→165px**, bảng **2120→2185px**, ghi vào preference riêng và đóng/mở lại còn **165px**; ẩn cột Ghi chú **10→9 cột**, mở lại còn 9; `REPORT_DETAIL_DRAG_RESIZE_PASS`, `REPORT_DETAIL_REOPEN_PERSISTENCE_PASS`, `BROWSER_SMOKE_PASS`. **357 unit PASS/20 skipped**, **20 Firebase emulator PASS**, TS/build/docs/Chrome PASS.
- **Đã bổ sung để gần tương đương Danh sách:** di chuyển cột kéo hoặc Alt+←/→ khi mở cấu hình, chỉnh độ rộng ngay trên bảng (cả chuột/phím), hiện đủ 15 nguồn, reset filters, hàng filter reuse có dropdown khi ít lựa chọn/nút X, sort 3 trạng thái, mẫu cá nhân (tối đa 12), màu điều kiện riêng popup, nhãn cột nguồn đã được quản trị đổi tên, kiểu text/dropdown theo cấu hình nguồn, ContentEditor có xác nhận sửa, lịch sử theo ID, cảnh báo specialist–room và nút mở Danh sách. Bản nháp và quyền dữ liệu vẫn dùng chung; cấu hình hiển thị, bộ lọc, mẫu và màu popup **riêng theo nguồn/preview**.
- **Giới hạn cố ý:** không tạo/xóa 20 cột custom trong popup, không sửa phân quyền Firebase/khóa/duyệt hoặc ghi Excel thật trong modal, không tự động chia sẻ layout popup sang thiết bị khác. Đối chiếu từng mục và backlog tại [REPORT_DETAIL_PARITY_2026-10-19.md](REPORT_DETAIL_PARITY_2026-10-19.md). Mốc này mới PASS Chrome CI với Sheets mock, **chưa xác nhận trên Windows thật**. Chỉ được publish preview từ artifact CI pass bất biến, không merge PR #3, không sửa `main:index.html`/Excel/Firebase.
- **Preview mới đã publish:** [Publisher #39264618146](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264618146) **SUCCESS**, [GitHub Pages #39264646359](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264646359) **SUCCESS**. Artifact từ [source run #39263671680](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39263671680), exact SHA `37774e6d32d843f37337f5cb8936db2617e42d0d`, digest `sha256:d3aed0aa167577320ac297edec488992c1ab982ab755d020e26648fa3f5a5c51`; [preview/popup-grid-parity-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/popup-grid-parity-2026-10-19/) và `preview/current/` cùng HTML blob `687d1ae59962b20540c440857c6ff87719e2d88e`. Trang chính `main:index.html` vẫn blob `48aff33fdac08477e38c8f4d49837eb68eee0584`. PR #3 OPEN/chưa merge, Excel/Firebase không ghi. Main backup trước publisher `backup/before-popup-grid-parity-preview-2026-10-19` SHA `68f039942d66ec35158cdec45ab4de0f7e4ae1f2`. Các preview dated cũ giữ nguyên.
- **Backup trước lượt sửa:** `backup/before-popup-grid-parity-resize-2026-10-19` tại `c146ee3bbf49edb5cb29a703cddd3cf81177348c`.

# Trạng thái hiện tại

## 19/10/2026 — Bảng chi tiết nhanh và cấu hình cột riêng (PR #3, preview only)

- Theo yêu cầu người dùng, khi click ô số dương ở 5 bảng báo cáo mở **ReportDetailGrid** thay danh sách thẻ cũ; bảng có tìm toàn bộ, bộ lọc cột, sort, cuộn ngang và header cố định. Chỉ lấy `recordId` của hồ sơ thuộc ô và `workspace.workingItems` (không tải lại Sheets khi click); bộ đếm báo cáo vẫn từ `workspace.items` đã xác nhận, chưa cập nhật giả khi có nháp.
- **Tùy chỉnh riêng:** `ReportDetailGrid` có nút `Cấu hình cột riêng`; người dùng chọn hiện/ẩn, ↑↓ sắp xếp, độ rộng 70–800px và lưu/khôi phục mặc định. Mặc định 10 cột tiêu biểu trong 15 cột Excel A–O; mọi cột A–O đều bật được. `report-detail-preferences.ts` lưu `hdnd.report-detail-grid.v1` theo nguồn/preview, không ảnh hưởng layout Danh sách nội dung, các báo cáo hay cấu hình Firebase. Không tự chế cột nguồn.
- **Nháp cùng hệ thống:** quyền `canEditCell` + `mayEdit`/khóa sửa kiểm trực tiếp từ controller, soạn nháp qua `updateDataDraft`/`useWorkspace.update`, giữ bản nháp bằng `workspace.keepDraft`. Không có nút ghi Excel thật; trên Pages `SheetsRepository.readOnly=true`, không gọi `repository.save` từ modal. Không ghi Firebase, không chạm Excel, không merge PR #3 hoặc thay production root.
- **Mã nguồn:** `source/src/features/reports/ReportDetailGrid.tsx`, `source/src/data/report-detail-preferences.ts`, tích hợp `source/src/app/App.tsx` và CSS `source/src/styles/app.css`; unit + browser acceptance riêng. [Verify #39256157291](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256157291) **PASS** tại exact code SHA `c2d13b56dd675e230c39d7364d9a9054397159e6`; 355 unit PASS/20 skipped, 20 Firebase emulator PASS, Chrome smoke PASS (`REPORT_DETAIL_COLUMNS_PASS {initial:10,now:9}`). Bằng chứng đầy đủ tại [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- **Preview đã phát hành thành công:** [Publisher #39256870483](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256870483) **SUCCESS**, [Pages #39256898732](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256898732) **SUCCESS**. Artifact bất biến `sha256:2ee1bd07e85dbb4c78f0421db86b2a01f4c203833eb7957fa7ffd54726e07a28` từ source test PASS `c2d13b56dd675e230c39d7364d9a9054397159e6`; [preview/detail-grid-columns-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/detail-grid-columns-2026-10-19/) và `preview/current/` cùng HTML blob `2f71f8ecbf7504918f052cbd5add843581436d3e`; main production root `index.html` blob `48aff33fdac08477e38c8f4d49837eb68eee0584` vẫn giữ nguyên. Tài liệu cập nhật sau exact code test, không thay đổi mã từ artifact. Chưa nghiệm thu độ mượt/chỉnh sửa bằng quyền thực trên máy người dùng.
- **Sao lưu:** `backup/before-quick-detail-grid-columns-2026-10-19` tại `965b4781489ddb0a8975b42730ff80320eb1f3f8`; áp dụng trên feature branch PR #3. Chưa đo tốc độ mở với dữ liệu thật, chưa bật lưu thực vào nguồn.

## 19/10/2026 — Checkpoint: mã giao diện đã commit trước; chốt nguồn tài liệu hệ thống sau

- **Mã nguồn đã chốt trên GitHub trước cập nhật tài liệu:** `b22b877c8f81d840059abd738dde5d7c9a24d0a9` (`src/styles/app.css`, hover chỉ đúng ô xanh ngọc/outline 2px), `cb4c276b2f649a178993ab0bb3abd192f4faca83` (`scripts/smoke-pages-browser.mjs`, thử A/B CSS hover) và code tooltip delegated trước đó. Trạng thái code này được **CI xác nhận PASS** [#39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414): 352 unit PASS/20 skipped, 20 Firebase emulator PASS, build/typecheck/docs/Chrome mock PASS. Không đưa ra commit source mới chỉ để giả tạo checkpoint; exact source/test commit là bằng chứng.
- **UI và nghiệp vụ đã giữ nguyên:** toàn bộ ô đếm dương ở 5 bảng (trạng thái, tổng nhóm, tổng bảng) click mở đúng hồ sơ; chỉ số, không dấu mũi tên; `#report-shared-tooltip` role=tooltip một phần tử chung 190×32px, text `Click để xem chi tiết`, delegated pointer handler; hover nền `rgba(9,106,113,.14)` + `outline:2px solid #08777B` chỉ ô đang trỏ, Tab focus 3px; không `body:has()`+CSS Anchor hay paint cả hàng. Giữ nguyên các cột/trạng thái Excel, sort, kéo cột, in/PDF.
- **Kết quả A/B có kiểm soát:** 2 × 36 chuyển ô bằng CDP trên Chrome headless có Layout 0ms ở **cả cũ và mới**, Task trung bình 82,76ms (cũ) và 83,87ms (mới) tính **tổng thời gian tác vụ cho 36 lượt**; khác biệt nhỏ trong lượt #39249428414, không thể suy độ mượt trên máy thật. **Lần lặp lại [#39251864679](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39251864679) cho Task cũ 57,71/64,45ms và mới 71,52/71,18ms; Layout vẫn 0ms**, cho thấy số liệu Task dao động, không được khẳng định viền “không tốn xử lý” hoặc hiệu năng thực tế bằng nhau. Xem [báo cáo A/B](TOOLTIP_PERFORMANCE_AB_2026-10-19.md) để đánh giá đúng giới hạn mẫu thử. Quyết định bỏ global `body:has()`/CSS Anchor dựa vào A/B trước ghi ở [báo cáo](TOOLTIP_PERFORMANCE_AB_2026-10-19.md); 300 sự kiện synthetic không đo perceived latency.
- **Tài liệu nguồn chuẩn được cập nhật sau commit:** [SYSTEM](SYSTEM.md) = hành vi và bất biến, [FEATURES F06](FEATURES.md) = yêu cầu/tiêu chí nghiệm thu, [ARCHITECTURE](ARCHITECTURE.md) = module và đường hover, [REPO_MAP](REPO_MAP.md) = vị trí code, [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md) = số liệu/CI, [TOOLTIP_PERFORMANCE_AB](TOOLTIP_PERFORMANCE_AB_2026-10-19.md) = phép đo và lý do chọn, [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md) = thao tác người dùng, [VAN_HANH](VAN_HANH.md) = provenance preview và rollback, [README](README.md) = chỉ mục, [AGENTS](../AGENTS.md) = guardrail phát triển. **Các section CSS Anchor trong tài liệu nghiệm thu cũ là lịch sử**; phần đứng đầu ghi rõ mốc hiện hành.
- **Phát hành đã kiểm trước khi cập nhật tài liệu:** [publisher #39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) SUCCESS và [Pages deploy #39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864) SUCCESS; [preview/clear-cell-hover-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/) là URL nghiệm thu cố định, `preview/current/` đang cùng bản. Production root `main:index.html` blob `48aff33fdac08477e38c8f4d49837eb68eee0584` không đổi; PR #3 vẫn mở/chưa merge, Excel/Firebase production không ghi. Công đoạn tài liệu không phải deploy production.
- **Tồn tại:** chưa có số đo frame P95/paint trên trình duyệt Windows với dữ liệu thật và chưa có xác nhận độ mượt thực tế từ người dùng sau bản viền rõ. Không đánh dấu đã nghiệm thu performance sản xuất; không triển khai virtualization chỉ từ dữ liệu benchmark synthetic. Nếu cần đo tiếp, bật Chrome DevTools Performance, kiểm trace Style/Layout/Paint và số nodes thực, so sánh với baseline ghi trong báo cáo.

## 19/10/2026 — Làm nổi ô hover nhưng không tăng việc xử lý

- Theo yêu cầu mới của người dùng, giữ nguyên singleton tooltip và cơ chế delegated pointer đã được A/B chọn, **chỉ sửa CSS của ô `report-clickable-cell`**: trước đây lớp phủ nền `rgba(73,124,98,.035)` rất nhạt, hầu như không phân biệt. Mới: `background:rgba(9,106,113,.14)` và `outline:2px solid #08777B`, `outline-offset:-2px` không thay box geometry; focus bàn phím có viền **3px** màu #07595B.
- Viền teal chỉ đánh dấu tương tác, không đổi dữ liệu hoặc màu semantic red/yellow/green. Không thêm DOM/React state, JS/animation, shadow blur, `body:has`, repaint toàn hàng; không ảnh hưởng các ô số `—`, ô % hoặc tiêu đề, hoặc thao tác bấm toàn ô. CSS `outline` không thay đổi kích thước layout, khác với `border`. Có paint cục bộ trên ô, mức GPU/browser thực tế cần kiểm bằng Chrome.
- Chrome smoke được mở rộng: đo `CELL_HOVER_VISUAL_AB` 2 × 36 chuột thật (bản trước .035 và bản mới .14 + outline, luân phiên thứ tự), đếm RecalcStyle/Layout/Script/Task; kiểm hình học ô, chỉ đúng một ô có viền và tooltip vẫn mở khi con trỏ ở góc. **A/B Chrome PASS** [Verify #39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414), exact SHA `cb4c276b2f649a178993ab0bb3abd192f4faca83`: 352 unit/20 Firebase emulator/Chrome smoke PASS. Hai vòng × 36 chuyển ô thực: cũ Task **86,22 / 79,30 ms**, mới **85,18 / 82,55 ms**; trung bình cũ **82,76 ms**, mới **83,87 ms** (+1,11 ms tích lũy/36 hover; chưa có ý nghĩa thống kê), cả hai Layout **0 ms**. Chrome kiểm được `outline: rgb(8,119,123) solid 2px`, fill `rgba(9,106,113,.14)`, viền chỉ đúng ô đang trỏ, không đổi kích thước; tooltip dùng chung, thử nghiệm 300 pointer events 0 layout reads, click góc ô PASS. **Preview publisher PASS** [#39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) pinned artifact `sha256:2d2f23ab40e21229556998de0bba0e649d15dd7e46a7ed77b370218463d21271`; `preview/current/` và `preview/clear-cell-hover-2026-10-19/` HTML blob `835f1310a821fd1b106cbbf0f069e264b855a613`. Root production index blob `48aff33fdac08477e38c8f4d49837eb68eee0584` unchanged. **Pages deploy SUCCESS** [#39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864); PR #3 open/unmerged, không đụng Excel/Firebase. Nhánh backup main `backup/before-clear-cell-hover-preview-2026-10-19` tại `d16124f0f430c0003cc6aca0cead9df520fd7c2e`.
- Sao lưu nhánh code trước sửa `backup/before-high-contrast-cell-hover-2026-10-19` tại `68893b4ac094b991cb19b82d515da1f124ae2fa3`. Chỉ PR #3 / preview, không merge, không sửa Excel/Firebase hoặc root production.

## 19/10/2026 — Quyết định tối ưu tooltip dựa trên A/B Chrome thật

- **Bằng chứng A/B trước khi sửa:** [run #39242280607](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39242280607) tại `f228257792974f8cd245167aff2cab4bda07a40f`, ghi log `HOVER_AB_METRICS` với 5 phương án, 36 lần chuột thật × 2 lượt, khoảng 7.976 nodes từ 5 bảng + 80 dòng nhân bản. **Workflow tổng FAIL sau phép đo** vì xóa thư mục Chrome gặp ENOTEMPTY; các số đo đã ghi thành công trước đó, không gọi run PASS. Xem phương pháp, số liệu và giới hạn trong [TOOLTIP_PERFORMANCE_AB_2026-10-19.md](TOOLTIP_PERFORMANCE_AB_2026-10-19.md).
- Trung bình mỗi 36 chuyển ô trong Chrome mô phỏng: **baseline CSS Anchor + body:has**: Style **10,70 ms**, Layout **31,92 ms**, Task **176,53 ms**; **tooltip chung JS nhẹ**: Style **4,89 ms**, Layout **0 ms**, Task **109,69 ms**. Chênh Task -**37,9%** và Layout gần 32 ms chỉ trong phép thử nhỏ trên runner, **không là % cải thiện bảo đảm cho Chrome Windows/dữ liệu thật**. Biến thể chỉ tắt `body:has` hoặc tooltip cho Task khoảng 99–102 ms nhưng làm mất khả năng popup thực, nên không chọn.
- **Mã quyết định:** `src/components/SharedReportTooltip.ts` bỏ nhánh CSS Anchor, chỉ có **một** tooltip `Click để xem chi tiết` 190×32px; event delegation trên document, `transform:translate3d` **chỉ khi sang ô số khác**, không theo `pointermove`, không đo kích thước/đổi text/đổi ARIA cho pointer; Tab focus được gắn ARIA riêng. `src/styles/app.css` bỏ `body:has(.report-surface...)`, `anchor-name` và `position-area`, giữ background cell nhỏ, không hover tô cả hàng. Ô chỉ còn số, click toàn ô/tổng/chi tiết/Enter/Space, không đổi 5 báo cáo hay nguồn Excel.
- **Kiểm thử mã triển khai PASS:** [Verify #39243043877](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39243043877), exact code SHA `8fe7c463dc036f5995cd5ac057caee433ce4aeaa`, 352 unit PASS/20 skipped, 20 Firebase emulator PASS, typecheck/build/Chrome smoke PASS; stress 300 pointer events cho **0 layout reads**, một tooltip dùng chung; mouse CDP góc ô vẫn mở đúng modal.
- **Publisher PASS:** [#39243385576](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39243385576), provenance artifact `sha256:8a7dd0a10cc2d435980fd8e61af0c6770af77b6e21943846dc4309cc17e55eee`; preview `preview/ab-optimized-hover-2026-10-19/` và `preview/current/` cùng HTML blob `8c5b9e256a5f0bf188138d3d23c72d2d604397fe`. Root production `main:index.html` blob `48aff33fdac08477e38c8f4d49837eb68eee0584` **không đổi**; các preview cũ còn nguyên, không merge PR #3, không ghi Excel/Firebase. **Pages deploy SUCCESS** tại [#39243410970](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39243410970).
- Nhánh sao lưu main trước preview `backup/before-ab-verified-tooltip-preview-2026-10-19` tại `096db4026ee4e267bb671dcf1bb2fa622fbd81c3`. Nghiệm thu thực tế trên trình duyệt máy người dùng vẫn cần xác nhận; nếu còn lag, chạy Chrome Performance trace để phân biệt Paint/Composite và nguồn refresh 60 giây.

## 19/10/2026 — Native CSS Anchor Positioning: tooltip chung, không JavaScript trong hover

- **Lý do thay cách làm:** người dùng phản hồi tooltip chung fixed 190×32 vẫn lag, dù synthetic 300 sự kiện chỉ ~5ms. Con số này **không đo** thời gian render/compositing hoặc tốc độ chuột vật lý. Mã fallback cũ vẫn thay `aria-describedby`, `data-visible`, `transform` mỗi lần đổi ô, có thể phát sinh style/paint. CSS chung còn quy tắc `tr:hover` làm đổi màu cả hàng ở bảng dữ liệu.
- **Giải pháp hiện đại:** tận dụng [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name) (Baseline 2026), `position-anchor`, `position-area` và pseudo-class `:has(:hover)`: ô được rê chuột tự trở thành anchor, tooltip chung (được mount đúng 1 lần) được trình duyệt căn ngay cạnh ô, CSS trực tiếp quyết định hiển thị. **Chế độ modern không đăng ký pointer/focus/scroll listeners**, không đọc layout, không set tọa độ/attribute/timer khi hover, không thay text và không React render. Giữ tooltip cố định `Click để xem chi tiết`, nút chỉ hiện con số và toàn ô bấm được; focus-visible bàn phím cũng được hỗ trợ theo CSS. Chỉ trình duyệt chưa hỗ trợ mới gắn delegated fallback cũ, giữ giao diện không bị mất tooltip.
- **Giảm diện tích repaint:** bỏ `tr:hover` đổi nền toàn dòng trên bảng báo cáo; danh sách thông thường vẫn giữ màu hover; giảm mức màu hover của riêng nút trong ô. Không thay ngữ nghĩa trạng thái/nền theo từng cột, tỷ lệ, dữ liệu Excel, hay tính năng kéo cột.
- **Kiểm thử mới:** Chrome smoke xác minh chế độ native, một tooltip duy nhất, số liệu không mũi tên, 300 sự kiện pointer tổng hợp không chạm JS hay đọc rect, và quan trọng nhất dùng Chrome CDP di chuyển chuột **thật** vào góc 3 loại ô để kiểm tooltip hiển thị và vị trí so với ô, sau đó click mở detail. Fallback vẫn có smoke riêng nếu trình duyệt runner chưa hỗ trợ.
- **Nguồn so sánh:** Chrome CSS Anchor Positioning API và MDN, Chrome DevTools selector performance; `position-anchor` mới Baseline 2026 (tháng 9/2026), vì vậy có fallback. Cần người dùng nghiệm thu mức mượt trên trình duyệt Windows thật, chưa thể kết luận chỉ từ synthetic.
- **Sao lưu:** `backup/before-native-css-anchor-hover-2026-10-19` tại commit `4a63203c474585c387bcb5fb21a6c2921828bf3a`. Chỉ sửa nhánh PR #3 và preview tách biệt, không merge/ghi Excel/Firebase. **CI mã nguồn PASS** [Verify #39229760364](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39229760364), exact source SHA `9491f58495040ca01fba149831efc2f58f62f538` — 352 unit PASS (20 skip), 20 Firebase emulator PASS, typecheck/build/Chrome smoke PASS. Log `SHARED_NATIVE_TOOLTIP {ok:true,mode:native,cycles:300,layoutReads:0,cells:24}`; Chrome CDP điều khiển chuột thật vào góc 3 kiểu ô và xác nhận tooltip hiện, đặt gần ô và click mở chi tiết. Dữ liệu là mock Sheets, không đo latency người dùng. **Publisher PASS** [#39230010928](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39230010928) dùng artifact SHA256 `d2699668aa18642dc131d587d215a8c816939c123b36a7eef9fdcf7fb77036b4`; **Pages deploy PASS** [#39230034928](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39230034928). URL độc lập `preview/native-anchor-hover-2026-10-19/` và `preview/current/` cùng blob `9877301542a88e32c6b9f4f68354aede4d785816`. Root `main:index.html` giữ SHA blob `48aff33fdac08477e38c8f4d49837eb68eee0584`, không ghi Excel/Firebase, PR #3 vẫn open/unmerged. Mốc sao lưu main trước phát hành `backup/before-native-anchor-tooltip-preview-2026-10-19` tại `35a169cef630b4f6bb64927bee655f1dab273533`. Cần nghiệm thu thực tế độ mượt trên Windows/Chrome của người dùng.

## 19/10/2026 — Tooltip chung cố định, bỏ ký hiệu cạnh số

- Người dùng muốn quay lại tooltip nhưng giảm khựng và giản lược số: **mỗi ô chỉ giữ số lượng**, bỏ dấu ↗ và cue "Xem" trong ô; khi rê chuột hoặc focus qua Tab hiện tooltip `Click để xem chi tiết`. Click bất kỳ vị trí nào trong ô có số vẫn mở danh sách, ô trống/%/header giữ nguyên.
- Tham khảo trực tiếp docs: [Radix Tooltip Provider](https://www.radix-ui.com/primitives/docs/components/tooltip) dùng provider chung, điều chỉnh delay/skip delay; [AG Grid tooltip](https://www.ag-grid.com/javascript-data-grid/tooltips/) có switch delay và tùy chọn browser/tooltips tùy biến; [Floating UI autoUpdate](https://floating-ui.com/docs/autoupdate) cảnh báo chỉ bật theo vòng đời tooltip để tránh overhead; [Primer guidelines](https://primer.style/product/components/tooltip/guidelines/) yêu cầu text ngắn, gắn vào tương tác thực sự. Đây là nguyên lý tham khảo, **không khẳng định app cụ thể nào áp dụng y hệt hiện thực HopHDND**.
- Mã mới `src/components/SharedReportTooltip.ts`: **một** host HTML `role=tooltip` được mount khi báo cáo hiện và tháo khi không còn report, fixed 190x32px, text không đổi; delegated `pointerover/pointerout/focusin/focusout` toàn document; vị trí tính từ tọa độ pointer khi **đổi ô**, không đọc DOM geometry trên pointer path, không chạy request hay React state; hover xuyên ô giữ popup để giảm chớp, scroll/resize/click/Escape ẩn. Keyboard focus có phép đọc rect một lần. Không dùng `title` delay hoặc thư viện thêm. Có thể cần đo frame rendering thực tế nếu máy người dùng vẫn lag.
- `ReportTable.tsx` mount shared tooltip bằng effect, không còn handler hover per cell; `app.css` tạo khung tooltip cố định/nhẹ và không có số/biểu tượng khác cạnh count. `tests/reporting.test.ts` bảo vệ number-only nút, `smoke-pages-browser.mjs` kiểm singleton 300 lượt vào/ra cùng text/geometry và click tại góc bằng Chrome mock.
- Sao lưu trước sửa: nhánh `backup/before-single-fixed-tooltip-without-arrow-2026-10-19` tại `b0c7448354d7667eaac631ef28130bae1c0e1d67`. Thay đổi nằm trên PR #3 chưa merge; không đụng nguồn Excel, Firebase và bản production root. **CI xác nhận PASS** [Verify #39222179712](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39222179712) tại exact code SHA `f0880c7fc7fa36e3720250fff9d41a4317385fad`: 352 unit tests PASS, 20 Firebase Emulator PASS, TypeScript/build và Chrome smoke PASS; `SHARED_TOOLTIP_STRESS` đo 300 lượt synthetic pointer events ~5ms tổng cộng, **không phải số đo cảm nhận độ mượt trên máy thật**. **Preview publisher PASS** [#39222487605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39222487605) với digest artifact source `sha256:3e8386dceb20897344cd1471a2774dd387d6b75c41c2689303a4649063f4beca`; **Pages deploy PASS** [#39222509495](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39222509495). Bản `preview/shared-fixed-tooltip-2026-10-19/` và `preview/current/` mới chỉ được phát hành preview, không sửa root `main:index.html` (blob `48aff33fdac08477e38c8f4d49837eb68eee0584`), không ghi Excel/Firebase và không merge PR #3. Cần người dùng nghiệm thu cảm giác hover trên thiết bị thực.

## 19/10/2026 — Phương án hover không tooltip nổi (CSS-only, đang nghiệm thu)

- Người dùng tiếp tục phản ánh giao diện hover còn "nặng" sau khi đã dùng tooltip singleton prewarm/transform; số đo 300 sự kiện tổng 3ms **chỉ kiểm JavaScript synthetic trong runner**, không chứng minh hiệu ứng thật mượt: có thể còn paint/composite, nhiều vùng giao diện thay đổi, hoặc chính hộp nổi liên tục xuất hiện gây cảm giác rối.
- Đối chiếu nguồn công khai (GitHub Primer, Nielsen Norman Group, AG Grid, web.dev, TanStack Table) cho thấy tooltip không nên được dùng để lặp lại chữ đã rõ; AG Grid mặc định 2s tooltipShowDelay và có tooltipSwitchShowDelay, Primer coi tooltip là lựa chọn cuối khi cần thông tin bổ trợ; Chrome khuyến nghị đo INP/paint và tránh DOM phức tạp. **Không khẳng định Linear/Airtable trực tiếp dùng kỹ thuật này** khi chưa có bằng chứng.
- **Thay đổi:** bỏ hẳn tooltip nổi "Bấm để xem N nội dung" trên ô thống kê. Nút chiếm trọn ô vẫn tồn tại, số lượng hiển thị cố định, biểu tượng ↗ tự đổi thành chữ **Xem** khi hover hoặc Tab focus bằng **CSS thuần (opacity, không delay)**. Không listener onPointerOver/Out, không DOM tooltip dùng chung, không React state/JS hover, không di chuyển hộp nổi. Vẫn giữ `aria-label` đầy đủ để đọc màn hình, click toàn bộ ô, không bấm được ô `—`/%/header, 5 bảng không đổi thống kê/dữ liệu.
- Tiết giảm CSS hộp nổi có shadow/transform/contain/will-change và thay kiểu hover ô bằng tô nền nhẹ (tránh animated shadow); giữ viền focus keyboard riêng. Không phụ thuộc CSS anchor positioning mới (Baseline 2026 nhưng có thể không chạy trên trình duyệt cũ) hay nâng cấp thư viện lưới lớn khi chưa có đo thực tế.
- Regression: `tests/reporting.test.ts` kiểm không có callback pointer/focus trên nút, có cue **Xem**, đúng ô có/không click; `scripts/smoke-pages-browser.mjs` kiểm không có tooltip nổi, kiểm cue bằng `getComputedStyle` sau di chuyển chuột thật trong Chrome và bấm góc ô mở chi tiết.
- Nếu còn cảm giác chậm: thu Chrome Performance trace thật với dữ liệu lớn để tách input delay/style/layout/paint; chỉ triển khai virtualization theo quy mô và bằng chứng, vì năm báo cáo có tiêu đề sticky/drag-width/in và cấu trúc native table.
- Sao lưu nhánh: `backup/before-css-only-report-hover-2026-10-19` tại `82a3a157a2d4d73d1b722bcde04a13c5d5930a90`. Chỉ PR #3, chưa merge, không ghi Excel/Firebase. **CI PASS** cho mã tại commit `6185cffbfacfb30843e0e3415e40b648b9c0fdfe` — [Verify #39216137650](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39216137650): 352 unit tests, 20 Firebase emulator tests, typecheck/build/Chrome smoke PASS. Browser smoke xác nhận 24 ô click trong fixture sử dụng cue CSS Xem, không có popup nổi, pointer thật hiện cue và click góc ô mở modal. **Preview publish PASS** [#39216438656](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39216438656), đã ghi `preview/current/` và `preview/css-only-hover-2026-10-19/` cùng HTML blob `fcc2f8cda077ea5224d8d148691ae7eefd948938` (không đổi root `index.html` blob `48aff33fdac08477e38c8f4d49837eb68eee0584`). **GitHub Pages triển khai PASS** tại [#39216463874](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39216463874). PR #3 vẫn chưa merge, không ghi Excel/Firebase. Mức độ mượt trên máy thật cần người dùng nghiệm thu; chưa chạy tracing hiệu năng thực tế với dữ liệu lớn.

## 19/10/2026 — Tối ưu độ trễ tooltip khi rê nhanh qua nhiều ô số

- **Phản hồi thực tế từ người dùng:** tooltip tức thì về logic vẫn có cảm giác giật/lag khi rê chuột nhanh. Đọc mã xác định đường hover cũ có `document.createElement`/`appendChild`/`remove`, đọc `offsetWidth/offsetHeight`, gọi `getBoundingClientRect` và đăng ký/hủy scroll/resize listener cho mỗi ô. Việc DOM write rồi layout read cùng lượt khiến Chrome có thể thực hiện forced synchronous layout; **đây là nguyên nhân khả dĩ từ mã**, chưa thể khẳng định là duy nhất trên mọi thiết bị.
- Thay `src/components/InstantCountTooltip.ts` bằng singleton **prewarm trước hover**, luôn gắn sẵn vào `document.body`, chỉ thay chữ nếu số lượng khác, di chuyển bằng `translate3d` dựa trên `event.clientX/clientY`, bật/tắt `data-visible`, không tháo/tạo tooltip và không đọc layout trên **pointer path**. Gọi `useEffect` prewarm ở `ReportTable.tsx`; một cặp listener scroll/resize dùng chung toàn WebApp. **Riêng Tab/focus bàn phím** có thể đọc `getBoundingClientRect` một lần để đặt tooltip vì không có tọa độ chuột. CSS `contain:layout style paint`, `will-change:transform`, `transition:none` để giới hạn repaint và không có animation delay.
- Tooltip chỉ hiển thị text `Bấm để xem N nội dung`, `N` đã được `aggregateReport` tính sẵn. Không cần/chưa triển khai tải lại Sheets, Firebase hay prefetch toàn bộ hồ sơ khi hover; các tập `entries` cho click cũng đã nằm trong RAM. Đừng đánh đồng cải thiện tooltip với render cửa sổ danh sách sau click (vẫn cần đo dữ liệu thật).
- `scripts/smoke-pages-browser.mjs` đã bổ sung kiểm 1 tooltip prewarm, tái sử dụng cùng DOM node qua 300 lượt pointerover/out, ẩn bằng `visibility` mà không hủy node, ghi thời gian thao tác trong Chrome giả lập và ngưỡng bảo vệ CI 2500ms (đây **không phải** cam kết latency tối đa/benchmark đại diện cho máy người dùng). Tiếp tục thử nghiệm thực tế trình duyệt của người dùng.
- Điểm sao lưu nhánh code trước sửa: `backup/before-compositor-tooltip-2026-10-19` tại `5256f75d8317bc66f1aed2af7b732a231ef5aed0`; main trước phát hành `backup/before-zero-layout-hover-preview-2026-10-19` tại `3b23fcda8fa80c8dcde7cb491b44c6a4764bc2c9`. **CI PASS** tại [Verify #39214467685](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39214467685), đúng source SHA `eb288e210575a7c5e273565508cd494e13f7f2a7`: 352 unit PASS, 20 emulator PASS, docs/build/typecheck/Chrome smoke PASS. Chrome smoke in log: `INSTANT_TOOLTIP_STRESS {ok:true,elapsedMs:3,cycles:300}`; đây là **tổng thời gian dispatch synthetic pointer event trong runner** chứ không phải latency hiển thị vật lý thực tế.
- **Preview publish PASS** [#39214702270](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39214702270), Pages deploy PASS [#39214723994](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39214723994). Các URL `preview/current/` và `preview/hover-fast-2026-10-19/` dùng cùng HTML blob `452d35bd0c47815641148ddf025a273dd54bec24`; các URL preview cũ vẫn được giữ. Root `main:index.html` blob `48aff33fdac08477e38c8f4d49837eb68eee0584` không đổi. Nhánh PR #3 chưa merge; không ghi Excel/Firebase. Người dùng cần nghiệm thu thực tế cảm giác hover và độ trễ mở modal.

## 19/10/2026 — Click/hover toàn bộ ô số lượng báo cáo (PR #3, nghiệm thu browser đang kiểm tra)

- **Yêu cầu mới đã xác định:** không cần click hoặc rê đúng lên số/nút nhỏ, toàn bộ ô đếm **có số dương** phải nhận hover + click, gồm trạng thái, tổng từng đơn vị và dòng Tổng cộng ở **cả năm** bảng mặc định. Ô rỗng (ký hiệu `—`), ô % hoàn thành và tiêu đề cột không được mở danh sách.
- Mã nguồn `src/features/reports/ReportTable.tsx`: nhãn `report-clickable-cell` chỉ có khi `!preview && entries.length>0`; nút HTML `count-drill` vẫn có `aria-label`, `onPointerOver/Out`, `onFocus/Blur`, `onClick`; thay vùng bấm bằng overlay CSS toàn ô. `report-cell-sizer` vô hình giữ nguyên chiều cao tự nhiên của dòng; render/in không nhân đôi số. Tooltip phản hồi ngay, không qua React state; nút Enter/Space mở danh sách theo ngữ nghĩa native.
- `src/styles/app.css`: td có `position:relative`, nút `position:absolute`, trải qua toàn ô; hover/focus đổi nền nhẹ + viền focus dễ nhận, không thay màu trạng thái cơ bản. Chrome smoke từng phát hiện chênh lệch tọa độ phía trên 2px, phía dưới 1px; đã thêm bù trừ phần viền và bắt buộc kiểm lại. Không sửa `columnWidths`, quy tắc thống kê/Excel, Firebase, hay API.
- Kiểm thử: `tests/reporting.test.ts` đối chiếu nút thật, tính ngữ nghĩa, preview không có vùng click, ô trống/%. `scripts/smoke-pages-browser.mjs` so kích thước nút với từng ô trong Chrome và gửi **sự kiện chuột thật tới góc ô**, kiểm mở/đóng danh sách với ô trạng thái/tổng dòng/tổng bảng. Không được coi thử `.click()` vào tâm nút là đủ.
- Bản sao mã nguồn trước sửa: `backup/before-full-report-cell-click-2026-10-19` tại commit `ce6a309b2123f1c3f93b4355504e399eb7ac4440`; bản sao main trước phát hành mới: `backup/before-full-cell-preview-publish-2026-10-19` tại `580e055fdb9827c107419100e78425cb37794d3b`. Mới sửa nhánh PR #3, **chưa merge**, không đổi trang root hay dữ liệu nghiệp vụ.
- **Đã kiểm chứng CI:** mã nguồn đúng commit `46af4cb46e16699dbde7ff688c31c538d8fdc925` qua [GitHub Actions #39198928944](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39198928944) **SUCCESS**: 352 unit test PASS, 20 Firebase emulator tests PASS, TypeScript/build/Chrome smoke PASS, bao gồm click vật lý vào **góc** của ô trạng thái, ô tổng theo dòng và ô Tổng cộng. Xuất bản [preview #39199095691](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39199095691) **SUCCESS**, ghi `preview/current/index.html` và `preview/full-cell-click-2026-10-19/index.html` có cùng blob `5dc0aebdb7b5efe314e3c0cf0ec9fed96af3aa0b`. Deployment GitHub Pages xem [run #39199111682](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39199111682); cần kiểm tra conclusion trước khi khẳng định link hoạt động. Root `main:index.html` vẫn blob `48aff33fdac08477e38c8f4d49837eb68eee0584` (không đổi). Cần người dùng nghiệm thu trực tiếp trên trình duyệt của mình; tốc độ dựng modal với dữ liệu thật chưa benchmark.

## 19/10/2026 — Đồng bộ màu nhạt và tooltip tức thì khi rê qua số báo cáo

- Yêu cầu mới: cột **Không phải trình** trong báo cáo xây dựng NQ phải **nhạt hệt** `Đã trình HĐND, chưa có QĐ`; hover số lượng **chỉ lướt qua cũng phải thấy chữ**, không đợi trình duyệt vài trăm mili giây/một nhịp dừng.
- Trong `ReportTable.tsx`, gắn `report-stage-intermediate` cho cả hai cột xây dựng NQ. CSS dùng chung **cùng 4 màu nền/chữ/viền/nhấn** cho `report-stage-excluded` và `report-stage-intermediate`, bỏ quy tắc màu `excluded` mạnh riêng từng có; năm kiểu trình bày và chế độ in có cùng kết quả nhạt. Giữ `excluded` như nhóm nghiệp vụ riêng, **không** thay đổi số đếm, mẫu số/tử số hoặc file Excel.
- Tooltip cũ đến từ thuộc tính HTML `title` bị browser trì hoãn. Thay bằng `InstantCountTooltip.ts`: hiện **đồng bộ ngay ở sự kiện pointer-enter/focus**, ẩn khi rời/blur/click/scroll/resize; một DOM node nằm ngoài overflow của bảng, không qua React state hay tạo render lại cả 5 bảng; nút vẫn có `aria-label` và mở chi tiết bằng click. Không có timer/delay trong code.
- Regression: `report-style-css.test.ts` bảo vệ màu và độ tương phản; `smoke-pages-browser.mjs` kiểm màu header/thân/chân hai cột bằng computed CSS và dispatch pointerover/pointerout xác minh tooltip hiện/ẩn ngay trong cùng thao tác JavaScript. **CI PASS** mã commit `8e3e78fdd1eb0b4060cc1e4091d820e4d46b5970` tại [Verify #39194775971](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194775971): 351 unit PASS (20 skipped), 20 Firebase Emulator tests PASS, typecheck/build/Chrome mock smoke PASS. **Preview publish PASS** [#39194973248](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194973248), **Pages deployment PASS** [#39194987734](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39194987734). Các URL hiện có: `preview/current/`, `preview/ux-fixes-2026-10-19/` và bản tránh cache `preview/instant-hover-2026-10-19/`. Trang `main:index.html` gốc vẫn blob `48aff33fdac08477e38c8f4d49837eb68eee0584` (không đổi).
- Điểm sao lưu trước sửa: `backup/before-instant-tooltips-muted-build-2026-10-19` tại `46aa3611c99117bb9dc376f979bbefc7093dcb89`. Mốc sao lưu main trước phát hành: `backup/before-instant-hover-preview-publish-2026-10-19` tại `450832e23e32e73cc0d210b612d323ff899af908`. Chỉ phát triển trên PR #3; không merge và không ghi Excel/Firebase. Tooltip tức thì **khác** tốc độ mở danh sách chi tiết sau click; việc đo hiệu năng modal dữ liệu thật vẫn còn mở.

## Kiểm toán yêu cầu ↔ tài liệu ↔ mã nguồn — 19/10/2026 (cập nhật sau phát hành preview)

**Phạm vi bằng chứng:** phiên chat hiện tại, các đoạn lịch sử trong project và một số trao đổi cũ truy xuất được; mã và docs trên PR #3; trạng thái GitHub Actions/Pages trực tiếp. **Không có khả năng xác nhận đã đọc toàn bộ văn bản của mọi phiên chat đã archived**, vì vậy đây là đối soát theo nguồn khả dụng, chưa là kiểm toán tuyệt đối 100%. Không lấy suy luận từ tệp đã viết làm bằng chứng rằng mọi chỉ đạo người dùng đều được ghi nhận.

**Kết quả kiểm toán:** trước lượt này **chưa đồng bộ đầy đủ**. `TU_DIEN_DU_LIEU.md` còn ghi Excel A–P, O = Ghi chú/P = Rút và tự thay ô trống bằng “Chưa phân công”; `FEATURES.md` còn nêu F14 đọc A–P, quy trình sort/kéo báo cáo/chi tiết chưa có tiêu chí nghiệm thu đầy đủ; `HUONG_DAN_SU_DUNG.md` còn mô tả lọc bằng icon, 50 dòng/trang và nhầm trạng thái preview. Các file trên phải được chỉnh theo **source đang chạy trên nhánh** thay vì kế thừa lời mô tả cũ. `SYSTEM.md` cần ghi 5 báo cáo và cách tính chính thức. Chỉ mục tại `docs/README.md` cần chỉ đúng A–O và nơi tra theo yêu cầu. Chi tiết kiểm thử thuộc `KIEM_THU_VA_NGHIEM_THU.md`. Bản ghi cũ trước 19/10 trong tài liệu này được giữ là **lịch sử**, không phải quy tắc hiện hành.

**Bằng chứng đã xác nhận ngày 19/10:**
- PR #3 mã nguồn kiểm thử tại commit `7a3a409e16b1b6621d121b09a57e9e7960c20568`; [CI run 39184896725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39184896725) kết luận **success**, 43 test files/350 unit tests PASS (2 files/20 test bỏ qua), 20 Firebase emulator tests PASS; TypeScript, build HTML và browser smoke PASS. Browser smoke có kiểm bấm tiêu đề sort, cột `Không phải trình` và mở/đóng dialog; **chưa đo FPS hoặc thời gian mở dialog trên dữ liệu/tài khoản/browser thật**.
- [Preview publish run 39185030924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185030924) PASS, ghim đúng artifact từ CI nêu trên và xuất HTML đồng nhất tại `preview/current/index.html` và `preview/ux-fixes-2026-10-19/index.html`. [Pages deployment run 39185044694](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185044694) PASS. HTML root `main:index.html` **không đổi** (blob `48aff33fdac08477e38c8f4d49837eb68eee0584`); PR #3 vẫn **chưa merge**, site chính giữ bản cũ.
- Các địa chỉ nghiệm thu: https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/ và https://cavoixanh638.github.io/HopHDND-WebApp/preview/ux-fixes-2026-10-19/ . Cùng chung backend Firebase production; **không** dùng thao tác lưu cấu hình/quyền, phê duyệt, khóa trên preview như một phép thử vô hại.
- Bản sao `main` trước phát hành: `backup/before-preview-ux-fixes-publish-2026-10-19` từ commit `7b96b23df929f6dacaa71a9e9d1d4e2b450f615b`; mã nguồn tính năng có checkpoint `backup/before-resize-sort-drilldown-2026-10-19`. Chỉ bản preview trên main được thay, không ghi Excel hay Firebase production bằng CI.

**Bốn phản hồi mới nhất — trạng thái thực tế:**
- F21: tay nắm kéo cột nguồn trong chế độ sửa, `ColumnResizeHandle` cập nhật DOM trực tiếp khi kéo; ghi layout khi thả chuột; CSS header đã trở lại `position:relative`. **Cần người dùng thử kéo thật và lưu Firebase**.
- F07/F09: cả năm bảng báo cáo có tay nắm cho cột nhóm/tổng/trạng thái/% trong chế độ chỉnh; `ReportConfig.columnWidths` lưu riêng; đã loại quy tắc CSS ép cột đầu cố định 230px. **Cần kiểm kích thước và persistence thật**.
- F13/F21: bấm tiêu đề cột hoặc icon gọn để sort ba trạng thái tăng/giảm/về nguồn; thao tác kéo tiêu đề đổi thứ tự và kéo ranh giới không đồng nghĩa click sort. Có regression Chrome mock. **Chưa nghiệm thu với browser của người dùng**.
- F06: bấm số đếm dương mở modal chi tiết, nút có ↗/hover/focus; `MemoReportTable`+`useCallback` tránh render lại bảng nền khi props giữ nguyên; tắt `backdrop-filter` của modal chi tiết. **Chưa có benchmark định lượng; chưa virtualize danh sách lớn**, không tuyên bố đã loại bỏ hoàn toàn lag.
- F02/F03/F04/F10: `build` có cột **Không phải trình** ngay sau Tổng số nội dung, H `Không phải trình xây dựng NQ` được tính trong mẫu số, không tính hoàn thành; 5 báo cáo mặc định và từ vựng trạng thái theo [từ điển](TU_DIEN_DU_LIEU.md).

**Sai khác còn tồn tại cần sửa/kiểm độc lập, không được đánh dấu PASS:**
1. `getKpis` trong `src/domain/reporting.ts` vẫn đếm KPI hoàn thành theo raw `Hoàn thành` trong khi báo cáo HĐND chuẩn hóa trạng thái `Đã trình HĐND thành phố`; có rủi ro KPI/báo cáo không nhất quán khi Excel thay giá trị. Chưa sửa mã ở lượt kiểm toán tài liệu.
2. Trải nghiệm danh sách chi tiết chưa đo trên Chrome thật với nhiều dòng; chưa có virtualization hoặc so sánh before/after ms/FPS.
3. Chưa đăng nhập admin thật và xác nhận lưu quyền/lưu bố cục trong Firebase production; Rules runtime và giao dịch từng phần phải nghiệm thu, không lấy Firebase emulator làm bằng chứng production.
4. Lịch sử chat archived không được cung cấp nguyên vẹn qua giao diện tìm kiếm hiện tại. Chỉ dẫn lịch sử truy xuất được gồm Excel A–O, trạng thái TBKL, 5 báo cáo, quản lý cột, tắt UI quyền ô, sort, layout 500/1500, font/màu, lưu tại chỗ, và lỗi mở chi tiết. **Không thể khẳng định đã bao phủ mọi phiên archived**.

**Phân vai file chuẩn:** [FEATURES](FEATURES.md) = đặc tả/tiêu chí, [SYSTEM](SYSTEM.md) = quy tắc nghiệp vụ, [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md) = Excel/schema, [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md) = thao tác, [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md) = chứng cứ/điều kiện chưa đạt, [VAN_HANH](VAN_HANH.md) = phát hành/rollback. Không tạo bản đặc tả thứ hai.

## Đang kiểm thử trên PR #3 — chỉnh độ rộng, sort và drill-down, 19/10/2026

- Điểm khôi phục trước khi sửa: commit `6bd9d5315f2c82f5fed14973fd74b0fd3fb682ae` trên nhánh tính năng và nhánh sao lưu `backup/before-resize-sort-drilldown-2026-10-19`. Chưa merge vào main hoặc phát hành ở URL root; bản preview đã phát hành sau đó, xem mục kiểm toán ở đầu tài liệu.
- Tại Danh sách dữ liệu, tay nắm ở mép phải tiêu đề cột hoạt động trong chế độ tùy chỉnh; có thể kéo chuột hoặc dùng phím mũi tên. Khi kéo, trình duyệt thay đổi chiều rộng trực tiếp; React chỉ nhận thay đổi cuối khi thả chuột, tránh cập nhật cả bảng trên từng pixel.
- Tại màn hình tùy chỉnh 5 bảng báo cáo, bổ sung tay nắm kéo cho cột phân nhóm, Tổng số nội dung, trạng thái và % hoàn thành. Độ rộng `columnWidths` thuộc riêng từng ID báo cáo, được kiểm tra 80–1200px và lưu cùng bố cục; cấu hình cũ không bị ép thêm thuộc tính rỗng.
- Nút sắp xếp bảng dữ liệu nằm trong header, mờ khi chưa áp dụng và luôn rõ khi đang sort; cho phép thao tác độc lập với tay nắm kéo.
- Click số đếm ở các cột trạng thái, tổng của từng đơn vị và tổng cuối bảng mở danh sách đúng tập nội dung; có biểu tượng ↗, con trỏ và trạng thái hover/focus. `MemoReportTable` với callback cố định tránh render lại năm bảng khi mở hộp chi tiết; hộp chi tiết tắt blur toàn màn hình. Chưa có benchmark FPS trực tiếp trên máy người dùng.
- Bảng Tiến độ trình HĐND xây dựng NQ hiển thị cột “Không phải trình” ngay sau Tổng số nội dung. Giá trị Excel “Không phải trình xây dựng NQ” được ánh xạ vào cột này và được tính trong mẫu số tỷ lệ hoàn thành; không tự đánh dấu hoàn thành. Dòng trống và báo cáo BC vẫn không thuộc phạm vi bảng này.
- CI đã PASS trên commit sau cùng (xem mục kiểm toán ở đầu tài liệu); vẫn cần kiểm trải nghiệm kéo chuột trên trình duyệt thật và lưu bố cục/quyền Firebase bằng tài khoản quản trị trước nghiệm thu.


## 19/10/2026 — Excel gốc đã sửa, CHỐT 5 báo cáo và quy tắc kết thúc

**Ghi chú có giá trị thay thế** các phần trước trong tài liệu này còn mô tả 3/4 bảng hoặc cột `TU đã cho ý kiến`.

- Đã đọc trực tiếp Google Drive XLSX `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx`, ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, modified `2026-10-18T17:41:48.954Z` (= 00:41:48 ngày 19/10 giờ VN). Tại phiên bản này, **0 ô G** còn `TU đã cho ý kiến`; **3 ô G** đã là `Đã có TBKL`. Danh mục Sheet2 cũng dùng `Đã có TBKL`.
- **5 báo cáo mặc định**, theo thứ tự: `party` (G: kết thúc = `Đã có TBKL`, KHÔNG có cột `TU đã cho ý kiến`), `build` (H: cuối = `Đã có QĐ chấp thuận`, cột `Đã trình HĐND, chưa có QĐ` được tô nhạt), `council` (tổng hợp NQ+BC từ I), `nq` (NQ từ I), `bc` (BC từ I).
- **Hai bảng NQ/BC và bảng tổng hợp** chỉ có 3 cột nguồn được hiển thị: `Sở chưa trình`, `VP đang thực hiện`, `Đã trình HĐND thành phố`. Tại file Excel hiện hành, giá trị hoàn thành cột I là `Hoàn thành`; trình đọc báo cáo chuyển thành **nhãn HIỂN THỊ** `Đã trình HĐND thành phố` theo yêu cầu người dùng. Không tạo cột `Hoàn thành` hay `Đã trình HĐND`; không sửa dữ liệu nguồn hoặc dropdown Excel.
- **Chống cột ảo**: một trạng thái nguồn bất thường được gom duy nhất vào cột kiểm tra `Chưa chuẩn hóa` (chỉ hiện khi thật sự có giá trị lạ), có ghi chú chỉ rõ giá trị gốc, KHÔNG được tính hoàn thành; không tự sinh tên cột theo từng giá trị khác ngoài danh mục. `TU đã cho ý kiến` phiên bản cũ nếu còn trong bộ nhớ tạm/nguồn chưa cập nhật cũng KHÔNG tự được hiểu là `Đã có TBKL`. Riêng tên cột/danh mục **cấu hình đã lưu** được di trú sang tên mới, không chạm ô nguồn.
- Cấu hình 3, 4, 5 báo cáo đời trước được nâng cấp thành 5 báo cáo, thêm ID còn thiếu vào vị trí chuẩn trong thứ tự đã lưu; bỏ cột `Sở xin rút` không thuộc các báo cáo hiện tại, gộp `Đã trình HĐND` + `Hoàn thành` của cấu hình thành một cột hiển thị `Đã trình HĐND thành phố`, và thay `TU đã cho ý kiến` thành `Đã có TBKL` ở **cấu hình**, giữ font, kích thước, ẩn/hiện và báo cáo tùy chỉnh.
- **Tập trung thị giác**: Bảng 1 giữ màu rõ tại `Sở chưa trình`, `VP đang thực hiện`, `Đã có TBKL`; tô nhạt 3 cột giữa; bảng xây dựng NQ tô nhạt `Đã trình HĐND, chưa có QĐ`; kích cỡ/font áp dụng cả tên bảng. Bảo toàn cả 5 cách tô màu và chế độ in.
- Bản khôi phục trước đợt sửa `backup/before-excel-grounded-five-reports-2026-10-19` tại `a7aab02982b1d8f226f0549cc5e3b7916210657b`. Chỉ thay mã trên PR #3 Draft; **không merge**, không ghi Sheets/Firebase production, không đổi `main:index.html`. Phát hành preview chỉ sau khi kiểm thử CI đúng commit, đối chiếu hash artifact, triển khai Pages thành công.



## 18/10/2026 — Bốn bảng báo cáo, bỏ nhãn phụ, cột giữa nhẹ hơn

- Đã đối chiếu `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx`, tab `Các nội dung trình HĐND`, cột H `Tiến độ trình HĐND xây dựng NQ`. Dữ liệu 53 nội dung: 15 ô `Không phải trình xây dựng NQ` và 38 hồ sơ xây dựng NQ (22 Sở chưa trình, 5 VP đang thực hiện, 1 Đã trình HĐND, chưa có QĐ, 10 Đã có QĐ chấp thuận). Chỉ trạng thái cuối là hoàn thành. Đây là phạm vi thống kê tham khảo từ bản Excel đọc 18/10, không phải số cứng trong ứng dụng.
- Chèn cấu hình `id: build` trước `nq`. Bốn bảng mặc định: `party` (G), `build` (H), `nq` (I), `bc` (I). Bảng mới lọc `documentKind==='NQ'` và H có trạng thái áp dụng, không tính `Không phải trình xây dựng NQ` hoặc H trống. Báo cáo cũ không đổi phạm vi, nguồn và tỷ lệ.
- `validateReportLayout` nâng cấp chỉ bộ ba ID cũ `party,nq,bc` thành bốn, chèn trước `nq` trong thứ tự đã lưu; bảo toàn tiêu đề tùy chỉnh, ẩn/hiện, thứ tự và ẩn cột, font/cỡ chữ, độ rộng. Shared-config/Firebase đọc qua bộ kiểm tra này. Cấu hình lạ, thiếu hoặc trùng vẫn bị từ chối.
- Xóa dòng nhãn viết hoa `report-section-kicker` ở đầu **mọi** bảng; chỉ tên bảng cùng dòng thống kê số lượng/% và nút In/PDF. Giảm màu nền trung gian `office-bg` từ `#FFE8B8` xuống `#FFF5E8`, `next-bg` từ `#DCEBFD` xuống `#F3F8FE`, viền nhạt đi cùng; giữ chữ đủ tương phản WCAG AA. Màu nhấn Sở chưa trình, Tổng số, trạng thái hoàn thành và % không bị đổi.
- Mốc trước sửa: `backup/before-four-report-build-table-and-lighter-stages-2026-10-18` tại `0f6f158938d7d9cd87ac0b74949a819cdcfcaf98`. Test hồi quy cho 4 bảng, điều kiện lọc H, đọc profile 3 bảng cũ từ local/shared-config, bỏ nhãn phụ và màu nhạt. Chỉ phát hành preview từ artifact CI exact SHA đã PASS; không merge PR, không ghi dữ liệu Google Sheets/Firebase thật, không thay `main:index.html`.



## 18/10/2026 — Chuẩn hóa nguồn Excel và font của bảng báo cáo

- Đã đọc **trực tiếp** file Google Drive `Tổng hợp các ND kỳ thường lệ cuối năm 2026.xlsx` (ID `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`; metadata phiên bản kiểm tra modified `2026-10-18T15:05:49.510Z`). Tab `Các nội dung trình HĐND`: 15 cột A–O, 53 dòng nội dung; J=Chuyên viên VPUB, K=Phòng chuyên môn, G=Tiến độ xin ý kiến Thành ủy. Tab `Sheet2` là danh mục trạng thái hiển thị dấu phẩy chuẩn.
- Bảng 1 dùng `TU đã cho ý kiến` làm mốc hoàn thành (thay `Đã báo cáo TU`), giữ đúng `ĐU đã gửi TU, chưa họp`, `Đã họp, chưa có TBKL`, `Đã họp/xin phiếu, chưa có TBKL`, `Đã có TBKL`; alias dữ liệu và cấu hình cũ được chuẩn hóa khi hiển thị/đọc, không đổi Google Sheets. Bảng nghị quyết/báo cáo đổi tên theo nhánh `Tiến độ trình HĐND ban hành NQ/BC`. Cấu hình cá nhân có tên tùy chỉnh không bị ghi đè; bản tên mặc định cũ được nâng cấp khi hợp lệ.
- Trên **cả ba bảng**, cột `Tổng số nội dung` nằm ngay sau cột nhóm, trước `Sở chưa trình`, áp dụng đồng thời cho tiêu đề, từng dòng, tổng cuối, `colgroup` và xem trước, không đổi dữ liệu tính toán.
- Đối chiếu J/K: 29 chuyên viên / 7 phòng trong 53 dòng nguồn. `mergeCatalogItems` ưu tiên quan hệ đã quan sát trực tiếp từ dữ liệu đang đọc đối với đúng chuyên viên đó; giữ các quan hệ thủ công không có bằng chứng Excel mới, không tự ghi cấu hình production. `Nạp lại từ dữ liệu` trong màn danh mục vẫn có thể tái tạo quan hệ bằng nguồn hiện hành khi quản trị chủ động lưu.
- **Font:** Trước sửa 10 lựa chọn chỉ là CSS font stack, KHÔNG nhúng font. Giờ 6 font mở Inter, Roboto, Open Sans, Lato, Noto Sans, IBM Plex Sans tải từ Google Fonts nếu có Internet; 4 lựa chọn hệ thống Apple/System UI, Segoe UI, Helvetica Neue, Arial dùng font OS hoặc fallback, không copy/font license thương mại. Khi offline/chặn Google Fonts, những font mở cũng fallback; **không** gọi đây là font nhúng nội tuyến/offline. Trạng thái font cần thử browser người dùng thực tế.
- Đã tạo backup code trước sửa `backup/before-excel-report-totals-relationships-fonts-2026-10-18` tại `9a9ca94ae3788bf719e1286decfe7e1d355702cf`. Regression tests cho thứ tự cột, % hoàn thành, migration profile, đúng dấu phẩy, quan hệ chuyên viên–phòng, yêu cầu web font. Kết quả CI phải đối chiếu exact SHA trước khi phát hành bản preview.
- **Phạm vi:** PR #3 vẫn Draft; không merge, không sửa `main:index.html` production, không thay đổi Sheets/Firebase thật. Phát hành chỉ `preview/current` qua artifact CI đã xác minh, rồi người dùng nghiệm thu.



## 18/10/2026 — 5 phong cách tô màu bảng (theo ảnh tham khảo người dùng)

- Nghiên cứu mẫu nhãn/badge, full-cell fills, edge rails, in-cell data bars và solid header bands; tham chiếu Carbon (status indicators, data tables) cùng nguyên tắc không chỉ dùng màu để diễn tả trạng thái.
- **Đã code trên PR #3**: 5 tùy chọn độc lập gồm `classic` = Phủ màu toàn ô (giữ hướng hiện tại), `signal` = Nhãn màu nổi (giống ảnh), `compact` = Viền màu phân cột, `bars` = Thanh dữ liệu theo số lớn nhất *trong từng cột trạng thái*, `band` = Dải tiêu đề màu. Đây là 5 **cách thể hiện** khác nhau, không phải chỉ 5 mức độ đậm nhạt; màu đỏ/cam/xanh dương/xanh lá/tím/xám giữ nghĩa nhất quán. Ô trống không vẽ thanh dữ liệu. Lưu kiểu `signal/classic/compact` cũ vẫn hợp lệ, nay ánh xạ vào ba phong cách đầu (không xóa profile cũ).
- `ReportLayoutPanel` có mini-preview minh họa từng phong cách; các bảng báo cáo trong phần chỉnh sửa đổi trực tiếp theo nháp, chỉ cập nhật cấu hình dùng chung sau Lưu. Cỡ chữ/font 10 lựa chọn và logic tính % vẫn tách biệt, không thay đổi nguồn Google Sheets/Firebase.
- `ReportTable` dùng đúng class trạng thái cho tiêu đề/ô dữ liệu/tổng, số liệu trong badge hoặc data bar tùy phong cách. In PDF giữ class phong cách, CSS variables font, và màu tiêu đề riêng. Các chỉ số vẫn là số đếm từng trạng thái và tỷ lệ hoàn thành giai đoạn cuối; màu không khẳng định quá hạn.
- Kiểm thử mở rộng `reporting.test.ts`, `report-style-css.test.ts`: 5 radio, tính nhất quán số liệu/kích thước bảng, tỷ lệ thanh theo max trong *cùng cột*, ô 0 không có thanh, 6 trạng thái có tương phản chữ/nền ít nhất 4,5:1 và dải tiêu đề chữ trắng trên màu đậm. Chỉ ghi PASS khi có workflow verify-source exact commit; chưa nghiệm thu màu bằng ảnh người dùng trên browser thật.
- Trước mọi sửa đã tạo mốc `backup/before-five-report-color-styles-2026-10-18` từ `68b82fff581709ee8a7e521bc3cb345c41771b4d`. Không merge PR #3, không tự ghi dữ liệu/Rules Firebase production hay Excel. Phải phát hành lại `preview/current` riêng và kiểm chứng browser trước khi báo đã hiển thị trên trang dùng thử.



## 18/10/2026 — Rà soát còn dang dở: màu và cỡ chữ Bảng báo cáo

- Trên PR #3 (Draft), mã đã có ba phương án **chỉ khác màu** (`classic`, `signal`, `compact`), một nhóm trạng thái dùng chung màu cho tiêu đề/ô dữ liệu/tổng/nhãn thống kê, cột phần trăm, 10 lựa chọn font hệ thống/hiện đại và cỡ chữ 11–20 px. Các nhóm trạng thái chỉ diễn tả mức cần chú ý, không tự suy hồ sơ quá hạn.
- Rà soát tiếp phát hiện CSS cũ cố định `th` = 12px, khiến thay đổi cỡ chữ chưa ảnh hưởng hàng tiêu đề và cột đầu dù ô số đã đổi. Sửa `source/src/styles/app.css` để mọi `th` kế thừa cỡ chữ đã chọn. Tạo `source/tests/report-style-css.test.ts` để kiểm tra font toàn bảng, thống nhất màu cùng trạng thái, mức tương phản chữ/nền tối thiểu 4.5:1 và ba palette không đổi bố cục.
- Mốc khôi phục code trước sửa: `backup/before-report-font-complete-2026-10-18` tại `5546f1955cf5ee9cbf4acbdf13a567d257b129c1`. Hai commit: `f2cb870bb3b432d6801fa0187f2451642846fa8e` (CSS) và `45c870d8e30e56902fe898a0aaa99c43974d33be` (tests). Kết quả CI cho commit mới cần xác minh bằng GitHub Actions; chưa tuyên bố chạy trình duyệt thực tế.
- **Chỉ thay mã trên nhánh PR #3**: không merge, không ghi Google Sheets/Firebase production, không chỉnh `main:index.html`. Vẫn cần nghiệm thu bản preview bằng Chrome, kiểm tra quyền admin lưu bố cục thực (nếu chủ tài khoản chủ động thử) và xác nhận font thiếu trên máy dùng fallback thích hợp.


## Firebase Rules production — người quản trị xác nhận Publish (16/10/2026)

- Người quản trị **đã báo hoàn thành thao tác Publish** trên Firebase Console sau khi nhận file `source/firebase/database.production-candidate.rules.json` và hướng dẫn `FIREBASE_PRODUCTION_RULES_MIGRATION.md`.
- Đây là **xác nhận từ người quản trị**, không phải kết quả kiểm tra trực tiếp Firebase server: GitHub connector chỉ đọc mã/CI, không có kết nối xác thực Firebase để đối chiếu Rules version hoặc kiểm tra bằng tài khoản Google thật.
- [GitHub Actions PASS SHA 4cc657b6474de22bff932d94bdc02bc386eb2114](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38844347387), trong đó production-candidate Firebase emulator xác nhận admin vẫn được sửa, guest không ghi được khi khóa, mở khóa trở lại có thể sửa, mốc duyệt chỉ admin đọc/ghi.
- **PR #3 vẫn DRAFT; `main` và GitHub Pages chưa phát hành mã mới**, nên các nút Phê duyệt và Khóa sửa chưa xuất hiện trên website hiện tại. Không có bằng chứng đã xác minh 51 dòng, luồng admin login, phê duyệt trực tiếp và phân quyền khách trên bản phát hành.
- Trước khi công bố chức năng mới: xác minh Firebase Rules hiện có đúng file đã Publish, giữ bản sao Rules cũ; thử bằng tài khoản thật và trình duyệt để nghiệm thu; chỉ merge khi đạt. Nếu cần triển khai để thử trên Pages, xem xét preview tách khỏi URL production hoặc rollout có kế hoạch rollback.


## PR #3 — mở rộng tùy chỉnh và kiểm soát phê duyệt (16/10/2026)

- Yêu cầu đã chốt: lưu nhiều mẫu giao diện cá nhân; màu theo điều kiện; bộ lọc riêng từng cột kèm dấu hiệu lọc đang áp dụng; admin so sánh thay đổi kể từ mốc phê duyệt và phê duyệt mốc mới; admin khóa chế độ sửa thử của tài khoản khác trên WebApp. **Không tạo thêm bộ thống kê theo phòng/chuyên viên/lãnh đạo**, vì các bảng ban đầu đã hỗ trợ phân nhóm và thống kê này.
- Đã tạo nhánh sao lưu bất biến ở commit `6d2226467d83e518f793d5c5e97eb11b29ba2def`: `backup/pre-features-2026-10-16`. Phát triển trên `feat/saved-views-approval-lock-filters-2026-10-16`, PR #3 **draft**. Đường rollback này chỉ cho **code**, không phải dữ liệu.
- Đã commit nguồn cho UI mẫu giao diện, lọc từng cột, quy tắc màu, backend Firebase có CAS cho trạng thái khóa và mốc phê duyệt, trang admin xem thay đổi, cùng các regression tests. Các mẫu/màu cá nhân dùng localStorage; mốc duyệt lưu Firebase `hdndReviews` chỉ admin được đọc/ghi; `hdnd/control` là trạng thái khóa cho người xem đã xác thực.
- **Chưa merge main, chưa phát hành Pages, chưa deploy Firebase Rules production, chưa kiểm nghiệm UI trên browser người dùng.** Kết quả CI chính thức phải đối chiếu theo exact PR HEAD và Actions; không gọi production PASS. Không tự chỉnh sửa Google Sheets hoặc Firebase production trong lượt này.
- Phân biệt rõ: khóa WebApp chỉ chặn chỉnh sửa thử trong UI; **không** khóa nhập trực tiếp trên Google Sheets. Các dòng Sheets thiếu/trùng mã hoặc bị sắp xếp đòi hỏi rà soát ánh xạ tại màn hình duyệt.



## Trang GitHub Pages bản sửa 16/10/2026 — code đã triển khai, trình duyệt người dùng chưa nghiệm thu

- [PR #1](https://github.com/cavoixanh638/HopHDND-WebApp/pull/1) đã merge vào `main` tại commit `e2c59b9bb1fd79cd2c577ac309eaab86eb7f1e0e`; workflow [build và publish](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778740465) đạt, tự thay `index.html` ở gốc (blob `8d334e5d005f6420e00fcb36641489156778bce0`); [GitHub Pages deploy](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778852907) báo **success**. Đây là bằng chứng cập nhật artifact/hạ tầng, **chưa** phải xác nhận màn hình người dùng đã đọc 51 dòng.
- UI có nhãn `0.7.0 · Sửa 16/10`, nút chọn lại nguồn Sheets mặc định và GID đang đọc, cho vào tùy chỉnh danh sách ngay cả khi 0 dòng; quản trị mở màn hình quyền theo cột/dòng/ô trực quan tại Danh sách. Trang tài khoản Firebase chỉ phục vụ xác thực. Quyền theo dòng/ô có cảnh báo rủi ro ID vị trí và yêu cầu xác nhận trước khi lưu.
- [CI PR](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/38778566739) đạt: **212 unit tests, 12 emulator tests**, typecheck, docs check và build Pages. Một probe HTTP **chỉ đọc** trên GitHub runner nhận GViz `status=ok`, HTTP 200 và khoảng 53 hàng trong phản hồi tại gid `60961344` (bao gồm tiêu đề/nhóm, không phải 53 nội dung); không chứng minh truy cập bằng browser người dùng. **Vẫn cần xác nhận thực tế Pages hiển thị 51 nội dung, login admin, quyền và cơ chế lưu cấu hình**. Không đổi Rules production hay dữ liệu nguồn.
- Workflow mới nằm tại `.github/workflows/{verify-source,publish-pages}.yml` và tự phát hành HTML từ source khi thay đổi `main`; **không** tự đồng bộ thư mục local Google Drive/Windows.


> **Bản sao GitHub:** một số ảnh bằng chứng trong tài liệu lịch sử chưa được đồng bộ vào `docs/assets/`. Tên tệp được giữ để tra cứu trên bản lưu gốc; không xem đường dẫn này là ảnh có sẵn hoặc bằng chứng đã kiểm trên website.

## Cập nhật tài liệu và tình trạng Pages được báo cáo — 16/10/2026

- Repository GitHub [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp) có **một `index.html` ở gốc** để Pages phục vụ và **mã nguồn ở `source/`**. Đây là bản nhập mã từ dự án Drive/Windows, **không tự đồng bộ** các thay đổi sau này. Có commit cập nhật `index.html` bản build 0.7.0; việc commit thành công **không đồng nghĩa** đã nghiệm thu website.
- Người dùng đã phản ánh **Pages vẫn hiển thị 0 dòng**, **chế độ tùy chỉnh danh sách chưa mở được**, và **quyền ô chỉnh sửa vẫn ở màn hình riêng thay vì trực quan ngay trong Danh sách**. Đây là lỗi/tồn tại chưa được xác minh đã khắc phục; không dùng kết quả thử local 51 dòng để ghi production PASS. Chưa xác nhận bộ Firebase Rules mới đã được áp dụng trên môi trường thật.
- Đã bổ sung hai nguồn tài liệu chuẩn [VAN_HANH](VAN_HANH.md) và [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md). [docs/README](README.md) quy định phần gộp để tránh trùng lặp: code rollback và data restore là hai việc riêng trong một tài liệu vận hành. Cập nhật tài liệu **không** sửa mã ứng dụng, không deploy Rules, không sửa nguồn Excel.
- Việc kế tiếp ở mã ứng dụng: chẩn đoán Pages đọc 0 dòng từ GViz, sửa quyền vào chế độ tùy chỉnh khi dữ liệu đang trống, và tích hợp cấp quyền ô/dòng/cột trực tiếp vào bảng. Chỉ chuyển sang trạng thái PASS sau kiểm trình duyệt Pages và test đúng quyền.



## Pages 0.7.0 — đã sửa nguồn Sheets và thống nhất quản trị, 15/10/2026 21:58

Chỉ đạo hiện hành thay cho thiết kế Firebase-only ở mốc lịch sử bên dưới: **Google Sheets vẫn là nguồn chính**. Pages khởi tạo SheetsRepository/GViz theo link/gid đã chọn, tái sử dụng parser A–P, đọc lại thủ công và polling 60 giây khi tab hiển thị/không có nháp. Không đọc `hdnd/items` làm dữ liệu hiển thị, không cần import dòng hoặc đồng bộ Sheets → Firebase. Firebase lỗi/đăng nhập chưa xong không chặn Sheets tải.

Firebase Authentication giữ nguyên Anonymous/Google. Google verified `cavoixanh638@gmail.com` là quản trị; mọi lưu bố trí danh sách/báo cáo, danh mục, giá trị lựa chọn và JSON profile đi qua cùng `hdnd/profile`; quyền ô/dòng/cột qua `hdnd/permissions`. UI quyết định quyền từ Firebase controller, độc lập loại nguồn Sheets. Có chặn lưu khi chưa tải baseline, xung đột revision, lưu trùng và thay đổi danh tính. Đọc lại cấu hình thực sự đọc profile/permissions. Khách không có đường lưu cấu hình chung qua Google bridge/local fallback. Quyền cell → row → column → deny, ID/STT chỉ đọc. Rules cho phép quyền riêng theo recordId Sheets mà không import dòng RTDB. IDs legacy theo vị trí hàng nên phải rà quyền riêng khi chèn/sắp hàng; chưa tự chuyển sang ID ổn định.

Sửa nội dung trên Pages là **nháp thử cục bộ**; báo cáo/KPI/xuất lấy snapshot Sheets. Không gửi nháp vào Firebase hoặc Sheets; nhập Excel ghi dữ liệu khóa. Rules local khóa mọi ghi `hdnd/items` cho cả admin và khách. Giữ FirebaseRepository/interface Repository cho chuyển đổi sau khi người dùng quyết định; các regression ghi adapter tương lai chạy nhánh `hdnd-test/items` chỉ có trong fixture emulator, không xuất hiện trong Rules phát hành. Luna rà luồng Sheets và cập nhật tài liệu Pages/FEATURES; parent sửa tích hợp, Rules và kiểm thử.

Bằng chứng kiểm local: `npm test` **209 passed, 12 emulator tests skipped**; `npm run test:firebase` **12 passed** riêng (tổng **221** kiểm đã chạy), gồm token khách/provider giả/email sai/chưa verified, gọi thẳng config và multi-location update bị chặn, admin lưu quyền dòng/ô cho Sheets không có items, stale revision và khóa ghi dữ liệu chính. 9 regression giao dịch tương lai giữ ở nhánh thử cô lập. Hai bộ mới gồm 6 kiểm App tích hợp Sheets thực sự qua GViz callback/parser và 7 kiểm Firebase controller/policy (quyền độc lập nguồn, fail closed, baseline, refresh, logout, khóa lưu trùng). Fake test không thay nghiệm thu OAuth thật.

UI trên **HTML pages-test đã build**, Auth/RTDB chỉ trỏ emulator `demo-hdnd`: lúc21:53 đọc **51 dòng trực tiếp từ GViz nguồn mặc định**, tự đọc tiếp lúc21:54; menu khách khóa báo cáo/danh mục, bố trí cột/khung và nút lưu chung disabled. Sửa thử Nội dung NQ01 bằng chuỗi mẫu trong popup rồi Áp dụng chỉ tạo 1 nháp, checkpoint local; Đọc lại khi có nháp giữ nguyên phần sửa. Console ứng dụng không error/warn. Kiểm emulator sau thao tác: `itemsPresent=false, profilePresent=false, testPermissionsPresent=true`. Không ghi Google Sheets hoặc Firebase thật. Ảnh nháp khách (tệp chưa đồng bộ: `assets/sheets-guest-draft-0.7.0.png`). UI được kiểm trước chỉnh thêm câu giải thích popup và ẩn lựa chọn mẫu của legacy trên panel nguồn Pages; các sửa lời giải thích đó được typecheck/test/build lại.

`typecheck`, `build` legacy, `build:pages`, `build:pages:test` và `docs:check` đạt. Đầu ra duy nhất **dist-pages/index.html 892.064 bytes; gzip277.210 bytes**; build thử891.952bytes/gzip277.115bytes; legacy161.963bytes/gzip47.061bytes. Bundle Pages vẫn giữ một HTML tự chứa, có cảnh báo kích thước chunk >500kB dự kiến cho gói SDK/Excel.

**Chưa push, deploy Pages/Rules, đổi Auth/domain hoặc ghi dữ liệu thật.** Rules ở repo là bản đã kiểm emulator, chưa xác minh/áp dụng lên Firebase đang chạy. Chưa kiểm lại Google OAuth thật trên hostname Pages hoặc tải nhiều người. GViz cần quyền đọc nguồn; đăng nhập quản trị Firebase không cấp OAuth cho Sheets riêng tư. Xem [hướng dẫn Pages](FIREBASE_PAGES.md), [API](API.md).


## Mốc lịch sử Firebase-only 0.7.0 — đã được thay bằng quyết định Sheets ở trên

Theo yêu cầu mới đã duyệt, bản GitHub Pages dùng Firebase RTDB `hophdnd-8b7b2` thay nguồn Sheets; không có backend riêng. Giữ các thành phần giao diện, báo cáo/KPI/chi tiết/in, tìm/lọc, dropdown/search chuyên viên, popup Nội dung/Ghi chú, danh mục/quan hệ và chỉnh khung/cột hiện có. `pages.html` → `src/pages-main.tsx` cung cấp Firebase cho App; entry Google/HTML cũ vẫn tồn tại. Main Google đang triển khai vẫn 0.6.2/v6, chưa cập nhật cloud.

FirebaseRepository dùng listener trực tiếp và transaction từng dòng theo recordId, kiểm baseline từng trường; sửa khác ô ghép được, cùng ô phát hiện xung đột và giữ phần nhập. Tự lưu sau 800 ms khi đã chọn dropdown hoặc Áp dụng popup; không gửi từng phím trong popup. Cho nhập tiếp khi một lượt đang lưu, xác nhận B không xóa C mới nhập; chỉ xóa phần đã được Firebase xác nhận. Lỗi không tự lặp vô hạn. Phần chưa xác nhận được checkpoint cục bộ; SDK web không thay thế lưu bền sau khi đóng trang. ID/STT/mã không đổi; history 50 lượt gần nhất/dòng. Chuyên viên–phòng vẫn kiểm tại client trước ghi.

Quyền được thực thi bởi [Database Rules](../firebase/database.rules.json): đọc cần Firebase Auth; khách ẩn danh sửa các trường/cell được cho phép; mặc định chưa cấp quyền là khóa. Quản trị phải có email Google `cavoixanh638@gmail.com`, email_verified và provider google.com; chỉ quản trị đổi permissions/profile và nhập dòng. Bố trí/danh mục lưu `{revision,payload}` JSON để tên chứa dấu chấm/gạch chéo không thành key RTDB. Rules đã kiểm local; chưa áp dụng Firebase thật, chưa bật provider hoặc đổi domain thật. Định danh khách là UID ẩn danh, không phải danh tính người thật.

Import/Export Excel được bổ sung (bản mới trước đó chưa có): xuất `.xlsx` các dòng đã lưu; nhập mẫu chuẩn của app, xem trước, admin xác nhận thêm dòng mới, trùng ID/mã thì từ chối; không âm thầm ghi đè hoặc đọc workbook legacy. Có nhập/xuất JSON danh mục/bố trí. Đây là F25/F26 tối thiểu, chưa phải đầy đủ lịch sử/backup/mapping Excel cũ của đặc tả.

Bằng chứng: `npm test` **196 passed, 9 emulator tests skipped**; 9 kiểm thử emulator chạy riêng đều **passed** (205 phép kiểm đạt khi tính hai lượt), gồm quyền admin/khách và provider giả, cell deny, client bypass, same-cell conflict, different-cell merge, realtime, mất mạng/kết nối lại, replay, add-only import, profile JSON và ring history qua 52 lần lưu. Hai hook tests kiểm A→B→C khi đang lưu và debounce/lỗi không lặp. `npm run typecheck`, `npm run build`, `npm run build:pages`, `npm run build:pages:test` đạt. Pages output **895.296 byte; gzip 278.445 byte**, đúng một `dist-pages/index.html`, không phụ thuộc file JS/CSS cạnh nó; cần Internet cho Firebase/Auth. Legacy output159.897 byte/gzip46.598byte; Firebase SDK/Excel không bị ghép vào bundle legacy.

UI trình duyệt đã chạy **HTML đã build cho emulator**: đăng nhập ẩn danh, tải 3 dòng giả, ô NQ02 bị khóa riêng, cảnh báo đóng popup chưa áp dụng, tự lưu báo máy chủ xác nhận, tab thứ hai thấy ngay mà không F5; không có console error/warn trước lần thử Google popup. Nút xuất tải được `HDND_du_lieu.xlsx`, đọc lại đúng3 dòng và nội dung vừa sửa. Ảnh tự lưu (tệp chưa đồng bộ: `assets/firebase-autosave-0.7.0.png`). Google popup trong IAB đã mở yêu cầu nhưng chưa hoàn tất; quyền Google được kiểm bằng token emulator, chưa nghiệm thu OAuth thật trên GitHub Pages. Không coi kiểm local là đã kết nối dữ liệu Firebase thật hoặc đã đo tải50 người.

`npm audit --omit=dev`:0 cảnh báo. Bộ công cụ dev Firebase CLI còn7 cảnh báo (3high/4moderate); không nằm trong HTML phát hành. Đã vá gRPC gián tiếp qua override1.14.6, không hạ Firebase SDK. Chưa push/commit, chưa tạo repository/workflow, chưa deploy Pages, chưa đọc/ghi dữ liệu RTDB thật, không chuyển nguồn Excel sản xuất. [Hướng dẫn setup và giới hạn](FIREBASE_PAGES.md).

## Đã phát hành 0.6.2 trên app Google chính — 15/10/2026

Người dùng đã duyệt “Cho phép thử rồi cập nhật app chính”, sau đó tự cấp quyền Google cho app chính. UI riêng trên bản sao đạt và bản sao đã khôi phục đúng bytes như bằng chứng bên dưới. Đã nạp gói kích hoạt vào dự án chính 1ZVs…; USER_ACCESSING/MYSELF giữ nguyên. Lần đầu gặp HTTP403 accessNotConfigured tại Drive About; bổ sung advanced Drive v2 trong manifest để bật API của default Cloud project, giữ nguyên ba OAuth scopes đã duyệt. prepareDashboardExcelStorage chạy thành công11:29, tạo kho sao lưu/nhật ký riêng và registry nguồn gốc; không PUT workbook.

Kiểm chỉ đọc11:30:08 xác nhận backendReady=true, actor=phucpixel2025@gmail.com, count51, warnings0, configRevision12. Ảnh kết nối (tệp chưa đồng bộ: `assets/main-excel-connection-pass-0.6.2.png`). Cập nhật deployment hiện hữu thành **Version6 lúc11:31, app0.6.2**, giữ [link /exec chính](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec). Phiên vừa deploy đầu tiên có RPC trạng thái báo function not found; sau khi Google hoàn tất cập nhật và mở lại11:34, UI hiển thị đúng tài khoản,51 nội dung, cấu hình12 và “Đã kết nối lưu app → Excel. Chỉ báo đã lưu sau khi đọc lại file xác nhận.” Ảnh app chính (tệp chưa đồng bộ: `assets/main-excel-ready-0.6.2.png`). Không đổi chia sẻ app/kho. Chưa gửi lệnh ghi dữ liệu vào nguồn thật; bằng chứng ghi/đọc lại thuộc bản sao thử.

Người dùng mở link Google → ⚙ → Vào chế độ tùy chỉnh danh sách → sửa ô → Lưu dữ liệu vào Excel. Chưa tự gửi phần sửa NQ01 cũ của người dùng. HTML độc lập vẫn không có cầu Google RPC; phần sửa giữ tại browser của HTML không tự chuyển sang Google.191 tests/24files, typecheck, build:server và kiểm tài liệu đạt; HTML149.008byte/gzip43.601byte. F31 vẫn còn các phần thêm/xóa/nhập hàng loạt, xử lý conflict/phục hồi, bảo trì nhật ký/quota và nghiệm thu nhiều người.

## Rà thiết kế PA1/PA2 — đề xuất chưa triển khai

Đã rà hai đánh giá người dùng gửi và mã batch mẫu, đối chiếu tài liệu chính thức về RPC, quota, batch, trigger, quyền script và phục vụ HTML từ Drive. Parent tổng hợp thiết kế tại ARCHITECTURE revision1.15; Luna bổ sung kế hoạch1.18 mục18.15 và README. Đã ghi các lỗi fallback tọa độ/ID trùng, thiếu baseline/allowlist, queue/race/lost pending, bỏ qua kết quả từng ô, polling trả muộn và header innerHTML. Nhu cầu đồng bộ hai chiều đã có trong chỉ đạo cũ. Đọc HTML từ Drive qua HtmlService vẫn cần mở link webapp Google; không coi đó là đường ghi từ file HTML độc lập.

Chỉ cập nhật tài liệu đề xuất. Chưa chuyển Excel thành Sheets, chưa chọn phương án hosting/xác thực mới hoặc bật tự lưu; không đổi code, app0.6.2/deployment6, quyền và file nguồn. Việc đổi nguồn/link, cấu hình hoặc phát hành tiếp vẫn cần quyết định cụ thể; không suy từ phần đánh giá này.

## Mốc chuẩn bị và kiểm bản sao 0.6.2 — lịch sử trước kích hoạt

**Đã kiểm UI Google trên bản sao riêng; người dùng đã duyệt tiếp tục cập nhật app chính. Các module main đang upload, chưa có Google consent/registry hoặc phát hành.** Không dùng nguồn thật và không đụng kho cấu hình. UI /dev ngày15/10 10:55 đổi Chuyên viên từ Trương Việt Hải sang Nguyễn Văn Kỳ tại mục “công nghiệp sinh thái” (UI hiện NQ37), báo “Đã lưu 1 nội dung vào Excel và đọc lại xác nhận”; đọc lại khớp và pending hết. Sau callback lỗi với phản hồi object dù file đã ghi, RPC save trả JSON string và adapter parse/validate; phản hồi JSON hỏng bị từ chối, giữ nháp. Bản sao được khôi phục có điều kiện lúc10:56:18, ETag/hash pass. Ảnh UI lưu/đọc lại (tệp chưa đồng bộ: `assets/ui-excel-save-pass-0.6.2.png`), ảnh khôi phục (tệp chưa đồng bộ: `assets/ui-excel-restore-pass-0.6.2.png`). Bằng chứng chỉ thuộc UI thử /dev và bản sao; chưa xác nhận app chính.

- ExcelRepository nối các RPC đọc/lưu/lịch sử; sourceKind tách khỏi readOnly nên Google ghi được vẫn dùng vùng lưu và nhãn nguồn Google. App chọn adapter lúc mở từ cấu hình server; không thay adapter giữa lúc sửa. Chỉ xóa phần sửa khi đúng phản hồi dòng và các giá trị đổi.
- Server có codec canonical, transaction engine và Drive transport: tìm mã gốc duy nhất, kiểm baseline, backup bytes trước ghi, receipt/operationId, PUT If-Match và đọc blob xác nhận. Chỉ mục ID/hash nhỏ ở Script Properties, nội dung nhật ký trong thư mục Drive riêng; không trộn dữ liệu dòng vào kho danh mục/bố trí. Mất phản hồi đọc đúng hash thì xác nhận; chưa rõ thì giữ phần sửa, không tự gửi lại. Chặn thiếu/trùng mã, ID/STT, công thức và nguồn không đăng ký.
- Sửa data-only không gọi lưu bố trí không đổi. Nhãn Lưu dữ liệu vào Excel chỉ chiều app→Excel; đọc lại là Google→app. Google text được trim theo parser trước khi tạo patch. Quan hệ chuyên viên–phòng kiểm khi thay phân công, không ép đổi phân công cũ lúc sửa văn bản.
- Main chưa có Google consent/registry, chưa kích hoạt hoặc phát hành writer. Gói riêng server/dist-test chỉ nhận bản sao19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7, Google USER_ACCESSING/MYSELF; không nối kho cấu hình thật. Bằng chứng UI lưu/đọc lại ở trên là từ UI thử /dev, không phải app chính.

Kiểm local: **189 tests/24files**, typecheck và build đạt. HTML149.008byte/gzip43.601byte; không thêm dependency. Fake transport chạy real codec/parser/engine cùng nhau; test còn chặn JSON string malformed và giữ phần sửa khi phản hồi chưa xác nhận. RPC save dùng JSON string qua callback Google và adapter parse/validate kết quả. Fake test không thay phép UI Google; UI được kiểm riêng trên bản sao như trên. Đây **không phải** ghi NQ01 nguồn thật.

Hợp đồng mới: [API](API.md); triển khai theo [kế hoạch mục18.14](KE_HOACH_VIET_LAI.md#1814-tích-hợp-062--kế-hoạch-117). Còn kiểm công thức/cache/quota/nhiều người và các phần đầy đủ của F31. User đã duyệt tiếp tục cập nhật main sau bản thử; phần upload hiện tại chưa đồng nghĩa consent Google, registry, kích hoạt hoặc phát hành. F31 chưa hoàn tất; không ghi nguồn thật.

Phần bên dưới ghi các mốc0.6.1 và cũ, không thay trạng thái candidate ở trên.

### Kiểm RPC tích hợp trên Google — 00:36–00:37 ngày15/10

Đã nạp codec/core/transaction/transport/TestHost/probe vào **dự án thử riêng đã được cấp Drive**, không upload app chính. testIntegratedExcelSave dùng đúng copy19fv… và tạo hai thư mục backup/journal owner-only; registry chỉ copy, không kho cấu hình. Google log00:37:12 có count51, sameRecord/savedSpecialist/readBack/replay/audit/verified/restoredOriginalBytes/pass=true. Ghi Chuyên viên qua saveDashboardData, đọc lại qua getDashboardData và kiểm getDashboardHistory; replay trả cùng kết quả. Chỉ báo pass sau khi khôi phục có điều kiện và hash bytes đúng bản trước thử. Ảnh kết quả (tệp chưa đồng bộ: `assets/integrated-rpc-save-pass-0.6.2.png`). Backup/journal riêng của lượt thử được giữ, copy giữ nguyên bytes. Chưa nghiệm thu UI Google/multiuser hoặc bật mainwriter; phép kiểm này cập nhật phần chuẩn bị/chưa chạy ở mục candidate, không cấp quyền ghi source thật.

Ngày cập nhật: **14/10/2026**. Mã/artifact hiện tại **0.6.1**; đã kiểm bản thử Google /dev, **chưa phát hành lại deployment /exec (v5/0.5.2)**. Mục18 đã được người dùng duyệt; **ghi dữ liệu ngược về Excel chưa hoàn tất**. Kho và app giữ riêng theo quyết định người dùng.

## Bổ sung 0.6.1 — làm rõ nơi lưu và kiểm quyền

Người dùng đã cấp quyền dự án thử riêng. Execution log Google lúc 15:37 ngày 14/10 ghi firstStatus200, staleStatus412, staleRejected=true, readBackPreserved=true, pass=true; đưa tệp giả vào Trash HTTP200. Ảnh kết quả (tệp chưa đồng bộ: `assets/conditional-drive-pass-0.6.1.png`). Phép thử chỉ dùng tệp giả do dự án tạo, **chưa phải ghi Excel hoặc ghi NQ01**. Mã dự án app chính không được thêm quyền Drive hoặc đổi sharing.

Đã xác định lỗi người dùng gặp khi bấm Lưu/Đồng bộ: SheetsRepository.save vẫn từ chối commit vì writer chưa tích hợp; cấp quyền probe không cài writer vào app chính. Không báo sửa xong việc lưu NQ01. Trong 0.6.1, nguồn Excel vẫn sửa ô được, nhưng action chưa hoạt động hiện **Chưa thể lưu vào Excel** (disabled), kèm giải thích phần sửa chỉ giữ trên trình duyệt. Có **Giữ thay đổi trên máy**. Thoát khi còn dữ liệu chưa ghi cho giữ phần sửa, không gọi lưu nguồn giả. Lưu bố trí dùng chung vẫn riêng.

Tên UI mới: popup **Áp dụng vào bảng**; đọc dữ liệu Google→app bằng **Đọc lại dữ liệu và danh mục từ Google**; retry chỉ thiết lập bằng **Đọc lại danh mục và bố trí**. Trang **Danh mục và bố trí dùng chung** giải thích Google Sheets riêng chứa danh mục/quan hệ/bố trí, có link đúng kho. Nút ghi vào kho là **Lưu danh mục và bố trí vào Google**, không ghi nội dung Excel. Luna sửa lời giải thích/popup/trang quản trị/hướng dẫn; tổng chỉ huy sửa capability gate ở UI, state và nghiệm thu.

138 tests/19 files, typecheck và docs check (18 Markdown/268 liên kết/36 mã Fxx) đạt; build HTML/build server trước đó đạt; HTML 142.124 byte/gzip 41.537 byte, không thêm dependency. Đã nhận 0.6.1 trên bản thử /dev; /exec vẫn v5/0.5.2, chưa phát hành lại. Kiểm Google /dev: popup Áp dụng vào bảng tạo1 phần sửa, các nút Chưa thể lưu vào Excel disabled; Giữ thay đổi trên máy báo chưa ghi file. Ảnh giao diện (tệp chưa đồng bộ: `assets/clear-save-state-0.6.1.png`). Đã bỏ đúng marker thử HDND_KIEM_TRA_NHAN_061 và bố trí bật cột Ghi chú trong tab kiểm, không ghi nguồn/kho. Kho vẫn12, nguồn 51, console không error/warn. Kết quả chi tiết trong KIEM_THU_VA_NGHIEM_THU. Repository Git hiện đã tồn tại tại thư mục dự án; chưa tạo commit/PR trong lượt này. Các ghi chú chưa có Git bên dưới thuộc lịch sử cũ.

### Kiểm tiếp ngày 14/10 — writer thử riêng

Workbook giả 3 tab do Luna tạo đã ghi/đọc thật qua dự án thử lúc 19:39: giữ ID/MIME Excel, C4 Nội dung/O4 Ghi chú đúng sau đọc blob, các XML ô khác và các part khác (gồm công thức, styles và tab phụ) nguyên bytes; ghi với ETag cũ trả412. pass=true, Trash200. Bằng chứng (tệp chưa đồng bộ: `assets/workbook-roundtrip-pass-0.6.1.png`). Lần thử đầu cần sửa MIME ZIP cho Utilities.unzip; các lần tiếp phát hiện mã fixture sai và parser hàng tự đóng nuốt hàng kế tiếp. Đã sửa, bổ sung regression hàng tự đóng. Không sửa dữ liệu sản xuất.

Core pure codec [ExcelWriteCore.gs](../server/ExcelWriteCore.gs) dò theo **mã gốc duy nhất**, không dựa NQ01 hiển thị hoặc vị trí hàng. Kiểm baseline từng trường, chặn ID/STT/công thức/ô gộp không phải ô đầu, văn bản XML/Unicode lỗi; chỉ patch trường được gửi. Core hiện được đưa vào gói server/dist. Điều này chưa nối nút lưu app thật hoặc hoàn tất ghi Cloud Excel; F31 chưa hoàn thành.

Kiểm quyền trên bản sao riêng đã có: dự án thử trả404 ở19:03, trong khi connector xác nhận tệp vẫn tồn tại và chỉ owner. Quyền drive.file đã cấp hoạt động với tệp dự án tự tạo, chưa truy cập được bản sao có sẵn. Chưa mở rộng OAuth cho app chính hoặc chia sẻ kho; cần giải quyết quyền chọn tệp trước khi dùng writer cho nguồn hiện hữu.

Đọc muộn bản sao Excel lúc19:03+: blob123.364byte,18parts/3tabs/**142 ô công thức**, C4 đúng giá trị đã phục hồi; tất cả giá trị ô và biểu thức công thức bằng snapshot gốc. Một số part worksheet/sharedStrings/styles bị viết lại; chưa xác định tác nhân. Bằng chứng này không đủ kết luận SpreadsheetApp không bao giờ ghi được Excel; chỉ phép thử đọc blob ngay sau setValue trước đó chưa đạt. Số150 công thức ghi trước đây đã sửa thành142: cách đếm prefix `<f` đã đếm cả8 thẻ `<fill>`. Mã kiểm hiện đếm đúng phần tử worksheet `f` theo namespace.

Kiểm UI /dev bổ sung: cảnh báo **Xử lý thay đổi trước khi về xem?** có Tiếp tục/Bỏ phần đang sửa/Giữ thay đổi trên máy; chọn Giữ về xem vẫn giữ1 phần sửa và báo chưa ghi nguồn. Ảnh cảnh báo (tệp chưa đồng bộ: `assets/exit-save-state-0.6.1.png`). Đã bỏ đúng marker thử HDND_KIEM_TRA_THOAT_061 trong tab kiểm, không bỏ phần sửa của người dùng. Console không error/warn; kho vẫn12. /exec vẫn chưa cập nhật.

### Office trực tiếp trên tệp giả — đã kiểm

Lúc19:45 dự án thử tạo riêng workbook giả1cTX8E9fadGfcssBW0d9Gjfz5B4_qVgYp, tên HĐND THỬ Excel giả - không nhập liệu thật, Google UI xác nhận .xlsx và Private to only me. Sửa C5 qua Office, đợi Saved to Drive. [OfficeConcurrencyProbe](../server/probes/OfficeConcurrencyProbe.gs) đọc blob có marker Office và ETag mới; ghi bằng ETag trước sửa trả412. Nạp workbook mới rồi ghép C4 theo mã ID1 đạt200, giữ C5 của Office, part/ô khác, ID/MIME; blob đọc lại đúng SHA upload. Log19:48 pass=true. Ảnh kết quả (tệp chưa đồng bộ: `assets/office-concurrency-pass-0.6.1.png`).

Office đang mở đọc C4 đã thấy marker từ writer. Đọc blob muộn19:50 (hơn2phút) có lateReadOnly=true, officeValuePreserved/appValuePreserved/pass=true. Đây chỉ một phiên/tài khoản trên workbook giả, không chứng minh20–30 người hoặc app thật. Đã đóng tab Office thử; cleanup lúc19:55 xác nhận trashed=true/HTTP200. Không sửa bản sao nguồn hiện hữu hoặc nguồn sản xuất trong phép thử này.

Ở bước chuẩn bị trước lựa chọn quyền, [probe bản sao hiện hữu](../server/probes/ExistingCopyWorkbookProbe.gs) có ID copy cố định, kiểm đúng tên/MIME/owner-only, conditional write/readback/stale412 và khôi phục bytes gốc chỉ khi ETag không đổi. [Manifest thử](../server/probes/drive-copy-test.appsscript.json) dùng quyền Drive rộng hơn. Quyết định và trạng thái upload/OAuth mới nằm ở mục tiếp theo; không coi lời cho tiếp tục là quyền mở rộng OAuth/ghi sản xuất.

### Quyết định quyền cho bước kiểm bản sao

Người dùng đã chọn **Cho phép quyền Drive rộng cho dự án thử riêng**. Đã lưu manifest dự án10BZrloGZJMyU8TCDWNOFy3rGxs9ZIv5I6ptEEnnc8LtQnFM0M5cW8HuF sang drive + external_request và mã thử đúng bản sao19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7 rồi khôi phục. OAuth Google mới chưa được xác nhận. App chính/Excel nguồn/kho dùng chung không nằm trong quyền ghi thử này. Metadata probe dùng đúng Drivev2 labels.trashed; các trường title/MIME/private/ETag đều phải đạt trước ghi. Luna thêm9 test guard mock, tổng suite138/19 và typecheck đạt. Chỉ hàm chỉ đọc được chạy để kiểm OAuth; không bấm Run writer khi chưa kiểm quyền.

Sau lưu manifest, GET23:05 vẫn404; connector xác nhận copy còn123.364byte và đúng owner. Đã thêm getAuthorizationInfo theo từng scope, requireScopes trước token/lock/HTTP vào cả readprobe/writer và kiểm tài khoản Drive bằng boolean trong readprobe. Lúc23:14 Google log driveAuthorization=REQUIRED, thiếu đúng https://www.googleapis.com/auth/drive; requireScopes dừng trước HTTP và mở Authorization required/Review permissions. Ảnh bàn giao (tệp chưa đồng bộ: `assets/drive-scope-required-0.6.1.png`). Đã hiện trình duyệt và yêu cầu người dùng tự xác nhận Google. Không suy việc function từng chạy được thành quyền đủ; scope drive.file cũ không thay Drive mới. Hàm About/đối chiếu tài khoản chưa chạy vì scope gate chặn; chưa kết luận lỗi tài khoản và chưa thử ghi copy.

### Quyền và roundtrip bản sao nguồn — đã đạt23:19–23:22

Người dùng báo đã cấp quyền Drive. Google execution23:19 xác nhận driveAuthorization=NOT_REQUIRED; About200/accountMatchesCopyOwner=true và GET bản sao200, đúng XLSX/có ETag. Đây là bằng chứng quyền dự án thử đủ, thay trạng thái chờ OAuth ở mục trên; không mở rộng quyền app chính.

Đã chạy testExistingCopyExcelRoundtrip23:21–23:22 trên đúng copy19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7. Kiểm title/MIME/owner-only/không Trash và ETag trước khi ghi; append marker vào C4 theo mã gốc duy nhất, giữ các ô/part khác. Log cuối có sameFileId/mimePreserved/contentReadBack/blobMatchesUpload/otherPartsPreserved/otherCellsPreserved/packagePass/restoredOriginalBytes/pass=true; ETag cũ bị từ chối412. **Chỉ in pass sau khi rollback có điều kiện và đọc lại bytes đúng bản trước thử.** Ảnh kết quả (tệp chưa đồng bộ: `assets/existing-copy-roundtrip-pass-0.6.1.png`). Tệp copy được giữ, không trash; nguồn1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp không bị ghi và kho vẫn chưa bị thay đổi ở bước này.

Chưa tích hợp writer vào app; /exec vẫn v5/0.5.2, /dev0.6.1 và nguồn HTML vẫn chưa ghi Excel. Bước tiếp theo là adapter/RPC/luồng đọc nhất quán, operation ID/backup/audit/retry và kiểm trên môi trường riêng trước cấp quyền/triển khai app chính. Quyền Drive đã cấp **chỉ dự án thử**, không phải cho phép ghi NQ01 thật hoặc đổi deployment/quyền app chính. Chưa nghiệm thu nhiều người, thay đổi ảnh hưởng công thức tổng hợp/cached value, timeout hoặc rollback gặp sửa mới. Không đánh dấu F31 hoàn tất.

## Đã kiểm ở 0.6.0

- Nguồn Excel đọc 51 nội dung; chỉ một bước vào chỉnh để bấm ô sửa nháp. Dropdown neo tại ô, Sở mở một lần bấm; Chuyên viên tìm không dấu (ky tìm Nguyễn Văn Kỳ), có lọc phòng/toàn cơ quan. ID/STT chỉ xem. Nội dung/Ghi chú dùng popup, Lưu đưa vào nháp. Chế độ xem không có editor.
- Nội dung sửa rồi Esc có ba lựa chọn. Ghi chú sửa rồi X có cảnh báo; Lưu vào nháp rồi mở lại/sửa/bỏ popup giữ nháp trước đó. Nút Lưu/Đồng bộ dữ liệu báo writer chưa sẵn sàng và giữ1 nháp; checkpoint10 giây quan sát được. Trình/Rút chọn Đã rút làm danh sách Đang trình còn50/51 trong nháp; bỏ nháp trả51/51. Đã bỏ các nháp dữ liệu thử, không gửi sửa nguồn. Console bản thử cuối không có error/warn.
- frameWidth riêng cho khung trắng, auto hoặc 320–6000px, giới hạn bằng vùng màn hình. Đo khung800/table1500/viewport762; nhập2400 có khung1209/table1500/viewport1171, toàn trang1265 không tràn ngang. tableWidth cũ vẫn riêng ở nâng cao. Đọc cấu hình cũ thiếu frameWidth thành auto; client cũ gửi thiếu trường bị chặn.
- Kho đọc revision 10 trước kiểm; giữ nguyên các thay đổi người dùng ở9/10. Lưu khung800 trên /dev được Google xác nhận revision 11, tab độc lập cùng tài khoản đọc11 và khung800/table1500. Trả auto ở revision 12, tab độc lập đọc lại12 và đo card1209/table1500, trang1265 không tràn; không reset thứ tự/ẩn cột/danh mục. Sửa lỗi /dev trả editorUrl không hợp lệ: giữ link /exec chuẩn trong metadata. Nhãn checkpoint sau lưu được sửa để không còn nói Chưa áp dụng; đã kiểm bằng test hook.
- Typecheck, **113 tests/17 files**, build HTML/build server đạt; **138.001 byte, gzip 40.892 byte**, không thêm dependency. Test mới kiểm nháp nguồn read-only, refresh không ghi đè nháp, save lỗi/phản hồi thiếu/phần xác nhận, frame migration, client cũ và editorUrl ở /dev. Unit test không thay kiểm cloud. Luna phụ trách popover/panel/hướng dẫn, tổng chỉ huy tích hợp và kiểm. Kiểm tài liệu đạt18 Markdown/236 liên kết/36 mã Fxx.
- [Báo cáo và ảnh](KIEM_THU_VA_NGHIEM_THU.md) ghi phạm vi. Cảnh báo X/Esc đã quan sát; click nền có xử lý trong mã nhưng chưa kiểm UI đầy đủ ở lượt này. Chưa kiểm nhiều máy/tài khoản, mở trực tiếp file:// hoặc phát hành bản 0.6.0 ra /exec.

## Đường ghi Excel — kết quả thực tế và phần còn dở

Người dùng xác nhận **Apps Script cũ chưa triển khai**. Mã legacy có luồng gửi sửa nhưng không chứng minh backend vận hành. HTML có thể gọi backend; bản mới chưa có writer Excel đã kiểm chứng, không phải HTML vốn không ghi được.

- Nguồn1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp giữ ID/link/Excel. Metadata đọc tại mốc0.6.0 là127.639byte, modifiedTime2026-10-14T02:19:40.163Z như trước phép thử. Không ghi thử hoặc chuyển đổi nguồn. Kho native1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM vẫn private; manifest app chính chỉ Sheets, USER_ACCESSING/MYSELF, không mở ANYONE.
- Bản sao riêng19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7 được xác minh chỉ owner. Thử thay đúng ôC4 bằng patch ZIP rồi Drive update giữ fileId/link đạt:18 parts,3 tabs,142 công thức; chỉ XML ô đích đổi, các parts khác nguyên bytes. Tải lại blob đúng SHA256 của bản sửa. Đã trả blob bản sao về bytes gốc. Đây chỉ là một phép ghi bản sao, chưa chống ghi đè sửa đồng thời.
- Thử SpreadsheetApp trên bản sao14:56–14:57: setValue/flush/getValue báo marker mới, nhưng tải blob xlsx vẫn nguyên hash gốc, C4 không có marker. Không chấp nhận API getValue làm bằng chứng ghi Excel. Đã phục hồi view thử về giá trị gốc lúc15:09. [Mã thử](../server/probes/ExcelWriteProbe.gs) lưu riêng, không đóng gói; hàm thử tạm trong dự án app chính đã thay bằng comment lưu trữ.
- [Phép thử có điều kiện](../server/probes/DriveConditionalProbe.gs) đã chuẩn bị ở dự án riêng [Dashboard HĐND - Thử ghi có điều kiện](https://script.google.com/home/projects/10BZrloGZJMyU8TCDWNOFy3rGxs9ZIv5I6ptEEnnc8LtQnFM0M5cW8HuF/edit). Chỉ tạo tệp giả, thử ETag/If-Match rồi đưa vào Trash; không có ID nguồn. Google đã được người dùng cấp OAuth drive.file/external_request cho dự án riêng; kết quả ở mục 0.6.1. Không đưa quyền này vào app chính.

## Bước tiếp theo

1. Quyền thử, roundtrip workbook giả, Office trực tiếp trên tệp giả và ghi/khôi phục bản sao cấu trúc nguồn đã đạt. Tiếp theo tích hợp adapter/RPC và cơ chế operation ID/backup/audit/retry, phân biệt loại nguồn với quyền ghi, kiểm đọc nhất quán và công thức/cache/rollback khi có sửa mới. Thực hiện trong môi trường riêng; chưa bật ghi source sản xuất.
2. Trình bản thử giao diện và kết quả. /exec hiện vẫn v5; chưa đánh dấu toàn bộ mục 18/F31 hoàn thành hoặc ghi nguồn sản xuất.
3. Các phần báo cáo nâng cao, lịch sử/backup/nhập xuất đầy đủ và F01–F36 chưa thay thế hết tiếp tục theo [kế hoạch 1.16](KE_HOACH_VIET_LAI.md). [Hướng dẫn](HUONG_DAN_SU_DUNG.md) và [kiến trúc](ARCHITECTURE.md) đã cập nhật0.6.0.

## Lịch sử 0.5.2 — trước lượt triển khai 0.6.0

Phần dưới là bằng chứng tại mốc 0.5.2 và các mốc cũ, không thay trạng thái hiện hành phía trên.

## Đã hoàn thiện và kiểm chứng

- Thứ tự danh mục thống nhất ở nhóm báo cáo/preview, bộ lọc, danh sách chọn và danh mục mở lại. Mục mới có trong dữ liệu được bổ sung ở cuối; không bỏ trạng thái lạ hay nạp lại mặc định đã xóa nếu không được sử dụng.
- Chế độ chỉnh bảng: giữ và kéo tiêu đề bằng pointer (chuột/cảm ứng), Alt+←/→ thay thế; kéo mép đổi độ rộng, ẩn/hiện và đổi thứ tự vẫn có thông số. Luồng kéo chuột đã quan sát đổi ID/Sở/Nội dung → ID/Nội dung/Sở. Lưu thứ tự Nội dung/ID/Sở rồi mở lại giữ nguyên. Chế độ xem không có tay nắm hoặc thao tác đổi vị trí.
- Độ rộng bảng thực dùng max(tableWidth giới hạn 600–6000, tổng độ rộng cơ sở cột hiện). Bỏ giới hạn shell 1500 ở trang danh sách. Browser đo bảng 2400 px trong khung 728 px, cuộn ngang. Nếu bảng rộng hơn tổng cơ sở, trình duyệt chia phần dư cho các cột.
- Bấm ô trường danh mục mở picker; chuyên viên có tìm không dấu và lọc theo quan hệ phòng. Query mau d tìm D, giữ tên hiện tại A nếu không khớp. Chọn D phản ánh vào nháp. ID/STT chỉ hiển thị; Nội dung và Ghi chú là văn bản tự do trong popup.
- Popup Nội dung có Lưu vào bản nháp, đóng khi đã sửa hiện ba lựa chọn Lưu/Không lưu/Tiếp tục. Đã thử sửa → đóng → cảnh báo → tiếp tục → lưu popup → lưu 1 bản ghi mẫu, giữ cả nội dung mới và chuyên viên D. Nháp được quan sát tự lưu theo chu kỳ 10 giây. Lưu bố trí có khóa thao tác trong lúc gửi; thất bại giữ editor/nháp.
- Typecheck, **104 tests/17 files** và build đạt. Một HTML **130.234 byte, gzip 38.655 byte**. Không thêm dependency; package/lock 0.5.2. Test schema/chunks/source và server fake gồm xung đột, ghi dở, retry operation, validation/lock; không coi fake là kiểm cloud.
- Kiểm riêng artifact HTML cuối qua HTTP: đọc 51 nội dung nguồn Excel gốc, bảng mẫu 2500 px, kéo Nội dung trước ID và Lưu đạt; console không lỗi/cảnh báo. Mã nguồn, thư mục và quyết định đã cập nhật trong tài liệu liên quan. [Bằng chứng và giới hạn](KIEM_THU_VA_NGHIEM_THU.md).

## Đồng bộ dùng chung: trạng thái thực tế

- Giữ nguyên Excel/link nhập liệu 1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp, gid 60961344. Không chuyển đổi hoặc ghi nội dung nghiệp vụ. Google Drive đã xác minh MIME Excel và quyền nguồn.
- Kho riêng native 1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM, tab ẩn _HDND_APP A:H. Quyền vừa đọc lại bằng Google Drive API: chỉ một owner, không permission anyone/domain/reader khác. Người dùng chọn giữ kho riêng tiếp tục thử; không thay chia sẻ.
- Apps Script standalone hiện dùng deployment v5 ngày 14/10 lúc 10:06, USER_ACCESSING + MYSELF. V5 dùng giao diện 0.5.2; RPC thật đọc revision6, lưu items7 và khôi phục8 đạt. Server và phạm vi quyền giữ như v4. Link [Google app](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec) được giữ nguyên.
- Lỗi RPC parser gặp trước v3 vì Apps Script thiếu URL/URLSearchParams đã được sửa: server kiểm canonical URL/ID/gid, core bỏ parser browser. Test thiếu API đạt và RPC thật sau v3 thành công. Không có bằng chứng lỗi tái diễn sau init/revision 2; các tài liệu ghi nhầm đã được sửa.
- Revision 1 khởi tạo đủ profile hiện tại; revision 2 lưu thứ tự lãnh đạo theo ảnh: Long/Thiện/Hưng/Anh Tuấn/Huy Hoàng/Thanh Hùng. Tab thứ hai đọc lại đúng thứ tự nhóm báo cáo.
- Revision 3 lưu width2400, tab khác đọc đúng width2400. Một nháp width2200 giữ base2 bị server chặn do stale; editor còn nguyên2200 và checkpoint. Bỏ nháp thử/nạp lại đọc3. Revision4 trả width1500 như trước thử.
- Revision5 thử đổi tên báo cáo1, tab thứ hai đọc đúng tên mới; revision6 trả về tên gốc. Revision6 giữ tên/độ rộng ban đầu và thứ tự lãnh đạo theo ảnh trước lượt kiểm 0.5.2. Ba section catalogs/items/reports đã đọc/ghi thật; không ghi dữ liệu nghiệp vụ.
- Revision7 lưu thử width1600; tab kiểm tra riêng đọc đúng7/1600. Revision8 trả width1500 ban đầu; tab kiểm tra đọc lại8/1500. Hai lần Lưu và thoát thật thành công, editor đóng đúng lúc Google xác nhận; không ghi nội dung Excel. Ảnh lưu thành công (tệp chưa đồng bộ: `assets/shared-save-0.5.2.png`), ảnh deployment v5 (tệp chưa đồng bộ: `assets/deployment-0.5.2.png`).
- Sửa race đọc cấu hình đầu tiên bị bỏ khi vào chỉnh sớm: App chờ base trước editor, hook nhận lần đọc đầu; không đổi base của nháp khi refresh nền, không để read cũ đè save mới, khóa lưu trùng và phân biệt loading/empty/error. Có Thử tải lại cấu hình và link Google editor từ HTML private. 12 regression tests đạt (repository giả; không thay bằng chứng cloud).
- Checkpoint bảng chỉ hoạt động khi chỉnh; chế độ xem không xóa nháp. Nháp khác base được giữ và có lựa chọn giữ/bỏ/nạp để đối chiếu tại bảng/báo cáo/danh mục. Nạp nháp không ghi Google. Luồng nháp khác base đã kiểm hook; modal UI chưa kiểm đủ trên Google. Không xác nhận phục hồi được nháp người dùng nếu bản cũ đã xóa trước lượt sửa.
- Mật khẩu trước Settings mới được đề xuất, chưa triển khai; không thay quyền Google bằng mật khẩu HTML.
- Hai tab dùng cùng tài khoản, chưa phải hai máy/tài khoản. HTML ở ngoài Google chưa đọc được cấu hình private qua GViz trong lượt kiểm; vẫn đọc Excel51. Không mở ANYONE hoặc quyền đọc kho sau khi người dùng chọn giữ riêng. [Bằng chứng](KIEM_THU_VA_NGHIEM_THU.md), [quy trình](DONG_BO_CAU_HINH.md).

## Kế hoạch tại mốc 0.5.2 (đã được duyệt sau đó)

Ngày 14/10: người dùng yêu cầu duyệt kế hoạch sửa dữ liệu ô thật và độ rộng khung ngoài bảng trước khi code. [Kế hoạch1.12, mục 18](KE_HOACH_VIET_LAI.md#18-sửa-ô-dữ-liệu-thật-và-độ-rộng-khung-chứa-bảng--dự-thảo-14102026) ghi hai lựa chọn đã trả lời: ID/STT chỉ xem, Ghi chú popup; khung tối đa màn hình và cuộn bảng bên trong. Đây là tình trạng trước khi người dùng duyệt; triển khai 0.6.0 xem phần hiện hành ở đầu tài liệu.

## Bước tiếp theo

1. Tiếp tục thử riêng theo quyết định của người dùng; kiểm trên máy khác cùng tài khoản nếu có điều kiện. Chưa mở cho người khác.
2. Hoàn thiện các phần còn thiếu theo [kế hoạch 1.12](KE_HOACH_VIET_LAI.md): cấu hình báo cáo nâng cao, tỷ lệ/rule và nhập/xuất/migration. App chưa thay thế đủ F01–F36.
3. Ghi Excel thật, nhiều tài khoản/máy, quota/hiệu năng, backup/audit và chia sẻ cấu hình cho người nhận HTML vẫn chưa nghiệm thu. Nội dung chỉ chỉnh trong mẫu hoặc qua Excel gốc.
## Mốc 0.4.0 — bằng chứng trước khi bổ sung đồng bộ

Phần dưới là lịch sử local 0.4.0, không thay trạng thái 0.5.2 phía trên.

## Đã thực hiện

| Phạm vi | Kết quả thực tế | Bằng chứng |
|---|---|---|
| Tài liệu/mã nguồn | TypeScript/TSX, Preact compat, domain tách UI, repository tách nguồn; kế hoạch 1.8, kiến trúc 1.7 | [Chỉ mục](README.md), [bản đồ mã](REPO_MAP.md) |
| F01–F06/F12–F13 lõi đọc | KPI, ba báo cáo, bốn cách nhóm, chi tiết, tìm không dấu và lọc; chưa đủ tỷ lệ dòng/mô tả TU/rule | Tests và browser HTTP; đối chiếu lịch sử phía dưới |
| F08/F09/F11 phần bố trí | Đổi tên/vị trí/ẩn ba bảng; thứ tự/ẩn cột từng báo cáo. Control cạnh preview trong chế độ riêng; xem mặc định không có editor. Lưu/Hủy/reset, cấu hình riêng nguồn/browser | Test report-preferences, kiểm preview và phục hồi nháp |
| F14/F15/F21 phần danh sách | Đủ cột A–P có thể mở, ID riêng NQ01/BC01; loại VB riêng; thứ tự/ẩn cột; nhập độ rộng hoặc resize; khung chung và cuộn ngang; lưu bố trí theo nguồn. Sửa selector/textarea/popup chỉ ở mẫu | Tests item-preferences/display-id/search; browser desktop |
| F16/F17 phần danh mục cục bộ | 11 nhóm: tìm không dấu, thêm/đổi tên/xóa mục chưa dùng, thứ tự/nạp giá trị; gán chuyên viên một/nhiều phòng; selector lọc theo phòng, tùy chọn toàn cơ quan; chặn lưu nháp phân công mâu thuẫn quan hệ đã biết | Tests catalogs; browser thêm/đổi/xóa và quan hệ |
| F23/F32 bảo vệ thoát | Ba lựa chọn Lưu/Không lưu/Tiếp tục ở báo cáo, danh sách, dữ liệu mẫu, popup, danh mục kể cả nhập chưa bấm Thêm/Lưu tên và link/gid. Lưu lỗi giữ nháp; Esc đóng lớp đang thao tác | Kiểm browser từng luồng; URL sai giữ nguồn |
| F33 phần nháp | Checkpoint local định kỳ 10 giây, sau dừng nhập ngắn, khi rời/ẩn trang. Phục hồi cấu hình và nháp mẫu khi base khớp; không tự áp dụng, không cache Sheets offline | Tests checkpoint/recovery; mở tab thử thứ hai phục hồi báo cáo và dữ liệu mẫu |
| F30/F32 kết nối đọc | Link/gid/test/connect; GViz A–P, làm mới thủ công/60 giây khi tab hiện. Nguồn chỉ định đọc 51 nội dung tại lượt kiểm; không ghi | Tests parser/adapter/config và browser HTTP |
| Đóng gói | Một dist/Dashboard_HĐND.html, JS/CSS inline, không nhúng dữ liệu thật, không thêm dependency | Build 0.4.0: **107.053 byte; gzip 32.553 byte** |

## Đã kiểm tra

- Typecheck và kiểm cú pháp bundle inline đạt; **68 tests/12 file đạt**. [Báo cáo kiểm tra](KIEM_THU_VA_NGHIEM_THU.md) ghi phạm vi từng lượt, không coi unit tests là thử mọi lỗi trình duyệt.
- Browser desktop HTTP: control ba báo cáo cạnh preview, đổi thứ tự cột phản ánh trên chính bảng; lưu bố trí. Danh sách thể hiện ID hai chữ số; khung 1050 px, cột nội dung 520 px; đưa Nội dung lên trước ID, resize bàn phím lên 530 px; độ rộng trống bị chặn lưu, khung vẫn dùng được. Nhóm cột có vùng cuộn riêng.
- Danh mục: đủ 11 nhóm, thêm/đổi tên/tìm không dấu/xóa mục thử chưa dùng; mục đang dùng bị chặn đổi tên. Chuyên viên mẫu A gán hai phòng và được chọn đúng khi đổi phòng trong mẫu. Không tự đổi dữ liệu nguồn.
- Thoát khi sửa: phần link/gid, bố trí, dữ liệu mẫu, popup nội dung và danh mục có ba lựa chọn; thử nhập link sai rồi chọn lưu giữ hộp thoại và nguồn cũ. Bấm Đang sửa → Xem có xác nhận riêng cho dữ liệu; bỏ nháp trả lại giá trị gốc. Esc trong ô đổi tên chỉ hủy ô đó.
- Phục hồi: quan sát trạng thái tự lưu; tab thử thứ hai phục hồi tiêu đề báo cáo chưa áp dụng và tiến độ mẫu chưa lưu; thử bỏ nháp và đóng các tab thử. Validator cho phép giữ nháp đang nhập dở nhưng Lưu vẫn kiểm nghiêm ngặt; base sai/corrupt bị từ chối. Đã sửa xóa checkpoint khi quay về giá trị gốc để không phục hồi thay đổi cũ.
- Kiểm lại phiên sạch: sửa tiêu đề rồi hoàn nguyên về gốc, thoát/mở lại không phục hồi nháp cũ. Preview báo cáo cuộn trong bảng, không tràn cả trang (scrollWidth = clientWidth 1265 px). Console lượt cuối không lỗi/cảnh báo mới; lỗi Vite HMR lúc chưa tích hợp prop onClose thuộc quá trình phát triển, đã tích hợp/typecheck/build/nạp lại. Chi tiết thuộc báo cáo kiểm tra.
- Mốc 0.3.0 đã kiểm tên/vị trí/ẩn/reset và persistence reload; mốc 0.1.0 đã kiểm desktop/390 px. Đây là bằng chứng theo mốc, không phải lượt responsive/Drive mới cho 0.4.0.

## Chưa thực hiện hoặc chưa kiểm chứng

- Mở trực tiếp file:// hoặc file tải từ Drive chưa kiểm được do công cụ browser chặn giao thức; HTTP không xác nhận quy trình mở file thật. Chưa upload/deploy hay đổi quyền nguồn.
- Chưa auth/OAuth, ghi Sheets từ app, ID nội bộ ổn định khi migration, shared catalogs hoặc audit trung tâm. Danh mục/quan hệ và bố trí hiện lưu riêng browser/source; mục đang dùng không đổi tên hàng loạt. Quan hệ chưa biết không bị tự suy diễn.
- Chưa editor báo cáo đầy đủ (thêm/xóa bảng, nguồn/trục/mapping, định dạng title, tỷ lệ dòng/mô tả TU), đổi nhãn cột tùy ý, kéo bù trừ/mở rộng toàn trang, Excel/JSON/backup, thêm/lưu trữ/khôi phục dữ liệu thật.
- Tự lưu nháp cần localStorage hoạt động; tab nền có thể trễ, sự cố trước checkpoint vẫn có thể mất phần mới nhập. Chưa kiểm crash tiến trình/mất điện. Lưu dữ liệu mẫu vẫn chỉ trong phiên; nháp phục hồi không thay backup/history bền hay cache đọc offline.
- Chưa đo quota hoặc tải đồng thời 20–50 người; chưa nghiệm thu in nhiều trang. npm audit 0 cảnh báo thuộc mốc 0.1.0; mốc sau không thêm phụ thuộc. Chưa khởi tạo Git.

## Công việc kế tiếp

1. Kiểm chứng mở một HTML theo quy trình Drive/browser thực tế của người dùng và quyền của người nhận.
2. Tiếp tục phần thiếu 1B.1: nguồn/trục/mapping, định dạng, tỷ lệ dòng/mô tả TU và thêm bảng; sau đó cấu hình JSON, in/xuất theo [kế hoạch 1.8](KE_HOACH_VIET_LAI.md).
3. Ghi dữ liệu và danh mục chung triển khai sau khi có auth/IDs/revision, trên bản sao; chưa dùng editor local làm luồng ghi sản xuất.

Phụ trách tại [WORKBOARD](WORKBOARD.md), hướng dẫn tại [HUONG_DAN_SU_DUNG](HUONG_DAN_SU_DUNG.md). Bảng Fxx dưới là audit lịch sử 0.2.0; phần trên là delta hiện hành.

## Đối chiếu tính năng cũ → mới 0.2.0 — rà mã ngày 13/10/2026

Bảng này là bằng chứng tại mốc 0.2.0; thay đổi 0.3.0–0.4.0 được ghi ở phần mới phía trên. **Bản mới vẫn chưa thay thế đủ chức năng bản cũ.** Bảng dưới kiểm tra mã HTML đang dùng và hai bộ server cũ với mã mới, không lấy tên nút hoặc module mẫu làm bằng chứng đã có ghi/lịch sử thật. Lượt này rà source và tài liệu, không chạy lại bản cũ/Apps Script triển khai và không đổi HTML bàn giao. Kết quả browser/36 tests trước đó vẫn thuộc mốc kiểm tra riêng phía trên.

Nguồn bằng chứng:
- **C**: HTML cũ đang dùng (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/Báo cáo tiến độ HĐND.html`); số sau dấu hai chấm là dòng mã. Không dùng .bak làm chuẩn chức năng hiện tại.
- **G**: GoogleAppsScript_DongBo.js (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/GoogleAppsScript_DongBo.js`); **D**: Code_Dong_Bo.js (tệp khảo sát ngoài repository: `../../Dashboard Báo cáo tổng hợp/Code_Dong_Bo.js`). Mã tồn tại không xác nhận server nào đã deploy hoặc hoạt động.
- Mã mới: [App](../src/app/App.tsx), [reporting](../src/domain/reporting.ts), [ReportTable](../src/features/reports/ReportTable.tsx), [ItemList](../src/features/items/ItemList.tsx), [metadata](../shared/field-definitions.ts), [workspace](../src/state/use-workspace.ts), [mock](../src/data/mock-repository.ts), [Sheets](../src/data/sheets-repository.ts), [parser](../src/data/gviz-parser.ts), [kết nối](../src/features/settings/ConnectionPanel.tsx).

“Có lõi đọc” chỉ xác nhận phạm vi nêu trong ô, chưa xác nhận toàn bộ tiêu chí Fxx; “mẫu” chỉ giữ trong phiên giả; “chưa” là chưa có luồng người dùng trong bản mới. Yêu cầu và thiết kế chuẩn xem [FEATURES](FEATURES.md) và [ARCHITECTURE](ARCHITECTURE.md).

| Mã | Bằng chứng bản cũ | Có gì ở bản mới | Còn thiếu hoặc khác cần xử lý |
|---|---|---|---|
| F01 | KPI tổng/NQ/BC/chưa trình/VP/hoàn thành — C:4356,4662 | Có lõi đọc — reporting/App | Loại mâu thuẫn được báo chưa phân loại thay vì tự gán NQ; cần đối chiếu nghiệp vụ, không lấy tổng sai cũ làm chuẩn |
| F02 | Bảng TU, mapping, mô tả NQ/BC và cấp TTTU/BTV/BCH — C:103,240,292 | Một phần — reporting/ReportTable | Chưa mô tả cấp TU, chưa editor mapping; lọc “Không phải xin ý kiến” hiện so chuỗi chính xác, cần kiểm biến thể nhãn |
| F03 | Bảng NQ, tỷ lệ theo dòng/tổng — C:141,610 | Có lõi đọc, tỷ lệ chung — reporting/ReportTable | Chưa tỷ lệ từng dòng, cột hoàn thành tùy chọn và editor đầy đủ |
| F04 | Bảng BC, tỷ lệ theo dòng/tổng — C:176,610 | Có lõi đọc, tỷ lệ chung — reporting/ReportTable | Cùng khoảng trống F03; giữ nhóm chưa phân loại rõ |
| F05 | Bốn cách phân nhóm — C:4706 | Có sở/phòng/lãnh đạo VP/lãnh đạo UBND — metadata/App | Chưa nghiệm thu toàn bộ dữ liệu nghiệp vụ; phạm vi nhóm hiện dùng chung cho ba bảng |
| F06 | Bấm ô số → mã/nội dung/phòng/chuyên viên/sở — C:633,4780 | Có popup lõi tương đương/đúng tập bản ghi — ReportTable/App | Tìm trong popup, xem thêm trường và mở chi tiết tổng/cột ẩn là cải tiến chưa có, không phải chức năng bị mất so với popup cũ |
| F07 | Thêm bảng; sáu nguồn, sáu trường chia cột — C:984,1002,3830 | Chưa; chỉ ba mẫu cố định | Thiếu NQ phải xây dựng/từ khóa, chọn trục sở/phòng/lãnh đạo VP, thêm bảng. Từ khóa cũ chỉ chỉnh qua JSON; wizard cũ cắt 6 trạng thái không kế thừa |
| F08 | Tiêu đề đậm/nghiêng/gạch chân/màu/tô từ khóa và nền — C:258,862 | Chưa; tiêu đề mặc định | Cần editor cùng nơi tùy chỉnh bảng, xem trước/Lưu/Hủy |
| F09 | Thêm/xóa/đổi nhãn/thứ tự/ẩn/màu cột; nạp trạng thái thực tế — C:741,1031 | Một phần: checkbox ẩn cột mẫu trong App | Chưa quản lý cột đầy đủ, chưa lưu lựa chọn sau mở lại |
| F10 | Mapping có thứ tự, mặc định khi trống, cột hoàn thành, % dòng/tổng, mô tả — C:240,292,610,797,1172 | Một phần: hoàn thành mặc định, % chung; trạng thái lạ vẫn vào tổng | Thiếu editor quy tắc/mặc định/% từng dòng/bật tắt/mô tả; cần xem trước ảnh hưởng và không gộp sai cấp |
| F11 | Thứ tự/ẩn/xóa/khôi phục bảng — C:3950,4364,4440 | Chưa | Cờ ẩn KPI/cả danh sách cũ chỉ chỉnh JSON (C:204,4662,4757); bổ sung UI, không coi là nút cũ đã có |
| F12 | Tìm không dấu: nội dung/mã/sở/phòng/chuyên viên — C:3113 | Có năm trường này — search/ItemList | Tìm trong chi tiết hoặc thêm trường khác là mở rộng; chưa phải phần thiếu của tìm cũ |
| F13 | Loại, lãnh đạo VP, tiến độ, đang trình/rút — C:3099,3436 | Có phối hợp bốn bộ lọc — ItemList | Chưa nút xóa toàn bộ lọc; không tự đổi tên lãnh đạo theo map hard-code cũ |
| F14 | 16 cột A–P; ID/STT chỉ xem — C:2452,3494,5030 | Parser đọc đủ A–P; UI có 13 trường chữ + mã + rút | STT chưa có cột hiển thị; mã/rút bị cố định chưa chọn/đổi nhãn. Sửa chỉ ở mẫu; không yêu cầu editor ID/STT vì cũ không có |
| F15 | Sửa ô, chọn danh mục, popup nội dung, Ctrl+Enter/Esc — C:2475,3129,3185 | Một phần ở mẫu — ItemList/ContentEditor | Nhiều editor dùng input text thay selector/textarea thích hợp; chưa sửa nguồn thật, chưa workflow ghi |
| F16 | 11 danh mục; tìm/thêm/sửa/xóa/thứ tự/nạp từ dữ liệu/reset/thay hàng loạt — C:1473,1519,1641,1665,5319 | Chưa | Datalist/status constants không phải quản lý danh mục; tiến độ cụ thể cũ cũng là danh mục |
| F17 | Chuyên viên theo phòng, chọn toàn cơ quan, bổ sung và gán phòng — C:1303,1793,2103,2173 | Chưa | Trường phòng/chuyên viên có nhưng độc lập; cần quan hệ ID, rà bất nhất, không tự gán sai |
| F18 | Thêm nhanh nội dung — C:3154,5245 | Chưa | Cần validation/ID ổn định; không dùng số dòng hay mã mới cũ có thể trùng |
| F19 | Đánh dấu rút/bỏ rút, lọc lại — C:3436,3713 | Đọc/lọc rút thật; checkbox đổi rút trong mẫu — parser/ItemList | Chưa ghi/khôi phục trạng thái thật từ app; đề nghị rút không tự thành đã rút |
| F20 | Xóa dòng và tombstone local — C:5287 | Chưa; chỉ có trường archivedAt và fixture | Lưu trữ/khôi phục là thay thế tương đương cần xây, không coi trường model là thao tác đã có |
| F21 | Nhãn/thứ tự/ẩn/độ rộng, kéo bù trừ/tự do/reset, lưu local — C:2610,2840,2877,2974 | Một phần: chọn/ẩn 13 cột và reset trong phiên — ItemList | Thiếu STT/all-columns metadata, đổi nhãn/thứ tự/resize/2 chế độ/lưu bền |
| F22 | Mở rộng danh sách toàn trang và Esc — C:2999,3249,3309 | Chưa mở rộng bảng | Dialog có Esc nhưng không thay thế bảng mở rộng; kiểm bàn phím riêng khi triển khai |
| F23 | Lưu/Hủy khi thoát sửa toàn phiên — C:4288 | Mẫu có nháp/Lưu/Hủy, lỗi từng mục — workspace/mock | Chưa lưu thật. Không kế thừa Hủy local cũ sau khi đã gửi ghi từng ô lên Sheets |
| F24 | Lịch sử ô hover, nhật ký thao tác local, timestamp/trước-sau — C:344,5177,5319 | Lịch sử từng nội dung mẫu trong phiên — HistoryDialog/mock | Thiếu per-field/nhật ký chung/lưu bền/lịch sử thật; server audit là cải tiến mới |
| F25 | Excel: 16 cột, comment lịch sử, sheet nhật ký và backup — C:5364,5417,5464,5496 | Chưa | Xuất dữ liệu đọc có thể làm sớm; lịch sử phải nêu nguồn/khả dụng, không xuất lịch sử mẫu như thật |
| F26 | Nhập Excel thường và nhận _BACKUP_DATA_ — C:5524,5534,5562 | Chưa | Cần preview/kiểm tra/mapping/đối chiếu; nhập không tự ghi đè Sheets |
| F27 | Full backup data/logs/droplist nằm trong Excel — C:5496,5534 | Chưa | JSON dữ liệu đầy đủ là yêu cầu mới; cũ không có tải full-data JSON riêng |
| F28 | Xuất/nhập JSON cấu hình dashboard — C:4408,4419,4622 | Chưa | Cần version/validation/preview và reader tương thích cấu hình cũ |
| F29 | In từng bảng, clone rồi window.print — C:408 | Một phần: nút In/PDF và nguồn/ngày/tổng — ReportTable | Chưa kiểm in nhiều trang; cần mẫu giữ đủ cột/tiêu đề/phạm vi, tỷ lệ từng dòng khi có |
| F30 | JSONP đọc và chu kỳ 60s — C:4996,5164 | Có đọc/làm mới/time; tab ẩn bỏ lượt — Sheets/workspace | Chưa đo quota/nhiều người hoặc file/Drive; cần đối chiếu số liệu thay vì merge cache cũ đè nguồn |
| F31 | POST update/add/delete/batch qua GAS — C:4964,5240,5282,5303,5358; G:135 | Chưa ghi Sheets; mock không thay thế | Backend nào deploy chưa rõ; bỏ giao thức không đầy đủ/ghi công khai, thiết kế quyền/revision trước |
| F32 | Link GAS/check test/settings — C:4090,4959 | Có link Sheets/gid/test/connect local — ConnectionPanel | Hai loại link khác mục đích: mới chỉ đọc, chưa thay kết nối endpoint ghi GAS/OAuth |
| F33 | Cache data/log/config và tombstones local — C:4878,5077 | Chưa cache dữ liệu bền | Lưu link nguồn không phải cache; tương lai source/version/time riêng, không chồng bản cũ lên dữ liệu mới |
| F34 | Bỏ cache/lấy lại Sheets, reset dashboard — C:5308,4440 | Có Làm mới/Kết nối đọc snapshot | Thiếu reset báo cáo/danh mục và cache khi có; không gọi refresh là undo Sheet |
| F35 | Hướng dẫn GAS trong modal — C:4162 | Có tab hướng dẫn/version và bộ docs | Tra cứu/hướng dẫn theo chức năng tiếp tục cập nhật; không nói bản cũ có bộ tài liệu tương đương |
| F36 | C không có roles app; D có password kiểm tra ở code riêng — D:2,54 | Chưa xác thực/phân quyền | Là yêu cầu mới cho giai đoạn ghi; chưa có bằng chứng roles bản cũ, không kế thừa mật khẩu hard-code |

### Điều chỉnh kết luận sau rà soát

- “Có ba bảng” không đủ để đánh dấu F02–F04 hoàn tất: thiếu tỷ lệ từng dòng, mô tả cấp TU, cấu hình cột/rule/title/source như cũ.
- Ba bảng cố định hiện chỉ có thể ẩn cột; source/ReportConfig hiện còn hẹp (4 phạm vi, 3 trường tiến độ) so với editor cũ. Không coi dữ liệu config trong code là người dùng tùy chỉnh được.
- Tìm không dấu và bốn cách nhóm đã có phần tương đương cũ; thiếu phân quyền/ghi không làm các chức năng xem này tự trở thành chưa có. Tuy nhiên số liệu nghiệp vụ vẫn cần nghiệm thu riêng.
- Popup nội dung/nháp/lịch sử mẫu và model lưu trữ không chứng minh luồng ghi/lưu trữ/lịch sử thật.
- .bak có biểu đồ lịch sử, active HTML không có; thư viện CSV tải nhưng không có workflow rõ. Không thêm thư viện chỉ để tăng số chức năng.
- Rà lại HTML đang có ngày 14/10: không tìm thấy lời gọi sync_all ở client; G có nhánh sync_all nhưng thiếu định nghĩa handleSyncAll. Hai bộ server khác giao thức. Giữ nhu cầu nhập/đồng bộ, viết lại hợp đồng hoàn chỉnh khi làm ghi.

Phương án gom và mở đầy đủ tùy chỉnh nằm ở ARCHITECTURE mục 17; thứ tự bổ sung ở kế hoạch mục 13. Đây là bằng chứng rà soát tại mốc 0.2.0 trong CURRENT_STATE, không tạo một ma trận trạng thái cạnh tranh.



## Đối chiếu lại luồng ghi dữ liệu cũ — 14/10/2026

Tổng chỉ huy đọc hai bộ server; Luna sync_copy_review rà HTML read-only. Nguồn: Dashboard Báo cáo tổng hợp/Báo cáo tiến độ HĐND.html và GoogleAppsScript_DongBo.js, Code_Dong_Bo.js. Không gọi endpoint cũ, không ghi nguồn hoặc đổi quyền.

- HTML4969–4994: syncToGoogleSheets POST JSON tới URL Apps Script lưu trong cấu hình browser; thiếu URL thì không gửi. HTML5241 gửi update_item;5283 add_item;5304 delete_item;5359 batch_update. Luồng cập nhật còn lưu data/log cục bộ trước phản hồi server.
- GoogleAppsScript_DongBo.js135 trở đi có doPost dispatch các action;179 trở đi handleUpdateItem tìm ID/STT và setValues A:P (không tìm thấy có thể chuyển thêm dòng). Đây là code ghi, không phải chỉ một nhãn UI. Hai bộ script nhận/trả cấu trúc khác; Code_Dong_Bo.js có kiểm mật khẩu server nhưng HTML đang khảo sát không gửi hợp đồng của script đó. Chưa biết deployment cũ đang dùng bộ nào hoặc có chạy thành công trên nguồn hiện hữu hay không.
- HTML4576–4584 nút Đồng bộ lại Google Sheets gọi handleResetToGoogleSheets5308–5316: xóa cache/custom/deleted IDs rồi loadData(true). Nút này đọc lại nguồn, không gửi toàn bộ nháp lên Sheet. HTML4292 Lưu và thoát chỉ đóng mode; ghi được gửi trong handler sửa từng mục.
- Không tìm thấy sync_all trong HTML hiện hữu; chỉ server có nhánh gọi handleSyncAll mà không có định nghĩa. Điều chỉnh nhận định trước về import gọi sync_all cho đúng file đang có.
- F15/F23/F31 mới vẫn chưa có ghi dữ liệu nghiệp vụ thật; đồng bộ catalogs/reports/items là cấu hình bố trí, không thay khả năng sửa nội dung và lưu ngược nguồn. Khi khôi phục, dùng nháp → chủ động Lưu/Đồng bộ → kiểm phản hồi/đọc lại; tránh Hủy chỉ đảo local khi server đã ghi ngầm.
### Rà cuối và bước kích hoạt — 15/10

Mã gốc được giữ trong patch từ baseline lúc sửa; cache của một lượt đọc bị bỏ không được đổi mục tiêu ghi khi hàng chuyển vị trí. Nháp legacy thiếu metadata chỉ bổ sung từ baseline đã lưu, giữ operationId; lệch mã bị chặn. History dùng mã gốc item đang xem; caller/đọc đang chạy được khóa trước rerender.188 tests/24files, typecheck, build HTML148.837byte/gzip43.563byte và ba gói server đạt. Không thêm dependency.

Google Test deployments yêu cầu deploy web app lần đầu trước khi mở /dev ở project thử. Chưa tạo deployment thử/production. Gói kích hoạt [EnableExcel.gs](../server/EnableExcel.gs), [manifest](../server/enable-excel.appsscript.json) và server/dist-enable đã chuẩn bị, chưa upload/thi hành ở app chính.7 test fake kiểm guard và không PUT workbook: overlay chỉ đọc metadata, tạo hai kho riêng và đăng ký nguồn gốc. Main cần thêm Drive + external_request bên cạnh Sheets; Google cấp Drive rộng hơn một tệp. USER_ACCESSING/MYSELF và quyền chia sẻ giữ nguyên. Chờ người dùng chọn chỉ triển khai thử, hoặc thử rồi cập nhật main nếu UI đạt; người dùng tự xác nhận Google. Chưa tự gửi phần sửa NQ01 thật.


## 23/10/2026 — kiểm thử tốc độ hosting cùng bản build (đề xuất PR)

- Nhánh thử `perf/hosting-ab-browser-benchmark-20261023`: tạo bộ Chrome CDP `scripts/measure-web-startup.mjs` ghi thời gian HTML/JS/Auth/data-first/first-data-painted, báo lỗi timeout và trung vị/p75/p95; chỉ số, không ghi dữ liệu HĐND. CI chạy A/B mirrorWarmup on/off **informational**, không chặn phát hành khi mạng GitHub runner biến động.
- `scripts/prepare-hosting-staging.mjs` đóng gói cùng một dist-pages thành 2 bản Firebase Hosting / Cloudflare Pages, xác minh SHA-256 từng HTML/JS/CSS và sinh header cache riêng. **Chưa triển khai** host mới, chưa có kết quả tốc độ hosting, chưa đổi Firebase Rules/nguồn dữ liệu/quyền hoặc GitHub Pages.
- Các lượt Chrome trên runner **không thay thế** 5+ lượt đo thực tế trên máy người dùng. Không chấp nhận các kết luận tăng tốc từ gzip hoặc CI shell đơn lẻ, không coi mốc rAF trước vẽ là khung hình đã xuất hiện. Quy trình/rollback xem [HOSTING_STARTUP_AB_2026-10-23](HOSTING_STARTUP_AB_2026-10-23.md).
- Chờ CI của PR và URL host thử độc lập, rồi mới quyết định có áp dụng tối ưu thật hay giữ nguyên.

- Bổ sung sau lần CI đo đầu: các lượt mở lại hiện bảng khoảng 0,17–0,66 giây nhưng trace kết thúc sớm **trước mốc `data-first`**, nên chưa được dùng để kết luận dữ liệu đã xác nhận hoặc đối chứng hai chế độ. Bộ đo đã sửa để chờ cả hai mốc `first-data-painted` + `data-first`; cần chạy CI lại. Số liệu fresh-profile từ runner lần đầu (2.457s vs 1.929s) chỉ là một mẫu mỗi phương án, không chứng minh phiên nào tốt hơn.


## 23/10/2026 — bản đo cache/hosting đã lên Pages, đối chứng sau phát hành

- PR #39 merged vào main tại `3900e9d03a83f74517159f99315f11813eafa9ce`; Pages workflow thành công, công bố JS `assets/pages-CJqRe2sU.js` tại bot commit `ed0706e010865f6a15d1d9e85014865eefc2fc0c`. Xác nhận file build chứa nhánh chẩn đoán `dataCache=off`, không đổi trải nghiệm bình thường. Firebase Auth, Rules, RTDB nguồn và Google Sheets không được sửa.
- Đối chứng trên runner **trước khi URL mới triển khai** cho thấy `dataCacheMs` xuất hiện ở các lần mở lại, nên kết quả này bị loại khỏi đánh giá chiến lược đọc sớm. CI PR #39 kiểm TypeScript/unit/Emulator/Chrome/browser smoke và gói staging 5 file trùng SHA-256 đều PASS.
- PR #40 bổ sung kiểm tra phát hiện cache sai khi `dataCache=off`. **CI sau deploy PASS** (run #39971337269): 5/5 lượt mỗi nhánh có mốc `data-first` trực tuyến và `dataCacheMs=null` (đúng tắt cache). Đo trên GitHub runner: warmup ON fresh-profile có bảng **3488ms**, data-first **3310ms**; OFF fresh-profile có bảng **2009ms**, data-first **1988ms** — chỉ một mẫu cold mỗi nhánh, không kết luận nhân quả. Bốn lần mở tiếp theo trên cùng profile, HTTP/session row-cache tắt: median bảng **1044ms** ON và **1068ms** OFF; median data-first **1020ms** ON và **1044ms** OFF. Chênh lệch chỉ ~2%, chưa đủ kết luận tăng tốc; ON biến thiên cao hơn trong phép thử này. [CI run](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39971337269) lưu log đầy đủ. Số đo GitHub runner không là nghiệm thu trên mạng tại Hải Phòng; muốn chuyển host phải có project Firebase Hosting/Cloudflare Pages staging thực và so sánh cùng một build.
- **Giữ mặc định** warmup hiện tại cho đến khi có bằng chứng nhiều mẫu tin cậy; không công bố tăng tốc hoặc tự triển khai host mới.


## 23/10/2026 — chốt nghiên cứu ưu tiên dữ liệu, giữ hosting và bản ổn định

- Yêu cầu: giữ GitHub Pages, nghiên cứu cách xếp thứ tự đọc dữ liệu thay vì đổi host. [PR #41](https://github.com/cavoixanh638/HopHDND-WebApp/pull/41) triển khai công tắc đo guest-data-first (chỉ opt-in) và đã qua full CI; không bật cho người dùng mặc định.
- Kiểm soát độc lập [PR #42](https://github.com/cavoixanh638/HopHDND-WebApp/pull/42) được **đóng không merge** sau khi chạy 10 lượt Chrome fresh profile (5 lượt mỗi nhóm), URL giống nhau, bộ nhớ cache dữ liệu tắt, thứ tự A/B đảo lượt. Log: [GitHub Actions #39974764918](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39974764918). Tất cả 10 lượt có mốc data-first trực tuyến.
- **Kết quả thực đo GitHub runner:** cách hiện tại median bảng 1.632ms, p75 1.683ms, median dữ liệu online 1.610ms; cách hoãn quyền cho khách median bảng 1.726ms, p75 1.880ms, median dữ liệu online 1.682ms. Cách thử **chậm hơn** khoảng 5,8% (median bảng) và 11,7% (p75 bảng). Mẫu nhỏ và runner không đại diện mạng người dùng, nhưng **không có căn cứ bật mặc định**.
- Quyết định: khôi phục `use-firebase.ts` và test về phiên trước PR41, xóa công tắc thử và helper cold A/B không còn dùng. Giữ benchmark được CI kiểm đã có từ PR39/40 và tài liệu lịch sử [DATA_FIRST_REORDER_2026-10-23](DATA_FIRST_REORDER_2026-10-23.md). Không ghi Excel/RTDB, không đổi Firebase Auth/Rules/host hoặc các chức năng sửa/tài khoản. Chưa chứng minh tốc độ mới nhanh hơn; muốn tối ưu sâu cần waterfall/network từ Chrome người dùng hoặc API dữ liệu có xác thực thiết kế độc lập.


## 23/10/2026 — Khẩn cấp: trang treo/không kết nối dữ liệu sau nhiều lượt publish

Người dùng báo web treo sau phát hành. **Đã kiểm chứng một lỗi thực tế trong pipeline phát hành**: `.github/workflows/publish-pages.yml` dùng `rsync -a --delete dist-pages/assets/ ../assets/` khiến mọi JS/CSS có hash từ build trước bị xóa, trong khi tab Chrome, HTTP cache hoặc GitHub Pages CDN còn có thể giữ `index.html` cũ. Ví dụ root bản mới tham chiếu `pages-CJqRe2sU.js`, nhưng file `pages-oZVCTerc.js` từ bản PR41 và `pages-CC0VcbrY.js` từ PR39 đã bị xóa khỏi tree: browser dùng HTML cache có thể gặp 404 trước khi Firebase khởi động. Đây là **đường lỗi đã xác nhận qua mã và tệp GitHub**, chưa chứng minh được là nguyên nhân duy nhất trên máy người dùng, cần xác nhận chạy thực.

Hotfix `hotfix/retain-pages-hashed-assets-20261023`:
- Bỏ `--delete` để giữ các assets có hash từng phát hành. Không thay app logic, hosting, Auth, Security Rules, nguồn hay hàng dữ liệu.
- Phục hồi 3 entry JS từ các build mới gần đây (oZVCTerc, CC0VcbrY, VmAk19Ch) **và sáu module popup/Excel** đi kèm từ đúng commit lịch sử, vì khôi phục entry nhưng thiếu chunk phụ vẫn gây hỏng màn quản trị.
- Thêm script `source/scripts/check-published-assets.mjs` để publisher chặn publish nếu `index.html` mới/cũ tham chiếu tệp JS/CSS không có; CI kiểm cú pháp và chạy checker với build thử.
- Chỉ nghiệm thu sau CI verify, publisher thành công, Pages deployment thành công và probe Firebase Auth/RTDB trực tuyến. **Không coi CI PASS = đã chữa được lỗi trên thiết bị của người dùng.** Nếu giao diện còn treo: mở `?startupMetrics=1` và `?startupMetrics=1&dbTransport=longpoll`, đối chiếu các mốc auth/profile/data-first, đồng thời xem Console/Network 404, permission_denied, auth/network-request-failed.

Quyết định: dừng mọi thử nghiệm thay thứ tự dữ liệu/hosting. Ưu tiên độ ổn định, tránh lỗi stale JS asset và truy nguyên RTDB nếu sự cố vẫn còn.


## 24/10/2026 — Giao diện 2 tab / Ghi chú inline / cấu hình đếm xây dựng NQ

Đề nghị theo yêu cầu mới: **không đổi host, Firebase Auth/Rules, Excel nguồn hoặc quy trình tải dữ liệu**. Mã nguồn triển khai trên branch `feature/overview-list-ux-build-count-20261024`; không kết luận production pass trước khi CI và Pages publish thành công.

- **Chỉ hai tab chuyển đổi chính**: nền đơn sắc sáng, chữ sẫm, viền màu xanh và bóng nhẹ nhấn tab active, icon và trạng thái không còn nền màu lồng; không đổi style bảng bên trong theo yêu cầu này.
- **Ô sửa được** ở Danh sách dữ liệu và bảng chi tiết: giữ cursor bàn tay, không gạch chân, hover/focus thêm viền; bỏ icon bút sửa trên giá trị Ghi chú và Tiến độ hiện tại. Chỉ render hover editable khi có quyền.
- **Ghi chú**: click vào ô mở textarea đa dòng ngay tại ô, Ctrl/Cmd+Enter hoặc blur áp dụng vào nháp hiện có, Escape hủy phần đang nhập. Giữ lịch sử sửa đổi và quyền theo ô; không gọi writer trực tiếp hay thay logic autosave nguồn. Áp dụng cả Danh sách và bảng chi tiết.
- **Tiêu đề các bảng tổng hợp**: căn trái, `Tên bảng (N nội dung)`, bỏ dòng phần trăm dưới tiêu đề, chú thích gợi ý màu và nút `Chỉ xem đơn vị còn ở Sở/VP`; không ẩn hàng dữ liệu sau khi bỏ nút lọc. Cột % thống kê vẫn còn.
- **Màu thống kê**: trạng thái Sở chưa trình/VP đang thực hiện/hoàn thành sử dụng biến CSS màu đang chọn ở Danh sách dữ liệu; những trạng thái trung gian vẫn có màu riêng theo workflow. Không sửa preset gốc.
- **Bảng Tiến độ trình HĐND xây dựng NQ**: dropdown `Bao gồm/Không bao gồm “Không phải trình”` tại phần tùy chỉnh báo cáo, lưu với config của bảng đó. Cấu hình cũ mặc định **bao gồm**. Khi loại trừ, các hàng không phải trình không nằm trong tổng số và phần trăm; giữ nguyên bản ghi Excel, cách tính các bảng khác không đổi.
- Kiểm thử bổ sung `tests/build-report-count-mode.test.ts`, `tests/inline-note-editor.test.tsx`; browser smoke xác nhận hai tab nền đơn sắc và chỉ một tab active. Bỏ đo tốc độ production A/B tự động ra khỏi workflow verify (mạng bên ngoài có thể treo hàng phút, không liên quan bản sửa UI); script đo thủ công vẫn giữ nguyên. Nghiệm thu yêu cầu UI và số liệu thực sau CI/browser smoke; **không sử dụng CI để giả định đã xác minh quyền và lưu trên dữ liệu thực**.


## 24/10/2026 — Thẻ giai đoạn có drilldown / Tiến độ hiện tại inline / viền popup gọn

Yêu cầu cập nhật sau PR #45, sửa trên nhánh `feat/report-stage-drilldown-inline-progress-20261024`. Không đụng dữ liệu nguồn, Firebase Auth/Rules, hosting hoặc cách tải.

- Bốn chip số lượng **Sở chưa trình / Văn phòng đang thực hiện / Bước tiếp theo / Đã hoàn thành** trong Bảng tổng hợp tăng nhẹ kích thước, từ nhãn tĩnh thành button thực sự có thể click (chỉ khi số lượng khác 0). Khi click dùng **đúng cùng callback `onSelect`** và Bảng chi tiết hiện tại, danh sách dựa trên `aggregateReport().items` và `reportStage()`. Vì vậy bao gồm tình huống cột ẩn, status alias và tùy chọn bao gồm/không bao gồm “Không phải trình”. Không tạo một nguồn dữ liệu riêng, không mở popup cho số 0. Bản preview trong cấu hình vẫn là nhãn tĩnh.
- Trong Bảng chi tiết popup, loại bỏ bóng viền ở **cả `td`** khi hover/focus; nút chọn trạng thái có độ rộng theo nội dung thay vì ngang cả cột; viền chỉ ở nút chọn (ví dụ “Sở chưa trình”). **Bảng dữ liệu chính giữ viền hover cũ**, không đổi mọi cột/nhãn.
- `specificProgress` (Excel N) sử dụng `InlineNoteEditor` giống `note` (Excel O): nhập nhiều dòng ngay tại ô, Ctrl/Cmd+Enter hoặc blur áp dụng vào nháp; Escape hủy; phân quyền theo ô vẫn được kiểm lại khi lưu. Áp dụng cả Danh sách và Bảng chi tiết, không còn popup chỉnh sửa riêng cho hai trường. Lịch sử hai trường vẫn được giữ.
- Các bước cần xác nhận trước phát hành: TypeScript, unit mới (chip mở chính xác tập records và field permission), Firebase Emulator, Chrome smoke (chip tăng kích thước + click mở detail), build Pages, publish và deploy Pages PASS. Không tự suy ra lưu vào production hay khôi phục quyền chỉ vì unit test PASS.


## 24/10/2026 — Hotfix highlight khi sửa ô trong Bảng chi tiết

Sau PR #46, người dùng xác nhận viền đang bao **cả ô** và quá tối khi chọn sửa. Thay đổi giới hạn trong `app.css`: popup `.report-grid-modal .report-detail-grid` không còn viền/shadow ở phần tử `td.editable-cell` khi hover/focus; chỉ khung nút/giá trị nhỏ có border xanh băng nhạt `#9ECFE7` và halo `#D8F1FC`. Bỏ đường outline xanh sẫm của legacy workflow trên nút status, nhưng **giữ nguyên nền và chữ** pink/amber/green theo bộ màu hiện tại; không đổi CSS Danh sách dữ liệu hoặc quyền chỉnh sửa.

Chrome browser smoke tạo mẫu ô trạng thái có thể sửa, focus vào `cell-picker-trigger`, kiểm tra trực tiếp CSS `td.boxShadow=none`, `td.outlineStyle=none`, giá trị nút nhỏ hơn chiều ngang ô và màu viền/halo đúng nhạt. Không gọi Firebase production, không chỉnh dữ liệu.


## 24/10/2026 — Sửa viền hover trên Danh sách chi tiết và vùng bấm

Yêu cầu: bỏ **viền highlight ngoài quanh cả ô dữ liệu** trong tab Danh sách chi tiết. Khi rê chuột vào bất cứ phần padding/khoảng trống của ô có quyền sửa, chỉ làm nổi **viền nhỏ quanh điều khiển chỉnh sửa bên trong** bằng màu xanh băng sáng `#A7D8ED` và halo `#DDF3FD`. Vẫn dùng nền/chữ của preset trạng thái, không tô viền tối và không tác động Bảng tổng hợp hoặc popup chi tiết.

Thay đổi chỉ trên `ItemList.tsx`, `app.css` và hàm điều phối click `activate-editable-cell.ts`. Cú click vào khoảng trống của `td.editable-cell` chuyển đến **duy nhất một** điều khiển sửa bên trong; không chuyển nếu ô chưa được cấp quyền, nút bị vô hiệu hóa, đã nhấp trực tiếp điều khiển, nhấp nút lịch sử hoặc ô gộp có nhiều điều khiển khác nhau (tránh sửa sai trường). Các ô nhập dạng text được focus thay vì giả lập bấm nút. Không sửa Firebase Rules, Excel/RTDB, bố cục tổng hợp hay trạng thái nguồn.

Kiểm thử bổ sung: unit mô phỏng 5 trường hợp đúng quyền/không quyền/nút disabled/history/ô gộp/input; Chrome hover vào padding ô giả lập và kiểm trực tiếp CSS `td.boxShadow=none`, nút có viền/halo sáng, nút nhỏ hơn `td`. Chỉ phát hành khi CI, Chrome smoke và GitHub Pages đạt.


## 24/10/2026 — Viền textarea bị giữ lại sau khi chuột rời ô (ảnh người dùng)

Nguồn lỗi: quy tắc chung trong `app.css` gán `inline-note-textarea` viền `2px solid #26785C`, `box-shadow` thường trực và viền tối khi `:focus`. Trên Danh sách chi tiết, `td.editable-cell:focus-within` cũng được gắn chung với `:hover` để highlight nút; `:focus-within` không mất khi di chuyển chuột. Vì thế các ô nhập **Ghi chú** và **Tiến độ hiện tại** có thể giữ viền đậm sau khi chuột đi nơi khác; `onBlur` chỉ được gọi khi mất focus, không phải mouseleave.

Sửa giới hạn trong Danh sách chi tiết:
- Chỉ `td.editable-cell:hover` làm sáng viền nút bên trong, không đồng nhất với `focus-within`.
- `textarea` bình thường **và đang focus nhưng chuột ở nơi khác** dùng viền trung tính `#CDD9D4`, không halo, không outline. Khi hover vào `td`, vùng nhập hiện viền `#A7D8ED` và halo `#DDF3FD`. Không tự lưu hoặc đóng editor trên mouseleave (bảo vệ phần đang gõ).
- `InlineNoteEditor` bổ sung `textareaRef` và `useEffect` focus khi mở để blur callback chắc chắn có cơ hội đóng editor cũ; giữ `autoFocus` dự phòng.
- Chrome smoke thêm bài thực tế: vẫn focus textarea khi chuột rời, kiểm tra không còn viền/bóng đậm và `td` không highlight; so sánh với hover có viền nhạt. Không đổi nội dung nguồn, quyền Firebase, History, hosting và giao diện popup báo cáo.


## 24/10/2026 — Hiệu ứng 3D hover phương án B (được người dùng lựa chọn)

Người dùng duyệt **phương án B** từ mẫu thử ba mức hover: điều khiển bấm/sửa tăng nổi khối vừa phải `translateY(-2px)`, bóng `0 7px 13px rgba(41,89,112,.20)`, viền sáng `#A7D8ED`, quầng sáng `#DDF3FD`. Chỉ triển khai trên (1) **ô có quyền thao tác trong Danh sách chi tiết** và (2) **4 chip thống kê có thể bấm trong Bảng tổng hợp**. Giữ tất cả màu nền/chữ trạng thái đang chọn; không đổi diện tích ô, độ rộng cột, cỡ chữ, dữ liệu nguồn hoặc chức năng lọc, chỉnh sửa và lịch sử.

**Giới hạn hiệu ứng:** Chỉ `button` xem/chọn nội dung nhỏ bên trong ô được nổi khối; không nâng viền `td`, không tô sáng toàn hàng. Hover vào vùng trống ô đơn đủ điều kiện vẫn kích hoạt nút bên trong như trước; ô gộp nhiều điều khiển chỉ nâng điều khiển đang hover để tránh tô đồng loạt hoặc mở sai field. Không nâng phần tử `textarea` đang nhập hoặc `input` dạng text; đóng hover là tự trả về 0 px, không đóng hoặc lưu bản nháp. Chip số 0 `disabled`, nhãn preview và ô không có quyền cũng không được nổi khối. Hỗ trợ `prefers-reduced-motion` và chế độ in. Không sửa CSS popup Bảng chi tiết, vì kế hoạch mẫu thử đã duyệt chỉ chọn hai vị trí trên.

**Kiểm thử:** Chrome smoke đo trực tiếp trạng thái hover ở khoảng trống của ô danh sách và giá trị nội dung bên trong: `td.boxShadow=none`, button nổi -2px và có shadow, sau rời chuột trở lại 0 px; ghi chú button cũng tương tự; Bảng tổng hợp button chưa khóa nổi -2px, chip disabled không nổi; kiểm thử textarea focus không đổi và kiểm thử dropdown/chi tiết cũ giữ nguyên. Đánh giá an toàn chỉ sau CI PASS. Quy trình release `source/AGENTS.md` và GitHub Pages không đổi.


## 24/10/2026 — Mở rộng hiệu ứng 3D B tới ô bấm và hai tab, làm sáng chữ hai tab

Người dùng giữ nguyên hiệu ứng **B có viền xanh nhạt + quầng sáng + bóng + nâng 2 px** (không chọn các mẫu bỏ viền). Mở rộng đúng các vùng tương tác: các nút giá trị đã được phép sửa trong **Danh sách chi tiết**, bốn chip trạng thái ở đầu **Bảng tổng hợp**, số đếm trong ô có thể bấm ở 5 bảng tổng hợp, điều khiển chỉnh sửa có quyền trong popup Bảng chi tiết, và **hai tab điều hướng chính**. Không nâng `td`/hàng bảng, không tô viền quanh ô lớn, không áp dụng cho ô chỉ đọc/đã khóa, disabled hoặc `textarea/input` đang nhập.

- **Bảng tổng hợp:** `count-drill` phải bao toàn bộ `td` để bấm/hiện tooltip từ bất kỳ điểm nào. Chỉ `span` số lượng nhỏ bên trong được nâng 2 px + bóng; overlay giữ nguyên hình học kích thước vùng click và phân quyền. Không đổi tính số liệu hay màu trạng thái.
- **Popup Bảng chi tiết:** `td.editable-cell` không có highlight; hover vào vùng ô kích hoạt nâng **nút nhỏ bên trong**; màu nền/chữ workflow vẫn giữ palette hiện có, không nổi khi đang nhập.
- **Hai tab chính:** giữ nền một màu `#E3F2EA` khi active và `#F8FAFB` khi inactive, màu chữ đổi từ quá tối thành xanh teal tươi nhưng đủ tương phản: **active `#24745B` (khoảng 4.87:1), inactive `#3D728A` (khoảng 5.05:1)**. Mô tả phụ không hạ opacity; cả hai tab hover nổi 2 px, bóng mềm + viền xanh nhạt, vẫn có active border và focus-visible riêng. Không tác động màu ô trạng thái bên trong.
- Giữ `prefers-reduced-motion`, in không bóng/không nâng. Không đổi GitHub Pages, Firebase, dữ liệu Excel, permission, autosave hoặc cấu trúc tab.

Kiểm thử Chrome smoke mở rộng: xác nhận 2 tab có chữ/hiệu ứng đúng và reset sau hover; popup nâng chỉ nút nhỏ từ hover ở khoảng trống ô; overlay `count-drill` vẫn full-cell nhưng số nhỏ nổi, không phá tooltip/click; các tests 3D của ô trạng thái/Ghi chú và chip ở đầu bảng vẫn phải đạt. Không phát hành nếu CI chưa PASS.

## 24/10/2026 — Dọn cuối trang và mở rộng vùng cuộn Danh sách chi tiết

Theo ảnh người dùng ngày 24/10, bỏ riêng hai phần chữ thừa trên giao diện khách:
- Bỏ toàn bộ `footer.app-footer` của khách (dòng “Nội dung trình HĐND · Dữ liệu tự cập nhật”, viền và khoảng cách cuối trang); footer của admin/các tài khoản quản trị vẫn giữ nguyên.
- Khi tài khoản khách đã kết nối/xác nhận quyền và có ô được sửa, **không hiển thị** banner “Có thể bấm trực tiếp vào ô được cấp quyền để sửa thử. Thay đổi chỉ giữ trên trình duyệt, không ghi vào Google Sheets.” Các thông báo thực sự về mất kết nối, đang tải quyền, quản trị khóa chỉnh sửa hoặc chưa có ô được cấp quyền **vẫn hiển thị đúng**. Không thay đổi quyền thực tế hoặc việc chỉ sửa nháp, không ghi vào Google Sheets.
- Chỉ ở tab Danh sách chi tiết thông thường (`.wide-table-page:not(.settings-page)`), giới hạn chiều cao vùng `.item-table-scroll` theo cửa sổ: desktop `clamp(480px, 100dvh - 180px, 1080px)`; màn hình <=700px `clamp(360px, 100dvh - 235px, 760px)`. Các ô vẫn giữ nguyên chiều cao; sử dụng phần không gian theo chiều dọc tốt hơn, nội dung dài có cuộn dọc trong khung, bộ lọc/tiêu đề sticky và cuộn ngang giữ nguyên. Chế độ in không giới hạn chiều cao, popup/bảng tổng hợp/biên tập thiết lập không đổi.
- Chrome smoke có kiểm trực tiếp footer/hint vắng mặt, viewport khách 1600x1000 khoảng 820px có scroll độc lập và sticky filter ổn định. CI và publish Pages cần kiểm PASS theo đúng SHA, không đồng nhất commit nguồn với người dùng đã nghiệm thu trên màn hình thực.


**Bằng chứng phát hành (24/10/2026):** [PR #52](https://github.com/cavoixanh638/HopHDND-WebApp/pull/52) đã **merge** vào main tại commit `58fa7297214b7ed7d15b92a0b7b988cd77886212`. [Verify GitHub Actions #40081395885](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40081395885): **SUCCESS**, gồm TypeScript/unit/Firebase emulator/Chrome smoke. [Publisher commit `bb8b45ba`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/bb8b45ba5423994390acc7781c20d0bf6e7a2bea) xuất bản `index.html` trỏ tới `assets/pages-BfDw9NJm.js` + `assets/style-w5JU51R0.css`; đối chiếu file JS không còn hai câu đã bỏ, CSS có chiều cao viewport desktop/mobile mới. Chưa kiểm độc lập trạng thái CDN/Pages deploy cuối cùng hoặc màn hình người dùng; không gọi là người dùng nghiệm thu.

## 24/10/2026 — Rút gọn nhãn lọc Phòng

- Theo yêu cầu người dùng, đổi `Chọn để lọc Phòng` → `Lọc theo Phòng` trong `RoomSpecialistFilterCell.tsx`, đồng bộ nội dung mặc định của select, `aria-label` và `title`.
- Không đổi cách lọc theo Phòng/Tên CV (AND), dữ liệu, quyền, hiệu ứng 3D, cỡ chữ hay cách giữ vị trí cuộn sticky khi mở danh sách. Kiểm CI trước khi phát hành.

## 24/10/2026 — Danh sách vừa màn hình, giữ màu chữ hover, tăng tốc tìm kiếm và đánh dấu kết quả (PR #54)

- **Màu chữ hover:** Giữ đúng màu chữ hiện hành, kể cả custom status-palette; hover chỉ thay viền/bóng/nhấc nút giá trị 3D B, không thay màu chữ trong danh sách hay popup.
- **Chiều cao bảng:** Page `items` có class `list-fit-page`; flex layout dùng 100dvh và phân chia không gian thật sự còn lại sau tab/thông báo/công cụ, nội dung dài cuộn trong `item-table-scroll`, bảo toàn sticky heading/filter và cuộn ngang. Không sửa tab overview, cấu hình admin, popup; cửa sổ thấp dưới 560px có fallback cuộn trang để giữ điều khiển khả dụng. In không giới hạn chiều cao.
- **Tìm kiếm:** Tiền chuẩn hóa nguồn A–R và cột tùy chỉnh qua `filterIndex` chỉ khi dữ liệu hoặc bố cục đổi; các filter term chuẩn hóa một lần, so khớp chuỗi cache; bộ lựa chọn CellPicker cache theo bản dữ liệu/cấu hình, thay vì sort lại mỗi lần nhập. Không thêm debounce cố định làm chậm ký tự. Không thay nguồn, quyền, draft, Firebase/Sheets.
- **Bôi vàng:** `SearchHighlight`/ `searchMatchRanges` tạo `<mark>` chỉ trong chuỗi **hiển thị**, giữ nguyên văn bản gốc, khớp tiếng Việt có/không dấu, hoa/thường và toàn bộ vị trí xuất hiện. Có trong cột Nội dung (kể cả gộp Loại VB), Ghi chú, Tiến độ hiện tại và nhãn hiển thị các cột đang lọc; không chèn đánh dấu vào textarea/input hoặc giá trị ghi nguồn, xóa lọc là xóa đánh dấu.
- Unit tests `tests/search-highlight.test.tsx`, Chrome smoke giả lập đo text-ink trước/sau hover, page scrollHeight tại viewport, click/filter và <mark>. Phải phân biệt CI/GitHub Pages publish với nghiệm thu trên màn hình người dùng. Chỉ release sau CI PASS, không viết Firebase Rules hoặc dữ liệu người dùng.

**Bằng chứng nghiệm thu kỹ thuật PR #54 (24/10/2026):** [PR #54](https://github.com/cavoixanh638/HopHDND-WebApp/pull/54) được merge vào `main` tại `348e91588996f99dc19ba7a945c3c6d5f7be2a38`. [GitHub Actions Verify #40084671651](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40084671651): **SUCCESS**, TypeScript/unit/Firebase emulator/Chrome smoke. Chrome 1600×1000: `LIST_VIEWPORT_FIT_PASS`, document scrollHeight=clientHeight=1000, bảng có scroll riêng; `EDITABLE_HOVER_INK_PRESERVED_PASS` và các bài test hover 3D cũ; `CONTENT_SEARCH_MARKED_PASS`, tìm `kiem thu` tô đúng 53/53 nội dung `kiểm thử`, log đo 27ms **chỉ trên runner/dữ liệu tổng hợp, không suy diễn tốc độ trên máy thật**. [Publisher commit `506c98ae`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/506c98ae0eaf6ea0c1ad4ad68796af646af1ab5f) cập nhật root `index.html` trỏ `assets/pages-oqCUa4lM.js` và `assets/style-CF1XDQZ4.css`; đã kiểm cả hai file thực có source marker mới. CDN và thiết bị người dùng chưa được đo kiểm độc lập.

## 24/10/2026 — Tối ưu lag khi xóa bộ lọc để hiện tất cả dòng (PR #55)

- Sau PR #54, chỉ mục tìm kiếm đã được tiền chuẩn hóa nhưng thao tác xóa tìm kiếm có thể **chậm hơn** tìm từ khóa, vì từ ít dòng phải tạo lại DOM của ~55–60 dòng × nhiều cột được cấp quyền.
- Phát hiện mã `CellPicker.tsx` trước PR #55 luôn gắn DOM **đầy đủ popover ẩn, danh sách option và button cho từng ô**, ngay cả khi menu đóng. Khi khôi phục danh sách, có thể tạo hàng nghìn nút ẩn, thêm chi phí React reconciliation và DOM.
- PR #55 lazy mount: `CellPicker` chỉ xây dựng `visibleOptions` và mount `div.cell-picker-popover` **khi `open=true`**; nút kích hoạt, nội dung cell, màu nghiệp vụ, quyền, text highlight, API sửa, esc/focus/sự kiện mở/đóng giữ nguyên.
- Kiểm thử tự động mới `tests/cell-picker-lazy.test.tsx`: giả lập 60 picker × 30 lựa chọn, yêu cầu render đủ 60 trigger nhưng **0 popover và 0 nút option** trước khi mở. Chỉ phát hành sau CI unit, TypeScript, Firebase emulator, Chrome smoke PASS. Không được coi test mô phỏng là phép đo độ trễ trên Chrome/máy thật. Nếu người dùng còn thấy chậm, bước tiếp theo bắt buộc đo React commit, thời gian layout/paint và DOM thực tế của quyền admin/khách khi khôi phục 55 dòng; không suy diễn từ riêng số dòng.



**PR #55 kết quả (24/10/2026):** [PR #55](https://github.com/cavoixanh638/HopHDND-WebApp/pull/55) đã merge tại `73025c8fe4e5455cf1988c19aa5d12e1bac4addd`; [GitHub Actions Verify #40085438135](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40085438135) **SUCCESS** gồm TypeScript, unit (60 picker × 30 choices lazy regression), Firebase emulator, Chrome smoke. [Publisher `537ffa61`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/537ffa6106c4da476d7428b469a9a5c2cdb276c2) thay root `index.html` trỏ `assets/pages-6UzNL7bn.js`; xác minh chính file build JavaScript chỉ render `cell-picker-popover` khi `open` true. **Chưa có phép đo trước/sau trên máy người dùng**; nếu còn lag khi phục hồi tất cả dòng, tiếp tục profile React render/commit/layout trong phiên người dùng thực, tránh kết luận đã hết chỉ từ CI.

## 24/10/2026 — Canh đều văn bản, lọc không dấu, chỉnh highlight và thu gọn giao diện chính

Yêu cầu người dùng qua hai ảnh tiến độ ngày 24/10 và chốt nhãn chính xác **"Tìm kiếm (không dấu)"**:
- 3 cột dữ liệu **Nội dung trình** (`content`), **Tiến độ hiện tại** (`specificProgress`) và **Ghi chú** (`note`): canh chữ `text-align:justify`, `text-align-last:left` như Word trong các phần hiển thị; không canh đều input/textarea đang sửa hay header/filter. Ở cột gộp Nội dung + loại VB, bảo toàn cách trình bày suffix (HC/QPPL/Báo cáo).
- Thay placeholder duy nhất của bộ lọc văn bản dạng tự do thành `Tìm kiếm (không dấu)`. Không đổi nhãn aria-label `Tìm kiếm cột ...`, không thay thuật toán tìm có/không dấu, không đổi dropdown.
- Sửa trường hợp tô vàng số `254` bị bẻ thành `25` + `4`: `SearchHighlight` thêm class `item-search-match-atomic` cho token ngắn, không có khoảng trắng; CSS bỏ padding, border, margin gây thay đổi độ rộng và dùng `white-space:nowrap` chỉ cho token ngắn. Các cụm nhiều từ vẫn được xuống dòng tự nhiên. Không thay đổi giá trị nguồn/giá trị chỉnh sửa.
- Hai tab chính: bỏ phần mô tả nhỏ, bỏ chữ `Xem` ở tab không đang chọn; giữ `Đang xem` cho tab hoạt động. Tăng tên tab lên 16px, thu khung thành 2 nút có chiều rộng theo nội dung để giảm chiếm không gian; giữ màu trạng thái và hiệu ứng 3D đã duyệt.
- Bỏ hoàn toàn dòng `N/M nội dung` khỏi `Danh sách chi tiết`. Ẩn khoảng cách header của khách khi không có các công cụ admin; các công cụ quản trị giữ nguyên.
- Thêm unit test `search-highlight.test.tsx` cho số 254/câu gốc; Chrome smoke xác nhận hai tab vẫn đúng, placeholder, không có counter/header rỗng, ô Tiến độ canh đều và số được tô vàng không tách dòng. Không tác động Firebase/Excel/cơ chế quyền; phát hành sau CI SUCCESS.



**Bằng chứng PR #56 được kiểm thử và phát hành (24/10/2026):** [PR #56](https://github.com/cavoixanh638/HopHDND-WebApp/pull/56) đã merge tại `2fd47853f3c9a12cd875b483ba19dd87922a216b`. [Verify GitHub Actions #40091420330](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40091420330) **SUCCESS**: TypeScript, unit tests, Firebase emulator và Chrome smoke. Các marker: `HOVER_3D_B_MAIN_TABS_PASS`, `LIST_VIEWPORT_FIT_PASS` (màn 1600×1000, trang cao đúng 1000px), `CONTENT_SEARCH_MARKED_PASS`, `JUSTIFY_AND_ATOMIC_SEARCH_HIGHLIGHT_PASS` (cụm số `254` chỉ 1 DOM Range rectangle và nội dung gốc giữ nguyên). [Pages publisher `c1ece63c`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/c1ece63c560b92faf1725efd6868e4e7877fce41) đã trỏ root `index.html` tới `assets/pages-BkmXWSH0.js` và `assets/style-CohnKphG.css`. Đã đối chiếu asset JS/CSS: có `Tìm kiếm (không dấu)`, `item-search-match-atomic`, `text-align:justify`, CSS tabs gọn và không còn `item-list-summary` ở bundle. CDN/trình duyệt thực tế người dùng chưa được đo trực tiếp.

## 24/10/2026 — Hai tab luôn giữ nguyên kích thước khi chuyển lựa chọn

- Yêu cầu điều chỉnh sau PR #56: **tab chưa chọn không hiện chữ "Đang xem" nhưng vẫn dành sẵn đúng ô chữ**; khi người dùng chuyển tab, vị trí/chiều rộng/chiều cao của cả hai khung và phần chữ không được giật.
- Mỗi tab luôn có sẵn `span.section-card-state` cùng nội dung "Đang xem"; tab không active chỉ có `visibility:hidden`, **không dùng conditional render hay display:none**. Hai tab sử dụng lưới hai cột đều nhau trên desktop/mobile, cùng độ rộng viền, không phụ thuộc tab nào active. Giữ nguyên font lớn hơn, màu trạng thái và hover 3D B.
- Thử Chrome tự động chuyển từ Danh sách chi tiết → Báo cáo tổng hợp → Danh sách chi tiết, đo `getBoundingClientRect()` của cả hai tab, yêu cầu sai khác kích thước dưới 1 px, nhãn active visible và inactive hidden; đồng thời giữ nguyên smoke của lọc bảng và chức năng khác.



**Phát hành PR #57 (24/10/2026):** [PR #57](https://github.com/cavoixanh638/HopHDND-WebApp/pull/57) merge vào main tại `f4d98bedbbe3fc79afc028c18bbd5b546500aa00`. [GitHub Actions Verify #40095451480](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40095451480) **SUCCESS** với TypeScript, unit, Firebase emulator và Chrome smoke. Chrome ghi `PRIMARY_TABS_FIXED_SIZE_PASS`: cả hai tab `336×60px` trước/trong/sau chuyển, active `visibility:visible`, inactive `hidden`, vẫn `HOVER_3D_B_MAIN_TABS_PASS`, `LIST_VIEWPORT_FIT_PASS`. [Pages publisher `1a10734f`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/1a10734fabe0d093464d08557aeb725221a7c86c) cập nhật root `index.html` trỏ `assets/pages-BA_uC6Iu.js` và `assets/style-BKXJiN6D.css`; đã xác minh trong file build JS luôn có span `Đang xem` cho cả hai tab, CSS có hai cột bằng nhau và `visibility:hidden` cho inactive. CDN và màn hình thực tế người dùng chưa đo độc lập.

## 24/10/2026 — Khôi phục lịch sử sửa hai cột cho người xem và hover cả ô số Bảng tổng hợp

- **Lịch sử sửa:** dữ liệu lịch sử thật vốn đã có `Repository.history(recordId)` và `HistoryDialog`, nhưng nút `CellHistoryAction` bị ẩn khi `anonymousViewer`/ `readOnlyViewer`. Bỏ điều kiện ẩn nút **chỉ cho `note` (Ghi chú) và `specificProgress` (Tiến độ hiện tại)** trong Danh sách chi tiết và popup chi tiết xuất phát từ Bảng tổng hợp. `App.tsx` truyền callback lịch sử cho popup khách, đọc qua Repository như trước. Nhấn biểu tượng đồng hồ sẽ mở lịch sử đúng một trường, thời gian và nội dung mới nhất trước; bản demo Ghi chú giữ nhãn riêng và không phải audit thật. Không thêm cột history hoặc thay đổi quyền sửa, bản ghi audit, rules, Firebase/Excel.
- **Hover Bảng tổng hợp:** ô có số dương click được (`td.report-clickable-cell`) là cả khối nổi lên 2px, viền xanh nhạt/bóng mềm. Nút `count-drill` vẫn phủ toàn ô để click ở bất kỳ điểm nào; phần số ở giữa không còn tự nổi tách riêng. Không tác động ô số 0, ô %, ô không có thao tác, màu nghiệp vụ của từng trạng thái, popup hoặc Danh sách chi tiết. Có xử lý reduced-motion/print.
- Kiểm thử: unit guest read-only chỉ hai nút lịch sử, không có nút sửa; Chrome giả lập click từng nút và kiểm đúng tiêu đề popup, không ghi dữ liệu; Chrome hover full-cell kiểm TD dịch -2px, bóng cả ô, chữ số không dịch, ô không click không đổi; CI phải PASS trước khi merge và phát hành Pages.



**Kiểm thử và phát hành PR #58 (24/10/2026):** [PR #58](https://github.com/cavoixanh638/HopHDND-WebApp/pull/58) được merge tại `be0e85154731f059d2587aa71fadaf54d3057676`. [Verify GitHub Actions #40098522020](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40098522020): **SUCCESS**, TypeScript/unit/Firebase emulator/Chrome smoke. Chrome xác nhận `GUEST_TWO_FIELD_HISTORY_PASS` (cả hai nút ở guest list, click mở đúng field), `GUEST_REPORT_POPUP_HISTORY_PASS` (lịch sử Ghi chú từ popup read-only), `REPORT_FULL_CELL_3D_PASS` (cả td nâng 2px, số không dịch chuyển, ô không click không nâng), `HOVER_3D_B_REPORT_COUNTERS_PASS`, `CELL_HOVER_VISUAL_PASS` (giữ full-cell hit target), `BROWSER_SMOKE_PASS`. [Publisher `ac558946`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/ac558946b6062370eb3c4c556e67e7c5253b3499) cập nhật root `index.html` trỏ `assets/pages-D5qZVENf.js` và `assets/style-BQd5_0XS.css`; đã xác nhận mã phát hành có dialog/history hai trường và CSS `td.report-clickable-cell:is(:hover,:focus-within)` với `translateY(-2px)` và shadow cả ô. Các lần sửa nháp chưa được lưu không phải lịch sử thực; lịch sử thật phụ thuộc Repository và quyền đọc Firebase hiện có. Chưa nghiệm thu tương tác trên thiết bị người dùng/CDN.

## 24/10/2026 — Căn phải nhãn "Đang xem" và không xuống dòng tiêu đề hai tab

- Khắc phục lỗi `Đang xem` nằm mỗi tab một vị trí: cả hai tab có ô nhãn bằng nhau rộng **62px**, `margin-left:auto`, chữ căn phải và lề phải cố định; nhãn ở tab inactive vẫn giữ không gian bằng `visibility:hidden`. Tiêu đề có `white-space:nowrap`, phần tiêu đề co giãn theo khoảng giữa icon và nhãn, **không bẻ dòng**. Khung hai tab có độ rộng bằng nhau (desktop tối đa 850px, thẳng hàng với nội dung chính); không được co giãn khi chọn.
- Màn nhỏ dưới 760px hiển thị hai tab thành hai hàng đều nhau, thay vì để chữ đè lên nhau hoặc tạo cuộn ngang toàn trang; dưới 440px giảm nhẹ font và icon để tiêu đề vẫn một dòng. Vẫn giữ hiệu ứng hover 3D B.
- Chrome smoke xác nhận tại desktop: vị trí nhãn tính từ mép phải cả hai khung bằng nhau, tên mỗi tab chỉ một dòng, không đè nhãn và khung không đổi kích thước khi bấm qua lại.
- **Đề xuất thiết kế chưa triển khai:** chuyển cả hai tab về cùng theme xanh thép/sky blue (active `#176A9C`, inactive `#F1F7FB`, chữ `#365872`, border `#CBDCE8`), để riêng trạng thái điều hướng với 3 màu nghiệp vụ đỏ/cam/xanh. Người dùng cần duyệt trước khi đổi theme; lần phát hành này chỉ sửa bố cục, giữ màu hiện tại.



**PR #59 kiểm thử và phát hành (24/10/2026):** [PR #59](https://github.com/cavoixanh638/HopHDND-WebApp/pull/59) merge vào `main` tại `c3986274b93819ef04b70ad669a99ca8f9bc9ecb`. [GitHub Actions Verify #40105288406](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40105288406) **SUCCESS** với TypeScript/unit/Firebase emulator/Chrome smoke. Chrome marker `TAB_LABELS_RIGHT_AND_SINGLE_LINE_PASS`: nhãn `Đang xem` của hai tab cùng **right inset 14px**, mỗi tiêu đề 1 dòng, không tràn hoặc đè lên nhãn. `PRIMARY_TABS_FIXED_SIZE_PASS`: cả hai tab `421×50px` trước/trong/sau chuyển. CI cũng xác nhận frame theo `--page-content-width` và trang tài khoản không lệch. [Publisher `69b55052`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/69b550521b1368d2811afb3255ca299042cb6aac) trỏ root `index.html` tới `assets/style-CLU1LTUA.css`, xác nhận CSS build chứa nhãn căn phải 62px, `white-space:nowrap`, media responsive. Javascript `pages-D5qZVENf.js` không cần thay vì chỉ sửa layout CSS. **Theme xanh da trời vẫn CHƯA áp dụng**; phối màu chờ người dùng phê duyệt. CDN và trình duyệt máy người dùng chưa được đo trực tiếp.

## 24/10/2026 — Chốt Theme1 trước khi đổi màu điều hướng

- Đã **đóng băng toàn bộ mã nguồn đang phát hành** tại source commit `74d8a32e1dbc1d4ad9ad87e0a949924c6cbdec31`, Git tree `1029ee15336a15a42a9f1b1b2ca8fefd387ba63a`; tạo commit không đổi nội dung `c52f162e42b5ad6893c043d8b84b7914fe247b16` trong nhánh `snapshot/Theme1-before-ImperialSky-2026-10-24`.
- Mọi thông tin về **Theme1**, màu hai tab/cơ chế hover, màu cơ bản, **4 nhóm trạng thái**, màu báo cáo, quy tắc màu điều kiện, kho preset và hướng dẫn khôi phục tại [`docs/ui/Theme1.md`](ui/Theme1.md), [`docs/ui/Theme1-MANIFEST.json`](ui/Theme1-MANIFEST.json), [`docs/ui/Theme1-COLOR-SOURCE-INVENTORY.md`](ui/Theme1-COLOR-SOURCE-INVENTORY.md), [`docs/ui/THEMES.md`](ui/THEMES.md).
- **Không sửa một giá trị CSS/TS nào trên production**; các tệp này thuần tài liệu. Theme Imperial Sky mới chỉ là đề xuất, chưa triển khai.
- Phân biệt rõ: **đã lưu mọi cấu hình màu nằm trong Git**, không thể khẳng định đã sao lưu preset màu cá nhân `localStorage` trên máy người dùng hay mọi giá trị cấu hình live trong Firebase/Sheets. Không reset những kho này khi thử theme mới.
- Khi quay lại Theme1: phục hồi **chọn lọc** CSS/token từ nhánh snapshot qua PR và test; không reset toàn bộ repo, không làm mất các công việc phát triển sau mốc.

## 24/10/2026 — Theme2 Imperial Sky (B gradient + A solid) — bản thử

- Theo chốt của người dùng, bổ sung Theme2 độc lập: **B — Subtle Gradient** `#245A79 → #2E6F95` chỉ cho tab active, **A — Solid Elegant** `#2E6F95` cho nút chính và giao diện thao tác. Tab inactive `#F2F8FC`, chữ `#35556B`, viền `#C9DCE8`; hai tab active/inactive giữ size/căn phải nhãn và title một dòng như PR #59.
- Triển khai bằng class `.app-shell.imperial-sky-theme` trong `App.tsx` và quy tắc riêng cuối `app.css`. Tuyệt đối không sửa biến `--green` toàn cục hoặc biến màu nghiệp vụ, không đổi data, Firebase, preset, quyền, tô vàng hay hover số Bảng tổng hợp.
- Tài liệu thiết kế và hướng dẫn gỡ lớp Theme2 để về đúng Theme1: [`docs/ui/Theme2-ImperialSky.md`](ui/Theme2-ImperialSky.md); [`docs/ui/Theme1.md`](ui/Theme1.md) và nhánh snapshot tiếp tục FROZEN.
- CI phải PASS TypeScript, unit, Firebase emulator và Chrome smoke trước khi merge/publish; Chrome assert background-image gradient chỉ active, nút chính dùng solid, chữ/viền đúng màu và tab không đổi kích thước; không suy diễn đó là nghiệm thu máy người dùng.



**Theme2 Imperial Sky — đã kiểm thử và xuất bản (24/10/2026):** [PR #61](https://github.com/cavoixanh638/HopHDND-WebApp/pull/61) được merge vào main tại `948ef2f1b803888812c2eaad1c2d169d096b223a`. [GitHub Actions Verify #40113538591](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40113538591) **SUCCESS** với TypeScript, unit, Firebase emulator và Chrome smoke. Dấu `THEME2_IMPERIAL_SKY_CHROME_PASS`: CSS thực tế gradient active `linear-gradient(110deg, rgb(36,90,121) 0%, rgb(46,111,149) 100%)`, chữ `rgb(248,251,253)`, inactive solid `rgb(242,248,252)`, primary solid `rgb(46,111,149)`, ghost chữ `rgb(53,85,107)`. `PRIMARY_TABS_FIXED_SIZE_PASS` xác nhận **421×50px** trước/trong/sau chuyển, ẩn/hiện nhãn đúng; `HOVER_3D_B_MAIN_TABS_PASS`, `REPORT_FULL_CELL_3D_PASS`, `GUEST_TWO_FIELD_HISTORY_PASS`, `BROWSER_SMOKE_PASS`. [Publisher `eac5d073`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/eac5d0735bfc3f172055b81c3d2f68fa1ff785a1) cập nhật `index.html` sang `assets/pages-C-cz3dOC.js` và `assets/style-Dsp_w-U9.css`; đã xác minh cả hai asset, bao gồm CSS minify lowercase `--imperial-primary:#2e6f95` và `linear-gradient(110deg,#245a79 0%,#2e6f95 100%)`. **Theme1 snapshot vẫn giữ Git blob CSS `60cb1a18ed018de4b4885e0cd5841d4fb1751c8e` không đổi.** Đây là xác nhận repository/CI/build; thiết bị, browser cache và CDN thực tế người dùng chưa được nghiệm thu độc lập. Rollback chỉ lớp theme theo `docs/ui/Theme2-ImperialSky.md`, không reset main/data.

## 24/10/2026 — Sự cố Theme2 chưa hiện trên website: Jekyll build GitHub Pages thất bại

- Người dùng chụp màn hình website `cavoixanh638.github.io/HopHDND-WebApp/?utm_source=chatgpt.com` lúc khoảng 23:57 (Việt Nam) vẫn thấy **Theme1 xanh lá** dù JS/CSS Theme2 đã build và nằm trên nhánh main.
- Giám sát đúng workflow xuất bản cuối của GitHub Pages cho thấy 3 lượt `pages build and deployment` #40113735517, #40113781518 và #40113851797 đều **failure** (bước `build` lỗi, `deploy` bị skipped); trong khi workflow `Build and publish HopHDND Pages` #40113735148 **SUCCESS**. Vì vậy **không được coi commit `index.html/assets` là đã triển khai thành công trên domain**.
- Nguyên nhân từ log `Build with Jekyll`: `Liquid Exception: syntax error (line 785)` trong `source/docs/ui/Theme1-COLOR-SOURCE-INVENTORY.md`; tài liệu kiểm kê chứa văn bản mã nguồn `{{color:current[key].text, ...`` mà Liquid cố diễn giải. Đây là lỗi quy trình phân phối website, **không phải lỗi cấu hình màu CSS**. Không sửa/không làm mất nội dung snapshot Theme1.
- Cách sửa: thêm tệp **rỗng** `/.nojekyll` ở root của nhánh xuất bản `main` (GitHub Pages chuẩn) để bỏ qua build Jekyll và phục vụ **nguyên trạng** `index.html` cùng `assets/pages-*.js`, `assets/style-*.css` đã được Vite build/verify. Thêm cổng `PAGES_JEKYLL_DISABLED_PASS` vào `.github/workflows/publish-pages.yml` để ngăn hồi quy.
- Kết quả phải kiểm tra: workflow **`pages build and deployment`** sau khi merge phải `SUCCESS`, **job deploy cũng SUCCESS**; không chỉ kiểm tra `Verify`, `Build and publish`, hoặc SHA asset. Sau đó mới hướng dẫn người dùng refresh/cache. Không đổi Firebase, Excel, quyền, Theme1, màu nghiệp vụ hay dữ liệu.



**Sự cố đã khắc phục — xác nhận phát hành thực tế (24/10/2026):** [PR #62](https://github.com/cavoixanh638/HopHDND-WebApp/pull/62) merge tại `4738b58e739910a6f776c56a2f5a847af1b51ba2`. [CI Verify #40114257842](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40114257842) **SUCCESS**; đặc biệt [GitHub Pages **build + deploy #40114421322**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40114421322) **SUCCESS** (cả `build`, `deploy`, `report-build-status` đều thành công). Root `.nojekyll` hiện diện và rỗng; `index.html` chỉ đến `assets/pages-C-cz3dOC.js`, `assets/style-Dsp_w-U9.css`; đọc đúng hai file hash này thấy JS có `imperial-sky-theme`, CSS có `linear-gradient(110deg,#245a79 0%,#2e6f95 100%)`. Đây là bằng chứng Pages đã thực sự nhận bản Theme2; cần hard refresh/cache bust nếu máy người dùng còn giữ phiên cũ. Không cần động vào Theme1 hoặc dữ liệu.



## 25/10/2026 — Điều chỉnh màu trạng thái + hover 3px + mặc định Build NQ (PR #63)

- [PR #63](https://github.com/cavoixanh638/HopHDND-WebApp/pull/63) merge vào main tại `f5acbb5f44162ad8d47eb3bd79663ca4bc191058`; [Verify source #40118901603](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40118901603) **SUCCESS** (TS/unit/Firebase/Chrome).
- Mặc định trạng thái Văn phòng đang thực hiện: **chữ `#854D0E`, nền `#FEF9C3`**; bản palette người dùng tự lưu vẫn giữ nguyên. Chỉ mặc định V5 chưa chỉnh được chuyển đổi khi đọc mà không ghi đè localStorage.
- Báo cáo: ô số bấm được **nổi toàn TD 3px**, viền ngoài 2px **theo từng màu trạng thái** (đỏ/vàng/xanh lá), số không nổi riêng; cột % hoàn thành nền/chữ/border cùng nhóm **Hoàn thành**, thanh progress có màu xanh hoàn thành; cột đầu Bảng tổng hợp nền xanh ghi `#EAF1F6`, chữ `#2B4D63`.
- Danh sách chi tiết: chỉ điều khiển nội dung được phép sửa có **viền trong theo trạng thái** và nổi 3px, không viền toàn ô; tiêu đề nền `#EFF5F9`, filter row `#FAFCFE`. Hai tab chính/chip tổng quan/popup cũng nâng 3px. Giữ reduced-motion, in, lịch sử, quyền và hiện thị nguồn.
- Bảng *Tiến độ trình HĐND xây dựng NQ*: `includeNotRequired=false` cho cấu hình mặc định/thiếu cấu hình; **Không phải trình** không nằm trong tổng và %; nguồn Excel/RTDB không sửa. Nếu admin đã lưu **tường minh** `includeNotRequired=true`, lựa chọn đó vẫn được tôn trọng và có thể đổi trong Cấu hình báo cáo.
- Chrome marker **`SEMANTIC_HOVER_COLORS_AND_COMPLETION_PASS`**: office rgb(254,249,195)/rgb(133,77,14), percent và completed rgb(213,240,222)/rgb(0,122,24), first group header rgb(234,241,246); 3 trạng thái outline có màu riêng và TD nổi -3px. `LIST_INNER_HOVER_PASS` (red border -3px), `HOVER_3D_B_LIST_NOTE_PASS`, `REPORT_FULL_CELL_3D_PASS`, `BROWSER_SMOKE_PASS`.
- [Publisher `a0ac66b8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/a0ac66b8311526623a4cef9d774d49bfe20943aa) đổi root sang `assets/pages-BP0iNVIy.js` / `assets/style-B5JzGpEM.css`; đã xác minh nội dung CSS/JS mới. [**GitHub Pages thực tế build + deploy #40119141002**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40119141002): **SUCCESS cả 3 job**; không chỉ xác nhận build file trong Git. Không đo browser cache/CDN của máy người dùng.
- Tài liệu chuyên đề có mục tiêu, giới hạn, rollback: [`docs/ui/Theme2-hover-and-workflow-20261025.md`](ui/Theme2-hover-and-workflow-20261025.md). Theme1 nhánh snapshot độc lập không sửa.



## 25/10/2026 — Bảng xây dựng NQ mặc định ẩn Không phải trình; nhóm theo Sở, ngành; phân biệt cột đầu

- **Mặc định cả hai chính sách riêng của bảng xây dựng NQ**: `includeNotRequired:false` **không tính** nội dung `Không phải trình` vào tổng/mẫu số và `hiddenColumns:['Không phải trình']` **không hiển thị cột**. Không xóa bản ghi nguồn, không sửa Excel/Firebase; các bảng khác không bị thay đổi. Lựa chọn `includeNotRequired:true` đã được admin lưu tường minh vẫn giữ nguyên.
- **Nạp cấu hình bảng cũ**: các bản trước chưa có `showNotRequiredColumn` được chuẩn hóa thành `false` (ẩn theo mặc định mới); lựa chọn bật hiện lại đặt `showNotRequiredColumn:true` và được lưu trong cấu hình báo cáo thông thường, không reset độ rộng/thứ tự/font/tên bảng. Không thể biết chắc một cấu hình cũ thiếu dấu đã từng cố tình để hiện cột; quản trị viên có thể bật hiện trở lại trong danh sách đầy đủ cột. Phần `column-choices` nay liệt kê tất cả cột theo `columnOrder`, kể cả các cột đang ẩn — trước đây không thể bật lại cột ẩn vì chỉ duyệt `preview.columns`.
- **Mặc định phân nhóm** toàn Bảng tổng hợp dùng `group='department'` (nhãn `Sở, ngành chủ trì`) thay vì `vpLeader`; người dùng vẫn có thể chọn Lãnh đạo VP/Phòng chuyên môn/Lãnh đạo UBND qua ô phân nhóm. Đây là state mở trang, không ghi đè bộ catalog, các bản ghi nguồn.
- **Màu cột đầu**: đổi từ xanh ghi `#EAF1F6` sang gần trắng `#FAFBFC`, chữ `#34465A`, phân cách phải 2px `#C5D2DE`. Cột `Tổng số nội dung` giữ xanh nhạt `#E9F0FA`; cột trạng thái đỏ/vàng/xanh và `% hoàn thành` giữ nguyên màu đúng nghĩa. Không thêm gradient tại ô, không đổi kích thước cột/bảng.
- Bảo vệ Theme1 snapshot; lớp màu mới chỉ bổ sung vào Theme2. Kiểm thử source/unit/Chrome/Firebase; Pages phải `build` và `deploy` thành công, kiểm tra JS/CSS hash trước khi báo đã lên web.


## 25/10/2026 — Hai tab chính thành card nổi, bỏ icon

- Người dùng duyệt mở rộng hai tab thành card nổi rõ ngay ở trạng thái bình thường, không còn icon; giữ tên hai bảng và nhãn "Đang xem" với slot dự phòng ở tab chưa chọn.
- Theme2: max 980px, min-height 80px desktop, radius 16px, title 18px, shadow chủ động active/inactive; hover -3px, mobile xếp dọc. Không đổi Theme1 snapshot.
- Code: src/app/App.tsx, src/styles/app.css, smoke browser scripts/smoke-pages-browser.mjs; mô tả/rollback tại docs/ui/Theme2-ImperialSky.md. Không đổi màu trạng thái/bảng, nguồn, dữ liệu, Firebase, quyền hay hành vi click. Chờ CI và GitHub Pages deploy success để xác nhận phát hành.


## 25/10/2026 — Thành ủy: "Không phải trình" là trạng thái hợp lệ, mặc định không tính và ẩn

- Báo cáo **Tiến độ xin ý kiến Thành ủy** từng báo "Chưa chuẩn hóa: Không phải trình" vì Party chưa định nghĩa cột hợp lệ này; khác Build NQ. Đây là lỗi phân loại hiển thị/thống kê, không phải lỗi dữ liệu Excel.
- Party nay có cột hợp lệ "Không phải trình" (với một số nhãn tương đương được chuẩn hóa), mặc định **không đưa bản ghi này vào tổng, phần trăm hoàn thành, số theo đơn vị và drilldown**. Cột cũng mặc định **ẩn**, giống bảng xây dựng NQ. Tính số liệu và ẩn/hiện cột là hai chính sách độc lập.
- Trong **Tùy chỉnh bảng báo cáo → bảng Thành ủy**, admin có lựa chọn Bao gồm/Không bao gồm nội dung "Không phải trình", và checkbox cột "Không phải trình" ở danh sách cột; lưu cấu hình riêng Party, không đổi bảng Build hoặc các bảng khác.
- Bố cục cũ thiếu cột được tự bổ sung vào columnOrder nhưng mặc định ẩn (có thể bật lại). Giữ tên bảng, thứ tự khác, cột ẩn cũ, độ rộng, font, preset. Tùy chọn đã lưu tường minh được tôn trọng. "Chưa chuẩn hóa" vẫn dành cho trạng thái khác thực sự không nằm trong danh mục (ví dụ "TU đã cho ý kiến"), không được tự coi là "Đã có TBKL".
- Không sửa nguồn Excel, Firebase, Sheet2, lịch sử, phân quyền hay Theme1/Theme2. Kiểm thử hồi quy Party count/column/migration/UI, Build NQ độc lập, Chrome smoke và GitHub Pages build/deploy. Nếu CI/chính Pages chưa SUCCESS thì không coi là đã xuất bản.

## 25/10/2026 — Chỉ hiển thị chỉ số Bước tiếp theo ở báo cáo có bước trung gian

- Bảng Thành ủy và Bảng xây dựng NQ: có cột trạng thái trung gian, tiếp tục hiển thị Bước tiếp theo.
- Bảng tổng hợp NQ+BC, Bảng ban hành NQ, Bảng ban hành BC: chỉ có ba trạng thái, bỏ chỉ số Bước tiếp theo dưới tiêu đề. Vẫn giữ nguồn, cột, tổng, tỷ lệ hoàn thành, popup và quyền.
- Chrome smoke kiểm tra đúng 5 bảng, unit test đúng nhóm; độc lập với việc chuyển Firebase sang ghi realtime ở PR khác.


## 25/10/2026 — Chốt kiến trúc Firebase là nguồn dữ liệu chính (thay phương án overlay)

**Yêu cầu người dùng:** Excel/Google Sheets chỉ là nguồn ban đầu và bản dự phòng trong giai đoạn chuyển đổi. Sau khi hoạt động realtime ổn định, tất cả người dùng phải đọc/ghi trực tiếp dữ liệu nghiệp vụ trên Firebase Realtime Database mà không cần link Google Sheets.

### Quyết định

- **Nguồn chính:** /hdnd/items (bản ghi thật, revision và lịch sử). Cả admin và khách đã cấp quyền ghi đúng ô bằng giao dịch CAS, tự lưu sau 800ms và Firebase onValue chuyển mọi thay đổi tới các trình duyệt. Điều này dùng lại FirebaseRepository đã có, không tạo overlay nhị phân trên bản sao.
- **Nguồn tạm:** /hdnd/mirrors/{spreadsheetId}/{gid} chỉ để nhập dữ liệu một lần; nhánh này vẫn bất biến và có thể tồn tại để đối chiếu/backup, không tham gia đọc hay ghi khi dataSource='primary'.
- **Chuyển dữ liệu:** chỉ admin Google đã xác thực, kết nối và không còn bản nháp; từ bản sao Firebase đã xác nhận, kiểm tra schema và ID duy nhất, từ chối nếu /hdnd/items đã có bất kỳ bản ghi nào, dùng transaction CAS toàn bộ nhánh khi còn rỗng, xác nhận lại mọi giá trị và số dòng rồi mới cập nhật shared profile dataSource='primary'. Không thay đổi ID nội bộ có dạng spreadsheetId:gid:row:n vì quyền từng ô gắn ID đó đã được cấp; ID này trở thành định danh lịch sử, không được dùng để tải lại Sheet. Giữ displayCode lặp (ví dụ '-') hợp lệ.
- **Thao tác:** tại trang tài khoản admin phải nhấn hai bước xác nhận chuyển dữ liệu. Tùy chọn 'primary' không được bật nếu dữ liệu chưa được khởi tạo. Không tự phát sinh bản sao trống, không ghi đè/mất bất cứ thay đổi đã có, không nhập lại tự động sau khi chuyển. Admin vẫn có thể chủ động xuất dữ liệu Excel theo mẫu để sao lưu.
- **Phân quyền:** Security Rules production hiện vẫn khóa /hdnd/items. Phiên bản Rules mới và test Firebase Emulator là điều kiện bắt buộc trước deploy, còn GitHub Pages không tự triển khai Rules; công khai website trước khi triển khai Rules sẽ tạo giao diện cho phép nhập nhưng lưu bị Firebase từ chối. PR giữ DRAFT/HOLD cho tới khi có deployment được ủy quyền, backup Rules + Database và kiểm tra post-deploy.
- **Không phụ thuộc link Excel:** dataSource='primary' khởi tạo FirebaseRepository trực tiếp, không tải GViz, không subscribe bản sao, không warmup mirror, không tự chuyển sang Excel nếu lỗi Firebase. Khi không kết nối được sẽ giữ bản đã đọc hoặc báo lỗi, không ghi ra local như thành công.
- **Lịch sử:** FirebaseRepository đã có audit tối đa 50 giao dịch/record và bảo vệ xung đột ô, tái sử dụng thay vì mất lịch sử như phương án mirrorEdits. Khi lưu hoặc đồng bộ không được coi nháp/local là dữ liệu chung.
- **Dữ liệu local trước chuyển đổi:** người dùng có bản nháp chưa ghi trên thiết bị (như ảnh 25/10). KHÔNG xóa hoặc âm thầm đưa bản nháp này vào Database chính. Xuất/đối chiếu bản nháp rồi mới áp dụng lại theo quyền sau khi chuyển; thông báo rõ. Giữ Theme2, nhóm báo cáo, trạng thái, bảng và phân quyền.

**Trạng thái:** mã nguồn PR đang thử, chưa migrate hoặc thay đổi Rules hay Database thật, chưa được gọi là đã kích hoạt realtime trên HopHDND.
