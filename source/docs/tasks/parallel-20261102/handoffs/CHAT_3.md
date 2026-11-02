# Checkpoint — Chat 3: Công cụ nhập dữ liệu lần đầu

- Trạng thái: **IN_PROGRESS** (đã commit thay đổi; CI chưa có kết luận cuối)
- Cập nhật: 02/11/2026, Asia/Saigon
- Vai trò: [CHAT_3_BOOTSTRAP.md](../CHAT_3_BOOTSTRAP.md)
- Repository/branch: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat3-bootstrap`
- Worktree local: **không có**; chỉnh sửa đã push thẳng qua GitHub connector
- Mốc xuất phát: `0a04b81dbb00979fb87aee7fc497e802058d8518`
- Code SHA gần nhất: `f0c3f88af23371d4e87a97227fc4c15f63981014`
- Tested SHA: **NOT RUN (đang chờ CI)**; workflow #41407800031 cùng code SHA
- Draft PR: không tạo, không merge
- Writer khác cùng branch: **chưa xác minh**; lịch sử ref trước lần ghi là bootstrap docs-only, các commit trong phiên này thuộc luồng 3.

## Đã hoàn tất
- Rà tài liệu nhiệm vụ, quy ước chung, hướng dẫn và mã CLI/parser/CAS liên quan.
- Mã CLI: kiểm lại nguồn và approval ngay trước CAS; thêm attempt receipt không chứa token, exit 2 trước CAS và exit 3 UNKNOWN sau CAS; timeout cho đọc/ghi, chống ghi receipt vào checkout.
- Script QA độc lập: `source/parallel-qa/chat3/operator-preflight.mjs` kiểm trường hợp âm trên **executable thật**, workbook tổng hợp, quyền và root không trống với REST witness.
- Workflow mới chỉ test: `.github/workflows/parallel-chat3-operator.yml`, Auth/RTDB/Functions Emulator + FULL Rules; gọi thêm FRV-02 CAS/readback/repeat.
- Hướng dẫn operator: `source/docs/operations/PR147_OPERATOR_FIRST_IMPORT.md` đã bổ sung bảng kết quả và cách khôi phục khi UNKNOWN.
- Báo cáo chi tiết: [reports/CHAT_3.md](../reports/CHAT_3.md).

## Đang làm / chưa commit
- Không có file chưa commit trong worktree; đã push tất cả thay đổi có chủ ý.
- Đang chờ CI từ GitHub và kiểm chứng thực nghiệm các failure injection (nguồn đổi sau xác nhận, mất ACK).
- Không được coi đây là DONE hay production-ready cho đến khi đạt kiểm thử.

## Kiểm thử
| Kiểm thử | SHA | Trạng thái | Bằng chứng |
|---|---|---|---|
| GitHub Actions độc lập của Chat 3 | `f0c3f88af23371d4e87a97227fc4c15f63981014` | QUEUED | [run #41407800031](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407800031) |
| npm typecheck + CLI preflight + FRV-02 emulator tại cùng SHA | cùng SHA | NOT RUN / chờ workflow | Các bước đã khai báo, chưa có PASS |
| Local Node22 / Emulator | cùng SHA | NOT RUN | Container không clone được repo vì DNS github.com không hoạt động |
| Production Auth, RTDB, Rules hoặc import thật | N/A | NOT RUN | Tuyệt đối không chạy |

## Quyết định cần giữ
- Bất cứ lỗi nào sau lúc gọi CAS đều mặc định là **UNKNOWN** (mã 3), kể cả timeout/rejection; không tự gửi lại.
- Thao tác trước CAS là HOLD (mã 2). Receipt attempt độc quyền/0600, không chứa token hoặc dữ liệu nguồn.
- `fullRootSnapshotSha256` chỉ là chứng cứ operator cung cấp, không phải live full-root proof; cần kiểm tra độc lập.
- Chỉ chỉnh CLI, hướng dẫn, QA, workflow riêng; không đổi parser/API/CAS/Rules/config release dùng chung.

## Đã thử nhưng không hiệu quả
- Clone bằng HTTPS từ container thất bại `Could not resolve host: github.com`; dùng GitHub connector trực tiếp để commit, GitHub Actions cho thử nghiệm.
- Những run cũ bị auto-cancel khi có commit mới, không ghi nhận chúng là PASS hoặc FAIL kỹ thuật.

## Vấn đề ngoài phạm vi
| Vấn đề | Bằng chứng | Chủ sở hữu | Phần bị chặn |
|---|---|---|---|
| Chứng minh full-root production và quyền người dùng thực | Chỉ có dữ liệu tổng hợp/Emulator, không có credential live | Điều phối / người vận hành | GO production |
| Fault-injection mất ACK / nguồn đổi sau confirm | Chưa có test runtime tại code SHA mới | Chat 3 | Đủ bằng chứng DONE |

## Bước tiếp theo ưu tiên
1. Kiểm [CI run #41407800031](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407800031) và log job. Nếu lỗi, sửa trong scope và chạy lại, không sửa expected để làm xanh.
2. Diễn tập trường hợp mất kết nối, nguồn đổi trong lúc chờ stdin và CAS ACK mất bằng executable thật. Kiểm receipt và snapshot server có/không đổi.
3. Sau khi kiểm đủ gate, cập nhật `reports/CHAT_3.md` và checkpoint với tested SHA & kết quả thật; nếu không đủ bằng chứng giữ **IN_PROGRESS / DONE_WITH_EXTERNAL_GAPS**, tuyệt đối không gọi PASS cho việc chưa chạy.

## Bàn giao cuối
- Checkpoint này và báo cáo đều đã lưu trên nhánh Chat 3; không merge.
- Production: **NOT RUN**.
- Nếu tiếp tục Chat 3, chỉ cần gửi link file nhiệm vụ; kiểm checkpoint HEAD nhánh này rồi làm mục tiếp theo.
