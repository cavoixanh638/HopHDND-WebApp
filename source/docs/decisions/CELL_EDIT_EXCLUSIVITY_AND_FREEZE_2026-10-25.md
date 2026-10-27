# Thiết kế kỹ thuật — Khóa ô độc quyền, thời hạn sửa và đóng băng số liệu (HopHDND)
**Ngày:** 25/10/2026  
**Trạng thái:** ĐỀ XUẤT KIẾN TRÚC, CHƯA TRIỂN KHAI / CHƯA ĐƯỢC PHÉP MERGE  
**Phạm vi:** PR #71 (Firebase `hdnd/items` là dữ liệu chính, Excel chỉ để nhập và dự phòng)

## 1. Bằng chứng hiện trạng
- `ItemList.tsx`, `ReportDetailGrid.tsx`: chọn trạng thái qua `CellPicker`, ghi chú/tiến độ hiện tại qua `InlineNoteEditor`, nội dung trình qua `ContentEditor`, ô text thường qua `<input>`; tất cả sửa bản nháp qua `onUpdate` nhưng **chưa có phiên giữ quyền sửa từng ô**.
- `CellPicker`: mở dropdown bằng click, nhập chuỗi tìm kiếm không đồng nghĩa đã chọn, Esc/outside click đóng, `choose()` áp dụng và đóng ngay.
- `InlineNoteEditor`: mở khi click, giữ bản nháp trong textarea, blur/Ctrl+Enter áp dụng vào bản nháp, Esc hủy.
- `ContentEditor`: modal có local recoverable draft, nhấn Áp dụng chuyển vào nháp rồi đóng; chưa đợi xác nhận máy chủ.
- `use-workspace.ts`: autosave bản nháp sau 800ms (với nguồn firebase), `FirebaseRepository.save` dùng transaction CAS theo record và field baseline; ngăn ghi đè dữ liệu tại thời điểm lưu, **không ngăn hai người cùng mở ô**.
- `use-firebase.ts`: đã có `editingLocked` và `saveEditingLock` cho admin. Trạng thái này chủ yếu khóa khách, **không phải chế độ đóng băng tất cả ghi**.
- Firebase production candidate rules có quyền `.write` ở đường dẫn tổ tiên cho admin; quyền cấp ở tổ tiên ghi đè các phép chặn `.write` con. Muốn cam kết khóa mọi tài khoản thì phải thiết kế quyền máy chủ rõ ràng, thử trên Rules thực tế và không để đường ghi khác vượt qua; `.validate` không chạy trên xóa.
- PR #71 vẫn DRAFT. Rules hiện hành chưa triển khai, Database production chưa chuyển sang `hdnd/items`. Không bao giờ dùng dữ liệu/mốc từ bản nháp trình duyệt làm nguồn đúng.

## 2. Mục tiêu (invariants)
1. Với cùng cặp `(recordId, field)`, tại thời điểm máy chủ chỉ có tối đa **một** `editSession` sở hữu khóa hợp lệ, kể cả 2 tab chung tài khoản.
2. Mọi đường ghi (**bảng chính, popup, sửa hàng loạt, API client cũ, admin**) phải được phía máy chủ kiểm tra quyền, phiên khóa và mode toàn hệ thống ở **thời điểm commit**; không có nhánh UI đi vòng.
3. Được sửa **khác trường cùng bản ghi** song song. Nếu thao tác nghiệp vụ cần đổi đồng thời hai trường phụ thuộc, lấy khóa nhiều trường theo thứ tự xác định và commit như một nhóm, không để một nửa.
4. Mất khóa/hết thời gian/mất mạng/đang đóng băng ⇒ dừng gửi write; giữ local draft để đối chiếu, không thông báo đã lưu.
5. Toàn bộ trạng thái chỉ cập nhật khi máy chủ xác nhận; không suy diễn từ Local Firebase event hay giờ của máy người dùng.
6. Bản xuất/snapshot trong `FROZEN` phải có revision/mốc chính xác và không nhận commit từ người dùng nào cho tới khi mở lại.

