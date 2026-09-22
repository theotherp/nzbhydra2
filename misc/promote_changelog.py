#!/usr/bin/env python3
"""
Promote the release notes collected in changelog-unreleased.yaml into changelog.yaml.

During development every change is appended to changelog-unreleased.yaml, which holds nothing but
a flat list of {type, text} entries -- no version, no date, no final flag. When a release is cut
this script wraps those entries in a version section for the version being released, dated today,
inserts it at the top of core/src/main/resources/changelog.yaml and empties the unreleased file
again.

changelog.yaml itself must stay a list of *released* versions only: every installed NZBHydra2
fetches it from master at runtime (nzbhydra.changelogUrl) and parses it strictly, so an entry with
a non-semver version or an unknown field would break the changelog display in versions that are
already out in the wild.

The insertion is textual on purpose. Round-tripping the file through a YAML serializer would drop
the "#@formatter:off" header and the comments and reformat all of the existing entries.

Usage:
    python3 promote_changelog.py --version 9.0.4
    python3 promote_changelog.py --version 9.0.4 --beta
    python3 promote_changelog.py --version 9.0.4 --dry-run
"""

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHANGELOG_FILE = PROJECT_ROOT / "core" / "src" / "main" / "resources" / "changelog.yaml"
UNRELEASED_FILE = PROJECT_ROOT / "changelog-unreleased.yaml"

# Kept in sync with ChangelogGeneratorMojo.ALLOWED_CHANGE_TYPES
ALLOWED_TYPES = ("fix", "feature", "features", "note")

UNRELEASED_TEMPLATE = """#@formatter:off
# Release notes for the next release. Written for the user: describe what changes for them, not
# how it was implemented. Reference GitHub issues with "See #1234".
# Allowed types: fix, feature, features, note.
# Use HTML entities (&quot;, &apos;) instead of literal quotes inside the text.
#
# Example:
# -   type: "fix"
#     text: "Searching no longer takes forever. See #1234"
#
# misc/build_and_release.py moves these entries into core/src/main/resources/changelog.yaml when
# a release is built. Never add them to changelog.yaml by hand.
"""

TYPE_PATTERN = re.compile(r'^-\s+type:\s*"([^"]*)"\s*$')
TEXT_PATTERN = re.compile(r'^text:\s*"(.*)"\s*$')
VERSION_PATTERN = re.compile(r'^-\s+version:\s*"([^"]*)"\s*$')
SEMANTIC_VERSION_PATTERN = re.compile(r"^v\d+\.\d+\.\d+(-[0-9A-Za-z.\-]+)?$")


class ChangelogError(Exception):
    """Raised when the unreleased notes or the changelog are not in the expected shape."""


@dataclass(frozen=True)
class ChangeEntry:
    type: str
    text: str


def normalize_version(version: str) -> str:
    """Return the version in the "v1.2.3" form used throughout changelog.yaml.

    The prefix is not cosmetic: DiscordPublisher looks the entry up with a literal
    "v" + tagName comparison.
    """
    version = version.strip()
    if not version.startswith("v"):
        version = "v" + version
    if not SEMANTIC_VERSION_PATTERN.match(version):
        raise ChangelogError(f"Version '{version}' is not of the form v1.2.3")
    return version


def parse_unreleased(content: str) -> list[ChangeEntry]:
    """Parse the unreleased notes into change entries.

    Deliberately hand-rolled instead of using PyYAML: the release tooling must run with nothing
    but the standard library plus click/rich (see misc/requirements-build.txt).
    """
    entries: list[ChangeEntry] = []
    pending_type: str | None = None
    pending_type_line = 0

    for number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        type_match = TYPE_PATTERN.match(line)
        if type_match:
            if pending_type is not None:
                raise ChangelogError(f"Line {number}: entry of line {pending_type_line} has no text")
            change_type = type_match.group(1)
            if change_type not in ALLOWED_TYPES:
                raise ChangelogError(f"Line {number}: type '{change_type}' must be one of {', '.join(ALLOWED_TYPES)}")
            pending_type = change_type
            pending_type_line = number
            continue

        text_match = TEXT_PATTERN.match(line)
        if text_match:
            if pending_type is None:
                raise ChangelogError(f"Line {number}: text without a preceding type")
            text = text_match.group(1).strip()
            if not text:
                raise ChangelogError(f"Line {number}: text is empty")
            entries.append(ChangeEntry(pending_type, text))
            pending_type = None
            continue

        raise ChangelogError(
            f'Line {number}: expected \'-   type: "fix"\' or \'text: "..."\' but found: {line}'
        )

    if pending_type is not None:
        raise ChangelogError(f"Line {pending_type_line}: entry has no text")

    return entries


