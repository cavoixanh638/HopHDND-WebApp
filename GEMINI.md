# GEMINI.md — HopHDND WebApp UI handoff

**Read this first when developing in this repository with Gemini / Gemini CLI.** The authoritative, owner-approved handoff is [source/docs/operations/GEMINI_UI_HANDOFF_2026-10-28.md](source/docs/operations/GEMINI_UI_HANDOFF_2026-10-28.md).

## Source of truth and workflow
- Repository: https://github.com/cavoixanh638/HopHDND-WebApp
- UI source lives in `source/src`. GitHub Pages root `index.html` and `assets/*` are **generated outputs**. Never hand-edit generated Pages assets or standalone HTML to implement UI.
- Read `source/AGENTS.md`, `source/docs/SYSTEM.md`, `source/docs/CURRENT_STATE.md` and the handoff before starting. Older history may conflict; the 28/10 handoff supersedes prior UI directions, but does not override security or production safety controls.
- Begin from the **verified handoff checkpoint**, on a new UI branch. Keep changes small, reviewable and documented; do not commit directly to `main` during design exploration. Do not silently merge pending PRs.
- Never assume the GitHub checkout contains uncommitted files from the user's Windows computer or Firebase data.

## UI assignment
Redesign the presentation and user interaction of **Báo cáo tổng hợp** and **Danh sách chi tiết**, in particular the three progress cards and six-column/four-group detailed list, without changing business definitions, field identities, source data, permissions, audit/history, leases/CAS, freeze controls, or report counts. Read the full handoff for exact stage names/colors, group structure and constraints.

## Mandatory behavior
- Keep exactly 3 progress cards (no “Khâu 01/02/03”), with ordered proportional segments, correct canonical counts, light intermediate stage.
- Keep compact table **6 physical display columns in 4 groups**. All 15 Excel source fields remain intact; retain search, filters, edit per field, and the **Tùy chọn từng cột** / **Hiện đủ cột Excel** fallback.
- The personal saved-display-template panel was deliberately REMOVED on 27/10; do not reintroduce or silently read old local presets.
- Ensure readable type, independent **vertical and horizontal scrolling**, visible scrollbars, sticky two-row table heading, keyboard access and narrow-screen usability.
- Only the admin chooses shared published layout; anonymous/guest users must ultimately see **only admin-published reports/list**, not raw RTDB records/config. The secure guest-only server projection is pending [PR #83](https://github.com/cavoixanh638/HopHDND-WebApp/pull/83). Do not infer that current frontend hides make Firebase Rules safe.

## Safety / scope exclusions
- Firebase project `hophdnd-8b7b2`: NO production Rules deploy, writes, data-source cutover, import, destructive operation, or permission relaxation under a UI redesign.
- Supabase is PAUSED, not part of this work. Do not merge PRs #73/#75/#77.
- Keep Google Sheets only as existing transitional source until a separately authorized Firebase cutover.
- Preserve the ability for one Google UID to be legitimately used on multiple devices; do not “solve” it by forbidding the session. Backend concurrency/security changes require separate design and review.

## Verify before proposing release
From `source/`: `npm ci`, `npm run typecheck`, `npm test`, `npm run docs:check`, `npm run build:pages`. Check the GitHub Actions `Verify HopHDND source` and Firebase Emulator/browser smoke jobs. Additional UX checks: actual Chrome desktop/mobile, scroll, switching modes, filters and history/editor. **Mock/Emulator PASS does not prove live Firebase is safe or ready**. Do not deploy to `main` until the owner approves the proposed UI.

## Recovery
- Final handoff checkpoint is recorded in [handoff file](source/docs/operations/GEMINI_UI_HANDOFF_2026-10-28.md).
- Historical pre-UI checkpoint: `checkpoint/pre-ui-2026-10-27` at `5db47f0196afa3824a69fc7ca0f480eae12f0a8a`.
- Preserve the existing Pages URL and allow rollback by Git commit.
