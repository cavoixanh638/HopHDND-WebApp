# G00 | Chiến dịch chỉnh giao diện Admin trực tiếp (18/11/2026)

## Mốc và quy tắc bất biến

- Repository: `cavoixanh638/HopHDND-WebApp`; source `source/`.
- **BASE cố định** của TẤT CẢ workstreams: `2ace3304a299d23ca6414c6ba6dc30f16266e9c2` (main Pages đang phát hành, `version.json.source_sha=2b4f252aa34d0662524f6933c652921528ce7b39`).
- **Mốc bảo toàn:** branch `checkpoint/20261118-before-inline-admin-review`, commit `859b8e931637a54be5af4b66855999718a2a0934`. Tree không thay đổi so với BASE.
- **10 luồng tổng cộng**: G00 Tổng chỉ huy + G01–G09 thực hiện; chín nhánh đã tạo từ đúng BASE; không được dùng `main`/branch của luồng khác làm base.
- Đây là TÁC VỤ LẬP TRÌNH độc lập: mỗi nhóm hoàn thiện code + fixture/test + checkpoint + commit/push + PR; không dừng ở mô tả kế hoạch; không cần chờ luồng khác. Test thiếu môi trường phải ghi NOT_RUN, không báo PASS.
- Không sửa `source/AGENTS.md`, `README.md`, `package.json`, GitHub workflows, `source/scripts/pages-release-policy.mjs`, Firebase Rules, schema/auth/CAS/lease, nguồn Excel/dữ liệu sản xuất, `version.json`, `main`, hay `HOPHDND_PAGES_APPROVED_MAIN_SHA`; tuyệt đối không tự merge/publish/deploy. Bất kỳ thay đổi nhạy cảm phải nêu blockers và giao G00 quyết định. Không force-push, không reset nhánh khác.
- Chỉ người quản trị có quyền mới thấy controls chỉnh giao diện dùng chung; guest/nhân viên không có quyền tuyệt đối không thể thay đổi cấu hình qua DOM giả. Chế độ chỉnh giao diện không được bật chế độ chỉnh hồ sơ.
- Mọi thay đổi giao diện có **xem trước/nháp** khi thích hợp và **chỉ ghi khi thao tác kết thúc** (drop, Enter, xác nhận). Không ghi từng pixel/keystroke. Với cấu hình dùng chung, dùng lại writer Firebase revision/CAS và xử lý conflict/rollback hiện có; không tự ghi trực tiếp Firebase từ component.
- Không biến sở thích cá nhân localStorage (bộ màu/mẫu popup) thành cấu hình chung. Không làm thay đổi số liệu, định nghĩa “Không phải trình”, danh mục trạng thái khóa hay quyền nguồn.
- Tiêu chuẩn test: `cd source && npm run typecheck && npm test`; `npm run build:compact:qa` với smoke/Chrome fixture phù hợp, `npm run test:spark` (Firebase emulator). Nếu môi trường không có khả năng chạy thật, ghi `NOT_RUN` + lý do, code/test fixtures vẫn phải được bàn giao. Phân biệt Code SHA và Tested SHA; **không DONE** khi chưa có đúng bằng chứng (hoặc nêu rõ PoC NOT_RUN).
- Kích thước/UX: desktop 1920x1080, 2K, 900px và màn hình hẹp; keyboard (Tab, Enter, Esc, Alt+arrow khi phù hợp), focus/ARIA, text wrap, drag vs sort vs edit, scroll không nhảy, prefers-reduced-motion.
- Mỗi luồng dùng file báo cáo riêng `source/docs/tasks/INLINE_ADMIN_GXX_20261118.md`; ghi việc đã làm, các file đổi, tests + PASS/FAIL/NOT_RUN, ghi SHA, ảnh/fixture khi có, rủi ro, PR URL. Không sửa cùng file báo cáo hay COMMON của người khác.
- Báo cáo khi hoàn tất vào chat: `GXX | BRANCH | PR | Code SHA | Tested SHA | PASS / FAIL / NOT_RUN | phần đã chạy thực sự | blockers`. Một nhánh PoC độc lập đã PASS không đồng nghĩa đã tích hợp và nghiệm thu website thực tế.
- G00 chủ trì cherry-pick/merge/corridor integration, QA toàn hệ thống, giải quyết giao diện nối callback, cuối cùng phát hành đúng Pages gate; chỉ xin phê duyệt SHA một lần cho đợt phát hành tổng hợp nếu chính sách bắt buộc.

