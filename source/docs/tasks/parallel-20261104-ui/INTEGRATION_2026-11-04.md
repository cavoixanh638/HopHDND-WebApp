# Integration review — 04/11/2026, kết quả mới nhất

## Quyết định

**Worker A DONE; Worker B DONE; bản tích hợp CODE + CI DONE. Site demo riêng tư HOLD.** Đây là báo cáo mới nhất thay thế các trạng thái chờ trong những checkpoint cũ.

- **Baseline:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`.
- **A HEAD:** `9a78244ee09df782a9835fffae181249e8fc1371`. JSX/CSS Nội dung trình + L03 và các unit/Chrome test A; checkpoint A DONE.
- **B HEAD:** `066edf66dc0f6f9f137c29164be50141d91ed7d3`. Source UI cuối `9ca1101edeabe942a5ce4daeee15c96b05795a99`. Bổ sung E2E Chrome real App/Emulator riêng, code/test SHA `b35611a7d452313e9e33536d5be3a1309f9d6605`; checkpoint B DONE.
- **Integrated exact SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`** ở `ui/20261104-coordination`: đã tích hợp cả lịch sử worker A và B. B ngoài docs thêm `.github/workflows/ui-20261104-b-admin-e2e.yml` và `source/scripts/ui-20261104-b-admin-controls-e2e.mjs`, không sửa thêm ItemList sau mã đã kiểm. Không có file source chồng A/B.
- **PR nháp [#155](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155)**: kiểm trên nhánh riêng, không merge main.

## Ma trận yêu cầu — kiểm trên một SHA tích hợp

| Yêu cầu | File | Bằng chứng | Kết quả |
|---|---|---|---|
| Metadata `(Sở - Loại VB)`, field source độc lập, read-only nhẹ | `CompactGroupedValue.tsx`, `item-frame.css` | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775), [V5 L3](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276724) | PASS |
| L03 cấp trình editable dropdown riêng, trạng thái chung cột, readonly 2 cột, `Không phải trình` không lặp | 2 file A + test A | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775) Chrome list/popup/1440/900/390; [Verify](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708) | PASS |
| Admin đổi tên danh sách và tên tab/guest live, reload, validation | `ItemList.tsx`, admin CSS, E2E script B | [real App E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) / log `TITLE_SAVE_LIVE_GUEST_PASS`, `TITLE_RELOAD_PASS` | PASS |
| Admin bật/tắt C01–C03 độc lập; C00 cố định; reports, filters, source giữ nguyên | B source+test | [real App E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) `CARD_TOGGLE_MOUSE_KEYBOARD_PASS` x3, `DATA_REPORTS_FILTERS_UNCHANGED_PASS` | PASS |
| Guest không có admin, CAS/rollback/denied/offline/reconnect, desktop/tablet/mobile | B source+test | [real App E2E](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745) các checkpoint + 17 PNG; [Firebase operational](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276876) | PASS |
| Typecheck/unit, Firebase Auth/Functions/RTDB, Chrome smoke, build/offline HTML | Integrated SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9` | [Verify](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708) và 8 CI còn lại | PASS |
| Site riêng tư owner-only, version/URL `succeeded` | ChatGPT Sites `appgprj_6ae93f17c2e48191815caef8a642fa14` | Không có công cụ Sites được cấp cho phiên này, không có deployment confirmation | NOT RUN |

## GitHub Actions — đúng SHA `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`

9/9 workflow áp dụng kết thúc `SUCCESS`:

- [Verify source #41773276708](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708): typecheck, full unit, Firebase Emulator, Pages/offline/QA build, Chrome smoke.
- [V5 L3 grouped #41773276724](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276724): SUCCESS attempt 2 (attempt 1 Chrome CDP unavailable, trước khi assert UI).
- [V5 L4 HC/BC #41773276840](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276840): SUCCESS.
- [V5 L5 guard #41773276897](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276897): SUCCESS.
- [V6 L1 L03 #41773276775](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276775): SUCCESS.
- [V6 L3 guest #41773276939](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276939): SUCCESS attempt 2 (attempt 1 Chrome CDP unavailable).
- [V6 L4 filters #41773276838](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276838): SUCCESS.
- [Firebase operational #41773276876](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276876): SUCCESS.
- [Worker B real App admin controls E2E #41773276745](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745): SUCCESS, log cuối `UI_B_ADMIN_E2E_PASS` và `verifiedSha=c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`. PR142/PR147 scope-limited SKIPPED không tính PASS.

## Artifact provenance và SHA-256

- [Standalone QA ZIP #13295398372](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708/artifacts/13295398372), SHA256 archive `22e257a6e245dc7e7b67919da69b209018069fe6a7934b791042aeadd424e2be`. Đã tải ZIP thật, giải nén `HopHDND_GopCot_XemThu.html`: **1,077,099 bytes; SHA256 HTML `d2ecdc7881caaa09f307de1a4dbf7de7d9c359cc935c3012029fa67ad0f285bf`**. Đây là hash file HTML, không chỉ hash ZIP; chỉ dùng dữ liệu mô phỏng.
- [B E2E screenshot ZIP #13296285946](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276745/artifacts/13296285946), SHA256 ZIP `f6bcbd4861902a060cef4edbc31a658ba6dace31f90f6d6e38d64719b8c061d4`. Đã tải và kiểm danh sách **17 PNG**: 6 admin/guest tại 1440/900/390px, 3 thẻ ẩn, title, guest, CAS, offline, denied, khôi phục, báo cáo.
- [Verified hosting candidates ZIP #13295104663](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41773276708/artifacts/13295104663) SHA256 ZIP `df958a679062cbc5852e8446126432d40f039d711251d9711830b0cfc4e951db`; **package was NOT deployed**.

## Gate riêng tư vẫn HOLD

Trong phiên điều phối này có GitHub read/write/CI và file tools, **không có Sites action/API** để thao tác project `appgprj_6ae93f17c2e48191815caef8a642fa14`. Không có bằng chứng Site owner-only hiện tại hoặc quyền phát hành; vì vậy **không thực hiện cập nhật Site, không tạo version/URL giả, không chuyển toàn nhiệm vụ sang DONE**. Cần môi trường có quyền mở và chỉnh ChatGPT Sites, xác minh owner-only, đưa đúng HTML QA đã hash lên Site, đợi deployment succeeded và thử các thao tác thực tế trên URL truy cập. Không thay bằng GitHub Pages/Firebase production.

Đã tuân thủ: không merge `main`, không deploy Firebase production, không sửa Rules/data/Excel thật. [Tracker](TRACKER.md), [checkpoint](checkpoints/COMMANDER.md).
