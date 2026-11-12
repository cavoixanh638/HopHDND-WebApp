# CODEX — PARALLEL READ-ONLY FIREBASE + HOSTING PREFLIGHT (12 Nov 2026)

## Role / separation of duties
ChatGPT owns **source code and UI/backend implementation** on `feat/20261112-online-maintenance-worker`. Codex **must not edit that branch, source code, workflows, existing integration, main or Pages**, and must not repeat any PASS items from PR #159/#162/#164.

## Starting state
- Repo `cavoixanh638/HopHDND-WebApp`.
- Integration (READ ONLY): `integration/20261112-spark-ui-69ceb` at `07b26f29d96ac1c9fa0d5f7024f703a582e2b405`.
- WebApp daily-use target: `https://cavoixanh638.github.io/HopHDND-WebApp/`.
- Firebase project `hophdnd-8b7b2`; Spark FREE required; **NO Blaze, billing, Cloud Functions, production writes, Rules changes or database deletion**.
- Exact approved business sample: 59 rows / 885 A–O values; these prior assertions must be independently reconciled with live read-only data, not inherited as a production success.
- Admin backup PR #164 merged in integration but LIVE deployment HOLD.

## What to do NOW (all read-only)
1. Authenticate to Firebase with an already authorized connected tool; inspect active project, RTDB instance/region, currently **published** Rules SHA/fingerprint, Auth providers and `cavoixanh638.github.io` authorized domain. Never reveal tokens, passwords, service-account keys, recovery codes or personal data in GitHub.
2. READ ONLY identify `hdnd/datasetV2/active` state, active generation row count and digest, `hdnd/items` legacy status, `hdnd/freezeControl`, and existence/counts of V2 generations/backups/candidates/maintenance operations. Compare 59 IDs / 885 A–O values only if you have access to the approved workbook in a protected local environment. Write counts/hashes only.
3. Assess whether a **Cloudflare Workers Free** account can be used by the owner to host a small authenticated HTTPS maintenance API. If there is no existing authenticated Cloudflare connection, identify exact missing permission/account action rather than guessing. **Do not create an externally accessible Worker or generate a Firebase service-account key at this stage.**
4. Perform SECURITY/PERFORMANCE REVIEW (read-only) of the planned design: Worker will verify signed Firebase JWT, allowlist verified Google admin UID/email, use a narrowly scoped server-only credential in Cloudflare Secrets, preserve old RTDB generations and CAS via REST ETags. Check feasibility of least-privilege IAM service identity (do not assign roles now), free-plan CPU/memory constraints and network quotas.
5. Verify that Firebase Spark live quotas and backup retention will tolerate the actual data size. Do not claim "0 cost forever"; list free-tier constraints and concrete unknowns.
6. Evaluate whether the existing local `parent-commit-service` can be safely adapted and whether protected worker read/write transactions require independent rules/authorization testing. Do NOT relax direct browser writes, and do not enable `parentCasService` in the public JS client.

## Output
Prepare one detailed GitHub checkpoint under ONLY `docs/20261112-maintenance-codex-readonly` in `source/docs/operations/MAINTENANCE_CODEX_PREFLIGHT_20261112.md`:
- exact target project/instance; live Rules fingerprint; presence of V2 active; dataset counts, freeze and backup evidence (no secrets or personal rows);
- Cloudflare account/Workers Free feasibility and exact missing setup steps;
- risk and permission findings; conservative go/no-go status for beginning production cutover;
- what ChatGPT implementation needs to align with the real Firebase configuration.
Open a separate DRAFT PR into integration, marked READ-ONLY EVIDENCE; do not merge anything.

## Prohibited
- No Firebase writes, no imported Excel, no deletes, no deploy to Firebase/Pages/Cloudflare.
- No billing enablement, no Cloud Functions, no production API secrets in GitHub/chat.
- No edits on feature worker branch, no PR159 merge or main merge.
- Do not ask the owner for raw service-account credential content; if a secret setup is needed later, instruct owner to enter it directly into Cloudflare's secret controls.

Execute this checkpoint autonomously up to the first permission/connection barrier and report exact blocker with evidence.
