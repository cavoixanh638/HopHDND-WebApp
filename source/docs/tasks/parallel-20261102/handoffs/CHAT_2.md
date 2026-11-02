# Checkpoint — Chat 2: UI (quy ước v2)

- **Trạng thái:** IN_PROGRESS · cập nhật 2026-11-02 15:02 Asia/Saigon.
- **Nhánh:** `parallel/20261102-chat2-ui`; mốc gốc `0a04b81d`; HEAD code UI mới `0b9495831f5b39cb94dbe14c6b472a9f4c63df3c`.
- **Code UI mới:** `0b9495831f5b39cb94dbe14c6b472a9f4c63df3c` — TEST_PENDING [41410141277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410141277); code cũ `876b69d` đã PASS [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605).
- **CI Chrome trước sửa:** [41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) — FAIL có chủ đích do bug tái hiện, exact SHA `cebc83c37820f801a07147dd663fd69b910214d9`; artifact [13125610220](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275/artifacts/13125610220) gồm PNG + witness.
- **Worktree:** không có; GitHub connector là writer; container `git ls-remote` lỗi DNS; không có code LOCAL_ONLY. Writer khác: chưa thấy commit UI song song, không thể xác minh worktree ngoài hệ thống.

## Đã thực hiện
- Đọc `QUY_UOC_CHUNG.md` v2 (blob `ad0d6cd4...`), file nhiệm vụ, checkpoint và đối chiếu HEAD/CI; không reset, không lặp test đã PASS.
- Sửa Escape khi bộ lọc Phòng/CV rỗng; unit cùng vùng UI; báo cáo [CHAT_2](../reports/CHAT_2.md).
- Workflow đã lọc scope, bổ sung chạy Chrome và lưu artifact; sửa lỗi cú pháp YAML của run `41409756618` (bị FAIL trước khi tạo job); [run mới 41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) đang chờ.

## Đang làm / quyết định
- Đã push `source/parallel-qa/chat2/{index.html,fixture.tsx,ui-browser.mjs}`: Chrome component thật, synthetic guest-style popup & lease stub, 390/900/1440, PNG+JSON; code QA chưa PASS.
- **ĐÃ TÁI HIỆN** race `LeaseTextInput` (blur/unmount trước ACK, refocus nhanh); 9/9 filter PASS. Đã push sửa UI `LeaseTextInput.tsx` (`0b949d`): epoch fence, chờ hủy khóa cũ trước focus mới, vô hiệu hóa khi unmount/drain/disable; chờ kiểm thử, KHÔNG báo PASS trước CI.
- GIỮ palette/status/column resize/guest popup/polling; không publish, merge, production.

## Kiểm thử và phần chưa hoàn tất
- PASS baseline QA [41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) (SHA nền), PASS Chat2 typecheck/unit/build [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) (SHA `876b69d`).
- **Chrome before-fix:** 10 PASS / 4 FAIL (9 filter PASS); artifact 13125610220. **After-fix:** [41410141277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410141277) QUEUED. Emulator: NOT RUN.

## Bước tiếp theo
1. Theo dõi [run 41410141277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410141277) đến kết quả; đọc witness exact SHA, sửa nếu lỗi phát sinh.
2. Nếu CI xanh, mở thêm gate full App Auth/RTDB/Functions Emulator với candidate Rules demo; ghi rõ SHA/URL, PNG, vai trò, nguồn tổng hợp; nếu chưa thể chạy phải ghi NOT RUN.
3. Nếu có thể, chạy Emulator với baseline và full-app runner trong CI riêng; kết luận PASS/NOT RUN minh bạch, cập nhật báo cáo + checkpoint DONE hoặc DONE_WITH_EXTERNAL_GAPS.
