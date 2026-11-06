# REVIEW-3 / L03 — nghiệm thu căn glyph thực và bàn giao Codex (06/11/2026)

**CODE / CI / ARTIFACT PASS — SITE_PENDING_ACCESS.** Tài liệu này bổ sung và cập nhật [REVIEW-3-FINAL-ACCEPTANCE.md](REVIEW-3-FINAL-ACCEPTANCE.md) từ vòng mã nhóm cố định. Không triển khai Site hoặc production trong vòng này.

## SHA, CI và phạm vi

- Code/test immutable SHA: [`91c2dd47de85c76fad53d1778e06c2786aaa136d`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/91c2dd47de85c76fad53d1778e06c2786aaa136d).
- [CI #42154518752](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752), head SHA đúng như trên, **completed/success, cả 3/3 jobs PASS**: `app-qa`, `data-emulator`, `full-app`.
- 896 unit tests PASS, 116 baseline skipped; typecheck/build, REF Chrome, UI Chrome, Rules/Emulator, Full App QA01–QA10 PASS; Full App 27 screenshots. `witness.json`: `checkedOutSha=91c2dd...`, `verdict=FULL_APP_QA_PASS`, `productionUsed=false`, `published=false`, `emulator=true`.
- Đã giữ nguyên registry/report business group ID fix trước đó; **không** sửa domain, dữ liệu hay Firebase production.

## Lỗi đã được Codex tái kiểm và biện pháp tối thiểu

[CODEX-REVIEW3-VERIFICATION.md](CODEX-REVIEW3-VERIFICATION.md) xác nhận glyph trạng thái **read-only** L03 nằm cao hơn nhãn cùng hàng dù bounding-box wrapper được căn giữa. Nguyên nhân trong `source/src/features/items/item-frame.css`: `compact-stage-state` được căn giữa nhưng `.compact-part` nested có `min-height:36px; align-items:stretch`, khiến text trong span nằm ở mép trên. Sửa chỉ `align-items:center` trên `.compact-stage-state:not([data-editable="true"]) > .compact-part` trong list/popup; không đổi độ rộng, chiều cao button, font-size/line-height, quyền field, caret, trạng thái hoặc dữ liệu.

Hai file QA bổ sung: `source/src/qa/compact-qa-main.tsx` (dữ liệu giả `mixed`, `popup-mixed`, `wrap-status`; popup synthetic preferences riêng để hiện field `partyLevel` bị ẩn theo mặc định) và `source/scripts/ui-20261105-picker-layout-browser.mjs` (thực thi Chromium/CDP, `Range.getClientRects()` đo chính text nodes, không chỉ wrapper; kiểm căn glyph, không cắt cả chiều ngang/dọc, no production requests, giữ kiểm picker hit-area/Escape).

## Browser geometry đã xác nhận

- **22 kịch bản thực** gồm danh sách + `ReportDetailGrid` popup, viewport 1440, 900, 390; editable, readonly/guest, quyền hỗn hợp hai/ba track, trạng thái nhiều dòng.
- **78 cặp nhãn/trạng thái một dòng** đo qua `Range.getClientRects()`, chênh lệch tâm trục Y lớn nhất **0,3 px** (ngưỡng assert 2,8 px). **6 kịch bản xuống dòng** không mất chữ hoặc tràn ngoài container.
- `UI_20261105_PICKER_BROWSER_PASS`, `productionRequests:0`; `REVIEW3_L03_POPUP_MIXED_PROBE` chứng minh popup đồng thời có `data-level-layout=editable` và `readonly` với quyền từng field độc lập, tại cả ba viewport. Trường `partyLevel` được bật *chỉ trong fixture popup mô phỏng*, không sửa cấu hình thật.
- Các bài kiểm cũ về REF marker, popup, picker pointer, keyboard/Escape, status, WIDTH, DATA và full app vẫn PASS. Sau lỗi test fixture ở intermediate SHA, chỉ sửa QA preferences, không nới business validation.

## Artifact và SHA-256 từ bytes tải về

GitHub run artifact links:
- [HTML + rects + ảnh #13473048953](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473048953)
- [Full App #13474131683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13474131683)
- [DATA Emulator #13473843484](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473843484)

| Artifact/file | SHA-256 đã tính lại |
| --- | --- |
| **Deployable** `dist/Dashboard_HĐND.html` | `ae334d63e537a1e0f3421be27f1d4c574ddf46e6783cc93411296bc91f91e724` |
| QA HTML `dist-compact-qa/compact-qa.html` | `a10853af1a4bb7ed63411adb821948a21cf6e9f69bf7c49d5da959239f9dc3b1` |
| `qa-results/ui-20261105/html-qa.tar.gz` | `e63f00494e26452af53381b78c4941feadc108a466b8aeaa3b5706d11200ae39` |
| Downloaded visual artifact ZIP | `748a68a390414077198a68c2ccd02f8df1489665ddf9afda204682e052b2ec1b` |
| Downloaded full-app witness ZIP | `98b164ab8d93e1671838bdd6aed3c43e1ac34de3c196eb3c8187d49f01b2baeb` |
| Downloaded DATA emulator ZIP | `36144c9d12b3692ff38fe80a8e83f2052af888272ae91c205c0c16dc9d16aa3e` |
| **Handoff Codex ZIP** `HopHDND_REVIEW3_L03_CODEX_HANDOFF_91c2dd4.zip` | `b176d6da2e247b08027c0d2e4d3138bb62a9d2750fa6fafa978ff45a0fad42dc` |

Kiểm bằng dữ liệu thật đã tải: `source-sha.txt` khớp SHA, `sha256sum -c` trên tar + HTML **OK**. Gói Codex cuối chứa `site_upload/Dashboard_HĐND.html`, README, SHA256SUMS.txt, artifact CI nguyên bản, `evidence/acceptance.json`, `rects-l03.json`, ảnh trước/sau tại 1440 và popup mixed/wrap tại 390. Đã mở lại ZIP và đối chiếu SHA-256 từng entry. Không upload ZIP làm website.

## Site: chưa phát hành, phải giữ nguyên audience

Codex đã kiểm `get_site(appgprj_6ae93f17c2e48191815caef8a642fa14)` trả `404 / project_not_found`, `list_sites(role=owner)` trả `[]` trên tài khoản kết nối hiện tại. **SITE_PENDING_ACCESS**: chưa có deployment succeeded, version, URL, smoke. Không tự cho rằng Site đang bị khóa; người dùng cho biết người xem trước đây vào được **không cần đăng nhập**. Do vậy **không** tự áp owner-only, không thêm login wall, không đổi access public/private, không tạo Site khác. Codex phải kết nối đúng account/workspace, xác minh quyền và *audience hiện có*, chỉ cập nhật đúng Site với HTML hash bên trên nếu quyền/visibility xác minh được, rồi ghi receipt/smoke. Nếu chưa có quyền: dừng tại `SITE_PENDING_ACCESS`.

DATA migration `PREPARED_OFFLINE / LIVE_HOLD`. Không merge `main`, không sửa Excel, không triển khai hoặc ghi Firebase production.

**Tài liệu điều hành:** [CODEX-SITE-HANDOFF.md](CODEX-SITE-HANDOFF.md), [TRACKER.md](TRACKER.md), [checkpoints/COMMANDER.md](checkpoints/COMMANDER.md).
