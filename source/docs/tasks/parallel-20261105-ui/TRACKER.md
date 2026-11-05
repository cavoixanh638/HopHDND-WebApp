# Tracker UI 05/11 — khởi tạo

Baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`; tested code/test baseline `3bfb28e0f8496732424898ae6186ea807af961fb`, Verify #41957942551 PASS. Chênh lệch chỉ docs. Đây là **baseline cũ**, không tính PASS cho yêu cầu mới. Site hiện v2/stale, chưa có bản mới.

| Luồng | Nhánh | Trạng thái | Code SHA/test SHA | Bằng chứng mới | Còn thiếu |
|---|---|---|---|---|---|
| REF | `ui/20261105-ref-codes` | NOT_STARTED | — | — | Registry/mã con, placement/copy, browser |
| UI | `ui/20261105-picker-layout` | NOT_STARTED | — | — | Picker, L03 alignment/compact, Chrome |
| WIDTH | `ui/20261105-column-width` | NOT_STARTED | — | — | Hai width toàn cụm, persist, browser |
| DATA | `ui/20261105-party-data` | NOT_STARTED | — | — | Transaction, Emulator, migration dry-run |
| Commander | `ui/20261105-coordination` | NOT_STARTED | — | — | Integration exact SHA, package, private Site |

Commander là writer duy nhất của file này. Chỉ cập nhật khi có commit/test/lỗi/chặn mới; ghi timestamp, link đúng SHA và việc còn thiếu. Worker writer duy nhất checkpoint trên nhánh của mình. Không dùng lời “xong” để đổi trạng thái.