def render_version_block(version: str, date: str, is_final: bool, entries: list[ChangeEntry]) -> str:
    """Render a version section in the exact style used by changelog.yaml."""
    lines = [
        f'-   version: "{version}"',
        f'    date: "{date}"',
        f"    final: {str(is_final).lower()}",
        "    changes:",
    ]
    for entry in entries:
        lines.append(f'      -   type: "{entry.type}"')
        lines.append(f'          text: "{entry.text}"')
    return "\n".join(lines) + "\n"


def find_version_block(changelog: str, version: str) -> str | None:
    """Return the existing section for the version, or None. Used to make promotion repeatable."""
    lines = changelog.splitlines()
    for index, line in enumerate(lines):
        match = VERSION_PATTERN.match(line)
        if not match or match.group(1) != version:
            continue
        end = index + 1
        while end < len(lines) and not VERSION_PATTERN.match(lines[end]):
            end += 1
        return "\n".join(lines[index:end]) + "\n"
    return None


def splice_into_changelog(changelog: str, block: str) -> str:
    """Insert the rendered block directly below the leading comment block of changelog.yaml."""
    lines = changelog.splitlines(keepends=True)
    insert_at = 0
    while insert_at < len(lines) and (not lines[insert_at].strip() or lines[insert_at].lstrip().startswith("#")):
        insert_at += 1
    return "".join(lines[:insert_at]) + block + "".join(lines[insert_at:])


def _read(path: Path) -> tuple[str, str]:
    """Read a file and report its dominant line separator so it can be written back unchanged."""
    content = path.read_bytes().decode("utf-8")
    newline = "\r\n" if "\r\n" in content else "\n"
    return content.replace("\r\n", "\n"), newline


def _write(path: Path, content: str, newline: str) -> None:
    path.write_bytes(content.replace("\n", newline).encode("utf-8"))


def promote(
    version: str,
    *,
    beta: bool = False,
    date: str | None = None,
    allow_empty: bool = False,
    dry_run: bool = False,
    changelog_file: Path = CHANGELOG_FILE,
    unreleased_file: Path = UNRELEASED_FILE,
) -> str:
    """Move the unreleased notes into the changelog and return the rendered version section."""
    version = normalize_version(version)
    date = date or datetime.now().strftime("%Y-%m-%d")

    if not changelog_file.exists():
        raise ChangelogError(f"Changelog does not exist: {changelog_file}")
    if not unreleased_file.exists():
        raise ChangelogError(f"Unreleased notes do not exist: {unreleased_file}")

    changelog, changelog_newline = _read(changelog_file)
    unreleased, unreleased_newline = _read(unreleased_file)

    entries = parse_unreleased(unreleased)
    existing_block = find_version_block(changelog, version)

    if existing_block is not None:
        if entries:
            raise ChangelogError(
                f"{version} is already in {changelog_file.name} but {unreleased_file.name} still has "
                f"{len(entries)} entries. Merge them by hand and empty {unreleased_file.name}."
            )
        # A previous run of this step already promoted the notes; nothing left to do.
        return existing_block

    if not entries and not allow_empty:
        raise ChangelogError(
            f"{unreleased_file.name} has no entries. Add the release notes, or pass --allow-empty."
        )

    block = render_version_block(version, date, not beta, entries)
    if dry_run:
        return block

    _write(changelog_file, splice_into_changelog(changelog, block), changelog_newline)
    _write(unreleased_file, UNRELEASED_TEMPLATE, unreleased_newline)
    return block


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--version", "-v", required=True, help="Version being released, e.g. 9.0.4")
    parser.add_argument("--beta", action="store_true", help="Mark the release as a beta (final: false)")
    parser.add_argument("--date", help="Release date, defaults to today (YYYY-MM-DD)")
    parser.add_argument("--allow-empty", action="store_true", help="Allow a release without any release notes")
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be added")
    parser.add_argument("--changelog", type=Path, default=CHANGELOG_FILE)
    parser.add_argument("--unreleased", type=Path, default=UNRELEASED_FILE)
    args = parser.parse_args(argv)

    try:
        block = promote(
            args.version,
            beta=args.beta,
            date=args.date,
            allow_empty=args.allow_empty,
            dry_run=args.dry_run,
            changelog_file=args.changelog,
            unreleased_file=args.unreleased,
        )
    except ChangelogError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    print(block, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
