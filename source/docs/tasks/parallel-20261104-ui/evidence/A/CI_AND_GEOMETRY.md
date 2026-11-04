# Worker A — evidence and geometry (04/11/2026)

## Scope and source
- Baseline: `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`; independent branch: `ui/20261104-table-layout`.
- UI source commits: `66d02ecf8c5aeabfb57a2e524a0536eb41220dc5` (latest JSX) and `cfd54a374dfcce4ae3d81403cb6b3152148235ae` (CSS); source changes in `CompactGroupedValue.tsx` / `item-frame.css`.
- Tested full PR head (before 900px extension): `68bc3be9d3f085f92d3903a1e11ad16ec517293a`.
- Further test-only commit: `2124989d01a4ecfba2b749fdb940d7928074c53b` (adds 900px cases). **This later SHA must be separately tested; do not transplant earlier PASS status to it.**

## Reproducible CI / screenshots
- [V5 L3 #41760082107](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082107): **PASS**; typecheck, legacy V4/V5 unit, `build:compact:qa`, real Chrome list/popup guest/admin and 390px. Screenshot artifact ID `13290520441`, name `pr95-v5-l3-visual-geometry`.
- [V6 L1 #41760082138](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082138): **PASS**; typecheck, type/level tests, Chrome list/popup admin/readonly/mixed/saved narrow/390px; artifact ID `13289133769`, name `pr95-v6-l1-real-chrome-type-level`.
- Source verify [#41760082109](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760082109): typecheck + all unit tests PASS as of last checkpoint; full run not finalized when recorded.
- Draft test-only PR: https://github.com/cavoixanh638/HopHDND-WebApp/pull/153. No merge/deploy.

## Actual Chrome measurements (V6 L1 log, exact SHA 68bc3be...)
- List admin 1440px: stage status left spread **0 CSS px**, caption-to-status gap **8px** for sampled rows; independent pointer hit-target assertions PASS.
- List readonly 1280px: stage status left spread **0 CSS px**, gap **8px**; level picker absent; full caption preserved where required.
- List mixed 1280px: stage status left spread **0 CSS px**; distinct level/status permissions PASS.
- List narrow saved column 1280px: internal status-scroll clientWidth **192px**, scrollWidth **317px**, overflow `auto`; no column-width mutation needed.
- Popup readonly/admin 1440px and List 390px: Chrome status-left spread **0 CSS px**, independent controls/hit regions PASS.
- Chrome checks type palette QPPL/HC/BC, type picker clear, Escape with zero update, source-preserving legacy status, readonly and mixed rights.
- Baseline screenshots: the earlier V5/V6 CI for baseline are not reproduced in this worker's evidence. Do **not** construe earlier screenshot artifacts as baseline visuals; only after-change screenshots are linked.

## Pending
- Rerun Chrome + unit + build on new full SHA including 900px additions.
- If all gates PASS, inspect screenshot names, validate 900px geometry and close any remaining gap; mark DONE only if every acceptance item independently supported.

## Retest on corrected 900px code/test SHA `3a057bb1609e5434f9328e1b2d5ed530991be776`
- [V6 L1 #41760360924](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760360924): **PASS**, including full 900px List readonly + Popup readonly Chrome and their screenshots. Artifact: open the run's `pr95-v6-l1-real-chrome-type-level` ZIP. New screenshots: `worker-a-list-readonly-900.png`, `worker-a-popup-readonly-900.png` (plus `pr95-v6-l1-*-900-*.png` initial/after-scroll).
- [V5 L3 #41760360888](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760360888): **PASS**, typecheck/unit/build:compact:qa/real Chrome. Screenshot artifact `pr95-v5-l3-visual-geometry` in this run.
- [Verify source #41760360918](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760360918): typecheck and full unit suite PASS at observed stage; full workflow remains to be checked.
- Exact 900px List readonly log: **statusLeft spread 0 CSS px**, caption-to-state gap **8px**. Table scroll container: `clientWidth=779`, `scrollWidth=1492`, page remains inside the table scrollbox. Popup readonly 900px: **statusLeft spread 0 CSS px**, gap **8px**, scroll container `clientWidth=848`, `scrollWidth=1610`.
- V6 L1 log ends `PR95_V6_L1_CHROME_PASS` with desktop/1280/390/list/popup/mixed/narrow + additional 900px checks. No production requests.
- `Không phải trình` regression: `source/tests/ui-20261104-worker-a.test.tsx` asserts a *partyLevel* exactly equal to `Không phải trình` hides the level; Chrome fixture only contains a nonrequired *progressParty* for some records and must not assume the two fields mean the same thing.

## Follow-up: V3 choices-only focus oracle (commander request, 04/11)

- Assignment: [PR #153 comment #6620952313](https://github.com/cavoixanh638/HopHDND-WebApp/pull/153#issuecomment-6620952313). Initial failure [Verify source #41760550847](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41760550847) asserted `getComputedStyle(stage).outlineStyle==='solid'` on the **whole row**, conflicting with the new separately focusable L03 status trigger.
- Diagnostic-only commit `54da0a6b62f18105d121eb7513d04b9f8306f5d0` left the obsolete oracle unchanged; [exact-SHA Verify source #41761708772](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41761708772) intentionally still **FAIL** at the same assertion but returned the following independent Chrome computations:
  - `stageOutline={style:'none', width:'0px'}` (no enclosing-row focus ring).
  - `stateTriggerOutline={style:'solid', width:'2px', color:'rgb(53, 108, 139)', offset:'1px'}` (visible, separate focus ring).
  - Trigger `aria-expanded=true`, `aria-haspopup=dialog`; popup `role=dialog`, correct row-specific `aria-label`.
  - `choices` all true except **only `rowOutline:false`**: five exact official options, selected `VP đang xử lý`, accessible option roles, one choices-only container, no decorative headings or second input.
  - `document.activeElement` is the selected `role=option` button: keyboard focus moves into the dialog, while expanded trigger retains its own visible outline.
- Fix is **test-only**: commit `38e5ff6a2a0174d2c4d3f546e345da87a5db075c` modifies `source/scripts/smoke-pages-browser.mjs` to require row outline `none/0px` **and** trigger outline solid/≥2px, expected color/offset, `aria-expanded` and dialog semantics. Original exact 5-option/selected/choices-only/role/ESC/no-patch assertions remain intact. No source UI/CSS/backend changes.
- Previous diagnostic SHA retained V5 Chrome [#41761708909](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41761708909) **PASS** and V6 Chrome [#41761708717](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41761708717) **PASS**.
- **Gate outstanding until the final test-only SHA gets Verify + V5 + V6 PASS.** No deployment/merge.

## Final worker A retest: all three gates PASS on the SAME Git HEAD

- **Exact fully tested Git HEAD:** `73c2d17a4bdbcd74ce62b8e465db78a04cbcadf0`. Source UI remains unchanged since earlier worker SHA; final test fix is `38e5ff6a2a0174d2c4d3f546e345da87a5db075c`. Later commits to this head only add/update `docs/tasks/parallel-20261104-ui/checkpoints/A.md` and `evidence/A/CI_AND_GEOMETRY.md`.
- [Verify HopHDND source #41762122590](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122590) **SUCCESS on 73c2d17...**: TypeScript, full unit, Firebase Auth/Functions/RTDB Emulator, split Pages build, standalone build, compact QA build, and real Chrome browser smoke including the corrected QPPL focus case. Log contains `UI_V3_L2_CHOICES_ONLY_KEYBOARD_PASS` with row outline `none/0px`, trigger ring `solid/2px/#356C8B`, `aria-expanded=true`, all 5 official options/selected role/ARIA correct. Following Escape the selected status is unchanged; `UI_V4_L2_INDEPENDENT_FIELD_EDGE_CLICKS_ESCAPE_PASS` reports `patched:false`; final `BROWSER_SMOKE_PASS`.
- [V6 L1 #41762122685](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122685) **SUCCESS on 73c2d17...**: List/Popup, desktop/900/390, readonly/admin/mixed, saved narrow width and status-alignment checks. [Screenshot artifact #13291096140](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122685/artifacts/13291096140).
- [V5 L3 #41762122641](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122641) **SUCCESS on 73c2d17...**: typecheck, old+new unit contracts, build:compact:qa and Chrome list/popup/guest/narrow/mobile. [Screenshot artifact #13290866443](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122641/artifacts/13290866443).
- [Real combined browser smoke screenshots #13290708126](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122590/artifacts/13290708126) (including `hophdnd-v3-l2-choices-only-dropdown.png`, list/popup and guest/desktop/mobile output).

### Immutable BEFORE vs AFTER image pairs

- **BEFORE**, genuine code baseline `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`: [V5 L3 run #41635316556](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316556), [screenshots artifact #13230223055](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41635316556/artifacts/13230223055). Original files `pr95-v5-l3-list-1440-admin.png`, `pr95-v5-l3-popup-1440-admin.png` and `pr95-v5-l3-list-390-guest.png`. Baseline log names editable caption **`Thành ủy (BCH)`**, editor enclosed in caption; caret-right spread `[0,0,0]` already PASS at baseline (do NOT incorrectly claim it was not aligned).
- **AFTER**, same named screenshots from [V5 L3 run #41762122641](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41762122641/artifacts/13290866443). New editable caption is **`Thành ủy`** and separate `(BCH ▾)` control in an independent track, with unchanged per-field lease and right-caret alignment `[0,0,0]`.
- The BEFORE/AFTER PNGs are retained in **GitHub Actions artifacts**, not copied into Git source; above links are the precise immutable original sources. This log and V6 inspect output provide measured geometry; no screenshots were fabricated.

### Remaining outside worker A

- Integrated A+B code SHA, browser/deployment tests and private demo Site are owned by commander. Worker A branch stays isolated and PR #153 draft; no merge/main/Firebase deployment is authorized.
