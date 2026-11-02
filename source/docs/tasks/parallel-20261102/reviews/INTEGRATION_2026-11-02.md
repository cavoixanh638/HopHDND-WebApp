# Bàn giao candidate tích hợp 5 phần — 02/11/2026

**DONE trong phạm vi tích hợp/offline; chưa merge, deploy hoặc production GO.**

- Branch: `integration/20261102-five-streams`.
- Tested/rebuilt source SHA: `66e33b85a3424b2316f090e214e813cd04331afc`.
- Source tree: `763180ad21c5d947f081f088eac1df4e66395299`.
- Baseline: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Các commit bàn giao sau SHA trên chỉ đổi docs; không gán kết quả kiểm thử cho một runtime mới.
- Bằng chứng máy đọc: [INTEGRATION_EVIDENCE.json](INTEGRATION_EVIDENCE.json).

## Nguồn đủ 5 phần

| Phần | Nhánh nguồn (prefix parallel/20261102-) | HEAD đã lấy |
|---|---|---|
| Backend/Rules | chat1-backend | f40c6934def2fe651ba5d129e826af21e96e8277 |
| UI | chat2-ui | 0be8134c133ce55b6eff80587ef95e8140259041 |
| First import, gồm COORD-01 | chat3-bootstrap | c3d3461d349b087df993857c4c69a685bdce80cc |
| Backup/restore | chat4-backup | 85db427b067e87a4ba5c9e8e7009dbf71dbd14b5 |
| Release | chat5-release | dd3409364f5b5d6ecfabbeca68e386e996d88a62 |

Đã đưa file của từng phần vào candidate từ baseline; không merge nhánh/PR, không sửa nhánh worker.
So sánh từng tập file xác nhận code/tests/runbook nguồn được giữ nguyên khi ghép ban đầu.
Kết quả PASS nhánh riêng không chạy lại; các run dưới kiểm bản ghép mới.

## Lỗi tích hợp đã xử lý

1. Shared CI restore dùng snapshot thiếu field/manifest, không còn phù hợp với guard Chat 4. Thay bằng fixture tổng hợp đầy đủ và paired manifest; không nới guard.
2. Candidate đầu `546e7b7a`: Vitest nhận nhầm suite Node `node:test`, báo “No test suite found” dù 835 assertions PASS. Loại đúng file khỏi Vitest; 15 assertions giữ nguyên và chạy bắt buộc ở CLI Linux/Windows.
3. Archive CLI Chat 5 thiếu helper đường dẫn mới của Chat 3. Thêm helper vào archive/inventory/hash, chạy launcher thật từ thư mục giải nén: phải đến `HOLD_MODE_REQUIRED`, không lỗi resolve/module.
4. Sửa 2 liên kết tài liệu lịch sử không tồn tại trong candidate thành tham chiếu văn bản rõ ràng. Docs check PASS.

## Gate trên đúng SHA

