# Bàn giao tích hợp UI demo — 03/11/2026

**Trạng thái: INTEGRATED / VERIFIED / PRIVATE DEMO DEPLOYED.** Không merge `main`, không deploy Firebase production, không đọc/ghi dữ liệu HĐND thật.

## Mốc nguồn và triển khai

- Ba nhánh đã gộp vào `ui/20261103-coordination`: A `578b4116d3c3cb743334938dc877d3f8a3480819`, B `02c3127753d470675d0f02afebc0cd0a35b4432c`, C `2c40e38327c5edf502feb192b05d19ffd4e3c29a`. Checkpoint riêng A/B/C còn ghi TEST_PENDING vì Gemini không có môi trường chạy exact-SHA; điều phối đã kiểm chứng trên bản tích hợp. Không sửa lại phần đã PASS.
- **Code SHA đã kiểm thử:** `87b4c8bdf6f9a3025ac00e3f8e342e2345ffa43b`. [PR nháp #152](https://github.com/cavoixanh638/HopHDND-WebApp/pull/152) chỉ dùng cho kiểm thử, chưa merge.
- [Verify HopHDND source run 41601947296](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601947296): PASS đúng code SHA; typecheck, 846 unit PASS/116 skip, Firebase Emulator và Chrome browser smoke, build Pages/QA, offline HTML package. Artifact `hophdnd-compact-interactive-offline` ID `13214647026`; browser screenshot artifact ID `13215431262`.
- Workflow preview riêng [run 41601946965](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41601946965) lúc đầu lỗi khởi động Chrome CDP trên runner; rerun đúng job đã PASS. Các workflow UI/Emulator còn lại trên code SHA này PASS hoặc SKIPPED theo điều kiện workflow; không còn FAIL.
- Local exact-code run: `npm run typecheck` PASS; `npm test` 119 files PASS, 12 skipped; `npm run build:compact:qa` và `node scripts/package-compact-qa.mjs` PASS. A Chrome runner 12 tổ hợp 1440/900/390, admin/guest/popup/highlight PASS; C Chrome runner 1440/900/390/320, nhãn dài và font 150%, chuột/Enter/Space PASS. B được kiểm bằng UI demo cục bộ: admin 6 sort, guest 0 sort; sort ID cho 18 NQ trước 9 BC; tên mới và C01 ẩn vẫn áp dụng khi chuyển guest, C02/C03 còn hiện. Dữ liệu demo chỉ ở RAM.
- Gói `HopHDND_GopCot_XemThu.html` đã dựng lại từ code SHA trên, SHA-256 `AB36D7ACD6DB6B0B15FE7E4F6345B9B07FE534E1F4CE1AD62D57F527058D1E31`. Site source commit `e975c4e3906ecea525d51e73a9153e82569b46cc`; version **2**, deployment `appgdep_6ae9d11db5748191860ea08340658be4` **succeeded**, archive SHA-256 `70daad33f17bb31675f93d5452daab45740cc8daf0a3745dbe8fb2245cd5bf9c`. URL: https://hophdnd-demo-20261103.kh-ng-gian-l-8341.chatgpt.site . Site giữ quyền owner-only. Browser chưa đăng nhập được chuyển đến trang ChatGPT sign-in, đúng chính sách private; UI đã kiểm trên artifact cục bộ cùng hash.

## Nghiệm thu 11 yêu cầu UI

| Yêu cầu | Kết quả tích hợp |
|---|---|
| Tiến độ hiện tại, Ghi chú căn giữa theo chiều dọc | CSS computed geometry và Chrome A PASS ở list/popup/responsive. |
| Nội dung trình: Sở và Loại VB ở dòng sau; khi không sửa thì nhẹ | A Chrome PASS; metadata chỉ đọc là chữ nhỏ không khung, vẫn có nội dung và khả năng tìm. |
| L03 Thành ủy và cấp trình viết liền, mũi tên khi sửa | A Chrome và V6 L1 workflow PASS. |
| L03 ba trạng thái thẳng hàng khi sửa/chỉ đọc | A Chrome 12 fixture và V5 L3 workflow PASS. |
| Bỏ `HopHDND UI V3 · DEMO` | Bỏ ở preview và preview shell test PASS. |
| Admin bật/tắt C01/C02/C03 riêng | B unit/CAS và UI cục bộ PASS; C00 giữ nguyên. |
| L01 tiêu đề ID không mất chữ | A Chrome 52px ID và verify-source PASS. |
| Sort chỉ admin; L01 NQ trước BC | B unit, guest/admin UI và verify-source PASS. |
| Admin đổi tên danh sách | B lưu tên chung; điều phối đồng bộ cả tab điều hướng; UI cục bộ PASS. |
| Dấu × và chữ chip lọc cùng hàng | C Chrome hình học 7 kịch bản PASS. |
| Ba khâu tiến độ giống nhóm người phụ trách nhưng phân biệt rõ | Ba hàng Thành ủy / Xây dựng NQ / Ban hành NQ, trạng thái tô riêng; A Chrome và verify-source PASS. |

## Giới hạn

Site là bản demo dữ liệu giả, không nối Firebase/Google Sheets thật. Bài kiểm tra quyền thật, Rules, CAS và Excel chạy riêng trên Firebase Emulator trong CI. Viewer cần đăng nhập tài khoản có quyền owner để vào URL private. Việc merge hoặc triển khai Firebase production cần một tác vụ riêng.
