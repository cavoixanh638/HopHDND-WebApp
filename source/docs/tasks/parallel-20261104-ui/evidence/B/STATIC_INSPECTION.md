# Luồng B — bằng chứng khảo sát mã (04/11/2026)

**Code SHA**: `fca8f1d52d8bbc55f64ce9362c8970c3035bb11b` — [commit](https://github.com/cavoixanh638/HopHDND-WebApp/commit/fca8f1d52d8bbc55f64ce9362c8970c3035bb11b). Bằng chứng này chỉ là **static inspection**, không phải browser/unit PASS.

## Quan sát mã trên đúng SHA

12/12 kiểm tra tĩnh PASS bằng cách đọc trực tiếp file GitHub ở SHA:
- ItemList: có nút `Đổi tên danh sách` cạnh `.item-list-page-title` và vùng checkbox C01–C03 không nằm trong `<details>`.
- Checkbox áp dụng riêng từng khóa `party/build/nq`, kế thừa phần còn lại từ `...base.summaryCards`; C00 không phụ thuộc các cờ đó. CSS ẩn phần tử theo `data-hide-*` thay vì xóa data/filter; ở desktop có grid 1/2 cột khi giảm thẻ.
- Nhãn: C01 Trình Thành ủy, C02 Trình HĐND xây dựng NQ, C03 Trình HĐND ban hành NQ; kiểm với `domain/item-summary.ts`.
- UI chỉ có khi `adminControls` và có nguồn lưu phù hợp; `adminControls=allowLayout&&!anonymousViewer`. App cấp `onPersistViewerLayout` khi Firebase admin được xác thực, có profile và kết nối; preview RAM dùng `saveLayout` giả lập.
- Giữ `validateListTitle` và `applyViewerLayout` gọi writer `onPersistViewerLayout(next,baseline,choices)`, optimistic rollback về `sharedBase.current`, conflict resolver, lỗi offline/denied. Nút tên có snapshot baseline từ lúc mở form. Không sửa report/KPI/permission/sort.
- CSS có responsive `max-width:560px`, flex-wrap, input min-width; chưa có screenshot xác minh ở 390/900/1440.

## Trạng thái nghiệm thu

| Gate | Kết quả |
|---|---|
| Static code/permission/CAS inspection | PASS (12/12), riêng tại SHA trên |
| `npm run typecheck`, unit/config/CAS | **NOT RUN** |
| Firebase Emulator, Chrome admin/guest, keyboard, 1440/900/390, reload/offline/conflict | **NOT RUN** |
| Run URL, PNG screenshot | **Chưa có** |
| CI run đúng SHA | **Không tìm thấy** workflow run/status tại thời điểm kiểm |

Lý do: môi trường container không phân giải được `github.com` để clone/chạy repo; workflow `parallel-chat2-ui-checks.yml` chỉ tự chạy push trên các nhánh integration/20261102 hoặc parallel/20261102. Workflow PR147 bị giới hạn điều kiện PR #147. Không ghi suy diễn browser PASS.

## Bàn giao cho tổng chỉ huy

- Chỉ nhận tích hợp khi diff giới hạn `ItemList.tsx`, `admin-list-controls.css`, docs/checkpoint/evidence B; không chạm A.
- Chạy gate typecheck + vitest config/CAS + build và Chrome/Emulator trên SHA tích hợp. Bắt buộc kiểm guest không thấy controls, admin click/Tab, đổi tên, refresh và tab App, tắt/mở từng C01–C03, C00 luôn hiển thị, lỗi denied/offline/CAS rollback, screenshot ba viewport.
- Nếu gate lỗi, trả về worker B với log chi tiết và SHA tương ứng; chưa merge/deploy.
