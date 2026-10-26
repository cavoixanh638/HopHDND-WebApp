**Bản xem thử UI (không có dữ liệu thật):** Trong PR #72, chạy `npm run build:compact:qa` dưới thư mục `source` để tạo trang kiểm thử `dist-compact-qa/compact-qa.html` (phục vụ qua HTTP server local); QA sử dụng `ItemList` thật với dữ liệu giả, tùy chọn bật sẵn cả 4 nhóm. Truy cập `?edit=1` để thử sửa *nội bộ trên trình duyệt* theo từng trường con, không ghi database. GitHub Actions [source #40379091513](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40380075664) có artifact `hophdnd-browser-smoke-preview` chứa ảnh 1600px và 390px. Đây là **hướng dẫn thử cho người phát triển**, không phát hành bằng đường dẫn QA hoặc dùng thay ứng dụng HopHDND chính.

## Gộp cột — chọn cách hiển thị gọn (27/10/2026, bản đang phát triển)

Trong **Danh sách các ND trình HĐND** ở chế độ xem, quản trị viên mở **Gộp cột**. Bật các tùy chọn phù hợp:
- **Loại VB + Sở → Nội dung**: nội dung, loại văn bản, sở chủ trì cùng một ô.
- **Cấp + Tiến độ Thành ủy**: hai thông tin xin ý kiến Thành ủy trong một ô.
- **Xây dựng + Ban hành HĐND**: hai bước tiến độ trình HĐND trong một ô.
- **UBND + VP + Phòng + CV**: bốn thông tin người phụ trách trong một ô có nhãn ngắn.

Các kiểu gộp nhỏ đã có nằm trong **Các cách gộp khác** (bấm để mở); hai tùy chọn viết tắt tên nằm trong **Viết tắt tên**. Các kiểu gộp nhỏ đã có vẫn giữ để lựa chọn khi không cần gộp tất cả. Bật gộp lớn sẽ tự tắt các kiểu gộp con trùng trường; tắt gộp lớn trả lại các cột gốc (nếu cột đó vẫn được thiết lập hiện). Có thể chọn **Viết tắt tên lãnh đạo/chuyên viên** riêng để tiết kiệm chiều ngang. Nhập tên đầy đủ vào ô tìm kiếm vẫn tra được người đó. Khi được phép sửa, bấm đúng dòng/trường bên trong ô gộp; không sửa lẫn tên Sở, cấp hay tiến độ khác. Thao tác gộp không thay dữ liệu nghiệp vụ; chỉ có hiệu lực trên WebApp khi admin lưu được bố cục vào Firebase.

---

## Hướng dẫn dự kiến: khóa ô và chốt dữ liệu trên Firebase (25/10/2026, CHƯA MỞ)
**Người sửa:** tại chế độ `Database chính` đã kích hoạt, bấm ô hoặc mở danh sách để xin quyền giữ ô. Khi người khác đang sửa sẽ thấy trạng thái khóa, không cố sửa bằng tab mới. Với dropdown, chỉ lựa chọn thực sự mới tạo thay đổi; Esc/đóng chưa chọn thì bỏ. Với Ghi chú/Tiến độ hiện tại, nhập văn bản rồi rời ô hoặc Ctrl+Enter; ứng dụng chỉ coi đã lưu sau khi Firebase xác nhận. Nếu có cảnh báo mất mạng, hết hạn hoặc chốt dữ liệu, **không đóng trang Ẩn danh** khi chưa sao chép/khôi phục nháp.
**Admin:** chọn “Tạm dừng sửa của khách” để chỉ cho khách xem trong khi admin tiếp tục làm việc; chọn “Yêu cầu lưu rồi chốt” để ngừng nhận lượt sửa mới, đợi phiên đang sửa lưu có xác nhận, sau đó chuyển FROZEN. “Đóng băng ngay” dùng khi cần chốt gấp; bản nháp chưa ACK không tính vào mốc. Phải thấy trạng thái **Đã đóng băng** và biên nhận số dòng/hash mới coi là chốt. Nếu đóng tab trong khi DRAINING, đăng nhập lại để kiểm tra và hoàn tất — chưa có tự chốt máy chủ khi không có tab admin.
**Khi mở lại:** không tự phát tán bản nháp cũ; người dùng xem giá trị mới nhất, đối chiếu rồi mới xác nhận lại. Những thao tác này **chưa có trên trang production**, vui lòng tiếp tục sử dụng hướng dẫn hiện hành bên dưới cho đến khi nghiệm thu. [Điều kiện phát hành](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md).

---

## Điều chỉnh độ rộng và lịch sử Ghi chú/Tiến độ hiện tại (23/10/2026)

- Cột **ID** mặc định chỉ 68px. Khi admin kéo rộng một cột, hệ thống **thu nhỏ đúng phần tăng tương ứng ở cột cuối cùng đang hiển thị**; khi thu hẹp một cột, phần giảm được **cộng vào cột cuối**. Các cột ở giữa giữ nguyên. Vì cột cuối làm nơi bù, không chỉnh trực tiếp mép ngoài của cột cuối. Khi một trong hai cột đạt giới hạn 60–1600px, phần kéo dừng; nếu bảng rộng hơn màn hình vẫn có thanh cuộn ngang.
- Bật **Gộp Lãnh đạo UBND và VP** sẽ thấy tiêu đề **Lãnh đạo UBND / VP**, dòng UBND ở trên và VP ở dưới; chức vụ giữ nguyên. Khi gộp Phòng/CV và lãnh đạo không bị tự cộng thêm độ rộng. Loại văn bản gộp ở cuối Nội dung trình sẽ hiện liền **(HC)** hoặc **(QPPL)**, không có biểu tượng lịch sử xen vào.
- Cột **Tiến độ hiện tại** tương ứng cột **N của Excel gốc**, dạng văn bản tự do như Ghi chú cột O. Nếu có quyền sửa, bấm ô để mở khung soạn nhiều dòng; lọc bằng tìm kiếm văn bản.
- Biểu tượng lịch sử chỉ xuất hiện tại **Ghi chú** và **Tiến độ hiện tại**. Mở sẽ thấy các thời điểm (màu xanh riêng) và giá trị mới, **mới nhất trước**, không đánh số lần. Ghi chú còn có 3 ví dụ bên dưới gắn nhãn **DỮ LIỆU DEMO**, không phải lịch sử sửa thật.

