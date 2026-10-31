---
name: hophdnd-cell-picker-regression
description: "Dùng khi thêm/sửa dropdown ô chỉnh sửa trong bảng hoặc popup: kiểm vị trí bám ô, click chuyển editor, focus/keyboard, quyền và vòng đời lease bất đồng bộ; chẩn đoán bằng Chrome thật, test thuần và Firebase Emulator riêng biệt."
---

# Kiểm và sửa dropdown ô chỉnh sửa

## Mục tiêu và ranh giới

Một ô chỉnh sửa thường gồm **trigger**, **menu nổi**, **quyền mở**, **lease/ACK**, **giá trị draft** và **lệnh lưu**. Lỗi có thể nằm ở một trong sáu lớp đó; không sửa CSS hay tăng `z-index` theo phỏng đoán. Ưu tiên giữ API, menu options, semantic field và dữ liệu gốc. Chỉ thay mã khi đã có ca tái hiện đỏ (hoặc bằng chứng lỗi nhất quán) trên baseline chính xác.

Skill này là **quy trình đọc từ repository**, không cài đặt vào tài khoản ChatGPT/Codex, không cấp quyền chạy production. Trước khi dùng, đọc `AGENTS.md`, hợp đồng tác vụ và ownership hiện tại. Không tự merge, deploy, publish, ghi hoặc đọc dữ liệu thật.

## 1. Chẩn đoán bằng sáu câu hỏi

1. **Sai ô hay sai click?** Ghi tọa độ pointerdown/up/click thật; kiểm `document.elementFromPoint(x,y)`, `aria-expanded`, `aria-busy`, số popover đang mở. Phải chỉ **một lần bấm B** để đóng A và mở B; không replay/synthetic `.click()` thay thế bằng chứng pointer vật lý. Nếu B phải bấm hai lần, kiểm outside-pointer capture, blur, unmount và coordinator trước.
2. **Menu bay xa khỏi ô?** Đo `trigger.getBoundingClientRect()`, `popover.getBoundingClientRect()`, `scrollHeight`, `clientHeight`, `data-placement`, visual viewport `offsetTop/Left/height/width`. Đo **menu sau khi render và sau lọc**, không lấy `max-height` hằng làm chiều cao tự nhiên. Điểm kiểm ví dụ: `3px <= gap <= 9px`, menu nằm trong vùng hiển thị có margin và chọn phía đủ chỗ; đây là oracle của HopHDND, không phải hằng số phổ quát.
3. **Focus lạc?** Theo dõi `document.activeElement` khi mở/chuyển, Enter chọn cùng giá trị (no-op), Escape trả focus về trigger, Tab ra menu đóng đúng một lần. Popover có ô tìm kiếm thì focus ô tìm, không ép focus lên lựa chọn đã lọc mất.
4. **Quyền/lease?** Ghi thứ tự `acquire → ACK → cancel/release → acquire mới` bằng ID field + record + generation + phiên. Kịch bản khó: popup A đang chờ ACK rồi unmount, một pointer mở B **cùng field**, ACK của A đến muộn: A chỉ cancel lease của A, không hủy B. Không coi `canEdit` của UI là bằng chứng quyền server.
5. **Có ghi ngoài ý muốn?** Đếm `onChange`, patch/draft và revision/history (khi dùng Emulator) ở từng bước: mở, đổi ô, outside, Escape, Tab, chọn lại giá trị cũ = **0 patch**. Lựa chọn mới chỉ lưu khi được xác nhận theo giao thức CAS/audit hiện hành. Preserve optional clear; không thêm clear vào status/partyLevel.
6. **Có rò rỉ?** Chỉ gắn `pointerdown/keydown/scroll/resize/visualViewport/ResizeObserver` khi menu mở, tháo khi đóng/unmount. Đếm listener trước/sau; thử cuộn container bảng/popup, resize, viewport mobile và đưa trigger ra khỏi vùng nhìn để editor đóng an toàn.

## 2. Tái hiện tối thiểu rồi mới sửa

