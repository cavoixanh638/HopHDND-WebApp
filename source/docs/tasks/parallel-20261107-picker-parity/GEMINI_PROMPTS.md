# Gửi vào 3 chat Gemini độc lập
Cả 3 có thể bắt đầu đồng thời. Không tạo chat Codex. Mỗi chat chỉ cần một lời giao sau:

1. Tổng chỉ huy: "Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/COMMANDER.md rồi thực hiện đến hết đích cuối, tự cập nhật GitHub theo checkpoint. Không làm lại phần PASS."
2. Nội dung trình: "Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/CONTENT.md rồi tự triển khai, kiểm thử và bàn giao đầy đủ trên nhánh được giao; không chờ chat khác."
3. Tiến độ 3 khâu: "Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/STAGES.md rồi tự triển khai, kiểm thử và bàn giao đầy đủ trên nhánh được giao; không chờ chat khác."

Theo dõi chung: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/TRACKER.md
Kế hoạch: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/PLAN.md
Spec chung: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/README.md

Khi chat hit limit, gửi lại đúng link role cho chat Gemini mới; dừng writer cũ trước, không chạy hai chat cùng nhánh. Không cần chép hội thoại. Link nhánh của mỗi role luôn trỏ checkpoint mới nhất.
Code UI mới chưa được thực hiện chỉ vì bộ prompt đã có; xem trạng thái test/code/demo trong tracker.
