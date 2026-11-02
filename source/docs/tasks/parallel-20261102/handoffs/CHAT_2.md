# Checkpoint — Chat 2: Giao diện và thao tác người dùng

- Trạng thái: **IN_PROGRESS**
- Cập nhật lúc: 2026-11-02 14:41 Asia/Saigon
- File nhiệm vụ: [CHAT_2_UI.md](../CHAT_2_UI.md)
- Repository/branch: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat2-ui`
- Worktree: không có trong container; checkout GitHub trực tiếp bằng connector (container DNS github.com không hoạt động).
- Mốc nguồn: `0a04b81dbb00979fb87aee7fc497e802058d8518`
- HEAD code đã push: `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60`
- Tested code SHA: `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60` — CI đang chạy, chưa xác nhận PASS
- Draft PR: chưa tạo. Writer khác trên nhánh: chưa xác minh; HEAD ban đầu chỉ docs bootstrap, không có tác vụ UI khác ghi vào checkpoint.

## Đã hoàn tất
- Đọc quy ước chung, AGENTS, baseline CI; đối chiếu UI List, bộ lọc, modal, history, editor, admin; xem [báo cáo](../reports/CHAT_2.md).
- Sửa bug keyboard UX: Escape bộ lọc Phòng/CV rỗng không còn nuốt sự kiện; điều kiện nguồn/role không đổi.
- Unit test colocated: `source/src/features/items/RoomSpecialistFilterCell.test.ts`.
- Thêm workflow scoped `.github/workflows/parallel-chat2-ui-checks.yml` — không deploy.

## Đang làm/chưa commit
- Không có file local chưa commit; các commit sửa UI/test/workflow đã đẩy. Báo cáo và checkpoint cập nhật bằng GitHub connector sau code SHA.

## Kiểm thử
| Kiểm thử | SHA | Trạng thái | Chứng cứ |
|---|---|---|---|
| Baseline FULL App QA | baseline trước luồng | PASS lịch sử, không áp dụng code mới | [run 41390964199](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199) |
| Chat2 npm ci / typecheck / unit / build | `876b69d` | RUNNING / xem trạng thái mới nhất | [run 41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605) |
| Browser real synthetic desktop/mobile | code mới | NOT RUN | Thiếu checkout chạy Vite ở môi trường hiện tại |
| Emulator Auth/RTDB/Functions end-to-end | code mới | NOT RUN | Không được gọi fixture là integration PASS |

## Quyết định cần giữ
- Không đổi palette, bố cục, popup khách, quyền, 60s polling hay business mappings đã chốt.
- Chỉ sửa điều kiện xử lý keyboard cho bộ lọc có giá trị; giữ AND phòng/chuyên viên.
- Không đụng shared runner hoặc production; CI QA chỉ chạy test.

## Đã thử nhưng không hiệu quả
- `git ls-remote https://github.com/cavoixanh638/HopHDND-WebApp.git` trong container: lỗi DNS `Could not resolve host: github.com`; GitHub connector vẫn fetch/update thành công.

## Vấn đề ngoài phạm vi / chưa giải quyết
- Nghi vấn `LeaseTextInput`: blur trước khi `manager.acquire` resolve có thể để lease còn held; cần browser/Emulator tái hiện trước khi chốt, không khẳng định đã xảy ra.
- Chưa có Chrome screenshot viewport/role/data giả mới; còn các luồng đặc biệt tải/rỗng/lỗi mạng cần E2E.

## Bước tiếp theo
1. Xem kết quả [run 41407686605](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605); nếu FAIL xem job logs rồi sửa đúng phạm vi.
2. Tạo/chạy Chrome/Emulator real-app synthetic QA riêng `source/parallel-qa/chat2/`, viewport 390/900/1440, guest/admin; tương tác Escape trên filter trong modal, kiểm scroll/focus và PNG.
3. Tái hiện riêng blur-before-acquire (lease ACK) và kiểm xử lý, tránh mất draft/false ACK; không sửa backend. Thêm regression chạy CI.
4. Kiểm tra diff/CI SHA cuối; ghi rõ các case PASS/NOT RUN, cập nhật report+checkpoint thành DONE hoặc DONE_WITH_EXTERNAL_GAPS đúng thực tế.

## Bàn giao cuối
- [Báo cáo](../reports/CHAT_2.md). Chưa DONE; chat sau đọc HEAD branch và tiếp tục các bước trên, không reset.
