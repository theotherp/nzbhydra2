# Migration Status

Entries are ≤ 5 lines; details live in the task packets and git history. FM-001 through FM-053 are done; their packets were
removed from `tasks/` during the 2026-08-19 governance compaction (see `DECISIONS.md` ADR-0014/0015 and git history).

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-022: Download History Route
- FM-054 (planned): results-area token-fidelity cleanup — propagate ADR-0014 to
  `core/ui-react/src/features/search/results/**` and `RecentSearches.tsx`, deleting the per-feature style-token files. The
  search workspace (`SearchWorkspace.tsx`, converted 2026-08-19) is the pattern.

Planned but not next: FM-023 (Notification History Route), FM-024 (Statistics Dashboard), FM-033 (Durable Visual Evidence
Output — re-scope against the ADR-0014 screenshot gate before starting).
