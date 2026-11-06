# CODEX-DEMO-HANDOFF — Site hiện có, CHƯA ĐƯỢC DEPLOY

**Status: DEMO_PENDING.** Đây là phương án bàn giao kỹ thuật nếu môi trường Gemini/ChatGPT không có Sites API; tuyệt đối **không thực hiện** trước khi COMMANDER chứng minh exact tested SHA + full synthetic package PASS. Không tạo Site mới.

## Đích cố định
- Site ID: `appgprj_6aed474532b081919e39ba36909bf6bf`.
- URL công khai phải giữ nguyên: https://hophdnd-demo-20261106.charmingscone.chatgpt.site/
- Site trước đợt theo README: version `3`. **Không coi version này là bản tính năng mới.**
- Quyền truy cập: public, không login wall. Giữ toàn bộ cấu trúc full synthetic cùng role switch; không deploy Firebase/Google Sheets.
- Nguồn GitHub: `cavoixanh638/HopHDND-WebApp`, branch `ui/20261106-controls-command`, path `source/`.

## Trước khi chạy Sites
1. Nhận **final source SHA từ checkpoint COMMANDER** và xác minh HEAD đúng SHA đó; không dùng branch tip đã đổi. Mọi gate ACCEPTANCE-MATRIX.md C01–C14 phải PASS cùng SHA, CI run success kèm artifact immutable `ui-20261106-controls-<runid>-<sha>`; tải ZIP artifact và kiểm lại manifest.
2. Lấy `source/qa-results/ui-20261106/source-sha.txt` và đối chiếu source SHA, `asset-sha256.txt` đối chiếu **từng file** trong `dist-compact-qa`, `package-sha256.txt` đối chiếu tarball. Chặn nếu có chênh SHA hoặc thiếu asset.
3. Sử dụng **full synthetic preview** `dist-compact-qa/compact-qa.html` và JS/CSS assets tương ứng, entry `source/compact-qa.html` → `source/src/qa/compact-qa-main.tsx` → `Pr95FullPreview`. Không dùng `dist/Dashboard_HĐND.html` làm demo (standalone có thể có Google Sheets và không phải full RAM demo). Giữ request nội bộ/local-only và RAM data; không cài Firebase credentials.
4. Kiểm trên local `?full=1&preview-role=admin`: menu quản trị, 5 inputs L03, save/reload local synthetic; `?full=1&preview-role=guest`: không tùy chỉnh; bật/sửa quyền mô phỏng và kiểm mixed; list/popup 1440/900/390, bốn picker theo reference `ab8629c` ngoại trừ caret nhỏ.

## Giao dịch triển khai Sites (thực hiện trong môi trường có API Sites)
1. Query/lấy thông tin **Site hiện có theo ID**, xác nhận URL và public access. Không tạo mới.
2. Mở source hiện có của Site, chuẩn bị cập nhật source/build assets từ artifact có hash. Ghi hash Sites source trước/sau. Lưu thành version mới bằng API save-version theo quy trình Sites được hỗ trợ.
3. Gọi deploy **đúng saved version** lên **Site ID cũ**; lấy deployment ID. Poll/wait đến status `succeeded`, không suy ra deploy thành công từ lệnh submit. Nếu failed, ghi logs và DEMO_PENDING.
4. HTTP live smoke URL trên: `200`, public không login; kiểm JS/CSS asset sha trên URL với manifest; mở Chrome chế độ guest+admin+mixed, screenshot list/popup ở 1440/900/390 và xác nhận 4 picker/caret 5 widths save/reload. Lưu URL/time (timezone), version, deployment ID, status, final GitHub source SHA, **Sites source SHA riêng**, asset hashes, screenshot/rects, smoke log. Không khẳng định site mới từ cache version cũ.
5. Chỉ khi checkpoint COMMANDER có đủ evidence CI + package + Sites deployment succeeded + URL live smoke đúng SHA thì đổi tracker `DEMO_PENDING` → `DONE`. Nếu không thể truy cập Sites API hoặc verify hashes, giữ `DEMO_PENDING` và ghi blocker cụ thể.

## Dữ liệu/chống rủi ro
Site demo chỉ synthetic RAM và không kết nối production. KHÔNG main merge, Firebase production Hosting/Rules/Functions/RTDB writes, Excel thật, import/migration live. Nếu có khác biệt giữa bản site version 3 và candidate, không ghi đè bừa hoặc dùng Sites source SHA khác final source SHA mà không giải thích mapping asset/build.

## Thông tin bổ sung phải điền sau test (chưa có)
- FINAL_TESTED_SHA: PENDING
- GitHub Actions run + conclusions: PENDING
- Asset sha256 manifest: PENDING
- Package sha256: PENDING
- Site source SHA/version/deployment: PENDING
- Live smoke proof: PENDING
