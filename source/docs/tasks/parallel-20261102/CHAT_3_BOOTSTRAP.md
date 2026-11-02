# Chat 3 — Công cụ nhập dữ liệu lần đầu

**Đây là file đầu vào duy nhất cần gửi cho chat mới hoặc chat tiếp tục luồng 3.**

## Đọc trước, rồi thực hiện

1. [Quy ước chung](QUY_UOC_CHUNG.md).
2. [Checkpoint Chat 3](handoffs/CHAT_3.md) trên **nhánh luồng** bên dưới.
3. Các phần nhiệm vụ trong file này và `source/AGENTS.md` của checkout.

- Nhánh làm việc cố định: `parallel/20261102-chat3-bootstrap`.
- [Link vào đúng nhánh](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat3-bootstrap/source/docs/tasks/parallel-20261102/CHAT_3_BOOTSTRAP.md).
- [Checkpoint mới nhất của luồng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat3-bootstrap/source/docs/tasks/parallel-20261102/handoffs/CHAT_3.md).
- Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`; khi tiếp tục phải dùng HEAD nhánh luồng,
  không reset về mốc này.
- Báo cáo kết quả của mình: `source/docs/tasks/parallel-20261102/reports/CHAT_3.md`.
- Checkpoint của mình: `source/docs/tasks/parallel-20261102/handoffs/CHAT_3.md`.

Không cần đọc lại toàn bộ chat cũ. Nếu checkpoint đã DONE, báo kết quả đã có
và không tự khởi động một vòng sửa mới. Nếu đang làm, tiếp tục bước kế tiếp
sau khi đối chiếu git/CI; giữ nguyên phần việc chưa commit của người trước.

## Mục tiêu

Hoàn thiện công cụ operator nhập dữ liệu lần đầu thành gói có thể dùng và
tự diễn tập: từ file Excel đến kiểm tra, ghi một lần và đọc lại có biên nhận.

## Phạm vi sở hữu

- `source/scripts/operator-first-import.mjs`
- `source/scripts/operator-first-import-entry.ts`
- `source/docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`
- QA riêng `source/parallel-qa/chat3/`;
  workflow mới `.github/workflows/parallel-chat3-*.yml`.

Đọc nhưng không sửa `source/src/data/business-excel.ts`,
`source/src/data/firebase-primary-bootstrap.ts`, backend, Rules, config release,
backup, root package/lock. Công cụ phải dùng API/parser/CAS hiện có, không
tạo đường ghi thay thế để né giới hạn.

## Hiện trạng

Công cụ có tại mốc chung, đã có thử nghiệm empty-root CAS, readback và chặn nhập
lặp trên Emulator. Sử dụng bằng chứng đó; tập trung hoàn thiện thiếu sót thực tế,
không viết lại từ đầu. Đọc hướng dẫn công cụ hiện có và entry/launcher.

## Làm trọn phần việc

1. Rà toàn bộ vòng operator: Excel A–O, xác minh nguồn/đích, xác nhận,
   quyền admin, empty-root CAS, đọc lại và biên nhận.
2. Dùng CLI thực tế với Excel tổng hợp trên Auth/RTDB Emulator. Kiểm input hỏng,
   nguồn thay đổi sau xác nhận, sai digest/thiếu approval, thiếu/sai quyền,
   database không trống, chạy lặp và lỗi kết nối.
3. Phân biệt thất bại trước ghi với kết quả UNKNOWN sau gửi. Không tự retry
   thao tác ghi khi chưa xác định lần trước đã commit hay chưa. Tận dụng đọc lại/
   receipt hiện có, không thay API dùng chung.
4. Kiểm token không bị ghi log/receipt hoặc commit; thông báo lỗi rõ, exit code
   đúng và biên nhận đủ cho người vận hành đối chiếu.
5. Sửa lỗi thuộc CLI/hướng dẫn/kiểm thử riêng. Hoàn thiện hướng dẫn chính thức
   hiện có, kèm ví dụ tổng hợp và cách xử lý từng dạng thất bại. Không dùng wrapper
   kiểm thử thay cho executable thật.

## Điều kiện hoàn tất

- Happy path CLI thật thành công trên root trống và server readback đúng.
- Nhập lặp/nonempty/sai quyền/sai file bị chặn, server không đổi.
- Lỗi/UNKNOWN có cách xử lý được kiểm chứng trong giới hạn công cụ.
- Hướng dẫn, biên nhận mẫu làm sạch, lệnh chạy và bằng chứng đủ để tiếp tục.
- Production NOT RUN; không cần input hoặc kết quả Chat 1/4/5 để hoàn tất gói
  công cụ trên hợp đồng bản xuất phát.

## Nhắc về bàn giao khi gần hết context

Cập nhật checkpoint theo [mẫu](HANDOFF_TEMPLATE.md), lưu công việc vào nhánh riêng,
ghi điều đã thử, kết quả thật và bước tiếp theo cụ thể. Dòng bàn giao cho người dùng:
“Để tiếp tục Chat 3, gửi lại link file nhiệm vụ này; checkpoint đã cập nhật tại …”.
Không chỉ để trạng thái trong câu trả lời chat.
