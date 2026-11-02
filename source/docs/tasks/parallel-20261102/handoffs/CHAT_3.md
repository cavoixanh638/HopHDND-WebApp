# Checkpoint — Chat 3 / COORD-01 (Windows receipt containment)

- **Status: DONE — COORD-01 CLOSED**; gói operator trước đó vẫn DONE; production **NOT RUN / NO GO**.
- Branch: `parallel/20261102-chat3-bootstrap`; [nhiệm vụ và COORD-01](../CHAT_3_BOOTSTRAP.md).
- **Code + workflow tested SHA: `04568fd30a8be59f269be58f03d0dcc2cb72de85`.**
- **Exact-SHA CI SUCCESS:** [GitHub Actions #41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660) — 2/2 jobs: native Windows `windows-receipt-guard`, Linux FULL Rules Emulator `operator-cli`.
- **Saved: REMOTE**, không có local WIP/dirty/unpushed. Docs-only sau code SHA gồm `PR147_OPERATOR_FIRST_IMPORT.md`, `reports/CHAT_3.md` (commit `a9f35e63c02e024566396bc87060b756782ab507`) và checkpoint.
- Quy ước `QUY_UOC_CHUNG.md` v2 đã đọc, blob `ad0d6cd42b224061a39bbf11de8753471d342e35`; cập nhật 2026-11-02 Asia/Saigon.

## Đã làm / quyết định giữ
- Tái hiện lỗi cũ: `target.startsWith(checkout + '/')` → **false** cho `C:\\repo\\HopHDND-WebApp\\private\\receipt.json`, dù thực sự nằm trong checkout. POSIX đối chứng true.
- Sửa `scripts/operator-first-import-entry.ts` dùng helper production `scripts/operator-first-import-path.mjs` với `relative/isAbsolute/sep`; vẫn `realpathSync` parent, chặn symlink/junction, đảm bảo output độc quyền `wx` và pre-CAS HOLD. Không đổi parser/CAS/Auth/Rules.
- Thêm `parallel-qa/chat3/operator-receipt-path.test.mjs` và `operator-windows-cli.mjs`, workflow riêng Windows+Ubuntu, hướng dẫn vận hành; [báo cáo chi tiết](../reports/CHAT_3.md).

## Kiểm thử đúng SHA `04568fd…`
- **PASS Windows thật:** `node --test parallel-qa/chat3/operator-receipt-path.test.mjs` **15/15**; `node parallel-qa/chat3/operator-windows-cli.mjs` **6/6**, gồm root/child/junction HOLD trước ghi; ngoài checkout/sibling qua path guard rồi HOLD do thiếu token; không có output receipt.
- **PASS POSIX/Linux:** path tests **15/15**, typecheck, default deploy guard; Auth/RTDB/Functions + FULL Rules Emulator: 12 negative preflight, offline-before-CAS exit 2/no receipt/unchanged DB, ACK lost after server commit exit 3/UNKNOWN/replay unchanged, FRV-02 happy CAS/readback/duplicate denied.
- **NOT RUN:** Firebase CAS native Windows (job Windows kiểm prewrite path CLI thật, **không** ghi Firebase); production Auth/RTDB/Rules, deploy, merge, credential thật. Linux end-to-end cùng SHA đã PASS.

## Bàn giao / không còn WIP
1. Điều phối tích hợp từ nhánh này, dùng tested SHA và CI trên để review; **không lặp test đã PASS** chỉ vì docs-only commits.
2. Nếu xây candidate tích hợp riêng, kiểm lại trên exact integration SHA; đợt COORD-01 chỉ chứng minh nhánh Chat 3, không chứng minh tích hợp cả năm luồng.
3. Chat mới đọc nhiệm vụ + checkpoint thấy COORD-01 **DONE** thì báo kết quả, không tự mở vòng sửa mới; production GO do người vận hành/điều phối phê duyệt riêng.
