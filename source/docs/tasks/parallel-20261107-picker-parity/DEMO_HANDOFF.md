# DEMO_HANDOFF — picker parity 07/11/2026 (public Site hiện có)

**Status: INTEGRATED_QA_PASS / DEMO_PENDING.** Đã có source SHA, 3/3 CI SUCCESS và gói có SHA256. **Chưa có bằng chứng Site đã được deploy**, không dùng phiên bản cũ làm bản parity.
COMMANDER là writer duy nhất file này trên `ui/20261107-picker-parity-command`. Cập nhật đầy đủ phần receipt ở cuối **sau** khi tất cả integration jobs và package artifact PASS đúng source SHA.

## Điều kiện trước khi phát hành (hard gate)
1. Đọc [TRACKER](TRACKER.md), [COMMANDER checkpoint](handoffs/COMMANDER.md), [README/spec](README.md), [review F01/F02](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/README.md). Chỉ phát hành khi F01 CONTENT và F02 STAGES có own-SHA/browser chứng cứ và COMMANDER đã tích hợp **cả hai** trên một commit; không dùng source baseline, không dùng Site version4 trước đợt này.
2. Lấy `FINAL_TESTED_SHA` và CI run ID từ receipt bên dưới; truy cập `.github/workflows/picker-parity-20261107.yml` run tại nhánh command. Xác minh ba job: `integrated-browser-and-package`, `isolated-cas-and-permissions`, `real-app-emulator` đều `completed/success` **cùng head_sha**. Nếu có source change sau run thì phải test lại phạm vi bị ảnh hưởng; docs-only commit sau khi test phân biệt rõ với code tested SHA.
3. Tải **artifact đúng run ID/SHA** `picker-parity-20261107-<runid>-<sha>`; xác minh `qa-results/picker-parity-20261107/source-sha.txt` = `FINAL_TESTED_SHA`, `asset-sha256.txt` khớp mọi tệp dưới `dist/` và `dist-compact-qa/`, `package-sha256.txt` khớp `picker-parity-20261107-full-qa.tar.gz`, `readme-sha256.txt` khớp `PACKAGE_README.md`. Kiểm cả file list thực tế, không chỉ digest của ZIP GitHub Actions.
4. Bằng chứng UI phải có: CONTENT F01 không clip painted hover/focus (ảnh thực cùng computed rects/clip ancestors); 1440/900/390 List+popup metadata/mixed/readonly nền riêng, STAGES cấp trình Không/keyboard/palette/highlight/before-after/5widths, L04 reference bất biến, smoke full synthetic App admin/guest/mixed, CAS + emulator thực (isolation only). Nếu thiếu, giữ DEMO_PENDING.

## Chính xác artifact nào được triển khai
- Repo: `cavoixanh638/HopHDND-WebApp`. Source gói dưới `source/` từ commit `FINAL_TESTED_SHA`.
- **Public demo entry: `dist-compact-qa/compact-qa.html` (full synthetic App).** Đưa HTML đó thành `index.html` của Site và giữ nguyên đường dẫn/bytes những file `dist-compact-qa/assets/*` tương đối kèm theo. Không dùng `dist/Dashboard_HĐND.html`, standalone Sheet entry hoặc offline-export single HTML để thay full synthetic; không thay mã application khi copy.
- Vai trò **admin**, **guest**, **mixed** là mô phỏng bằng query/UI trên dữ liệu RAM, **không có mật khẩu/tài khoản production**.
- Chạy thử artifact local, thư mục cha chứa `dist-compact-qa`:
  ```sh
  python3 -m http.server 8080 --directory dist-compact-qa
  ```
  Admin: `http://127.0.0.1:8080/compact-qa.html?full=1&preview-role=admin`
  Guest: `http://127.0.0.1:8080/compact-qa.html?full=1&preview-role=guest`
  Mixed: `http://127.0.0.1:8080/compact-qa.html?mixed=1`
  Popup mixed fixture: `http://127.0.0.1:8080/compact-qa.html?popup=1&popup-mixed=1`

