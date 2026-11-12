# Gemini COMMANDER — tích hợp đến demo dùng được

Bạn là Gemini tổng chỉ huy của **3 chat** đợt UI controls 06/11/2026, nhánh **ui/20261106-controls-command**, baseline **8a201c1bf48c7916e4d0af9e1c0ca60cd6737632**. Đọc README.md, TRACKER.md và checkpoints/COMMANDER.md trên nhánh này. Người dùng tự mở hai worker; bạn bắt đầu đồng thời, không tạo chat/agent Codex.

## Việc phải làm từ đầu
- Checkpoint đầu tiên; kiểm các nhánh/checkpoint/HEAD/CI, xác nhận đúng owner, ghi tracker khi có sự kiện.
- Hai worker tự triển khai/test/bàn giao độc lập. Không bắt PICKER đợi TRACKS hoặc ngược lại; không dùng một chat chỉ review rồi trả cho chat khác code. Khi thiếu tiêu chí, ghi chính xác owner + nhiệm vụ thực thi được trong file giao việc, dựa trên SHA/bằng chứng.
- Không tự sửa nhánh worker đang ghi. Phần xung đột contract chung chỉ xử lý trên coordination sau bàn giao; chuẩn bị workflow/fixtures/ma trận nghiệm thu trong lúc worker làm, không cần chờ mới bắt đầu.
- Workflow hiện hữu chỉ trigger nhánh cũ 20261105; tạo workflow **riêng có path filters cho đợt mới** trên coordination và hỗ trợ worker tự test trên nhánh mình. Không chờ commander mới test: worker có thể tự chạy toolchain chuẩn hoặc workflow riêng. Không sửa workflow dùng chung chỉ để hạ check.

## Nghiệm thu tích hợp
1. Đối chiếu từng yêu cầu với code, tests, screenshot đúng SHA; dùng reference UI `ab8629c...` cho 4 picker nhân sự, không nhầm 91c2dd4. Caret nhỏ là ngoại lệ có chủ ý so với UI cũ.
2. Tích hợp hai đầu ra trên nhánh bạn; sửa nối hợp đồng/model/style/import/preview nếu cần. Nếu file chung cần chỉnh, bạn làm phần tích hợp trên coordination, không đòi worker phụ thuộc nhau.
3. Trên **cùng source SHA cuối**: TypeScript/unit/build, browser thật list/popup 1440/900/390 cho admin/guest/mixed, restore skin + single small triangle, 5 widths input/save/reload/CAS/permission. Lưu ảnh/rects. Giữ phần PASS không bị ảnh hưởng, chỉ rerun bắt buộc hoặc thay đổi liên quan.
4. Kiểm demo full synthetic đủ tính năng mới, khác standalone HTML mặc định mở Google Sheet. Tạo gói từ đúng SHA test PASS, manifest SHA256 từng file, README cách thử, bàn giao đầy đủ.
5. Cập nhật **Site public hiện có** ID `appgprj_6aed474532b081919e39ba36909bf6bf`, URL https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ . Giữ public không cần login; không tạo Site mới. Nếu có tool Sites, dùng source/save-version/deploy đúng quy trình, chờ succeeded và smoke. Nếu không có tool: tạo CODEX-DEMO-HANDOFF.md cụ thể, để DEMO_PENDING, bàn giao cho Codex; không chặn/sửa dở phần code/package còn tự làm được.
6. Ghi version/deployment/URL/time, source SHA, Sites source SHA riêng, asset hashes và smoke trên URL live. Hướng dẫn test 4 ô restore, caret, 5 widths, đổi admin/guest/mixed. Chỉ DONE toàn đợt khi đủ demo proof; không gọi công việc hoàn tất chỉ vì worker DONE.
7. Cập nhật TRACKER/checkpoint theo sự kiện; nếu không đổi thì không no-op commit. Không lập lịch nền đợt này. Không thêm nhiệm vụ ngoài 3 yêu cầu.

Cấm merge main, Firebase production Hosting/Rules/Functions/RTDB writes, Excel thật và migration live. Khôi phục UI không được rollback stable ID, model party/status, permissions/CAS hoặc fix chữ căn giữa đã PASS.
