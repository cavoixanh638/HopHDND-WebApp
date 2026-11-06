# Kế hoạch dự thảo — Đồng nhất ô Nội dung trình / Tiến độ 3 khâu
Ngày: 07/11/2026. Trạng thái: CLARIFICATION_PENDING — chưa giao worker, chưa sửa application code.

## Mốc trước thay đổi
- Repository: cavoixanh638/HopHDND-WebApp.
- Application/reference SHA: e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa.
- Tree SHA: 81343b297f80170879bfbb1170ec5cfa2ddfd6c2.
- Nhánh lưu kế hoạch: docs/20261107-picker-parity-plan, tạo trực tiếp từ SHA trên.
- Đây là checkpoint tài liệu mới; application code trước thay đổi đã nằm trong commit reference. Không lấy các checkout cũ/artifact cục bộ làm application source mới.
- Bằng chứng đợt trước: CI https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362 ; 3 jobs acceptance SUCCESS, 905 unit PASS / 116 baseline skips theo release receipt. Không gọi mọi workflow legacy trong repo đều PASS.
- Public demo: https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ ; version 4, Site ID appgprj_6aed474532b081919e39ba36909bf6bf.
- Sites source c85a23330e1dabbe40fdfabe81be3bb3c3a6c619 là repo artifact build, khác application source SHA.
- Không sửa file của worker cũ, không gom ảnh/log/cache chưa tracked từ checkout cũ vào commit này.

## Yêu cầu người dùng đã xác định
Lấy UI thực tế bốn picker UBND/VP/Phòng/CV làm chuẩn cho các ô ở hai cột Nội dung trình và Tiến độ 3 khâu, cả editable và không được phép sửa. Giữ màu nền hiện có. Lập kế hoạch chi tiết và hỏi điểm chưa rõ trước khi dùng skill parallel giao Gemini.
Không thay đổi chính bốn picker nhân sự chuẩn để khiến phép so sánh tự đạt.

## Chuẩn tham chiếu đã đo
Số CSS px; viewport đo 1280x720, devicePixelRatio 1.25. Độ rộng ví dụ không phải hằng số thiết kế.
- Nhóm nhân sự: 4 dòng; gap dọc 5px; nhãn/giá trị gap ngang 5px; align-items:center; nhóm căn giữa theo chiều dọc TD.
- Nhãn UBND/VP/Phòng/CV: min-width 46px (42px khi viewport <=650), font 10px/750, line-height 13.5px, padding 2px 4px, radius 4px, bg #EDF3EF, fg #688579. Chỉ tham chiếu bố cục; không tự tạo nhãn nền như vậy cho tên ba khâu hoặc metadata.
- Editable trigger: inline-flex; min-height 26px; padding 4px 7px; font Segoe UI/system 11px/550; line-height 1.35 (~14.85px); radius 6px; text centered; content can wrap; normal width fit-content/max-width 100%; gap value/caret 8px.
- Nền chuẩn nhân sự #F2F6F9, fg #426274, border #B7CBD6, inset 0 1px 0 #FFFFFFD0. Với target giữ màu nghiệp vụ/nền hiện có thay vì copy các token màu này.
- Viền measured 0.8px ở DPR1.25 là kết quả rasterization; không hardcode 0.8px làm thiết kế. Dùng rule tương đương reference và so computed style cùng môi trường.
- Caret một tam giác đặc 5x3px currentColor, không rail, không SVG/native arrow thứ hai, không xoay khi mở.
- Hover theme hiện tại: lift -3px, outline logical 2px #2E6F95 offset0, shadow 0 8px 16px rgba(41,89,112,.17) + halo 2px #F2F8FC; transition transform/shadow/border 180ms ease.
- Target giữ nguyên nền hiện có cả normal/hover/focus/open, không copy hover background #EAF1F5 từ nhân sự đè lên màu nghiệp vụ.
- Lift chỉ khi hover/focus-visible; aria-expanded không tự buộc lift vĩnh viễn. Không nâng cả TD/cụm. Reduced motion không dịch chuyển; print không bóng/transform.
- Popup dùng CellPicker đang có: khoảng cách anchor 6px; width thường 260px, tối đa360 và fit viewport với margin8; padding8; radius9; option minheight34/padding7px9px/gap2/radius6/font13; tự đặt trên/dưới và cuộn theo không gian.
- Không tự thêm tìm kiếm, xóa lựa chọn hoặc thay danh mục nghiệp vụ ở target: dùng cấu hình field hiện có. CV chuẩn có search không đồng nghĩa mọi target phải có search.
- Read-only reference: plain text, không button/caret/edit hover; font13/400; line-height1.35 (~17.55px); padding0; row gap5px; giữ hiển thị đầy đủ/tooltip hiện có. Nhóm 4 dòng ngắn ~85.2px, nhóm editable 4 dòng ngắn119px; không ép chiều cao TD.
- Màu chữ nghiệp vụ/palette/highlight của target cần được giữ. Không biến các trạng thái thành cùng màu chữ nhân sự.

