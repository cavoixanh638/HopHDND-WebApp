# Theme1 — BẢN GỐC MÀU SẮC VÀ GIAO DIỆN HOPHDND

**Trạng thái:** ĐÃ CHỐT, KHÔNG ĐỔI MÀU / KHÔNG ĐỔI CHỨC NĂNG  
**Ngày đóng mốc:** 24/10/2026, trước khi bắt đầu thử theme mới Imperial Sky.  
**Tên chính thức:** `Theme1` (không đồng nghĩa với “màu mặc định” nếu người dùng đã đổi màu riêng trên trình duyệt).

## 1. Các bằng chứng có thể khôi phục chính xác

| Bằng chứng | Giá trị |
|---|---|
| Commit mã nguồn trước khi đổi theme | `74d8a32e1dbc1d4ad9ad87e0a949924c6cbdec31` |
| **Commit chốt Theme1, KHÔNG đổi byte nào trong Git tree** | `c52f162e42b5ad6893c043d8b84b7914fe247b16` |
| Git tree giống hệt bản đang chạy | `1029ee15336a15a42a9f1b1b2ca8fefd387ba63a` |
| Nhánh lưu riêng | `snapshot/Theme1-before-ImperialSky-2026-10-24` |
| Commit Pages đóng mốc | `69b550521b1368d2811afb3255ca299042cb6aac` |
| CSS thực tế root `index.html` sử dụng | `assets/style-CLU1LTUA.css` |
| JS thực tế root `index.html` sử dụng | `assets/pages-D5qZVENf.js` |
| Dữ liệu Excel/Firebase/quyền | Không sửa |
| Bằng chứng tự động có thể kiểm kê | [`Theme1-MANIFEST.json`](Theme1-MANIFEST.json) |
| Mọi dòng khai báo màu trong mã nguồn | [`Theme1-COLOR-SOURCE-INVENTORY.md`](Theme1-COLOR-SOURCE-INVENTORY.md) |

