# STAGES checkpoint — 07/11/2026

Status: IN_PROGRESS.
Branch: `ui/20261107-picker-parity-stages`.
Application/reference baseline: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`.
Start HEAD: `2c20202236e557a82368924bf63f382a3e521912`.
Code SHA mới (candidate): `e50622d9b882b135cc8a56a805ec58ee4fcbe758`; tested SHA mới: NONE; tests mới: CI QUEUED.

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

## Batch code đã đẩy
- `32323252358c24c45ef8043d62b032d778efd678`: tạo `picker-parity-stages.css` scoped L03 (trigger 26px/11px/550, caret 5x3, hover lift 3px, readonly 13px/400, giữ màu workflow).
- `f47b6e1a699228c001de8ff0ed74208911693ec6`: nối `@import "./picker-parity-stages.css";` trước mọi rule trong `l03-track-widths.css`; không đổi 5width model/gaps.
- `38836abbbb2bb7745c7e4c15b4b4a1da1cbd7eb5`: unit guard + 2 bộ width và JSON reload.
- `05508fc98c016bf8c49c6d0c85e2411439f275f9`: real Playwright Chromium script có test List/popup, admin/guest/mixed, width 1440/900/390, hover/focus/open/click/keyboard, đo rect/computed style + screenshots.
- `e50622d9b882b135cc8a56a805ec58ee4fcbe758`: workflow riêng, npm ci/typecheck/own units/full synthetic build/real browser + 5input regression.
- CI đang chờ kết quả: https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42266019366 ; source SHA `e50622d9b882b135cc8a56a805ec58ee4fcbe758`. **Không gọi PASS khi queued**.
- Không sửa `CompactGroupedValue`, L01/L04, shared CSS, model/backend; không merge/deploy.

## Cần tiếp tục ngay
Đọc job logs GitHub Actions; sửa test/CSS khi có lỗi computed style/real browser; thử lại trên SHA mới, xác minh artifacts. Bổ sung Không/highlight/reduced-motion/scroll-resize và persistence evidence nếu chưa đủ. Chỉ DONE nếu thực sự có tất cả commands/results, tested SHA, browser evidence.
