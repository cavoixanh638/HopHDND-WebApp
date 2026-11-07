# Giao tiếp COMMANDER — nhận review, tiếp tục đến demo

Tiếp tục chat COMMANDER hiện có trên **ui/20261107-picker-parity-command**. Đọc HEAD,checkpoint,tracker mới nhất và [review](README.md). Không reset hoặc tạo chat/agent mới.
Spec gốc: ../../README.md; quyền phát hành chỉ publicdemo hiện có, không production.

## Cập nhật tracker theo evidence, không làm lại phần PASS
- CONTENT mới: tested9fb74b7fda1ab4492011dc675df5d656e74f6000,CI42269772715 SUCCESS,40unit/73browsercases/baselinebefore. HEAD a04e1eed chỉdocs sau testedSHA. Đóng gaps longSở/empty/HC-BC-QPPL cũ; không ghi fa9dbbe5 là kết quả mới nhất.
- Nhưng Codex xem artifact thật xác nhận **F01 clipping hover**. Trạng thái acceptance CONTENT cần IN_PROGRESS/NEEDS_FIX cho đúng lỗi này, không bác bỏ corePASS hoặc coi DONE cũ đã đủ.
- STAGES tested8c0d9fbc7284493dcb31018aa117595362b61119 CI42267219205 SUCCESS,15unit/32browser/6widths. Latest pending note lỗi thời. Giữ3gaps đãgiao: liveKhông,palette/highlight,before-after; kèm keyboardtruecoverage ởcasecấptrình.
- HEADsnapshotcommand127e19e8 cóworkflow+tài liệu, chưa sourceintegration. Nếu HEAD đã tiến thêm, đốichiếu delta mới trước khi làm; không áp snapshot cũ ghi đè người đang viết.

## Owner và link nhiệm vụ thực thi
CONTENT tiếp tục https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/CONTENT.md
STAGES tiếp tục https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/STAGES.md
Haiworker làmđồngthời từ HEAD riêng, không phụ thuộc nhau. Bạn là writer duy nhất TRACKER/COMMANDER, nhập review và tasks vào file chuẩn trên nhánh mình. Codex không viết tracker/nhánh worker để tránh haiwriter.
Bạn không tự sửa workerbranch đang ghi. Khi phát hiện thiếu mới thì cập nhật owner/repro/acceptance và handofflink, không chỉ báo lỗi.

## Công việc bạn làm ngay
1. Ghi status+SHA/evidence và owners đúng. Workflow integration đã có .github/workflows/picker-parity-20261107.yml, chưa có combinedsource run. Chuẩn bị acceptance và package/readme/handoff trong khi workers hoàn tất, không dừng ở chờ người dùng.
2. Kiểm scriptcontract/tênoutputs, retain before artifacts ở gói evidence nếu cần (CONTENTbefore script và fixture mới phải vào integration đầy đủ, không chỉcherry-pick CSS; STAGES trước-sau mới cũngvậy). Không sửa requiredchecks để bỏ lỗi.
3. Khi workers có ownSHA/evidence đủ, tích hợp source/test/fixture/workflow cầnthiết trêncommand, khôngmain. GiữscopeL04/corepicker/backend/widthmodel. Merge latestsource một lần cókiểm diff, tránh merge cả docsworker làm đètracker hoặc commonentrypoint.
4. Chạy integration acceptance đúng sourceSHAcuối: typecheck/fullunit,bothbuilds,2featurebrowsers,regressionL04/list/popup/admin/guest/mixed/5widths và cácjobCAS/quyền theo workflow. KiểmF01 bằng screenshot/paintroom ngoài computedCSS. Testsmới không được bỏcase đãPASS; docs-only sautest không làmfulltest lại vôlý.
5. Phân biệt isolatedCAS với Appconfigpersistence. Giữ regressionconfig/quyền đãgiao; nếu cần lấy evidencebaselinenochanges phải nêu lýdo/phạmvi thực, không bịa mớiPASS.
6. Build lại package từfinaltestedSHA,source-sha/assetmanifest/README/digest; publicfullsyntheticentrydist-compact-qa/compact-qa.html.
7. Publish publicSiteID appgprj_6aed474532b081919e39ba36909bf6bf URL https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ ; version4 hiện có chưa phải kếtquả đợtparity. FreshHTTP/hash/smokeadmin-guest/mixed/List/popup/hover/readonlybg/5widths.
8. Nếu không cóSitesAPI: vẫn hoànthành source/tests/package, ghiDEMO_PENDING và xuất DEMO_HANDOFF.md đủ exactSHA/CIrun/artifactID/package&assetsdigests/entry/checklist/promptCodexpháthành. Không bịa deploy hoặc coi demoV4 cũ đãsửa.
9. Ghi checkpointchủđộng theo sựkiện, khôngchờuser hỏi. Hoàn tất khi integration+exactSHAchecks+package+demo đúngversion+handoffđủ; không mở task/luồngmới ngoài tiêu chí.

Khôngmerge main/Firebaseproduction/RTDB-Excelwrites/live migration. Không chữa thiếuevidence bằngđổi yêu cầu hoặc đánhDONEgiả.
