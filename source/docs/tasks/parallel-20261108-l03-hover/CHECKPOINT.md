# L03 editable status hover-lift correction — 08/11/2026

## Purpose
User observed that editable statuses in **Tiến độ 3 khâu (L03)** did not visibly lift 3px like the UBND/VP personnel pickers. Earlier answer overclaimed CSS text and synthetic test as deployed proof.

## Safe source and ownership
- Own branch: `ui/20261108-l03-hover-lift-fix`, based on final previously tested integration commit `a6aa9f13aeac8a12add4a479dc7c1f97e91180db`.
- Never merge main, modify production permissions/data, or silently replace the public Site.
- The public demo version4 remained **DEMO_PENDING** for the prior integration; even a successful new CI run does not prove deployment.

## Focused changes
1. `source/src/features/items/item-frame.css`: restrict old V3/V4 hover suppression to nonstandard legacy skins. Restrict row-wide focus/hover to pre-rev2 layouts. Preserve the legacy layout/normal baseline, semantic status colors, readonly/mixed rights and all L04 personnel controls.
2. `source/scripts/picker-parity-stages-browser.mjs`: assert actual computed `translateY=-3px` AND getBoundingClientRect delta `-3px` at rest after transition. Verify parent row/status remain fixed, shadow and outline belong to button, palette and saved width remain stable. Save real hover screenshots and check expanded-state reset.
3. Dedicated GitHub Actions workflow `l03-hover-lift-20261108.yml`: scope guard, typecheck, full unit, both builds and real Chromium L03/L04/content/width regressions, capture artifacts.

## Acceptance / checkpoint — FINAL CODE QA PASS
- **Final code/test exact SHA:** `264d516d79bb60974a0124be5d99c72fde9e5976`.
- First intermediate SHA `3745170f5c35c02a00cd6f13ca4beb4137ca7097` had a duplicate JS variable in new browser probe. All TypeScript/917 unit/both builds passed; Chromium was blocked by script syntax. Corrected without touching CSS at `264d516...`.
- **GitHub Actions PASS:** [run #42394687395](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42394687395), one job success with exact head SHA `264d516d79bb60974a0124be5d99c72fde9e5976`.
- Strict scope guard PASS; TypeScript PASS; full 917 unit PASS (116 skipped baseline); both builds PASS.
- Real Chromium: L03 original parity 32 scenarios PASS; independent reviewer 54 scenarios PASS (Không6, palette36, keyboard12); four L04 picker reference 24 scenarios PASS; rail width6 PASS; CONTENT 73 browser scenarios PASS; commander smoke18 screenshots, 45 requests PASS.
- New first-party browser probe measures resting real DOM rect + computed DOMMatrix, then hover rect+matrix after transition. Confirms exactly -3px (tolerances .15 CSS computed and .35 CSS rect), constant status wrapper/row y, unchanged rail width/status background, button shadow+outline, row outline none, nonsticky expanded lift. This passed on real synthetic React List and popup in viewport1440/900/390.
- [Artifact #13582463240](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42394687395/artifacts/13582463240) contains actual browser screenshots, JSON probes and regressions; size30,876,877 bytes, SHA256 `7ca1ce68c04b7fa843edbe1d23cbf6bda521ba1c6e4ed3e69a65bca9f116e2a2`.
- The CSS patch itself is in `source/src/features/items/item-frame.css`; the test changes are in `source/scripts/picker-parity-stages-browser.mjs`. NO shared L04 component/permissions/backend changes.
- **Public demo/production remains DEMO_PENDING, NOT DONE**: no Site publish, no main merge, no Firebase live writes; even PASS on synthetic real-browser fixture is not proof of the old publicly deployed Site. Use this source SHA when preparing a newly verified public package. A later docs-only checkpoint commit must not be confused with the tested code commit.

## PUBLIC PREVIEW LIVE VERIFIED — 2026-11-08 (Vietnam local date)

- User rightly reported previous GitHub Actions artifact link 404: an Actions artifact is a ZIP/CI record, **not** a webpage. The new preview URL is a public GitHub Pages *website*.
- **Working full interactive URL:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin
- **Direct editable L03 URL:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- **Popup mixed URL:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?popup=1&popup-mixed=1
- Published original **QA-passed application source SHA** `264d516d79bb60974a0124be5d99c72fde9e5976`; workflow authoring branch `ui/20261108-l03-hover-lift-fix`, publish-workflow commit `1c751593a4dba24c1a7fc772b2bc05092a8c41eb`.
- Pages source verified `main:/`. Pages commit [`613805788ba004f8ce284dda288127e84cc9662e`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/613805788ba004f8ce284dda288127e84cc9662e) changes **only five paths under `preview/l03-hover-20261108/`**, not production `index.html`, `assets/`, `source/`, Firebase, permissions or DB; no application code merge.
- [GitHub Actions publish+LIVE smoke #42395526474](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42395526474) completed SUCCESS. The runner fetched public HTML HTTP 200 and verified **byte-for-byte exact HTML, JS and CSS assets against compiled SHA**, plus remotely served `source-sha.txt`.
- Real Playwright Chromium navigated **the live Pages URL**, not merely local test fixtures. DOM and actual hover computed+rect were checked: List 1440 **dy=-3, computedY=-3**; List 390 **dy=-3, computedY=-3**; popup mixed **dy=-3, computedY=-3**. All actual button widths unchanged `248px`, status background `rgb(255, 241, 243)` preserved and shadow/outline present. Guest readonly and full synthetic V2 mounted. Browser blocked non-origin requests; test failed on any external request, but none occurred.
- Live-browser screenshot + measurements artifact [#13582679777](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42395526474/artifacts/13582679777), digest `sha256:b6b61378af7744ca9d9fc56e69b694aebb30a0605bb7067194f026d5a604e9bd`.
- **STATUS:** L03 hover fix CODE QA PASS and isolated preview **LIVE VERIFIED**. Original ChatGPT Site `hophdnd-demo-20261106.charmingscone.chatgpt.site` remains a separate older version. Production application `main` source remains unchanged; no release/merge/production database write. Keep this distinction for any subsequent deployment.
