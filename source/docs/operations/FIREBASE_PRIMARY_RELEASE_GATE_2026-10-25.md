## 25/10/2026 — Đối chiếu LIVE mirror và Office Excel mới nhất
- Người vận hành đã chạy `firebase database:get /` live read-only; `hdnd/items=0`, mirror vẫn 55 dòng cùng tập ID với snapshot và vẫn `syncedAt=2026-10-23T04:41:44.104873Z`. Không có bằng chứng đồng bộ hoạt động sau 23/10.
- Read-only Google Drive metadata của file Office nguồn (`1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp`) báo `modifiedTime=2026-10-25T04:22:14.272Z`. Trích xuất nội dung đọc được 55 dòng STT số trong tab dữ liệu (7 nội dung kỳ chuyên đề tháng 10, 48 nội dung còn lại). Số đếm **tạm khớp**, nhưng modifiedTime mới hơn và chưa biết thay đổi nào; chưa so từng ID và nội dung.
- Cảnh báo: Drive metadata báo phân quyền `anyone / writer` cho file Excel nguồn. Chủ file cần kiểm tra ngay trên Share settings, phân biệt việc chia sẻ cho nội bộ/khách; không mặc nhiên chấp nhận cho nguồn nghiệp vụ lâu dài.
- **GO gate:** thử khôi phục bản sao localhost, so `recordId` và 15 trường A–O bằng dữ liệu Office nguồn đã chốt tại cùng mốc, rà `syncedAt` thực và reason ảnh báo cáo 57. Nếu khác nhau, có thể tạo lại snapshot đối chiếu bằng quy trình một lần, **không ghi đè** primary/Excel; cần phê duyệt khi chuyển. `NO-GO` cho deploy Firebase Rules/migration production.

---

## 25/10/2026 — Metadata bổ sung: snapshot 23/10, không phải bản live ngày 25/10
- `schemaVersion=1`, `syncedAt=2026-10-23T04:41:44.104873Z`, `sourceModifiedAt=2026-10-23T02:07:11.387Z`, `rows=55`. Đầu ra PowerShell do người vận hành gửi từ file `database-1.json` riêng tư.
- Bản mirror có timestamp cũ hơn hai ngày so với ngày kiểm tra. Đếm ID trùng=0 trên backup, **chưa có bằng chứng live**: không bật `dataSource=primary`, không lập luận dataset đã đầy đủ chỉ từ số 55. Chênh lệch 57/55 từ ảnh khác thời điểm phải xác minh nguồn và phép lọc, không tự ý bù/xóa hai nội dung.
- GO gate mới: đọc RTDB **read-only** hiện tại vào file timestamped riêng tư, in **chỉ metadata** (total rows, ID count, syncedAt, items count) và đối chiếu bộ ID với backup. Sau đó chạy `validateExcelMirror`/restore staging mới xem xét kết luận nguồn.

---

## 25/10/2026 — Cửa kiểm kê dữ liệu trước migration (không để mất nội dung)
- Người vận hành đã đếm trên backup: 1 mirror source/1 dataset/55 dòng/0 ID trùng; `Mirror metadata valid` chưa trả kết quả rõ trong transcript. **Không đánh dấu mirror verified**.
- **Bất thường có thể nghiêm trọng:** báo cáo giao diện người dùng trước đó cho thấy `Tiến độ xin ý kiến Thành ủy (57 nội dung)`; nếu cùng nguồn và cùng thời điểm, việc chuyển 55 dòng sẽ làm thiếu ít nhất hai dòng. Cần kiểm tra dữ liệu ở website tương ứng mốc nào, mirror `syncedAt`/sourceModifiedAt và danh sách recordId trước khi GO. Không suy rằng chắc chắn thiếu dữ liệu khi chưa xác nhận nguồn/mốc.
- Điều kiện GO bổ sung: `validateExcelMirror` đạt, staging restore toàn bộ backup khớp hash, số nội dung khớp bản live và expected source IDs, không sót bản nháp local, kiểm `hdnd/items` vẫn rỗng ngay tại thời điểm transaction. **NO-GO** cho import production nếu tồn tại chênh lệch chưa giải thích.

---

