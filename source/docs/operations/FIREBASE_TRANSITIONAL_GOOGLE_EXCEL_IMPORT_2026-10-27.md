# Chế độ chuyển tiếp — Cập nhật Firebase từ Google Sheets hoặc Excel
**Ngày:** 27/10/2026 · **Áp dụng mã:** Firebase-only PR #72 · **Trạng thái:** triển khai trên nhánh phát triển, chưa phát hành.

## Mục tiêu và thời hạn
Trong thời gian các đơn vị vẫn nhập Google Sheets/Excel, cho phép quản trị chủ động **đọc bản nguồn mới nhất** và **đối chiếu trước khi cập nhật hồ sơ đã có trên Firebase `hdnd/items`**. Đây là luồng **nhập thủ công một chiều**, không phải đồng bộ tự động hai database hoặc dịch vụ luôn chạy. Firebase vẫn là nguồn sự thật sau khi bật `dataSource='primary'`. Google Sheets tiếp tục là kênh nhập tạm trong giai đoạn giao thời theo quyết định mới của chủ dự án; sau khi ổn định mới đóng luồng này.

## Quy trình người quản trị
1. Đăng nhập tài khoản quản trị Google đã xác minh; Firebase kết nối, chế độ chốt `OPEN`, hồ sơ đọc từ `hdnd/items`. Mở **Tài khoản và quản trị → Nhập/Xuất Excel → Cập nhật dữ liệu chuyển tiếp vào Firebase**.
2. Chọn **Google Sheets** (đường dẫn/bảng tính với quyền đọc GViz) hoặc **Excel .xlsx** (bản xuất WebApp có schema, hoặc bản Excel nghiệp vụ A–O từ Google Sheets, worksheet đầu tiên). Trình duyệt đọc dữ liệu; **chưa gửi gì lên Firebase**.
3. Kiểm tra tổng số mã khớp, mã mới/chưa có trên Firebase, hồ sơ khác nhau, cảnh báo dữ liệu và các ô trống không được dùng để ghi đè. Từng thay đổi có thể mở để so sánh **giá trị Firebase** với **giá trị nguồn**.
4. Chọn từ 1 đến 20 hồ sơ thực sự cần nhập, gõ đúng **`CAP NHAT FIREBASE`**. Bản xem trước quá 10 phút phải đọc lại, không chấp nhận xác nhận cũ.
5. Với từng hồ sơ, ứng dụng đọc lại dữ liệu Firebase, kiểm `recordId`, `displayCode`, `revision` và giá trị cũ khớp bản xem trước, chiếm **khóa từng ô có thay đổi**, sử dụng đúng `FirebaseRepository.save` (server CAS + audit + Firebase Security Rules), sau khi server xác nhận mới đọc lại hồ sơ để đối chiếu toàn bộ giá trị được cập nhật. Mỗi lượt nhập không phải transaction toàn cục: nếu một hồ sơ lỗi, dừng ngay và báo **số hồ sơ đã được server xác nhận trước đó**, không tự thử lại hay rollback dữ liệu đã hợp lệ. Quản trị cần nạp lại bản mới và đối chiếu phần còn lại.
6. Theo dõi kết quả, làm một bản sao lưu đọc-only tại thời điểm nghiệp vụ phù hợp. Sau khi ổn định hoàn toàn, ngừng sử dụng Sheets; không lập lịch tự sync.

## Quy tắc bảo toàn dữ liệu
- Chỉ quản trị được dùng; không mở với người xem hoặc nhân viên thường. Nếu `dataSource` chưa chuyển `primary` thì chưa được ghi lên `hdnd/items`, tránh nhập vào backend chưa nghiệm thu.
- So khớp bằng **mã hiển thị `displayCode` duy nhất** ở cả hai bên, không ghép bằng số dòng hoặc `recordId` tạm sinh từ Google Sheets. Có mã trùng/thiếu mã hoặc định dạng sai: **dừng đối chiếu**.
- Chỉ nhập **13 trường văn bản nghiệp vụ** đã tồn tại trong WebApp; không thay đổi ID, STT, `documentKind`, `isDropped`, `archivedAt`, revision, lịch sử, quyền, khóa, trạng thái freeze, cấu hình, hoặc tạo/xóa hồ sơ. **Ô trống trong nguồn không tự xóa giá trị Firebase**. Các hồ sơ có mã mới được liệt kê riêng để xử lý trong quy trình bổ sung hồ sơ có duyệt, chưa auto-create.
- **Không bao giờ dùng** `database:set /`, `database:remove`, `update(hdnd/items)` hoặc ghi đè bộ sưu tập để cập nhật chuyển tiếp. Nếu có nháp chưa lưu, lỗi Firebase, FROZEN/DRAINING, mất quyền hoặc trạng thái xung đột thì không ghi.
- Google Sheets chỉ **đọc**; file Excel chỉ được mở trong trình duyệt, không tải lên server bên thứ ba. Không đồng bộ Supabase, không đổi nguồn dùng chung.
- Release gate PR #71/#72 vẫn NO-GO: mã nguồn test/staging không thay thế nghiệm thu Rules hiện hành, quyền tài khoản, chốt/sao lưu, readback thực và GO của chủ dự án. **Không tự merge/deploy lên Pages/production**.

## Mã và kiểm tra
- `src/data/transition-import.ts`: đọc Excel nghiệp vụ A–O hoặc bản mẫu WebApp, diff bảo toàn cột nguồn, chặn trùng/mã không khớp.
- `src/features/settings/TransitionImportPanel.tsx`: chọn Sheets/Excel, xem trước từng trường, chọn hồ sơ và xác nhận rõ ràng.
- `src/app/App.tsx`: điều kiện admin+primary+OPEN, khóa ô, CAS, audit và readback trước/sau.
- `src/features/settings/ExcelTransferPanel.tsx`: gắn UI chuyển tiếp vào màn hình đã có; giữ nguyên luồng thêm hồ sơ Excel cũ **đang khóa**.
- `tests/transition-import.test.ts`: giữ nguyên Firebase khi preview, tránh ghép sai mã, kiểm stale, ô trống và tệp Excel.
- Cần nghiệm thu thêm file Excel A–O thực tế (đã ẩn thông tin nhạy cảm), 2 tài khoản Firebase staging, 1 hồ sơ bị edit đồng thời và 1 batch dừng giữa chừng.

## Hướng phát triển tiếp
Khi cần thêm hồ sơ mới, đổi mã hồ sơ hoặc chọn xóa giá trị cũ, phải thiết kế quy trình riêng có lịch sử, rollback và Rules mới; không cho phép đi đường tắt trong tính năng cập nhật chuyển tiếp.
