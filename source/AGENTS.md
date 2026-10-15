# Hướng dẫn làm việc

- Người dùng là chỉ huy; parent agent điều phối tổng thể, Luna xử lý phần việc đơn giản được giao. Không tự mở rộng phạm vi hoặc diễn giải kế hoạch thành quyền ghi dữ liệu sản xuất.
- Đọc theo nhiệm vụ: bắt đầu với `docs/CURRENT_STATE.md` nếu cần tình trạng; tra `docs/FEATURES.md` theo Fxx; đọc `docs/SYSTEM.md` khi đổi nghiệp vụ; đọc `docs/ARCHITECTURE.md`/`docs/API.md` khi đổi luồng dữ liệu hoặc API; dùng `docs/REPO_MAP.md` để tìm mã. Chỉ đọc sâu phần liên quan.
- Sửa nguồn chuẩn và tài liệu liên quan; không sửa artifact build thay cho nguồn. Giữ tương thích mã/format legacy khi yêu cầu; không tự ánh xạ giá trị mơ hồ.
- Thực hiện local fixes trong phạm vi được giao mà không hỏi lại permission. Tài liệu kế hoạch chỉ mô tả dự kiến, không cấp quyền đọc/ghi dữ liệu thật, triển khai hoặc phát hành. Dùng dữ liệu giả khi cần.
- Không đánh dấu chức năng hoàn tất nếu chưa có bằng chứng; CURRENT_STATE là nơi ghi kết quả đã kiểm chứng, FEATURES là đặc tả. Cập nhật đúng tài liệu và kiểm tra phù hợp với thay đổi.
- Tránh nhân bản tài liệu: `docs/README.md` là chỉ mục và nơi chốt nguồn chuẩn; `docs/VAN_HANH.md` quản lý phát hành/rollback/backup/sự cố; `docs/TU_DIEN_DU_LIEU.md` ánh xạ A–P/ID/kiểu; `docs/CAI_DAT_VA_CHAY.md` chỉ hướng dẫn môi trường build local. Chỉ tách tài liệu mới khi trách nhiệm thật sự khác và sửa đồng thời chỉ mục, liên kết. Không sửa cấu hình Firebase production hoặc nội dung Excel trong nhiệm vụ tài liệu.