## Ranh giới tệp: CHỈ một owner

| Luồng | Nhánh đã tạo | File được phép sửa trong source/src (ngoài file mới & test/docs mới riêng) | Mục tiêu |
| --- | --- | --- | --- |
| G01 | `g01/20261118-inline-list` | `features/items/ItemList.tsx`, `features/items/ColumnHeader.tsx`, `features/items/ItemSummaryCards.tsx` | Tên danh sách/đầu cột/nhóm, ẩn–hiện cột/thẻ, phạm vi tìm cạnh ô search |
| G02 | `g02/20261118-inline-report-tables` | `app/App.tsx`, `features/reports/ReportTable.tsx` | Chỉnh tên/hiện/ẩn và kéo thứ tự báo cáo, kéo/ẩn/reorder cột tại report đang hiển thị |
| G03 | `g03/20261118-report-visual-toolbar` | `features/settings/ReportLayoutPanel.tsx`, `features/settings/ReportSettings.tsx` | Thanh phong cách/màu/font báo cáo độc lập, áp dụng vào preview + callback; G00 nối vào trang chạy nếu chạm App |
| G04 | `g04/20261118-popup-direct-edit` | `features/reports/ReportDetailGrid.tsx`, `data/report-detail-preferences.ts` (nếu cần) | Popup rộng kéo cạnh, tên nhóm/cột, ẩn cột, reset, thẻ xem/nháp |
| G05 | `g05/20261118-column-catalog` | `features/items/ItemColumnPanel.tsx`, `features/catalogs/CatalogPanel.tsx` | Quản lý dropdown/cột ngay tại công cụ cột, thêm/sửa/xóa/reorder lựa chọn có kiểm tra |
| G06 | `g06/20261118-status-colors` | `features/items/StatusPaletteManager.tsx`, `data/status-palettes.ts` (nếu cần) | Palette inline gần chú giải, live preview, reset cá nhân, không chạm data |
| G07 | `g07/20261118-resize-gestures` | `components/ColumnResizeHandle.tsx`, `components/DeferredWidthInput.tsx` (nếu tồn tại) | Bộ kéo biên/cỡ cửa sổ dùng chung: pointer, keyboard, touch, clamp, commit-on-end |
| G08 | `g08/20261118-l03-inner-widths` | `features/items/CompactGroupedValue.tsx`, `features/items/compact-columns.ts` (nếu cần), tạo `features/items/L03InlineWidthControl.tsx` riêng | Trực quan 5 độ rộng L03, có API callback/harness độc lập; G00 nối writer từ ItemList |
| G09 | `g09/20261118-inline-ui-qa` | Không sửa source sản phẩm hiện hữu; chỉ tạo `source/scripts/inline-admin-*.mjs`, `source/tests/inline-admin-*.test.tsx`, fixture/ docs nhiệm vụ riêng | Browser QA, role/permission, keyboard, 1920x1080, regression, kiểm tra bảo vệ dữ liệu |

Mỗi luồng tự thêm file component/CSS theo prefix `inline-gXX-` riêng, tự thêm test tên `inline-admin-gXX-*.test.tsx` hoặc `.test.ts`, fixture `inline-admin-gXX-*`. Không đổi tệp người khác sở hữu. G02 là owner DUY NHẤT được sửa App.tsx trong các nhánh thực thi. G03/G08 không chờ G02/G01; tạo prop/callback + fixture thực thi độc lập. G00 tích hợp vào host cuối cùng.

## Tiêu chí nghiệm thu chung

