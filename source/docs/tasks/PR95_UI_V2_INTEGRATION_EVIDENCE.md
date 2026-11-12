# PR95 UI V2 — Final candidate provenance and acceptance gate
30 October 2026. Owner: L1 integrator. Fixed base `31c5117c6ec97a310c4214ea076328d3561f8d9b`.
- L1 filters/tests: PR111 `15ef9393715e8c5a8c00327a73ac9695b286c82d`.
- L2 muted CSS and strict RGB/browser oracles: PR114 `af808c296b7c02a4082bf64c32da7d389e1e8955`.
- L3 actual Firebase App permission controls: PR113 `d6685fd7ea6c09b1befd8db5a641334fe4a73476`.
- L4 full in-memory synthetic preview/Chrome/packager: PR112 `f107542959b248618a8cf26bef58514e5938255c`.
- L5 parity inventory only: PR115 `b3ac87a7925b1363f97b82cd813f0c4bf07319eb`.

Only overlap: `source/scripts/smoke-pages-browser.mjs`. Keep L1 DOM, Esc and STT changes **and all six L2 RGB/default-color patch hunks**. Avoid blindly overwriting one worker's runner.
L3 guest rights revalidation reviewed: original 3s fallback made overlapping refreshes and could receive stale responses from switched UID/generation. Integrated hardening: serialize requests, do not poll hidden pages, revalidate on visibility return, fence asynchronous rights responses by session UID and generation, reject stale completions and fail-closed on refresh errors. Retain the onValue subscription and frozen/lease/epoch guards. Dedicated real-App E2E on the combined build remains the acceptance oracle.

**Candidate acceptance:** require exact-HEAD source Verify, isolated staging, operational, network ACK-loss, two-admin actual Chrome, dedicated real-App rights grant→save→revoke, dedicated L4 full-preview HTTP+file Chrome. Only then fast-forward PR95 branch with the tested candidate SHA and permit the **already scoped** preview/pr95 Pages pipeline; no PR95→main merge, root app replace, Firebase production deploy, or cloud import.
**Public preview:** `https://cavoixanh638.github.io/HopHDND-WebApp/preview/pr95/` synthetic-only. The preview is NOT a live authorization or server write proof; true rights are exercised by isolated Emulator and Rules.
