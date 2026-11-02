# Chat 2 — Giao diện và thao tác người dùng

**Đây là file đầu vào duy nhất cần gửi cho chat mới hoặc chat tiếp tục luồng 2.**

## Đọc trước, rồi thực hiện

1. [Quy ước chung](QUY_UOC_CHUNG.md).
2. [Checkpoint Chat 2](handoffs/CHAT_2.md) trên **nhánh luồng** bên dưới.
3. Các phần nhiệm vụ trong file này và `source/AGENTS.md` của checkout.

- Nhánh làm việc cố định: `parallel/20261102-chat2-ui`.
- [Link vào đúng nhánh](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat2-ui/source/docs/tasks/parallel-20261102/CHAT_2_UI.md).
- [Checkpoint mới nhất của luồng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat2-ui/source/docs/tasks/parallel-20261102/handoffs/CHAT_2.md).
- Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`; khi tiếp tục phải dùng HEAD nhánh luồng,
  không reset về mốc này.
- Báo cáo kết quả của mình: `source/docs/tasks/parallel-20261102/reports/CHAT_2.md`.
- Checkpoint của mình: `source/docs/tasks/parallel-20261102/handoffs/CHAT_2.md`.

Không cần đọc lại toàn bộ chat cũ. Nếu checkpoint đã DONE, báo kết quả đã có
và không tự khởi động một vòng sửa mới. Nếu đang làm, tiếp tục bước kế tiếp
sau khi đối chiếu git/CI; giữ nguyên phần việc chưa commit của người trước.

## Mục tiêu

Hoàn thiện chất lượng sử dụng của giao diện hiện có trên desktop/mobile:
tự phát hiện lỗi, sửa và kiểm chứng bằng trình duyệt. Không thiết kế lại sản phẩm,
không phụ thuộc Chat 1 sửa backend.

## Phạm vi sở hữu

- `source/src/app/`, `source/src/components/`
- `source/src/features/`, `source/src/styles/`
- Test UI colocated trong các vùng trên; QA riêng `source/parallel-qa/chat2/`;
  workflow mới `.github/workflows/parallel-chat2-*.yml`.

Không sửa `source/src/data/`, domain/model dùng chung, backend, Rules,
parser, operator/backup, cấu hình phát hành hoặc root dependencies.
Dùng đúng API và quyền từ bản xuất phát.

## Hiện trạng và đọc có chọn lọc

Mốc chung đã có [FULL App QA PASS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199).
Đọc `source/AGENTS.md`, giữ các quyết định đã chốt về màu, lịch sử field,
kéo cột, popup khách, bố cục và polling; không coi sở thích thiết kế mới là lỗi.
Với báo cáo/popup tra tài liệu parity/hiệu năng liên quan, không đọc mọi lịch sử.

## Làm trọn phần việc

1. Lập ma trận nhỏ các luồng đang có: đăng nhập, danh sách, lọc/tìm kiếm,
   sửa ô, lịch sử, báo cáo/popup, bảng điều khiển admin. Đối chiếu coverage cũ,
   ưu tiên trường hợp còn thiếu hoặc lỗi quan sát được.
2. Dùng dữ liệu tổng hợp để kiểm tải/rỗng/lỗi, mất mạng, thiếu quyền, chuỗi dài,
   tiếng Việt, focus/bàn phím, chiều rộng desktop và mobile.
3. Ưu tiên lỗi gây cản trở: nút không hoạt động, mất nháp, thông báo nhầm ACK,
   focus sai, popup che thao tác, tràn trang, nội dung không đọc được.
   Không thêm chức năng hoặc đổi mapping nghiệp vụ.
4. Sửa trong vùng UI. Dùng backend mốc chung trên Emulator khi kết luận tích hợp;
   fixture cô lập chỉ chứng minh giao diện, phải ghi đúng giới hạn.
5. Kiểm lại bằng thao tác trình duyệt và ảnh trước/sau cần thiết; chạy typecheck/
   unit và gate liên quan theo thay đổi. Không sửa shared smoke runner để tránh
   xung đột; có thể tạo runner riêng trong vùng QA của luồng.

## Điều kiện hoàn tất

- Có danh sách luồng đã kiểm, lỗi tái hiện và kết quả sau sửa.
- Ảnh/log xác định viewport, vai trò và nguồn dữ liệu giả; không lẫn production.
- Giữ nguyên hợp đồng quyền/dữ liệu và thiết kế đã được người dùng chốt.
- Lỗi bên backend nếu phát hiện có tái hiện cho điều phối, không chờ Chat 1.
- Bàn giao phần UI thực hiện được; không chỉ một bản nhận xét hoặc đề xuất.

## Nhắc về bàn giao khi gần hết context

Cập nhật checkpoint theo [mẫu](HANDOFF_TEMPLATE.md), lưu công việc vào nhánh riêng,
ghi điều đã thử, kết quả thật và bước tiếp theo cụ thể. Dòng bàn giao cho người dùng:
“Để tiếp tục Chat 2, gửi lại link file nhiệm vụ này; checkpoint đã cập nhật tại …”.
Không chỉ để trạng thái trong câu trả lời chat.
