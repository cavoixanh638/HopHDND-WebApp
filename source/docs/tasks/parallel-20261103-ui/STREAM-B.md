# Luồng B — Điều khiển Danh sách cho admin

Role: writer B. Branch `ui/20261103-admin-controls`; baseline chung xem [README](README.md); checkpoint mới nhất [B](checkpoints/B.md). Worktree: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/ui-20261103-admin-controls`.

Sở hữu `ItemList.tsx`, `ItemColumnPanel.tsx`, `ColumnHeader.tsx`, `source/src/domain/sort-items.ts`, `source/src/data/item-preferences.ts`, `source/src/data/item-layout-merge.ts` và CSS mới riêng (nếu cần). Hai trường cấu hình mới phải đi qua merge/CAS theo layout hiện hành. Không chạm `item-frame.css`, `CompactGroupedValue.tsx`, `pr95-full-preview.tsx`, `list-filter-toolbar.css`.

Đích cuối: sort ở tiêu đề cột chỉ có ở admin, khách không thấy nút/không sort bằng click hay bàn phím. Sort L01 dùng ID hiển thị và xếp toàn bộ NQ trước BC, sau đó số tự nhiên trong mỗi nhóm, cả asc/desc phải có quy tắc rõ và test. Admin có điều khiển đổi tên heading `Danh sách các ND trình HĐND`, dùng cấu hình chung hợp lệ để guest cũng nhìn thấy tên đã lưu; giá trị mặc định như hiện tại, tên rỗng/không hợp lệ bị chặn. Admin có tùy chọn bật/tắt riêng ba thẻ C01/C02/C03, mặc định đều hiện; C00/Tổng số vẫn hiện, trạng thái ẩn lưu qua layout chung và không làm mất logic lọc. Chỉ quyền admin thật được lưu; demo admin mô phỏng dùng layout RAM.

Điều kiện DONE: typecheck + unit cho sort/validation và Chrome cho admin/guest, đổi tên, bật/tắt từng thẻ, reload, không mất filter hiện tại, không phá sort/drag/resize. Bằng chứng tại `source/docs/tasks/parallel-20261103-ui/evidence/B/`, checkpoint nêu SHA/test. Không sửa Excel columns, Firebase security hoặc report KPI. Commit/push file sở hữu và evidence/checkpoint B.
