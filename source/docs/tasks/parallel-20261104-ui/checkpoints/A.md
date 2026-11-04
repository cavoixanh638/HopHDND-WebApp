# Checkpoint A — khảo sát (04/11/2026)

- Status: **IN_PROGRESS**; branch `ui/20261104-table-layout`; HEAD khảo sát `6031ef55e53fc83c1ae93897359727d3740de43a`; code baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b` (compare: ahead 1, chỉ tài liệu khởi tạo).
- Phạm vi writer: `CompactGroupedValue.tsx`, `item-frame.css`, `CellPicker.tsx` nếu cần; test/evidence A, checkpoint A. **Không** chỉnh ItemList/App/admin CSS/backend/tracker.
- Hiện trạng: `contentDetails` đang tách Sở và Loại VB thành các span/badge; `partyTogether` hiện gộp nhãn Thành ủy + cấp trình trong cùng label. Cần xem CSS và tích hợp editor để sửa mà vẫn giữ quyền/lease/tô màu từng field.
- Code SHA mới: **chưa có**; tested SHA: **NOT RUN**; Chrome: **NOT RUN**; CI: **NOT RUN**; evidence: đang khảo sát.
- Bước kế (tối đa 3): (1) đọc CSS/test và đường truyền quyền gốc; (2) sửa JSX/CSS + test mục tiêu; (3) chạy được gate nào thì đo/lưu evidence và bàn giao SHA chính xác.
- Môi trường: GitHub connector đọc/ghi được; container thử `git ls-remote` không phân giải được github.com, nên có thể phải dựa vào CI đúng SHA thay vì local Chrome.
