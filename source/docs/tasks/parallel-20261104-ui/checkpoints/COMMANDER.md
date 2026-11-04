# Checkpoint tổng chỉ huy — 04/11/2026, 09:09 ICT

- **Status: IN_PROGRESS (coordination; chờ bàn giao A/B).** Nhánh ghi duy nhất: `ui/20261104-coordination`.
- **Code baseline:** `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`; tất cả nhánh A/B/coordination bắt đầu tại commit tài liệu `6031ef55e53fc83c1ae93897359727d3740de43a`. So sánh GitHub baseline...HEAD: ahead 1/behind 0, chỉ thêm 10 file nhiệm vụ/chứng cứ; chưa có thay đổi mã worker.
- **A** `ui/20261104-table-layout`: observed HEAD `3ddfc08deaff16ef6ab133025a5e43dcfbf5f6a2`; checkpoint khảo sát `IN_PROGRESS` (có thể lùi một commit); thay `CompactGroupedValue.tsx` +52/-24; tested SHA: NOT RUN; CI worker: NOT RUN. Owner: worker A, writer riêng.
- **B** `ui/20261104-admin-controls`: observed HEAD `dc14b054328d04aed66586e217cb2300e316b947`; checkpoint `IN_PROGRESS`; chỉ checkpoint docs, chưa code mới; tested SHA: NOT RUN; CI worker: NOT RUN. Owner: worker B, writer riêng.
- **Baseline CI evidence (không thay gate worker):** tại code SHA `d779dde0...`, [Verify HopHDND source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316595), [grouped cell Chrome](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316556), [isolated Firebase staging](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316559) đều completed/success; một số workflow không áp dụng được skipped. Không coi CI baseline là CI cho mã mới.
- **Integration code SHA:** chưa có; tested SHA: NOT RUN; HTML QA/hash: NOT RUN; private Site deployment: NOT RUN. Chưa merge `main` hoặc deploy Firebase production.
- **Xung đột:** chưa có file nguồn A/B đổi; ranh giới trong README tách biệt. Kiểm lại diff thực trước khi gộp.
- **Tracker:** [TRACKER.md](../TRACKER.md), update duy nhất trên nhánh điều phối. Mốc theo dõi đầu tiên dựa trên HEAD/checkpoint/CI trực tiếp GitHub.
- **Ba bước kế:** (1) theo dõi HEAD/checkpoint/CI của A/B trong phiên đang hoạt động; (2) đối chiếu diff/SHA/run/screenshot khi worker push; (3) sau hai bàn giao hợp lệ mới tích hợp, chạy gate và cập nhật Site demo riêng tư nếu có quyền.

- **Mốc kiểm thứ hai:** A/B đã bắt đầu; compare với `6031ef55` cho thấy A thay đúng JSX vùng A, B chỉ checkpoint; Actions head_sha hiện 0 run cả hai. Chưa nghiệm thu, chưa tích hợp.
