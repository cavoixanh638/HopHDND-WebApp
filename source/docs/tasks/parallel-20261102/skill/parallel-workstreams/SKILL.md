---
name: parallel-workstreams
description: "Phân việc cho nhiều luồng chat độc lập, theo dõi bàn giao và tiếp tục sau hit limit bằng checkpoint ngắn; cập nhật quy ước điều phối theo phản hồi của người dùng."
---

# Điều phối luồng độc lập

Dùng khi người dùng yêu cầu phân/giao việc nhiều chat, kiểm tiến độ, đổi chat vì
hit limit hoặc cập nhật quy ước làm việc song song. Không áp dụng cho mọi việc
lập trình đơn lẻ chỉ vì có nhắc Codex.

Đọc [quy ước đã chốt](references/user-preferences.md) một lần khi bắt đầu.
Khi làm việc dài hoặc tiếp quản, đọc [checkpoint](references/checkpoint.md).
Không nạp tất cả báo cáo, lịch sử chat hoặc log CI vào context.

## Phân việc

Chia theo sản phẩm/phạm vi hoàn chỉnh: mỗi luồng tự khảo sát, sửa, kiểm thử và
bàn giao. Không biến các chat thành chuỗi implement → reviewer → implement.
Dùng ít luồng đủ hữu ích; 5–7 là khả năng được người dùng chấp nhận, không là
chỉ tiêu phải lấp đầy. Không giao việc trùng lặp hoặc tính năng chưa được yêu cầu.

Ghim cùng baseline đã có; mỗi luồng một nhánh/worktree và vùng file sở hữu không
chồng nhau. Xác định API/input cố định, kiểm thử riêng, đầu ra và điều kiện xong.
Nếu hai phạm vi không thực sự độc lập, gộp chúng hoặc để điều phối xử lý giao diện
chung trước; không hứa “độc lập” rồi bắt các luồng chờ nhau. Tích hợp bản cuối là
trách nhiệm điều phối, không phải gate bắt đầu của worker.

Khi được yêu cầu lưu vào GitHub: một file quy ước chung riêng, một entrypoint
cho mỗi luồng, checkpoint bền vững riêng và mục lục. Mỗi entrypoint phải tự chỉ
ra role, nhánh, baseline, checkpoint mới nhất và cách tiếp tục. Dùng lại cùng link
khi thay chat; không bắt người dùng chép lại hội thoại.

## Đích cuối và điều kiện đóng việc

Trước khi giao, mỗi nhiệm vụ phải ghi rõ: (1) kết quả cuối người dùng nhận được,
(2) chủ sở hữu và phạm vi độc lập, (3) điều kiện hoàn tất kiểm chứng được,
(4) bằng chứng/đầu ra phải lưu và nơi bàn giao. Tránh chỉ giao hoạt động như
“kiểm tra”, “rà soát”, “sửa tiếp” mà không nêu thế nào là đạt.

Worker tự đi hết khảo sát → thực hiện → kiểm thử → sửa lỗi phát hiện → kiểm lại
phần bị ảnh hưởng → lưu/bàn giao. Không kết thúc chỉ vì đã tìm nguyên nhân,
đề xuất cách sửa, commit mã hoặc khởi chạy CI khi còn bước làm được trong phạm vi.
Nếu nhiệm vụ chỉ là review, đầu ra cuối là kết luận có bằng chứng và việc xử lý
cụ thể; không tự sửa vượt phạm vi. Điều phối phát hiện việc còn thiếu phải chỉ
định chủ sở hữu, cập nhật file nhiệm vụ và đưa prompt thực thi được trong cùng
lượt; không chỉ liệt kê lỗi rồi đợi người dùng nhắc giao việc.

Chỉ ghi DONE khi mọi tiêu chí bắt buộc đã đạt và bằng chứng gắn với bản cuối.
Nếu còn tiêu chí chưa đạt, giữ IN_PROGRESS; khi thực sự bị chặn, ghi trở ngại,
đã thử gì, ai/đầu vào nào gỡ chặn và bước tiếp tục, hoàn thành phần độc lập còn lại.
DONE_WITH_EXTERNAL_GAPS chỉ dùng khi mọi tiêu chí trong phạm vi đã đạt và gap
nằm ngoài phạm vi; không dùng để che kiểm thử bắt buộc chưa chạy. Không tự mở
rộng phạm vi hoặc xin thêm quyền chỉ để gọi là xong.

