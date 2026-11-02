# Checkpoint — Chat 5: SHA-pinned release

- Trạng thái: **IN_PROGRESS** (bổ sung chốt an toàn theo quy ước v2; gói đã PASS không làm lại).
- Cập nhật: 2026-11-02, Asia/Saigon.
- Repo/branch: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat5-release`.
- Quy ước v2 blob: `ad0d6cd42b224061a39bbf11de8753471d342e35`.
- HEAD trước lượt: `cdf267f6684f63b69f76b24f05d6eded2b822304`.
- Code gói (script+CI): `70f24d48aef03d324451edaa4b1d7bedc1b04efd`.
- Tested SHA: `cdf267f6684f63b69f76b24f05d6eded2b822304` — CI [#41409241366](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409241366) PASS; trước đó #41409050177 PASS.
- Worktree: thao tác qua GitHub connector, không có file LOCAL_ONLY; không xác minh được worktree ngoài GitHub.
- Writer khác trên nhánh: chưa xác minh; chỉ ghi file do Chat 5 sở hữu.

## Đã hoàn tất
- Công cụ gói nhận exact SHA, clean checkout, Node22 + ba lock, rebuild web ordinary/demo, 6 TAR, inventory file, extract/checksum, 2 lần tái lập; CI PASS.
- Runbook ở `source/docs/releases/PR147_RELEASE_RUNBOOK.md`; report `reports/CHAT_5.md`; artifact [13124348900](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409050177/artifacts/13124348900), retention 21 ngày.
- Production **NOT RUN / NO-GO**: chưa được kiểm Rules Published, IAM, backup/restore, ACK, phê duyệt HTTPS/GO.

## Việc phát hiện và sẽ xử lý (v2)
- Workflow `parallel-chat5-release-rehearsal.yml` hiện chạy với *mọi* push của nhánh; handoff-only tạo run thừa/cancel.
- Workflow `publish-pages.yml` hiện có vòng rebase khi main tăng docs-only; cần ràng buộc SHA main cuối cùng đúng SHA đã được phê duyệt, fail closed không tự rebase.
- Chưa sửa mã trong lượt này; checkpoint được lưu chủ động trước batch.

## Bước tiếp theo
1. Sửa workflow test-only để bỏ qua handoff/docs-only nhưng vẫn test khi source/config/workflow đổi; kiểm không bỏ test mã.
2. Sửa publish guard chính xác SHA main trước push, không deploy; kiểm âm tính offline, chạy CI theo SHA mới.
3. Ghi kết quả thực, artifacts/tested code SHA vào report + checkpoint; trạng thái cuối DONE_WITH_EXTERNAL_GAPS nếu chỉ còn cổng production.

Giữ nguyên scope Chat5; không deploy/publish/merge/production GO, không sửa Rules/backend/UI/root locks. Không đếm docs-only commit là code đã được test.
