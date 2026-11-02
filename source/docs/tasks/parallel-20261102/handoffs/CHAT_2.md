# Checkpoint — Chat 2: UI (quy ước v2)

- **Trạng thái:** IN_PROGRESS · cập nhật 2026-11-02 14:56 Asia/Saigon.
- **Nhánh:** `parallel/20261102-chat2-ui`; mốc gốc `0a04b81d`; HEAD sau chỉnh workflow `8af962f01358c7b91106bfce1d353fb8e0be86b0`.
- **Code UI đã kiểm:** `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60` (CI PASS [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605)). HEAD sau đó chỉ báo cáo/quy ước và sửa workflow.
- **CI workflow-only mới:** [41409484881](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409484881) — đang chạy khi checkpoint; phải xác minh kết luận.
- **Worktree:** không có; GitHub connector là writer; container `git ls-remote` lỗi DNS; không có code LOCAL_ONLY. Writer khác: chưa thấy commit UI song song, không thể xác minh worktree ngoài hệ thống.

## Đã thực hiện
- Đọc `QUY_UOC_CHUNG.md` v2 (blob `ad0d6cd4...`), file nhiệm vụ, checkpoint và đối chiếu HEAD/CI; không reset, không lặp test đã PASS.
- Sửa Escape khi bộ lọc Phòng/CV rỗng; unit cùng vùng UI; báo cáo [CHAT_2](../reports/CHAT_2.md).
- Sửa workflow `.github/workflows/parallel-chat2-ui-checks.yml` chỉ chạy push khi sửa UI/QA/workflow, không kích hoạt vì checkpoint-only.

## Đang làm / quyết định
- Bước kế: bổ sung QA Chrome component thật bằng synthetic data trong `source/parallel-qa/chat2/`, test keyboard/viewport/ảnh, không gọi fixture là tích hợp.
- Xác minh race `LeaseTextInput` blur trước server ACK (code hiện `then(setReady(true))` sau blur), sửa nếu tái hiện; không đổi `source/src/data/`, API/quyền hay hành vi ACK.
- GIỮ palette/status/column resize/guest popup/polling; không publish, merge, production.

## Kiểm thử và phần chưa hoàn tất
- PASS baseline QA [41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) (SHA nền), PASS Chat2 typecheck/unit/build [41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) (SHA `876b69d`).
- **NOT RUN** trên code Chat2: Chrome viewport 390/900/1440 và Auth/RTDB/Functions Emulator; chưa có ảnh mới.

## Bước tiếp theo
1. Theo dõi CI 41409484881; viết và push harness Chrome/runner, workflow artifact trong vùng riêng; ghi code SHA+run ngay khi có ID.
2. Dùng Chrome synthetic tái hiện lỗi LeaseTextInput; sửa UI, chạy lại Chrome + typecheck/unit trên đúng SHA; ghi expected/actual và PNG.
3. Nếu có thể, chạy Emulator với baseline và full-app runner trong CI riêng; kết luận PASS/NOT RUN minh bạch, cập nhật báo cáo + checkpoint DONE hoặc DONE_WITH_EXTERNAL_GAPS.
