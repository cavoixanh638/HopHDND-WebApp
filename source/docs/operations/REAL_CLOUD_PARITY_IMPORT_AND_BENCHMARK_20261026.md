# Nạp đúng 55+ hồ sơ Firebase mirror vào Supabase staging rồi đo A/B

**Cập nhật 26/10/2026. Chưa có dữ liệu thật trong Supabase staging: hiện vẫn là 6 QA giả.**

Nguồn chính xác đang hiển thị 55 hồ sơ là **Firebase RTDB mirror**
`hdnd/mirrors/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344`.
KHÔNG lấy `hdnd/items`: bản sao lưu trước đó đã xác minh đường dẫn này 0 dòng. Tuy mirror xuất phát từ workbook ban đầu, quy trình benchmark **không gọi Google Sheets/Excel**. Sau này WebApp chính thức vẫn ưu tiên dữ liệu Firebase primary theo quyết định của dự án; benchmark này đánh giá đường Cloud hiện đang có 55 bản ghi, không tạo nguồn nghiệp vụ thứ ba.

Đã triển khai lên **chỉ** Supabase Cloud staging `uguhyunuzsdrkykqgdmq`:
- Policy SELECT trên bảng nghiệp vụ chỉ cho `hdnd_private.is_admin()`; đã kiểm tra chỉ Google verified email trong allowlist mới đủ điều kiện. Không có dữ liệu nghiệp vụ thực ở staging tính tới trước phiên benchmark.
- RPC `public.hdnd_stage_mirror_snapshot_for_benchmark`: security invoker công khai làm cầu đến private security definer có `auth.uid`/Google identity check. Authenticated EXECUTE=true, anon EXECUTE=false, cấm gửi khác source mirror cố định; chấp nhận 50–1000 bản ghi; chặn DB chứa bất kỳ bản ghi nghiệp vụ nào ngoài 6 QA; chặn audit/lock; nguyên tử DELETE 6 QA + INSERT rows; đối chiếu số dòng; không upsert.
- Mirror có revision 0, Supabase yêu cầu revision tối thiểu 1, nên chuẩn hóa **duy nhất metadata** `0 → 1` trước khi so SHA-256. Nội dung trường và mã hồ sơ phải giữ nguyên.

## Chạy một lần bằng Windows/GitHub Desktop

1. Trong **GitHub Desktop**, clone repo vào thư mục QA riêng hoặc mở clone QA, checkout **`integration/firebase-supabase-unified-20261026`** rồi Fetch/Pull. Không chỉnh `main`/WebApp đang được nhân viên sử dụng.
2. Mở PowerShell trong thư mục `source` và chạy `npm ci` (lần đầu).
3. **Nhấp đúp** `source\scripts\START_REAL_CLOUD_BENCHMARK.cmd`; trình duyệt mở `http://localhost:8765/qa-benchmark.html`. Đây là WebApp benchmark chỉ cho owner, không phải bản Pages production.
4. Bấm **Đăng nhập Google Firebase** và **Đăng nhập Google Supabase staging** (cùng tài khoản Google admin đã xác minh). Supabase OAuth dùng redirect riêng `http://localhost:8765/**`; nếu Dashboard chưa allowlist, thêm nó ở Authentication → URL Configuration. Nếu Google Cloud OAuth client có hạn chế origins, cho phép `http://localhost:8765`.
5. Bấm **Kiểm tra cùng dữ liệu**. Nếu báo Firebase mirror 55+ và Supabase 6, bấm **Sao chép ... sang Supabase staging**, đọc xác nhận, bấm OK. Thao tác sẽ đọc lại live mirror để tránh snapshot đã thay đổi, gửi một lần lên RPC staging, đọc lại Supabase và kiểm SHA-256 toàn bộ 55+ hồ sơ. **Không ghi Firebase**.
6. Bấm lại **Kiểm tra cùng dữ liệu**, rồi chọn 30, 100 hoặc **720 lượt, mỗi 5 giây**. Nhấn **Bắt đầu đo**. Sau khi có kết quả, nhấn **Lưu CSV**. So P50/P95 và tỷ lệ lỗi trên cùng dữ liệu. Tắt sleep PC, giữ tab mở, mạng ổn định. Khi so benchmark một giờ, tab nền làm dừng để tránh kết quả bị Chrome giảm tần suất.
7. Đo ở cả mạng nhà và mạng nhân viên khi cần. Kết quả chỉ đo đọc danh sách qua Firebase REST GET no-store có Firebase ID token và Supabase REST, mỗi lượt bắt buộc gọi máy chủ, **không** đại diện cho tải bố cục / thời gian lưu có ACK hoặc Realtime.

## Giới hạn, các bước dự phòng

- Tôi chưa chạy UI trên Windows hay đăng nhập Google thay bạn; hiện Cloud có **6 QA rows**. **Chưa thể khẳng định đã copy 55 hồ sơ** cho đến khi nút báo "ĐÃ NẠP VÀ XÁC MINH" và Supabase SQL readback đúng count/hashes.
- Firebase snapshot có quyền truy cập riêng (Google Firebase UID). Supabase JWT riêng; tài khoản Firebase không tự đăng nhập Supabase.
- Nếu OAuth không chạy, chỉ giải pháp thủ công mới cho phép copy private SQL: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-private-real-parity.ps1`. Đường dẫn này đã sửa sang Firebase mirror đúng, xuất JSON + SQL **ngoài Git repo**, trong Documents/HopHDND-Private-QA. Chỉ chạy SQL vào staging sau khi đọc, không lưu vào Github.
- Script SQL riêng tư trước đó giả định `/hdnd/items`; đã sửa để nhận mirror envelope `{schemaVersion,source,sha256,rows:[...]}` và `revision=0`. Các tài liệu cũ đề cập lấy `/hdnd/items` cho benchmark mirror là **sai đường dẫn**, không làm theo.
- Nếu Supabase staging đã có data thực từ phiên khác hoặc audit/leases, import **bị chặn** thay vì ghi đè. Không tự động đồng bộ; copy một lần để benchmark. Không sử dụng dữ liệu cá nhân trên một site public; môi trường QA chỉ chạy localhost, chính sách admin-only.
