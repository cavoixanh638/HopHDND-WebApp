# Checkpoint — Chat N

> Mẫu v2: cập nhật chủ động theo quy ước chung, không đợi gần hết context.
> Chỉ sửa checkpoint của đúng luồng; giữ ngắn, không chép log/hội thoại.
> Status có thể là NOT_STARTED, IN_PROGRESS, BLOCKED_EXTERNAL, DONE,
> DONE_WITH_EXTERNAL_GAPS. File này là mẫu, không ghi đè tiến độ hiện có.

- Status: IN_PROGRESS
- Branch / code SHA / tested SHA:
- Lưu: REMOTE hoặc LOCAL_ONLY (worktree/path nếu chưa push)
- Cập nhật: YYYY-MM-DD HH:mm Asia/Saigon
- Quy ước đã đọc: v2 (2026-11-02)

## Đã làm / quyết định cần giữ
- Tối đa 3 ý kèm file/link.

## Đang làm / WIP
- File sửa dở, chưa commit/push; không tự reset.
- Run/session đang chạy, code SHA và cách xem kết quả.

## Kiểm thử
- PASS/FAIL/NOT RUN/UNKNOWN + lệnh hoặc run URL, SHA tương ứng.

## Bước tiếp theo
1. Việc cụ thể.
2. Việc cụ thể.
3. Điều kiện hoàn tất còn thiếu.

## Ngoài phạm vi
- Gap có bằng chứng, nếu có; không chờ chat khác để làm phần còn lại.
