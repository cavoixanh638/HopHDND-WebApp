# HopHDND Worker maintenance API (STAGING, NO PRODUCTION ACTIVATION)

The owner's **one** daily-use site remains GitHub Pages. This Worker would be the
online *trusted* admin backend for downloading a server-sealed backup, staging
an immutable Excel/restore generation, clearing only active business rows, and
committing via Firebase Realtime Database ETag CAS. The WebApp remains on Spark
FREE; do not enable Blaze, Cloud Functions or a paid Cloudflare plan.

**Security posture**: both `ENABLE_READS` and `ENABLE_MUTATIONS` are `false` in
`wrangler.toml`. This repository change alone neither deploys the Worker nor
modifies production Firebase. Do not flip these gates until independent
Emulator + security review and an explicit release approval.

## API routes

- `GET /health` returns capabilities, no sensitive information.
- `GET /v1/archive` requires a Firebase ID token from the exact verified Google
  admin. It captures an 11/12-branch scope-limited HopHDND backup during FROZEN
  mode and signs it with a server-only HMAC secret. **Not** a full Firebase
  project backup: Auth users and published Security Rules are excluded.
- `POST /v1/prepare` for `clear`, `replace`, `restore`; creates immutable server
  candidate and backup at named paths, and returns exact confirmation phrase.
- `POST /v1/commit` checks the exact confirmation, 10-minute preparation,
  frozen epoch, current data/lease baseline and backup SHA before **conditional
  PUT** to `/hdnd` using Firebase's ETag. It does not delete whole root or
  historic generations. It creates a new empty generation for `clear`.
- `GET /v1/status?operationId=...` resolves unknown ACK without retry.

The service validates the RSA signature on Firebase ID tokens with Google's
public JWKS, project issuer/audience, verified email, Google provider and the
allowlisted admin UID. Destructive actions also require a recent Google login.
Browser CORS only allows the canonical GitHub Pages origin. Tokens are in
Authorization headers, never query strings. All production credentials must be
entered into Cloudflare Secret bindings, not source, GitHub secrets or the UI.

The worker uses a service-account OAuth token with **severely restricted IAM**.
That is a privileged external credential and bypasses Firebase RTDB Rules; an
independent review must validate Cloudflare account protection, API token scope,
revocation checks, credential rotation and 3-MB / 10-ms free-tier bounds.

## Critical outstanding gates

1. Codex read-only audit of live Firebase project/Rules, archived/active data,
   exact admin UID, and whether the user has Cloudflare Workers Free access.
2. Emulator-backed test of whole-`hdnd` ETag CAS under simultaneous sessions,
   freeze + zero-row pointer, unknown ACK, restore-file tampering, and 59/885
   independent readback. The webapp validators and candidate Rules must allow
   `rowCount:0` before an empty generation may go live.
3. HTML UI must authenticate/re-authenticate, review Excel preview and backup,
   require second confirmation and call this API only on a RELEASE-APPROVED
   public endpoint. The old local operator is retained until this is ready.
4. Deployment requires one-time explicit approval and secret provisioning by
   an authorized operator; no credential key pasted into ChatGPT or GitHub.
5. The free plan has 10ms CPU/request and 128MB; stage/commit with a large
   V2 history may exceed this. Measure 59 rows and later 1,000 rows; if free
   limits cannot be met, fail closed and revisit hosting, never incur paid
   usage without approval.

`node --test maintenance-worker/test/*.test.mjs` runs offline pure tests, with
fake OAuth/JWKS and in-memory ETag Firebase REST (no external calls).
