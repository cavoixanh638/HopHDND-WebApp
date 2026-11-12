# Quy ước chung — UI controls 06/11/2026

## Yêu cầu đã chốt
1. Khôi phục UI chọn **Lãnh đạo UBND, Lãnh đạo VP, Phòng, Chuyên viên** trong cột gộp về **trước đợt đồng nhất picker Sở/Loại VB/Cấp trình với Lãnh đạo UBND**, không phải quay lại demo V2 91c2dd4. Chỉ khôi phục phần trình bày cần thiết; giữ chức năng và dữ liệu mới.
2. Thay hai thông số độ rộng toàn cụm bằng **5 thông số độ rộng cột nhỏ độc lập**:
   - Bố cục 2 cột: Nhãn kèm cấp trình / Tiến độ.
   - Bố cục 3 cột: Nhãn / Cấp trình TU / Tiến độ.
   - Tổng chiều rộng cụm tự tính từ các cột con + khoảng cách + padding thực. Mỗi mode lưu riêng; không dùng chung Nhãn/Tiến độ giữa hai mode.
3. **Không bỏ mũi tên.** Thay bằng tam giác nhỏ đặc hướng xuống như mũi tên ở nút **Tùy chọn người phụ trách** trong ảnh người dùng: gọn, bên phải, cùng trục giữa chữ; không rail riêng, không caret chữ V lớn. Áp dụng mọi dropdown **sửa dữ liệu trong Danh sách và popup**, gồm nhân sự, Sở, Loại VB, Cấp trình và ba tiến độ, cả custom select nếu có. Bộ lọc/trang cài đặt giữ nguyên. Read-only không tạo mũi tên giả.
4. Hình ảnh chỉ là mẫu **mũi tên**, không phải yêu cầu biến mọi ô thành nút xanh giống ảnh.

