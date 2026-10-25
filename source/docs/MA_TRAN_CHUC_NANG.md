## Ma trận bổ sung yêu cầu realtime (25/10/2026, DRAFT)
| Hạng mục | PR mã | Kiểm thử nguồn | Production |
|---|---|---|---|
| Firebase `hdnd/items` nguồn nghiệp vụ duy nhất | #71 | Unit/Emulator + migration/readback | **Chưa triển khai** |
| Khóa độc quyền theo từng ô + phân quyền, 2 UID/2 tab | #72 | `exclusive-cell-freeze.test.ts` | **Chưa triển khai** |
| Tạm dừng sửa khách, đợi lưu rồi chốt, đóng băng khẩn cấp | #72 | Emulator + Chrome smoke dữ liệu giả | **Chưa triển khai** |
| Biên nhận hash/số dòng chốt từ Firebase | #72 | Staging; chưa có bằng chứng production | **Chưa triển khai** |
| Tự chốt khi admin offline | Chưa có server coordinator | Chưa có | **NO-GO cho chế độ không người trực** |

Nguồn quy tắc/GO-NO-GO: [Cổng phát hành](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md). Mục này bổ sung và không tự đánh dấu F01–F36 legacy là đã nghiệm thu.

---

# Ma trận chức năng — tài liệu đã chuyển

Ma trận chuẩn F01–F36 đã được chuyển sang [docs/FEATURES.md](FEATURES.md). Hãy dùng FEATURES để tra yêu cầu và tiêu chí; `docs/CURRENT_STATE.md` ghi trạng thái thực tế và bằng chứng theo mã Fxx. Tệp này chỉ giữ lối dẫn chuyển tiếp để các liên kết cũ tiếp tục mở được, không chứa bản ma trận thứ hai.
