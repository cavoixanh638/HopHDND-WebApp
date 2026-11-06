> **ĐÃ GIẢI QUYẾT L03 / OWNER ACCEPTANCE — 06/11/2026.** Các nhận xét “L03 còn lệch” và prompt tiếp tục ở phía dưới là *bằng chứng phát hiện lịch sử*, không còn là tác vụ mở. Sửa tối thiểu `item-frame.css`: `.compact-stage-state:not([data-editable="true"]) > .compact-part { align-items:center; }` để căn chữ trong khối flex 36px; không sửa picker, font, quyền hay width đã PASS. Đã bổ sung Chrome `Range.getClientRects()` thực cho list/popup, readonly/editable/mixed/wrap ở 1440/900/390: **22 kịch bản, 78 cặp glyph một dòng lệch tâm Y tối đa 0,3px, 6 kịch bản wrap không cắt**, `productionRequests=0`. [**SHA `91c2dd47de85c76fad53d1778e06c2786aaa136d`**](https://github.com/cavoixanh638/HopHDND-WebApp/commit/91c2dd47de85c76fad53d1778e06c2786aaa136d) — [CI #42154518752](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752) **SUCCESS 3/3 app-qa/data-emulator/full-app**; 896 unit PASS, Full App QA01–QA10 PASS. Artifact [visual #13473048953](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473048953), [full-app #13474131683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13474131683), [data #13473843484](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473843484). New Site HTML SHA-256 `ae334d63e537a1e0f3421be27f1d4c574ddf46e6783cc93411296bc91f91e724`; Codex zip `HopHDND_REVIEW3_L03_CODEX_HANDOFF_91c2dd4.zip` SHA `b176d6da2e247b08027c0d2e4d3138bb62a9d2750fa6fafa978ff45a0fad42dc`, internal manifests verified. [Nghiệm thu chi tiết](REVIEW-3-L03-FINAL-ACCEPTANCE.md), [bàn giao Site](CODEX-SITE-HANDOFF.md). **SITE_PENDING_ACCESS vẫn giữ** do get_site 404/list_sites empty; chưa deploy, **không thay audience/ép đăng nhập**, giữ migration LIVE_HOLD, không merge main/Firebase prod.

---

# Codex kiểm bàn giao REVIEW-3 — 06/11/2026

## Bằng chứng đã kiểm

Code/test `bc5f5b4ef5eb89084f68e11e242d86a59c1ff8cc`; [CI #42147453000](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42147453000) SUCCESS 3/3 app-qa/data-emulator/full-app. HEAD khi kiểm `3a3bc453f736bd0ea3d6320391505663ffce0667` chỉ khác tài liệu. Đã đọc mã registry mới: không còn min(recordId); identity bền vững, alias/rename và regression được bổ sung. Chấp nhận bản sửa identity trong phạm vi bằng chứng này.

Đã tải trực tiếp artifact `13469864753`, tính hash bytes local:
- ZIP `64e383e58c5ad388e6bfb45df21f71ee9ff3dd708bfc9cc086b7bea12744b05c`.
- source-sha.txt đúng `bc5f5b4ef5eb89084f68e11e242d86a59c1ff8cc`.
- html-qa.tar.gz `a1203a2bf3933777d2393b67c2909d2f525ab56a2f4ced23548cbf997a656805`.
- Dashboard_HĐND.html `0f1d1044d1572ff3eb4acb2ae2b5aa9368b553ce1f101f730e4a69bac3f2106d`.
- compact-qa.html `6ddbe54181e24c34143a214948eab3fab8142cd682f6fdb5441dceadfbdf43bd`.
Tất cả khớp manifest. Copy HTML cho người dùng thử local, không chỉnh bytes.

## Điểm UI phát hiện khi đọc ảnh — owner tổng chỉ huy làm trọn

Ảnh artifact `ui-20261105-artifacts/ui-picker-readonly-1440.png` vẫn thể hiện chữ trạng thái cao hơn nhãn cùng hàng L03. Đây là yêu cầu căn dọc đã giao, không phải tính năng mới. Cần đo rect của **text thực** và sửa đến khi chữ được căn cùng hàng ở read-only/mixed.

`rects.json` chỉ đo wrapper: hàng đầu label y=526.9/h=16.8 và status wrapper y=512.3/h=46; tâm wrapper trùng không chứng minh chữ bên trong trùng. Đã đọc `ui-20261105-picker-layout-browser.mjs`: aligned() kiểm x, widths, overflow, không kiểm trục y của chữ. Vì vậy CI xanh không phủ lỗi thị giác này.

Hướng điều tra có căn cứ: trong item-frame.css, wrapper state align-items:center, nhưng .compact-part bên trong có min-height:36px, align-items:stretch; text read-only có thể bị giữ ở đầu khối. Kiểm computed styles/DOM thật trước khi kết luận nguyên nhân. Sửa tối thiểu; không ép line-height quá lớn hoặc cắt chữ khi wrap. Thêm browser assertion đo .compact-stage-title và node/value text thực (Range/client rect nếu cần) cho nội dung một dòng, cùng hàng và mixed, list/popup 1440/900/390. Với wrap kiểm block alignment/readability phù hợp, không áp baseline một dòng máy móc.

Một owner hiện có tự sửa renderer/CSS/test, chạy CI, dựng gói/hash mới; không chia cho luồng UI và luồng test phải chờ nhau. Giữ các phần khác đã PASS. Không gọi toàn bộ UI nghiệm thu xong khi ảnh còn lệch.

## Site: lỗi truy cập công cụ, chưa có thay đổi quyền

`get_site(appgprj_6ae93f17c2e48191815caef8a642fa14)` trả NOT_FOUND / project_not_found (404); `list_sites(role=owner)` trả items=[] trong tài khoản kết nối hiện tại. Không upload, không deploy, không thay đổi access policy.

Người dùng nói demo trước đây xem được không cần tài khoản. Không tự thêm rào đăng nhập. Cần xác minh đúng Site/account/workspace và giữ audience hiện có; không suy từ API 404 rằng người xem đã bị khóa. Không tự tạo Site thay thế hoặc chuyển public/private. SITE_PENDING_ACCESS. HTML local đã sẵn để thử trong lúc xử lý quyền công cụ.

Migration LIVE_HOLD, không merge main, không Firebase production writes/deploy.

## Prompt tiếp tục cho chat tổng chỉ huy hiện có

> Đọc CODEX-REVIEW3-VERIFICATION.md. Identity mới và CI bc5f5b4 đã được xác minh, không làm lại. Ảnh read-only L03 vẫn cho thấy chữ trạng thái lệch dọc so với nhãn; test chỉ assert x/width wrapper nên chưa phủ. Tự đo text thật, sửa tối thiểu CSS/renderer và test list/popup/quyền mixed, chạy đúng SHA và dựng gói/hash mới. Bạn sở hữu trọn việc này từ đầu đến cuối, không tách luồng chờ nhau. Giữ trạng thái Site chưa deploy do connector không tìm thấy Site; không thay audience, không merge main/Firebase production.
