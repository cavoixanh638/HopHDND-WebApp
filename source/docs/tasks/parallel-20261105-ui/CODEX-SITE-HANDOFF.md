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
