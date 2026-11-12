# Năm prompt để gửi vào năm chat Gemini riêng biệt

Gửi cả năm prompt cùng lúc. Mỗi chat có một entrypoint, nhánh và checkpoint riêng. Không mở chat Codex thay Gemini. Không có lịch chạy nền trong đợt này theo quyết định người dùng; các chat đang làm tự push checkpoint GitHub khi có mốc.

## Tổng chỉ huy

> Bạn là Gemini tổng chỉ huy đợt UI HopHDND-WebApp 05/11. Đọc entrypoint https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261105-coordination/source/docs/tasks/parallel-20261105-ui/COMMANDER.md cùng README/TRACKER/checkpoint được dẫn trong đó. Làm trên `ui/20261105-coordination`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Bắt đầu đồng thời bốn worker; đọc HEAD/checkpoint/CI GitHub, cập nhật tracker theo mốc, đôn đốc đúng owner khi thiếu. Sau bàn giao, tích hợp, nối App.tsx, test đúng SHA, dựng package/hash và cập nhật Site demo riêng tư nếu có quyền, xác minh deployment/URL. Chuẩn bị migration nhưng tuyệt đối không ghi Firebase thật, không merge main/deploy production. Nếu Site bị chặn, ghi SITE_PENDING trung thực. Bắt đầu bằng checkpoint của bạn.

## REF

> Bạn là Gemini worker REF độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261105-ref-codes/source/docs/tasks/parallel-20261105-ui/WORKER-REF.md cùng README/checkpoint. Làm trên `ui/20261105-ref-codes` từ baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`, chỉ file được giao. Làm mã vùng/mã con semantic cho mọi ô, admin hover/focus trong ô và copy; kiểm browser/CI đúng SHA. Push checkpoint sau mốc ý nghĩa và trước dừng; báo bằng chứng cho tổng chỉ huy. Không merge/deploy.

## UI

> Bạn là Gemini worker UI độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261105-picker-layout/source/docs/tasks/parallel-20261105-ui/WORKER-UI.md cùng README/checkpoint. Làm trên `ui/20261105-picker-layout` từ baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Chỉ sửa file UI được giao; sao chép picker Lãnh đạo UBND cho sáu vị trí, căn L03 2/3 track, bỏ giãn khoảng trắng; không làm persistence width. Kiểm list/popup/Chrome/CI đúng SHA. Push checkpoint khi có mốc và trước dừng, báo tổng chỉ huy. Không merge/deploy.

## WIDTH

> Bạn là Gemini worker WIDTH độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261105-column-width/source/docs/tasks/parallel-20261105-ui/WORKER-WIDTH.md cùng README/checkpoint. Làm trên `ui/20261105-column-width` từ baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`, chỉ file được giao. Admin lưu hai độ rộng **toàn cụm L03** cho 2/3 track; cột vật lý thu gọn khi chỉ có 2 track, không resize track con. Kiểm persist/admin/guest/Chrome đúng SHA, push checkpoint theo mốc và trước dừng. Không merge/deploy.

## DATA

> Bạn là Gemini worker DATA độc lập. Đọc https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261105-party-data/source/docs/tasks/parallel-20261105-ui/WORKER-DATA.md cùng README/checkpoint. Làm trên `ui/20261105-party-data` từ baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`, chỉ file được giao. Danh mục cấp trình `Không/TTTU/BTV/BCH`, transaction phụ thuộc/permission hẹp, khóa tiến độ khi Không; chuẩn bị migration Firebase thật nhưng **chỉ dry-run/Emulator, chưa ghi live**. Test quyền/lease/CAS, idempotency/rollback; push checkpoint/bằng chứng đúng SHA theo mốc và trước dừng. Không merge/deploy.

Chat mới thay chat cũ khi hit limit: đọc đúng entrypoint trên chính nhánh, checkpoint và HEAD; không reset baseline và không có hai writer đồng thời.
