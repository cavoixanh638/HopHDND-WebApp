# Điều phối UI Danh sách — 04/11/2026

## Đích cuối

Sửa các điểm người dùng nêu trong [ảnh vùng tiêu đề và công cụ admin](reference-admin-controls.png) cùng cột Nội dung trình và L03; nghiệm thu trên bản tích hợp cho admin/guest, ô có/không quyền sửa, Danh sách/popup, desktop/900px/390px. Dựng lại Site demo riêng tư hiện có để người dùng thử. Không làm lại phần đã PASS ở đợt 03/11 nếu không bị thay đổi.

**Code baseline cố định:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b` (bản tích hợp 03/11 đã CI PASS). Mỗi chat bắt đầu từ HEAD của nhánh được giao, xác nhận nhánh vẫn chứa baseline; không checkout từ `main`. Nhánh: `ui/20261104-table-layout`, `ui/20261104-admin-controls`, `ui/20261104-coordination`. Tối đa 3 chat đang làm: hai worker độc lập và một tổng chỉ huy. Chỉ tổng chỉ huy gộp nhánh và sửa `TRACKER.md`.

## Ranh giới file

| Chat | File nguồn sở hữu | File riêng được tạo/sửa |
|---|---|---|
| A — Nội dung trình + L03 | `src/features/items/CompactGroupedValue.tsx`, `item-frame.css`, `CellPicker.tsx` nếu thực sự cần | test/screenshot A; `checkpoints/A.md` trên nhánh A |
| B — tùy chọn admin dễ thấy | `src/features/items/ItemList.tsx`, `ItemSummaryCards.tsx`, `admin-list-controls.css`, `src/app/App.tsx`, `src/qa/pr95-full-preview.tsx` nếu cần | test/screenshot B; `checkpoints/B.md` trên nhánh B |
| Tổng chỉ huy | file điều phối ở thư mục này, test/smoke dùng chung sau tích hợp | `TRACKER.md`, `checkpoints/COMMANDER.md`, báo cáo tích hợp |

Không sửa file chat khác khi hai worker đang ghi. Nếu phát hiện cần chỉnh file dùng chung, ghi đề xuất vào checkpoint, gán tổng chỉ huy xử lý sau lúc đóng băng hai nhánh; không tự sửa chồng. Giữ nguyên source field, quyền thực, CAS/lease, màu/highlight, sort và các bảng báo cáo đã PASS.

## Tự lưu và theo dõi trên GitHub

1. Mỗi chat ghi checkpoint đầu tiên ngay khi nhận việc: branch/HEAD, mục tiêu, trạng thái và bước kế. Sau mỗi bản sửa có ý nghĩa, test/CI có kết quả, lỗi/chặn mới và trước khi kết thúc: cập nhật checkpoint của mình rồi push nhánh. Không chờ người dùng nhắc hoặc đợi gần hết context. Không tạo commit rỗng chỉ để báo “vẫn đang làm”.
2. Checkpoint ngắn: `NOT_STARTED | IN_PROGRESS | TEST_PENDING | BLOCKED | DONE`, code SHA, tested SHA, test PASS/FAIL/NOT RUN, link run/artifact, file WIP, tối đa ba bước kế. Nếu không push được, ghi rõ `LOCAL_ONLY` và đường dẫn; GitHub chưa có bằng chứng thì tổng chỉ huy không coi là đã bàn giao.
3. Tổng chỉ huy là writer duy nhất của `TRACKER.md`. Đọc commit/checkpoint/CI hai nhánh theo sự kiện và kiểm tra định kỳ khi chat tổng chỉ huy đang hoạt động; cập nhật tracker ngay khi có thay đổi thực. Ghi từng yêu cầu có chủ sở hữu, SHA, trạng thái, bằng chứng và bước còn thiếu. Không chỉ tin lời nhắn “xong”. Chat ngừng hoạt động thì GitHub giữ mốc đã push; không hứa cập nhật nền khi không có chat đang chạy.
4. Mỗi worker tự khảo sát → sửa → kiểm thử → sửa lỗi → kiểm lại → bàn giao. Chỉ ghi DONE khi tiêu chí bắt buộc đạt trên code SHA cuối. Nếu môi trường không chạy được Chrome, dùng CI đúng SHA và lưu run; nếu vẫn thiếu gate, giữ TEST_PENDING để tổng chỉ huy hoàn tất trên bản tích hợp.

## Rào chắn và bàn giao

Không force-push/reset nhánh khác; không merge `main`, không deploy Firebase production, không đụng Rules/dữ liệu thật/Excel schema. Site demo riêng tư hiện có `appgprj_6ae93f17c2e48191815caef8a642fa14` dùng dữ liệu giả; tổng chỉ huy chỉ phát hành lại khi bản tích hợp và gói đúng SHA đạt kiểm thử. Người dùng chỉ cần gửi một link entrypoint cho mỗi chat; nếu đổi chat vì hit limit, chat mới đọc cùng entrypoint và checkpoint mới nhất, thay writer cũ.

## Entry points

- [Chat A — Nội dung trình và L03](WORKER-TABLE.md)
- [Chat B — Điều khiển admin](WORKER-ADMIN.md)
- [Chat tổng chỉ huy](COMMANDER.md)
- [Tracker](TRACKER.md)
