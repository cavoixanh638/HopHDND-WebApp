# SYSTEM — Quy tắc nghiệp vụ

## Nguồn và quản trị Pages 0.7.0 — 15/10/2026

Google Sheets vẫn là nguồn nhập/sửa chính; Pages đọc Sheets/GViz, không yêu cầu nhập dữ liệu vào Firebase. Sửa trên Pages hiện chỉ là thử nghiệm cục bộ theo quyền ô/cột/dòng; không ghi dữ liệu nghiệp vụ vào Sheets hoặc Firebase. Báo cáo, KPI và xuất Excel dùng bản đọc Sheets. Không triển khai đồng bộ Sheets → Firebase định kỳ. Nhập Excel ghi dữ liệu đang khóa, chỉ mở khi có quyết định chuyển đổi chính thức.

Firebase Authentication tiếp tục là cơ chế quản trị duy nhất trên Pages. Chỉ tài khoản Google verified `cavoixanh638@gmail.com` được lưu quyền sửa, bố trí bảng/cột/khung, báo cáo, danh mục/quan hệ và giá trị lựa chọn vào `hdnd/profile` hoặc `hdnd/permissions`. Khách ẩn danh xem/tìm/lọc/sửa thử ô được phép, không lưu cấu hình chung. Quyền ô ưu tiên dòng, rồi cột; mặc định khóa. Rules kiểm quyền cấu hình ở máy chủ kể cả gọi thẳng SDK. ID/STT giữ nguyên; không tự ánh xạ mã/dòng mơ hồ. App Google 0.6.2 ở dưới là luồng legacy riêng, không thay đổi trong lượt này. [Hướng dẫn](FIREBASE_PAGES.md), [trạng thái kiểm](CURRENT_STATE.md).

Phạm vi: chuẩn nghiệp vụ và bất biến cho Dashboard tổng hợp nội dung trình HĐND. Kế hoạch viết lại là đề xuất; nội dung dưới đây là các yêu cầu thiết kế, không phải bằng chứng rằng ứng dụng mới đã triển khai hay vận hành.

## Mục tiêu và phạm vi

Ứng dụng hỗ trợ quản lý nội dung trình HĐND, phân công và theo dõi tiến độ; tổng hợp báo cáo Nghị quyết (NQ) và Báo cáo (BC); tra cứu, chỉnh sửa, lịch sử, nhập/xuất và in. Giữ các nhu cầu trong `docs/FEATURES.md` F01–F36. Không tự thêm quản lý nhiều kỳ họp nếu dữ liệu hiện có chưa xác định trường kỳ.

## Thuật ngữ và trạng thái dữ liệu

- **NQ/BC:** loại nội dung nghiệp vụ rõ ràng, không suy ra chỉ từ ID khi dữ liệu mâu thuẫn.
- **Đề nghị rút:** một bước/quy trình, chẳng hạn câu chữ “Sở xin rút”; chưa đồng nghĩa nội dung đã được xác nhận rút.
- **Đã rút/không trình nữa:** thuộc tính loại nội dung khỏi KPI và bảng báo cáo chính. Vẫn tra cứu được, giữ lịch sử và có thể phục hồi.
- **Lưu trữ:** loại khỏi danh sách làm việc nhưng không xóa dữ liệu; có thể khôi phục. Không đồng nhất với rút.
- **Bản nháp:** thay đổi cục bộ chưa được máy chủ xác nhận. Hủy chỉ bỏ phần chưa gửi; không tạo lịch sử nghiệp vụ.
- **Trạng thái chưa nhận diện/ánh xạ:** giữ nguyên giá trị gốc, hiển thị hoặc đưa vào nhóm chưa ánh xạ để rà soát. Không bỏ khỏi tổng một cách im lặng, không tự gán trạng thái gần giống.
- **Legacy:** dữ liệu, mã, backup hoặc lịch sử từ phiên bản cũ. Bảo toàn mã hiển thị và khả năng đọc; chuyển đổi phải có báo cáo giá trị thiếu, trùng hoặc mơ hồ. Không tự gán danh tính cho lịch sử cũ.

## Bất biến bắt buộc

