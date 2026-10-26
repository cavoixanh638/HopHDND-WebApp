# HopHDND — Một WebApp, hai nguồn dữ liệu, một quy trình phát hành có truy vết

**Trạng thái 26/10/2026:** nhánh tích hợp `integration/firebase-supabase-unified-20261026` lấy **Firebase PR #72 SHA 259c36a… làm nền bảo mật đã kiểm thử**, đang đưa PR #73/#75 vào bằng merge ba chiều có kiểm soát. Đây là nhánh hợp nhất đang làm, **KHÔNG phải đã tích hợp Supabase hoàn chỉnh hay được phép phát hành**.

## Một cây mã, một nhánh release, các PR thành phần vẫn truy vết được

```text
main (Website đang chạy)                 KHÔNG CHẠM PRODUCTION
 ├─ #72 Firebase RTDB/Auth/leases        259c36ac... [nền tích hợp]
 ├─ #73 Supabase schema/RLS/RPC           66553279...
 │    └─ #75 Supabase tab chooser        afb10fe2... [bản chồng #73]
 ├─ #76 Tài liệu chuẩn                  d0762c09... [nhánh riêng]
 └─ integration/firebase-supabase-unified-20261026
      ├─ Firebase chính thức từ #72
      ├─ phần Supabase #73/#75 ghép từng file/hunk
      ├─ kiểm thử Firebase + Supabase cùng HEAD
      └─ DUY NHẤT PR tích hợp sẽ nhắm main khi GO
```

Các SHA chỉ là **snapshot đầu vào**, không tự động trượt theo head sau này. Mỗi lần thay PR nguồn phải làm vòng đánh giá thay đổi SHA và chạy lại audit, không auto-merge code mới. `source/docs/operations/DUAL_BACKEND_INTEGRATION_MANIFEST_20261026.json` là bản kê máy đọc được, do người tích hợp duy trì. Issue #74 là điểm điều phối duy nhất, không tạo nhiều nhánh/hội thoại chỉ để giải quyết từng xung đột.

## Sự thật kỹ thuật và xung đột

PR #75 đã có giao diện chọn nguồn theo tab, Supabase project **HopHDND-Staging** Free Singapore, 6 hồ sơ giả, migrations, RLS/RPC, WebSocket Postgres Changes có fallback read. Tuy nhiên, PR #75 xếp chồng PR #73 sử dụng **nền Firebase trước các sửa** cấp quyền nhân viên Google theo UID, chống sửa lịch sử có cấu trúc, khóa ô/freeze và giữ nháp. PR #72 & #75 sửa trùng **14 file** theo danh sách thay đổi PR; không được làm kiểu `git checkout --theirs` cả file, hoặc chọn nguyên App.tsx từ một phía.

Tài khoản Firebase và tài khoản Supabase có JWT khác nhau; nhân viên đăng nhập Google ở Firebase **không tự có quyền Supabase**. Server auth, cấp quyền theo UID, CAS, lease, history, freeze riêng từng backend. Supabase hiện vẫn cần kiểm tra live Google OAuth, multi-UID write + Realtime. Trạng thái staging Supabase đang hoạt động không đồng nghĩa sản phẩm đã sẵn sàng phát hành.

**Trạng thái Supabase bảo mật 26/10:** truy vấn advisor bằng connector đọc-only nhận **6 cảnh báo anonymous-access RLS** ở `hdnd_acl`, `hdnd_audit`, `hdnd_cell_locks`, `hdnd_control`, `hdnd_items`, `hdnd_profile`. Cần phân loại từng policy có cố tình cho anonymous `SELECT` hay vô tình mở quyền `INSERT/UPDATE/DELETE`/self-lock, kiểm chứng bằng SQL/JWT của user giả. **Không tự sửa policy staging** trong bước tích hợp; chi tiết trong [Supabase Advisor docs](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins).

## Hợp đồng tích hợp không thương lượng

