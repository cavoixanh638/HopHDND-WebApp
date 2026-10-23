# Thử tải trực tiếp Excel so với Firebase (HopHDND)

Ngày thực hiện: 23/10/2026. Mục tiêu kiểm chứng giả thuyết **lần đầu mở trang chậm không nhất thiết do đọc Excel**. Không chuyển toàn bộ khách về Excel khi chưa có dữ liệu thực tế.

## Mở hai đường dẫn trên cùng máy và mạng

- [Excel thật (GViz A:O)](https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1&compareSource=excel)
- [Firebase Realtime Database](https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1&compareSource=database)

`compareSource` chỉ hoạt động nếu có `startupMetrics=1`; không được lưu vào Firebase, localStorage hay profile admin. Mỗi lần reload sẽ giữ nguyên chế độ đo đã lựa chọn. Hai phương án dùng **cùng Firebase Auth và layout admin đã xác nhận** trước khi bắt đầu yêu cầu dữ liệu. Không dùng RTDB session snapshot cache. Bản A/B chỉ đọc, không phát sinh sửa thử hoặc cập nhật nguồn. Nguồn thật trong `hdnd/profile.dataSource` không thay đổi.

**Độ chính xác:** vì App vẫn cần JavaScript, Auth và layout từ Firebase, số đo từ mở trang tới có bảng không chỉ là chi phí của Excel/RTDB. Dùng **request latency** đo chính xác giữa `excel-request-start` và `excel-response` hoặc `data-subscribe` và `data-first`, cùng mốc `first-data-painted` tính từ navigationStart. So sánh ít nhất 3 lần/nguồn trong cùng tab foreground, cùng mạng; xem cả median thay vì một mẫu duy nhất. Mọi mốc có thể chạy song song.

## Đã được kiểm thử tự động

- Google GViz endpoint công khai, đúng File ID và gid, đã có phép probe CI với HTTP 200, GViz `status=ok`, kích thước phản hồi ~29KB (probe trước dùng A:P; bản PR #35 dùng đúng A:O). Probe **không in dữ liệu nghiệp vụ**.
- CI chạy lại đúng GViz A:O ba lần (mỗi lượt có timeout 15 giây) và báo `GVIZ_LIVE_READ` / `GVIZ_LIVE_SUMMARY` trong log, chỉ có HTTP status, số mục, byte và thời gian. Đây là mạng GitHub runner, **không phải** mạng người dùng.
- Vitest thử nghiệm URL opt-in; Pages integration kiểm tra khi profile admin đang dùng Database thì `?compareSource=excel` vẫn đọc GViz và **không đổi cấu hình admin**; khi chưa xác nhận layout không tải Excel tạm thời.
- TypeScript, Firebase emulator, Chrome browser smoke, offline HTML, Pages publish phải PASS trước merge.

## Bảo mật và khác biệt dữ liệu

Phép thử không cấp phép truy cập mới: Excel theo quyền đọc công khai hiện có, RTDB vẫn tuân theo Firebase Auth và Rules. Không xuất data cell trong log hoặc clipboard. **Chỉ dùng để đo, không ghi Excel hay DB**.

Có thể Excel hiện trả 57 nội dung trong khi Firebase mirror nhập thủ công là 55; điều này do khác thời điểm đồng bộ hoặc parser, không được coi là so sánh tính đúng dữ liệu. Đối chiếu số dòng, nội dung, ID và ngày sửa Excel trước khi quyết định chọn nguồn chính. Chưa có lịch tự đồng bộ 60 giây.

## Quyết định

- Nếu Excel đạt thời gian từ yêu cầu tới có dữ liệu tương tự Firebase và 95% lần mở trang không kẹt, đọc trực tiếp Excel có thể đáp ứng nhu cầu ít hơn 60 dòng (nhưng vẫn cần cân nhắc tính công khai của link GViz và độ ổn định thực tế).
- Nếu Excel chậm thất thường hoặc GViz bị giới hạn/không đọc được trên một số mạng thì giữ Database và hoàn thiện đồng bộ.
- Nếu cả hai cùng chậm trước `source-selected`, nguyên nhân thuộc Auth, JS, profile hoặc browser/network — **không quy lỗi Excel**.
