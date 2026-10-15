# Cấu hình dùng chung — Pages 0.7.0 và legacy Google

Pages 0.7.0 dùng duy nhất Firebase Google admin để lưu `hdnd/profile` và `hdnd/permissions`; Sheets/GViz chỉ cung cấp nội dung nghiệp vụ. Không dùng kho cấu hình Google hoặc local layout legacy làm đường ghi cấu hình chung trên Pages. [FIREBASE_PAGES](FIREBASE_PAGES.md). Phần dưới chỉ hướng dẫn luồng Google/HTML legacy 0.6.x; không áp dụng để bỏ qua quyền quản trị Pages.

## Legacy Google/HTML 0.6.x

Nguồn chuẩn về kết quả hiện hành: [CURRENT_STATE](CURRENT_STATE.md). Bằng chứng: [Kiểm thử](KIEM_THU_VA_NGHIEM_THU.md).

## Nguồn và nơi quản trị

- Excel nhập liệu giữ nguyên ID 1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp, gid 60961344. App chỉ đọc nội dung nghiệp vụ; chưa ghi Excel từ app.
- Vào **Vào chế độ tùy chỉnh danh sách** mở dữ liệu nguồn để sửa trên máy ngay; ID/STT chỉ đọc. Bộ ghi nguồn Excel chưa bật: nút **Chưa thể lưu vào Excel** bị khóa; phần sửa vẫn ở máy và chưa ghi file.
- Theo xác nhận của người dùng, Apps Script cũ dành cho ghi Excel chưa được triển khai cho ứng dụng này. Không coi mã/lời gọi đồng bộ cũ là bằng chứng rằng ghi nguồn đã hoạt động; trạng thái hiện hành xem tại [CURRENT_STATE](CURRENT_STATE.md).
- Kho native riêng: [Dashboard HĐND - Cấu hình dùng chung](https://docs.google.com/spreadsheets/d/1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM/edit), tab ẩn _HDND_APP A:H. Không nhập/sửa thủ công các ô chunk.
- [Mở trình chỉnh Google](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec). Dùng tài khoản triển khai. Kho và deployment giữ riêng theo lựa chọn người dùng ngày 14/10; HTML ở ngoài Google chưa đọc được cấu hình private qua GViz trong lượt thử.
- Tùy chỉnh cấu hình chung chỉ mở trong Google host sau khi tải cấu hình gốc thành công. File HTML private để xem có link mở trình chỉnh Google. Nếu đọc cấu hình thất bại, nút **Đọc lại danh mục và bố trí** trong thông báo đầu trang sẽ thử lại.
- Droplist trong bảng mở ngay bằng một lần bấm; ô Chuyên viên có tìm kiếm không dấu. Nội dung/Ghi chú mở popup: **Áp dụng vào bảng** chỉ giữ thay đổi trên trình duyệt; khi đóng có thay đổi dùng **Áp dụng vào bảng và đóng**. Phần sửa chưa ghi vào file nguồn; nút **Chưa thể lưu vào Excel** đang bị khóa.
- HTML cho sửa danh sách và lưu bố trí trên máy; danh mục chỉ chỉnh trên Google host. File HTML để xem có link mở trang chỉnh Google. Dùng **Lưu bố trí trên máy** ở HTML hoặc **Lưu bố trí dùng chung** trên Google host; danh mục dùng chung chỉ chỉnh trên Google host sau khi tải cấu hình gốc. Chiều rộng khung trắng ngoài bảng tự theo viewport/có thể đặt px tối đa bằng viewport; `tableWidth` là chiều rộng bảng bên trong khung, trong phần nâng cao.
- Project standalone Dashboard HĐND - Đồng bộ cấu hình, script ID 1ZVsdk-x4zw35lA1YQhvmdElZPl8oYV4zA4fHBjfIMsqImM-iGB1G1Dme. Không tạo project/kho trùng.

## Lưu và chuyển cấu hình

1. Mở Google app, kiểm số phiên bản cấu hình và thời điểm đọc nguồn. Nếu đã vào app và RPC hoạt động, không cần cấp quyền lại. Nếu Google yêu cầu quyền, chủ tài khoản tự xem/xác nhận; không gửi mật khẩu hoặc mã qua chat.
2. Trang **Danh mục và bố trí dùng chung** đọc/ghi cấu hình bố trí và danh mục với Google Sheets riêng; nội dung nghiệp vụ Excel không nằm trong kho này. Nút **Đọc danh mục và bố trí từ Google** tải cấu hình chung vào app. Nếu cần đổi chung, dùng **Lưu danh mục và bố trí vào Google**. Chỉ sau khi Google host tải cấu hình gốc thành công mới chỉnh bố trí/danh mục chung; nếu lần đọc lỗi, dùng nút **Đọc lại danh mục và bố trí** trong thông báo đầu trang. Bố trí lưu ở HTML chỉ nằm trên máy này. Phần cấu hình đang sửa tự lưu trên máy nhưng không tự áp dụng hoặc đồng bộ. Chỉnh danh sách từ nguồn Excel làm việc trên phần sửa trên máy, chưa ghi file; writer Excel chưa bật nên nút **Chưa thể lưu vào Excel** bị khóa; phần sửa trên máy chưa ghi file.
3. Để chuyển cấu hình thủ công: dùng **Xuất danh mục và bố trí** để xuất, rồi **Nhập danh mục và bố trí** ở Google host. Đối chiếu bản xem trước rồi lưu danh mục và bố trí vào kho riêng. Tệp phải khớp spreadsheet ID/gid; nhập chỉ tạo bản xem trước, không tự ghi.
4. Khi lỗi lưu cấu hình/xung đột, editor và phần cấu hình đang sửa được giữ để tiếp tục sửa hoặc thử lại; không cố ghi theo revision cũ. Nếu checkpoint được tạo từ cấu hình gốc khác, hộp thoại đưa ra nút **Giữ nháp và về xem**, **Bỏ nháp cũ** hoặc **Nạp nháp để đối chiếu**. Đây là các lựa chọn cho phần sửa trên máy; nạp chỉ mở trong editor để so sánh, chưa ghi Google. Khi về xem, checkpoint có thể vẫn được giữ trên máy để khôi phục. Trong giai đoạn thử riêng, giữ một người quản lý cấu hình để tránh tự ghi đè giữa các tab.
5. Nếu cần khởi tạo cấu hình chung, dùng nút **Tạo bản danh mục và bố trí dùng chung**. Trạng thái revision hiện tại xem tại [CURRENT_STATE](CURRENT_STATE.md).

## Cập nhật deployment

1. Chạy npm run build rồi npm run build:server. Gói ở server/dist gồm Code.gs, ConfigCore.gs, Index.html, appsscript.json; build không tự triển khai.
2. Cập nhật nguồn chuẩn vào project hiện hữu, Save to Drive, Manage deployments → Edit → New version → Deploy; giữ cùng link. USER_ACCESSING là chế độ thực thi, MYSELF là phạm vi người truy cập.
3. Giữ Only myself và kho riêng theo yêu cầu hiện tại. ANYONE đã bị duyệt tự động chặn; chỉ xem xét mở rộng khi người dùng đổi quyết định và xác định rõ phạm vi. Trạng thái revision/deployment và bằng chứng hiện hành xem tại [CURRENT_STATE](CURRENT_STATE.md).
4. Nếu cần kiểm header, prepareDashboardStore xác nhận schema; header sai thì dừng, không ghi đè. onOpen chỉ có ý nghĩa khi script được bound vào Sheet, không cần cho project standalone hiện tại.
5. Kiểm lại RPC read, lưu một phần và đọc từ tab khác; ghi kết quả vào CURRENT_STATE. Đừng coi local fake tests là cloud nghiệm thu.

## Giao thức và giới hạn

Server kiểm nguồn canonical URL/ID/gid, schema, baseRevision và operationId; ScriptLock điều phối các lượt qua app. Chunk JSON tối đa 4000 ký tự có tiền tố j: chống diễn giải công thức, tránh cắt đôi surrogate. Commit marker chỉ bật khi đã ghi đủ; reader kiểm đủ phần trước áp dụng. Ghi phần riêng giữ nguyên hai phần còn lại. Không ghi item/patch hoặc lịch sử nghiệp vụ vào kho.

Các quy tắc canonical URL/ID/gid, schema, baseRevision, operationId, chunk và commit marker mô tả giao thức của kho cấu hình chung; chúng không xác nhận bộ ghi dữ liệu Excel đã được triển khai hoặc hoạt động. Theo xác nhận của người dùng, Apps Script cũ cho ghi Excel chưa được triển khai. [Ranh giới runtime](ARCHITECTURE.md) mô tả hợp đồng kỹ thuật; trạng thái hiện hành và bằng chứng xem tại [CURRENT_STATE](CURRENT_STATE.md). Kho private và Only myself không đáp ứng người xem khác; hai tab cùng tài khoản không thay kiểm hai máy hoặc nhiều tài khoản. Nếu bổ sung mật khẩu chỉ kiểm tra trong HTML, nó chỉ khóa nút **⚙ Tùy chọn**, không cấp quyền ghi; chưa triển khai phương án mật khẩu/backend mới. Quyền app và kho vẫn private theo lựa chọn của người dùng. Thay quyền phải là bước có quyết định riêng của người dùng.

Người xem chỉ nhận một HTML; số đo hiện hành ở CURRENT_STATE. File không chứa dữ liệu nghiệp vụ thật; việc đọc cần mạng/quyền nguồn. Chưa kiểm Drive preview, tải nhiều người hoặc phục hồi sau sự cố máy. Quyền HTML, nguồn và kho cấu hình là các quyền riêng; không nhúng OAuth token/mật khẩu vào HTML.
