# CURRENT — DEMO_PUBLISH_PASS / PUBLIC V2 — 06/11/2026

**Mốc hiện hành, thay thế SITE_PENDING_ACCESS và chỉ dẫn không tạo Site mới/owner-only bên dưới.** Theo yêu cầu mới của người dùng, Codex đã phát hành [demo công khai không cần tài khoản](https://hophdnd-demo-20261106.charmingscone.chatgpt.site/) trên Site mới `appgprj_6aed474532b081919e39ba36909bf6bf`, phiên bản **2**, deployment `appgdep_6aed862c53e88191bab67c8d7695473b` **succeeded**.

Giữ code/test SHA `91c2dd47de85c76fad53d1778e06c2786aaa136d`, CI 3/3 SUCCESS. Entry phát hành là **Pr95FullPreview dữ liệu giả từ compact-qa artifact cùng SHA**; standalone HTML của handoff cũ không đủ vì mặc định mở Google Sheet và không vào được admin. Không sửa code UI đã PASS. JS/CSS tải qua HTTP không cookie khớp hash CI; URL trả 200 không chuyển login. Smoke trình duyệt khách → admin mô phỏng → báo cáo → popup PASS.

[Biên bản đầy đủ: version, source SHA, artifact/hash, phạm vi smoke và giới hạn](CODEX-PUBLIC-DEMO-RECEIPT.md). Demo không thay thế kiểm thử backend; migration **PREPARED_OFFLINE / LIVE_HOLD**, không merge main, không Firebase production/RTDB/Excel writes. Người dùng có thể bắt đầu thử; các lần sau cập nhật đúng Site ID này. Các mục dưới là lịch sử.

---

# Codex — REVIEW-3 L03: bàn giao Site demo (06/11/2026)

**CODE/CI/ARTIFACT PASS — SITE_PENDING_ACCESS; CHƯA PHÁT HÀNH.** Tài liệu này thay thế mọi SHA/hash, yêu cầu owner-only tự suy diễn và chỉ dẫn phát hành cũ ở các lần Review-3 trước. Không dùng nhánh HEAD di động làm mã nguồn cần deploy.

## Version duy nhất được phép kiểm và phát hành khi gỡ được chặn

- Repo `cavoixanh638/HopHDND-WebApp`, branch `ui/20261105-coordination`.
- **Code/test SHA bất biến: `91c2dd47de85c76fad53d1778e06c2786aaa136d`.**
- [GitHub Actions #42154518752](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752): completed **SUCCESS 3/3** `app-qa`, `data-emulator`, `full-app` trên cùng code SHA. 896 unit PASS, 116 baseline skipped, TypeScript/build, Chrome REF/UI và Full App QA01–QA10 PASS.
- Review-3 group identity trước đó **giữ PASS**, không làm lại: [nghiệm thu registry](REVIEW-3-FINAL-ACCEPTANCE.md).
- L03 được Codex phát hiện glyph cao hơn nhãn, hiện **đã sửa và đo đúng chữ thực**: [nghiệm thu cuối Review-3 L03](REVIEW-3-L03-FINAL-ACCEPTANCE.md). Chromium 22 kịch bản ở 1440/900/390, list/popup, quyền mixed, wrap; 78 cặp glyph một dòng lệch tâm Y tối đa 0,3 px, 6 case nhiều dòng không cắt. `rects.json` và ảnh có trong artifact.

## Artifact gốc và gói giao

- [Visual/HTML/screenshots #13473048953](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473048953).
- [Full App/witness QA01–QA10 #13474131683](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13474131683) — `checkedOutSha=91c2dd...`, `verdict=FULL_APP_QA_PASS`, `emulator=true`, `published=false`, `productionUsed=false`.
- [DATA Emulator #13473843484](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42154518752/artifacts/13473843484).
- **Gói giao qua chat:** `HopHDND_REVIEW3_L03_CODEX_HANDOFF_91c2dd4.zip`, giải nén được `site_upload/Dashboard_HĐND.html`, `SHA256SUMS.txt`, `README_CODEX.md`, ba artifact CI gốc, `evidence/acceptance.json`, `rects-l03.json`, ảnh trước/sau, popup mixed/wrap. Gói tự kiểm hash từng file.

## Hash mới, đã đối chiếu bytes thực

| File | SHA-256 |
| --- | --- |
| **CHỈ upload** `site_upload/Dashboard_HĐND.html` | `ae334d63e537a1e0f3421be27f1d4c574ddf46e6783cc93411296bc91f91e724` |
| `dist-compact-qa/compact-qa.html` — KHÔNG upload | `a10853af1a4bb7ed63411adb821948a21cf6e9f69bf7c49d5da959239f9dc3b1` |
| `qa-results/ui-20261105/html-qa.tar.gz` — KHÔNG upload | `e63f00494e26452af53381b78c4941feadc108a466b8aeaa3b5706d11200ae39` |
| Handoff ZIP `HopHDND_REVIEW3_L03_CODEX_HANDOFF_91c2dd4.zip` | `b176d6da2e247b08027c0d2e4d3138bb62a9d2750fa6fafa978ff45a0fad42dc` |

`source-sha.txt` khớp code SHA, `sha256sum -c` tar và cả hai HTML đều OK; nội dung ZIP được đối chiếu lại với manifest. Hash của bản `bc5f5b4` cũ **không còn là bản upload**.

## Vướng mắc Site do Codex đã kiểm

Codex gọi `get_site(appgprj_6ae93f17c2e48191815caef8a642fa14)` bị `404/project_not_found` và `list_sites(role=owner)` không trả Site khi dùng tài khoản kết nối hiện tại. Không có bằng chứng Site bị khóa, quyền audience bị sửa, hay code mới đã được phát hành. **Không thử upload trong tình trạng này.**

Người dùng cho biết demo trước đó mở **không cần tài khoản**. Vì vậy **giữ nguyên audience/visibility hiện có sau khi xác minh**; không ép owner-only, không thêm login wall, không chuyển public/private tùy ý; cũng không tạo site mới, không đổi quyền vì lỗi 404.

## Codex chỉ tiếp tục sau khi quyền Site được xác minh

1. Kiểm đúng **account và workspace** nơi Site hiện tại được sở hữu; tìm đúng Site ID, xác minh tình trạng/phiên bản đã phát hành và **audience hiện có**. Nếu 404/không có owner access: dừng, để `SITE_PENDING_ACCESS`, không upload.
2. Đối chiếu chính xác `source SHA 91c2dd4...`, CI 3/3 SUCCESS, manifest, và hash deployable HTML. Không rebuild từ HEAD docs.
3. Khi quyền phát hành đủ và xác minh giữ nguyên audience hiện có: upload **chỉ** `site_upload/Dashboard_HĐND.html` cùng hash. Không upload QA HTML, ZIP, JSON, screenshot, thông tin xác thực hoặc dữ liệu thật.
4. Chỉ sau `deployment succeeded` mới ghi version, URL (ẩn token nếu có), timestamp, source SHA, HTML SHA, audience trước/sau giữ nguyên; smoke link bằng đối tượng truy cập phù hợp với audience cũ, kiểm bảng danh sách, báo cáo, popup, quyền xem và không ghi Firebase production.
5. Chỉ nâng `SITE_PASS` sau receipt + smoke đủ bằng chứng; cập nhật [TRACKER.md](TRACKER.md) và [checkpoint](checkpoints/COMMANDER.md). Không tuyên bố toàn việc DONE khi chưa Site_PASS.

**Ràng buộc:** DATA `PREPARED_OFFLINE/LIVE_HOLD`; không merge main, không Firebase production RTDB/Rules/Functions/Hosting writes/deploy, không sửa Excel, không thay audience tự động.
