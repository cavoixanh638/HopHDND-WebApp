# PR #231 — Cloud preflight, 22/11/2026

Thời gian kiểm tra: `2026-11-22T16:01:18Z` trở đi, UTC; tương ứng 23:01 UTC+07 ngày 22/11. **Release verdict: HOLD, không phải DONE.**

## Nguồn và kết quả kiểm thử

- [Prompt đầy đủ](https://github.com/cavoixanh638/HopHDND-WebApp/issues/232#issuecomment-7081653376), [Issue điều phối](https://github.com/cavoixanh638/HopHDND-WebApp/issues/232), [PR](https://github.com/cavoixanh638/HopHDND-WebApp/pull/231).
- Exact code HEAD: `d8744b2932d8de3f6557b3fcef3768f7119fc6b7`; main và nhánh backup mã nguồn: `7b0d4009142fa53c1bed44096296ab210bcffe04`. Không đổi HEAD tính năng chỉ để ghi tài liệu.
- GitHub API trả 11/11 run completed/success trên exact HEAD, không failed/pending tại lần kiểm. Tái sử dụng bằng chứng, không kích hoạt chạy lại CI hàng loạt.
- [Verify source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745053): typecheck/unit/emulator/build/browser; [Spark guest](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745022); [direct-CAS](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745017); [operational QA](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745064); [two-browser](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745020); [UI parity](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745235).
- Các run còn lại: [Excel A–O](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745010), [schema fingerprint](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745015), [A4/clipboard](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745048), [isolated staging](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745014), [simple admin backup](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45036745184).
- Local mới: `npm ci`, typecheck PASS; unit 1158 PASS / 170 conditional SKIP / 0 FAIL; 18 release-policy/owner-approval tests PASS; Spark production build PASS với cảnh báo kích thước bundle đã có. Hai assert chuỗi LF lỗi ở lượt đầu do checkout Windows CRLF; chuẩn hóa riêng file checkout và chạy lại suite PASS, không đổi logic/test để nới điều kiện.
- `npm run rules:spark` + generated diff sạch; raw candidate SHA256 `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b`.

## Audit code và Rules

`mayEdit` chỉ dùng column grant, bảo vệ trường ID/STT qua danh sách writer. Quyền legacy không cho phép hoặc chặn cột. `savePermissions` không nhận chỉnh rows/cells; column CAS giữ lịch sử, kiểm con trỏ generation trước/sau, không tự báo thành công khi snapshot chưa khớp. UI không còn route/tab/bảng chi tiết hoặc nút xóa ngoại lệ. UI/test nguyên bản được giữ trên nhánh tính năng tại `source/docs/chuc-nang-cu-khong-dung/`.

Đối chiếu private Rules Cloud với public candidate: Rules Cloud canonical bằng Spark candidate trên main trước PR. Diff PR chỉ gồm 34 rule locations: 15 field validators legacy primary, 15 field validators V2, read/write của lease legacy và V2, chứa tổng cộng 42 biểu thức quyền thay bằng cột. Không thêm/xóa location. Admin, freeze/DRAIN, khóa, revision/CAS, maintenance epoch, audit, schema và các nhánh khác giữ nguyên. Rules exclusive/Functions lịch sử không phải đích triển khai Spark này.

## Backup Cloud và khả năng khôi phục

Tài khoản Firebase CLI hiện có đọc được project `hophdnd-8b7b2`, xác nhận instance `hophdnd-8b7b2-default-rtdb` ACTIVE và đúng endpoint Singapore. Chỉ dùng authenticated GET, không deploy hoặc ghi dữ liệu. Có quyền đọc không đồng nghĩa đã kiểm chứng IAM deploy.

Backup ID an toàn: `release-231-20261122T160117Z`, hoàn tất `2026-11-22T16:02:03.521Z`. Tệp nằm ngoài Git/Google Drive; thư mục Windows bảo vệ ACL chỉ người vận hành + SYSTEM. Không đưa payload, UID, email, credential hoặc đường dẫn riêng tư lên GitHub.

| Tệp/nhánh | Bằng chứng |
| --- | --- |
| Effective Rules raw | SHA256 `e94ad93cbd001408fe63fe87783a336799f0d6b4f341070baf95ad39627af7a4` |
| Effective Rules canonical | SHA256 `2a55fae4209e1283588265405e8a8b3ca0d6f90b11de4f7c292c2b6d18f25a12` |
| `hdnd/permissions` raw | SHA256 `540ad651aed2d8ed3b42c83bb3c9d5a459e2f1113c5bfb290a66525e281ced1a` |
| V2 permissions và active | Cả hai null; đã lưu và xác minh trạng thái vắng mặt |
| Readback | Hai GET mỗi path khớp canonical, file đọc lại khớp checksum manifest |
| Restore hẹp | PASS `2026-11-22T16:05:09.602Z`: Rules compile + quyền readback canonical khớp trên `127.0.0.1:9198`, project `demo-hdnd-column-restore`; 0 production writes |

Automatic approval review từ chối full-root export vì vượt phạm vi dữ liệu quyền. Đã dùng phương án hẹp được chấp thuận; **không có full business-data backup/restore mới**. Không dùng snapshot hẹp cho migration/restore hồ sơ thật. Khi rollback Rules, dùng đúng Rules riêng tư đã xác minh; không phục hồi dữ liệu nghiệp vụ cũ lên các ghi đã ACK.

## Bảng release gate

| Hạng mục | Trạng thái | Giới hạn/kế tiếp |
| --- | --- | --- |
| Audit code và generated Rules | PASS | Không phát hiện lỗi cần đổi logic |
| CI exact code SHA | PASS | 11/11 SUCCESS; giữ HEAD tính năng |
| Backup production Rules | PASS | Effective Rules, hai lần đọc, private ACL/hash |
| Backup quyền và con trỏ | PASS | Legacy + V2 permissions/active; không xóa rows/cells |
| So sánh Rules production | PASS | Cloud = main cũ; chỉ 34 vị trí/42 grant thay đổi |
| Phê duyệt exact candidate hash | HOLD | Chưa có xác nhận người có thẩm quyền |
| Deploy Rules mới | NOT_RUN | Chưa ghi Firebase production |
| Rules mới Cloud readback | NOT_RUN | Chỉ backup Rules hiện hành đã xác minh |
| Merge PR #231 | NOT_RUN | Chờ Cloud Rules mới + acceptance; expected HEAD bắt buộc |
| Pages owner-dispatch | NOT_RUN | Owner phải Run workflow trên main sau merge |
| Repo Spark/status-CAS variables | HOLD | Chưa kiểm giá trị hiện hành; không tự sửa guard/variable |
| Website version | PASS baseline / NOT_RUN bản mới | Live source `f1a307d40e91b75ce38bbb9dd7071607e23acde2`, `status_cas=true` |
| UI live | PASS baseline / NOT_RUN bản mới | Trang thật tải bảng 59 nội dung; chưa nghiệm thu UI PR #231 |
| Quyền cột live hai vai trò | NOT_RUN | Chỉ dùng canary riêng được quản trị cho phép, không test ghi trên hồ sơ thật |
| Rollback readiness | PASS hẹp / HOLD toàn đợt | Rules/quyền restore localhost PASS; chưa có deployment receipts hoặc full-data restore mới |

## Một thao tác cần chủ tài khoản trước bước ghi

Phê duyệt triển khai **đúng** `source/firebase/database.spark.rules.json` tại code HEAD trên, raw SHA256 `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b`, và xác nhận phạm vi canary riêng được phép để nghiệm thu quyền mà không chạm hồ sơ thật. Đây là cổng trong prompt Issue #232, không suy ra từ CI PASS hoặc quyền đọc CLI.

Khi có phê duyệt: tái đọc Rules/quyền để chống drift và làm mới backup nếu cần → deploy bằng cấu hình explicit đúng project/instance, không dùng firebase.json mặc định → Rules readback/hash + canary có kiểm soát → merge exact expected HEAD nếu toàn bộ gate đạt → owner Run workflow main với Spark/status-CAS confirmed và approved Rules hash đúng → kiểm version/UI/hai vai trò/rollback. Không giả lập owner click, không bypass, không đánh DONE hoặc đóng Issue trước nghiệm thu thật.
