# Danh sách chi tiết V2 — đặc tả và nghiệm thu (27/10/2026)

## Mốc an toàn
- Baseline `main` trước chỉnh UI: `a394d0bf2965acd8fcc3385c2293ed6949ef4224`.
- Commit checkpoint riêng: `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`, branch `checkpoint/pre-ui-2026-10-27`.
- Branch thực hiện: `feature/executive-detail-ui-20261027`.
- Phạm vi: chỉ frontend báo cáo + Danh sách chi tiết, CSS, QA và tài liệu. Không đổi 15 trường dữ liệu Excel, không đổi rules quyền sửa hay triển khai Cloud Firebase. Supabase dừng.
- PR #83 (guest admin-published-only / trusted Cloud publisher) là bài toán bảo mật tách biệt, DRAFT/unmerged, không được vô tình merge hoặc triển khai cùng PR UI.

## Phần A — 3 thẻ ngay trên Danh sách chi tiết
Đúng ba tên, **không có “Khâu 01 / 02 / 03”**:
1. **Tiến độ xin ý kiến Thành ủy** (`party`);
2. **Tiến độ trình xây dựng NQ** (`build`);
3. **Tiến độ trình ban hành NQ** (`council`, có thể cấu hình `nq` nếu không còn council).

Mỗi thẻ hiển thị tỷ lệ, hoàn thành/tổng, thanh phân đoạn ngang và ô trạng thái bấm để lọc hồ sơ trên danh sách. Lấy `reportItems`, `aggregateReport`, `normalizeReportStatus`, `reportStage` có sẵn; tổng số và tỷ lệ phải trùng Báo cáo tổng hợp với **cùng phạm vi cấu hình**. Thanh chia theo tỷ lệ hồ sơ, thứ tự trạng thái bất biến Sở chưa trình → VP đang thực hiện → trạng thái giữa → hoàn thành. Màu lần lượt đỏ `#dc2626`, cam `#d97706`, xanh nhạt `#bfdbfe`, xanh `#059669`. Các ô trung gian có nền xanh rất nhạt `#eff6ff` và chữ xám trung tính, không làm đậm bằng trạng thái chính. Với ban hành, chỉ có ba đoạn/ô (không có giai đoạn giữa). Trạng thái khác/chưa chuẩn hóa phải hiện ghi chú và phần thanh xám, không được cộng lén vào hoàn thành.

- Thành ủy: **Bước tiếp theo** là một ô bằng tổng `Đã gửi ĐU` + `ĐU đã gửi TU, chưa họp` + `Đã họp/xin phiếu, chưa có TBKL`. Không tính `VP đang thực hiện` và `Đã có TBKL`.
- Xây dựng NQ: **Đã trình, chưa có QĐ** là duy nhất một trạng thái nguồn `Đã trình HĐND, chưa có QĐ`.
- Ban hành NQ: ba trạng thái `Sở chưa trình`, `VP đang thực hiện`, `Đã trình HĐND thành phố`. `council` theo phạm vi NQ & BC đã có (không giả định chỉ NQ).

## Phần B — 4 cụm, 6 cột vật lý mặc định
- **Cụm 01 — Định danh & hồ sơ**, hai cột:
  1. **MÃ**: `displayId` lấy `displayCode` gốc Excel (ví dụ `NQ01`, `BC01`); tuyệt đối không tự đánh số `#01`.
  2. **TÊN TỜ TRÌNH & ĐƠN VỊ CHỦ TRÌ**: dòng đầu là badge Loại VB (QPPL/HC/BC) + Sở, ngành chủ trì; dòng sau là Nội dung trình.
- **Cụm 02 — Trách nhiệm**, một cột: dòng `UBND`, `LĐVP`, `CV`; **không lặp Sở chủ trì**. Viết tắt tên cả ba chức danh/cán bộ theo hàm đã có; giữ chức vụ PCT/PCVP/... Tên phòng trong ngoặc cuối tên CV, ví dụ `N.V.An (Phòng Tổng hợp)`; không tạo dòng PHÒNG độc lập.
- **Cụm 03 — Chuỗi tiến độ 3 khâu**, một cột: `Thành ủy (TTTU) — Sở chưa trình` (cấp xin ý kiến và trạng thái chung một dòng), `Xây dựng NQ — [trạng thái]`, `Ban hành NQ — [trạng thái]`. Giữ nguyên ba trường nghiệp vụ riêng, không nén dữ liệu. Với BC vẫn sử dụng giá trị trạng thái ban hành của hồ sơ đó.
- **Cụm 04 — Theo dõi & chỉ đạo**, hai cột: `Tiến độ hiện tại` và `Ghi chú` **tách riêng**, giữ quyền sửa và lịch sử theo trường.

