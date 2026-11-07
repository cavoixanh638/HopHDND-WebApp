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

## Acceptance / checkpoint
- At source commit creation: **CODE_PATCHED; CI NOT YET VERIFIED**.
- Required: exact-SHA GitHub workflow success and hover geometry evidence at List and popup, viewport1440/900/390, editable and mixed. Mark release **DEMO_PENDING** until public Site is rebuilt/published and independently verified.