---

## Kéo độ rộng tại đường kẻ và lọc không nhảy (23/10/2026)

Khi ở chế độ được phép tùy chỉnh cột, **rê chuột đúng đường kẻ dọc giữa hai tiêu đề**: con trỏ đổi sang mũi tên chỉnh độ rộng, giữ chuột kéo qua trái hoặc phải. Không có tay nắm/icon riêng. Admin Firebase đang ở chế độ xem vẫn tự lưu bố cục cho các tài khoản sau khi thả; nếu không đủ quyền sẽ không thấy vùng chỉnh này.

Ở chế độ **Gộp Phòng chuyên môn / Chuyên viên**, bộ lọc trên là **Chọn để lọc Phòng**, bên dưới là **Tìm kiếm tên CV**, cùng cỡ chữ 15px. Sau khi cuộn sâu, bấm mở bất kỳ “Chọn để lọc” nào sẽ không tự nhảy dòng; nếu chọn một điều kiện lọc làm giảm đáng kể số dòng, vị trí cuộn có thể được giới hạn theo chiều dài của kết quả mới.

Kéo rộng/hẹp một cột không chủ động chia chênh lệch cho các cột khác hay dồn sang cuối; nó làm tăng/giảm tổng độ rộng bảng. Khi khung bảng còn khoảng trống dư, thuật toán bảng CSS của trình duyệt có thể tự phân phối phần dư hiển thị. Các tính năng khác giữ nguyên.

---

## Gộp Phòng/CV · Kéo cột chế độ xem · Lịch sử minh họa Ghi chú (23/10/2026)

Trong **Danh sách các ND trình HĐND**, mở **Gộp cột** và bật **Gộp Phòng chuyên môn và chuyên viên**. Dòng phía trên của ô gộp hiện Phòng, dòng dưới hiện CV. Bên dưới cột gộp có **Lọc theo Phòng** (danh sách chọn) và **Tìm kiếm tên CV** (nhập một phần/tên đầy đủ); có thể kết hợp cả hai. **Sở, ngành chủ trì** vẫn là cột riêng. Tắt gộp để hiện lại cột Phòng và Chuyên viên độc lập; giá trị gốc không đổi.

Với **tài khoản admin Firebase**, tại **chế độ xem**, đưa chuột lên **mép phải tiêu đề cột** để kéo độ rộng, hoặc **giữ kéo tiêu đề cột** sang vị trí mong muốn. Hệ thống chỉ lưu **sau khi thả**, rồi tự cập nhật cấu hình dùng chung cho các tài khoản khác; nếu lỗi sẽ hoàn lại bố cục và thông báo. Trước khi kéo, cần về **giao diện chung** nếu đang mở mẫu xem cá nhân, và tắt **Hiện đủ cột Excel**. Khách không được dùng chức năng này. Nếu muốn sắp xếp dữ liệu tăng/giảm, vẫn vào chế độ chỉnh sửa; kéo cột không phải là sắp xếp giá trị.

Để xem giao diện lịch sử, ở một ô **Ghi chú** bấm biểu tượng **Lịch sử** bên cạnh nội dung. Màn hình có lịch sử nguồn thật (nếu có) ở phần đầu, tiếp theo là **3 lần sửa Ghi chú demo** gồm ngày giờ và giá trị mẫu, với nhãn **DỮ LIỆU DEMO**. Các dữ liệu này không phải lịch sử thật của hồ sơ, không lưu vào Excel/Firebase. Tài khoản khách vẫn áp dụng hạn chế xem lịch sử như trước.

---

## Bộ màu trạng thái — cá nhân hóa màu chữ, màu nền (22/10/2026)

Trong **Danh sách các ND trình HĐND**, bấm **🎨 Bộ màu trạng thái** (ở thanh phía trên bảng). Khi đã đăng nhập, cũng có nút **Bộ màu** ở thanh công cụ **bảng popup chi tiết**. Hai nơi dùng **một bộ màu đang chọn**.

Mỗi dòng cho 1 nhóm nghiệp vụ: `Sở chưa trình`, `Văn phòng đang thực hiện` (kể cả `VP đang thực hiện`), `Hoàn thành và tương đương` (bao gồm `Đã có TBKL`, `Không phải trình`, `Đã trình HĐND` tùy cột) và `Trạng thái khác`. Bấm ô vuông bảng màu hoặc **nhập mã HEX 6 ký tự** (ví dụ `#D00025`) ở **Màu chữ/Màu nền**. Màu hợp lệ có hiệu lực ngay; không thay nội dung văn bản. **Trạng thái khác** không màu mặc định; muốn tô các trạng thái trung gian, đánh dấu **Tô màu trạng thái khác**. Bỏ dấu để quay lại hiển thị trung tính.

