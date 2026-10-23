# HopHDND — tăng tốc mở trang lần đầu, kể cả chưa có cache

Cập nhật 23/10/2026. PR #32: `perf/cold-boot-code-splitting-20261023`.

## Vấn đề và mốc trước

Bản public Pages dùng file `index.html` nhúng cả JS/CSS, nén gzip **336.691 byte** (log GitHub CI trước thay đổi). JavaScript khởi chạy ở ~741–746ms trên máy người dùng qua hai phép đo tab thường/ẩn danh trước đó. Thời gian Firebase Auth có thể lên tới 1.383ms đăng nhập khách mới; RTDB snapshot 55 dòng tốn 106–390ms sau khi mở listener. Những mốc này **khác môi trường**, không đại diện một phân phối trung bình và không được cộng như các bước tuần tự.

## Giải pháp đã kiểm thử

1. Public GitHub Pages là **tập HTML + JS/CSS chunks có hash nội dung**. Chuyển `pages` từ Vite `codeSplitting:false` sang code-split, `source/scripts/prepare-pages.mjs` tạo `dist-pages/index.html` và kiểm tra tham chiếu relative path. Workflow `.github/workflows/publish-pages.yml` publish `index.html` và `assets/*` cùng một commit, xóa assets cũ. Không thay Firebase Rules.
2. `source/src/pages-main.tsx` chuyển admin `ExcelTransferPanel` sang `React.lazy`: module `xlsx` **không tải khi người xem mở báo cáo/danh sách lần đầu**; chỉ tải khi admin chọn Excel · Trích xuất.
3. Sáu Google Fonts không còn CSS `@import` luôn luôn; `loadSelectedWebFont` chỉ yêu cầu font Google khi admin thực sự chọn font đó. Segoe UI/system không cần tải font từ ngoài.
4. Chế độ offline vẫn dùng **`npm run build` → `dist/Dashboard_HĐND.html` một file HTML**; CI kiểm chứng đầu ra đúng một file.
5. Chrome smoke `source/scripts/smoke-pages-browser.mjs` phục vụ đúng assets riêng và kiểm thử giao diện khách, tương tác, dữ liệu mô phỏng, không gọi dữ liệu Firebase production. Bổ sung log cold shell/render trên Chrome profile sạch.

## Kết quả đo từ chính CI

| Chỉ số | Trước (bản inline) | Sau (split) |
| --- | ---: | ---: |
| JS+CSS+HTML tải lúc cold open, gzip | 336.691 bytes | 176.701 bytes |
| Giảm | — | **159.990 bytes = 47,52%** |
| JS Excel quản trị (lazy), gzip | phải tải cùng HTML | khoảng **160.945 bytes**, chỉ tải khi mở công cụ |
| HTML offline độc lập | có | có; CI xây một file duy nhất |

Chỉ số trên được tính từ **sản phẩm build**, cùng gzip Node; không giả định Chrome network/CPU của người dùng sẽ giảm thời gian theo đúng tỷ lệ. GitHub Pages HTML cũ chứa JS khởi động + cả XLSX. Số liệu sau: `PAGES_COLD_PAYLOAD` trong CI PR #32.

## Nghiệm thu và hạn chế

- Test TypeScript/unit, Firebase emulator, chrome smoke, kiểm tra cấu hình nguồn + quyền admin, build offline.
- Test import admin Excel riêng: mở công cụ mới tải chunk `ExcelTransferPanel-*.js`; danh sách và báo cáo không yêu cầu chunk này.
- Sau khi publish, đo bằng tab ẩn danh mới qua `?startupMetrics=1`: 3 lần, ghi `js-entry`, `auth-start-anonymous`, `auth-signed-in`, `data-first`, `first-data-painted`. Nếu không mở admin, Network tab không có chunk Excel.
- Xác thực RTDB vẫn bắt buộc (`hdnd/.read` yêu cầu `auth != null`). Không bỏ Auth hoặc đưa 55 dòng nghiệp vụ vào public HTML để tạo cảm giác nhanh. Tối ưu mã chỉ làm **Auth được bắt đầu sớm hơn**, không làm biến mất thời gian Auth network. Nếu cần giảm thêm login lần đầu, phải tách chi phí DNS/network của Identity Toolkit bằng Chrome DevTools và đánh giá kiến trúc backend, không nới quyền dữ liệu.
- Không nhầm cache RTDB 15 phút với đồng bộ nguồn Excel: mirror 55 dòng đã import vẫn chưa có lịch tự copy Excel → Firebase.
