# Gemini PICKER — khôi phục UI nhân sự và caret nhỏ

Bạn là worker độc lập, nhánh **ui/20261106-picker-restore**; baseline **8a201c1bf48c7916e4d0af9e1c0ca60cd6737632**. Đọc README.md và checkpoints/PICKER.md **trên chính nhánh này**, kiểm HEAD/dirty tree rồi checkpoint đầu tiên. Bắt đầu ngay; không đợi TRACKS.

## Kết quả cần giao
Bốn dropdown nhân sự trong cột Lãnh đạo/Phòng/Chuyên viên trở về UI **trước đợt đồng nhất**; mọi dropdown sửa dữ liệu trong Danh sách/popup có caret tam giác nhỏ như mẫu. Không sửa độ rộng các track.

## Thực hiện
1. Render cùng fixture dữ liệu giả, cùng viewport/font/mode quyền ở reference `ab8629c7575debd494c908c14bde9967a575a82a` và baseline hiện tại. Liệt kê khác biệt skin thực của Lãnh đạo UBND/VP/Phòng/CV: normal, hover, focus, expanded, control/container, spacing/typography/border/background. Ghi source selector và screenshot. Không chọn mốc sau unified thay reference này.
2. Khôi phục có chọn lọc UI của **bốn ô nhân sự** trong cột gộp, cả chỗ tương ứng trong popup. Giữ cách rút gọn/tên đầy đủ, row alignment, mã con, keyboard, quyền/lease/lưu/history và các lựa chọn hiện tại. Không phục hồi phiên bản cũ của domain hoặc cả item-frame.css.
3. Ngoại lệ có chủ ý với UI cũ: caret mới theo mẫu người dùng. Dùng **một tam giác đặc xuống** (khởi điểm khoảng 5–6px rộng, 3–4px cao; chốt bằng render), màu currentColor, cạnh phải với khoảng hở nhỏ, căn giữa theo trục dọc. Không che chữ, không vùng nền/rail riêng, không caret trùng do pseudo/native/SVG. Không thu nhỏ hit target.
4. Áp dụng caret đó cho mọi editable data picker ở list/popup: nhân sự, Sở/Loại VB, Cấp trình TU, 3 tiến độ, và custom dropdown dữ liệu nếu có. Giữ UI L01/L03 ngoài caret và màu ngữ nghĩa đã PASS. Bộ lọc, navigation, nút Tùy chọn người phụ trách và cài đặt không đổi. Read-only/locked không hiện affordance sửa giả.
5. Chỉ sở hữu file/vùng nêu trong README. Nếu cần style riêng cho nhân sự, scope theo teamTogether/field semantics hiện có; không dùng nth-child hoặc global button/select rule. Không sửa geometry .compact-stages; không sửa CompactGroupedValue.tsx hoặc file TRACKS. Ghi selector contract trong checkpoint.

## Test và điều kiện DONE
- TypeScript, unit phù hợp; browser thật 1440/900/390 với dữ liệu giả: 4 ô nhân sự list/popup, bình thường/hover/focus/open, caret duy nhất/nhỏ/căn giữa; tên dài và xuống dòng, quyền mixed/read-only/disabled.
- Pointer mở/chọn, keyboard focus/Enter/Arrow/Escape, lưu thử không đổi nghiệp vụ. Test backend bị ảnh hưởng thì Emulator, không Firebase thật.
- Snapshot/diff chứng minh reference skin đã khôi phục, trừ caret mới; ảnh before/reference/after cùng fixture. Kiểm caret Sở/Loại VB/Cấp trình/ba tiến độ, màu trạng thái giữ nguyên.
- Lưu test script tái chạy được, run/artifact/ảnh + measured rects, code/tested SHA. Không chỉ test literal CSS.
- Chỉ DONE sau khi tự sửa mọi lỗi trong phạm vi, không gửi “đã code” thay test. Cập nhật checkpoints/PICKER.md; báo commander bằng commit + link checkpoint. Không chờ TRACKS, không merge/deploy.
