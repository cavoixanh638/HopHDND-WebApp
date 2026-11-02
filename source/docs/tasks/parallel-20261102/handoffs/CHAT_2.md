# Checkpoint — Chat 2: UI (quy ước v2)

- **Trạng thái:** IN_PROGRESS; cập nhật 2026-11-02 15:04 Asia/Saigon.
- **Nhánh:** `parallel/20261102-chat2-ui`; baseline `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- **HEAD code mới:** `3b0153fabe988fadfc989206eecf1fb36675ab4e` — TEST_PENDING.
- **CI mới:** component Chrome [41410409226](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226) RUNNING; real App Emulator [41410409168](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168) PENDING.
- **Worktree:** không có tại container (DNS GitHub lỗi); tất cả code đã commit/push bằng connector. Writer khác trên nhánh chưa phát hiện, chưa xác minh được ngoài GitHub.

## Đã lưu trên nhánh
- Fix `RoomSpecialistFilterCell.tsx` Escape chỉ xóa bộ lọc có giá trị; unit `RoomSpecialistFilterCell.test.ts`. PASS typecheck/unit/build cũ [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605).
- Chrome synthetic component QA trong `source/parallel-qa/chat2/{index.html,fixture.tsx,ui-browser.mjs}`; workflow `parallel-chat2-ui-checks.yml` + `parallel-chat2-full-app.yml` chỉ test, không deploy. Workflow push lọc scope, checkpoint-only không kích hoạt CI.
- **Chứng minh trước sửa:** Chrome SHA `cebc83c` [41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) 10 PASS / 4 FAIL; 9/9 filter ở 390/900/1440 PASS; race blur/unmount trước ACK & refocus FAIL; [artifact PNG/JSON](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275/artifacts/13125610220).
- **Bản sửa vòng 1:** SHA `0b949583` Chrome [41410141277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410141277) 13 PASS / 1 FAIL: giữ lease sau blur/unmount được sửa, refocus nhanh PASS; click nút unmount có thể mất khi status biến mất lúc pointer blur.
- **Bản sửa vòng 2:** SHA `3b0153fa`, giữ thông báo đang xin khóa tới khi release hoàn tất để tránh dịch vị trí nút trong một click; refocus được phân biệt bằng epoch. Chờ CI exact-head [41410409226](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226).

## Quyết định/giới hạn
- Dữ liệu popup/browser fixture synthetic; không có Auth/RTDB/Functions, không gọi component PASS là integration PASS.
- Full App workflow dùng Auth/RTDB/Functions Emulator `demo-hdnd`, exact Rules QA; tham chiếu baseline [41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199). Run cũ `fff8d308` [41410259963](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410259963) đang chạy, không thay kết quả cho code mới.
- Không đổi quyền, data/domain, màu, popup khách, kéo cột, polling, backend, shared runner, production, không publish/merge.

## Bước tiếp theo
1. Theo dõi [Chrome 41410409226](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226) đến PASS/FAIL và đọc artifact trước khi quyết định.
2. Theo dõi [Emulator 41410409168](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168) exact SHA; nếu FAIL đọc witness nguyên nhân thuộc UI hay ngoài phạm vi, sửa nếu UI.
3. Cập nhật [báo cáo](../reports/CHAT_2.md), diff và checkpoint; DONE/DONE_WITH_EXTERNAL_GAPS khi hoàn tất, ghi riêng những kiểm thử NOT RUN.