- Không thêm điều khiển rối mắt vào chế độ xem. Admin có "Chỉnh giao diện" rõ ràng, controls chỉ xuất hiện khi thích hợp.
- Giữ các thao tác đã tốt: bảng Danh sách kéo tiêu đề đổi vị trí và kéo mép đổi rộng, popup kéo cột, click sửa ô, report click ô mở popup, các bộ lọc.
- Không trộn **ẩn cột** với **xóa cột**, **ẩn bảng** với **xóa báo cáo**, **ẩn cột Không phải trình** với **thay đổi quy tắc đếm**, hoặc **tô màu** với **sửa trạng thái nghiệp vụ**.
- Không ép auto-release khi source thay đổi ngoài allowlist; chỉ gộp và publish cuối cùng sau khi kiểm thử đầy đủ và đúng quy định phê duyệt một SHA tổng hợp.
- Chỉ G00 kết luận DONE tích hợp và phát hành; nhóm con có thể DONE phần việc độc lập khi test đủ.

## Sổ theo dõi G00 — kết quả mới 18/11/2026, 18:35 ICT

**Main/Pages chưa thay đổi:** `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`. **Staging:** `integration/20261118-inline-admin-g00` vẫn ở BASE (chưa cherry-pick/merge), không ảnh hưởng Firebase production. **Đã có 9/9 PR**, tất cả chưa merge.

Đối chiếu **đúng PR HEAD và đủ 10 workflows** của mỗi nhánh:

| Luồng | PR / HEAD | CI exact HEAD | Quyết định G00 |
| --- | --- | --- | --- |
| G01 | [#212](https://github.com/cavoixanh638/HopHDND-WebApp/pull/212) / `67caadb30f1d` | **10/10 PASS**; [Verify #44290471964](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290471964) PASS | Đủ điều kiện **review tích hợp**, chưa nghiệm thu chung |
| G02 | [#210](https://github.com/cavoixanh638/HopHDND-WebApp/pull/210) / `9dc1e7fd68ab` | **10/10 PASS**; [Verify #44290341826](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290341826) PASS | Đủ điều kiện review, G00 nối toolbar G03 và quyền G04 vào host |
| G03 | [#211](https://github.com/cavoixanh638/HopHDND-WebApp/pull/211) / `9e702c921f71` | **10/10 PASS**; [Verify #44293993911](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293993911) PASS | **Đã sửa 3 unit FAIL của SHA cũ**; đủ điều kiện review |
| G04 | [#213](https://github.com/cavoixanh638/HopHDND-WebApp/pull/213) / `cc99b8c1930f` | **9/10 PASS**, [Verify #44290198795](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290198795) FAIL (Chrome) | BLOCKED: R07 heading baseline `Ba khâu tùy chỉnh✎×` thay vì đúng label `Ba khâu tùy chỉnh`; cần tách action khỏi label và test lại. Đã comment PR |
| G05 | [#209](https://github.com/cavoixanh638/HopHDND-WebApp/pull/209) / `96ac44bb7f37` | **9/10 PASS**, [Verify #44293885023](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44293885023) FAIL (3 unit) | BLOCKED: legacy `item-viewport-width.test.tsx` còn tham chiếu `ColumnChoiceEditor` cũ và đòi sửa official status; G00 cập nhật contract test khi tích hợp, tuyệt đối không nới trạng thái chuẩn |
| G06 | [#217](https://github.com/cavoixanh638/HopHDND-WebApp/pull/217) / `82a5879ccade` | **9/10 PASS lần 1**; [Verify #44291500170](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44291500170) FAIL (Chrome signout) | INVESTIGATE: test Firebase signout về guest List thất bại (có thể liên quan popover/focus hoặc ngắt quãng); G00 đã **rerun job Verify lần 2**, đang chạy lúc cập nhật |
| G07 | [#214](https://github.com/cavoixanh638/HopHDND-WebApp/pull/214) / `e891a1ce07c8` | **10/10 PASS**; [Verify #44294106874](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44294106874) PASS | **Đã sửa lỗi ký tự backslash-n TypeScript**; đủ điều kiện review, cần kiểm pointer/keyboard tích hợp |
| G08 | [#215](https://github.com/cavoixanh638/HopHDND-WebApp/pull/215) / `2e9edf9b5a94` | **9/10 PASS**, [Verify #44290589004](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44290589004) FAIL (3 unit) | BLOCKED: `CompactGroupedValue` bao toàn bộ normal-mode stages trong render-prop `L03InlineWidthControl`, làm cũ shallow tests/canonical status flow không còn nhìn thấy; owner cần bảo toàn normal mode |
| G09 | [#216](https://github.com/cavoixanh638/HopHDND-WebApp/pull/216) / `82e48b0f937` | **10/10 PASS**; [Verify #44291693813](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44291693813) PASS | QA scaffold độc lập đã đạt CI; **A01–A11 tích hợp vẫn NOT_RUN** |

**Tổng: 5/9 PR đạt full 10/10 tại exact HEAD (G01, G02, G03, G07, G09), 4 PR còn lỗi Verify (G04, G05, G06, G08).** Các bài CI riêng biệt trên nhánh **không thay thế** nghiệm thu đồng thời trong staging.

### G00 đã thực hiện sau kiểm tra
- Đọc log lỗi thực tế của bốn nhánh, xác định tên test và điểm hỏng; comment chính xác vào [#213](https://github.com/cavoixanh638/HopHDND-WebApp/pull/213), [#215](https://github.com/cavoixanh638/HopHDND-WebApp/pull/215), [#217](https://github.com/cavoixanh638/HopHDND-WebApp/pull/217); yêu cầu giữ test và nghiệp vụ chuẩn, không workaround bằng cách tắt kiểm tra.
- Đã comment trường hợp test legacy G05 vào [#209](https://github.com/cavoixanh638/HopHDND-WebApp/pull/209) từ vòng trước.
- Rerun **chỉ Verify G06** trên đúng SHA cũ để phân biệt lỗi chập chờn với hồi quy thực. Không động Rules/Firebase production, `main` hoặc biến phát hành.
- Thứ tự tích hợp: G09 QA, G07 primitive, G01+G05+G08 (List/cột/L03), G02+G03+G04 (Report/popup), G06 color localStorage. Giữ checkpoint 20261118 và một PR tổng hợp vào `main` sau nghiệm thu.

## G00 thực thi tích hợp — cập nhật trong ngày 18/11/2026

**Staging PR:** [#218](https://github.com/cavoixanh638/HopHDND-WebApp/pull/218) (**DRAFT**, không merge / deploy).

| SHA staging | Nội dung | Kết quả kiểm chứng |
| --- | --- | --- |
| `c96b3aa7aeae2bc1f53aea2857d244463e86fa47` | G01+G02+G03+G07+G09, 31 files, không chồng file | **10/10 workflows PASS** |
| `8f4b43cfd1b90e906e4b1423a67402725b6a66ed` | Thêm G06 palette (4 files), nối G03 toolbar thật vào G02 App, preview local/Save CAS/Cancel & rollback, test G00 | **10/10 PASS sau rerun Chrome**. Lần đầu Chrome lỗi ở xác thực tài khoản thử nghiệm 2 tab; rerun đúng SHA đã PASS. Không xem sự chập chờn là bằng chứng tự động của quyền sản xuất |
| `58d76eadbabd534cdf40a48ec58238bbf031c357` | Chrome smoke thực với G03 toolbar: 10 font, 5 style, đổi/xem trước/hủy, tổng đếm bất biến | **10/10 workflows PASS**; [Verify #44298420814](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44298420814) |
| `400533975c87068e0b773d85491b95bff97c6ae1` | Nhập G04 (6 files), sửa icon popup bằng CSS pseudo tránh làm bẩn `textContent` tiêu đề R07, App truyền `canCustomizePopup={adminTools}` | CI tự chạy trên SHA này, **chưa có kết luận nghiệm thu ở thời điểm ghi** |

**Đã giao song song**: G05 tự cập nhật 3 legacy tests trong `item-viewport-width.test.tsx` mà không mở khóa official status; G08 sửa render-prop gây 3 status regressions; G04 sửa header label ngay trên nhánh PR riêng; G01/G02/G07/G09 làm read-only review staging, G06 ghi nhận rerun Chrome và kiểm cá nhân localStorage. Các giao việc nằm trong PR comments.

**G00 còn cần nối:** G05 catalog từ `ItemColumnPanel.focusColumnKey` với danh sách cột, G08 L03 5 rail với `applyViewerLayout` CAS (chỉ Admin, commit một lần), kiểm tra G04 popup width; xác thực chặn guest/staff và không ghi dữ liệu hồ sơ khi chỉ sửa bố cục.

**Chốt an toàn:** PR #218 vẫn Draft, `main`/Pages chưa thay đổi, production Firebase Rules/dữ liệu không được chạm tới. Không tuyên bố DONE khi CI G04/G05/G08 hoặc browser A01–A11 chưa đạt trên exact staging HEAD.

## G00 – kết quả nguồn cuối & chốt bảo vệ Pages, 18/11/2026

- PR tích hợp [#218](https://github.com/cavoixanh638/HopHDND-WebApp/pull/218) **MERGED SQUASH** vào main `a69a99900969d3053a8cac18e2ce693318ee19af`.
- **Tested staging SHA** `9cc27dea0822d1bcfee246e43d93c3ab722bc705`; **10/10 GitHub Actions SUCCESS** ([Verify #44300506927](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44300506927)): 1.127 unit PASS, 170 skipped, TypeScript, Auth/RTDB Emulator, Chrome thật, Excel, A4, CAS. `main` và staging cùng **tree SHA** `1a73af094d300ebbfdd430ebd1618584decd0552` (nội dung commit merge khớp đúng mã đã test).
- **CẢNH BÁO PHÁT HÀNH:** [Build and publish #44301388098](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44301388098) có `release-gate=SUCCESS` nhưng **`publish=SKIPPED`**, policy `mode=hold` do nhiều tệp core/permissions-adjacent nằm ngoài auto UI allowlist. Hiện **website vẫn bản cũ**, `version.json.source_sha=2b4f252aa34d0662524f6933c652921528ce7b39`; tuyệt đối không gọi đã xuất bản.
- Cần **một lần phê duyệt SHA tổng hợp**: owner đặt `HOPHDND_PAGES_APPROVED_MAIN_SHA=a69a99900969d3053a8cac18e2ce693318ee19af` trong Repository Variables; G00 chạy lại job `134791708136`, chờ `publish=SUCCESS`, đúng `version.json` và native Pages deployment. Nếu rerun không nhận variable mới, tạo **workflow_dispatch mới**, không bắt sửa biến nhiều lần.
- Không deploy Firebase Rules/dữ liệu production. Touch thiết bị vật lý, human click-through Pages mới, một số acceptance G09 thực trên production còn **NOT_RUN**; không gộp kết quả này vào CI PASS.

## G00 – tích hợp đầy đủ 9/9 luồng, checkpoint 18/11/2026

**PR staging [#218](https://github.com/cavoixanh638/HopHDND-WebApp/pull/218) vẫn DRAFT, không merge/publish.** `main` và GitHub Pages vẫn ở nguồn phát hành trước chiến dịch. Không thao tác Firebase sản xuất.

| Tích hợp | Commit staging | Bằng chứng |
| --- | --- | --- |
| G01+G02+G03+G07+G09 | `c96b3aa7aeae2bc1f53aea2857d244463e86fa47` | 10/10 workflow PASS |
| + G06, G03 toolbar nối App thực | `8f4b43cfd1b90e906e4b1423a67402725b6a66ed` | 10/10 PASS (Chrome rerun cùng SHA) |
| Chrome QA G03 trên báo cáo thật | `58d76eadbabd534cdf40a48ec58238bbf031c357` | 10/10 PASS; 10 font/5 kiểu, preview & hủy, số đếm không đổi |
| + G04 popup, fix R07 heading / verified Admin gate | `400533975c87068e0b773d85491b95bff97c6ae1` | 10/10 PASS |
| + G08 L03 track overlay và CAS | `b5e82c6fe7489a842af709ac8541da04a2420153` | 10/10 PASS; normal status picker không bị render-prop che |
| + G05 mini catalog, menu đầu cột và legacy tests | **`9cc27dea0822d1bcfee246e43d93c3ab722bc705`** | Typecheck + toàn bộ unit PASS; 9/10 workflows PASS tại checkpoint, còn Chrome Verify đang chạy. Chưa DONE |

G00 đã bổ sung các điều chỉnh tích hợp không xóa nghiệp vụ: (1) icon G04 bằng CSS pseudo để không làm bẩn tên nhóm; (2) G08 chỉ render-prop khi Admin chỉnh giao diện, luồng sửa trạng thái còn nguyên; (3) G05 `focusColumnKey` mở từ đầu cột, giữ khóa official statuses, kiểm thử lại Save Catalog/Permissions/Layout; (4) G03 live visual toolbar chỉ lưu qua writer Firebase revision và rollback khi lỗi; (5) G09 QA scaffold nằm trong tree nhưng bài QA WebApp phối hợp A01–A11 cần nghiệm thu theo mức PASS/NOT_RUN.

G00 giao rà soát song song read-only cho G01/G02/G07/G09 trên PR #218, worker G05 kiểm tra legacy tests trên nhánh riêng, G04/G08 tự hoàn thiện chính PR nếu muốn; không được commit vào nhánh khác. Mọi phát hành phải qua GitHub Pages exact-SHA release-gate, không yêu cầu owner thay variable mỗi commit. Chỉ một SHA nguồn tổng hợp sau khi kiểm thử.

## Kế hoạch tích hợp và thứ tự xử lý

1. **P0 unblock ngay:** G07 sửa TS syntax literal backslash-n và chạy Typecheck; G03 chữa 3 unit FAIL (soát title trim, optional accent, legacy 10-font UI test); G05 giữ status chuẩn immutable, G00 cập nhật legacy test dựa trên contract mới. Không nới logic an toàn để qua test.
2. **Đóng đủ CI:** Chờ các nhánh còn lại có GitHub Verify SUCCESS trên đúng SHA gần nhất; không lấy PASS của commit cũ, không coi queued là PASS. Tránh tạo commit checkpoint liên tục để giảm queue Actions.
3. **G00 lắp vào nhánh staging, không đụng main:** đưa QA G09, primitive G07 và các PR độc lập đã PASS; tích hợp G01 + G05 + G08 qua `focusColumnKey` và `l03InlineEditor` dùng `applyViewerLayout` CAS; tích hợp G02 + G03 live toolbar và G04 popup admin gate; G06 palette giữ localStorage cá nhân.
4. **Full integrated regression:** chạy `npm run typecheck`, `npm test`, `npm run test:spark`, Chrome CDP/fixtures G09; viewport 1920x1080, 2560x1440, 900/390, mouse/touch/keyboard, A4, không ghi hồ sơ khi sửa bố cục, guest/staff không có controls, CAS conflict/rollback 2 phiên, số thống kê không đổi.
5. **Chỉ khi toàn bộ PASS:** PR staging duy nhất vào `main`, bảo toàn checkpoint ban đầu; bảo đảm Pages gate nhận đúng SHA sau merge và tự động phát hành nếu đủ điều kiện; thay đổi bảo vệ thì chỉ xin phê duyệt duy nhất SHA bản cuối. Kiểm `publish=SUCCESS`, `version.json.source_sha` và GitHub Pages Deploy trước khi nói đã xuất bản.

**Chưa có PR nào được G00 merge/publish. Không thay dữ liệu/Firebase production.**
