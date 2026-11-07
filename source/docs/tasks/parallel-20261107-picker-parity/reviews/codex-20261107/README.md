# Codex kiểm tra kết quả — 07/11/2026

Đây là snapshot review và nhiệm vụ tiếp tục, KHÔNG phải tracker runtime. Không sửa nhánh worker/COMMANDER khi các chat là writer. Tổng chỉ huy nhập kết luận này vào tracker chuẩn khi tiếp quản. Không tạo thêm chat.

## Bằng chứng đã kiểm trực tiếp
| Role | HEAD được kiểm | Exact tested code SHA | Kết luận kiểm chứng |
|---|---|---|---|
| CONTENT | a04e1eedce80998758b7adc0d4c0d137fd5a33ff | 9fb74b7fda1ab4492011dc675df5d656e74f6000 | CI core PASS; phát hiện clipping hover từ artifact, cần sửa nhỏ |
| STAGES | 25fbef378c5c2cd9152c6e8218a7887dac27fc4c | 8c0d9fbc7284493dcb31018aa117595362b61119 | CI core PASS; thiếu 3 gate evidence và kiểm keyboard chọn giá trị |
| COMMANDER | 127e19e804bf6b6d6636a5e5fe9eaed26f7683d7 | NONE integrated | Workflow đã có, chưa tích hợp source worker/chưa test integrated/chưa có package/demo mới |

- CONTENT [CI #42269772715](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715), job128071036339: mọi step SUCCESS, typecheck PASS, 40 unit PASS, build PASS, log PICKER_PARITY_CONTENT_BROWSER_PASS scenarios=73, bước baseline before capture SUCCESS.
- CONTENT [artifact13527674364](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42269772715/artifacts/13527674364), không expired. Đã tải zip và kiểm SHA256 **fc4c0a48bdfb73cbe408245f5c4a1b356dae8a65c204d74ba7b6a1d8595ae8fa**, khớp digest GitHub. Đã xem screenshot thật và JSON, không chỉ tin checkpoint.
- STAGES [CI #42267219205](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205), job128062158477: mọi step SUCCESS, typecheck PASS, 15 unit PASS, build PASS, log PICKER_PARITY_STAGES_BROWSER_PASS scenarios=32, UI_20261106_TRACKS_PASS modes=6.
- STAGES [artifact13527872811](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42267219205/artifacts/13527872811), tồn tại/không expired; digest caaff4229c8ae8a6446f7028f0dbda6470a0c1d8d1596c5e7b7d9af60fc3640d. Không tuyên bố đã tải/xem ảnh artifact STAGES trong review này; gaps được xác minh từ source script/checkpoint.
- Compare testedSHA..HEAD của hai worker đều chỉ một commit checkpoint docs-only; không có app/test delta chưa được kiểm sau những SHA PASS trên.
- Compare seed2c20202..workerHEAD: CONTENT9files, STAGES7files; đúng scope, L04/coreCellPicker/backend/width model không bị sửa.
- COMMANDER diff chỉ workflow/tài liệu; chưa có source worker. Tracker còn ghi CONTENT fa9dbbe5/IN_PROGRESS với gaps long/empty/type đã được CI9fb74b7 giải quyết. Không giao lại những gaps cũ này.

## F01 — CONTENT: hover/focus bị clip dù CSS measurement PASS
Priority P2. Source: picker-parity-content.css dòng5–10 đặt overflow-x:auto/overflow-y:hidden; không có paint room cho transform/shadow. Trigger hover ở dòng119–128 translateY(-3px), shadow/outline có extent ra ngoài heading.
Tái hiện có sẵn từ artifact đúng9fb74b7:
- 1440-list-edit-hover.png (ôQPPL trong dòng đầu): viền trên bị cắt; bóng bị clip.
- 1440-list-edit-hover.json: heading y728.1875,height26,padding0; type button y725.1875,height26,transform matrix(1,0,0,1,0,-3),outlineWidth2px.
- Heading clip bắt đầu y728.1875 nhưng nút đã lên y725.1875, chưa tính outline ra ngoài thêm2px. Computed transform/shadow tồn tại không chứng minh đã paint đầy đủ.
- Popup cũng có heading26px/padding0; cần nghiệm thu List và popup, desktop/mobile và mixed.
Owner CONTENT. Sửa scoped clipping, giữ row geometry/metadata/scroll/colors; thêm regression có clipping-ancestor/paint evidence và before/after. Không giảm lift/bỏ bóng để che lỗi. [Prompt tiếp tục](CONTENT.md).

## F02 — STAGES: core PASS, acceptance còn thiếu
Owner STAGES; không viết lại CSS đã PASS chỉ để làm lại.
- Runtime Không với grant progressParty riêng: hiện mới unit projection, không có live browser branch.
- Custom palette + member highlight ở editable và readonly, giữ background/foreground across normal/hover/focus/open: script hiện không có case palette/highlight.
- Matching BEFORE từ source e095205c cùng fixture/viewport: hiện artifact AFTER-only.
- Script hiện mở/chọn option bằng pointer và Escape; thiếu ArrowUp/Down + Enter/Space chọn thực sự. Gộp kiểm này vào case Cấp trình/Không, không tạo luồng review riêng.
Outside click/scroll/resize đã PASS tại8c0d9fb, không giao sửa lại phần đó.
[Prompt tiếp tục](STAGES.md).

## F03 — COMMANDER: tracker và đích cuối chưa hoàn tất
Owner COMMANDER. Cập nhật trạng thái theo bằng chứng hiện tại; đóng các gaps CONTENT cũ đã có73browsercases/before. Thêm F01 vào ownerCONTENT, giữ F02 ownerSTAGES.
Có thể chuẩn bị acceptance/packaging và đọc HEAD mới ngay, không chờ worker nọ làm xong mới giao worker kia. Nhập source khi đủ evidence, final exactSHA tests/build/manifest, public Site hiện có hoặc DEMO_PENDING handoff đủ nếu thiếu Sites API.
Workflow integration đã có, chưa được chạy ở combinedsource. IsolatedCAS job không tự chứng minh full App config persistence; ghi phạm vi thật và dùng regression phù hợp spec, không bịa backend checks.
[Prompt tiếp tục](COMMANDER.md).

## Cách giao tiếp
Gửi từng prompt vào đúng 3 chat Gemini đang có, có thể cùng lúc. Mỗi role tiếp tục HEAD/checkpoint mới nhất trên nhánh mình, không reset về SHA snapshot review này.
- [CONTENT](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/CONTENT.md)
- [STAGES](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/STAGES.md)
- [COMMANDER](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/COMMANDER.md)
Không cần chat thứ4. Code application không bị Codex sửa trong review; không merge main, deploy production hoặc ghi dữ liệu thật.
