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
Before ANY privileged Firebase data access, the server also checks the admin
user's disabled/revoked status via Identity Toolkit's read-only
`accounts:lookup` (`firebaseauth.users.get` IAM permission plus the
`identitytoolkit` OAuth scope). Failure of this independent check denies access.
Browser CORS only allows the canonical GitHub Pages origin. Tokens are in
Authorization headers, never query strings. All production credentials must be
entered into Cloudflare Secret bindings, not source, GitHub secrets or the UI.

The worker uses a service-account OAuth token with **severely restricted IAM**.
That is a privileged external credential and bypasses Firebase RTDB Rules; an
independent review must validate Cloudflare account protection, API token scope,
revocation checks, credential rotation and 3-MB / 10-ms free-tier bounds.

## Independent backup before destructive operations (added 12 Nov)

Every `/v1/prepare` now **fails closed** unless a private, independent object
store is configured as the Worker binding `MAINTENANCE_ARCHIVE_BUCKET`.
Before any RTDB staging write the Worker exports a server-signed app-scoped
snapshot, persists it to an external content-addressed archive object, and
reads the exact bytes back. `/v1/commit` retrieves that object again, verifies
the digest and server HMAC, project/instance and expected active generation;
missing, corrupted or altered objects block all mutations.

**This is not activated by this code change.** A Cloudflare R2 binding is a
possible adapter, but R2 requires separate signup/subscription and may incur
fees; it is **not** automatically approved by the user's Spark/no-billing
requirement. Other permitted private object stores need an equivalent
`get(key)/put(key,value)` adapter with independent retention protection.
No in-database copy alone is accepted as the independent backup.

Before enabling this: choose/approve a private store, configure encrypted
versioning and delete/overwrite protection outside the Worker, test retention
and recovery using synthetic data, provision a scoped Worker bucket binding,
verify budget/no-unapproved-billing requirements, and test production-like
performance on the permitted free tier. Neither this backup nor the existing
11/12 app-path backup contains full Firebase Auth users, published Rules,
unknown root branches or all configuration; full disaster-recovery snapshot
and an independent recovery drill are separate gates.

## Critical outstanding gates

1. Codex read-only audit of live Firebase project/Rules, archived/active data,
   exact admin UID, and whether the user has Cloudflare Workers Free access.
2. Emulator-backed test of whole-`hdnd` ETag CAS under simultaneous sessions,
   freeze + zero-row pointer, unknown ACK, restore-file tampering, and 59/885
   independent readback. The webapp validators and candidate Rules must allow
   `rowCount:0` before an empty generation may go live.
3. HTML UI is now connected in source: verified Google admin reauthentication,
   Excel/backup preview, staged confirmation and status lookup. All API actions
   are DISABLED until a release-approved HTTPS Worker URL is configured and
   the server's separate READ/WRITE gates pass. The old local operator remains
   in place until end-to-end Emulator and independent production review pass.
4. Deployment requires one-time explicit approval and secret provisioning by
   an authorized operator; no credential key pasted into ChatGPT or GitHub.
5. The free plan has 10ms CPU/request and 128MB; stage/commit with a large
   V2 history may exceed this. Measure 59 rows and later 1,000 rows; if free
   limits cannot be met, fail closed and revisit hosting, never incur paid
   usage without approval.

`node --test maintenance-worker/test/*.test.mjs` runs offline pure tests, with
fake OAuth/JWKS/Identity Toolkit and in-memory ETag Firebase REST (no external
calls). There is also a 59-row × 15 A–O synthetic end-to-end scenario,
which is **NOT evidence that the real 59-row production workbook was imported**.
Release remains HOLD until real Firebase/Auth/Rules and Worker free-tier latency
are verified by an independently authorized operator.
