## CHỈ THỊ 28/11/2026 — TIẾN ĐỘ 3 KHÂU GỘP/TÁCH TÙY CHỌN

- Bỏ quy định U02 luôn gộp. Tùy chọn cột → Gộp cột có checkbox “Gộp Tiến độ 3 khâu”, mặc định true để giữ bố cục đang dùng. Bỏ chọn thì hiển thị các cột nguồn đang được phép hiện: Cấp trình, tiến độ xin ý kiến Thành ủy, tiến độ trình HĐND xây dựng NQ và tiến độ trình HĐND ban hành NQ/BC. Bật lại giữ tên nhóm tùy chỉnh, dữ liệu và cấu hình ẩn/hiện riêng; không tự hiện lại cột ẩn/xóa. Không ảnh hưởng các nhóm khác.
- Dùng cờ mergeProgressStages tùy chọn, đọc bố cục cũ mặc định gộp (partyTogether/councilTogether là cờ legacy, không dùng làm mặc định mới). Lưu/Hủy và bố cục cá nhân qua luồng cũ, giữ quyền chỉnh sửa và khóa dữ liệu. WebApp, popup và PDF theo lựa chọn; PDF không ép gộp lại, vẫn không có nhãn nhân sự. Công cụ 5 rail L03 chỉ khi đang gộp. CI kiểm bật/tắt, cột ẩn, lưu/CAS, PDF snapshot tách và hồi quy gộp. Không đổi policy/Rules/dữ liệu; release gate theo phạm vi bố cục.

---

## CHỈ THỊ 28/11/2026 — TÙY CHỌN HIỆN NHÃN NHÂN SỰ CHỈ TRÊN WEBAPP

- Thêm checkbox “Hiện nhãn UBND / VP / Phòng / CV” trong Tùy chọn cột → Hiển thị nhân sự. Mặc định bật để tương thích mọi bố cục đã lưu. Lưu/Hủy và cấu hình cá nhân theo luồng gộp cột hiện hành; không đổi quyền hoặc giá trị hồ sơ. Tắt phải bỏ hẳn rail và gap, đo lại chiều rộng thực tế, giữ đủ các trường đang hiện, bao gồm chế độ CV/Phòng cùng dòng và nhóm tách. Danh sách và popup chi tiết báo cáo dùng cùng tùy chọn hiển thị nhân sự; chế độ sửa cấu hình cột nguồn vẫn giữ nguyên.
- Bản in PDF luôn không có nhãn, không phụ thuộc checkbox; lấy chức danh/họ tên đầy đủ từ snapshot hồ sơ đang in, không suy đoán tên, không in trường ẩn. Giữ ID và nhân sự font regular, L03 và phân bổ chiều rộng A4.
- Thêm cờ tùy chọn tương thích layout cũ, kiểm kiểu boolean, kiểm thử DOM/rail và ẩn/hiện. Chromium in lần hai khi tắt nhãn, đối chiếu toàn bộ giá trị nhân sự với bản in lúc bật. Cổng phát hành: thay đổi schema tùy chọn bố cục và kiểm thử in ngoài vùng QA tự động phải HOLD cho chủ repo xác nhận, không chỉnh policy.

---

## CHỈ THỊ 28/11/2026 — BẢN IN NHÂN SỰ CHỈ GHI CHỨC DANH VÀ HỌ TÊN

- Bản in PDF A4 bỏ hoàn toàn nhãn lặp UBND, VP, Phòng, CV và rail nhãn trong các cột nhân sự gộp. In nguyên giá trị nguồn đầy đủ (ví dụ PCT + họ tên, PCVP + họ tên), không viết tắt theo chế độ màn hình; mỗi thành phần hiện có một dòng chữ thường 8pt, căn trái, không đậm. Phòng/CV chỉ in giá trị đang có, không thêm nhãn; bỏ dòng trống; nếu nguồn đã viết tắt thì giữ nguyên, không đoán họ tên.
- Chỉ in các thành phần thực sự đang hiển thị, dùng ID kỹ thuật của đúng hồ sơ để lấy giá trị từ snapshot List (không lấy dữ liệu trường ẩn), cả khi CV/Phòng gộp trên màn hình. Tự đo độ rộng một rail nhân sự theo giá trị dài nhất, phối hợp với L03, không dành chỗ cho nhãn cũ. Không thay bảng trên màn hình, dữ liệu, Rules, quyền, cấu hình hay thiết kế ID/Tiến độ 3 khâu.
- Kiểm thử full name trong chế độ viết tắt, không còn tag, mỗi dòng regular, không mất trường hoặc in trường ẩn, vẫn bảo toàn A4/Chrome/clipboard. Không sửa cổng phát hành.

---

## CHỈ THỊ 28/11/2026 — DANH MỤC TRẠNG THÁI MẶC ĐỊNH THEO EXCEL DROPLIST

- Nguồn chuẩn: file chủ dự án gửi 28/11, sheet ẩn Droplist: F nghiệp vụ lấy B2:B5 (TTTU, BTV TU, BCH, Không); G lấy C2:C8 (Không phải trình; Sở chưa trình; VP đang xử lý; UB đã gửi ĐU; ĐU đã gửi TU, chưa họp; Đã họp/gửi phiếu, chờ TBKL; Đã có TBKL); H lấy E2:E6; I lấy F2:F4. Không dùng tên khác ở sheet báo cáo thay cho dropdown. Dùng đúng thứ tự, kể cả lựa chọn chưa xuất hiện trong hồ sơ.
- Tách nhãn hiển thị chính thức theo Excel khỏi khóa nghiệp vụ đã được Firebase Rules phê duyệt. Không đổi Rules, ID, transaction/history, dữ liệu lưu cũ hay tự nới quyền ghi. Khi chọn trạng thái, gửi khóa cũ tương ứng; import giữ nguyên chữ gốc, nhận diện alias đúng trường; báo cáo, bộ lọc, menu, danh mục và bản in dùng nhãn Excel, thống kê không đổi ý nghĩa. Quy định tên V3 cũ chỉ còn là khóa tương thích.
- Import A–O nhận đúng hai dòng phân nhóm (A rỗng, B=I/II, C=NGHỊ QUYẾT/BÁO CÁO, D–O rỗng), không bỏ qua hồ sơ thiếu mã thật sự hoặc trùng mã/sai cột. Không upload file nghiệp vụ có tên người thật lên repo public; dùng fixture tổng hợp 43 NQ + 12 BC, vị trí và danh mục đúng nguồn. Không suy diễn trạng thái không được xác nhận, không tự ghi production. Phải qua CI và release gate theo phạm vi import/core.

---

## CHỈ THỊ 28/11/2026 — BỎ DẢI THÔNG TIN ADMIN THỪA TRÊN DANH SÁCH

- Xóa hẳn dòng hướng dẫn kéo tiêu đề/đường phân cách, nút Thẻ ẩn (n), Cột ẩn (n), số cột đang hiện/tổng cột và nút Hiện đủ cột Excel khỏi dải giao diện bảng, cả khi xem và khi chỉnh giao diện; không để wrapper trống. Giữ hành động thực sự độc lập (bảng màu nếu được cấp).
- Khôi phục thẻ tại Chỉnh giao diện → Hiện/ẩn thẻ tổng hợp; khôi phục cột thường/cột gộp tại Tùy chọn cột hiện có. Quyền xem đối chiếu cột nguồn Excel không mất: chỉ đặt thao tác Xem cột nguồn Excel bên trong popup Tùy chọn cột, có đường trở về cùng popup, không xuất hiện thường trực và không ghi bố cục. Giữ Save/Cancel và phản hồi lỗi/lưu thực sự; không thay dữ liệu/Rules/bản in.
- Chromium kiểm không còn dải thừa ở view/draft, ẩn/hiện qua các menu chính, đối chiếu Excel round-trip không ghi layout. Không bypass release gate; merge exact SHA khi CI + auto preflight PASS.

