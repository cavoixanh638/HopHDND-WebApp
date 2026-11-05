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
