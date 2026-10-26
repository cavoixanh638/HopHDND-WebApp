# Thử nghiệm host WebApp trong mạng LAN cơ quan — ghi nhận 27/10/2026

> **PHẠM VI:** Đây là thử nghiệm hạ tầng riêng với dữ liệu giả, **không phải** WebApp HopHDND thật và **không phải** kết quả nghiệm thu triển khai production. Tài liệu bảo lưu để áp dụng khi xem xét mô hình triển khai sau này. Ưu tiên hiện hành là **hoàn thiện UI WebApp Firebase PR #72**; không chuyển sang phát triển host LAN hoặc Supabase nếu chưa có chỉ đạo mới.

## Kết quả thực tế do người dùng xác nhận

- Máy Windows làm host đã khởi động demo tại `http://localhost:8787`. Giao diện báo trạng thái `LAN đang hoạt động`, hiển thị 5 hồ sơ mẫu `DEMO-01`–`DEMO-05`; trong ảnh trên máy host, độ trễ đo localhost khoảng **2 ms**.
- Người dùng đã chạy `ipconfig` để tìm IPv4 địa chỉ LAN, rồi **xác nhận truy cập được demo qua LAN từ máy khác trong cơ quan** (cuộc trò chuyện 27/10/2026). **Đánh giá: PASS bước kết nối LAN liên máy ở mức thực nghiệm do người dùng xác nhận.**
- Không thu địa chỉ IPv4 cụ thể trong tài liệu (thay đổi theo DHCP); không suy diễn tốc độ từ máy thứ hai, số lượng người đồng thời tối đa hoặc độ ổn định 100%.
- Chưa có báo cáo hoàn thành đo 60 phút mỗi 5 giây, đo độ trễ máy thứ hai, khôi phục sau mất điện, UPS, HA/failover, tải đồng thời thực tế, backup production, xác thực và phân quyền. **Các mục này vẫn CHƯA KIỂM.**
- Bài demo này chỉ là giao diện độc lập thử mạng và chỉnh sửa dữ liệu giả, **không hiển thị giao diện HopHDND/IPlan thật**; vấn đề người dùng phản ánh đã được xác nhận và phân biệt rõ.

## Các bước tái sử dụng sau này

1. Trên máy Windows làm host, giải nén gói demo `HopHDND_Demo_Host_LAN_Windows_5s_60min.zip` đã bàn giao qua chat. Nhấn đúp `CHAY_DEMO_LAN.cmd` và **giữ cửa sổ máy chủ chạy**; không trộn gói này vào các thư mục WebApp production.
2. Xác minh trên chính máy host bằng trình duyệt: `http://localhost:8787`.
3. Mở PowerShell, chạy `ipconfig`. Dùng địa chỉ **IPv4 của adapter Ethernet hoặc Wi-Fi nội bộ đang kết nối mạng cơ quan**, không dùng loopback `127.0.0.1`, adapter ảo/VPN/Tailscale nếu mục tiêu là truy cập thuần LAN.
4. Máy khác cùng mạng/vùng định tuyến cho phép: mở `http://<IP-LAN-CỦA-MÁY-HOST>:8787`. **Không dùng `localhost` trên máy thứ hai**, vì nó trỏ về chính máy thứ hai.
5. Nếu máy thứ hai không mở được, kiểm tra host vẫn đang chạy, IP không đổi, chính sách Wi-Fi guest/VLAN, Windows Firewall TCP 8787 cho **Private + LocalSubnet** và quy định IT cơ quan. Không tắt toàn bộ Firewall; **không port forward ra Internet**.
6. Chạy thử ngắn `DO_THU_LAN_2_PHUT.cmd` tại máy khách rồi `DO_LAN_60_PHUT.cmd` khi sẵn sàng; đo mỗi 5 giây trong 60 phút, giữ Windows không ngủ. Lưu CSV, so tỷ lệ thành công, p50/p95/p99, độ gián đoạn tối đa, đối chiếu phép thử qua các nhà cung cấp quốc tế với cùng điều kiện thực tế.
7. Chỉ khi quyết định vận hành ứng dụng thật: thiết kế hosting cho toàn bộ **frontend + backend + database + xác thực**, mạng nội bộ, sao lưu/khôi phục, phân quyền, nhật ký truy cập, cấu hình IP tĩnh/DNS LAN và điện dự phòng. Hosting frontend LAN **không làm Firebase/Auth Internet tự hoạt động khi quốc tế mất kết nối**.

## Công việc ưu tiên sau mốc này

- **TẠM DỪNG** nghiên cứu phát hành local-host; demo chỉ giữ làm bằng chứng feasibility.
- **TRỞ LẠI UI**: tiếp tục làm giao diện HopHDND hiện hữu trên **nhánh `feat/exclusive-cell-leases-admin-freeze-20261025` / PR #72**, Firebase-only, giữ Theme2 và các quy tắc màu/trạng thái đã chốt.
- Áp dụng skill `ui-ux-pro-max` đã cài local trong `D:\HopHDND-Dev\.agents\skills\ui-ux-pro-max\SKILL.md` khi làm việc qua Codex, nếu tồn tại; skill chỉ hỗ trợ thiết kế, không là lý do thay kiến trúc, dữ liệu hoặc workflow.
- Mỗi đổi UI phải kiểm tra desktop + màn hình nhỏ, trạng thái chọn ô/khóa ô, loading, error, focus, contrast, hành vi báo cáo; tránh thay đổi database hoặc tự deploy. Ghi `CURRENT_STATE.md`, `WORKBOARD.md` và tài liệu UI liên quan sau khi test.
