import sys
import unittest
from pathlib import Path

# build_and_release imports its sibling promote_changelog as a top-level module
sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_and_release  # noqa: E402
from build_and_release import restart_step_after_reset, steps_completed_before  # noqa: E402

BEFORE_NATIVE = [
    "load_tokens",
    "check_preconditions",
    "promote_changelog",
    "set_release_version",
    "maven_precheck",
    "generate_changelog",
    "generate_wrapper_hashes",
    "commit_maven_versions",
    "build_core_jar",
    "verify_generic_version",
]


class RestartAfterResetTest(unittest.TestCase):
    def test_should_restart_at_promote_changelog_when_reset_reverted_release_version(self):
        restart = restart_step_after_reset(BEFORE_NATIVE, "build_native_executables", ["pom.xml", "core/pom.xml"])
        self.assertEqual(restart, "promote_changelog")

    def test_should_restart_at_failed_step_when_nothing_was_reset(self):
        restart = restart_step_after_reset(BEFORE_NATIVE, "build_native_executables", [])
        self.assertEqual(restart, "build_native_executables")

    def test_should_restart_at_failed_step_after_release_commit(self):
        completed = BEFORE_NATIVE + ["build_native_executables", "build_release_packages", "git_commit", "git_tag",
                                     "git_push", "github_release", "discord_publish", "set_snapshot_version"]
        restart = restart_step_after_reset(completed, "commit_snapshot_versions", ["pom.xml"])
        self.assertEqual(restart, "commit_snapshot_versions")

    def test_should_keep_only_steps_before_restart_step(self):
        self.assertEqual(steps_completed_before(BEFORE_NATIVE, "promote_changelog"),
                         ["load_tokens", "check_preconditions"])

    def test_step_names_match_script(self):
        names = [s.name for s in build_and_release.STEPS]
        for step in BEFORE_NATIVE + ["build_native_executables", "git_commit", "commit_snapshot_versions"]:
            self.assertIn(step, names)


if __name__ == "__main__":
    unittest.main()
