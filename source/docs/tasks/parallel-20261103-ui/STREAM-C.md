# Luồng C — Chip điều kiện lọc

Role: writer C. Branch `ui/20261103-filter-chip`; baseline chung xem [README](README.md); checkpoint mới nhất [C](checkpoints/C.md). Worktree: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/ui-20261103-filter-chip`.

Chỉ sở hữu `source/src/features/items/ActiveListFilters.tsx`, `list-filter-toolbar.css` và test/evidence trực tiếp. Ảnh người dùng có chip `Loại VB  NQ QPPL  ×` với dấu × không thẳng hàng với chữ.

Đích cuối: nhãn, giá trị và nút × căn giữa theo một hàng tại desktop; ở màn hẹp/chuỗi dài có thể xuống dòng có chủ đích nhưng × vẫn ở vị trí ổn định. Giữ target bấm, focus, ARIA, phím Enter/Space, callback bỏ đúng một điều kiện; không làm biến dạng chip khác.

Điều kiện DONE: TypeScript/test liên quan và browser kiểm desktop + 900px/mobile, nhiều chip, nhãn dài, zoom hoặc font scaling hợp lý. Bằng chứng screenshot/số đo DOM tại `source/docs/tasks/parallel-20261103-ui/evidence/C/`, checkpoint ghi SHA/test. Commit/push chỉ file sở hữu và evidence/checkpoint C.