---

## CHỈ THỊ 28/11/2026 — BẢN IN CỘT NHÂN SỰ MỘT DÒNG, ID VÀ NHÂN SỰ CHỮ THƯỜNG

- Bản in A4 tự co đồng thời Tiến độ 3 khâu và các nhóm nhân sự đang hiển thị, độc lập tỷ lệ màn hình. Nhãn UBND/VP/Phòng/CV và tên tương ứng giữ một dòng cho dữ liệu đủ sức chứa A4; đo dài nhất theo font in thực tế, giảm rail/gap thừa, dành đủ chỗ cho cả hai nhóm. Giữ mọi thành phần đang hiện, không giảm font, không cắt chữ; nếu nội dung bất thường vượt giấy thì wrap an toàn.
- ID trong dữ liệu (giữ nguyên ID, căn giữa, 15mm), nhãn và tên nhân sự đều font-weight 400; giữ hàng tiêu đề bảng đậm đồng nhất. Không thay quy ước đậm/nghiêng của Tiến độ 3 khâu hay bố cục WebApp. Chromium kiểm tra tất cả ID và nhân sự regular, một dòng, đồng trục, slack nhỏ, cùng các kiểm tra L03/PDF RGB/A4/pagination hiện có. Không đổi policy/Rules/dữ liệu.

---

## CHỈ THỊ 28/11/2026 — WEBAPP TỰ CO ĐỘ RỘNG HAI CỘT GỘP

- Mặc định Danh sách L03 (Tiến độ 3 khâu) và các nhóm nhân sự L04 dùng đúng nội dung dài nhất đang hiển thị, theo font, chế độ viết tắt/gộp, lọc, quyền sửa và dữ liệu hiện hành; tính cả padding, viền và caret thực của editor. Hai cột không nhận phần chiều rộng dư và không làm kho bù resize. Nếu có hàng được sửa cấp trình và hàng chỉ xem xen kẽ, cùng trục trạng thái và mép phải. Các cột khác nhận phần dư; khi không đủ viewport, cuộn ngang nội bộ, không cắt chữ hoặc giảm font.
- Auto là mặc định, không ghi pixel đo được vào cấu hình chung. Admin có thể tắt tạm tự co trong Tùy chọn cột để dùng độ rộng/kéo thủ công cũ trong phiên; guest luôn auto. Các thông số lưu cũ, popup chi tiết, dữ liệu/quyền/RULES và bản in A4 không bị đổi bởi lần sửa màn hình này. Quy tắc manual trước đó chỉ áp dụng khi Admin chủ động chọn manual.
- Kiểm thử real Chrome font 13→20→13, co/giãn cả hai nhóm, giữ một dòng, cùng trục và không thừa đuôi. Test kéo tay cũ dùng đúng lựa chọn manual công khai, không bỏ kiểm thử. Không tự đổi policy, chỉ merge exact SHA CI PASS/preflight auto.

---

## CHỈ THỊ 28/11/2026 — BẢN IN TIẾN ĐỘ 3 KHÂU TỰ CO VỪA CHỮ

- Thay tỷ lệ cố định 45/55 và độ rộng lấy theo bảng màn hình: bản in A4 ngang đo chữ dài nhất ở từng rail nhãn/trạng thái trên toàn bộ hồ sơ đang in, gồm đúng cỡ/chữ đậm/nghiêng; cột chỉ rộng đủ hai dòng chữ dài nhất + đệm nhỏ, chuyển phần chiều rộng còn lại cho các cột khác. Giữ ID 15mm, hai rail căn trái, hai đường ngang mảnh, không đường dọc/khung/nền riêng; không giảm font, không cắt chữ. Nếu giá trị bất thường dài quá sức chứa A4, ưu tiên wrap an toàn thay vì mất nội dung. Không đổi màn hình, quyền, Firebase hoặc release policy.
- Kiểm thử Chromium ở đúng chiều rộng in: mọi nhãn/trạng thái mẫu 1 dòng, cùng trục giữa các hồ sơ, slack ở chuỗi dài nhất mỗi rail chỉ vài px; giữ toàn bộ kiểm thử PDF RGB, A4, phân trang, clipboard và network isolation. Quy định 45/55 bên dưới chỉ là lịch sử, không áp dụng lại.

---

## CHỈ THỊ 27/11/2026 — KHÔNG YÊU CẦU OWNER RUN WORKFLOW CHO UI THÔNG THƯỜNG

- Trước mọi PR thuần UI đặt title `fix(ui):`, `feat(ui):`, `fix(print):`, `feat(print):` hoặc `[AUTO-UI]`. Kiểm tra **Predict Pages release mode before merge** trên exact synthetic merge history và baseline đã phát hành đọc từ base (không lấy từ PR). CI tự nhận diện PR thuần UI theo nội dung dù thiếu quy ước title. Nếu HOLD, sửa ranh giới hoặc tách phần lõi trước merge; không merge một PR UI rồi chuyển thao tác Run workflow sang chủ dự án.
- Các thông số hình học in thường ngày dùng `src/presentation/print-layout.json` với schema giới hạn; CSS/module trình bày, test UI và Markdown hướng dẫn hợp lệ có thể auto. Phần đo/đối chiếu hình học ba khâu trong runner print được phép sửa trong hai vùng đã kiểm duyệt; phần browser/network/PDF/clipboard/command/cleanup còn lại giữ nguyên và thay đổi executable luôn chạy full QA. Không bỏ test hoặc whitelist toàn bộ scripts.
- Phân biệt rõ UI-only tự phát hành và migration/chỉnh quyền/auth/Rules/dữ liệu/core/publisher/policy cần phê duyệt riêng. Không bật billing, không tự phê duyệt, không giả mạo owner hoặc sửa version.json để bỏ HOLD. Sau merge phải xác minh publish và version.json đúng SHA, không coi Pages static build là bản mới nếu publish skipped.
- Chi tiết: [G00 release preflight](docs/checkpoints/G00_UI_RELEASE_PREFLIGHT_2026-11-27.md). Giữ các chỉ thị bảo mật trước đây.

---

## CHỈ THỊ 27/11/2026 — CHỐT TIẾN ĐỘ 3 KHÂU TRÊN BẢN IN

- Yêu cầu cuối của chủ dự án: **không khung bao từng khâu, không viền nét đứt**. Ba khâu liền nhau không khoảng hở, hai đường kẻ ngang liền mảnh giữa các khâu, vách dọc liền mạch giữa nhãn trái (45%) và trạng thái căn giữa (55%). Nền trắng, chữ đen; Sở chưa trình đậm, Không phải trình chỉ nghiêng. Giữ đường viền ô bảng chính và các quy định Admin, dữ liệu, A4, quyền, release gate.
- Kiểm thử Chromium đủ ba khâu mỗi hồ sơ: bốn cạnh hàng không có khung bao, không nét đứt, hai đường ngang mảnh nối đúng vách dọc không khoảng hở, tỷ lệ 45/55, không tràn, căn đều; kiểm pixel PDF RGB mọi trang. Chỉ merge exact head đạt CI; không bypass gate, không thay Firebase production.

