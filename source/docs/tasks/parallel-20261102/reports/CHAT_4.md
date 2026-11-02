# Chat 4 — Báo cáo backup/audit/full-root restore (02/11/2026)

## Kết quả và chứng cứ gắn SHA
- Nhánh: `parallel/20261102-chat4-backup`.
- Code/tool SHA được CI chạy: `7d2525451dbb48699784b13291becd3fecf49582`.
- [Workflow Chat4 #41409437881](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41409437881).
- Trạng thái tại lúc ghi: **RUNNING**, chưa được gọi DONE. Đã xác minh PASS: syntax, npm ci (source và 2 Functions), offline fixture, negative restore guard fixture, CLI operator A–O trên nguồn .xlsx và checkpoint tổng hợp.
- Auth+Functions+FULL Rules, bootstrap operator, backup verifier và full-root restore: tiếp tục đọc conclusion cuối của run, đừng suy PASS từ các bước trước.

## File thay đổi
- `source/docs/operations/pr149/{RUNBOOK.md,DRILL_REPORT.md,offline-audit-core.mjs,offline-fixture.test.ts,operator-check.mjs,operator-check.test.ts,emulator-run.mjs,operational-drill.test.ts,bootstrap-operator.test.ts,verify-restored.mjs}` (tái sử dụng công cụ PR149 thuộc vùng sở hữu, gia cố audit).
- `source/scripts/firebase-backup-emulator-restore.mjs` kiểm trước khi PUT ở localhost: manifest paired, byte hash/size/project/name, offline audit verdict; thêm current-checkpoint pair và STOP nếu khác nội dung.
- `source/parallel-qa/chat4/restore-gate.fixture.mjs` negative tests: missing manifest, hash giả, server ACK sau backup, thiếu checkpoint pair.
- `.github/workflows/parallel-chat4-backup-rehearsal.yml` chỉ chạy demo Auth/RTDB/Functions + root restore, không deploy/publish.

## Tính toàn vẹn và STOP
- Kiểm full-root SHA256 từ bytes, số hàng, IDs, 13 trường, revision/history, permissions/generation/leases, journal, backup proven historically COMMITTED qua `verifyBackup` + `verifyCommittedRestoreSource`.
- `audit` từ PR149 đã gia cố: không crash khi active generation bị thiếu mà có nguồn; legacy data delta cũng HOLD; so checkpoint cũ/mới phát hiện thay đổi metadata/root ngoài active row.
- Chống forged candidate: recompute `decodeCandidate`; chống forged backup: recompute contract baseline và match committed historic generation. **Manifest tự khai và hai lần đọc bằng lời không phải bằng chứng production độc lập**.
- Một server ACK sau snapshot: STOP, lấy snapshot mới và so field/rights/history/journal, không restore bản cũ.
- Root restore chỉ `127.0.0.1:9198` / `demo-hdnd-restore`; không ghi production.

## Cách chạy
```sh
cd source
npm ci --no-audit --no-fund
npm ci --prefix cell-edit-service --no-audit --no-fund
npm ci --prefix parent-commit-service --no-audit --no-fund
node node_modules/vitest/vitest.mjs run docs/operations/pr149/offline-fixture.test.ts --maxWorkers=1
node --test parallel-qa/chat4/restore-gate.fixture.mjs
node docs/operations/pr149/operator-check.mjs --help
# Với input synthetic tạo từ offline-fixture.test.ts:
node docs/operations/pr149/operator-check.mjs --source "$PWD/pr149-ops-evidence/approved-source.xlsx" --sheet Approved --snapshot "$PWD/pr149-ops-evidence/offline-checkpoint.json" --manifest "$PWD/pr149-ops-evidence/offline-manifest.json" --output "$PWD/pr149-ops-evidence/operator-report.json"
# Xem workflow để chạy Auth + Database + hai Functions và local full-root restore với HDND_PRIVATE_BACKUP + HDND_PRIVATE_MANIFEST.
```

## Production / quyết định
- Production GET/Rules IAM/credentials, real backups, full-root restore bằng private backup, nhân viên real UAT đều **NOT RUN**. Không có quyền thực hiện trong phạm vi luồng.
- Owner chỉ cần D1 nguồn chính thức, D2 chính sách ID/quyền/history, D3 người và thời điểm GO; tất cả tham số kỹ thuật do operator thu.
- First import là luồng Chat3: `source/scripts/operator-first-import.mjs`, `source/docs/operations/PR147_OPERATOR_FIRST_IMPORT.md`; không sửa source của Chat3.
- Không đụng runtime/Rules, không merge PR hoặc deploy. Nếu CI final fail, sửa file thuộc vùng Chat4 và chạy lại exact SHA.
