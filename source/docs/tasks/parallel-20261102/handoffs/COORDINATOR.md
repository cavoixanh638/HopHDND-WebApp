# Checkpoint — điều phối tích hợp 5 phần

- Status: IN_PROGRESS / CI_RUNNING; 02/11/2026 Asia/Saigon.
- Owner: chat điều phối hiện tại, một writer. Không mở lại worker đã PASS.
- Candidate REMOTE: `integration/20261102-five-streams`.
- Code SHA: `546e7b7a8b5ee66abbe04c7fbbd979d4fd335f0f`.
- Baseline: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Checkout: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/parallel-five-integration`, clean.
- Đích cuối: đủ 5 phần, gate PASS đúng SHA, gói dựng lại x2/checksum và bàn giao đầy đủ.
- Đọc [quy ước](../QUY_UOC_CHUNG.md), [review](../reviews/REVIEW_5_STREAMS_2026-11-02.md), source/AGENTS.md.

## Đã làm
- Ghép file từ HEAD 5 worker; so sánh xác nhận giữ nguyên toàn bộ code/tests/runbook từng phần. Không merge nhánh/PR.
- Đưa COORD-01 Windows fix vào candidate. Bằng chứng riêng đã PASS vẫn giữ nguyên.
- Bổ sung trigger integration cho 6 workflow worker và verify-source.
- Sửa điểm tích hợp CI: restore verifier mới cần manifest + row đầy đủ; shared verify-source dùng fixture tổng hợp hợp lệ, không nới guard.

## Run đang theo dõi — cùng code SHA trên
- [Chat 5 SHA-pinned release rehearsal (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450841962) — in_progress; chưa kết luận PASS.
- [Chat 1 backend — both Functions FULL Rules Auth RTDB](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450842082) — queued; chưa kết luận PASS.
- [Chat 3 isolated first-import CLI proof (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450842019) — queued; chưa kết luận PASS.
- [Parallel Chat 2 - real App on isolated Firebase Emulator (NO deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450842063) — queued; chưa kết luận PASS.
- [Chat4 isolated backup audit and emulator restore (NO production)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450842014) — queued; chưa kết luận PASS.
- [Verify HopHDND source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450841997) — in_progress; chưa kết luận PASS.
- [Parallel Chat 2 - scoped UI checks (no deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41450842009) — queued; chưa kết luận PASS.

## Bước tiếp
1. Theo dõi 7 run (8 jobs gồm Windows); lỗi thì đọc log và sửa phần tích hợp, không lặp kiểm nhánh worker.
2. Kiểm package mới có 6 archive, exact SHA, manifest/inventory/checksum, reproduce x2; lưu ID/digest artifact.
3. Lưu báo cáo cùng checkpoint, xác nhận gate/bàn giao đủ rồi mới DONE.

Không merge main/PR147, deploy/publish, production read/write hoặc tự GO. Chưa có artifact tích hợp PASS.
