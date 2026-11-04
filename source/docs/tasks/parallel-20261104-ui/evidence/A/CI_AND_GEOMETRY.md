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
