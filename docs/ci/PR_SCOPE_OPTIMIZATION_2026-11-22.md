# HĐND — PR-specific CI optimization checkpoint (22/11/2026)

## Scope and baseline

Repository `cavoixanh638/HopHDND-WebApp`, source baseline `main` at `fb61b50ed64eeec788c8a91a9b00c32de5582bdc` when reviewed. There are 14 workflow files, 12 with `pull_request` events. Eight generic PR workflows on `main` have no `paths` filter; the operational Firebase QA and source verification workflows already have selective event paths.

**Do not alter:** `.github/workflows/publish-pages.yml`, `source/scripts/pages-release-policy.mjs`, `source/scripts/pages-release-approval.mjs`, GitHub Pages assets, source UI/Firebase code, production data, Release Secrets, required-check settings or billing.

## Change proposed

1. Keep each pre-existing workflow and job identifier/check context. Do **not** use `on.pull_request.paths` to suppress established checks: GitHub may leave required checks Pending on skipped workflows.
2. In the 8 generic PR workflow jobs, run an inexpensive diff scope step directly after checkout (which uses `fetch-depth: 2`). Only steps after scope are gated; all are still present. The job check remains available in the PR even when irrelevant heavy steps report `skipped`.
3. `.github/scripts/ci-pr-scope.mjs` uses the synthetic PR merge commit's first parent (`HEAD^1`), with a null-delimited `git diff --no-renames`. Missing merge ancestry, failure to compute diff, oversized diffs, unknown paths, changes to permissions/Firebase/data/core/any workflow/selector itself all run **FULL QA**. No token or network API access is required.
4. Skip is restricted to documented, side-effect-free paths (CSS/presentation/doc/print and a handful of audited picker geometry modules). A change to `ItemList.tsx`, `ItemColumnPanel.tsx`, `App.tsx`, import, shared types, Firebase Rules, permissions, package manifests, workflow or test scripts still runs **every suite**. This is intentional for PR #229's admin/permission changes.
5. Add `concurrency` to 12 PR workflows: cancel outdated PR runs only (`github.event_name == 'pull_request'`). **Do not cancel push main, manual dispatch, or `publish-pages` release runs.**
6. New lightweight policy test workflow runs only on CI policy changes, with no package installation and no deployment. Do not mark this path-filtered new check as a required check in branch protection.

## Evidence, interpretation and costs

- `node --test .github/scripts/ci-pr-scope.test.mjs`: offline regression tests include merge-base selection, docs-only, CSS-only, picker, security, missing ancestry, unknown scripts and manual/push full-run.
- Docs-only PR: 8 targeted jobs still start briefly, but skip setup-node/Java, `npm ci`, browser tests, emulator and builds. `verify-source` and `firebase-operational-qa` retain existing triggers and responsibilities.
- Item CSS-only PR: 4 of 8 targeted suites run and 4 skip the expensive stages; source verification still runs if its existing path filter matches.
- Security/data/permissions/unknown/CI changes: 8 of 8 run full; no newly introduced bypass.
- The 26 `npm ci` declarations in existing workflows reflect independent environments, sometimes including separate local services. Do not remove them blindly: scope-gating avoids executing unnecessary installs, without erasing legitimate jobs or relying on cross-job `node_modules` artifacts.
- Distinguish avoided **job-step executions** from actual GitHub billing. GitHub Actions total run counts may remain the same because workflow checks are retained. No verified dollar savings claim.
- `main` release: requires existing Pages policy and full tests; automatic and owner-approved paths unchanged.

## Before merge

1. Confirm all 12 PR workflows parse and retain original tests/jobs and no release/deploy changes. Compare HEAD with main.
2. Local scope tests PASS; GitHub policy guard PASS; ensure all PR checks generated. Verify stage `NOT_APPLICABLE` on an isolated CSS/doc PR before deciding additional optimization.
3. For any sensitivity-bearing PR (including PR #229), all critical suites run; evaluate failures before merge.
4. Re-check branch rules/required checks in GitHub UI if accessible; connector may lack permission to read them. Do not claim they were verified.
5. No merge, no deploy, no action re-runs or spending/plan changes without explicit authorization.

## Rollback

Revert CI-only commit via PR. The Pages publication and security gates remain in original form.

## Integration and live acceptance — 25/11/2026

PR #230 has been integrated at `4565cbf8d4cad1d9c4cf852223795b04e737cbd1`. Before merge, exact-head CI passed 12/12 workflows, including 14/14 scope contract cases in [run 45617146676](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/45617146676). All eight scoped suites classified the workflow change as `RUN` (`critical,docs`, 16 changed paths), preserving full QA. Their combined observed job wall-clock baseline is 399 seconds (17 + 24 + 66 + 51 + 43 + 54 + 64 + 80). This is neither billed minutes nor a dollar-cost estimate.

This documentation-only change is the genuine live acceptance case: expect eight existing checks to remain visible while expensive steps become `NOT_APPLICABLE`. Record actual job outcomes, logs and elapsed time in the associated PR conversation. Do not count skipped steps as passed tests. No source, production rules, release policy, billing or branch-protection settings are changed. Branch-protection REST returned 403; no attempt was made to bypass enforcement.
