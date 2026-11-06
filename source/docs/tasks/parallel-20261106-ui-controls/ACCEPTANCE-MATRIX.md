# COMMANDER — ma trận nghiệm thu 06/11/2026 (không rút bớt check)

Reference/contract: README.md, WORKER-PICKER.md, WORKER-TRACKS.md.
Baseline `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`; reference UI bốn ô nhân sự **`ab8629c7575debd494c908c14bde9967a575a82a`**.
Điều kiện cần: cùng source SHA và bằng chứng browser/Emulator/asset hash. **Trạng thái cuối: C01–C14 PASS trên SHA e095205c; C15 DEMO_PENDING** (Sites chưa được triển khai). Các tiêu chí ban đầu không bị hạ.

| Gate | Owner triển khai/chứng minh riêng | Bằng chứng tối thiểu | Tiêu chí PASS |
|---|---|---|---|
| C01 — 4 staff picker | PICKER | Before reference và after cùng fixture/font/viewport; normal/hover/focus/open; selectors; PNG + computed styles/rects | Lãnh đạo UBND, Lãnh đạo VP, Phòng, Chuyên viên khôi phục skin trước unified; không rollback behavior/IDs |
| C02 — caret | PICKER | DOM + pseudo computed styles, screenshot + click/keyboard | Duy nhất một tam giác đặc nhỏ ở editable select list/popup, không rail, không trùng native; khóa/guest plain text |
| C03 — staff regression | PICKER | Browser pointer + Enter/Arrow/Escape, tên dài, wrap, history/lease | List và popup hoạt động, không đổi quyền/data/màu |
| C04 — model | TRACKS | Unit exact contract và source diff | `partyTrackWidths.readonly.label/status`; `editable.label/level/status`; 5 số độc lập; ngưỡng từng rail |
| C05 — migration/config | TRACKS | validate/legacy fallback/reload unit và fixture | Legacy-only deterministic RAM fallback; new profile ưu tiên 5 field; không migration live |
| C06 — merge/CAS | TRACKS | Merge disjoint/different-mode/same-field conflict/rollback unit + isolated Emulator | Chỉ field đổi bị conflict; stale revision và quyền chặn write; giữ draft trên fail |
| C07 — admin UI | TRACKS | 5 inputs + labels + computed total, save/reload/validation | 2 nhóm `Nhãn + cấp trình`/`Tiến độ` và `Nhãn`/`Cấp trình TU`/`Tiến độ`; không còn 2 input tổng |
| C08 — geometry | TRACKS | Computed CSS Grid / rail boxes / physical td rects | Tổng rail + gap + padding/border; 3 status cùng x/width; mixed column=max; label/level/status riêng |
| C09 — popup | TRACKS | Real list+ReportDetailGrid screenshot/rects, fresh popup reopen | Cùng 5 widths; popup frame preference không bị ghi đè |
| C10 — responsive | TRACKS + COMMANDER | 1440×900, 900×900, 390×844; editable/read-only/mixed; long/wrap/reorder/hide | Không overlap, không cắt glyph hay lệch status; 2/3 mode & physical width |
| C11 — integrated cross-contract | COMMANDER | Integrated SHA source diff, browser, screenshots | Picker styling không làm đổi rail; caret không gây tràn; màu, stable IDs, centered glyph, permission/CAS giữ PASS |
| C12 — type/build/unit | COMMANDER | GitHub Actions exact final SHA, logs | `npm run typecheck`, `npm test`, `npm run build`, `npm run build:compact:qa` PASS |
| C13 — browser+backend | COMMANDER | Runs + PNG/rects + emulator witness cùng final SHA | Browser thật list/popup tất cả mode; isolated Auth/RTDB/Callable CAS; full app local Emulator |
| C14 — package | COMMANDER | `source-sha.txt`, `asset-sha256.txt`, `package-sha256.txt`, README thử, artifact bất biến | Full synthetic `compact-qa.html` và assets (không phải standalone Google Sheets); mọi file có SHA256 |
| C15 — public demo | COMMANDER/Codex Sites | Site ID, version/deployment, succeeded, Sites source SHA, asset hashes, live screenshot/smoke | **Chính Site** `appgprj_6aed474532b081919e39ba36909bf6bf` public không login, đủ role/4 picker/caret/5 widths |

