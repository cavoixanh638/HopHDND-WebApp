# PR #231 — Rules production đã triển khai, Pages chưa phát hành

Ngày nghiệp vụ: **23/11/2026, UTC+07**. Các receipt dùng UTC ngày 22/11 dưới đây tương ứng sau 00:00 ngày 23/11. Tiếp nối [preflight](PR231_COLUMN_ONLY_CLOUD_PREFLIGHT_2026-11-22.md), [Issue #232](https://github.com/cavoixanh638/HopHDND-WebApp/issues/232), [PR #231](https://github.com/cavoixanh638/HopHDND-WebApp/pull/231).

## Phê duyệt, backup và deployment

Chủ tài khoản xác nhận trong chat: phê duyệt deploy Rules raw SHA256 `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b` và nghiệm thu bằng bản ghi thử riêng; không sửa/xóa hồ sơ thật hoặc dữ liệu quyền cũ. Không xin duyệt lại nội dung này.

- Exact feature HEAD vẫn `d8744b2932d8de3f6557b3fcef3768f7119fc6b7`, 11/11 workflow và 11/11 check-runs completed/success. Source CI cũ vẫn hợp lệ, không chạy lại hàng loạt. Các URL và local 1158 unit PASS/170 SKIP/typecheck/build/release-guard PASS ở preflight.
- Fresh private backup ID `approved-231-20261122T171847Z`: bắt đầu `17:18:47.900Z`, hoàn tất `17:19:25.444Z` UTC. Effective Rules, permissions và V2 permissions/active được đọc hai lần, canonical/file readback/hash khớp. Rules/quyền chưa drift so preflight. Backup hẹp, không xuất hồ sơ nghiệp vụ.
- Raw Rules backup SHA256 `e94ad93cbd001408fe63fe87783a336799f0d6b4f341070baf95ad39627af7a4`; canonical `2a55fae4209e1283588265405e8a8b3ca0d6f90b11de4f7c292c2b6d18f25a12`. Permissions raw SHA256 `540ad651aed2d8ed3b42c83bb3c9d5a459e2f1113c5bfb290a66525e281ced1a`; V2 permissions/active null.
- Restore hẹp Rules/quyền + compiled Rules/readback trên localhost demo PASS lúc `17:20:42.995Z` UTC. File/log/receipt giữ riêng tư ngoài Git/Google Drive, ACL người vận hành + SYSTEM.
- Deploy `17:21:28.851Z–17:21:41.434Z` UTC (00:21 ngày 23/11 UTC+07), CLI exit 0; explicit config `database` array chỉ instance `hophdnd-8b7b2-default-rtdb`, explicit project `hophdnd-8b7b2`, only database. Không dùng hoặc sửa firebase.json mặc định, không sửa Functions hoặc dữ liệu.
- **Cloud readback PASS:** toàn bộ canonical JSON khớp candidate; Cloud/candidate canonical SHA256 `48d39329ebf0823e6ab6f9655f87b0d133e060b29db4c29dc4ceb7d952c15a65`. Raw hash của file duyệt và canonical hash là hai phép tính khác nhau, không yêu cầu chúng bằng nhau. Raw approved hash vẫn `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b`.

## Nghiệm thu production có kiểm soát

Canary SDK dùng hai danh tính Firebase Anonymous thật, hai hồ sơ synthetic riêng có archivedAt, các quyền legacy chỉ dành ID QA mới và đường ghi bị giới hạn allowlist. Không thay đổi columns hoặc dữ liệu quyền đã tồn tại. Kết quả:

| Kiểm tra Cloud | Kết quả |
| --- | --- |
| Cột deny, legacy row/cell allow | PASS: từ chối acquire |
| Cột allow, legacy row/cell deny | PASS: acquire/save được |
| Peer Cloud readback, revision/audit sau save | PASS |
| Người thứ hai chiếm cùng lease | PASS: từ chối |
| Direct-status-CAS với legacy deny | PASS: ACK/revision/audit/readback |
| Lease cũ không cứu cột deny ở server save | PASS: từ chối |
| Sửa ID/STT hoặc guest tự cấp quyền | PASS: từ chối |
| Quyền cũ sau cleanup | PASS: canonical nguyên vẹn |
| Hồ sơ/quyền/lease QA | PASS: thu dọn đúng path/ETag, không còn |

Lượt tự động Google sign-in bằng thông tin OAuth CLI trả `auth/invalid-credential`; đây không phải kết quả Rules FAIL và không được tính là admin PASS. Không giả danh Google. Đã hoàn tất bằng **phiên Google admin thật đang đăng nhập Chrome** trên website thực tế:

1. Trang Tài khoản xác nhận Firebase connected và quản trị toàn hệ thống; không đăng UID/token lên GitHub.
2. Tạo riêng một hồ sơ `QA231-ADMIN`, lọc bằng marker duy nhất để tránh thao tác hồ sơ thật.
3. Mở editor Nội dung trình, sửa chỉ canary và bấm Áp dụng. Cột content=false cho khách; server chấp nhận admin qua session binding hiện hành.
4. GET Cloud độc lập lúc `17:29:57.562Z` UTC xác nhận đúng content, revision=2 và audit before/after. Receipt `ACTUAL_GOOGLE_ADMIN_BROWSER_CANARY_PASS`.
5. Thu dọn riêng canary/lease mới bằng exact path/ETag; quyền cũ canonical không đổi. Chrome realtime trở lại 59 nội dung; xóa bộ lọc QA, không lưu bố cục/quyền hoặc sửa hồ sơ thật.

**Tổng kết nghiệm thu Rules: PASS cho guest và actual Google admin. Business-record writes = 0; preexisting-permission writes = 0.** Các lần fail/HOLD xác thực trước được giữ trong log riêng, không bị che bằng cách đổi test. Website client hiện hành tương thích Rules mới; UI của PR #231 vẫn phải nghiệm thu sau Pages release.

## Merge và Actions

- GitHub premerge: mergeable=true, mergeable_state=clean, draft=false, 11/11 check-runs success. Merge API có `expected_head_sha=d8744b2932d8de3f6557b3fcef3768f7119fc6b7`; không force/bypass.
- **Merge SHA:** `29c6ab700e7dad807226daaf12b07cc86bf990f3`. Đối chiếu source tree với feature HEAD không có khác biệt.
- [Publisher push run 45049904159](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45049904159): workflow SUCCESS, release-gate SUCCESS, **publish SKIPPED**. Đây là HOLD đúng thiết kế, không phải đã phát hành.
- [Operational QA sau merge 45049904189](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45049904189): SUCCESS.
- [Pages build/deployment 45049903607](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45049903607): SUCCESS cho artifact đang có trong main, không tạo source bundle PR mới. Không suy thành version mới.
- Website trước owner publish vẫn source `f1a307d40e91b75ce38bbb9dd7071607e23acde2`, status_cas=true. Chưa có source_sha merge ở website.

## Cấu hình phát hành và thao tác owner còn thiếu

Đã đọc trực tiếp GitHub Settings → Actions variables bằng phiên owner trong Chrome: `HOPHDND_SPARK_PRODUCTION_CONFIRMED=true`, `HOPHDND_STATUS_CAS_PRODUCTION_CONFIRMED=true`. Approved Rules hash còn giá trị trước đó `e180280cc5225726dee36dcb7fd5a081f06ddc4bf74e6c64c8245d6e605eba34`.

Đã điền đúng hash Rules mới và bấm Update variable; GitHub mở **Confirm access → Verify via email**. **Thay đổi chưa được xác nhận lưu.** Dừng tại xác thực tài khoản, không tự lấy email/OTP, không vượt cổng. Trang xác thực đang mở trong Chrome để chủ tài khoản thao tác. Không đổi `HOPHDND_PAGES_APPROVED_MAIN_SHA` và không giả lập owner Run workflow.

Chủ tài khoản hoàn tất một luồng vận hành: xác thực email để lưu `HOPHDND_STATUS_CAS_APPROVED_RULES_SHA256` đúng hash đã deploy → [Build and publish HopHDND Pages](https://github.com/cavoixanh638/HopHDND-WebApp/actions/workflows/publish-pages.yml) → Run workflow → main. Main phải vẫn là SHA đã duyệt; nếu tiến thêm, cần kiểm delta và source SHA mới. Sau đó Codex kiểm run/jobs, `version.json.source_sha`, menu không còn quyền chi tiết, checkbox Cho sửa theo cột/Save-Cancel, hai vai trò và hồi quy website trước khi DONE.

## Ma trận cuối pha

| Hạng mục | Trạng thái |
| --- | --- |
| Audit/code/CI exact source | PASS |
| Backup Rules và quyền production hẹp | PASS |
| So sánh Cloud/candidate, restore localhost | PASS |
| Phê duyệt exact Rules hash | PASS — user chat |
| Deploy Rules Cloud/readback | PASS |
| Guest/admin canary production + cleanup | PASS |
| Merge PR #231 | PASS |
| Spark/status-CAS confirmed flags | PASS — true/true |
| Lưu approved Rules hash mới trong Actions | HOLD — GitHub email reauthentication |
| Pages owner-dispatch/publish mới | NOT_RUN |
| Website version/UI mới + acceptance toàn đợt | NOT_RUN |
| Rollback Rules/quyền | PASS hẹp — backup và restore drill; không phải full business-data backup |
| Issue #232 DONE/closed | HOLD — giữ OPEN |

Rollback nếu phát hiện lỗi dùng đúng snapshot Rules production riêng tư rồi readback; không dùng nhánh backup mã nguồn thay Rules và không restore business data cũ lên các ghi ACK. Approved Rules variable phải theo phiên bản Rules thực tế khi rollback; không bypass guard hoặc xóa legacy data.