## Đích Site bất biến (KHÔNG tạo mới)
- **Site ID:** `appgprj_6aed474532b081919e39ba36909bf6bf`
- **URL:** https://hophdnd-demo-20261106.charmingscone.chatgpt.site/
- Version hiện hành tại đầu đợt 07/11: **4**; không coi là parity đã cập nhật.
- Site public không login wall. Không đổi cấu hình production Firebase/Rules/RTDB/Google Sheets hoặc tài khoản.
- Nếu môi trường COMMANDER không có Sites API, chỉ ghi package + handoff này và DEMO_PENDING, giao cho Codex/nhà phát hành có Sites API. Không suy đoán deployment ID/status thành công.

## Prompt Codex phát hành (chỉ chạy sau hard gates)
> Tiếp nhận đúng `cavoixanh638/HopHDND-WebApp` trên nhánh `ui/20261107-picker-parity-command`. Đọc `source/docs/tasks/parallel-20261107-picker-parity/DEMO_HANDOFF.md` và `handoffs/COMMANDER.md`. Chỉ sử dụng `FINAL_TESTED_SHA`/run/artifact IDs/hash đã điền đầy đủ và xác thực ở receipt. Kiểm mọi checksum trong artifact; không tự rebuild trên SHA khác khi không kiểm lại. Dùng Sites API có quyền để lấy Site ID `appgprj_6aed474532b081919e39ba36909bf6bf`, kiểm public URL và current version; **không tạo Site mới**. Copy `dist-compact-qa/compact-qa.html` thành public `index.html` + chính xác `assets/*`; lưu Sites source version mới; deploy *saved version* tới ID cũ; chỉ coi thành công khi status `succeeded` (ghi version, deployment ID, Site source SHA) và kiểm HTTP live mới không login + hash JS/CSS/HTML so manifest, trình duyệt admin/guest/mixed/List/popup/hover không clip/readonly backgrounds/5 widths tại 1440,900,390. Ghi run, artifact, hashes, thời gian, screenshots, smoke results vào checkpoint COMMANDER + TRACKER trên đúng branch; không merge main hoặc Firebase production deploy. Nếu không có API, thiếu checksum, CI FAIL hay live smoke chưa khớp, giữ DEMO_PENDING và ghi blocker/bước gỡ cụ thể.

## Bộ smoke live bắt buộc (sau deploy)
1. HTTP GET URL public từ phiên mới/no cache trả 200, không redirect login; kiểm HTML full synthetic marker và không phải standalone Sheet; JS/CSS assets trả 200 và SHA256 đúng manifest. Dùng chính URL vừa deploy, không tin cache/version4.
2. `?full=1&preview-role=admin` List: Sở trình, Loại văn bản, 4 ô L03, 4 picker nhân sự chuẩn. Hover/F01 có đủ viền và bóng, keyboard focus không bị clip; nút L01 vừa nội dung, L03 width theo 5 settings; popup dropdown chọn/Arrow/Enter/Escape/click ngoài.
3. `?full=1&preview-role=guest` và `?mixed=1`: từng field deny là plain text không fake button/caret, nền riêng không mất; Cấp trình Không khóa status Thành ủy nhưng các status còn lại theo đúng quyền.
4. Popup/list 1440×900, 900×900, 390×844; scroll/resize, long Sở/type HC/BC/QPPL, palette/highlight, 2/3 tracks, widths config thử ít nhất hai bộ theo spec. Kiểm không overflow trang, không biến đổi dữ liệu.
5. Record screenshots/measurements + timestamp (Asia/Bangkok), actual public deployment version + ID, source SHA + asset hashes. Ghi rõ RAM demo **không chứng minh persistence production**.

