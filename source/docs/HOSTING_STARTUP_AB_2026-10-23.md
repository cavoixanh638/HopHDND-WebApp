# HopHDND — đối chứng mở trang và thử hosting bằng cùng bản build (23/10/2026)

## Trạng thái và mục đích

Bộ đo và bộ đóng gói **chỉ là thử nghiệm** trên nhánh PR, chưa chấp thuận thay hosting hoặc dữ liệu.
Production vẫn là GitHub Pages + Firebase Auth + Realtime Database / Google GViz theo cấu hình admin. Không đổi Firebase Rules, không xuất dữ liệu HĐND công khai và không chạy trình ghi Excel.

Cần quyết định bằng **thời gian đến bảng dữ liệu hợp lệ**, không xếp hạng hosting qua quảng cáo CDN, HTTP TTFB đơn độc hoặc gzip. Lỗi 55 dòng tải chậm được quan sát thấy chủ yếu trên đường JS → Auth → profile → RTDB, nhưng tác nhân cụ thể biến động theo môi trường.

## 1. Đo trực tiếp với Chrome headless, không in nội dung HĐND

Từ thư mục source/:

    node scripts/measure-web-startup.mjs --runs=5 --timeout=25000

Để đối chứng cơ chế Firebase mirror warmup với bản không warmup, dùng **cùng host**:

    node scripts/measure-web-startup.mjs \
      --host='early=https://cavoixanh638.github.io/HopHDND-WebApp/' \
      --host='control=https://cavoixanh638.github.io/HopHDND-WebApp/?mirrorWarmup=off' \
      --runs=5 --timeout=25000

Bộ đo luôn gắn `startupMetrics=1&dataCache=off` để bỏ cache **dữ liệu bảng** (không bỏ cache cấu hình quyền hoặc Firebase Auth). Chế độ này chỉ hoạt động khi URL chẩn đoán có đủ hai tham số; người dùng bình thường vẫn giữ cache để mở nhanh. Đo lại sau khi phiên bản hỗ trợ `dataCache=off` đã lên Pages; bản public cũ chưa hiểu tham số này.

Tham số --host có thể thêm Firebase Hosting/Cloudflare Pages **sau khi có URL staging thực tế**. Host phải là HTTPS. Không đưa JWT, query cá nhân hoặc URL có credential vào tham số.

- Mỗi host có Chrome profile mới: **chỉ lần 1** là truy cập fresh profile. Lần 2–5 giữ lại phiên Firebase/Auth, **tắt HTTP cache và tắt session row-cache bằng URL chẩn đoán**, nhưng vẫn dùng lại hồ sơ/phiên Auth; không được ghi nhãn "cold-first-ever" cho 2–5. Một mẫu cold/host không đủ để kết luận cold-start.
- Mẫu ghi **riêng** 'dataCacheMs' (bản lưu phiên chưa xác nhận), 'dataMilestoneMs' (bảng đã lên lịch vẽ) và 'snapshotMs' (mốc 'data-first' đã nhận/kiểm chứng dữ liệu trực tuyến). Bộ đo tiếp tục chờ cả bảng **và** dữ liệu trực tuyến. Vì marker bảng được ghi trong requestAnimationFrame, nó **không chứng minh pixel đã vẽ**: cần Chrome Performance trace/filmstrip hoặc nhìn trang để chốt cảm nhận.
- Báo cáo chỉ gồm host nhãn, thời gian số học, trạng thái visible và số lượt; không thu cell Excel, path RTDB, token, UID, email, URL.
- Chỉ tính trung vị/p75/p95 trên các mẫu quan sát được và ghi riêng số timeout, không loại bỏ thất bại rồi nói tốc độ tốt. Nếu >1 timeout trong 5 lượt, **không nghiệm thu**.
- Trước khi phát hành URL chẩn đoán `dataCache=off` trên site chính, CI đo site cũ có thể còn đọc từ cache và **không được dùng làm đối chứng chuẩn**. 
- GitHub runner có mạng, DNS và vị trí khác máy người dùng. CI chỉ cho bằng chứng bổ sung, **không thay thế** A/B 5+ lượt trên máy người dùng.

## 2. Tạo hai bản HOST staging giống hệt GitHub Pages (không deploy)

Từ source/:

    npm ci
    npm run build:pages
    node scripts/prepare-hosting-staging.mjs

