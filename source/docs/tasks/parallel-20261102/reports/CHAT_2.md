# Báo cáo hoàn tất Chat 2 — UI và thao tác người dùng

- Ngày kiểm: 2026-11-02 15:09 Asia/Saigon; nhánh riêng `parallel/20261102-chat2-ui`.
- Baseline chung `0a04b81dbb00979fb87aee7fc497e802058d8518`; **tested UI code SHA `3b0153fabe988fadfc989206eecf1fb36675ab4e`**.
- Không merge/publish/deploy, không truy cập credentials/production. Chỉ có dữ liệu tổng hợp và Emulator localhost demo.
- Checkpoint trạng thái cuối: [handoffs/CHAT_2.md](../handoffs/CHAT_2.md).

## Ma trận luồng và kiểm chứng

| Luồng | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| Đăng nhập / phân quyền admin và khách | PASS | Real App Emulator QA01, QA02; admin + guest Auth giả, RTDB readback |
| Danh sách, thanh điều hướng, mobile | PASS | Real App QA01; desktop 1440px, guest 390px; screenshots và geometry |
| Lọc/tìm tiếng Việt, focus, Escape | PASS | 9 Chrome keyboard cases @390/900/1440 cho Phòng/CV trong dialog, synthetic 3 dòng |
| Sửa ô, khóa muộn ACK, blur, unmount, refocus | PASS | 5 Chrome component cases (lease giả), real App QA03 hai tab cùng UID, QA04 mất ACK và retry |
| Nháp, offline/mất ACK | PASS theo kịch bản | Real App QA04; no false save-ACK; Chrome denial mode. Không chứng minh mọi kiểu mất mạng |
| Lịch sử trường N/O | Không đổi mapping; coverage gián tiếp | Real App QA04/QA05/QA08 audit/unsaved; HistoryDialog đọc theo mã hiện có, không sửa |
| Báo cáo/popup và chỉnh sửa | PASS | Real App QA05 và ảnh popup; guest không cấp chức năng ngoài quyền |
| Quản trị, freeze, Excel và đổi generation | PASS | Real App QA02, QA06, QA07, QA08 trên Emulator; không ghi nguồn thật |

## Lỗi phát hiện và sửa

1. **Bộ lọc Phòng/CV nuốt Escape khi giá trị trống**: trước, `RoomSpecialistFilterCell.clear` luôn `preventDefault/stopPropagation`; khi trống, Esc không đến dialog. Sau, chỉ chặn Esc nếu trường đang có giá trị; không thay AND filter và giao diện. `RoomSpecialistFilterCell.test.ts` bổ sung unit; 9/9 browser cases PASS.
2. **Khóa tồn tại sau khi người dùng blur/unmount trước ACK**: `LeaseTextInput` cũ gọi `manager.acquire().then(()=>setReady(true))` mà không kiểm editor còn focus; `manager.cancel` lúc blur chạy trước ACK nên không hủy lease vừa đến. Chrome trước sửa tái hiện lỗi ở 390/1440, unmount, rapid refocus. Mã sửa tạo epoch/release fence: chờ ACK cũ và hủy khóa trước request mới; không xác nhận quyền sửa khi editor mất focus, không hủy save đang pending.
3. **Click nút bên cạnh có thể mất trong lúc blur**: bản sửa vòng 1 bỏ status đang xin khóa ngay ở blur làm layout dịch dưới pointer và mất click unmount trong fixture. Bản sửa cuối giữ feedback đến khi release settle, vẫn chấp nhận focus mới theo epoch; Chrome kiểm lại PASS.

## Bằng chứng trước/sau theo exact SHA

| Mốc | SHA | Kết quả |
|---|---|---|
| Baseline đã có trước luồng | `0a04b81d` | [FULL App QA #41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) PASS lịch sử |
| Bản filter đầu tiên | `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60` | [Typecheck/unit/build #41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) PASS |
| Before-fix browser witness | `cebc83c37820f801a07147dd663fd69b910214d9` | [#41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) 10 PASS/4 FAIL; [PNG+JSON](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275/artifacts/13125610220) |
| Bản sửa vòng 1 | `0b9495831f5b39cb94dbe14c6b472a9f4c63df3c` | [#41410141277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410141277) 13 PASS/1 FAIL (click layout shift) |
| **Bản cuối UI + unit + Chrome** | **`3b0153fabe988fadfc989206eecf1fb36675ab4e`** | **[#41410409226](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226) PASS**: npm ci, typecheck, targeted unit, full unit, Pages test build, Chrome **14 PASS/0 FAIL**; [10 PNG + witness.json](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226/artifacts/13124872967) |
| **Bản cuối real App Emulator** | **cùng SHA `3b0153fa`** | **[#41410409168](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168) PASS**: 8/8 kịch bản Real App + Auth/RTDB/Functions Emulator và Chrome, [20 PNG + witness.json](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168/artifacts/13124753409) |

Ghi chú minh bạch: full App run trung gian `fff8d308` [#41410259963](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410259963) PASS 7/8, QA02 timeout ở selector xác nhận quyền; run cuối cùng trên **đúng SHA sau sửa** đã PASS QA02 + 7 case còn lại. Không sửa shared runner/Rules để làm xanh. Khả năng bất ổn thời điểm/locator chưa được phân tích đủ để kết luận có lỗi sản phẩm; người điều phối có thể lặp gate nếu cần.

## Chỉ mục ảnh, nguồn dữ liệu và giới hạn

- Component witness: fixture ở `source/parallel-qa/chat2/fixture.tsx`, 3 dòng tên Phòng/CV tiếng Việt tự tạo, lease stub, popup dialog; Chrome 390/900/1440, không Auth/Firebase. PNG: `filter-filled-390.png`, `filter-room-cleared-390.png`, `lease-late-ACK-390.png`, `lease-refocus-900.png`, `lease-denied-1440.png`. Các ảnh fixture **không** dùng làm bằng chứng parity toàn bộ App.
- Real App witness: exact Rules candidate chỉ đọc trong Emulator `demo-hdnd`, seeded 2 dòng dữ liệu tổng hợp và Auth admin/guest giả; viewport admin 1440, guest mobile 390. PNG: `01-full-app-desktop-admin.png`, `02-full-app-mobile-guest.png`, `15-real-report-popup.png`, `18-old-draft-server-fenced.png`; witness chứa trạng thái server/permissions/audit, không dùng dữ liệu thật.
- Chính sách màu, độ rộng/kéo cột adjacent-first, lịch sử trường N/O, popup guest, polling 60 giây, quyền hiện hành, API, schema dữ liệu, build/deploy config chung **không đổi**.
- Không đưa ra kết luận production GO; kiểm thử production, rollout, tài khoản thật, Rules deploy và đối chiếu backup thực **không thuộc Chat 2**.

## Các file Chat 2 có thay đổi

`source/src/features/items/{RoomSpecialistFilterCell.tsx,RoomSpecialistFilterCell.test.ts,LeaseTextInput.tsx}`;
`source/parallel-qa/chat2/{index.html,fixture.tsx,ui-browser.mjs}`;
`.github/workflows/{parallel-chat2-ui-checks.yml,parallel-chat2-full-app.yml}`;
`source/docs/tasks/parallel-20261102/{reports/CHAT_2.md,handoffs/CHAT_2.md}`.

Các thay đổi `QUY_UOC_CHUNG.md` v2 và `HANDOFF_TEMPLATE.md` trên nhánh là của điều phối, không phải sửa Chat 2. Full QA runner chỉ được gọi, không bị sửa.
