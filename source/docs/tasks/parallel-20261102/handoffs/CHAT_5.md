# Checkpoint — Chat 5: Đóng gói, cấu hình, release (v2)

- Trạng thái: **DONE_WITH_EXTERNAL_GAPS** — rehearsal hoàn tất, production NO-GO / NOT RUN.
- Cập nhật: 2026-11-02, Asia/Saigon.
- Nhánh: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat5-release`.
- Quy ước chung v2 blob `ad0d6cd42b224061a39bbf11de8753471d342e35`; nhiệm vụ [CHAT_5_RELEASE.md](../CHAT_5_RELEASE.md).
- Code SHA cuối: **`005d842ed59185ea9a887a9faeef315f0e78e4b9`**.
- Tested code SHA: **`005d842ed59185ea9a887a9faeef315f0e78e4b9`**, [CI #41409661669](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669) **SUCCESS**.
- Docs-only sau code: `e2c1120815d31a091904f505dfba54d5d48c3c1b` và commit báo cáo/checkpoint hiện tại (xem lịch sử Git).
- Worktree/WIP: không có thay đổi LOCAL_ONLY trong lượt; tất cả sửa được commit/push qua GitHub connector. Worktree ngoài GitHub, writer khác: chưa xác minh.

## Đã hoàn thành
1. Package exact SHA, clean checkout, Node22/3 npm lockfiles, ordinary V2-off + demo emulator-only V2-on, 6 TAR, manifest nguồn/Rules raw hash/regions + file inventory, extract checksum, reproducible x2. Mã trong `source/scripts/pr147-package-artifacts.mjs`.
2. Theo quy ước v2: chỉnh workflow `parallel-chat5-release-rehearsal.yml` lọc handoff-only, thêm rehearsal/negative offline validation; `publish-pages.yml` dừng nếu main rời SHA được duyệt, bỏ rebase; `pr147-release-validate.mjs` bắt buộc gate này. Diff code commit: **chỉ 3 đường dẫn Chat5**.
3. Runbook [PR147_RELEASE_RUNBOOK.md](../../releases/PR147_RELEASE_RUNBOOK.md) và báo cáo [reports/CHAT_5.md](../reports/CHAT_5.md) có tái tạo SHA tương lai, thứ tự backend+FULL Rules trước web, STOP/rollback đối soát ACK/UNKNOWN.

## Kiểm thử / chứng cứ
- [Actions #41409661669](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669) PASS: offline default guard, rehearsal validation, thiếu DB/prod approval/wrong SHA HOLD, 3 npm ci, build, giải nén đối chiếu, hai lần đóng gói/checksum trùng.
- [Artifact #13125500286](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669/artifacts/13125500286), retention 21 ngày; ZIP SHA256 `bb01bda9cd6f4d105a168ec30aff874d82458f8adb187831b017d0224d1d0b0`. Checkpoint-only push sau đổi workflow không tạo run mới.
- Production deploy/publish/IAM/Rules Published/backup restore/GO: **NOT RUN — FORBIDDEN**. Không có shell thử lệnh deploy.

## Quyết định và bước tiếp theo
- **Không mở vòng sửa/test mới** chỉ vì đọc lại checkpoint DONE_WITH_EXTERNAL_GAPS. Tracked release template vẫn `REQUIRED_UNVERIFIED`, default Firebase sentinel vẫn fail closed; không gọi web ordinary/demo là production-ready.
- Điều phối chọn SHA tích hợp mới: checkout sạch Node22 tại đúng SHA, chạy `cd source && node scripts/pr147-package-artifacts.mjs --source-sha <exact40>`, kiểm `SHA256SUMS`, chạy CI SHA mới; không dùng artifact/checksum cũ để chứng minh SHA mới.
- Operator có thẩm quyền phải xác minh target/RULES/backup+restore/ACK, service IAM+CORS+HTTPS, signoff, GO độc lập; rồi mới backend+FULL Rules, web cuối. Không merge, deploy, publish hoặc ghi production tại Chat 5.
