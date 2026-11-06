# Tracker — UI controls 06/11/2026

Baseline `8a201c1bf48c7916e4d0af9e1c0ca60cd6737632`; code baseline đã PASS 5d3aace. Mọi tính năng mới vẫn TEST_PENDING cho đến khi có evidence đúng SHA.

| Owner | Branch | Status | HEAD / code-tested SHA | Bằng chứng hiện tại | Còn thiếu |
|---|---|---|---|---|---|
| COMMANDER | `ui/20261106-controls-command` | IN_PROGRESS; DEMO_PENDING | SHA coordination thay đổi theo workflow/docs; **chưa có integrated tested SHA** | Checkpoint đầu `053931e`; workflow mới `15295e`, browser QA script `1343f3d`; CI [#42245332228](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245332228) chạy trên `1343f3d`, app-qa + CAS success, full-app đang chạy khi ghi | Tích hợp sau bàn giao hai worker; final exact-SHA test/package; demo Site proof |
| PICKER | `ui/20261106-picker-restore` | IN_PROGRESS_SURVEY | Khảo sát HEAD `4feba0b4d19e7955fc9af894ff27ea617b6d910f`; new code TEST_PENDING | Checkpoint riêng đã commit; baseline diff chỉ file giao việc/checkpoint | Reference `ab8629c`, restore 4 staff skin, caret, tests/PNG/rects |
| TRACKS | `ui/20261106-l03-tracks` | IN_PROGRESS_SURVEY | Khảo sát HEAD `903e60379d1c30aaeaaee9fd163783bd8c600927`; new code TEST_PENDING | Checkpoint riêng đã commit; baseline diff chỉ file giao việc/checkpoint | 5 track widths, config/save/merge/CAS/full preview, unit/browser/emulator/PNG |

## Events
- Kickoff: 3 nhánh cùng HEAD `0eede66c4f8c05d416084aeab08fd5a030f5bc80`; không có CI runs trên nhánh mới.
- Đã xác minh owner, ba checkpoint, baseline CI #42238116883; worker tự triển khai độc lập, COMMANDER không ghi nhánh worker.
- COMMANDER tạo workflow **RIÊNG** `.github/workflows/ui-20261106-controls.yml` (push path filters cho ba nhánh; manual dispatch; 3 jobs: app/visual/package, CAS isolated, real-app Emulator), không sửa CI cũ.
- COMMANDER tạo `source/scripts/ui-20261106-commander-smoke.mjs`, `ACCEPTANCE-MATRIX.md`, `CODEX-DEMO-HANDOFF.md`. Smoke là regression fixture, **không đồng nghĩa 5 widths/caret được nghiệm thu**. Missing worker test script chưa block CI; sẽ chuyển thành required trước final acceptance, hoặc commander tự thực hiện equivalent scripts.
- Workflow run #42245221036 bị cancel bởi concurrency sau commit script mới, **không phải FAIL**. Run #42245332228 tiến hành trên `1343f3d` (trước commits tài liệu).
- **Sites API vắng mặt trong môi trường hiện tại**: không deploy, không tạo Site mới; giữ `DEMO_PENDING` cho Site ID `appgprj_6aed474532b081919e39ba36909bf6bf`.

DONE toàn đợt chỉ khi code/tests/screenshots/package đều chung SHA final, Site hiện có triển khai `succeeded`, smoke live public và asset hash khớp. Không main/Firebase prod/RTDB/Excel thật/live migration.

## CI on worker refs — lưu ý kỹ thuật
GitHub Actions on-push chỉ tự nhận workflow khi file workflow có mặt trên **chính ref của commit push**. Workflow mới đã commit trên coordination nhưng hiện **chưa có trên hai nhánh worker** đang ghi; không ngộ nhận rằng mọi push worker đã được CI kiểm. PICKER và TRACKS tự chạy toolchain chuẩn bằng môi trường riêng hoặc **tự thêm workflow riêng/cherry-pick YAML vào chính nhánh của mình** (owner tự quyết định), không cần chờ COMMANDER; phần browser script phải kiểm đúng HEAD/SHA và upload evidence. COMMANDER không sửa nhánh worker. Khi có bàn giao, COMMANDER tích hợp và chạy workflow đã đặt trên coordination. Không tính CI absence là PASS.

### CI event cập nhật
Run [#42245720825](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245720825) exact commit `9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`: `controls-and-package` **success** (full synthetic/list/popup browser baseline smoke + SHA256 artifact `ui-20261106-controls-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`), `isolated-cas` **success** (artifact `ui-20261106-cas-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`), `real-app-emulator` đang chạy khi quan sát. Tính năng PICKER/TRACKS **chưa tích hợp**, không tính C01–C10/C15 PASS.

### CI confirmed 3/3 SUCCESS (source BEFORE feature integration)
- [Run #42245720825](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42245720825): `completed / success` cho cả `controls-and-package`, `isolated-cas`, `real-app-emulator` trên exact SHA **`9bbf45104c6a7b8696609eaf13cc2d5912cd37bc`**.
- 3 artifact: `ui-20261106-controls-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13518385649), `ui-20261106-cas-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13518945326), `ui-20261106-real-app-42245720825-9bbf45104c6a7b8696609eaf13cc2d5912cd37bc` (ID 13517841387).
- **GIỚI HẠN:** source SHA đó chỉ có script/CI điều phối, chưa có code PICKER + TRACKS. Đây là `BASELINE_COORDINATION_PASS`, **KHÔNG phải FINAL_INTEGRATION_PASS hoặc DEMO_DONE**. Cần rerun toàn bộ gates trên SHA tích hợp mới.

## 06/11 — PICKER user follow-up / candidate QA
- PICKER worker HEAD `dae2051c39ebf595d6f79f31d28125b8db04b5ca`; task code commit `f270cbd86f337f6397288856af19f9709f6e8a7e`. Worker checkpoint ghi **CODE_WIP_TEST_PENDING / NOT DONE**, tested SHA NONE, chưa có screenshot/reference compare/CI riêng.
- COMMANDER chọn đúng 5 file thay đổi code/fixture của PICKER vào candidate commit `2518d71e54ef8c9153f88265613bab8550e7929f` trên **chỉ nhánh coordination** (không sửa nhánh worker). [CI #42248060058](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42248060058) đang chạy khi ghi: đã thấy job isolated-cas PASS; app/browser PICKER script chưa kết luận.
- Cần CHECK thực computed style ::after/cascade L01/L03; exact SHA reference visual `ab8629c` cần before/reference/after. Chưa chấp nhận C01–C03; DEMO_PENDING.