---

## CHỈ THỊ 26/11/2026 — LỊCH SỬ VÀ CỠ CHỮ CHỈ ADMIN, BẢN IN A4

- Nội dung trình in chữ thường, không đậm; Tiến độ 3 khâu in dạng bảng con tối giản: đường kẻ mảnh, không ô màu/ký hiệu, toàn bộ bản in chữ đen/nền trắng/đường kẻ trung tính, nhấn đậm Sở chưa trình, in nghiêng Không phải trình, giữ đúng text và ý nghĩa từng khâu. Xem [checkpoint](docs/checkpoints/G00_PRINT_AND_ADMIN_TOOLS_2026-11-26.md).
- Quy định mới thay thế test guest history cũ: chỉ Admin thấy/mở lịch sử Ghi chú, Tiến độ hiện tại và chỉnh cỡ chữ. Khách vẫn kế thừa font chung và quyền sửa cột được cấp. Không giảm quyền ghi hoặc làm đổi dữ liệu.
- Phân quyền giao diện/repository không đồng nghĩa private raw RTDB: lịch sử còn lồng trong record có read công khai. Không khẳng định bảo mật server hoặc tự đổi Rules/dữ liệu; tách audit cần đợt riêng.

---

## CHỈ THỊ 26/11/2026 — SỬA UI THÔNG THƯỜNG THEO RANH GIỚI HIỂN THỊ

- Trước khi sửa, đọc [quy trình UI declarative](docs/checkpoints/G00_DECLARATIVE_UI_RELEASE_2026-11-26.md). Đổi nhãn, viết tắt đơn vị, biểu tượng + trong `src/presentation/ui-presentation.json`; CSS cho màu/căn lề/độ rộng; số học bố cục trong `l03-width-geometry.ts` hoặc `list-nowrap-widths.ts`. Đừng sửa CellPicker, SavedLayoutMenu, L03InlineWidthControl, App, dữ liệu/quyền chỉ để đổi hiển thị.
- Phần trình bày đã rà soát chỉ thêm import đúng helper alias/JSON đã duyệt. Không whitelist cả tệp lõi hoặc thư mục src; module lạ vẫn HOLD. Nếu phải tách thêm lõi/UI, làm rõ phạm vi trước khi lập PR.
- Merge đúng SHA sau CI, kiểm tra publisher thật và version.json; nếu chỉ UI hợp lệ mà HOLD, kiểm tra log và sửa đúng ranh giới, không bắt owner Run workflow cho việc thường ngày. Policy migration, auth, quyền, schema, data, Rules và callback ghi vẫn owner approval.
- Không sửa biến, không tự duyệt policy, không bỏ QA. Cập nhật checkpoint và CURRENT_STATE theo bằng chứng, phân biệt PASS CI và deploy thực.

---

## CHỈ THỊ 21/11/2026 — KHÔNG BẮT CHỦ DỰ ÁN CẬP NHẬT SHA VARIABLE LIÊN TỤC

- **Các chỉnh sửa thuần UI trong allowlist** phải tự phát hành sau CI qua `policy_mode=auto` (không cần chủ dự án thao tác).
- **Các chỉnh sửa lõi/quyền/dữ liệu hoặc vượt allowlist** vẫn giữ HOLD nếu chỉ push; chủ repository **bấm Actions → Build and publish HopHDND Pages → Run workflow, chọn main** để phê duyệt đúng SHA của lần chạy. Không yêu cầu chủ dự án vào Settings sửa `HOPHDND_PAGES_APPROVED_MAIN_SHA`.
- Xác minh actor là **repository owner**, event `workflow_dispatch`, ref `main` và SHA bất biến; sau build vẫn kiểm tra không có commit main mới. Không tự phê duyệt quyền/Firebase hay bỏ các bước Emulator/Chrome.
- Workflow có thể PASS tại `release-gate` nhưng `publish=SKIPPED`; **không được báo đã xuất bản**, không ép bypass.
- Tài liệu: `docs/operations/UI_AUTO_RELEASE_2026-11-17.md` phần bổ sung 21/11. Mọi luồng UI ưu tiên sửa presentation leaf thay vì chạm `App.tsx` không cần thiết.

---

## CHỈ THỊ MỚI 17/11/2026 — PHÁT HÀNH GIAO DIỆN TỰ ĐỘNG CÓ KIỂM SOÁT

**Tài liệu hiện hành:** [UI_AUTO_RELEASE_2026-11-17.md](docs/operations/UI_AUTO_RELEASE_2026-11-17.md).

- Phần hiển thị dropdown: sửa `src/features/items/CellPickerPopupView.tsx`, `cell-picker.css`, hoặc các module trình bày `pr95-v5-l1-picker-placement.ts` và `CellPickerPositioning.ts` (đo DOM). **Không sửa `CellPicker.tsx`** khi chỉ thay giao diện; đó là lõi quyền sửa/lease/CAS và không được auto-release.
- PR UI đủ điều kiện được tự phát hành sau CI; Firebase, quyền, lưu dữ liệu, import, code nghiệp vụ, chính sách hoặc workflow vẫn buộc phê duyệt **đúng SHA main**. Đánh dấu `release-gate` PASS + `publish` SKIPPED là **HOLD**, không phải đã xuất bản.
- Không tự thay đổi `HOPHDND_PAGES_APPROVED_MAIN_SHA`, không bypass policy. Sau chuyển tiếp có bảo vệ một lần, các thay đổi thuần UI thuộc danh sách sẽ không cần người dùng liên tục sửa variable.
- Chrome QA bắt buộc cho menu: vùng tìm kiếm cố định, danh sách cuộn độc lập, ngưỡng Sở/ngành 7 lựa chọn kèm search, các dropdown khác 4 lựa chọn, tìm kiếm không dấu và không ghi dữ liệu khi chỉ cuộn.

---

## OWNER DIRECTIVE — 29/10/2026: Adjacent-first manual column resize (PR #92, Lượt 019)

**This instruction supersedes only the 23/10 rule below requiring the last visible column to compensate every drag.** Keep all other restrictions and release gates unchanged.

- When adjusting the selected List frame width: distribute spare horizontal space over flexible content/group columns so the table fills the available frame; do not invent empty trailing white space. If the minimum widths together exceed the frame, use the table's *internal* horizontal scroll, not whole-page overflow or overlapping text. Default displayed ID remains **52px** (raw source 68px).
- When dragging a separator between two visible columns: transfer pixels **first from/to the immediate right-hand column**, one-for-one, in both pointer preview and final CAS commit. If that neighbor reaches its min/max, transfer *only the remaining delta* from/to the **last displayed column**, provided it is not the same neighbor. Clamp at combined capacity; never violate min/max or change total visible width.
- An auto-fitted column may appear much wider than its saved raw baseline. The first explicit manual resize materializes that already-displayed auto-fit growth once, keeping nonparticipants visually unchanged and allowing the adjacent column to give pixels down to its true minimum. Never continually persist automatic viewport resizing or re-scale ID repeatedly; retained future responsiveness must be checked.
- Preserve read-only viewer limits, shared-layout CAS/merge/rollback/freeze, R01–R05, stage tint, per-field highlighting, user group names and four summary cards. PR #92 only: **not authorized to merge or publish**. No Firebase Rules/Functions deploy, import, production DB write, Supabase or source switch. Codex independent review required.
- Verify exact source SHA with typecheck, unit, Firebase Emulator, headless Chrome pointer/keyboard, last-reservoir fallback, 1600 cap, ID 52px, reordered/hidden groups, auto-fit and 900px/mobile viewport. Store screenshots and results in `docs/tasks/UI_COLUMN_REFINEMENT_2026-10-28.md` Lượt 019.

