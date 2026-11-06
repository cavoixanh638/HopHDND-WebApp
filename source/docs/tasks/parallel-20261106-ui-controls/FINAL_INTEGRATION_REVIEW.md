# Final integration review — 06/11 UI controls wave

**Status: source code + package PASS, public Site DEMO_PENDING.** Tested source: `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa`, not latest documentation HEAD. CI [#42256616362](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42256616362) completed SUCCESS 3/3 on 07/11/2026 00:00:13 UTC+7.

## Provenance / ownership
- PICKER worker source HEAD `dae2051c39ebf595d6f79f31d28125b8db04b5ca` (WIP checkpoint), corrected and accepted *on coordination* with exact visual reference `ab8629c7575debd494c908c14bde9967a575a82a`; PICKER-only verified SHA `102fd250aee050be2d51f9a3bc736bb7ab60bf99`.
- TRACKS worker DONE, tested SHA `ea9758dfe0bb25cb97d888ef3d0890bf68997555`, dedicated [CI #42251062095](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42251062095) 2/2 SUCCESS; 10 source/tests blobs imported to COMMANDER without overlap with PICKER-owned code. Draft PR #158 left open, no merge.
- Combined code SHA `003b25ae9f34b62c8fdca5c4bc176992ae8b6753` already passed [CI #42255472845](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42255472845) 3/3; final `e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa` adds exact-SHA witness archival, README and manifest checks (no functional logic differences) and independently passes the same 3/3.

## Final CI and visual acceptance
- TypeScript, 905 unit tests PASS (116 skipped), both builds; PICKER 24 real-Chrome cases after and 24 each historical reference/base, ref skin 48 snapshots 0 differences (caret 5×3 px is intentional); keyboard/pointer, disabled/readonly, list+popup.
- TRACKS real Chromium six admin/guest cases across 1440/900/390: five independent mode rails, status x/width aligned, example readonly 122+225+8+23=378px; editable 145+82+279+16+23=545px. Save/reopen, validation, legacy RAM fallback, per-field merge/CAS and permissions (unit+Emulator).
- Full real App local Emulator QA01–QA10 PASS, including QA05 popup and QA10 `FIVE_TRACK_WIDTHS_PERSIST_GUEST_390_900`; no production writes. Browser smoke additionally records 18 list/popup PNG/rects. Artifacts: controls 13523312297, CAS 13523391580, real App 13522538680 (retention 14 days).

## Package / hashes
- Main entry **`dist-compact-qa/compact-qa.html?full=1`**, not standalone `dist/Dashboard_HĐND.html`. Synthetic RAM, offline/no external services; admin/guest local HTTP test 200 with asset hash verified.
- CI tar SHA256 `0c57bf08a6f45de00f81d83dd19b76c1af7badd4ffbad5540169695374014820`; full synthetic HTML/JS/CSS hashes listed in CODEX-DEMO-HANDOFF.md and `qa-results/ui-20261106/asset-sha256.txt`.
- User-delivery ZIP `HopHDND_UI_Controls_Full_Synthetic_e095205c.zip`, SHA256 `0258f2838da5799ad988c9ef42442790e2a732f64882c02c373b0b85b78ab605`, 19 files and per-file manifest; downloaded in conversation. GitHub artifact is authoritative for rebuilding package.

## Unresolved / external dependency
- Public Site ID `appgprj_6aed474532b081919e39ba36909bf6bf` and URL https://hophdnd-demo-20261106.charmingscone.chatgpt.site/ must remain the **same Site**. This environment has no Sites API and cannot verify live URL via DNS; no Site deployment occurred. No Site source SHA, version, deployment status or smoke proof. Exact next steps in CODEX-DEMO-HANDOFF.md.
- Legacy workflows on TRACKS worker tip reported failures unrelated to dedicated acceptance runs (PR95 V6 L1, V5 L4, broader Verify-source Firebase 403/400). Their root cause/scope equivalence was not fully established; don't call these green or weaken them. The required dedicated, exact combined SHA CI is PASS.
- No merge main, Firebase production Hosting/Rules/Functions/RTDB writes, real Excel, live migration or new Site. **Entire wave NOT DONE until Site deploy/smoke proof.**
