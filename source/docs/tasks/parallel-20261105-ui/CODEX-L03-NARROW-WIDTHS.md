# L03 compact width correction — 06/11/2026

User reported excessive blank space even at previous minimum settings.

- Previous lower bounds: readonly 360 px, editable 500 px. Internal rails fixed to label 138 px, level 90 px, progress 238 px.
- Candidate code/test SHA: `6ba94766ec40f0466c8f91b902e6cf16cdf22e25`.
- Changes: lower bounds 180/260 px; label shrinks with whole-group budget, level 70 px, progress fits remaining budget capped at 238 px. Controls remain aligned/equal width and multiline values remain visible.
- Local TypeScript PASS, width persistence/boundary suite 7/7 PASS, compact demo build PASS before final wrapper sizing correction.
- [Exact SHA CI #42237671108](https://github.com/cavoixanh638/HopHDND-WebApp/actions/runs/42237671108) PENDING. Includes six newly added narrow-browser cases (180/260/320 readonly; 260/340/420 editable), existing list/popup 1440/900/390 glyph tests, full app and DATA Emulator.
- First run #42237208631 failed one implementation-string assertion requiring old 90px/238px fixed widths (896 other tests PASS); expected responsive contract updated. Do not claim final PASS until browser + all required jobs succeed.
- Public demo still version 2, source 91c2dd4. New correction NOT DEPLOYED yet.
- Only coordination branch modified. No main merge, Firebase production writes/deploy or live migration.
