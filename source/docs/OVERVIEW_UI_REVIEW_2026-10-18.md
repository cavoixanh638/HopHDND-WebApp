# Rà soát giao diện Tổng quan — 18/10/2026

## Bằng chứng và giới hạn
- Mã hiện hành: `src/domain/reporting.ts`, `src/features/reports/ReportTable.tsx`,
  `src/data/report-preferences.ts`.
- Mã HTML cũ thực tế đã đối chiếu (Google Drive): **Báo cáo tiến độ HĐND.html**,
  tệp ID `1AB19-FThNdZKo-N5RpjiW3opfQUeb685`, cập nhật trước 14/10/2026.
- HTML cũ có `titleStyle`, `showDynamicSubtitle`, `columnOrder`,
  `hiddenColumns`, `columnLabels`, `completedColumns`,
  `showCompletedPercent`, `columnColors`, `statusMappings`,
  bộ lọc nguồn theo loại báo cáo và tùy chỉnh thêm bảng.
- Quy tắc bản cũ có ví dụ nhóm `Sở chưa trình` (đỏ), `VP đang thực hiện`
  (xanh), `Đã gửi ĐU` (vàng), `Đã báo cáo TU`/ `Hoàn thành` (xanh lá).
  Mã cũ gộp một số trạng thái Thành ủy bằng từ khóa. **Không mang quy tắc
  gộp đó tự động vào dữ liệu mới** nếu chưa có xác nhận nghiệp vụ; “đã gửi”
  không đồng nghĩa “đã hoàn thành”.
- Cấu hình đã lưu của người dùng không được đổi tên hoặc thay đổi phạm vi
  báo cáo trong lần rà soát UI này.

## Đã triển khai (phạm vi trình bày)
1. Số trong từng ô và các dòng tổng được căn giữa, dùng chữ số tabular;
   tên đơn vị giữ căn trái. Tiêu đề nhóm trạng thái được xuống dòng.
2. Đọc đúng bốn lớp cần phân biệt để theo dõi: cơ quan chủ trì chưa trình,
   Văn phòng đang thực hiện, các bước xử lý tiếp theo, đã hoàn thành.
   Nhóm đề nghị rút và trạng thái chưa khớp được ghi riêng, không tự xem là
   hoàn thành hoặc là quá hạn.
3. Nút lọc nhanh **Chỉ xem đơn vị còn ở Sở/VP**. Đếm tổng vẫn lấy từ tất cả
   bản ghi; chân bảng nói rõ **Tổng toàn bảng** khi lọc để không gây nhầm.
4. Tuỳ chọn **Nhấn mạnh Sở chưa trình và Văn phòng đang thực hiện** cho
   từng báo cáo tại phần chỉnh Bảng thống kê; lưu riêng trong cấu hình
   giao diện, không tác động đến quy tắc tổng hợp, dữ liệu Google Sheets
   hay quyền người dùng.
5. In/PDF tiếp tục giữ nguyên nội dung báo cáo gốc trong bản xem trước
   (cần nghiệm thu lại bố trí giấy bằng người dùng).

## Khuyến nghị giai đoạn tiếp theo (chưa tự động triển khai)
- Hoàn thiện editor mapping/rule tách bạch: tình trạng nguồn, trạng thái
  mặc định, nhóm hoàn thành, cách xử lý trạng thái lạ; trước khi áp dụng
  phải có bảng đối chiếu số lượng/tổng chênh lệch.
- Cho bật tỷ lệ hoàn thành từng dòng và nhóm Thành ủy TTTU/BTV/BCH
  sau khi xác nhận tiêu chí; không suy diễn SLA/quá hạn khi không có
  ngày hẹn và nguồn hạn xử lý được kiểm chứng.
- Tuỳ chỉnh tiêu đề nhiều định dạng, thêm bảng, màu từng cột và
  đổi nhãn từ danh mục; phân biệt tính năng mới so với tính năng
  đã có ở bản HTML cũ.
