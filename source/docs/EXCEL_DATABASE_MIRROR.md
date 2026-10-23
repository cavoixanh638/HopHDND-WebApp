# HopHDND — Đồng bộ Excel → Firebase Database mỗi phút qua Cloud Shell

Cập nhật: 23/10/2026. PR #27 đã gộp; script Cloud Shell cập nhật trong PR tiếp theo. Có **bản JSON 55 nội dung được tạo riêng ngoài repo** từ Office Excel ngày 23/10; không lưu dữ liệu nghiệp vụ lên GitHub công khai. **Chưa nạp vào RTDB production, chưa tạo Cloud Run Job hoặc Cloud Scheduler**; việc có mã nguồn không phải bằng chứng đã đồng bộ thành công. Không thay Excel gốc, không tự đổi Rules đang chạy.

## Quy tắc nghiệp vụ

- File nguồn duy nhất được nhận diện bằng **Drive file ID** `1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`, tab `gid=60961344`; nguồn là **Office .xlsx**, không phải Google Sheets native. Đã kiểm tra trực tiếp workbook thực tế ngày 23/10/2026: tên tab dữ liệu là **`Các nội dung trình HĐND`** (tổng cộng 4 sheet). GID chỉ là phần xác nhận nguồn với trình đọc web; job Office phải chọn tab bằng **tên tab thực tế** (`SOURCE_SHEET_NAME`) chứ không được đoán sheet đầu tiên.
- **Excel là nguồn chính duy nhất**; mirror là snapshot chỉ đọc, không sinh ra thay đổi ngược về Excel. Bảng báo cáo/chi tiết cùng đọc một snapshot nhất quán.
- Không xóa snapshot khi Excel đọc lỗi, sai tab, thiếu header A–O, không có hàng, giảm bất thường số hàng, mất mạng hoặc ghi RTDB lỗi.
- Mirror phải có `schemaVersion`, `source`, `sourceModifiedAt`, `syncedAt`, `sha256`, `rows`. Ghi conditional `If-Match` theo ETag và đọc lại sau ghi. Nếu file Excel **không đổi**, không ghi RTDB lần nữa.
- Mọi thiết lập cột, thứ tự cột, gộp cột, cỡ chữ và nguồn dữ liệu do **admin xác thực** lưu trong `hdnd/profile`; người xem/khách chỉ đọc bố cục. Bố cục được **cache sau một lần Firebase xác nhận thành công**, nên lần sau có thể hiện từ cấu hình admin gần nhất trong khi đang tái xác nhận trực tuyến; nếu cache chưa có thì tiếp tục chặn bố cục sai. **Không được dùng bộ nhớ local để cấp quyền sửa**, vì phân quyền chỉ có hiệu lực từ Firebase hiện hành.
- `dataSource='database'` không thể chọn nếu không đọc được snapshot hợp lệ và đúng source; mặc định an toàn hiện nay vẫn là `excel`.
- Đối với lựa chọn Database, client dùng `onValue` RTDB nhận bản mới ngay sau khi job phát hành; không yêu cầu người mở trang phải kích hoạt đồng bộ. UI phải hiển thị thời điểm snapshot được đồng bộ và cảnh báo khi vượt 120 giây.
- Khoảng 60 giây là **lịch gọi Cloud Run Service riêng tư**, không bảo đảm nguồn Excel được sửa xong và copy tức thì. Service chạy với concurrency=1 và max-instances=1; ETag chống ghi đè; ưu tiên phiên bản Office mới nhất đã đọc xác nhận. Sử dụng **request-based billing**, không dùng Cloud Run Jobs mỗi phút vì Job có mức tính phí tối thiểu 1 phút thực thi.

## Thành phần đã có trong PR #27

- `source/mirror_sync/sync.py`: đọc metadata, tải file bằng Google Drive readonly, xác thực đúng sheet + schema 15 cột, so hash, kiểm tra số dòng và nguồn, ghi Firebase conditional và đọc lại.
- `source/mirror_sync/Dockerfile`, `requirements.txt`, `server.py`, `test_sync.py`: chạy HTTP Service có xác thực và kiểm thử với Excel mô phỏng.
- `source/mirror_sync/bootstrap_cloud_shell.sh`: Cloud Shell keyless, kiểm tra project/drive/IAM, chạy import đầu và tạo lịch 60 giây khi đã thành công; có status/pause/resume.
- `source/src/data/firebase-mirror-repository.ts`: trình đọc snapshot Firebase chỉ đọc, kiểm tra nguồn, dữ liệu và lỗi.
- `source/src/state/use-firebase.ts`: admin profile cache đã xác nhận và lựa chọn nguồn chung.
- `source/src/features/settings/FirebasePanel.tsx`: tài khoản admin chọn trực tiếp Excel hay bản sao Database; không cho chọn database rỗng.

## Quy trình triển khai Cloud an toàn (chưa thực hiện)