1. Có **một WebApp build**; tại mỗi tab có một `activeSource` rõ ràng: `firebase` hoặc `supabase`. Chọn Supabase không được ghi shared Firebase `hdnd/profile.dataSource`, và ngược lại.
2. Repository adapter từng nguồn cung cấp `list/subscribe/save/history`, lease, Auth, grants và freeze. Mọi field edit phải xét `activeSource` **trước khi gửi** và khi nhận **server ACK**. Cấm ghi nhầm, không dual-write hoặc fallback không báo.
3. Không đổi nguồn khi đang có nháp chưa ACK, editor/lease, save/recovery đang chạy. Đổi nguồn phải ngắt listener cũ, namespace cache/draft/restore và UI rows theo backend/project/account. Không flash dữ liệu cũ của nguồn vừa rời.
4. Chỉ được ghi nếu server ACL của backend đã cho phép. Firebase nhân viên verified Google UID allowlist; Supabase RLS/RPC Auth độc lập. Không đưa Supabase `service_role`/secret/database password vào trình duyệt.
5. Bố cục, bộ lọc, 15 cột A–O, lịch sử, bảng báo cáo phải đồng nhất về giao diện. Bố cục chung không thể vô tình làm ghi dữ liệu sang backend khác. **Dữ liệu hai backend không được giả định giống nhau** nếu chưa import riêng được duyệt.

## Cập nhật thực thi 26/10/2026 — phép ghép CI đạt, bot push bị GitHub chặn