## Các câu hỏi đã gửi người dùng, còn chờ
Q1: Nội dung trình chỉ Sở + Loại VB, hay cả nút sửa nội dung văn bản chính?
Q2: L03 giữ 5 widths và các nút trong cùng status track rộng bằng nhau, hay từng nút fit-content?
Q3: Read-only bỏ riêng nền/khung nút như nhân sự, vẫn giữ nền dòng/cụm/highlight và màu nghiệp vụ; hay giữ cả nền riêng từng giá trị?
Không dùng lựa chọn gợi ý làm câu trả lời đã chốt. Không phát hành prompt thực thi cho đến khi giải quyết các điểm này.

## Phân công dự kiến — 3 chat Gemini, bắt đầu đồng thời sau chốt
Tất cả cùng application baseline e095205c; mỗi chat nhánh riêng, một writer; branch thực thi sẽ tạo sau khi chốt spec. Không tạo chat/agent Codex.
1. COMMANDER: tổng chỉ huy, owner TRACKER/COORDINATOR, tích hợp, kiểm exact final SHA, dựng package và cập nhật public demo hiện có trong quyền đã được giao.
2. CONTENT: trọn gói UI cột Nội dung trình gồm editable/readonly/mixed, metadata, hover/focus/popup parity và own tests.
3. STAGES: trọn gói UI Tiến độ 3 khâu gồm 2/3 tracks, editable/readonly/mixed, alignment, widths, hover/focus và own tests.

### Ranh giới tránh phụ thuộc writer
- CONTENT thêm stylesheet riêng chỉ scope metadata/cột nội dung và browser/unit test prefix parity-content; không sửa CellPicker/shared app.css/item-frame.css, không width model L03.
- STAGES thêm stylesheet riêng chỉ scope stage controls/layout và test prefix parity-stages; không sửa CellPicker/shared app.css/item-frame.css, không metadata.
- Mỗi stylesheet có thể import qua module/component do luồng sở hữu: CONTENT CompactGroupedValue.tsx; STAGES CompactThreeStageValue.tsx nếu xác minh đúng module trên baseline. Khi lập prompt phải xác minh path thực, không giao path đoán.
- Dùng stable data-col-key/data-stage-field/data-ui-reference-part và selector scope, không nth-child; không tạo geometry phụ thuộc thứ tự kéo cột.
- Hai worker tự kiểm trên baseline với stylesheet của mình, không import/cherry-pick commit worker kia, không đợi helper mới của nhau.
- Shared CellPicker/popover/reference nhân sự giữ baseline. Nếu thực sự cần shared change, ghi đề xuất có tái hiện; commander xử lý trên nhánh tích hợp, không lấy đó làm gate worker bắt đầu.
- Commander có thể kiểm baseline, chuẩn bị acceptance/package và theo dõi checkpoints ngay từ đầu; integration là bước chung cuối, không phải một worker nối đuôi worker khác.

