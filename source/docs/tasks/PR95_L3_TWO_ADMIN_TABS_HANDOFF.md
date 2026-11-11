# PR95 — L3: two REAL Chrome administrator targets, generation fence

## Fixed starting point / ownership
- Integration base fixed at `01530a9ccedba021434626c1f717c2ac76fcaa64`.
- L3 branch `pr95/l3-real-two-admin-tabs-race-20261030`, Draft PR #106, targets **PR #95 integration branch** rather than main.
- **Exact tested code SHA:** `e9671e5e487b4571886650f41758977b46912645`.
- Own workflow: `.github/workflows/pr95-l3-two-admin-tabs.yml`.
- **Real CI PASS:** https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/41023371387
- Isolation: `demo-hdnd` Auth + Realtime Database Emulators on loopback, Vite **pages-test** on loopback, genuine headless Chrome with two distinct DevTools targets, same verified `google.com` admin UID through existing test-only hook.
- No production access. No GitHub main merge, deployment, publication or Firebase/Google Sheets production mutation.

## Source of evidence (not mocked browser tabs)

`source/scripts/pr95-two-admin-browser.mjs` controls two independent Chrome DevTools page targets `source/pr95-two-admin.html`, each running `source/tests/pr95-two-admin-browser-entry.tsx` with actual `FirebaseRepository`, `CellEditSessionManager`, `useWorkspace` and backend `stageDatasetReplacement/commitDatasetReplacement`. This uses a **minimal test-only UI**, not the full App editing panel, so the result must not be used as a claim of full product UI E2E.

Runtime-only config points to the unmodified `firebase/database.exclusive-candidate.rules.json`. Emulator's initial permissive startup rules are detected; test-only local owner API installs the exact candidate JSON. Real `/.settings/rules.json` GET proves exact JSON and SHA-256 both **before** and **after** Chrome.

**Rules SHA-256:** `3bb044daef1df129ca46478a70f1895fa76c9bd0400c5069afec5358bbe53ecc`.

A user representing the same admin signs in on both actual browser targets via existing `__pr95EmulatorGoogleAdminSignIn`. The Auth Emulator validates `email_verified`, `google.com` provider and shared UID. Lease sessions and CDP target IDs are distinct.

## Real GitHub Actions #41023371387 evidence

- `PR95_L3_CHROME_TWO_TARGETS`: 2 different actual Chrome page target IDs, same browser process.
- `PR95_L3_SAME_ADMIN_UID_PASS`: same Emulator Google admin UID, separate page sessions.
- `PR95_L3_SAME_CELL_LEASE_CONFLICT_PASS`: tab A obtains lease; tab B's same-cell acquire is denied; real lease renewal increments revision; A saves authorized edit; old-base attempt from B is denied. Server readback confirms edit proof, row revision 2 and structured audit event. Lease release tombstone checked.
- `PR95_L3_SAME_CELL_SERIAL_SAVE_PASS`: tab B then acquires and validly saves; row revision 3 and audit old/new values are verified.
- `PR95_L3_DIFFERENT_CELLS_CONCURRENT_PASS`: tab A and B acquire different fields, concurrently submit real SDK saves; both accepted; one server row reaches revision **5**, with two distinct audit operations at slots 4 and 5 and both new field values preserved.
- `PR95_L3_OLD_WORKSPACE_DRAFT_CREATED`: actual React `useWorkspace` state has **one pending draft** on original generation, in addition to the per-cell draft recovery key.
- `PR95_L3_GENERATION_STALE_DRAFT_LEASE_FENCED_PASS`: real backend staging and CAS switches to `gen_pr95_two_tabs_swap_0001` (active pointer revision 2). Old captured patch fails; new-generation row is byte-for-byte unchanged, no old draft is recovered by a reused row ID, workspace source changes and pending drafts clear. Direct stale `renewCellLease` is rejected (not only because the old SessionManager was disposed); old manager's acquire/renew rejected. Old row remains intact.
- `PR95_L3_RULES_EXACT_PASS`: candidate Rules unchanged through entire test; `PR95_L3_TWO_REAL_ADMIN_CHROME_TARGETS_PASS` is printed only after all assertions complete.
- **All data is synthetic.** Server readback is **owner-authenticated localhost REST**, not an offline cached Firebase SDK get. Owner is never used for the actual two-tab edits; those use emulator-issued verified Google admin identities.

## Client bug found and fixed within L3 ownership

First full Chrome run against the original client revealed that `renewCellLease` could renew an **inactive-generation lease** under the same admin UID after the active pointer changed (not an edit of new-generation data). This was **a real client-side generation fence gap**, not a false test assertion. Fixed only `source/src/data/cell-edit-leases.ts`:
- `assertActiveLeaseGeneration` reads the current server V2 active pointer; reject mismatched generation before/after renew.
- Reject mismatched generation before lease acquisition **including the fast path for a lease already held in memory**.
- Recheck after acquiring, release and fail closed if generation changed during acquisition.
- Legacy calls without V2 generation retain existing behavior; no Rules changes.

Corresponding tests exercised both the manager lifecycle matching App (disposing old manager on swap) and direct raw renew bypassing that disposal. Full test then passed.

**Changed files on L3 worker:** `source/pr95-two-admin.html`, `source/tests/pr95-two-admin-browser-entry.tsx`, `source/scripts/pr95-two-admin-browser.mjs`, `source/src/data/cell-edit-leases.ts`, `.github/workflows/pr95-l3-two-admin-tabs.yml`, and this handoff document. No App, Excel panel, dataset replacement backend, Rules, or existing browser smoke files modified.

## Release boundary

**PASS only within the two-admin-tab scope:** concurrent same-cell lease exclusivity, independent-cell saves, renewed/released leases, server revision/history, old patch/lease/workspace draft fenced by a real backend generation swap. This test does **not** prove the full production App edit dialogs and visual interactions, genuine lost ACK at CAS/network, first legacy V2 activation through the Excel UI, or end-to-end import→replace→restore user journey. Those remain separately unverified. PR #95 stays Draft/HOLD; L1 integrates after independent review only.
