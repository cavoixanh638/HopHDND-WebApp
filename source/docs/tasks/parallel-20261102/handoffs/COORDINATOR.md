# Checkpoint — điều phối tích hợp 5 phần

- Status: DONE — phạm vi candidate tích hợp/offline; 02/11/2026 Asia/Saigon.
- Branch REMOTE: `integration/20261102-five-streams`; worker giữ nguyên.
- Tested/rebuilt code SHA: `66e33b85a3424b2316f090e214e813cd04331afc`.
- Tree: `763180ad21c5d947f081f088eac1df4e66395299`.
- Baseline: `0a04b81dbb00979fb87aee7fc497e802058d8518`.
- Commit bàn giao sau tested SHA chỉ đổi docs; không có runtime chưa kiểm.
- [Báo cáo đầy đủ](../reviews/INTEGRATION_2026-11-02.md), [bằng chứng máy đọc](../reviews/INTEGRATION_EVIDENCE.json).

## Đủ tiêu chí
- Đã ghép đủ Backend/Rules, UI, CLI/COORD-01, backup/restore và release.
- 7 workflow / 8 jobs SUCCESS đúng SHA: source 41451315419, backend 41451315486,
  UI 41451315289, App 41451315321, CLI 41451315363, backup 41451315451, release 41451315381.
- Source: 835 unit + 92 Emulator; component Chrome 14/14; full App 8/8 + 20 ảnh.
- CLI: Linux preflight/CAS/lost ACK; Windows 15 path + 6 launcher PASS.
- Backup full-root restore/checksum PASS; archive dựng x2 reproducible + extracted CLI PASS.
- [Gói mới 13145110937](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41451315381/artifacts/13145110937): 6 TAR + manifest + SHA256SUMS.
- ZIP SHA256 `1b6eb324b0a4f7ab033b6b43c914e103f5dfaa4a4a0603c1a9e58058bc831df6`; local ZIP/cả 7 mục sums đã khớp.

## Sửa tích hợp và lưu trữ
- Shared CI restore thêm fixture đủ field/manifest theo guard Chat4.
- Node test tách khỏi Vitest (vẫn bắt buộc ở CLI gate), thêm helper COORD-01 bị thiếu trong archive và smoke CLI giải nén.
- Hai link docs lịch sử không tồn tại được ghi rõ; docs check PASS.
- Checkout: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/parallel-five-integration`.
- Gói local: `D:/Google Drive/VP UBND/HĐND/Codex HĐND/integration-evidence-66e33b85/release.zip`.
- Không còn WIP runtime/run cần chờ. Không mở lại phần đã PASS nếu chưa có yêu cầu mới.

## Giới hạn
Không merge main/PR147 hoặc nhánh nào, không deploy/publish, không production read/write, không tự GO.
Production/IAM/Rules Published/backup thực/UAT người thật vẫn ngoài phạm vi; xem runbook trong báo cáo.
Windows Firebase CAS NOT RUN, không là gate bắt buộc (CAS thật đã PASS Linux).
