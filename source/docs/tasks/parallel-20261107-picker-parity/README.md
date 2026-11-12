# Quy ước và đặc tả — Picker parity 07/11/2026

## Đích cuối
Đồng nhất UI Sở trình/Loại văn bản (L01) và Cấp trình TU + ba tiến độ (L03) với picker UBND/VP/Phòng/CV hiện tại. Phải có bản tích hợp, kiểm đúng source SHA, package dựng lại, public demo hiện có cập nhật và bằng chứng. Chỉ soạn/giao Gemini trong đợt này; không tạo chat/agent Codex.

## Baseline và tiếp quản
- Repo cavoixanh638/HopHDND-WebApp. Application/reference SHA **e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa**.
- Checkpoint trước thay đổi **f55deac21873d98ac377ca06174566401d4f082f** là docs-only, parent trực tiếp e095205c. Kế hoạch cập nhật trước đóng gói **b6544514e58cd2ba73c9a6526ba77907becd5cc6** cũng docs-only.
- Nhánh thực thi cả 3 chứa cùng bộ tài liệu mới, source tương đương e095205c. Bắt đầu/tiếp tục HEAD nhánh mình, không reset về baseline. Không cherry-pick output worker khác vào nhánh mình.
- Đọc README này + entrypoint của mình + handoffs/<ROLE>.md trước. Xem [kế hoạch chi tiết](PLAN.md) khi cần số đo/acceptance.
- Bốn picker nhân sự ở L04 là chuẩn bất biến. Không sửa chúng/selector chung để phép so sánh tự đạt.
- Bằng chứng cũ: [CI #42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362), 3 acceptance jobs PASS, 905 unit PASS/116 baseline skips. Không lặp phần PASS không đổi; không gọi mọi workflow repo đều xanh.

## Người dùng đã chốt
1. L01 chỉ **department/type**. UI sửa nội dung văn bản chính không thuộc phạm vi.
2. L03 giữ **5 thông số độ rộng độc lập**: readonly(label,status), editable(label,level,status). Cùng một status track thì nút cùng width; không co theo chữ từng nút.
3. **Giữ nền màu hiện tại ở cả giá trị sửa được và chỉ xem**, bao gồm riêng nền phía sau từng giá trị chỉ xem. Giữ màu chữ nghiệp vụ/palette/highlight.
4. Không tạo thêm lịch nền cho đợt ngắn này theo quyết định trước của người dùng; checkpoint GitHub theo sự kiện khi làm.

## Hợp đồng giao diện bắt buộc
### Editable, lấy bốn picker nhân sự ở e095205c làm chuẩn
- min-height26px; padding4px7px; font Segoe UI/system11px/550; line-height1.35; radius 6px; căn giữa chữ và theo chiều dọc; một caret tam giác đặc5x3px, gap chữ/caret8px; không rail/nút mũi tên riêng.
- Viền thường mảnh theo reference (normal color #B7CBD6); inset highlight 0 1px0 #FFFFFFD0. Đo reference và target cùng browser/DPR, không hardcode số rasterized0.8px.
- Hover/focus-visible: lift -3px, outline2px #2E6F95 offset0, shadow0 8px16px rgba(41,89,112,.17) + halo2px #F2F8FC; transition180ms ease cho transform/shadow/border. Chỉ ô tương tác nổi, không cả TD/cụm. Reduced-motion không lift; print không shadow/transform. Không giữ lift chỉ vì aria-expanded.
- **Ngoại lệ màu:** không copy nền nhân sự hoặc hover #EAF1F5 đè lên nền target. Giữ background/palette/highlight của target ở mọi trạng thái; màu chữ nghiệp vụ ưu tiên reference neutral #426274.
- L01: width vừa nội dung/max-width100%, không kéo giãn ô Sở/Loại VB lấp cả hàng; hai ô cùng dòng, cùng trục giữa. Không đổi dữ liệu, quy tắc hiển thị metadata hoặc dữ liệu gốc.
- L03: width100% track đã lưu, ba nút tiến độ bằng nhau; ô Cấp trình width theo level track. Giữ grid/subgrid, column-gap8px theo model tổng; row-gap5px. Không đổi 5 values, không reset cấu hình, không thêm intrinsic min-width lớn.
- 26px là min-height, không ép height26 khiến chữ dài cắt. Khi tên/trạng thái xuống dòng, cả hàng grid đủ cao và nhãn/giá trị vẫn align center.
- Không tự đổi label ba khâu thành badge UBND/VP; chỉ UI value controls được đồng nhất.

### Read-only, kể cả admin không cấp quyền sửa
- Không button/fake dropdown/caret/edit tooltip/hover lift/focus mở editor. Hiển thị giá trị text13px/400, line-height1.35, không padding nút/viền/shadow.
- **Giữ nền màu riêng từng giá trị như baseline**, không xóa để bắt chước nhân sự. Màu trạng thái và highlight tiếp tục tồn tại; không tạo nền mới nếu baseline không có.
- Mỗi dòng căn giữa dọc; value starts thẳng hàng theo track. Mixed permissions không đổi cột status hoặc mất quyền field còn lại.
- L01 giữ (Sở - Loại VB) khi cả hai chỉ xem; nếu ít nhất một ô sửa được không ngoặc/gạch, cả hai cùng dòng và thẳng hàng ngang.
- L03 cấp trình chỉ xem vẫn cạnh Thành ủy trong ngoặc, layout2tracks; nếu Không thì giấu cấp trình lặp, status bất hoạt theo baseline. Layout3tracks chỉ khi cấp trình được sửa, dropdown riêng ở cột2.
- Không sửa giá trị/canonical mapping/transaction: Không/TTTU/BTV/BCH, ép trạng thái Thành ủy khi Không và reset Sở chưa trình khi đổi lại cấp khác vẫn theo contract hiện có. Nếu baseline có nhãn legacy "Không phải trình" trong projection, không tự biến nhiệm vụ UI này thành migration/đổi nghiệp vụ.

### Dropdown mở, quyền và hành vi
Dùng nguyên CellPicker, không fork component/select native. Giữ cấu hình options/search/clear riêng field, lease/permissions/CAS/freeze/busy/error.
Khung đang có: thường width260px, tối đa360 và fit viewportmargin8; anchor gap6; padding8; radius9; option min-height 34,padding7px9px,gap2,radius 6,font 13. Chọn/keyboard/Escape/click ngoài/scroll/resize giữ hoạt động. Không thêm search chỉ vì CV chuẩn có search.

## 3 chat độc lập và vùng sở hữu
| Role | Branch | File/vùng được ghi |
|---|---|---|
| COMMANDER | ui/20261107-picker-parity-command | TRACKER/PLAN/README/entrypoints/handoffs COMMANDER; workflow acceptance mới; tích hợp và package/demo |
| CONTENT | ui/20261107-picker-parity-content | mới source/src/features/items/picker-parity-content.css; CompactGroupedValue.tsx chỉ import CSS đó và nhánh contentDetails nếu cần; test/browser prefix picker-parity-content; checkpoint CONTENT |
| STAGES | ui/20261107-picker-parity-stages | mới source/src/features/items/picker-parity-stages.css; l03-track-widths.css chỉ nối CSS và geometry cần thiết trong phạm vi L03; test/browser prefix picker-parity-stages; checkpoint STAGES |

- CONTENT không sửa nhánh partyTogether/teamTogether trong CompactGroupedValue. STAGES không sửa CompactGroupedValue; DOM L03 baseline đã có selector đủ.
- STAGES import CSS riêng ở đầu l03-track-widths.css đúng chuẩn CSS; dùng specificity scoped đủ thắng rule cũ, không import cuối sau declaration. CONTENT import CSS qua module của mình. Worker tự xác minh cả List/popup thực sự nhận CSS.
- Cả hai không sửa CellPicker.tsx, cell-picker.css, item-frame.css, app.css, ItemList/App/ReportDetailGrid, width model, backend/rules/package lock/workflow chung. Không dùng selector chung gây ảnh hưởng L04/filter/settings.
- Nếu có một nối shared DOM thật sự cần: ghi tái hiện/patch đề xuất trong checkpoint, commander làm khi tích hợp; không bắt worker khác chờ/helper code. Hoàn thành mọi tiêu chí trong phạm vi mình trên DOM baseline.
- Mỗi worker tự khảo sát -> sửa -> kiểm -> sửa lỗi -> kiểm lại -> commit/push/bàn giao; không dừng ở chẩn đoán hoặc đợi worker khác.
- Workflow riêng theo prefix role được phép nếu cần tự chạy kiểm; không sửa shared CI cũ hoặc required checks. Đừng để thiếu browser test thành DONE.

## Kiểm thử và bằng chứng
- Bắt đầu từ npm ci nếu chưa có dependency, trong source chạy npm run typecheck, unit liên quan (npm test -- <testpath>), npm run build:compact:qa; worker chạy browser script riêng trên full synthetic App và popup thật.
- Browser trước/sau cùng fixture, viewport1440/900/390; normal/hover/focus-visible/open, readonly/mixed, long text, palette mặc định/custom/highlight; đo rects và computed style (không chỉ screenshot).
- So style reference nhân sự cùng runtime; geometry/font/border/caret/lift khớp, width/color theo ngoại lệ. L04 phải không đổi.
- Browser chứng minh bấm mở/chọn/keyboard/Escape/click ngoài, placement khi scroll/resize và không overflow toàn trang. Không dùng dispatch change làm bằng chứng click.
- Read-only không có button/caret/handler edit, nền riêng giữ nguyên. Cả admin field bị deny và guest phải đúng, không chỉ test roleadmin=all true.
- Worker handoff: code SHA/tested SHA, diff phạm vi, lệnh/result PASS/FAIL/NOT RUN, URL CI/artifact/screenshots/measurements, file WIP, tiêu chí còn thiếu.
- Tích hợp: commander test cùng final source SHA (typecheck/full unit/build + hai feature browsers + regression reference nhân sự + Emulator regression config/quyền phù hợp), dựng gói và chứng minh assets đúng SHA. Worker PASS khác SHA không thay thế integration.
- Không cài thêm test mirror implementation/đòi coverage không liên quan. Tận dụng QA baseline, sửa assertion chỉ khi yêu cầu UI thay đổi có chủ ý và ghi lý do, không bỏ acceptance để xanh.

## Theo dõi GitHub và phục hồi hit limit
- Checkpoint: [CONTENT](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/handoffs/CONTENT.md), [STAGES](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/handoffs/STAGES.md), [COMMANDER](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/handoffs/COMMANDER.md).
- [Tracker chuẩn](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-command/source/docs/tasks/parallel-20261107-picker-parity/TRACKER.md) chỉ COMMANDER ghi. Worker không sửa tracker và checkpoint của nhau.
- Commit/push checkpoint đầu tiên trước làm sâu; cập nhật sau batch có ý nghĩa/test/lỗi/chặn, trước tác vụ dài và trước dừng. Nếu chưa có mốc, khoảng5tool có nội dung mới hoặc10phút. Không chờ user nhắc/hit limit. Không no-op commit.
- Commander đọc HEAD/checkpoint/CI theo sự kiện khi làm; chỗ thiếu giao đúng owner bằng task update/prompt có bước thực thi, không tự sửa nhánh worker đang ghi. Không chỉ tin lời nhắn "xong".
- Mỗi nhánh một writer. Chat mới đọc entrypoint+checkpoint và tiếp tục HEAD; không reset/force-push. Local-only phải ghi rõ; không hứa GitHub khôi phục WIP chưa push.
- READY_NOT_STARTED/IN_PROGRESS/FAIL/BLOCKED/DONE phân biệt; chỉ DONE với đủ evidence. Toàn đợt chưa DONE nếu chưa có demo đúng version.

## Demo và giới hạn
- Giữ public Site **appgprj_6aed474532b081919e39ba36909bf6bf** và URL https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ ; bản trước version4.
- Dùng full synthetic entry dist-compact-qa/compact-qa.html, không standalone entry chỉ đọc Sheet. RAM demo không chứng minh production persistence; không thêm login wall, không ghi dữ liệu thật.
- Dựng lại source đúng final SHA; source-sha.txt/manifest, hash tất cả assets/package; publish chỉ gói đã kiểm. Smoke live tải mới, hash khớp, admin/guest/mixed/list/popup; ghi version/deployment succeeded và hạn chế.
- Nếu Gemini không có Sites API: hoàn tất source/tests/package trong quyền, giữ DEMO_PENDING; xuất DEMO_HANDOFF.md chứa tested SHA/run/artifact/digest/entry và checklist để Codex phát hành. Không bịa deploy/URL; không xem demo cũ là đã sửa.
- Không merge main; không Firebase Hosting/Rules/Functions production deploy; không RTDB/Excel writes/live migration/Supabase/source switch. Không tự nghĩ thêm nhiệm vụ hoặc luồng khi đạt tiêu chí.
