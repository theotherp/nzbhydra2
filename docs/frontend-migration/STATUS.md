# Migration Status

Entries are ≤ 5 lines; details live in the task packets and git history. FM-001 through FM-055 and FM-022 are done; their
packets were removed from `tasks/` during the 2026-08-19 governance compaction (FM-001–FM-053) or on completion (FM-054,
FM-055, FM-022) (see `DECISIONS.md` ADR-0014/0015 and git history).

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-056: Shared History Refine Bar (Download History Adoption) — registers `C-HISTORY-REFINE-BAR` and `C-HISTORY-REQUEST`,
  replaces `/stats/downloads`'s filter row with the refine bar, and routes its requests through the shared wrapper. No
  dependencies.

Planned but not next: FM-057 (Search History Adopts The Shared Refine Bar — needs FM-056), FM-023 (Notification History Route —
now consumes the shared refine bar and wrapper, needs FM-056), FM-024 (Statistics Dashboard), FM-033 (Durable Visual Evidence
Output — re-scope against the ADR-0014 screenshot gate before starting).