## Mốc bất biến
- Repo cavoixanh638/HopHDND-WebApp; baseline đầu đợt **8a201c1bf48c7916e4d0af9e1c0ca60cd6737632**. Code tương đương SHA đã PASS **5d3aacebfadae89fd00a08f734d79e842bb45daa**; diff giữa hai SHA chỉ tài liệu.
- [CI baseline #42238116883](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42238116883): 3/3 SUCCESS; 897 unit PASS, 116 baseline skipped; UI 28 cases gồm 6 mức hẹp.
- **Mốc tham chiếu UI khôi phục:** `ab8629c7575debd494c908c14bde9967a575a82a`, parent trực tiếp của commit đồng nhất `2a7fe5da3fc19e7b2233e550c2c474f55183a670`. `item-frame.css` ở mốc này có blob `c023f96a5693007050ef4b7c27b0b42d4151fe6e`, trùng baseline trước đợt 05/11 `d8c994c44f7bd11b685d82f8f955ffab99065ea9`. Worker phải render/đối chiếu đúng bốn ô nhân sự và ghi ảnh/selector làm bằng chứng; không tự gọi 91c2dd4 là UI cũ.
- Giữ stable ID/mã con admin, cách biểu diễn Không/TTTU/BTV/BCH, màu trạng thái, transaction/quyền/lease/CAS và các phần PASS ngoài phạm vi.
- Demo hiện có public: https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ ; Site ID `appgprj_6aed474532b081919e39ba36909bf6bf`, version 3. Không tạo Site khác, không thêm login wall.

## Hai worker bắt đầu đồng thời, không chờ nhau
| Luồng | Nhánh | File/vùng sở hữu |
|---|---|---|
| PICKER | ui/20261106-picker-restore | CellPicker.tsx và stylesheet picker; item-frame.css **chỉ skin nhân sự/caret/hover/focus, không grid L03**; app.css chỉ rule picker nếu cần; test/browser script riêng prefix ui-20261106-picker |
| TRACKS | ui/20261106-l03-tracks | item-preferences.ts, item-layout-merge.ts, ItemList.tsx, admin-list-controls.css; mới l03-track-widths.css + helper; ReportDetailGrid/report-detail preferences/App/config validation chỉ khi cần nối 5 thông số; test/browser script riêng prefix ui-20261106-tracks |
| COMMANDER | ui/20261106-controls-command | tracker/checkpoint tổng, workflow phối hợp và tích hợp; không sửa nhánh worker |

**Hợp đồng tránh xung đột:**
- PICKER không sửa CompactGroupedValue.tsx, ItemList, width model, width CSS/grid. Dùng selectors hiện có của teamTogether và CellPicker; nếu cần đổi markup chung, ghi đề xuất trong checkpoint để commander xử lý khi tích hợp, không lấy đó làm gate bắt đầu.
- TRACKS không sửa CellPicker.tsx, app.css, item-frame.css hoặc skin/caret. Triển khai geometry trong file riêng, set custom properties ở tổ tiên các cụm; giữ DOM/data-stage-field/data-level-layout và hành vi picker baseline.
- Contract geometry: mỗi stage đọc các độ rộng label/level/status theo mode, 3 status dùng cùng một rail. Width thuộc bố cục; padding/caret thuộc control. TRACKS kiểm độc lập bằng picker baseline; PICKER kiểm độc lập bằng layout baseline. Không import commit worker khác.
- Không buộc một worker đợi worker còn lại để test/bàn giao; commander xử lý chỗ nối cuối trên nhánh điều phối. Test dùng file riêng để không hai writer sửa chung browser runner cũ.
- Không restore toàn bộ file/branch từ mốc cũ; không hoàn nguyên chức năng mới khi chỉ cần trả UI nhân sự.

## Checkpoint chủ động trên GitHub
Writer duy nhất mỗi nhánh/checkpoint. Ghi checkpoint đầu tiên trước làm sâu, cập nhật sau commit có ý nghĩa, test PASS/FAIL, phát hiện/chặn mới, trước tác vụ dài và trước dừng; tối đa khoảng 5 lượt công cụ có công việc mới hoặc 10 phút khi chưa có mốc. Push WIP an toàn, ghi TEST_PENDING nếu chưa test. Không chờ người dùng nhắc/hit limit. Chat mới đọc entrypoint + README + checkpoint mới nhất, tiếp tục HEAD hiện tại, không reset về baseline.

Checkpoint: status, HEAD/code SHA/tested SHA, file WIP, kết quả/run/artifact/ảnh, tiêu chí chưa đạt, tối đa 3 bước kế tiếp. Không ghi “DONE” từ lời nhắn. Không có sự kiện mới thì không commit/no-op.

**Không lập lịch nền đợt ngắn này** theo lựa chọn trước của người dùng. Không tạo chat/agent Codex hoặc chat Gemini tự động; người dùng tự gửi prompt vào 3 chat. Nếu sau này yêu cầu lịch nền mới, phải hỏi chu kỳ và kiểm khả năng thực thi thật.

## Đích cuối và giới hạn
Worker tự khảo sát → sửa → test → sửa lỗi → test lại phần ảnh hưởng → bàn giao đủ bằng chứng đúng SHA. Tổng chỉ huy theo dõi GitHub khi đang làm; tích hợp hai đầu ra, kiểm cùng SHA cuối, dựng lại gói và **cập nhật demo public hiện có** để người dùng thử.

Không merge main, không Firebase Hosting/Rules/Functions production deploy, không RTDB/Excel thật, không chạy migration live. DATA vẫn PREPARED_OFFLINE/LIVE_HOLD. Chỉ thay đổi cấu hình schema/test với fixture hoặc Emulator; không tự chuyển đổi dữ liệu production.

Nếu Gemini không có Sites API: đóng code/package acceptance khi đủ, nhưng giữ **DEMO_PENDING**; tạo handoff cho Codex với tested SHA, CI run, demo build đúng entry synthetic, hash tất cả asset, manifest và checklist smoke. Đây là chặn bên ngoài, không được bịa deployment/URL mới hoặc lấy bản cũ làm kết quả. Chỉ đánh dấu toàn đợt DONE khi demo deployment succeeded và smoke đúng phiên bản.

Site demo phải dùng full synthetic preview có đủ admin/guest, không dùng standalone entry mặc định mở Google Sheet và khóa admin. Full demo phải nối cấu hình 5 trường giống app thật. Demo RAM và backend Emulator có phạm vi chứng minh khác nhau; không dùng demo thay nghiệm thu persistence/CAS.
