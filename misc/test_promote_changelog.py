import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import promote_changelog as promoter

CHANGELOG_HEADER = """#@formatter:off
# These are for the user and should not be too technical and focus on what changes for them.
"""

EXISTING_CHANGELOG = (
    CHANGELOG_HEADER
    + """-   version: "v9.0.3"
    date: "2026-09-21"
    final: true
    changes:
      -   type: "fix"
          text: "Restore quality indicators."
"""
)

UNRELEASED_NOTES = """#@formatter:off
# Release notes for the next release.

-   type: "fix"
    text: "Searching no longer takes forever. See #1234"
-   type: "feature"
    text: "Added a button."
"""


class ParseUnreleasedTest(unittest.TestCase):

    def test_should_parse_entries_ignoring_comments_and_blank_lines(self):
        entries = promoter.parse_unreleased(UNRELEASED_NOTES)

        self.assertEqual(
            [
                promoter.ChangeEntry("fix", "Searching no longer takes forever. See #1234"),
                promoter.ChangeEntry("feature", "Added a button."),
            ],
            entries,
        )

    def test_should_accept_entries_without_extra_dash_indentation(self):
        entries = promoter.parse_unreleased('- type: "note"\n  text: "Hello."\n')

        self.assertEqual([promoter.ChangeEntry("note", "Hello.")], entries)

    def test_should_return_nothing_for_the_empty_template(self):
        self.assertEqual([], promoter.parse_unreleased(promoter.UNRELEASED_TEMPLATE))

    def test_should_reject_unknown_type(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "type 'bugfix' must be one of"):
            promoter.parse_unreleased('-   type: "bugfix"\n    text: "Nope."\n')

    def test_should_reject_entry_without_text(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "Line 1: entry has no text"):
            promoter.parse_unreleased('-   type: "fix"\n')

    def test_should_reject_text_without_type(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "Line 1: text without a preceding type"):
            promoter.parse_unreleased('    text: "Orphan."\n')

    def test_should_reject_empty_text(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "Line 2: text is empty"):
            promoter.parse_unreleased('-   type: "fix"\n    text: ""\n')

    def test_should_reject_unexpected_line_with_its_number(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "Line 3: expected"):
            promoter.parse_unreleased('-   type: "fix"\n    text: "Fine."\n    date: "2026-09-22"\n')


class NormalizeVersionTest(unittest.TestCase):

    def test_should_add_the_v_prefix(self):
        self.assertEqual("v9.0.4", promoter.normalize_version("9.0.4"))

    def test_should_keep_an_existing_v_prefix(self):
        self.assertEqual("v9.0.4", promoter.normalize_version("v9.0.4"))

    def test_should_reject_a_non_semantic_version(self):
        with self.assertRaisesRegex(promoter.ChangelogError, "not of the form"):
            promoter.normalize_version("Unreleased")


class RenderVersionBlockTest(unittest.TestCase):

    def test_should_render_in_the_style_of_the_changelog(self):
        block = promoter.render_version_block(
            "v9.0.4", "2026-09-22", True, [promoter.ChangeEntry("fix", "Fixed it.")]
        )

        self.assertEqual(
            '-   version: "v9.0.4"\n'
            '    date: "2026-09-22"\n'
            "    final: true\n"
            "    changes:\n"
            '      -   type: "fix"\n'
            '          text: "Fixed it."\n',
            block,
        )

    def test_should_mark_a_beta_as_not_final(self):
        block = promoter.render_version_block("v9.0.4", "2026-09-22", False, [])

        self.assertIn("final: false", block)


class SpliceTest(unittest.TestCase):

    def test_should_insert_below_the_header_comments_without_touching_existing_entries(self):
        result = promoter.splice_into_changelog(EXISTING_CHANGELOG, '-   version: "v9.0.4"\n')

        self.assertEqual(
            CHANGELOG_HEADER + '-   version: "v9.0.4"\n' + EXISTING_CHANGELOG[len(CHANGELOG_HEADER):],
            result,
        )

    def test_should_find_an_existing_version_block(self):
        self.assertIsNotNone(promoter.find_version_block(EXISTING_CHANGELOG, "v9.0.3"))
        self.assertIsNone(promoter.find_version_block(EXISTING_CHANGELOG, "v9.0.4"))


