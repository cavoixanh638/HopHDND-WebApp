# Action cost baseline — 2026-11-21 snapshot, NOT billing export

## Source and method

GitHub repository metadata and Actions Runs API at time of audit. API `total_count` is across all retained history, not just November. For sampled last 100 runs, wall-clock minutes = sum(`updated_at - run_started_at`) of **completed runs only** / 60; overlaps are added, and this number is NOT official billable runner minutes, not rounded GitHub minutes, and not Gross/Discount/Net.

| Repository | Lifetime runs seen (moving) | Sampling | Approx. completed-run wall minutes in sample |
|---|---:|---|---:|
| HopHDND-WebApp | 12,807 | 100 latest | ~120.6 (includes hosted Pages dynamic runs) |
| kho-tri-thuc | 278 | 100 latest | ~324.0 |
| Bien-ban-hop | 265 | 100 latest | ~102.5 |
| flutter-lm-app-master | 29 | all 29 | ~92.9 |
| KTXD-report | 32 | all 32 | ~36.2 |

Numbers vary as new workflows execute. Sampled wall minutes are indicative only; job-based billed minutes, running multipliers, discounts and credits need real billing export. Never add these values to billing net amount.

User-provided historic billing context (not independently verified in this audit): HopHDND November 01–21 had about 6,963 workflows and 10,127 billable-equivalent minutes, Gross USD 61.66 and Net USD 0 after discount; Actions budget USD 0 and "Usage blocked". Those numbers must not be presented as today's billing balance.

## Baseline duplication candidates

HĐND `main` has 14 workflow YAML files. Across their text: `npm ci` occurs 26 times, `npm run typecheck` 9, `npm run build:spark` 9, `npm run test:spark` 6. Twelve workflows contain `pull_request` triggers, eight lack path-based exclusions and target `main`. These are command occurrences and potential duplication, **not** proof of redundant functional coverage or estimated savings.

Specific risks: source verification has broad heavy browser+Firebase+build steps; Firebase operational QA runs on certain main pushes/PRs; Pages publish has sensitive SHA production gate and must remain protected. `kho-tri-thuc` smoke does full Docker/DB/migration/restore per PR; Flutter signed APK builds on every main push (until a reviewed change is merged).

**Measured before/after savings:** NOT_AVAILABLE. Collect comparable PR cohorts, official billing CSV and per-job execution durations after integration. Report avoided job count and minutes actually observed, and regression detection coverage, not a hypothetical percentage.
