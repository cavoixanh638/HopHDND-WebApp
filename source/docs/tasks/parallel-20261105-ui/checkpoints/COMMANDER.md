# COMMANDER checkpoint — 05/11/2026 (đầu phiên)

## Checkpoint đầu tiên, trước kiểm sâu

- Trạng thái: **IN_PROGRESS / WORKERS_NOT_STARTED**. Mốc kiểm ban đầu (giờ VN): 05/11/2026, sau commit chung [aa135cf](https://github.com/cavoixanh638/HopHDND-WebApp/commit/aa135cfb07fbc29fe642da8710bfb11d61941927) ngày 05/11 04:41:44 UTC.
- Baseline nhiệm vụ: `d8c994c44f7bd11b685d82f8f955ffab99065ea9`; coordination HEAD trước checkpoint: `aa135cfb07fbc29fe642da8710bfb11d61941927` (commit chỉ mô tả ảnh).
- HEAD bốn nhánh REF/UI/WIDTH/DATA: **đều `aa135cfb07fbc29fe642da8710bfb11d61941927`**. Bốn checkpoint riêng vẫn ghi **NOT_STARTED**; chưa có code SHA/test SHA mới, không có workflow runs trên bốn nhánh (GitHub Actions list branch `total_count=0`); tình trạng kiểm thử delta: **NOT RUN**.
- Ownership: REF registry/overlay; UI CompactGroupedValue/item-frame; WIDTH ItemList/item-preferences/admin controls; DATA shared/domain/service/migration. Chưa đủ cơ sở xác nhận worker đang chạy nên **không ghi file trong phạm vi worker**. Khởi động worker độc lập là dependency; connector GitHub hiện chỉ đọc/ghi repo, không tự kích hoạt bốn chat/agent bên ngoài.
- Site demo từ hợp đồng README: `appgprj_6ae93f17c2e48191815caef8a642fa14` stale v2; **SITE_PENDING**, chưa xác minh có Sites API hay quyền owner-only. Không cập nhật Firebase live, không merge main, không deploy production.

## Việc kế tiếp

1. Cập nhật TRACKER theo sự kiện được xác minh, với owner/HEAD/code-test SHA/PASS-FAIL-NOT RUN/run URL/thiếu sót.
2. Ghi prompt tiếp quản thực thi độc lập cho REF/UI/WIDTH/DATA, không đụng file worker; chỉ tiếp nhận bằng commit/checkpoint và CI thực.
3. Kiểm diff ownership, bằng chứng QA, rồi mới lập SHA tích hợp; nếu chưa có worker/code thì giữ **BLOCKED_WORKERS**, tuyệt đối không tuyên bố nghiệm thu.
4. Trước mọi tích hợp, đọc lại HEAD/checkpoint và CI để tránh ghi đè worker đang hoạt động; sau mỗi mốc ý nghĩa cập nhật checkpoint/tracker. Không tạo no-op.

## Mốc tiếp theo: worker bắt đầu commit, integration vẫn bị chặn

- Commander tracker commit [`95ef5f4`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/95ef5f4e7073bd54826c2f46361f4e3ab615b117). Diff so mốc chung `aa135cf`: REF sở hữu registry CSS/component/test; UI sở hữu CompactGroupedValue/CSS/test; WIDTH sở hữu preferences, `item-layout-merge.ts` đã được owner công bố mở rộng, và sau đó ItemList/admin CSS; DATA vẫn chưa có diff lúc quan sát.
- Quan sát sự kiện mới tiếp theo: REF HEAD [`06d3b37`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/06d3b37e97ed4e78c7d5e3db294bba6dc54f4aff), UI HEAD [`5cf1721`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/5cf172171229d2b77928fb27c37db58ff3b9e1b2), WIDTH HEAD [`dfbd170`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/dfbd17039e75795d7123e438d3053f5a055463e4), DATA HEAD `aa135cf`. **Worker đang ghi; không cherry-pick/import snapshot chưa chốt.** Các HEAD cập nhật nhanh hơn tracker; phải refresh cùng checkpoint/CI khi nghiệm thu.
- Chưa có external Site API trong tập connector được công bố qua discovery (không tìm thấy action Site/deploy). **SITE_PENDING**: cần kết nối quyền thao tác Site riêng tư hiện có, kiểm owner-only và deployment status, trước khi gọi DONE. Không dùng GitHub Pages production thay Site.

### Prompt tiếp tục đúng owner nếu luồng mất writer

**REF trên `ui/20261105-ref-codes`:** Đọc `README.md`, `WORKER-REF.md`, checkpoint REF, HEAD mới nhất. Hoàn tất registry semantic L03/L04/L06, subfields mọi ô/popup và copy chỉ admin hover/focus; kiểm mã ổn định qua reorder, identity qua `data-ui-reference-record-id`; chạy typecheck/unit/Chrome hoặc ghi chính xác blocker; commit/push và cập nhật checkpoint SHA + evidence. Không sửa UI/ItemList.

**UI trên `ui/20261105-picker-layout`:** Đọc `README.md`, `WORKER-UI.md`, checkpoint UI và HEAD; hoàn thành parity mẫu UBND ở sáu picker, L03 compact 2/3 aligned, attr L01/L03, permission/keyboard/list/popup/screenshot/rects. Không sửa WIDTH, DATA, registry. Chạy tests thực, ghi SHA/run hoặc blocker và commit checkpoint.

**WIDTH trên `ui/20261105-column-width`:** Đọc `README.md`, `WORKER-WIDTH.md`, checkpoint WIDTH, HEAD; hoàn tất 2 whole-cluster widths persist CAS, admin control, per-row mode, cột vật lý compact readonly/mixed, 1440/900/390 browser/refresh, test. Giữ CSS variables contract; không sửa CompactGroupedValue; ghi test SHA/run/artifact và commit checkpoint.

**DATA trên `ui/20261105-party-data`:** Đọc `README.md`, `WORKER-DATA.md`, checkpoint DATA, HEAD; làm catalog `Không/TTTU/BTV/BCH`, transaction quyền hẹp và race/lease/CAS, Firebase Emulator tests, dry-run migration inventory/manifest/idempotency/rollback; đưa patch contract App.tsx cho commander. **Không ghi live**; commit/push code/test/evidence và checkpoint với SHA. Không sửa App.tsx hay UI.

**Commander next:** Chờ các worker đóng checkpoint với bằng chứng; update tracker theo HEAD/CI thực; sau đó kiểm diff file ownership, tích hợp App.tsx/glue và attr recordId trên coordination, test exact SHA, build + hash, thử Site chỉ khi owner-only được xác minh. Không chấm DONE cho integration hoặc Site hiện tại.

## Checkpoint dừng phiên kiểm, trạng thái chưa DONE

- Tracker cập nhật mới nhất tại [`34b8574`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/34b8574c25a31f2625db29e6c83ce8dfcdc5c75a).
- HEAD cuối đã đọc: REF [`877b309`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/877b309543382fa24c919fea3f7540b41d2ce78a), UI [`dd05d21`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/dd05d21a25b6ef852d525d3249af5e94212fe6ba), WIDTH [`d933b64`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/d933b64e2f7d990822a2d172cce049135b3980b6), DATA `aa135cf`. REF/WIDTH còn commit liên tục; đừng lấy tracker snapshot làm HEAD hiện hành.
- **NO INTEGRATED SHA / NO CI / NO PACKAGE HASH / SITE_PENDING**. Cần DATA commit/handoff và các worker xác nhận ngừng ghi trước khi tích hợp. UI đã handoff code và test nhưng tự báo Chrome/CI NOT RUN. Do hạn chế không có checkout/dependencies và không có Sites API, không tự khẳng định Chrome/Emulator/deploy. Site chưa cập nhật; Firebase production không thay đổi bởi commander.
- Nếu tiếp quản ngay: kiểm lại HEAD/checkpoint/CI của cả bốn worker, chỉ tích hợp delta chính xác; kiểm mâu thuẫn WIDTH/UI (width nội bộ CSS), REF recordId của list + popup; sau DATA handoff nối transaction `App.tsx`; tạo artifact và hash chỉ từ build thật. Không dùng `main` và không viết live RTDB.
