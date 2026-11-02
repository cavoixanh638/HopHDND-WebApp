# Chat 5 — Đóng gói, cấu hình và chuẩn bị phát hành

**Đây là file đầu vào duy nhất cần gửi cho chat mới hoặc chat tiếp tục luồng 5.**

## Đọc trước, rồi thực hiện

1. [Quy ước chung](QUY_UOC_CHUNG.md).
2. [Checkpoint Chat 5](handoffs/CHAT_5.md) trên **nhánh luồng** bên dưới.
3. Các phần nhiệm vụ trong file này và `source/AGENTS.md` của checkout.

- Nhánh làm việc cố định: `parallel/20261102-chat5-release`.
- [Link vào đúng nhánh](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat5-release/source/docs/tasks/parallel-20261102/CHAT_5_RELEASE.md).
- [Checkpoint mới nhất của luồng](https://github.com/cavoixanh638/HopHDND-WebApp/blob/parallel/20261102-chat5-release/source/docs/tasks/parallel-20261102/handoffs/CHAT_5.md).
- Mốc mã nguồn chung: `0a04b81dbb00979fb87aee7fc497e802058d8518`; khi tiếp tục phải dùng HEAD nhánh luồng,
  không reset về mốc này.
- Báo cáo kết quả của mình: `source/docs/tasks/parallel-20261102/reports/CHAT_5.md`.
- Checkpoint của mình: `source/docs/tasks/parallel-20261102/handoffs/CHAT_5.md`.

Không cần đọc lại toàn bộ chat cũ. Nếu checkpoint đã DONE, báo kết quả đã có
và không tự khởi động một vòng sửa mới. Nếu đang làm, tiếp tục bước kế tiếp
sau khi đối chiếu git/CI; giữ nguyên phần việc chưa commit của người trước.

## Mục tiêu

Hoàn thiện quy trình đóng gói và chuẩn bị phát hành tái lập được trên bản xuất
phát. Không chờ các chat khác; công cụ phải nhận SHA đầu vào để điều phối dùng
lại cho bản tích hợp sau này.

## Phạm vi sở hữu

- `source/scripts/pr147-package-artifacts.mjs`
- `source/scripts/pr147-release-validate.mjs`
- `source/scripts/pr147-default-deploy-guard.mjs`
- `source/firebase.json`, `source/firebase.release.json`,
  `source/firebase.staging.json` (chỉ khi cần cho chuẩn bị phát hành/diễn tập).
- `.github/workflows/pr147-package-rehearsal.yml`,
  `.github/workflows/publish-pages.yml`.
- `source/docs/releases/`
- QA riêng `source/parallel-qa/chat5/`, workflow mới
  `.github/workflows/parallel-chat5-*.yml`.

Không sửa nội dung Rules, runtime backend/UI, operator/backup, root package/lock,
workflow dùng chung khác hoặc backend service lockfiles.
Không chạy đường deploy/publish dù được sửa mã của workflow đó.

## Hiện trạng và nguồn đọc

Mốc chung có [package CI](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964348)
và [artifact 13117855340](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41390964348/artifacts/13117855340):
sáu TAR, hai lần dựng có checksum giống nhau, **Emulator-only**.
Default Firebase config trỏ sentinel Rules không tồn tại; release template
còn REQUIRED_UNVERIFIED. Không thay placeholder bằng dữ liệu production tự đoán.
Tracked manifest cũ là preparation dossier, không phải manifest promotion cuối.

## Làm trọn phần việc

1. Rà chuỗi checkout sạch → npm ci theo lockfile → build → đóng gói →
   manifest/checksum → giải nén và đối chiếu nguồn/cấu hình.
2. Gói/validator phân biệt ordinary web, demo localhost web và production web.
   Thiếu thông tin/approval phải dừng an toàn. Không gán production-ready cho
   web localhost hoặc build còn tắt V2.
3. Xác minh offline default deploy guard; giữ chặn tự publish khi main đổi
   mà chưa có đủ điều kiện. Không thử guard bằng lệnh deploy thực.
4. Hoàn thiện quy trình chọn SHA và dựng lại gói: tên, nguồn, dependency locks,
   Rules raw hash, service regions, manifest và checksum gắn đúng đầu vào.
   Không chỉ đóng gói file cũ đã có trong working tree.
5. Tự chạy gói diễn tập, giải nén kiểm tra, xác minh tái lập khi có thay đổi.
   Kiểm artifact hết hạn có cách lưu/tái tạo bằng nguồn và lock đã ghim.
6. Ghi runbook phát hành: backend + FULL Rules trước, xác minh xong mới web;
   nêu đầu vào chưa biết và cách operator kiểm chứng, STOP/rollback có đối soát
   ACK. Đây là chuẩn bị quy trình, không thực hiện production.

## Điều kiện hoàn tất

- Công cụ/gói diễn tập dùng được, đúng SHA, checksum và nguồn.
- Config/validator fail closed khi đầu vào thiếu hoặc trộn môi trường.
- Hướng dẫn tái tạo cho SHA tích hợp tương lai không cần sửa script bằng tay.
- Bàn giao riêng kết quả code, package diễn tập và production NOT RUN.
- Không phụ thuộc chat khác cung cấp mã mới trong đợt làm này.

## Nhắc về bàn giao khi gần hết context

Cập nhật checkpoint theo [mẫu](HANDOFF_TEMPLATE.md), lưu công việc vào nhánh riêng,
ghi điều đã thử, kết quả thật và bước tiếp theo cụ thể. Dòng bàn giao cho người dùng:
“Để tiếp tục Chat 5, gửi lại link file nhiệm vụ này; checkpoint đã cập nhật tại …”.
Không chỉ để trạng thái trong câu trả lời chat.
