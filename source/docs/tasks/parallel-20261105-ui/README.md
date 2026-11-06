# UI 05/11 — hợp đồng chung cho Gemini

## Tiếp tục sau review ngày 06/11/2026

**Nguồn hiện hành:** [REVIEW-3-END-TO-END.md](REVIEW-3-END-TO-END.md). CI `4bccba5992cc36e1cfc3da146711fe718e44adf8` PASS 3/3; yêu cầu mã nhóm cố định vẫn chưa đạt vì hàm identity còn dùng recordId nhỏ nhất trong nhóm. Không dùng kết luận “chỉ còn Site” trong checkpoint cũ để bỏ qua yêu cầu này.

**Owner phần còn lại:** chat Gemini tổng chỉ huy hiện có tự làm trọn sửa identity/model/đường lưu/renderer cần thiết, kiểm thử nghiệp vụ và browser, chạy CI, dựng gói/hash mới. Không mở lại bốn worker hoặc chia chuỗi chờ nhau. Codex tiếp nhận gói đủ bằng chứng để phát hành Site riêng tư. Giữ migration LIVE_HOLD, không merge main hoặc triển khai Firebase production.

### Quy tắc độc lập từ đầu đến cuối

- Mỗi luồng sở hữu một kết quả hoàn chỉnh: khảo sát → môi trường chạy được → mã → test/browser → sửa lỗi → bằng chứng đúng SHA.
- Trước khi phân luồng phải xác nhận mỗi luồng tự kiểm được bằng baseline và giao diện đã có. Nếu phải chờ luồng khác thêm selector/CSS/state/transaction thì gộp phạm vi gắn chặt vào một owner hoặc chuẩn bị giao diện ổn định trước khi giao.
- Không ghi DONE khi chỉ có code; thiếu kiểm thử bắt buộc phải ghi IN_PROGRESS/BLOCKED kèm điều kiện gỡ chặn. Không dồn toàn bộ việc kiểm thử worker chưa làm sang tổng chỉ huy.
- Tổng chỉ huy nhận các đầu ra đã tự kiểm để review, tích hợp và nghiệm thu kết hợp. Nghiệm thu kết hợp ở cuối là mốc chung, không phải điều kiện để worker bắt đầu hoặc tự hoàn tất.
- Các đoạn phân bốn worker bên dưới là hợp đồng lịch sử của đợt đã tích hợp. Với công việc tiếp tục, quy tắc tại mục này có ưu tiên; không tạo chat hoặc lịch nền mới.

Repo: `cavoixanh638/HopHDND-WebApp`. Baseline chung `d8c994c44f7bd11b685d82f8f955ffab99065ea9` trên `ui/20261104-coordination`. Mã và test tích hợp cuối đã PASS tại `3bfb28e0f8496732424898ae6186ea807af961fb`; chênh lệch đến baseline chỉ là ba file tài liệu. PR #155 vẫn draft, chưa merge. Không làm lại tính năng đã PASS nếu delta mới không tác động.

## Đích cuối

Sửa mã vị trí và mã con, picker, cấp trình/trạng thái Thành ủy, căn lề và độ rộng cụm Tiến độ 3 khâu. Ảnh người dùng 05/11 cho thấy cụm hai track readonly vẫn rộng gần trọn cột, ô dropdown ở hàng đầu giãn rất dài và các nhãn/giá trị trong những hàng kế bị lệch trục dọc. Bản tích hợp phải có test/CI đúng SHA, screenshot và số đo ở list/popup, 1440/900/390 px, admin/guest/quyền hỗn hợp; gói HTML QA mới có SHA-256; Site demo riêng tư hiện có được cập nhật **nếu có quyền Sites** và xác minh version/deployment/URL. Không ghi Firebase thật trong đợt này; chuẩn bị/test migration để chạy khi UI được duyệt triển khai production. Không merge main, không deploy Firebase Hosting/production.

Site hiện có `appgprj_6ae93f17c2e48191815caef8a642fa14` vẫn v2 từ source commit `e975c4e3906ecea525d51e73a9153e82569b46cc` khi kiểm; chưa chứa REV2. Không gọi toàn việc DONE nếu Site chưa được cập nhật hoặc không có bằng chứng.

## Hợp đồng cố định để làm song song

