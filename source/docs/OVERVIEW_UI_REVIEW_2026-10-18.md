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

## Thử nghiệm font, tỷ lệ hoàn thành và bố cục 18/10/2026

- Mặc định cũ: trên Windows giao diện dùng **Segoe UI** bởi khai báo `"Segoe UI",system-ui,-apple-system,sans-serif`. Ảnh Gemini không có metadata font, vì vậy không thể xác quyết chỉ từ screenshot; hình dáng gần các font sans như Arial/Roboto.
- Tham khảo Apple Human Interface Guidelines: hệ San Francisco/SF Pro là font hệ thống trên Apple; dùng `system-ui` trên web để tự chọn font hệ điều hành. Không đóng gói hoặc xuất file font Apple.
- Font của **toàn bộ bảng dữ liệu và bảng thống kê** được chọn chung tại **Chỉnh sửa → Bảng thống kê → Font chữ chung cho mọi bảng**. Font options: Segoe UI, System UI, Arial, Roboto (nếu máy có), Inter (nếu máy có). Chỉ thay đổi văn bản bên trong bảng, không làm vỡ định vị thanh đầu trang.
- Ba phương án chọn & xem trước: **Báo cáo chuẩn** (mặc định, ít màu), **Nhấn mạnh nhóm cần theo dõi**, **Bảng cô đọng**. Tất cả dùng cùng một hàm báo cáo và dữ liệu; đổi bố cục không làm thay đổi số.
- Cột **% hoàn thành** tính riêng từng nhóm lãnh đạo/đơn vị = số mục khớp chính xác với danh sách `completed` của cấu hình / tổng mục của nhóm (làm tròn đến %). Phần tổng dùng cùng công thức với dashboard hiện có, bao gồm cả cột ẩn.
- Cột đầu tiên (tên nhóm phụ trách) và hàng tiêu đề được dùng nền xám lam nhạt, chữ đậm; tất cả số khác được căn giữa. Trên ô phần trăm có vạch tiến trình.
- Màu chỉ là **phương án minh họa để người quản trị chọn**, không phải quyết định cuối: đỏ gạch sáng nhẹ cho Sở chưa trình cần chú ý trước, vàng hổ phách nhạt cho Văn phòng đang thực hiện, xanh lam/trung tính cho các bước trung gian và xanh lá dịu cho kết thúc; phân biệt bằng tên trạng thái ngay cả khi xem đen trắng. Tránh tô cả hàng đỏ và tránh coi màu là kết luận quá hạn.
- Tham khảo thiết kế: Apple HIG Color (màu phải nhất quán, không dùng màu làm thông tin duy nhất), Atlassian Lozenge (danger/warning/information/success theo ngữ nghĩa); không bê nguyên style/dấu hiệu lỗi nguy hiểm vào một trạng thái nghiệp vụ chỉ là đang xử lý.
- Các lựa chọn font/variant chỉ áp dụng chung sau thao tác **Lưu Bảng báo cáo** vào kho cấu hình. Bản preview có thể xem thử mà chưa thay đổi dữ liệu nguồn.

Nguồn giao diện:
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/fonts/
- https://atlassian.design/components/lozenge

## Điều chỉnh 18/10 — làm lại toàn bộ màu và 10 font/cỡ chữ

- Đã **gỡ quy tắc màu cũ chồng chéo** ở bảng tiến độ và thay bằng một hệ token trạng thái dùng chung `--source-bg`, `--office-bg`, `--next-bg`, `--completed-bg`, màu chữ và viền tương ứng. Cùng một trạng thái luôn cho nền/chữ giống hệt ở ô tiêu đề, ô dữ liệu, chú giải và ô chân tổng cộng. Tránh ô dữ liệu nền trắng trong khi tiêu đề màu khác.
- Ba phương án mới **chỉ khác bảng màu**, dùng chung toàn bộ bố cục, chiều cao hàng, font, độ rộng, thống kê:
  1. Dịu – rõ ràng (pastel): đỏ hồng / hổ phách / xanh lam / xanh lá.
  2. Nổi bật – ưu tiên (sắc tươi hơn của cùng hệ).
  3. Tương phản cao (nền đậm, chữ trắng); không còn kiểu thay đổi mật độ dòng.
- Độ tương phản chữ/nền tính theo công thức WCAG cho 4 giai đoạn lần lượt:
  - Dịu: 8.03 / 6.88 / 7.14 / 6.74.
  - Nổi bật: 7.20 / 6.77 / 7.14 / 5.68.
  - Cao: 8.20 / 6.64 / 8.42 / 7.17.
  Tất cả trên chuẩn 4.5:1 cho chữ thường. Màu vẫn chỉ biểu thị thứ tự ưu tiên theo dõi, KHÔNG suy ra quá hạn.
- 10 lựa chọn font có hệ thống fallback trên thiết bị: Apple/System UI, Segoe UI, Inter, Roboto, Helvetica Neue, Arial, Open Sans, Lato, Noto Sans, IBM Plex Sans. Apple SF Pro chỉ dùng qua `system-ui` khi thiết bị Apple có sẵn; không đóng gói font Apple hoặc tải font vào repository. Một số họ chữ ngoài Windows có thể fallback nếu không được cài đặt.
- Thêm cỡ chữ chung **11–20 px**, mặc định 13 px. Áp dụng ở bảng tổng quan và bảng danh sách, bao gồm bộ lọc và nút trong ô. Lưu cùng cấu hình Bảng thống kê vào Firebase khi quản trị bấm lưu.
- Đặt ảnh mẫu bảng màu thu nhỏ ngay dưới từng lựa chọn để dễ so sánh. Giữ khả năng xem trước mà chưa thay đổi Firebase.
- Kiểm thử unit: đúng 10 font, ràng buộc 11–20 px, 3 phương án cùng một cấu trúc bảng, status class ở header/body/footer; smoke browser: computed colors của từng ô cùng trạng thái khớp tuyệt đối.