- **PASS xác thực hai nguồn trên một cây mã ghép tạm:** GitHub Actions [run #40307556324](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40307556324) job `simulated-combined-source-qa`: merge exact Firebase 259c36ac + Supabase afb10fe2, `npm ci`, `npm run build:pages:test`, `npm test` và `npm run test:firebase` đều đạt; job này **không push mã**, không triển khai.
- **Git merge branch #77 hiện không xung đột sau khi di chuyển các mục tài liệu mới xuống cuối tài liệu nguồn**, kiểm ở cùng run.
- Thử dùng Actions tạo merge commit tự động tại [run #40307808561](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/40307808561) đã qua audit/QA nhưng **GitHub từ chối push**: `refusing to allow a GitHub App to create or update workflow ... without workflows permission`. **Không coi mã đã merge lên remote**. Đã xóa job bot push để không lặp lỗi và không mở rộng quyền bot.
- **Cách gộp thật an toàn:** dùng [script PowerShell](../../scripts/integrate-firebase-supabase-windows.ps1) trên Windows với quyền GitHub Desktop/user. Script tạo clone hoàn toàn mới, kiểm Firebase SHA là ancestor, merge 3 chiều Supabase SHA cố định, chạy TypeScript + unit + Firebase Emulator trước khi tạo merge commit và `git push` **chỉ vào Draft integration branch**. Không dùng `--force`, không checkout đè workspace QA nhân viên. Dừng và in conflict nếu có.

```powershell
# Chạy từ PowerShell; không chạy trong repo Firebase/Supabase đang làm dở
git clone --branch integration/firebase-supabase-unified-20261026 https://github.com/cavoixanh638/HopHDND-WebApp.git "D:\HopHDND-Unified-Launcher"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\HopHDND-Unified-Launcher\source\scripts\integrate-firebase-supabase-windows.ps1" -Push
```

Nếu `D:\HopHDND-Unified-Launcher` đã tồn tại thì không clone đè: chạy `git -C "D:\HopHDND-Unified-Launcher" pull --ff-only` nếu working tree sạch và đúng branch, sau đó chạy PowerShell script. Nếu GitHub Credential Manager chưa cho phép cập nhật `.github/workflows`, lệnh push có thể bị từ chối; **không tự xin thêm quyền**. Đăng nhập/duyệt quyền GitHub Desktop theo chính sách tài khoản rồi chạy lại qua clone mới. **Không push hoặc deploy main/Rules/Postgres** trong script.

Khi hiện `INTEGRATION_BRANCH_PUSH_PASS`, kiểm PR #77 có merge commit mới đủ hai parents, CI source/build/Firebase+Supabase/RLS chạy lại trên **đúng HEAD mới** và chỉ khi PASS mới tính đến người dùng test 2–3 browser accounts.

---

## Cách ghép để không làm mất thay đổi

- **Bước 1 (đã làm):** khóa manifest chính xác các head; lấy PR #72 làm base. GitHub Actions `audit-unified-backend-integration.yml` thử `git merge --no-commit --no-ff` PR #75 trong runner **chỉ để báo file xung đột**, không push/commit/deploy; lưu artifact `dual-backend-merge-audit`.
- **Bước 2:** người tích hợp đọc từng file từ artifact, ghép phi xung đột và sửa các hunk UI chung qua PR tích hợp, cùng regression test. Mỗi quyết định merge phải có note `what changed / kept from #72 / ported from #75 / why`. Không chọn nguyên file từ branch cũ vì nhanh.
- **Bước 3:** chạy TypeScript, build, browser smoke, emulator Firebase, SQL/RLS RPC local, Auth/Realtime Supabase staging và test nguồn. Đo network/CDN local trên cùng build, lưu actual SHA & CI URLs.
- **Bước 4:** chỉ có một PR tích hợp trở thành PR release vào main; đóng/ghi chú nhánh #73/#75 như “integrated into…” bằng exact merge SHA **sau** khi ghép, không merge đúp. PR #76 tài liệu chuẩn được replay/rebase hunk, không ghi đè thay đổi code mới.

## Cài và thử nghiệm độc lập trên Windows (không dùng main)

```powershell
# Clone/worktree độc lập; KHÔNG đổi branch trong clone QA Firebase nhân viên đang dùng.
git clone https://github.com/cavoixanh638/HopHDND-WebApp.git D:\HopHDND-Unified-QA
git -C D:\HopHDND-Unified-QA fetch origin
git -C D:\HopHDND-Unified-QA switch --track origin/integration/firebase-supabase-unified-20261026
Set-Location D:\HopHDND-Unified-QA\source
npm ci
npm run test
npm run build:pages
```

Chú ý: các lệnh trên chỉ thử mã hiện có của nhánh tích hợp; **đến khi backend được ghép xong thì nút chọn Supabase mới có trên chính bản này**. Không thử production vào staging thiếu import. Các bước test hai backend chạy trong môi trường cô lập, cấu hình localhost/tokens riêng.

## Release gate và quay lui

**Trước GO:** final integration HEAD mọi kiểm thử PASS; Firebase Rules và Supabase RLS/ACL source đã thẩm định; 2–3 user thực đăng nhập được, ghi realtime đúng nguồn; chỉnh sửa cùng ô bị khóa theo UID; các trường hợp đổi nguồn giữa draft/lease/pending ACK bị từ chối; A–O + 5 báo cáo không lệch; dữ liệu cuối được đối soát đủ ID/count/hash, backup mới trước cutover; tài khoản/URL/chứng chỉ, chi phí Free limit, rollback đã diễn tập. Phần dữ liệu còn nhân viên cập nhật ở phương tiện tạm **chỉ nhập một lần vào đúng nguồn được duyệt tại thời điểm cutover**, không kéo bản mirror cũ rồi coi là chuẩn; sau cutover làm việc duy nhất trong WebApp.

**Nếu lỗi trước GO:** dừng tại Draft/Emulator. **Nếu lỗi sau GO:** đóng băng write, lấy snapshot mới của nguồn đã ACK, tuyệt đối không khôi phục snapshot cũ làm mất chỉnh sửa vừa nhận; fix-forward hoặc rollback mã không mất data. Không đổi DNS/Pages/Rules/RLS/scheme thật nếu chưa có phê duyệt triển khai rõ ràng.

## Hồ sơ bàn giao tối thiểu

`manifest.json` exact SHA, diff report artifact, bảng file conflict resolution, test & CI URLs, demo scripts Windows, lựa chọn default backend + snapshot, release/rollback receipt, `CURRENT_STATE.md` + `ARCHITECTURE.md` + `VAN_HANH.md` + `WORKBOARD.md` được cập nhật trong **chính PR tích hợp**, không phân tán nhiều nguồn sự thật. Không ghi mật khẩu, token, dữ liệu nghiệp vụ thật vào repo.
