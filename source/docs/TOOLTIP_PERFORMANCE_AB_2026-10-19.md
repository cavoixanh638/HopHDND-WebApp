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

## Nguồn tài liệu

- [Chrome: CSS selector performance](https://developer.chrome.com/docs/devtools/performance/selector-stats)
- [Chrome: Analyze rendering performance](https://developer.chrome.com/docs/devtools/rendering/performance)
- [MDN: :has() performance considerations](https://developer.mozilla.org/en-US/docs/Web/CSS/:has#performance_considerations)