Điều phối phải xác định cả đích cuối chung và tiêu chí nghiệm thu bản tích hợp:
các luồng DONE không đồng nghĩa toàn bộ công việc DONE. Tiếp tục phần tích hợp
đã được giao; nếu cần giao tiếp, để lại nhiệm vụ có chủ sở hữu và điều kiện đóng.
Khi tiêu chí đã đủ thì kết thúc, không mở vòng audit hoặc chia việc mới vô hạn.

## Tiếp tục và theo dõi

Đọc entrypoint + checkpoint trước, xác nhận HEAD/dirty files/run đang có.
Tiếp tục từ nhánh luồng hiện tại; không reset về baseline, không tạo lại công việc.
Nếu DONE và không có nhiệm vụ tiếp tục mới được giao, trả kết quả hiện có thay vì
tự mở vòng audit mới. Một luồng chỉ một writer;
chat mới thay chat cũ, không song song ghi cùng nhánh.

Worker tự checkpoint theo sự kiện, không chờ cảnh báo context và không nhờ người
dùng canh giờ. Với chat chỉ dùng GitHub connector, ghi checkpoint trực tiếp bằng
current blob SHA; với checkout local, lưu local sớm và push tại ranh giới an toàn.
Không force-push để vượt xung đột. Chi tiết trong reference.

Chủ động đề nghị đổi chat ở mốc bàn giao an toàn khi đã xong một giai đoạn và
giai đoạn kế chỉ cần checkpoint ngắn, hoặc lịch sử/log không còn liên quan làm
việc tiếp tục phải đọc lại nhiều. Trước khi đề nghị, lưu mã, đích cuối, tiêu chí
còn thiếu, run đang chạy và câu lệnh tiếp quản một link theo reference checkpoint.
Không dùng đổi chat làm lý do dừng việc còn làm được giữa chừng; không đổi liên
tục sau vài lượt, không tự tạo chat mới. Không đoán % context/token còn lại hoặc
hứa mức tiết kiệm nếu không có số đo; đây là khuyến nghị theo mốc công việc.

Khi người dùng báo “xong”: đọc bằng chứng/CI đúng code SHA và diff cần thiết,
phân biệt DONE/FAIL/NOT RUN. Không chỉ tin nhãn “xong”, nhưng cũng không lặp lại
mọi test nếu không có thay đổi hoặc nghi vấn. Báo một danh sách việc còn lại có
chủ sở hữu, không chia lại thành chuỗi chat kiểm qua kiểm lại.

## Giới hạn và tính trung thực

Không hứa skill tự chạy sau khi ứng dụng dừng, biết chính xác lúc hit limit,
hoặc khôi phục được phần chưa ghi ra ngoài. Checkpoint chỉ giảm cửa sổ mất việc.
Không cài daemon, hook hoặc automation nền nếu chưa được yêu cầu; không dùng một
chat phụ chỉ để đếm token hoặc polling liên tục.

Phạm vi commit/push/PR theo ủy quyền nhiệm vụ. Phân việc không tự cấp quyền merge,
deploy, production hoặc gửi tin nhắn cho người khác. File public không chứa
secret/dữ liệu thật; lưu mã WIP chỉ sau khi kiểm diff thuộc phạm vi.

## Cập nhật từ trao đổi thực tế

Người dùng đã yêu cầu duy trì skill này. Khi họ chốt quy tắc điều phối mới:
1. Ghi thay đổi nhỏ vào đúng mục của skill/reference trong cùng lượt nếu có thể;
   sửa/bỏ quy tắc lỗi thời, không nối lịch sử hội thoại dài.
2. Chỉ lưu nguyên tắc dùng lại; URL repo, SHA, tình trạng CI thuộc tài liệu dự án.
   Không biến một ví dụ hay suy đoán của assistant thành sở thích đã được chốt.
3. Đồng bộ bản GitHub nếu có bản mirror được ủy quyền; cập nhật quy ước dự án
   liên quan bằng thay đổi docs hẹp, không đè checkpoint/nhánh runtime đang hoạt động.
4. Kiểm tra frontmatter/link và nói ngắn gọn đã cập nhật gì, ở đâu.
   Nếu thiếu quyền/truy cập, báo rõ bản nào chưa đồng bộ; không nói “đã nhớ” suông.

Thay đổi file không làm chat đang chạy tự đọc lại. Nếu không được ủy quyền gửi
hướng dẫn trực tiếp, đưa người dùng một câu nhắc ngắn kèm link quy ước mới.