## 3. Khóa ô / lease
- Key vật lý: `recordId` (ID bền vững kể cả chuyển khỏi Excel) + **trường dữ liệu logic**: `progressParty`, `note`, `specificProgress`, v.v., không dùng vị trí hàng/cột và không dùng số ID hiển thị.
- Với ô gộp, mỗi trường con (Phòng, Chuyên viên, VP, UBND...) có khóa riêng. Khi một thao tác thực sự đổi 2 trường liên quan, chiếm cả hai khóa một cách nguyên tử hoặc không cập nhật.
- Bản ghi khóa: `uid`, `tabSessionId` ngẫu nhiên chỉ sống trong tab, `leaseId` không đoán được, `version`/fencing token tăng một chiều, `acquiredAt`, `expiresAt`, `lastRenewedAt`, `kind`. Dùng thời gian server qua Rules `now`/backend; giờ client chỉ để đếm ngược UX.
- Cấp khóa bằng transaction CAS hoặc một trusted callable service. Không cho mở editor trước khi máy chủ xác nhận khóa. Nếu bị chiếm, ô chỉ đọc và hiện nhãn “Khách/Quản trị đang sửa · còn Ns”; không lộ UID/email/token.
- Đổi tab/đóng dropdown/Esc/đóng editor: giải phóng khóa bằng transaction có kiểm tra `leaseId`/owner; một phiên cũ tuyệt đối không xóa khóa của phiên mới.
- Theo dõi `.info/connected` + `onDisconnect` cho **presence per tab riêng**; KHÔNG lấy onDisconnect.remove trên khóa chung làm bảo đảm duy nhất (có nguy cơ xóa nhầm khóa của session mới). TTL + version bảo vệ trường hợp tab/crash/mạng đứt. Cấp lại khóa phải tăng version, bản ghi cũ mất hiệu lực.
- Không được tự chiếm lại rồi gửi bản nháp cũ nếu lease đã mất; phải xem/đối chiếu phiên bản mới.
- Cần tránh listener per-cell. Subscribe lock collection của các dòng đang hiển thị hoặc các cell đang tương tác, hủy khi rời tab/popup.

## 4. Thời gian đề xuất để thử nghiệm (admin có thể cấu hình trong giới hạn an toàn)
| Editor | Giới hạn ban đầu | Khi hết thời gian |
| --- | --- | --- |
| Dropdown trạng thái đơn giản | 45 giây | Chưa chọn: đóng/Esc, không ghi; đã chọn: chỉ giải phóng sau khi save ACK |
| Dropdown tìm Chuyên viên/Phòng | 90 giây | Nếu đang chỉ lọc, đóng, không ghi |
| Text ngắn chỉnh trực tiếp | 2 phút | Cảnh báo trước 15–30 giây; nếu giá trị hợp lệ, đang online và vẫn giữ lease, áp dụng/lưu rồi ACK; nếu không, giữ nháp |
| Ghi chú, Tiến độ hiện tại (multiline) | 5 phút | Cảnh báo trước 30–60 giây, cho nút gia hạn; không bao giờ lưu nội dung đang IME composition/không hợp lệ. Đề xuất auto-commit chỉ khi có thay đổi hợp lệ và người dùng đã biết chế độ tự lưu; nếu không giữ nháp |
| Nội dung trình (modal dài) | 10 phút | Không tự commit nội dung dài chưa hoàn chỉnh; nhắc gia hạn hoặc Lưu và đóng; hết lease thì local checkpoint và yêu cầu so sánh trước khi sửa lại |

