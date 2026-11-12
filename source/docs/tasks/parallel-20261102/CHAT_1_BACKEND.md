# Chat 1 — Backend, Rules và tính toàn vẹn dữ liệu

**Đây là file đầu vào duy nhất cần gửi cho chat mới hoặc chat tiếp tục luồng 1.**

## Đọc trước, rồi thực hiện

1. [Quy ước chung](QUY_UOC_CHUNG.md).
2. [Checkpoint Chat 1](handoffs/CHAT_1.md) trên **nhánh luồng** bên dưới.
3. Các phần nhiệm vụ trong file này và `source/AGENTS.md` của checkout.

- Nhánh làm việc cố định: `parallel/20261102-chat1-backend`.
- [Link vào đúng nhánh](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat1-backend/source/docs/tasks/parallel-20261102/CHAT_1_BACKEND.md).
- [Checkpoint mới nhất của luồng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat1-backend/source/docs/tasks/parallel-20261102/handoffs/CHAT_1.md).
- Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`; khi tiếp tục phải dùng HEAD nhánh luồng,
  không reset về mốc này.
- Báo cáo kết quả của mình: `source/docs/tasks/parallel-20261102/reports/CHAT_1.md`.
- Checkpoint của mình: `source/docs/tasks/parallel-20261102/handoffs/CHAT_1.md`.

Không cần đọc lại toàn bộ chat cũ. Nếu checkpoint đã DONE, báo kết quả đã có
và không tự khởi động một vòng sửa mới. Nếu đang làm, tiếp tục bước kế tiếp
sau khi đối chiếu git/CI; giữ nguyên phần việc chưa commit của người trước.

## Mục tiêu

Hoàn thiện và tự nghiệm thu backend/Rules: sửa ô, thay thế dữ liệu, khôi phục
có lịch sử và bảo vệ dữ liệu. Không phải nhiệm vụ chờ Chat 2 kiểm tra thay mình.

## Phạm vi sở hữu

- `source/cell-edit-service/`
- `source/parent-commit-service/`
- `source/firebase/database.exclusive-candidate.rules.json`
- Kiểm thử của hai service; QA bổ sung tại `source/parallel-qa/chat1/`;
  workflow riêng `.github/workflows/parallel-chat1-*.yml`.

Không sửa UI, module `source/src/data/`, công cụ operator/backup, config
Firebase dùng chung, đóng gói hoặc workflow hiện có.

## Hiện trạng xuất phát và nguồn đọc

FRV-02 vừa được sửa tại mốc chung: hai validator
`history/$slot/changes/$field/.validate` và
`history/$slot/oldValues/$field/.validate` có nhánh cho parent service tin cậy
tạo thế hệ chưa tồn tại. Canonical digest C tách khỏi checksum raw backup A.
Đã có parent 13/13 và unified 4/4 jobs PASS; đây là bằng chứng nền, không phải
kết quả cho bất kỳ mã sửa mới nào.

- [Bàn giao Chat 1](https://github.com/cavoixanh638/HopHDND-WebApp/pull/147#issuecomment-6569435582)
- [Parent CI của mốc chung](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964223)
- [Unified CI của mốc chung](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964227)

Không quay lại điều tra vô hạn các bản cũ đã bị thay thế.

## Làm trọn phần việc

1. Đối chiếu handler, contract, Rules, kiểm thử hiện có để xác định khoảng trống
   thực tế trong bảo toàn dữ liệu. Giữ hợp đồng frontend/API hiện tại.
2. Kiểm chứng chuỗi thực: A activate → guest cellEdit A có audit → parent A→B
   COMMITTED → RESTORE backup hợp lệ của A thành C → guest sửa C sinh audit mới.
   Bảo toàn history gốc, A/B, quyền/lease lịch sử, backup và journal; C không
   mang proof/lease đang hoạt động của A.
3. Kiểm tra quy ước digest và đường restore tiếp theo/nhiều bản ghi/lịch sử
   khi chưa có bằng chứng đủ. Phân biệt checksum raw backup với canonical C,
   không so hai chuỗi được gán giống nhau để gọi là xác minh độc lập.
4. Rà ngoại lệ parent service chỉ áp dụng đúng đích/giao dịch và danh tính;
   giữ FRCR-01 quyền cũ/pointer race, DR-01 lease cũ SAVE/RENEW/RELEASE,
   DR-02 backup/journal giả, audit tamper, idempotency và CAS.
5. Sửa lỗi thuộc phạm vi, bổ sung regression theo lỗi/khoảng trống có ý nghĩa.
   Chạy kiểm thử thật Auth + hai Functions + FULL Rules trên Emulator, hoàn tất
   gate liên quan; không dùng bypass/seed thay cho luồng cần nghiệm thu.

## Điều kiện hoàn tất

- Các trường hợp trong phạm vi có bằng chứng PASS hoặc gap được chỉ rõ.
- Không còn lỗi đã xác nhận trong phần sở hữu mà có thể tự sửa được.
- Diff gọn trong phạm vi, code SHA và tested SHA rõ ràng.
- Báo cáo chỉ ra điều đã sửa/đã đủ bằng chứng và giới hạn thực tế.
- Không cần kết quả từ Chat 2–5 để bàn giao phần backend này.

## Nhắc về bàn giao khi gần hết context

Cập nhật checkpoint theo [mẫu](HANDOFF_TEMPLATE.md), lưu công việc vào nhánh riêng,
ghi điều đã thử, kết quả thật và bước tiếp theo cụ thể. Dòng bàn giao cho người dùng:
“Để tiếp tục Chat 1, gửi lại link file nhiệm vụ này; checkpoint đã cập nhật tại …”.
Không chỉ để trạng thái trong câu trả lời chat.
