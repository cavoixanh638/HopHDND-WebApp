# C checkpoint — resumed verification, blocked at exact-SHA runtime gate

**Status: BLOCKED / TEST_PENDING — NOT DONE.**
Owner: STREAM-C. Branch: `ui/20261103-filter-chip`.
Candidate code SHA: `a8a4220b21d3b138e9ad0f47ef84ef67b1570673`.
2026-11-03 takeover by next chat, authorized by user to continue after prior handoff.

## Milestones
1. **Gate start — recorded** at `9b4086d50107d60e3497e0ada2e69299bf7437d4`: verified remote branch HEAD equals candidate code SHA, read task/rules/AGENTS/checkpoint and C code/test/evidence files.
2. **Evidence recheck — PASS as static evidence, not an exact-SHA test execution**: GitHub `chip-geometry.json` contains 7 scenarios (1440, 900, 390, 320px; long at 320; long plus 150% font at 900/390), all with six chips, zero chip-zone scroll overflow, maximum label/value/icon center difference 0.0078125 CSS px, minimum remove-button dimension 31px. Browser log from before commit records CDP mouse/keyboard/guest/admin and zero production requests.
3. **Blocker — exact-SHA test gate NOT EXECUTED**: test container has Node 22, npm 10, Chromium, but no repository checkout. Attempted HTTPS clone of the named branch; command failed `fatal: unable to access 'https://github.com/cavoixanh638/HopHDND-WebApp.git/': Could not resolve host: github.com`. GitHub connector can read repository text/evidence but cannot provide a runnable full checkout or execute npm/Chrome. GitHub connector returned no PR-triggered workflow runs and no combined commit statuses for candidate SHA. Do not infer missing CI means tests passed.
4. **No source fixes made**: prior evidence passes geometry checks; visual screenshots exist on GitHub but not opened in an actual rendering browser in this takeover. Cannot certify newly inspected screenshot pixels or exact-SHA Chrome gate.

## Required next action before DONE
- Obtain a runnable checkout of **exact candidate code SHA** (or fully verified equivalent on authorized machine/worktree).
- At `source/`, run `npm ci`, `npm run typecheck`, `npm test -- tests/pr95-v6-l4-active-filters.test.tsx` (14 tests), `npm run build:compact:qa`, `node scripts/ui-20261103-c-chip-browser.mjs` (set `CHROME_PATH` if needed). Record actual outputs and browser screenshots/geometry.
- Check PNG appearance, mouse/Enter/Space, 1440/900/390/320px, long labels and 150% font. If FAIL, modify **C-owned files only**, retest after commit on exact resulting code SHA.
- Update this checkpoint at test/error/finish milestones. Only set DONE after the full exact-SHA gate passes.
- No A/B file touched; no merge, deploy, production reads or writes.

## Prior history and handoff

# C checkpoint — handoff to Gemini
Status: HANDOFF / TEST_PENDING (exact committed SHA not rerun). Stopped on coordinator instruction 2026-11-03; do not continue writing concurrently with Gemini.
Owner: STREAM-C. Branch: ui/20261103-filter-chip.
Start HEAD verified: 1c5d82c8bd4486a124bbc3bc0a5308f4e76a8132. Worktree unchanged.

## Saved implementation
- ActiveListFilters.tsx: centered 12px SVG cross replaces font-dependent multiplication glyph; existing button ARIA/title/click/Enter/Space/repeat guard unchanged.
- list-filter-toolbar.css: center text blocks vertically; stable 31px remove target; long labels wrap at all widths.
- scripts/ui-20261103-c-chip-browser.mjs: reuses existing full-app synthetic regression with Windows support; real CDP pointer/Enter/Space, focus, seven geometry scenarios and screenshots. CHROME_PATH optional.

## Checks already run on current source before commit
- npm run typecheck: PASS.
- npm test -- tests/pr95-v6-l4-active-filters.test.tsx: PASS, 14/14.
- npm run build:compact:qa: PASS (existing large-chunk warning).
- node scripts/ui-20261103-c-chip-browser.mjs: PASS; 1440/900/390/320px, six chips, long label/unbroken value, 150% font at 900/390; centers within 1px, targets >=31px, no chip-zone overflow. Pointer removes just one condition; Enter and Space work; focus outline solid; admin/guest, zero result, hidden filter regression passes; zero production requests.
- Visual inspection: desktop, 390px and long/150% 390px screenshots reviewed.
- Before-fix screenshots reproduced low glyph alignment. Baseline run completed browser assertions but Windows profile cleanup initially failed EPERM; adapter now waits for browser shutdown and final run exited cleanly.

## Evidence and remaining work
Evidence: ../evidence/C/ (chip-geometry.json, screenshots, browser-pass.log).
Final commit SHA is supplied in handoff message (self-referential SHA cannot be stored here).
No exact-SHA rerun after commit due immediate handoff request. Gemini/coordinator should rerun typecheck, 14 tests, build and browser script on received SHA before DONE/integration. No CI, merge, deploy, Firebase production or source-data write performed.
Untracked local generated artifacts outside handoff commit: source/dist-compact-qa/, source/chip-after.log, source/chip-baseline.log. node_modules installed with npm ci; lockfile unchanged. No source WIP remains outside the commit.

## Push status
NOT PUSHED. Initial git push failed DNS resolution for github.com. Escalated network execution was rejected by automatic approval review: nonpublic source/evidence destination authorization not verified. Do not bypass; coordinator/Gemini can use this local commit, or obtain explicit approval before pushing the named branch to cavoixanh638/HopHDND-WebApp.
