## Vận hành đợt chuyển nguồn/khóa ô — 25/10/2026 (HOLD)
- **Chưa triển khai:** main/Pages và Firebase Rules production vẫn chưa chuyển theo #71/#72. PR Draft/CI thành công không đồng nghĩa dữ liệu đã được nhập hoặc chế độ sửa đã mở.
- **Đầu mối phát hành:** [Checklist GO/NO-GO, backup Rules + RTDB, chuyển nguồn, nghiệm thu và rollback](operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md); [kịch bản DRAINING/FROZEN](operations/CELL_EDIT_FREEZE_EXECUTION_2026-10-25.md).
- **Thứ tự an toàn:** bản sao Rules và toàn bộ RTDB + hash + thử đọc/khôi phục → kiểm tra Rules production mới nhất → emulator/2–3 account staging → chọn đúng candidate Rules → đọc lại Rules từ server → import mirror vào `hdnd/items` chỉ khi đích rỗng → xác nhận dữ liệu → chuyển shared profile `dataSource=primary` → thử ghi/khóa/chốt → ghi biên nhận.
- **Không chạy** `firebase deploy --only database` từ cấu hình mặc định `source/firebase.json`; file này tham chiếu `firebase/database.rules.json` của bản Pages khóa ghi, **không** phải ứng viên `database.exclusive-candidate.rules.json`. CLI deployment ghi đè Rules hiện hành; nếu không có bản sao Rules thật và xác nhận candidate phải dừng.
- **Rollback:** không được xóa `hdnd/items` khi đã có dữ liệu; khôi phục Rules đúng bản đã backup, đưa UI về chế độ an toàn và đối chiếu giá trị/nháp. Không công bố chốt số liệu khi chỉ ở trạng thái DRAINING.

---

## BỘ MÀU LƯU RIÊNG V2 — Màu chữ tươi, nét mảnh 600 (22/10/2026)

**Tên khôi phục chính thức:** **HopHDND — Màu chữ tươi, nét mảnh 600 — V2 (22/10/2026)**. Người dùng xác nhận “OK, lưu riêng các màu này”. V2 là **màu chữ trạng thái**, **không** thay nền/viền, điều khiển dropdown hay lịch sử.

