# Triển khai khóa ô độc quyền và chốt dữ liệu Firebase — PR #72

**Trạng thái:** DRAFT / STAGING. PR #72 mở trên nền PR #71 (Firebase chính), chưa merge main, chưa thay đổi Firebase Rules production hay dữ liệu thực. Triển khai để kiểm thử, không được quảng bá là đã bật cho mọi tài khoản.

## Cách chốt dữ liệu đã thống nhất

- Chọn **Yêu cầu lưu rồi chốt**: admin chuyển `OPEN → DRAINING` trên máy chủ (giao dịch CAS). Tất cả phiên nhận tín hiệu realtime, không thể mở lượt sửa mới. Các editor chữ ngắn và Ghi chú/Tiến độ hiện tại đang mở áp dụng giá trị vào nháp nếu còn khóa hợp lệ, rồi `useWorkspace` tự gửi lên Firebase; dropdown chỉ tìm mà chưa chọn sẽ đóng như Esc, không lưu giá trị tìm kiếm. Nháp ở ContentEditor dài phải được người sửa chủ động xác nhận, không lưu text đang dở. Các phiên lưu hợp lệ tiếp tục được cho phép tới khi chốt.
- Khi các khóa đã được giải phóng sau server ACK, admin tự chuyển `DRAINING → FROZEN`, sau đó **đọc lại dữ liệu thực `hdnd/items` từ Firebase** và tạo biên nhận số dòng, SHA-256 và epoch. Không tạo mốc từ dữ liệu React/local. Nếu còn phiên quá hạn 50–60 giây hoặc chọn Đóng băng ngay, máy chủ chặn commit dù là admin; bản nháp chưa lưu ở trình duyệt không thuộc mốc.
- **Đóng băng khẩn cấp**: `OPEN → FROZEN` ngay với yêu cầu dữ liệu đã lưu mới được coi là chính thức. Mất kết nối, đang gõ IME, nội dung dài chưa áp dụng hoặc bất kỳ save bị từ chối đều giữ local draft, không báo đã lưu. Mở lại bằng `FROZEN → OPEN`, bản nháp cũ phải được đối chiếu, không tự replay.
- Hai chế độ riêng biệt: `editingLocked` có sẵn chỉ tạm dừng khách (admin vẫn có quyền); `freezeControl` mới **đóng băng tất cả tài khoản**, kể cả admin. Mọi đường ghi Firebase phải bị Rules kiểm tra. Quy tắc chỉ tạm dừng khách **không** tạo snapshot số liệu bất biến.

## Chiếm khóa và thời gian

- Khóa theo `recordId + EditableField`, uid + tabSessionId + token + revision + thời gian, Firebase CAS; đồng quyền sửa khác trường cùng dòng. Không khóa theo STT/ID hiển thị, vị trí cột hoặc tên báo cáo.
- Lúc bấm mở `CellPicker`, `InlineNoteEditor`, `ContentEditor` hoặc focus input, phải đợi máy chủ cấp khóa. Khóa cho cùng một trường không thể dùng từ tab thứ hai (kể cả cùng UID). `CellPicker` Esc/outside/không chọn không ghi; chọn tạo nháp và chỉ giải phóng khóa sau ACK server. Inline text trên blur/Ctrl+Enter; văn bản dài không tự lưu chưa hoàn chỉnh.
- Thời hạn một lượt: 45s trạng thái, 90s tìm chọn, 2 phút text ngắn, 5 phút Ghi chú/Tiến độ hiện tại, 10 phút nội dung dài. Lease TTL 45s, cố gắng gia hạn mỗi 12s đến giới hạn; server Rules kiểm `now`, thời gian trên thiết bị chỉ hiển thị/gợi ý.
- Nháp chữ chưa được server xác nhận được checkpoint vào localStorage theo UID, recordId, field. Khi chốt khẩn cấp hoặc mất lease, có lựa chọn khôi phục để đối chiếu; localStorage (đặc biệt Chrome Ẩn danh) KHÔNG phải bản lưu chung, không được xóa ngoài ý muốn. Dữ liệu ghi nháp sau server ACK mới xóa.
- Không lưu số liệu chưa được xác nhận khi đóng băng. Không ai có quyền tiếp tục thao tác kể cả admin khi FROZEN. Quyền sửa từng ô cũ tiếp tục phải tuân thủ.

## File thay đổi

- Client: `src/data/cell-edit-leases.ts`, `src/data/freeze-control.ts`, `src/data/firebase-repository.ts`, `src/state/use-workspace.ts`, `src/state/use-firebase.ts`, `src/app/App.tsx`, `src/features/items/{CellPicker,InlineNoteEditor,LeaseTextInput,ItemList}.tsx`, `src/features/reports/ReportDetailGrid.tsx`, `src/features/settings/{FreezeAdminPanel,ApprovalReviewPanel}.tsx`.
- Quy tắc bảo mật **thử nghiệm** `firebase/database.exclusive-candidate.rules.json`, tách biệt Rules production. Nhánh `/hdnd/editLocks`, `/hdnd/freezeControl`, `/hdnd/freezeReceipts`; `hdnd/items` là dữ liệu chính, Excel không nằm trong đường lưu.
- `tests/exclusive-cell-freeze.test.ts` được đưa vào `scripts/test-firebase.mjs` để Firebase Emulator chạy thật (hai UID/trình duyệt, hai trường cùng dòng, data write bị khóa, emergency freeze). Không thay bản production Rules.
- Quy trình chốt thiết kế chi tiết: `docs/decisions/CELL_EDIT_EXCLUSIVITY_AND_FREEZE_2026-10-25.md`.

## Phải làm trước khi kích hoạt thật

1. Đạt full CI unit/TypeScript, Firebase Emulator, Chrome browser smoke. Đặc biệt test chính xác tất cả child/parent write Rules và cố tình phá lock; hai tab chung uid, đóng cửa sổ, crash, kết nối lại, hết hạn, quyền bị thu hồi.
2. Quyết định cơ chế máy chủ đủ mạnh: RTDB Rules + giao dịch phải chặn mọi đường đi vòng; nếu một ràng buộc atomic/fencing không chứng minh được thì dùng backend tin cậy để ghi/khóa với transaction phù hợp, **không merge** đường ghi client bảo mật chưa đủ.
3. Chuyển Firebase thành nguồn chính qua PR #71 sau backup/đối chiếu dữ liệu, duyệt migration thủ công; staging ba user thật; lưu bản sao Rules và DB trước deploy.
4. Deploy Rules/Backend của môi trường đã xác nhận, chạy thử chốt số liệu, biên nhận và rollback; khi **cả dữ liệu/Rules được xác nhận** mới merge/release client. GitHub Pages không tự triển khai Rules.
5. Theo dõi Chrome Ẩn danh (nháp local có thể mất khi đóng tất cả cửa sổ), tác động hiệu năng listener và không bảo đảm tuyệt đối tài khoản đã mất mạng sẽ tự gửi mọi bản nháp trước freeze.

**Nguyên tắc vận hành không thay đổi:** không đồng nhất "đã nhập" hoặc "đã yêu cầu lưu" với "đã được Firebase xác nhận"; không tính bản nháp vào biên nhận chốt.