1. Tạo một **service account dành riêng cho mirror** trên Google Cloud. **Không đưa khóa service account hoặc token vào repo hoặc client**.
2. Xác nhận account này được Google Drive cấp quyền **chỉ đọc file Excel chính xác**. Vì file nguồn là Office Drive riêng, nếu service account chưa có quyền đọc thì backend sẽ trả lỗi 403/404. Chia sẻ **Reader** cho `hophdnd-excel-mirror@hophdnd-8b7b2.iam.gserviceaccount.com`, không tự đổi quyền chia sẻ rộng.
3. Runtime service account chỉ truy cập được file Drive đã chia sẻ, nhưng OAuth vào RTDB cần quyền IAM `roles/firebasedatabase.admin` **ở phạm vi project**, quyền này rộng và **không bị giới hạn theo node bằng Database Rules**. Không lưu service-account key, không cấp quyền IAM này cho Scheduler SA, và kiểm tra quyền chặt trước khi chạy. Rà/kiểm thử Rules thực tế: không thêm quyền client ghi vào `hdnd/mirrors`, không cho viewer sửa nguồn Excel hay cấu hình admin. Thiết lập cảnh báo thất bại.
4. Dựng Cloud Run **Service có xác thực** từ `source/mirror_sync/Dockerfile` và **không public**. Biến môi trường bắt buộc: `SOURCE_FILE_ID`, `SOURCE_GID`, `SOURCE_SHEET_NAME`, `RTDB_URL`. Đặt timeout 120 giây, max-instances 1, concurrency 1, min-instances 0, request-based billing.
5. **Gọi HTTPS POST một lần từ Cloud Shell với Google ID token trước**: phải xác nhận đúng ID/GID/tên sheet, số dòng, các giá trị A–O đặc biệt N và O, sha256, `sourceModifiedAt`, `syncedAt`; dùng snapshot RTDB độc lập để đối chiếu từng dòng với Excel; không bật chế độ Database trước bước này.
6. Tạo Cloud Scheduler với cron `* * * * *` (mỗi phút), timezone `Asia/Bangkok`, dùng **OIDC** service account với `audience` là URL Cloud Run Service. Cấp riêng `roles/run.invoker` trên đúng service; không mở truy cập công khai. Chỉ kích hoạt sau khi bản đầu đã nạp thành công; không retry tự động để tránh gọi trùng. Định kỳ kiểm tra log và số lần đồng bộ thành công. Định kỳ xác nhận logs: lần đồng bộ thành công gần nhất, độ trễ, lỗi Drive/RTDB.
7. Sau khi đạt đối chiếu và hai lần cập nhật thử liên tiếp, admin vào **Tài khoản và dữ liệu → Tài khoản → Nguồn dữ liệu hiển thị**, chọn **Firebase Database (bản sao đồng bộ)**. Việc lựa chọn lưu Firebase profile dùng chung; khách nhận ngay. Phương án quay lại là chọn **Excel trực tiếp**, không xóa mirror/không ghi Excel.
8. Bản cache trình duyệt không bảo đảm tuyệt đối thời điểm mới nhất. Nếu kết nối RTDB bị lỗi hoặc bản sao chậm, UI giữ bản hợp lệ cuối cùng và cảnh báo; tuyệt đối không tạo cảm giác dữ liệu đã đồng bộ khi chưa có xác nhận máy chủ.

## Rủi ro và lưu ý về quyền

Tại thời điểm rà soát, metadata Google Drive cho file nguồn trả `anyone:writer`. Đây là quyền chia sẻ khá rộng đối với nguồn nghiệp vụ; **quản trị nên rà soát quyền thực tế và giảm về nhóm cần thiết** trước khi đưa mirror vào vận hành. Không để Job tự sửa quyền nguồn.

## Kiểm thử bắt buộc trước merge/deploy

- `npm run typecheck`, `npm test`, `npm run docs:check`, `npm run test:firebase`, `npm run build:pages:test`, browser smoke.
- Unit `firebase-mirror.test.ts`, `admin-compact-layout.test.ts` và Python unittest với fixture Excel.
- Browser guest: không có nút gộp cột/tùy chỉnh kích thước/màu/bố cục; cùng màu inactive của hai tab; admin thấy thiết lập và trạng thái nguồn; trường hợp database chưa có snapshot phải từ chối chuyển.
- Test server **thật** yêu cầu chính chủ vào Cloud Shell (có quyền trên project và đã bật billing); CI giả lập không thể chứng minh nạp production. Runbook điều hành có trong `source/mirror_sync/DEPLOY_CLOUD_SHELL.md`.

**Nghiệm thu: mới coi hoàn thành toàn bộ khi có chứng cứ Cloud Scheduler job chạy theo phút, mirror dữ liệu chính xác và kích hoạt chọn database thành công; PR/CI chỉ chứng minh đã chuẩn bị phần mềm.**
