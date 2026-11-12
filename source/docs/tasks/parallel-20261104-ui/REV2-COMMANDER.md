# Gemini tổng chỉ huy — nghiệm thu UI REV2 và demo

Bạn là **chat tổng chỉ huy hiện có**, tiếp tục trên `ui/20261104-coordination`, không khởi động lại đợt trước. Đọc [yêu cầu mới](REV2-REQUIREMENTS.md), [tracker](TRACKER.md), [checkpoint của bạn](checkpoints/COMMANDER.md), [checkpoint A](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-table-layout/source/docs/tasks/parallel-20261104-ui/checkpoints/A.md) và [checkpoint B](https://github.com/cavoixanh638/HopHDND-WebApp/blob/ui/20261104-admin-controls/source/docs/tasks/parallel-20261104-ui/checkpoints/B.md). Xác nhận HEAD/CI mới nhất trên GitHub trước khi ghi. Code tích hợp đã PASS 9/9 tại `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9`; các commit docs sau đó không phải code mới. Site demo riêng tư còn `PENDING`.

## Việc phải làm

1. Bạn là writer duy nhất của `TRACKER.md` và `checkpoints/COMMANDER.md`. Mở các mục nghiệm thu **REV2 L01/L03** theo yêu cầu mới, giữ bằng chứng B và phần cũ đã PASS. Ghi owner A, SHA, kết quả test, ảnh/số đo và việc còn thiếu. Theo dõi commit/checkpoint/CI A theo sự kiện; nếu thiếu tiêu chí, chỉ rõ cho A cách sửa và điều kiện đóng, không tự sửa chồng file khi A đang ghi. Không cập nhật tracker khi trạng thái không đổi.
2. Khi A DONE REV2 có bằng chứng đúng SHA, tích hợp **chỉ commit/delta mới sau A HEAD đã nhận `9a78244ee09df782a9835fffae181249e8fc1371`** vào nhánh coordination hiện tại, tránh phát lại code cũ hoặc mất B. Kiểm diff và xung đột theo file. Nếu A cần sửa lại, giao A xử lý. Nghiệm thu trong browser thật: L01 bốn tổ hợp quyền, hover Loại VB giống Sở; L03 3 track khi cấp trình editable, 2 track khi readonly, quyền hỗn hợp, ba dropdown tiến độ cùng left/width/height, màu nền/chữ, list/popup, 1440/900/390 và cột hẹp. Giữ test/admin B đã PASS.
3. Chạy typecheck, unit, gate browser/Emulator liên quan trên **SHA tích hợp cuối**; đối chiếu mọi CI với SHA, lưu screenshot/số đo và dựng lại gói demo có hash. Cập nhật Site demo riêng tư hiện có `appgprj_6ae93f17c2e48191815caef8a642fa14` nếu có công cụ/quyền, xác minh owner-only, deployment succeeded, version/URL và thao tác chính. Nếu công cụ Site vẫn không khả dụng, ghi `SITE_PENDING` cùng blocker và bàn giao gói đúng SHA; không khẳng định đã deploy.
4. Hoàn thiện tracker/checkpoint/báo cáo tích hợp bằng chứng. DONE chung chỉ khi UI REV2, bản tích hợp và Site demo đều được xác minh; nếu Site bị chặn, phân biệt `CODE_PASS / SITE_PENDING`. Không merge `main`, không deploy Firebase production hoặc sửa dữ liệu thật.

## Nhịp làm việc

Worker B đã DONE, không mở lại. Không tạo chat/luồng mới. Đợt này người dùng **không cần lịch nền**; mỗi chat vẫn push checkpoint sau commit/test/lỗi/chặn và trước khi dừng để tiếp tục được sau hit limit. Nếu không có thay đổi thì không tạo commit hoặc báo cáo lặp.