| Workflow | Kết quả |
|---|---|
| [Chat4 isolated backup audit and emulator restore (NO production)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315451) | SUCCESS |
| [Chat 5 SHA-pinned release rehearsal (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381) | SUCCESS |
| [Parallel Chat 2 - scoped UI checks (no deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315289) | SUCCESS |
| [Chat 1 backend — both Functions FULL Rules Auth RTDB](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315486) | SUCCESS |
| [Chat 3 isolated first-import CLI proof (NO DEPLOY)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315363) | SUCCESS |
| [Parallel Chat 2 - real App on isolated Firebase Emulator (NO deploy)](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315321) | SUCCESS |
| [Verify HopHDND source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315419) | SUCCESS |

Tổng 7 workflow / 8 jobs SUCCESS, không job bắt buộc bị bỏ qua.
- Source: typecheck, 835 unit assertions (118 files), boundary 8/8; FULL Rules Firebase 92/92; docs; split/offline/test builds; Chrome smoke PASS.
- Unit offline có 116 test phụ thuộc môi trường được skip theo cấu hình hiện có; không diễn giải chúng thành PASS offline. Các gate Emulator riêng phía dưới kiểm phần tích hợp.
- Backend: parent 14/14, cell 32/32, Chrome 4/4, App 5/5; multirow A→B→RESTORE C→D→RESTORE E, backup sealed và guest sửa tiếp PASS.
- UI: component Chrome 14/14; full App QA01–QA08 8/8, 20 ảnh, gồm lost ACK, freeze, Excel stage/commit/restore, đổi generation khi còn nháp.
- CLI Linux: path 15/15, preflight 12/12, offline trước CAS, actual CAS/readback, lost ACK UNKNOWN/replay guard PASS. Windows native: path 15/15, launcher 6/6 gồm junction vào checkout HOLD. Windows Firebase CAS không thuộc gate bắt buộc; CAS thật chạy Linux cùng SHA.
- Backup: offline 10/10, restore guards 4/4, operational 6/6, operator bootstrap, actual full-root restore PASS. Canonical trước/sau cùng `9a1da3b05505da1423f3ab002eb4790b87bea2f4fd3ad7fd4ff94fff880e1b76`.
- Release: 3 lockfiles, Node22, build mới, extract/inventory/hash, dựng độc lập x2 checksum trùng, extracted operator CLI PASS.

## Gói phát hành để review

[Download artifact 13145110937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381/artifacts/13145110937), hết hạn dự kiến 23/11/2026.
ZIP SHA256: `1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`.
Đã tải và kiểm ZIP + toàn bộ SHA256SUMS tại workspace `integration-evidence-66e33b85/release.zip` và `package/`.

| Archive | SHA256 |
|---|---|
| web-pages-default-disabled.tar.gz | `f73fd3a13e827fab80d4c5224dbc548c4f84958ef754a91c3ba742c52fb772f7` |
| web-pages-test-emulator-only.tar.gz | `92e02a0751127e294fb0be068d3ec63a5d3752838b421a56c59eba03d5ec7169` |
| functions-cellEdit-node22.tar.gz | `78886cb93220ad7bb7f668bddbd1aafa50f1ea010d697a7400d2f11e09fcb2cb` |
| functions-parentDatasetCommit-node22.tar.gz | `040220681a612897cc021cb8ad60cb62682294ca9a52f526dffc109c325a0dc3` |
| firebase-full-rules-frcr01.tar.gz | `8655cb2528d45c7da219f8b4051fc7e33226cd636b75b841f5669c5e6f79341d` |
| operator-first-import-node22-sources.tar.gz | `8b4611ade34f3d025b06f21b9e617a7868c5308cdb8b758c0f98e9fe09ae08b1` |

Gói gồm 6 archive, `release-manifest.json` với source SHA/tree, inventory và hashes, `SHA256SUMS` (7 mục).
Rules raw SHA256: `e19b8d7c395bc21a73ccb7499c3117bec034e6172f7f208754d474ce09f9a5b9`.
Manifest giữ trạng thái đóng gói tĩnh `CODE_READY=REQUIRES_EXACT_SHA_CI`; báo cáo này và run cùng SHA cung cấp chứng cứ CI sau dựng, không sửa manifest/artifact đã có checksum.

Dựng lại khi artifact hết hạn, trong checkout sạch trên Linux với Node22/npm/GNU tar:

```sh
git checkout --detach 66e33b85a3424b2316f090e214e813cd04331afc
cd source
node scripts/pr147-package-artifacts.mjs --source-sha 66e33b85a3424b2316f090e214e813cd04331afc
node parallel-qa/integration/package-cli-smoke.mjs
(cd qa-results/pr147-release-package && sha256sum -c SHA256SUMS)
```

Tái lập x2: lưu SHA256SUMS/manifest và hash các TAR ở ngoài checkout, dựng lại cùng SHA rồi so sánh; workflow release đã thực hiện việc này.

## Bằng chứng và giới hạn bàn giao

- [parallel-chat4-backup-41451315451-demo-only](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315451/artifacts/13144094697) — `sha256:10c299f58787668c525d576080a281d1f9578479219cb856b26cecb1cf2f29b2`.
- [chat5-release-rehearsal-66e33b85a3424b2316f090e214e813cd04331afc-1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381/artifacts/13145110937) — `sha256:1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`.
- [parallel-chat2-full-app-41451315321](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315321/artifacts/13144064190) — `sha256:89b8b9ceb38beb9d1e768c3a592d80a3943f1f869389e64ebd2acfb065676d87`.
- [parallel-chat1-real-backend-41451315486-1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315486/artifacts/13144344140) — `sha256:74f14210ac6d0e3690fc00f3e1bf452e32333c8cddf32b92869e7f05024dadff`.
- [chat2-component-chrome-41451315289](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315289/artifacts/13144996307) — `sha256:9edd71173fe89a296ce59f2fb7af80b282b53d15a76de41688f1fdfec8919292`.
- [hophdnd-verified-hosting-candidates](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315419/artifacts/13144439119) — `sha256:bd1a3934e06e225d49ff85e92458ce41520774097c4da91b1616e8a62d66fe58`.
- [hophdnd-browser-smoke-preview](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315419/artifacts/13144393973) — `sha256:c9a392fbdf8378fef8c1e3718519de1b3a272e8a0112bb7f750f7dead8c879e5`.

Không còn gate bắt buộc thiếu trong phạm vi yêu cầu. Chưa tạo/merge PR, chưa deploy/publish, chưa truy cập hoặc ghi production.
Web ordinary có V2 off; web demo chỉ localhost, không phát hành. Production web NOT_BUILT_NOT_AUTHORIZED.
Các điều kiện IAM/Rules Published/backup thực/người dùng thật/GO giữ ngoài phạm vi theo [runbook phát hành](../../../releases/PR147_RELEASE_RUNBOOK.md).
