> **KIẾN TRÚC ĐÍCH MỚI (25/10/2026): Supabase/PostgreSQL, chưa phát hành.** [Quyết định chính thức](source/docs/decisions/SUPABASE_PRIMARY_2026-10-25.md) · [Kế hoạch chuyển đổi](source/docs/operations/SUPABASE_MIGRATION_PLAN_2026-10-25.md) · [Trạng thái GO/NO-GO](source/docs/operations/SUPABASE_RELEASE_GATE_2026-10-25.md). Đang phát triển trên nhánh riêng; production Pages/Firebase chưa đổi. Các mô tả Firebase-only bên dưới là kiến trúc cũ hoặc đang chạy, **không còn là đích dài hạn**.

# HopHDND WebApp

GitHub Pages serves the generated **`index.html` at the repository root**. Source code, tests, configuration and documentation live under **`source/`**.

When source changes reach `main`, [the publish workflow](.github/workflows/publish-pages.yml) runs TypeScript checks, unit tests, Firebase emulator tests, documentation checks and `npm run build:pages`, then commits a regenerated root `index.html` only if the build succeeds. Pull requests are checked by [verify-source](.github/workflows/verify-source.yml).

To develop locally: `cd source && npm ci && npm run dev`. To build manually: `cd source && npm run build:pages`. Never edit the bundled HTML as a substitute for TypeScript.

For architecture and status, see [source docs](source/docs/README.md) and [current state](source/docs/CURRENT_STATE.md). This repository is **not automatically synchronized back to the user's Windows / Google Drive workspace**; Firebase Rules and Sheets business data are managed separately.
