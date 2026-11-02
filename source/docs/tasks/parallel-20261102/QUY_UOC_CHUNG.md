# Quy ước chung — 5 luồng độc lập, chạy đồng thời

Ngày lập: 02/11/2026. Múi giờ báo cáo: Asia/Saigon.
Repository: `cavoixanh638/HopHDND-WebApp`.
Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`.

## Mục tiêu và nguyên tắc

Người dùng yêu cầu mỗi chat nhận **một phần việc trọn vẹn**, tự khảo sát, sửa,
kiểm thử và bàn giao; cả năm chạy đồng thời. Không tổ chức chuỗi Chat 1 sửa →
Chat 2 kiểm → Chat 1 sửa tiếp. Mỗi luồng tự chịu trách nhiệm kiểm thử phần mình.
Người điều phối tổng hợp, giải quyết vấn đề liên phạm vi và kiểm tra bản tích hợp cuối.

Đây là tài liệu điều phối, không phải xác nhận production đã sẵn sàng.
Không tự thêm tính năng, đổi chính sách nghiệp vụ, thiết kế lại sản phẩm hoặc tạo
việc chỉ để đủ số luồng. Nếu phần được giao đã đúng và có bằng chứng phù hợp,
có thể kết thúc bằng kết luận không cần sửa.

## Đích cuối và điều kiện hoàn tất — v3 (02/11/2026)

Mỗi nhiệm vụ phải ghi kết quả cuối, chủ sở hữu/phạm vi độc lập, tiêu chí nghiệm
thu đo được và nơi lưu bằng chứng. Luồng tự làm từ khảo sát đến sửa, kiểm thử,
sửa lỗi phát hiện và bàn giao; không dừng ở chẩn đoán, commit hoặc khởi chạy CI.
DONE chỉ khi mọi tiêu chí bắt buộc đạt trên bản mã cuối. Thiếu kiểm thử bắt buộc
thì chưa DONE; khi bị chặn phải ghi nguyên nhân, bằng chứng, đầu vào/người gỡ chặn
và bước tiếp tục, đồng thời hoàn thành phần độc lập còn lại.
DONE_WITH_EXTERNAL_GAPS chỉ dùng cho gap ngoài phạm vi sau khi phần được giao đạt.
Điều phối phát hiện việc còn thiếu phải giao chủ sở hữu, cập nhật file nhiệm vụ
và prompt có điều kiện đóng trong cùng lượt, không chờ người dùng nhắc.
Đích chung là candidate tích hợp đủ năm phần, gate liên quan đạt đúng SHA,
gói phát hành dựng lại từ SHA đó và bàn giao dùng được; không đồng nghĩa quyền
merge/deploy/production. Năm luồng DONE riêng chưa chứng minh đích chung đã đạt.

## Bắt đầu và tiếp tục sau khi đổi chat

1. Đọc file nhiệm vụ của đúng luồng, file quy ước này và checkpoint tương ứng
   tại `handoffs/CHAT_N.md` **trên nhánh của luồng**, không lấy bản khởi tạo
   từ nhánh tài liệu thay cho checkpoint mới nhất.
2. Đọc `source/AGENTS.md` của checkout và tài liệu kỹ thuật liên quan.
   Các chỉ dẫn lịch sử không phải trạng thái hiện tại; chỉ đọc sâu phần cần dùng.
   Chỉ thị mới của người dùng có ưu tiên.
3. Xác nhận remote, nhánh, HEAD và trạng thái file chưa commit. Kiểm tra xem có
   một chat khác còn đang ghi cùng nhánh/worktree không; mỗi luồng chỉ có một
   chat chủ động ghi. Đổi chat là thay người thực hiện, không mở hai writer cùng luồng.
4. Lần đầu: dùng nhánh riêng đã chuẩn bị trong bảng dưới. Các nhánh này xuất phát
   từ cùng mốc mã nguồn nêu trên cộng bộ tài liệu điều phối; khác SHA do docs
   không có nghĩa là runtime đã đổi.
5. Khi tiếp tục: dùng **HEAD hiện tại của nhánh luồng** và checkpoint; không reset
   về mốc xuất phát, không tạo nhánh mới rồi bỏ công việc cũ. Nếu nhánh bị đổi tên,
   người điều phối cập nhật đường dẫn; không tự đoán.
6. Kiểm chứng checkpoint bằng git/CI. Đọc phần “Bước tiếp theo” rồi làm tiếp,
   không yêu cầu người dùng kể lại toàn bộ hội thoại. Nếu trạng thái DONE và không có nhiệm vụ tiếp tục mới, báo
   kết quả hiện có; không tự tạo vòng công việc mới.

| Luồng | Nhánh cố định | Checkpoint |
|---|---|---|
| Chat 1 | `parallel/20261102-chat1-backend` | [CHAT_1.md](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat1-backend/source/docs/tasks/parallel-20261102/handoffs/CHAT_1.md) |
| Chat 2 | `parallel/20261102-chat2-ui` | [CHAT_2.md](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat2-ui/source/docs/tasks/parallel-20261102/handoffs/CHAT_2.md) |
| Chat 3 | `parallel/20261102-chat3-bootstrap` | [CHAT_3.md](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat3-bootstrap/source/docs/tasks/parallel-20261102/handoffs/CHAT_3.md) |
| Chat 4 | `parallel/20261102-chat4-backup` | [CHAT_4.md](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat4-backup/source/docs/tasks/parallel-20261102/handoffs/CHAT_4.md) |
| Chat 5 | `parallel/20261102-chat5-release` | [CHAT_5.md](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat5-release/source/docs/tasks/parallel-20261102/handoffs/CHAT_5.md) |

Dùng worktree/thư mục riêng cho từng nhánh. Khi chạy Emulator đồng thời trên cùng
máy, mỗi luồng dùng cổng, thư mục tạm và namespace demo riêng; không kill tiến trình
của luồng khác. Cấu hình tạm đặt ở thư mục QA riêng của luồng, không sửa cấu hình
dùng chung chỉ để đổi cổng. Emulator phải bị giới hạn vào localhost/demo.

## Ranh giới và tránh đụng file

- Chỉ sửa vùng sở hữu trong file nhiệm vụ. Thành phần ngoài phạm vi là đầu vào
  cố định từ bản xuất phát; không chờ kết quả chat khác, không tự cherry-pick nhánh khác.
- Không sửa API/schema/quyền nghiệp vụ để “lách” giới hạn phạm vi.
- Nếu lỗi bên ngoài thực sự chặn một kiểm tra: lưu tái hiện, expected/actual, bằng
  chứng và người sở hữu trong checkpoint; hoàn thành phần độc lập còn lại. Mục
  bị chặn ghi NOT RUN/BLOCKED, không mock rồi gọi là tích hợp PASS. Kết thúc có
  bàn giao rõ ràng cho người điều phối, không chờ chat khác vô thời hạn.
- Chỉ Chat 5 sửa workflow/cấu hình phát hành dùng chung. Chat N có thể tạo
  `.github/workflows/parallel-chatN-*.yml`, `source/parallel-qa/chatN/` và báo cáo
  riêng cho mình. Workflow mới chỉ chạy test; không có đường deploy/publish.
- `source/package.json`, root lockfile, module dữ liệu/domain dùng chung,
  `source/AGENTS.md`, tài liệu tổng trạng thái và file nhiệm vụ của luồng khác
  không thuộc quyền sửa của bất kỳ luồng nào trong đợt này. Báo thay đổi cần thiết
  cho người điều phối. Chat 1 được sửa package/lock riêng của hai service khi cần.
- Mỗi luồng chỉ cập nhật `handoffs/CHAT_N.md` và
  `reports/CHAT_N.md` của mình. Không sửa README/quy ước/file vai trò trung tâm.
  Người điều phối cập nhật chỉ mục và trạng thái tổng khi tích hợp.

## Thực hiện và kiểm chứng

Đọc bằng chứng sẵn có trước khi làm. Dùng dependency hiện có, kiểm thử có ý nghĩa
cho phần thay đổi. Không chạy lại toàn bộ suite khi không có thay đổi hoặc nghi
vấn; nhưng hoàn tất những gate bắt buộc áp dụng cho bản sửa.

Không dừng ở kế hoạch, chẩn đoán hoặc “đã khởi chạy CI” nếu vẫn có thể tiếp tục.
Theo dõi CI do mình khởi chạy đến kết quả cuối; nếu bị giới hạn thực sự thì lưu
run URL/ID, SHA và bước tiếp tục. Không sửa expected, skip/xfail hoặc nới Rules
chỉ để làm xanh kiểm thử. Không báo PASS cho bước chưa thực hiện.

Bằng chứng gắn với SHA được kiểm thử. Commit chỉ sửa bàn giao sau đó được phép,
nhưng phải ghi rõ tested code SHA và các commit docs-only sau nó; không gán kết
quả cho mã mới chưa chạy. Tự kiểm diff cuối để không lẫn file ngoài phạm vi.

## Checkpoint chủ động — v2 (02/11/2026)

**Hit limit có thể xảy ra mà người dùng không biết trước. Không chờ gần hết context.**
Đây là giao thức chat chủ động ghi trong lúc chạy, không phải chức năng autosave
nền của ứng dụng; không thể bảo đảm cứu phần chưa lưu giữa hai mốc.

### Khi nào lưu

- Lưu checkpoint đầu tiên trước khi bắt đầu làm sâu.
- Trước việc dài/không rõ thời lượng: ghi việc sắp chạy, code SHA, bước kiểm tra
  tiếp; vừa có run/session ID hoặc URL thì bổ sung ngay, trước khi chờ kết quả.
- Sau một batch sửa nhỏ, quyết định quan trọng, tái hiện có ích hoặc kết quả CI.
- Nếu chưa có mốc: sau khoảng **5 lượt công cụ có công việc mới** hoặc khoảng
  **10 phút đang làm quan sát được**, tùy điều nào tới trước. Đây là mặc định
  vận hành, không phải timer nền hay SLA. Gộp một lần ghi ở cuối batch.
- Trước khi nhường lượt/dừng/đổi chat. Không cần người dùng nhắc hoặc canh context.
- Không có thay đổi hữu ích thì không tạo checkpoint/commit mới hoặc polling liên tục.

### Lưu gì để tiết kiệm token

Giữ khoảng **20–40 dòng** (mục tiêu 300–600 từ trở xuống): status, nhánh,
code SHA/tested SHA, 3 ý đã làm, quyết định cần giữ, file WIP/chưa push,
CI/run ID và trạng thái, tối đa 3 bước kế tiếp thực thi được.
Log dài/ảnh/lịch sử để ở artifact hoặc Git, không chép hội thoại vào checkpoint.
Chat mới đọc quy ước + nhiệm vụ + checkpoint rồi chỉ tra code/log cần thiết.

### Lưu mã và đồng bộ lên GitHub

- Lưu file làm việc sau batch; kiểm diff rồi commit/push đúng đường dẫn sở hữu
  lên nhánh riêng tại mốc an toàn. Có thể lưu WIP với TEST_PENDING/FAIL rõ ràng;
  không đợi full CI xanh mới lưu công việc và không git add toàn repo.
- Checkpoint không thay cho bản sao mã nguồn. Mã chưa commit/push phải được ghi
  LOCAL_ONLY kèm worktree/path và việc còn dở; không tuyên bố GitHub đã lưu mã đó.
- Nếu dùng connector: fetch current blob SHA rồi update checkpoint của mình.
  Khi có conflict, đọc lại để bảo toàn nội dung mới; không force-push/reset.
- Ghi code SHA đã tồn tại, không vòng lặp để ghi SHA chính commit checkpoint.
  Docs-only commit sau tested SHA được ghi riêng, không coi là code đã kiểm mới.
- Không chạy lại test chỉ vì handoff đổi. Workflow mới của luồng nên lọc phạm vi
  phù hợp để handoff-only không tự tạo CI thừa; không bỏ required checks hoặc
  tự sửa workflow dùng chung ngoài phạm vi.
- Nếu không push được, giữ checkpoint local, báo rõ LOCAL_ONLY; hoàn thành phần
  độc lập còn lại. Không hứa chat mới chỉ đọc GitHub thấy phần chưa đẩy.

### Khi đổi chat

Chủ động báo nên đổi ở mốc khép lại giai đoạn, trước giai đoạn kế tiếp chỉ cần
checkpoint ngắn, hoặc khi lịch sử không còn cần thiết khiến phải đọc lại nhiều.
Trước khi báo: lưu mã/nhánh/SHA, đích cuối, tiêu chí còn thiếu, WIP/run đang chạy
và một câu tiếp quản qua file nhiệm vụ. Không chờ người dùng canh hit limit,
không đoán % context hay hứa tiết kiệm credits. Không đổi chat liên tục hoặc dùng
việc đổi chat để dừng giữa chừng; đề nghị đổi không đồng nghĩa DONE.


Dùng lại link nhiệm vụ cũ; checkpoint trên nhánh luồng là nguồn tiếp tục.
Xác nhận trạng thái Git/CI trước khi làm, không reset hoặc lặp lại test đã đủ
bằng chứng. Nếu DONE và không có nhiệm vụ tiếp tục mới thì báo kết quả hiện có, không tự mở vòng việc mới.

Mẫu: [HANDOFF_TEMPLATE.md](HANDOFF_TEMPLATE.md).
Trạng thái: NOT_STARTED, IN_PROGRESS, BLOCKED_EXTERNAL, DONE,
DONE_WITH_EXTERNAL_GAPS. Có gaps không có nghĩa production đã sẵn sàng.

### Quy ước được cập nhật trong lúc các chat đang làm

Người điều phối cập nhật file quy ước này khi có chỉ thị mới. Chat đang làm
kiểm tra phiên bản quy ước lúc bắt đầu/tiếp quản và sau mỗi mốc lớn; nếu có
blob SHA mới chỉ đọc phần thay đổi, không nạp lại toàn bộ bộ tài liệu.
Thay đổi file không tự làm một chat đang chạy đọc lại; khi cần áp dụng ngay,
người dùng gửi một câu nhắc đọc quy ước v3. Không cần gửi lại nhiệm vụ.

## Hoàn tất một luồng

Bàn giao nhánh, code SHA, thay đổi hoặc kết luận không cần sửa, kiểm thử đã chạy,
bằng chứng, tài liệu/công cụ dùng được, và vấn đề ngoài phạm vi. Có thể mở/cập nhật
draft PR riêng nếu cần review, nhưng không merge. Không lấy việc reviewer chat
khác chưa trả lời làm lý do trì hoãn phần đã có thể tự hoàn thành.

## Giới hạn áp dụng cho cả năm luồng

Không merge main/PR147, deploy, publish, truy cập hoặc ghi production, sử dụng
credential thật, đổi nguồn dữ liệu thật hoặc tự phê duyệt GO. Dùng dữ liệu tổng hợp,
Auth/RTDB/Functions Emulator cho kiểm tra tích hợp. Không khôi phục snapshot cũ
đè lên chỉnh sửa đã ACK. Không force-push/reset nhánh người khác.

Không tự gửi tin nhắn/comment cho người khác nếu người dùng chưa yêu cầu.
Bàn giao qua file/nhánh riêng đủ để người điều phối đọc. Việc tích hợp cuối
và các điều kiện production thuộc người điều phối/chủ dự án, không phải phụ
thuộc giữa năm luồng trong lúc làm.
