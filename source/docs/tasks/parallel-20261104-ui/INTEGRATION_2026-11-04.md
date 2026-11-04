# Integration review 04/11/2026 — A+B (QA ONLY, NOT RELEASED)

## Immutable provenance

- Baseline code `d779dde0b1e42cd2b2bb511826cc53d0ebfa345b`.
- Worker A HEAD `9a78244ee09df782a9835fffae181249e8fc1371`, code source in `CompactGroupedValue.tsx`/`item-frame.css`; last tested source/test SHA `73c2d17a4bdbcd74ce62b8e465db78a04cbcadf0`; checkpoint A **DONE**, worker evidence `evidence/A/CI_AND_GEOMETRY.md`.
- Worker B HEAD `4cf1aa88382f90c927c59c2dd20226c285e37798`, code source in `ItemList.tsx`/`admin-list-controls.css`; code/tested SHA `9ca1101edeabe942a5ce4daeee15c96b05795a99`; checkpoint B **TEST_PENDING**, worker evidence `evidence/B/CI_CORRECTIVE_20261104.md`.
- **Integrated code Git SHA `60cda9329fa7f94f22617d15952337e734f0834b`**, octopus commit with 3 parents (commander, A, B); constructed by applying exact 12 non-overlapping worker blob SHAs to coordinator base tree. Verify via GitHub compare: integration ahead of both worker HEADs, behind 0. After this code SHA, only documentation commits may follow.
- [Draft QA PR #155](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155), base `ui/20261103-coordination`. **No merge to main or deployment**.

## Integrated CI, EXACT code SHA `60cda932...`

All **8/8 applicable workflow runs SUCCESS**; PR142 and PR147 gated workflows are SKIPPED and are *not* counted.

| CI gate | Run | Conclusion |
|---|---|---|
| Verify source: typecheck, full unit, Firebase Auth+Functions+RTDB Emulator, build, real Chrome smoke, single HTML QA preview | [#41766317264](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317264) | SUCCESS |
| V5 L3 grouped real Chrome list/popup/guest | [#41766316840](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316840) | SUCCESS |
| V5 L4 HC/BC effective | [#41766316943](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316943) | SUCCESS |
| V5 L5 HC/BC Firebase RTDB write guard | [#41766316997](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316997) | SUCCESS |
| V6 L1 Loại VB/Cấp trình List/Popup | [#41766316914](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316914) | SUCCESS |
| V6 L3 guest shell/Admin/List ordering | [#41766317124](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317124) | SUCCESS |
| V6 L4 active filters and keyboard | [#41766316853](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316853) | SUCCESS |
| Firebase operational QA multi-account | [#41766316868](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316868) | SUCCESS |

### Evidence artifacts from those exact SHA runs

- [V6 L1 real Chrome screenshots ZIP #13292418505](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316914/artifacts/13292418505), archive digest `sha256:03ed93e10718b9b473ee2ea279dbaf53c104444fab0668d2a9fbfa9e41ddc698`.
- [V5 L3 visual geometry ZIP #13292906719](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316840/artifacts/13292906719), archive digest `sha256:e89dab7460e006a83e24068ba693229c633084ebfa10995faab3cd93e8322f23`.
- [V6 L3 guest layout Chrome ZIP #13292018389](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317124/artifacts/13292018389), archive digest `sha256:bbbbdc644be77f789c0286abb4ef9b9a0e894b7c2f4a618a33f0d687e1633c7c`.
- [Verified hosting candidates ZIP #13292528372](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317264/artifacts/13292528372), archive digest `sha256:119697382a48bc47761dc1551542a7c2d7b60a7d4bca4b788c9bdebd828828f8`.
- [Offline compact interactive HTML QA ZIP #13291963938](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317264/artifacts/13291963938), archive digest `sha256:9e0115844c90490fc9023daaf00f6e1c8f97c16e64d1d39a63e443c09070275e`.
- [Browser smoke preview ZIP #13292847194](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766317264/artifacts/13292847194), archive digest `sha256:989d080e949c725335212dd52898a208691fb73166e7062ce0523766df122eac`.
- Digest values above are **GitHub artifact ZIP digests**, *not* the SHA256 of the individual HTML file; HTML content hash and Site deployment version still need separate attestation.

## Acceptance matrix

| Requirement | Files/SHA | Independent + integrated proof | State |
|---|---|---|---|
| Nội dung trình `(Sở - Loại VB)` conditional/read-only/per-field editor/highlight | A `CompactGroupedValue.tsx`, `item-frame.css`, integrated `60cda932` | A checkpoint, [V6 L1 #41766316914](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316914) + [V5 L3 #41766316840](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316840) | PASS, scoped |
| L03 3-column editable partyLevel, separate status picker | A same | [V6 L1 #41766316914](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41766316914) Chrome geometry/hit targets | PASS, scoped |
| L03 2-column readonly and suppress redundant `Không phải trình` level | A same | same V6 L1 + A unit; original source values unchanged | PASS, scoped |
| L03 three aligned statuses, 1440/900/390, keyboard/hover/focus | A CSS/tests/smoke | A 0px spread evidence + integrated V6 L1 and Verify real Chrome | PASS, scoped |
| Admin immediate `Đổi tên danh sách` and title/nav persistence | B `ItemList.tsx`/CSS | B static/Chrome general, integrated V6 L3 and Verify; dedicated E2E save/reload/guest **missing** | TEST_PENDING |
| Admin separate C01/C02/C03 toggle, C00 constant/guest/CAS | B same | B static + CI general; dedicated E2E toggles/filter/reports, denied/offline/CAS **missing** | TEST_PENDING |
| Integrated CI/package/private Site demo | Commander merge `60cda932` | 8/8 exact SHA SUCCESS, QA artifact ZIP available; private Site version/deployment **NOT RUN** | TEST_PENDING |

## Remaining release gate (no false DONE)

1. Run **dedicated real Chrome App + Firebase Emulator** on integrated code SHA for title edit/validation/save/reload and tab/guest realtime; C01–C03 disable/enable each while C00/count/filter/reports remain; offline/denied/CAS conflict rollback; screenshots at 1440/900/390 with keyboard and pointer focus. Existing source and generic Chrome PASS do not substitute for this.
2. Record actual **HTML QA file SHA256** after extracting exact successful build artifact; preserve corresponding Git/code SHA.
3. **Private Site** `appgprj_6ae93f17c2e48191815caef8a642fa14`: only update if original owner-only controls verified, and only after E2E + package hash; then capture version/deployment succeeded and owner URL. No Site mutation executed or verified in this checkpoint.
4. No Firebase production, GitHub Pages production, Rules, real RTDB changes, or `main` merge. Keep tracker NOT DONE.

The commander has posted E2E follow-up to [worker B PR #154](https://github.com/cavoixanh638/HopHDND-WebApp/pull/154#issuecomment-6621641259), and [PR #155 has integration evidence](https://github.com/cavoixanh638/HopHDND-WebApp/pull/155#issuecomment-6621649845).
