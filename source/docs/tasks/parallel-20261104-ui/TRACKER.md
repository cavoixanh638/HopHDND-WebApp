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
