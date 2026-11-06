# Codex kiểm tra và phát hành UI controls — 07/11/2026

**CODE/PACKAGE VERIFIED; PUBLIC DEMO V4 DEPLOYED.** [Mở admin mô phỏng](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/?full=1&preview-role=admin), [mở khách](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/?full=1&preview-role=guest).

## Kết luận kiểm tra bàn giao
- Final source/test SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`; trực tiếp đọc jobs API [CI #42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362): controls-and-package, isolated-cas, real-app-emulator đều SUCCESS cùng SHA.
- Artifact gốc `13523312297` đã tải, tar SHA256 `0c57bf08a6f45de00f81d83dd19b76c1af7badd4ffbad5540169695374014820`; source-sha.txt và hash HTML/JS/CSS đều đối chiếu đúng.
- Reference diff trong artifact: `ab8629c7575debd494c908c14bde9967a575a82a`, 48 comparisons, errors=[]; PICKER after summary PASS. TRACKS measured-rects có 6 admin/guest cases ở 1440/900/390. CI ghi 905 unit PASS/116 baseline skips và full App Emulator QA01–QA10 PASS, bao gồm lưu/reload 5 widths.
- Worker PICKER checkpoint riêng còn WIP chưa own-test. Không đổi trạng thái giả trên worker: commander đã nhập, sửa cascade/caret và nghiệm thu trên **source tích hợp** nêu trên. TRACKS có dedicated own-SHA PASS. Không bắt làm lại phần đã PASS trên integrated source.
- Các workflow legacy đỏ ngoài dedicated acceptance đã được commander ghi riêng; không tuyên bố toàn bộ workflow trong repo đều xanh.

## Bản phát hành
- Site `appgprj_6aed474532b081919e39ba36909bf6bf`, giữ **public**, giữ URL cũ, không tạo Site mới.
- Previous version 3; new version **4**, ID `appgprj_6aed474532b081919e39ba36909bf6bf~appgver_5f2a8be11c1c819188bcfb3b6ba99ceb`.
- Sites source commit `c85a23330e1dabbe40fdfabe81be3bb3c3a6c619` (kho chứa asset đã build; khác GitHub application source SHA).
- Deployment `appgdep_6aee09f2c7308191a83b6c9843b2b486`, **succeeded**, timestamp máy chủ `2026-11-06T17:10:25.338525+00:00` = **07/11/2026 00:10:25 UTC+7**.
- Archive digest `sha256:79eb92454c5ce2d50edaaa591d7a350b00b7f6c6e6dbaf1dba6f56173c0762bd`, 4 files: manifest + index + JS/CSS. Không đưa screenshot/witness/ZIP hoặc dữ liệu thật lên Site.
- Full synthetic entry `dist-compact-qa/compact-qa.html` đổi tên thành index.html, bytes không đổi. Không dùng standalone Dashboard_HĐND.html.
- HTML SHA256 `af29df30d12015e8b73d0c05cc68896723a1b0bc4695314c18c3c36a5d34cc68`.
- JS `compact-qa-DlAwb8cA.js` SHA256 `67f2552d6775cdfaa025f2b40f5fbeee7f0165bdf9f518870491d4dff1b4f015`.
- CSS `style-BtfemB_q.css` SHA256 `5362f1c5e74d0e241058357f846cd1b3df85302c1af0ccbcb7e009b2872f4d4c`.

## Kiểm tra live sau publish
- HTTP GET mới không cookie/credential: 200, không redirect login, root HTML trỏ đúng hai asset mới; tải JS/CSS từ public URL và SHA256 khớp cả hai hash CI. Không dùng tab cũ/cached UI để kết luận.
- Reload trình duyệt, vào admin mô phỏng: thấy **L03 · Chỉnh 5 độ rộng cột nhỏ** và 5 input đúng hai mode.
- Thử readonly label/status **110/170**, editable label/level/status **120/80/180**, lưu một lần: tổng tự tính **311/419 px**. Đo DOM mode editable: grid **120px 80px 180px**. Không còn input tổng cụm.
- Lãnh đạo UBND control live: font 11px, height 26px; caret **5×3px**, filled triangle clip-path polygon(0 0,100% 0,50% 100%). Mở dropdown được, Escape đóng được.
- Báo cáo → bấm Sở chưa trình Thành ủy → popup 4 hồ sơ mở/đóng được; quay lại Danh sách và để editor 5 widths mở cho người dùng.
- Live smoke này kiểm thao tác tại viewport mặc định. Ma trận 1440/900/390, guest/mixed, reference skins và persistence/CAS/reload backend đã có bằng chứng CI đúng asset SHA; không ghi là đã lặp toàn bộ ma trận trên live Site.
- Dữ liệu và config demo dùng RAM; reload có thể khôi phục mặc định. Lưu/persistence thực được chứng minh bằng App + Emulator, không phải production.

Không main merge; không Firebase production Hosting/Rules/Functions/RTDB/Excel writes; migration PREPARED_OFFLINE/LIVE_HOLD. Phần triển khai được giao đã có URL dùng thử. Các lần sửa tiếp theo giữ Site ID này.
