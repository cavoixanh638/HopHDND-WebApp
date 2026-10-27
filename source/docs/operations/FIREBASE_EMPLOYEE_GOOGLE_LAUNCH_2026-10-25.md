# HopHDND — vận hành WebApp Firebase realtime chỉ bằng tài khoản nhân viên

**Trạng thái:** Candidate ready for emulator validation; production not yet deployed. This is the only intended post-cutover workflow (no continuous Sheets synchronization). Date 2026-10-25.

## Access rules, not merely UI hiding

- Visitors may view as before using anonymous Firebase Authentication, but **cannot edit or acquire a cell lease**, even if a column is marked editable in the global grants.
- Each employee who needs to edit signs in with their **own, verified Google account**, opens **Tài khoản Firebase**, and sends the displayed immutable **Firebase UID** to the administrator through their normal work channel. Do not share password, cookies, sign-in tokens or whole user objects.
- Administrator logs in via Google, opens **Tài khoản Firebase → Nhân viên được phép chỉnh sửa**, pastes the UID and selects **Cấp quyền UID**. This adds `hdnd/editors/{uid}=true`. Administrator can revoke it at any time; future lease acquisition and row writes will then be rejected by Security Rules even when column/row/cell permission is still `true`.
- Administrator independently grants **which columns/rows/cells** that employee may edit using the existing list customization UI. Current app grant granularity is **per-cell/row/column across all enrolled employees**, not per-user field granularity. Enrollment narrows **which people** can edit; the per-cell grant controls **which cells** are editable. A per-user-specific cell matrix would be a separate future enhancement.
- Admin Google account has a privileged override, and is not subject to the employee allowlist for editing. Admin authority is already constrained to the explicitly named, verified Google account in Security Rules. Do not let multiple people share that administrator Google login.
- **Two people = two different Google accounts / Firebase UIDs.** For different UIDs, server-side edit lease is exclusive (including forged token cross-UID tests). An adversarial second tab deliberately using the *same* UID as the lease owner remains indistinguishable to RTDB Rules; this is an accepted limitation only when same-Google-account credential sharing is prohibited by organizational policy. UI tab-local protection still applies to ordinary use.

## First employee onboarding (after Rules + data cutover and explicit release GO)

1. Administrator signs into Google; verify `hdnd/editors` listener is available and existing primary records are visible.
2. Employee signs in with Google from another device or browser, sends UID.
3. Before approval, employee remains read-only. Verify that even a signed-in Google employee cannot obtain a lease or save until the admin adds the UID.
4. Admin grants the UID, then enables an intended `note` or other column/row/cell grant.
5. Employee can now edit the granted cell. A second employee (different Google UID) cannot open the same cell while the lease is valid, but can edit another allowed cell on the same row.
6. Save from Employee A; Employee B and Admin must see server-confirmed changes without F5. Check revision + structured before/after history.
7. Admin revokes Employee A UID; A cannot obtain fresh lease or save an in-flight edit. Previously saved data is unchanged. If pending edits are not acknowledged, they remain local drafts for user reconciliation.
8. Reload Chrome/Edge and confirm authorized Google session remains signed in (unless explicitly logged out). New anonymous viewers remain read-only and get a fresh per-tab UID.

## Data protection and release boundaries

- Final one-time initial data import must be from a **current operator-approved, frozen source**. The former one-click UI import from a potentially stale Firebase mirror has been **removed**. Never assume the private backup (which had 0 primary records when sampled) describes live data now.
- At the designated cutover, take a fresh read-only database/rules backup, confirm primary rows are empty before import, reconcile source IDs/count/hashes, deploy the approved exact Rules, import once, verify full row equality, then activate the shared primary profile and publish the tested Pages build.
- No backfill from Google Sheets, dual-write, blanket `firebase database:set /` or uncontrolled destructive rollback.
- Local isolated emulator smoke must be repeated for the final branch head. Anonymously opened staging tabs will remain view-only until authorized test Google principals are enrolled.
- This feature uses current Firebase project and free authentication/Realtime Database; monitor applicable quotas separately before organization-wide rollout.

## Test references

- `source/tests/exclusive-cell-freeze.test.ts` — approved Google employee / denied anonymous and unenrolled Google users / per-cell concurrency / revocation.
- `source/tests/firebase-config-state.test.ts` — live authorization state and admin UID grant.
- `source/tests/firebase-tab-auth.test.ts` and `source/tests/firebase-tab-draft-recovery.test.ts` — anonymous tab isolation and unsaved drafts.
- `source/docs/operations/FIREBASE_ONE_TIME_CUTOVER_ROLLBACK_PLAN_2026-10-25.md` — production launch/recovery boundary.