| Mục | Giá trị cố định |
|---|---|
| Nhánh bản sao lưu V2 (không được ghi đè) | [`backup/ui-vivid-status-ink-weight600-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-vivid-status-ink-weight600-2026-10-22) |
| Commit **đã phát hành** chứa đúng giao diện V2 | [`d6e4b447e25ede00683cdea7689af40a781c1ea8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/d6e4b447e25ede00683cdea7689af40a781c1ea8) |
| PR giới thiệu màu mới | [#17](https://github.com/cavoixanh638/HopHDND-WebApp/pull/17) (merge SHA `1aecf946a013ff2246796fa4f622600a96146e47`) |
| Test nguồn / xuất bản / Pages | [CI #39784818033](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39784818033) **PASS**; [Publisher #39785115951](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39785115951) **SUCCESS**; [Pages #39785243101](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39785243101) **SUCCESS** |
| SHA blob CSS | `6547a64eaddc125438451a021d9178fb8806372b` (`source/src/styles/app.css`) |
| SHA blob HTML đã xuất bản | `3ed4fab416fba846b46c8dffff9e8d0007a6d23b` (`index.html`) |

### Bảng tên phiên bản màu — tránh nhầm V1 với V2

| Bộ màu | Đỏ — Sở chưa trình | Cam — VP đang thực hiện | Xanh — Hoàn thành/tương đương | Độ đậm chữ |
|---|---|---|---|---|
| **V1 — Nền màu chuẩn, chữ cũ** | `#7F1D30` | `#704500` | `#2B7450` | 750 (Hoàn thành 650) |
| **V2 — Màu chữ tươi, nét mảnh 600** | **`#B2263D`** | **`#875000`** | **`#27774B`** | **600 cả ba** |

**Cả V1 và V2 cùng giữ nền và viền:** Sở chưa trình nền hồng `#FFE0E4`, viền `#E7A1AD`; VP đang thực hiện nền vàng cam `#FFE8B8`, viền `#DCB76A`; Hoàn thành nền xanh `#D5F0DE`, viền `#91CFA8`. Giữ nguyên màu chấm, màu hover, mũi tên dropdown, dấu lịch sử (`opacity:.42`), quyền sửa, bảng popup, dữ liệu và các trạng thái không nằm trong ba nhóm.

- **V1** được ghim ở commit [`6c151458561b7800af51bab64837430e147fdcef`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/6c151458561b7800af51bab64837430e147fdcef), nhánh [`backup/ui-colored-status-pill-approved-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-colored-status-pill-approved-2026-10-22). **Tuyệt đối không di chuyển, ghi đè hai nhánh backup này**.
- **V2** được ghim ở commit [`d6e4b447e25ede00683cdea7689af40a781c1ea8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/d6e4b447e25ede00683cdea7689af40a781c1ea8), nhánh [`backup/ui-vivid-status-ink-weight600-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-vivid-status-ink-weight600-2026-10-22). Đặt tên **V2** khi người dùng yêu cầu “quay lại màu chữ đỏ tươi hơn, xanh nhạt hơn, chữ mảnh hơn”.

### Cách phục hồi **riêng bộ màu V2** trong các bản phát triển sau

1. Từ `main` mới nhất, tạo branch/PR riêng; **không reset `main`**, không khôi phục cả `app.css` hoặc toàn bộ `source/` vì sẽ mất những chức năng phát triển sau V2. Mở `source/src/styles/app.css`, kiểm có đoạn `/* Optional ink-only refinement, 22/10/2026. ... */`.
2. Chỉ đảm bảo ba quy tắc `--workflow-text` và selector dùng `color:var(--workflow-text);font-weight:600` ở Bảng dữ liệu và popup. Nếu code đã thay khác, lấy chính xác **đoạn CSS dưới đây** từ SHA V2, đặt tại cuối chuỗi quy tắc màu trạng thái (phía sau các khai báo `--workflow-bg`) để hiệu lực vẫn đúng. Khi có thiết kế màu mới, cần soát xung đột CSS trước, không chồng hai quy tắc vô điều kiện.

```css
.item-data-table tbody td[data-progress-tone="not-submitted"],
.report-detail-grid tbody td[data-progress-tone="not-submitted"] {
  --workflow-text:#B2263D;
}
.item-data-table tbody td[data-progress-tone="office"],
.report-detail-grid tbody td[data-progress-tone="office"] {
  --workflow-text:#875000;
}
.item-data-table tbody td[data-progress-tone="done"],
.report-detail-grid tbody td[data-progress-tone="done"] {
  --workflow-text:#27774B;
}
.item-data-table tbody td[data-progress-tone] .workflow-status-value,
.report-detail-grid tbody td[data-progress-tone] .workflow-status-value,
.item-data-table tbody td.editable-cell[data-progress-tone] :is(.cell-picker-trigger,.custom-cell-input),
.report-detail-grid tbody td.editable-cell[data-progress-tone] :is(.cell-picker-trigger,.custom-cell-input) {
  color:var(--workflow-text);
  font-weight:600;
}
```

3. Giữ các nền trạng thái cũ, không thay `--workflow-fg` vốn còn dùng cho chấm/viền. Soát trạng thái tương đương theo đúng cột (không tự gắn xanh cho giá trị trung gian), chạy kiểm tra TypeScript, unit, Firebase Emulator, Chrome smoke trên Bảng dữ liệu + popup trước khi merge PR. Kiểm Publisher + Pages **SUCCESS**; so sánh màu chữ, nền, trọng lượng trong trình duyệt thật.
4. Chỉ khi người dùng yêu cầu **khôi phục toàn bộ phiên bản V2**, mới dùng snapshot commit `d6e4b447e25ede00683cdea7689af40a781c1ea8` làm mốc tham chiếu cho toàn bộ code/HTML; dữ liệu Excel, Firebase và thiết lập trình duyệt **không nằm trong backup GitHub**. Nếu người dùng yêu cầu bản gốc như ảnh trước khi chỉnh chữ, phải chọn **V1**, không chọn V2.

**Lưu ý:** Tài liệu tạo sau mốc V2 nằm trên `main`, không thuộc snapshot V2. Chính SHA và nhánh backup mới là nguồn phục hồi độc lập.

---

## Mốc khôi phục được chốt — HopHDND UI, pill trạng thái có nền màu — 22/10/2026

**Đây là mốc tham chiếu bắt buộc khi người dùng yêu cầu “quay lại bản có nền màu như ảnh”.** Đã lưu cả trạng thái `source/` và `index.html` được GitHub Pages triển khai thành công, không chỉ screenshot hoặc CSS.

| Thuộc tính | Giá trị đã xác minh |
|---|---|
| Tên nhận diện | **HopHDND UI — Colored Status Pill — 22/10/2026** |
| Commit Pages chính xác (checkpoint) | [`6c151458561b7800af51bab64837430e147fdcef`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/6c151458561b7800af51bab64837430e147fdcef) |
| Nhánh backup | [`backup/ui-colored-status-pill-approved-2026-10-22`](https://github.com/cavoixanh638/HopHDND-WebApp/tree/backup/ui-colored-status-pill-approved-2026-10-22) |
| PR giao diện đã merge | [PR #15](https://github.com/cavoixanh638/HopHDND-WebApp/pull/15), merge commit `24e4d338e79616241c101ce68eb26140595e7a28` |
| Commit nguồn CI PASS | `b5ea9a2403adca57ac25c0a0ab854f6dcd8c8e34` |
| Bằng chứng kiểm | [Verify #39778929334](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39778929334) **SUCCESS**; [Publisher #39779152810](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39779152810) **SUCCESS**; [Pages #39779299040](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39779299040) **SUCCESS** |
| Blob trang phát hành `index.html` | `c5235b68eaf252e3ca8c0eccf1bf25bd8da30258` (Git blob SHA trong checkpoint) |
| Phạm vi | Mã nguồn và artifact đã phát hành trên GitHub; **không** là backup dữ liệu Excel, Firebase, dữ liệu cá nhân hay localStorage |

**Dấu hiệu nhận biết đúng phiên bản:**

- Cả **Bảng dữ liệu và popup**: ô trạng thái **được phép sửa** là nút dropdown hình pill **có nền màu**, không phải nền trắng; nền giữ nguyên lúc hover/focus.
- `Sở chưa trình`: nền hồng `#FFE0E4`, chữ `#7F1D30`, viền `#E7A1AD`. `VP đang thực hiện`: nền vàng cam `#FFE8B8`, chữ `#704500`, viền `#DCB76A`. `Hoàn thành` và tương đương: nền xanh mint `#D5F0DE`, chữ `#2B7450`, viền `#91CFA8` (chấm xanh đậm với nhãn xem).
- Biểu tượng lịch sử hiển thị mờ mặc định (`opacity:.42`), đúng cách trước PR #13; không dùng biến thể PR #13 (nền dropdown trắng, ẩn history icon, chữ xanh `#307651`). Giá trị thường được quyền sửa dùng xanh xám nhạt. Không thay quyền và ý nghĩa trạng thái.
- Điểm kiểm mã: `source/src/styles/app.css`, `source/tests/report-style-css.test.ts`, `source/scripts/smoke-pages-browser.mjs`.

### Quy trình trở về đúng mốc này nếu giao diện sau này bị hỏng

1. **Đối chiếu trước khi thay:** xem `main`, commit/tag/nhánh backup phía trên và chạy `git diff 6c151458561b7800af51bab64837430e147fdcef..main -- source/src`. Nhánh `backup/ui-colored-status-pill-approved-2026-10-22` là mốc lưu, **không cập nhật/force-push vào nhánh backup**. Ghim **SHA đầy đủ** để tránh tên nhánh di chuyển.
2. Chỉ cần khôi phục riêng bộ màu trạng thái: tạo **nhánh làm việc mới từ `main`**, lấy lại `source/src/styles/app.css` từ commit checkpoint, kiểm không xóa những CSS mới không liên quan. Chỉ khôi phục toàn bộ `source/` nếu người dùng thực sự yêu cầu trả về **toàn bộ phần mềm** của mốc này. Dữ liệu Sheets/Firebase không thuộc rollback mã nguồn.
3. Ví dụ khôi phục **toàn bộ source** vào một commit rollback có thể xem xét qua PR (không reset/force-push `main`):

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c restore/ui-colored-status-pill-2026-10-22
git restore --source=6c151458561b7800af51bab64837430e147fdcef --staged --worktree -- source
git diff --cached --stat
git commit -m "restore: return HopHDND UI to colored status pill snapshot 2026-10-22"
git push -u origin restore/ui-colored-status-pill-2026-10-22
```

4. Tạo PR vào `main`, soát khác biệt (phải chú ý source docs và tính năng phát sinh sau mốc). Chỉ merge khi các test TypeScript, unit, Firebase emulator, Chrome smoke và xác nhận quyền đều PASS. Không sửa trực tiếp `main:index.html` hay ghi dữ liệu nghiệp vụ để “restore”; workflow `publish-pages.yml` sẽ build lại artifact từ nguồn rồi Pages deploy. Kiểm đủ **Verify / Publisher / Pages**, chạy nghiệm thu trực quan tài khoản có quyền trên Bảng dữ liệu **và** popup, có thể `Ctrl+F5` để loại cache.
5. Nếu cần phục hồi **đúng cả artifact HTML** (không chỉ source), đối chiếu blob `index.html` của checkpoint ở trên với artifact build mới; khác blob thì không tự tuyên bố đã khôi phục đúng byte. Ưu tiên công bố khác biệt và kiểm tính năng trước khi phát hành. Nhánh backup không bảo vệ thay đổi dữ liệu thực hoặc cài đặt trình duyệt.

**Trạng thái đã xác minh ngày 22/10/2026:** PR #15 merge, Verify + Publisher + Pages đều SUCCESS; đây là **mốc sao lưu mã nguồn và artifact** đã kiểm, không thay cho nghiệm thu trực quan trên thiết bị người dùng. Tài liệu ghi nhận mốc có thể tiếp tục được cập nhật sau ngày này nhưng không thay đổi commit backup.

---

## 22/10/2026 — Lưu ý về đồng bộ 60 giây và màu trạng thái (PR #10)

Bảng vẫn mở nguyên, cả vị trí cuộn/bộ lọc/ô dữ liệu, khi chương trình kiểm tra nguồn sau mỗi 60 giây. Không cần tải lại thủ công. Khi dữ liệu không đổi, hệ thống không tái tạo mảng hàng/bố cục; nếu thay đổi thực thì chỉ cập nhật sau lần tải thành công. Nếu nguồn tạm lỗi, bản đọc trước vẫn giữ và thông báo lỗi có thể hiển thị; khi nhập nháp thì đợt poll không ghi đè. Màn hình chờ/khóa cấu hình vẫn dùng **chỉ khi lần đầu chưa đọc được layout**; nếu config đã xác nhận thì tải lại ngầm không xóa UI.
Các màu chính thống: Sở chưa trình đỏ hồng, VP đang thực hiện vàng cam, hoàn thành và các giá trị tương đương theo đúng trường là xanh lá đậm chữ trắng. Những bước trung gian không được tô nhầm. Màu trong Bảng tổng hợp được giữ nguyên.
Chữ tìm kiếm và chọn lọc 15px, header nhạt thêm, popup cùng tông. Sau chỉnh sửa bắt buộc chạy test 60s giữ nguyên hàng + cập nhật thật + permission/Chrome để tránh lỗi tái phát.

## 22/10/2026 — Tùy chọn tên lãnh đạo và cách đọc trạng thái

Mở **Gộp cột** ở đầu Danh sách các ND trình HĐND, tick `Viết tắt tên Lãnh đạo VP và UBND`. Có thể bật cùng `Gộp Lãnh đạo VP và UBND TP` hoặc dùng độc lập. Di chuột để thấy đầy đủ họ tên; bộ lọc và danh sách chọn vẫn dùng nguyên họ tên, không tạo dữ liệu ghi mới. Lựa chọn chỉ lưu trên trình duyệt của người dùng và mặc định tắt khi chưa chọn.
Trong các cột tiến độ, nhãn hổ phách báo `Sở chưa trình`, xanh lam báo công việc ở `Văn phòng`, xanh lá chỉ `Hoàn thành`. Trạng thái trung gian khác không được đổi nghĩa hoặc tự tô màu hoàn thành. Trường nào có quyền sửa vẫn có dropdown và lịch sử riêng; màu tùy chỉnh nội dung không bị thay bằng việc tô cả hàng.
Tiêu đề nhạt hơn và bộ lọc lớn 13px; phím Escape xóa lọc như trước. Kiểm thử trước phát hành dùng [CI #39641851995](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39641851995).

## 21/10/2026 — Hướng dẫn hiển thị gọn cột

Trong Danh sách các ND trình HĐND, mở **Gộp cột** ở mép trên Bảng dữ liệu, tick một hoặc nhiều trong 4 cách. Các tick chỉ tác động cách đọc bảng trên trình duyệt; muốn xem lại cột gốc, bỏ tick hoặc nhấn **Hiện đủ cột Excel** tạm thời. Trường nằm trong ô gộp vẫn sửa riêng nếu tài khoản được cấp quyền; ô nào không cho sửa không hiển thị editor. Người quản trị muốn sửa thứ tự, width hay quyền cột phải vào chế độ tùy chỉnh, nơi hiển thị đầy đủ cột nguồn.
Tìm kiếm gõ tên đầy đủ ngay cả khi chuyên viên viết tắt, và lọc nhóm bằng từ thuộc bất kỳ trường nào bên trong. Popup không tự kế thừa tùy chọn cá nhân này. Không xóa dữ liệu nguồn khi bật/tắt, không biến kết quả hiển thị thành nội dung ghi Excel. Quy tắc kiểm thử và giới hạn đã ghi CURRENT_STATE.

## 20/10/2026 — Đối chiếu tên cột Excel nguồn và nghiệm thu giao diện PR #7

Đã xác nhận từ nội dung file Excel gốc trên Google Drive cập nhật 20/10: cột E là `Loại VB`, không được lấy tên cột mô tả tùy tiện `Loại VB (HC/QPPL/BC)`. Không đổi giá trị `HC/QPPL/BC`. Kiểm ở Danh sách/popup (cùng EXCEL_SOURCE_COLUMNS hoặc ItemLayout) và cấu hình lịch sử. Hai card điều hướng có tổng chiều rộng không vượt 820px; chỉnh màu/hover/focus không làm ảnh hưởng phép tính hay source. Bộ lọc select dùng chữ placeholder mờ, Esc chỉ xóa lọc đúng cột sau chọn. Ô quyền sửa nổi trên điều khiển, guest read-only không xuất hiện editor. CI TypeScript/unit/Firebase emulator/Chrome bắt buộc PASS, sau merge theo dõi cả GitHub Pages build+deploy. Không xuất bản file HTML thử.

## 20/10/2026 — Quy trình nghiệm thu hai khu vực chính (PR #6)

Khi đổi chrome, giữ nguồn chuẩn ở `source/src/app/App.tsx`, `source/src/styles/app.css`. Hai khu vực nguồn `overview/items` phải có thẻ chuyển rõ, không thể hiện thêm heading trùng và banner tự cập nhật. Phiên bản luôn nhìn thấy cho khách và admin; nút đăng nhập/cài đặt, phân quyền, các thao tác thật trong Tài khoản/Nguồn vẫn phải hoạt động. Không loại nhầm `unknown-note` cục bộ của báo cáo: chỉ dòng cảnh báo toàn trang không phân loại NQ/BC bị ẩn.

CI bắt buộc xác nhận: hai thẻ có kích thước đầy đủ và chỉ một active, chuyển qua lại không làm dịch chuyển khung, các bảng và popup vẫn có thể dùng; truy cập trang nguồn, bộ kiểm Firebase và bản in không bị lỗi. Sau merge theo dõi **cả** Build and publish Pages và Pages deployment success; phiên bản chính tại https://cavoixanh638.github.io/HopHDND-WebApp/ . Không gửi HTML kiểm thử riêng; không ghi production Firebase/Excel.

## 20/10/2026 — Vệ sinh phần đầu Danh sách và định vị tooltip (PR #5)

Giữ tách mã GitHub (nhánh + PR + CI) và phát hành thẳng GitHub Pages chính sau merge, không cấp file HTML thử. Về bố cục: page title chỉ một lần, số nội dung sát lựa chọn cột, cảnh báo nguồn rút gọn nhưng không xóa; GID/reset nằm ở trang tài khoản/nguồn. Tooltips dùng chung helper tính vị trí ngoài ô, đọc rect khi đổi ô, không dùng pointermove hoặc CSS `body:has`. Không bổ sung quyền ghi nguồn. Sau deploy luôn nghiệm thu Chrome cả người sửa/admin và khách. Trạng thái CI [#39423111683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39423111683) PASS.

## 20/10/2026 — Điều chỉnh giao diện trực tiếp tại GitHub Pages

Bản sửa PR #4 gom popup khách thành bảng đọc/lọc cột; bỏ công cụ kỹ thuật và tìm kiếm trùng, căn tên bảng giữa. Tooltip báo cáo tránh che số bằng một lần đọc rect khi đổi ô; tooltip sửa dùng singleton manual popover xuất hiện ngay, popup được top-layer hỗ trợ; dropdown có viền+mũi tên, CSS không thêm observer. Kiểm thử đúng workflow Verify PR và Chrome smoke; xuất bản tự động qua `main` sau merge, không phát hành HTML thử riêng. Không ghi Firebase/Excel production. Các bằng chứng CI ghi [CURRENT_STATE](CURRENT_STATE.md).

## 20/10/2026 — Phát hành GitHub Pages trực tiếp (quy trình thay thế preview cũ)

Sau khi mã nguồn trên branch được kiểm TypeScript, unit, Firebase emulator, Chrome mock và PR merge vào `main`, GitHub tự chạy `.github/workflows/publish-pages.yml`, build Pages từ `source/`, ghi `index.html` của trang chính; Pages triển khai commit tiếp theo. URL duy nhất gửi để nghiệm thu: https://cavoixanh638.github.io/HopHDND-WebApp/ . Không phát hành HTML preview riêng hay gửi người dùng file HTML tải về; các bài kiểm thử nội bộ vẫn bắt buộc.

Lần chuyển đổi đầu tiên: backup `backup/before-direct-pages-publish-2026-10-20`; merge `d6734b1789f8f0494e50213e17a157d7bf96b569`; Build #39349869241 PASS; Pages #39350027217 PASS; commit root phát hành `c7517e0782d95fe82c3ee6b10b12cb18d0ae6876`. Khi muốn rollback, đối chiếu cả source/code/HTML, không tự khôi phục hay ghi dữ liệu nghiệp vụ. Các ghi chú preview trước ngày này giữ lại để tra cứu, không áp dụng cho phát hành mới.

---

## 20/10/2026 — Mốc source PASS, đang chờ phát hành preview

- Exact source `bb398c0d4acc3a828eb1d7f4cf75a06745b28c05` đã PASS Verify [#39296834797](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39296834797). Các cải tiến tên bảng, màu ô theo từ, sort chỉ khi sửa, tooltip quyền sửa, căn giữa và lịch sử theo ô đã commit trên PR #3.
- **Không coi CI PASS là preview đã cập nhật.** Muốn kiểm bằng link Pages phải phát hành artifact đã kiểm đúng SHA/digest vào `preview/current/index.html` theo workflow được phép, sao lưu bản preview trước; không thay `main:index.html` hoặc merge PR #3. Preview có thể kết nối Firebase đang vận hành: tránh nhấn nút ghi cấu hình/dữ liệu thật khi chỉ xem thử.
- Trong nghiệm thu riêng, kiểm ở chế độ xem/khách và admin: sort chỉ khi sửa, ô không quyền không có dấu sửa, hai bảng cùng màu từ khóa và căn ô; biểu tượng lịch sử không hiện ở khách; nguồn không có audit phải có thông báo, không phỏng đoán. Chưa đo độ trễ trên Windows/số dòng thật hoặc thử thay đổi quyền ngay lúc đang mở popup.




## Preview popup chiều rộng/quyền sửa — 19/10/2026

Preview source PASS #39270344125, exact SHA 355ec81fb274da44c19eb1e277409547a6a2d3b8; publisher commit b67cddf56b6b70471ea931faec0c7f02d61cf9b3 (19/10/2026 21:39:50 VN). Hai file preview/current/index.html và preview/popup-width-permissions-2026-10-19/index.html cùng blob 0f4656ac5d351ef4865a782d652403fdcba0bf2d; main:index.html vẫn blob 48aff33fdac08477e38c8f4d49837eb68eee0584. PR #3 Draft/chưa merge, Excel và Firebase business data không ghi. CI cuối cùng của docs #39270758690 PASS. Chưa có nghiệm thu Chrome Windows trực tiếp và chưa xác nhận website cache trên máy người dùng.

Chỉ publish các file preview trên nhánh main từ artifact CI bất biến #39270344125 (digest sha256:bd4bacec9f87a14a50736486c031abda4e3fa154e68822a4f3e6ea990b955aea); workflow ghim chính xác SHA, run, digest, kiểm marker UI trước copy. Sao lưu workflow và preview cũ tại backup/before-popup-width-permissions-preview-2026-10-19. Không sửa root hoặc merge PR #3. Nếu cần quay lại, phải phân biệt hoàn nguyên preview với dữ liệu/cấu hình người dùng; không tự động đụng Firebase/Excel.
# Vận hành HopHDND — triển khai, sao lưu, phục hồi và xử lý sự cố

**Phạm vi:** bản GitHub Pages 0.7.0 đọc dữ liệu qua Google Sheets/GViz, Firebase Authentication và cấu hình dùng chung qua Realtime Database. App Google Apps Script 0.6.2 là nhánh vận hành độc lập. Tài liệu này là **quy trình tham chiếu**, không phải xác nhận các phép kiểm sản xuất đã thành công. Trạng thái thực tế duy nhất xem [CURRENT_STATE](CURRENT_STATE.md).

## 0.2. Preview popup mới — resize, lọc, mẫu riêng, không ghi nguồn (19/10/2026)

- Mã popup mới: `ColumnResizeHandle.windowDragFallback` bật **chỉ trong modal**, dùng pointer listeners ngắn hạn AbortController, dọn trên thả/hủy/unmount; `ReportDetailGrid` table width bằng tổng `colgroup`, có kéo mép cột và phục hồi. Source-test [#39263671680](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39263671680) **PASS**, CDP cột ID 100→165px, table 2120→2185px, đóng mở giữ 165px. `backup/before-popup-grid-parity-resize-2026-10-19` at `c146ee3bbf49edb5cb29a703cddd3cf81177348c`.
- **Lần publish popup parity PASS:** [Publisher #39264618146](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264618146) + [Pages #39264646359](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39264646359). Chỉ ghi `preview/popup-grid-parity-2026-10-19/index.html` và `preview/current/index.html` từ artifact `sha256:d3aed0aa167577320ac297edec488992c1ab982ab755d020e26648fa3f5a5c51` verified source SHA `37774e6d32d843f37337f5cb8936db2617e42d0d`. Các đường dẫn preview cũ còn giữ. Backup main `backup/before-popup-grid-parity-preview-2026-10-19` tại `68f039942d66ec35158cdec45ab4de0f7e4ae1f2`. Production root `index.html` không đổi, PR #3 chưa merge.
- Các mẫu hiển thị và màu riêng của popup dùng `hdnd.report-detail-presets.v1`/`hdnd.report-detail-colors.v1` và nguồn/preview-scoped localStorage. Không sửa `ItemLayout`, Firebase profile/permissions, Excel/Sheets. Không tự bật cập nhật nguồn từ popup.
- [Đối chiếu chức năng popup/Danh sách](REPORT_DETAIL_PARITY_2026-10-19.md). **Bảng quản trị schema/20 cột tự tạo, quản trị quyền/khóa/duyệt và ghi Excel thật không nhân đôi** vào popup; chỉ điều hướng về màn hình chính. Preview chỉ được xuất bản sau kiểm exact artifact CI SHA/digest, không đụng `main:index.html`, không merge PR #3.

## 0.1. Bảng chi tiết từ ô báo cáo — phạm vi triển khai thử (19/10/2026)

- `ReportDetailGrid` là bản thử UI trên PR #3, không được bật writer Excel/Firebase. Dùng `SheetsRepository` đọc, `workspace.update` giữ nháp, `workspace.keepDraft` lưu checkpoint cục bộ; bộ phận quản trị vẫn áp dụng phân quyền và khóa sửa hiện hành. Không coi nháp cập nhật nguồn.
- Cấu hình cột riêng lưu `localStorage` theo nguồn dữ liệu/preview; **không** sao lưu lên Firebase và **không** tự đồng bộ giữa máy. Rollback code/preview không tự phục hồi preferences cục bộ; khi cần có thể bấm Khôi phục mặc định trong modal.
- Mốc mã nguồn có bằng chứng [Verify #39256157291](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256157291), SHA `c2d13b56dd675e230c39d7364d9a9054397159e6`, chỉ dùng artifact PASS để publish preview. Khi bật ghi Excel thực trong tương lai phải có quyết định riêng về writer, quyền, ETag/recordId, chống xung đột và read-back confirmation.
- **Preview bảng chi tiết nhanh đã triển khai:** [Publisher #39256870483](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256870483) PASS; [Pages #39256898732](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256898732) SUCCESS. Mở [preview/detail-grid-columns-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/detail-grid-columns-2026-10-19/) hoặc `preview/current/`. Có thể quay lại bản hover trước bằng preview dated `clear-cell-hover-2026-10-19/`. **Production root giữ nguyên**, PR #3 OPEN. Backup main trước xuất preview: `backup/before-detail-grid-preview-2026-10-19` tại `0020f88253c6857b1d081f0de637aa41665643c1`.
- Các hướng dẫn preview hover cũ phía dưới thuộc lịch sử; không dùng chúng làm mốc chức năng Bảng chi tiết nhanh.

## 0. Trạng thái hiện hành — commit và preview hover đã chốt 19/10/2026

- **Đã commit trên nhánh PR #3**: thay đổi CSS ở `b22b877c8f81d840059abd738dde5d7c9a24d0a9` và Chrome A/B test ở `cb4c276b2f649a178993ab0bb3abd192f4faca83`. Mốc kiểm mã: [Verify #39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414) **PASS** tại SHA test `cb4c276b2f649a178993ab0bb3abd192f4faca83`; đơn vị 352 PASS, Firebase emulator 20 PASS, Chrome smoke và đo A/B PASS. Chi tiết ở [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- **Artifact bất biến, không build từ HEAD di động:** candidate digest `sha256:2d2f23ab40e21229556998de0bba0e649d15dd7e46a7ed77b370218463d21271`; publisher [#39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) PASS; Pages deploy [#39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864) PASS. URL đánh giá được chốt: [preview/clear-cell-hover-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/) hoặc [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/). Các preview dated trước đó **không ghi đè** và là bản để so sánh/rollback.
- **Mốc sao lưu trước thay đổi code:** `backup/before-high-contrast-cell-hover-2026-10-19` từ SHA `68893b4ac094b991cb19b82d515da1f124ae2fa3`. **Mốc sao lưu main trước publish:** `backup/before-clear-cell-hover-preview-2026-10-19` từ SHA `d16124f0f430c0003cc6aca0cead9df520fd7c2e`. Rollback preview bằng cách ghim lại HTML artifact đã kiểm hoặc sao chép preview dated cũ **vào preview/current** trong workflow có kiểm nguồn SHA; không rollback bằng cách thay root `main:index.html`, không merge PR #3 hoặc đổi dữ liệu.
- **Bất biến cần kiểm sau thay đổi:** 5 báo cáo/cột nghiệp vụ không bị thêm giả, click phủ toàn ô số dương kể cả tổng hàng/tổng bảng, tooltip singleton `Click để xem chi tiết` 190×32px, chỉ ô đang hover có nền `rgba(9,106,113,.14)` + outline 2px `#08777B`, focus 3px; **không dùng global `body:has()` / CSS Anchor**, không layout shift/timer/blur hoặc hover tô cả hàng. So sánh lại Chrome Layout/Task/A/B và kiểm đặc biệt các trường hợp Tab/Enter/Space, cuộn, in PDF trước khi chấp nhận biến thể màu mới.
- **Phân biệt preview và production:** `main:index.html` root blob `48aff33fdac08477e38c8f4d49837eb68eee0584` giữ nguyên. **PR #3 vẫn OPEN, chưa merge.** Tránh bấm tùy tiện Lưu / Duyệt / Khóa ở preview do có thể tương tác Firebase production; dữ liệu Excel và Firebase production không được thay đổi trong nhiệm vụ giao diện/ghi tài liệu.

## 0a. Mốc preview cũ — chỉ để truy nguyên, không phải bản đang nghiệm thu

### Trạng thái phát hành preview từ CI bất biến — 19/10/2026

- Nguồn GitHub Pages chính vẫn là `main:index.html`, **không** sửa artifact minified trực tiếp. PR #3 chưa merge; preview nằm dưới `preview/current/` và `preview/ux-fixes-2026-10-19/` (không là production root).
- Lượt này ghim artifact từ **exact source SHA** `7a3a409e16b1b6621d121b09a57e9e7960c20568`: [CI #39184896725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39184896725) → [publish preview #39185030924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185030924) → [Pages #39185044694](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185044694), tất cả SUCCESS. Mốc sao lưu `backup/before-preview-ux-fixes-publish-2026-10-19` từ main cũ.
- Quy trình nghiệm thu: xác định rõ URL preview/production; thử chức năng không ghi trước; dùng tài khoản quản trị kiểm lưu Firebase **có kiểm soát và rollback cấu hình riêng**. Preview và site chính **cùng Firebase production**; ở preview **không thử ngẫu nhiên các nút Phê duyệt / Khóa sửa / Lưu quyền / Lưu Bảng báo cáo**, vì chúng có thể ghi thật. Test emulator không chứng minh Rules production hoặc tốc độ browser thật.
- Khi đóng PR hoặc phát hành site chính phải xác nhận mã/CI mới, quyền thực tế và thống nhất `getKpis`/bảng báo cáo; không tự merge PR để sửa 4 lỗi UI nếu chưa nghiệm thu phần quản trị đi kèm.

## 1. Phân biệt những thao tác dễ nhầm

| Thao tác | Tác động | Không tác động |
|---|---|---|
| Build / phát hành WebApp | Mã và giao diện đang phục vụ ở GitHub Pages | Không tự thay nội dung Google Sheets hoặc Firebase |
| Quay lại bản phần mềm | Khôi phục file HTML/bản phát hành trước | Không tự khôi phục dữ liệu hay cấu hình đã thay đổi |
| Sao lưu / khôi phục dữ liệu | Snapshot và phục hồi dữ liệu/cấu hình từ nguồn đã kiểm | Không tự quay lại mã nguồn |
| Đọc lại Sheets | Tải lại dữ liệu nghiệp vụ bằng GViz | Không ghi ngược dữ liệu hay phục hồi nháp |
| Lưu cấu hình | Ghi `hdnd/profile` hoặc `hdnd/permissions` sau xác thực/quyền | Không ghi vào `hdnd/items` hay nguồn Excel |

Không dùng các thuật ngữ trên thay thế nhau. Trước thao tác có khả năng ghi, xác định **môi trường, phạm vi, người phê duyệt, bản sao và cách quay lại**.

## 2. Nơi chứa mã và môi trường

- GitHub: [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp). Thư mục `source/` chứa mã nguồn; `index.html` ở gốc repository là bản đã build phục vụ [GitHub Pages](https://cavoixanh638.github.io/HopHDND-WebApp/).
- Dự án local tương ứng: `D:\Google Drive\VP UBND\HĐND\Dashboard trình HĐND code`. GitHub chỉ là bản nhập mã tại một thời điểm, **không tự đồng bộ hai chiều với thư mục Windows/Drive**.
- Nguồn nghiệp vụ hiện hành: tệp Excel trên Google Drive qua URL Google Sheets và `gid=60961344`; xem [từ điển dữ liệu](TU_DIEN_DU_LIEU.md). Dữ liệu nghiệp vụ không được nhập sang Firebase ở giai đoạn hiện tại.
- Firebase: project `hophdnd-8b7b2`, các nhánh cấu hình `hdnd/profile`, `hdnd/permissions`. Không được mặc định coi Rules trong GitHub là Rules đang áp dụng trên server.
- App Google Apps Script (legacy) không chia sẻ quy trình triển khai với GitHub Pages. Hướng dẫn kỹ thuật riêng: [FIREBASE_PAGES](FIREBASE_PAGES.md), [DONG_BO_CAU_HINH](DONG_BO_CAU_HINH.md).

## 3. Chuẩn bị và kiểm thử trước phát hành

Thao tác tại **gốc mã nguồn** (trên GitHub là `source/`; trên Windows là thư mục dự án, không chạy ở thư mục chứa HTML phát hành):

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

`test:firebase` cần Firebase emulator và điều kiện thực thi phù hợp; không coi lỗi môi trường là test đã đạt. Thử nghiệm emulator không thay thế xác minh Auth/Rules thật. Chỉ build được một `dist-pages/index.html` chưa chứng minh môi trường Pages tải thành công.

Trước phát hành cần kiểm:
1. Git sạch/commit nguồn cụ thể; danh sách file thay đổi, kiểm không có bí mật, token, `node_modules`, log hoặc dữ liệu không được phép công khai.
2. Sao lưu file HTML đang phục vụ và ghi lại commit SHA cũ để quay lại được; không dùng bản mới khi chưa ghi nhận đường quay lại.
3. Ở **bản test**, đối chiếu số dòng/nguồn URL/gid, bộ lọc, KPI, xuất Excel, nháp không ghi nguồn, chế độ quản trị, quyền cấu hình.
4. Kiểm Firebase Rules đúng bản và quyền Google admin/anonymous qua môi trường thử; **không tự deploy Rules production** chỉ vì build HTML.
5. Người dùng/người chịu trách nhiệm duyệt thay đổi trước khi công bố.

## 4. Phát hành GitHub Pages và kiểm sau phát hành

1. Build từ mã nguồn `source/`, lấy đúng `dist-pages/index.html`. Copy **nội dung file build** vào `index.html` ở gốc repository; không ghi đè `source/index.html` (đầu vào Vite).
2. Commit có thông tin phiên bản, mã nguồn tương ứng và cách quay lại. Push `main` chỉ sau khi đã duyệt; Pages được cấu hình phục vụ từ gốc repository.
3. Mở URL Pages, tải mới không dùng cache, xác nhận đúng phiên bản/artifact. Kiểm **số dòng thực tế** và chức năng với tài khoản khách lẫn quản trị.
4. Lưu bằng chứng nghiệm thu vào [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md), cập nhật kết quả trong [CURRENT_STATE](CURRENT_STATE.md). Nếu trang lỗi, không gọi triển khai thành công chỉ vì commit thành công.

**Đã có CI/CD từ 16/10/2026:** `.github/workflows/verify-source.yml` kiểm thử trên Pull Request, `.github/workflows/publish-pages.yml` tự cài phụ thuộc, kiểm TypeScript, unit tests, Firebase emulator, docs, build Pages từ `source/` khi push `main`; chỉ khi đạt mới ghi `index.html` ở gốc và phát hành qua GitHub Pages. Không sửa HTML minified thủ công nữa. Việc tự build này **không tự đồng bộ** thư mục Windows/Google Drive, không deploy Firebase Rules hay thay dữ liệu Sheets. [Kết quả kiểm thực tế](CURRENT_STATE.md).

## 5. Quay lại phiên bản phần mềm (rollback code)

Khi bản mới bị lỗi, tìm commit đã phát hành ổn định, xác nhận nó chứa `index.html` đúng và tạo **commit phục hồi file đó** trên `main` (không force-push hay xóa lịch sử). Đợi Pages cập nhật rồi chạy kiểm tra tối thiểu. Nếu đã thay Firebase Rules/schema cùng lúc, không chỉ phục hồi HTML: đối chiếu độ tương thích và dùng quy trình thay đổi Rules riêng. Không tự ý khôi phục cấu hình/dữ liệu từ backup chỉ để xử lý lỗi giao diện.

## 6. Sao lưu và khôi phục dữ liệu / cấu hình

**Ba phạm vi khác nhau, phải sao lưu độc lập:**

| Phạm vi | Nguồn chuẩn và việc cần bảo vệ |
|---|---|
| Nội dung nghiệp vụ | Tệp Excel nguồn trên Drive; ưu tiên lịch sử phiên bản/bản sao của chính tệp, không xem file xuất từ WebApp là backup đầy đủ |
| Cấu hình chung và quyền | `hdnd/profile` và `hdnd/permissions` ở Firebase RTDB; bảo toàn cả revision, cấu trúc, quyền ô/dòng/cột |
| Bộ mã và Rules | Commit GitHub của HTML/source và `source/firebase/database.rules.json`; Rules **đang chạy** phải kiểm độc lập trước thay |

Quy trình an toàn: xác định phạm vi → lấy snapshot có thời điểm và checksum/phương án đối chiếu → thử khôi phục **trên bản sao hoặc emulator** → đối chiếu số dòng, cấu hình và quyền → xin duyệt → chỉ khi cần mới khôi phục production → kiểm đọc lại. Không xóa hay ghi đè kho dữ liệu thật để “thử”. Không lưu file backup chứa dữ liệu cá nhân, token hay cấu hình nhạy cảm vào public GitHub.

**Lưu ý:** Git rollback không tự phục hồi nội dung Firebase; phiên bản Firebase không được bảo đảm có bản backup tự động. Phải kiểm tra chính sách backup và quyền truy cập thực tế trước khi cam kết khả năng phục hồi.

## 7. Chẩn đoán sự cố

| Triệu chứng | Kiểm tra theo thứ tự | Giới hạn / hành động an toàn |
|---|---|---|
| GitHub Pages hiển thị **0 dòng** | Xem URL/gid đang chọn, `localStorage` khóa `hdnd.sheet-config.v1`, phản hồi GViz A:O hiện hành (các snapshot legacy A:P/A:R chỉ để đọc tương thích), quyền truy cập từ trình duyệt, lỗi console/network | Bản local từng đọc 51 dòng **không chứng minh** Pages cũng đọc được; không nhập sang Firebase để che lỗi |
| Không vào được tùy chỉnh danh sách | Kiểm Firebase Auth Google admin, trạng thái load cấu hình và điều kiện disable ở UI | Đã có phản ánh nút bị khóa khi 0 dòng; **chưa xác nhận đã sửa** |
| Không sửa được quyền ô/cột/dòng | Kiểm Auth `google.com`, email verified, `hdnd/permissions`, Rules production, baseline/revision | Không cấp quyền bằng cách mở Rules công khai |
| Sửa nháp nhưng dữ liệu nguồn không đổi | Đây là thiết kế hiện tại của Pages | Nháp trình duyệt không ghi Sheets/Firebase; cần phân biệt thao tác `Áp dụng` và `Lưu cấu hình` |
| Bản mới không xuất hiện | Kiểm commit `main`, file HTML gốc, trạng thái Pages, cache trình duyệt | Không sửa mã TypeScript bằng cách vá HTML đã nén |
| Lỗi/xung đột lưu cấu hình | Kiểm dữ liệu gốc/revision, kết nối, tài khoản, Rules; giữ nháp và đọc lại baseline | Không bỏ kiểm tra revision, không ghi lại liên tục khi chưa rõ trạng thái |

Khi chưa xác định nguyên nhân, chỉ thu thập bằng chứng không ghi dữ liệu; không nới quyền `anyone/write` để chữa lỗi.

## 8. Ranh giới tài liệu

- [CAI_DAT_VA_CHAY](CAI_DAT_VA_CHAY.md): cách chạy lệnh local và build; **tài liệu này** là quy trình phát hành/rollback/sao lưu/ứng cứu chuẩn.
- [FIREBASE_PAGES](FIREBASE_PAGES.md): schema Firebase, mô hình Auth và Rules; **tài liệu này** không lặp toàn bộ Rules.
- [SYSTEM](SYSTEM.md), [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md): bất biến nghiệp vụ và ánh xạ trường; không mô tả lại trong xử lý sự cố.
- [CURRENT_STATE](CURRENT_STATE.md): kết quả đang xác nhận và các tồn tại; [WORKBOARD](WORKBOARD.md): người phụ trách và tiến độ; [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md): bằng chứng thử cụ thể.

Không tự coi hướng dẫn này là giấy phép triển khai production, thay Rules hoặc phục hồi dữ liệu thực.

## 9. Mốc hồi phục trước tính năng mới (16/10/2026)

- **Rollback code chuẩn:** commit `6d2226467d83e518f793d5c5e97eb11b29ba2def`; nhánh dự phòng `backup/pre-features-2026-10-16` giữ nguyên trạng thái trước khi bổ sung lọc cột, mẫu giao diện, màu điều kiện, phê duyệt và khóa sửa. Không force push; nếu cần quay lại, tạo commit phục hồi từ mốc này rồi chạy CI và xác minh Pages.
- **Code phát triển:** nhánh `feat/saved-views-approval-lock-filters-2026-10-16`, PR #3 (draft khi tạo), không phát hành tự động lên main. GitHub branch/commit không chứa bản sao nội dung Excel hay Firebase.
- **Các mẫu giao diện cá nhân/màu:** trước rollback trình duyệt hoặc xóa dữ liệu browser, cần xuất/sao chép cấu hình nếu muốn giữ; lưu trong localStorage theo URL nguồn, không phải backend chung.
- **Mốc duyệt/khóa sửa:** sử dụng Firebase `hdndReviews` (admin-only) và `hdnd/control`. Khi đưa Rules mới vào production, lưu snapshot Rules đang chạy và thử emulator trước; không ghi đè toàn bộ Rules của project dùng chung. Rollback code **không tự xóa** mốc duyệt, trạng thái khóa hoặc khôi phục Google Sheets.
- **Phạm vi khóa:** nút khóa trong WebApp chỉ chặn người không phải admin sửa thử trong ứng dụng. Muốn ngừng sửa trực tiếp file nguồn, cần quản lý quyền Google Sheets/Drive tại nguồn theo chính sách riêng.



## 25/10/2026 — Chốt kiến trúc Firebase là nguồn dữ liệu chính (thay phương án overlay)

**Yêu cầu người dùng:** Excel/Google Sheets chỉ là nguồn ban đầu và bản dự phòng trong giai đoạn chuyển đổi. Sau khi hoạt động realtime ổn định, tất cả người dùng phải đọc/ghi trực tiếp dữ liệu nghiệp vụ trên Firebase Realtime Database mà không cần link Google Sheets.

### Quyết định

- **Nguồn chính:** /hdnd/items (bản ghi thật, revision và lịch sử). Cả admin và khách đã cấp quyền ghi đúng ô bằng giao dịch CAS, tự lưu sau 800ms và Firebase onValue chuyển mọi thay đổi tới các trình duyệt. Điều này dùng lại FirebaseRepository đã có, không tạo overlay nhị phân trên bản sao.
- **Nguồn tạm:** /hdnd/mirrors/{spreadsheetId}/{gid} chỉ để nhập dữ liệu một lần; nhánh này vẫn bất biến và có thể tồn tại để đối chiếu/backup, không tham gia đọc hay ghi khi dataSource='primary'.
- **Chuyển dữ liệu:** chỉ admin Google đã xác thực, kết nối và không còn bản nháp; từ bản sao Firebase đã xác nhận, kiểm tra schema và ID duy nhất, từ chối nếu /hdnd/items đã có bất kỳ bản ghi nào, dùng transaction CAS toàn bộ nhánh khi còn rỗng, xác nhận lại mọi giá trị và số dòng rồi mới cập nhật shared profile dataSource='primary'. Không thay đổi ID nội bộ có dạng spreadsheetId:gid:row:n vì quyền từng ô gắn ID đó đã được cấp; ID này trở thành định danh lịch sử, không được dùng để tải lại Sheet. Giữ displayCode lặp (ví dụ '-') hợp lệ.
- **Thao tác:** tại trang tài khoản admin phải nhấn hai bước xác nhận chuyển dữ liệu. Tùy chọn 'primary' không được bật nếu dữ liệu chưa được khởi tạo. Không tự phát sinh bản sao trống, không ghi đè/mất bất cứ thay đổi đã có, không nhập lại tự động sau khi chuyển. Admin vẫn có thể chủ động xuất dữ liệu Excel theo mẫu để sao lưu.
- **Phân quyền:** Security Rules production hiện vẫn khóa /hdnd/items. Phiên bản Rules mới và test Firebase Emulator là điều kiện bắt buộc trước deploy, còn GitHub Pages không tự triển khai Rules; công khai website trước khi triển khai Rules sẽ tạo giao diện cho phép nhập nhưng lưu bị Firebase từ chối. PR giữ DRAFT/HOLD cho tới khi có deployment được ủy quyền, backup Rules + Database và kiểm tra post-deploy.
- **Không phụ thuộc link Excel:** dataSource='primary' khởi tạo FirebaseRepository trực tiếp, không tải GViz, không subscribe bản sao, không warmup mirror, không tự chuyển sang Excel nếu lỗi Firebase. Khi không kết nối được sẽ giữ bản đã đọc hoặc báo lỗi, không ghi ra local như thành công.
- **Lịch sử:** FirebaseRepository đã có audit tối đa 50 giao dịch/record và bảo vệ xung đột ô, tái sử dụng thay vì mất lịch sử như phương án mirrorEdits. Khi lưu hoặc đồng bộ không được coi nháp/local là dữ liệu chung.
- **Dữ liệu local trước chuyển đổi:** người dùng có bản nháp chưa ghi trên thiết bị (như ảnh 25/10). KHÔNG xóa hoặc âm thầm đưa bản nháp này vào Database chính. Xuất/đối chiếu bản nháp rồi mới áp dụng lại theo quyền sau khi chuyển; thông báo rõ. Giữ Theme2, nhóm báo cáo, trạng thái, bảng và phân quyền.

**Trạng thái:** mã nguồn PR đang thử, chưa migrate hoặc thay đổi Rules hay Database thật, chưa được gọi là đã kích hoạt realtime trên HopHDND.
