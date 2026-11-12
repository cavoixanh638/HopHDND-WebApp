# REV2 integration QA and demo handoff — 05/11/2026

**Result: CODE_PASS / SITE_PENDING.** Repo `cavoixanh638/HopHDND-WebApp`, coordination branch `ui/20261104-coordination`. **Exact tested Git code+test SHA: `3bfb28e0f8496732424898ae6186ea807af961fb`**. The subsequent commit for this report is docs-only.

## Scope and source provenance

- Prior accepted integrated SHA: `c5ad9e7c4d57aecac47102ea0df3de75bf642fe9` (REV1 A+B PASS).
- REV2 worker A accepted baseline HEAD `9a78244ee09df782a9835fffae181249e8fc1371`. REV2 A source/test `60f82d2503cc9cff1089a7717e2275675f5929b7` and final docs HEAD `ea69ad5522d4ce58729553bf08a0a548073c41ba`; A checkpoint **DONE scoped**, 4/4 A scoped CI PASS; [evidence](evidence/A/REV2_L01_L03.md).
- On takeover, coordinator had **already incorporated A REV2 source/test delta**. Compared blob SHA of `CompactGroupedValue.tsx`, `item-frame.css`, V5/V6 Chrome scripts, and A unit across A/coordination: identical. No duplicate merge/cherry-pick. Only commander-owned shared smoke oracle was corrected after handoff; B code/tests remained as before.
- B worker was not reopened. [B exact-SHA real-App regression #41957942519](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942519) SUCCESS.

## L01 / L03 acceptance

| Feature | Evidence | Result |
|---|---|---|
| L01 readonly punctuation, at least one grant shows two independent aligned member controls, 4 rights combinations in list/popup, no false picker | [A evidence](evidence/A/REV2_L01_L03.md), [integrated V6 L1 #41957942602](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602) | PASS |
| Type dropdown and department have matching hover/focus/open affordance, real keyboard & Escape without mutation; source colors preserved | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602), [visual ZIP #13383074299](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602/artifacts/13383074299) | PASS |
| L03 partyLevel editable 3-track vs readonly 2-track, data-driven BCH/BTV TU, `Không phải trình`, mixed rights | [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602), [V5 L3](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942594) | PASS |
| Three editable status buttons same left/width/height; exact 186×36px, spreads **0/0/0px**; readonly long text not truncated, narrow internal scroll and palette | [A geometry](evidence/A/REV2_L01_L03.md), [V6 L1](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602) | PASS |

## Integrated CI exact SHA `3bfb28e0f8496732424898ae6186ea807af961fb`

9 applicable workflows **SUCCESS**, 3 scope-gated workflows **SKIPPED**:

| Workflow | Run | Result |
|---|---|---|
| Verify source: typecheck/full unit/docs/Firebase Emulator/build/Chrome smoke and QA artifacts | [#41957942551](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942551) | SUCCESS |
| V5 L3 isolated real Chrome grouped geometry | [#41957942594](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942594) | SUCCESS |
| V5 L4 HC/BC full preview | [#41957942771](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942771) | SUCCESS attempt 2; prior run failed synthetic browser assertion, no source/test change |
| V5 L5 HC/BC guard | [#41957942611](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942611) | SUCCESS |
| V6 L1 Loại VB/Cấp trình | [#41957942602](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602) | SUCCESS |
| V6 L3 guest shell/order | [#41957942676](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942676) | SUCCESS |
| V6 L4 applied filters | [#41957942515](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942515) | SUCCESS |
| Firebase operational QA (isolated) | [#41957942637](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942637) | SUCCESS |
| B real-App admin E2E (Emulator only) | [#41957942519](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942519) | SUCCESS |

Earlier intermediate CI failed stale smoke assumptions (readonly frame palette, focus outline exact RGB, highlighted status wrapper, R05 readonly colors, metadata `align-items`); these oracles were updated **only to assert the new REV2 semantics** and the full final Verify passed. No product code changes after receiving the verified A delta.

## Verified artifacts & SHA-256

- [Offline QA ZIP #13383449402](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942551/artifacts/13383449402) ZIP SHA-256 `dace002253a17d6492f25011cf25c09cfabe1263f73a9df26670029844e5e60e`.
- Extracted `HopHDND_GopCot_XemThu.html`: **1,087,511 bytes; SHA-256 `c341c7cee525c9dec5761a4875f5fd6e76d8c81d88c10a6a6f5e85ff78c3a364`**, measured from actual bytes on container after downloading exact run ZIP.
- [Hosting candidates ZIP #13383883533](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942551/artifacts/13383883533) SHA-256 `8bac7a3a7c9df3414d5f259139f61ea36947991e8b71c8528d6bc6b38a53bf46`. Built for QA, not deployed.
- [Integrated V6 L1 Chrome PNG #13383074299](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942602/artifacts/13383074299) archive SHA-256 `0a0902cd51baaa852e21e7213e3f6f32fd53feae8eba13e57e494ef975f3b10b`; [V5 L3 PNG #13383943213](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942594/artifacts/13383943213); [B E2E PNG #13384420950](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41957942519/artifacts/13384420950).

## Private Site blocker

Target existing private ChatGPT Site: `appgprj_6ae93f17c2e48191815caef8a642fa14`. This session has GitHub and container tools but **no Sites API/action**. Cannot verify owner-only access, set version, confirm deployment `succeeded`, validate URL or exercise the deployed app. **Status: SITE_PENDING**, not overall DONE; no fake release claim. Authorized next session should publish only the HTML with the above digest in the existing private Site, verify access/version/deployment/URL, test admin and guest, and update tracker to DONE only with real proof. No `main` merge, Firebase production, GitHub Pages production, Rules or live data operations.