**Cấp 1 — logic thuần/SSR:** kiểm placement 3/5/7 lựa chọn, content height, clamp width, trên/dưới, visual viewport bằng unit; SSR chỉ xác nhận menu đóng không mount option ẩn. Không gọi đây là bằng chứng click, focus hay security. Dữ liệu menu phải giữ current legacy value, không thêm option rỗng vào status.

**Cấp 2 — Chrome trên component thật:** build **chính ứng dụng/ItemList/popup của baseline** với fixture synthetic; dùng CDP Playwright hoặc browser driver phát `mouseMoved → mousePressed → mouseReleased`, keyDown/up. Kiểm main/popup; phía trên/cuối viewport; 1440 và 390; menu search trước/sau lọc; scroll container/visual viewport; một-click A→B→C; pointer ngoài; Escape/Tab/no-op; screenshot và JSON geometry. Đừng gọi `HTMLElement.click()` là physical click. Cần biết `window.__...patch` thuộc fixture, không tự nhận là production readback.

**Cấp 3 — controlled ACK:** mount/unmount **CellPicker thật** nhưng lease manager mô phỏng để chủ động giữ ACK; log timeline, fence, cancel count, patch count, listener count. Đây là *React/Chrome thật + lease giả*, không chứng minh Firebase Rules.

**Cấp 4 — Firebase Emulator:** chạy Auth + RTDB Emulator với dự án `demo-*`, Rules candidate riêng và SDK user thực trong Emulator. Test grant/deny/revoke, lease expiry/generation/freeze, CAS/revision/history và no-op. Không dùng owner REST write hoặc `withSecurityRulesDisabled` làm thao tác subject; elevated fixture setup chỉ để seed dữ liệu. Không suy PASS backend từ màu/tooltip hoặc Chrome mock.

**Đầu vào cần lưu:** exact baseline SHA, branch, role/field/record, editor open/closed, viewport, cách click/scroll, snapshot quyền/lease, raw và patch trước/sau. **Đầu ra tối thiểu:** log có key sự kiện, rect `anchor/menu/gap/viewport`, ảnh Chrome, pass/fail theo case, đường dẫn test và exact HEAD/CI URL. Nếu browser startup fail trước assertion, phân loại là hạ tầng và retry hữu hạn cùng SHA; nếu assertion fail, điều tra, không rerun mù để xanh.

## 3. Sửa đúng lớp, không phá invariant

- **Handoff một click:** outside pointer của menu A không được chặn click tự nhiên vào trigger B; coordinator đóng A rồi chờ một release fence trước acquire B. Cleanup của A phải idempotent và không hủy lease B, kể cả cùng record/field. Không tự chọn giá trị khi đóng.
- **Placement:** menu bám trigger bằng rect hiện thời, đo content height thật, chọn dưới nếu đủ chỗ, nếu thiếu mở lên sát trigger; nếu cả hai phía thiếu, ưu tiên phía rộng hơn và scroll **trong menu**. Reposition theo scroll/resize/visual viewport; nếu trigger rời viewport hoặc vùng cuộn có clip, đóng. Cẩn thận native popover và focus có thể làm scroll sau frame đầu.
- **Focus/keyboard:** không tạo backdrop che pointer, không khiến blur của A đóng B, không chọn twice với Enter/Space. Focus restore chỉ khi đóng chủ động bằng keyboard; role/aria phản ánh menu thực.
- **Quyền và dữ liệu:** không nới grant/admin, lease/audit/CAS, không đổi row/field khi chỉ mở menu. Chặn trường locked (ví dụ HC/BC Build) ở caller/repository/Rules theo hợp đồng riêng; picker generic không đoán loại VB. Giữ raw Excel/history, menu canonical, optional clear, text Unicode và custom highlight.
- **Hiệu năng:** closed picker không render hàng loạt options; cleanup ResizeObserver/listener luôn có đối xứng. Chỉ đổi interface/caller nếu ownership cho phép.

## 4. Lệnh kiểm chứng — ví dụ dự án HopHDND

Từ thư mục `source/` của checkout baseline/branch **cô lập** với Node 24 và Chromium có sẵn:

```bash
npm ci
npm run typecheck
npx vitest run tests/pr95-v5-l1-dropdown.test.tsx tests/cell-picker-lazy.test.tsx
npm run build:compact:qa
node scripts/pr95-v5-l1-dropdown-browser.mjs
node scripts/pr95-v5-l1-race-browser.mjs
node scripts/pr95-v6-l5-scroll-browser.mjs  # cuộn khi đang mở + visualViewport pinch 390px
# Backend safety là phép thử riêng, chỉ chạy trong Auth/RTDB Emulator:
npm run test:firebase
```

Dấu mốc:
- `PR95_V5_L1_RECT`, `PR95_V5_L1_REAL_POINTER_SINGLE_CLICK_HANDOFF_PASS`, `PR95_V5_L1_REAL_CHROME_PASS`: browser thật trên List và ReportDetailGrid synthetic.
- `PR95_V6_L5_SCROLL_VISUAL_VIEWPORT_PASS`: Chrome thật cuộn khi menu mở, anchor ra khỏi vùng clip thì đóng; thay đổi visualViewport khi pinch, ảnh trước/sau và patch=0. Đây là bổ sung audit V6, khác với công thức placement unit.
- `R_V5_02_PENDING_A`, `R_V5_02_LATE_ACK_SINGLE_CLICK_SAME_FIELD_PASS`, `R_V5_02_LEASE_NOOP_LISTENER_CLEANUP_PASS`: controlled ACK; kiểm chính chuỗi `acquire:A,ack:A,cancel:A,acquire:B,ack:B`, canceledA=1, canceledB=0 trước Esc và patches=0.
- Screenshot `pr95-v5-l1-*.png` được tạo trong `source/` bởi runner Chrome; artifact CI có thời hạn, nên **source + oracle trong test** mới là tham chiếu lâu dài. Nếu một case chưa được runner kiểm, ghi `not covered`, không gán PASS bằng suy đoán.

## 5. Bản đồ invariant liên quan (không tự động chạy mọi test)

| Nhóm | Nguồn và regression trong repo | Khi cần chạy thêm |
|---|---|---|
| Dropdown/handoff/placement/focus | `src/features/items/CellPicker.tsx`, `pr95-v5-l1-picker-{coordinator,placement}.ts`; `tests/pr95-v5-l1-dropdown.test.tsx`; `scripts/pr95-v5-l1-{dropdown,race}-browser.mjs`, `scripts/pr95-v6-l5-scroll-browser.mjs` | Bất kỳ thay đổi picker/layout/scroll |
| Role/grant/revoke/lease/epoch | `src/data/cell-edit-leases.ts`, `tests/exclusive-cell-freeze.test.ts`, `tests/pr95-app-lease-epoch.test.ts`, `tests/inline-permissions.test.tsx` | Khi thay open/close, quyền hoặc save |
| HC/BC Build lock | `src/domain/pr95-v5-l4-build-effective.ts`, `tests/pr95-v5-l4-hc-bc-build.test.ts`, `tests/pr95-v5-l5-progress-build-write-guard.test.ts` | Nếu thay quyền chỉnh trạng thái hoặc raw projection |
| Raw Excel/history identity | `src/data/excel-transfer.ts`, `tests/pr95-l4-excel-contract.test.ts`, `tests/excel-transfer.test.ts` | Khi thay save/projection/import/export |
| Summary/filter IDs | `src/domain/item-summary.ts`, `tests/item-summary.test.ts`, `tests/pr95-l5-report-filter-parity.test.ts` | Nếu picker tạo/chọn trạng thái ảnh hưởng filter |
| Inline highlight | `src/features/items/SearchHighlight.tsx`, `tests/search-highlight.test.tsx`, `tests/compact-group-highlights.test.tsx` | Nếu menu/text label hiển thị highlight |
| Saved widths/CAS | `src/features/items/compact-columns.ts`, `tests/adjacent-column-resize.test.ts`, `tests/confirmed-page-widths.test.ts` | Nếu menu/rail ảnh hưởng resize/saved layout |

**Nguyên tắc bàn giao:** chỉ tuyên bố PASS cho exact SHA mà CI/log đã chạy; phân biệt baseline-tested và chưa kiểm **candidate tương lai**. Skill không thay thế review độc lập, không cấp quyền thao tác production.
