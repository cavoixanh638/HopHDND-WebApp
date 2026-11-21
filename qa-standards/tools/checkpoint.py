#!/usr/bin/env python3
"""Offline QA checkpoint recorder and conservative equivalence assessor.

No network calls, GitHub API calls, cache mutation, or CI/deploy actions.
A candidate reuse decision MUST NOT replace a protected or required check.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys

SCHEMA = "1.0"
ROLES = ("source", "tests", "dependencies", "toolchain", "config", "fixtures", "security")
STATUSES = {"PASS", "FAIL", "SKIPPED", "NOT_RUN"}
HIGH_RISK = {"security", "release", "external", "data_integrity", "race", "realtime", "integration"}
SHA = re.compile(r"^[a-f0-9]{40}$")
SUITE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canon(obj: object) -> bytes:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def timestamp(value: str) -> dt.datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("timestamps must be UTC ISO 8601 ending in Z")
    instant = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if instant.tzinfo is None:
        raise ValueError("timestamp must include timezone")
    return instant


def allowed_file(root: Path, path: str) -> Path:
    if not isinstance(path, str) or not path or "\\" in path:
        raise ValueError(f"invalid POSIX relative path: {path!r}")
    posix = PurePosixPath(path)
    if posix.is_absolute() or any(p in (".", "..") for p in path.split("/")):
        raise ValueError(f"file escapes repository: {path!r}")
    root = root.resolve()
    target = root.joinpath(*posix.parts).resolve(strict=True)
    if not target.is_relative_to(root) or not target.is_file():
        raise ValueError(f"not a regular file inside repository: {path!r}")
    return target


def validate_spec(spec: dict) -> None:
    if not isinstance(spec, dict):
        raise ValueError("manifest must be an object")
    for key in ("repository", "branch", "suite_version", "command"):
        if not isinstance(spec.get(key), str) or not spec[key].strip():
            raise ValueError(f"required string missing: {key}")
    if spec.get("schema_version") != SCHEMA:
        raise ValueError("unknown schema version")
    if not isinstance(spec.get("suite"), str) or not SUITE.fullmatch(spec["suite"]):
        raise ValueError("invalid suite identifier")
    if not SHA.fullmatch(str(spec.get("commit_sha", ""))):
        raise ValueError("invalid exact commit SHA")
    if spec.get("status") not in STATUSES:
        raise ValueError("invalid status")
    if spec.get("safety_class") not in (HIGH_RISK | {"normal"}):
        raise ValueError("invalid safety class")
    for key in ("deterministic", "external_dependencies", "coverage_approved"):
        if not isinstance(spec.get(key), bool):
            raise ValueError(f"required boolean missing: {key}")
    if not isinstance(spec.get("environment"), dict) or not spec["environment"]:
        raise ValueError("missing environment fingerprint components")
    for k, v in spec["environment"].items():
        if not isinstance(k, str) or not isinstance(v, str) or not v.strip():
            raise ValueError("environment must be nonempty string pairs, never secrets")
    files = spec.get("files")
    if not isinstance(files, dict) or set(files) != set(ROLES):
        raise ValueError("files must enumerate every input role, even empty roles")
    if not files["source"] or not files["tests"]:
        raise ValueError("source and tests inputs are mandatory")
    for role, paths in files.items():
        if not isinstance(paths, list) or len(paths) != len(set(paths)):
            raise ValueError(f"bad or duplicate files: {role}")
        if any(not isinstance(path, str) for path in paths):
            raise ValueError("input paths must be strings")
    a, b = timestamp(spec.get("started_at")), timestamp(spec.get("finished_at"))
    if b < a:
        raise ValueError("finished_at precedes started_at")
    if not isinstance(spec.get("evidence"), list) or any(not isinstance(x, str) or not x.strip() for x in spec["evidence"]):
        raise ValueError("evidence must be a list of references")
    if spec["status"] == "PASS" and not spec["evidence"]:
        raise ValueError("PASS requires a genuine evidence reference")


def inputs(root: Path, spec: dict) -> dict:
    file_hashes = {role: {p: digest(allowed_file(root, p).read_bytes()) for p in sorted(spec["files"][role])} for role in ROLES}
    return {"files": file_hashes, "environment": spec["environment"]}


def capture(root: Path, spec: dict) -> dict:
    validate_spec(spec)
    inp = inputs(root, spec)
    base = dict(spec)
    base["input_fingerprint"] = digest(canon(inp))
    base["input_hashes"] = inp
    base["duration_seconds"] = round((timestamp(spec["finished_at"]) - timestamp(spec["started_at"])).total_seconds(), 3)
    base["record_digest"] = digest(canon(base))
    return base


def validate_record(rec: dict) -> None:
    if not isinstance(rec, dict):
        raise ValueError("record must be object")
    shadow = dict(rec)
    checksum = shadow.pop("record_digest", None)
    if checksum != digest(canon(shadow)):
        raise ValueError("record contents modified or checksum missing")
    validate_spec(rec)
    if not isinstance(rec.get("input_hashes"), dict) or rec.get("input_fingerprint") != digest(canon(rec["input_hashes"])):
        raise ValueError("fingerprint mismatch")
    if rec["input_hashes"].get("environment") != rec["environment"]:
        raise ValueError("environment fingerprint mismatch")
    for role in ROLES:
        if set(rec["input_hashes"].get("files", {}).get(role, {})) != set(rec["files"][role]):
            raise ValueError(f"input hash role missing files: {role}")
    expected = round((timestamp(rec["finished_at"]) - timestamp(rec["started_at"])).total_seconds(), 3)
    if rec.get("duration_seconds") != expected:
        raise ValueError("duration mismatch")


def assess_reuse(root: Path, rec: dict, current: dict, max_age_days: int = 7, now: dt.datetime | None = None) -> tuple[bool, str]:
    """Advisory only; no protected checks may be skipped based on this verdict."""
    validate_record(rec)
    validate_spec(current)
    if rec["status"] != "PASS":
        return False, "previous result not PASS"
    if rec["safety_class"] in HIGH_RISK or current["safety_class"] in HIGH_RISK:
        return False, "high-risk suite always requires fresh acceptance"
    if any(not rec[k] or not current[k] for k in ("deterministic", "coverage_approved")):
        return False, "scope/determinism not approved"
    if rec["external_dependencies"] or current["external_dependencies"]:
        return False, "external dependencies can drift"
    for key in ("repository", "suite", "suite_version", "safety_class", "command"):
        if current[key] != rec[key]:
            return False, f"{key} changed"
    if rec["environment"] != current["environment"] or rec["files"] != current["files"]:
        return False, "environment or declared input scope changed"
    if max_age_days < 0:
        raise ValueError("max age must not be negative")
    now = now or dt.datetime.now(dt.timezone.utc)
    age = now - timestamp(rec["finished_at"])
    if age < dt.timedelta(0) or age > dt.timedelta(days=max_age_days):
        return False, "checkpoint outside TTL"
    if digest(canon(inputs(root, current))) != rec["input_fingerprint"]:
        return False, "file/dependency/test/toolchain/config fingerprint changed"
    return True, "CANDIDATE_REUSE only; required checks still run as configured"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    c = sub.add_parser("capture")
    c.add_argument("--manifest", required=True)
    c.add_argument("--repo-root", default=".")
    c.add_argument("--out", required=True)
    v = sub.add_parser("validate")
    v.add_argument("--record", required=True)
    r = sub.add_parser("assess")
    r.add_argument("--record", required=True)
    r.add_argument("--current", required=True)
    r.add_argument("--repo-root", default=".")
    r.add_argument("--max-age-days", type=int, default=7)
    args = parser.parse_args(argv)
    try:
        if args.action == "capture":
            rec = capture(Path(args.repo_root), json.loads(Path(args.manifest).read_text(encoding="utf-8")))
            out = Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            if out.exists():
                raise ValueError("refuse to overwrite immutable checkpoint")
            out.write_text(json.dumps(rec, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps({"result": "RECORDED", "record_digest": rec["record_digest"], "duration_seconds": rec["duration_seconds"]}))
        elif args.action == "validate":
            validate_record(json.loads(Path(args.record).read_text(encoding="utf-8")))
            print('{"result":"VALID_RECORD_NOT_ATTESTED"}')
        else:
            rec = json.loads(Path(args.record).read_text(encoding="utf-8"))
            cur = json.loads(Path(args.current).read_text(encoding="utf-8"))
            ok, why = assess_reuse(Path(args.repo_root), rec, cur, args.max_age_days)
            print(json.dumps({"result": "CANDIDATE_REUSE" if ok else "MUST_RUN", "reason": why}))
            return 0 if ok else 2
    except (ValueError, KeyError, OSError, TypeError, json.JSONDecodeError) as exc:
        print(json.dumps({"result": "INVALID", "reason": str(exc)}), file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
