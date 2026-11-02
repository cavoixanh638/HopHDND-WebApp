# Checkpoint — Chat 3 / COORD-01 Windows receipt guard

- **Status: IN_PROGRESS** — nhiệm vụ mới COORD-01, gói operator trước đó DONE; không làm lại.
- Branch: `parallel/20261102-chat3-bootstrap`; HEAD mã+workflow trước docs `04568fd30a8be59f269be58f03d0dcc2cb72de85`.
- **Code SHA mới: `04568fd30a8be59f269be58f03d0dcc2cb72de85`**, **TEST_PENDING**; prior tested `342b8f620e4edcaead93a1e04d0f502f2a672cdd` ([CI PASS #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477)).
- **CI mới:** [run #41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660), **PENDING** tại lúc checkpoint; Ubuntu Emulator + Windows-native real CLI.
- Lưu: **REMOTE**; không có uncommitted local worktree. Quy ước `QUY_UOC_CHUNG.md` v2 (blob `ad0d6cd42b224061a39bbf11de8753471d342e35`). Cập nhật 02/11/2026 Asia/Saigon.

## Đã làm
- Tái hiện **trước sửa** trên Node `path.win32`: checkout `C:\\repo\\HopHDND-WebApp`/target `...\\private\\receipt.json`, old guard `false`, relative containment `true`; đối chứng POSIX old guard `true`.
- Tách logic production ở `scripts/operator-first-import-path.mjs`, `entry.ts` gọi **chính helper đó**; `relative/isAbsolute/sep` thay nối slash. Giữ `realpathSync` parent, `wx` receipt, fail before CAS.
- Test `parallel-qa/chat3/operator-receipt-path.test.mjs` kiểm root/child/nested/parent/sibling/cross-drive/Windows case và realpath symlink/junction; `operator-windows-cli.mjs` gọi launcher thật trên Windows với approved XLSX giả và xác nhận inside HOLD, outside đi tới lỗi stdin, không tạo receipt. Workflow riêng có job Ubuntu + Windows.

## Kiểm thử / tình trạng
- **PASS local Node reproduction:** old Windows guard fails exact containment; POSIX control.
- **PENDING**: [CI #41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660) gồm native Windows CLI + pure test, Linux TypeScript/deploy guard/preflight/ACK-loss/FRV-02.
- **NOT RUN**: Firebase production/real credentials/deploy/merge. Container không clone GitHub do DNS; commit qua connector.

## WIP / ranh giới
- Không có file chưa push. Chỉ file CLI, QA riêng, workflow riêng, docs/report/checkpoint được phép; không sửa parser/CAS/Rules/backend.
- Chưa gọi DONE trước khi cả **Windows** và **Ubuntu** job PASS đúng SHA. Các run cũ có thể auto-cancel khi commit tiếp, không coi là kết quả.

## Tiếp theo
1. Theo dõi [#41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660) tới kết luận từng job, đọc log nếu FAIL, sửa code/test thực chất và chạy lại.
2. Khi cả Windows+POSIX+Emulator PASS, cập nhật hướng dẫn xử lý COORD-01 và report với actual run SHA, diff phạm vi.
3. Chốt checkpoint `DONE` đúng COORD-01; production vẫn NOT RUN.
