# Quy ước người dùng đã chốt

Cập nhật: 02/11/2026 — phiên bản 2.

- Mỗi luồng nhận một phần việc đủ lớn, tự làm từ đầu đến cuối và tự kiểm.
  Các luồng chạy đồng thời, không phải đợi đầu ra nhau; điều phối tích hợp cuối.
- Có thể dùng 5–7 luồng nếu các phạm vi thực sự độc lập; không chia vụn cho đủ số.
- Lưu nhiệm vụ trên GitHub, quy ước chung một file riêng. Người dùng chỉ gửi một
  link cho mỗi luồng; chat mới đọc checkpoint để tiếp tục, không bắt kể lại lịch sử.
- Hit limit xảy ra ngoài kiểm soát người dùng: worker phải lưu chủ động theo
  tiến độ trong lúc làm, không chờ gần hết context hoặc người dùng nhắc.
- Ưu tiên token: file bàn giao ngắn, cập nhật phần thay đổi, tránh nạp toàn bộ log,
  không checkpoint/no-op commit hay chạy lại CI khi không có lý do.
- Cập nhật skill và quy ước liên quan khi người dùng chốt điều chỉnh mới;
  không chỉ hứa “ghi nhớ”. Không suy diễn sự im lặng là chấp nhận chính sách mới.

Các con số nhịp lưu (5 lượt công cụ/10 phút) là mặc định triển khai do assistant
đề xuất cho yêu cầu trên, có thể điều chỉnh theo chi phí và thực tế; không phải
giới hạn sản phẩm hay lời hứa về số phút công việc tối đa có thể mất.
