# Checkpoint — Chat 5: SHA-pinned release (quy ước v2)

- Trạng thái: **IN_PROGRESS — CI xác minh bản sửa cuối**, production vẫn NOT RUN/NO-GO.
- Cập nhật: 2026-11-02, Asia/Saigon.
- Repo/nhánh: `cavoixanh638/HopHDND-WebApp` / `parallel/20261102-chat5-release`.
- Quy ước v2 blob: `ad0d6cd42b224061a39bbf11de8753471d342e35`.
- Code SHA hiện tại: **`005d842ed59185ea9a887a9faeef315f0e78e4b9`**.
- Tested SHA trước batch: `d46b1e176e58262a4f75863aad19dea4c56300f3` — [CI #41409497364](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409497364) PASS; không tự áp kết quả đó cho code mới.
- CI của code mới: **RUNNING** [#41409661669](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669), SHA `005d842ed59185ea9a887a9faeef315f0e78e4b9`.
- Worktree: chỉ ghi GitHub connector, không có thay đổi LOCAL_ONLY; không thể kiểm tra worktree ngoài GitHub. Writer khác: chưa xác minh.

## Đã hoàn tất
- Gói nguồn exact SHA, Node22 + 3 npm locks, ordinary/demo web tách, 6 TAR + inventory/extract/SHA256, dựng lại hai lần PASS tại SHA cũ; artifact [13124348900](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409050177/artifacts/13124348900), 21 ngày.
- Batch v2 `005d842` chỉ đổi 3 file: `.github/workflows/parallel-chat5-release-rehearsal.yml` thêm `paths` loại `source/docs/**`, thêm offline validator; `.github/workflows/publish-pages.yml` chỉ chạy khi main exact approved SHA, kiểm main trước/sau commit, bỏ rebase và dừng nếu main tăng; `source/scripts/pr147-release-validate.mjs` bắt buộc các guard này.
- Diff batch đã đối chiếu qua GitHub compare: **chỉ ba đường dẫn thuộc Chat 5**. Không sửa Rules/backend/UI/locks. Không deploy/publish/merge.

## Quyết định
- Không chạy lại test ở SHA cũ; code mới phải có CI riêng. Bảo toàn sentinel Firebase và tracked instance `REQUIRED_UNVERIFIED`.
- GitHub Pages không được rebase artifact đã duyệt sang main mới, kể cả docs-only. Nếu SHA main đổi: STOP, xác minh lại và duyệt SHA mới.
- Production Rules Published/IAM/backup/ACK/GO **NOT RUN**; PASS offline tuyệt đối không cấp GO.

## Bước tiếp theo
1. Theo dõi [run #41409661669](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409661669) đến kết luận; nếu FAIL, đọc step/log và chỉ sửa phạm vi Chat5, checkpoint trước chờ.
2. Xác nhận commit checkpoint/doc-only sau khi thêm `paths` không tạo run CI mới; kiểm artifact/sha, ghi kết quả thực vào `reports/CHAT_5.md`.
3. Checkpoint cuối `DONE_WITH_EXTERNAL_GAPS`, tested code SHA và docs-only SHA riêng; không phát hành production, không mở vòng sửa mới nếu PASS.