Sau khi chọn màu, nhập **Tên bộ màu mới**, bấm **Lưu bộ mới**. Sau này chọn tên ở danh sách **Bộ màu đã lưu** để dùng lại; bấm **Cập nhật bộ** nếu muốn ghi đè bộ đang chọn. Bấm **Xóa bộ đã chọn** rồi **Xác nhận xóa bộ màu** để xóa tên/mẫu (màu đang hiển thị vẫn còn). **Khôi phục màu V5 mặc định** để về màu mặc định không có tên. Hệ thống cho phép tối đa **20 bộ** trên trình duyệt. Việc đang dùng màu tự lưu trên trình duyệt; thay đổi bảng không ghi Excel/Google Sheets/Firebase, không đồng bộ sang máy khác. Nếu dùng máy khác, cần tạo lại bảng màu trên máy đó. Các bộ màu V1/V2 đã sao lưu **trên GitHub** là các mốc khôi phục code riêng, không bị công cụ này xóa.

---

## Popup sau phản hồi ảnh 19/10/2026 22:32 — đang ở PR #3, chưa phát hành preview

Với **khách ẩn danh**, khi bấm số lượng trong báo cáo, popup chỉ có thao tác xem/lọc/tìm/sắp xếp, Hiện đủ cột Excel, **Rộng popup** (thanh kéo ngay trên đầu) và Mở Danh sách dữ liệu; không còn nút chỉnh sửa dữ liệu/cấu hình/mẫu. Quyền sửa thử của khách trong **Danh sách nội dung** nếu được quản trị cấp **không** tự mở quyền sửa trong popup. Thanh Rộng popup chỉ điều chỉnh khung và tự lưu trên trình duyệt, không thay đổi Excel/Firebase.

Với **tài khoản không ẩn danh**, popup vẫn mặc định xem; chỉ có Chỉnh sửa nháp khi được cấp ít nhất một ô, và từng ô tiếp tục kiểm quyền. Nút **Cấu hình popup / cột** cung cấp nhập độ rộng px (640–2400) và độ rộng từng cột. Ở cả hai vai trò, khung bị giới hạn bởi chiều rộng màn hình. Chức năng mới **chưa có trên các URL preview phát hành trước 22:32** cho đến khi CI Verify #39279720743 thành công và người vận hành publish đúng artifact. Không được nhầm mã mới đã commit với bản chạy trên website.

## Cập nhật popup 19/10/2026 — quyền sửa và độ rộng toàn cửa sổ

Khi bấm số trong báo cáo, bảng popup **mở ở chế độ xem**. Nút "Chỉnh sửa nháp" chỉ bật khi người dùng có quyền sửa ít nhất một ô thuộc tập nội dung đã chọn. Trong chế độ này, từng ô vẫn kiểm quyền riêng; ô khác chỉ xem. Bấm "Về chế độ xem" để kết thúc chế độ sửa mà không đóng cửa sổ. "Giữ nháp trên máy" không ghi Excel hoặc Firebase.

Trên mã PR #3 mới, bấm **Cấu hình cột riêng → Độ rộng toàn cửa sổ popup**, nhập 640–2400 px (mặc định 1480), rồi **Lưu cấu hình cột**. Độ rộng cửa sổ **khác** tổng độ rộng bảng (có thể cuộn ngang) và độ rộng từng cột. Cửa sổ tự giới hạn theo màn hình, lưu riêng ở trình duyệt, không đổi bố cục Danh sách hay quyền.

