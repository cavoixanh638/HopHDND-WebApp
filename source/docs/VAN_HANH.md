# Vận hành HopHDND — triển khai, sao lưu, phục hồi và xử lý sự cố

**Phạm vi:** bản GitHub Pages 0.7.0 đọc dữ liệu qua Google Sheets/GViz, Firebase Authentication và cấu hình dùng chung qua Realtime Database. App Google Apps Script 0.6.2 là nhánh vận hành độc lập. Tài liệu này là **quy trình tham chiếu**, không phải xác nhận các phép kiểm sản xuất đã thành công. Trạng thái thực tế duy nhất xem [CURRENT_STATE](CURRENT_STATE.md).

## 1. Phân biệt những thao tác dễ nhầm

| Thao tác | Tác động | Không tác động |
|---|---|---|
| Build / phát hành WebApp | Mã và giao diện đang phục vụ ở GitHub Pages | Không tự thay nội dung Google Sheets hoặc Firebase |
| Quay lại bản phần mềm | Khôi phục file HTML/bản phát hành trước | Không tự khôi phục dữ liệu hay cấu hình đã thay đổi |
| Sao lưu / khôi phục dữ liệu | Snapshot và phục hồi dữ liệu/cấu hình từ nguồn đã kiểm | Không tự quay lại mã nguồn |
| Đọc lại Sheets | Tải lại dữ liệu nghiệp vụ bằng GViz | Không ghi ngược dữ liệu hay phục hồi nháp |
| Lưu cấu hình | Ghi `hdnd/profile` hoặc `hdnd/permissions` sau xác thực/quyền | Không ghi vào `hdnd/items` hay nguồn Excel |

Không dùng các thuật ngữ trên thay thế nhau. Trước thao tác có khả năng ghi, xác định **môi trường, phạm vi, người phê duyệt, bản sao và cách quay lại**.

## 2. Nơi chứa mã và môi trường

