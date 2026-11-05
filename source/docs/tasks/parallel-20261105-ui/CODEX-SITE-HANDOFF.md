# Codex — bàn giao Site demo UI 05/11/2026

**SITE_PENDING. Không phát hành từ chat tổng chỉ huy này, chưa xác nhận owner-only.**

## Nguồn và điều kiện bắt buộc
- Repository: cavoixanh638/HopHDND-WebApp, branch: ui/20261105-coordination.
- Site demo riêng tư HIỆN CÓ: appgprj_6ae93f17c2e48191815caef8a642fa14. Không tạo site công khai.
- Chỉ triển khai khi GitHub Actions app-qa, data-emulator, full-app đều SUCCESS trên CÙNG code/test SHA. Skipped không tính PASS.
- Candidate source SHA ba18de621e70974732aa6d53c7371132c1371026; [CI 42009964402](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42009964402), [artifact 13407065444](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42009964402/artifacts/13407065444). app-qa + Emulator PASS, full-app chưa chốt khi soạn — **KHÔNG deploy nếu chưa PASS**.

## Candidate bytes được kiểm thực tế (thay bằng hash cuối nếu SHA thay đổi)
- dist/Dashboard_HĐND.html: SHA-256 78a3187004e64c39973cb49180d0b4cbafcdf65039932d21c2b13b11d7f48c5a.
- dist-compact-qa/compact-qa.html: SHA-256 cc9246a0cc39272a1817aa7f9761c6494fb6701b32f3d18d28310bbef5fff1e3.
- qa-results/ui-20261105/html-qa.tar.gz: SHA-256 e67ef2c35d3efe95b4a1a2c82d7fa0590c8d59311f227970ec81956eca781d26.
- Source SHA, file-sha256.txt, package-sha256.txt, screenshots, rects.json ở cùng artifact GitHub Actions. Đã đối chiếu hashes với file bytes tải về.

## Checklist Codex thực hiện khi được giao
1. Đọc REVIEW-AND-CONTINUE.md, TRACKER.md, checkpoints/COMMANDER.md; xác nhận 3 CI jobs SUCCESS đúng một SHA và không còn blocker kiểm thử. Nếu FAIL hoặc skipped, STOP và báo kết quả.
2. Tải artifact của CI PASS cuối, xác thực source-sha.txt và SHA-256 thực của HTML + archive; không dùng lại hash cũ nếu code thay đổi.
3. Mở Site ID trên bằng Sites API/owner connector; xác minh Site vẫn private owner-only TRƯỚC khi upload/publish. Không thay đổi visibility hoặc thêm viewers.
4. Chỉ upload bản demo HTML từ artifact đúng SHA, đợi deployment succeeded. Ghi version, URL riêng tư, timestamp, và SHA triển khai.
5. Smoke trên URL triển khai bằng tài khoản owner; kiểm app tải, quyền guest/admin, không có yêu cầu network Firebase production không được phép.
6. Cập nhật tracker/checkpoint yêu cầu→commit/file→test/run/ảnh→hash→Site evidence. Nếu thiếu Sites/owner permission: SITE_PENDING, không tuyên bố DONE.

## Tuyệt đối không làm
- Không merge main, không deploy Firebase Hosting/Functions/RTDB Rules production, không ghi RTDB production, không chạy migration live.
- DATA migration chỉ PREPARED_OFFLINE / LIVE_HOLD, cần GO và backup/inventory/rollback riêng.
- Không upload secrets, private credentials hoặc live data vào Site.

## FINAL supersedes prior candidate — 05/11/2026

**BẢN FINAL ĐÃ PASS CI, CHƯA DEPLOY SITE.** Mọi SHA/hash/candidate `ba18de6` ở phần trên là lịch sử, **KHÔNG dùng phát hành**.

- **Immutable code/test SHA:** `4bccba5992cc36e1cfc3da146711fe718e44adf8`.
- [CI #42060684280](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42060684280): `app-qa`, `data-emulator`, `full-app` đều **SUCCESS cùng SHA**. Chrome REF/UI và 1440/900/390 PASS; real-App **QA01–QA10 PASS**, 27 screenshots; local Emulator only, no production used or published.
- [**Artifact gói HTML + hashes + Chrome images #13432341158**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42060684280/artifacts/13432341158); [**full-App witness #13432047195**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42060684280/artifacts/13432047195); [DATA #13430972026](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42060684280/artifacts/13430972026).
- **Byte-verified SHA256:** `dist/Dashboard_HĐND.html` = `78a3187004e64c39973cb49180d0b4cbafcdf65039932d21c2b13b11d7f48c5a`; `dist-compact-qa/compact-qa.html` = `cc9246a0cc39272a1817aa7f9761c6494fb6701b32f3d18d28310bbef5fff1e3`; `qa-results/ui-20261105/html-qa.tar.gz` = `fa45e38b9d9838a05be7f63e4985e8028b13c8ecf3e61bbed5cd53b61c0552ce`. Đã chạy `sha256sum` trên downloaded archive và `sha256sum -c` trên 2 HTML bên trong, tất cả OK.
- Source SHA thực nằm `qa-results/ui-20261105/source-sha.txt`. Repo HEAD có thể tăng chỉ vì tài liệu: **không build lại từ HEAD**.
- **Codex action:** tải artifact final, xác minh hash và Site **private owner-only** ID `appgprj_6ae93f17c2e48191815caef8a642fa14` trước upload; chỉ publish `dist/Dashboard_HĐND.html` đúng SHA, chờ `deployment succeeded`, ghi version/URL/timestamp và smoke owner-only (list/popup/admin/guest, không Firebase production). Nếu không có quyền xác minh private: STOP và giữ `SITE_PENDING`, không tạo Site public.
- **BẢO VỆ:** không upload witness/credential/Excel lên Site; không merge main, không deploy Firebase production hoặc Rules; DATA migration `PREPARED_OFFLINE / LIVE_HOLD`, không có GO/live write.