Tạo:
- dist-hosting/firebase/public/**: các file JS/CSS/HTML giống bản dist-pages, kèm firebase.json trong dist-hosting/firebase/ để cấu hình cache.
- dist-hosting/cloudflare/public/**: cùng file, kèm _headers riêng của Cloudflare.

Mỗi file HTML/JS/CSS được đối chiếu SHA-256 byte-for-byte. Chỉ thêm metadata deployment riêng của từng host, không build lại code/đổi biến dự án. Giữ đường dẫn assets tương đối.

**Không tự triển khai production Firebase hiện có.** Chỉ sau khi có project staging độc lập, quyền thích hợp và kiểm thử an toàn:

    cd dist-hosting/firebase
    firebase deploy --only hosting --project STAGING_PROJECT_ID

Với Cloudflare Pages, dùng một project staging độc lập và cấp quyền deploy phù hợp cho người triển khai:

    npx wrangler pages deploy dist-hosting/cloudflare/public --project-name STAGING_PAGES_PROJECT

Chỉ chạy câu lệnh Cloudflare từ thư mục source/. Hai câu lệnh này **chưa được thực hiện**; không tạo DNS/domain mới, không sửa authDomain, databaseURL, Firebase Rules, cấu hình nguồn chính hay dữ liệu nguồn.

**Quyền truy cập và an toàn:**
- Staging HTML/JS công khai như website gốc; tuyệt đối không đóng gói rows/permissions/token vào assets.
- Firebase Database vẫn giữ rule .read có auth; không nới rule để tăng tốc.
- Các miền staging phải được rà soát chính sách Auth; luồng Google admin popup có thể cần domain được cho phép. Không sửa danh sách miền thật khi chưa quyết định.
- Nếu chưa xác minh bảo mật/nguồn dữ liệu và quyền, chỉ đo phân phối asset tĩnh, không coi là app chạy đầy đủ.

## 3. Các thước đo quyết định

| Chỉ số | Ý nghĩa |
|---|---|
| HTML responseEnd | Tài nguyên HTML xong, KHÔNG phải bảng |
| JS entry | JavaScript ứng dụng bắt đầu chạy |
| Auth signed in | Có định danh Firebase hợp lệ |
| data-first | Dữ liệu được Firebase mirror xác nhận trực tuyến; khác bản session cache |
| first-data-painted | Ứng dụng đã có bảng (có thể từ cache chỉ xem) và lên lịch vẽ |
| Timeout/tỷ lệ thành công | Mức ổn định thực tế, không được bỏ |
| Bằng chứng visual Chrome | Xác minh thực sự hiển thị hai bảng |

Phải cùng máy, mạng, vùng địa lý, profile/điều kiện cache, cùng commit/asset hash, cùng nguồn dữ liệu và ngày đo. Thử trước/sau theo cặp, đổi thứ tự A/B, tối thiểu 5 lượt/nhánh cho số đo sơ bộ; nên dùng nhiều hơn để đánh giá p95 thực chất. Giữ trạng thái foreground. Không đánh giá chỉ từ 1–2 ảnh.

**Ngưỡng rollback trước khi đề nghị chuyển host/chuyển cơ chế:**
- Lỗi dữ liệu sai nguồn, sai hàng, quyền, mất đồng bộ hoặc mất chức năng: dừng ngay.
- Thời gian mốc dữ liệu median tăng >10% hoặc p75 tăng rõ và lặp lại: từ chối biến thể, giữ bản đang chạy.
- Nếu medians chênh <10% với bộ 5 mẫu, xem là chưa phân định, cần thêm mẫu; không tự chốt host nào thắng.
- Yêu cầu dữ liệu hiển thị trong 2 giây là mục tiêu nghiên cứu, **không phải SLA đã xác nhận**.

## 4. Giải pháp sau đối chứng

1. Nếu HTML/JS là nút thắt: thử hosting/CDN và cache headers trên staging; **không** thay Firebase để chứng minh cải thiện host.
2. Nếu Auth/RTDB là nút thắt: giữ host cũ và tối ưu đường xác thực/read; không đưa dữ liệu vào public JSON.
3. Nếu profile đã cache nhưng cấu hình gốc chưa được xác nhận: chỉ hiện bố cục đã xác nhận trước đó và dữ liệu theo đúng quy tắc nguồn, khách không được sửa.
4. Kế hoạch Excel → Firebase 60 giây **chưa được xác minh chạy tự động**; phải kiểm soát riêng độ mới dữ liệu, không cho rằng tải nhanh có nghĩa dữ liệu cập nhật.

## 5. Bằng chứng và chỉ đạo tiếp theo

- Nhánh: perf/hosting-ab-browser-benchmark-20261023.
- Bộ đo: source/scripts/measure-web-startup.mjs.
- Gói staging cùng build: source/scripts/prepare-hosting-staging.mjs.
- Workflow verify-source: kiểm cú pháp và đóng gói; chạy A/B production trên GitHub runner theo dạng **informational/continue-on-error**, không coi CI PASS = nhanh hơn trên máy người dùng.
- Chưa có tài khoản staging và URL staging để đo Firebase Hosting/Cloudflare thực tế; không bịa kết quả. Khi có URL staging, trước hết đối chiếu hash sau upload, xác minh đúng dữ liệu và tài khoản, sau đó chạy bộ đo cùng điều kiện.

Quyết định vận hành cuối cùng thuộc [CURRENT_STATE](CURRENT_STATE.md), hướng dẫn test performance gốc thuộc [COLD_START_PERFORMANCE_2026-10-23](COLD_START_PERFORMANCE_2026-10-23.md) và [EXCEL_FIREBASE_AB_COMPARISON_2026-10-23](EXCEL_FIREBASE_AB_COMPARISON_2026-10-23.md).