**Cách mở mốc chuẩn**: [snapshot Theme1 trên GitHub](https://github.com/cavoixanh638/HopHDND-WebApp/tree/snapshot/Theme1-before-ImperialSky-2026-10-24), [commit Theme1](https://github.com/cavoixanh638/HopHDND-WebApp/commit/c52f162e42b5ad6893c043d8b84b7914fe247b16). Đây là toàn bộ repository tại đúng thời điểm, không chỉ bản sao từng mã màu.

## 2. Màu hai tab chính — CSS hiện tại, không phải Imperial Sky

Lưu ý: các tệp CSS chứa nhiều bản phối thử nghiệm trước đây. **Bản hiển thị cuối cùng phải theo cascade của file tại đúng commit, không lấy nhầm một khai báo sớm.** Kiểm thử trình duyệt gần nhất đã xác nhận hai tab cố định và cân lề.

| Thuộc tính | Theme1 |
|---|---|
| Nền tab active | `#E3F2EA` |
| Chữ tab active | `#24745B` |
| Viền tab active | `#15805F` |
| Viền ngoài / shadow active | `0 0 0 2px #A7D3BE, 0 5px 16px rgba(18,91,68,.20)` |
| Nền tab inactive | `#F8FAFB` |
| Chữ tab inactive | `#3D728A` |
| Viền inactive | `#D4E0E2` |
| Shadow inactive | `0 2px 6px rgba(20,69,76,.09)` |
| Hover (cả hai) | nhấc `translateY(-2px)`, viền `#62A7CF`, shadow `0 7px 13px rgba(41,89,112,.20), 0 0 0 2px #DDF3FD` |
| Focus keyboard | `outline:3px solid #166B50; outline-offset:3px` (kiểm tra cascade nếu có override) |
| Biểu tượng | nền & viền trong suốt, màu kế thừa chữ |
| Chữ “Đang xem” | kế thừa màu chữ tab, nhãn trong suốt; inactive dùng `visibility:hidden` nhưng vẫn chiếm chỗ |
| Vị trí nhãn | khoảng giữ riêng `62px`, căn phải `justify-content:flex-end`, `margin-left:auto`; Chrome xác nhận cách mép phải **14px** |
| Kích thước | nav tối đa `850px`, 2 cột đều; kiểm thử Chrome desktop mỗi tab **421×50px** |
| Tiêu đề | `16px`, `font-weight:750`, **một dòng** (`white-space:nowrap`) |
| Điện thoại | dưới 760px xếp 2 hàng; dưới 440px chữ về 14px, icon thu lại |
| Động tác click | chuyển trạng thái mà cả hai khung không thay đổi kích thước |
| Bảo vệ reduced motion / print | theo đúng CSS trong bản snapshot |

**Không dùng nhầm phối xanh navy/sapphire/arctic/Imperial Sky** vào Theme1: tất cả những màu trên mới chỉ là đề xuất cho phiên bản tương lai.

## 3. Màu nền và chữ gốc của ứng dụng

Từ `:root` trong `source/src/styles/app.css`:

| Token / thành phần | Giá trị |
|---|---|
| `--green` | `#154D44` |
| `--ink` | `#20332E` |
| `--muted` | `#687A73` |
| `--line` | `#DCE3DE` |
| `--surface` | `#FFFFFF` |
| `--soft` | `#E5EFEB` |
| `--danger` | `#A53C35` |
| `--shadow` | `0 10px 32px #15302717` |
| Nền ứng dụng | `#F5F6F2` |
| Chữ gốc | `#20332E` |
| Font fallback | `"Segoe UI", system-ui, -apple-system, sans-serif` |

Các màu chi tiết của header bảng, ô nhập, quản trị, tooltip, popover, liên kết, hover, viền, bóng, báo cáo và popup **được giữ nguyên từng dòng** trong bản inventory (không rút gọn thành các token trên).

## 4. Màu trạng thái nghiệp vụ — mặc định mã nguồn

`source/src/data/status-palettes.ts`, `defaultStatusPalette()`:

| Trạng thái | Chữ | Nền |
|---|---|---|
| Sở chưa trình | `#D00025` | `#FFE0E4` |
| VP đang thực hiện | `#B04700` | `#FFE8B8` |
| Hoàn thành / tương đương | `#007A18` | `#D5F0DE` |
| Trạng thái khác | `#426274` | `#F2F6F9` |

Mặc định **`otherEnabled:false`**, tức nhóm “Khác” chỉ tô nền/chữ nếu người dùng bật. Mỗi trạng thái có token runtime `--hdnd-status-<group>-text` / `--hdnd-status-<group>-bg` (cụ thể trong manifest và `statusPaletteCssVariables()`). Màu người dùng tùy chỉnh sẽ **ghi đè** các giá trị mặc định này tại thời điểm chạy.

## 5. Tất cả hệ thống màu/preset có sẵn ở Theme1

1. **StatusPaletteStore V1**: 4 nhóm trạng thái; mỗi nhóm màu chữ/màu nền; bật/tắt nhóm Khác; tối đa 20 bộ màu đặt tên; lưu `active`, `activePresetId`, `presets[]`. **Lưu riêng theo nguồn trên localStorage**, khóa tiền tố `hdnd.status-palettes.v1:`. Nút trở về mặc định là `defaultStatusPalette()`, không phải snapshot toàn bộ màu người dùng.
2. **Màu riêng từng ô theo từ khóa** (`ItemLayout.cellHighlights[]`): `field`, `word`, `textColor`, `backgroundColor`, tối đa 30 quy tắc. Có thể nằm trong cấu hình bố cục dùng chung, vì vậy **không được ghi đè Firebase/Sheets** khi đổi theme tab.
3. **Màu nhấn loại văn bản và mã nghiệp vụ** (HC, QPPL, Báo cáo...), màu chữ theo phân loại/trạng thái: các selector và giá trị nằm nguyên ở `app.css`, `item-frame.css` và mã xử lý. Không gom nhầm với màu active tab.
4. **Tô màu điều kiện theo danh sách** `ColorRule` với 4 lớp `mint`, `amber`, `rose`, `blue`; `list-views.ts` gồm quy tắc màu và preset chế độ xem.
5. **Popup báo cáo**: `report-detail-presets.ts` lưu riêng `colors[]` cùng preset/filter; các màu nền, header và hover ở `app.css` / `item-frame.css`.
6. **Bảng tổng hợp**: `report-preferences.ts` hỗ trợ 5 phương pháp tô màu `classic`, `signal`, `compact`, `bars`, `band`; mặc định `classic`. `titleAccentColor` nếu đi kèm một chuỗi nhấn nhãn tùy chỉnh, mặc định màu đỏ `#B42318`. Các màu từng loại bảng và trạng thái lưu đầy đủ trong CSS.
7. **Hiệu ứng có thể bấm**: Bảng tổng hợp nổi **cả ô số** `-2px` với shadow xanh nhạt, ô không bấm không nổi; Danh sách chi tiết/popup chỉ nổi **nội dung**. Hover không làm đổi màu chữ dữ liệu. Tô vàng tìm kiếm `#FFE18B`, không sửa chuỗi gốc.
8. **Các preset bố cục và font** có thể ảnh hưởng nhận diện thị giác nhưng không trực tiếp đổi màu: `item-preferences.ts`, `report-preferences.ts`, `report-detail-preferences.ts`; giữ nguyên ở commit Theme1.

## 6. Giới hạn quan trọng: cài đặt màu cá nhân đang dùng

Tại thời điểm đóng mốc, tôi **đã sao lưu chính xác toàn bộ màu và mã nguồn được Git theo dõi**, nhưng **chưa đọc/không xuất** những giá trị mà trình duyệt của bạn lưu trong `localStorage`, cũng không chụp trực tiếp cấu hình màu có thể đang được lưu trong Firebase/Sheets dùng chung.

Do đó:
- **Theme1 đã chốt** là *trạng thái mã nguồn, màu mặc định, cơ chế preset và bản build được phát hành*.
- **Theme1 không được tuyên bố là bản sao chính xác mọi preset tùy chỉnh cá nhân trên máy của bạn**. Muốn lưu cả các preset cá nhân, cần xuất chúng ngay trên trình duyệt đang sử dụng, không tự ý ghi đè hay đọc thông tin người khác.
- Tạo/chọn theme điều hướng mới **không được làm mất, reset hoặc overwrite** StatusPaletteStore, ColorRule, ItemLayout hay các cấu hình dùng chung.
- Xem `Theme1-MANIFEST.json` để biết danh sách tệp, Git blob SHA và namespace lưu màu.

## 7. Cách phục hồi Theme1 an toàn

**Nếu sau này chỉ muốn trở lại màu của Theme1:** mở PR mới, chọn từng phần CSS/token màu liên quan từ nhánh snapshot `snapshot/Theme1-before-ImperialSky-2026-10-24` và đưa về `main` **mà không reset toàn bộ repository**, không chạm dữ liệu hay lịch sử chỉnh sửa. CI TypeScript/unit/Firebase/Chrome PASS trước khi phát hành.

**Nếu thật sự muốn phục hồi toàn bộ ứng dụng y nguyên ngày đóng mốc:** dùng commit `c52f162e42b5ad6893c043d8b84b7914fe247b16` trong nhánh snapshot và một PR/cutover được duyệt riêng; thao tác này có thể làm mất chức năng mới phát triển sau đó, **không tự làm chỉ vì yêu cầu đổi màu**.

Kiểm tra trước/sau:
- `git diff c52f162e42b5ad6893c043d8b84b7914fe247b16 -- source/src/styles/app.css source/src/features/items/item-frame.css source/src/features/items/cell-picker.css source/src/data/status-palettes.ts`
- Các blob gốc và root build `index.html` đã có trong `Theme1-MANIFEST.json`.
- Sau khi restore, kiểm tra kỹ bảng trạng thái, quyền, tab fixed-size, hover, popup và highlight.

## 8. Quy tắc đặt phiên bản từ đây

- **Theme1:** bản gốc được bảo tồn tại SHA trên; không cập nhật/đẩy commit mới vào nhánh snapshot.
- **Theme2 / Theme7-ImperialSky:** chỉ khởi tạo từ `main` sau này theo yêu cầu và ghi riêng màu + lịch sử; không sửa bản gốc Theme1.
- Mọi phương án mới phải có **mã màu thực tế**, **phạm vi tác động**, **bằng chứng test và cách quay về Theme1**.

Các tệp tài liệu trong thư mục này là tài liệu lưu mốc, không phải CSS được tải trực tiếp bởi trình duyệt.
