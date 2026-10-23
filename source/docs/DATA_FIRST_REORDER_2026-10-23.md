> **KẾT LUẬN SAU ĐO (23/10/2026): ĐÃ LOẠI PHƯƠNG ÁN NÀY.** Đây là bản ghi nghiên cứu lịch sử, KHÔNG PHẢI tính năng đang có trên website. PR #41 từng cung cấp công tắc `guestMetadata=defer` chỉ trong chẩn đoán; kết quả đo 5 hồ sơ Chrome mới mỗi nhánh trên cùng host cho thấy bản cũ nhanh hơn: median bảng 1632ms so với 1726ms, p75 1683ms so với 1880ms, median dữ liệu trực tuyến 1610ms so với 1682ms; 5/5 mỗi nhánh thành công. [Bằng chứng CI](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39974764918), [PR thử một lần đã đóng](https://github.com/cavoixanh638/HopHDND-WebApp/pull/42). Vì vậy rollback code thử, giữ thứ tự listener hiện tại; KHÔNG bật tính năng mặc định và KHÔNG thay hosting, Firebase Rules hay data. Những đường dẫn thử phía dưới chỉ còn giá trị lịch sử, **không còn kích hoạt chế độ mới** sau rollback.

# HopHDND — ưu tiên tải dữ liệu và bố cục trước quyền sửa (23/10/2026)

## Phạm vi

Giữ nguyên GitHub Pages, Firebase, Excel, cấu trúc 55 dòng, nguồn và quy tắc bảo mật. Chỉ kiểm tra **thứ tự khởi tạo các listener sau khi Auth hoàn tất**; không di chuyển, nhân bản hoặc công bố dữ liệu. Thời gian thường nằm ở Auth + kết nối RTDB, không phải ở xử lý 55 dòng. Đây là **bản A/B có kiểm soát**, không tự bật cho người dùng khi chưa có số đo đáng tin cậy.

Trong bản cũ sau Auth các listener chạy đồng thời: `.info/connected`, `hdnd/permissions`, `hdnd/control`, `hdnd/profile` và warm-mirror `hdnd/mirrors/{id}/{gid}`.

Trong chế độ thử `?startupMetrics=1&guestMetadata=defer&dataCache=off` **chỉ cho khách Firebase ẩn danh**:
- Kết nối, profile/layout và mirror dữ liệu vẫn bắt đầu ngay sau Auth.
- Hai listener quyền chỉnh sửa và khóa chỉnh sửa (`permissions`, `control`) được khởi tạo khi có **bản trả lời đầu tiên của mirror**; nếu profile xác nhận Excel, mirror lỗi hoặc quá 1.600 ms thì chúng bắt đầu mà không chờ thêm. Vì vậy quyền không bị chặn vô thời hạn.
- Đường đọc mirror dùng chung listener có sẵn, không mở một listener mirror thứ hai trên cùng Database+UID+path.
- `canEdit` vẫn từ chối cho tới khi quyền và control được xác nhận trực tuyến; không tin cache để cấp quyền.
- Admin Google **luôn** tải quyền và khóa chỉnh sửa ngay như cũ, không thay chức năng.
- Test Excel/Database `compareSource=...` **không** dùng thay đổi này để bảo đảm công bằng.
- Không dùng timer để trì hoãn bắt buộc nếu nguồn Excel, profile không hợp lệ, mirror đã trả ngay hoặc có lỗi. Mọi listener/timer đều được dọn khi user UID đổi hoặc component unmount.

## So sánh production sau khi phát hành mã chẩn đoán

Đường cũ:
`https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1&dataCache=off`

Đường data-first cho guest:
`https://cavoixanh638.github.io/HopHDND-WebApp/?startupMetrics=1&dataCache=off&guestMetadata=defer`

So sánh **dữ liệu đúng nguồn và mốc `data-first`, `first-data-painted`**, không kết luận chỉ bằng `HTML responseEnd` hoặc thời gian từ cache. Dùng cùng thiết bị, mạng, tab visible, nhiều lượt với thứ tự A/B đảo ngẫu nhiên; một lần Chrome fresh profile của CI/host không đủ kết luận. Bộ đo `scripts/measure-web-startup.mjs` chạy mỗi host label cùng URL app (khác tham số trên), không đổi hosting.

Các điều kiện dừng: mất dữ liệu, sai 55 dòng hoặc thay đổi quyền chỉnh sửa, quyền đến muộn quá gây ảnh hưởng nghiệp vụ, median/p75 chậm hơn >10%, có session cache trong bài đo không cache. Chỉ khi đa số mẫu cho thấy tăng tốc thực mới bật mặc định. Không được đổi bản vận hành chỉ vì CI pass.

## Bản cuối

Giữ mặc định như trước trong thời gian lấy mẫu. Kết quả CI và quyết định merge/rollback ghi vào [CURRENT_STATE](CURRENT_STATE.md); không tạo nguồn dữ liệu vận hành song song.
