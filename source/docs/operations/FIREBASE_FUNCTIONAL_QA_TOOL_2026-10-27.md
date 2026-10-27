# Bộ công cụ kiểm thử chức năng Firebase HopHDND (QA tự động)
**Ngày:** 27/10/2026 · **Đối tượng:** Firebase Project `hophdnd-8b7b2` nhưng kiểm thử bằng **dự án Emulator `demo-hdnd`**, không sửa dữ liệu thật.

## Chạy trực tiếp trên GitHub
Vào [Actions → Firebase operational QA — isolated multi-account test](https://github.com/cavoixanh638/HopHDND-WebApp/actions/workflows/firebase-operational-qa.yml), bấm **Run workflow**, chọn `main` rồi Run. Sau khi workflow hoàn tất, mở run mới nhất:

- Phần **Summary** hiển thị báo cáo tiếng Việt (PASS/FAIL/SKIP theo từng nhóm).
- Mục **Artifacts → `hophdnd-firebase-functional-qa`** chứa `firebase-qa-report.html`, `firebase-qa-report.md`, `firebase-qa-summary.json`, `firebase-vitest.json`. File HTML mở được trên Chrome không cần Firebase. Khi có lỗi, CI đỏ và cố giữ artifact để kiểm tra.
- Workflow cũng chạy mỗi khi có PR/push thay đổi Rules, mã dữ liệu, mã tài khoản, tests hoặc công cụ QA.

## Chạy trên máy phát triển (PowerShell)
Từ `D:\HopHDND-Dev\source`, đã cài Node 24, Java 21 và `npm ci`:

```powershell
npm run qa:firebase
```

Đây là **một lệnh duy nhất**, không cần tạo nhiều luồng chat hay tự đăng nhập hàng loạt tài khoản Google. Trình chạy sẽ mở Auth+Realtime Database Emulator và dùng Rules ở `firebase/database.exclusive-candidate.rules.json` để chạy các tài khoản Google/khách mô phỏng. Nó chặn mọi biến môi trường URL Firebase riêng hoặc credential production, chặn chạy khi thiếu hai Emulator ở 127.0.0.1:9000/9099, không dùng Firebase service account, không deploy Rules, không ghi `hophdnd-8b7b2`.

## Kiểm tra những gì?
| Nhóm QA | Đối tượng |
|---|---|
| Xác thực | Phân biệt Google đã xác minh, giả mạo provider, khách ẩn danh, phiên khác tab |
| Phân quyền | Cho phép/cấm UID Google, thu hồi quyền khi đang giữ khóa, quyền ô cấm ghi đè quyền cột |
| Khóa ô | Hai UID cạnh tranh cùng ô, sửa ô khác, token và phiên hết hạn, ngăn chiếm/cướp khóa |
| Lưu và xung đột | Server ACK, CAS phiên bản, stale draft, chống ghi đè trực tiếp và sửa ID/STT |
| Đồng bộ realtime | onValue truyền thay đổi tới nhiều tài khoản, mất mạng rồi xác nhận |
| Lịch sử | Lưu giá trị trước/sau, ngăn khai man và sửa lịch sử từ client |
| Khóa/chốt | OPEN → DRAINING → FROZEN, chặn chỉnh sửa sau deadline, chốt khẩn |
| Nạp dữ liệu | Khởi tạo khi `hdnd/items` rỗng, không nhập chồng hoặc bỏ qua cảnh báo |

**Phân loại Rules quan trọng:** `exclusive-cell-freeze.test.ts` kiểm bộ Rules ứng viên khóa ô mới; `firebase-emulator.test.ts` và `firebase-production-rules.test.ts` là các bài hồi quy trên Rules cũ/ứng viên trước đó; `firebase-tab-auth.test.ts` dùng Auth Emulator. Báo cáo phân biệt rõ, không lấy các lần PASS trên Rules cũ để tuyên bố ứng viên mới đạt.

## Điều gì KHÔNG được tuyên bố?
**Không phải chứng nhận production GO.** Ứng viên Rules mới có lỗ hổng **same Google UID dùng 2 tab có thể đọc/replay token khóa**; kiểm thử `it.fails` ghi là **KNOWN RISK**, không được biến thành PASS về bảo mật. Ngoài ra `hdnd/.read=auth != null` cho phép người đã xác thực đọc rộng, chưa có cô lập đọc theo người. Ghi nhận các giới hạn này trong báo cáo mọi lần chạy.

Emulator không thể đọc dữ liệu Rules hiện đang publish trên Firebase Cloud, không kiểm chứng backup thật và không thể chứng minh người dùng Google thật đa thiết bị đang dùng được. Để xác nhận vận hành trên Cloud, quản trị đăng nhập WebApp → **Tài khoản Firebase → Kiểm tra vận hành Firebase**, ghi nhận `dataSource`, số hồ sơ, quyền, chế độ chốt, sau đó đối chiếu Rules Published/backup và kiểm thử hai tài khoản khác UID theo quy trình. **Không thử ghi/xóa thật khi chưa có quy trình kiểm thử cô lập hoặc dữ liệu được duyệt.**

## Mã nguồn và hồ sơ bàn giao
- `source/scripts/firebase-functional-qa.mjs`: kiểm tra chỉ chạy Emulator, gọi Vitest, lưu báo cáo ngay cả khi test fail.
- `source/scripts/firebase-qa-report.mjs`: tổng hợp JSON/Markdown/HTML, phân loại nhóm chức năng, đánh dấu lỗ hổng rõ ràng; nội dung test sử dụng dữ liệu tổng hợp.
- `.github/workflows/firebase-operational-qa.yml`: job có thể kích hoạt thủ công và tự động khi sửa code/security, artifact lưu 30 ngày.
- `source/tests/exclusive-cell-freeze.test.ts`: bổ sung kiểm thử UID bị thu hồi giữa lúc sửa và ô bị cấm ghi dù cột cho phép.

Quy tắc: Mọi PR liên quan Rules, auth, dữ liệu hoặc lease phải có **báo cáo QA** kèm SHA commit và Rules ứng viên. Bài test expected-failure bảo mật không thể bị bỏ mà không có giải pháp xác thực phiên server-side được chứng minh.
