# Review lần 3 — CI PASS, còn tiêu chí mã ổn định chưa đạt

## Trạng thái đã xác minh trực tiếp GitHub

- HEAD khi kiểm: `9cb073bb5752a574782399615ecbd7ac20868dfd`.
- Code/test: `4bccba5992cc36e1cfc3da146711fe718e44adf8`.
- [CI #42060684280](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42060684280): **3/3 SUCCESS**. Đã đọc run và jobs: app-qa `127361197672`, data-emulator `127361242515`, full-app `127361746075`.
- Artifact tồn tại/chưa hết hạn: code+visual+package `13432341158`, full-app `13432047195`, data `13430972026`. API ZIP digest lần lượt `451a99092c32a8e90e87ebad68d9c559b3975984e79f67a443aa8d4ef3b9f7e7`, `6ab6b94de5d8ef44e8b677582d311571e5c90b1c896ed0375944caf2dbc76582`, `af8c6ac45936198f215745c2c86acfe5c4f109c5340210cab12e71c847e2933a`.
- Hash HTML/archive và 10/10 cases, 27 screenshots được commander ghi trong CODEX-SITE-HANDOFF/checkpoint. Lượt review này xác minh CI/job/artifact metadata; không khẳng định đã tải lại và hash từng byte.
- Lỗi Chrome bootstrap và hiển thị/copy numeric marker trước đây đã có CI PASS. **Không làm lại phần này.**
- Site chưa có bằng chứng triển khai; migration LIVE_HOLD.

## Một tiêu chí bị bỏ sót — không được đóng với “chỉ còn Site”

Yêu cầu B trong [REVIEW-2-NUMERIC-CODES.md](REVIEW-2-NUMERIC-CODES.md) chưa thực hiện.
Đã đọc `source/src/domain/report-reference-identity.ts` cả tại code SHA `4bccba5` và HEAD, blob cùng `09ffe8c907129325c6e1daa268946e52426fdedc`.
Hàm vẫn dùng `if(!prior||id<prior)anchors.set(label,id)` và trả `record:+id`.

Ví dụ nhóm còn tồn tại với r02/r03: chuyển hoặc xóa r02 => mã hàng đổi từ record:r02 sang record:r03. Thêm r01 cũng đổi mã. Đây là hệ quả thuật toán, không suy từ màu CI. CI đang xanh nhưng không chứng minh yêu cầu mã cố định qua thay đổi thành viên nhóm. Không nhận toàn bộ REF DONE cho tiêu chí này.

## Phần còn lại — một owner làm trọn, không tạo chuỗi chờ

**Owner thực thi: chat Gemini tổng chỉ huy hiện có**, trên nhánh coordination đã tích hợp. Đây là sửa sót trong bàn giao đang mở, không cần mở thêm chat/luồng hay giao lại bốn worker. Luồng này tự khảo sát model → sửa identity và đường lưu/renderer cần thiết → viết test nghiệp vụ → chạy browser/CI → sửa lỗi → dựng gói/bàn giao. Không chỉ gửi contract rồi chờ worker khác nối mã.

1. Dùng ID nhóm bền vững, namespaced theo loại nhóm, độc lập recordId thành viên/nhãn/thứ tự. Kiểm nguồn cấu hình hiện có để dùng ID thật hoặc registry bền vững; giữ qua đổi tên và reload. Không cần ghi Firebase thật để làm/test; dùng demo/Emulator.
2. Tạo test đỏ trước sửa cho thêm thành viên ID nhỏ hơn, xóa/chuyển thành viên đang làm anchor nhưng nhóm còn tồn tại; sau sửa mã nhóm và ô nghiệp vụ phải giữ. Thêm rename/filter/sort/reload và nhóm khác nhau không trùng. Nếu model chưa có identity để theo dõi rename thì sửa model/đường lưu trong cùng phạm vi, không dùng suy đoán từ tập thành viên.
3. Kiểm browser marker/copy vẫn đúng, không làm hỏng phần đã PASS. Chạy gate bắt buộc trên SHA cuối mới; không chạy lại vòng audit vô hạn cho phần không đổi.
4. Dựng lại gói từ SHA mới PASS và cập nhật manifest/hashes/Site handoff. Xóa kết luận sai “only Site remaining” trong trạng thái hiện hành của TRACKER/checkpoint; giữ lịch sử với nhãn superseded. Cập nhật trạng thái mới ở đầu file, không chỉ nối cuối.
5. Codex nhận gói đủ điều kiện để phát hành Site riêng tư hiện có. Không merge main, không deploy Firebase/Rules production, migration LIVE_HOLD.

## Quy tắc phân luồng đã được người dùng nhắc lại

Mỗi luồng triển khai phải độc lập **từ đầu đến cuối**, gồm môi trường chạy được, mã, test, sửa lỗi và bằng chứng bàn giao. Không gọi worker DONE với code-only rồi chuyển phần test bắt buộc cho commander. Nếu nhiều phần cần cùng renderer/state/backend mới để kiểm được, gộp thành một luồng sở hữu tính năng trọn vẹn hoặc tách giao diện ổn định trước khi giao; không để worker chờ nhau thêm selector/CSS/state/transaction.

Tổng chỉ huy có trách nhiệm tiếp nhận, review và tích hợp các đầu ra đã tự kiểm, sau đó nghiệm thu kết hợp. Bước nghiệm thu kết hợp là mốc cuối chung; không được dùng nó để che việc worker chưa tự hoàn thành. Với phần còn lại hiện tại chỉ có một phạm vi cần sửa nên dùng một owner, không tạo thêm luồng cho đủ số lượng.

## Prompt gửi lại chat tổng chỉ huy

> Đọc REVIEW-3-END-TO-END.md trên ui/20261105-coordination. CI #42060684280 đã PASS 3/3, giữ các phần đạt. Nhưng mục B của REVIEW-2 vẫn chưa sửa: report-reference-identity.ts còn dùng min(recordId), khiến mã thay đổi khi thêm/xóa/chuyển hồ sơ. Bạn tự thực hiện trọn phần còn thiếu từ model/identity/persistence đến renderer, test, Chrome, CI đúng SHA và gói/hash mới; không đợi hay chia tiếp cho luồng khác. Sửa trạng thái tracker đang ghi nhầm chỉ còn Site. Chỉ bàn giao phát hành khi tiêu chí mã cố định này có bằng chứng; không merge main hoặc ghi Firebase production.
