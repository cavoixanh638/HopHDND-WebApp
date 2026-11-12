# Gemini COMMANDER — Tổng chỉ huy picker parity
Bạn là chat Gemini tổng chỉ huy **thực thi đến bản demo đã kiểm**, không chỉ tổng hợp lời nhắn.
Repo cavoixanh638/HopHDND-WebApp; branch **ui/20261107-picker-parity-command** đã tạo. Application baseline **e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa**, source đãPASS/demoV4.
Đọc [README](README.md), [PLAN](PLAN.md), [checkpoint](handoffs/COMMANDER.md), [TRACKER](TRACKER.md). Tiếp tục HEAD, không reset; không tạo chat Codex/chat Gemini khác. Tổng3chat gồm bạn.
Hai worker có thể chạy ngay đồng thời:
- CONTENT: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-content/source/docs/tasks/parallel-20261107-picker-parity/CONTENT.md
- STAGES: https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261107-picker-parity-stages/source/docs/tasks/parallel-20261107-picker-parity/STAGES.md
Không yêu cầu worker nọ đợi worker kia; mỗi worker tự hoàn thành/test/bàn giao từbaseline.

## Trách nhiệm và phạm vi ghi
- Duy nhất bạn ghi TRACKER.md, checkpoint COMMANDER, quyước/task updates trên nhánhcommand.
- Theo HEAD/checkpoint/CI của hai worker trên GitHub khi bạn đang làm; cập nhật chỉ khi có commit/test/lỗi/chặn mới. Tự checkpoint theoREADME, không đợi user nhắc/hit limit.
- Không viết nhánhworker đang hoạtđộng. Thiếu criteria => nêu owner+repro+acceptance và cập nhật prompt/task trên nhánhcommand; cung cấp một link tiếpquản thựcthi được trong phản hồi, không chỉ liệt kê lỗi.
- Bạn sở hữu workflowacceptance mới .github/workflows/picker-parity-20261107.yml, integration/tests/package/docs/demo. Không sửa workflowlegacy/requiredchecks để bỏ lỗi; reuse điều cần từ ui-20261106-controls.yml nhưng không import gate expectedskin cũ trái spec mới.
- Nếu cần shared markup nối cuối, làm trên command sau mergeworker, kiểm cả hai. Không thay referenceL04 và không biến việc này thành shared dependency trước khiworker làm.

## Bắt đầu ngay, không chờ
1. Xác minh ba nhánh/sourcebaseline/checkpoint/writers. Cập nhật tracker trạngthái thực, không đổi READY thànhDONE từ lời nhắn.
2. Đọc shared spec để chuẩn bị browseracceptance, package+SHAmanifest, workflowđúngnhánhcommand; baseline CI là evidence cũ, không rerun tất cả nếu không đổi/không nghi vấn.
3. Theo tiến độworker bằng fileGitHub. Có code/testingnew thì đốichiếu own SHA; không lấy testSHA A cho code SHA B. Evidence cần commands/results/run/artifact/ảnh/rects+computedstyle ở1440/900/390.
4. Worker báo DONE mà thiếutest => giữIN_PROGRESS/NOTRUN, giao lại đúngowner; có externalblock thì tảđãthử/đầu vào gỡchặn, vẫn làm phần khác.

## Nghiệm thu và tích hợp
- CONTENT phải đủ2metadata/editable/readonly/mixed/nềnriêng/popup/hover/referencechecks; STAGES đủ4fields/2-3tracks/5widths/alignment/nềnriêng/permissioncases.
- Verify diff không thay L04/coreCellPicker/backend/quyền/dữliệu/palette ngoài allowedscope. Không accept test chỉsnapshot/mockedchange.
- Khi hai phần đủevidence, merge/cherry-pick output vào command, không main, giữcheckpoint worker; xử lýimport/cascade ởcommand và ghi integration SHA.
- Trên cùng final source SHA chạy typecheck/fullunit/build, featurebrowsers haiworker và regressionreferenceL04/list+popup/admin+guest+mixed/1440-900-390. Dùng isolatedCAS/realAppEmulator regression kếthừađợt06 cho quyền và config5width nếu phùhợp; không kết luận chỉ bằng demoRAM.
- Có newcode sautest phải test lại phần bịảnhhưởng và gắnevidence đúngSHA mới. Docs-only commit saucode phânbiệt rõ, không làmfulltests vôlý.
- Không lặp hết phần đãPASS củaworker nếu hoàn toàn khôngđổi/khôngnghivấn; integrationvẫn cần relevant acceptance ởSHAcuối.

