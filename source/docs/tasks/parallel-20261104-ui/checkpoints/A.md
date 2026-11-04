# Checkpoint A — CI đang chạy đúng SHA (04/11/2026)

- Status: **TEST_PENDING**. Branch `ui/20261104-table-layout`; baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`.
- Code SHA đang kiểm: `68bc3be9d3f085f92d3903a1e11ad16ec517293a`. Draft PR QA: https://github.com/cavoixanh638/HopHDND-WebApp/pull/153 (không merge).
- Thay đổi: `CompactGroupedValue.tsx`, `item-frame.css`; regression thêm `source/tests/ui-20261104-worker-a.test.tsx`; cập nhật Chrome oracle `source/scripts/pr95-v6-l1-browser.mjs`. Không sửa nguồn B/tracker/backend.
- Unit và typecheck được các job xác nhận **PASS (từng bước)** đúng code SHA: [V6 L1 #41760082138](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082138), [V5 L3 #41760082107](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082107). **Chrome: đang chạy, chưa PASS**; build synthetic V5 L3: PASS trong job, chưa chốt toàn run. [Verify source #41760082109](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082109): typecheck PASS.
- Chưa có screenshot, tọa độ x và nghiệm thu desktop/900/390 toàn bộ. Tuyệt đối không ghi DONE.
- Bước kế: (1) đọc lỗi/pass cuối của Chrome run; (2) nếu lỗi, sửa nguồn/test và chạy lại đúng SHA mới; (3) cập nhật evidence, checkpoint, bàn giao tổng chỉ huy.
