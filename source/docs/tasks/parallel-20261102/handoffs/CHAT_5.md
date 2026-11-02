# Checkpoint — Chat 5: Release rehearsal, SHA-pinned artifacts

- Trạng thái: **IN_PROGRESS**
- Cập nhật: 2026-11-02, Asia/Saigon
- File nhiệm vụ: [CHAT_5_RELEASE.md](../CHAT_5_RELEASE.md)
- Nhánh: `parallel/20261102-chat5-release`
- Mốc nền: `0a04b81dbb00979fb87aee7fc497e802058d8518`
- Code SHA đã ghi: `70f24d48aef03d324451edaa4b1d7bedc1b04efd` (script + workflow)
- Docs-only SHA sau đó: `9bff1dbdbb6ec3164c45f77732f56f6b791cdff2`
- Tested SHA: **CI RUNNING; chưa PASS**
- Worktree: thao tác GitHub connector, không có local checkout; kiểm tra lại uncommitted worktree nếu chat khác tiếp quản
- Writer khác cùng nhánh: chưa xác minh qua GitHub; không ghi vào nhánh khác

## Đã làm
1. Đọc nhiệm vụ, quy ước chung, checkpoint, AGENTS và code hiện tại; xác nhận nhánh HEAD ban đầu `23c04997af803a6c4af741efb37ee161a9a7c5bc`.
2. Thay `source/scripts/pr147-package-artifacts.mjs`: yêu cầu `--source-sha` = exact HEAD, clean source, Node22, ba `npm ci` theo lock, dựng mới ordinary web V2-off và demo emulator V2-on, check Rules/regions, package 6 tar, inventory SHA từng file, giải nén so nội dung, manifest nguồn+tree và checksum. Production web chỉ build offline khi có config+approval private và validator; luôn production NOT AUTHORIZED, không deploy.
3. Thêm workflow test-only `.github/workflows/parallel-chat5-release-rehearsal.yml` chạy trên nhánh, SHA mismatch negative test, dựng 2 lần so tar/manifest/sums, artifact 21 ngày. Chỉnh script để lần build thứ hai chấp nhận thư mục `qa-results` sinh ra.
4. Mở rộng `source/docs/releases/PR147_RELEASE_RUNBOOK.md` về pin SHA, backup khi artifact hết hạn, tách ordinary/demo/production, backend+FULL Rules trước web và STOP/ACK rollback.
5. Giữ default Firebase sentinel, firebase.release placeholder, publish gating, runtime backend/UI/Rules nguyên trạng.

## Kiểm thử
| Việc | SHA | Kết quả | Bằng chứng |
|---|---|---|---|
| Baseline package CI lịch sử | 0a04b81dbb00979fb87aee7fc497e802058d8518 | PASS lịch sử, không tính là test code mới | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964348 |
| Chat5 pinned source rebuild workflow | 70f24d48aef03d324451edaa4b1d7bedc1b04efd | RUNNING tại lần checkpoint | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41408886604 |
| Chat5 workflow trên docs HEAD | 9bff1dbdbb6ec3164c45f77732f56f6b791cdff2 | PENDING/RUNNING, chưa chứng nhận | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41408950954 |
| npm ci, build, tar, extract trên container chat | N/A | NOT RUN: container không có mạng truy cập GitHub/npm | Container `git ls-remote` thất bại DNS |
| Production deployment/hosting/GO | N/A | NOT RUN, FORBIDDEN | Theo quy ước chung |

## Việc còn lại (ưu tiên)
1. Theo dõi run mới nhất đến completed, đọc job/log nếu FAIL. Sửa chỉ file sở hữu và chạy lại CI exact SHA; đừng đánh dấu PASS khi chưa có evidence.
2. Nếu CI phát hiện lỗi, kiểm tra `files(extracted,['.'])`, `tar --no-recursion`, kiểm path xếp thứ tự và git clean QA, sửa chính xác lỗi.
3. Xác nhận hai lần package tar + release-manifest.json + SHA256SUMS khớp; đọc artifacts và ghi tested SHA, SHA256 tổng; cập nhật `reports/CHAT_5.md` và checkpoint thành DONE_WITH_EXTERNAL_GAPS khi chỉ production chưa kiểm, hoặc DONE nếu phần release rehearsal đầy đủ.
4. Tự kiểm changed files chỉ phạm vi Chat5 và không deployment, không merge. Artifact hết hạn: tái tạo đúng pinned SHA theo runbook.

## Quyết định
- Release template giữ `REQUIRED_UNVERIFIED`; không gán production-ready cho ordinary web hay demo localhost. `PR147_RELEASE_MANIFEST.json` tracked cũ chỉ là hồ sơ lịch sử.
- Không sửa lock, Rules, runtime backend/UI, root package, hoặc pipeline khác ngoài phạm vi.
- Không truy cập production, không tự cấp GO, không deploy/publish hay restore lên dữ liệu thật.