## Receipts — mã và CI ĐÃ ĐỦ, Site vẫn PENDING
| Trường | Giá trị đã kiểm chứng |
|---|---|
| Integrated final source/tested SHA | **`a6aa9f13aeac8a12add4a479dc7c1f97e91180db`**. Integration 19-file import commit `d743097c03feee733192a399121af699528fd1ea`, followed by workflow root guard and mounted-popup test harness fix; only docs changes after exact SHA. |
| CI integrated run URL / exact SHA / 3 job conclusions | [#42387329892](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42387329892), head_sha exact above, **completed/success; 3/3 jobs SUCCESS**: integrated-browser-and-package, isolated-cas-and-permissions, real-app-emulator |
| Full QA artifact ID, file name and ZIP digest | [#13580282257](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42387329892/artifacts/13580282257); `picker-parity-20261107-42387329892-a6aa9f13aeac8a12add4a479dc7c1f97e91180db`, 56,456,894 bytes, **ZIP SHA256 `5a5fb114ea3995d6ff01287e2510f1738a3282de38c6ac50761f12072885e048`** |
| `source-sha.txt` / `asset-sha256.txt` | Inside full QA artifact at `qa-results/picker-parity-20261107/`; `source-sha.txt` created from `GITHUB_SHA=a6aa9f13...`; per-file asset manifest created from `dist` + `dist-compact-qa` and **`sha256sum -c asset-sha256.txt` succeeded** in same CI. Operator must independently recheck extracted bytes before publishing |
| Package TAR SHA256 | `picker-parity-20261107-full-qa.tar.gz`: **`7feb06bc2e33fbf5d007336c8e71787d46d08da08dd2ad99321bb599851bec01`** (from CI package step); file digest receipt stored in `package-sha256.txt` |
| CONTENT F01 exact SHA / run / paint proof | `23fefefb5ae73a75c12634c336e64c1b94e3996e` / [#42382463641 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42382463641), artifact [13578111725](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42382463641/artifacts/13578111725); integrated F01 24 real Chrome scenes 0 clipped, prior 24/24 clipped |
| STAGES F02 exact SHA / run / proof | `835b45c623014c31315504be9bfa34355c0d5be7` / [#42378516213 SUCCESS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42378516213), artifact [13576553352](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42378516213/artifacts/13576553352); integrated F02 54/54 real Chrome, STAGES before-after 12 pairs PASS |
| Full real App / CAS evidence | Real-App Emulator **QA01–QA10 all PASS**, 27 screenshots, artifact [#13580123622](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42387329892/artifacts/13580123622), ZIP SHA256 `2e369c28e9dddab14952701b7c4ff091f574ce1471afe422f245498d68cb425d`. Isolated CAS artifact [#13579768906](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42387329892/artifacts/13579768906), SHA256 `125fa5e37f24f49f60ae36cbe96c0c97f80365cf6255b91a3dd36082b79f0ddc` |
| Public Site ID / original URL | **`appgprj_6aed474532b081919e39ba36909bf6bf`**, https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ . Existing Site only, no new Site |
| Site saved-version / deployment ID / status | **PENDING — NOT DEPLOYED BY COMMANDER**. Sites API/permissions unavailable in current connector; do not infer published version from past records |
| Live public URL HTTP / asset hashes / admin-guest-mixed smoke | **PENDING — NOT RUN FOR THIS SHA**. Must verify correct deployed saved version + HTTP 200 no login, correct asset SHA, 1440/900/390 List/popup and capture receipts |

## Only remaining action: existing Site deployment and post-deployment verification
**Do not rerun or modify previously PASS worker/integration source/test suites.** The operator with Sites API can take exactly `FINAL_TESTED_SHA` and `artifact 13580282257`, independently verify the ZIP and TAR digests above, extract `dist-compact-qa/compact-qa.html` with its `assets/*`, publish as a new saved version to **existing Site ID only**, deploy saved version, poll to `succeeded`, perform public live HTTP and actual browser QA, then fill Site/version/deployment/live receipts here and [COMMANDER checkpoint](handoffs/COMMANDER.md). Do not claim Site DONE, merge main, or deploy production Firebase/Excel before that proof.