1. Đích thiết kế: mỗi nội dung có ID nội bộ ổn định, do phía máy chủ cấp; không sinh lại khi tải, không dựa vào số dòng. Mã hiển thị legacy được bảo toàn. Prototype domain hiện dùng chưa đạt đích stable IDs.
2. Bản chính là dữ liệu đã lưu ở máy chủ. Cache chỉ là bản đọc có nguồn/thời điểm rõ; cache không được ghi đè bản chính. Nháp lưu riêng, gắn với phiên bản gốc để phát hiện xung đột.
3. Lưu thay đổi gửi bản nháp để máy chủ xác thực dữ liệu, quyền và phiên bản. Phản hồi phải cho biết thành công, lỗi từng mục hoặc xung đột. Làm mới không ghi đè nháp im lặng.
4. KPI, tỷ lệ, bảng tổng hợp và danh sách chi tiết dùng cùng tập dữ liệu và cùng quy tắc. Bộ lọc đổi phạm vi tính; ẩn cột chỉ đổi cách trình bày. Tử số/mẫu số và trạng thái được tính phải nhất quán; không khẳng định tỷ lệ nếu trạng thái hoặc phạm vi chưa được xác định.
5. Mọi bản ghi thuộc phạm vi phải được tính hoặc được chỉ rõ lý do loại trừ (ví dụ đã rút/lưu trữ theo quy tắc báo cáo). Trạng thái/cột lạ không làm giảm tổng mà không có dấu hiệu và giải thích.
6. Rút và lưu trữ là thao tác có thể truy vết và phục hồi. Xóa bản cũ được chuyển thành lưu trữ mềm; không biến thành mất dữ liệu.
7. Lịch sử tập trung ghi các thao tác đã được lưu, với thời điểm, người/nguồn và thay đổi khi có dữ liệu. Hủy nháp không tạo sự kiện giả; legacy thiếu người sửa phải giữ rõ nguồn legacy.
8. Đích thiết kế: tên người, phòng, đơn vị và nhãn không phải khóa; danh mục/quan hệ dùng ID ổn định. Prototype hiện dùng chuỗi nhãn cho trạng thái/danh mục, chưa có catalog IDs hay xác thực người dùng; đây là giới hạn đã biết, không phải đạt chuẩn thiết kế. Giá trị cũ không rõ ánh xạ phải giữ để rà soát, không áp tên mới một cách âm thầm.
9. Cache, cấu hình dùng chung và lựa chọn cá nhân phải phân biệt. Phục hồi bản chính, reset cấu hình và hoàn tác thay đổi đã lưu là các thao tác khác nhau.

## Phạm vi báo cáo và tỷ lệ

Mặc định có các nhóm KPI và bảng theo F01–F06. Thay đổi cấu hình không được làm mất nội dung khỏi tổng. Quy tắc hoàn thành phải theo mã trạng thái/nhóm nghiệp vụ đã xác định, dùng nhất quán giữa KPI, bảng và chi tiết. Nếu thiếu quy tắc hoặc trạng thái chưa ánh xạ, báo rõ phần chưa xác định; không tự coi là hoàn thành/chưa hoàn thành để tạo một tỷ lệ tưởng như chính xác. Mục tiêu tìm kiếm dưới 200 ms trên 1.000 dòng, trang mặc định 50 dòng, thử ở 5.000 dòng, và JS lõi + CSS tối đa 350 KiB nén là các mục tiêu trong kế hoạch cần đo; chưa phải kết quả hay cam kết hỗ trợ.

## Nguồn dữ liệu, môi trường và triển khai

Giai đoạn 1 phát hành một HTML share trên Drive, build từ source nhiều module TypeScript/React/Vite. Người xem mở/tải bằng browser; HTML cần mạng và quyền đọc nguồn Sheets. Không hứa Drive preview tự chạy HTML. Adapter GViz đọc Excel/Google Sheets nguồn ở chế độ chỉ đọc. Cấu hình dùng chung có thể đọc qua GViz và ghi qua Apps Script RPC (`google.script.run`) vào một spreadsheet native riêng; RPC kiểm revision, operation ID và khóa, không ghi dữ liệu nghiệp vụ. Trạng thái triển khai và bằng chứng kiểm tra xem [CURRENT_STATE](CURRENT_STATE.md) và [Đồng bộ cấu hình](DONG_BO_CAU_HINH.md). Local development dùng demo repository; không dùng dữ liệu thật. Giai đoạn đầu dự kiến 2–3 người xem, 20–30 người nhập trực tiếp trong Sheets; mục tiêu tương lai 20–50 người và chủ yếu qua app cần được kiểm chứng. Ghi dữ liệu nghiệp vụ từ app là lựa chọn giai đoạn sau, cần server có xác thực; không dùng endpoint ghi công khai. Prototype hiện chưa có xác thực hoặc stable catalog IDs. Mọi ngưỡng hiệu năng là mục tiêu chưa đo. Tài liệu kế hoạch không phải chỉ thị deploy, thay đổi dữ liệu thật hay ghi vào production.