**Lease heartbeat** 10–15 giây, TTL server khoảng 45 giây (không phải hạn tối đa editor); không renew khi tab ẩn lâu hoặc đã mất focus/edit state. Thời hạn cứng của một phiên có thể yêu cầu gia hạn (có cấp mới trên server, không tự kéo dài vô hạn).
- Timer có thể bị throttling ở background tab; độ hợp lệ luôn phụ thuộc server, không phải `setTimeout`.
- Với text auto-save, debounce theo *ngừng gõ* (thử 1.2–2 giây), dừng khi `compositionstart` đến `compositionend` (gõ tiếng Việt); lưu chỉ sau khi nhận server ACK. Hiện use-workspace tự save 800ms từ `onChange`: phải chia biệt “đang soạn” và “đã commit”. Không tạo lịch sử từng ký tự.
- Không bao giờ tự lưu giá trị đang tìm trong dropdown như một lựa chọn. Sự kiện chọn thực tế bằng click/Enter mới tạo bản nháp.

## 5. Chốt dữ liệu bởi admin: Hai chế độ RÕ RÀNG
A. **Tạm dừng sửa của khách (`GUEST_PAUSED`)** — kế thừa `editingLocked`, admin vẫn được sửa. Hợp cho bảo trì nhưng **KHÔNG** bảo đảm snapshot bất biến.
B. **Đóng băng/chốt số liệu (`DRAINING → FROZEN`)** — chặn cấp khóa mới cho **mọi tài khoản, kể cả admin**. DRAINING thông báo người đang sửa (đề xuất tối đa 30–60 giây) hoàn tất hợp lệ, sau đó FROZEN chặn mọi commit. Nếu cần khẩn cấp có nút FROZEN tức thì, bản nháp chưa lưu của người dùng được giữ. Lưu `freezeEpoch`, thời điểm xác nhận server, người thực hiện, số nội dung, revision/checksum/snapshot ID. Khi đã FROZEN chỉ đọc, xuất số liệu, tải snapshot; mở lại bằng nút admin có nhật ký. Không tự động mở lại khi hết 30 phút.
- Phải làm rõ đường ghi của admin hiện có. Phía backend/Rules phải chặn các phiên admin bình thường khi mode FROZEN, kể cả SDK client cũ. Quyền quản trị để *mở khóa* là một hành động riêng có audit, không được mặc nhiên vượt chặn dữ liệu.
- Cần trạng thái số phiên đang sửa và đang chờ ACK; nếu hết thời gian DRAINING, kiểm tra server chứ không dùng danh sách hiện trên màn hình để kết luận đã sạch.
- Bản nháp bị gián đoạn không được tự đẩy lên sau khi mở khóa; người dùng đối chiếu và xác nhận lại với dữ liệu server.

## 6. Điểm an ninh phải quyết định trước khi code
**Không thể đạt cam kết 'không ai cùng sửa' chỉ bằng CSS, React state, một khóa client-side, hoặc mỗi `runTransaction(item)` khi lưu.** Bắt buộc kiểm tra quyền chiếm khóa + epoch + freeze + quyền ô ở máy chủ, với đường ghi duy nhất và nhất quán.
- Phương án gọn: RTDB `editLocks` kèm CAS + Security Rules tại mọi nơi có thể ghi bản ghi; Rules `.validate` kiểm trường đã đổi, owner/lease hiện hành và mode; kiểm thử cả parent write cho admin, deletion, thao tác batch, trực tiếp API, và quyền ô. Cảnh báo: .write ở tổ tiên có thể cấp quyền không thu hồi được ở con; .validate không chạy khi xóa.
- Nếu không thể chứng minh mọi đường ghi/khóa/freezing là bất biến nguyên tử bằng Rules + transaction, dùng **trusted callable backend** để nhận `acquire/renew/release/commit/freeze`, chặn mọi đường ghi client nghiệp vụ trực tiếp bằng Rules. Backend phải có giao dịch hoặc fencing mà thay khóa và commit dữ liệu không tạo race; chỉ dùng Cloud Function nhưng kiểm lock-then-write tách rời là CHƯA đủ. Đánh giá chi phí/quyền vận hành trước khi chọn.
- `onDisconnect` chỉ hỗ trợ presence cleanup; backend và server TTL quyết định quyền sửa. Dùng `serverTimestamp`/Rules `now`; không tin client timestamp.
- Không cấp quyền sửa theo một giá trị chỉ đọc (email nhãn, dropdown disabled). `uid` Firebase Auth và quyền trong /permissions là nguồn căn cứ.

