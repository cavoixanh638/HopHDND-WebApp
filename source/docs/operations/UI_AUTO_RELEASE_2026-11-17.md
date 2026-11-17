# Phát hành UI tự động có kiểm soát — Họp HĐND (17/11/2026)

## Mục tiêu
Không yêu cầu chủ dự án cập nhật `HOPHDND_PAGES_APPROVED_MAIN_SHA` sau **mỗi lần sửa thuần giao diện**. Không vì sự thuận tiện này mà tự phát hành thay đổi quyền, kho dữ liệu, Firebase, schema, ghi/lưu hay chính sách an toàn.

## Phân tầng mã dropdown
- **Giao diện được phép auto sau CI:** `src/features/items/CellPickerPopupView.tsx` (chỉ JSX, props và sự kiện gửi ngược), `src/features/items/cell-picker.css`, `src/features/items/pr95-v5-l1-picker-placement.ts` (toán học vị trí), `src/features/items/CellPickerPositioning.ts` (đo DOM, không động tới quyền), `scripts/pr95-v5-l1-dropdown-browser.mjs` (QA).
- **Lõi phải phê duyệt SHA khi sửa:** `src/features/items/CellPicker.tsx` chứa cấp quyền, lease, CAS, kiểm tra lựa chọn hợp lệ, callback lưu, đóng/mở editor và xử lý focus; phần đo DOM/định vị đã tách khỏi core. Không cho phép auto nguyên tệp chỉ vì tên gọi có chữ Picker.
- Component hiển thị chỉ nhận `onChoose` và các callback từ core; core không nhận giá trị ngoài `visibleOptions` hoặc khi đang chờ/bị thu hồi quyền.
- Các dropdown Sở/ngành và popup dùng chung core/view; giữ ngưỡng **7 lựa chọn + tìm kiếm** cho Sở/ngành, **4 lựa chọn** với trường còn lại; cuộn chỉ trong danh sách dưới ô tìm kiếm.

## Luồng release
1. Tạo PR từ SHA `main` mới nhất, giữ patch thuần UI trong các module được liệt kê.
2. Chạy CI chính xác trên HEAD PR (unit, typecheck, Chrome wheel, Spark Emulator, quyền, dữ liệu và A4). Không gộp nếu FAIL.
3. Merge vào `main`. Workflow `publish-pages.yml` phân tích **toàn bộ lịch sử first-parent kể từ `version.json.source_sha`** (bỏ qua riêng artifact bot Pages hợp lệ).
4. Nếu mọi thay đổi chưa phát hành đều trong danh sách cho phép, và source JSX thuần UI không import dịch vụ / API / thao tác dữ liệu, chế độ `auto` sẽ build/test và publish mà **không cần sửa variable**.
5. Nếu có bất cứ thay đổi lõi, Firebase, auth/quyền, import, Rules, schema, package, workflow hoặc chính policy trong chuỗi chưa phát hành, chế độ `hold`. Lúc đó chủ repo mới phê duyệt **đúng SHA main** qua `HOPHDND_PAGES_APPROVED_MAIN_SHA` một lần cho đợt đó; kiểm thử không thay thế được phê duyệt.
6. Chỉ báo **đã xuất bản** khi `publish=SUCCESS`, `version.json.source_sha` khớp source và Pages native deploy SUCCESS. Workflow `release-gate=SUCCESS` nhưng `publish=SKIPPED` không phải xuất bản.

## Cơ chế an toàn
- `scripts/pages-release-policy.mjs`: giữ `CellPicker.tsx` **ngoài auto allowlist**; chỉ thêm View, DOM positioning, hàm toán học placement và Chrome QA.
- Với 3 module UI/DOM positioning/placement đã tách, policy kiểm tra **nội dung tại SHA HEAD**, cấm runtime imports không rõ, trình gọi network, browser storage, global DOM side effects, quyền/lease và ghi dữ liệu. File mất hoặc kiểm tra thất bại => HOLD.
- `scripts/pages-release-policy.check.mjs` có ca POSITIVE/NEGATIVE: CSS, View, geometry auto; chỉnh lõi, trộn security commit, mã I/O, thay policy, thay Rules, thay import/dependency, bot artifact giả => HOLD.
- `publish-pages.yml` giữ `HOPHDND_SPARK_PRODUCTION_CONFIRMED`, unit, typecheck, **Chrome thật**, Spark Emulator, kiểm soát public bundle, nguồn SHA bất biến và push không force; không triển khai Firebase Rules hoặc ghi dữ liệu production. Checkout không lưu token ghi trong giai đoạn test; `GITHUB_TOKEN` chỉ được cấp cho bước push cuối cùng và sử dụng dưới dạng HTTP header tạm thời.
- Khi làm tính năng UI mới vượt ra khỏi module an toàn, không mở rộng allowlist bằng regex chung hoặc auto toàn bộ thư mục. Phải tách module trình bày và soát ranh giới quyền rồi mới cập nhật policy qua review phê duyệt riêng.

## Chuyển tiếp một lần (sau PR #207)
Bản đang chờ phát hành có sửa `CellPicker.tsx` trong PR #207 và lần chỉnh policy này cũng thuộc nhóm được bảo vệ. **Cần phê duyệt chính xác SHA main sau khi merge PR chuyển tiếp này một lần** trước khi cơ chế auto cho các thay đổi tiếp theo có hiệu lực. Không tự thay variable, không dùng lệnh ép push, không bypass workflow.

## Nghiệm thu nhanh
- CI Chrome: ô tìm kiếm đứng yên; chuột cuộn danh sách mà không đè lên header; chọn tên Sở không dấu; popup List và Report; kiểm tra 7/4 lựa chọn.
- Kiểm tra `version.json` của Pages: `source_sha` khớp commit đã build.
- Nếu auto release báo HOLD: đọc `PAGES_RELEASE_POLICY.blocked`, không tự ý thêm file nhạy cảm vào allowlist.
