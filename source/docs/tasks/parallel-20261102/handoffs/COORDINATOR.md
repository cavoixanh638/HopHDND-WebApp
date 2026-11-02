# Checkpoint — điều phối 5 luồng / tiếp quản giai đoạn tích hợp

- Status: REVIEW_DONE / INTEGRATION_NOT_STARTED; ngày 02/11/2026 Asia/Saigon, quy ước v3.
- Chủ sở hữu bước kế: chat điều phối tiếp quản file này, một writer.
- Lưu: REMOTE, nhánh tài liệu `docs/parallel-workstreams-20261102`.
- Đọc [quy ước](../QUY_UOC_CHUNG.md), [skill](../skill/parallel-workstreams/SKILL.md),
  [review + bảng nhánh/SHA/bằng chứng](../reviews/REVIEW_5_STREAMS_2026-11-02.md),
  rồi `source/AGENTS.md` tại checkout. Không nạp toàn bộ lịch sử chat/log.
- Mốc chung `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Đích cuối: một candidate tích hợp đầy đủ 5 phần, gate liên quan PASS đúng SHA,
  gói phát hành dựng lại từ SHA đó có checksum và hướng dẫn/bàn giao để review.
- DONE chỉ khi đủ cả mã ghép, bằng chứng gate, artifact và bàn giao; không dừng
  ở tạo nhánh, ghép xong, hoặc vừa khởi chạy CI. Không dùng artifact Chat 5 cũ.
- Chưa có candidate tích hợp; chưa chạy gate tích hợp hoặc dựng artifact mới.

## Đã hoàn tất / không làm lại
- Chat 1/2/3 DONE; Chat 4/5 DONE phần độc lập, gap production ngoài phạm vi.
- CI đúng code SHA từng luồng đã kiểm; các thay đổi mã không chồng file.
- COORD-01 CLOSED: Chat 3 tested SHA `04568fd30a8be59f269be58f03d0dcc2cb72de85`,
  [CI 41426155660](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41426155660)
  SUCCESS; Windows path 15/15, real CLI 6/6; Linux path/preflight/CAS/lost ACK PASS.
- Windows Firebase CAS NOT RUN; đây không phải tiêu chí bắt buộc của sửa path guard.
- Post-test Chat 3 chỉ docs. Điều phối đóng entrypoint trên nhánh tài liệu/nhánh luồng.
- Skill v3 đã cài `C:/Users/HP/.codex/skills/parallel-workstreams`, validator PASS,
  khớp bản workspace `coordination-skills/parallel-workstreams` và mirror GitHub.
- Quy ước v3 đồng bộ cả 5 nhánh. Quy định mục tiêu/điều kiện DONE và báo đổi chat
  chủ động đã lưu. Lỗi auto-review hết credits phiên trước đã gỡ, không còn chặn cài skill.

## WIP / trạng thái tiếp quản
- Không có runtime local sửa dở hay CI do điều phối khởi chạy cần theo dõi.
- Không ghi đè checkpoint worker. Xác minh HEAD/dirty/CI trước tích hợp.
- Branch worker: `parallel/20261102-chat1-backend`, `chat2-ui`, `chat3-bootstrap`,
  `chat4-backup`, `chat5-release` (các tên rút gọn đều có prefix `parallel/20261102-`).
- Lưu code và checkpoint theo mốc; nếu bị chặn, ghi bằng chứng/đầu vào cần thiết,
  tiếp tục phần độc lập, không gắn DONE khi còn tiêu chí bắt buộc thiếu.

## Bước tiếp theo đến khi đủ đích
1. Tạo candidate riêng từ mốc chung, chọn các thay đổi đã review của 5 nhánh,
   xử lý xung đột tài liệu; giữ nguyên nhánh worker, đưa COORD-01 fix vào bản ghép.
2. Chạy gate liên quan trên SHA ghép (backend/full Rules, UI/full App, CLI kể cả
   path Windows, backup restore, release); tự xử lý lỗi tích hợp và kiểm lại phần ảnh hưởng.
3. Dựng lại gói từ đúng integration SHA, kiểm checksum/reproducibility, lưu
   artifact/run URL và tài liệu review/draft PR nếu cần; cập nhật checkpoint đủ tiêu chí.

## Giới hạn
Không merge main/PR147, deploy, publish, truy cập/ghi production hoặc tự GO.
Đổi chat chỉ là tiếp quản; không mở lại 5 luồng hoặc lặp test nhánh riêng đã PASS.
