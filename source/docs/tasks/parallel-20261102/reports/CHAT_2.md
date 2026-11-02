# Chat 2 — UI audit và kết quả (02/11/2026)

## Căn cứ
- Nhiệm vụ: [CHAT_2_UI.md](../CHAT_2_UI.md). Nhánh riêng: `parallel/20261102-chat2-ui`.
- Code baseline: `0a04b81dbb00979fb87aee7fc497e802058d8518`; HEAD trước sửa: `23c04997af803a6c4af741efb37ee161a9a7c5bc`.
- Baseline FULL App QA PASS: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964199 — không coi đây là QA của thay đổi mới.

## Ma trận khảo sát/coverage
| Luồng | Đối chiếu bằng chứng | Thực hiện lần này | Kết luận |
|---|---|---|---|
| Đăng nhập / quyền | Full App QA baseline, mã App.tsx | Đọc và đối chiếu gating của UI | Không thay; browser re-test NOT RUN |
| Danh sách / bố cục / mobile | Full App QA, PR95 V5/V6 browser workflows | Đọc ItemList, CSS và quy ước ID/cột | Không đổi thiết kế; browser re-test NOT RUN |
| Tìm kiếm / lọc | PR95 V6 active filters, sticky scrolling | Đọc 3 filter components, phát hiện bộ lọc Phòng/CV chặn Escape khi trống | Đã sửa điều kiện và thêm unit test; CI mới bên dưới |
| Sửa ô / khóa / nháp | PR95 picker race và FULL App QA | Đọc CellPicker, LeaseTextInput, InlineNoteEditor | Nghi vấn race khi blur lúc acquire đang chờ; chưa tái hiện và KHÔNG khẳng định lỗi |
| Lịch sử | HistoryDialog, baseline test | Đối chiếu 2 field note/specificProgress, lịch sử thật tách DEMO | Không sửa; browser re-test NOT RUN |
| Báo cáo/popup | ReportDetailGrid, modal; baseline | Kiểm tra cơ chế popup/editor/guest theo nguồn | Không sửa; browser re-test NOT RUN |
| Admin | App navigation, panel settings, baseline | Đối chiếu quyền, không sửa workflow nghiệp vụ | Browser re-test NOT RUN |

## Sửa được thực hiện
1. `source/src/features/items/RoomSpecialistFilterCell.tsx`: Escape chỉ được ngăn mặc định và xóa giá trị khi input/select Phòng hoặc CV **đang có giá trị**. Khi rỗng, để Esc nổi lên tới popup/trình duyệt giống ColumnFilterCell và CompactGroupFilterCell; không đổi AND filter, quyền, nguồn hay CSS.
2. `source/src/features/items/RoomSpecialistFilterCell.test.ts`: unit cho Escape có/không có giá trị tiếng Việt và phím Enter.
3. `.github/workflows/parallel-chat2-ui-checks.yml`: riêng Chat 2; npm ci, typecheck, test, build pages-test **không publish**.

## Tái hiện logic trước/sau
- **Trước:** mã `clear(event,fn)` luôn `preventDefault/stopPropagation` cho Escape; trong popup có bộ lọc Phòng/CV rỗng, Esc không tới `dialog onCancel`/listener lân cận. Dữ liệu nguồn không liên quan.
- **Sau:** helper `shouldClearRoomSpecialistFilter('Escape','')` trả false, còn với `'Phòng Tổng hợp'` hoặc `'Nguyễn Văn A'` trả true. Kiểm thử DOM Chrome/viewport và screenshot **chưa chạy**; đây là xác minh logic bằng unit, không phải browser PASS.

## Kiểm thử / giới hạn môi trường
- Workflow: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407686605 — SHA code `876b69d244cf1a5e6d03ae4fc0277f391c9c3a60`; trạng thái xem checkpoint mới nhất.
- Kết nối GitHub có quyền ghi; container hiện tại không phân giải được `github.com` khi `git ls-remote`, vì vậy không có clone/worktree local và không thể chạy Vite/Emulator/Chrome trên checkout thật tại đây.
- Không chạy production, không tạo dữ liệu thật. Không có screenshot/viewport/role mới; mọi kiểm chứng trình duyệt còn NOT RUN. CI test không thay thế test tương tác Chrome.
- Cần tiếp tục kịch bản đối kháng: Escape trên popup sau khi lọc rỗng, filter có giá trị, 390px/900px/1440px; LeaseTextInput blur trước acquire ACK và refocus; ghép với Firebase Emulator và ảnh giả theo role guest/admin.

## Hạn chế/ngoài phạm vi
Không sửa backend, Rules, data shared, dependency, runner QA chung, hoặc phát hành. Chưa kết luận tích hợp PASS; kế hoạch tổng thể cần đối chiếu sau QA tương tác.
