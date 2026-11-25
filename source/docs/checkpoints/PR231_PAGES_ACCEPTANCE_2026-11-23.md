# PR #231 — Biên nhận Pages và nghiệm thu cuối 23/11/2026

Nguồn điều phối: [Issue #232](https://github.com/cavoixanh638/HopHDND-WebApp/issues/232), [PR #231](https://github.com/cavoixanh638/HopHDND-WebApp/pull/231). Các receipt Rules/private backup/canary và giới hạn phạm vi tại [biên nhận Rules](PR231_PRODUCTION_RULES_2026-11-23.md); preflight và 11 CI exact feature HEAD tại [preflight](PR231_COLUMN_ONLY_CLOUD_PREFLIGHT_2026-11-22.md). Tài liệu này bổ sung kết quả phát hành thực, không xóa các checkpoint HOLD trước đó.

## Lỗi run #128 và cách sửa

[Run #45094072798](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45094072798), owner `cavoixanh638` thực hiện workflow_dispatch trên main source `29c6ab700e7dad807226daaf12b07cc86bf990f3` lúc `2026-11-23T01:21:02Z` (08:21 UTC+07).

Attempt 1 FAIL tại `Confirm direct-status-CAS release gate`, lỗi `STATUS_CAS_HOLD: candidate Rules SHA mismatch`. Log cho thấy biến `HOPHDND_STATUS_CAS_APPROVED_RULES_SHA256` vẫn là hash cũ `e180280cc5225726dee36dcb7fd5a081f06ddc4bf74e6c64c8245d6e605eba34`, trong khi generator/Emulator xuất Rules hash `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b`. Guard chặn đúng; các bước typecheck/unit/Chromium/Spark/docs trước đó PASS. Build/push chưa chạy ở attempt này.

Đã điền đúng hash đã được duyệt và triển khai. GitHub yêu cầu Confirm access qua email; chủ tài khoản tự hoàn tất xác thực và lưu biến, không cung cấp OTP trong chat. Đã điều hướng mới tới trang variable để đọc lại toàn bộ hash chính xác. Không sửa `HOPHDND_PAGES_APPROVED_MAIN_SHA`, không đổi source, workflow hoặc cơ chế approval.

Đã rerun failed jobs của **chính owner run #128**, giữ nguyên event, owner actor và source SHA đã duyệt; không tạo dispatch giả. **Attempt 2 SUCCESS**, release-gate/publish/guarded commit+push đều PASS. Log `APPROVED_RULES_SHA256` là đúng hash mới; có `Pages published from CI-verified main SHA (mode: approved)` lúc `2026-11-23T01:34:59.9357260Z`.

## Bằng chứng build và test

| Hạng mục | Kết quả |
| --- | --- |
| Source đã duyệt/merge | `29c6ab700e7dad807226daaf12b07cc86bf990f3` |
| Feature HEAD có 11/11 CI | `d8744b2932d8de3f6557b3fcef3768f7119fc6b7`; source tree bằng merge |
| Publisher | [45094072798 attempt 2](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45094072798), SUCCESS |
| Unit | 1158 PASS, 170 conditional SKIP; không tính SKIP là PASS |
| Typecheck, Chromium Save/Cancel/dropdown, docs | PASS |
| Spark Auth/RTDB/local-operator suites | 60 + 14 PASS; exact Rules hash verified |
| Direct-status-CAS + independent security | 37/37 PASS |
| Generated Rules / public bundle / guarded push | PASS |
| Build artifact commit | `bb16d3f98dde569dd111108578e10263320b1166`, parent là source SHA đã duyệt |
| Artifact scope | Chỉ index.html, version.json và assets mới; không đổi source hoặc dữ liệu |
| Actual Pages deployment | [45095362949](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45095362949), SUCCESS |
| HTTP version.json | `mode=spark`, đúng source SHA `29c6ab700e7dad807226daaf12b07cc86bf990f3`, `status_cas=true` |

## Nghiệm thu website thực

- Phiên khách trên in-app browser: tải 59 nội dung, không còn chặn startup sau khi kết nối Firebase, không có UI cấp quyền dòng/ô; 0 error trong console được kiểm tra.
- Phiên Google admin hiện có trong Chrome, tải lại bản mới: menu không còn `Phân quyền chỉnh sửa ô`; Chỉnh sửa mở `Quản lý cột nâng cao`. `Cho sửa` hiển thị cạnh từng cột; ID/STT không bật quyền sửa.
- Save/Cancel ở production: lúc sạch, Lưu thay đổi bị vô hiệu; bật thử checkbox chỉ tạo nháp, bật nút lưu và báo có thay đổi; chọn Về chế độ xem rồi Bỏ phần đang sửa, toast xác nhận đã bỏ nháp, bảng vẫn 59 nội dung. Không bấm lưu thay đổi quyền cũ. CAS/persistence và Save/Cancel có test thực trên Emulator trong pipeline; Cloud guest/admin save/revision/audit đã PASS ở canary riêng của pha Rules.
- Quyền Cloud đã kiểm bằng canary thật ở pha trước: column deny chặn dù legacy allow; column allow vẫn sửa dù legacy deny; lease/direct-CAS/ID-STT/guest self-grant fail-closed. Google admin thật lưu riêng canary thành công, GET độc lập xác nhận revision và audit. Tất cả canary mới được thu dọn; không lặp thêm các phép ghi production không cần thiết.
- HTTP version marker và build/deployment receipt chứng minh web mới, không suy SUCCESS từ release-gate hoặc publish SKIPPED của run push trước.

## Firebase và bảo toàn dữ liệu

Raw approved Rules SHA256 `1b397824d2f225f92353a96c3ac57f84fe22ec6ecab2f814d814ee205af6120b`. Cloud canonical SHA256 vẫn `48d39329ebf0823e6ab6f9655f87b0d133e060b29db4c29dc4ceb7d952c15a65`; read-only kiểm trước/đồng thời publish lúc `2026-11-23T01:35:15.406Z` khớp candidate. Permissions canonical SHA256 `c304945096d72021dade33550cd84396d28186ac29a7d5525a0b986da685c581`, V2 permissions/active null; đối chiếu snapshot gốc giữ nguyên. Kiểm tra sau hủy nháp tiếp tục dùng GET/canonical so với cùng snapshot.

Không deploy lại Rules, không sửa hồ sơ thật hoặc dữ liệu quyền đã tồn tại trong pha sửa run. Lưu dữ liệu/UID/credentials/readback ở kho private; chỉ công bố receipt/hashes. Backup hẹp Rules/quyền đã restore/compile trên localhost; không tuyên bố có full business-data backup hoặc restore mới.

## Ma trận kết thúc

Audit/CI exact source, approval, backup/readback/restore hẹp, policy diff, deploy Rules/readback, guest/admin canary/cleanup, merge expected HEAD, owner workflow approval, approved Rules variable, build/push, Pages actual deployment, live source version và UI hai vai trò: **PASS** theo bằng chứng tương ứng bên trên.

Các test không thực hiện vì bảo toàn dữ liệu: thay đổi quyền cột đang áp dụng hồ sơ thật, ghi hồ sơ thật, đóng băng/import/restore dữ liệu production hoặc diễn tập rollback trên production. Các luồng ghi này có kiểm thử cô lập; không cần làm lại trên dữ liệu thật để nghiệm thu bản phát hành chỉ thay chính sách cột. Không ghi PASS cho hành động production không chạy.

Rollback sẵn sàng trong phạm vi: giữ private Rules snapshot/readback/restore drill, permissions snapshots và source/version trước đó; khôi phục bằng đúng quy trình, cập nhật approved Rules hash theo bản thật, không restore dữ liệu cũ đè ACK hoặc xóa legacy quyền. Khi chỉ cần rollback web, phát hành source đã lưu qua guard tương tự, không đẩy artifact thủ công hoặc bypass owner approval.
