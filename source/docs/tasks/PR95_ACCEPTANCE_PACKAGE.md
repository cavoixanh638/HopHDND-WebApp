# PR #95 — GÓI NGHIỆM THU TRÊN EMULATOR (L1, 30/10/2026)

**Mục tiêu:** người quản trị kiểm tra nhanh giao diện và quy trình Excel A–O, không chuyển dữ liệu thật. **TRẠNG THÁI: CHỜ NGƯỜI DÙNG NGHIỆM THU; CHƯA PHÁT HÀNH.**

## 1. Mốc mã nguồn chính xác và tính toàn vẹn

- Repo: `cavoixanh638/HopHDND-WebApp`; nhánh PR #95: `feat/firebase-excel-safe-replacement-and-list-compact-20261030`, **PR #95 vẫn Draft**.
- PR #95 trước tích hợp: `01530a9ccedba021434626c1f717c2ac76fcaa64`.
- PR #110 (tích hợp thử đủ L1–L5, **đã đạt 5/5 CI**): `1b59f80e884ec7492ab8ded29b542f974479245c`.
- Merge **chỉ vào PR #95**: `95399729b5d0e3319b54eefc724249f9a0e4003f`. GitHub compare `1b59f80...95399729` cho **0 file khác biệt** (cùng mã/chức năng đã thử).
- Commit chứa **tài liệu này** là HEAD mới của PR #95; không tự nhúng SHA tự tham chiếu. Xem **bình luận L1 nghiệm thu cuối** tại [PR #95](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95) để lấy SHA HEAD và 5 CI của chính HEAD đó. Mọi commit tiếp theo phải đối chiếu lại HEAD.
- **Provenance:** 28 đường dẫn so với baseline: 21 file L1/L3/L4/L5; 5 file L2 (PR #105 tại `d1b95dad1f9b8af5195bb97023725f07dcbd9e9a`); 2 file sửa/test backend tích hợp. Không nhập lịch sử base `main` hoặc nhánh CI-base của worker; không thay Firebase candidate Rules.
- Sửa lỗi đã nghiệm thu: parser Excel A–O tạo thêm hai thuộc tính P/Q legacy rỗng `partyMeeting`/`examined`. Payload V2 loại **chỉ khi rỗng**, từ chối P/Q có dữ liệu trước staging/hashing/preview/CAS. Không nới Rules/đặc quyền.

## 2. Bằng chứng và file để mở

Bản tích hợp thử **cố định** tại SHA `1b59f80...` có **5 workflow SUCCESS** (không thay cho CI trên HEAD mới):
1. [Verify HopHDND source #41027149765](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149765): typecheck, **656 unit PASS**, **82 Firebase Emulator PASS + 1 expected-failure cũ**, Chrome thật nhập → thay → khôi phục bằng CAS.
2. [Isolated staging #41027149708](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149708): SUCCESS.
3. [Operational QA #41027149721](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149721): SUCCESS.
4. [RTDB wire ACK loss #41027149852](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149852): SUCCESS, 3 thao tác, server witness riêng.
5. [L3 two actual admin Chrome targets #41027149785](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149785): SUCCESS, lease/revision/draft fence trong **test harness**, không phải toàn bộ popup chỉnh sửa của App.

Tại trang **Verify source** (mục **Artifacts**):
- [HTML giao diện offline, chỉ dữ liệu giả](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149765/artifacts/12964546198) — `hophdnd-compact-interactive-offline`; giải nén và mở `HopHDND_GopCot_XemThu.html` bằng Chrome.
- [Ảnh giao diện Chrome thật trên Emulator](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149765/artifacts/12963769380) — `hophdnd-browser-smoke-preview`, bao gồm `hophdnd-ui-smoke-pass.png`, desktop/mobile và ảnh danh sách PR95.
- [Bản build ứng viên, KHÔNG được deploy](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41027149765/artifacts/12963778882) — `hophdnd-verified-hosting-candidates`.

**Phân biệt bắt buộc:** HTML mở offline chỉ nghiệm thu bố cục/tương tác trên dữ liệu giả; **không có Firebase Emulator** thì không chứng minh nhập, thay hoặc khôi phục dữ liệu máy chủ. Screenshot/log CI và thao tác server trên Emulator mới chứng minh ba lệnh CAS. Không dùng Pages production để thử import.

## 3. Chạy bộ demo/kiểm thử trên máy localhost

Yêu cầu: checkout đúng HEAD PR95, **Node.js 24**, npm, Java 21, Chrome/Chromium khả dụng trên PATH (runner Linux dùng `google-chrome` hoặc `chromium`), máy có thể cài phụ thuộc bằng `npm ci`. Chỉ chạy trong môi trường phát triển riêng, không dùng project Firebase thật.

Từ thư mục gốc repo:

```bash
cd source
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run build:pages:test
npm run build:compact:qa
node scripts/smoke-pages-browser.mjs
```

- `npm run test:firebase` sử dụng `--project demo-hdnd`, Auth/RTDB Emulator; **không production**.
- Script `smoke-pages-browser.mjs` tự dựng Auth/RTDB Emulator với Rules candidate tại `firebase/database.exclusive-candidate.rules.json`, một web server **127.0.0.1 cổng tạm** và Chrome headless thật. Script tạo hai file Excel .xlsx giả A–O trong thư mục tạm (`DATA_AO`, mã `NQ90` và `BC91`), tạo legacy fixture `FROZEN` trong Emulator, đăng nhập **Google-provider của Auth Emulator**, click nút App thật, kiểm tra server độc lập **read-only** sau từng CAS. Script sẽ dừng nếu thất bại, không owner-PUT V2 thay thế thao tác App.
- Tìm trong terminal: `BROWSER_EXCEL_INITIAL_UI_CAS_PASS`, `BROWSER_EXCEL_REPLACEMENT_UI_CAS_PASS`, `BROWSER_EXCEL_RESTORE_UI_CAS_PASS`, `BROWSER_SMOKE_PASS`. Nếu script dừng ở bước nào, **KHÔNG** gọi quy trình đó PASS.
- Khi cần duyệt riêng giao diện Vite trên localhost: `npm run dev:pages` (địa chỉ loopback do Vite in ra). **Không coi việc chạy Vite một mình là có phiên Google admin, dữ liệu FROZEN, Rules V2 hoặc backup**. Toàn luồng ghi chỉ hoạt động khi Auth + RTDB Emulator, candidate Rules và phiên quản trị đã được chuẩn bị đúng như harness. Không đưa credentials/cloud project vào demo.

## 4. Checklist người dùng nghiệm thu

| Bước | Thao tác / dữ liệu giả | Kết quả mong đợi |
| --- | --- | --- |
| A. Bố cục | Mở HTML offline; xem hai ô điều hướng, tab Danh sách, Báo cáo ở desktop/mobile. | Điều hướng gọn; không có bộ mẫu hiển thị cá nhân, ô lưu mẫu, checkbox chọn tất cả chuyên viên. Bộ lọc Phòng/Chuyên viên và tùy chọn cột còn; bảng có cuộn ngang nội bộ khi hẹp, ID mặc định 52px. |
| B. Excel xem trước | Trong App có Auth/RTDB Emulator, dùng **1 quản trị viên**; Cài đặt (⚙) → **Tài khoản và dữ liệu** → **Excel · Nhập/Xuất** → chọn `.xlsx` A–O giả, chọn rõ sheet `DATA_AO`, bấm **Kiểm tra toàn bộ file**. | Hai mã `NQ90`, `BC91`; báo 2 hồ sơ; phân loại NQ QPPL/BC, hiển thị 20 dòng đầu và thống kê thêm/đổi/bỏ/giữ; **chưa ghi dữ liệu**. File sai bị báo sheet/dòng/cột. |
| C. Staging + kích hoạt đầu | Với legacy **đã FROZEN, có ACK, không lease**, bấm **Ghi staging, đọc lại và sao lưu thử nghiệm**; kiểm tra 2 dòng staging/5 bảng báo cáo preview; nhập **đúng chuỗi xác nhận mà App hiển thị**, bấm **Kích hoạt V2 lần đầu bằng CAS**. | Staging và backup readback; server active V2 **revision 1**, đúng 2 bản ghi, đúng 1 operation/generation; App báo **ĐÃ COMMIT**, Danh sách/Báo cáo đọc nguồn live; nội dung `PR95 INITIAL nghị quyết`. |
| D. Thay thế | Chọn workbook giả thứ hai cùng mã `NQ90`/`BC91`, nội dung đổi thành `PR95 REPLACE ...`; kiểm tra preview, staging, nhập chuỗi xác nhận mới rồi bấm **Chuyển thế hệ bằng CAS**. | Server **revision 2**, đúng 1 operation/generation mới và backup riêng tư; Danh sách 2 bản ghi, Báo cáo 5 bảng; nội dung thay thế được hiển thị. Không cộng dồn dòng hai generation. |
| E. Khôi phục | Quay lại tab Excel, dùng `operationId` của bước D tại **Tra cứu trạng thái operationId** (có thể không chọn lại file); sau khi backup được xác minh, nhập **mã khôi phục mới** (12–80 ký tự), xác nhận `KHOI PHUC <mã>`, bấm **Khôi phục bằng CAS**. | Server **revision 3**, đúng một operation/generation mới; 2 dòng và 5 bảng báo cáo quay về **`PR95 INITIAL nghị quyết`**. |
| F. Hai tab | Khi cần kiểm quyền/lease, mở **hai Chrome targets có cùng UID quản trị của Auth Emulator**, đối chiếu suite L3. | Cùng ô chỉ một lease hợp lệ; hai ô khác nhau không mất cập nhật; tab/nháp/lease thuộc generation cũ không thể ghi generation mới. Đây là chứng cứ **harness thực**, chưa phải toàn bộ UI edit-popup. |
| G. Tình huống UNKNOWN | Quan sát kết quả `unknown`/mất ACK khi test lỗi mạng có kiểm soát. | Không tự gửi lại CAS hay restore. Dùng **Tra cứu trạng thái operationId** chỉ đọc; chưa có chứng cứ COMMITTED thì không khẳng định thành công hay thất bại. |

Lưu ý ảnh offline và CI chạy **fixture giả**; các con số 2 dòng/5 bảng/revision 1→2→3 chỉ là oracle cho bộ smoke cố định, **không phải số liệu nghiệp vụ thật**.

## 5. Điều kiện chưa được mở / ranh giới phát hành

- **Chưa GO production.** UI ghi thế hệ vẫn được cố ý gắn nhãn/chặn bên ngoài cấu hình Emulator. Firebase production Rules đã publish, database hiện hành, quyền UID Google thật, backup riêng tư và rollback thực **chưa được xác minh**.
- Nhóm L3 kiểm toán cấu hình/khả năng phát hành **độc lập** theo [phân công 6520443575](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6520443575). Không suy luận merge vào `main` sẽ tự bật được import/replace.
- Expected-failure legacy cùng UID tại `tests/exclusive-cell-freeze.test.ts:444` vẫn là phạm vi riêng; kết quả hai tab V2 không chứng minh đã loại mọi khả năng cố ý replay token ở legacy.
- Tuyệt đối không merge PR95 vào `main`, publish GitHub Pages, deploy Firebase Rules/Functions/Hosting, dùng Excel/backup thật, hoặc đọc/ghi/import/xóa/restore dữ liệu production khi chưa có phê duyệt phát hành riêng.

## 6. Bàn giao

Người dùng chỉ cần xem **HTML offline + ảnh** để đánh giá phần bố cục và, nếu muốn xác nhận quy trình dữ liệu, xem ba mốc CAS/operationId trong **GitHub Actions và demo Emulator**. Phản hồi theo từng bước A–G: **Đạt / Cần sửa** và ảnh/minh chứng lỗi. L1 chịu trách nhiệm sửa lỗi phát hiện trên PR95 và kiểm lại 5 CI tại HEAD mới; L3 rà phát hành song song, không là điều kiện chặn lập gói nghiệm thu này.
