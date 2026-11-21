# CI Standards — bootstrap v0.1 (21/11/2026)

**Portable local-first QA toolkit** for `cavoixanh638`; the GitHub repository `ci-standards` does **not** exist yet. This folder is a bootstrap package, not a live shared CI service and not a production gate.

## Execute offline

```bash
python -m unittest discover -s tests -v
printf 'docs/qa/TEST_POLICY.md\n' > /tmp/changed.txt
python tools/select_tests.py --policy tools/policy-hdnd.json --paths-file /tmp/changed.txt
python tools/checkpoint.py --help
```

Copy `templates/checkpoint-input.example.json` to your own manifest, replace all placeholders with the actual repository/commit/environment/inputs/test command and evidence, then:

```bash
python tools/checkpoint.py capture --repo-root /path/to/repo --manifest manifest.json --out checkpoint-UNIQUE-ID.json
python tools/checkpoint.py validate --record checkpoint-UNIQUE-ID.json
python tools/checkpoint.py assess --repo-root /path/to/repo --record checkpoint-UNIQUE-ID.json --current current-manifest.json
```

`assess` reports **CANDIDATE_REUSE**, *never PASS for a new commit*. Do not use this tool to skip GitHub required checks. It is an offline helper only. A record checksum detects accidental changes, **not** intentional forgery; only accept records from trusted authors and Git refs. Every input in scope must be explicitly listed, including test code, lockfiles, toolchain, config, fixtures, permissions/security files, and relevant data; incomplete manifests are ineligible for automatic gating. The sample has `coverage_approved=false` for safety.

## Layout

- `tools/checkpoint.py`: build/validate/check candidate reuse of immutable JSON checkpoint
- `tools/checkpoint.schema.json`: versioned JSON Schema 2020-12
- `tools/select_tests.py`: fail-closed path selector, including delete/rename-aware git diff
- `tools/policy-hdnd.json`: **advisory draft**, to be reviewed against real dependency graph
- `tests/test_qa.py`: deterministic local tests, no network
- `templates/reusable-qa.yml.txt`: inactive workflow template, not a deployed Action
- `docs/qa/*`: QA policy, matrix, audit, onboarding and cost caveats

## Rollout

1. Stage the toolkit at `qa-standards/` in the HĐND repo in an isolated branch; do **not** alter existing release workflows in this PoC.
2. Owner reviews sample matrix, required checks and the data/security change graph. Coverage approval is **not** automatic.
3. Once a real central `ci-standards` repository is created, move this folder there, pin a reviewed workflow ref and require code owners. Do not point private repositories at mutable unreviewed third-party workflows.
4. Apply lightweight AGENTS/QA docs to each repo; upgrade CI only after measuring baseline and validating required checks.

## Prohibited shortcuts

Do not confuse GitHub workflow `skipped` with a test PASS, wall time with billed minutes, a green build with deployment, or a self-declared checkpoint with trusted attestations. Do not push secrets, disable security gates, merge, deploy, change billing, or enable paid runners.
