# G02 — Bảng thống kê chỉnh trực tiếp (18/11/2026)

## Nhận việc và giới hạn
- Prompt: `source/docs/tasks/inline-admin-prompts/G02.md`; BASE `2ace3304a299d23ca6414c6ba6dc30f16266e9c2`.
- Branch: `g02/20261118-inline-report-tables`; PR **https://github.com/cavoixanh638/HopHDND-WebApp/pull/210** (draft, hướng `main`, KHÔNG merge).
- Không thay Firebase production, Excel/Item, Rules, workflow, package.json, source/AGENTS.md hoặc biến phát hành.
- Code SHA trước checkpoint: `745f31d4323bb325e795719265e7f6118c35f923`.
- Tested SHA độc lập từ GitHub Actions: `0400c93ad84a738107afa4c9f07013bb4ac038b0` cho typecheck + unit; **chưa phải bằng chứng của HEAD cuối** (thay đổi sau đó giới hạn ở in/PDF và CSS). Khi CI HEAD mới có kết quả sẽ cập nhật.
- GitHub CI: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/44289775573 — bước Typecheck PASS, Unit tests PASS ở Tested SHA nêu trên. Không tự nhận đã chạy npm cục bộ.

## Phần mã bàn giao
- `source/src/app/App.tsx`: bật/tắt nút “Chỉnh giao diện báo cáo” chỉ trong Admin overview, controls mặc định ẩn; danh sách báo cáo ẩn để bật lại; relay kéo và Alt+arrow, gọi writer `saveLayout` đã có sau mỗi thao tác hoàn chỉnh. Writer Firebase dùng revision/CAS; lỗi thì rollback draft + hiển thị cảnh báo xung đột.
- `source/src/features/reports/ReportTable.tsx`: đổi tên bút chì/Enter/Esc, tay kéo bảng, mũi tên, kéo đầu cột để reorder, ẩn/hiện cột, kéo biên bằng `ColumnResizeHandle`. Giữ nút In/PDF và count-drill, loại bỏ edit controls khỏi bản in.
- `source/src/features/reports/inline-g02-report-actions.ts`: reducer thuần, kiểm tra ID, tên, độ rộng và cột hợp lệ; không đụng item/status; `showNotRequiredColumn` thay đổi độc lập `includeNotRequired`.
- `source/src/features/reports/inline-g02-report.css`: style gọn khi Admin chỉnh, responsive 900px, focus rõ ràng, giảm chuyển động, không thay bố cục read-only.
- `source/tests/inline-admin-g02-actions.test.ts`: fixture dữ liệu mẫu để so trước/sau về tổng, số hoàn thành, ẩn/hiện bảng, đổi tên, reorder bảng/cột, hiện/ẩn “Không phải trình”, giới hạn width.

## Kiểm chứng
| Bài | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| GitHub typecheck trên `0400c93` | PASS | Verify HopHDND source run 44289775573 bước Typecheck |
| GitHub unit test trên `0400c93` | PASS | Verify HopHDND source run 44289775573 bước Unit tests |
| Typecheck và test **đúng HEAD cuối** | NOT_RUN | Đợi workflow CI của commit cuối có kết quả; không đánh tráo Tested SHA cũ |
| Chrome drag/drop + 900px/mobile + A4/PDF đúng HEAD | NOT_RUN | Môi trường container không clone được GitHub do DNS; cần CI/browser fixture thực tế |
| Firebase Emulator đúng HEAD, conflict & rollback 2 user | NOT_RUN | Không thử production; cần kiểm chứng CI emulator / staging |
| Quyền guest, không ghi dữ liệu khi chỉnh, drilldown popup | NOT_RUN | Đã giới hạn hiển thị và callback bằng `adminTools` + `inlineAllowed`; browser QA chưa thực hiện |
| Diff chỉ file được G02 sở hữu | PASS | GitHub PR changed-file list đã đối chiếu trước checkpoint |

## G00 tích hợp / rủi ro
- G00 review PR và chạy nghiệm thu Chrome, guest/admin, dữ liệu giả, in A4, resize, drag/drop và quyền CAS trước merge.
- Chỉ G00 quyết định merge, tích hợp toolbar G03, publish. Không tự thay writer/Firebase Rules.
- Hành vi lưu một thao tác qua writer `firebase.common.save('reports',next,revision)` đang dùng trong `ReportSettings`; lỗi conflict rollback và nhắc nạp lại cấu hình, chưa được nghiệm thu hai tài khoản trên Emulator.
- Cần bảo đảm kết quả CI của **exact final Code SHA**; không kết luận DONE phạm vi độc lập trước khi có bằng chứng này.