- GitHub: [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp). Thư mục `source/` chứa mã nguồn; `index.html` ở gốc repository là bản đã build phục vụ [GitHub Pages](https://cavoixanh638.github.io/HopHDND-WebApp/).
- Dự án local tương ứng: `D:\Google Drive\VP UBND\HĐND\Dashboard trình HĐND code`. GitHub chỉ là bản nhập mã tại một thời điểm, **không tự đồng bộ hai chiều với thư mục Windows/Drive**.
- Nguồn nghiệp vụ hiện hành: tệp Excel trên Google Drive qua URL Google Sheets và `gid=60961344`; xem [từ điển dữ liệu](TU_DIEN_DU_LIEU.md). Dữ liệu nghiệp vụ không được nhập sang Firebase ở giai đoạn hiện tại.
- Firebase: project `hophdnd-8b7b2`, các nhánh cấu hình `hdnd/profile`, `hdnd/permissions`. Không được mặc định coi Rules trong GitHub là Rules đang áp dụng trên server.
- App Google Apps Script (legacy) không chia sẻ quy trình triển khai với GitHub Pages. Hướng dẫn kỹ thuật riêng: [FIREBASE_PAGES](FIREBASE_PAGES.md), [DONG_BO_CAU_HINH](DONG_BO_CAU_HINH.md).

## 3. Chuẩn bị và kiểm thử trước phát hành

Thao tác tại **gốc mã nguồn** (trên GitHub là `source/`; trên Windows là thư mục dự án, không chạy ở thư mục chứa HTML phát hành):

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

`test:firebase` cần Firebase emulator và điều kiện thực thi phù hợp; không coi lỗi môi trường là test đã đạt. Thử nghiệm emulator không thay thế xác minh Auth/Rules thật. Chỉ build được một `dist-pages/index.html` chưa chứng minh môi trường Pages tải thành công.

Trước phát hành cần kiểm:
1. Git sạch/commit nguồn cụ thể; danh sách file thay đổi, kiểm không có bí mật, token, `node_modules`, log hoặc dữ liệu không được phép công khai.
2. Sao lưu file HTML đang phục vụ và ghi lại commit SHA cũ để quay lại được; không dùng bản mới khi chưa ghi nhận đường quay lại.
3. Ở **bản test**, đối chiếu số dòng/nguồn URL/gid, bộ lọc, KPI, xuất Excel, nháp không ghi nguồn, chế độ quản trị, quyền cấu hình.
4. Kiểm Firebase Rules đúng bản và quyền Google admin/anonymous qua môi trường thử; **không tự deploy Rules production** chỉ vì build HTML.
5. Người dùng/người chịu trách nhiệm duyệt thay đổi trước khi công bố.

## 4. Phát hành GitHub Pages và kiểm sau phát hành

1. Build từ mã nguồn `source/`, lấy đúng `dist-pages/index.html`. Copy **nội dung file build** vào `index.html` ở gốc repository; không ghi đè `source/index.html` (đầu vào Vite).
2. Commit có thông tin phiên bản, mã nguồn tương ứng và cách quay lại. Push `main` chỉ sau khi đã duyệt; Pages được cấu hình phục vụ từ gốc repository.
3. Mở URL Pages, tải mới không dùng cache, xác nhận đúng phiên bản/artifact. Kiểm **số dòng thực tế** và chức năng với tài khoản khách lẫn quản trị.
4. Lưu bằng chứng nghiệm thu vào [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md), cập nhật kết quả trong [CURRENT_STATE](CURRENT_STATE.md). Nếu trang lỗi, không gọi triển khai thành công chỉ vì commit thành công.

**Đã có CI/CD từ 16/10/2026:** `.github/workflows/verify-source.yml` kiểm thử trên Pull Request, `.github/workflows/publish-pages.yml` tự cài phụ thuộc, kiểm TypeScript, unit tests, Firebase emulator, docs, build Pages từ `source/` khi push `main`; chỉ khi đạt mới ghi `index.html` ở gốc và phát hành qua GitHub Pages. Không sửa HTML minified thủ công nữa. Việc tự build này **không tự đồng bộ** thư mục Windows/Google Drive, không deploy Firebase Rules hay thay dữ liệu Sheets. [Kết quả kiểm thực tế](CURRENT_STATE.md).

## 5. Quay lại phiên bản phần mềm (rollback code)

Khi bản mới bị lỗi, tìm commit đã phát hành ổn định, xác nhận nó chứa `index.html` đúng và tạo **commit phục hồi file đó** trên `main` (không force-push hay xóa lịch sử). Đợi Pages cập nhật rồi chạy kiểm tra tối thiểu. Nếu đã thay Firebase Rules/schema cùng lúc, không chỉ phục hồi HTML: đối chiếu độ tương thích và dùng quy trình thay đổi Rules riêng. Không tự ý khôi phục cấu hình/dữ liệu từ backup chỉ để xử lý lỗi giao diện.

## 6. Sao lưu và khôi phục dữ liệu / cấu hình

**Ba phạm vi khác nhau, phải sao lưu độc lập:**

| Phạm vi | Nguồn chuẩn và việc cần bảo vệ |
|---|---|
| Nội dung nghiệp vụ | Tệp Excel nguồn trên Drive; ưu tiên lịch sử phiên bản/bản sao của chính tệp, không xem file xuất từ WebApp là backup đầy đủ |
| Cấu hình chung và quyền | `hdnd/profile` và `hdnd/permissions` ở Firebase RTDB; bảo toàn cả revision, cấu trúc, quyền ô/dòng/cột |
| Bộ mã và Rules | Commit GitHub của HTML/source và `source/firebase/database.rules.json`; Rules **đang chạy** phải kiểm độc lập trước thay |

Quy trình an toàn: xác định phạm vi → lấy snapshot có thời điểm và checksum/phương án đối chiếu → thử khôi phục **trên bản sao hoặc emulator** → đối chiếu số dòng, cấu hình và quyền → xin duyệt → chỉ khi cần mới khôi phục production → kiểm đọc lại. Không xóa hay ghi đè kho dữ liệu thật để “thử”. Không lưu file backup chứa dữ liệu cá nhân, token hay cấu hình nhạy cảm vào public GitHub.

**Lưu ý:** Git rollback không tự phục hồi nội dung Firebase; phiên bản Firebase không được bảo đảm có bản backup tự động. Phải kiểm tra chính sách backup và quyền truy cập thực tế trước khi cam kết khả năng phục hồi.

## 7. Chẩn đoán sự cố

| Triệu chứng | Kiểm tra theo thứ tự | Giới hạn / hành động an toàn |
|---|---|---|
| GitHub Pages hiển thị **0 dòng** | Xem URL/gid đang chọn, `localStorage` khóa `hdnd.sheet-config.v1`, phản hồi GViz A:P, quyền truy cập từ trình duyệt, lỗi console/network | Bản local từng đọc 51 dòng **không chứng minh** Pages cũng đọc được; không nhập sang Firebase để che lỗi |
| Không vào được tùy chỉnh danh sách | Kiểm Firebase Auth Google admin, trạng thái load cấu hình và điều kiện disable ở UI | Đã có phản ánh nút bị khóa khi 0 dòng; **chưa xác nhận đã sửa** |
| Không sửa được quyền ô/cột/dòng | Kiểm Auth `google.com`, email verified, `hdnd/permissions`, Rules production, baseline/revision | Không cấp quyền bằng cách mở Rules công khai |
| Sửa nháp nhưng dữ liệu nguồn không đổi | Đây là thiết kế hiện tại của Pages | Nháp trình duyệt không ghi Sheets/Firebase; cần phân biệt thao tác `Áp dụng` và `Lưu cấu hình` |
| Bản mới không xuất hiện | Kiểm commit `main`, file HTML gốc, trạng thái Pages, cache trình duyệt | Không sửa mã TypeScript bằng cách vá HTML đã nén |
| Lỗi/xung đột lưu cấu hình | Kiểm dữ liệu gốc/revision, kết nối, tài khoản, Rules; giữ nháp và đọc lại baseline | Không bỏ kiểm tra revision, không ghi lại liên tục khi chưa rõ trạng thái |

Khi chưa xác định nguyên nhân, chỉ thu thập bằng chứng không ghi dữ liệu; không nới quyền `anyone/write` để chữa lỗi.

## 8. Ranh giới tài liệu

- [CAI_DAT_VA_CHAY](CAI_DAT_VA_CHAY.md): cách chạy lệnh local và build; **tài liệu này** là quy trình phát hành/rollback/sao lưu/ứng cứu chuẩn.
- [FIREBASE_PAGES](FIREBASE_PAGES.md): schema Firebase, mô hình Auth và Rules; **tài liệu này** không lặp toàn bộ Rules.
- [SYSTEM](SYSTEM.md), [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md): bất biến nghiệp vụ và ánh xạ trường; không mô tả lại trong xử lý sự cố.
- [CURRENT_STATE](CURRENT_STATE.md): kết quả đang xác nhận và các tồn tại; [WORKBOARD](WORKBOARD.md): người phụ trách và tiến độ; [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md): bằng chứng thử cụ thể.

Không tự coi hướng dẫn này là giấy phép triển khai production, thay Rules hoặc phục hồi dữ liệu thực.
