# HopHDND — nạp Excel thật + bật đồng bộ tự động 60 giây mà không cần plugin Firebase

Cập nhật: 23/10/2026. File nguồn là Office XLSX trên Google Drive, tab **Các nội dung trình HĐND**; file gốc có bốn sheet. Đã kiểm tra bản tải ngày 23/10/2026: **55 nội dung**, Excel A–O, không có dòng thiếu nội dung. **Chưa coi hệ thống đã đồng bộ production cho tới khi Cloud Shell trả SUCCESS và Console có log.** Đừng đưa JSON dữ liệu Excel hoặc khóa dịch vụ lên GitHub công khai.

## Chuẩn bị

- Đăng nhập tài khoản có quyền quản trị dự án Google Cloud/Firebase `hophdnd-8b7b2`. Cần **billing** đã kích hoạt, vai trò cho phép bật API, tạo IAM service account, Cloud Run service, Scheduler job và cấp vai trò Firebase Database. Google Cloud yêu cầu người dùng tự xác nhận bước bật billing/phát sinh chi phí.
- Mở [Google Cloud Console](https://console.cloud.google.com/?project=hophdnd-8b7b2), chọn đúng project `hophdnd-8b7b2), mở nút **Activate Cloud Shell** `>_`.
- Nếu Cloud Shell đang chọn sai dự án, chạy `gcloud config set project hophdnd-8b7b2` trước. Không sử dụng khóa JSON service account, không đưa token vào hội thoại hay GitHub.

## Một lần triển khai và nạp bản thật

Dán đoạn dưới vào **Cloud Shell** (đây là lệnh đọc code từ repo công khai của chính dự án, sau đó chạy script minh bạch trong repo):

```bash
gcloud config set project hophdnd-8b7b2
git clone --depth 1 https://github.com/cavoixanh638/HopHDND-WebApp.git
cd HopHDND-WebApp
bash source/mirror_sync/bootstrap_cloud_shell.sh install
```

Script hiển thị các quyền cần cấp và yêu cầu gõ `ACTIVATE` trước khi tạo hạ tầng. Sau đó sẽ:

1. Bật APIs, tạo **hai service account chuyên biệt** không có private key.
2. Triển khai **Cloud Run Service riêng tư**, chỉ nhận yêu cầu có ID token, không public; đồng bộ đọc file Excel hiện tại theo đúng Drive ID + tên sheet, xác thực schema A–O và ghi snapshot duy nhất vào `hdnd/mirrors/<ID>/<gid>`.
3. Gọi HTTP POST lần đầu bằng token của người đang đăng nhập Cloud Shell. Nếu lỗi, **không tạo lịch**.
4. Chỉ khi lệnh đầu nhận HTTP 200 và Cloud Run đã đọc lại bản mới được xác nhận, mới tạo Cloud Scheduler `* * * * *`, vùng `asia-southeast1`, múi giờ `Asia/Bangkok`, OIDC dành riêng và mỗi lần gọi tối đa 120 giây.

**Lưu ý quyền:** service account chạy đồng bộ cần vai trò Google IAM `roles/firebasedatabase.admin` trên project. Đây là quyền rộng với cả Realtime Database, không thể giới hạn vào chỉ một node bằng Firebase Rules khi xác thực OAuth server. Bộ cài không tạo khóa service account, không nới quyền `rules.json`, và chỉ ghi đúng một đường snapshot bằng logic có kiểm tra. Quản trị cân nhắc phạm vi quyền trước khi gõ `ACTIVATE`.

## Nếu nguồn Excel trả 403 hoặc 404

Mở Google Drive file [Excel gốc](https://drive.google.com/file/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/view), bấm Chia sẻ và thêm **Reader** cho:

`hophdnd-excel-mirror@hophdnd-8b7b2.iam.gserviceaccount.com`

Chia sẻ đúng **file Excel này**, không cấp Editor và không chia sẻ cả thư mục; không tự sửa file nguồn. Sau đó chạy lại **cùng** lệnh `bash source/mirror_sync/bootstrap_cloud_shell.sh install` trong thư mục repository Cloud Shell. Script idempotent đối với service accounts/service/job lịch.

Metadata file hiện từng trả quyền `anyone:writer`; nên rà soát quyền thực tế và sau khi service account có quyền Reader riêng, hạn chế chế độ chia sẻ rộng vì nội dung phục vụ công việc.

## Nghiệm thu

- `bash source/mirror_sync/bootstrap_cloud_shell.sh status` xác định Cloud Run service và lịch Cloud Scheduler.
- Cloud Run logs phải có `published:true` và `rows` bằng số nội dung hợp lệ đang có trong Excel (ở bản kiểm ngày 23/10 là 55), cùng `sha256`, thời điểm Excel được cập nhật và thời điểm đồng bộ. Nếu không đổi, log `unchanged:true`.
- [Firebase Realtime Database Console](https://console.firebase.google.com/project/hophdnd-8b7b2/database) → Data → `hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344`: kiểm tra `source`, `rows`, `syncedAt`, `sha256`.
- [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=hophdnd-8b7b2): lịch `hophdnd-excel-mirror-minute` ở trạng thái ENABLED, có kết quả gọi thành công ở các lần chạy.
- Thử cập nhật một ô trong Excel, chờ lần quét kế tiếp, đối chiếu snapshot. Hai lượt thành công và không có dữ liệu mất mới đổi WebApp **Tài khoản và dữ liệu → Tài khoản → Nguồn dữ liệu hiển thị = Firebase Database**.

## Khẩn cấp, lỗi hoặc chi phí

```bash
# Xem trạng thái
bash source/mirror_sync/bootstrap_cloud_shell.sh status
# Tạm dừng cron, không xóa dữ liệu hay mất bản Excel
bash source/mirror_sync/bootstrap_cloud_shell.sh pause
# Tiếp tục chạy cron sau khi kiểm tra
bash source/mirror_sync/bootstrap_cloud_shell.sh resume
```

Trong WebApp, admin có thể chuyển lại **Excel (trực tiếp)** bất kỳ lúc nào; dữ liệu Excel gốc không bị sửa bởi job. Nếu có lỗi đồng bộ, Cloud Run trả HTTP 500, Scheduler ghi lỗi, bản Firebase cũ được giữ; không tuyên bố cập nhật thành công.

**Chi phí:** Cloud Run Service request-based thường tiết kiệm hơn Cloud Run Job khi mỗi phút chỉ cần kiểm tra file nhỏ; Jobs bị tính tối thiểu một phút tài nguyên mỗi lần. Cloud Scheduler có 3 job/tháng miễn phí trên mỗi billing account, còn Cloud Run, Cloud Build, logs và lưu trữ có biểu phí/hạn mức riêng. Khi bật thật nên đặt billing budget/alerts.

## Nếu chỉ cần nạp Excel một lần, không muốn bật dịch vụ

File JSON được xuất riêng từ bản Excel thực tế trong cuộc trò chuyện, **không lưu vào GitHub**. Có thể nạp bằng Firebase Console vào **đúng node** `hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344`: chọn node này (tạo các node cha nếu thiếu) → menu **Import JSON** → chọn file. Phải tránh chọn root, `hdnd`, `profile` hoặc `items` vì import JSON có thể thay thế dữ liệu tại node đang chọn. Cách này chỉ là bản tĩnh, không thay cho lịch 60 giây.

## Điểm giới hạn quyền

AI trong ChatGPT không có quyền Google Cloud Console của chủ dự án, dù đã đọc được Excel từ Google Drive và commit source trên GitHub. Vì vậy chỉ thông báo **đã bật 60 giây** khi script trên Cloud Shell được người có quyền thực thi và xác nhận thành công. GitHub CI PASS không tự tạo job trên Firebase production.