- Mã top-level cố định theo **ý nghĩa**, không theo thứ tự kéo cột: L03 = Tiến độ 3 khâu, L04 = Lãnh đạo/Phòng/CV, L06 = Ghi chú. Các vùng khác cũng phải có mã. Mỗi ô/field/control trong vùng có mã con riêng, kể cả ô gộp và popup. Chỉ admin ở chế độ xem mã thấy mã của **ô đang hover/focus**, bên trong đúng ô, có nút sao chép; guest không thấy. Không gắn mã theo vị trí index hàng/cột; với ô lặp dùng ID bản ghi ổn định để phân biệt instance. Worker UI thêm `data-ui-reference-part` ở các subfield L01/L03 nếu cần; Worker REF chỉ sở hữu registry/overlay, không sửa component worker UI.
- Picker mẫu là ô **Lãnh đạo UBND**: cùng khối control, kích thước, border, caret, hover/focus/open/keyboard và hit area cho Sở trình, Loại Văn bản, Cấp trình TU, Tiến độ Thành ủy, Trình Xây dựng NQ, Trình ban hành NQ. Giữ màu nền và chữ trạng thái tiến độ. UI worker sở hữu phần trình bày; DATA worker sở hữu danh mục và transaction. Không có giá trị `BTV TU` hay `Không phải trình` trong danh mục cấp trình mới.
- Danh mục cấp trình mới: `Không`, `TTTU`, `BTV`, `BCH`. `Không` ép Tiến độ Thành ủy thành `Không phải trình` và khóa sửa riêng trạng thái này. Đổi `Không` sang một cấp khác ép trạng thái thành `Sở chưa trình`. Một người chỉ có quyền sửa cấp trình vẫn được thao tác trọn giao dịch phụ thuộc này; server kiểm ngoại lệ hẹp, không mở quyền sửa tiến độ tùy ý. DATA worker định nghĩa contract này, commander nối App.tsx sau khi worker ngừng ghi.
- Cụm L03 có hai mode: readonly cấp trình = hai track (nhãn, tiến độ), editable cấp trình = ba track (nhãn, cấp trình, tiến độ). Toàn cụm có **hai độ rộng lưu riêng** do admin chỉnh, một cho mỗi mode; không có resize từng track. Cột vật lý trong bảng vẫn chung cho mọi hàng: nếu quyền hỗn hợp cần chiều rộng lớn hơn thì dùng ngưỡng phù hợp, nhưng nội dung hai track không giãn ra khoảng trắng. Không dùng `1fr` để kéo dropdown trạng thái tràn toàn cụm. Dropdown cấp trình vừa tối đa 5 ký tự cùng caret/padding; ba dropdown tiến độ cùng kích thước, vừa nhãn dài nhất cùng caret/padding. Căn nhãn/giá trị theo từng hàng cả read-only.
- WIDTH worker lưu và áp độ rộng toàn cụm qua layout settings, chịu trách nhiệm cột vật lý. UI worker giữ grid nội bộ compact, tiêu thụ width từ container và không sở hữu state/persistence. Khi 2/3 mode cùng có trong một bảng, WIDTH worker tính cột vật lý theo mode cần rộng nhất, UI worker vẫn giữ nội dung mode 2 gọn. Hai việc bắt đầu độc lập từ baseline và hợp đồng này.
- Migration target sau này: Firebase project `hophdnd-8b7b2`, RTDB `hophdnd-8b7b2-default-rtdb`. Đợt này chỉ chuẩn bị script dry-run, kiểm đếm, backup manifest, test Emulator, idempotency và rollback. Chuyển dữ liệu cũ `partyLevel: Không phải trình → Không`, `BTV TU → BTV`; với cấp `Không`, trạng thái Thành ủy = `Không phải trình`. Kiểm kê alias khác trước khi quyết định mapping. **Không chạy lệnh ghi live**, không sửa Excel.

## Quy tắc GitHub

Khởi chạy đồng thời bốn worker và một tổng chỉ huy trên năm nhánh riêng; không worker nào cần đợi code của worker khác để bắt đầu. Mỗi worker là writer duy nhất của nhánh và checkpoint `source/docs/tasks/parallel-20261105-ui/checkpoints/<ID>.md` trên nhánh mình. Commander là writer duy nhất của TRACKER và checkpoint commander trên nhánh điều phối; không sửa file worker lúc họ đang ghi. Worker commit/push checkpoint sau thay đổi có ý nghĩa, kết quả test, lỗi/chặn, trước tác vụ dài và trước khi dừng. Chat thay thế đọc cùng entrypoint/checkpoint/HEAD, không reset về baseline. Chỉ ghi DONE với diff, test đúng code SHA, link run/artifact và tiêu chí; nếu chưa đạt, ghi IN_PROGRESS và việc còn thiếu. Không tạo lịch chạy nền: người dùng đã nói đợt này làm xong luôn; checkpoint theo sự kiện trong lúc chat hoạt động.

## Bằng chứng nghiệm thu

Unit/typecheck/build; Chrome real App trên list/popup 1440/900/390, chuột/bàn phím, admin/guest/quyền hỗn hợp; Firebase Emulator cho permission/transaction; ảnh và `getBoundingClientRect()` cho hai/ba track, chiều rộng cột vật lý và trạng thái. Commander chỉ nhận PASS trên SHA cuối sau tích hợp; test cũ là baseline, không phải bằng chứng delta mới. Package hash phải tính từ artifact thật. Nếu công cụ Sites không có, ghi SITE_PENDING và điều kiện gỡ chặn, không giả deploy.
