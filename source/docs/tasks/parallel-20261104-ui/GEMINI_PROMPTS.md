# Ba prompt giao Gemini song song

Khởi chạy **chat tổng chỉ huy và hai chat worker riêng**. Cả ba bắt đầu từ code baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`; mỗi chat dùng nhánh riêng đã tạo trên GitHub. Hai worker có ranh giới file không chồng nhau nên làm đồng thời, tổng chỉ huy theo dõi từ lúc bắt đầu. Không cần mở 10 chat để chia vụn cùng renderer.

## 1. Gửi cho chat tổng chỉ huy

> Bạn là **tổng chỉ huy** đợt sửa UI HopHDND-WebApp ngày 04/11/2026. Đọc một entrypoint: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-coordination/source/docs/tasks/parallel-20261104-ui/COMMANDER.md và các link README/TRACKER/checkpoint trong đó. Làm trên nhánh `ui/20261104-coordination`, code baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Theo dõi chặt hai nhánh worker A/B bằng checkpoint, commit và CI trên GitHub; tự cập nhật/push TRACKER khi có mốc mới, không đợi tôi nhắc. Nếu thiếu tiêu chí, giao lại chính worker với yêu cầu và điều kiện đóng rõ. Khi hai nhánh bàn giao, tích hợp, chạy gate đúng SHA, dựng và cập nhật Site demo riêng tư hiện có, kiểm tra và ghi bằng chứng đầy đủ. Không merge main hoặc deploy Firebase production. Chỉ kết luận DONE khi bản tích hợp và demo đạt, không tin nhãn “xong” đơn thuần. Bắt đầu bằng checkpoint của bạn và đọc trạng thái A/B.

## 2. Gửi cho chat A — Nội dung trình và L03

> Bạn nhận **chat A** độc lập sửa ô Nội dung trình và toàn bộ bố cục/chọn giá trị L03. Đọc một entrypoint: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-table-layout/source/docs/tasks/parallel-20261104-ui/WORKER-TABLE.md và các link README/checkpoint trong đó. Làm trên nhánh `ui/20261104-table-layout` từ baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`, chỉ sửa file A sở hữu. Tự khảo sát, sửa, kiểm list/popup, quyền sửa/chỉ đọc, `Không phải trình`, 1440/900/390px, dropdown chuột/phím, test đúng code SHA và lưu ảnh/số đo. Cập nhật/push `checkpoints/A.md` ở mốc khảo sát, bản sửa, test, lỗi/chặn và trước kết thúc; không đợi tôi nhắc. Báo tổng chỉ huy SHA, diff, CI và tiêu chí còn thiếu. Không merge/deploy; DONE chỉ khi đủ gate.

## 3. Gửi cho chat B — điều khiển admin

> Bạn nhận **chat B** độc lập làm cho admin dễ thấy và dùng tùy chọn đổi tên danh sách, hiện/ẩn C01/C02/C03 theo ảnh. Đọc một entrypoint: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-admin-controls/source/docs/tasks/parallel-20261104-ui/WORKER-ADMIN.md và các link README/ảnh/checkpoint trong đó. Làm trên nhánh `ui/20261104-admin-controls` từ baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`, chỉ sửa file B sở hữu. Mã đã có `listTitle` và `summaryCards` nhưng điều khiển đang thu gọn: kiểm đường lưu thật rồi tạo lối vào rõ, không xây state thứ hai. Tự kiểm admin/guest, reload/CAS, 1440/900/390px, test đúng SHA; cập nhật/push `checkpoints/B.md` ở mốc khảo sát, bản sửa, test, lỗi/chặn và trước kết thúc. Báo tổng chỉ huy SHA, diff, CI và tiêu chí còn thiếu. Không merge/deploy; DONE chỉ khi đủ gate.

Nếu chat bị hit limit, chat mới thay writer cũ và chỉ cần đọc lại entrypoint trên nhánh tương ứng cùng checkpoint mới nhất. Các chat tự ghi GitHub khi còn hoạt động; không có lời hứa cập nhật nền sau khi chat dừng.
