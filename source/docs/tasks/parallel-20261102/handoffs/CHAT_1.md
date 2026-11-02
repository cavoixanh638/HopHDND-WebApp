# Checkpoint — Chat 1: Backend, Rules và tính toàn vẹn dữ liệu

- **Status: DONE** — không tự mở việc mới sau khi đã nghiệm thu.
- Branch: `parallel/20261102-chat1-backend` (`cavoixanh638/HopHDND-WebApp`).
- Code regression: `5210876eb04be23c1ee611e985f82fd2bc684ceb`.
- **Tested code + CI SHA: `46e916f31976cbbf3451ff67c22832627ca28e82`**.
- Git HEAD đã đối chiếu lúc đọc v2: `94b9e54000923297ddf3b27aec3a791a455b985c`; commit sau tested SHA chỉ thay tài liệu/điều phối.
- Lưu: **REMOTE**, mã, test, workflow và báo cáo đã commit/push vào đúng nhánh. Không có WIP/LOCAL_ONLY.
- Cập nhật: 02/11/2026, Asia/Saigon. Đã đọc `QUY_UOC_CHUNG.md` **v2** (blob `ad0d6cd42b224061a39bbf11de8753471d342e35`) và `HANDOFF_TEMPLATE.md` v2.

## Đã làm / quyết định cần giữ
- Đối chiếu `source/cell-edit-service/`, `source/parent-commit-service/` và FULL Rules; giữ nguyên runtime/API/Rules vì không phát hiện lỗi đã xác nhận còn phải sửa.
- Thêm regression nhiều hàng và chuỗi A → B → RESTORE C → D → RESTORE E, có guest edit/audit tiếp sau mỗi restore: `source/parent-commit-service/test/integration.test.ts`.
- Thêm CI riêng `.github/workflows/parallel-chat1-backend.yml` (cài Chromium, Auth + cả hai Functions + FULL RTDB Rules); không deploy/publish. Chi tiết tại [báo cáo Chat 1](../reports/CHAT_1.md).

## Đang làm / WIP
- **Không có.** Không có thay đổi runtime sau tested SHA; không có run đang chờ. Không cần kiểm thử lại chỉ vì thay checkpoint.
- Writer đồng thời: chưa thể xác minh tuyệt đối ngoài phiên; phiên này không sửa mã nguồn.

## Kiểm thử
- **PASS trên SHA `46e916f3`**: cell 32/32; Chrome 4/4; parent 14/14; full App 5/5; typecheck; `PR142_INTEGRATED_SERVICES_FULL_RULES_PASS`.
- Run: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643
- Witness: `CHAT1_MULTIROW_CHAINED_RESTORE_PASS`; raw A checksum khác canonical C/E; lịch sử, backup, journal, quyền, lease bất biến; audit/proof mới; tamper bị DENIED.
- Artifact: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643/artifacts/13124356699
- Run đầu #41407577364 FAIL do workflow thiếu Chromium; đã sửa, run trên PASS. Không phải lỗi runtime.

## Bước tiếp theo
1. **Không có việc còn mở cho Chat 1**; chat sau chỉ đối chiếu Git/CI và báo DONE, không làm lại.
2. Người điều phối tự review/tích hợp khi các luồng khác hoàn tất; nếu có lỗi mới, cần nhiệm vụ/tái hiện riêng.

## Ngoài phạm vi
- Chưa xác minh production; **không** merge, deploy, publish, ghi production hay tự duyệt GO.