## Chuyển đổi và tương thích legacy

Chuyển đổi trên bản sao, giữ mã cũ, bổ sung ID ổn định, kiểm tra trùng/thiếu ID, trường không nhận diện, trạng thái chưa ánh xạ và phân công bất nhất. Không suy diễn loại văn bản, tên người hay trạng thái khi nguồn mâu thuẫn. Đối chiếu số lượng và mẫu dữ liệu trước/sau; giữ đường đọc backup cũ theo yêu cầu F25–F27. Khi chạy song song, xác định mốc ngừng ghi bản cũ; không để hai giao thức ghi đồng thời vào cùng nguồn. Quay lại phải giữ thay đổi hợp lệ phát sinh sau mốc chuyển đổi.

Tham chiếu: [FEATURES](FEATURES.md), [kế hoạch viết lại](KE_HOACH_VIET_LAI.md), [tài liệu và bàn giao](TAI_LIEU_VA_BAN_GIAO.md).


## Mặc định xem, chủ động vào chế độ tùy chỉnh

Phần cấu hình bố trí nằm trong nhóm gọn, phải vào chế độ riêng mới thay tên/vị trí/hiển thị/cột. Tìm kiếm, lọc, phân nhóm và in vẫn là thao tác xem. Chế độ giao diện không phải phân quyền; cấu hình chỉ đổi trình bày, không ghi Sheet hoặc tự cấp quyền dữ liệu. Hành vi Lưu/Hủy và phạm vi lưu phải rõ; thiết kế ở ARCHITECTURE mục 17, bằng chứng hiện hành ở CURRENT_STATE.

## ID hiển thị, danh mục và bản nháp 0.5.1

ID cột danh sách là nhãn hiển thị như NQ01/BC01 (tối thiểu hai chữ số, không cắt số lớn). Nó không thay recordId nội bộ hoặc mã gốc Sheets; mã lạ/mâu thuẫn giữ nguyên, trùng alias cần cảnh báo. Loại văn bản có cột riêng.

Danh mục và quan hệ chuyên viên–phòng local không tự đổi tên hoặc phân công lại dữ liệu. Mục đang dùng chặn rename/delete; quan hệ một người nhiều phòng được phép. Phân công mâu thuẫn quan hệ đã biết không lưu nháp mẫu; quan hệ chưa biết giữ rõ, không tự gán.

Độ rộng bảng thực tế là max(độ rộng đặt đã giới hạn 600–6000 px, tổng độ rộng cơ sở của cột đang hiện). Nếu độ rộng đặt vượt tổng cơ sở, phần dư được trình duyệt phân phối vào các cột và width thực tế có thể lớn hơn width cơ sở. Tự lưu chỉ giữ bản nháp phục hồi trên browser, định kỳ 10 giây khi timer hoạt động, không thay thao tác Lưu hay backup. Popup nội dung và ghi chú có hành động Lưu vào bản nháp; thoát editor có Lưu/Không lưu/Tiếp tục; lưu lỗi phải giữ nháp. Cấu hình đã lưu và bản nháp phải tách riêng, gắn nguồn/base, không phục hồi phần cũ đè thay đổi mới. Cell picker lọc theo chuẩn hóa tiếng Việt không dấu; tìm kiếm không sửa giá trị và lựa chọn hiện tại vẫn được giữ kèm ghi chú khi bị lọc. Nguồn Sheets giai đoạn hiện tại vẫn chỉ đọc.

## Bổ sung nghiệp vụ candidate0.6.2 — 15/10

Sửa trên bảng chưa thay file nguồn. Lưu dữ liệu vào Excel qua writer đã xác thực/đăng ký và đọc lại xác nhận; giữ trên máy/đọc lại/bố trí là các hành động riêng. ID/STT chỉ xem, mã gốc giữ theo baseline lúc sửa và không đổi khi hàng chuyển. Kiểm quan hệ khi thay chuyên viên/phòng; không tự đổi hoặc ép sửa phân công cũ khi chỉ đổi văn bản. Writer main vẫn tắt, phép kiểm Google chỉ trên bản sao; trạng thái thuộc CURRENT_STATE, hợp đồng thuộc API.
