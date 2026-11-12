# PR159 — integrated Spark/UI acceptance

Status: **INTEGRATED LOCAL QA PASS / OWNER ACCEPTANCE PENDING / NO PRODUCTION**.

- User-selected branch: `integration/20261112-spark-ui-69ceb`.
- Immutable starting commit: `0c9aa57bdb96dc574c58bc1e5501043a288bb61d`.
- Fixed source content committed as `f4042f2ce35dbbc881c4f88a25dfd774d0e32802`.
  Tests below ran on that final working-tree content, starting from the immutable
  base; runner metadata retains its starting HEAD. This checkpoint is docs-only.
- Parents: Spark `9525756c396bd9ec0c0510536ff598cc144f1cbc` and latest UI
  `69ceb3017500edbf2b8c7647cb0965973872d40e`.
- [Draft PR159](https://github.com/cavoixanh638/HopHDND-WebApp/pull/159).
- Active checkout: sibling `spark-ui-integration-20261112`; the old Spark/UI
  checkout is preserved for evidence only and is no longer the development base.

## Baseline results

Exact starting commit: pinned main and parent-service `npm ci` PASS; TypeScript
PASS; full unit suite **951 passed / 117 conditional skips**, 134 passed files.
Default, React production, Preact, compact-QA and both Spark builds PASS.
Docs checker found a review-branch-only relative link; a narrow verified remote
link correction fixes it (180 Markdown files, 767 relative links).

Initial Spark Emulator integration: **43/44 PASS, one FAIL** in the DRAINING
scenario. Parent/operator/private59 phases were not reached after that failure.
Do not apply the earlier Spark parent's PASS to this integrated source.

Independent write-path review found that new UI party-level semantics were not
ported into direct Spark saves/generated Rules. The UI sends only `partyLevel`;
its backend must atomically derive `progressParty`, preserve truthful audit/CAS,
and reject direct status edits under level `Không`. The reviewed fix ports the
contract to Spark transactions and generated Rules with ten legacy+V2 regressions.
New source creation preserves approved A–O values under the unchanged verified
empty-primary admin/trusted-parent write boundary, including existing string and
length checks. Existing-row mutations retain canonical enums, level permission,
lease, CAS, history, generation and freeze fences. Do not
restore an older UI or relax Rules to satisfy an obsolete fixture.

## Fixed-source results

- Full unit suite: **955 PASS / 127 conditional skips**, TypeScript PASS.
- Spark Emulator: **69/69 PASS** = 54 Rules/cell (44 inherited + 10 party),
  14 authenticated local-operator and one private source rehearsal with all
  59 IDs/885 A–O values, unrelated branches preserved and duplicate rejection.
  Functions Emulator false; production writes zero.
- Complete Rules: 211542 bytes; SHA-256
  `76d91e3ad15602b2046857f33b502d66662c7dcbf4536c77239039e1cf209ec3`.
- Actual business App, isolated headless Chrome, real Auth/RTDB Emulators and
  local operator: **10/10 PASS**, 27 screenshots. Covers admin/guest desktop/mobile,
  same-Google-UID separate-tab lock conflict, save/audit, popup save, normal/forced
  freeze+receipt, Excel preview→stage→commit→restore→lookup, generation switch with
  local drafts, level-only dependent status, five-track widths persisted through
  reload at 390/900px.
- Caller-ACK scenario injects one callback failure **after actual server commit
  and readback**. Draft retention and manual same-operation retry leave exactly
  one revision/history event. This is not a physical WebSocket interruption test.
  Four guard unit tests protect its strictly demo/Emulator, pages-test/test-only
  helper. Both final Spark production builds PASS and neither contains the test
  hook `__pr159ArmSparkCellCallerAckLoss` or its injected failure marker.
- Actual-App witness (ignored local artifact):
  `qa-results/spark-final-app-review/witness.json`, SHA-256
  `33f5736b563c197eca59bbafda641db7cd927e20c2bbe802c2779eae8b8f31dd`.
- Independent review confirmed clipboard bulk paste, selected-column search and
  A4 printing are intentionally compact RAM-preview-only in UI parent `69ceb`.
  Their preservation does not activate a new Firebase bulk-write path. No UI
  feature or write gate was silently removed or promoted.

The Functions `core.js` difference from the old Spark parent is the intentional
new UI party contract, not an accidental overwrite; it is the parity reference
for the direct Spark fix. Neither parent branch has been rewritten.

## Latest UI Chromium acceptance

All eight requested isolated RAM-fixture gates PASS, using installed headless
Chrome 157.0.8103.78 with fresh test profiles and loopback-only network guards:

| Gate | Result |
| --- | --- |
| Stage geometry/hover | 53 cases |
| Independent stage review | 54 cases: 6 Không, 36 palette, 12 keyboard |
| Personnel picker parity | 24 cases |
| Responsive track widths | 10 modes, desktop/900/390px, saved widths and minimums retained |
| Content parity | 73 cases |
| Filter shell | 27 rows, six conditions, ESC/keyboard, guest, four chips at 390px, hidden-filter retention |
| Clipboard/search/A4 | 15 search columns, two pasted preview rows, 27 printed rows/six visible columns; five-page A4 landscape PDF with header/ID/page-number assertions and actual raster render |
| Commander smoke | 18 screenshots, 45 guarded local requests |

Only QA runners needed Windows portability fixes: optional `CHROME_PATH`, native
path separators, bounded test-profile cleanup and embedded image data-URL
classification. External/unknown network schemes remain rejected. When
`pdftotext` is unavailable, an explicit `PR159_PYTHON` enables real pypdf layout
extraction; original pagination/text assertions and Poppler info/render remain.
No UI component from parent `69ceb` was changed to make these tests pass.

Logs: ignored `spark-pr159-*.log`; UI logs under local temporary
`spark-pr159-browser/`; screenshots/PDF/witness under ignored `qa-results/`.
Pinned `npm ci` completed for all three lockfiles. Runtime was Windows/Node
24.15; the inherited service engine declares Node22, so these results do not
constitute production runtime/IAM acceptance. All ordinary/React/Preact/compact
QA builds passed; large-chunk advisories remain.

## Parallel owners and completion contract

| Owner | Scope | Required evidence |
| --- | --- | --- |
| Root | Integration decisions, review, final checkpoint | Preserve new UI and Spark security; no unresolved integration failure |
| Luna build/unit | Locked installs, full unit/build gates, broken docs link | Exact counts/logs; no inherited results labelled as new runs |
| Luna preservation/UI QA | Parent-file hashes; latest isolated Chromium fixtures | New paste/search/A4/picker/tracks at desktop/mobile; distinguish RAM fixtures from real Firebase App |
| Write-path agent | Spark party contract + generated Rules + regressions | Legacy/V2 atomic derivation, locks, permissions, history, generation and freeze; complete Spark runner + private59 rehearsal |
| Full-App agent | Opt-in Spark mode in existing isolated browser harness | Actual App + Auth/RTDB + local operator only, no Functions; save/popup/freeze/import/restore/readback |

No Blaze/billing enable, production data/Rules writes, root Pages publication,
main merge or overwrite of either parent branch is authorized. Private workbook,
59-row data, snapshots, credentials and browser profiles stay outside commits.

## Continue only from this integrated branch

Local integration acceptance is ready for owner review; do not redo unchanged
PASS gates or resume development on the old UI checkout. No main merge or deploy
has occurred. Keep Spark and the new UI together on this branch.

Before any future production action: owner acceptance/GO, live IAM/Google OAuth
and exact published Rules review, fresh private backup and verified restore,
private operator release gate, then separately authorized deployment/import.
Production import, production Rules writes, billing upgrades and root Pages
publication remain NOT RUN and are not authorized by this local QA checkpoint.