## 25/10/2026 — Kết quả kiểm kê các nhánh trên backup (reported by operator)
- `hdnd/items`: 0 tại thời điểm backup. `hdnd/mirrors`: 1 khóa con trực tiếp (có thể bao gồm nhiều GID); `hdnd/profile` và `hdnd/permissions` tồn tại; `hdnd/profile.dataSource` trống/không hiển thị. Không coi đây là bằng chứng có thể switch source tức thì.
- **Tiếp theo:** kiểm đúng cấu trúc `hdnd/mirrors/{spreadsheetId}/{gid}`, `schemaVersion=1`, `rows` không rỗng, metadata `source`/SHA/timestamp và record IDs trước staging import. Backup phải restore thành công trên Emulator cô lập.
- **Bắt buộc kiểm lại live khi GO:** RTDB export tại ngày backup có thể cũ. Ngay trước migration phải đọc `hdnd/items` thật để chắc chắn vẫn chưa có bản ghi và kiểm tra biên nhận Rules của đúng project/instance. Không ghi vào `hdnd/items` trước khi test quyền parent write + child validations trên Emulator.

---

## 25/10/2026 — Bằng chứng backup mới nhất và mức chứng minh
Đầu ra PowerShell người vận hành cung cấp (không tự truy cập file trong ChatGPT/GitHub): cả hai `database-[1,2].json` cùng 56.185 bytes và SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`; `rules-live.json` 24.497 bytes, SHA256 `7A391D5031DA4C6FA8CD73DC360F20E07973B664B6CCDB6528150D12411F589F`. Ba file đã qua PowerShell `ConvertFrom-Json`; Rules có trường `rules`.

**GO/NO-GO:** xuất dữ liệu và sao lưu file Rules qua kiểm tra JSON ban đầu. Chưa độc lập xác nhận bản Rules là bản Published thật, chưa xác minh nguồn dữ liệu nghiệp vụ/đích migration rỗng, chưa thử phục hồi, chưa diff candidate với Rules live và thử 2 tài khoản. **NO-GO** cho thay đổi Rules/Database production. Bảo mật: file Rules và Database ở máy người vận hành, không chia sẻ nội dung qua GitHub/ChatGPT. Tiếp tục kiểm tra metadata và restore drill chỉ trên emulator/staging đã cô lập. Không chạy lệnh `firebase deploy` hoặc `database:set` đối với project production.

---

## Ghi nhận CHECKPOINT sao lưu READ-ONLY — 25/10/2026
- Đã nhận **kết quả PowerShell do quản trị viên cung cấp**: Firebase CLI export `/` 2 lần trên `hophdnd-8b7b2/hophdnd-8b7b2-default-rtdb` và cả hai tệp có cùng SHA256 `D9EF2CBA435AD2BC626D2864303BC770B6B010F0ECB1175460683ADDDFADC08D`. Tệp nằm trên máy người vận hành, **chưa được công cụ GitHub/ChatGPT tự đọc**.
- Đây mới là `DATA_EXPORT_CONSISTENCY=USER_REPORTED_PASS`, không phải đầy đủ `BACKUP_PRODUCTION_VERIFIED` vì chưa xác minh cấu trúc file, chưa sao lưu Rules Published, chưa thử phục hồi hay kiểm tra chặn đường ghi/đường cha.
- **Cửa kế tiếp:** vào Firebase Console → Realtime Database → Rules, chép Rules **đang có hiệu lực** ra JSON riêng tư trong cùng kho sao lưu (không click Publish), kiểm `ConvertFrom-Json` và SHA256. Sau đó so với candidate bằng bản copy không công khai và thử restore riêng. Không chạy `firebase deploy`, `database:set`, `database:update` hay thay đổi profile.

---

## Công cụ bổ sung cho bước sao lưu: read-only operator helper
- Đã thêm `source/scripts/firebase-production-readonly-backup.mjs`, cùng [hướng dẫn Windows](FIREBASE_READONLY_BACKUP_HANDOFF_2026-10-25.md). Công cụ dùng Firebase CLI **chỉ thực hiện `database:get /`** hai lần với project và instance bị giới hạn, so hash, cất Rules người vận hành cung cấp, tạo manifest ở nơi riêng tư ngoài repo.
- **Chưa chạy production:** không có Firebase Console đang đăng nhập trong phiên làm việc và không lấy dữ liệu bằng GitHub. Không được đổi GO/NO-GO sang PASS nếu chưa có bằng chứng export thật, đối chiếu Rules đã Publish, thử khôi phục và phê duyệt.
- Kết quả thử offline trong CI không thay thế quyền Firebase production. Quy trình được thiết kế để tránh đẩy dữ liệu nghiệp vụ hoặc file Rules thật lên GitHub.

---

## Bổ sung bảo vệ 25/10: deadline từ chối ghi ngay trên Firebase Rules
- Candidate Rules đã kiểm tra `now < hdnd/freezeControl/deadline` cho **mọi ghi nội dung trong DRAINING** và việc gia hạn khóa cũ: ngay cả khi tab admin đóng, sau deadline sẽ không ai tiếp tục cập nhật dữ liệu được; điều này bảo vệ dữ liệu chờ chốt.
- **Đây không phải server coordinator:** chỉ admin/browser sau khi trở lại mới có thể chuyển giá trị `mode` sang `FROZEN` và ghi biên nhận. Nếu admin đóng tab khi DRAINING, phải quay lại kiểm tra/chốt, không thông báo cho người dùng rằng biên nhận đã sinh tự động.
- Bằng chứng CI staging cuối mã [#40160812278](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40160812278) PASS trên `8391041abc727835b7d7ff8f3b12750de950d776`, **không** chứng minh backup/triển khai production.

# HopHDND — Cổng phát hành Firebase chính, khóa ô và chốt số liệu
**Ngày:** 25/10/2026 · **Áp dụng:** PR #71 → PR #72 · **Trạng thái:** CHƯA PHÁT HÀNH PRODUCTION (HOLD)

> Tài liệu này là **điểm vào vận hành có hiệu lực** cho việc chuyển khỏi Excel. Những mô tả trước đó khẳng định Excel là nguồn dữ liệu lâu dài chỉ mang ý nghĩa lịch sử. Không suy ra đã phát hành từ việc CI PASS, PR được merge, hoặc Pages được build.

## 1. Kiến trúc và trạng thái
- **Website đang chạy (main `c85b16dd9b0ea3c02d2eae98d80985dc5d8de8f4` khi lập tài liệu):** bản dữ liệu Excel/mirror Firebase, các sửa được giữ trên máy; không bảo đảm đồng bộ sửa thực.
- **PR #71 (Draft):** nguồn dữ liệu chính `hdnd/items`, import một lần từ bản sao được xác nhận `hdnd/mirrors/{spreadsheetId}/{gid}`. Không tự truy cập Google Sheets sau khi chọn `dataSource=primary`. Chuyển nguồn phải do admin xác thực, xác nhận rõ, chỉ khi đích rỗng và đọc lại mọi dòng khớp. Tuyệt đối không nhập chồng bản ghi và không xóa bản nháp local.
- **PR #72 (Draft, dựa trên #71):** khóa độc quyền `hdnd/editLocks/{recordId}/{field}` (uid + phiên tab + token + thời hạn), `hdnd/freezeControl` (OPEN → DRAINING → FROZEN → OPEN), `hdnd/freezeReceipts/{epoch}`, quy tắc bảo vệ `firebase/database.exclusive-candidate.rules.json`. Trình sửa chính và popup dùng chung khóa, lưu theo Firebase CAS, chỉ server ACK mới được coi là thành công.
- **Không phải cùng một chế độ:** `hdnd/control/editingLocked` dừng khách (admin tiếp tục được ghi), `freezeControl.mode=FROZEN` ngăn cả khách và admin ghi nội dung. Excel/Google Sheet **không còn là nguồn thật** sau khi chuyển, có thể giữ để export/đối chiếu dự phòng.
- **Tài liệu thiết kế:** [CELL_EDIT_EXCLUSIVITY_AND_FREEZE](../decisions/CELL_EDIT_EXCLUSIVITY_AND_FREEZE_2026-10-25.md) và [quy trình chạy thử](CELL_EDIT_FREEZE_EXECUTION_2026-10-25.md).

## 2. Điều kiện GO / NO-GO trước khi động tới production
Tất cả phải có bằng chứng độc lập, gắn **exact SHA**, URL bản build và tên người xác nhận:

| Cửa kiểm tra | Bằng chứng phải thu thập | Nếu thiếu |
| --- | --- | --- |
| SHA cố định, 2 PR không stale | `main`, head #71, head #72, kết quả merge preview và CI PASS tại đúng head cuối | **HOLD** |
| Sao lưu Firebase hiện hành | Toàn bộ Rules + Database JSON (bao gồm `hdnd/profile`, `hdnd/permissions`, `hdnd/control`, `hdnd/items`, `hdnd/mirrors` nếu có). Bản sao lưu **ở nơi riêng tư ngoài GitHub**, có SHA-256 và thử đọc/khôi phục trên emulator hoặc môi trường thử nghiệm | **HOLD** |
| Đối chiếu Rules đang chạy | Chủ dự án/nhân sự có quyền đọc Firebase Console chép đầy đủ Rules mới nhất; so với `database.exclusive-candidate.rules.json`, rà nhánh khác và mọi đường admin write cha. Không giả định bản 16/10 còn đúng | **HOLD** |
| Nguồn nhập hợp lệ | Bản sao Firebase có đủ schema/ID/giá trị; đích `hdnd/items` rỗng; kiểm tổng số dòng/hash, `permissions`, quyền từng ô và nháp Chrome Ẩn danh trước khi chuyển | **HOLD** |
| Security & concurrency | Emulator thử: 2 UID + 2 tab cùng UID cùng ô, các trường khác nhau, stale token, timeout, role grant/revoke, forged parent write, xóa dòng, mất mạng, freeze đột ngột | **HOLD** |
| Staging Browser | Trình duyệt thực mở 2–3 tài khoản; dropdown/IME/note/modal, xác nhận ACK, lịch sử, báo cáo và rollback; không chạm dữ liệu production | **HOLD** |
| Đóng băng sau khi admin đóng tab | Hiện trạng: bộ đếm/auto-freeze chạy ở UI admin; nếu admin rời trang khi DRAINING, hệ thống **không tự bảo đảm chuyển FROZEN đúng hạn**. Cần backend điều phối đã được phép triển khai **hoặc** vận hành bắt buộc admin mở phiên chốt đến khi nhận biên nhận và đối chiếu `FROZEN` trước khi phê duyệt | **HOLD đối với cam kết đóng băng tự động không người trực** |
| Triển khai Production | Kiểm tra tài khoản/quyền, kích hoạt Rules đúng project và readback Rules, chuyển dữ liệu bằng admin, 2 người sửa, thử đóng băng, bản sao lưu rollback và ghi nhật ký quyết định | **HOLD** |

**Đặc biệt:** GitHub Pages chỉ chạy mã front-end. Workflow `.github/workflows/publish-pages.yml` **không** tự cập nhật Realtime Database Rules, không xuất hay sao lưu RTDB và không cung cấp Firebase Admin SDK. Không merge các PR nhằm “bật nhanh” trước khi có Rules thật và bản sao lưu.

## 3. Quy trình chuyển nguồn có thể thực thi khi GO
1. Quản trị xác nhận đúng **Firebase project `hophdnd-8b7b2`** và đúng instance RTDB trong `src/data/firebase-config.ts`. Kiểm tra trên Firebase Console, không chỉ tên URL trên ứng dụng.
2. Sao lưu **Rules và toàn bộ JSON dữ liệu** từ Firebase Console vào kho an toàn có kiểm soát truy cập. Lưu hai bản độc lập; xác minh SHA-256 và đọc được JSON. Không đính kèm JSON nghiệp vụ, email/UID, access token hoặc service account lên GitHub/PR/Actions.
3. Đối chiếu tại chỗ Rules production với candidate. Chạy kiểm thử `npm ci && npm test && npm run typecheck && npm run test:firebase && npm run docs:check` tại `source/`; thử cả hành vi **cho phép** và **từ chối**. Nếu thực tế Rules đã đổi, tạo candidate mới và test lại, không ghi đè nguyên file.
4. **Chỉ sau khi đã có bản sao Rules thật**, phát hành candidate đã duyệt qua Firebase Console/CLI có chỉ định chính xác project. Chú ý lệnh `firebase deploy --only database` sẽ ghi đè **toàn bộ** Rules theo `firebase.json`; mặc định trong repo hiện tham chiếu `database.rules.json` (khóa ghi nghiệp vụ), **không được chạy lệnh này trực tiếp** với cấu hình mặc định. Không đẩy candidate lên `database.rules.json` trước khi được phê duyệt.
5. Đọc lại Rules phía server (không chỉ tín hiệu thành công CLI). Thử 2 người thật bằng dữ liệu thử cho phép và hành động bị chặn. Nếu không khớp phải quay Rules cũ và giữ Website ở chế độ cũ.
6. Xác nhận `hdnd/items` chưa có dữ liệu; đối chiếu snapshot trong `hdnd/mirrors`, quyết định dừng job mirror làm nguồn nghiệp vụ. Phải có bản sao đầy đủ của `hdnd/profile` và quyền. Kiểm tra mọi bản nháp local còn đang mở; yêu cầu người dùng sao chép/đối chiếu và không đóng cửa sổ Ẩn danh khi chưa an toàn.
7. Admin thực hiện **chuyển một lần**, đọc lại toàn bộ `hdnd/items` và từng trường. Chỉ sau đó mới đặt `hdnd/profile/dataSource=primary`; nếu một bước lỗi, KHÔNG tự động chuyển ngược sang Excel, KHÔNG nhập lại; đưa trạng thái **HOLD** để điều tra.
8. Từ hai trình duyệt đã cấp quyền: A chiếm Ghi chú, B bị chặn trên cùng ô; B vẫn sửa được một ô khác. Thử một tab khác cùng UID. Lưu ACK và kiểm tra client thứ ba thấy cập nhật realtime. Thử thu hồi quyền sửa khi có editor, mất kết nối, lease hết hạn, nhập tiếng Việt, Esc dropdown.
9. Admin chọn **Yêu cầu lưu rồi chốt**: server đặt DRAINING và từ chối khóa mới, đợi ACK; sau khi chuyển FROZEN đọc lại dữ liệu, số dòng, hash từ Firebase và xác nhận biên nhận. **Không** tuyên bố chốt nếu admin đóng tab khi còn DRAINING; mở lại admin để xác nhận/tiếp tục. Test **Đóng băng ngay** với bản nháp chưa ACK, bảo đảm giữ nháp và không tính số liệu.
10. Ghi vào biên bản: thời điểm/mã SHA, trạng thái READBACK của DB/Rules, số dòng, số ô bị chặn do khóa, hai tài khoản thử, link CI và biên nhận chốt; sau đó mới công bố nghiệm thu.

## 4. Rollback an toàn
- **Không xóa bất cứ nhánh dữ liệu nào** để rollback. Nếu lỗi UI, dùng bản Pages/commit đã lưu trước đó, đồng thời **không mở ghi lại** khi Rules không tương thích. Nếu lỗi Rules, khôi phục đúng bản Rules production đã sao lưu, rồi xác nhận server readback; phương án cũ có thể không hiểu kiểu nguồn `primary` nên phải đối chiếu profile trước khi quay về UI cũ.
- Khi `hdnd/items` đã nhận thay đổi người dùng thật, **không reset /hdnd/items** hoặc nhập lại snapshot Excel. Chỉ tiến hành khôi phục dữ liệu riêng lẻ sau khi đối chiếu lịch sử và có quyết định rõ từ quản trị.
- Nếu `FROZEN` nhưng thiếu biên nhận, giữ FROZEN, truy hồi JSON server ở trạng thái chốt và lập biên nhận trước khi mở lại. Nếu DRAINING bị kẹt vì admin rời trang, không tự ghi local draft; đăng nhập lại để xác nhận khóa/ACK, chọn hoàn tất chốt hoặc hủy DRAINING theo tình hình.
- Khi phát hiện xung đột/mất mạng: nháp chưa ACK vẫn là **dữ liệu trên thiết bị**, người dùng phải đối chiếu trước khi gửi lại; không thông báo “đã lưu chung”.

## 5. Những việc tuyệt đối không làm
Không đăng service account lên GitHub; không sửa Rules production chỉ dựa trên kết quả emulator; không nhập chồng `hdnd/items`; không bấm “Bỏ nháp” khi chưa đối chiếu; không chuyển nhãn mặc định `dataSource` sang `primary` bằng mã để bỏ qua bước migrate; không tính trạng thái DRAINING là một snapshot; không coi Excel/mirror là nguồn chính sau khi chuyển.
