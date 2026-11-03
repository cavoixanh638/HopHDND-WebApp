# Checkpoint — triển khai thử sau bản tích hợp

- Ngày: 03/11/2026 Asia/Saigon. Status: HOLD_EXTERNAL / DEPLOY_NOT_RUN.
- Nhánh bàn giao riêng: `deploy-trial/20261103-cloud-preflight`, từ candidate HEAD `b73643d247b5ee8b58586cd85407b9265004f1c6`.
- Candidate: `integration/20261102-five-streams`; tested/rebuilt code SHA `66e33b85a3424b2316f090e214e813cd04331afc`.
- [Bàn giao tích hợp](../reviews/INTEGRATION_2026-11-02.md); [runbook](../../../releases/PR147_RELEASE_RUNBOOK.md).
- Không mở lại 5 phần đã PASS; không merge, deploy, publish, bật API hoặc ghi dữ liệu.
- Đã đọc checkpoint cũ, bàn giao, AGENTS, quy ước v3 và runbook.
- GitHub read-only xác nhận 7 workflows completed/success đúng code SHA; artifact #13145110937 chưa hết hạn, digest khớp bàn giao.
- Compare code SHA → b73643d: 2 commits chỉ đổi 6 file docs.
- Cloud hiện tại không có công cụ/xác thực Firebase sẵn dùng; không có khả năng kiểm live hoặc deploy.
- Thông tin project/instance và lỗi SERVICE_DISABLED chỉ là bằng chứng kế thừa từ checkpoint cũ, chưa được xác minh lại live.
- WIP: hoàn thành guard offline, bảng G0–G2 và đầu vào tối thiểu; Published Rules/backup/IAM/endpoint/GO vẫn thiếu.
- Không có runtime thay đổi hoặc CI mới. Bước tiếp: lưu kết quả read-only cuối và chuyển operator có quyền thực hiện các gate còn thiếu.
