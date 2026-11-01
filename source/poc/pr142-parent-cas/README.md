# PR #142 / CHAT 2 — isolated V2 parent-CAS PoC

## Scope and baseline

Pinned candidate: `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`. This directory is **independent of the Chat1 cell gateway** and PR143 freeze work. The full candidate Rules file under `source/firebase/database.exclusive-candidate.rules.json` is NEVER modified. `build-trial-rules.mjs` copies the **full** Rules and changes exactly one `.write` expression in its private output: `hdnd/datasetV2/.write` additionally requires `auth.token.parentCasService === true` for **all** parent transactions. Child Rules, leaf editing, bootstrap and stage/write permissions are untouched.

This deliberately does **not** claim that RTDB Rules can SHA256 a candidate stored as a JSON string: they cannot. The `parent-contract.mjs` is a **server-side internal** invariant check against the complete parent root **inside the transaction callback**, and `trusted-parent-replace.mjs` demonstrates a narrow trusted replacement transaction that builds the new generation from the server-read, independently manifest-verified candidate; it cannot accept a caller-supplied `next` tree. A production service must independently verify Firebase Auth and use a secure scoped Rules credential. This PoC **does not** implement or certify such a credential/production service. The synthetic `parentCasService` claim in Emulator Rules Unit Testing is *not* a Google-authenticated production credential.

## Threat boundaries

Two observed baseline cases in [Codex handoff #6552621089](https://github.com/cavoixanh638/HopHDND-WebApp/pull/142#issuecomment-6552621089): `existing_lease_expire` COMMITTED (old lease `expiresAt -> 0`), and `new_generation_tamper` COMMITTED with `note=TAMPERED_BUT_MANIFEST_UNCHANGED`. The original 7 PASS / 2 FAIL belongs to Codex, not this PoC.

- Ordinary admin client (even with valid Google admin synthetic claims) must **not** be able to execute parent-CAS directly in the trial. A server-only scoped authorization is needed.
- The separate **leaf** same-owner RELEASE control is deliberate: if the current Rules permit it, parent authorization is not the unique cause. Foreign-UID lease leaf RELEASE is an explicit negative control.
- The server-side parent contract verifies ALL existing generation branches, lease branches, backup/candidate/other root metadata, grants, previous op log, the single new generation, staged rows (including business values), actor provenance, and manifest digest / rowCount. No secret or row/lease of old generation may be bundled with pointer-switch.
- The existing stage path keeps immutable candidate JSON; its manifest can be validated independently with `verifyCandidateServerReadback` (SHA256). The trusted coordinator checks staging and backup **again inside the transaction** to avoid TOCTOU. No client can submit arbitrary row/lease mutations to the service API.
- Approved bootstrap remains an ordinary admin `hdnd/items` empty-root transaction. `prepareInitialDatasetActivation` / `stageDatasetReplacement` remain ordinary admin staging. In Emulator controls only, the original source `commitInitialDatasetActivation`, `commitDatasetReplacement`, `restoreDatasetBackup` receive a **synthetic service-claim RTDB context** to demonstrate their business transactions survive the trial fence. This is NOT a working production gateway and source callsites must be routed to a reviewed backend before integration.

## Setup and run (Codex local, Auth+RTDB Emulator, demo only)

```bash
# On the isolated PoC branch created from PR142 baseline:
cd HopHDND-WebApp/source
npm ci
bash poc/pr142-parent-cas/run.sh "$PWD" /tmp/pr142-parent-cas-evidence
```

Requires Node (Codex used 24), Java 21, Firebase CLI and Vitest installed with `npm ci`. The script requires an ancestor of exact SHA, generates a **private full-Rules** baseline and trial, checks the 9 Node-only contract tests, and runs two separate fresh Emulator executions on `127.0.0.1:9000` (RTDB), `127.0.0.1:9099` (Auth), namespace `demo-pr142-parent-cas`.

It writes `baseline.witness.json`, `trial.witness.json`, per-mode stdout, the Rules manifest, and `SHA256SUMS` to the chosen evidence directory. An owner REST GET to localhost captures authoritative server **before/after**. The seed `withSecurityRulesDisabled` is fixture-only; every attack and positive transaction uses a `Rules Unit Testing authenticatedContext`, and all outcomes record whether Rules actually rejected it or a local abort occurred. Witnesses redact `token`, `session`, `editProofs`, candidate/backup payload strings; no production account is used.

## Matrix and hard limits

| Case | Baseline expected from Codex | Trial acceptance |
|---|---|---|
| Source API legacy bootstrap | COMMITTED | COMMITTED (ordinary admin) |
| Source API initial activation / replacement / restore / resolve | COMMITTED | COMMITTED (simulated server-scoped claim; **not** production client) |
| Pointer only | COMMITTED | COMMITTED with synthetic service claim; ordinary browser DENIED |
| Same-UID legitimate leaf RELEASE | Determine from actual leaf Rules | Keep factual leaf result; do not call parent-specific bypass |
| Foreign UID/session lease RELEASE through leaf | DENIED | DENIED with unchanged server |
| Parent + old lease expire | COMMITTED (security FAIL) | Ordinary admin DENIED; server unchanged |
| Parent + new generation note tamper | COMMITTED (security FAIL) | Ordinary admin DENIED; server unchanged |
| Trusted coordinator with forged old lease/new note | Not present | Pure contract DENIED without sending request; not a Rules denial |
| Trusted coordinator approved replacement | Not present | Transaction COMMITTED with staged data; before/after match |

**Important:** The trial Rule only *routes* parent transactions to a future trusted coordinator. If that coordinator is implemented carelessly, a service-scoped request can still bundle malicious data; the parent contract is therefore a required part of the final commit path, not an optional post-readcheck. The service must bind `auth.uid/verified admin` and receipt per request; never mint `parentCasService` as a browser Firebase custom claim. The trial cannot establish the viability of `databaseAuthVariableOverride` or a deployed Functions callable. The default backend and all candidate Rules stay unchanged. No PR142/PR143 merge, publish or deploy.

## Current evidence

- **Executed in authoring environment:** `node --test contract-smoke.test.mjs`: **9/9 PASS**; source code `node --check` PASS. This proves only the local deterministic contract logic.
- **NOT RUN HERE:** full Auth+RTDB Emulator suite: environment lacks project node_modules / Firebase CLI and cannot resolve github.com. Codex must run local and attach stdout + before/after witness. Do not relabel code-level controls as Emulator PASS.
- Retain original Codex baseline witness [comment #6552621089](https://github.com/cavoixanh638/HopHDND-WebApp/pull/142#issuecomment-6552621089) as baseline; the supplied test intentionally replays baseline and trial in **separate namespaces/run outputs** for future verification, not to re-prove older results today.
