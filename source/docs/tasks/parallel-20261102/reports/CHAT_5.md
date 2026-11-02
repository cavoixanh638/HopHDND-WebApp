# Chat 5 — Báo cáo đóng gói và chuẩn bị phát hành (02/11/2026)

**Trạng thái hiện tại:** mã đã commit, CI diễn tập SHA-pinned **chưa có kết luận cuối** khi ghi báo cáo; production **NOT RUN / NOT AUTHORIZED**.

## Phạm vi thực hiện và thay đổi
- `source/scripts/pr147-package-artifacts.mjs`: thay cách đóng gói dist có sẵn bằng build từ exact `--source-sha`, clean checkout, Node22, ba `npm ci` theo lockfile; không dùng artifact tồn lưu. Mỗi tar có inventory path/bytes/SHA256; script tự giải nén vào thư mục tạm và so SHA. Manifest ghi source commit/tree, lock hashes, raw Rules hash, service regions, cấu hình web và checksum manifest.
- `.github/workflows/parallel-chat5-release-rehearsal.yml`: workflow test-only push nhánh Chat5, kiểm nhầm SHA phải fail, chạy build/đóng gói hai lần từ nguồn, so tar/checksum/manifest, upload artifact 21 ngày. Không có bước deploy/publish.
- `source/docs/releases/PR147_RELEASE_RUNBOOK.md`: hướng dẫn chọn SHA, tái tạo khi artifact hết hạn, profile ordinary/demo/production, backend+FULL Rules trước web, gate độc lập, STOP/rollback đối soát ACK.
- `source/docs/tasks/parallel-20261102/handoffs/CHAT_5.md`: cập nhật checkpoint đủ để chat sau tiếp quản.

## Bằng chứng
- Baseline cũ (khác code SHA): [GitHub Actions #41390964348](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964348), PASS, **không chứng nhận code Chat 5**.
- Code SHA của script và workflow `70f24d48aef03d324451edaa4b1d7bedc1b04efd`. Docs-only `9bff1dbdbb6ec3164c45f77732f56f6b791cdff2`, checkpoint `fc215340048162b81573d69bc9cedf0c13e92f58`.
- Run cuối đang chờ kiểm tra: [GitHub Actions #41408998107](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41408998107), SHA `fc215340048162b81573d69bc9cedf0c13e92f58`. Các run trước bị cancel do `cancel-in-progress`; không xem là PASS.
- Local end-to-end packaging: **NOT RUN**, shell container không truy cập GitHub/npm DNS; phải lấy CI và artefact ở run cuối để xác nhận.
- Production config, IAM, Rules Published, backup/restore live, approval GO, deploy/hosting: **NOT RUN** theo đúng giới hạn.

## Cách dùng lại
1. Checkout sạch exact commit SHA tương lai, Node22, làm việc từ `source`. Chạy `node scripts/pr147-package-artifacts.mjs --source-sha <exact40>`. Không sửa script để thay SHA; script tự cài theo lock và build hai chế độ.
2. `cd qa-results/pr147-release-package && sha256sum -c SHA256SUMS`, so `sourceSha`, `sourceTreeSha`, `sourceHashes`, `rules.rawSha256`, `serviceRegions`, tất cả archive file inventory. Lặp lại và so checksum toàn bộ bộ gói.
3. Nếu artifact GitHub hết hạn, tái tạo từ nguồn/lock đúng SHA bằng lệnh trên; không coi manifest tracked lịch sử là căn cứ phát hành.
4. Production yêu cầu operator tự xác minh live/backup/restore, signoff, exact target/endpoint, Rules Published và IAM. Production web build offline chỉ dùng private config+approval đã kiểm, và vẫn không tự publish. Backend+FULL Rules được kiểm trước web; rollback phải đối soát ACK/UNKNOWN.

**Không merge, không thực thi deploy, không đụng production, không tự GO.** Xem checkpoint Chat5 để tiếp tục CI cho đến PASS hoặc xác định blocker.
