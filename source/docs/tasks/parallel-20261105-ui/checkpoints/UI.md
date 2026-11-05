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
