# UI checkpoint — picker và L03 (05/11/2026)

**Owner**: UI worker, nhánh `ui/20261105-picker-layout`. **Trạng thái**: IN_PROGRESS (khảo sát). Baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`.

## Khảo sát đầu nhánh
- Remote HEAD trước sửa `aa135cfb07fbc29fe642da8710bfb11d61941927` (chỉ thêm tài liệu, ahead baseline 2 commits); `CompactGroupedValue.tsx` blob `381797b0c98e53cf5215ebac566f0b9449c401dd`; `item-frame.css` blob `c023f96a5693007050ef4b7c27b0b42d4151fe6e`. Không có checkout cục bộ ban đầu; GitHub API không thể báo dirty tree ngoài Git, các thay đổi commit sẽ kiểm trực tiếp trên remote.
- `CellPicker.tsx` (blob `ae627581fd10a7c84b3d120be713cd9754e23886`) đã chung điều khiển pointer/keyboard/Escape và popup list. CSS scoped L01/L03 (đoạn REV2 cuối file) đang đặt skin riêng, cần thống nhất với mẫu UBND.
- L03 đang dùng `minmax(186px,1fr)` ở cả 2/3 mode, readonly giãn track tràn theo cột. Nhãn và trạng thái có padding + bố cục khác nhau, dẫn tới lệch baseline. Grid subgrid dùng chung trục là đúng hướng; thay bằng track compact, align center kể cả khi wrap.
- `partyLevel` contract mới là `Không / TTTU / BTV / BCH`; baseline domain vẫn chứa alias `BTV TU` / `Không phải trình` và sẽ được DATA worker đổi. UI chỉ trình bày và khóa affordance Thành ủy khi cấp `Không`, không sửa domain.
- `Ghi chú` (`note`) là ô nguồn riêng do `ItemList.tsx` dựng, KHÔNG thuộc markup `CompactGroupedValue`. Contract gửi REF / commander: thêm `data-ui-reference-part="note"` trên wrapper riêng của field note ở list và popup; owner UI không ghi `ItemList.tsx`.

## Tiếp theo
1. Chuẩn hóa subfield attributes L01/L03, skin picker chung và CSS grid compact; giữ event/lease của `CellPicker`.
2. Thêm browser fixture / rect assertions và test source contract trong file test riêng.
3. Check code SHA, local evidence; ghi rõ NOT RUN nếu không thể dựng Chrome real App; không giả CI. Không merge/deploy/ghi Firebase.

## Mốc code có ý nghĩa
- **Code SHA**: [`2a7fe5da3fc19e7b2233e550c2c474f55183a670`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/2a7fe5da3fc19e7b2233e550c2c474f55183a670). Chỉ 2 file owner: `CompactGroupedValue.tsx`, `item-frame.css`. Không sửa `ItemList.tsx`, domain, width, registry.
- L03 mới: 2 track readonly (`138px 238px`), 3 track khi cấp trình editable (`138px 90px 238px`), `subgrid` trục cố định, chứa overflow trong cụm. Không dùng `1fr` trong block mới. Tất cả các status picker chung chiều ngang; level 90px dành 5 ký tự + caret. CSS được đặt sau các rule cũ để override trong list/popup.
- Một skin `data-ui-picker-skin="standard"` cho Sở, Loại VB, level, ba tiến độ, lãnh đạo UBND/VP (chung chính `CellPicker` gốc); color tokens cho type/progress được giữ. Readonly chỉ là plain text.
- UI projection khi level `Không`/legacy alias: trạng thái Thành ủy hiển thị `Không phải trình`, không render `CellPicker` của trạng thái dù riêng status được cấp quyền. Level editable vẫn là picker để đổi cấp; level readonly `Không` không xuất hiện ở nhãn. Readonly `BTV TU` được hiển thị `BTV`; DATA owns canonical catalog/transaction.
- **Selector contract REF**: `data-ui-reference-group="L01"` chứa `data-ui-reference-part="content"`, `"department"`, `"type"`; `data-ui-reference-group="L03"` chứa `"partyLevel"`, `"progressParty"`, `"progressBuild"`, `"progressCouncil"`. Khi level `Không` readonly, `"partyLevel"` đặt trên nhãn Thành ủy, không dựng picker. Áp dụng trong cả list/popup vì chung renderer. `note` và `specificProgress` ở ô riêng: REF/commander phải gắn marker ở `ItemList.tsx` và renderer popup tương ứng; ngoài phạm vi worker này.

### Kiểm thử / gỡ chặn
- Chưa có bản checkout repo qua mạng trong môi trường container (`git ls-remote` không phân giải được github.com), nên **typecheck/unit/build/Chrome App thật: NOT RUN** tại thời điểm commit code; không coi baseline CI PASS là delta PASS. Sẽ thêm test source và browser script để chạy được trong CI/check-out của commander.
- Chờ DATA worker cập nhật danh mục cấp trình chính thức, tránh dùng tình trạng baseline `BTV TU`/`Không phải trình` làm bằng chứng transaction.

## Handoff UI — code + test đã push (05/11/2026)

**Trạng thái: IN_PROGRESS — code đã push, nghiệm thu browser/CI còn NOT RUN.**

- **Code SHA cần cherry-pick**: `2a7fe5da3fc19e7b2233e550c2c474f55183a670` ([commit](https://github.com/cavoixanh638/HopHDND-WebApp/commit/2a7fe5da3fc19e7b2233e550c2c474f55183a670)).
- **Unit-test SHA mới nhất**: `a1408d79779c4402306575e9df38d885bcbc1ef8` ([commit](https://github.com/cavoixanh638/HopHDND-WebApp/commit/a1408d79779c4402306575e9df38d885bcbc1ef8)) (trước đó tạo file tại `c657e4cb`).
- **Browser-test SHA**: `5cf172171229d2b77928fb27c37db58ff3b9e1b2` ([commit](https://github.com/cavoixanh638/HopHDND-WebApp/commit/5cf172171229d2b77928fb27c37db58ff3b9e1b2)).
- Test unit: `source/src/features/items/CompactGroupedValue.ui-20261105.test.tsx` (7 test cases: L03 2/3 mode, `Không` khóa status, legacy label, marker L01/L03, CSS compact).
- Test Chrome: `source/scripts/ui-20261105-picker-layout-browser.mjs`. Chạy **tại checkout có dependencies**: `cd source && npm ci && npm run typecheck && npm test -- --run && npm run build:compact:qa && node scripts/ui-20261105-picker-layout-browser.mjs`. Script chỉ mở bản dựng **synthetic compact-qa**, không có Firebase; screenshots 1440/900/390 của 2/3 mode và popup 1440, `rects.json` vào thư mục `source/ui-20261105-artifacts` (chưa được tạo bởi run thật). **Không coi compact-qa là thay thế full App + Emulator**.
- **Static source checks, remote exact blobs**: **PASS 9/9** trên `2a7fe5da` + test `5cf17217`: selector hai mode; nonrequired lock; L01/L03 reference; 2/3 compact tracks không chứa `1fr` trong CSS mới; màu status; tồn tại unit và browser test. Đây chỉ là kiểm tra source/string, **không phải typecheck hay tương tác thực**.
- **Typecheck**: NOT RUN. **Unit/Vitest**: NOT RUN. **Build**: NOT RUN. **Chromium pointer, keyboard, Escape**: NOT RUN. **Chrome list/popup 1440/900/390**: NOT RUN. **Screenshot/rect files**: NOT CREATED. **CI workflow/artifact đúng SHA**: NOT RUN (API liệt kê nhánh không có workflow run, combined status rỗng). **Firebase Emulator**: NOT RUN (UI worker không sửa server). Không có bằng chứng QA để ghi DONE.
- **Lý do chặn**: container không phân giải được `github.com` khi `git ls-remote`; không có checkout mã nguồn/npm deps, nên không thể build Chrome real App tại đây. GitHub connector đọc/ghi repository bình thường và đã push code/test/checkpoint.
- **REF contract cần phối hợp**: `data-ui-reference-group=L01/L03` và `data-ui-reference-part=content,department,type,partyLevel,progressParty,progressBuild,progressCouncil` trong chung list/popup; `note` và `specificProgress` là nguồn độc lập, commander hoặc owner tương ứng gắn marker trên wrapper `ItemList.tsx` + popup renderer. Nếu REF quyết định mã instance theo recordId, lấy record từ `td[data-col-key]` / `tr`; UI worker không thêm mã giả.
- **DATA handoff**: khi `partyLevel=Không`, UI chỉ chiếu tiến độ Thành ủy `Không phải trình` và bỏ nút chọn ở trạng thái; DATA/commander vẫn phải thực hiện transaction phụ thuộc thực, cập nhật alias/menu và `App.tsx` đúng quyền. Không áp quyền trực tiếp qua CSS.
- **WIDTH handoff**: toàn cụm nhận cột vật lý từ `ItemList`; nội bộ cố định `138px + 90px + 238px` (editable) hoặc `138px + 238px` (readonly), mỗi gap 8px; không có resize track. WIDTH quản lý lưu hai giá trị, auto-fit, quyền hỗn hợp.
- **Bằng chứng cần làm tiếp**: chạy test trên code SHA (sau tích hợp cần SHA mới); kiểm pointer thật/mixed permissions/long status và popup editable; chụp rects/screenshots; nếu phát hiện fail, sửa trên nhánh UI trước khi cherry-pick. Không merge/deploy/Firebase thật.
