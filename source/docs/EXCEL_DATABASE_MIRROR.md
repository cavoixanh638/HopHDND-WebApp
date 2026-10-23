# HopHDND — Bản sao Excel → Firebase Database mỗi phút (triển khai có kiểm soát)

Cập nhật: 23/10/2026. Phạm vi **bản thử PR #27**. **Chưa nạp vào RTDB production, chưa tạo Cloud Run Job hoặc Cloud Scheduler**; việc có mã nguồn không phải bằng chứng đã đồng bộ thành công. Không thay Excel gốc, không tự đổi Rules đang chạy.

## Quy tắc nghiệp vụ

- File nguồn duy nhất được nhận diện bằng **Drive file ID** `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, tab `gid=60961344`; nguồn là **Office .xlsx**, không phải Google Sheets native. Tên tab phải được quản trị xác nhận chính xác từ file Excel. GID chỉ là phần xác nhận nguồn với trình đọc web; job Office phải chọn tab bằng **tên tab thực tế** (`SOURCE_SHEET_NAME`) chứ không được đoán sheet đầu tiên.
- **Excel là nguồn chính duy nhất**; mirror là snapshot chỉ đọc, không sinh ra thay đổi ngược về Excel. Bảng báo cáo/chi tiết cùng đọc một snapshot nhất quán.
- Không xóa snapshot khi Excel đọc lỗi, sai tab, thiếu header A–O, không có hàng, giảm bất thường số hàng, mất mạng hoặc ghi RTDB lỗi.
- Mirror phải có `schemaVersion`, `source`, `sourceModifiedAt`, `syncedAt`, `sha256`, `rows`. Ghi conditional `If-Match` theo ETag và đọc lại sau ghi. Nếu file Excel **không đổi**, không ghi RTDB lần nữa.
- Mọi thiết lập cột, thứ tự cột, gộp cột, cỡ chữ và nguồn dữ liệu do **admin xác thực** lưu trong `hdnd/profile`; người xem/khách chỉ đọc bố cục. Bố cục được **cache sau một lần Firebase xác nhận thành công**, nên lần sau có thể hiện từ cấu hình admin gần nhất trong khi đang tái xác nhận trực tuyến; nếu cache chưa có thì tiếp tục chặn bố cục sai. **Không được dùng bộ nhớ local để cấp quyền sửa**, vì phân quyền chỉ có hiệu lực từ Firebase hiện hành.
- `dataSource='database'` không thể chọn nếu không đọc được snapshot hợp lệ và đúng source; mặc định an toàn hiện nay vẫn là `excel`.
- Đối với lựa chọn Database, client dùng `onValue` RTDB nhận bản mới ngay sau khi job phát hành; không yêu cầu người mở trang phải kích hoạt đồng bộ. UI phải hiển thị thời điểm snapshot được đồng bộ và cảnh báo khi vượt 120 giây.
- Khoảng 60 giây là **lịch gọi job**, không bảo đảm nguồn Excel được sửa xong và copy tức thì. Mỗi lần chạy không bắt đầu song song khi lần trước còn xử lý; ưu tiên phiên bản Office cuối cùng đã đọc xác nhận.

## Thành phần đã có trong PR #27

- `source/mirror_sync/sync.py`: đọc metadata, tải file bằng Google Drive readonly, xác thực đúng sheet + schema 15 cột, so hash, kiểm tra số dòng và nguồn, ghi Firebase conditional và đọc lại.
- `source/mirror_sync/Dockerfile`, `requirements.txt`, `test_sync.py`: chạy container job và kiểm thử với Excel mô phỏng.
- `source/src/data/firebase-mirror-repository.ts`: trình đọc snapshot Firebase chỉ đọc, kiểm tra nguồn, dữ liệu và lỗi.
- `source/src/state/use-firebase.ts`: admin profile cache đã xác nhận và lựa chọn nguồn chung.
- `source/src/features/settings/FirebasePanel.tsx`: tài khoản admin chọn trực tiếp Excel hay bản sao Database; không cho chọn database rỗng.

## Quy trình triển khai Cloud an toàn (chưa thực hiện)

1. Tạo một **service account dành riêng cho mirror** trên Google Cloud. **Không đưa khóa service account hoặc token vào repo hoặc client**.
2. Xác nhận account này được Google Drive cấp quyền **chỉ đọc file Excel chính xác**. Vì file nguồn là Office Drive riêng, nếu chưa được chia sẻ cho service account thì backend không thể tự tải file; không được tự đổi quyền chia sẻ để né lỗi.
3. Cấp IAM chỉ đủ đọc file và **quyền ghi snapshot Firebase RTDB theo đường đã chỉ định**. Rà/kiểm thử Rules thực tế: không thêm quyền client ghi vào `hdnd/mirrors`, không cho viewer sửa nguồn Excel hay cấu hình admin. Thiết lập cảnh báo thất bại.
4. Dựng Cloud Run **Job** từ `source/mirror_sync/Dockerfile`. Biến môi trường bắt buộc: `SOURCE_FILE_ID`, `SOURCE_GID`, `SOURCE_SHEET_NAME`, `RTDB_URL`. Đặt maximum retries và timeout phù hợp, không cho concurrency gây đè bản mới.
5. **Chạy một lần thủ công trước**: phải xác nhận đúng ID/GID/tên sheet, số dòng, các giá trị A–O đặc biệt N và O, sha256, `sourceModifiedAt`, `syncedAt`; dùng snapshot RTDB độc lập để đối chiếu từng dòng với Excel; không bật chế độ Database trước bước này.
6. Tạo Cloud Scheduler với cron `* * * * *` (mỗi phút), timezone `Asia/Bangkok`, dùng OAuth service account qua Cloud Scheduler để gọi Cloud Run **Jobs API** (khác OIDC gọi Cloud Run service); hạn chế trùng chạy và cấu hình retry. Định kỳ xác nhận logs: lần đồng bộ thành công gần nhất, độ trễ, lỗi Drive/RTDB.
7. Sau khi đạt đối chiếu và hai lần cập nhật thử liên tiếp, admin vào **Tài khoản và dữ liệu → Tài khoản → Nguồn dữ liệu hiển thị**, chọn **Firebase Database (bản sao đồng bộ)**. Việc lựa chọn lưu Firebase profile dùng chung; khách nhận ngay. Phương án quay lại là chọn **Excel trực tiếp**, không xóa mirror/không ghi Excel.
8. Bản cache trình duyệt không bảo đảm tuyệt đối thời điểm mới nhất. Nếu kết nối RTDB bị lỗi hoặc bản sao chậm, UI giữ bản hợp lệ cuối cùng và cảnh báo; tuyệt đối không tạo cảm giác dữ liệu đã đồng bộ khi chưa có xác nhận máy chủ.

## Rủi ro và lưu ý về quyền

Tại thời điểm rà soát, metadata Google Drive cho file nguồn trả `anyone:writer`. Đây là quyền chia sẻ khá rộng đối với nguồn nghiệp vụ; **quản trị nên rà soát quyền thực tế và giảm về nhóm cần thiết** trước khi đưa mirror vào vận hành. Không để Job tự sửa quyền nguồn.

## Kiểm thử bắt buộc trước merge/deploy

- `npm run typecheck`, `npm test`, `npm run docs:check`, `npm run test:firebase`, `npm run build:pages:test`, browser smoke.
- Unit `firebase-mirror.test.ts`, `admin-compact-layout.test.ts` và Python unittest với fixture Excel.
- Browser guest: không có nút gộp cột/tùy chỉnh kích thước/màu/bố cục; cùng màu inactive của hai tab; admin thấy thiết lập và trạng thái nguồn; trường hợp database chưa có snapshot phải từ chối chuyển.
- Test server **thật** yêu cầu tài khoản/cloud quyền được quản trị cung cấp; CI giả lập không thể chứng minh nạp production.

**Nghiệm thu: mới coi hoàn thành toàn bộ khi có chứng cứ Cloud Scheduler job chạy theo phút, mirror dữ liệu chính xác và kích hoạt chọn database thành công; PR/CI chỉ chứng minh đã chuẩn bị phần mềm.**
