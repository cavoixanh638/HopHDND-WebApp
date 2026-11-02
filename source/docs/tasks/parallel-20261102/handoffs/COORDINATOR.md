# Checkpoint — điều phối tích hợp 5 phần

- Status: IN_PROGRESS / CI_RUNNING; 02/11/2026 Asia/Saigon.
- Owner: chat điều phối hiện tại, một writer. Không mở lại worker đã PASS.
- Candidate REMOTE: `integration/20261102-five-streams`.
- Code SHA: `66e33b85a3424b2316f090e214e813cd04331afc`.
- Baseline: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Checkout: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/parallel-five-integration`, clean.
- Đích cuối: đủ 5 phần, gate PASS đúng SHA, gói dựng lại x2/checksum và bàn giao đầy đủ.
- Đọc [quy ước](../QUY_UOC_CHUNG.md), [review](../reviews/REVIEW_5_STREAMS_2026-11-02.md), source/AGENTS.md.

## Đã làm
- Ghép file từ HEAD 5 worker; so sánh xác nhận giữ nguyên toàn bộ code/tests/runbook từng phần. Không merge nhánh/PR.
- Đưa COORD-01 Windows fix vào candidate. Bằng chứng riêng đã PASS vẫn giữ nguyên.
- Bổ sung trigger integration cho 6 workflow worker và verify-source.
- Sửa điểm tích hợp CI: restore verifier mới cần manifest + row đầy đủ; shared verify-source dùng fixture tổng hợp hợp lệ, không nới guard.

## Sửa tích hợp đã lưu
- Candidate đầu 546e7b7a: unit FAIL do node:test bị Vitest nhận nhầm; 835 assertions PASS nhưng suite lỗi. Runner node:test giữ nguyên ở gate Linux/Windows, exclude đúng file khỏi Vitest.
- Phát hiện archive CLI thiếu helper COORD-01; đã thêm helper/hash và smoke chạy CLI thật sau giải nén (phải HOLD_MODE_REQUIRED, không lỗi thiếu module).
- Docs check PASS; sửa 2 link lịch sử không tồn tại, không đổi nội dung nghiệp vụ.

## Run đang theo dõi — SHA mới trên
- [Verify HopHDND source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315419) — in_progress; chưa kết luận PASS.
- [Chat 5 SHA-pinned release rehearsal (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381) — in_progress; chưa kết luận PASS.
- [Parallel Chat 2 - real App on isolated Firebase Emulator (NO deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315321) — in_progress; chưa kết luận PASS.
- [Chat 1 backend — both Functions FULL Rules Auth RTDB](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315486) — in_progress; chưa kết luận PASS.
- [Chat4 isolated backup audit and emulator restore (NO production)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315451) — in_progress; chưa kết luận PASS.
- [Parallel Chat 2 - scoped UI checks (no deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315289) — in_progress; chưa kết luận PASS.
- [Chat 3 isolated first-import CLI proof (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315363) — queued; chưa kết luận PASS.

## Bước tiếp
1. Theo dõi 7 run/8 jobs đến kết quả cuối; sửa lỗi tích hợp nếu có.
2. Kiểm 6 archive + manifest/checksum + reproduce x2 + extracted CLI smoke; lưu artifact ID/digest.
3. Ghi báo cáo và checkpoint DONE chỉ khi đủ bằng chứng đúng SHA; không chạy lại phần worker đã PASS.

Không merge main/PR147, deploy/publish, production read/write hoặc tự GO. Chưa có artifact tích hợp PASS.
