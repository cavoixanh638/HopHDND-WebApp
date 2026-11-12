# L03 compact widths — PASS / DEMO V3 — 06/11/2026

[Demo công khai](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/) đã cập nhật phiên bản **3**.

| Trước | Sau | Lý do |
| --- | --- | --- |
| Tối thiểu hai track 360px, ba track 500px | Hai track 180px, ba track 260px | Cho admin thu hẹp toàn cụm theo nhu cầu |
| Nhãn 138px, cấp trình 90px, tiến độ 238px cố định | Nhãn co theo cụm, cấp trình 70px, tiến độ dùng phần còn lại và tối đa 238px | Không bắt ô bên trong tràn/kéo rộng khi thu hẹp |
| Chỉ kiểm kích thước tiến độ cố định | Đo đủ budget, căn hàng, bằng chiều rộng và chữ không cắt | Giữ chức năng thực khi xuống dòng |

## Bằng chứng khóa theo SHA
- Source/test SHA: `5d3aacebfadae89fd00a08f734d79e842bb45daa`.
- [CI #42238116883](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42238116883): **3/3 SUCCESS** app-qa / data-emulator / full-app. TypeScript, 897 unit PASS (116 baseline skipped), build, Chrome REF, UI 28 scenarios và full-App QA01–QA10.
- Browser rects.json: PASS, **28 scenarios**, gồm 6 narrow cases: readonly 180/260/320px, editable 260/340/420px; list/popup 1440/900/390, mixed grants, actual glyph alignment, multiline no clipping, equal aligned progress controls; **0 production requests**.
- Artifact visual/HTML `13512538422` của đúng run/SHA. `source-sha.txt` đã đối chiếu. HTML tar SHA256 `8eb1854c1f2ea7f7b1a6a4a9bc3518a359eb9c6395ecf63ebdf53c470d196a32`.
- Hai run đỏ trước đó là bằng chứng sửa test hợp đồng cũ: #42237208631 đòi literal fixed 90/238px; #42237671108 đòi ô tiến độ 238px ngay cả popup bị hẹp. Đã thay bằng xác nhận budget thực + chữ không tràn; không bỏ kiểm căn hàng/màu/quyền.

## Receipt Site
- Site `appgprj_6aed474532b081919e39ba36909bf6bf`; **public**, giữ URL hiện có.
- Saved version **3**, `appgprj_6aed474532b081919e39ba36909bf6bf~appgver_7eb621ad788c8191afe5522d42e5c5a3`.
- Source repository Sites commit `b219bb01f4ce87127052cd6d154ad67b6c838ce0`.
- Deployment `appgdep_6aedeb1509a08191bb6db62a207cfad0`: **succeeded**, server timestamp `2026-11-06T14:58:47.687753+00:00`.
- Saved archive digest `sha256:92713be07111a50bc431c4aece436d5769842249806bc22a979673dc0792bf32`, 4 files.
- Public entry vẫn là full synthetic preview từ compact-qa artifact; không sửa bytes sau build.
- HTML SHA256 `cb58ccf86b6eab3a9b7dc51f6499659944fd5d6a5eacde5dcb77b2e13fbbe95b`.
- JS `compact-qa-B79jUOaQ.js`: `48e0d81a7d11ea78e8d3c6c66e904f2a9803183b7f1032acc4dc9beaeaa01ac0`.
- CSS `style-YRWN01Zi.css`: `9b860411110977893ab0b3aaee7fd7197db50cf666abafa57e99a8e769105ee6`.

## Smoke trên URL đã phát hành
Reload trang, chuyển admin mô phỏng, mở L03 editor: giao diện hiện giới hạn 180–1400 và 260–1600. Nhập hai track **260**, ba track **340**, bấm lưu: summary xác nhận 260/340. Đo DOM cụm đầu tiên: 3 tracks khoảng **107.84 / 70 / 123.35px**, cả ba ô trạng thái cùng rộng **123.35px**. Giữ tab ở trạng thái này cho người dùng xem. Thiết lập demo trong RAM, reload khôi phục mặc định.

Đây là giới hạn cho **toàn cụm**, không phải từng track. Width mặc định vẫn 420/570 để giữ cấu hình trước; người dùng chọn nhỏ hơn bằng editor. Ở bảng quyền hỗn hợp, mọi hàng dùng chung cột vật lý đủ chứa mode rộng hơn, nên hàng hai track vẫn có thể còn phần trống ở bên phải; nội dung bên trong giữ budget riêng.

Không merge main, không triển khai/ghi Firebase production hoặc Excel, migration giữ LIVE_HOLD.
