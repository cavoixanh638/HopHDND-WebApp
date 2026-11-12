# Review lần 2 — sau bàn giao 05/11

**Chưa nghiệm thu DONE.** Giữ các phần đã PASS, tiếp tục cùng nhánh coordination; không gộp lại worker.

## Bằng chứng kiểm trực tiếp GitHub

- HEAD lúc kiểm: `921c46d7696a59727bb09302bfa66cbaade24d77`; so code/test `184d418dcad3ac3a44c249cac4bc9b4fa70b3fbf` chỉ thêm một commit checkpoint.
- [CI #42008307735](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42008307735) đúng `184d418`: app-qa **FAIL**. Đã đọc [job #127181140121](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42008307735/job/127181140121) và log thật.
- Typecheck PASS, 885 tests PASS/116 skipped (124 files PASS/12 skipped), build PASS.
- Chromium pinned khởi động thành công qua pipe: version 141.0.7390.37, startup 690ms, CDP session READY. **Blocker CDP cũ đã gỡ; không tiếp tục sửa bootstrap khi không có bằng chứng lỗi mới.**
- Browser REF **FAIL**: `Timeout report numeric cell 1 displayed its full semantic code`. Chưa đủ bằng chứng xác định là selector/test hay overlay/placement; cần chẩn đoán đúng.
- UI L03/package job ở sau REF chưa có bằng chứng PASS trên SHA này. DATA Emulator còn chạy lúc kiểm; không chuyển kết quả SHA cũ sang SHA mới. Full-App QA09/QA10 vừa thêm chưa có nghiệm thu.
- Site/gói phát hành cuối chưa có bằng chứng đủ. Không phát hành bản này với nhãn QA PASS.

## Hai việc cần sửa — owner Gemini tổng chỉ huy

### A. Lỗi browser hiển thị mã ô số

Tái hiện ngay bước numeric-cell ở `source/scripts/pr95-v4-l3-reference-browser.mjs`. Chụp ảnh lỗi, DOM target/closest cell, row/column attrs, resolver code, active marker full code vs short badge, hidden/rect/occlusion và tọa độ pointer. Phân biệt mã đầy đủ trên attribute/clipboard và fingerprint rút gọn trong text; assertion phải kiểm đúng hợp đồng nhưng vẫn yêu cầu badge nhìn thấy trong đúng ô. Kiểm hit-testing, overflow/scroll và khoảng trống đặt marker, tránh đổi test chỉ để xanh. Sửa nguyên nhân, kiểm hai ô khác nhau + clipboard + keyboard focus + guest không có mã. Giữ log/chứng cứ đúng SHA.

Điều kiện đóng: real Chrome REF PASS đầy đủ, không bỏ numeric-cell/copy/no-occlusion assertions.

### B. Mã hàng báo cáo vẫn thay đổi theo dữ liệu thành viên

Đã đọc `source/src/domain/report-reference-identity.ts`: `reportReferenceGroupRows` chọn recordId nhỏ nhất trong mỗi nhóm và tạo `record:<id>`. `ReportTable.tsx` gọi lại từ items mỗi lần tính. Do đó:
- Nhóm có record `r02,r03` được mã `record:r02`.
- Chuyển/xóa `r02` khỏi nhóm dù nhóm vẫn tồn tại => mã đổi thành `record:r03`.
- Thêm một record có ID nhỏ hơn cũng có thể đổi mã.
Đây là suy luận trực tiếp từ thuật toán hiện hành; test rename/reorder hiện có không kiểm các thao tác này. Comment “last surviving anchor leaves” không bảo đảm yêu cầu người dùng mã cố định.

Thay bằng identity bền vững của nhóm nghiệp vụ (mapping có lưu hoặc ID thật từ nguồn nếu có), namespaced theo loại nhóm. Mã không được phụ thuộc hồ sơ thành viên nhỏ nhất, thứ tự, số lượng hoặc nhãn hiển thị. Nếu dùng registry, giữ ID qua rename và save/reload; không đòi ghi dữ liệu Firebase production để triển khai/kiểm thử — dùng demo/Emulator. Thêm test thêm/xóa/chuyển hồ sơ, filter/reorder/rename/reload; nhóm còn tồn tại phải giữ mã, các nhóm khác nhau không trùng. Báo rõ quy tắc nhóm bị xóa hoàn toàn/tạo mới; không tự dùng fallback đổi mã rồi gọi ổn định.

Điều kiện đóng: ma trận identity trên PASS và browser chứng minh mã ô ổn định qua thay đổi thành viên/nhãn.

## Sau sửa

1. Khóa SHA mới, lấy PASS cho app-qa, data-emulator và full-app (QA01–QA10), đặc biệt grant chỉ partyLevel/atomic status và hai width persist/reload/guest. Không bỏ test để vượt lỗi.
2. Dựng HTML/archive từ đúng SHA PASS, tính hash thực, lưu ảnh/rects/run/artifact.
3. Site riêng tư hiện có nếu có công cụ; nếu thiếu Sites thì đưa Codex source SHA + artifact URL + HTML/archive SHA-256 để tiếp tục phát hành. Chưa có bộ này thì chưa phải bàn giao sẵn để deploy.
4. Cập nhật trạng thái hiện hành ở đầu TRACKER/checkpoint, tránh để bảng đầu file vẫn mô tả run cũ trong khi chỉ nối nhật ký phía dưới. Không sửa nhánh worker đã bàn giao.
5. Không merge main, không deploy Firebase/Rules production, migration live HOLD.

## Prompt gửi chat tổng chỉ huy hiện có

> Tiếp tục trên ui/20261105-coordination, đọc REVIEW-2-NUMERIC-CODES.md cùng checkpoint hiện hành. CI #42008307735 đã FAIL numeric report marker dù Chrome boot thành công; sửa đúng lỗi hiển thị/selector theo chứng cứ. Đồng thời sửa identity hàng báo cáo đang lấy min(recordId), vì mã thay đổi khi hồ sơ chuyển/xóa/thêm vào nhóm; dùng ID nhóm bền vững và test sự ổn định. Giữ phần đã PASS, chạy hết gate đúng SHA cuối, dựng package/hash và bàn giao Site. Cập nhật GitHub theo mốc, không dừng chỉ vì đã commit hoặc khởi chạy CI. Không merge main hoặc ghi Firebase production.
