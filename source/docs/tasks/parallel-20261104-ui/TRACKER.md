# Tracker UI Danh sách — 04/11/2026

**Trạng thái chung: TEST_PENDING / CI FAIL — cả hai worker đã có code; A có Chrome gate xanh nhưng Verify source đỏ, B typecheck đỏ.** Baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`. Chỉ tổng chỉ huy cập nhật trên `ui/20261104-coordination`. Không lấy docs-only HEAD làm tested code SHA. Mốc kiểm tra 04/11/2026 sau PR #154 CI.

| Mục nghiệm thu | Owner | Trạng thái | Code SHA / tested SHA / bằng chứng | Còn thiếu |
|---|---|---|---|---|
| Nội dung trình: `(Sở - Loại VB)` và read-only nhẹ | A | TEST_PENDING | A code `3a057bb1`, HEAD `82e6fe0c` docs-only; V6 L1 #41760551214 PASS, V5 L3 #41760550820 PASS; Verify #41760550847 FAIL (legacy focus oracle) | Code, Chrome list/popup, screenshot |
| L03: cấp trình có quyền sửa, dropdown riêng và 3 cột | A | TEST_PENDING | A code `3a057bb1`, HEAD `82e6fe0c` docs-only; V6 L1 #41760551214 PASS, V5 L3 #41760550820 PASS; Verify #41760550847 FAIL (legacy focus oracle) | Code, kiểm quyền và geometry |
| L03: chỉ đọc 2 cột, ẩn cấp trình `Không phải trình` | A | TEST_PENDING | A code `3a057bb1`, HEAD `82e6fe0c` docs-only; V6 L1 #41760551214 PASS, V5 L3 #41760550820 PASS; Verify #41760550847 FAIL (legacy focus oracle) | Code, Chrome các trạng thái |
| Ba trạng thái L03 cùng hàng dọc; dropdown giống nhóm người phụ trách | A | TEST_PENDING | A code `3a057bb1`, HEAD `82e6fe0c` docs-only; V6 L1 #41760551214 PASS, V5 L3 #41760550820 PASS; Verify #41760550847 FAIL (legacy focus oracle) | Chrome pointer/key, 1440/900/390 |
| Admin thấy và đổi tên danh sách ở tiêu đề/tab | B | FAIL (typecheck) | B code `fca8f1d5`, HEAD `715370ac` docs-only; PR #154 CI #41761256237 FAIL TS1005 ItemList.tsx:670 | UI dễ tìm, lưu/reload, guest |
| Admin thấy và bật/tắt riêng C01/C02/C03 | B | FAIL (typecheck) | B code `fca8f1d5`, HEAD `715370ac` docs-only; PR #154 CI #41761256237 FAIL TS1005 ItemList.tsx:670 | UI, CAS và responsive |
| Bản tích hợp, CI đúng SHA, gói và Site demo riêng tư | Tổng chỉ huy | BLOCKED (worker gates) | HEAD điều phối ban đầu `6031ef55`; integrated/tested SHA NOT RUN; Site NOT RUN | Nhận A/B; diff/CI/test; HTML hash; demo; báo cáo |

## Nhánh và CI

- **A:** [HEAD](https://github.com/cavoixanh638/HopHDND-WebApp/commits/ui/20261104-table-layout), [checkpoint A](checkpoints/A.md): `NOT_STARTED`, code commit mới chưa có, CI đúng SHA mới chưa có.
- **B:** [HEAD](https://github.com/cavoixanh638/HopHDND-WebApp/commits/ui/20261104-admin-controls), [checkpoint B](checkpoints/B.md): `NOT_STARTED`, code commit mới chưa có, CI đúng SHA mới chưa có.
- **Baseline verified:** compare `d779dde0...6031ef55` của cả 3 nhánh = ahead 1 / behind 0, chỉ bổ sung 10 file nhiệm vụ. [Source](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316595), [grouped Chrome](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316556), [Firebase isolated](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316559) `success` tại baseline; **không** thay thế gate worker hoặc tích hợp.

## Nhật ký sự kiện

- **04/11/2026 09:09 ICT:** Commander đã đọc các nhiệm vụ, quy ước, checkpoint A/B, Git refs, compare và các run baseline. Chưa có thay đổi mã, test hay bàn giao từ A/B. Theo dõi và cập nhật khi xuất hiện bằng chứng mới, không tạo commit nếu không đổi trạng thái.

- **04/11/2026 — kiểm HEAD lần hai:** A tiến đến `3ddfc08deaff16ef6ab133025a5e43dcfbf5f6a2` với thay đổi `CompactGroupedValue.tsx` và checkpoint (checkpoint còn phản ánh mốc khảo sát, chưa bàn giao); B `dc14b054328d04aed66586e217cb2300e316b947` mới chỉ thay checkpoint. Cả hai chưa có run GitHub Actions theo HEAD, không đánh dấu PASS. Phạm vi file sửa hiện không chồng nhau; tiếp tục chờ bằng chứng.

- **04/11/2026 — commander audit:** A HEAD `82e6fe0ceaf6ccb566874942792db99d6b1b2c3c` (code/test SHA `3a057bb1609e5434f9328e1b2d5ed530991be776`), diff thay A-owned JSX/CSS/test và checkpoint; [V6 L1 #41760551214](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760551214), [V5 L3 #41760550820](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760550820), [Firebase operational #41760550629](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760550629) PASS. [Verify #41760550847](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760550847) FAIL **browser-smoke** `UI_V3_L2 choices-only QPPL`: legacy oracle `stage.outlineStyle==='solid'` không khớp CSS focus vào nút riêng (phải kiểm computed trigger thực tế trước đổi oracle). [PR #153 corrective comment](https://github.com/cavoixanh638/HopHDND-WebApp/pull/153#issuecomment-6620952313) đã giao nhiệm vụ A.
- **04/11/2026 — CI B chính thức:** B HEAD `715370acc9a36d4a1aba97746f1630e8e832c64f` (code SHA `fca8f1d52d8bbc55f64ce9362c8970c3035bb11b`). Commander mở [PR draft #154](https://github.com/cavoixanh638/HopHDND-WebApp/pull/154) chỉ để chạy CI, không merge. [Verify #41761256237](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41761256237) FAIL ngay Typecheck: `ItemList.tsx:670:5 TS1005 '}' expected`, thiếu dấu đóng biểu thức JSX sau `</div>` (khoảng line 669); nhiều workflow cũng FAIL trước test. [PR #154 corrective comment](https://github.com/cavoixanh638/HopHDND-WebApp/pull/154#issuecomment-6620952827) đã giao sửa đúng nhánh B và chạy lại CI. Không thể nghiệm thu theo static inspection 12/12.
- **Quyết định điều phối:** Giữ `TEST_PENDING` cho A và `FAIL / NEED_FIX` cho B. Chưa tích hợp A/B, chưa có integrated tested SHA/QA hash/Site version. Chỉ bắt đầu tích hợp sau khi worker sửa và push bằng chứng; không merge `main` hay deploy Firebase production.
