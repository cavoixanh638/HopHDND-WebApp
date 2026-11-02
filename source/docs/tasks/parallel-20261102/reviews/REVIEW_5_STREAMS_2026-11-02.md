# Điều phối — kiểm tra 5 luồng ngày 02/11/2026

**Kết luận:** năm luồng đã bàn giao; các run chứng cứ đã hoàn tất SUCCESS tại
đúng tested SHA. Không có thay đổi code sau các SHA này (chỉ tài liệu).
**Có một finding mới COORD-01 cần sửa trong bước tích hợp. Chưa có bản ghép
năm luồng được kiểm thử; chưa merge/deploy/publish hoặc truy cập production.**

## Snapshot các nhánh đã kiểm

| Luồng | HEAD lúc rà | Tested code SHA | CI |
|---|---|---|---|
| 1 — Backend/Rules | `b8e2d3e0d9ba81840a839181f8fbbbf8a4d26031` | `46e916f31976cbbf3451ff67c22832627ca28e82` | [SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41407721643) |
| 2 — UI | `4bf2f0de5648739e23a7d5777a13bd4b7baa6fc6` | `3b0153fabe988fadfc989206eecf1fb36675ab4e` | [SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409226) |
| 3 — First import | `bc4e1aae90c0c38e222fc5561b69c5b5c4368720` | `342b8f620e4edcaead93a1e04d0f502f2a672cdd` | [SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410079477) |
| 4 — Backup/restore | `a0e16fb7bdde76436dc4fb05fb3c584854b5c48f` | `7d2525451dbb48699784b13291becd3fecf49582` | [SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409437881) |
| 5 — Release | `45680ca00eff15f9c8e537618472c8c603718074` | `005d842ed59185ea9a887a9faeef315f0e78e4b9` | [SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669) |

Chat 2 còn có [real App QA SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41410409168)
cùng SHA, QA01–QA08 8/8, 20 ảnh. Đã đọc checkpoint, report, compare baseline→HEAD,
compare tested SHA→HEAD, metadata Actions và các log nghiệp vụ liên quan.
Đây là kiểm tra bằng chứng + rà diff có trọng tâm, không phải tuyên bố đã chạy
lại toàn bộ suite hoặc kiểm toán mọi dòng mã.

## Kết quả từng phạm vi

1. **Backend:** không đổi runtime/Rules; bổ sung kiểm nhiều hàng và chuỗi
   A→B→RESTORE C→D→RESTORE E. Log xác nhận parent 14/14, cell 32/32,
   Chrome 4/4 và App 5/5; audit/backup được giữ, guest sửa tiếp sau restore.
2. **UI:** sửa Escape filter trống và race lease khi blur/unmount/refocus trước
   ACK. Chrome component 14/14 và real App Emulator 8/8 PASS. Fixture stub
   chỉ chứng minh component; kiểm tích hợp có run riêng.
3. **First import:** kiểm lại input trước CAS, marker trước ghi, exit 2 trước CAS
   và UNKNOWN exit 3 sau CAS. Log: 12 preflight negatives, lỗi kết nối trước ghi
   không đổi server, mất ACK vẫn chỉ một write và replay không đổi dữ liệu.
   **COORD-01 dưới đây chưa được các test Linux hiện tại bắt.**
4. **Backup:** manifest và snapshot phải khớp, metadata/new ACK drift làm STOP.
   Log actual full-root restore trên demo Emulator có canonical hash trước/sau
   bằng nhau, kiểm quyền/lịch sử/journal. Production chưa chạy.
5. **Release:** xây lại từ SHA sạch và lockfile, inventory/hash của sáu archive,
   dựng hai lần trùng checksum; publish guard chặn khi main rời SHA đã duyệt.
   Chỉ gói diễn tập, không phải bản web production đã được phê duyệt.

**Ownership:** sau khi bỏ tài liệu điều phối chung, tập file thay đổi của năm
luồng không giao nhau. Điều này giảm xung đột văn bản, không chứng minh bản ghép
đã tương thích; cần kiểm thử trên SHA tích hợp.

## COORD-01 — P2: guard đường dẫn biên nhận không đúng trên Windows

- File: [operator-first-import-entry.ts:84](https://github.com/cavoixanh638/HopHDND-WebApp/blob/342b8f620e4edcaead93a1e04d0f502f2a672cdd/source/scripts/operator-first-import-entry.ts#L84).
- Biểu thức: `target === checkout || target.startsWith(checkout + '/')`.
- `realpathSync/resolve` trên Windows trả đường dẫn với dấu backslash. Một
  file nằm trong checkout vì vậy không khớp prefix checkout cộng slash.
- Tái hiện bằng Node `path.win32` trong lượt review:
  checkout `C:\\repo\\HopHDND-WebApp`,
  target `C:\\repo\\HopHDND-WebApp\\private\\receipt.json`.
  `existingGuard=false` trong khi kiểm `relative` cho `actuallyInside=true`.
  Đối chứng POSIX cho cả hai true.
- **Phạm vi chứng minh:** tái hiện trực tiếp logic path, chưa chạy toàn bộ CLI
  với Firebase trên Windows. Không có truy cập production hoặc file biên nhận
  thật. Điều kiện bảo vệ sai trước khi vào các bước Auth/CAS.
- Ảnh hưởng: đường output trong checkout có thể được chấp nhận trên Windows,
  trái hợp đồng biên nhận private ngoài repo, tạo nguy cơ đưa biên nhận vận hành
  vào version control. Không khẳng định đã xảy ra rò rỉ hoặc ghi production.
- Cách sửa đề xuất: kiểm containment bằng `path.relative` + `isAbsolute` +
  `sep` sau realpath, thay vì nối separator cố định. Giữ kiểm symlink và
  exclusive create; kiểm root itself, child, sibling cùng prefix, parent,
  khác drive và đường dẫn được realpath.
- Điều kiện đóng: negative inside-checkout trên Windows và POSIX, positive
  outside-checkout, regression CLI hiện có đều đạt trên SHA sửa mới.
- Chủ sở hữu bước kế tiếp: **điều phối tích hợp**. Không yêu cầu năm luồng
  chờ hoặc mở lại các nhiệm vụ đã hoàn thành.

## Việc còn lại cho điều phối

1. Tạo candidate tích hợp riêng từ baseline chung; đưa thay đổi đã rà của năm
   luồng vào candidate, giữ lịch sử/bằng chứng và giải quyết docs điều phối.
   Không cập nhật main hoặc merge PR147 như một phần kiểm tra này.
2. Sửa COORD-01 trong candidate; chạy regression có ý nghĩa và các gate backend,
   UI, CLI, backup, release trên cùng SHA tích hợp. Dùng workflow/script đã có,
   không giao lại năm vòng QA trùng lặp.
3. Tạo gói/checksum mới cho SHA tích hợp. Artifact Chat 5 hiện tại chưa chứa
   thay đổi UI/CLI/backup của các nhánh khác, nên không dùng làm gói bản ghép.
4. Các gate production (live target/Rules/IAM, private backup, nguồn và policy,
   UAT/GO) còn NOT RUN theo phạm vi đã chốt; không suy từ Emulator PASS.

Không phát sinh yêu cầu hay tính năng mới cho các worker. Các checkpoint
worker giữ nguyên; báo cáo này là trạng thái review của điều phối.
