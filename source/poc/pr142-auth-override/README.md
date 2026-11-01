# PR142 / isolated databaseAuthVariableOverride PoC

**Source SHA:** `98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847`. **Only local Auth+RTDB Emulators.** This is a Rules mechanism experiment, not an application patch and not a PR142 security PASS.

## Run (Codex machine with network/dependencies)

From a detached checkout of the exact SHA, overlay **only** this separate PoC folder from branch `poc/pr142-scoped-auth-override-98ead3e`, then:

```sh
cd source/poc/pr142-auth-override
npm install --no-audit --no-fund
npm run syntax
npm run poc
```

Node >=20, Java (Emulator compatible), ports 9000 and 9099. The command launches `firebase emulators:exec` with `demo-pr142-override` only; `poc.mjs` refuses to proceed without both exact localhost emulator environment variables and uses no production credentials.

## Test boundaries

The dedicated `database.poc.rules.json` uses real legacy/V2 **path shapes** but intentionally models only the `note` field, editor-membership grant, freeze mode and active generation. The real application's 157KB `database.exclusive-candidate.rules.json` is **untouched** and is **not** being tested here. The Auth Emulator creates A and B using two independent app instances with the SAME actual UID (password provider for the test), and C with a different UID. The PoC checks:

- `databaseAuthVariableOverride` with `auth.uid` from a verified real Auth Emulator ID token and server-only `auth.token.cellService=true` obeys RTDB Rules; A can ACQUIRE, RENEW, SAVE with truthful revision/audit, RELEASE.
- B reads public `proofHash` but only has that hash, not A's 32-byte secret: gateway SAVE/RENEW/RELEASE denied. Raw SDK `set` and authenticated REST PATCH with a forged header denied. A limited Admin app with `cellService=false` must also be denied.
- Different UID, withdrawn editor grant, FROZEN mode and switched active generation deny at the database commit, even if the gateway already read the valid proof. Concurrent differently scoped apps must not mix UID claims.

`witness.local.json` is created locally on execution; a FAIL exits nonzero. PASS here demonstrates **only this reduced Rules mechanism**, not Google/anonymous role parity, full audit/field logic, browser callable authentication, old-client migration, V2 privileged parent CAS behavior, loss-of-ACK or production readiness.

Do **not** change/disable `hdnd/datasetV2/.write` merely to guard individual cells: the real candidate has an admin-only conditional parent pointer CAS which must remain operational. Import Excel/initial bootstrap, V2 staging/replace/restore, permissions and freeze administration remain outside the cell PoC. Full candidate Rules must undergo separate raw leaf + parent bypass / initial activation / replacement / restore tests before any release.

## Authoring environment result

Static check `node --check poc.mjs` and JSON parsing passed. Actual Firebase Emulator was **not run** in the authoring environment: no Firebase packages/CLI installed, npm offline install fails `ENOTCACHED`, and terminal DNS for `registry.npmjs.org` and `github.com` is unavailable. Do not call any result an Emulator PASS until `npm run poc` succeeds and the generated witness is reviewed.

No application, existing Rules, existing tests, preview or production state changed.
