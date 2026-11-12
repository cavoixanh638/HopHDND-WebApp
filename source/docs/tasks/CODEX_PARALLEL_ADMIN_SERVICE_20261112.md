# CODEX PARALLEL TASK — Firebase Readiness and Online Maintenance Hosting
Status: ASSIGNED_AWAITING_ACK (12 Nov 2026)
Repo cavoixanh638/HopHDND-WebApp. Integration baseline 07b26f29d96ac1c9fa0d5f7024f703a582e2b405.
Codex write branch ONLY: qa/20261112-admin-service-host-readiness.

## Goal
One Github Pages WebApp and one Firebase Spark database. Admin eventually exports full application backup, clears active rows reversibly, and replaces from business A–O Excel or backup directly on Pages. No per-import localhost operator after one-time approved deployment. ChatGPT owns frontend and API contract in separate branch.

## Codex tasks: READ-ONLY live work, no production mutation
1. ACK and use dedicated branch above. Read source/AGENTS.md and PR159/PR164 checkpoints.
2. Inspect real Firebase project hophdnd-8b7b2 through authorized read-only connector: actual RTDB region and instance, published Rules hash, authenticated Google authorized domains, datasetV2 active generation and row count, legacy row count; report counts and digests only, never raw personal data or credentials.
3. Do not infer that 59-row local file has been imported. If connection unavailable, mark BLOCKED with exact permission cause, do not guess.
4. Research and validate feasibility/cost of a permanent secure HTTPS admin service under the owner's Spark/no-billing constraint. Must verify Firebase ID tokens server-side, validate admin UID and provider, use protected service credentials, enforce CSRF/CORS, rate limit, expiration, audit, immutable backups, CAS/idempotence and release verification. Compare candidate hosts, including free-tier limits and sustainable operational costs. Cloud Functions Blaze and public client-side credentials are excluded.
5. Identify one-time installation/authorization steps and verified least-privilege secret management. Review origin/domain setup for Github Pages, possible App Check limits and OAuth/refresh token revocation.
6. Distinguish scoped WebApp archive from full disaster recovery (Firebase Auth users + deployed Rules + unknown paths). Assess secure offsite backups and restore drills.
7. Deliver source/docs/operations/ADMIN_ONLINE_HOST_READINESS_CODEX_20261112.md and structured JSON readiness/blocked evidence, commit SHA and link in PR159 checkpoint. No other code changes.

## Forbidden
No Rules deployment, root write/delete, real workbook import, billing change, production backup upload to repo, secrets, service deploy, main merge or Pages publish. Do not edit ChatGPT-owned transaction engine, UI or Rules. All tests against Emulator/fake.

## Result
Return PASS/BLOCKED with evidence, recommended trusted host (or evidence no safe zero-cost choice), cost, authenticated service setup requirements and exact one-time steps. No assertion that production is ready without actual readback.