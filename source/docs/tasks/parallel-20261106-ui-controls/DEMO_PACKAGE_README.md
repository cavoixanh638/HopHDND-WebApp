# Họp HĐND — Demo FULL SYNTHETIC, UI controls 06/11/2026

## Phạm vi gói và SHA
- **Bản demo chính là `dist-compact-qa/compact-qa.html?full=1`**, không phải `dist/Dashboard_HĐND.html` (standalone mặc định có thể mở luồng Google Sheet).
- Source SHA phải trùng `qa-results/ui-20261106/source-sha.txt` trong artifact do CI tạo. Kiểm `asset-sha256.txt` cho từng tệp HTML/JS/CSS; `package-sha256.txt` cho tarball. Không dùng build từ branch tip khác SHA đã nghiệm thu.
- Dữ liệu giả, chỉ RAM, không có tài khoản thật; không gọi Firebase, Google Sheets, production migration. Refresh trang sẽ reset trạng thái giả (không phải lỗi save).
- Gói local khác việc deploy ChatGPT Site. **Site ID hiện có:** `appgprj_6aed474532b081919e39ba36909bf6bf`; URL: https://hophdnd-demo-20261106.charmingscone.chatgpt.site/. Cho tới khi Sites deployment + smoke public có bằng chứng, trạng thái là **DEMO_PENDING**.

## Chạy thử từ gói build đã giải nén
Mở terminal tại thư mục chứa `dist-compact-qa`, chạy:

```bash
python3 -m http.server 8080 --directory dist-compact-qa
```

Mở bằng Chrome/Edge:
- **Quản trị giả:** http://127.0.0.1:8080/compact-qa.html?full=1&preview-role=admin
- **Khách giả:** http://127.0.0.1:8080/compact-qa.html?full=1&preview-role=guest
- Fixture độc lập **mixed**: http://127.0.0.1:8080/compact-qa.html?mixed=1
- Fixture độc lập popup: http://127.0.0.1:8080/compact-qa.html?popup=1&popup-mixed=1

Nếu dùng Vite dev thay vì dist, phải mở đúng `source/compact-qa.html` với các query tương ứng. Không sử dụng `Dashboard_HĐND.html` làm bản demo chính.

## Kịch bản 1 — 4 ô nhân sự và caret
1. Vào **Danh sách** ở vai trò admin, mở phần Lãnh đạo/Phòng/Chuyên viên. Kiểm bốn picker **Lãnh đạo UBND**, **Lãnh đạo VP**, **Phòng**, **Chuyên viên** giữ kiểu trước đợt đồng nhất theo reference `ab8629c7575debd494c908c14bde9967a575a82a`.
2. Với ô được sửa: mỗi dropdown chỉ có **một tam giác đặc nhỏ 5×3 px**; thử normal, hover, Tab/focus, Enter/Arrow/Escape, click mở và chọn tên. Không có thanh caret tô nền hoặc hai mũi tên. Kiểm tên dài xuống dòng hợp lý, popup không tràn.
3. Đổi sang guest không được cấp quyền: xem chữ thuần, không có nút sửa giả/caret. Trở lại admin và thử quyền ô riêng. Phần quyền/lease/stable ID vẫn phải hoạt động.

## Kịch bản 2 — 5 độ rộng L03 độc lập
1. Trong admin, nhấn **⚙ → Tùy chỉnh cột và hiển thị**. Tìm bộ chỉnh **Tiến độ 3 khâu**, mở để thấy đúng **5 input**:
   - *Chỉ xem*: `Nhãn + cấp trình`, `Tiến độ`.
   - *Được sửa*: `Nhãn`, `Cấp trình TU`, `Tiến độ`.
2. Đặt thử `readonly: {label: 122, status: 225}`, `editable: {label: 145, level: 82, status: 279}` (đơn vị px), lưu. Đóng/mở lại tùy chỉnh trong **cùng phiên RAM**, kiểm đủ 5 số; thử chỉ thay 1 input: 4 input khác không được tự đồng bộ.
3. Về Danh sách, kiểm ba trạng thái cùng cột x và cùng chiều rộng; hàng 2/3 giữ chỗ cho cấp trình khi được sửa. Cột vật lý tính = tổng các rail + 8 px mỗi khoảng + 23 px padding/viền, và nếu có cả hai mode dùng MAX của hai tổng. Trường hợp ví dụ: readonly **378 px**, editable **545 px**.
4. Kiểm trên 1440×900, 900×900, 390×844; thử tên dài, thu gọn/mở rộng, quyền admin/guest/mixed. Từ **Báo cáo tổng hợp**, nhấp số đếm để vào popup, kiểm cùng 5 rail nhưng popup giữ độ rộng khung riêng.
5. Thử nhập số quá giới hạn: UI hiển thị lỗi trường đó và không làm hỏng 4 trường còn lại. Thử CAS/stale revision trong môi trường Emulator riêng (không thực hiện trên Site public).

## Kịch bản 3 — Vai trò admin / guest / mixed
1. Dùng ⚙ để **Đăng nhập quản trị (mô phỏng)** hoặc **Đăng xuất mô phỏng**. Không đăng nhập Google thật.
2. Admin có các công cụ quản trị. Vào **Phân quyền chỉnh sửa ô** để cấp quyền giả cho một ô (chẳng hạn `partyLevel`) của một hồ sơ, lưu quyền trong RAM.
3. Chuyển guest: chỉ các ô được cấp quyền còn sửa được, các ô khác không xuất hiện control giả. Với hàng có quyền `partyLevel` dùng L03 mode editable 3 rail; hàng còn lại readonly 2 rail. Kiểm không có quyền thừa từ ô cùng nhóm.
4. Quay lại admin thu hồi quyền và thử lại. Thay đổi demo không đi đến Firebase/Rules/Excel thật.

## Bằng chứng nghiệm thu và ranh giới
- GitHub workflow riêng: `.github/workflows/ui-20261106-controls.yml`, 3 jobs `controls-and-package`, `isolated-cas`, `real-app-emulator`. Tất cả phải SUCCESS trên **cùng source SHA cuối**.
- Script `ui-20261106-picker-browser.mjs`: 24 kịch bản hậu kiểm; script diff so ảnh và computed styles với reference/base ở 48 bộ ảnh.
- Script `ui-20261106-tracks-browser.mjs`: 6 bộ admin/guest, 3 viewports, rects + PNG. Full app Emulator QA01–QA10 gồm reload, CAS, quyền.
- Artifact `ui-20261106-controls-<run>-<sha>` chứa source SHA, SHA256, bundle, 3 nhóm ảnh/rects (`ui-20261106-picker`, `ui-20261106-tracks`, `ui-20261106-artifacts`); artifact CAS và full-app riêng.
- **Không** merge main; không deploy Firebase production Hosting/Rules/Functions/RTDB; không cập nhật Excel thật hoặc migration live.
