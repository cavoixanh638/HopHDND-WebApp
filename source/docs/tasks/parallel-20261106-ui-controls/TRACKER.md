# Tracker — UI controls 06/11/2026

Baseline 8a201c1bf48c7916e4d0af9e1c0ca60cd6737632; tested code trước đợt 5d3aace. Chưa thực hiện code của yêu cầu mới.

| Owner | Branch | Status | Code/tested SHA | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| COMMANDER | ui/20261106-controls-command | READY_NOT_STARTED | NOT RUN | baseline CI trong README | Theo dõi, tích hợp, exact SHA test, package, demo |
| PICKER | ui/20261106-picker-restore | READY_NOT_STARTED | NOT RUN | reference ab8629c trong README | Restore 4 picker nhân sự, caret nhỏ, unit/browser và checkpoint |
| TRACKS | ui/20261106-l03-tracks | READY_NOT_STARTED | NOT RUN | model contract trong README | 5 widths độc lập, config/persistence/merge/CAS/list/popup/preview, tests |

Mỗi worker là writer checkpoint trên nhánh mình; commander duy nhất cập nhật tracker này. Người dùng gửi 3 link trong GEMINI_PROMPTS.md vào 3 chat Gemini độc lập, có thể đồng thời.
