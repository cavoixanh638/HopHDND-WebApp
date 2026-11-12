# Kiểm bàn giao và nhiệm vụ tiếp tục — 05/11/2026

## Kết luận đã xác minh

**CODE INTEGRATED / ACCEPTANCE INCOMPLETE.** Bốn worker đã gửi code; chưa phải cả bốn đã nghiệm thu DONE. Tiếp tục trên coordination hiện tại, không tích hợp lại từ đầu, không bắt worker làm lại phần đã PASS.

HEAD đã đọc trực tiếp GitHub:
- coordination: `95a0ebccbe6c18c32532399491cc78e4fcc5fb07`;
- REF: `897e87bfca16a77c5d4069966cde759b7d06b593`;
- UI: `dd05d21a25b6ef852d525d3249af5e94212fe6ba`;
- WIDTH: `42b159457b217a1d853411c2a5e2b6cd01cecd8f`;
- DATA: `6a87affcb0a8d1b0c0c1a52a936369aa44094b0d`.

Coordination HEAD khác code/test `79467c6c8db717c032463fec3a3b60b02e064a82` đúng ba commit, chỉ thay TRACKER và checkpoint commander. Mọi kết luận dưới đây gắn code/test SHA, không gắn nhầm docs HEAD.

[CI #41992006174](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41992006174), attempt 2, **FAIL** đúng `79467c6`:
- app-qa: typecheck PASS; 122 test files PASS/12 skipped, 878 tests PASS/116 skipped; build PASS.
- REF Chrome FAIL: `Chrome CDP unavailable: executable=google-chrome exit=null stderr=[]`. Đã đọc log job `127127223916`. Chưa đủ bằng chứng kết luận nguyên nhân chính xác.
- UI L03 Chrome SKIPPED, package/hash SKIPPED, full-app SKIPPED.
- data-emulator SUCCESS: offline migration fixture + domain/rules + Auth/RTDB/Functions Emulator.
- [CI #41991672718](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41991672718) trước đó trên `c7e6087` có REF Chrome PASS nhưng UI launcher FAIL; không thay bằng chứng toàn phần cho SHA cuối.
- [DATA CI #41986984189](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41986984189) SUCCESS đúng `b95f97ce9daa7ae38e5df333abb608d9d3cf0a9c`.
- Site: chưa có bằng chứng phát hành bản này. Migration live chưa chạy, đúng giới hạn đã chốt.

## Nhiệm vụ có chủ sở hữu

### 1. Commander — gỡ lỗi môi trường Chrome, không chỉ rerun tiếp

Trên `ui/20261105-coordination`, chẩn đoán launcher REF và UI cùng workflow. Thu binary resolved path/version, spawn error/exit, stderr, debugger endpoint và thời gian startup; profile riêng mỗi process và cleanup sau test. Phân biệt Chrome không chạy, chưa sẵn sàng, endpoint sai và lỗi test UI. Có thể dùng Chromium phiên bản xác định do Playwright cài, dùng lại cơ chế khởi động đã chạy được trong data-emulator; nếu dùng CDP phải có endpoint thật và bounded timeout. Không tăng retry vô hạn, bỏ assertions, hoặc dùng sự kiện giả thay tương tác chuột/phím thật. Chạy test thực rồi lưu log/artifact đúng SHA.

Điều kiện đóng: REF và UI browser đều thực thi đủ assertions/screenshot, không còn bootstrap failure; full-app chạy được thay vì skipped.

### 2. Commander — hoàn tất mã con từng ô báo cáo

Đã đọc source `ReportTable.tsx` và `ui-reference-codes.tsx` đúng `79467c6`: ReportTable vẫn render `tr key={label}`, chưa cung cấp `data-ui-reference-report-row/column`; resolver trả cùng `Rxx.TABLE` cho nhiều ô số. Vì vậy yêu cầu mã riêng **mọi khu vực/ô** chưa đạt.

Bổ sung identity semantic cho hàng nhóm/cột báo cáo từ khóa nghiệp vụ ổn định, gồm tổng hàng/tổng cột/tỷ lệ; dùng khóa sentinel rõ cho các ô tổng. Không lấy array index, thứ tự sort, text label có thể đổi tên làm identity. Nếu data model chưa có stable ID, bổ sung mapping và test persistence/rename thay vì gắn code giả. Gắn attributes cho renderer và cập nhật resolver/test. Chỉ admin hover/focus thấy mã trong đúng ô và copy.

Điều kiện đóng: hai ô số khác nhau có hai mã khác nhau; sort/filter/reorder/đổi tên hiển thị không làm đổi mã cùng vị trí nghiệp vụ; clipboard/focus/guest được kiểm browser. Commander sở hữu phần glue sau bàn giao; không ghi branch worker cũ.

### 3. Commander — nghiệm thu UI/WIDTH/DATA nối với ứng dụng thật

Chạy matrix list/popup, admin/guest/quyền hỗn hợp, 1440/900/390; lưu ảnh và rects. Chứng minh:
- Sở, Loại VB, cấp trình và ba status picker cùng UI mẫu Lãnh đạo UBND; preserve background/text colors.
- Cấp trình vừa 5 ký tự + caret/padding; status đủ nhãn dài nhất, ba status cùng width/height và trục ngang, nhãn/value từng hàng cùng tâm. Không coi hardcode 90/238px tự động là PASS nếu chưa đo.
- Cấp trình readonly: 2 track; editable: 3 track. Hai width toàn cụm persist riêng; guest readonly thu cả physical column; mixed rows không kéo readonly picker giãn theo phần trống. Test min widths với label dài để tránh overflow/clipping.
- Admin đổi mỗi width, reload/guest sync, CAS conflict/denied/offline rollback. Không xây lại admin title/C01-C03 đã PASS; chỉ regression khi delta tác động.
- Cấp Không khóa status và lưu Không phải trình; đổi sang TTTU/BTV/BCH đặt Sở chưa trình; grant chỉ cấp trình vẫn cập nhật phụ thuộc nguyên tử, ACK phản ánh hai field.
- Kiểm full-app runner hiện có thực sự chứa assertions cho thay đổi 05/11; thêm case còn thiếu, không lấy smoke cũ làm đủ.

DATA migration hiện chỉ có offline planner/fixture, chưa có executor live. Ghi đúng mức PREPARED_OFFLINE, LIVE_HOLD. Không phát sinh lệnh ghi Firebase thật trong lượt tiếp tục này.

### 4. Commander — khóa bản kiểm, dựng gói, demo và bàn giao

Sau sửa: một SHA tích hợp có tất cả gate bắt buộc PASS (skipped không là PASS), chạy lại phần chịu ảnh hưởng và gate tích hợp. Dựng gói từ SHA đạt, lưu source SHA, SHA-256 của HTML và archive thật, screenshot/rects, link run/artifact.

Phát hành vào Site demo riêng tư hiện có `appgprj_6ae93f17c2e48191815caef8a642fa14` nếu phiên có công cụ/quyền Sites, xác minh private access, deployment succeeded, version/URL và smoke. Nếu Gemini thiếu Sites, hoàn thành mọi bước trước phát hành và bàn giao gói/hash/source SHA/link artifact cho Codex có Sites; giữ SITE_PENDING cho đến lúc có bằng chứng, không tạo site public thay thế.

Không merge main, không deploy Firebase production/Rules, không chạy migration live. Commander tiếp tục là writer duy nhất TRACKER/checkpoint trên coordination, cập nhật sau mốc mới và trước dừng. Không mở thêm chat hoặc lịch nền.

## Prompt gửi lại chat tổng chỉ huy hiện có

> Tiếp tục đợt UI 05/11 từ HEAD hiện tại trên ui/20261105-coordination. Đọc source/docs/tasks/parallel-20261105-ui/REVIEW-AND-CONTINUE.md và checkpoint/TRACKER. Bốn worker đã bàn giao và đã tích hợp; không gộp/làm lại từ đầu. Hoàn thành bốn mục còn thiếu trong review: gỡ Chrome bootstrap bằng log chẩn đoán và launcher ổn định; mã semantic riêng từng ô số ReportTable; browser/full-App acceptance UI/width/transaction đúng SHA; dựng package/hash rồi cập nhật Site riêng tư nếu có công cụ, nếu thiếu thì giao đủ gói cho Codex. Giữ gate migration live HOLD, không merge main/deploy Firebase production. Tự cập nhật GitHub theo mốc, chỉ kết luận DONE khi có đủ bằng chứng; không dừng chỉ vì đã commit hoặc chạy CI.
