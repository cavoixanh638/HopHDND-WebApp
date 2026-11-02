# Checkpoint — Chat 5: Release rehearsal, SHA-pinned artifacts

- Trạng thái: **DONE_WITH_EXTERNAL_GAPS** — hoàn tất diễn tập, production chưa GO
- Cập nhật: 2026-11-02, Asia/Saigon
- File nhiệm vụ: [CHAT_5_RELEASE.md](../CHAT_5_RELEASE.md)
- Nhánh: `parallel/20261102-chat5-release`
- Mốc nền: `0a04b81dbb00979fb87aee7fc497e802058d8518`
- Code SHA đã ghi: `70f24d48aef03d324451edaa4b1d7bedc1b04efd` (script + workflow)
- Docs-only SHA sau đó: `9bff1dbdbb6ec3164c45f77732f56f6b791cdff2`
- Tested SHA: **d0c3c964a532232136db76ae218ad63869d3b8b8** — CI success #41409050177, code unchanged since 70f24d (subsequent docs only)
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
| Chat5 pinned source rebuild workflow | d0c3c964a532232136db76ae218ad63869d3b8b8 | **PASS**, rebuilt twice + extracted inventory + sha256sum | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409050177 |
| Artifact (21 days retention) | d0c3c964a532232136db76ae218ad63869d3b8b8 | **CREATED**: 13124348900, ZIP digest sha256:4520363db98de2678609ad22601af3d807abdfa83af8b233c05930b3aa656eca | https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409050177/artifacts/13124348900 |
| npm ci, build, tar, extract trên container chat | N/A | NOT RUN: container không có mạng truy cập GitHub/npm | Container `git ls-remote` thất bại DNS |
| Production deployment/hosting/GO | N/A | NOT RUN, FORBIDDEN | Theo quy ước chung |

## Bàn giao cuối / Bước tiếp theo
1. **Phần việc Chat 5 hoàn tất** tại tested SHA trên; không khởi động vòng sửa mới khi chat mới đọc checkpoint DONE_WITH_EXTERNAL_GAPS.
2. Operator/điều phối sau tích hợp phải kiểm production Rules Published, target/instance, IAM, backup+restore, ACK/UNKNOWN, security signoff, approved endpoint và GO trước deploy; luồng này không được tự deploy.
3. Nếu dùng SHA tích hợp tương lai, checkout đúng SHA, chạy `node scripts/pr147-package-artifacts.mjs --source-sha <exact40>` tại `source/`, kiểm `SHA256SUMS`, đối chiếu từng file inventory và chạy lại hai lần theo workflow. Đây là **test riêng theo SHA mới**, không kế thừa PASS ở SHA trên.
4. Gói bị hết hạn phải rebuild theo chính SHA, source/lock/Rules từ repo; không giả định manifest theo lịch sử là gói final. Báo cáo: `source/docs/tasks/parallel-20261102/reports/CHAT_5.md`.

## Quyết định
- Release template giữ `REQUIRED_UNVERIFIED`; không gán production-ready cho ordinary web hay demo localhost. `PR147_RELEASE_MANIFEST.json` tracked cũ chỉ là hồ sơ lịch sử.
- Không sửa lock, Rules, runtime backend/UI, root package, hoặc pipeline khác ngoài phạm vi.
- Không truy cập production, không tự cấp GO, không deploy/publish hay restore lên dữ liệu thật.
