# Checkpoint A — bản sửa JSX/CSS (04/11/2026)

- Status: **IN_PROGRESS**; branch `ui/20261104-table-layout`; baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`.
- Code commits đã push: `3ddfc08deaff16ef6ab133025a5e43dcfbf5f6a2` (JSX metadata/L03), `cfd54a374dfcce4ae3d81403cb6b3152148235ae` (CSS responsive/3 cột). **Code SHA mới: `cfd54a374dfcce4ae3d81403cb6b3152148235ae`.**
- Sửa: metadata Sở + Loại VB có dấu ngoặc/dấu nối khi có nguồn; ô rỗng vẫn editable riêng; L03 cấp trình chỉ đọc gộp vào nhãn, cấp trình editable là nút thứ hai; trạng thái là track 3 chung, bỏ cấp trình read-only `Không phải trình`. Quyền/lease/CAS vẫn gọi từ `field(key)` gốc.
- Tests: **NOT RUN**; Chrome: **NOT RUN**; CI: **NOT RUN**. Nhiều test Chrome hiện có dùng oracle bố cục 2 cột cũ, cần điều chỉnh trước gate. Evidence screenshot: chưa có.
- Môi trường local: `git ls-remote` báo DNS không phân giải được `github.com`. GitHub connector push thành công, chưa xác nhận có thể chạy browser đúng SHA.
- Bước kế: (1) cập nhật test oracle và thêm regression mới trong `source/tests`; (2) chạy CI đúng SHA nếu có thể; (3) lưu evidence/đánh giá tiêu chí thiếu và bàn giao tổng chỉ huy.
