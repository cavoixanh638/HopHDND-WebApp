# Chat 3 — First-import operator CLI: kết quả QA và bàn giao (02/11/2026)

## Phạm vi và mốc
- Nhánh: `parallel/20261102-chat3-bootstrap`; không merge, không deploy, không ghi production.
- Code QA mới nhất: `342b8f620e4edcaead93a1e04d0f502f2a672cdd` (test offline-before-CAS + loss-of-ACK). **CI #41410079477 đang chạy** khi cập nhật report.
- Tested code SHA đã PASS: `9cd869c5b2dea5c0b19e90d565edcca5b512863e`; [run #41409734353](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409734353).
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
| Mất RTDB **trước khi gửi CAS** (exit 2/no marker/unchanged root) | `342b8f62…` | **RUNNING** | [CI #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) |
| Local container run | n/a | NOT RUN | Môi trường không phân giải GitHub clone; GitHub Actions là nơi kiểm tích hợp thực tế |
| Firebase production/Auth live/Rules live/import thật | n/a | **NOT RUN** | Cấm, không tự GO |

**Sanitized witness trích từ run #41409734353:** `writeFrames=1`, `responseSuppressed=true`, `exitCode=3`, `receiptStatus=UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY`, `committedServerRowCount=1`, `serverUnchangedOnReplay=true`. Không log token hoặc cell values. Ghi nhận trung thực: proxy kiểm tra việc mất **server-to-client ACK** của CAS, không mô phỏng mọi loại lỗi mạng và không thay thế một cuộc xác minh production.

## Ranh giới quyết định vận hành
- Exit `0`: ghi thành công + readback server + receipt final. Không nhập lần 2.
- Exit `2`: chưa gọi shared CAS; tìm lỗi nguồn/xác nhận/quyền/kết nối preflight, kiểm root độc lập trước khi quyết định lại.
- Exit `3`: đã gọi CAS, *không biết kết quả* cho tới khi đối soát server. **Không tự retry**, kể cả thiếu ACK hoặc receipt final.
- `fullRootSnapshotSha256` trong approval là chứng nhận bên ngoài, CLI không ký và không tự đọc toàn root under FULL Rules. Live full-root review/Rules/backup/production GO luôn ngoài phạm vi.
- CI chỉ chạy tổng hợp trong Emulator, không dùng Admin SDK để né quyền nhập (REST owner chỉ là nhân chứng QA đọc độc lập).
- Nếu cần test ở máy chung, bố trí worktree/port demo riêng; workflow Chat 3 chạy trên runner cô lập, không thay config phát hành.

## Bước còn lại
1. Đối chiếu [run #41410079477](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) sau khi kết thúc. Nếu FAIL, giữ trạng thái và sửa đúng QA/CLI trong scope.
2. Nếu PASS: ghi code tested SHA mới, PASS markers và commit docs-only sau code vào checkpoint, chốt `DONE` cho **gói operator trên hợp đồng xuất phát**, không phải production GO.
3. Giữ lại link nhiệm vụ và checkpoint v2 để chat mới tiếp quản; không làm lại kiểm thử đã đủ bằng chứng.