class PromoteTest(unittest.TestCase):

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.changelog = Path(self.directory.name) / "changelog.yaml"
        self.unreleased = Path(self.directory.name) / "changelog-unreleased.yaml"
        self.changelog.write_text(EXISTING_CHANGELOG, encoding="utf-8")
        self.unreleased.write_text(UNRELEASED_NOTES, encoding="utf-8")

    def promote(self, **kwargs):
        return promoter.promote(
            kwargs.pop("version", "9.0.4"),
            changelog_file=self.changelog,
            unreleased_file=self.unreleased,
            date=kwargs.pop("date", "2026-09-22"),
            **kwargs,
        )

    def test_should_move_the_notes_into_the_changelog_and_empty_the_unreleased_file(self):
        block = self.promote()

        changelog = self.changelog.read_text(encoding="utf-8")
        self.assertEqual(CHANGELOG_HEADER + block + EXISTING_CHANGELOG[len(CHANGELOG_HEADER):], changelog)
        self.assertIn('-   version: "v9.0.4"', block)
        self.assertIn('    date: "2026-09-22"', block)
        self.assertIn("    final: true", block)
        self.assertIn("Searching no longer takes forever. See #1234", block)
        self.assertEqual(promoter.UNRELEASED_TEMPLATE, self.unreleased.read_text(encoding="utf-8"))

    def test_should_keep_the_previous_entries_untouched(self):
        self.promote()

        self.assertIn('-   version: "v9.0.3"', self.changelog.read_text(encoding="utf-8"))
        self.assertIn("Restore quality indicators.", self.changelog.read_text(encoding="utf-8"))

    def test_should_mark_a_beta_release_as_not_final(self):
        self.promote(beta=True)

        self.assertIn("    final: false", self.changelog.read_text(encoding="utf-8"))

    def test_should_not_change_anything_on_a_dry_run(self):
        block = self.promote(dry_run=True)

        self.assertIn('-   version: "v9.0.4"', block)
        self.assertEqual(EXISTING_CHANGELOG, self.changelog.read_text(encoding="utf-8"))
        self.assertEqual(UNRELEASED_NOTES, self.unreleased.read_text(encoding="utf-8"))

    def test_should_be_repeatable_so_a_resumed_release_does_not_duplicate_the_section(self):
        first = self.promote()
        second = self.promote()

        self.assertEqual(first, second)
        self.assertEqual(1, self.changelog.read_text(encoding="utf-8").count('-   version: "v9.0.4"'))

    def test_should_refuse_to_promote_into_an_existing_version_that_has_new_notes(self):
        self.promote()
        self.unreleased.write_text(UNRELEASED_NOTES, encoding="utf-8")

        with self.assertRaisesRegex(promoter.ChangelogError, "already in changelog.yaml"):
            self.promote()

    def test_should_refuse_a_release_without_notes(self):
        self.unreleased.write_text(promoter.UNRELEASED_TEMPLATE, encoding="utf-8")

        with self.assertRaisesRegex(promoter.ChangelogError, "has no entries"):
            self.promote()

    def test_should_allow_a_release_without_notes_when_asked_to(self):
        self.unreleased.write_text(promoter.UNRELEASED_TEMPLATE, encoding="utf-8")

        self.promote(allow_empty=True)

        self.assertIn('-   version: "v9.0.4"', self.changelog.read_text(encoding="utf-8"))

    def test_should_keep_windows_line_endings(self):
        self.changelog.write_bytes(EXISTING_CHANGELOG.replace("\n", "\r\n").encode("utf-8"))

        self.promote()

        content = self.changelog.read_bytes().decode("utf-8")
        self.assertNotIn("\n", content.replace("\r\n", ""))

    def test_should_default_the_date_to_today(self):
        block = promoter.promote(
            "9.0.4", changelog_file=self.changelog, unreleased_file=self.unreleased
        )

        from datetime import datetime

        self.assertIn(f'date: "{datetime.now().strftime("%Y-%m-%d")}"', block)


if __name__ == "__main__":
    unittest.main()
