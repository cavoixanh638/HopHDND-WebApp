# Checkpoint — Chat 3: Operator first import

- Status: **IN_PROGRESS** — tiếp tục gap ACK-loss theo yêu cầu mới; **không làm lại** các bước đã PASS.
- Branch: `parallel/20261102-chat3-bootstrap`; HEAD lúc tiếp quản: `376d1c4fc3c304ef1b178d62a0485bec966c5afb` (commit quy ước v2, docs-only).
- Code SHA gần nhất: `9cd869c5b2dea5c0b19e90d565edcca5b512863e` (network proxy QA + workflow).
- Tested SHA: **`9cd869c5b2dea5c0b19e90d565edcca5b512863e`**; [CI PASS #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353). Baseline prior [#41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875).
- Lưu: **REMOTE**, đã commit/push file QA và workflow; không có worktree/WIP local.
- Cập nhật: 2026-11-02, Asia/Saigon; đã đọc `QUY_UOC_CHUNG.md` **v2**, blob `ad0d6cd42b224061a39bbf11de8753471d342e35`.
- File nhiệm vụ: [CHAT_3_BOOTSTRAP.md](../CHAT_3_BOOTSTRAP.md); báo cáo: [reports/CHAT_3.md](../reports/CHAT_3.md).

## Đã làm / quyết định cần giữ
- CLI thật với Excel A–O và server CAS/readback đã PASS trong Auth/RTDB/Functions Emulator. Đã kiểm sai file/digest/admin, root không trống, nhập lặp, Excel/approval đổi sau xác nhận.
- `source/scripts/operator-first-import-entry.ts` phân biệt prewrite HOLD (exit 2) và post-CAS UNKNOWN (exit 3) có attempt receipt; không auto-retry; credentials không xuất vào log/receipt.
- Phạm vi sở hữu: CLI/launcher, hướng dẫn PR147, `parallel-qa/chat3`, workflow `parallel-chat3-*`, checkpoint và report riêng. Không sửa Rules, parser/CAS chung, root package/lock, production.

## Đang làm / WIP
- Tiếp tục **chỉ** diễn tập tình huống mất ACK/kết nối sau gửi CAS, server witness và xử lý UNKNOWN; chưa có file đang sửa hoặc chưa push.
- [CI #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353) **PASS**: proxy bắt 1 frame CAS thực, chặn ACK, CLI exit 3/UNKNOWN, server vẫn có 1 bản ghi và bị chặn replay; đã thấy marker trong log.
- Không có bằng chứng writer khác trên nhánh ngoài commit đồng bộ quy ước v2; tránh ghi trùng nếu có cập nhật mới.

## Kiểm thử
- **PASS** `e0ebe52…`: [CI #41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875) (CLI thật, synthetic Emulator).
- **PASS** `9cd869c5…`: ACK bị chặn tại proxy, server commit 1 row, receipt UNKNOWN, không ghi đè khi nhập lặp; [CI #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353).
- **NOT RUN**: mọi thao tác production — cấm deploy/merge/live write.

## Bước tiếp theo
1. Bổ sung kiểm kết nối RTDB mất **trước CAS** (exit 2, không có attempt receipt, root demo không đổi).
2. Chạy CI mã bổ sung trên SHA mới, cập nhật checkpoint ngay khi có run ID và kết luận.
3. Đồng bộ hướng dẫn/biên nhận mẫu và báo cáo sạch, chốt DONE nếu tất cả gate đạt; production vẫn NOT RUN.

## Ngoài phạm vi
- Full-root live approval/backup/IAM/production: không thực hiện; trách nhiệm điều phối/vận hành.
