# G00 — Customize header controls + compact advanced manager (22/11/2026)

Evidence: the owner screenshot shows `Quản lý cột` expanded across most of the page and unsorted arrows in header. The previously released eye and border geometry PR #224 applies only to headers with active inline tools; Customize mode disabled those tools (`canEditListSettings = ... && !customizing`).

Candidate change:
- Header eye, hide/restore and rename also work within `customizing`, using `setLayout` recoverable draft only. No Firebase/profile write until the existing Save button.
- `Quản lý cột nâng cao` is collapsed by default; retain advanced capabilities (permission, catalog, grouped header, removed fields, frame width) when expanded. Keep Save bar visible even while collapsed.
- Header advanced action opens the chosen column's manager. Normal View retains CAS-based shared changes; permission/guest gating unchanged.
- CSS keeps corner eye hover-only on pointer-fine devices and uses the existing physical boundary resize target; no floating resize badge.

Acceptance still required: CI typecheck + Vitest on exact PR HEAD; Chromium screenshot in *real Customize mode*, hover/focus eye at true header top-right and drag one physical column separator; confirm Save / Cancel / reload; Admin-only permissions; website version.json matches released source SHA after approved UI publication.

Release gate: THIS IS A CANDIDATE ONLY. Do not claim a live visual fix from branch-only code. No Firebase Rules or production data changes. Do not bypass existing Pages policy or manual release approvals.