## QA điều phối có sẵn
- Workflow `.github/workflows/ui-20261106-controls.yml`, trigger paths / ba nhánh; không chỉnh workflow cũ. On-push on code/script và manual dispatch; checkpoint docs riêng không tạo no-op CI.
- `source/scripts/ui-20261106-commander-smoke.mjs` mới: FULL synthetic preview role guest/admin, list/administration & mixed legacy fixture, screenshots, geometry JSON, no external request. Đây là **baseline smoke**; chưa chứng minh C01–C10.
- Gói `dist-compact-qa` đến từ `source/compact-qa.html` → `src/qa/compact-qa-main.tsx`: không thêm Firebase/Sheets, `?full=1&preview-role=admin` vào full preview; `?mixed=1` dành fixture mixed cũ.
- Worker scripts tùy theo paths `ui-20261106-picker-browser.mjs` và `ui-20261106-tracks-browser.mjs` được chạy nếu có; **absence được ghi FEATURE_WITNESS_PENDING, không được tính nghiệm thu**, commander sẽ đổi thành required trước final gate.

## Ma trận browser cụ thể
Lập kịch bản tại cùng commit final: `list` và `popup` × `1440×900`, `900×900`, `390×844` × `admin`, `guest`, `mixed`. Ghi file `rects.json` nêu selector, width/khoảng cách thật, row mode, CSS custom props, x/width của 5 rail, caret count/size; Ảnh normal/hover/focus/open và skin 4 ô nhân sự. Không dùng ảnh fixture từ code SHA khác.

## Gates bất biến
Không main merge, không Firebase Hosting/Rules/Functions/RTDB production, không Excel thật, không migration live. Data PREPARED_OFFLINE/LIVE_HOLD. Không gọi DONE chỉ vì CI PASS hoặc worker DONE; phải có live Site successful deployment và live smoke.

## Biên bản nghiệm thu trên exact source SHA `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`

| Gates | Kết luận | Bằng chứng trực tiếp |
|---|---|---|
| C01–C03 PICKER bốn nhân sự/caret/keyboard | PASS | Chrome 24/24 hậu kiểm, reference `ab8629c` 48/48 ảnh trạng thái/0 sai khác; một tam giác đặc 5×3 px, không rollback IDs/permissions |
| C04–C06 model/fallback/CAS | PASS | Unit 8 TRACKS case, CAS merge từng field, Emulator Auth/RTDB/Callable; full App QA10 |
| C07–C09 admin/geometry/popup | PASS | 5 inputs độc lập, status 3 dòng cùng x/width, computed rail+gap+23px, popup frame riêng; `tracks/measured-rects.json` |
| C10 responsive + mixed | PASS | 1440×900, 900×900, 390×844; role admin/guest/mixed, list/popup, Chrome screenshots + full App Emulator |
| C11–C13 integration TypeScript/unit/build/backend | PASS | [CI #42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362) 3/3 SUCCESS, 905 unit PASS, reference diff 48/48, browser and real App QA01–QA10 |
| C14 immutable full synthetic package | PASS | GitHub artifact 13523312297 same SHA, per-file SHA256, README, tarball `0c57bf08...`, user ZIP SHA256 `0258f283...` local HTTP admin/guest smoke PASS |
| **C15 existing public Site** | **DEMO_PENDING / NOT PASS** | Sites source SHA/version/deployment/succeeded/live URL/public access/asset hashes not available; handoff `CODEX-DEMO-HANDOFF.md` |

Out-of-scope old workflow failures on worker tip remain recorded in TRACKER; do not misstate those workflows as green. **No entire-wave DONE until C15 proof.**
