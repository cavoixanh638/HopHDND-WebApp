# DATA checkpoint — UI 05/11/2026

## Khảo sát / mốc 1 (2026-11-05)
- Owner: DATA, nhánh `ui/20261105-party-data`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`; HEAD trước mốc: `aa135cfb07fbc29fe642da8710bfb11d61941927` (hai commit tạo hợp đồng/checkpoint; chưa có delta code DATA).
- Đã đọc `README.md`, `WORKER-DATA.md`, `source/AGENTS.md`; kiểm tra lịch sử nhánh bằng GitHub compare; không có mã DATA sửa từ baseline trên remote. GitHub không biểu diễn local dirty tree; chỉ kiểm được remote tree. Không checkout/force/reset.
- Contract hiện tại còn menu `TTTU/BTV TU/BCH/Không phải trình`, alias hiển thị `BTV` và `Không` bị canonical về giá trị cũ. `core.js` đang đòi lease riêng từng field trong patch; cập nhật phụ thuộc không hoạt động với grant chỉ có partyLevel. Phải sửa cả Rules cho ngoại lệ cập nhật phụ thuộc hẹp (server transaction + rules).
- Tình trạng: **IN_PROGRESS**. Đang phân tích Rules và test emulator, tiếp theo implement rồi chạy CI/fixture. **LIVE MIGRATION: NOT RUN**, không Firebase production/Excel/Hosting/Rules deploy.
- Code SHA/test SHA: NOT YET; CI/run/artifact: NOT RUN; fixture dry-run counts: NOT RUN.
