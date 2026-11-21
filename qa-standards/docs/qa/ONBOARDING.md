# Onboard a repository without surprise CI costs

1. Record repository visibility, default branch, branch protection/rulesets and currently active workflows. Review PR and push triggers, `workflow_dispatch`, secrets, deployment gates, runners and required check names before any write.
2. Export representative Actions run histories and official billing source, preserving gross / discount / net separately. Check whether workflows on other branches still execute despite absent workflows on `main`.
3. Determine code change categories, transitive dependencies and mandatory security/data/production gates. Add a conservative `policy-<repo>.json` with full fallback, then write fixtures/tests for it.
4. Run local Python tests and toolchain-specific checks. Produce a checkpoint with real source SHA and evidence. Do not claim a commit was tested when only an earlier version was run.
5. Add a branch with offline tools/docs. Predict all trigger matches before PR. If opening PR would start broad heavy jobs, stage to a non-main review branch only if it will actually avoid those workflows; otherwise leave an unmerged checkpoint branch pending approval.
6. Use an always-present cheap status job when changing `paths` on required workflow checks. Do not disable release/security gates. Add PR-only cancellation groups, bounded job timeouts and dependency caches with proven benefit.
7. After owner approval, compare equal-period run count, billable minutes and regression test performance. Preserve rollback references. No automatic merge or deploy.

## AI handoff

Every AI reports: owner, source SHA, branch, files changed, tests executed (exact commands), PASS/FAIL/NOT_RUN, evidence, known untested assumptions, trigger impact, estimated/metered cost, rollback and approval needs. Never overwrite central status files from parallel branches.
