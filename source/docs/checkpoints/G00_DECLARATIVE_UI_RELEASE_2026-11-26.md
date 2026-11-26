# G00 — Tự động phát hành UI theo dữ liệu và ranh giới nội dung (26/11/2026)

## Nguyên nhân và quyết định

PR #242 đã PASS 10/10 workflow, gồm 1.175 unit và Chromium dấu cộng lệch 0px ở 3 viewport. Merge `d9e949ccf56e82ac74caaa4a95d147f60cff3ec3` vẫn HOLD do các tệp picker/save host, helper mới và import mới. Không whitelist nguyên tệp chứa quyền/lease/CAS và không sửa biến release để vượt cổng.

## Luồng sửa thường ngày

| Yêu cầu | Nơi sửa ưu tiên | Cổng |
| --- | --- | --- |
| Tên rút gọn đơn vị, tiêu đề menu, chữ tìm kiếm, biểu tượng + | [ui-presentation.json](../../src/presentation/ui-presentation.json) | Auto khi schema và CI đạt |
| Màu, căn giữa, kích cỡ, bố cục | CSS hiện hữu | Auto + QA |
| Đo độ rộng chữ, tính ranh giới ray L03 | list-nowrap-widths.ts, l03-width-geometry.ts | Auto nếu giữ ranh giới import/API |
| Search/filter/report trình bày đã rà soát | Module trình bày hiện hữu, chỉ import mới đúng helper hiển thị hoặc JSON đã duyệt | Auto + QA |
| Quyền, lease/CAS, auth, schema, dữ liệu, import nguồn, App core, callback lưu, module chưa nhận diện, chính sách/CI nhạy cảm | Tệp lõi | Owner approval exact SHA |

JSON chỉ nhận đúng schema v1, nhãn văn bản, alias department/room không trùng nguồn/nhãn, hình học path SVG và strokeWidth có giới hạn. Alias giữ nguyên raw value trong Item, chọn, filter chính xác, group, audit, nguồn. Không dùng JSON cho status, quyền hay action. Các import đặc biệt chỉ là đường dẫn và binding cố định đã duyệt. Tệp helper organisation-display và các host SavedLayoutMenu/CellPicker/L03InlineWidthControl vẫn guarded. Tách số học L03 khỏi host, giữ API export tương thích. Không thay hành vi lưu.

Kiểm tra từng commit chưa phát hành (immutable before/after), không chỉ diff cuối. JSON không hợp lệ hoặc chưa có baseline, import/API lạ hay thay lõi phải HOLD. Không dùng một thay đổi UI hợp lệ để che thay đổi nhạy cảm trước đó. Kiểm tra lexical/import không phải sandbox hay bằng chứng bảo mật tuyệt đối, nên phạm vi mới hữu hạn; chức năng thông thường mới mà chưa tách được khỏi core vẫn cần rà soát.

## Nghiệm thu

- Regression Node không phụ thuộc npm cho schema, alias/icon thay đổi hợp lệ, dữ liệu lỗi, import lạ, thay core/Rules/policy và Git history thực trong thư mục tạm.
- Giữ nguyên publisher, toàn bộ TypeScript, unit, Chrome, Emulator, Rules SHA và kiểm tra race trước push. Không thêm dependency hoặc vòng CI riêng.
- Migration chính sách **không tự phê duyệt**. Sau exact-head CI PASS và merge, chủ repository Run workflow main một lần cho cả #242 và migration, rồi kiểm tra publish/Pages/version.json. Không deploy Rules, không ghi Firebase sản xuất.
- Bằng chứng auto sau baseline: PR kế tiếp chỉ sửa JSON/CSS hợp lệ phải có `policy_mode=auto`, publish SUCCESS và version.json.source_sha đúng. Không báo đã có production auto thực tế chỉ từ test synthetic; cần đối chiếu lần phát hành thật.
- Rollback: revert migration qua PR và owner-dispatch, không restore dữ liệu.
