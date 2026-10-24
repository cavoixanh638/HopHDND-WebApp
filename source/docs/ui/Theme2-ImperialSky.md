# Theme2 — Imperial Sky (B — Subtle Gradient + A — Solid Elegant)

**Trạng thái:** Bản thử triển khai; Theme1 được giữ nguyên (không sửa bất kỳ tệp Theme1 nào).  
**Nguồn gốc:** người dùng duyệt kết hợp B cho hai tab chính và A cho điều khiển thông thường, không dùng gradient cho bảng dữ liệu.

## Phạm vi

- Hai tab chính `Báo cáo tổng hợp` và `Danh sách các ND trình HĐND`: tab đang chọn có `linear-gradient(110deg,#245A79 0%,#2E6F95 100%)`, chữ `#F8FBFD`, viền `#245A79`; tab còn lại `#F2F8FC` với chữ `#35556B` và viền `#C9DCE8`.
- Chỉ một tab được chọn tại mỗi thời điểm: **không** để một tab mặc định xanh, tab khác mặc định xanh lá. Thẻ trạng thái `Đang xem` của tab inactive được ẩn bằng `visibility:hidden` nhưng giữ nguyên khoảng trống `62px`; căn phải cố định.
- Kích thước nhóm tab desktop tối đa 850px; tiêu đề 1 dòng; dưới 760px hai tab xếp thành hai hàng để không tràn, khung giữ hình học ổn định khi chuyển tab. Hover 3D nhấc `-2px`, viền xanh và halo nhẹ theo phương án trước.
- Nút `button.primary` nền phẳng `#2E6F95` (hover `#245A79`); nút phụ/ghost dùng nền trắng hoặc xanh nhạt, chữ xanh thép. **Không sử dụng gradient** trên các nút hành động.
- Tab cài đặt con: nền xanh băng; lựa chọn hiện hành nền trắng, viền xanh, gạch dưới kín đáo; vùng focus input/select/textarea viền xanh và halo nhạt. Tiêu đề trung tính chuyển xanh thép.
- Không thay màu trạng thái `Sở chưa trình`/ `VP đang thực hiện` / `Hoàn thành`, tỷ lệ hoàn thành, `HC/QPPL/Báo cáo`, màu do admin đặt, cảnh báo/lỗi/thành công, highlight từ khóa, report stage palettes hoặc bản ghi dữ liệu.

## Mã màu Theme2

| Vai trò | Token / Giá trị |
|---|---|
| Primary action nền phẳng | `--imperial-primary: #2E6F95` |
| Gradient bắt đầu / focus đậm | `--imperial-deep: #245A79` |
| Chữ inactive / nút phụ | `--imperial-ink: #35556B` |
| Nền inactive | `--imperial-ice: #F2F8FC` |
| Viền inactive | `--imperial-border: #C9DCE8` |
| Nền hover nhẹ | `--imperial-hover: #EAF4FA` |
| Viền hover/focus | `--imperial-focus: #9FC6DD` |
| Chữ tab active | `#F8FBFD` |
| Nhãn active | `#EAF5FB` |
| Focus halo | `rgba(46,111,149,.16)` |

Độ tương phản tham chiếu WCAG (theo sRGB): chữ `#F8FBFD` trên `#2E6F95` khoảng **5.28:1**; `#EAF5FB` trên `#2E6F95` khoảng **4.96:1**; chữ `#35556B` trên nền `#F2F8FC` khoảng **7.36:1**. Vì gradient bắt đầu `#245A79` đậm hơn cuối, điểm màu sáng nhất là mức tương phản thấp nhất.

## Kỹ thuật và bảo vệ dữ liệu

- Lớp CSS thực thi được giới hạn bằng `.app-shell.imperial-sky-theme`. Ứng dụng thêm class đó tại `src/app/App.tsx`; mọi quy tắc CSS Theme2 nằm cuối `src/styles/app.css` và khai báo token **riêng**.
- Không được thay `--green` toàn cục: biến này vẫn liên quan một số trạng thái nghiệp vụ trong CSS cũ.
- Không thêm localStorage key, không thay Theme1, không chỉnh sửa preset; chỉ sửa 2 tệp mã nguồn nói trên cùng test/tài liệu.
- Kiểm thử TypeScript, unit, Firebase emulator, Chrome smoke toàn hệ thống; kiểm tra `THEME2_IMPERIAL_SKY_CHROME_PASS`, tab active/inactive sau khi click, kích thước tab không thay đổi, hover 3D, không biến đổi bảng và quyền.

## Khôi phục nhanh

1. Theme1 mã gốc **được đóng băng** ở [`Theme1.md`](Theme1.md), Git branch `snapshot/Theme1-before-ImperialSky-2026-10-24` và commit `c52f162e42b5ad6893c043d8b84b7914fe247b16`.
2. Để chỉ quay lại màu Theme1 nhưng **giữ các chức năng mới**, tạo một PR xóa lớp `imperial-sky-theme` ở `App.tsx` và loại bỏ khối Theme2 cuối `app.css`. Không reset Git main, không rollback lịch sử người dùng.
3. Chạy CI và Chrome smoke trước khi xuất bản. Chỉ khi yêu cầu phục hồi toàn bộ ứng dụng mới cân nhắc rollback code khác, cần có phê duyệt riêng.

**Theme1 là baseline mã nguồn**, không phải bản xuất mọi preset người dùng từ localStorage hoặc Firebase. Không tuyên bố snapshot này bao gồm các cấu hình runtime đó.
