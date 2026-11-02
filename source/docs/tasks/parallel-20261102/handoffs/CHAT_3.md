# Checkpoint — Chat 3 / COORD-01 Windows receipt guard

- **Status: IN_PROGRESS** — nhiệm vụ COORD-01 mới, dù gói operator cũ đã DONE.
- Branch: `parallel/20261102-chat3-bootstrap`; HEAD tiếp quản `83693480387acb861ef50444a95e0eeaf6813248` (docs-only giao việc).
- Old tested code SHA: `342b8f620e4edcaead93a1e04d0f502f2a672cdd`; baseline CLI CI [#41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) SUCCESS.
- Quy ước: `QUY_UOC_CHUNG.md` v2, blob `ad0d6cd42b224061a39bbf11de8753471d342e35`.
- **Saved: REMOTE** (GitHub connector), không có local worktree/dirty edits, chưa có code change COORD-01; không reset HEAD.
- Cập nhật 02/11/2026 Asia/Saigon; mã chưa test COORD-01: **NOT RUN**.
- Finding: [review COORD-01](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/parallel-workstreams-20261102/source/docs/tasks/parallel-20261102/reviews/REVIEW_5_STREAMS_2026-11-02.md).

## Đã xác minh
- Dòng 84 của `scripts/operator-first-import-entry.ts`: `target.startsWith(checkout+'/')` dùng slash cố định, sai khi Node Windows trả backslash; POSIX CI trước không bắt được.
- Chưa có bằng chứng CLI Windows; yêu cầu mới đòi regression win32/POSIX thuần dùng chính helper production và chạy CLI thật trên Windows.
- Container Linux hiện không resolve github.com qua `git ls-remote`; dùng GitHub connector commit; CI Windows/Linux làm môi trường kiểm chứng.

## WIP / an toàn
- Chưa sửa file. Chỉ sửa CLI, QA `parallel-qa/chat3`, workflow `parallel-chat3-*`, docs vận hành và checkpoint/report Chat 3.
- Giữ `realpathSync` parent, xuất biên nhận ngoài repo, kiểm độc quyền `wx`; không đổi parser/CAS/Rules/backend, không merge/deploy/production.

## Bước tiếp theo
1. Tái hiện lỗi Windows/POSIX; tạo helper containment dùng `relative/isAbsolute/sep` và chia sẻ production + test, kiểm sibling/parent/root/different drive/symlink.
2. CI Windows CLI thật + POSIX và Chat 3 Emulator receipt/HOLD/UNKNOWN/replay trên exact code SHA; sau mỗi batch ghi checkpoint/run ID.
3. Khi CI tất cả PASS, cập nhật `reports/CHAT_3.md` và checkpoint DONE cho COORD-01; nếu thiếu Windows giữ IN_PROGRESS và nêu NOT RUN.
