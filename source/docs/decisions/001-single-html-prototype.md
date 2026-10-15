# ADR 001 — Bản thử một HTML và lựa chọn runtime giao diện

Ngày: 13/10/2026. Phạm vi: bản thử 0.1.0, không phải nghiệm thu hệ thống đủ chức năng.

## Quyết định

- Phát triển module TypeScript, bàn giao một HTML ghép JS/CSS; không yêu cầu người xem nhận source hoặc cài Node.
- Ưu tiên nhập trực tiếp Sheets giai đoạn đầu; adapter GViz đọc là bước kế tiếp. Ghi app thật cần thiết kế auth/xung đột sau này.
- Chọn Preact qua lớp tương thích React cho **bản thử**, dựa trên dung lượng nhỏ hơn và luồng UI cơ bản đã kiểm tra ở môi trường HTTP cục bộ. Giữ build React để so sánh lại khi bổ sung chức năng; chưa khẳng định hệ thống hoàn chỉnh nhanh hơn.
- Script đóng gói nhỏ do dự án sở hữu, kiểm tra một file và cú pháp bundle. Đã bỏ vite-plugin-singlefile vì audit transitive dependencies có cảnh báo; không dùng lệnh ép nâng/hạ phiên bản để che cảnh báo.
- Dùng cửa sổ xác nhận trong app cho Hủy; tránh phụ thuộc confirm dialog native bị kẹt trong môi trường kiểm tra.

## Giới hạn và điều kiện xem lại

Browser kiểm tra không cho mở `file://`; UI được kiểm tra bằng server phát triển HTTP, chưa bằng cách mở file tải từ Drive. Kiểm tra cấu trúc/cú pháp bản đóng gói không thay thế việc kiểm tra môi trường người dùng thật.

Khi nối Sheets hoặc thêm bảng lớn, editor nâng cao, Excel/print/auth, đo lại compatibility/bundle/độ trễ. Thư viện Excel có thể làm HTML lớn hơn; không suy từ kích thước prototype sang kích thước cuối cùng. Nếu Preact không đạt kiểm tra tương thích/bảo trì, chọn React qua cùng kiến trúc.

Các số đo build và kết quả cụ thể ghi trong [báo cáo kiểm tra](../KIEM_THU_VA_NGHIEM_THU.md). Kế hoạch ghi lộ trình; [CURRENT_STATE](../CURRENT_STATE.md) ghi tình trạng thực tế.
