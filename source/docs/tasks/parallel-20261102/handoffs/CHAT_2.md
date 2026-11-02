# Checkpoint — Chat 2: UI (quy ước v2)

- **Trạng thái:** IN_PROGRESS · cập nhật 2026-11-02 14:59 Asia/Saigon.
- **Nhánh:** `parallel/20261102-chat2-ui`; mốc gốc `0a04b81d`; HEAD sau QA+workflow `cebc83c37820f801a07147dd663fd69b910214d9`.
- **Code UI đã kiểm:** `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60` (CI PASS [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605)). HEAD sau đó chỉ báo cáo/quy ước và sửa workflow.
- **CI browser workflow mới:** [41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) — QUEUED lúc cập nhật; phải theo dõi đến kết luận, code UI chưa đổi từ `876b69d`.
- **Worktree:** không có; GitHub connector là writer; container `git ls-remote` lỗi DNS; không có code LOCAL_ONLY. Writer khác: chưa thấy commit UI song song, không thể xác minh worktree ngoài hệ thống.

## Đã thực hiện
- Đọc `QUY_UOC_CHUNG.md` v2 (blob `ad0d6cd4...`), file nhiệm vụ, checkpoint và đối chiếu HEAD/CI; không reset, không lặp test đã PASS.
- Sửa Escape khi bộ lọc Phòng/CV rỗng; unit cùng vùng UI; báo cáo [CHAT_2](../reports/CHAT_2.md).
- Workflow đã lọc scope, bổ sung chạy Chrome và lưu artifact; sửa lỗi cú pháp YAML của run `41409756618` (bị FAIL trước khi tạo job); [run mới 41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) đang chờ.

## Đang làm / quyết định
- Đã push `source/parallel-qa/chat2/{index.html,fixture.tsx,ui-browser.mjs}`: Chrome component thật, synthetic guest-style popup & lease stub, 390/900/1440, PNG+JSON; code QA chưa PASS.
- Xác minh race `LeaseTextInput` blur trước server ACK (code hiện `then(setReady(true))` sau blur), sửa nếu tái hiện; không đổi `source/src/data/`, API/quyền hay hành vi ACK.
- GIỮ palette/status/column resize/guest popup/polling; không publish, merge, production.

## Kiểm thử và phần chưa hoàn tất
- PASS baseline QA [41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) (SHA nền), PASS Chat2 typecheck/unit/build [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) (SHA `876b69d`).
- **Chrome mới:** RUNNING/QUEUED, chưa PASS; Auth/RTDB/Functions Emulator: NOT RUN. Screenshot chỉ khi runner thực chạy.

## Bước tiếp theo
1. Theo dõi đến kết luận [CI 41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275), đọc artifact/log nếu thất bại; sửa lỗi harness trước khi khẳng định lỗi ứng dụng.
2. Dùng Chrome synthetic tái hiện lỗi LeaseTextInput; sửa UI, chạy lại Chrome + typecheck/unit trên đúng SHA; ghi expected/actual và PNG.
3. Nếu có thể, chạy Emulator với baseline và full-app runner trong CI riêng; kết luận PASS/NOT RUN minh bạch, cập nhật báo cáo + checkpoint DONE hoặc DONE_WITH_EXTERNAL_GAPS.
