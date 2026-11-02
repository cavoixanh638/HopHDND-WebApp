# Checkpoint — Chat 2: UI (quy ước v2)

- **Trạng thái:** IN_PROGRESS · cập nhật 2026-11-02 15:01 Asia/Saigon.
- **Nhánh:** `parallel/20261102-chat2-ui`; mốc gốc `0a04b81d`; HEAD sau QA+workflow `cebc83c37820f801a07147dd663fd69b910214d9`.
- **Code UI đã kiểm:** `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60` (CI PASS [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605)). HEAD sau đó chỉ báo cáo/quy ước và sửa workflow.
- **CI Chrome trước sửa:** [41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) — FAIL có chủ đích do bug tái hiện, exact SHA `cebc83c37820f801a07147dd663fd69b910214d9`; artifact [13125610220](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275/artifacts/13125610220) gồm PNG + witness.
- **Worktree:** không có; GitHub connector là writer; container `git ls-remote` lỗi DNS; không có code LOCAL_ONLY. Writer khác: chưa thấy commit UI song song, không thể xác minh worktree ngoài hệ thống.

## Đã thực hiện
- Đọc `QUY_UOC_CHUNG.md` v2 (blob `ad0d6cd4...`), file nhiệm vụ, checkpoint và đối chiếu HEAD/CI; không reset, không lặp test đã PASS.
- Sửa Escape khi bộ lọc Phòng/CV rỗng; unit cùng vùng UI; báo cáo [CHAT_2](../reports/CHAT_2.md).
- Workflow đã lọc scope, bổ sung chạy Chrome và lưu artifact; sửa lỗi cú pháp YAML của run `41409756618` (bị FAIL trước khi tạo job); [run mới 41409826275](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409826275) đang chờ.

## Đang làm / quyết định
- Đã push `source/parallel-qa/chat2/{index.html,fixture.tsx,ui-browser.mjs}`: Chrome component thật, synthetic guest-style popup & lease stub, 390/900/1440, PNG+JSON; code QA chưa PASS.
- **ĐÃ TÁI HIỆN** race `LeaseTextInput` bằng Chrome thật: blur trước ACK 390/1440 giữ khóa; unmount trước ACK giữ khóa; refocus nhanh kẹt waiting. Filter Esc 390/900/1440: 9/9 PASS; denial không giả ACK: PASS. Sửa UI `LeaseTextInput` kế tiếp; không đổi data/API.
- GIỮ palette/status/column resize/guest popup/polling; không publish, merge, production.

## Kiểm thử và phần chưa hoàn tất
- PASS baseline QA [41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) (SHA nền), PASS Chat2 typecheck/unit/build [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) (SHA `876b69d`).
- **Chrome before-fix:** 10 PASS / 4 FAIL xác nhận tái hiện (trong đó 9 filter PASS), nguồn synthetic, không Firebase. Auth/RTDB/Functions Emulator: NOT RUN.

## Bước tiếp theo
1. Sửa `source/src/features/items/LeaseTextInput.tsx`: vô hiệu hóa request khi blur/unmount/drain, chờ/cancel lease sau ACK trước khi focus mới; thêm tests.
2. Chạy lại Chrome + typecheck/unit ở exact SHA sau sửa, kiểm 14 case và PNG; giữ witness before-fix liên kết trong báo cáo.
3. Nếu có thể, chạy Emulator với baseline và full-app runner trong CI riêng; kết luận PASS/NOT RUN minh bạch, cập nhật báo cáo + checkpoint DONE hoặc DONE_WITH_EXTERNAL_GAPS.
