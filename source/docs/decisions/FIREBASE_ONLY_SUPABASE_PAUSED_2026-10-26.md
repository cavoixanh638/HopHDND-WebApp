# Quyết định điều hành — Tạm dừng Supabase, chỉ phát triển Firebase

**Ngày:** 26/10/2026. **Quyết định:** chủ dự án HopHDND. **Phạm vi:** có hiệu lực ngay cho công việc tiếp theo; chưa phải quyết định phát hành production.

## 1. Hướng phát triển duy nhất

- Tiếp tục phát triển một WebApp HopHDND với **Firebase Realtime Database** làm nguồn dữ liệu nghiệp vụ duy nhất trong phạm vi phát triển hiện hành.
- Thực hiện các thay đổi UI, báo cáo, xử lý hồ sơ, realtime, phân quyền, khóa ô, ghi có server ACK, chốt dữ liệu và vận hành Firebase trên chuỗi nhánh **PR #71** (`feat/firebase-primary-source-migration-20261025`) → **PR #72** (`feat/exclusive-cell-leases-admin-freeze-20261025`). Nhánh làm việc Firebase nâng cao là PR #72; khi hợp nhất phải giữ thứ tự PR #71 rồi #72 và qua release gate.
- **Không triển khai nguồn lựa chọn Firebase/Supabase trên giao diện**, không đưa adapter Supabase, tài khoản Supabase, RPC, migrations hay benchmark so sánh nguồn vào các bản phát hành Firebase chỉ vì trước đó đã được phát triển trên nhánh tích hợp.
- Không quay lại các workflow đồng bộ Google Sheets / Excel. Nhân viên tạm thời tiếp tục dùng Excel/Sheet trong lúc chưa chuyển; sau khi cutover đã được duyệt, tất cả nghiệp vụ trên WebApp + Firebase `hdnd/items`.

## 2. Đóng băng Supabase như một tùy chọn dự phòng

- Bảo tồn **nguyên trạng** Supabase staging `uguhyunuzsdrkykqgdmq`, dữ liệu, các bảng, RLS/Auth, migrations và code lịch sử. Tại lần kiểm tra gần nhất Supabase có **55** bản ghi được sao từ Firebase mirror; đây là một **snapshot ở một thời điểm**, không phải bản sao dự phòng đồng bộ liên tục hoặc giải pháp khôi phục thảm họa đã được xác minh.
- Nhánh `integration/firebase-supabase-unified-20261026` (PR #77) và các nhánh Supabase (#73/#75) được **PAUSED / ARCHIVED-FOR-OPTION**, không merge vào `main`, không deploy, không tự cập nhật dữ liệu, không dùng trong quá trình kiểm thử/sửa Firebase tiếp theo. Giữ mã nguồn để có thể phục hồi lựa chọn sau này khi chủ dự án ra lệnh mới.
- **Không xóa** Supabase project, snapshot, migration, hoặc branch. **Không** ghi đè dữ liệu Firebase để khớp Supabase và không thiết lập dual-write/sync ngầm.
- Nếu một cải tiến UI/chung có trong #77 nhưng thiếu trên nhánh Firebase, rà soát và chuyển **chỉ phần độc lập với Supabase** cùng test tương ứng lên nhánh Firebase khi có nhu cầu cụ thể; không cherry-pick nguyên nhánh tích hợp.

## 3. Trách nhiệm phát triển và kiểm chứng

- Những lần giao việc sau, nếu không có chỉ định khác, hiểu **Firebase-only**. Không yêu cầu người dùng nhắc “đừng sửa Supabase” trong mỗi câu lệnh.
- Thay đổi UI dùng mã Firebase trong nhánh #72; mọi đụng chạm trường dữ liệu, quyền, migration hoặc script phải kiểm tra **chỉ Firebase**, không đặt thêm Supabase thành điều kiện nghiệm thu.
- Mỗi thay đổi phải cập nhật `docs/CURRENT_STATE.md`, `docs/WORKBOARD.md` và tài liệu chức năng liên quan; kiểm thử với dữ liệu mô phỏng và Firebase emulator trước; không viết lên Firebase production tùy tiện.
- Sửa giao diện trên nhánh Firebase **không tự ảnh hưởng** tới database Supabase, vì không có cơ chế đồng bộ hoặc deploy của Supabase; tuy nhiên repo từng có mã dùng chung ở nhánh #77 nên tuyệt đối không lấy nguyên nhánh đó để phát triển Firebase-only.
- Giữ nguyên các release gates Firebase: kiểm chứng Rules và backup/restore, đa tài khoản, quyền/lease, hồi quy, snapshot chốt dữ liệu một lần và phê duyệt GO trước production.

## 4. Điều kiện khôi phục Supabase

Chỉ khi **chủ dự án yêu cầu tường minh** tái sử dụng Supabase mới mở lại nhánh/tích hợp, kiểm tra dữ liệu đã cũ, đánh giá bảo mật Auth/RLS, thực hiện staging QA, xác minh một lần dữ liệu hiện tại và thiết kế đồng bộ/chuyển nguồn theo quyết định mới. Không coi 55 dòng staging là bằng chứng dữ liệu còn mới.

**Các liên kết:** [Firebase PR #71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71), [Firebase PR #72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72), [Supabase PR #77 tạm dừng](https://github.com/cavoixanh638/HopHDND-WebApp/pull/77).
