# Codex — phát hành bản demo riêng tư (REVIEW-3 FINAL — 06/11/2026)

**CODE/TEST/ARTIFACT PASS, SITE_PENDING. Chưa có deployment succeeded.** Tài liệu này **thay thế hoàn toàn** candidate/hash cũ `4bccba5`, `6676d00`, `ba18de6` và mọi chỉ dẫn triển khai trước ngày 06/11. Không sử dụng `HEAD` di động làm nguồn build.

## Version duy nhất được phép phát hành

- Repository `cavoixanh638/HopHDND-WebApp`, branch `ui/20261105-coordination`.
- **IMMUTABLE CODE/TEST SHA `bc5f5b4ef5eb89084f68e11e242d86a59c1ff8cc`.**
- [GitHub Actions #42147453000](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42147453000): **3/3 jobs SUCCESS trên cùng SHA**, `app-qa`, `data-emulator`, `full-app`.
- 896 unit PASS (116 skipped baseline), typecheck/build/real Chrome REF/UI 1440/900/390 PASS; Review-3 business group identity add/remove/move/reorder/rename/reload/clipboard PASS; Full-App real App **QA01–QA10 PASS**, 27 screenshots, Firebase Emulator only.
- [Báo cáo nghiệm thu chi tiết](REVIEW-3-FINAL-ACCEPTANCE.md) và [TRACKER](TRACKER.md).

## Artifact GitHub Actions gốc

1. [**Visual/HTML/manifest #13469864753**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42147453000/artifacts/13469864753) — `source-sha.txt`, `file-sha256.txt`, `package-sha256.txt`, `html-qa.tar.gz`, các screenshot, `rects.json`.
2. [**Full-app witness #13471036176**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42147453000/artifacts/13471036176) — `witness.json` với `checkedOutSha=bc5f5b4...`, `FULL_APP_QA_PASS`, `productionUsed=false`, `published=false`, `emulator=true`; QA01–QA10 PASS.
3. [**DATA Emulator #13470578325**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42147453000/artifacts/13470578325) — rules/offline migration/RTDB/Callable Emulator.

## Hash thực đã xác minh từ bytes tải về

| File | SHA-256 |
| --- | --- |
| **Chỉ upload** `dist/Dashboard_HĐND.html` | `0f1d1044d1572ff3eb4acb2ae2b5aa9368b553ce1f101f730e4a69bac3f2106d` |
| `dist-compact-qa/compact-qa.html` — KHÔNG upload | `6ddbe54181e24c34143a214948eab3fab8142cd682f6fdb5441dceadfbdf43bd` |
| `qa-results/ui-20261105/html-qa.tar.gz` — KHÔNG upload | `a1203a2bf3933777d2393b67c2909d2f525ab56a2f4ced23548cbf997a656805` |
| **Gói giao Codex** `HopHDND_REVIEW3_CODEX_SITE_HANDOFF_bc5f5b4.zip` (trao qua chat) | `5fa39fcce006c96ba1924da61b1ec9d9eadb4f3535e94dbe6898a6fbd6b7e967` |

Đã đối chiếu `source-sha.txt`; chạy `sha256sum -c` trên tar và hai HTML sau giải nén: **OK**. Gói Codex tự chứa file upload, 3 artifact ZIP, ảnh rename/reload, rects, README và manifest SHA-256; mọi file bên trong đã kiểm lại. Không dùng gói cũ.

## Codex thực hiện đúng thứ tự

1. Đọc `REVIEW-3-END-TO-END.md`, `REVIEW-3-FINAL-ACCEPTANCE.md`, `TRACKER.md`, `checkpoints/COMMANDER.md`; đối chiếu 3 CI jobs **SUCCESS trên exact SHA** và manifest hash.
2. Mở Site **hiện có** `appgprj_6ae93f17c2e48191815caef8a642fa14` bằng **Sites API có quyền owner**. **Xác minh quyền chỉ owner (owner-only) TRƯỚC khi upload**. Nếu không kiểm chứng được: STOP và tiếp tục `SITE_PENDING`; không tự tạo Site công khai, không nới quyền.
3. Upload **chỉ** `site_upload/Dashboard_HĐND.html` từ gói Codex (hoặc đúng file `dist/Dashboard_HĐND.html` từ artifact cùng SHA), hash chính xác như bảng. Không upload screenshots, witness, JSON, Excel, thông tin xác thực hoặc dữ liệu thật.
4. Chờ sự kiện `deployment succeeded`, ghi version/URL (redact private token), timestamp, tài khoản/visibility owner-only, source SHA, HTML SHA-256 đã triển khai. Không báo deploy nếu thiếu.
5. Smoke URL bằng owner: tải app, danh sách/báo cáo/popup, mã vùng admin, role guest/admin và no Firebase production writes. Lưu screenshot/log smoke.
6. Chỉ sau deployment+owner-only smoke: cập nhật `TRACKER.md` và `checkpoints/COMMANDER.md` trên coordination hoặc bàn giao report đủ bằng chứng cho writer; `SITE_PASS` mới đóng toàn nhiệm vụ.

## Ràng buộc bất biến

DATA migration **PREPARED_OFFLINE / LIVE_HOLD**; không chạy migration live, không deploy Firebase production Hosting/Functions/RTDB Rules, không ghi live RTDB/Excel, không merge `main`. Không tạo site public hay công khai quyền owner. 
