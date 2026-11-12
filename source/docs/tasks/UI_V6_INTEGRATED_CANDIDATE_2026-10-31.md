# UI V6 — integration candidate ledger

This candidate implements the handoff in [PR95 comment 6544932225](https://github.com/cavoixanh638/HopHDND-WebApp/pull/95#issuecomment-6544932225). It is for independent Codex review. The current candidate HEAD, completed workflow conclusions, artifact links and unresolved findings are recorded in the candidate PR and its linked PR95 comment; this file does not claim production acceptance.

## Discovery and baseline

Before creating this branch, the integrator checked PR95 comments after the handoff, the recent open/closed PRs, all PRs created on the handoff date and all 275 repository branches. No V6 integrated candidate was found. PR95 still pointed to the V5 baseline below; the five worker heads were unchanged. The old V5 candidate PR135 was not reused as a V6 candidate.

- Baseline: `c79da8f34e0cb1f774cf1b73f5eff31b65b727f2`.
- Candidate branch: `pr95/ui-v6-integrated-candidate-20261031`.
- Draft PR target: `feat/firebase-excel-safe-replacement-and-list-compact-20261030` (PR95 feature branch).
- Worker branches remain unchanged. Changes are applied locally in L1 → L2 → L3 → L4 → L5 order, preserving the accepted patches and recording functional resolutions below.

## Accepted inputs and integration ledger

| Order | Input | Accepted HEAD | Input commits | Candidate integration commits |
| --- | --- | --- | ---: | --- |
| L1 | [PR136](https://github.com/cavoixanh638/HopHDND-WebApp/pull/136), type and party-level controls | `33f751cd3827a5341110c449ac9e0329793d00eb` | 30 | `13e51ab9` |
| L2 | [PR140](https://github.com/cavoixanh638/HopHDND-WebApp/pull/140), inline highlights and existing skill | `2cbc3f75ae442f18ea92d39cd605641f817886d0` | 10 | `2dd3099e` |
| L3 | [PR137](https://github.com/cavoixanh638/HopHDND-WebApp/pull/137), guest shell and List order | `5e87c9f4b8b033e2a8270ca70f180f5b0882b953` | 26 | `e57754e7` |
| L4 | [PR139](https://github.com/cavoixanh638/HopHDND-WebApp/pull/139), active filters | `e9a10d2b10c26574166f85f90b1b472d4b3bde70` | 28 | `ebab8ad2`, `cea17c50`, `32d7e4ea` |
| L5 | [PR138](https://github.com/cavoixanh638/HopHDND-WebApp/pull/138), picker audit and existing skill | `4f5d886d4b827b035bae97cfb6d131f3df2adde0` | 9 | `77c3ae2e` |

All 103 input commits were applied. The initial integrated tree at `77c3ae2e` has 43 changed input paths: 41 single-owner paths match their accepted worker contents exactly; only the two shared paths below require combined content. Later candidate-only changes strengthen validation and record evidence, rather than replacing any worker's implementation wholesale.

## Functional conflict resolutions

### `src/features/items/ItemList.tsx`

L4's commit `4a7fbfc1` conflicted with L3's movement of the summary. The resolution keeps exactly one `ItemSummaryCards` invocation, still using `items={toolbarBase}`, above the centered List heading. It adds L4's `showFilterFooters={false}` to that invocation. `ActiveListFilters` remains directly after the F01–F05 toolbar and before the table. L1's compact and standalone type editor branches remain in place. No filter predicate, field permission, raw value or saved width is changed by the resolution.

Resulting DOM order: B00/B01–B03 → C01–C03 → centered heading → F01–F05 → active-filter bar → table.

### `scripts/smoke-pages-browser.mjs`

L4's commit `aeadf3cd` still measured a baseline where summary cards followed the toolbar. The resolution keeps L3's actual anonymous List journey and absent guest navigation, then measures each real block in the integrated order. It preserves strict spacing bounds separately for F → active-filter bar (<24 px) and active-filter bar → table (<30 px), rather than treating filter chips as blank space. L1's scroll-before-hit-target assertions and L3's verified Emulator admin navigation/report/logout journey remain intact. Subsequent L4 ID/count/clear-filter assertions are applied as supplied.

## Candidate-specific verification changes

- Read-only verification jobs explicitly check out `github.event.pull_request.head.sha || github.sha`, so their logs and screenshots correspond to the candidate commit rather than an unlabelled merge ref.
- The V5 L5 backend write-guard workflow also runs when its UI callers change. Existing deny/lease/freeze assertions and workflow permissions remain unchanged.
- The L2 skill has a reproducible schema/reference/command validator at `scripts/pr95-v6-l2-validate-skill.mjs`. The existing L5 validator remains in use. The two skills stay as repository source; neither is installed globally.
- L1 captures and measures the initial viewport before field/row scrolling, then keeps the original hit-target checks and after-scroll images. Narrow saved widths are not widened or persisted by the test.
- L3 retains guest screenshots at 1440/1280/390, adds admin 1280 evidence and checks the integrated F → active-filter bar → table DOM order and separate gaps.
- The inherited V5 L3 browser runner expected a guest Reports navigation button that V6 intentionally removes. The candidate first asserts guest denial, then uses the existing synthetic gear to enter a separately labelled admin view-only popup scenario. All original geometry, caret, hitbox, readonly and edit assertions remain; no product route or permission bypass is added.
- Publishing jobs, production-read workflow, Firebase Rules, source profiles and backend data are not changed by these verification edits.

## Required evidence and interpretation

The final PR must link completed checks for the exact candidate HEAD: Source Verify, isolated Firebase staging, operational QA, network ACK loss, two-tab tests, all five V6 suites and relevant V3–V5 regressions. It must also include both skill validator results, guest/admin desktop/mobile screenshots, initial and after-scroll narrow-cell evidence, filter/Unicode/picker measurements, and the list of any non-passing or unverified checks.

The ordinary unit run excludes tests gated on emulator environment variables; those skipped cases are not counted as executed until the separate Emulator suites run. Any pre-existing expected-failure must be reported distinctly. A passing worker workflow is historical input evidence, not proof that this candidate passed.

The existing expected-failure is `KNOWN BLOCKER: deny same-UID second tab replaying a visible foreign tab lease token` in `tests/exclusive-cell-freeze.test.ts`. The candidate preserves this test unchanged. Successful normal same-admin two-tab scenarios do not resolve that adversarial token-replay limitation. Operational QA therefore remains **PASS WITH DOCUMENTED RISK**, with cloud **UNVERIFIED**.

Evidence boundaries:

- Compact/full-preview and L1 fixtures mount real source components in Chrome with synthetic data. Actual `App`/Auth/RTDB behavior is covered separately by the real-App Emulator runners.
- L2's popup highlight screenshot uses a styled fixture inside `ReportDetailGrid`. The actual popup does not directly invoke `SearchHighlight`; the fixture is not proof of an existing popup search feature.
- L5's controlled late-ACK case uses a stub lease manager around mounted source components. It is distinct from the network ACK-loss and Auth/RTDB Emulator tests.
- An after-scroll hitbox result proves that the control is reachable after scrolling, not that every caption/state/caret is simultaneously visible initially.
- The owner is the only real production administrator. All identities or multiple admin browser sessions used by this candidate's tests are synthetic Emulator fixtures and do not add production users or rights.

## Release boundary

This work creates or updates only the isolated candidate and its Draft PR/review comments. It does not push PR95 or `main`, merge a pull request, publish a preview, deploy Firebase, or read/write/import/replace/delete/restore production data. Historical handoff documents are left intact. Production remains outside this candidate's acceptance evidence.