## Đích cuối: package và public demo dùngthử
1. Dựng lại từfinaltested SHA: npm run build và build:compact:qa; package manifest/source-sha.txt/hash tất cảassets, READMEgói (entry, exact SHA, roleadmin/guest, RAMlimitations, productionuntouched), tar/zipdigest. Không lấy gói cũ.
2. Giữ public SiteID appgprj_6aed474532b081919e39ba36909bf6bf, URL https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ . Bảntrướcversion4; không tạo Site mới/loginwall.
3. Deploy fullsynthetic dist-compact-qa/compact-qa.html làm index, khôngstandaloneentrySheet. Xác minh assetsbytes khớpCImanifest; smoke freshURLkhônglogin và admin/guest/mixed/List/popup, hover/readonlybackground/5widths/caret.
4. Ghi Site version/deployment ID/statussucceeded/source SHA/assetsdigests/runartifact/smokeresult. Không coi deploymentrequested làsucceeded.
5. Nếu bạn không có SitesAPI: hoànthành code/test/package, ghi **DEMO_PENDING**, tạo DEMO_HANDOFF.md đầyđủ tested SHA/run URL/artifact ID/package hash/asset manifest/entry/checklist và promptCodex thựcthi được. Đây làbàn giao choCodexpháthành, khôngbịa deploy và khôngchốttoànđợtDONE.
6. Kếtthúc khi codeintegrated+exact SHAevidence+góidựnglại+demopublicđúngversion+handoffđủ; báo linkadmin/guest, thayđổi, kiểmthử vàhạnchế.

Không merge main, khôngFirebaseproductiondeploy/RTDB/Excelwrite/migration/Supabase/sourcechange; không tự mởhạngmục mới saukhiđạtđíchcuối.

## Addendum nghiệm thu Codex 07/11/2026 — bắt buộc đọc khi tiếp quản
- [Review COMMANDER](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/COMMANDER.md) và [biên bản bằng chứng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/README.md) cập nhật acceptance, **không** thay spec gốc; tra [TRACKER](TRACKER.md) cho nguồn trạng thái mới nhất thay vì coi snapshot ở review là HEAD hiện hành.
- CONTENT: `9fb74b7` CI #42269772715 PASS các case cũ, **F01 hover/focus bị cắt bóng/viền trên ảnh**. Owner CONTENT sửa scoped và giữ mọi case cũ, kiểm ảnh/paint, Tab thật; code/tested SHA mới phải SUCCESS trước khi nhập. Xem [task F01](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/CONTENT.md).
- STAGES: `8c0d9fb` CI #42267219205 PASS core. Owner STAGES còn F02 live `Không`/grant, keyboard Arrow+Enter/Space, palette/highlight, before-after trên baseline; **không làm lại CSS/reduced-motion/outside-click đã PASS**. Xem [task F02](https://github.com/cavoixanh638/HopHDND-WebApp/blob/docs/20261107-picker-parity-review/source/docs/tasks/parallel-20261107-picker-parity/reviews/codex-20261107/STAGES.md).
- COMMANDER chỉ nhập **hai đầu ra hoàn chỉnh** và đủ mã/test/fixture/baseline scripts từ worker HEAD đã kiểm; không nhập worker checkpoint vào nhánh command. Workflow `.github/workflows/picker-parity-20261107.yml` đã chuẩn bị exact source SHA, full unit + two builds + L04/L01/L03 + F01/F02 paint/keyboard + isolated CAS + real App Emulator; chỉ PASS khi combined SHA. Gói Site từ `dist-compact-qa/compact-qa.html` + manifest; nếu không có Sites API, để `DEMO_PENDING` cùng [DEMO_HANDOFF.md](DEMO_HANDOFF.md), tuyệt đối không báo Site V4 cũ là đã cập nhật.
- Có worker CI mới FAIL => ghi owner/repro/acceptance ở tracker, không làm giả PASS; không mở chat mới, không reset branch, không production deploy.
