# Kiểm thử A/B hiệu năng tooltip báo cáo — 19/10/2026

## Phạm vi, cách đo và giới hạn

- Repository: `cavoixanh638/HopHDND-WebApp`, nhánh tính năng PR #3. Bằng chứng gốc: [GitHub Actions #39242280607](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39242280607), mã thử `f228257792974f8cd245167aff2cab4bda07a40f`. Dòng log `HOVER_AB_METRICS` được ghi thành công; **toàn workflow thất bại sau phép đo** do race xóa thư mục Chrome `ENOTEMPTY`. Không được gọi run này PASS. Lỗi cleanup đã được khắc phục trong script CI sau đó.
- Chrome headless trên GitHub-hosted Ubuntu, dữ liệu Google Sheets **giả lập**, không truy cập Firebase production. Sao chép tạm 16 dòng trong `tbody` mỗi 5 báo cáo rồi khôi phục trước kiểm thử kết thúc: 80 dòng nhân bản, 1.746 phần tử ở setup, Chrome `Performance.getMetrics` báo `Nodes=7.976` trong khi đo (đếm tổng object node khác với `querySelectorAll('*')`). Mô phỏng stress DOM, **không phải số lượng hồ sơ thực**.
- CDP `Input.dispatchMouseEvent` di chuyển chuột thật giữa 2 ô trong bảng, chờ `requestAnimationFrame` sau mỗi lượt; **36 lượt mỗi chế độ, hai vòng đối xứng về thứ tự chạy** để giảm warmup bias. `Performance.getMetrics` lấy delta `RecalcStyleDuration`, `LayoutDuration`, `ScriptDuration` và `TaskDuration` (đều đổi giây sang mili giây). Số dưới đây là thời gian CPU **tích lũy cho 36 lượt** và trung bình của 2 vòng, **không phải** input-to-photon latency, INP/P95 frame-time, hay phép đo trên máy người dùng.
- A/B can thiệp tạm thời ngay trong Chrome: tắt rule `body:has(...:hover)` và/hoặc CSS `anchor-name`, hoặc dùng một tooltip cố định không đổi chữ, event delegation bật/tắt; chế độ `follow` chỉ cập nhật `transform: translate3d` khi vào ô mới. Không sửa nguồn nghiệp vụ.
- Một run, hai vòng là **bằng chứng có ích nhưng chưa đủ độ tin cậy thống kê**; không khẳng định phần trăm cải thiện này áp dụng trên Windows/hardware/GPU hoặc dữ liệu thật.

## Kết quả thực đo (ms tích lũy / 36 lượt)

| Chế độ | Style vòng 1 / 2 | Layout vòng 1 / 2 | Script vòng 1 / 2 | Task vòng 1 / 2 | Trung bình Task |
| --- | ---: | ---: | ---: | ---: | ---: |
| CSS native `body:has` + anchor (baseline) | 10,75 / 10,64 | 32,48 / 31,35 | 0,45 / 0,43 | 181,14 / 171,92 | **176,53** |
| Bỏ global `body:has` | 2,36 / 2,62 | 0 / 0 | 0,44 / 0,43 | 99,14 / 104,30 | **101,72** |
| Tắt tooltip/anchor | 2,55 / 2,35 | 0 / 0 | 0,47 / 0,40 | 98,65 / 100,27 | **99,46** |
| Tooltip chung vị trí tuyệt đối cố định + event delegation | 2,45 / 3,02 | 0 / 0 | 0,92 / 1,64 | 102,05 / 127,00 | **114,53** |
| Tooltip chung đi theo **ô**, cập nhật một lần khi pointer enters | 4,90 / 4,88 | 0 / 0 | 1,51 / 1,42 | 108,56 / 110,82 | **109,69** |

- `follow` giảm khoảng **37,9%** TaskDuration so với baseline trong cùng phép đo, `RecalcStyleDuration` giảm khoảng **54,3%**, `LayoutDuration` từ trung bình **31,92 ms về 0 ms**. Đây là *so sánh phép thử* chứ không phải lời hứa cải thiện tốc độ trải nghiệm tương đương.
- `no_has` và `no_tooltip` gần sát nhau là bằng chứng mạnh trong phép thử rằng **global `:has` / CSS Anchor Positioning** đang gây chi phí layout đáng kể; không phải tải Excel hay độ chậm callback.
- `static` thắng `follow` về StyleDuration nhưng TaskDuration lại **cao hơn** trong mẫu nhỏ này (114,53 so với 109,69 ms). Về UX, đặt tooltip cạnh ô giúp dễ xác định đối tượng hơn một hộp cố định tại góc màn hình; chọn `follow` để vừa giảm độ trễ vừa giữ thiết kế được yêu cầu.

## Giải pháp triển khai từ phép đo

1. Giữ **một** tooltip text cố định `Click để xem chi tiết`, cỡ 190×32 px, không `title` native, không icon cạnh số. Không gắn pointer handler vào từng cell; lắng nghe `pointerover/out` *một lần* bằng event delegation.
2. Bỏ hoàn toàn bộ chọn `body:has(.report-surface ... :hover)`, `anchor-name`, `position-anchor` trên đường hover. Chỉ cập nhật GPU-compositor-friendly `transform` khi **đổi sang một ô mới**, thay vì theo từng `pointermove`. Không đọc layout hoặc thay text/ARIA ở mouse path; focus bằng bàn phím giữ mô tả ARIA riêng.
3. Giữ nguyên đánh dấu `report-clickable-cell`, button native phủ toàn diện tích, click tổng và mở modal, màu trạng thái và tương tác in. `tr:hover` tô cả dòng report đã bỏ từ bản trước.
4. Kiểm chứng bằng Chrome smoke, 300 pointer events không đọc layout và CDP click vật lý vào mép/góc. Sau khi có nguồn thực, đo thêm Chrome DevTools Performance trên Windows: P50/P95 frame time, Style/Layout/Paint và cảm nhận khi quét nhanh.