## Tùy chọn và bảo mật
- `Bố cục gọn` là kiểu hiển thị mặc định ở tab Danh sách, không thay 15 cột Excel.
- `Tùy chọn từng cột` trở lại bảng nguồn với cấu hình hiện có; `Hiện đủ cột Excel` là lối tắt xem toàn bộ nguồn. Giữ ẩn/hiện, kéo, resize, bộ lọc trường, các lựa chọn gộp cũ, các mẫu giao diện đã lưu, phân quyền và lease CAS từng ô.
- Trên bố cục gọn: tìm toàn văn qua **giá trị gốc**, không tìm tên viết tắt; bấm trạng thái lọc hồ sơ, bấm lại/xóa lọc để khôi phục. Bộ thống kê vẫn tính theo tập dữ liệu báo cáo đầy đủ, không bị thay bởi lọc bảng.
- Chỉ render những trường admin cho phép hiển thị qua `activeLayout.columns[].visible`; không mở thêm quyền Firebase do giao diện. **Quan trọng:** điều này không thay thế cấm đọc tầng Rules. Khách chỉ được tải các public view admin phê duyệt sau khi PR #83 được rà soát/triển khai riêng. `main` hiện chưa đáp ứng an toàn nguyên tắc này bằng backend; giữ HOLD cổng production security.
- Không thay thế bất cứ giá trị lưu trong Firebase/Excel bằng nhãn viết tắt. Quyền sửa được kiểm tra trên field gốc; lịch sử, khóa, và lưu nháp giữ nguyên.

## Kiểm thử tự động
- `tests/executive-detail-ui.test.tsx`: trùng tổng/tỷ lệ Báo cáo tổng hợp; 3 trạng thái nhóm Bước tiếp theo; một trạng thái chờ QĐ; thứ tự thanh; 6 cột và đủ 15 trường nguồn; giữ ẩn trường theo admin; tính toàn vẹn dữ liệu.
- Bắt buộc chạy `npm run typecheck`, `npm test`, `npm run build:pages`, Chrome smoke, staging Firebase Emulator trong CI; soát exact head.
- Trước phát hành thật: kiểm tra UI bằng trình duyệt, đối chiếu số liệu từ dữ liệu thật, tab Google admin + nhân viên, tất cả bộ lọc/chỉnh sửa/locks, khách chỉ được xem public view đã duyệt. Không suy luận Cloud GO từ CI.

## Quy tắc rollback
Trở về code trước sửa UI bằng SHA `a394d0bf2965acd8fcc3385c2293ed6949ef4224` hoặc nhánh checkpoint. Dữ liệu Firebase không thuộc commit UI nên không liên quan thao tác rollback frontend.

## 27/10/2026 — phản hồi từ ảnh thực tế: UX hotfix
- Phản hồi: ô nhãn trạng thái và chữ trong báo cáo quá nhỏ; hàng “Mẫu hiển thị cá nhân” chiếm diện tích; bảng chi tiết không cuộn dọc độc lập.
- Chỉnh `executive-layout.css`: chữ ô trạng thái 12.5px, nội dung bảng 13.5px, tiêu đề rõ; giữ nguyên thứ tự/màu đỏ → cam → xanh nhạt → xanh; màn hình hẹp không xuống 9px.
- Khung bảng `executive-table-scroll` dùng `max-height:min(70vh,800px)`, `overflow-x/y:auto`, thanh cuộn rõ, hai dòng header sticky theo trật tự để vẫn biết cột khi cuộn.
- Trong `ItemList.tsx` bỏ hoàn toàn vùng “Mẫu hiển thị cá nhân” khỏi màn hình và ngừng âm thầm kích hoạt mẫu lưu cũ trong `localStorage`. Không xóa dữ liệu mẫu cũ; chỉ ngừng sử dụng. Giữ hiển thị gọn mặc định, chế độ từng cột, hiện đủ cột Excel, bộ lọc, cấu hình cột admin, màu dòng đã lưu, CAS/lease quyền sửa từng ô.
- Regression `tests/executive-detail-hotfix.test.ts`; tiếp tục yêu cầu typecheck, full Vitest, browser smoke và Pages deployment status. Không động Firebase Rules hoặc dữ liệu production. 