**Trạng thái:** [Verify #39270344125](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39270344125) đã PASS trên nhánh PR #3. **Preview mới đã có mã sửa** tại https://cavoixanh638.github.io/HopHDND-WebApp/preview/popup-width-permissions-2026-10-19/ . Trang chính chưa cập nhật; hãy dùng Ctrl+F5 nếu vẫn nhìn thấy bản cũ và thử trên thiết bị thực trước khi nghiệm thu.

# Hướng dẫn sử dụng — Pages 0.7.0 và Main 0.6.2

**Bản kiểm thử đã phát hành:** [Popup bảng dữ liệu đủ thao tác và kéo độ rộng](https://cavoixanh638.github.io/HopHDND-WebApp/preview/popup-grid-parity-2026-10-19/). [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/) hiện tương ứng. Bản `preview/detail-grid-columns-2026-10-19/` là phiên bản **trước khi sửa lỗi kéo cột**, chỉ dùng để đối chiếu, không làm theo hướng dẫn mới.

## Thao tác popup chi tiết nâng cao — so với bảng Danh sách (19/10/2026)

**Kéo cột:** Bấm ô số báo cáo để mở popup, đưa chuột lên **đường biên bên phải tiêu đề cột** (vùng đổi kích thước có đường viền dọc), giữ chuột và kéo sang trái/phải, thả để lưu độ rộng **riêng của popup**. Có thể Tab đến tay nắm và dùng phím ←/→ mỗi lần 10px. Không cần mở Cấu hình cột để kéo.

**Tùy chỉnh cột:** Bấm **Cấu hình cột riêng**, tích hiện/ẩn, dùng ↑/↓ hoặc giữ-kéo tiêu đề trực tiếp (Alt+←/→ nếu điều khiển bàn phím), nhập px khi cần, xem trước ngay, bấm **Lưu cấu hình cột**. Nếu đóng chế độ tùy chỉnh khi còn thay đổi, chọn Lưu/Bỏ/tiếp tục. Bấm **Hiện đủ cột Excel** để xem tạm cả 15 cột, bấm lại để về lựa chọn riêng. Đóng rồi mở popup lại, độ rộng/ẩn/thứ tự đã lưu được phục hồi.

**Tìm và lưu giao diện:** Tìm toàn bảng, lọc ngay dưới cột (chọn danh mục khi ít giá trị hoặc gõ từ khóa), bấm X để bỏ lọc một cột, **Xóa bộ lọc** để bỏ hết và trở lại thứ tự gốc. `Mẫu bảng popup` + `Tên mẫu mới` cho phép lưu, chọn lại, cập nhật, xóa mẫu cá nhân (tối đa 12) cùng cột/bộ lọc/màu. Mở Cấu hình cột riêng → **Màu theo điều kiện** để tạo quy tắc màu riêng (không thay màu 5 báo cáo và Danh sách).

**Chỉnh sửa / lịch sử:** Nếu có quyền thì bấm **Chỉnh sửa nháp**, sửa trường nguồn đúng theo loại editor ở Danh sách, Nội dung/Ghi chú dùng popup soạn thảo với cảnh báo khi chưa áp dụng. Nếu được phép xem lịch sử, bấm ↺ bên cạnh ID; nút **Mở Danh sách dữ liệu** dẫn đến bảng gốc có quyền/schema, quản trị nâng cao. **Giữ nháp trên máy** không ghi Excel/Firebase. Bảng popup không có chức năng phân quyền hoặc tạo 20 cột tùy chỉnh nguồn riêng; xem [ma trận tính năng](REPORT_DETAIL_PARITY_2026-10-19.md).

## Bảng chi tiết nhanh từ ô báo cáo — tùy chỉnh cột riêng (bản thử 19/10/2026)

**Đường dẫn bản thử hiện hành:** [Bảng chi tiết nhanh + cấu hình cột độc lập](https://cavoixanh638.github.io/HopHDND-WebApp/preview/detail-grid-columns-2026-10-19/); [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/) hiện cùng mã. Bản `clear-cell-hover-2026-10-19/` là bản trước khi có bảng chi tiết, để đối chiếu. Không dùng site chính để đánh giá chức năng mới vì PR #3 chưa merge.

1. Từ **Theo dõi tiến độ**, bấm bất kỳ ô có số dương nào (trạng thái, tổng nhóm hoặc tổng bảng). Cửa sổ **Bảng chi tiết nhanh** hiện đúng các hồ sơ của ô. Có thể tìm mọi nội dung, lọc dưới đầu mỗi cột, bấm tiêu đề để sắp xếp và cuộn ngang xem những cột bên phải. Bảng báo cáo phía sau không đổi số liệu do các thao tác xem/lọc.
2. Bấm **Cấu hình cột riêng** để chọn cột hiện/ẩn, dùng **↑/↓** để thay đổi thứ tự hoặc nhập độ rộng 70–800px. Bấm **Lưu cấu hình cột** để dùng cho các lần mở sau; **Khôi phục mặc định** rồi Lưu để quay lại cấu hình ban đầu. Thiết lập này **chỉ áp dụng cho bảng chi tiết**, lưu ở trình duyệt hiện tại theo nguồn Excel và môi trường preview; **không thay** bảng Danh sách nội dung hoặc bảng thống kê. Nếu đổi máy/trình duyệt, phải cấu hình lại.
3. Nếu được cấp quyền, bấm **Chỉnh sửa nháp** để thay giá trị tiến độ/đơn vị hoặc sửa Nội dung trình/Ghi chú ngay trong bảng. Chỉ trường được cấp quyền mới có editor. Các thay đổi hiện trong nháp chung với Danh sách nội dung; bấm **Giữ nháp trên máy** để lưu checkpoint cục bộ. **Đây chưa phải cập nhật Excel thật**, kể cả khi đã bấm giữ nháp; nếu không có quyền thì nút sửa không khả dụng.
4. Khi muốn cập nhật Excel thật, phải sử dụng đúng chức năng writer đã được chủ quản cho phép và kiểm tra phản hồi ghi/đọc lại. **Bảng chi tiết nhanh phiên bản này chưa có nút ghi Excel.** Không bấm thao tác quản trị trên preview nếu chưa có kế hoạch và quyền ghi production được phê duyệt.

## Bản kiểm thử giao diện mới 19/10/2026 — chỉ dùng đường dẫn preview

Mở [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/) hoặc **[bản chốt hover viền rõ 19/10](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/)**. Các preview `ux-fixes`, `native-anchor-hover` và `ab-optimized-hover` là **mốc lịch sử** để so sánh, không phải thiết kế hover đã chốt. **Không dùng URL gốc** để đánh giá các sửa lỗi ngày 19/10: PR #3 chưa merge, `main:index.html` chính vẫn là HTML cũ. Preview cùng kết nối Firebase production; khi bấm lưu cấu hình/quyền hoặc phê duyệt có thể tạo **thay đổi thật**.

**Danh sách nội dung (xem):** cột A–O đúng nguồn Excel, lọc nhập trực tiếp **ngay dưới mỗi tiêu đề**, không phải mở một cửa sổ lọc riêng. Bấm vào **tên cột hoặc biểu tượng ↕/↑/↓**: lần 1 tăng dần, lần 2 giảm dần, lần 3 về thứ tự nguồn. Mũi tên hiện rõ khi đã sort, hơi mờ khi chưa sort và rõ hơn khi rê chuột; sort không ghi Excel. Lưới dữ liệu cuộn, tiêu đề và hàng lọc đi kèm; không còn cơ chế phân trang 50 dòng kiểu cũ (danh sách cuộn trong vùng có chiều cao ổn định).

**Kéo độ rộng danh sách (chỉnh sửa):** vào `⚙ → Chỉnh sửa → Danh sách và nội dung`; đặt chuột ở **mép phải ô tiêu đề**, con trỏ thành biểu tượng kéo ngang, giữ và kéo để thay đổi độ rộng. Kéo vùng giữa tiêu đề để **đổi thứ tự cột** là chức năng khác; bấm tiêu đề để **sắp xếp**. Tay nắm có thể focus để chỉnh bằng mũi tên; khi thả chuột mới cập nhật thay đổi vào nháp. Quản trị bấm **Lưu cách hiển thị** để lưu bố cục dùng chung, vẫn ở màn chỉnh sửa; nếu có xung đột/lỗi sẽ phải xử lý theo cảnh báo, không coi đã lưu.

**Kéo độ rộng bảng thống kê (chỉnh sửa):** vào `⚙ → Chỉnh sửa → Bảng thống kê`; tại **bảng xem trước của từng báo cáo**, kéo mép phải tiêu đề cột nhóm, `Tổng số nội dung`, các cột trạng thái hoặc `% hoàn thành`. Độ rộng riêng cho từng báo cáo, không làm thay đổi dữ liệu; bấm **Lưu Bảng báo cáo** khi muốn áp dụng cho tất cả người xem. CSS cũ từng khóa cột đầu tiên, đã bỏ trong bản sửa 19/10; vẫn cần thử trên browser thật.

**Bấm bất kỳ vị trí nào trong ô để xem hồ sơ:** Ở **cả 5 bảng báo cáo**, đưa chuột vào **bất kỳ điểm nào trong ô có số lượng dương** (kể cả mép/góc, không cần trúng số): **chỉ ô đang chỉ** nổi nền xanh ngọc nhẹ và **viền 2px xanh ngọc** rõ nét (Tab focus là viền 3px), không đổi kích thước hàng/cột và không tô cả hàng; con số đứng riêng **không có dấu ↗**; một tooltip dùng chung có dòng **“Click để xem chi tiết”** hiện gần ô, không sử dụng tooltip `title` chờ mặc định của trình duyệt. Tooltip giữ cùng kích thước và chữ, không tái tạo khi rê qua các ô. Sau phép đo A/B Chrome, CSS Anchor Positioning kết hợp `body:has()` **không còn được sử dụng**; thay bằng **một bộ xử lý hover chung rất nhẹ**: chỉ cập nhật vị trí lúc chuyển sang ô khác, không chạy theo từng pixel, không đọc lại kích thước bảng và không tô nền cả hàng báo cáo. Bản này áp dụng thống nhất trong các trình duyệt hỗ trợ giao diện. Bấm tại bất kỳ điểm nào trong ô để mở đúng danh sách nội dung; cách này cũng áp dụng cho ô Tổng số nội dung từng nhóm và Tổng cộng cuối bảng. Có thể dùng Tab để chọn ô, rồi Enter/Space để mở. Ô hiển thị `—`/không có hồ sơ, ô % hoàn thành và tiêu đề bảng không mở danh sách bằng click. Đóng cửa sổ bằng nút **×** hoặc Esc. Nút được phủ kín ô bằng CSS nhưng giữ ngữ nghĩa HTML và aria-label; không lặp thêm nút nhỏ nằm giữa ô. Đây là cải tiến vùng thao tác, **chưa** phải benchmark tốc độ dựng danh sách chi tiết nhiều hồ sơ.

**Năm bảng mặc định:** `Tiến độ xin ý kiến Thành ủy`, `Tiến độ trình HĐND xây dựng NQ`, `Tiến độ các Nghị quyết và Báo cáo trình HĐND`, `Tiến độ trình HĐND ban hành NQ`, `Tiến độ trình HĐND ban hành BC`. Bảng xây dựng NQ có cột **Không phải trình** ngay sau `Tổng số nội dung`, **cùng màu cực nhạt** với cột `Đã trình HĐND, chưa có QĐ` (tiêu đề, số liệu, tổng và khi in); phần này **không tính hoàn thành**. Các bảng ban hành/tổng hợp chỉ coi **Đã trình HĐND thành phố** là cột kết thúc; không hiển thị cột `Hoàn thành` phát sinh. Trạng thái Party cuối là **Đã có TBKL**.

**Giới hạn:** CI Chrome với dữ liệu giả đã pass, **chưa chứng minh mượt tương đương ở dữ liệu thực**; kiểm thử admin lưu layout/quyền trên Firebase production, KPI đối chiếu và dữ liệu đợt sau vẫn cần làm. Chỉ coi một giao dịch thành công khi UI nhận xác nhận từ Firebase. Các đoạn 0.6.x/0.7.0 bên dưới mô tả tính năng/vận hành **lịch sử** và không thay thế hướng dẫn preview mới.

## Dành cho quản trị viên Pages 0.7.0 (quy tắc và giới hạn hiện tại)

Tài khoản quản trị phải đăng nhập Google qua Firebase Authentication (email đã xác minh, nhà cung cấp `google.com`), không dùng mật khẩu nhúng trong HTML. Quyền cập nhật danh mục, báo cáo, bố trí danh sách, cột và quyền sửa thuộc **cùng cơ chế quản trị Firebase**; xem [FIREBASE_PAGES](FIREBASE_PAGES.md). Quyền theo ô ưu tiên trước dòng, rồi cột, mặc định không cho sửa. Các nút sửa nháp nghiệp vụ **không** ghi vào Google Sheets/Firebase.

**Quản lý cột — giao diện thử nghiệm cập nhật 17/10/2026:** Vào **⚙ → Chỉnh sửa → Danh sách dữ liệu → Quản lý cột**. Mỗi cột có ô **Hiện** và ô **Cho sửa**, nút **Sửa** mở các thuộc tính: tên, kiểu **Nhập văn bản tự do / Danh sách chọn**, thêm/đổi tên/xóa/sắp xếp các lựa chọn ngay dưới cột. Cột Excel dùng một danh mục chung từ `hdnd/profile.catalogs`, cột tự tạo lưu lựa chọn trong cấu hình cột; không còn yêu cầu chuyển sang trang Danh mục riêng. Giao diện có **một nút Lưu thay đổi** nổi bật trong Quản lý cột. Một lần bấm lưu lần lượt các phần có thay đổi (danh sách chọn, quyền cột, bố cục) qua các giao dịch riêng; nếu một phần lỗi, thông báo rõ đã lưu phần nào và phần nào chưa lưu, không ghi dữ liệu Excel.

**Quyền sửa theo cột:** Ô tick chỉ áp dụng cho các trường nhập liệu nguồn được hỗ trợ (ID/STT và cột tự tạo không có quyền ghi khách trên Sheets). Không còn hiển thị bảng quyền chi tiết từng ô; ID và STT là thông tin nguồn liên quan nhận diện và thứ tự dòng, chưa mở quyền sửa vì luồng ghi từ WebApp về Google Sheets đang khóa. Cho phép tick mà không có cơ chế kiểm trùng/ghi nhận ổn định sẽ gây hiểu nhầm; nếu trước đây đã lưu quyền dòng/ô, hệ thống yêu cầu quản trị xác nhận xóa các ngoại lệ trước khi lưu quyền cột mới. Việc xác nhận chỉ thực hiện khi bấm lưu Firebase (không tự xóa quyền cũ khi mở giao diện). Khi gặp xung đột thay đổi Firebase, phần sửa không được coi là đã lưu. **Chú ý:** dữ liệu Sheets vẫn chỉ đọc từ WebApp, người dùng sửa thử giữ bản nháp trên trình duyệt.

**Cách hiểu quyền:** Ở từng ô, **Theo quyền dòng/cột** nghĩa là dùng quyền của dòng; nếu dòng chưa đặt quyền thì theo cột. **Cho phép sửa** mở riêng ô đó; **Không cho sửa** khóa riêng ô đó. Ở từng dòng, **Theo quyền cột**, **Cho phép sửa cả dòng**, **Không cho sửa dòng** có ý nghĩa tương ứng. Thứ tự ưu tiên: **ô → dòng → cột → mặc định khóa**. Vì ID dòng hiện theo vị trí Excel, thao tác cấp quyền riêng cho dòng/ô cần xác nhận cảnh báo; sau khi thêm/sắp xếp hàng Excel phải rà lại quyền.

**Ổn định bố cục và lưu thiết lập (18/10/2026):** Khi mở trang, chưa hiển thị bảng theo độ rộng mặc định nếu Firebase chưa xác nhận hồ sơ. Sau khi cấu hình tải xong, trang tính ngay độ rộng từ cấu hình chung và mẫu xem cá nhân trước lần hiển thị bảng đầu tiên; các cột ẩn và thứ tự đã lưu được giữ nguyên, “Hiện đủ cột Excel” là thao tác tạm thời do người xem chủ động chọn. Nếu Firebase báo lỗi, trang hiện cảnh báo, không tự vẽ bảng với cấu hình thay thế. Khi quản trị bấm **Lưu thay đổi**, nếu Firebase từ chối một trong ba phần (danh sách chọn, quyền cột, bố cục), thông báo ghi rõ phần bị từ chối và phần nào đã lưu thành công; các bản nháp chưa lưu được giữ. Giao diện Quản lý cột có vùng danh sách cuộn giới hạn chiều cao để bảng nội dung nằm gần công cụ chỉnh sửa. Chưa thể coi thao tác lưu trên production là đã nghiệm thu nếu chưa thử bằng tài khoản thực tế.

**Bản xem trước 18/10/2026 — chế độ xem và sắp xếp:** Hai tab chính là **Tổng quan** và **Danh sách nội dung**; tab Hướng dẫn đã bỏ. Thanh tab khách luôn căn cùng mép với tiêu đề/nguồn; Danh sách đưa công tắc hiện cột lên cùng dòng tiêu đề và chỉ hiển thị thanh điều kiện khi có tìm kiếm thực sự. Khi mới vào WebApp, các bảng chờ cấu hình hiển thị Firebase rồi mới vẽ để tránh nhảy độ rộng. Bấm **tên cột hoặc biểu tượng ↕** trên tiêu đề để sắp xếp tăng dần, bấm lần nữa giảm dần, lần ba về thứ tự dữ liệu nguồn; có hỗ trợ STT dạng số, ID số/chữ và tiếng Việt, dòng trống cuối. Sắp xếp chỉ thay đổi trên màn hình, không ghi vào Google Sheets/Firebase và không thay đổi cấu hình chung.

**Giới hạn nghiệm thu:** Mã UI đã qua CI và được phát hành nhưng vẫn cần người dùng kiểm tra đăng nhập và lưu quyền thật với Firebase Rules đang chạy; không ghi dữ liệu nguồn khi sửa thử.

Quy trình vận hành/quay lại, sao lưu, khôi phục và xử lý lỗi: [VAN_HANH](VAN_HANH.md). Ý nghĩa trường, ID và rủi ro quyền theo dòng/ô: [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md).



## Pages 0.7.0 — bản local chưa phát hành

Mọi người tiếp tục nhập/sửa dữ liệu trên Google Sheets. Pages đọc A–P trực tiếp qua GViz, tự đọc lại mỗi 60 giây khi tab hiển thị hoặc qua **Đọc lại dữ liệu Sheets và cấu hình**. Khi có nháp, app chờ bạn giữ để đối chiếu hoặc bỏ phần sửa trước khi đọc lại. Lỗi đọc giữ bản trước; đăng nhập Firebase lỗi không ngăn Sheets hiển thị.

**Tài khoản và quyền chỉnh sửa** dùng Firebase Authentication đã có. Chỉ Google `cavoixanh638@gmail.com` được lưu quyền ô/cột/dòng, bố trí danh sách/báo cáo và danh mục/giá trị lựa chọn dùng chung vào Firebase. Khách xem/tìm/lọc và sửa thử ô được cấp quyền; **Áp dụng vào bảng** và **Giữ thay đổi trên máy** chỉ giữ trên browser, không ghi nguồn. Quyền ô ưu tiên dòng rồi cột, mặc định khóa. Sau khi chèn/sắp hàng Sheets, quản trị cần rà lại quyền riêng do recordId legacy theo vị trí hàng.

**Kết nối dữ liệu Google Sheets** chỉ đổi lựa chọn nguồn trên trình duyệt; không cấp quyền đọc bảng riêng tư hoặc quyền ghi. **Nhập / Xuất Excel** vẫn xuất snapshot Sheets và JSON cấu hình; nhập dữ liệu Excel bị khóa. Nhập JSON cấu hình cần Google quản trị và xác nhận lưu. Chưa push, triển khai Rules hoặc đổi dữ liệu thật. [Hướng dẫn Pages](FIREBASE_PAGES.md), [kết quả](CURRENT_STATE.md).

## Main Google 0.6.2 — luồng đã phát hành trước đó

Main `/exec` đã cập nhật deployment v6 ngày15/10/2026. Mở [ứng dụng trên Google](https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec) trong tab mới hoặc tải lại tab cũ. Kết nối main được kiểm lúc11:30:08: backend sẵn sàng, tài khoản `phucpixel2025@gmail.com`, 51 dòng, 0 cảnh báo, cấu hình revision12; UI tải mới lúc11:34 hiện đúng nguồn. Lần kiểm UI này không sửa dữ liệu nguồn chính. Save/readback thành công đã được chứng minh riêng trên bản sao thử; không coi đó là bằng chứng nguồn chính đã được ghi.

Nguồn nhập liệu mặc định là [file Excel HĐND](https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344), `gid=60961344`. Nguồn thật và dữ liệu mẫu là hai loại nguồn khác nhau; một nguồn Google vẫn có thể ở chế độ chỉ đọc.

## Mở và chọn nguồn

Mở ứng dụng bằng link Google ở đầu tài liệu. Để sửa và lưu Excel, dùng Google app này; vào **⚙ Tùy chỉnh danh sách**, sửa ô rồi bấm **Lưu dữ liệu vào Excel**. HTML tải về chỉ là giao diện và không tự mang backend Apps Script; Drive preview và `file://` chưa được xác minh.

Main v6 dùng nguồn đã đăng ký sẵn; không đổi link/`gid` trong lúc sửa. Nếu cần đổi nguồn, quản trị viên phải cập nhật nguồn đã đăng ký phía server trước. Các bản HTML độc lập/candidate có thể có **⚙ Tùy chọn → Kết nối dữ liệu**, nhưng chế độ đó không cấp quyền ghi Excel và không chuyển nháp sang Google app.

## Xem và cập nhật dữ liệu

Ở tab **Tổng quan**, xem KPI/báo cáo, đổi cách phân nhóm và bấm số để mở danh sách chi tiết. Có thể tùy chỉnh cột hiển thị; ẩn cột không đổi tổng. Tab **Danh sách nội dung** hỗ trợ tìm kiếm tiếng Việt có/không dấu, lọc theo loại, phạm vi, lãnh đạo VP và tiến độ; danh sách cuộn theo chiều dọc trong vùng cố định ở bản preview mới (bản Google legacy có thể khác). Dòng chưa chuẩn hóa vẫn được báo để rà soát.

Nguồn Excel được đọc theo cấu trúc hiện tại. Dùng link **Mở file Excel nhập liệu** để xem hoặc sửa file theo quyền của bạn. App tự đọc lại mỗi 60 giây khi tab hiển thị; **Đọc lại dữ liệu và danh mục từ Google** cũng tải dữ liệu Google vào app. Đây là chiều **Google → app**, không ghi nội dung ngược vào file.

## Sửa nháp và giữ trên trình duyệt

Trong Google app, mở **⚙ Tùy chỉnh danh sách**. Sửa ô hoặc mở popup **Nội dung trình/Ghi chú**; **Áp dụng vào bảng** chỉ đưa nội dung popup vào nháp. Bấm **Lưu dữ liệu vào Excel** để gửi phần sửa. App chỉ báo đã lưu khi đọc lại file và xác nhận giá trị; nếu có lỗi, xung đột hoặc kết quả chưa rõ, phần sửa được giữ để đối chiếu. Bản sửa được checkpoint trên browser khoảng 10 giây. **Giữ thay đổi trên máy** chỉ giữ bản sửa trên trình duyệt này, không cập nhật file.

Nếu ứng dụng hiển thị **Chưa thể lưu vào Excel** hoặc vô hiệu hóa nút lưu, đừng coi bản nháp là đã lưu. Có thể tải/giữ phần sửa trên máy hoặc sửa trực tiếp file Excel rồi đọc lại. Hủy bản nháp bỏ phần chưa lưu; dữ liệu nguồn không đổi.

## Hai thao tác có chiều dữ liệu khác nhau

**Lưu dữ liệu vào Excel** là chiều **app → Excel**. Main v6 đã có backend và trạng thái kết nối được kiểm; UI chỉ báo lưu thành công sau khi server đọc lại file và xác nhận. Ghi dùng ETag/CAS để từ chối nguồn đã đổi. Save/readback trên bản sao đã pass, còn main UI mới được kiểm kết nối/sẵn sàng; không coi main đã ghi nguồn thật.

HTML độc lập hoặc bản HTML tải về không có `google.script.run` nên chỉ giữ nháp trên browser; không thể dùng để ghi Excel. Nháp cũ trên HTML không tự chuyển sang nguồn/app Google; hãy đối chiếu và nhập lại nếu cần. Bằng chứng UI save/readback hiện có thuộc `PrivateExcelTestHost.gs` và fixed private copy trong project thử; không phải ghi nguồn chính.

**Đọc lại dữ liệu và danh mục từ Google** là chiều **Google → app**. Lệnh này nạp lại nội dung nguồn và cấu hình/danh mục theo phạm vi được phép; nó không lưu nháp vào Excel. Lưu danh mục/bố trí dùng chung là một luồng riêng, không thay đổi các dòng nghiệp vụ trong file Excel.

## Khi thao tác lưu báo lỗi

- Nếu backend chưa bật, nút lưu bị khóa hoặc thông báo cho biết chưa thể lưu vào nguồn. Giữ nháp trên browser hoặc cập nhật trực tiếp Excel.
- Nếu báo xung đột, file đã thay đổi trong lúc sửa. Đọc lại nguồn, đối chiếu với nháp rồi quyết định chỉnh lại.
- Nếu timeout hoặc phản hồi chưa xác định, giữ bản sửa và đọc lại file trước khi thử lần khác. Hệ thống dùng receipt để đối soát và không tự gửi lại cả lần ghi một cách mù quáng.
- Nếu thiếu quyền Drive/registry hoặc kho sao lưu không hợp lệ, dừng ở thông báo lỗi; việc truy cập nguồn đọc được không chứng minh quyền ghi đã có.

Tham khảo [hợp đồng API](API.md), [bản đồ mã](REPO_MAP.md), [CURRENT_STATE](CURRENT_STATE.md) và [đồng bộ cấu hình](DONG_BO_CAU_HINH.md) để xem giới hạn và trạng thái triển khai. Candidate local hoặc test trên bản sao không xác nhận đã ghi thành công trong app đang mở.

## Tính năng bổ sung 0.7.1 — đang kiểm thử trên PR #3

**Lưu nhiều mẫu giao diện cá nhân.** Trong Danh sách, nhập tên mẫu rồi bấm **Lưu mẫu mới**. Một mẫu gồm cách bố trí cột đang hiển thị, tìm kiếm, bộ lọc, lọc riêng từng cột và quy tắc màu. Chọn mẫu bằng hộp **Mẫu giao diện** để nạp lại. Các nút Cập nhật mẫu/Xóa mẫu áp dụng cho mẫu đang chọn. Tối đa 20 mẫu **trên chính trình duyệt**; không tự xuất hiện trên thiết bị khác, không thay đổi bố trí chung.

**Lọc từng cột.** Nhập trực tiếp vào ô lọc luôn hiển thị **dưới tiêu đề cột** (hỗ trợ tiếng Việt không dấu). Các lọc kết hợp với nhau và với bộ lọc hiện có. Dải **Đang lọc theo cột** cho biết cột/giá trị nào đang lọc; nhấn × để bỏ từng lọc hoặc Bỏ tất cả lọc cột. Không sửa dữ liệu gốc.

**Đổi màu theo điều kiện.** Trong Tùy chỉnh danh sách, mở phần Màu theo điều kiện; chọn cột, nhập giá trị chính xác cần so sánh và màu. Có tối đa 30 quy tắc; dòng được tô bằng quy tắc đầu tiên phù hợp. Chỉ là màu hiển thị trong trình duyệt, không định dạng trực tiếp Excel/Sheets.

**Dành cho quản trị:** sau khi đăng nhập Google bằng tài khoản quản trị, trong ⚙ Tùy chọn chọn **Thay đổi và phê duyệt (quản trị)**. Trang này liệt kê nội dung mới, không còn và các ô đổi giá trị so với mốc đã duyệt. Bấm **Phê duyệt** và xác nhận để lưu snapshot hiện tại thành mốc mới (có revision, thời gian và lịch sử tối đa 20 metadata). Từ lần đọc dữ liệu tiếp theo, so sánh bắt đầu từ mốc mới. Không phê duyệt nếu chưa đọc thành công dữ liệu, có 0 dòng hoặc còn nháp.

**Khóa sửa trong WebApp.** Ngay trên trang phê duyệt, quản trị chọn **Khóa sửa trên WebApp** hoặc **Mở sửa trên WebApp**. Khi khóa, khách không được sửa thử trong ứng dụng, nhưng vẫn xem/lọc. Đây **không** phải cài đặt bảo vệ phạm vi hoặc quyền chỉnh sửa trực tiếp trong file Google Sheets; quyền sửa nguồn phải quản lý tại Google.

**Điều kiện kích hoạt:** PR #3 chưa phải production; các chức năng phê duyệt và khóa sửa yêu cầu Rules RTDB mới được kiểm tra và triển khai riêng. Mốc GitHub để hoàn nguyên phần mềm: `backup/pre-features-2026-10-16`; không dùng code rollback để khôi phục dữ liệu.

