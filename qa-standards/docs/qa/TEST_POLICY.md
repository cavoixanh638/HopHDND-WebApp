# Local-first QA policy v0.1

- Cấp 1: Run locally for every affected change; syntax, lint/type checks, targeted unit tests. Record exact command and exit code; `NOT_RUN` is not `PASS`.
- Cấp 2: For PRs use conservative source-to-test mapping. If any changed path is unclassified, workflow/config/lockfile changed, or dependency scope is uncertain: **full acceptance**. `select_tests.py` is advisory; branch rules and required checks still apply. Keep an always-present lightweight PR check if using job-level conditionals; do not use workflow-level path filters to make a required check stay pending.
- Cấp 3: Before merge/release, explicitly rerun appropriate security, authorization, Firebase/DB, backup/restore, browser, artifact signing, rollback and release checks. No automatic reuse for integration, external service, race, realtime, sensitive data or production release tests.

## Checkpoint storage and trust

`docs/qa/TEST_CHECKPOINT.md` contains a small human index; `docs/qa/checkpoints/*.json` may hold selected records. Keep large logs and screenshots in separate artifacts with short retention (default 7 days; sensitive acceptance up to 30 days if policy requires). GitHub cache is not a durable evidence store. Never store tokens, customer data, real backup archives, credentials, or private file content in shared checkpoints.

Every PASS must name exact repository, branch, SHA, suite version, environment, start/end/duration, commands and evidence. Reusing a checkpoint requires complete hash-equivalent inputs (source, tests, dependencies, toolchain, config, fixtures, security) and approved coverage mapping, TTL and trusted provenance. The helper reports an advisory candidate only, **does not attest provenance or replace required CI**.

When many AIs collaborate, keep separate change branches and disjoint file ownership. Do not push a commit merely to trigger Actions. Check previous checkpoints, verify same affected scope, run local tests first, and report `PASS`/`FAIL`/`SKIPPED`/`NOT_RUN` separately. Use SHA + evidence link; combine reviewed scopes rather than repeating an expensive full pipeline on every independent worker branch.

## Cost controls

- User-controlled Actions budget is reported as $0; do not change it.
- Prefer local tests; no new large runners, paid hosting, new compute or private-repo Action storms.
- For repeat PR pushes, use `concurrency` keyed by PR number with `cancel-in-progress` **only for non-release PR jobs**.
- Cache dependencies with lockfile keys, never use mutable cache as proof of testing.
- No auto deploy or signed release on ordinary source push. Manual/tag release needs explicit owner approval and production checks.
- Before any PR, inspect which **existing** workflows will fire. Avoid a PR directly into `main` when unrelated heavy jobs lack path filters; stage safely and retarget only after approval.

## No automatic bypass by this PoC

No workflow was removed or disabled as part of the bootstrap. Required-check and branch-protection configuration must be verified by a repository administrator before optimizations that could alter their status.
