# Gemini TRACKS — 5 độ rộng cột nhỏ độc lập

Bạn là worker độc lập, nhánh **ui/20261106-l03-tracks**, baseline **8a201c1bf48c7916e4d0af9e1c0ca60cd6737632**. Đọc README.md và checkpoints/TRACKS.md trên chính nhánh này; kiểm HEAD/dirty tree, lưu checkpoint và bắt đầu ngay. Không đợi PICKER.

## Kết quả cần giao
Admin điều chỉnh **từng cột nhỏ** của Tiến độ 3 khâu, lưu 5 giá trị độc lập. Không còn hai input chỉnh độ rộng toàn cụm. Cụm/cột vật lý tự tính tổng, ba dòng tiến độ gióng thẳng và ba ô trạng thái bằng nhau.

## Model và contract cố định
Thêm cấu hình `partyTrackWidths` trong ItemLayout:
```ts
{
  readonly: { label: number, status: number },
  editable: { label: number, level: number, status: number }
}
```
Đơn vị px, box-sizing border-box cho rail. 5 giá trị độc lập, không đồng bộ ngầm giữa hai mode. Cột level chỉ có dropdown Thành ủy ở hàng đầu; hai hàng Xây dựng/Ban hành vẫn chừa cùng track này để trạng thái thẳng dọc.

Công thức mỗi mode: **tổng các rail + column-gap giữa rail + padding/border ngang thực của ô**. Không cộng tổng legacy rồi cộng các rail lần nữa. Bảng HTML có một cột vật lý chung: nếu có cả hai mode, dùng max(tổng mode 2, tổng mode 3); mỗi hàng bên trong giữ tổng riêng. Không thể hứa loại mọi khoảng trống của hàng hẹp khi cùng cột có hàng rộng.

## Thực hiện độc lập
1. Khảo sát mọi đường đọc/validate/save/merge/CAS của ItemLayout và nối đầy đủ cấu hình mới, giữ backward compatibility profile cũ chỉ có partyGroupWidths. Đặt policy chuyển đổi fallback **deterministic**, ghi công thức và test; chỉ đọc fallback trong RAM, không tự ghi/migrate config thật. Profile có cấu hình mới ưu tiên 5 trường; không để giá trị legacy âm thầm giành quyền sau reload.
2. Thay editor hiện tại bằng 2 nhóm dễ hiểu:
   - Chỉ xem cấp trình (2 cột): **Nhãn + cấp trình**, **Tiến độ**.
   - Được sửa cấp trình (3 cột): **Nhãn**, **Cấp trình TU**, **Tiến độ**.
   Hiện tổng cụm dạng kết quả tự tính, không cho nhập tổng thay các trường. Lưu 5 giá trị cùng một thao tác, lỗi chỉ đúng trường. Giữ quyền chỉ admin; khách đọc cấu hình đã xác nhận.
3. Không đặt lại mức tối thiểu toàn cụm 360/500px. Min từng rail chỉ theo khả năng sử dụng thật của nó (text có thể xuống dòng; level đủ Không/TTTU + caret nhỏ + padding). Không dùng min-width 138/238 cứng hoặc 1fr để ép cụm giãn theo viewport. Chọn min/max nhỏ hợp lý, đo và ghi rationale; cho phép gõ rộng hơn nếu người dùng muốn.
4. Sở hữu item-preferences.ts, item-layout-merge.ts, ItemList.tsx, admin-list-controls.css, helper và **file mới l03-track-widths.css**. Thay geometry bằng CSS custom properties ở td/tổ tiên, giữ DOM/data-level-layout hiện có. Không sửa item-frame.css, app.css, CellPicker.tsx hoặc CompactGroupedValue.tsx. Lưu ý thứ tự CSS/cascade; test phải đo computed widths thật.
5. Nối cấu hình 5 trường vào list và phần L03 trong popup, vẫn giữ cấu hình khung popup riêng. Đường App/shared-config/use-firebase/backend config validator/preview glue chỉ sửa nếu cần cho cấu hình width; không đổi business data/Rules về cấp trình hoặc quyền sửa. Cập nhật full synthetic preview để user thực sự thử 5 trường, không chỉ thêm UI vào fixture biệt lập.
6. PICKER baseline là dependency cố định đã có; không chờ skin/caret worker kia. Skin/control geometry internal không thuộc luồng này; test với baseline và mô tả contract tổng rail để commander xác minh khi tích hợp.

## Test và DONE
- Unit parse/validate từng trường, 5 giá trị bất đối xứng, legacy fallback/ưu tiên mới, roundtrip, merge thay đổi khác track/mode, conflict cùng field, rollback giữ nháp.
- Browser thật: nhập 5 số khác nhau, lưu/reload admin và khách, đổi quyền cấp trình để đổi mode; thay một field chỉ đổi đúng rail/mode. So measured rail/physical widths với công thức, không chỉ check input text.
- Kiểm cả list/popup, 1440/900/390, mode 2/3/mixed, thứ tự/ẩn cột, nội dung dài, giá trị nhỏ; không tràn/chồng/cắt chữ, ba status cùng kích thước và trục dọc, glyph giữa hàng, màu không đổi. Kiểm baseline hồi quy bị ảnh hưởng.
- Persistence/CAS/quyền phải có bằng chứng real App + Emulator khi cần; demo RAM không thay thế backend. Không production write/deploy.
- Sửa mọi lỗi trong phạm vi, đính kèm code/tested SHA, run/artifact/screenshot/rects, update checkpoints/TRACKS.md rồi DONE. Không chờ PICKER, không merge/deploy.
