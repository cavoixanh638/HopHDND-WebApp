# STAGES checkpoint — 07/11/2026

Status: IN_PROGRESS.
Branch: `ui/20261107-picker-parity-stages`.
Application/reference baseline: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Start HEAD: `2c20202236e557a82368924bf63f382a3e521912`.
Code SHA mới: NONE; tested SHA mới: NONE; tests mới: NOT RUN.

## Đã đọc/xác nhận
- Entry `STAGES.md`, `README.md`, `PLAN.md`, `source/AGENTS.md` và checkpoint của role; HEAD lúc nhận chưa có source/test của STAGES.
- Sở hữu riêng CSS `picker-parity-stages.css` và import đầu `l03-track-widths.css`, kiểm thử prefix `picker-parity-stages`; không sửa shared picker/DOM/model/permissions hoặc nhánh worker khác.
- Baseline L03 sử dụng CSS grid/subgrid, 5 tracks riêng; `CompactGroupedValue.tsx` đã cung cấp `data-stage-field`, `data-level-layout`, `data-editable` để CSS scoped.
- Nhiệm vụ này không làm lại 3 acceptance jobs PASS của baseline; cần own-SHA tests/browser evidence.

## Đang thực hiện
Khảo sát cascade và test harness hiện có; sau đó triển khai CSS riêng, kiểm static/unit + full synthetic App browser 1440/900/390, ghi các đo, build/CI đúng head. Không dùng demo RAM làm bằng chứng persistence backend.

## Giới hạn môi trường
Kết nối `git` trực tiếp ngoài runtime không phân giải được github.com; GitHub connector đọc/ghi repo OK. Dự kiến đưa kiểm thử thật vào workflow riêng trên GitHub Actions để chạy với checkout nguồn thực. Chưa tuyên bố PASS cho bất kỳ test mới nào.

## Kết thúc
Chưa đủ DONE; tiếp tục HEAD, không reset/cherry-pick CONTENT. Không merge/publish.
