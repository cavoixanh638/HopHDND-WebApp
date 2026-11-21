"""Offline regression tests: no remote CI, secrets, or network needed."""
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from checkpoint import assess_reuse, capture, validate_record, allowed_file
from select_tests import select, matches

POLICY = json.loads((ROOT / "tools/policy-hdnd.json").read_text(encoding="utf-8"))


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for f, value in {"app.py": "a = 1", "test_app.py": "assert True", "requirements.lock": "pkg==1.2", "config.ini": "mode=test"}.items():
            (self.root / f).write_text(value, encoding="utf-8")
        self.now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
        self.spec = {
            "schema_version": "1.0", "repository": "example/demo", "branch": "qa/test",
            "commit_sha": "a" * 40, "suite": "unit", "suite_version": "v1",
            "status": "PASS", "command": "python -m unittest", "safety_class": "normal",
            "deterministic": True, "external_dependencies": False, "coverage_approved": True,
            "environment": {"python": "3.13", "os": "Linux", "config": "offline"},
            "files": {"source": ["app.py"], "tests": ["test_app.py"], "dependencies": ["requirements.lock"],
                      "toolchain": [], "config": ["config.ini"], "fixtures": [], "security": []},
            "started_at": (self.now - dt.timedelta(seconds=4)).isoformat().replace("+00:00", "Z"),
            "finished_at": self.now.isoformat().replace("+00:00", "Z"),
            "evidence": ["local-test-run.log"]}
        self.record = capture(self.root, self.spec)

    def decision(self, **patch):
        current = copy.deepcopy(self.spec)
        current.update(patch)
        return assess_reuse(self.root, self.record, current, now=self.now + dt.timedelta(minutes=1))

    def test_capture_and_verify(self):
        validate_record(self.record)
        self.assertEqual(4, self.record["duration_seconds"])
        self.assertEqual(64, len(self.record["input_fingerprint"]))

    def test_no_duplicate_evidence_in_write_path(self):
        self.assertEqual(64, len(self.record["record_digest"]))

    def test_reuse_only_advisory(self):
        ok, reason = self.decision()
        self.assertTrue(ok)
        self.assertIn("CANDIDATE_REUSE", reason)

    def test_unrelated_file_not_break_scope(self):
        (self.root / "README.md").write_text("docs", encoding="utf-8")
        self.assertTrue(self.decision()[0])

    def test_source_changes_refuse(self):
        (self.root / "app.py").write_text("a = 2", encoding="utf-8")
        self.assertFalse(self.decision()[0])

    def test_test_code_changes_refuse(self):
        (self.root / "test_app.py").write_text("assert False", encoding="utf-8")
        self.assertFalse(self.decision()[0])

    def test_lockfile_changes_refuse(self):
        (self.root / "requirements.lock").write_text("pkg==1.3", encoding="utf-8")
        self.assertFalse(self.decision()[0])

    def test_config_changes_refuse(self):
        (self.root / "config.ini").write_text("mode=prod", encoding="utf-8")
        self.assertFalse(self.decision()[0])

    def test_environment_changes_refuse(self):
        cur = copy.deepcopy(self.spec)
        cur["environment"]["python"] = "3.14"
        self.assertFalse(self.decision(**cur)[0])

    def test_suite_version_changes_refuse(self):
        self.assertFalse(self.decision(suite_version="v2")[0])

    def test_scope_changes_refuse(self):
        cur = copy.deepcopy(self.spec)
        cur["files"]["source"].append("config.ini")
        self.assertFalse(self.decision(**cur)[0])

    def test_changed_commit_with_same_inputs_allowed_as_candidate(self):
        self.assertTrue(self.decision(commit_sha="b" * 40)[0])

    def test_fail_result_not_reused(self):
        bad = copy.deepcopy(self.spec)
        bad["status"] = "FAIL"
        record = capture(self.root, bad)
        self.assertFalse(assess_reuse(self.root, record, self.spec, now=self.now)[0])

    def test_high_risk_security_cannot_reuse(self):
        cur = copy.deepcopy(self.spec)
        cur["safety_class"] = "security"
        self.assertFalse(self.decision(**cur)[0])

    def test_external_dependencies_cannot_reuse(self):
        self.assertFalse(self.decision(external_dependencies=True)[0])

    def test_unapproved_coverage_cannot_reuse(self):
        self.assertFalse(self.decision(coverage_approved=False)[0])

    def test_ttl_refuse(self):
        self.assertFalse(assess_reuse(self.root, self.record, self.spec, now=self.now + dt.timedelta(days=8))[0])

    def test_future_timestamp_refuse(self):
        self.assertFalse(assess_reuse(self.root, self.record, self.spec, now=self.now - dt.timedelta(days=1))[0])

    def test_tamper_detected(self):
        rec = copy.deepcopy(self.record)
        rec["status"] = "FAIL"
        with self.assertRaisesRegex(ValueError, "modified"):
            validate_record(rec)

    def test_escape_denied(self):
        with self.assertRaises(ValueError):
            allowed_file(self.root, "../outside.txt")

    def test_symlink_escape_denied(self):
        secret = self.root.parent / (self.root.name + ".txt")
        secret.write_text("private", encoding="utf-8")
        self.addCleanup(lambda: secret.unlink(missing_ok=True))
        (self.root / "outside.txt").symlink_to(secret)
        with self.assertRaises(ValueError):
            allowed_file(self.root, "outside.txt")

    def test_invalid_sha_denied(self):
        bad = copy.deepcopy(self.spec)
        bad["commit_sha"] = "HEAD"
        with self.assertRaises(ValueError):
            capture(self.root, bad)

    def test_pass_needs_evidence(self):
        bad = copy.deepcopy(self.spec)
        bad["evidence"] = []
        with self.assertRaisesRegex(ValueError, "evidence"):
            capture(self.root, bad)

    def test_not_run_not_reused(self):
        bad = copy.deepcopy(self.spec)
        bad["status"] = "NOT_RUN"
        bad["evidence"] = []
        record = capture(self.root, bad)
        self.assertFalse(assess_reuse(self.root, record, self.spec, now=self.now)[0])


