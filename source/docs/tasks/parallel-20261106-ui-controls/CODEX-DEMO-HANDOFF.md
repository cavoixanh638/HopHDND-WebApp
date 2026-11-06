# CURRENT — CODE ACCEPTED / PUBLIC DEMO V4 PUBLISHED — 07/11/2026

Codex đã kiểm bàn giao và cập nhật [demo admin mô phỏng](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/?full=1&preview-role=admin) trên **Site hiện có**, phiên bản **4**, deployment `appgdep_6aee09f2c7308191a83b6c9843b2b486` **succeeded** lúc 07/11/2026 00:10:25 UTC+7. Thay thế trạng thái SITE_DEMO_PENDING ở lịch sử phía dưới.

Source/test SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`, CI #42256616362 **3/3 SUCCESS**. Đã đối chiếu bytes artifact và JS/CSS trên URL live, HTTP 200 không login, thử 5 widths lưu riêng + grid đúng 120/80/180, skin nhân sự cũ + caret tam giác 5×3, dropdown mở/Escape và popup 4 hồ sơ. Site source SHA `c85a23330e1dabbe40fdfabe81be3bb3c3a6c619`.

[Receipt đầy đủ và phạm vi kiểm chứng](CODEX-DEMO-RECEIPT.md). Responsive/guest/mixed/reference/persistence/CAS có CI đúng SHA; live smoke ở viewport mặc định, không tuyên bố lặp toàn bộ matrix live. Worker PICKER own-checkpoint vẫn WIP; accepted/fixed trên COMMANDER integration, không sửa giả trạng thái worker. Không main merge/Firebase production/Excel/migration live.

---

# CODEX-DEMO-HANDOFF — code/package PASS; trạng thái triển khai Site chưa xác minh

**Status: CODE_AND_PACKAGE_PASS / SITE_DEMO_PENDING.** Điều kiện CI và full synthetic package đã PASS cùng SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`. Môi trường hiện tại không có Sites API; nhiệm vụ **xác minh/cập nhật Site hiện có** là bước còn lại, không tạo Site mới.

## Đích cố định
- Site ID: `appgprj_6aed474532b081919e39ba36909bf6bf`.
- URL công khai phải giữ nguyên: https://hophdnd-demo-20261106.charmingscone.chatgpt.site/
- Version Site trước đợt từng được ghi là `3`; **chưa xác minh version hiện tại trực tiếp bằng Sites API**, phải kiểm trước khi ghi đè.
- Quyền truy cập: public, không login wall. Giữ toàn bộ cấu trúc full synthetic cùng role switch; không deploy Firebase/Google Sheets.
- Nguồn GitHub: `cavoixanh638/HopHDND-WebApp`, branch `ui/20261106-controls-command`, path `source/`.

## Trước khi chạy Sites
1. Checkout **exact final tested source SHA** từ checkpoint COMMANDER; HEAD tài liệu trên coordination có thể mới hơn và KHÔNG phải build SHA. Không dùng branch tip đã đổi. Mọi gate ACCEPTANCE-MATRIX.md C01–C14 phải PASS cùng SHA, CI run success kèm artifact immutable `ui-20261106-controls-<runid>-<sha>`; tải ZIP artifact và kiểm lại manifest.
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

## Bằng chứng và checksum sẵn sàng cho Codex
- **FINAL_TESTED_SHA**: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`. Chỉ dùng exact source này, không lấy HEAD hiện tại nếu là commit docs sau đó.
- **CI**: [#42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362), completed SUCCESS **3/3 jobs**, 2026-11-06 17:00:13Z (07/11 00:00:13 UTC+7), 905 unit PASS/116 skipped, PICKER 48/48 reference, TRACKS 6 browser scenarios, real App QA01–QA10 PASS.
- **Artifact full synthetic + screenshots/rects**: [13523312297](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362/artifacts/13523312297); **CAS** [13523391580](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362/artifacts/13523391580); **full App** [13522538680](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362/artifacts/13522538680). Retention 14 ngày.
- **CI package tarball SHA256**: `0c57bf08a6f45de00f81d83dd19b76c1af7badd4ffbad5540169695374014820`; inside artifact `qa-results/ui-20261106/full-synthetic-and-standalone.tar.gz`; accompanying `source-sha.txt`, `asset-sha256.txt`, `readme-sha256.txt`, `package-sha256.txt`.
- **FULL synthetic public assets SHA256**: HTML `af29df30d12015e8b73d0c05cc68896723a1b0bc4695314c18c3c36a5d34cc68`; JS `67f2552d6775cdfaa025f2b40f5fbeee7f0165bdf9f518870491d4dff1b4f015`; CSS `5362f1c5e74d0e241058357f846cd1b3df85302c1af0ccbcb7e009b2872f4d4c`. Path `dist-compact-qa/compact-qa.html`, asset URLs `./assets/...`, ensure root resolves correctly and root entry opens `?full=1` not standalone `Dashboard_HĐND.html`.
- **User package** `HopHDND_UI_Controls_Full_Synthetic_e095205c.zip` ZIP SHA256 `0258f2838da5799ad988c9ef42442790e2a732f64882c02c373b0b85b78ab605`. Created from verified CI asset bytes; includes README, per-file hashes, sample screenshots, exact browser rects. Also see `DEMO_PACKAGE_README.md` in branch for testing instructions.
- **Offline local HTTP smoke**: admin/guest HTML + JS/CSS HTTP 200 from local `dist-compact-qa`; asset bytes match GitHub CI hashes. **Not a substitute for live public Site smoke.**
- **Site source SHA / live Site version / deployment ID / succeeded / URL smoke**: **ALL PENDING**. Sites tool absent in this session; COMMANDER performed no operation on Site. The current live deployment state cannot be established. URL HTTP fetch unavailable from this runtime due DNS/cache error; **do not infer site is live-updated**.

## Codex Sites completion checklist
1. Query **existing Site ID** `appgprj_6aed474532b081919e39ba36909bf6bf`, verify current source, version, public access, previous deployment. Preserve Site identity and no-login policy.
2. Download same-SHA artifact, validate every file hash and choose `dist-compact-qa` FULL synthetic; adapt only Site-required wrapper/entry path if necessary, preserve functionality and record Sites source hash separately from GitHub SHA.
3. Save a new version with Sites source/save-version, deploy this version to **existing Site**, poll to `succeeded`; if failed, record reason without treating pending as DONE.
4. Smoke public URL at 1440×900/900×900/390×844, admin/guest/mixed, list/popup, four staff pickers/caret and five inputs save/reload, confirm assets returned match SHA256 and page accessible without login. Record URL, check time/timezone, Site source SHA, saved version, deployment ID/status, screenshot/rects, hash data.
5. Update `TRACKER.md` and COMMANDER checkpoint with the proof; **only then** change full-wave state from `DEMO_PENDING` to `DONE`. No production Firebase/Excel/migration writes; do not merge main.
