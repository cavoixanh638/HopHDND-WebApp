#!/usr/bin/env python3
"""Conservative offline diff-to-suite selector. Never disables a required check."""
from __future__ import annotations
import argparse
from fnmatch import fnmatchcase
import json
from pathlib import Path
import subprocess
import sys


def matches(path: str, pattern: str) -> bool:
    if pattern.endswith("/**"):
        prefix = pattern[:-3]
        return path.startswith(prefix + "/")
    return fnmatchcase(path, pattern)


def select(paths: list[str], policy: dict) -> dict:
    if policy.get("version") != 1 or not isinstance(policy.get("rules"), list):
        raise ValueError("unsupported policy or missing rules")
    known = set(policy.get("suites", []))
    if not known or "policy_lint" not in known or "full_acceptance" not in known:
        raise ValueError("fail closed: missing universal suites")
    selected = {"policy_lint"}
    reasons = {"policy_lint": ["always run lightweight policy validation"]}
    classifications = {}
    for path in sorted(set(paths)):
        if not path or path.startswith("/") or ".." in path.split("/") or "\\" in path:
            raise ValueError(f"unsafe changed file path: {path!r}")
        hits = []
        for rule in policy["rules"]:
            if any(matches(path, pat) for pat in rule["patterns"]):
                hits.append(rule)
        if not hits:
            hits = [{"category": "unclassified-fail-closed", "suites": ["full_acceptance"]}]
        classifications[path] = [r["category"] for r in hits]
        for rule in hits:
            for suite in rule["suites"]:
                if suite not in known:
                    raise ValueError("undeclared suite in policy")
                selected.add(suite)
                reasons.setdefault(suite, []).append(path + " (" + rule["category"] + ")")
    return {"selected": sorted(selected), "not_selected": [{"suite": s, "status": "NOT_RUN", "reason": "not selected by change policy; NOT a required-check bypass"} for s in sorted(known - selected)], "reasons": reasons, "paths": classifications, "advisory_only": True}


def git_paths(base: str, head: str) -> list[str]:
    for ref in (base, head):
        if ref.startswith("-") or not ref:
            raise ValueError("unsafe git ref")
    data = subprocess.check_output(["git", "diff", "--name-only", "--no-renames", "-z", "--diff-filter=ACDMRT", base, head, "--"])
    return [x.decode("utf-8") for x in data.split(b"\x00") if x]


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--policy", required=True)
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--paths-file")
    group.add_argument("--base")
    p.add_argument("--head")
    args = p.parse_args(argv)
    try:
        policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
        if args.paths_file:
            paths = [p.strip() for p in Path(args.paths_file).read_text(encoding="utf-8").splitlines() if p.strip()]
        else:
            if not args.head:
                raise ValueError("--head required with --base")
            paths = git_paths(args.base, args.head)
        print(json.dumps(select(paths, policy), ensure_ascii=False, indent=2))
        return 0
    except (KeyError, ValueError, OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": str(exc), "decision": "FULL_ACCEPTANCE_MANUAL"}), file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
