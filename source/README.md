## Chỉ đạo phạm vi 25/10/2026 — WebApp/Firebase là hệ thống duy nhất sau cutover
Tài liệu có hiệu lực: [Firebase-only](docs/decisions/FIREBASE_ONLY_POST_CUTOVER_2026-10-25.md). Nhân viên đang dùng file Sheet chỉ là **giai đoạn chuyển tiếp trong khi WebApp chưa hoàn thiện**. Sau cutover, tất cả xem/sửa/nhập và báo cáo **duy nhất qua WebApp**, `hdnd/items` là nguồn dữ liệu chính, không dùng đồng bộ Sheets lâu dài. Chỉ nhập dữ liệu khởi tạo **một lần khi phát hành**; các cảnh báo mirror 55/57 trước đây không phải blocker coding. PR #71/#72 đang Draft, production chưa kích hoạt.

---

## 25/10/2026 — Hướng phát triển Firebase nguồn chính (CHƯA PHÁT HÀNH)
User đã chốt bỏ phụ thuộc Excel/Google Sheets sau thời kỳ nhập ban đầu. PR [#71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) (Firebase `hdnd/items` là nguồn nghiệp vụ chính) và [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) (khóa ô per-user/tab, lưu ACK, DRAINING/FROZEN) đang **Draft**. **Main/Pages hiện hành chưa lưu sửa realtime vào Firebase chính**; không suy từ badge “Database” rằng ghi đã được bật. Triển khai Firebase production bắt buộc sao lưu và đối chiếu Rules hiện hành, import một lần, nghiệm thu nhiều tài khoản và rollback. Xem [cổng phát hành và điều kiện NO-GO](docs/operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md).

---

# Dashboard tổng hợp nội dung trình HĐND — dự án viết lại

Ngày lập kế hoạch: **13/10/2026**. Theo dõi tình trạng thực tế tại [CURRENT_STATE.md](docs/CURRENT_STATE.md).

Mục tiêu là xây dựng webapp quản lý danh mục, phân công và tiến độ các nội dung trình HĐND, có báo cáo tổng hợp chính xác, thao tác gọn và mã nguồn dễ bảo trì. Dự án mới kế thừa nghiệp vụ tốt của app cũ; các cơ chế lưu, đồng bộ, tính toán và tổ chức mã được thiết kế lại.

## Bản GitHub Pages

**Mốc phát hành 19/10/2026:** các sửa lỗi resize cột Danh sách + 5 báo cáo, sort trên header, modal xem số lượng và cột “Không phải trình” đang ở **PR #3**, đã build CI PASS và phát hành **preview** tại [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/) / [preview ngày 19/10](https://cavoixanh638.github.io/HopHDND-WebApp/preview/ux-fixes-2026-10-19/); **chưa merge vào `main`, file `index.html` gốc chưa thay**. Xem [kiểm toán tình trạng](docs/CURRENT_STATE.md) và [điều kiện nghiệm thu](docs/KIEM_THU_VA_NGHIEM_THU.md).


Pages 0.7.0 đọc nội dung trực tiếp từ Google Sheets **A–O hiện hành**; Firebase chỉ Auth/quyền/cấu hình chung. Sửa ô hiện là nháp thử trên browser; chưa chuyển dữ liệu hoặc bật ghi nghiệp vụ Firebase. Tạo HTML tự chứa cho GitHub Pages bằng `npm run build:pages`; đầu ra là `dist-pages/index.html`. Xem [hướng dẫn Firebase Pages](docs/FIREBASE_PAGES.md) để biết thiết lập Auth, domain, quy tắc database và các giới hạn dữ liệu. Build này không tự phát hành hoặc thay đổi Firebase production.

## Bản main hiện tại

Bản main **0.6.2**, deployment `/exec` v6, đã được cập nhật ngày 15/10/2026. Mở [ứng dụng trên Google](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec), vào **⚙ Tùy chỉnh danh sách**, sửa ô rồi chọn **Lưu dữ liệu vào Excel**. App chỉ báo đã lưu khi server đọc lại file và xác nhận giá trị. Kiểm tra kết nối trước deploy lúc11:30:08 cho thấy backendReady, 51 dòng, 0 cảnh báo và config revision12; UI tải mới lúc11:34 hiện đúng tài khoản/nguồn, cho phép sửa. Phép nghiệm thu này chưa gửi sửa vào nguồn chính; lần ghi/readback đã đạt trên bản sao riêng.

File HTML độc lập vẫn chỉ giữ phần sửa trên browser và không ghi Excel. Nháp trong HTML không tự chuyển sang app Google; hãy đối chiếu hoặc nhập lại sau khi mở app Google. Bố trí HTML lưu cục bộ; [kho cấu hình](https://docs.google.com/spreadsheets/d/1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM/edit) riêng. Giao diện main đã kiểm tra kết nối, nhưng chưa ghi nguồn thật; không suy kết quả save/readback trên bản sao thành ghi thành công dữ liệu chính.

Bản mới chưa thay thế đủ F01–F36; F31 chưa hoàn tất. Đề xuất Google Sheets-native hai chiều và lựa chọn hosting đang được đánh giá, chưa duyệt triển khai; main v6 tiếp tục dùng nguồn Excel hiện tại. [CURRENT_STATE](docs/CURRENT_STATE.md), [kiến trúc](docs/ARCHITECTURE.md) và [kế hoạch 1.18](docs/KE_HOACH_VIET_LAI.md) ghi rõ phần đã kiểm và còn dở, gồm nghiệm thu ghi nguồn chính, backup/lịch sử/báo cáo nâng cao. Apps Script cũ không chứng minh đã ghi được file nguồn.

Đọc [hướng dẫn sử dụng](docs/HUONG_DAN_SU_DUNG.md) hoặc [cài đặt và chạy](docs/CAI_DAT_VA_CHAY.md). Lệnh chính: `npm ci`, `npm run dev`, `npm test`, `npm run build`, `npm run docs:check`. Bản thử dùng Preact compat; `npm run build:react` để so sánh. Kết quả/giới hạn ở [báo cáo kiểm tra](docs/KIEM_THU_VA_NGHIEM_THU.md).

## Đọc tài liệu nào?

Hai nguồn chuẩn vừa thống nhất: [Vận hành — triển khai, rollback, sao lưu, khôi phục, xử lý sự cố](docs/VAN_HANH.md) và [Từ điển dữ liệu — cột A–O hiện hành, ID, quyền](docs/TU_DIEN_DU_LIEU.md). [Chỉ mục docs](docs/README.md) phân chia trách nhiệm để tránh trùng lặp. Trên GitHub, **dự án nằm ở thư mục `source/`**, còn `index.html` ở **gốc repository** là file phát hành Pages, không phải file nguồn để sửa trực tiếp.



| Nhu cầu | Tài liệu |
|---|---|
| Xem chỉ mục tài liệu và nơi chứa từng loại thông tin | [Chỉ mục tài liệu](docs/README.md) |
| Biết đã làm gì, đã kiểm tra gì và còn thiếu gì | [Trạng thái hiện tại](docs/CURRENT_STATE.md) |
| Hiểu mục tiêu, các quyết định và thứ tự triển khai | [Kế hoạch viết lại](docs/KE_HOACH_VIET_LAI.md) |
| Kiểm tra có giữ đủ chức năng hay không | [FEATURES](docs/FEATURES.md) |
| Hiểu nghiệp vụ và bất biến | [SYSTEM](docs/SYSTEM.md) |
| Hiểu cấu trúc hệ thống, dữ liệu, lưu và đồng bộ | [ARCHITECTURE](docs/ARCHITECTURE.md) |
| Tìm nơi sửa mã nguồn | [REPO_MAP](docs/REPO_MAP.md) |
| Biết bộ tài liệu cần bàn giao và cách tra cứu, sửa chữa | [Tài liệu và bàn giao](docs/TAI_LIEU_VA_BAN_GIAO.md) |

## Phạm vi và nguồn khảo sát

- Mã nguồn khảo sát: `D:\Google Drive\VP UBND\HĐND\Dashboard Báo cáo tổng hợp`.
- Nguồn chính: `Báo cáo tiến độ HĐND.html`, `GoogleAppsScript_DongBo.js`.
- Nguồn đối chiếu: `Code_Dong_Bo.js`, `Huong_Dan_Cai_Dat.md`, bản HTML `.bak`; `xlsx.full.min.js` là thư viện phụ thuộc.
- Thư mục dự án mới: `D:\Google Drive\VP UBND\HĐND\Dashboard trình HĐND code`.
- Khảo sát bản cũ dựa trên mã nguồn. Mốc 0.2.0 đã thử đọc nguồn Sheets được người dùng chỉ định; chưa đo tải nhiều người, kiểm tra OAuth nguồn riêng tư hoặc bản triển khai trực tuyến.

File nguồn đã có được liệt kê trong REPO_MAP; các phần tương lai vẫn là dự kiến. Hướng dẫn và kết quả cập nhật từng mốc, không coi prototype là hệ thống đầy đủ.

Quy hoạch các tài liệu `AGENTS`, `SYSTEM`, `ARCHITECTURE`, `REPO_MAP`, `FEATURES` và cách gộp các phần tương đương được mô tả trong [Tài liệu và bàn giao](docs/TAI_LIEU_VA_BAN_GIAO.md). Mỗi loại thông tin có một nguồn chuẩn; các tài liệu khác dẫn chiếu.

## Kết quả phải bàn giao

1. Webapp mới đủ chức năng theo ma trận, đã kiểm thử trên dữ liệu thử và đối chiếu nghiệp vụ.
2. Mã nguồn chia theo tính năng, có quy trình chạy, kiểm tra, đóng gói và phát hành rõ ràng.
3. Bộ tài liệu tiếng Việt cho người sử dụng, quản trị viên và người bảo trì.
4. Công cụ chuyển dữ liệu, cấu hình và lịch sử cũ; báo cáo đối chiếu; phương án quay lại khi chuyển đổi.
5. Thông tin phiên bản, thay đổi, giới hạn và các quyết định thiết kế được lưu cùng dự án.

