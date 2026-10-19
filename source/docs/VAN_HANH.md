# Vận hành HopHDND — triển khai, sao lưu, phục hồi và xử lý sự cố

**Phạm vi:** bản GitHub Pages 0.7.0 đọc dữ liệu qua Google Sheets/GViz, Firebase Authentication và cấu hình dùng chung qua Realtime Database. App Google Apps Script 0.6.2 là nhánh vận hành độc lập. Tài liệu này là **quy trình tham chiếu**, không phải xác nhận các phép kiểm sản xuất đã thành công. Trạng thái thực tế duy nhất xem [CURRENT_STATE](CURRENT_STATE.md).

## 0.1. Bảng chi tiết từ ô báo cáo — phạm vi triển khai thử (19/10/2026)

- `ReportDetailGrid` là bản thử UI trên PR #3, không được bật writer Excel/Firebase. Dùng `SheetsRepository` đọc, `workspace.update` giữ nháp, `workspace.keepDraft` lưu checkpoint cục bộ; bộ phận quản trị vẫn áp dụng phân quyền và khóa sửa hiện hành. Không coi nháp cập nhật nguồn.
- Cấu hình cột riêng lưu `localStorage` theo nguồn dữ liệu/preview; **không** sao lưu lên Firebase và **không** tự đồng bộ giữa máy. Rollback code/preview không tự phục hồi preferences cục bộ; khi cần có thể bấm Khôi phục mặc định trong modal.
- Mốc mã nguồn có bằng chứng [Verify #39256157291](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39256157291), SHA `c2d13b56dd675e230c39d7364d9a9054397159e6`, chỉ dùng artifact PASS để publish preview. Khi bật ghi Excel thực trong tương lai phải có quyết định riêng về writer, quyền, ETag/recordId, chống xung đột và read-back confirmation.
- Các hướng dẫn preview hover cũ phía dưới thuộc lịch sử; đường xem trước bản Bảng chi tiết nhanh cần được xác minh riêng trước khi coi triển khai thành công.

## 0. Trạng thái hiện hành — commit và preview hover đã chốt 19/10/2026

- **Đã commit trên nhánh PR #3**: thay đổi CSS ở `b22b877c8f81d840059abd738dde5d7c9a24d0a9` và Chrome A/B test ở `cb4c276b2f649a178993ab0bb3abd192f4faca83`. Mốc kiểm mã: [Verify #39249428414](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249428414) **PASS** tại SHA test `cb4c276b2f649a178993ab0bb3abd192f4faca83`; đơn vị 352 PASS, Firebase emulator 20 PASS, Chrome smoke và đo A/B PASS. Chi tiết ở [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md).
- **Artifact bất biến, không build từ HEAD di động:** candidate digest `sha256:2d2f23ab40e21229556998de0bba0e649d15dd7e46a7ed77b370218463d21271`; publisher [#39249797389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249797389) PASS; Pages deploy [#39249822864](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39249822864) PASS. URL đánh giá được chốt: [preview/clear-cell-hover-2026-10-19](https://cavoixanh638.github.io/HopHDND-WebApp/preview/clear-cell-hover-2026-10-19/) hoặc [preview/current](https://cavoixanh638.github.io/HopHDND-WebApp/preview/current/). Các preview dated trước đó **không ghi đè** và là bản để so sánh/rollback.
- **Mốc sao lưu trước thay đổi code:** `backup/before-high-contrast-cell-hover-2026-10-19` từ SHA `68893b4ac094b991cb19b82d515da1f124ae2fa3`. **Mốc sao lưu main trước publish:** `backup/before-clear-cell-hover-preview-2026-10-19` từ SHA `d16124f0f430c0003cc6aca0cead9df520fd7c2e`. Rollback preview bằng cách ghim lại HTML artifact đã kiểm hoặc sao chép preview dated cũ **vào preview/current** trong workflow có kiểm nguồn SHA; không rollback bằng cách thay root `main:index.html`, không merge PR #3 hoặc đổi dữ liệu.
- **Bất biến cần kiểm sau thay đổi:** 5 báo cáo/cột nghiệp vụ không bị thêm giả, click phủ toàn ô số dương kể cả tổng hàng/tổng bảng, tooltip singleton `Click để xem chi tiết` 190×32px, chỉ ô đang hover có nền `rgba(9,106,113,.14)` + outline 2px `#08777B`, focus 3px; **không dùng global `body:has()` / CSS Anchor**, không layout shift/timer/blur hoặc hover tô cả hàng. So sánh lại Chrome Layout/Task/A/B và kiểm đặc biệt các trường hợp Tab/Enter/Space, cuộn, in PDF trước khi chấp nhận biến thể màu mới.
- **Phân biệt preview và production:** `main:index.html` root blob `48aff33fdac08477e38c8f4d49837eb68eee0584` giữ nguyên. **PR #3 vẫn OPEN, chưa merge.** Tránh bấm tùy tiện Lưu / Duyệt / Khóa ở preview do có thể tương tác Firebase production; dữ liệu Excel và Firebase production không được thay đổi trong nhiệm vụ giao diện/ghi tài liệu.

## 0a. Mốc preview cũ — chỉ để truy nguyên, không phải bản đang nghiệm thu

### Trạng thái phát hành preview từ CI bất biến — 19/10/2026

- Nguồn GitHub Pages chính vẫn là `main:index.html`, **không** sửa artifact minified trực tiếp. PR #3 chưa merge; preview nằm dưới `preview/current/` và `preview/ux-fixes-2026-10-19/` (không là production root).
- Lượt này ghim artifact từ **exact source SHA** `7a3a409e16b1b6621d121b09a57e9e7960c20568`: [CI #39184896725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39184896725) → [publish preview #39185030924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185030924) → [Pages #39185044694](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/39185044694), tất cả SUCCESS. Mốc sao lưu `backup/before-preview-ux-fixes-publish-2026-10-19` từ main cũ.
- Quy trình nghiệm thu: xác định rõ URL preview/production; thử chức năng không ghi trước; dùng tài khoản quản trị kiểm lưu Firebase **có kiểm soát và rollback cấu hình riêng**. Preview và site chính **cùng Firebase production**; ở preview **không thử ngẫu nhiên các nút Phê duyệt / Khóa sửa / Lưu quyền / Lưu Bảng báo cáo**, vì chúng có thể ghi thật. Test emulator không chứng minh Rules production hoặc tốc độ browser thật.
- Khi đóng PR hoặc phát hành site chính phải xác nhận mã/CI mới, quyền thực tế và thống nhất `getKpis`/bảng báo cáo; không tự merge PR để sửa 4 lỗi UI nếu chưa nghiệm thu phần quản trị đi kèm.

## 1. Phân biệt những thao tác dễ nhầm

| Thao tác | Tác động | Không tác động |
|---|---|---|
| Build / phát hành WebApp | Mã và giao diện đang phục vụ ở GitHub Pages | Không tự thay nội dung Google Sheets hoặc Firebase |
| Quay lại bản phần mềm | Khôi phục file HTML/bản phát hành trước | Không tự khôi phục dữ liệu hay cấu hình đã thay đổi |
| Sao lưu / khôi phục dữ liệu | Snapshot và phục hồi dữ liệu/cấu hình từ nguồn đã kiểm | Không tự quay lại mã nguồn |
| Đọc lại Sheets | Tải lại dữ liệu nghiệp vụ bằng GViz | Không ghi ngược dữ liệu hay phục hồi nháp |
| Lưu cấu hình | Ghi `hdnd/profile` hoặc `hdnd/permissions` sau xác thực/quyền | Không ghi vào `hdnd/items` hay nguồn Excel |

Không dùng các thuật ngữ trên thay thế nhau. Trước thao tác có khả năng ghi, xác định **môi trường, phạm vi, người phê duyệt, bản sao và cách quay lại**.

## 2. Nơi chứa mã và môi trường

- GitHub: [HopHDND-WebApp](https://github.com/cavoixanh638/HopHDND-WebApp). Thư mục `source/` chứa mã nguồn; `index.html` ở gốc repository là bản đã build phục vụ [GitHub Pages](https://cavoixanh638.github.io/HopHDND-WebApp/).
- Dự án local tương ứng: `D:\Google Drive\VP UBND\HĐND\Dashboard trình HĐND code`. GitHub chỉ là bản nhập mã tại một thời điểm, **không tự đồng bộ hai chiều với thư mục Windows/Drive**.
- Nguồn nghiệp vụ hiện hành: tệp Excel trên Google Drive qua URL Google Sheets và `gid=60961344`; xem [từ điển dữ liệu](TU_DIEN_DU_LIEU.md). Dữ liệu nghiệp vụ không được nhập sang Firebase ở giai đoạn hiện tại.
- Firebase: project `hophdnd-8b7b2`, các nhánh cấu hình `hdnd/profile`, `hdnd/permissions`. Không được mặc định coi Rules trong GitHub là Rules đang áp dụng trên server.
- App Google Apps Script (legacy) không chia sẻ quy trình triển khai với GitHub Pages. Hướng dẫn kỹ thuật riêng: [FIREBASE_PAGES](FIREBASE_PAGES.md), [DONG_BO_CAU_HINH](DONG_BO_CAU_HINH.md).

## 3. Chuẩn bị và kiểm thử trước phát hành

Thao tác tại **gốc mã nguồn** (trên GitHub là `source/`; trên Windows là thư mục dự án, không chạy ở thư mục chứa HTML phát hành):

```sh
npm ci
npm run typecheck
npm test
npm run test:firebase
npm run docs:check
npm run build:pages
```

`test:firebase` cần Firebase emulator và điều kiện thực thi phù hợp; không coi lỗi môi trường là test đã đạt. Thử nghiệm emulator không thay thế xác minh Auth/Rules thật. Chỉ build được một `dist-pages/index.html` chưa chứng minh môi trường Pages tải thành công.

Trước phát hành cần kiểm:
1. Git sạch/commit nguồn cụ thể; danh sách file thay đổi, kiểm không có bí mật, token, `node_modules`, log hoặc dữ liệu không được phép công khai.
2. Sao lưu file HTML đang phục vụ và ghi lại commit SHA cũ để quay lại được; không dùng bản mới khi chưa ghi nhận đường quay lại.
3. Ở **bản test**, đối chiếu số dòng/nguồn URL/gid, bộ lọc, KPI, xuất Excel, nháp không ghi nguồn, chế độ quản trị, quyền cấu hình.
4. Kiểm Firebase Rules đúng bản và quyền Google admin/anonymous qua môi trường thử; **không tự deploy Rules production** chỉ vì build HTML.
5. Người dùng/người chịu trách nhiệm duyệt thay đổi trước khi công bố.

## 4. Phát hành GitHub Pages và kiểm sau phát hành

1. Build từ mã nguồn `source/`, lấy đúng `dist-pages/index.html`. Copy **nội dung file build** vào `index.html` ở gốc repository; không ghi đè `source/index.html` (đầu vào Vite).
2. Commit có thông tin phiên bản, mã nguồn tương ứng và cách quay lại. Push `main` chỉ sau khi đã duyệt; Pages được cấu hình phục vụ từ gốc repository.
3. Mở URL Pages, tải mới không dùng cache, xác nhận đúng phiên bản/artifact. Kiểm **số dòng thực tế** và chức năng với tài khoản khách lẫn quản trị.
4. Lưu bằng chứng nghiệm thu vào [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md), cập nhật kết quả trong [CURRENT_STATE](CURRENT_STATE.md). Nếu trang lỗi, không gọi triển khai thành công chỉ vì commit thành công.

**Đã có CI/CD từ 16/10/2026:** `.github/workflows/verify-source.yml` kiểm thử trên Pull Request, `.github/workflows/publish-pages.yml` tự cài phụ thuộc, kiểm TypeScript, unit tests, Firebase emulator, docs, build Pages từ `source/` khi push `main`; chỉ khi đạt mới ghi `index.html` ở gốc và phát hành qua GitHub Pages. Không sửa HTML minified thủ công nữa. Việc tự build này **không tự đồng bộ** thư mục Windows/Google Drive, không deploy Firebase Rules hay thay dữ liệu Sheets. [Kết quả kiểm thực tế](CURRENT_STATE.md).

## 5. Quay lại phiên bản phần mềm (rollback code)

Khi bản mới bị lỗi, tìm commit đã phát hành ổn định, xác nhận nó chứa `index.html` đúng và tạo **commit phục hồi file đó** trên `main` (không force-push hay xóa lịch sử). Đợi Pages cập nhật rồi chạy kiểm tra tối thiểu. Nếu đã thay Firebase Rules/schema cùng lúc, không chỉ phục hồi HTML: đối chiếu độ tương thích và dùng quy trình thay đổi Rules riêng. Không tự ý khôi phục cấu hình/dữ liệu từ backup chỉ để xử lý lỗi giao diện.

## 6. Sao lưu và khôi phục dữ liệu / cấu hình

**Ba phạm vi khác nhau, phải sao lưu độc lập:**

| Phạm vi | Nguồn chuẩn và việc cần bảo vệ |
|---|---|
| Nội dung nghiệp vụ | Tệp Excel nguồn trên Drive; ưu tiên lịch sử phiên bản/bản sao của chính tệp, không xem file xuất từ WebApp là backup đầy đủ |
| Cấu hình chung và quyền | `hdnd/profile` và `hdnd/permissions` ở Firebase RTDB; bảo toàn cả revision, cấu trúc, quyền ô/dòng/cột |
| Bộ mã và Rules | Commit GitHub của HTML/source và `source/firebase/database.rules.json`; Rules **đang chạy** phải kiểm độc lập trước thay |

Quy trình an toàn: xác định phạm vi → lấy snapshot có thời điểm và checksum/phương án đối chiếu → thử khôi phục **trên bản sao hoặc emulator** → đối chiếu số dòng, cấu hình và quyền → xin duyệt → chỉ khi cần mới khôi phục production → kiểm đọc lại. Không xóa hay ghi đè kho dữ liệu thật để “thử”. Không lưu file backup chứa dữ liệu cá nhân, token hay cấu hình nhạy cảm vào public GitHub.

**Lưu ý:** Git rollback không tự phục hồi nội dung Firebase; phiên bản Firebase không được bảo đảm có bản backup tự động. Phải kiểm tra chính sách backup và quyền truy cập thực tế trước khi cam kết khả năng phục hồi.

## 7. Chẩn đoán sự cố

| Triệu chứng | Kiểm tra theo thứ tự | Giới hạn / hành động an toàn |
|---|---|---|
| GitHub Pages hiển thị **0 dòng** | Xem URL/gid đang chọn, `localStorage` khóa `hdnd.sheet-config.v1`, phản hồi GViz A:O hiện hành (các snapshot legacy A:P/A:R chỉ để đọc tương thích), quyền truy cập từ trình duyệt, lỗi console/network | Bản local từng đọc 51 dòng **không chứng minh** Pages cũng đọc được; không nhập sang Firebase để che lỗi |
| Không vào được tùy chỉnh danh sách | Kiểm Firebase Auth Google admin, trạng thái load cấu hình và điều kiện disable ở UI | Đã có phản ánh nút bị khóa khi 0 dòng; **chưa xác nhận đã sửa** |
| Không sửa được quyền ô/cột/dòng | Kiểm Auth `google.com`, email verified, `hdnd/permissions`, Rules production, baseline/revision | Không cấp quyền bằng cách mở Rules công khai |
| Sửa nháp nhưng dữ liệu nguồn không đổi | Đây là thiết kế hiện tại của Pages | Nháp trình duyệt không ghi Sheets/Firebase; cần phân biệt thao tác `Áp dụng` và `Lưu cấu hình` |
| Bản mới không xuất hiện | Kiểm commit `main`, file HTML gốc, trạng thái Pages, cache trình duyệt | Không sửa mã TypeScript bằng cách vá HTML đã nén |
| Lỗi/xung đột lưu cấu hình | Kiểm dữ liệu gốc/revision, kết nối, tài khoản, Rules; giữ nháp và đọc lại baseline | Không bỏ kiểm tra revision, không ghi lại liên tục khi chưa rõ trạng thái |

Khi chưa xác định nguyên nhân, chỉ thu thập bằng chứng không ghi dữ liệu; không nới quyền `anyone/write` để chữa lỗi.

## 8. Ranh giới tài liệu

- [CAI_DAT_VA_CHAY](CAI_DAT_VA_CHAY.md): cách chạy lệnh local và build; **tài liệu này** là quy trình phát hành/rollback/sao lưu/ứng cứu chuẩn.
- [FIREBASE_PAGES](FIREBASE_PAGES.md): schema Firebase, mô hình Auth và Rules; **tài liệu này** không lặp toàn bộ Rules.
- [SYSTEM](SYSTEM.md), [TU_DIEN_DU_LIEU](TU_DIEN_DU_LIEU.md): bất biến nghiệp vụ và ánh xạ trường; không mô tả lại trong xử lý sự cố.
- [CURRENT_STATE](CURRENT_STATE.md): kết quả đang xác nhận và các tồn tại; [WORKBOARD](WORKBOARD.md): người phụ trách và tiến độ; [KIEM_THU_VA_NGHIEM_THU](KIEM_THU_VA_NGHIEM_THU.md): bằng chứng thử cụ thể.

Không tự coi hướng dẫn này là giấy phép triển khai production, thay Rules hoặc phục hồi dữ liệu thực.

## 9. Mốc hồi phục trước tính năng mới (16/10/2026)

- **Rollback code chuẩn:** commit `6d2226467d83e518f793d5c5e97eb11b29ba2def`; nhánh dự phòng `backup/pre-features-2026-10-16` giữ nguyên trạng thái trước khi bổ sung lọc cột, mẫu giao diện, màu điều kiện, phê duyệt và khóa sửa. Không force push; nếu cần quay lại, tạo commit phục hồi từ mốc này rồi chạy CI và xác minh Pages.
- **Code phát triển:** nhánh `feat/saved-views-approval-lock-filters-2026-10-16`, PR #3 (draft khi tạo), không phát hành tự động lên main. GitHub branch/commit không chứa bản sao nội dung Excel hay Firebase.
- **Các mẫu giao diện cá nhân/màu:** trước rollback trình duyệt hoặc xóa dữ liệu browser, cần xuất/sao chép cấu hình nếu muốn giữ; lưu trong localStorage theo URL nguồn, không phải backend chung.
- **Mốc duyệt/khóa sửa:** sử dụng Firebase `hdndReviews` (admin-only) và `hdnd/control`. Khi đưa Rules mới vào production, lưu snapshot Rules đang chạy và thử emulator trước; không ghi đè toàn bộ Rules của project dùng chung. Rollback code **không tự xóa** mốc duyệt, trạng thái khóa hoặc khôi phục Google Sheets.
- **Phạm vi khóa:** nút khóa trong WebApp chỉ chặn người không phải admin sửa thử trong ứng dụng. Muốn ngừng sửa trực tiếp file nguồn, cần quản lý quyền Google Sheets/Drive tại nguồn theo chính sách riêng.

