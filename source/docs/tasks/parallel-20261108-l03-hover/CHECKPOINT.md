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


## READONLY L03 TYPOGRAPHY PARITY — LIVE VERIFIED 2026-11-08

- User provided a screenshot showing the readonly status "Không phải trình" visually larger than the editable status cells in the SAME L03 stage group.
- Root cause was explicit CSS, not text rendering: readonly `.compact-stage-state:not([data-editable="true"])` and its nested `.compact-part,.workflow-status-value` used **font-size:13px;font-weight:400**, while real editable `button.cell-picker-trigger` used **11px/550**.
- Changed only `source/src/features/items/picker-parity-stages.css`: readonly status and all nested readonly payloads now use exactly the editable typography `font-family:"Segoe UI",system-ui,sans-serif; font-size:11px; font-weight:550; line-height:1.35` with scoped `!important`. Stage LABELS/levels, status text values, highlights, palette colors, readonly center, saved widths, hover border/shadow/lift, roles/leases and external data are unchanged.
- Added independent browser assertions on actual `getComputedStyle`: readonly wrapper and nested text both match editable status's font size, weight, family and line height in mixed-rights List and Report popup, plus explicit readonly-only check. Unit test prevents regression.
- **Exact tested source SHA:** [`9d7771125a2c47893bd1f31360fdf2e697899316`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/9d7771125a2c47893bd1f31360fdf2e697899316), branch `ui/20261108-l03-hover-lift-fix`.
- [Exact-SHA CI #42441577890](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42441577890) **PASS**: 920 unit PASS, 116 skipped, TypeScript and both builds PASS; 34 L03 Chromium scenarios, 54 reviewer, 24 reference picker, 6 saved widths, 73 L01 CONTENT, commander smoke PASS.
- Preview publish workflow commit [`5caf2cf77096743a2789c843c291a74717e1e89b`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/5caf2cf77096743a2789c843c291a74717e1e89b), pinned exact source and added LIVE font equality checks.
- [LIVE GitHub Pages + Chromium #42441967930](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42441967930) **PASS**: HTTP 200 and public HTML/JS/CSS byte-for-byte same as built source; at List 1440, List 390, Report mixed popup and guest-only readonly, measured readonly + nested + editable all `11px/550/"Segoe UI",system-ui,sans-serif/14.85px`. Live hover still -3px, 1px status border, 2px outline; statuses centered, saved column widths and colors retained. No external network requests.
- [Live screenshots and measurements artifact #13602071059](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42441967930/artifacts/13602071059); verified preview: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- Pages commit `3f3743148a1805db042c6850bbbb33120024aae9` changed **only preview/l03-hover-20261108/** assets/index/source marker. No root site/index or production data touched; production application not deployed/merged.
- **CHECKPOINT: SOURCE_QA_PASS + LIVE_PREVIEW_PASS; PRODUCTION_NOT_DEPLOYED.** This checkpoint itself is docs-only, so do not confuse its SHA with exact QA source SHA.


## L03 FIVE-RAIL MINIMUMS REDUCED — LIVE VERIFIED 2026-11-08

### Decision and scope
- User requested lower **MINIMUM allowed widths for each L03 subcolumn**, after editable and readonly status fonts were unified at 11px. This is NOT a change to default widths.
- Previously hardcoded limits: readonly `label=84/status=112`; editable `label=84/level=76/status=112`.
- **New minimums**: readonly `label=64/status=72`; editable `label=64/level=48/status=72` (px). Mode physical minimums = `167px` readonly (`64+72+8+23`) and `223px` editable (`64+48+72+16+23`).
- **Preserved new-layout defaults**: readonly `128/164px`; editable `120/76/120px`. Existing saved explicit five widths, maximum limits, current user custom layout, shared merge/CAS and older group-mode legacy fallback are unchanged.
- The `PARTY_GROUP_WIDTH_LIMITS` for **legacy total-group settings** remain separate and unchanged; they DO NOT enforce min values on 5-rail physical widths. The UI for five editable minima uses `PARTY_TRACK_WIDTH_LIMITS` directly for HTML `min`, validation, save and shared layout.
- Long labels/status text wrap naturally; statuses never become fake editable controls. The level minimum 48px retains 30px available for text after 4px left/right padding, 3px caret gap, 5px caret and 1px each border.
- Changed files: `source/src/data/item-preferences.ts`, `source/tests/ui-20261106-tracks.test.ts`, `source/tests/picker-parity-stages.test.ts`, `source/scripts/picker-parity-stages-browser.mjs`, `source/scripts/ui-20261106-tracks-browser.mjs`, `.github/workflows/l03-hover-lift-20261108.yml`. No changes to L04, Firebase, backend, production root pages or unrelated column constraints.

### Exact evidence and acceptance
- **Source exact QA-passed code SHA:** [`3a96431d034ffb6c45a895e8c32882eb45db5a8f`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/3a96431d034ffb6c45a895e8c32882eb45db5a8f).
- [GitHub Actions source QA #42443321377](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42443321377) **PASS**: 922 unit tests PASS (116 skipped), both builds and TypeScript PASS; 38 L03 parity browser scenarios (includes minimums for List/popup, readonly/editable) PASS; independent L03 reviewer 54 PASS; original L04 picker 24 PASS; 10 admin/guest L03 track scenarios PASS, including actual React form input minima, entering/saving 5 minima on 900px and 390px and role-switch to guest; CONTENT 73 PASS, commander screenshots 18 PASS. [QA artifact #13602253878](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42443321377/artifacts/13602253878), digest `sha256:2f0c407be43449e83639abd457c8a6cf163d402898071b8cc1d09f1888d95ef4`.
- [Public preview workflow #42443749618](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42443749618) **PASS**, published pinned exact source `3a96431...`, public HTTP HTML/JS/CSS bytewise exact compared to build, and Playwright measured actual public preview form `input.min=[64,72,64,48,72]` and kept all prior hover/font/layout checks PASS.
- Preview publish workflow definition commit [`bb8f760317c0eb5ad3630a2c288d7992ac7da9bd`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/bb8f760317c0eb5ad3630a2c288d7992ac7da9bd); Pages-only main commit [`a7ccbefaf404b687470ba53220041a787a97a8f8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/a7ccbefaf404b687470ba53220041a787a97a8f8) changes only four `preview/l03-hover-20261108/*` paths (no production root, app source or backend).
- View public full admin: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin
- View editable: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- [LIVE screenshots & DOM measurements #13602622021](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42443749618/artifacts/13602622021), digest `sha256:d23d940c12b3b179521fa8e9eb3ebca8a99346213c24bc3022704f126a2063ff`.
- **Status:** `SOURCE_QA_PASS / ISOLATED_PUBLIC_PREVIEW_LIVE_PASS / PRODUCTION_NOT_DEPLOYED`. This checkpoint docs-only commit differs from tested source SHA; future implementers MUST NOT retest/reship the prior SHA as if latest.


## L03 READONLY STATUS HEIGHT MATCH — LIVE VERIFIED 2026-11-08

### User correction
- User's screenshot showed read-only statuses visibly **shorter in HEIGHT** than the editable picker; the preceding assistant initially misunderstood "width" but the corrected objective is **height parity only**, NOT width changes.
- Root cause: readonly L03 `.compact-stage-state:not([data-editable="true"])` used `min-height:0!important; padding:0!important` while editable standard status button used `min-height:26px!important; padding:4px 4px!important; border:1px`.
- Changed ONLY in `source/src/features/items/picker-parity-stages.css`: readonly wrapper `box-sizing:border-box; min-height:26px!important; padding:5px 4px!important; border:0!important`. Extra 1px vertical padding each side compensates for the editable button's 1px top/bottom borders, so the two controls render **26px** for the same one-line content, preserving zero readonly border, no fake picker/caret/hover, center text and 11px/550 font. Multiline content grows naturally; field values and permissions untouched.
- Real headless Chromium tests expanded in `source/scripts/picker-parity-stages-browser.mjs`: verify actual bounding rect and computed padding/min-height, readonly not hoverable or border-bearing, compare same one-line text `Hoàn thành` with a real editable button in both List/popup, plus previously covered 1440/900/390, editable/guest/mixed, saved width presets, hover and keyboard. Unit test in `source/tests/picker-parity-stages.test.ts` protects CSS height model.
- **Exact tested source SHA:** [`b11f18adb41ff0eb12219377fa6d2e8c174ff07f`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/b11f18adb41ff0eb12219377fa6d2e8c174ff07f).
- [GitHub Actions QA #42444730013](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42444730013) **PASS**, 923 unit PASS (116 skipped), 40 stage browser scenarios PASS (two added height parity), 54 reviewer cases PASS, 24 personnel picker PASS, 10 rail-width mode tests PASS, 73 Content browser scenarios PASS, commander smoke PASS. [QA artifact #13602794783](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42444730013/artifacts/13602794783).
- Public preview workflow commit [`17eb96cffe7d5bef01c7f2c4438881531f92aed8`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/17eb96cffe7d5bef01c7f2c4438881531f92aed8) pinned the EXACT tested source; [LIVE deploy+Chromium #42445139063](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42445139063) **PASS**: public HTML/JS/CSS byte matches build, GET HTTP 200, actual `sameTextHeight.readonly=26px` and `editable=26px` in List 1440px, List 390px and mixed Report popup, guest readonly min-height26, 11px/550, centered, no border; hover still -3px/1px border/2px outline. Admin input.min remains `[64,72,64,48,72]`, default rails unchanged.
- Live screenshots/measurements [artifact #13603880152](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42445139063/artifacts/13603880152), sha256 `c2a01721001d85a9bfc85eac91ce6dc875a60a3e9534a9db95bf45ce863c9865`.
- Public editable preview: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- Public mixed popup: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?popup=1&popup-mixed=1
- Pages-only main commit [`f4b92ba5e4a77601bf7c8ae8345de089f38d65fb`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/f4b92ba5e4a77601bf7c8ae8345de089f38d65fb) changes ONLY `preview/l03-hover-20261108/*` assets/index/source marker, NOT production app root/source or Firebase database.
- **STATUS: SOURCE_QA_PASS / LIVE_PREVIEW_VERIFIED / PRODUCTION_NOT_DEPLOYED**. This checkpoint is a docs-only commit; keep source pin at b11f18a and do not mistake latest docs SHA as the tested code.


## CURRENT PROGRESS + NOTE INNER-ONLY INTERACTION — LIVE VERIFIED 2026-11-08

### Owner-directed behavior and implementation
- Two source fields ONLY: **`specificProgress` ("Tiến độ hiện tại") and `note` ("Ghi chú")**. Hovering/clicking TD outer padding/blank space must not lift/outline the little editor, show the "Bấm để sửa" tooltip, or begin text editing. Hovering/clicking the real, small `button.inline-note-trigger` must retain hover/lift, tooltip, click-to-open `InlineNoteEditor` textarea; Escape cancels as before. No change to status pickers, L03, L04, Content, history action, locked statuses, keyboard rights, long-text values or source data.
- Root causes: `activateEditableCell` used to forward blank TD clicks to its single action; broad legacy `app.css` highlighted the inner control when **the whole TD** was hovered; `SharedEditTooltip.fromTarget` chose the whole editable TD for pointer hints.
- Scoped fix:
  * `source/src/features/items/activate-editable-cell.ts`: return early for those exact `data-col-key` values, preserving all other generic TD click-forwarding.
  * `source/src/components/SharedEditTooltip.ts`: only return the enabled **inner `button.inline-note-trigger`** for these two columns; retain history/locked and merged-field logic for all others.
  * `source/src/features/items/inline-note-hit-area.css` NEW, imported explicitly by `ItemList.tsx` and `ReportDetailGrid.tsx`: TD cursor/default and blank hover no shadow; small button `width:fit-content` and `max-width:100%`; cancel inherited TD:hover uplift when the inner trigger is not hovered/focus-visible, preserving real trigger hover/focus, editor's own focus ring and reduced-motion rules. No changes to global `app.css`.
  * `ItemList.tsx` and `ReportDetailGrid.tsx` remove parent TD `data-edit-hint` for these fields; `CellHistoryAction` remains independent.
  * `source/tests/activate-editable-cell.test.ts` protects parent blank clicks (non-note status forwarding unchanged). `source/scripts/picker-parity-stages-browser.mjs` tests **four** mouse cases (two fields × List/popup), checking real geometry, blank hover no transform/shadow/tooltip, blank click no textarea, actual button hover/lift + tooltip, actual button click opens textarea, Escape returns trigger. Both List and popup use REAL components with synthetic RAM-only fixture (no Firebase).
  * `.github/workflows/l03-hover-lift-20261108.yml` extends allowlist to exactly the new L01/L03-constrained files; production root, Firestore/RTDB/Sheets, `source/src/styles/app.css`, `CellPicker.tsx`, source field names and permissions remain unmodified.

### Exact QA, preview and release boundary
- **Tested source code SHA:** [`fae5946d9dc0d031a8b6f45c7a26a6f3c60ca99a`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/fae5946d9dc0d031a8b6f45c7a26a6f3c60ca99a) (branch `ui/20261108-l03-hover-lift-fix`; subsequent workflow/docs commits are NOT code modifications).
- [Source QA and real Chromium #42446957341](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42446957341) **SUCCESS**: 925 unit PASS /116 preexisting skipped, TS and both builds PASS; **44 L03 browser scenarios** including all four new cases; 54 independent L03 reviewer cases; 24 personnel picker, 10 width presets, 73 Content scenarios, commander smoke PASS. [QA screenshots artifact #13604550262](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42446957341/artifacts/13604550262).
- Public preview workflow was repinned to the EXACT QA code in [`8a8610400c7d49ea073bc36ec305993bd96fd899`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/8a8610400c7d49ea073bc36ec305993bd96fd899) and extended to live proof of the same inner-only interactions in List and popup, not just L03's prior hover.
- [**LIVE Pages deploy + real Chromium #42447324623**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42447324623) **SUCCESS**, public HTTP 200 and byte-for-byte HTML/JS/CSS comparison to the built immutable pinned code; browser measured:
  * List status: `specificProgress` **200px outer / 172.31px inner**; `note` **240px outer / 169.30px inner**;
  * Popup status: `specificProgress` **200px outer / 160.28px inner**; `note` **240px outer / 157.5px inner**;
  * All four cases blank hover **transform=none, shadow=none**, blank clicks **do NOT open editor** and **no tooltip**; actual button hover lifts **-3px** and creates shadow; actual click opens textarea; Escape restores button.
  * Original L03 -3px/status outline and 11px/26px readonly parity, five rail minima, colors, permissions, Lists at 1440/390, guest, mixed popup all remain PASS; no external production requests.
- [LIVE screenshots/measurements artifact #13603879187](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42447324623/artifacts/13603879187), digest `sha256:850917c641637aa3d0356eb7e66b35460b879466a857225aa6e203bfd132b8d5`.
- User-check URLs (published website, NOT GitHub Actions artifact ZIP):
  * Full interactive synthetic WebApp: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin
  * **List inline edit:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
  * **Popup with these exact fields editable:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?popup=1&inner-hit=1
- Pages-only `main` commit [`0a4bac3d860d1cc3d34ecdaa4270f01abf87cf8f`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/0a4bac3d860d1cc3d34ecdaa4270f01abf87cf8f) touched ONLY paths under `preview/l03-hover-20261108/`. The root Pages index/assets, production application code and Firebase data were not deployed/merged.
- **STATUS `SOURCE_QA_PASS / ISOLATED_PUBLIC_PREVIEW_LIVE_PASS / PRODUCTION_NOT_DEPLOYED`.** Maintain exact source pin. History of intermediate failed runs were **browser test script mistakes only**, corrected in final verified SHA; do not consider them live defects.


## PUBLIC LINK FOLLOW-UP — 2026-11-08

User reported the prior query URL `?full=1&preview-role=admin&utm_source=chatgpt.com` did not open for them. Never assume that GitHub Pages tests reflect every user's network/browser environment.

- Published a **query-free admin entry point** [`/preview/l03-hover-20261108/admin.html`](https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/admin.html) on Pages `main` **commit [`47916397eaea45a7ce984c50a761facb1b74421f`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/47916397eaea45a7ce984c50a761facb1b74421f)**. This file lives only in the existing synthetic preview subfolder, loads the same versioned JS/CSS, and sets `full=1`, `preview-role=admin` through `history.replaceState` before the app module executes. Neither production root nor main source was modified.
- GitHub Pages `pages build and deployment` run **#42481790168 SUCCESS**.
- [Dedicated independent live Chromium check #42481867592](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42481867592) **SUCCESS** on the actual public site, with 3 trials: (1) **admin.html HTTP 200, role=admin, no JS page errors**, (2) original properly separated full URL including `utm_source=chatgpt.com` **HTTP 200, role=admin, no JS page errors**, (3) unqualified preview root **HTTP 200, role=guest, no JS page errors**.
- If the user still cannot open it, request the browser's exact visible error (404, page white, DNS error, extension block, etc.) and whether GitHub Pages host is reachable from their connection. An exact URL pasted with **literal backslashes before `&`** can break client-side query parsing; the query-free `admin.html` avoids this. Do not call an unconfirmed network/device issue resolved solely on CI evidence.
- Test/check workflow added at `.github/workflows/l03-admin-link-check.yml` on the feature branch; it checks the public site in read-only mode without publishing or touching data.


## NEW L03 DEFAULTS + CLEARER OFFICE/DONE + FILTER-INDEPENDENT SUMMARIES — LIVE VERIFIED 2026-11-08

### User requirements, source code and retained safeguards
1. L03 **default five widths only**: readonly = `label:110,status:135`px, editable = `label:110,level:55,status:145`px. Physical widths are `276px` readonly and `349px` editable inclusive of existing gaps+chrome. `DEFAULT_PARTY_TRACK_WIDTHS` changed in `source/src/data/item-preferences.ts`; minimum constraints (64/72 + 64/48/72), any previously saved `partyTrackWidths` values, fallback on legacy-only layouts, maximums and shared CAS merge semantics unchanged.
2. Slightly bolder **default** status swatches in `source/src/data/status-palettes.ts`: `office` ("VP đang xử lý") text `#80531F`, background `#FFEEDA` (contrast approx 5.83:1); `done` ("Đã có TBKL", "Đã có QĐ", "Hoàn thành" and equivalent per stage) text `#256441`, background `#DEF3E5` (contrast approx 6.06:1). Default stage group tints/borders office `#FFF2DD / #E7CEAD`, done `#EAF6ED / #BFDDC9`. No field value/step/status normalization changes. Existing named/user-saved palettes are not silently migrated or overwritten; App/preview passes default swatches as CSS variables and the legacy CSS fallbacks stay untouched.
3. Summary cards **B00 and C01–C03** use `ItemSummaryCards items={items}`, not `toolbarBase`. Previously F01–F05 and individual column filters reduced the summary source; now each card/bucket/percentage is invariant to F filters. The filter pipeline `columnFiltered -> toolbarBase -> filterByChips(...)` still filters table rows, active filter state, and `visibleCount={filtered.length}`, with existing business status scopes (excludes withdrawn/archived according to `summarizeListItems`). **A00 is the UI root fallback code; numerical total is B00** in `ui-reference-codes.tsx`. This distinction was communicated to the user.
4. Regression test changes `source/tests/picker-parity-stages.test.ts`, `source/tests/ui-20261106-tracks.test.ts`, `source/tests/status-palettes.test.ts`, `source/tests/pr95-ui-v2-l2-palette.test.ts`, `source/tests/item-summary.test.ts`, `source/tests/pr95-v6-l3-layout.test.ts`, `source/scripts/picker-parity-stages-browser.mjs`; the old V6 L3 source-scope assertion was intentionally updated from `toolbarBase` to all `items`. CI's source whitelist includes these exact tests, not `src/styles/app.css`, Firebase or backend.
5. Separate fixed short-link `preview/l03-hover-20261108/admin.html` (Pages-only main commit `5906b149ec2fae9421bc571daed7eed225f20d40`) now redirects to the **current** preview root with correct admin query; it does not reference potentially deleted hashed JS/CSS and survived this deployment.

### Exact PASS source + public proof
- **Published immutable source commit:** [`3121e2bee130f0c39046e6a312c0c036b923dade`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/3121e2bee130f0c39046e6a312c0c036b923dade). The immediately later `41aaa21248432def63b59c5ddcf6d7a9b92794f5` changed **only a browser test's whitespace-normalizing regex**, not application code or built preview; its independent full QA run [#42483580739](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42483580739) also **SUCCESS**.
- [Source+browser QA exact pinned SHA #42483471443](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42483471443) **SUCCESS**: **926 unit PASS /116 skipped**, TypeScript, production build, synthetic build PASS. 45 real Chromium L03 scenarios (including source-wide summary vs F01/F02); 54 independent stage reviewer, 24 L04 picker, 10 explicit rail modes, 73 Content browser, 18 commander screenshots PASS.
- [Preview publish+real public Chromium #42484023969](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42484023969) **SUCCESS**: public HTTP 200, byte-for-byte built/published HTML+JS+CSS, source marker exact `3121e2...`, no external network calls. Live Chromium measured editable 3-track **110/55/145px** at 1440px and 390px, guest readonly **110/135px**, mixed popup 110/55/145; 11px/550, 26px readonly/editable parity, existing 1px border/2px outline/-3px semantic hover, inner-only Note/Current Progress still PASS.
- **LIVE F-filter isolation proven** in public full admin: B00 raw total **23**, C01 scope **18**, C02 scope **3**, C03 scope **15**; F01 search reduced table rows to **0** and F02 department reduced to **6**, while all four summary cards' entire text/counts/percentages/bucket values stayed identical. Status variables observed `office [#80531F,#FFEEDA]`, `done [#256441,#DEF3E5]`. Original per-report business scopes unchanged, so C01–C03 totals may each differ from B00.
- **LIVE stable short admin link** tested in browser and redirected correctly without hashed JS deps: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/admin.html
- Direct editable preview: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?edit=1
- Direct readonly preview: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?guest=1
- Public demo root: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/
- [LIVE screenshots and measurements artifact #13619001435](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42484023969/artifacts/13619001435), digest `sha256:08eb87bd58de5b033f693fb51248db3be3cc766fe5e6b9ccd7967ecb0fc5978d`.
- Pages-only main commit [`7b3200df4e804d5b1381825afb402855f68d58a3`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/7b3200df4e804d5b1381825afb402855f68d58a3) changed only four `preview/l03-hover-20261108/*` files. No root app source/assets, Firebase/Sheets data, production service or backend was deployed.
- **STATUS: SOURCE_QA_PASS / ISOLATED_PUBLIC_PREVIEW_LIVE_PASS / PRODUCTION_NOT_DEPLOYED**. Future changes must use a new exact QA-passed source SHA, not the docs/workflow branch HEAD; preserve the unmodified five-rail values previously saved by users.


## FILTER BAR / GEAR / RESPONSIVE PREVIEW — PUBLIC PASS 2026-11-08

### User-requested four visual changes
1. **Active filter panel**: centered all condition chips in the F01–F05 filter inventory (max centered strip 1250px) and centered the no-match explanation; header and “Xóa tất cả” retain their original roles. Stronger restrained blue edge and pale fill distinguish a list under filtering. A blue `aria-hidden` dot pulses only **2 × 720ms** when the filter signature (ID/value) changes; it never blinks indefinitely and is disabled under `prefers-reduced-motion:reduce`. `ActiveListFilters.tsx` and `list-filter-toolbar.css` only alter presentation; AND filtering, existing chip ID/clear semantics, B00/C source aggregates and 0/27 result count are unchanged.
2. **Remove bottom demo footnote**: exactly the two-line `pr95-preview-footnote` in the synthetic `Pr95FullPreview` and its CSS removed. Clear synthetic-role wording still appears inside the actual demo gear menu; production App and backend remain unchanged.
3. **Small discreet gear, no wasted row**: synthetic preview gear is 28px transparent/53% opacity until hover or focus; keyboard accessible with its existing name and toggling. Admin keeps the two useful navigation cards in the same 60/58px header; guest (no nav cards) allocates **zero** header height, placing the gear inside an exterior right gutter. Existing dropdown is anchored to the gear. Existing Escape listener verified (test waits 170ms for passive handler registration after React paint).
4. **Symmetric responsive shell**: previously `.pr95-preview-main` used `max-width:1720px;margin:0 16px`, so wide monitors had excessive **right** blank space. Now `width:calc(100% - 32px);max-width:2200px;margin:0 auto` (mobile 20px total inner allowance). Physical 21/24/27 inch screen sizes do not determine browser viewport; resolution, window width, OS scale and browser zoom do. No production App shell changes.

### Exact QA + public release
- **QA-tested immutable app source:** [`31c4c5f6faa191e6c5d5e2d692eb4c7ca4239a9c`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/31c4c5f6faa191e6c5d5e2d692eb4c7ca4239a9c) on `ui/20261108-l03-hover-lift-fix`.
- [**Complete source QA run #42487277222 — SUCCESS**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42487277222): 930 unit PASS /116 existing skips, TypeScript PASS, both builds PASS; 53 real-browser L03 scenarios including F/C chip group center, finite animation/reduced-motion, admin/guest 390/1280/1440/1920/2560px symmetry, no page overflow and 0-height guest gear header + accessible menu. Independent L03 review 54 PASS; L04 picker 24 PASS; rail presets 10 PASS; Content 73 PASS; Commander 18 screenshot smoke PASS.
- [**Real public GitHub Pages deploy+Chromium run #42487925907 — SUCCESS**](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42487925907). Verified HTTP 200 and exact HTML/JS/CSS bytes against build plus `source-sha.txt`. Real public browser verified:
  * Admin shell symmetric gutters: at ~390 browser viewport, **22/22px**; at ~1280, **30.72/30.72px**; at 1920, **36/36px**; at 2560, **172.5/172.5px**, content capped at 2200px. Viewport tests use browser CSS pixels; `html{scrollbar-gutter:stable}` reserves some client width.
  * **Two active chips centered with deviation 0px**; live computed animation exactly `hdnd-filter-ack`, **2 iterations**; reduced-motion animation = `none`; client controls do not overflow.
  * Guest full UI has header height **0**, gear **28px**, equal gutters **22/22px** at desktop/mobile, and **no** footer; full admin and short `admin.html` link also omit footer.
  * Existing L03 110/55/145 edit, 110/135 read-only; -3px pickers, color tone, 26px height parity, smaller inner-only Note/Specific Progress hit targets and popup unchanged PASS. B00/C01–C03 values are stable after F01 0 rows and F02 6 rows. No external Firebase/Sheets calls.
  * Alias `admin.html` opened current admin preview by redirect, recorded as live PASS.
- Public published source marker: `31c4c5f6faa191e6c5d5e2d692eb4c7ca4239a9c`.
- Pages-only commit [`6696de7955ae979896d3c38713693a57cccedb9a`](https://github.com/cavoixanh638/HopHDND-WebApp/commit/6696de7955ae979896d3c38713693a57cccedb9a) changes only `preview/l03-hover-20261108/**`; **no production root, backend, Firebase Rules or data** changed.
- [Public live proof artifact #13620078674](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42487925907/artifacts/13620078674) digest `sha256:229085a7e0fd204f1a4b834f62ba25ac4a18061109373506f91ee2ccff1130c7`; the artifact is evidence ZIP, **not** a UI viewing link.
- User openable link: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/admin.html ; query-free alias automatically uses current published JS/CSS. Guest: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/ .
- **STATUS: FULL_SOURCE_QA_PASS / REAL_PUBLIC_PREVIEW_PASS / PRODUCTION_NOT_DEPLOYED**.


## 2026-11-08 — A00 / F01-F05 / active-filter banner / C01-C03 / L01 compact polish — LIVE PASS

- **User requests implemented:** slightly tighter A00 preview rhythm (line-height 1.42); F01-F05 12px font and 32px control height with 1.3 line height; active-filter summary **centered** as `Đang lọc N/27 nội dung` with blue pill and strong persistent panel, finite 2-pulse dot (respects reduced motion). Chips show only each actual filter **value**; full field label retained in `aria-label`, `title`, and removal action. No duplicate visible field names. Mobile summary and clear action stack safely. C01-C03 headings `title: percentage` centered with brighter contrast-safe green `#15864D`. L01 Content `td` middle aligned, including merged compact content; Note/Progress hit area unchanged.
- **Exact QA-passed source SHA:** `f0ca4a6c257b826cbac9e1d86d7e02a57f6de9c8` on branch `ui/20261108-l03-hover-lift-fix`. Original code commit `daec0e0771c658114db8f1c45435121b7cd5dff1`; follow-up `f0ca4a6...` corrected a **test-only** mistake that attempted to read computed content alignment after zero-result filtering (no content cell existed). UI source remained unchanged.
- **[QA workflow #42495165237](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42495165237) SUCCESS**, on exact source SHA: typecheck, full unit tests, both builds, source guard, L03/parties/content/responsive Chrome checks and V6 F-filter browser regression. Earlier QA run #42494926635 failed only due to that test-only empty DOM selector, never published.
- **Preview publication workflow pin:** `46b0325ed097fb2829c5e264059168d0067940b3` updates only the build workflow to checkout exact QA-passed source.
- **[Live Pages deploy + Chromium #42495741940](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42495741940) SUCCESS**. Published ONLY `main:preview/l03-hover-20261108/**`. Remote HTML/JS/CSS byte matched compiled artifact, source marker served as exact `f0ca4a6...`; full preview runs in isolated RAM with no Firebase/Sheets calls. Production root `index.html`, root `assets`, backend and database untouched.
- **Direct user URL:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin . Query-free redirect: https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/admin.html . Browser cache refresh may be needed; never infer that a user with network/Chrome restrictions has confirmed access just because CI is green.
- **STATUS: SOURCE_QA_PASS / REAL_PUBLIC_PREVIEW_PASS / PRODUCTION_NOT_DEPLOYED**. Saved 5-rail widths, table resizing, source-scoped C totals, backend permissions, and live data are not modified.


## 08/11/2026 — B00 / F red continuous / C01-C03 font 24 — SOURCE + PUBLIC LIVE PASS

- **User-approved scope:** B00 total number 32→38px (deep green `#087553`, subtle pale-green gradient/border/shadow, no data changes); C01–C03 percent 20→24px (green `#15864D`) within existing 26px header slot, no added card padding/height. Ordinary text in the List is neutral charcoal `#24313D`; summary headings `#1F2937`; interactive blue and all business status palette colours retained.
- **Active-filter UI:** Only “Đang lọc N/T” and condition **values** are red `#C72037`. “nội dung”, remove-X and other supporting text remain neutral. Stronger but restrained pale-red panel/chip; red pulse dot `#F3273F` uses `hdnd-filter-red-pulse 1150ms ease-in-out infinite` only while filters are active; `prefers-reduced-motion:reduce` keeps the dot visible and static.
- **Exact feature code SHA:** `3da8a7b251399715b0b97dcdeb6a6ab388fccdae` on `ui/20261108-l03-hover-lift-fix`. Only `ActiveListFilters.tsx`, `list-filter-toolbar.css`, `item-frame.css` and corresponding unit/browser tests modified. No backend, permissions, layout widths, source counts, or persistence changes.
- **[Exact source QA #42499824050](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42499824050) — SUCCESS:** source scope guard, TypeScript, all unit tests, builds and real Chromium L03/filters/responsive/popup regressions. Browser computed-style assertions verify 38px B00, 24px C percentage, neutral text, red chip/count, infinite dot, reduced motion, and no C01 heading expansion.
- **Preview workflow commit** `ea706d7d86de68047b02d39930970219a8f7d03b` pins exact tested SHA and verifies live layout/red emphasis. **[Public Pages deployment + actual LIVE Chromium #42500395143](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42500395143) — SUCCESS.**
- Verified `main:preview/l03-hover-20261108/source-sha.txt` equals `3da8a7b251399715b0b97dcdeb6a6ab388fccdae`; preview index references versioned JS `compact-qa-BWdEEkte.js` and CSS `style-B_18d7d3.css`, and live workflow byte-checks both. Publish scope only `preview/l03-hover-20261108/**`; production root, Firebase/Sheets, auth and real data untouched.
- **Direct admin preview:** https://cavoixanh638.github.io/HopHDND-WebApp/preview/l03-hover-20261108/?full=1&preview-role=admin . Local Chrome/network-specific access issues, if any, must be diagnosed separately; GitHub Actions public success does not imply personal browser success.
- **STATUS: SOURCE_QA_PASS / PUBLIC_PREVIEW_LIVE_PASS / PRODUCTION_NOT_DEPLOYED / USER_VISUAL_ACCEPTANCE_PENDING.**
