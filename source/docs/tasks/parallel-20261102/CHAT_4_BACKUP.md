# Chat 4 — Sao lưu, kiểm tra snapshot và phục hồi

**Đây là file đầu vào duy nhất cần gửi cho chat mới hoặc chat tiếp tục luồng 4.**

## Đọc trước, rồi thực hiện

1. [Quy ước chung](QUY_UOC_CHUNG.md).
2. [Checkpoint Chat 4](handoffs/CHAT_4.md) trên **nhánh luồng** bên dưới.
3. Các phần nhiệm vụ trong file này và `source/AGENTS.md` của checkout.

- Nhánh làm việc cố định: `parallel/20261102-chat4-backup`.
- [Link vào đúng nhánh](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat4-backup/source/docs/tasks/parallel-20261102/CHAT_4_BACKUP.md).
- [Checkpoint mới nhất của luồng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat4-backup/source/docs/tasks/parallel-20261102/handoffs/CHAT_4.md).
- Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`; khi tiếp tục phải dùng HEAD nhánh luồng,
  không reset về mốc này.
- Báo cáo kết quả của mình: `source/docs/tasks/parallel-20261102/reports/CHAT_4.md`.
- Checkpoint của mình: `source/docs/tasks/parallel-20261102/handoffs/CHAT_4.md`.

Không cần đọc lại toàn bộ chat cũ. Nếu checkpoint đã DONE, báo kết quả đã có
và không tự khởi động một vòng sửa mới. Nếu đang làm, tiếp tục bước kế tiếp
sau khi đối chiếu git/CI; giữ nguyên phần việc chưa commit của người trước.

## Mục tiêu

Hoàn thiện bộ sao lưu, kiểm tra snapshot và diễn tập phục hồi vào Emulator.
Đây là vận hành snapshot; không sửa RESTORE nghiệp vụ backend của Chat 1
hoặc công cụ first import của Chat 3.

## Phạm vi sở hữu

- `source/scripts/firebase-backup-*.mjs`
- `source/scripts/firebase-production-readonly-backup.mjs` (chỉ sửa/kiểm offline;
  không chạy lấy production).
- `source/scripts/restore-emulator/`
- `source/docs/operations/pr149/`
- `source/docs/operations/PR147_FIRST_USE_AND_CUTOVER_2026-11-01.md`
- `source/docs/operations/PR147_ADMIN_ACCEPTANCE_AND_OWNER_CONFIRMATIONS_2026-11-01.md`
- QA riêng `source/parallel-qa/chat4/`, workflow mới
  `.github/workflows/parallel-chat4-*.yml`.

Không sửa backend/Rules runtime, first-import CLI, config phát hành hoặc
`source/docs/operations/PR147_OPERATOR_FIRST_IMPORT.md` của Chat 3.

## Đầu vào sẵn có — không cần chờ chat cũ

PR149 chứa bộ tài liệu/công cụ đã có:
`e06c7cd9f40f5fe25fde1d0bd9049d307439eaf4`.
Chỉ đưa các đường dẫn PR149 thuộc vùng sở hữu trên vào nhánh riêng nếu chưa có;
không merge/cherry-pick toàn nhánh để kéo runtime cũ vào bản xuất phát.
Đối chiếu import trong công cụ với mã hiện tại; các module runtime được đọc
từ bản chung và không thuộc quyền sửa của luồng.

## Làm trọn phần việc

1. Tận dụng auditor/runbook/drill có sẵn. Hoàn thiện chuỗi:
   snapshot đầu vào → xác minh đầy đủ/checksum → phân loại trạng thái →
   so checkpoint → phục hồi trong Emulator riêng → đối chiếu toàn bộ.
2. Phân biệt thật sự trống với thiếu/truncated/hỏng/unreadable. Kiểm snapshot
   nhiều thế hệ, quyền, lịch sử, leases và journal; không chỉ so số dòng.
3. Kiểm các nguồn metadata tự nhất quán nhưng giả: dùng contract xác minh
   hiện có khi phù hợp, không coi một hash trong manifest là bằng chứng tự đủ.
4. Kiểm chỉnh sửa đã ACK sau checkpoint: dừng phục hồi snapshot cũ, chỉ rõ
   cần snapshot mới và đối soát; không tự ghi đè. Phục hồi tổng root chỉ trên
   localhost/demo riêng bằng dữ liệu tổng hợp.
5. Tự chạy CLI/auditor và full-root restore thật trên Emulator, sửa phần công cụ
   và tài liệu thuộc mình. Ghi lệnh, input/output, điều kiện STOP và giới hạn.
   Hướng dẫn cần trỏ công cụ first import đã tồn tại, không chép/đổi code của Chat 3.

## Điều kiện hoàn tất

- Bộ công cụ chạy được trên mốc chung và có happy/negative evidence.
- Dữ liệu phục hồi được đối chiếu nội dung/quyền/lịch sử/journal/checksum.
- Runbook thực thi được, phân biệt rõ diễn tập với thao tác production chưa chạy.
- Các quyết định người dùng chỉ gồm nguồn chính thức, chính sách ID/quyền/lịch sử
  và người/thời điểm GO; thông tin kỹ thuật được liệt kê thành đầu vào operator.
- Không cần chờ Chat 1/3/5; báo rõ nếu hợp đồng dùng chung chặn một trường hợp.

## Nhắc về bàn giao khi gần hết context

Cập nhật checkpoint theo [mẫu](HANDOFF_TEMPLATE.md), lưu công việc vào nhánh riêng,
ghi điều đã thử, kết quả thật và bước tiếp theo cụ thể. Dòng bàn giao cho người dùng:
“Để tiếp tục Chat 4, gửi lại link file nhiệm vụ này; checkpoint đã cập nhật tại …”.
Không chỉ để trạng thái trong câu trả lời chat.