## 7. Kế hoạch test nghiệm thu tối thiểu
1. Hai user bấm vào cùng dropdown trong 100ms: chỉ **một** được vào; người kia thấy khóa; không auto ghi khi Esc/timeout.
2. Hai tab cùng Firebase UID cùng sửa một ô: cũng chỉ một `tabSessionId` có quyền.
3. User A chỉnh Ghi chú, B chỉnh Tiến độ hiện tại cùng bản ghi: cùng hoạt động; cả hai lưu đúng, không mất cập nhật.
4. Hai trường phụ thuộc trong cùng ô gộp: không deadlock và không lưu một nửa.
5. Popup và Danh sách chính tranh cùng ô: dùng một khóa chung.
6. Đang tìm trong picker, chưa chọn, hết hạn: chỉ đóng menu và giải phóng; không thay status.
7. Gõ tiếng Việt với IME, blur, auto-save và expiry: không gửi chuỗi dở dang, có cảnh báo cuối phiên.
8. Mất mạng giữa thao tác/đóng tab/crash: không false-positive “Đã lưu”, không khóa vĩnh viễn; tab cũ không xóa lease mới.
9. Lock hết hạn → B giành, A trở lại với ACK cũ: A không thể ghi đè; local draft A còn.
10. Quyền ô bị admin thu hồi khi đang sửa; lưu bị từ chối, giữ nội dung địa phương, audit rõ.
11. Admin bật GUEST_PAUSED: khách không cấp thêm lock/write, admin vẫn hoạt động; không nhầm là chốt số liệu.
12. Admin bật DRAINING/FROZEN khi có 1 editor còn lưu dở: snapshot tạo đúng thời điểm, không có write nào sau FROZEN, kể cả admin.
13. Firebase Rules Emulator chạy mọi đường ghi bất thường (trực tiếp REST, path cha, delete, malformed/expired/replayed lease, forged owner, wrong UID).
14. Không giảm hiệu năng cuộn bảng lớn hay thêm listener cho từng ô; có benchmark khi nhiều người và khóa TTL.
15. Deploy theo thứ tự: backup rules/database ⇒ test emulator & browser ⇒ staging với 2–3 tài khoản thật ⇒ deploy Rules/Backend ⇒ kích hoạt primary ⇒ thí điểm khóa ⇒ kiểm tra audit và đóng băng ⇒ rollback an toàn nếu lỗi. Không gửi lên production từ PR Draft.

## 8. Đề xuất triển khai
1. Chốt DB primary PR #71 và harden Rules; chưa triển khai trong production khi chưa có backup/migration và server write.
2. Thiết kế một `EditSessionManager` dùng chung cho bảng chính, ô gộp, popup, picker, inline editor, modal. Giữ JS components hiện có nhưng ngăn mở editor trước ACK khóa.
3. Kiểm thử độc quyền + nháp + TTL + đóng băng trên Firebase Emulator.
4. Bổ sung bảng điều khiển admin: số phiên đang sửa, `Tạm dừng khách`, `Chốt số liệu`, `Mở lại`, lịch sử mốc.
5. Chỉ merge và phát hành khi lock acquisition **và commit** cùng được bảo vệ phía server. Thiết kế này chưa được coi là code triển khai.

**Tài liệu tham chiếu Firebase:** https://firebase.google.com/docs/database/web/offline-capabilities ; https://firebase.google.com/docs/database/security ; https://firebase.google.com/docs/database/web/read-and-write .