class SelectorTests(unittest.TestCase):
    def test_docs_only_skips_heavy_suites(self):
        res = select(["docs/qa/TEST_POLICY.md"], POLICY)
        self.assertEqual(["policy_lint"], res["selected"])
        self.assertTrue(res["advisory_only"])

    def test_tool_change_selects_tool_tests(self):
        self.assertEqual(["policy_lint", "qa_tool_tests"], select(["qa-standards/tools/checkpoint.py"], POLICY)["selected"])

    def test_ui_change(self):
        res = select(["source/src/components/Picker.tsx"], POLICY)
        self.assertIn("browser_qa", res["selected"])
        self.assertIn("frontend_fast", res["selected"])

    def test_security_path_forces_full(self):
        res = select(["source/src/data/firebase-client.ts"], POLICY)
        self.assertIn("firebase_security", res["selected"])
        self.assertIn("full_acceptance", res["selected"])

    def test_lockfile_forces_full(self):
        self.assertIn("full_acceptance", select(["source/package-lock.json"], POLICY)["selected"])

    def test_workflow_change_forces_full(self):
        self.assertIn("full_acceptance", select([".github/workflows/publish-pages.yml"], POLICY)["selected"])

    def test_unknown_forces_full(self):
        self.assertIn("full_acceptance", select(["unmapped/platform/new-service.rs"], POLICY)["selected"])

    def test_changes_from_multiple_scopes_union(self):
        res = select(["README.md", "source/src/data/realtime.ts", "source/src/components/Banner.tsx"], POLICY)
        self.assertIn("frontend_fast", res["selected"])
        self.assertIn("firebase_security", res["selected"])
        self.assertIn("full_acceptance", res["selected"])

    def test_no_changed_files_policy_only(self):
        self.assertEqual(["policy_lint"], select([], POLICY)["selected"])

    def test_escape_path_fail_closed(self):
        with self.assertRaises(ValueError):
            select(["../something"], POLICY)

    def test_bad_policy_fail_closed(self):
        with self.assertRaises(ValueError):
            select(["README.md"], {"version": 2, "suites": ["policy_lint"], "rules": []})

    def test_paths_matching_safe(self):
        self.assertTrue(matches("source/src/data/index.ts", "source/src/**"))
        self.assertFalse(matches("source/src2/index.ts", "source/src/**"))

    def test_not_selected_has_explicit_not_run(self):
        res = select(["README.md"], POLICY)
        self.assertTrue(all(x["status"] == "NOT_RUN" for x in res["not_selected"]))


if __name__ == "__main__":
    unittest.main()
