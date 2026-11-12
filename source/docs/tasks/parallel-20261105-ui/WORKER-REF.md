# Gemini REF — mã vùng và mã con

Nhánh `ui/20261105-ref-codes`, baseline `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Đọc [hợp đồng chung](README.md), checkpoint `checkpoints/REF.md`, HEAD/dirty tree trước khi sửa. Bạn là writer duy nhất của nhánh/checkpoint này. Bắt đầu song song các worker khác.

**Sở hữu:** `source/src/qa/ui-reference-codes.tsx`, `source/src/qa/ui-reference-codes.css` và test chuyên biệt của reference-code. Không sửa `CompactGroupedValue.tsx`, `ItemList.tsx`, `item-frame.css`, data/service. Nếu thiếu selector subfield, ghi contract `data-ui-reference-part` cụ thể trong checkpoint để UI worker/commander thêm; không tự ghi file họ.

1. Tái hiện bằng browser vì sao marker L03/L04 hiện dễ hiểu nhầm và Ghi chú thiếu marker. Giữ semantic L03/L04/L06 cố định khi kéo cột. Tạo registry mã top-level và mã con bao phủ mọi vùng/ô/control trong giao diện hiện tại, đặc biệt ô lớn, L01 metadata, ba nhánh L03, Ghi chú và popup. Mỗi vị trí copy ra mã đầy đủ phân biệt instance; không dùng index thay đổi theo sort/filter.
2. Ở admin reference mode, chỉ hiển thị mã cho đúng vùng đang hover hoặc keyboard focus, đặt trong vùng đó, có copy action và feedback. Kiểm overflow, scroll, cột reorder, popup, mobile; không che chữ/caret hoặc chặn click. Guest không thấy mã hoặc nút copy. Không phơi dữ liệu nhạy cảm trong clipboard/log.
3. Unit coverage registry/uniqueness/stability và browser screenshot/interaction. Chứng minh trong checkpoint các mã mẫu L03, L04, L06, mã con và thứ tự cột thay đổi vẫn giữ mã.

Tự sửa đến khi đạt. Push code/test/evidence theo SHA. Checkpoint sau khảo sát, commit ý nghĩa, CI/test, lỗi và trước dừng: code SHA, test SHA, PASS/FAIL/NOT RUN, link bằng chứng, phần còn thiếu. Không merge/deploy/Firebase live.
