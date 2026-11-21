# Test Matrix — initial HĐND proposal (review required)

| Changed scope | Local/PR candidate | Mandatory acceptance before production |
|---|---|---|
| Docs only | policy_lint, no heavy job | Existing protected checks unchanged |
| QA tool code | qa_tool_tests | Review any proposed CI wiring; no automatic bypass |
| `source/src/**` UI | frontend_fast + browser_qa | Chrome, print/layout, accessibility and Pages release gate |
| Excel import/format | excel_contract + frontend_fast | Original source workbook, formulas, aggregates, import contract |
| `source/src/data/**`, `source/shared/**`, Firebase | firebase_security + full_acceptance | Auth/RTDB isolated emulator, RBAC, lock/CAS, backup/restore where changed |
| Lockfiles/toolchain | full_acceptance | All impacted suites built with lockfile exact versions |
| `.github/workflows/**` and published assets | pages_preflight + full_acceptance | Preserve exact SHA release guards, deployment checks, rollback |
| Unknown path | full_acceptance | Owner must classify and update approved matrix |

*This matrix reflects source path categories only.* It does not yet prove that all transitive dependencies are covered. `source/src/app/**` and changes to auth permissions may need wider security checks; until explicitly audited, use full acceptance. Keep all existing security and release gates. Never claim `NOT_RUN` = success.