## Bổ sung nghiệm thu 19/10 — nền/viền hover rõ nét ở đúng ô

Người dùng chọn giữ singleton tooltip (phương án `follow` đã đo tốt hơn CSS Anchor) và **đánh dấu rõ ô đang rê chuột**, không mở rộng highlight toàn hàng. Thực hiện sau khi [CSS `b22b877c8f81d840059abd738dde5d7c9a24d0a9`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/b22b877c8f81d840059abd738dde5d7c9a24d0a9) và [test `cb4c276b2f649a178993ab0bb3abd192f4faca83`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/cb4c276b2f649a178993ab0bb3abd192f4faca83):

- Cũ: chỉ nền `rgba(73,124,98,.035)`. Mới: nền `rgba(9,106,113,.14)`, `outline:2px solid #08777B;outline-offset:-2px`, `focus-visible` viền 3px `#07595B`. CSS chỉ áp dụng cho **button của ô số dương** đang `:hover`; không thêm DOM, JavaScript, border làm thay đổi box, transition hay box shadow, vẫn giữ semantic palette.
- Run [Verify #39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414) **SUCCESS**, nguồn kiểm `cb4c276b2f649a178993ab0bb3abd192f4faca83`, Chrome `CELL_HOVER_VISUAL_PASS` = `outline:rgb(8,119,123) solid 2px`, fill `rgba(9,106,113,.14)`, `oneCell:true`, `onlyOne:true`; `DELEGATED_TOOLTIP_STRESS`: 300 lượt, 0 read geometry; 352 unit PASS, 20 Firebase emulator PASS.
- Chrome A/B **2 vòng × 36 lần** di chuyển chuột thật với thứ tự đảo chiều, hai lượt dùng cùng app/browser; `Performance.getMetrics` đo tổng thời gian xử lý **không phải cảm giác nhìn thấy tooltip**:

| Phương án | RecalcStyle vòng 1/2 (ms) | Layout vòng 1/2 (ms) | Script vòng 1/2 (ms) | Task vòng 1/2 (ms) | Task TB mỗi 36 lượt |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cũ (nền .035, không viền) | 9,43 / 8,05 | 0 / 0 | 2,45 / 2,17 | 86,22 / 79,30 | **82,76 ms** |
| Mới (nền .14, viền 2px) | 8,39 / 8,24 | 0 / 0 | 2,32 / 2,32 | 85,18 / 82,55 | **83,87 ms** |

**Chênh 1,11 ms tích lũy/36 lượt** rất nhỏ; không khẳng định cải thiện hay suy giảm tốc độ trên máy thật. **Cả hai Layout 0ms** trong runner. Nghiệm thu Chrome thật với dữ liệu hiện hành vẫn phải đo Paint, khung hình bị mất (P95) và cảm nhận trực quan. Nếu thấy lag trở lại, chạy lại A/B và kiểm tra không có `body:has()`, CSS Anchor, hover cả hàng hoặc thay đổi size ô.

**Preview đã publish:** [preview/clear-cell-hover-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/), [Publisher #39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) **PASS**, [Pages deploy #39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864) **SUCCESS**; artifact SHA256 `2d2f23ab40e21229556998de0bba0e649d15dd7e46a7ed77b370218463d21271`. **Không sửa `main:index.html`, nguồn Excel/Firebase, không merge PR #3.** Bằng chứng phát hành và rollback tham chiếu [VAN_HANH](VAN_HANH.md).

### Kiểm chứng lặp lại khi đã cập nhật tài liệu — không ngoại suy một lượt chạy

Trong [Verify #39251864679](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39251864679) tại commit tài liệu `951f98c84a00314f132b282dec5bf41a1db3dbc5`, chạy lại cùng browser smoke/A/B sau khi tài liệu thay đổi (không đổi code UI), có **Style old 5,69/6,49ms; new 6,80/6,72ms; Layout cả hai 0ms; Task old 57,71/64,45ms, new 71,52/71,18ms** cho hai vòng 36 lượt. Các trị tuyệt đối và chênh mới/cũ **dao động đáng kể so với lượt #39249428414**, có thể do runner và nhiễu; không dùng số đo hai vòng để chứng minh viền có cùng hiệu năng với nền cũ hay cam kết không tăng Task. **Kết luận chắc chắn ở mức thử hiện có**: viền không làm thay đổi hình học ô, không phát sinh Layout trong Chrome runner, không thêm pointer JS/DOM node; công đoạn paint/compositing và sự mượt thực tế trên Windows vẫn phải được nghiệm thu trên máy người dùng với trace, lặp nhiều lần và nhiều quy mô bảng. Do người dùng đã chọn kiểu viền rõ, tiếp tục giữ kiểu này cho preview nhưng không gọi hiệu năng sản xuất đã nghiệm thu.

## Nguồn tài liệu

- [Chrome: CSS selector performance](https://developer.chrome.com/docs/devtools/performance/selector-stats)
- [Chrome: Analyze rendering performance](https://developer.chrome.com/docs/devtools/rendering/performance)
- [MDN: :has() performance considerations](https://developer.mozilla.org/en-US/docs/Web/CSS/:has#performance_considerations)
