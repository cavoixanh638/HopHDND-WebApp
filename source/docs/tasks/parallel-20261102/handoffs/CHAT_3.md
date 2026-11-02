# Checkpoint — Chat 3: Operator first import

- Status: **IN_PROGRESS** — tiếp tục gap ACK-loss theo yêu cầu mới; **không làm lại** các bước đã PASS.
- Branch: `parallel/20261102-chat3-bootstrap`; HEAD lúc tiếp quản: `376d1c4fc3c304ef1b178d62a0485bec966c5afb` (commit quy ước v2, docs-only).
- Code SHA đã kiểm: `e0ebe52b7f2455e2c396c46544adfa0cb764eb99`.
- Tested SHA: `e0ebe52b7f2455e2c396c46544adfa0cb764eb99`; [CI PASS #41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875).
- Lưu: **REMOTE**, chưa có worktree/WIP local.
- Cập nhật: 2026-11-02, Asia/Saigon; đã đọc `QUY_UOC_CHUNG.md` **v2**, blob `ad0d6cd42b224061a39bbf11de8753471d342e35`.
- File nhiệm vụ: [CHAT_3_BOOTSTRAP.md](../CHAT_3_BOOTSTRAP.md); báo cáo: [reports/CHAT_3.md](../reports/CHAT_3.md).

## Đã làm / quyết định cần giữ
- CLI thật với Excel A–O và server CAS/readback đã PASS trong Auth/RTDB/Functions Emulator. Đã kiểm sai file/digest/admin, root không trống, nhập lặp, Excel/approval đổi sau xác nhận.
- `source/scripts/operator-first-import-entry.ts` phân biệt prewrite HOLD (exit 2) và post-CAS UNKNOWN (exit 3) có attempt receipt; không auto-retry; credentials không xuất vào log/receipt.
- Phạm vi sở hữu: CLI/launcher, hướng dẫn PR147, `parallel-qa/chat3`, workflow `parallel-chat3-*`, checkpoint và report riêng. Không sửa Rules, parser/CAS chung, root package/lock, production.

## Đang làm / WIP
- Tiếp tục **chỉ** diễn tập tình huống mất ACK/kết nối sau gửi CAS, server witness và xử lý UNKNOWN; chưa có file đang sửa hoặc chưa push.
- Chưa có run mới; các bản kiểm thử trước không cần chạy lại nếu mã không đổi.
- Không có bằng chứng writer khác trên nhánh ngoài commit đồng bộ quy ước v2; tránh ghi trùng nếu có cập nhật mới.

## Kiểm thử
- **PASS** `e0ebe52…`: [CI #41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875) (CLI thật, synthetic Emulator).
- **NOT RUN**: fault injection ACK thất lạc *sau* server commit; chưa được tính PASS.
- **NOT RUN**: mọi thao tác production — cấm deploy/merge/live write.

## Bước tiếp theo
1. Kiểm lại CLI hiện tại, thiết kế lỗi mạng có thể tái hiện trên executable thật, xác nhận server snapshot và receipt bằng nguồn demo.
2. Ghi QA/mã thành batch riêng đúng phạm vi, chạy CI và theo dõi đến kết luận, cập nhật checkpoint ngay sau khi có run ID.
3. Chốt báo cáo với tested SHA và gap thật; nếu kiểm chứng đầy đủ thì DONE, không tự suy production GO.

## Ngoài phạm vi
- Full-root live approval/backup/IAM/production: không thực hiện; trách nhiệm điều phối/vận hành.
