# Codex handoff — QA HTML UI 05/11 / PRIVATE Site (NO Firebase production)

**Gate:** SITE_PENDING / **NOT DEPLOYED**. This file is an operational handoff, **not** a deployment claim. The commander does not have a Sites API in this session. Never make a public site or use GitHub Pages/production Firebase Hosting as a substitute.

## Exact destination and privacy contract
- Existing private Site ID: `appgprj_6ae93f17c2e48191815caef8a642fa14`; **update this same site only**. Do not create a second Site.
- Owner-only visibility is a hard precondition. Verify site owner/access list **before upload**; if access control cannot be inspected, STOP with `SITE_PENDING` and report the missing permission. Keep it owner-only after the deployment, and verify anonymous/non-owner access is denied.
- Do not merge into `main`, publish a repo release, deploy Firebase production/Rules/Hosting or perform any live migration. Only test-only HTML QA package and the existing private Site are in scope.

## Candidate results / NOT deployable until ALL integration gates PASS
- The earlier source candidate `bf9c76fbabcdd03bc9497115fa28eb6d11faa334` passed unit, typecheck, build, real Chrome REF/UI, and data emulator on [GitHub Actions #42002000862](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42002000862), but full-App **FAILED**. Artifact [#13402623555](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42002000862/artifacts/13402623555) is evidence/candidate, **not approved for publishing**.
- Candidate standalone `dist/Dashboard_HĐND.html` SHA-256 `a2c0f9cfe7ef2b3061f2ec45bdbbd98618d75f8f3749a4899470c53a3457f7bc`; candidate QA archive `html-qa.tar.gz` SHA-256 `a41b3ad759b585edcedaf57300a5f664d513cc05bc67d52ed89907433f2f2d86` — must **not** reuse these hashes as final once code changes.
- The commander is correcting full-App QA07/08 parent CAS Rules denial and adding 05/11-specific acceptance. **Final exact code SHA / PASS run / hashes: PENDING.** Use only the FINAL package identified by a newer VERIFIED PASS checkpoint; never deploy the candidate above just because the artifact exists.

## When commander marks integration FULL PASS — Codex steps

1. Read `source/docs/tasks/parallel-20261105-ui/README.md`, `REVIEW-AND-CONTINUE.md`, `TRACKER.md`, `checkpoints/COMMANDER.md`; capture final **40-char code/test SHA**. Confirm **app-qa, data-emulator and full-app all SUCCESS at that same SHA**, including Chrome list/popup/admin/guest, 1440/900/390 screenshots+rects and transaction rights.
2. Open final GitHub Actions artifact of that exact run. Download artifact, verify `qa-results/ui-20261105/source-sha.txt` is equal to final tested SHA, and compare actual `sha256sum dist/Dashboard_HĐND.html`, `dist-compact-qa/compact-qa.html`, and `html-qa.tar.gz` against manifest. Reject mismatches.
3. Identify which of the two HTML files is appropriate to update the existing Site. Primary packaged demo is `dist/Dashboard_HĐND.html`; `compact-qa.html` is a synthetic test fixture. Never publish synthetic fixture as production application. Verify Site content acceptance with the owning team before upload.
4. Inspect the existing Site `appgprj_6ae93f17c2e48191815caef8a642fa14` for **owner, private/owner-only access, current version and URL**. If any information is unavailable or visibility is not private, STOP. Keep exact site ID, do not create a new public URL.
5. Upload **only the verified final HTML** with Sites API/tools; poll until `deployment succeeded`. Record deployment request, resulting version, URL and time. Verify owner session can load, does not make requests to live Firebase unless separately approved; test non-owner or anonymous access denied. Take screenshot/smoke witness on the published URL.
6. Write evidence back to `TRACKER.md` and `checkpoints/COMMANDER.md` on `ui/20261105-coordination` after respecting writer handoff; include site ID, owner-only evidence, version/URL, source SHA, file and package hashes, artifact, deployed status, and explicit note no Firebase prod/migration/main merge.

## If Sites still unavailable
- Keep `SITE_PENDING` and hand back precise reason (missing API/permission/owner-only check). Do not claim `DONE` or `deployed`.

## Migration separation
- DATA worker is CODE READY/PREPARED_OFFLINE; live migration target `hophdnd-8b7b2` is **HOLD**. Neither Codex nor commander is authorized to execute live migration from this Site handoff.
