# Checkpoint chủ động, ít token

## Nhịp lưu (quy ước vận hành, không phải timer của ứng dụng)

Lưu checkpoint đầu tiên trước khi bắt đầu làm sâu. Sau đó lưu tại sự kiện:
- Trước công việc dài hoặc không rõ thời lượng: ghi việc sắp chạy, code SHA,
  run/session ID nếu đã có, lệnh/link dùng để kiểm tra tiếp. Vừa có ID thì bổ sung.
- Sau một bản sửa nhỏ, quyết định có tác động, tái hiện quan trọng hoặc kết quả CI.
- Nếu chưa có mốc: sau tối đa khoảng 5 lượt gọi công cụ có nội dung công việc mới,
  hoặc khoảng 10 phút quan sát được đang làm, tùy điều nào tới trước.
  Khi bất ngờ bị chặn/compaction thì dùng checkpoint gần nhất; đây không phải SLA.
- Trước khi nhường lượt/kết thúc/đổi chat. Không đợi cảnh báo sắp hết context.

Gộp một lần ghi ở cuối batch độc lập; đừng checkpoint sau từng read-only tool.
Không có thay đổi hữu ích thì không tạo commit, không nhắc lại trạng thái.

## Nội dung ngắn

Mục tiêu 20–40 dòng, khoảng 300–600 từ trở xuống khi có thể.
Dùng [mẫu](../assets/CHECKPOINT.md), chỉ giữ:
- Status, nhánh, code SHA/tested SHA, nơi lưu (remote/local-only).
- Đã làm (tối đa 3 ý), quyết định/điều đã thử cần giữ (tối đa 3 ý).
- File WIP và phần chưa push; không nhầm checkpoint với bản sao mã nguồn.
- Test/result + run URL/ID; chưa chạy ghi NOT RUN, chưa có ACK ghi UNKNOWN.
- Tối đa 3 bước kế tiếp thực thi được; vấn đề ngoài phạm vi nếu có.
Log, screenshot và lịch sử chi tiết nằm ở artifact hoặc git, không chép vào file.
Chat tiếp quản đọc 3 file nhỏ: quy ước, nhiệm vụ, checkpoint; tra code/log theo nhu cầu.

## Lưu mã và đồng bộ

1. Lưu file làm việc ngay sau batch; đọc diff trước khi commit các đường dẫn mình
   sở hữu. WIP được lưu trên nhánh riêng với TEST_PENDING/FAIL rõ ràng; không phải
   mọi checkpoint đều đòi full test.
2. Push code WIP đã kiểm diff và checkpoint tại mốc an toàn. Nếu không push được,
   lưu local và ghi LOCAL_ONLY, worktree/path, commit chưa đẩy; không hứa chat mới
   chỉ đọc GitHub sẽ khôi phục được.
3. Nếu dùng connector, fetch blob SHA rồi update đúng file checkpoint của luồng.
   Conflict: đọc lại, giữ nội dung mới của writer khác, dừng ghi đè nếu phát hiện
   hai writer. Không force push, reset hoặc git add toàn repo.
4. Không ghi SHA của chính commit checkpoint vào nội dung đó. Ghi tested code SHA;
   docs-only commit sau nó không đổi kết luận code nhưng phải được phân biệt.
5. Không chạy lại test chỉ vì checkpoint đổi. Workflow mới của luồng nên giới hạn
   đường dẫn liên quan, bỏ qua handoff-only changes khi phù hợp; không bỏ required
   checks hoặc tự sửa workflow dùng chung chỉ để giảm số run.

Đây là giao thức assistant chủ động thực hiện trong lúc chạy, không phải daemon
tự lưu khi model đã dừng. Không thể bảo đảm cứu phần chưa lưu giữa hai mốc.