---

## FIREBASE LAUNCH PREPARATION — 27/10/2026: PR #79 merged, production backend still requires separate activation

**Goal clarified by owner:** no employees are currently entering WebApp data. Use `main` and the canonical Pages URL for direct UI review; keep Google Sheets available as transitional source. Firebase-only. Supabase PAUSED.

- PR [#71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) and [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) are already merged into main; **[#79](https://github.com/cavoixanh638/HopHDND-WebApp/pull/79) now merged** at `14166362684cd8220fde4e552bc1be0d6ffc008a`.
- A genuine launch gap is closed in code: **approved first import** from fresh Google Sheets or Excel into **empty** `hdnd/items` (admin, checked snapshot, duplicate/invalid records blocked, explicit two-step confirmation, server empty-root transaction, per-record readback, never overwrites and never auto-switches `dataSource`). Kept separate from transitional updates on already-existing rows. No changes to standard list, reports or 4 compact columns. See [initialization checklist](docs/operations/FIREBASE_FIRST_IMPORT_FROM_CURRENT_SOURCE_2026-10-27.md).
- Exact tested feature head `00ce3e2bf5a7ae6dd078a001cb6c25b0f9c02b8e`: [source build + browser tests #40478916952](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40478916952) PASS; [isolated Firebase Emulator staging #40478916935](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40478916935) PASS. No production credentials/data were used in CI. Main Pages build/deployment must still be checked separately.
- **Pending Firebase production access / Cloud checks:** authoritative read-only Rules/RTDB state, fresh private backup and emulator restore check, independently reviewed deployment of exact security rules, empty-root current approved source import, profile switch to `primary`, real two-user distinct Google UID/browser lock/save/realtime/freeze test and recorded release GO. Do not conclude these checks passed from browser or Emulator CI.
- Avoid blanket root set/remove, recurring Sheets sync, silent data migration, permission expansion or premature Rules deploy. Without authenticated connection to `hophdnd-8b7b2`, the assistant cannot truthfully claim production Rules/data checks or writes.

---

## PUBLISH CHECKPOINT 27/10/2026 — MAIN HAS FIREBASE-ONLY WEBAPP SOURCE, DATABASE CUTOVER STILL SEPARATE

**Owner clarified that no employees are using the WebApp yet.** We are using the canonical GitHub Pages URL as a live UI-acceptance environment; no extra HTML download/standalone preview is necessary for routine UI review.

- PR [#71](https://github.com/cavoixanh638/HopHDND-WebApp/pull/71) merged into `main` at `accde2681571e36b9548b21925fe9b2c82082236`; PR [#72](https://github.com/cavoixanh638/HopHDND-WebApp/pull/72) merged at `c1696fa6a6b89e94013a5477fcd82650b3e343df`. PR #77 and all Supabase development stay PAUSED, not merged. 
- GitHub Pages publish workflow [run #40474477483](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40474477483) passed; the generated root `index.html` now references `./assets/pages-DUfJ2eUZ.js`, `./assets/style-BLGoX-cX.css` and the Pages build commit `43eb9b31f2b5d0943d545324974f8549cfe568d2`. GitHub Pages dynamic deployment status must be checked separately. Canonical site: https://cavoixanh638.github.io/HopHDND-WebApp/.
- **Important: code deployment is NOT Firebase data migration.** No production RTDB Rules publish, `hdnd/items` data import, profile `dataSource=primary` activation or user-role changes have been performed. Do not imply real-time employee editing is ready until the connected Firebase project has been independently checked. The existing source choice may still show Sheets/mirror and may be read-only.
- Final Firebase production activation remains contingent on verifying the real project's published Rules and snapshot/backup; validated source dataset and exactly one import if empty; matching RTDB Rules deployment authorized by owner; admin/employee Google UID sign-in and proper rights; real two-account save/readback/lock/freeze smoke; rollback. The owner explicitly wants to operate the Pages app as an initial acceptance target and reports no staff data entry, which lowers cutover coordination needs but not security/consistency requirements.
- Source now includes four compact merge options and a manual Sheets/Excel reconciliation UI, but the latter requires `primary` and authenticated admin; it is not a substitute for initial onboarding. Do not overwrite any existing records to initialize.
- This checkpoint supersedes older PR status lines below only where they state the code is not merged or the WebApp HTML has not been published. Historical unresolved RTDB security limitations remain documented and must be separately accepted/resolved before live employee editing.

---

## Chỉ thị hiện hành 26/10/2026 — Firebase-only; Supabase PAUSED

**Quyết định bắt buộc:** [FIREBASE_ONLY_SUPABASE_PAUSED_2026-10-26.md](docs/decisions/FIREBASE_ONLY_SUPABASE_PAUSED_2026-10-26.md). Mọi yêu cầu phát triển tiếp theo chỉ dùng nhánh Firebase PR #71/#72; **không gộp PR #77 hoặc Supabase PR #73/#75**, không deploy Supabase/dual source, không ghi chép/sync thêm dữ liệu sang Supabase. Supabase staging giữ nguyên snapshot 55 dòng như một lựa chọn dự phòng tĩnh, **không phải backup realtime**. Chỉ khôi phục hướng Supabase khi chủ dự án yêu cầu rõ. Giữ release gates Firebase và không thay production nếu chưa GO.

---

## Quy tắc phát triển mới 25/10/2026: Firebase primary và bảo toàn dữ liệu
- PR #71/#72 là kiến trúc đích, **chưa được coi là đã deploy**. Muốn phát hành phải kiểm thử đúng exact head, sao lưu/đối chiếu Firebase Rules + RTDB thực, staging 2–3 tài khoản, phê duyệt GO/NO-GO theo `docs/operations/FIREBASE_PRIMARY_RELEASE_GATE_2026-10-25.md`.
- Không sửa/xóa/import đè `hdnd/items`; không tự chuyển `hdnd/profile/dataSource` nếu chưa xác minh dữ liệu. Excel chỉ là nguồn tạm và bản đối chiếu sau chuyển.
- Bắt buộc bảo vệ mọi đường ghi nghiệp vụ bằng khóa theo ô `(recordId,field)`, quyền thực, expiry/fencing, CAS và chế độ chốt cả admin. Không bỏ qua do một button/nhánh popup. Đóng băng chỉ chốt các commit đã server ACK; nháp chưa ACK phải giữ.
- Phân biệt `editingLocked` chỉ khóa khách với `FROZEN` chặn cả admin. DRAINING có thể tồn tại nếu tab admin đóng, không tự khẳng định snapshot đã chốt. Không triển khai Rules qua cấu hình firebase.json mặc định mà chưa xác nhận candidate.

---

# Hướng dẫn làm việc

## 23/10/2026 — Quy tắc kiểm soát bố cục và lịch sử

- ID mặc định 68px; migrate legacy 100px của bố trí cũ, giữ các giá trị custom khác 100. Bảng dữ liệu: kéo một cột không chia đều hoặc dồn vào cột bất kỳ, chỉ `resizeWithLastColumn` thay width cột đang kéo **và cột cuối đang hiển thị** với tổng không đổi; không gắn tay kéo vào cột cuối. Preview `ColumnResizeHandle.compensator` phải giữ tổng width, React/Firebase commit một lần khi thả; cột cuối chạm giới hạn 60/1600 thì dừng.
- Cặp gộp Lãnh đạo hiển thị **UBND trên, VP dưới** với nhãn `Lãnh đạo UBND / VP`, không đổi giá trị nguồn hoặc chức vụ. Phòng/CV và lãnh đạo không được cộng chiều rộng bắt buộc hay áp min-width 170px. Loại VB khi gộp với nội dung luôn hiển thị nguyên cụm `(HC)`, không có history chen giữa các ký tự.
- `specificProgress` là **Excel N** đã có, `note` là **Excel O**. Cả hai text/textarea, không biến dữ liệu N thành dropdown status tùy tiện. Chỉ hai trường này có lịch sử ở main/popup; ID và trường khác không có icon. Lịch sử field phải liệt kê đầy đủ, mới nhất lên đầu, màu thời gian riêng, nội dung sửa riêng, không đánh số. Ghi chú có 3 mẫu DEMO rõ ràng và không ghi backend.

## 23/10/2026 — Khóa hồi quy đường kẻ kéo cột và bộ lọc không nhảy

- Hit-zone đổi rộng cột Bảng dữ liệu chính là 8px quanh đường viền dọc có sẵn, `background:transparent;border:0`, không vẽ icon/tay nắm dày; hover/focus chỉ đổi màu nét chính đường kẻ, không chặn drag tiêu đề đổi vị trí. Giữ commit sau pointer release, không viết Firebase theo từng pixel.
- Filter `Chọn để lọc Phòng` cùng tìm CV font 15px, chiều cao hàng đủ cho 2 điều khiển; các select/input sticky gọi `preserveStickyFilterViewport` trên pointerdown để bấm mở không đổi `scrollTop`/Left. Chỉ cho trình duyệt clamp lại nếu người dùng thực sự thay bộ lọc làm giảm số dòng.
- Browser smoke phải thử CDP click select ở scrollTop>200, kiểm scrollTop gần như giữ nguyên; không dùng kiểm test dispatch change giả thay cho thao tác bấm mở dropdown.

## 23/10/2026 — Quy tắc gộp Phòng/CV và kéo cột của quản trị

- Tùy chọn mới `roomSpecialist` gộp `room` (anchor) với `specialist` (hidden), trong khi `department` **vẫn là cột độc lập**. Giữ hai điều khiển cùng một ô lọc: `Lọc theo Phòng` và `Tìm kiếm tên CV` dùng phép **AND**. Không dùng một textbox chung, không bỏ lọc tên CV khi ẩn cột chuyên viên. Không tự chuyển lựa chọn cá nhân `departmentRoom` trước đây.
- Admin Firebase trên chế độ xem được kéo đầu/biên cột để sắp xếp/đổi rộng trên **bản dùng chung**. Chặn khách; chặn mẫu cá nhân, chế độ hiện đủ Excel; lưu nguyên tử một thao tác sau khi thả bằng `onPersistViewerLayout` với baseline `initialLayout`, transaction merge/CAS. Optimistic UI phải rollback nếu save không được xác nhận. Tuyệt đối không ghi dữ liệu nguồn hoặc lưu trên từng pixel. Sort chỉ ở chế độ chỉnh sửa.
- Ghi chú: `NOTE_HISTORY_DEMO` gồm đúng 3 sự kiện minh họa tĩnh (thời điểm/giá trị), hiển thị rõ “DỮ LIỆU DEMO”, không lẫn audit thật và không ghi backend. Giữ lịch sử thật nguyên vẹn.

## Chặn hồi quy màu dòng nháp và chức vụ lãnh đạo (22/10/2026)

- **Không** tô vàng toàn bộ hàng chỉ vì nháp: không khôi phục `.data-table tr.dirty-row {background:#fff9e9}`, không gắn class `dirty-row` từ `ItemList` hay sọc cam `.report-grid-row-dirty` từ popup. Vẫn báo nội dung chưa lưu và giữ màu dòng **tùy chỉnh chủ động** của người dùng.
- Chế độ `shortLeaders` phải gọi `abbreviateLeaderName` (trong `src/features/items/compact-columns.ts`) cho Lãnh đạo VP và UBND dù gộp hay riêng. Chức vụ `PCVP`, `Q.CVP`, `PCT`, `PCTT` phải **giữ nguyên**, chỉ rút tên cá nhân. Không áp dụng tên viết tắt lên dữ liệu nguồn, dropdown lựa chọn, bộ lọc; chỉ bản xem. Có unit + Chrome smoke bắt buộc.

## Bộ màu trạng thái cá nhân (22/10/2026)

- Tính năng UI `src/features/items/StatusPaletteManager.tsx`; model/lưu local `src/data/status-palettes.ts`; cấp state chung từ `src/app/App.tsx` qua CSS vars `--hdnd-status-*` để cả bảng chính/popup cùng cập nhật. Giữ nguyên `progressTone` định nghĩa các trạng thái hoàn thành tương đương; chỉ `statusPaletteTone` mở thêm nhóm `other` **khi người dùng bật**.
- Luôn giữ bốn nhóm có HEX hợp lệ và người dùng có thể chọn màu chữ + màu nền, đặt tên, lưu/chọn/cập nhật/xóa tối đa 20 mẫu; cấu hình theo nguồn lưu **localStorage** cá nhân, không ghi dữ liệu chung/Firebase/Excel. Đổi palette không được reset, remount hay refetch bảng. Khách không thấy công cụ sửa quyền/popup; chỉ thay hiển thị.
- Default là màu V5, chưa phải preset có tên; V1/V2 vẫn là checkpoint GitHub bất biến. Tự động kiểm TypeScript, unit, Chrome (CSS computed) và Pages trước khi chốt.

## V5 thử sắc màu chữ rõ hơn (22/10/2026)

- V5 chỉ đổi màu chữ `--workflow-text`: đỏ `#D00025`, cam `#B04700`, xanh hoàn thành `#007A18` (600); dùng cho Bảng dữ liệu + popup cả pill xem và editor. Nền, viền, dot, lịch sử, quyền, dashboard không đổi. Đảm bảo contrast >=4.5:1; nếu lần sau muốn làm **sáng hơn** thực sự mà vẫn đạt WCAG thì phải đánh giá đổi nền đồng bộ Bảng tổng hợp, không chỉ làm sáng chữ không kiểm tra.
- Backup V1/V2 đã chốt không được di chuyển. V5 là bản thử chưa lưu chốt. Tham khảo `docs/CURRENT_STATE.md` và `docs/VAN_HANH.md`.

## Biến thể V4 thử màu chữ sáng hơn — 22/10/2026

- V4 chỉ thay `--workflow-text` của `Sở chưa trình` thành `#C52445`, `VP đang thực hiện` thành `#A15700`, `Hoàn thành` và tương đương thành `#00794A`, giữ `font-weight:600`. Áp dụng đồng nhất Bảng dữ liệu/popup; nền/viền/chấm/icon/history và quyền không đổi. Chữ trên nền giữ tương phản ít nhất 4,5:1; không làm nhạt quá ngưỡng để “sáng” hơn.
- Đây là **V4 thử nghiệm**, **không ghi đè** nhánh backup V1 và V2; xem `docs/CURRENT_STATE.md` và `docs/VAN_HANH.md` để phân biệt bản chốt với bản thử.

## Danh mục hai mốc màu đã chốt (22/10/2026)

- **V1 — Nền màu chuẩn, chữ cũ:** commit `6c151458561b7800af51bab64837430e147fdcef`, nhánh `backup/ui-colored-status-pill-approved-2026-10-22`; chữ `#7F1D30/#704500/#2B7450`, status font-weight 750 và completed 650.
- **V2 — Màu chữ tươi, nét mảnh 600:** commit `d6e4b447e25ede00683cdea7689af40a781c1ea8`, nhánh `backup/ui-vivid-status-ink-weight600-2026-10-22`; chữ `#B2263D/#875000/#27774B`, font-weight 600. **Nền, viền, chấm và icon không đổi** so với V1. Đây là mốc độc lập lưu theo lệnh 22/10/2026.
- **Quy tắc phục hồi:** đọc `docs/VAN_HANH.md`, chọn **đúng V1 hay V2**. Khi chỉ restore màu: lấy ba `--workflow-text` + selector chữ ở V2, **không** `git restore` toàn bộ CSS, không reset/force-push main, không sửa hai nhánh backup. Chỉ thay code sau khi soát ảnh hưởng và chạy CI/Chrome Bảng dữ liệu + popup.

## Biến thể thử điều chỉnh chữ tiến độ — 22/10/2026

- Chỉ **chữ** của nhãn nghiệp vụ ở Bảng dữ liệu/popup đổi sang `#B2263D` (Sở chưa trình), `#875000` (VP đang thực hiện), `#27774B` (hoàn thành), weight `600`, thông qua `--workflow-text`. Độ tương phản tối thiểu 4,5:1; **nền, viền, chấm, dropdown, lịch sử không đổi**. Giữ màu trạng thái Bảng tổng hợp theo nguồn.
- Đây là biến thể sau mốc đã chốt; mốc bất biến `6c151458561b7800af51bab64837430e147fdcef` và nhánh `backup/ui-colored-status-pill-approved-2026-10-22` **không được cập nhật**. Nếu người dùng bảo quay lại bản đã chốt thì theo `docs/VAN_HANH.md` và mốc cố định, không nhầm biến thể thử với bản gốc.

## Mốc khôi phục giao diện được người dùng chốt — 22/10/2026

- **Mốc ổn định “dropdown trạng thái có nền màu như ảnh”**: commit phát hành `6c151458561b7800af51bab64837430e147fdcef`, nhánh backup **`backup/ui-colored-status-pill-approved-2026-10-22`**, [quy trình rollback](docs/VAN_HANH.md). Không tự di chuyển/sửa nhánh backup.
- Trước khi thay màu dropdown hoặc lịch sử, so sánh với snapshot này và đọc đoạn mới nhất của `docs/CURRENT_STATE.md`. Chỉ chốt restore khi cả Bảng dữ liệu và popup có nền hồng/vàng/xanh tương ứng, history icon mờ mặc định, chữ done `#2B7450` và kiểm Chrome đã PASS; không lặp lại PR #13.

## Cố định UI theo ảnh sau rollback PR #13 — 22/10/2026

- Ảnh chuẩn của người dùng là **dropdown có nền trạng thái nghiệp vụ** (Sở chưa trình hồng `#FFE0E4`, VP đang thực hiện vàng `#FFE8B8`, hoàn thành xanh `#D5F0DE`), áp dụng cho ô **được phép sửa**, kể cả hover/focus, trong Bảng dữ liệu và popup; không chuyển thành nền trắng.
- Giữ `CellHistoryAction` như phiên bản trước PR #13 (icon thấy mờ mặc định `opacity:.42`) và màu chữ `Hoàn thành` của PR #12 (`#2B7450`). Chỉ khóa hồi quy và bảo đảm CSS đúng, không tự làm mới thiết kế.
- Chrome smoke phải kiểm **computed background của nút CellPicker khi có quyền sửa**, không chỉ pill read-only; kiểm đủ 3 tone ở cả hai bảng và icon history. Không sửa dữ liệu nguồn/permission để thử.

## Quy tắc popup, tooltip và dropdown từ 20/10/2026

- Khách popup chỉ có bộ lọc theo cột, không thêm nút resize, xem đủ cột, tìm kiếm chung hoặc điều hướng Danh sách. Chế độ chỉnh sửa/nút history/permission đều ẩn hoàn toàn; test Chrome và unit phải chặn tái phát.
- Tooltip số trong báo cáo không được che ô số đang trỏ. Một `getBoundingClientRect` khi pointer enters ô mới là ngoại lệ được kiểm soát đối với benchmark cũ, **không thêm pointermove, body:has hay tooltip mỗi ô**. Tooltip ô sửa chỉ render ở ô thực sự được quyền, dùng singleton không dùng HTML title trì hoãn.
- Dropdown đã được cấp quyền sửa dùng cùng CellPicker và khung bo nhẹ/mũi tên; không áp dụng UI này cho ô chỉ xem, không ghi đè màu nghiệp vụ. Giữ kiểm thử Chrome tự động, không tạo bản HTML test cho người dùng.



## Quy trình phát triển và phát hành hiện hành — 20/10/2026

- **Chỉ làm mã nguồn trên GitHub và xem kết quả ở GitHub Pages chính:** https://cavoixanh638.github.io/HopHDND-WebApp/ . Không tạo, gửi hay phát hành các đường dẫn HTML kiểm thử/preview riêng cho người dùng. Những preview cũ chỉ là tài liệu lịch sử, không phải luồng phát hành.
- Phát triển bằng branch + PR, kiểm thử TypeScript/unit/Firebase emulator/Chrome với dữ liệu giả trước khi merge. Sau khi CI PASS, merge có kiểm tra và để `.github/workflows/publish-pages.yml` tự build từ source và cập nhật `main:index.html`. Bản build HTML trong CI là sản phẩm kỹ thuật bắt buộc cho Pages, **không phải file HTML thử gửi người dùng**.
- Giữ bản backup trước thay đổi lớn, theo dõi **cả workflow publish source lẫn Pages deploy** PASS, sau đó kiểm mã/marker trong root HTML. Không tự triển khai Firebase Rules hay ghi nguồn Excel/Firebase chỉ vì cập nhật giao diện.
- PR #3 đã merge vào main trong ngày 20/10/2026; các ghi chú lịch sử “không merge PR #3” bên dưới áp dụng **cho giai đoạn trước ngày này**, không còn là trạng thái hiện tại.



- Người dùng là chỉ huy; parent agent điều phối tổng thể, Luna xử lý phần việc đơn giản được giao. Không tự mở rộng phạm vi hoặc diễn giải kế hoạch thành quyền ghi dữ liệu sản xuất.
- Đọc theo nhiệm vụ: bắt đầu với `docs/CURRENT_STATE.md` nếu cần tình trạng; tra `docs/FEATURES.md` theo Fxx; đọc `docs/SYSTEM.md` khi đổi nghiệp vụ; đọc `docs/ARCHITECTURE.md`/`docs/API.md` khi đổi luồng dữ liệu hoặc API; dùng `docs/REPO_MAP.md` để tìm mã. Chỉ đọc sâu phần liên quan.
- Sửa nguồn chuẩn và tài liệu liên quan; không sửa artifact build thay cho nguồn. Giữ tương thích mã/format legacy khi yêu cầu; không tự ánh xạ giá trị mơ hồ.
- Thực hiện local fixes trong phạm vi được giao mà không hỏi lại permission. Tài liệu kế hoạch chỉ mô tả dự kiến, không cấp quyền đọc/ghi dữ liệu thật, triển khai hoặc phát hành. Dùng dữ liệu giả khi cần.
- Không đánh dấu chức năng hoàn tất nếu chưa có bằng chứng; CURRENT_STATE là nơi ghi kết quả đã kiểm chứng, FEATURES là đặc tả. Cập nhật đúng tài liệu và kiểm tra phù hợp với thay đổi.
- Tránh nhân bản tài liệu: `docs/README.md` là chỉ mục và nơi chốt nguồn chuẩn; `docs/VAN_HANH.md` quản lý phát hành/rollback/backup/sự cố; `docs/TU_DIEN_DU_LIEU.md` ánh xạ A–P/ID/kiểu; `docs/CAI_DAT_VA_CHAY.md` chỉ hướng dẫn môi trường build local. Chỉ tách tài liệu mới khi trách nhiệm thật sự khác và sửa đồng thời chỉ mục, liên kết. Không sửa cấu hình Firebase production hoặc nội dung Excel trong nhiệm vụ tài liệu.

## Quy tắc popup Bảng chi tiết và so sánh chức năng với Danh sách — 19/10/2026

- Khi sửa popup từ ô số, đọc [`docs/REPORT_DETAIL_PARITY_2026-10-19.md`](docs/REPORT_DETAIL_PARITY_2026-10-19.md), [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) và [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). **Không xóa tay nắm kéo cột, không trở lại `width:max-content/min-width:100%`, không giả định nhập px bằng việc gán `<col>` là đủ.** `table.width` phải bằng tổng cột và phải có Chrome CDP kéo chuột thật, đóng/mở còn width.
- Chỉ popup bật `ColumnResizeHandle.windowDragFallback`, không làm global window pointermove thường trực. Dùng lại ColumnHeader/ColumnFilterCell/CellPicker/ContentEditor của bảng Danh sách, không xây lại đường kiểm quyền. Giữ layout/mẫu/màu popup riêng theo source/preview; các cột giả Excel, 20 custom columns/permissions/Excel writer là hạng mục quản trị riêng, không lẫn dữ liệu nguồn.
- Code/Tài liệu commit chỉ đưa vào preview sau exact CI success + artifact hash kiểm, không đụng production root/Excel/Firebase hoặc merge PR #3.

## Quy tắc giữ hiệu năng bảng báo cáo — quyết định đã đo 19/10/2026

- Khi sửa `ReportTable`/hover F06 phải đọc [`docs/SYSTEM.md`](docs/SYSTEM.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/FEATURES.md`](docs/FEATURES.md) và [A/B Chrome](docs/TOOLTIP_PERFORMANCE_AB_2026-10-19.md). **Không tự đưa lại `body:has(...:hover)` kết hợp CSS Anchor Positioning** cho tooltip báo cáo, không tạo tooltip/handler riêng cho mỗi ô. Việc thay kiến trúc chỉ được quyết định sau khi có phép đo Chrome phù hợp và kiểm đủ click/focus/in/5 báo cáo.
- Chỉ ô có số dương đang hover được tô nền xanh ngọc .14 và `outline:2px solid #08777B` (focus 3px); không tô cả hàng, không border làm xê dịch bảng, blur/animation/shadow đắt hoặc thay màu ngữ nghĩa. Tooltip `Click để xem chi tiết` là **một host chung**, chỉ cập nhật vị trí khi đổi ô, không chạy trên mỗi `pointermove`, không đọc geometry ở pointer path.
- Với thay đổi UI, phân biệt **mã đã commit**, **CI đã PASS**, **preview đã deploy**, **production đã đổi** và **người dùng đã nghiệm thu**. Không gọi benchmark 300 sự kiện synthetic là thời gian hiển thị thực tế. Giữ artifact bất biến theo exact SHA, chỉ publish preview riêng khi được giao; không merge PR #3 hoặc ghi Excel/Firebase/root production khi chưa được yêu cầu. Bằng chứng hiện tại tại [`docs/KIEM_THU_VA_NGHIEM_THU.md`](docs/KIEM_THU_VA_NGHIEM_THU.md) và [`docs/VAN_HANH.md`](docs/VAN_HANH.md).

## Quy tắc đồng bộ danh sách/popup — 20/10/2026

- Màu từ khóa theo từng ô lấy chung từ `ItemLayout.cellHighlights`, không trộn với màu hàng của mẫu cá nhân; validate mã HEX và giới hạn số quy tắc, không sửa dữ liệu nguồn.
- Không khôi phục sort ở chế độ xem/khách; chỉ edit có `onSort`. Marker `editable-cell` phải gắn với đúng permission hiện hành, không có cho ô bị khóa hoặc guest popup.
- Căn bảng theo `data-col-key`, không dùng `:nth-child` do thứ tự cột tùy chỉnh; riêng `content`/`note` vẫn căn trái-trên.
- `CellHistoryAction` dùng icon nhỏ/tooltip và chỉ truy vấn audit sau thao tác bấm; hiển thị **lần lưu gần nhất của chính field**, không tự xác nhận có lịch sử chỉ vì có biểu tượng; không cấp hành động cho guest ẩn danh.
- Giữ riêng các mức: source commit/CI PASS/preview deployed/production deployed/khách nghiệm thu. Quy trình preview chỉ dùng artifact bất biến kiểm exact SHA và digest, không tự ghi dữ liệu thật.

## Quy tắc chống lặp giao diện — 20/10/2026, PR #5

- Danh sách nội dung chỉ có một tiêu đề cấp trang (`Danh sách làm việc`); card bảng giữ count và chuyển cột, không lặp tiêu đề và thẻ nguồn. Với admin/người sửa, những thông tin GID/reset/tài khoản đặt tại nhóm Tài khoản/Nguồn; cảnh báo nguồn mở qua details gọn.
- Tiêu đề **cột** nguồn căn giữa theo mã cột dù đổi thứ tự; cả hàng nhãn/hàng lọc và data phải có vạch dọc mảnh. Sort ở mode sửa không được làm lệch chữ tiêu đề.
- Không dùng màu viền trái của từng ô để báo sửa; quyền vẫn phải được kiểm backend, và class `editable-cell` chỉ kích hoạt tooltip ở ô được phép. Dropdown có viền/chevron khi có quyền.
- Tooltip báo cáo và ô sửa dùng chung tính toán vị trí ngoài ô, ưu tiên hơi chếch phía phải, lật nếu sát mép; không che nguồn; không thêm hover-state React cho mỗi ô hoặc pointermove. Phép đo unit + Chrome smoke phải bắt lỗi tái phát.

## Navigation chính thống nhất — 20/10/2026, PR #6

- App có đúng 2 card chính `Báo cáo tổng hợp` / `Danh sách các ND trình HĐND`. Nhãn đầy đủ (không dùng nhãn ngắn cũ) cho cả guest/admin, nhấn card đổi page `overview`/`items`; focus/active/disabled rõ.
- Ẩn brand/banner Sheets và heading trùng trên cả hai màn chính, chỉ giữ phiên bản và đường vào đăng nhập/cài đặt trên cùng. Nút làm mới dữ liệu ở account/source, GID và khôi phục nguồn trong details. Tuyệt đối không tắt polling 60 giây hoặc bỏ quyền truy cập tài khoản.
- Bỏ cảnh báo **toàn trang** không phân loại NQ/BC; giữ cảnh báo nghiệp vụ nằm **bên trong bảng** về trạng thái chưa chuẩn hóa. Giữ nguyên tỷ lệ báo cáo, tổng số, màu trạng thái, quyền sửa và dữ liệu nguồn.
- Trước merge/triển khai phải PASS TypeScript, unit, Firebase emulator, Chrome smoke cho đủ hai trang và có bằng chứng Deploy GitHub Pages. Khi thay test, không thay điều kiện theo cách bỏ kiểm tra cảnh báo có giá trị.

## Quy tắc UX ngày 20/10/2026 — PR #7

- Hai card mục chính tổng max 820px, căn giữa khung; màu chủ đạo riêng từng card và trạng thái active có chữ trắng, focus rõ; không khôi phục kiểu dài hết bề ngang.
- Không tự đặt thêm chú thích vào tên cột Excel: cột E là **Loại VB** theo file nguồn hiện tại. Giữ logic giá trị HC/QPPL/BC, migration cấu hình nhãn cũ hẹp và giữ nhãn người dùng sửa.
- Một `ColumnFilterCell` chung: placeholder select `Chọn để lọc` mờ như input, Esc khi đang focus và có giá trị phải xóa lọc của cột đó; ngăn Esc không cần thiết khi bộ lọc trống.
- Chỉ tô viền/màu nhẹ các thành phần nhập/chọn thực của ô được cấp quyền, tránh tô cả ô hoặc làm mất màu ngữ nghĩa; không làm giả quyền edit. Duy trì popup và danh sách đồng nhất.

## Chế độ gộp cột chỉ để trình bày — 21/10/2026 / PR #8

- Chỉ thực hiện projection trong `ItemList` qua `compact-columns.ts` và localStorage độc lập, 4 cờ mặc định false. Không được sửa `EXCEL_SOURCE_COLUMNS` hoặc Firebase `ItemLayout`, và không được cộng các giá trị gộp rồi ghi Excel.
- Mỗi nguồn trong ô gộp giữ quyền theo khóa gốc, giá trị đầy đủ, editor và lịch sử độc lập. Bộ lọc trên cột gộp dùng cả hai chuỗi gốc; tên chuyên viên rút gọn **chỉ hiển thị**, search/select/sửa tiếp tục dùng tên đầy đủ. Tắt tùy chọn hoặc bật Hiện đủ cột Excel phải khôi phục các cột chuẩn.
- Chế độ chỉnh schema của admin và popup vẫn dùng layout nguyên gốc và cấu hình riêng; không ép chế độ gộp vào popup. Khi thay đổi phải chạy TypeScript, unit, Firebase emulator, Chrome với kịch bản bật/tắt/gõ họ tên và quyền đọc.
- Không gộp mặc định các bước nghiệp vụ tiến độ vì có nguy cơ mất ngữ cảnh; không thêm listeners tooltip mới. Đường kẻ dọc dịu `#dfe9e2`, giữ cả hàng tiêu đề, lọc và nội dung.

## Quy tắc giao diện 22/10/2026 — PR #9

- Hiển thị gọn có **5** lựa chọn cá nhân, `shortLeaders` độc lập với `leadersTogether` và `shortSpecialist`. Mọi dropdown, search, save giữ tên nguồn; tên ngắn chỉ để hiển thị. Thao tác vẫn dựa trên quyền từng trường, tránh sinh quyền chung khi gộp.
- `progress-visual.ts` là phân loại màu UI duy nhất cho trạng thái này, không sửa báo cáo/KPI, và không suy các trạng thái `Đã trình HĐND` thành hoàn thành. Bảng chính và popup dùng cùng helper.
- Header chính/popup nhạt nhẹ (`#edf4ef`), filter row `#f9fcfa`, placeholder control 13px. Test Chrome phải xác nhận hoạt động trên dữ liệu mô phỏng và unit kiểm chặt các trạng thái loại trừ.

## Quy tắc 22/10/2026 — tránh mất UI khi poll và sai màu báo cáo (PR #10)

- Không để `useWorkspace.refresh` làm dependency khởi tạo/reset của `useWorkspace`; thay đổi hàm gọi poll KHÔNG đồng nghĩa đổi nguồn. Đọc nền 60s không `setBusy`, không reset/replace items nếu JSON nguồn giống bản đã xác nhận. Bản đọc chỉ commit khi hoàn chỉnh và nguồn vẫn đúng; nháp được ưu tiên. Timer/subscribe không chạy lại chỉ vì mảng rows đổi.
- Giữ cache `useSharedConfig` đang có nếu read mới giống hệt hoặc tạm lỗi. Không hiển thị placeholder cho trường hợp common đã có config hợp lệ; lần khởi động chưa có layout vẫn chờ để đảm bảo an toàn quyền.
- Palette Bảng tổng hợp là chuẩn: source đỏ hồng `#FFE0E4`, office vàng cam `#FFE8B8`, completed xanh `#D5F0DE`. Bảng chính/popup dùng nguồn/VP y như vậy, riêng completed **xanh đậm** `#126442` + trắng để không lẫn màu nền ô input. Chỉ các giá trị đúng theo `progress-visual.ts` được tô; terminal equivalents chỉ trong cột tương ứng; không tô các bước giữa và không sửa dữ liệu/KPI.
- Header `#f6f9f7`, filter `#fbfdfc`, font 15px. Regression test bắt buộc kiểm run 60 giây không thay nội dung, run có dữ liệu đổi và lần đầu thiếu layout; test Chrome đo màu/font.

## Điều chỉnh tương phản thứ bậc — 22/10/2026

- Giữ màu nền hoàn thành của Bảng tổng hợp (`#D5F0DE`), nhãn chữ tại Danh sách/popup dùng xanh dịu `#2B7450` (weight 650, vẫn >=4,5:1). Chấm trạng thái giữ xanh sẫm để dễ nhận; không đổi report stage palette.
- **Các ô có thể sửa nhưng không phải trạng thái cần chú ý** dùng bộ màu slate-blue nhạt `#F2F6F9`/`#426274`/`#B7CBD6` (nền/chữ/viền), không được tô cả `td` hay tự bật quyền; hover/focus chỉ đổi affordance của nút/input. Ô không sửa được là plain text. Không biến trạng thái trung gian thành cờ hoàn thành.
- Mọi chỉnh màu áp dụng đồng nhất Bảng dữ liệu và popup, kiểm CSS/Chrome, ưu tiên trạng thái nghiệp vụ so với trường sửa thường; không được làm hồi quy poll 60s, phân quyền hay highlight theo từ khóa.

## Đồng nhất xanh hoàn thành — 22/10/2026, PR #11

- Không dùng màu đặc `#126442` chữ trắng cho nhãn completion trong Danh sách/popup nữa. Dùng chính xác màu hoàn thành của Bảng tổng hợp `#D5F0DE` / `#125B35` / `#91CFA8` (nền/chữ/viền), chấm màu chữ; giữ các tone khác và mapping `progressTone`. Sửa test CSS & Chrome cùng một lúc, không đụng sync 60 giây hay dữ liệu Excel.
