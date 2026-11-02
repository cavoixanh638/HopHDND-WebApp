# Chat 3 — First-import operator CLI: kết quả QA và bàn giao (02/11/2026)

## Phạm vi và mốc
- Nhánh: `parallel/20261102-chat3-bootstrap`; không merge, không deploy, không ghi production.
- **Trạng thái gói CLI: DONE** (Emulator, dữ liệu tổng hợp; production NOT RUN). Code QA mới nhất **đã PASS**: `342b8f620e4edcaead93a1e04d0f502f2a672cdd`; [CI #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) SUCCESS.
- Tested code SHA: **`342b8f620e4edcaead93a1e04d0f502f2a672cdd`**, CI PASS. ACK-loss proof trước đó cũng PASS tại `9cd869c5b2dea5c0b19e90d565edcca5b512863e`, [run #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353).
- Baseline trước đó: `e0ebe52b7f2455e2c396c46544adfa0cb764eb99`; [run #41407997875](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407997875) PASS.
- Source of truth ngắn: [checkpoint Chat 3](../handoffs/CHAT_3.md); quy ước `QUY_UOC_CHUNG.md` v2 đã đọc.
- Không có worktree local; mã và bằng chứng đã commit lên nhánh qua GitHub connector. Không dùng credential thật.

## Đã sửa trong phạm vi sở hữu
1. `scripts/operator-first-import-entry.ts`: kiểm file Excel và approval lại ngay trước CAS, marker riêng 0600 trước CAS, phân biệt prewrite HOLD exit `2` và post-CAS UNKNOWN exit `3`; timeout và fail-closed, không auto-retry. Giữ nguyên parser/CAS shared.
2. `parallel-qa/chat3/operator-preflight.mjs`: gọi executable thật, 12 kiểm tra âm tính (nguồn, checksum, approval, confirmation, quyền, thay đổi sau xác nhận, DB không trống và server no-change).
3. `parallel-qa/chat3/operator-lost-ack.mjs`: **không thay CLI/CAS**; proxy localhost chuyển CAS WebSocket thật đến FULL Rules RTDB Emulator nhưng chặn phản hồi, so sánh read-only owner witness và marker UNKNOWN, xác nhận duplicate bị chặn. Bổ sung kịch bản RTDB mất kết nối **trước** khi gọi CAS.
4. `.github/workflows/parallel-chat3-operator.yml`: Node22, Java21, exact dependency graph, typecheck/deploy guard, Auth + RTDB + cả hai Functions, FULL Rules; chạy preflight, lost-ACK/network, FRV-02 happy path/duplicate. Không deploy/publish.
5. `docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`: hợp đồng exit code, quy trình xử lý UNKNOWN, ví dụ receipt đã làm sạch, lệnh demo.

## Bằng chứng đã xác nhận ở exact SHA
| Kịch bản | SHA | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| Typecheck, deploy guard, 12 preflight negative | `9cd869c5…` | **PASS** | [CI #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353), `CHAT3_PREFLIGHT_TOTAL 12` |
| CAS thật, ACK bị chặn tại TCP proxy | `9cd869c5…` | **PASS** | `CHAT3_REAL_CAS_LOST_ACK_UNKNOWN_PASS`; 1 write frame, 1 server row, exit 3, receipt UNKNOWN, replay không đổi DB |
| FRV-02 actual launcher, empty-root CAS/readback/repeat guard | `9cd869c5…` | **PASS** | `FRV02_OPERATOR_PROTECTED_EMPTY_CAS_VERIFIED`, Vitest 1 test PASS, còn 12 tests không thuộc phạm vi được filter |
| Mất RTDB **trước khi gửi CAS** (exit 2/no marker/unchanged root) | `342b8f62…` | **PASS** | [CI #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477), `CHAT3_PREWRITE_OFFLINE_HOLD_PASS` |
| Local container run | n/a | NOT RUN | Môi trường không phân giải GitHub clone; GitHub Actions là nơi kiểm tích hợp thực tế |
| Firebase production/Auth live/Rules live/import thật | n/a | **NOT RUN** | Cấm, không tự GO |

**Sanitized witness trích từ run #41410079477:** `writeFrames=1`, `responseSuppressed=true`, `exitCode=3`, `receiptStatus=UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY`, `committedServerRowCount=1`, `serverUnchangedOnReplay=true`. Không log token hoặc cell values. Ghi nhận trung thực: proxy kiểm tra việc mất **server-to-client ACK** của CAS, không mô phỏng mọi loại lỗi mạng và không thay thế một cuộc xác minh production.

## Ranh giới quyết định vận hành
- Exit `0`: ghi thành công + readback server + receipt final. Không nhập lần 2.
- Exit `2`: chưa gọi shared CAS; tìm lỗi nguồn/xác nhận/quyền/kết nối preflight, kiểm root độc lập trước khi quyết định lại.
- Exit `3`: đã gọi CAS, *không biết kết quả* cho tới khi đối soát server. **Không tự retry**, kể cả thiếu ACK hoặc receipt final.
- `fullRootSnapshotSha256` trong approval là chứng nhận bên ngoài, CLI không ký và không tự đọc toàn root under FULL Rules. Live full-root review/Rules/backup/production GO luôn ngoài phạm vi.
- CI chỉ chạy tổng hợp trong Emulator, không dùng Admin SDK để né quyền nhập (REST owner chỉ là nhân chứng QA đọc độc lập).
- Nếu cần test ở máy chung, bố trí worktree/port demo riêng; workflow Chat 3 chạy trên runner cô lập, không thay config phát hành.

## Kết thúc luồng độc lập
- **DONE** cho gói operator trên hợp đồng xuất phát: happy path, input/xác thực, protected empty-root CAS, readback, receipt, prewrite connection loss, ACK loss sau commit và chặn nhập lặp đều có bằng chứng tại đúng SHA trên GitHub Actions.
- **PRODUCTION NOT RUN / NO GO**: phê duyệt, audit live full-root, live Rules/IAM/backup và chuyển nguồn là gate riêng của điều phối/người vận hành.
- Không có WIP/unpushed files hay PR đang mở bởi Chat 3. Không tự khởi động vòng sửa mới khi chat tiếp theo đọc checkpoint DONE.

---

## COORD-01 — P2 Windows receipt path guard — CLOSED (2026-11-02)

**Phân biệt nhiệm vụ:** đây là nhiệm vụ mới sau checkpoint gói operator cũ ghi DONE; không chạy lại toàn bộ dự án và không thay đổi backend/Rules. Điều phối đã phát hiện tại `operator-first-import-entry.ts:84` ở SHA cũ `342b8f620e4edcaead93a1e04d0f502f2a672cdd`.

### Nguyên nhân và tái hiện trước sửa

- Guard cũ: `target === checkout || target.startsWith(checkout + '/')`.
- `path.win32`: checkout `C:\\repo\\HopHDND-WebApp`, target `C:\\repo\\HopHDND-WebApp\\private\\receipt.json` → **old=false, actuallyInside=true** (bị lọt).
- `path.posix` tương đương → old=true. Tái hiện Node trước sửa bằng phép so sánh cũ, và được khóa regression qua `CHAT3_COORD01_OLD_WINDOWS_GUARD_REPRODUCED`.

### Bản sửa chính thức

- `scripts/operator-first-import-path.mjs` (mới): helper `isReceiptInsideCheckout` dùng native `relative(checkout,target)`, `sep`, `isAbsolute`, xử lý `''` (checkout itself), `..` và đường khác drive. QA gọi **cùng hàm production**, chỉ inject `win32/posix` path API; CLI dùng native path API mặc định.
- `scripts/operator-first-import-entry.ts`: bỏ prefix ghép slash, gọi helper sau `realpathSync` checkout và parent output. Giữ nguyên kiểm output absolute, đường qua symlink/junction, reject path đã tồn tại và `writeFileSync(...,{flag:'wx',mode:0o600})` trước CAS; không đổi quyền xác thực hoặc API ghi.
- `parallel-qa/chat3/operator-receipt-path.test.mjs`: root/child/nested/parent/sibling cùng prefix/cross-drive Windows/case-insensitive, POSIX và realpath symlink/junction.
- `parallel-qa/chat3/operator-windows-cli.mjs`: **launcher thật** `node scripts/operator-first-import.mjs`, Excel/approval tổng hợp. Kiểm checkout root + children + junction = HOLD `PRIVATE_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED` trước stdin/CAS; ngoài repo và sibling cùng prefix = qua path guard, dừng đúng `GOOGLE_ID_TOKEN_STDIN_REQUIRED`. Không tạo biên nhận trong bất kỳ test âm nào.
- `.github/workflows/parallel-chat3-operator.yml`: chạy riêng Linux Emulator và native `windows-latest`; chỉ test, không deploy.
- `docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`: ghi rõ hợp đồng đường output, ví dụ, lệnh và giới hạn QA.

### CI/QA — exact code SHA, không dùng kết quả từ SHA cũ

- **Tested code & workflow SHA:** `04568fd30a8be59f269be58f03d0dcc2cb72de85`.
- **GitHub Actions:** [run #41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660) — **COMPLETED SUCCESS**, cả 2 jobs `windows-receipt-guard` và `operator-cli`.
- **Windows thật:** Node22, `node --test parallel-qa/chat3/operator-receipt-path.test.mjs` = **15/15 PASS**; `node parallel-qa/chat3/operator-windows-cli.mjs` = **6/6 PASS** (`CHAT3_COORD01_WINDOWS_REAL_CLI_TOTAL 6`). Symlink/junction realpath PASS, không log token.
- **Ubuntu/POSIX:** cùng pure production helper = **15/15 PASS**; `npm run typecheck`, default deploy guard PASS. Trong Auth/RTDB + cả hai Functions + FULL Rules Emulator: `CHAT3_PREFLIGHT_TOTAL 12`; `CHAT3_PREWRITE_OFFLINE_HOLD_PASS` (exit 2, no receipt, DB unchanged); `CHAT3_REAL_CAS_LOST_ACK_UNKNOWN_PASS` (1 CAS write, ACK suppressed, exit 3, server 1 row, replay unchanged); `FRV02_OPERATOR_PROTECTED_EMPTY_CAS_VERIFIED` (actual CLI happy path/readback/repeat blocked). Vitest chọn 1 case FRV-02 PASS, 12 case khác chỉ được filter chứ không tính PASS.
- **Native Windows Firebase Auth/RTDB CAS:** **NOT RUN**; Windows job chỉ kiểm receipt path **bằng CLI thật**, không xác nhận một giao dịch Firebase Windows. Firebase end-to-end regression đã chạy thật trên Linux cùng SHA.
- **Production/live credentials/Rules/deploy/merge:** **NOT RUN**, không có quyền GO.

### Đánh giá hoàn tất

**COORD-01 DONE/CLOSED**: bản vá đã commit và đẩy lên đúng nhánh, lỗi gốc được tái hiện, test thuần production logic chạy native Windows và POSIX, CLI thật được kiểm trên Windows; bộ Emulator Linux vẫn PASS cùng SHA. Các commit report/checkpoint/docs-only sau tested SHA không thay đổi code đã kiểm. Không sửa hoặc cherry-pick nhánh khác, không có thay đổi backend/Rules/production. Điều phối có thể tích hợp bằng đúng code SHA và đối chiếu CI trên.
