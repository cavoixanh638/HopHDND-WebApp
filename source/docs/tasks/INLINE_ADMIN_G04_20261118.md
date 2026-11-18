# G04 — Popup chỉnh trực tiếp (18/11/2026)

## Phạm vi và nhánh
- Branch: `g04/20261118-popup-direct-edit`, base cố định `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`.
- Pull Request: https://github.com/cavoixanh638/HopHDND-WebApp/pull/213 (**DRAFT**, không merge/publish).
- Code SHA trước checkpoint: `ebb0e902a2d3baaefbbb07342d0a5f97647d003e`.
- Tested SHA: **NOT_RUN** (chưa có bằng chứng chạy đầy đủ trên mã này). Không tự nhận PASS tích hợp.
- Chỉ sửa ReportDetailGrid.tsx, tạo module/CSS `inline-g04-*`, test G04 và tài liệu này.

## Đã triển khai
1. Tái sử dụng bộ kéo cột, Alt+arrow, px, preset, màu, sort/filter, L03 và luồng draft hiện có.
2. Thêm bốn vùng kéo cạnh/góc popup, mouse/touch bằng Pointer Events và pointer capture; RAM preview khi di chuyển, commit một lần lúc pointer-up, hủy khi pointercancel/lost capture; keyboard Arrow/Shift+Arrow/Escape. Clamp 640–2400 theo visual viewport; kích thước hiển thị nhỏ hơn 640 trên màn hình hẹp không ghi vào localStorage.
3. Chỉnh tên nhóm ngay trên tiêu đề gộp, Enter/blur để lưu, Escape để hủy. Tên nhóm được validate qua preferences hiện có.
4. Nút ẩn ngay tiêu đề, với nhóm gộp ẩn các source member; menu «Cột ẩn» khôi phục từng cột. Không xóa mapping A–O hoặc dữ liệu.
5. Phân tách chỉnh layout bằng `mayCustomize` khỏi `editing`/onUpdate. Thêm prop `canCustomizePopup?:boolean` để host cấp quyền; guest/readOnly bị chặn. Kế thừa hành vi cũ nếu host chưa truyền prop; trong bản tích hợp G00 phải nối quyền `adminTools` chính thức.
6. Tất cả sửa cấu hình trong popup lưu localStorage đã có; không gọi writer Firebase hoặc sửa hồ sơ qua layout handlers.

## Kiểm thử / bằng chứng
| Bài | Trạng thái | Lý do |
| --- | --- | --- |
| Unit fixture viewport 900px / 1920px / 2K / 480px / clamp và kéo ngoài cửa sổ | NOT_RUN | Đã thêm `source/tests/inline-admin-g04-popup.test.tsx`; chờ GitHub CI |
| Fixture admin, guest, readOnly, explicit canCustomizePopup false | NOT_RUN | Đã viết bài kiểm thử, chưa xác thực thực thi |
| Ẩn/hiện cột, reload lưu localStorage, không gọi onUpdate/onKeepDraft | NOT_RUN | Đã viết bài kiểm thử, chưa xác thực thực thi |
| Full `npm run typecheck && npm test` | NOT_RUN | Container không có repository/node_modules, git remote không phân giải DNS; nguồn qua GitHub plugin |
| `npm run build:compact:qa` + Chrome thật (touch, zoom, Tab/Enter/Esc, scroll, sort/filter) | NOT_RUN | Không có Chromium harness/đầu vào build cục bộ |
| `npm run test:spark` (Firebase Emulator) | NOT_RUN | Không có bộ phụ thuộc môi trường dự án, không đụng Firebase production |
| QA tổng thể trên website đã tích hợp | NOT_RUN | G00 chủ trì tích hợp và nghiệm thu |

## Rủi ro, điểm nối G00
- **Bắt buộc** owner G02/G00 truyền `canCustomizePopup={adminTools}` trong `source/src/app/App.tsx`; nhánh G04 không được sửa App.tsx.
- G00 chạy typecheck/test/Chrome thực tế trước merge, xác nhận zoom và event pointer/touch/keyboard trên Chrome; soát nhóm L03, horizontal scroll và menu filter không bị ảnh hưởng.
- Khi popup được tích hợp với bộ chỉnh giao diện Admin dùng chung, không đưa sở thích popup cá nhân lên Firebase profile.
- Không đụng auth/lease/CAS, Rules, deploy, chính sách release, Excel, main hoặc Firebase production.
- Trạng thái: **CHƯA DONE**; chỉ có mã + fixture trên nhánh độc lập, chưa có bằng chứng CI PASS.
