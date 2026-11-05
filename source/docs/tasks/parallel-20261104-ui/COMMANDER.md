# Chat tổng chỉ huy — nghiệm thu và phát hành demo

**Nhánh riêng:** `ui/20261104-coordination`. **Code baseline:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Đọc [quy ước chung](README.md), [tracker](TRACKER.md), [checkpoint tổng chỉ huy](checkpoints/COMMANDER.md), [nhiệm vụ A](WORKER-TABLE.md), [nhiệm vụ B](WORKER-ADMIN.md) và [ảnh](reference-admin-controls.png). Bạn là writer duy nhất của `TRACKER.md`, `checkpoints/COMMANDER.md` và báo cáo tích hợp; không sửa file worker khi họ còn ghi.

## Trách nhiệm đang chạy song song

1. Xác nhận hai nhánh A/B đều xuất phát từ baseline, một writer mỗi nhánh. Đọc HEAD/checkpoint/CI trên GitHub ngay lúc bắt đầu, sau commit/test/lỗi/chặn mới và định kỳ khi chat đang hoạt động. Ghi `TRACKER.md` theo từng yêu cầu: owner, code SHA, test SHA, PASS/FAIL/NOT RUN, run/artifact, bước còn thiếu. Cập nhật và push **không cần người dùng nhắc**; tránh no-op commit/poll liên tục khi trạng thái không đổi.
2. Nếu một worker nói DONE, đối chiếu diff, checkpoint và bằng chứng đúng SHA. Nếu thiếu, gửi lại một nhiệm vụ thực thi được trên chính nhánh worker với tiêu chí đóng; cập nhật tracker. Nếu worker bị hit limit, hướng dẫn chat thay thế đọc cùng entrypoint và checkpoint; không có hai writer đồng thời.
3. Kiểm tra trước liệu hai nhánh có xung đột file thật. Theo vùng sở hữu đã định, A và B có thể làm độc lập. Nếu phát hiện file chung bất ngờ, yêu cầu worker trả file ngoài vùng sở hữu; tổng chỉ huy giải quyết tại tích hợp sau khi họ đã push và dừng ghi. Không cho worker phụ thuộc code của nhau để bắt đầu.

## Sau khi nhận bàn giao

1. Tích hợp A/B vào nhánh tổng chỉ huy, giữ commit riêng và sửa xung đột. Kiểm yêu cầu có 7 cụm: metadata `(Sở - Loại VB)`; L03 quyền sửa/chỉ đọc/`Không phải trình`/căn trạng thái; dropdown thống nhất; admin tìm thấy lối đổi tên; admin thấy C01–C03 và bật/tắt; tên lưu đúng tiêu đề/tab; guest không thấy điều khiển. So ảnh và kiểm trên list/popup, 1440/900/390px, cột hẹp, chuột/phím. Không làm lại phần 03/11 đã PASS trừ khi diff tác động.
2. Chạy typecheck, unit liên quan, build, Chrome smoke và Firebase Emulator nếu code chạm đường quyền/lưu chung; lấy **một code SHA tích hợp cố định** và link CI đúng SHA. Phân loại lỗi do sản phẩm, test oracle cũ hay runner Chrome; sửa rồi chạy lại phần bị ảnh hưởng. Không hạ điều kiện test để lấy màu xanh giả.
3. Dựng lại HTML QA chỉ từ SHA đạt, ghi hash và artifact; cập nhật **Site demo riêng tư hiện có** `appgprj_6ae93f17c2e48191815caef8a642fa14` nếu quyền owner-only còn đúng, xác nhận version/deployment `succeeded`, URL và các thao tác chính trên bản có thể truy cập. Nếu Site yêu cầu ChatGPT sign-in, ghi rõ giới hạn kiểm tra của phiên hiện tại. Không triển khai Firebase production/GitHub Pages production, không merge `main`.
4. Ghi báo cáo bàn giao: bảng yêu cầu → SHA/file → test/run/screenshot, package hash, Site version/deployment URL, phần còn thiếu nếu có. Chỉ đổi `TRACKER.md` sang DONE khi bản tích hợp và demo đủ bằng chứng; worker DONE riêng không tự động đóng việc chung. Dừng vòng theo dõi khi đã hoàn tất, không mở audit mới vô hạn.

## Nhịp lưu

Checkpoint đầu tiên trước khi kiểm sâu; cập nhật sau mỗi mốc có thay đổi và trước khi nhường lượt. `TRACKER.md` trên nhánh tổng chỉ huy là bảng điều phối duy nhất; checkpoint A/B trên nhánh riêng do worker cập nhật. Nếu GitHub/CI/Site bị chặn, ghi chính xác API/lệnh đã thử, trạng thái sản phẩm, owner gỡ chặn và bước kế, tiếp tục phần độc lập. Không hứa chat tự chạy khi Gemini đã dừng.
