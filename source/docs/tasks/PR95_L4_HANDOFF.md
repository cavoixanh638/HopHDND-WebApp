# PR95 — L4 HANDOFF: KIỂM TRA ĐẦU VÀO EXCEL A–O

**Luồng:** L4, độc lập L1/L2/L3. Ngày 30/10/2026.
**Commit nguồn:** 01530a9ccedba021434626c1f717c2ac76fcaa64.
**Branch:** pr95/l4-excel-validation-20261030.
**CI-only DRAFT PR:** https://github.com/cavoixanh638/HopHDND-WebApp/pull/109, base tạm pr95/l4-ci-base-20261030 tại đúng SHA nguồn; **KHÔNG MERGE / DEPLOY / PUBLISH**. L1 quyết định tích hợp.

## File đã sửa (chỉ trong quyền L4)
- source/src/data/business-excel.ts
- source/tests/business-excel.test.ts
- source/tests/pr95-l4-excel-contract.test.ts (mới; workbook và expected độc lập)
- source/docs/tasks/PR95_L4_HANDOFF.md (file này)

Giữ API parser (các export và interface) và thư viện dùng chung. Không sửa shared fields, gviz-parser, reporting, UI, Firebase backend/Rules hoặc dữ liệu thật.

## Lỗi/rủi ro và cách sửa

| Mã | Hiện tượng cũ | Khắc phục |
| --- | --- | --- |
| E01 | C/D thiếu/đảo khiến báo lỗi chung không tìm được tiêu đề | Dò header bằng cột neo không hỏng; báo chính xác Sheet, dòng, cột; H/I và L/M so theo vị trí, không tự đảo. |
| E02 | Dòng trống ở giữa hồ sơ bị âm thầm bỏ | Chặn dòng vật lý; không tự bỏ/điền. Các hàng cuối hoàn toàn trống không thành hồ sơ. |
| E03 | GViz parser trim() tất cả chuỗi làm mất khoảng trắng đầu/cuối | GViz chỉ kiểm phân loại và cấu trúc; trả lại chuỗi Excel nguyên bản cho 13 trường text, giữ dấu, newline, N = tiến độ, O = ghi chú. |
| E04 | STT thập phân bị định dạng Excel làm tròn về số nguyên | Kiểm tra cả biểu diễn và giá trị số thô ở B; chỉ nhận số nguyên dương an toàn. |
| E05 | Mã có khoảng trắng rìa bị cắt trước khi tạo ID; Unicode/case duplicate lọt | Chặn mã có khoảng trắng rìa; so trùng theo NFC (giữ phân biệt chữ hoa/thường theo hợp đồng; không đổi giá trị), ID exact UTF-8 hex của code, không phụ thuộc thứ tự. |
| E06 | Dữ liệu cột P trở đi, công thức, Excel error cell không được chỉ tọa độ rõ | Chặn theo sheet, dòng, cột/ô, kể cả cached formula; không mở rộng A–O. |
| E07 | Mã/nội dung thiếu, STT sai, trùng mã, trạng thái G/H/I ngoài danh mục | Chặn kèm vị trí và lý do, không tự sửa nghiệp vụ. |

## Test workbook giả với oracle độc lập

- Tiêu đề A–O được khai báo literal, không tái sử dụng BUSINESS_HEADERS để xây dựng oracle. Kỳ vọng toàn bộ Item gồm A–O, ID, stt, kind, note, progress được viết độc lập.
- Multi-sheet: Hướng dẫn, sheet lỗi, sheet hợp lệ; chọn sheet bắt buộc.
- Đảo H/I và L/M; C/D thiếu/đảo, tiêu đề trùng, alias đã cho phép.
- Dấu tiếng Việt; xuống dòng; khoảng trắng đầu/cuối ở text; mã 001, 0001, dạng numeric format 000; mã trùng NFC/NFD bị chặn, mã chỉ khác chữ hoa/thường có ID riêng; ID ổn định khi đảo thứ tự dòng, không va chạm; mã quá 48 UTF-8 bytes bị chặn.
- Thiếu A/C, dòng trống giữa hồ sơ; STT 0, số âm, số thực, chữ, vượt an toàn Number, số thực bị format làm tròn; loại văn bản mâu thuẫn mã; trạng thái G/H/I không hợp lệ.
- Công thức với cached result, ô lỗi t:e, cột ngoài P/Q/T.
- Đúng 1.000 hồ sơ thành công; 1.001 lỗi; đúng 5 MiB đi qua size gate rồi phải qua decoder (bytes giả không hợp lệ); 5 MiB + 1 byte bị chặn; 0 byte bị chặn.

Các lệnh cần chạy tại HEAD chính xác:
    cd source
    npm ci
    npm run typecheck
    npm exec -- vitest run tests/business-excel.test.ts tests/pr95-l4-excel-contract.test.ts
    npm test

## Tình trạng kiểm thử / bằng chứng

Bộ Vitest đã commit, nhưng **không được ghi PASS cho đến khi kết quả GitHub Actions tại exact HEAD được kiểm chứng**. DRAFT PR #109 dùng để kích hoạt Verify HopHDND source (Typecheck + Unit tests) trên workbook giả. Máy chạy L4 không có node_modules/xlsx/vitest trong container và không có npm registry; không khai báo giả local PASS. Không kiểm browser/Emulator, không chạm Firebase thật.

## Giới hạn còn lại cho L1

1. API nhận bytes và sheetName, không nhận filename/MIME, nên không thể chứng minh extension .xlsx gốc trong parser. Kiểm extension ở caller thuộc luồng khác.
2. Mã tối đa 48 byte UTF-8, dài hơn chặn thay vì cắt/hash.
3. inspectBusinessExcel.validSheets dò header và lỗi cấu trúc, không phải xác nhận toàn bộ nội dung hợp lệ. parseBusinessExcel mới kiểm mọi bản ghi.
4. Hàng cuối trống thực sự không là bản ghi; dòng trống ở giữa bị chặn. Không mở rộng danh mục trạng thái/loại VB.
5. Kiểm 5 MiB tại đúng biên là kiểm size gate, không phải workbook hợp lệ chính xác 5 MiB; chưa kiểm ZIP bomb.
6. L1 cần lấy exact branch SHA sau CI, review 4 file, cherry-pick/tích hợp theo quy trình L1. PR #109 chỉ kiểm thử, **không được merge**.
