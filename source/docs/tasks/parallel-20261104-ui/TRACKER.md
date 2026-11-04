# Tracker UI Danh sách — 04/11/2026, chốt code/test

**Trạng thái chung: CODE/INTEGRATION PASS — PRIVATE SITE PENDING.** Worker A và B đều DONE. Tổng chỉ huy đã tích hợp và có bằng chứng 9/9 workflow áp dụng PASS trên **cùng code SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`**. Tuy nhiên **không đánh dấu toàn bộ dự án DONE**: Site demo riêng tư chưa có phiên bản/deployment succeeded/URL được xác minh.

| Yêu cầu nghiệm thu | Owner | Kết quả | Bằng chứng trên integrated SHA |
|---|---|---|---|
| Nội dung trình `(Sở - Loại VB)` conditional, field edit/highlight, read-only | A | **PASS** | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775), [V5 L3](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276724), A checkpoint/evidence |
| L03 cấp trình editable riêng, 3 cột; read-only 2 cột; `Không phải trình` ẩn cấp trình thừa | A | **PASS** | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775), [Verify](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708) |
| L03 đồng trục ba trạng thái, 1440/900/390, popup, cột hẹp, chuột/phím | A | **PASS** | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775), [V5 L3](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276724) |
| Admin có nút đổi tên hiển thị tại tiêu đề; lưu, reload, đồng bộ tab/guest | B | **PASS E2E** | [Real-App B E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) `verifiedSha=c5ad9e7c4d57aecac47102ea0df3de75bf642fe9` |
| Admin C01–C03 bật/tắt riêng; C00 luôn hiện; báo cáo/filter và dữ liệu nguyên vẹn | B | **PASS E2E** | [Real-App B E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) 3 lượt toggle chuột/Space; 5 báo cáo, 3 dòng |
| Quyền guest, denied/offline, conflict/CAS, rollback, reconnect; responsive | B | **PASS E2E** | [E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) Auth/RTDB/Functions Emulator, 17 PNG tại 1440/900/390 |
| Gộp A+B, unit/build, Chrome, Emulator, gói offline đúng SHA | Commander | **PASS** | [PR #155](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155), [Verify](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708) + 8 workflow khác |
| Site demo riêng tư ChatGPT hiện có `appgprj_6ae93f17c2e48191815caef8a642fa14` | Commander | **BLOCKED / NOT UPDATED** | Phiên này không có action/API Sites, không thể xác nhận owner-only, version, URL hoặc deployment `succeeded`; không giả báo hoàn tất |

## Baseline, SHA và nguồn

- Baseline code `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`.
- Worker A HEAD `9a78244ee09df782a9835fffae181249e8fc1371`, checkpoint DONE và thay JSX/CSS/test A.
- Worker B HEAD `066edf66dc0f6f9f137c29164be50141d91ed7d3`, checkpoint DONE; UI source cố định tại `9ca1101edeabe942a5ce4daeee15c96b05795a99`; E2E test source SHA `b35611a7d452313e9e33536d5be3a1309f9d6605`; thêm test script + CI workflow + evidence, không sửa App sau bàn giao.
- **Integrated source+test SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`**: đã nhận cả commit worker A và B trên nhánh `ui/20261104-coordination` bằng merge commits; [PR nháp #155](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155) chỉ phục vụ QA, không merge `main`.

## CI tích hợp exact SHA — 9/9 applicable PASS

- [Verify source #41773276708](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708): SUCCESS — Typecheck, full unit, Firebase Auth/Functions/RTDB Emulator, Pages/QA/offline build, Chrome smoke và artifact.
- [V5 L3 #41773276724](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276724): SUCCESS sau rerun attempt 2. Initial Chrome CDP unavailable là lỗi khởi động runner, chưa chạy đến assert UI; rerun nguyên điều kiện, cùng SHA và PASS.
- [V5 L4 #41773276840](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276840): SUCCESS.
- [V5 L5 #41773276897](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276897): SUCCESS.
- [V6 L1 #41773276775](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775): SUCCESS.
- [V6 L3 #41773276939](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276939): SUCCESS sau rerun attempt 2 (initial Chrome CDP unavailable).
- [V6 L4 #41773276838](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276838): SUCCESS.
- [Firebase operational #41773276876](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276876): SUCCESS.
- [Admin real-App E2E #41773276745](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745): SUCCESS, log `UI_B_ADMIN_E2E_PASS` có `verifiedSha=c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`; 6 ảnh admin/guest 1440/900/390 và 11 ảnh thao tác. Workflow PR142/PR147 giới hạn phạm vi SKIPPED không tính PASS.

## Artifact và giá trị hash đã đo thực tế

- [Offline HTML ZIP #13295398372](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708/artifacts/13295398372), SHA256 ZIP `22e257a6e245dc7e7b67919da69b209018069fe6a7934b791042aeadd424e2be`.
- File `HopHDND_GopCot_XemThu.html` giải nén từ ZIP SHA vừa nêu: **1,077,099 bytes; SHA256 `d2ecdc7881caaa09f307de1a4dbf7de7d9c359cc935c3012029fa67ad0f285bf`** (tính bằng `unzip -p ... | sha256sum` trong phiên tổng chỉ huy). Dùng dữ liệu giả; không phải website đã deploy.
- [E2E screenshot ZIP #13296285946](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745/artifacts/13296285946), SHA256 ZIP `f6bcbd4861902a060cef4edbc31a658ba6dace31f90f6d6e38d64719b8c061d4`. Đã kiểm 17 file PNG bên trong; xem mẫu admin 900/guest 390 và title saved 1440.
- [Verified hosting candidate #13295104663](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708/artifacts/13295104663) SHA256 ZIP `df958a679062cbc5852e8446126432d40f039d711251d9711830b0cfc4e951db`, **không deploy**.

## Gate cuối và an toàn

**Không có thay đổi nào vào `main`, Firebase production, GitHub Pages production, Rules hoặc RTDB thật.** Site demo riêng tư chưa được cập nhật trong phiên này vì không có quyền thao tác Site qua công cụ kết nối; không khẳng định URL/version. Chỉ đóng `DONE` chung khi có bằng chứng Site owner-only, deployment `succeeded`, version/URL và thao tác chính trên bản được truy cập.

Xem [báo cáo tích hợp](INTEGRATION_2026-11-04.md) và [checkpoint tổng chỉ huy](checkpoints/COMMANDER.md) để tiếp quản.

## Kiểm tra lại ngày 04/11/2026 — khoảng 14:24 ICT

- Git HEAD vẫn như lần bàn giao trước: A `9a78244ee09df782a9835fffae181249e8fc1371`, B `066edf66dc0f6f9f137c29164be50141d91ed7d3`, coordination `1265b768ca34164f2be1b4760955dd0f954e3249` (docs-only so với source+test SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`).
- PR [#155](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155) vẫn **DRAFT/open**, không merge main. B/A vẫn DONE, không cần bổ sung code.
- CI trên pinned source+test SHA vẫn **9/9 applicable SUCCESS**. Tại docs-only SHA `1265b768`, [V6 L3 #41773822188](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773822188) attempt 1 FAIL *Chrome CDP unavailable* trước UI asserts; commander đã rerun failed jobs, **attempt 2 SUCCESS cùng SHA**, không đổi source/test/oracle. 8 workflow applicable còn lại trên docs-only SHA cũng SUCCESS; 3 workflow scope-limited SKIPPED, không tính PASS.
- **Trạng thái không đổi: CODE/INTEGRATION PASS — PRIVATE SITE PENDING.** Không có connector/action Sites trong phiên; không chứng minh owner-only, version, URL hoặc deployment `succeeded`. Tránh push mã/commit vô nghĩa; Site chỉ được cập nhật trong môi trường có quyền.

## REV2 — L01/L03 (đợt yêu cầu mới 04/11/2026, tổng chỉ huy)

**Trạng thái REV2: A_SCOPED_CI_PASS / HANDOFF_PENDING / SHARED_VERIFY_PENDING.** Đã đọc [REV2-COMMANDER](REV2-COMMANDER.md), [REV2-REQUIREMENTS](REV2-REQUIREMENTS.md), [REV2-WORKER-A](REV2-WORKER-A.md). *Không kế thừa PASS đợt trước làm PASS REV2.*

| Gate REV2 mới | Owner | Trạng thái | HEAD/test SHA/bằng chứng | Còn thiếu |
|---|---|---|---|---|
| L01 cả hai readonly giữ `(Sở - Loại VB)`, không thừa dấu | A | NOT_RUN | A code HEAD `2305e81f0ca6089eb54661fe04564bc8c67ffd41`; JSX delta first, CSS/test pending; unit CI FAIL | Code/4 permission combinations, Chrome list/popup |
| L01 ít nhất một editable: 2 ô cùng hàng, không `()`/`-`, readonly field không giả dropdown | A | NOT_RUN | Same old A HEAD; no REV2 tested SHA | Code, quyền hỗn hợp, hover/focus, dữ liệu thiếu/dài |
| L01 Loại VB hover/focus/open giống Sở, giữ màu/highlight/lease | A | NOT_RUN | Chưa có ảnh/số đo REV2 | Chrome pointer/keyboard/Escape, palette |
| L03 cấp trình editable: 3 track, dropdown giống Lãnh đạo/Phòng/CV, 3 status cùng trục, màu nền/chữ | A | NOT_RUN | Chưa có code/CI REV2 | Chrome 1440/900/390, list/popup, palette, narrow |
| L03 cấp trình readonly: 2 track, data-driven BCH/BTV TU; `Không phải trình`, trạng thái sửa/chỉ đọc hỗn hợp | A | NOT_RUN | Chưa có code/CI REV2 | Matrix mixed perms, no false affordances |
| L03 3 trạng thái cùng left/width/height, không đổi độ rộng cột đã lưu | A | NOT_RUN | Chưa đo bounding rect cho REV2 | Screenshot/geometry đúng SHA |
| Nghiệm thu/tích hợp **delta mới A sau `9a78244e`**, giữ B PASS | Commander | BLOCKED (A pending) | Coordination code SHA cũ `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`; coordination task-doc HEAD `c4e7e47df5172fddb9857c984ab2cff33b5f994a` | A DONE + diff/CI đúng tested SHA |
| CI, HTML QA package SHA256 của bản tích hợp REV2 | Commander | NOT_RUN | Chưa có REV2 code SHA; CI 9/9 trước REV2 chỉ là regression baseline | Merge delta A, exact-SHA typecheck/unit/Chrome/Emulator, html hash |
| ChatGPT Site riêng tư `appgprj_6ae93f17c2e48191815caef8a642fa14` | Commander | **SITE_PENDING** | Không có tool/action Sites trong phiên, owner-only/version/URL chưa xác minh | Chỉ deploy private khi có tool/quyền; không merge main/production |

**Mốc theo dõi đầu 04/11/2026 ~15:48 ICT:** Compare A HEAD `9a78244e` vs accepted A HEAD `9a78244e` = ahead 0/behind 0; A checkpoint đã `IN_PROGRESS — REV2` tại `d3eb30b7` (docs-only), chưa có test/screenshot REV2. Compare coordination HEAD vs `96526a7b` chỉ thêm ba file tài liệu REV2. B worker DONE, không mở lại. Chỉ nghiệm thu A khi có commit mới + checkpoint DONE REV2, exact-SHA CI và ảnh/số đo; không tích hợp cũ lần nữa.

- **REV2 tiến triển 04/11/2026 ~15:51 ICT:** A cập nhật checkpoint `IN_PROGRESS — REV2` qua commit docs-only `d3eb30b70491a8f130e1d9095af50b384df989a0`; compare old accepted...HEAD chỉ `checkpoints/A.md`, code/test mới NOT RUN. Tổng chỉ huy mở [draft QA-only PR #157](https://github.com/cavoixanh638/HopHDND-WebApp/pull/157) (không merge) để theo dõi CI khi A push. Trạng thái nhận bàn giao vẫn **WAITING_FOR_A_CODE**; B giữ DONE.

- **REV2 mốc code đầu tiên 04/11/2026 ~15:52 ICT:** A HEAD `2305e81f0ca6089eb54661fe04564bc8c67ffd41`, diff old accepted chỉ checkpoint A và `CompactGroupedValue.tsx` (+17/-16). [V5 L3 #41802770237](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41802770237) FAIL ở oracle nhãn cũ `Ban hành NQ` vs REV2 `Trình ban hành NQ`; [V6 L1 #41802770194](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41802770194) FAIL bốn case đòi bracket trên level editable trong khi REV2 bỏ bracket; [Verify source #41802770206](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41802770206) FAIL unit, typecheck PASS. **KHÔNG nghiệm thu**; worker A còn CSS, test mới, CI full và ảnh/số đo. Commander đã ghi nguyên nhân/gate ở [PR #157](https://github.com/cavoixanh638/HopHDND-WebApp/pull/157#issuecomment-6626734295), không tự sửa mã A khi worker đang ghi.

- **REV2 M2 04/11/2026 (đang làm):** A HEAD `9a82033d260c53a85b1461784380329f5ebe5436` (mới 5 commits từ A old HEAD), code+test SHA `254d55d3686832a8d6fce9c4c55cce950cf42eeb`, CSS `fd9091158da1051504426f2814bdfdc3a542f4a2`. Diff đang có JSX, +244 CSS, unit A (+79/-41) và checkpoint. A checkpoint `IN_PROGRESS/TEST_PENDING`, chưa có browser REV2 screenshot/geometry hoặc DONE. Trên HEAD docs mới [Verify #41803039713](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803039713), [V6 L1 #41803039728](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803039728), [V5 L3 #41803039777](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41803039777) FAIL ở unit/oracle cũ liên quan nhãn/bracket; [PR #157](https://github.com/cavoixanh638/HopHDND-WebApp/pull/157) đã được giao giữ assert REV2, xử lý oracle không làm giảm gate. **Tiếp tục WAITING_FOR_A_DONE**, chưa tích hợp.

- **REV2 M3 (CI gate triage):** A latest docs HEAD `67ebde322960cba64a3afa4b9871b3d63caf1a12`, pinned latest code/test SHA `8892e414d9a7c0e6b71c70b23103009cf229e6fe`; delta A from `9a78244e`: JSX/CSS+3 shared unit, A unit, V5/V6 real browser scripts, checkpoint; **không file B**. [V6 L1 #41804029214](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41804029214) **PASS**. [Verify #41804029452](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41804029452) **FAIL docs:check** vì checkpoint A relative link `../REV2-REQUIREMENTS.md` không tồn tại trên A (file chỉ có ở coordination), không phải lỗi UI. [V5 L3 #41804029472](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41804029472) **FAIL Chrome oracle** đo all wrapper heights 36/48/36 với readonly dài xuống dòng; all state left & width trùng, dropdown height 36/36 trùng. Cần kiểm height dropdown **chỉ các ô editable**, readonly hiển thị đủ; không ép cắt chữ. Commander đã [giao sửa rõ trên PR #157](https://github.com/cavoixanh638/HopHDND-WebApp/pull/157#issuecomment-6626921091); A checkpoint đang `IN_PROGRESS/TEST_PENDING`. **Chưa tích hợp hoặc dựng package REV2**. `SITE_PENDING`.

- **REV2 A M4 evidence nhận 04/11/2026:** A code/test SHA `60f82d2503cc9cff1089a7717e2275675f5929b7`, A docs/evidence HEAD `b5226ab19049492edb09034c98b569ea4b417891`. [V6 L1 #41805448482](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41805448482) **PASS**, [V5 L3 #41805448162](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41805448162) **PASS**, [HC/BC guard #41805448519](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41805448519) **PASS**, [Firebase operational #41805448350](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41805448350) **PASS**; [Verify source #41805448251](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41805448251) chưa ghi SUCCESS khi kiểm. [A evidence REV2](evidence/A/REV2_L01_L03.md) đã push: L01 4 grants List 1440/Popup 900, 390px focus/open/Escape không patch; L03 status dropdown 186x36px và left/width/height spread 0px cho editable (list/popup 1440/390), readonly có thể wrap. **Mức nghiệm thu: A_SCOPED_CI_PASS / HANDOFF_PENDING**, chưa gộp vì A checkpoint vẫn IN_PROGRESS; shared source smoke script thuộc coordinator sau bàn giao. Không mở lại B. Site vẫn **SITE_PENDING**.
