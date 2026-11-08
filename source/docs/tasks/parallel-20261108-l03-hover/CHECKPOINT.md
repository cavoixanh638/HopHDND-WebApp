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

## UI L01/L03 SCREENSHOT-BASED CORRECTIONS — LIVE PASS 2026-11-08

### User-approved design, applied in code
- L01 (Nội dung trình): type **before** department/Sở, metadata `justify-content:flex-start; text-align:left` in editable, readonly and mixed permissions; punctuation retained only in readonly.
- L03 screenshot-sized new default rails (px): **readonly label=128,status=164**; **editable label=120,level=76,status=120**. Five explicit saved rails are never overwritten or "auto-normalized." A wider saved subgrid scrolls within a narrow outer column during direct CSS-only probes; real admin save also grows the outer grouped column.
- L03 readonly statuses: center both wrapper and text in List and popup, with no fake picker/caret.
- "Sở chưa trình" **L03 default only**: ink `#A32D46`, background `#FFE3E9`; resting 1px border is subtle (16% ink mix). Existing user-defined swatch colors and per-field highlights retain precedence, other sections/palette defaults untouched.
- Hover/focus on the three status editors: existing `border-width:1px`, `outline-width:2px`, shadow and `translateY(-3px)` unchanged; border/outline **COLORS** match the corresponding status's own ink, including custom swatches. Level picker remains neutral. Motion remains **180ms**, changed to `ease-out` for softer response, reduced-motion/print exemptions retained.
- L04 personnel selectors, permissions, business logic, Firebase/Sheets/production have not been modified.

### Exact code and evidence
- **QA-passed source SHA:** `b815535d1772f2d1457382970e5dad039b59ff10`.
- Source commit `fc7cb62835ff18941e0634a0c2b874bc11aa40da`; test commit `314da0be31dc89f980660ddbaa704384511ad957`; legacy expectation updates `6e5193751124516e026bab6558304af0ca1c04ad`; test rail-scroll fix `b815535d1772f2d1457382970e5dad039b59ff10`.
- [CI #42436988277](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42436988277) **SUCCESS**, exact tested SHA: 918 unit PASS (116 skipped), TypeScript and both builds PASS; 32 real-browser L03 scenarios, 54 L03 reviewer cases, 24 L04 picker scenarios, 6 track-width modes, 73 L01 CONTENT scenarios and 18 commander screenshots PASS.
- [CI proof artifact #13599971874](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42436988277/artifacts/13599971874), digest `sha256:a8e8951d4a70f140b26da5f563660e8892437bb493e7457d888bdab21c58ca1b`.
- **Public preview LIVE VERIFICATION:** [publish+Chromium #42437620579](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42437620579) **SUCCESS**, source pin `b815535...`, public HTTP 200 and byte-for-byte SHA-consistent HTML/JS/CSS; Pages root source unchanged `main:/`.
- Public homepage entry: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin
- Editable direct UI: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- Readonly direct UI: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?guest=1
- Popup mixed: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?popup=1&popup-mixed=1
- LIVE Chromium at widths 1440/390 List, mixed popup and guest verified L01 type-first/left; 3-track `[120,76,120]`, 2-track `[128,164]`; readonly center + nested text center; "Sở chưa trình" painted background `rgb(255,227,233)` and ink `rgb(163,45,70)`; resting border **1px subtle**, hover border **1px** and outline **2px** same status text color, shadow visible; actual button `dy=-3` and DOMMatrix computed `-3`; width stays exactly **120px** at all measured editable surfaces. Public guest has no fake picker. No external-network requests from preview.
- [LIVE screenshots & measurements artifact #13599827921](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42437620579/artifacts/13599827921), digest `sha256:ef98eb6a1ea6ac9e81a983f6e8f4eae53afa5d0d2015fdc375df371b4e15dd05`.
- Pages-only [main commit `7e3a4e2e44ffe861cc2a89fc04f3b79b08813b2b`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/7e3a4e2e44ffe861cc2a89fc04f3b79b08813b2b) altered **only `preview/l03-hover-20261108/`**; production root index/assets/source not touched. Original separate ChatGPT Site remains independent/old until its owner publishes.
- **Final status:** `SOURCE_QA_PASS / ISOLATED_PUBLIC_PREVIEW_LIVE_PASS / PRODUCTION_NOT_DEPLOYED`. This checkpoint commit itself is docs-only, different from the exact source/tested SHA.


## L03 PICKER SPACE OPTIMIZATION — LIVE VERIFIED 2026-11-08

### User clarification / design
- **Do NOT require a single line** at the approved 76px (level) or 120px (status) defaults. Allow natural wraps; user may change and save track width to fit a long label.
- Previous L03 shared button CSS used 7px left/right padding + 8px text/caret gap + 5px caret + 2px border = **29px** nontext. Original 120px status had only **91px** label width.
- New **moderately compact** picker uses `padding:4px 4px`, `gap:3px`, retains 5px caret and 1px border each side, for **18px** nontext. A 120px status now has **102px** for text (+11px), a 76px level has **58px**. Maintain 4px vertical padding, 11px standard font, original arrow and all hover/focus/rights colors. Applies equally to L03 status and level pickers in both List and popup; no user track width or production data changes.
- Example `ĐU gửi TU, chưa họp` has actual natural ink width ~126.4px at installed font; it may validly wrap at 120px. It fits when the user sets status track to 160px. Never use `nowrap`, clipping, ellipsis or artificial font shrink to force one line.
- Real Chromium browser packing test checks computed 4px/3px values, 120px status/76px level widths, horizontal overflow and wrap allowed, and single-line text when the status track expands to 160px in List AND popup. Former erroneous `lines===1` at 120px removed.

### Exact QA / publishing checkpoint
- **Tested source commit:** [`521a4d49e1c4216681144173ed217489bddf510b`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/521a4d49e1c4216681144173ed217489bddf510b) on `ui/20261108-l03-hover-lift-fix`, changes ONLY `picker-parity-stages.css`, `picker-parity-stages-browser.mjs`, and `picker-parity-stages.test.ts`.
- [Full QA GitHub Actions #42440753743](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42440753743) **SUCCESS**: TypeScript and builds PASS; 919 unit PASS/116 previously skipped, L03 34 real-browser scenarios PASS (including 2 packing/widened), independent L03 reviewer 54 cases PASS, L04 reference 24, saved tracks 6, L01 CONTENT 73, commander smoke PASS. [QA artifact #13600674925](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42440753743/artifacts/13600674925).
- Preview workflow updated at [`adabbc0c7357558080a298530a4884afe71b3fd3`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/adabbc0c7357558080a298530a4884afe71b3fd3), pinned to the exact tested SHA and tests live computed 4px/4px padding and 3px caret gap.
- [**LIVE preview publish+Chromium #42441188588**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42441188588) **SUCCESS**: HTTP 200, identical build/public HTML+JS+CSS, source pin checked. Chromium navigated the real Pages site at 1440px, 390px and popup, measured 4px left+right and 3px gap, confirmed prior -3px lift, semantic border/outline colors and thickness, 120/76/120 rails and readonly 128/164; no external requests.
- Viewable public preview for editable L03: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- Full synthetic preview: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin
- [LIVE screenshots+measurements artifact #13601910622](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42441188588/artifacts/13601910622), digest `sha256:4271547e5e76513bd3bcd1142daec8cdc0b2ce4210360db15f8c983a09da2369`.
- **Status: CODE QA PASS + ISOLATED PUBLIC PREVIEW LIVE PASS; NOT PRODUCTION DEPLOYED**. Do not confuse workflow/docs commits with exact source SHA. No production root app, Sheets or Firebase changes.
