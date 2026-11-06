# Phát hành demo công khai — 06/11/2026

**DEMO_PUBLISH_PASS.** [Mở demo không cần tài khoản](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/).

## Phạm vi và quyết định của người dùng
Người dùng yêu cầu tạo link khác nếu Site cũ không còn truy cập được, mở để thử bất kỳ lúc nào và không khóa theo một tài khoản. Chỉ thị này thay thế các dòng lịch sử “không tạo Site mới/owner-only/giữ audience cũ”. Site mới dành cho dữ liệu mô phỏng; không merge main, không triển khai Firebase production, không ghi RTDB/Excel thật. Migration giữ PREPARED_OFFLINE / LIVE_HOLD.

## Nguồn và phiên bản
- Code/test SHA: `91c2dd47de85c76fad53d1778e06c2786aaa136d`.
- [CI #42154518752](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752): đã đọc trực tiếp jobs API; app-qa, data-emulator, full-app cùng SUCCESS trên đúng SHA.
- Artifact gốc: `13473048953`; source-sha.txt khớp; html-qa.tar.gz SHA256 `e63f00494e26452af53381b78c4941feadc108a466b8aeaa3b5706d11200ae39`.
- Site: `appgprj_6aed474532b081919e39ba36909bf6bf`; audience **public**, revision 2; không thêm tài khoản hoặc gửi thư mời.
- Phiên bản đang chạy: **2**, ID `appgprj_6aed474532b081919e39ba36909bf6bf~appgver_1ba595b765f0819185a41c3c13d613c1`.
- Commit kho phát hành Sites: `ff925636f3ede11274177f914c95204cb08e72ef` (khác SHA nguồn ứng dụng).
- Deployment: `appgdep_6aed862c53e88191bab67c8d7695473b`, **succeeded**, timestamp máy chủ `2026-11-06T07:48:13.306084+00:00`.
- Archive saved digest: `sha256:8695120950a1c5efa7f3499251d5c4aabc270344e798d55a48a087665be42079`, 4 files (hosting manifest, HTML, JS, CSS).

## Phát hiện khi smoke và artifact thực sự được dùng
Phiên bản 1 dùng standalone HTML đúng hash `ae334d63e537a1e0f3421be27f1d4c574ddf46e6783cc93411296bc91f91e724` theo handoff cũ. Smoke cho thấy entry này mặc định đọc Google Sheet và nút quản trị bị vô hiệu hóa, nên không đủ cho mục tiêu demo tương tác.

Phiên bản 2 thay bằng **Pr95FullPreview mặc định của build compact-qa cùng artifact/SHA**: copy nguyên bytes `dist-compact-qa/compact-qa.html` thành `dist/index.html` cùng hai assets. Không sửa code UI, không rebuild từ HEAD tài liệu, không lấy bản demo cũ. Đây là thay đổi lựa chọn entrypoint phát hành có lý do, thay cho chỉ dẫn “không upload QA HTML” trong handoff trước. URL không có tham số QA, mặc định vào full preview 27 hồ sơ giả; các fixture QA trong cùng bundle không được dùng làm bằng chứng ứng dụng thật. Không phát hành ZIP, witness, screenshots, credential hoặc dữ liệu nguồn thật.

| File phát hành | SHA-256 |
| --- | --- |
| index.html (nguyên compact-qa.html) | `a10853af1a4bb7ed63411adb821948a21cf6e9f69bf7c49d5da959239f9dc3b1` |
| assets/compact-qa-CQEqHbaG.js | `96b34cc59955cf7ae400dfe2ae66585f8de54a43894e41a50f8af9370481b9ed` |
| assets/style-C8Lb_Mw8.css | `9413309e8c4ece449b6cc023a44ec03667260e3d9d0f48b990b1f1277f91832e` |

## Bằng chứng smoke
- HTTP GET bằng PowerShell mới, **không cookie, không credential, không session đăng nhập**: 200, final URL vẫn là URL Site, có title và script demo; không chuyển sang trang login.
- Tải JS/CSS từ URL công khai và tính SHA-256: trùng hai hash bảng trên. HTML do hosting chèn wrapper nên không dùng raw response HTML để khẳng định hash file gốc.
- Trình duyệt mở đúng “HopHDND — Bản xem thử · Dữ liệu giả”, bảng 27 hồ sơ mẫu, vai trò khách.
- Bấm bánh răng → “Đăng nhập quản trị (mô phỏng)”: chuyển admin được, không đăng nhập Google/Firebase; hiện điều hướng Báo cáo/Danh sách.
- Mở Báo cáo tổng hợp: bảng có số liệu giả, các số đếm tương tác.
- Bấm nhóm “Sở chưa trình” của Thành ủy: popup thật hiển thị 4 hồ sơ, bộ lọc và cấu hình popup; đóng popup và quay về danh sách được.
- Không chạy lại 896 unit hoặc Emulator đã PASS khi chỉ sao chép nguyên artifact. Không nhận smoke này thay thế kiểm thử backend.

## Cách thử và giới hạn
Mở link → bánh răng → “Đăng nhập quản trị (mô phỏng)” để thử công cụ admin; chức năng lưu/quyền/Excel trong preview là mô phỏng trên dữ liệu giả. Tải lại trang đặt lại dữ liệu RAM; một số cấu hình hiển thị có thể được giữ trong bộ nhớ trình duyệt. Đây không phải nghiệm thu Firebase production hoặc migration thật. Site cũ không bị chỉnh/xóa; giữ ID Site mới cho các lần cập nhật sau, không tạo thêm Site mỗi lượt.