## Phạm vi UI cần giữ
- Nội dung trình: thông tin metadata ở dưới nội dung; Sở/Loại VB cùng dòng, căn giữa ngang; khi cả hai chỉ xem giữ quy tắc ngoặc và dấu gạch hiện có; khi ít nhất một sửa được không thêm ngoặc/gạch.
- L03: editable cấp trình dùng 3 tracks, cấp trình chỉ xem dùng 2 tracks với cấp trình cạnh Thành ủy; hàng cùng cấu trúc track ổn định. Nhãn và giá trị trong từng dòng căn giữa dọc, ba status cùng điểm bắt đầu.
- Không/TTTU/BTV/BCH và liên kết nghiệp vụ giữ nguyên: cấp trình Không => trạng thái Thành ủy Không, khóa sửa trạng thái; đổi từ Không sang cấp khác => Sở chưa trình, cùng giao dịch/quyền đang có.
- Giữ 5 trường width và persistence/CAS/rollback đã PASS; cập nhật tổng đo theo padding/gap thực nếu cần, không tự reset widths đã lưu hoặc đưa lại min-width lớn.
- Khi user chọn cách width khác, ghi rõ quyết định trước thực thi.
- Quyền từng field, lease/CAS, FROZEN, danh mục dữ liệu, báo cáo/KPI, viết tắt nhân sự, stable mã vùng/mã con và background/highlight/palette không đổi ngoài phạm vi UI được chốt.
- Áp dụng Danh sách và popup chi tiết tương ứng; bộ lọc/cài đặt không thuộc phạm vi.

## Nghiệm thu dự kiến
- Mỗi worker tự khảo sát -> sửa -> unit/typecheck phù hợp -> browser thật -> sửa lỗi -> kiểm lại -> bàn giao.
- So computed style với picker nhân sự bất biến cùng runtime cho font/height/padding/radius/caret/hover/focus, chỉ ngoại lệ width và màu đã chốt; không chỉ so screenshot.
- Ma trận: admin/guest; cả hai metadata sửa được/chỉ một/cả hai readonly; L03 cấp trình sửa được/chỉ xem; mixed status permissions; cấp trình Không; nhãn dài; normal/hover/focus-visible/open/disabled/busy.
- Browser kiểm alignment bằng rects, không chồng/cắt chữ, hover transform không đổi layout hàng; dropdown có thể mở/chọn/Escape/click ngoài/keyboard, resize/scroll giữ placement.
- Viewports1440/900/390; ảnh trước/sau cùng dữ liệu giả và viewport; width 2/3 tracks lấy config thực.
- Đo background/fg nghiệp vụ ở normal/hover/focus/open và read-only theo quyết địnhQ3; palette mặc định + custom/highlight giữ nguyên.
- Worker checkpoint own SHA/tested SHA/PASS-FAIL-NOT RUN/commands/run URLs/artifacts và còn thiếu. Không xem lời nhắn xong là DONE.
- Commander tích hợp, test source đúng SHA cuối (typecheck/unit/UI + Emulator phần bị ảnh hưởng nếu thay luồng config/quyền), build lại package, manifest SHA/hash asset; không lấy artifact cũ.
- Cập nhật Site demo public hiện có rồi smoke đúng asset SHA, admin/guest/editable/readonly/mixed; giữ DEMO_PENDING nếu Sites không khả dụng và bàn giao Codex gói đủ.
- Không lặp phần đã PASS nếu source không đổi và không có nghi vấn; docs-only checkpoint không buộc full test lại.

## Checkpoint và giới hạn
- Mỗi worker cập nhật GitHub sau mốc sửa/test/lỗi/chặn, trước tác vụ dài và trước dừng; tối đa khoảng5 lượt công cụ có nội dung mới hoặc10phút nếu chưa có mốc. Một writer mỗi checkpoint; COMMANDER duy nhất ghi tracker.
- Đợt đơn giản trước người dùng đã chọn không lập lịch nền. Không tự tạo lịch/chat mới; nếu được yêu cầu chạy nền thì hỏi chu kỳ trước.
- Không merge main, không Firebase production deploy, không RTDB/Excel writes, không chạy migration live.
- Code/template source mới NOT STARTED. Tests mới NOT RUN. Demo vẫn version4 reference; không gọi checkpoint này là UI đã sửa.
