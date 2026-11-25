# Chức năng cũ không dùng — phân quyền theo dòng và ô

**Quyết định ngày 22/11/2026:** Dừng hoàn toàn chế độ phân quyền chi tiết theo dòng/ô và tab **Phân quyền chỉnh sửa**. Chỉ quản lý quyền **Cho sửa** theo cột ngay trong **Quản lý cột nâng cao**. Không mở lại tính năng cũ nếu chưa có yêu cầu mới.

## Lưu trữ để phục hồi
- [Giao diện đã nghỉ: InlinePermissionsTable.tsx.txt](InlinePermissionsTable.tsx.txt) — bản sao nguyên văn, không được import vào bản chạy.
- [Kiểm thử lịch sử: inline-permissions.test.tsx.txt](inline-permissions.test.tsx.txt) — giữ lại để tham khảo; không thuộc Vitest đang chạy.
- Mã App/ItemList/ItemColumnPanel trước khi bỏ: [commit gốc 7b0d4009142fa53c1bed44096296ab210bcffe04](https://github.com/cavoixanh638/HopHDND-WebApp/tree/7b0d4009142fa53c1bed44096296ab210bcffe04/source/src).
- `source/firebase/database.spark-base.rules.json` giữ biểu thức cấp phép cũ để đối chiếu lịch sử; generator loại bỏ quyền theo dòng/ô khỏi candidate Spark Rules được sinh. Generator sinh Spark Rules đã triển khai ngày 23/11/2026.
- Các khóa `rows` và `cells` có thể còn trong snapshot Firebase phục vụ CAS/rollback; **không cấp phép** ở ứng dụng mới. Không tự xóa hoặc di chuyển dữ liệu quyền trên production.

## Hợp đồng hiện hành
1. `mayEdit` và Spark Rules production đã nghiệm thu chỉ xét `permissions.columns[field]===true` cho người không phải admin, cùng các điều kiện khóa/đăng nhập hiện hành. Không lấy quyền ô/dòng làm fallback.
2. Quản trị giữ checkbox `Cho phép sửa cột` ở `ItemColumnPanel`, lưu bằng nút `Lưu thay đổi`; bỏ UI xóa ngoại lệ chi tiết. Chụp bản quyền gốc và CAS đầy đủ để không ghi đè thay đổi đồng thời.
3. Nghiêm cấm ngầm coi giao diện mới là đã vô hiệu hóa quyền cấp dòng/ô trên **Firebase sản xuất**: Rules công khai chỉ thay đổi sau một quy trình backup → duyệt hash → kiểm thử Emulator → deploy được phê duyệt → nghiệm thu Cloud. Nếu Rules cũ còn hiệu lực, bản phát hành phải hiển thị là **PENDING_RULES**.
4. Để khôi phục, cần PR riêng có kiểm thử bảo mật/đối chiếu dữ liệu và sự chấp thuận của chủ dự án, không tự bật lại qua cờ ẩn.

**Phát hành:** PR #231 đã merge, Rules production và Pages đã được nghiệm thu ngày 23/11/2026 theo [biên nhận cuối](../checkpoints/PR231_PAGES_ACCEPTANCE_2026-11-23.md). Không xóa quyền lịch sử hoặc ghi đè hồ sơ nghiệp vụ.
