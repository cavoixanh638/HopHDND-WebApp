# Checkpoint — Chat 3: Công cụ operator nhập dữ liệu lần đầu

- **Status: DONE** — hoàn tất độc lập gói CLI/Emulator theo hợp đồng nhiệm vụ; **production NOT RUN / NO GO**.
- Nhánh cố định: `parallel/20261102-chat3-bootstrap`; [file nhiệm vụ](../CHAT_3_BOOTSTRAP.md).
- **Code SHA / tested SHA: `342b8f620e4edcaead93a1e04d0f502f2a672cdd`**.
- **CI PASS**: [run #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) (Node22, Auth/RTDB/Functions Emulator + FULL Rules). CI cũ [#41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353) cũng PASS.
- Lưu: **REMOTE** trên GitHub, không có WIP/worktree chưa push; docs-only sau tested SHA: hướng dẫn/biên nhận, [report](../reports/CHAT_3.md) và checkpoint này.
- Ngày: 2026-11-02, Asia/Saigon; đã đọc `QUY_UOC_CHUNG.md` **v2** (blob `ad0d6cd42b224061a39bbf11de8753471d342e35`).
- Không tạo/merge PR, không deploy, không dùng dữ liệu/token thật; chỉ ghi đúng nhánh Chat 3.

## Đã làm / quyết định cần giữ
- CLI thực tế: xác nhận SHA source/approval lại trước CAS, admin Google verified, empty-root preflight, CAS một lần, server readback và private receipt; thoát `0` success, `2` HOLD **trước CAS**, `3` UNKNOWN **sau CAS**, tuyệt đối không tự retry.
- QA riêng `parallel-qa/chat3/operator-preflight.mjs`: 12 negative scenarios; `operator-lost-ack.mjs`: proxy RTDB chặn ACK nhưng cho CAS thật ghi server, so sánh read-only witness, receipt UNKNOWN, replay bị chặn; thêm lỗi RTDB **trước CAS** (exit 2, không receipt, server không đổi).
- Workflow mới `.github/workflows/parallel-chat3-operator.yml` chỉ kiểm thử, không deploy. Hướng dẫn `docs/operations/PR147_OPERATOR_FIRST_IMPORT.md` có lệnh emulator, bảng xử lý sự cố và mẫu receipt không chứa secret.

## Kiểm thử xác nhận trên `342b8f62…`
- **PASS**: `CHAT3_PREFLIGHT_TOTAL 12` và real CLI FRV-02 empty-root CAS/readback/duplicate block.
- **PASS**: `CHAT3_PREWRITE_OFFLINE_HOLD_PASS` — prewrite timeout/hỏng kết nối; exit 2, no attempt marker, server unchanged.
- **PASS**: `CHAT3_REAL_CAS_LOST_ACK_UNKNOWN_PASS` — 1 write frame, ACK suppressed, server có đúng 1 bản ghi, exit 3, marker UNKNOWN, repeat không đổi server.
- **NOT RUN / cấm**: production Firebase, live credentials, Rules deployment, source switch và release GO.

## Đang làm / WIP
- **Không có**. Mọi sửa code/test/docs/checkpoint đã lưu lên nhánh; không có runner/job đang chờ trong luồng này.

## Bước tiếp theo (chỉ khi điều phối yêu cầu)
1. Điều phối đọc [báo cáo Chat 3](../reports/CHAT_3.md), dùng code SHA + Actions URL để tích hợp/review. **Không làm lại** các bài test đã có PASS.
2. Live full-root snapshot, approvals, backup/restore, Rules/IAM, go/no-go vẫn là gate của người vận hành/điều phối, không phải DONE production.
3. Chat mới nếu nhận lại file nhiệm vụ thấy trạng thái **DONE** thì chỉ báo kết quả, không mở vòng sửa mới.

## Ngoài phạm vi
- Không sửa parser `business-excel.ts`, CAS `firebase-primary-bootstrap.ts`, backend/Rules, root package/lock, cấu hình release, backup hay nhánh chat khác.
